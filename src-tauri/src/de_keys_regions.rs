use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::time::Duration;

const INDEX_URL: &str = "https://origin.warframe.com/PublicExport/index_en.txt.lzma";
const MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport/Manifest";
const REGION_NUMERIC_FIELDS: &[&str] = &[
    "systemIndex",
    "nodeType",
    "masteryReq",
    "missionIndex",
    "factionIndex",
    "minEnemyLevel",
    "maxEnemyLevel",
];
const KEY_OVERLAY_FIELDS: &[&str] = &["codexSecret", "excludeFromCodex"];

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct TableSummary {
    pub mirror: usize,
    pub de: usize,
    pub merged: usize,
    pub changed: usize,
    pub added: usize,
    pub mirror_only: usize,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct MergeSummary {
    pub regions: TableSummary,
    pub keys: TableSummary,
    pub unresolved_region_refs: usize,
}

fn records(value: &Value, category: &str) -> BTreeMap<String, Map<String, Value>> {
    let source = value.get(category).unwrap_or(value);
    if let Some(array) = source.as_array() {
        return array
            .iter()
            .filter_map(|record| {
                let object = record.as_object()?;
                let key = object.get("uniqueName")?.as_str()?.to_owned();
                Some((key, object.clone()))
            })
            .collect();
    }
    source
        .as_object()
        .map(|object| {
            object
                .iter()
                .filter_map(|(key, record)| {
                    let mut object = record.as_object()?.clone();
                    let unique_name = object
                        .get("uniqueName")
                        .and_then(Value::as_str)
                        .unwrap_or(key)
                        .to_owned();
                    object
                        .entry("uniqueName")
                        .or_insert_with(|| Value::String(unique_name.clone()));
                    Some((unique_name, object))
                })
                .collect()
        })
        .unwrap_or_default()
}

fn ordered(record: Map<String, Value>) -> Map<String, Value> {
    record
        .into_iter()
        .collect::<BTreeMap<_, _>>()
        .into_iter()
        .collect()
}

fn normalized_record(record: &Map<String, Value>) -> Map<String, Value> {
    record
        .iter()
        .map(|(field, value)| (field.clone(), normalize_numbers(value)))
        .collect()
}

fn normalize_number(value: &Value) -> Value {
    value
        .as_f64()
        .map(|number| {
            let rounded = ((number - number.signum() * 1e-7) * 1_000_000.0).round() / 1_000_000.0;
            if rounded.fract() == 0.0 {
                Value::from(rounded as i64)
            } else {
                Value::from(rounded)
            }
        })
        .unwrap_or_else(|| value.clone())
}

fn normalize_numbers(value: &Value) -> Value {
    if value.is_number() {
        return normalize_number(value);
    }
    if let Some(array) = value.as_array() {
        return Value::Array(array.iter().map(normalize_numbers).collect());
    }
    value.clone()
}

fn merge_table(
    mirror_export: &Value,
    de_export: &Value,
    category: &str,
    overlay_fields: &[&str],
) -> (Value, TableSummary) {
    let mirror = records(mirror_export, category);
    let de = records(de_export, category);
    let mut merged = Map::new();
    let mut summary = TableSummary {
        mirror: mirror.len(),
        de: de.len(),
        ..Default::default()
    };
    let keys = mirror
        .keys()
        .chain(de.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    for key in keys {
        match (mirror.get(&key), de.get(&key)) {
            (None, Some(record)) => {
                merged.insert(key, Value::Object(ordered(normalized_record(record))));
                summary.added += 1;
            }
            (Some(record), None) => {
                merged.insert(key, Value::Object(ordered(record.clone())));
                summary.mirror_only += 1;
            }
            (Some(mirror_record), Some(de_record)) => {
                let mut result = mirror_record.clone();
                let mut changed = false;
                for (field, raw_value) in de_record {
                    let value = normalize_numbers(raw_value);
                    let safe_overlay = overlay_fields.contains(&field.as_str());
                    if !safe_overlay && result.contains_key(field) {
                        continue;
                    }
                    if result.get(field) != Some(&value) {
                        changed = true;
                    }
                    result.insert(field.clone(), value);
                }
                if changed {
                    summary.changed += 1;
                }
                merged.insert(key, Value::Object(ordered(result)));
            }
            (None, None) => unreachable!(),
        }
    }
    summary.merged = merged.len();
    (Value::Object(merged), summary)
}

pub fn merge_regions(mirror_export: &Value, de_export: &Value) -> (Value, TableSummary) {
    merge_table(
        mirror_export,
        de_export,
        "ExportRegions",
        REGION_NUMERIC_FIELDS,
    )
}

pub fn merge_keys(mirror_export: &Value, de_export: &Value) -> (Value, TableSummary) {
    merge_table(mirror_export, de_export, "ExportKeys", KEY_OVERLAY_FIELDS)
}

fn validate_region_records(
    de: &BTreeMap<String, Map<String, Value>>,
    mirror: &BTreeMap<String, Map<String, Value>>,
) -> Result<(), String> {
    for (unique_name, record) in de {
        if mirror.contains_key(unique_name) {
            continue;
        }
        for field in ["name", "systemName"] {
            let valid = record
                .get(field)
                .and_then(Value::as_str)
                .map(str::trim)
                .map(|value| !value.is_empty())
                .unwrap_or(false);
            if !valid {
                return Err(format!("DE region {} has empty {}", unique_name, field));
            }
        }
    }
    Ok(())
}

fn validate_key_records(
    de: &BTreeMap<String, Map<String, Value>>,
    mirror: &BTreeMap<String, Map<String, Value>>,
) -> Result<(), String> {
    for (unique_name, record) in de {
        if mirror.contains_key(unique_name) {
            continue;
        }
        for field in ["name", "description"] {
            let valid = record
                .get(field)
                .and_then(Value::as_str)
                .map(str::trim)
                .map(|value| !value.is_empty())
                .unwrap_or(false);
            if !valid {
                return Err(format!("DE key {} has empty {}", unique_name, field));
            }
        }
    }
    Ok(())
}

fn validate_floors(
    label: &str,
    de_count: usize,
    previous_count: usize,
    mirror_count: usize,
    merged_count: usize,
) -> Result<(), String> {
    if previous_count > 0 && de_count * 2 < previous_count {
        return Err(format!(
            "DE {} count {} collapsed below 50% of prior cache {}",
            label, de_count, previous_count
        ));
    }
    if mirror_count > 0 && merged_count * 100 < mirror_count * 80 {
        return Err(format!(
            "merged {} count {} collapsed below 80% of mirror {}",
            label, merged_count, mirror_count
        ));
    }
    Ok(())
}

fn unresolved_region_refs(merged: &Value) -> usize {
    let regions = records(merged, "ExportRegions");
    regions
        .values()
        .filter_map(|record| record.get("nextNodes").and_then(Value::as_array))
        .flatten()
        .filter_map(Value::as_str)
        .filter(|unique_name| !regions.contains_key(*unique_name))
        .count()
}

async fn fetch_asset(
    client: &reqwest::Client,
    index: &str,
    logical_name: &str,
) -> Result<Value, String> {
    let line = index
        .lines()
        .map(str::trim)
        .find(|line| line.starts_with(logical_name))
        .ok_or_else(|| format!("{} missing from DE manifest index", logical_name))?;
    tokio::time::sleep(Duration::from_secs(1)).await;
    let response = client
        .get(format!("{}/{}", MANIFEST_BASE, line.replace('!', "%21")))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!(
            "DE {} returned HTTP {}",
            logical_name,
            response.status()
        ));
    }
    serde_json::from_slice(&response.bytes().await.map_err(|e| e.to_string())?)
        .map_err(|e| format!("parse DE {}: {}", logical_name, e))
}

