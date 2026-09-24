use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::path::Path;
use std::time::Duration;

const INDEX_URL: &str = "https://origin.warframe.com/PublicExport/index_en.txt.lzma";
const MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport/Manifest";
const MERGE_FIELDS: &[&str] = &[
    "parentName", "health", "shield", "armor", "stamina", "power",
    "codexSecret", "masteryReq", "sprintSpeed", "exalted", "productCategory",
];
const ADAPTER_FIELDS: &[&str] = &[
    "uniqueName", "name", "parentName", "description", "health", "shield", "armor",
    "stamina", "power", "codexSecret", "masteryReq", "sprintSpeed", "passiveDescription",
    "exalted", "abilities", "productCategory",
];

#[derive(Debug, Default)]
pub struct MergeSummary {
    pub mirror: usize,
    pub de: usize,
    pub merged: usize,
    pub changed: usize,
    pub added: usize,
    pub mirror_only: usize,
}

fn records(value: &Value) -> Vec<(String, Value)> {
    let source = value.get("ExportWarframes").unwrap_or(value);
    if let Some(array) = source.as_array() {
        return array.iter().filter_map(|record| {
            let unique_name = record.get("uniqueName")?.as_str()?.to_owned();
            Some((unique_name, record.clone()))
        }).collect();
    }
    source.as_object().map(|object| object.iter().filter_map(|(key, record)| {
        let unique_name = record.get("uniqueName").and_then(Value::as_str).unwrap_or(key).to_owned();
        if unique_name.is_empty() { None } else { Some((unique_name, record.clone())) }
    }).collect()).unwrap_or_default()
}

fn map_records(value: &Value) -> BTreeMap<String, Map<String, Value>> {
    records(value).into_iter().filter_map(|(unique_name, record)| {
        record.as_object().map(|object| (unique_name, object.clone()))
    }).collect()
}

fn adapted_record(raw: &Map<String, Value>) -> Map<String, Value> {
    let mut result = Map::new();
    for field in ADAPTER_FIELDS {
        let Some(value) = raw.get(*field) else { continue };
        let value = if *field == "abilities" {
            Value::Array(value.as_array().map(|abilities| abilities.iter().map(adapted_ability).collect()).unwrap_or_default())
        } else {
            value.clone()
        };
        result.insert((*field).to_owned(), value);
    }
    result
}

fn adapted_ability(raw: &Value) -> Value {
    let Some(object) = raw.as_object() else { return raw.clone() };
    let mut result = Map::new();
    if let Some(value) = object.get("abilityUniqueName") { result.insert("uniqueName".into(), value.clone()); }
    if let Some(value) = object.get("abilityName") { result.insert("name".into(), value.clone()); }
    if let Some(value) = object.get("description") { result.insert("description".into(), value.clone()); }
    Value::Object(result)
}

fn rounded_speed(value: &Value) -> Value {
    value.as_f64().map(|number| Value::from((number * 1_000_000.0).round() / 1_000_000.0)).unwrap_or_else(|| value.clone())
}

fn ordered_record(record: Map<String, Value>) -> Map<String, Value> {
    // serde_json::Map preserves insertion order; rebuilding from sorted keys
    // makes output stable even when source object order changes.
    record.into_iter().collect::<BTreeMap<_, _>>().into_iter().collect()
}

pub fn merge_warframes(mirror_export: &Value, de_export: &Value) -> (Value, MergeSummary) {
    let mirror = map_records(mirror_export);
    let de = map_records(de_export).into_iter().map(|(key, record)| (key, adapted_record(&record))).collect::<BTreeMap<_, _>>();
    let mut merged = Map::new();
    let mut summary = MergeSummary { mirror: mirror.len(), de: de.len(), ..Default::default() };

    let keys = mirror.keys().chain(de.keys()).cloned().collect::<std::collections::BTreeSet<_>>();
    for unique_name in keys {
        match (mirror.get(&unique_name), de.get(&unique_name)) {
            (None, Some(de_record)) => {
                merged.insert(unique_name, Value::Object(ordered_record(de_record.clone())));
                summary.added += 1;
            }
            (Some(mirror_record), None) => {
                merged.insert(unique_name, Value::Object(ordered_record(mirror_record.clone())));
                summary.mirror_only += 1;
            }
            (Some(mirror_record), Some(de_record)) => {
                let mut result = mirror_record.clone();
                let mut changed = false;
                for field in MERGE_FIELDS {
                    let Some(value) = de_record.get(*field) else { continue };
                    let value = if *field == "sprintSpeed" { rounded_speed(value) } else { value.clone() };
                    if result.get(*field) != Some(&value) { changed = true; }
                    result.insert((*field).into(), value);
                }
                if changed { summary.changed += 1; }
                merged.insert(unique_name, Value::Object(ordered_record(result)));
            }
            (None, None) => unreachable!(),
        }
    }
    summary.merged = merged.len();
    (Value::Object(merged), summary)
}

