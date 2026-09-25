use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::time::Duration;

const INDEX_URL: &str = "https://origin.warframe.com/PublicExport/index_en.txt.lzma";
const MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport/Manifest";
const RELIC_FIELDS: &[&str] = &["category", "era", "quality", "rewardManifest", "introducedAt", "vaultedAt", "codexSecret", "icon"];
const ARCANE_FIELDS: &[&str] = &["codexSecret", "rarity", "levelStats", "icon"];

#[derive(Debug, Default)]
pub struct MergeSummary { pub relics_added: usize, pub arcanes_added: usize, pub relics_mirror_only: usize, pub arcanes_mirror_only: usize, pub changed: usize }

fn records(value: &Value) -> BTreeMap<String, Map<String, Value>> {
    let source = value.get("ExportRelicArcane").unwrap_or(value);
    if let Some(array) = source.as_array() { return array.iter().filter_map(|r| { let key = r.get("uniqueName")?.as_str()?.to_owned(); Some((key, r.as_object()?.clone())) }).collect(); }
    source.as_object().map(|o| o.iter().filter_map(|(key, r)| Some((r.get("uniqueName").and_then(Value::as_str).unwrap_or(key).to_owned(), r.as_object()?.clone()))).collect()).unwrap_or_default()
}

fn split(value: &Value) -> (BTreeMap<String, Map<String, Value>>, BTreeMap<String, Map<String, Value>>) {
    let mut relics = BTreeMap::new(); let mut arcanes = BTreeMap::new();
    for (key, record) in records(value) { if key.contains("/CosmeticEnhancers/") { arcanes.insert(key, record); } else { relics.insert(key, record); } }
    (relics, arcanes)
}

fn ordered(record: Map<String, Value>) -> Map<String, Value> { record.into_iter().collect::<BTreeMap<_, _>>().into_iter().collect() }

fn merge_map(mirror: &BTreeMap<String, Map<String, Value>>, de: &BTreeMap<String, Map<String, Value>>, fields: &[&str], added: &mut usize, mirror_only: &mut usize, changed: &mut usize) -> Value {
    let keys = mirror.keys().chain(de.keys()).cloned().collect::<BTreeSet<_>>(); let mut output = Map::new();
    for key in keys {
        match (mirror.get(&key), de.get(&key)) {
            (None, Some(record)) => { output.insert(key, Value::Object(ordered(record.clone()))); *added += 1; }
            (Some(record), None) => { output.insert(key, Value::Object(ordered(record.clone()))); *mirror_only += 1; }
            (Some(mirror_record), Some(de_record)) => { let mut result = mirror_record.clone(); let mut did_change = false; for field in fields { if let Some(value) = de_record.get(*field) { if result.get(*field) != Some(value) { did_change = true; } result.insert((*field).into(), value.clone()); } } if did_change { *changed += 1; } output.insert(key, Value::Object(ordered(result))); }
            _ => unreachable!(),
        }
    }
    Value::Object(output)
}

fn merge(mirror_relics: &Value, mirror_arcanes: &Value, de: &Value) -> (Value, Value, MergeSummary) {
    let (de_relics, de_arcanes) = split(de); let mirror_relics = mirror_relics.as_object().cloned().unwrap_or_default(); let mirror_arcanes = mirror_arcanes.as_object().cloned().unwrap_or_default(); let mut summary = MergeSummary::default();
    let relics = merge_map(&mirror_relics, &de_relics, RELIC_FIELDS, &mut summary.relics_added, &mut summary.relics_mirror_only, &mut summary.changed);
    let arcanes = merge_map(&mirror_arcanes, &de_arcanes, ARCANE_FIELDS, &mut summary.arcanes_added, &mut summary.arcanes_mirror_only, &mut summary.changed);
    (relics, arcanes, summary)
}

pub async fn refresh_de_relics(client: &reqwest::Client, export_dir: &Path) -> Result<MergeSummary, String> {
    let mirror_relic_path = export_dir.join("ExportRelics.json"); let mirror_arcane_path = export_dir.join("ExportArcanes.json");
    let mirror_relics: Value = serde_json::from_slice(&std::fs::read(&mirror_relic_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let mirror_arcanes: Value = serde_json::from_slice(&std::fs::read(&mirror_arcane_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let cache_path = export_dir.join("de/ExportRelicArcane_en.json");
    let de = if cache_path.exists() && std::fs::metadata(&mirror_relic_path).map_err(|e| e.to_string())?.modified().map_err(|e| e.to_string())? <= std::fs::metadata(&cache_path).map_err(|e| e.to_string())?.modified().map_err(|e| e.to_string())? { serde_json::from_slice(&std::fs::read(&cache_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())? } else {
        let index = client.get(INDEX_URL).send().await.map_err(|e| e.to_string())?; if !index.status().is_success() { return Err(format!("DE relic index HTTP {}", index.status())); }
        let text = crate::decompress_lzma(&index.bytes().await.map_err(|e| e.to_string())?)?;
        let line = text.lines().map(str::trim).find(|line| line.starts_with("ExportRelicArcane_en.json!")).ok_or("ExportRelicArcane_en.json missing from DE index")?.to_owned();
        tokio::time::sleep(Duration::from_secs(1)).await;
        let response = client.get(format!("{}/{}", MANIFEST_BASE, line.replace('!', "%21"))).send().await.map_err(|e| e.to_string())?; if !response.status().is_success() { return Err(format!("DE relic/arcane HTTP {}", response.status())); }
        let bytes = response.bytes().await.map_err(|e| e.to_string())?; let value: Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?; let total = records(&value).len(); let (relics, arcanes) = split(&value); if total < 100 || relics.len() * 100 < mirror_relics.as_object().map(|x| x.len()).unwrap_or(0) * 80 || arcanes.len() * 100 < mirror_arcanes.as_object().map(|x| x.len()).unwrap_or(0) * 80 { return Err(format!("DE relic/arcane validation failed: total {}, relics {}, arcanes {}", total, relics.len(), arcanes.len())); } crate::write_bytes_atomic(&cache_path, &bytes).map_err(|e| e.to_string())?; value
    };
    let (relics, arcanes, summary) = merge(&mirror_relics, &mirror_arcanes, &de); crate::write_json_atomic(&mirror_relic_path, &relics)?; crate::write_json_atomic(&mirror_arcane_path, &arcanes)?; Ok(summary)
}