fn read_json(path: &Path) -> Result<Value, String> {
    serde_json::from_slice(
        &std::fs::read(path).map_err(|e| format!("read {}: {}", path.display(), e))?,
    )
    .map_err(|e| format!("parse {}: {}", path.display(), e))
}

pub async fn refresh_de_keys_regions(
    client: &reqwest::Client,
    export_dir: &Path,
) -> Result<MergeSummary, String> {
    let regions_path = export_dir.join("ExportRegions.json");
    let keys_path = export_dir.join("ExportKeys.json");
    let cache_dir = export_dir.join("de");
    let regions_cache = cache_dir.join("ExportRegions_en.json");
    let keys_cache = cache_dir.join("ExportKeys_en.json");
    let mirror_regions = read_json(&regions_path)?;
    let mirror_keys = read_json(&keys_path)?;

    tokio::time::sleep(Duration::from_secs(1)).await;
    let index_response = client
        .get(INDEX_URL)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !index_response.status().is_success() {
        return Err(format!(
            "DE regions/keys index returned HTTP {}",
            index_response.status()
        ));
    }
    let index = crate::decompress_lzma(&index_response.bytes().await.map_err(|e| e.to_string())?)?;
    let de_regions = fetch_asset(client, &index, "ExportRegions_en.json").await?;
    let de_keys = fetch_asset(client, &index, "ExportKeys_en.json").await?;
    let region_records = records(&de_regions, "ExportRegions");
    let key_records = records(&de_keys, "ExportKeys");
    let mirror_region_records = records(&mirror_regions, "ExportRegions");
    let mirror_key_records = records(&mirror_keys, "ExportKeys");
    validate_region_records(&region_records, &mirror_region_records)?;
    validate_key_records(&key_records, &mirror_key_records)?;

    let previous_regions = regions_cache
        .exists()
        .then(|| read_json(&regions_cache))
        .transpose()?;
    let previous_keys = keys_cache
        .exists()
        .then(|| read_json(&keys_cache))
        .transpose()?;
    let (merged_regions, regions_summary) = merge_regions(&mirror_regions, &de_regions);
    let (merged_keys, keys_summary) = merge_keys(&mirror_keys, &de_keys);
    validate_floors(
        "regions",
        regions_summary.de,
        previous_regions
            .as_ref()
            .map(|value| records(value, "ExportRegions").len())
            .unwrap_or(0),
        regions_summary.mirror,
        regions_summary.merged,
    )?;
    validate_floors(
        "keys",
        keys_summary.de,
        previous_keys
            .as_ref()
            .map(|value| records(value, "ExportKeys").len())
            .unwrap_or(0),
        keys_summary.mirror,
        keys_summary.merged,
    )?;

    crate::write_export_json_atomic(&regions_cache, &de_regions)?;
    crate::write_export_json_atomic(&keys_cache, &de_keys)?;
    crate::write_export_json_atomic(&regions_path, &merged_regions)?;
    crate::write_export_json_atomic(&keys_path, &merged_keys)?;
    Ok(MergeSummary {
        regions: regions_summary,
        keys: keys_summary,
        unresolved_region_refs: unresolved_region_refs(&merged_regions),
    })
}