fn count_records(value: &Value) -> usize { map_records(value).len() }

/// Refresh and merge DE's English Warframe export. Every failure is returned
/// to the caller so the already validated mirror remains untouched.
pub async fn refresh_de_warframes(client: &reqwest::Client, export_dir: &Path) -> Result<MergeSummary, String> {
    let mirror_path = export_dir.join("ExportWarframes.json");
    let mirror_bytes = std::fs::read(&mirror_path).map_err(|e| format!("read mirror Warframes: {}", e))?;
    let mirror: Value = serde_json::from_slice(&mirror_bytes).map_err(|e| format!("parse mirror Warframes: {}", e))?;
    let mirror_count = count_records(&mirror);
    let index = client.get(INDEX_URL).header("User-Agent", "KiedasOrbiter/1.3.3").send().await.map_err(|e| e.to_string())?;
    if !index.status().is_success() { return Err(format!("DE Warframes index returned HTTP {}", index.status())); }
    let index_bytes = index.bytes().await.map_err(|e| e.to_string())?;
    let index_text = crate::decompress_lzma(&index_bytes)?;
    let line = index_text.lines().map(str::trim).find(|line| line.starts_with("ExportWarframes_en.json!"))
        .ok_or("ExportWarframes_en.json missing from DE manifest index")?.to_owned();
    tokio::time::sleep(Duration::from_secs(1)).await;
    let url = format!("{}/{}", MANIFEST_BASE, line.replace('!', "%21"));
    let response = client.get(&url).header("User-Agent", "KiedasOrbiter/1.3.3").send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() { return Err(format!("DE Warframes returned HTTP {}", response.status())); }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let de: Value = serde_json::from_slice(&bytes).map_err(|e| format!("parse DE Warframes: {}", e))?;
    let de_count = count_records(&de);
    if de_count < 100 { return Err(format!("DE Warframes count {} is below minimum 100", de_count)); }
    if mirror_count > 0 && de_count * 100 < mirror_count * 80 { return Err(format!("DE Warframes count {} collapsed below 80% of mirror {}", de_count, mirror_count)); }
    crate::write_bytes_atomic(&export_dir.join("de/ExportWarframes_en.json"), &bytes).map_err(|e| e.to_string())?;
    let (merged, summary) = merge_warframes(&mirror, &de);
    crate::write_json_atomic(&mirror_path, &merged)?;
    Ok(summary)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hybrid_fixture_keeps_keys_and_takes_stats() {
        let mirror = serde_json::json!({"/a": {"uniqueName":"/a", "name":"/key", "description":"/desc", "health":100, "sprintSpeed":1.0}});
        let de = serde_json::json!({"ExportWarframes":[{"uniqueName":"/a", "name":"English", "description":"Text", "health":200, "sprintSpeed":0.89999998}]});
        let (merged, _) = merge_warframes(&mirror, &de);
        assert_eq!(merged["/a"]["name"], "/key");
        assert_eq!(merged["/a"]["health"], 200);
        assert_eq!(merged["/a"]["sprintSpeed"], 0.9);
    }

    #[test]
    fn de_only_and_mirror_only_are_preserved() {
        let mirror = serde_json::json!({"/mirror": {"uniqueName":"/mirror", "name":"key"}});
        let de = serde_json::json!({"ExportWarframes":[{"uniqueName":"/de", "name":"Narin", "description":"English"}]});
        let (merged, summary) = merge_warframes(&mirror, &de);
        assert_eq!(merged["/de"]["name"], "Narin");
        assert!(merged.get("/mirror").is_some());
        assert_eq!(summary.added, 1);
        assert_eq!(summary.mirror_only, 1);
    }
}
