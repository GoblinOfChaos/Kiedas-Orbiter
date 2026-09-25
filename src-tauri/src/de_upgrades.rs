use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::time::Duration;

const INDEX_URL: &str = "https://origin.warframe.com/PublicExport/index_en.txt.lzma";
const MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport/Manifest";

#[derive(Debug, Default)]
pub struct MergeSummary {
    pub mirror: usize,
    pub de: usize,
    pub merged: usize,
    pub changed: usize,
    pub added: usize,
    pub mirror_only: usize,
    pub images_added: usize,
}

fn records(value: &Value) -> BTreeMap<String, Map<String, Value>> {
    let source = value.get("ExportUpgrades").unwrap_or(value);
    if let Some(array) = source.as_array() {
        return array
            .iter()
            .filter_map(|record| {
                let key = record.get("uniqueName")?.as_str()?.to_owned();
                Some((key, record.as_object()?.clone()))
            })
            .collect();
    }
    source
        .as_object()
        .map(|object| {
            object
                .iter()
                .filter_map(|(key, record)| {
                    let unique_name = record
                        .get("uniqueName")
                        .and_then(Value::as_str)
                        .unwrap_or(key)
                        .to_owned();
                    Some((unique_name, record.as_object()?.clone()))
                })
                .collect()
        })
        .unwrap_or_default()
}

fn round_number(value: &Value) -> Value {
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
        return round_number(value);
    }
    if let Some(array) = value.as_array() {
        return Value::Array(array.iter().map(normalize_numbers).collect());
    }
    value.clone()
}

fn ordered(record: Map<String, Value>) -> Map<String, Value> {
    record
        .into_iter()
        .collect::<BTreeMap<_, _>>()
        .into_iter()
        .collect()
}

fn de_overlay(record: &Map<String, Value>) -> Map<String, Value> {
    record
        .iter()
        .filter_map(|(field, value)| {
            if field == "levelStats" || value.is_number() {
                Some((field.clone(), normalize_numbers(value)))
            } else {
                None
            }
        })
        .collect()
}

pub fn merge_upgrades(mirror_export: &Value, de_export: &Value) -> (Value, MergeSummary) {
    let mirror = records(mirror_export);
    let de = records(de_export);
    let mut merged = Map::new();
    let mut summary = MergeSummary {
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
                merged.insert(key, Value::Object(ordered(record.clone())));
                summary.added += 1;
            }
            (Some(record), None) => {
                merged.insert(key, Value::Object(ordered(record.clone())));
                summary.mirror_only += 1;
            }
            (Some(mirror_record), Some(de_record)) => {
                let mut result = mirror_record.clone();
                let mut changed = false;
                for (field, value) in de_overlay(de_record) {
                    if result.get(&field) != Some(&value) {
                        changed = true;
                    }
                    result.insert(field, value);
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

fn add_manifest_icons(records: &mut Value, manifest: &Value) {
    let icons = manifest
        .get("Manifest")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            let texture = entry.get("textureLocation")?.as_str()?.rsplit_once('!')?.0;
            Some((
                entry.get("uniqueName")?.as_str()?.to_owned(),
                texture.to_owned(),
            ))
        })
        .collect::<BTreeMap<_, _>>();
    if let Some(object) = records.as_object_mut() {
        for (unique_name, record) in object {
            if let Some(icon) = icons.get(unique_name) {
                if let Some(record) = record.as_object_mut() {
                    record
                        .entry("icon")
                        .or_insert_with(|| Value::String(icon.clone()));
                }
            }
        }
    }
}

fn merge_images(mirror: &Value, manifest: &Value, summary: &mut MergeSummary) -> Value {
    let mut result = mirror.as_object().cloned().unwrap_or_default();
    for entry in manifest
        .get("Manifest")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let Some(texture) = entry.get("textureLocation").and_then(Value::as_str) else {
            continue;
        };
        let Some((path, hash)) = texture.rsplit_once('!') else {
            continue;
        };
        if !result.contains_key(path) {
            result.insert(path.into(), serde_json::json!({"contentHash": hash}));
            summary.images_added += 1;
        }
    }
    Value::Object(ordered(result))
}

