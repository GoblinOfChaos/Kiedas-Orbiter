use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::time::Duration;

const INDEX_URL: &str = "https://origin.warframe.com/PublicExport/index_en.txt.lzma";
const MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport/Manifest";
const FIELDS: &[&str] = &["codexSecret", "excludeFromCodex", "icon"];

#[derive(Debug, Default)]
pub struct MergeSummary { pub customs_added: usize, pub flavour_added: usize, pub customs_mirror_only: usize, pub flavour_mirror_only: usize, pub images_added: usize }

fn records(value: &Value, category: &str) -> BTreeMap<String, Map<String, Value>> {
    let source = value.get(category).unwrap_or(value);
    let values = source.as_array().map(|array| array.iter().filter_map(|record| record.as_object().cloned()).collect::<Vec<_>>()).unwrap_or_else(|| source.as_object().map(|object| object.iter().filter_map(|(key, record)| { let mut item = record.as_object()?.clone(); item.entry("uniqueName").or_insert_with(|| Value::String(key.clone())); Some(item) }).collect()).unwrap_or_default());
    values.into_iter().filter_map(|record| { let key = record.get("uniqueName")?.as_str()?.to_owned(); Some((key, record)) }).collect()
}

fn ordered(record: Map<String, Value>) -> Map<String, Value> { record.into_iter().collect::<BTreeMap<_, _>>().into_iter().collect() }

fn merge_table(mirror: &Value, de: &Value, category: &str, manifest: &Value, added: &mut usize, mirror_only: &mut usize, images_added: &mut usize) -> Value {
    let mirror = records(mirror, category); let mut de = records(de, category);
    let textures = manifest.get("Manifest").and_then(Value::as_array).into_iter().flatten().filter_map(|entry| Some((entry.get("uniqueName")?.as_str()?.to_owned(), entry.get("textureLocation")?.as_str()?.to_owned()))).collect::<BTreeMap<_, _>>();
    for (key, record) in de.iter_mut() { if !record.contains_key("icon") { if let Some(texture) = textures.get(key).and_then(|value| value.rsplit_once('!').map(|split| split.0)) { record.insert("icon".into(), Value::String(texture.into())); *images_added += 1; } } }
    let mut merged = Map::new(); let keys = mirror.keys().chain(de.keys()).cloned().collect::<BTreeSet<_>>();
    for key in keys {
        match (mirror.get(&key), de.get(&key)) {
            (None, Some(record)) => { merged.insert(key, Value::Object(ordered(record.clone()))); *added += 1; }
            (Some(record), None) => { merged.insert(key, Value::Object(ordered(record.clone()))); *mirror_only += 1; }
            (Some(mirror_record), Some(de_record)) => { let mut result = mirror_record.clone(); for field in FIELDS { if let Some(value) = de_record.get(*field) { result.insert((*field).into(), value.clone()); } } merged.insert(key, Value::Object(ordered(result))); }
            _ => unreachable!(),
        }
    }
    Value::Object(merged)
}

async fn fetch_asset(client: &reqwest::Client, index: &str, logical_name: &str) -> Result<Value, String> {
    let line = index.lines().map(str::trim).find(|line| line.starts_with(logical_name)).ok_or_else(|| format!("{} missing from DE manifest index", logical_name))?;
    tokio::time::sleep(Duration::from_secs(1)).await;
    let response = client.get(format!("{}/{}", MANIFEST_BASE, line.replace('!', "%21"))).header("User-Agent", "KiedasOrbiter/1.3.3").send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() { return Err(format!("DE {} returned HTTP {}", logical_name, response.status())); }
    serde_json::from_slice(&response.bytes().await.map_err(|e| e.to_string())?).map_err(|e| format!("parse DE {}: {}", logical_name, e))
}

fn count(value: &Value, category: &str) -> usize { records(value, category).len() }

fn read_json(path: &std::path::Path) -> Result<Value, String> { serde_json::from_slice(&std::fs::read(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string()) }

pub async fn refresh_de_customs(client: &reqwest::Client, export_dir: &Path, merge_images_this_run: bool) -> Result<MergeSummary, String> {
    let customs_path = export_dir.join("ExportCustoms.json"); let flavour_path = export_dir.join("ExportFlavour.json"); let image_path = export_dir.join("ExportImages.json");
    let cache_dir = export_dir.join("de"); std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    let customs_cache = cache_dir.join("ExportCustoms_en.json"); let flavour_cache = cache_dir.join("ExportFlavour_en.json"); let manifest_cache = cache_dir.join("ExportManifest.json");
    let mirror_customs = read_json(&customs_path)?; let mirror_flavour = read_json(&flavour_path)?; let mirror_images = read_json(&image_path)?;
    let (de_customs, de_flavour, manifest) = {
        let index_response = client.get(INDEX_URL).header("User-Agent", "KiedasOrbiter/1.3.3").send().await.map_err(|e| e.to_string())?;
        if !index_response.status().is_success() { return Err(format!("DE customs index returned HTTP {}", index_response.status())); }
        let index = crate::decompress_lzma(&index_response.bytes().await.map_err(|e| e.to_string())?)?;
        let customs = fetch_asset(client, &index, "ExportCustoms_en.json").await?; let flavour = fetch_asset(client, &index, "ExportFlavour_en.json").await?; let manifest = read_json(&manifest_cache)?;
        if count(&customs, "ExportCustoms") < 100 || count(&flavour, "ExportFlavour") < 100 || count(&customs, "ExportCustoms") * 100 < count(&mirror_customs, "ExportCustoms") * 80 || count(&flavour, "ExportFlavour") * 100 < count(&mirror_flavour, "ExportFlavour") * 80 { return Err("DE customs/flavour validation failed: fewer than 100 records or below 80% of mirror".into()); }
        crate::write_export_json_atomic(&customs_cache, &customs)?; crate::write_export_json_atomic(&flavour_cache, &flavour)?; crate::write_export_json_atomic(&manifest_cache, &manifest)?;
        (customs, flavour, manifest)
    };
    let mut summary = MergeSummary::default(); let merged_customs = merge_table(&mirror_customs, &de_customs, "ExportCustoms", &manifest, &mut summary.customs_added, &mut summary.customs_mirror_only, &mut summary.images_added); let merged_flavour = merge_table(&mirror_flavour, &de_flavour, "ExportFlavour", &manifest, &mut summary.flavour_added, &mut summary.flavour_mirror_only, &mut summary.images_added);
    let mut images = mirror_images.as_object().cloned().unwrap_or_default(); if merge_images_this_run { if let Some(entries) = manifest.get("Manifest").and_then(Value::as_array) { for entry in entries { if let Some(texture) = entry.get("textureLocation").and_then(Value::as_str).and_then(|value| value.rsplit_once('!')) { if !images.contains_key(texture.0) { images.insert(texture.0.into(), serde_json::json!({"contentHash": texture.1})); } } } } }
    crate::write_export_json_atomic(&customs_path, &merged_customs)?; crate::write_export_json_atomic(&flavour_path, &merged_flavour)?; if merge_images_this_run { crate::write_export_json_atomic(&image_path, &Value::Object(ordered(images)))?; } Ok(summary)
}