#[cfg(test)]
mod tests {
    use super::{merge_keys, merge_regions};
    use serde_json::json;

    #[test]
    fn merge_keeps_mirror_only_and_adds_de_only_records() {
        let mirror = json!({
            "mirror": {"uniqueName": "mirror", "name": "mirror-key", "chainStages": [{"stage": 1}]},
            "mirror-only": {"uniqueName": "mirror-only", "name": "keep"}
        });
        let de = json!([{"uniqueName": "mirror", "name": "DE name", "codexSecret": false}, {"uniqueName": "de-only", "name": "DE only", "description": "Description"}]);
        let (merged, summary) = merge_keys(&mirror, &de);
        assert_eq!(summary.added, 1);
        assert_eq!(merged["mirror"]["name"], "mirror-key");
        assert!(merged["mirror"]["chainStages"].is_array());
        assert_eq!(merged["de-only"]["name"], "DE only");
        assert!(merged["mirror-only"].is_object());
    }

    #[test]
    fn merge_is_idempotent() {
        let mirror = json!({"node": {"uniqueName": "node", "name": "Mirror", "systemName": "Tau"}});
        let de =
            json!([{"uniqueName": "node", "name": "DE", "systemName": "Tau", "missionIndex": 1}]);
        let (once, first) = merge_regions(&mirror, &de);
        let (twice, second) = merge_regions(&once, &de);
        assert_eq!(once, twice);
        assert_eq!(first.changed, 1);
        assert_eq!(second.changed, 0);
    }
}