async fn fetch_asset(
    client: &reqwest::Client,
    index: &str,
    logical_name: &str,
) -> Result<Vec<u8>, String> {
    let line = index
        .lines()
        .map(str::trim)
        .find(|line| line.starts_with(logical_name))
        .ok_or_else(|| format!("{} missing from DE manifest index", logical_name))?;
    tokio::time::sleep(Duration::from_secs(1)).await;
    let response = client
        .get(format!("{}/{}", MANIFEST_BASE, line.replace('!', "%21")))
        .header("User-Agent", "KiedasOrbiter/1.3.3")
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
    response
        .bytes()
        .await
        .map(|bytes| bytes.to_vec())
        .map_err(|e| e.to_string())
}

pub async fn refresh_de_upgrades(
    client: &reqwest::Client,
    export_dir: &Path,
    merge_images_this_run: bool,
) -> Result<MergeSummary, String> {
    let upgrade_path = export_dir.join("ExportUpgrades.json");
    let image_path = export_dir.join("ExportImages.json");
    let mirror: Value = serde_json::from_slice(
        &std::fs::read(&upgrade_path).map_err(|e| format!("read mirror upgrades: {}", e))?,
    )
    .map_err(|e| format!("parse mirror upgrades: {}", e))?;
    let mirror_images: Value = serde_json::from_slice(
        &std::fs::read(&image_path).map_err(|e| format!("read mirror images: {}", e))?,
    )
    .map_err(|e| format!("parse mirror images: {}", e))?;
    let index_response = client
        .get(INDEX_URL)
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !index_response.status().is_success() {
        return Err(format!(
            "DE upgrades index returned HTTP {}",
            index_response.status()
        ));
    }
    let index = crate::decompress_lzma(&index_response.bytes().await.map_err(|e| e.to_string())?)?;
    let upgrades_bytes = fetch_asset(client, &index, "ExportUpgrades_en.json").await?;
    let manifest_bytes = std::fs::read(export_dir.join("de/ExportManifest.json")).map_err(|e| format!("read DE manifest cache: {}", e))?;
    let de: Value =
        serde_json::from_slice(&upgrades_bytes).map_err(|e| format!("parse DE upgrades: {}", e))?;
    let manifest: Value =
        serde_json::from_slice(&manifest_bytes).map_err(|e| format!("parse DE manifest: {}", e))?;
    let de_count = records(&de).len();
    let mirror_count = records(&mirror).len();
    if de_count < 100 {
        return Err(format!(
            "DE upgrades count {} is below minimum 100",
            de_count
        ));
    }
    if mirror_count > 0 && de_count * 100 < mirror_count * 80 {
        return Err(format!(
            "DE upgrades count {} collapsed below 80% of mirror {}",
            de_count, mirror_count
        ));
    }
    let (mut merged, mut summary) = merge_upgrades(&mirror, &de);
    add_manifest_icons(&mut merged, &manifest);
    let merged_images = if merge_images_this_run { merge_images(&mirror_images, &manifest, &mut summary) } else { mirror_images.clone() };
    serde_json::to_vec(&merged).map_err(|e| e.to_string())?;
    serde_json::to_vec(&merged_images).map_err(|e| e.to_string())?;
    crate::write_export_json_atomic(&upgrade_path, &merged)?;
    if merge_images_this_run { crate::write_export_json_atomic(&image_path, &merged_images)?; }
    crate::write_export_json_atomic(&export_dir.join("de/ExportUpgrades_en.json"), &de)?;
    crate::write_export_json_atomic(&export_dir.join("de/ExportManifest.json"), &manifest)?;
    Ok(summary)
}
