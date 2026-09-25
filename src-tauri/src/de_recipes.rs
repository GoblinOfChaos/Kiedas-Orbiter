use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::time::Duration;

const INDEX_URL: &str = "https://origin.warframe.com/PublicExport/index_en.txt.lzma";
const MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport/Manifest";
const RECIPE_FIELDS: &[&str] = &[
    "resultType",
    "buildPrice",
    "buildTime",
    "num",
    "ingredients",
];

#[derive(Debug, Default)]
pub struct MergeSummary {
    pub recipes_added: usize,
    pub recipes_changed: usize,
    pub recipes_mirror_only: usize,
    pub resources_added: usize,
    pub resources_mirror_only: usize,
    pub images_added: usize,
}

fn records(value: &Value, category: &str) -> Vec<(String, Value)> {
    let source = value.get(category).unwrap_or(value);
    if let Some(array) = source.as_array() {
        return array
            .iter()
            .filter_map(|record| {
                let unique_name = record.get("uniqueName")?.as_str()?.to_owned();
                Some((unique_name, record.clone()))
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
                    if unique_name.is_empty() {
                        None
                    } else {
                        Some((unique_name, record.clone()))
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

fn record_map(value: &Value, category: &str) -> BTreeMap<String, Map<String, Value>> {
    records(value, category)
        .into_iter()
        .filter_map(|(key, record)| record.as_object().map(|object| (key, object.clone())))
        .collect()
}

fn ordered(record: Map<String, Value>) -> Map<String, Value> {
    record
        .into_iter()
        .collect::<BTreeMap<_, _>>()
        .into_iter()
        .collect()
}

fn merge_recipes(mirror: &Value, de: &Value, summary: &mut MergeSummary) -> Value {
    let mirror = record_map(mirror, "ExportRecipes");
    let de = record_map(de, "ExportRecipes");
    let mut merged = Map::new();
    let keys = mirror
        .keys()
        .chain(de.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    for key in keys {
        match (mirror.get(&key), de.get(&key)) {
            (None, Some(record)) => {
                merged.insert(key, Value::Object(ordered(record.clone())));
                summary.recipes_added += 1;
            }
            (Some(record), None) => {
                merged.insert(key, Value::Object(ordered(record.clone())));
                summary.recipes_mirror_only += 1;
            }
            (Some(mirror_record), Some(de_record)) => {
                let mut result = mirror_record.clone();
                let mut changed = false;
                for field in RECIPE_FIELDS {
                    if let Some(value) = de_record.get(*field) {
                        if result.get(*field) != Some(value) {
                            changed = true;
                        }
                        result.insert((*field).into(), value.clone());
                    }
                }
                if changed {
                    summary.recipes_changed += 1;
                }
                merged.insert(key, Value::Object(ordered(result)));
            }
            (None, None) => unreachable!(),
        }
    }
    Value::Object(merged)
}

fn merge_resources(
    mirror: &Value,
    de: &Value,
    manifest: &Value,
    summary: &mut MergeSummary,
) -> Value {
    let mirror = record_map(mirror, "ExportResources");
    let de = record_map(de, "ExportResources");
    let images = manifest
        .get("Manifest")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            Some((
                entry.get("uniqueName")?.as_str()?.to_owned(),
                entry.get("textureLocation")?.as_str()?.to_owned(),
            ))
        })
        .collect::<BTreeMap<_, _>>();
    let mut merged = Map::new();
    let keys = mirror
        .keys()
        .chain(de.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    for key in keys {
        let mut record = mirror
            .get(&key)
            .cloned()
            .or_else(|| de.get(&key).cloned())
            .unwrap_or_default();
        if !mirror.contains_key(&key) {
            summary.resources_added += 1;
            if let Some(texture) = images.get(&key) {
                if let Some(split) = texture.rsplit_once('!') {
                    record.insert("icon".into(), Value::String(split.0.into()));
                }
            }
        } else if !de.contains_key(&key) {
            summary.resources_mirror_only += 1;
        }
        merged.insert(key, Value::Object(ordered(record)));
    }
    Value::Object(merged)
}

fn merge_images(mirror: &Value, manifest: &Value, summary: &mut MergeSummary) -> Value {
    let mut merged = mirror.as_object().cloned().unwrap_or_default();
    if let Some(entries) = manifest.get("Manifest").and_then(Value::as_array) {
        for entry in entries {
            let Some(texture) = entry.get("textureLocation").and_then(Value::as_str) else {
                continue;
            };
            let Some((path, hash)) = texture.rsplit_once('!') else {
                continue;
            };
            if !merged.contains_key(path) {
                merged.insert(path.into(), serde_json::json!({"contentHash": hash}));
                summary.images_added += 1;
            }
        }
    }
    Value::Object(ordered(merged))
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
    let url = format!("{}/{}", MANIFEST_BASE, line.replace('!', "%21"));
    let response = client
        .get(&url)
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
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| format!("parse DE {}: {}", logical_name, e))
}

fn count(value: &Value, category: &str) -> usize {
    record_map(value, category).len()
}

/// Refresh DE recipes, resources, and image manifest as one non-fatal hybrid.
/// The mirror is never replaced until all source validation and merges succeed.
pub async fn refresh_de_recipes(
    client: &reqwest::Client,
    export_dir: &Path,
) -> Result<MergeSummary, String> {
    let recipe_path = export_dir.join("ExportRecipes.json");
    let resource_path = export_dir.join("ExportResources.json");
    let image_path = export_dir.join("ExportImages.json");
    let warframe_path = export_dir.join("ExportWarframes.json");
    let mirror_recipes: Value = serde_json::from_slice(
        &std::fs::read(&recipe_path).map_err(|e| format!("read mirror recipes: {}", e))?,
    )
    .map_err(|e| format!("parse mirror recipes: {}", e))?;
    let mirror_resources: Value = serde_json::from_slice(
        &std::fs::read(&resource_path).map_err(|e| format!("read mirror resources: {}", e))?,
    )
    .map_err(|e| format!("parse mirror resources: {}", e))?;
    let mirror_images: Value = serde_json::from_slice(
        &std::fs::read(&image_path).map_err(|e| format!("read mirror images: {}", e))?,
    )
    .map_err(|e| format!("parse mirror images: {}", e))?;
    let mut merged_warframes: Value = serde_json::from_slice(
        &std::fs::read(&warframe_path).map_err(|e| format!("read merged Warframes: {}", e))?,
    )
    .map_err(|e| format!("parse merged Warframes: {}", e))?;
    let index_response = client
        .get(INDEX_URL)
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !index_response.status().is_success() {
        return Err(format!(
            "DE recipes index returned HTTP {}",
            index_response.status()
        ));
    }
    let index = crate::decompress_lzma(&index_response.bytes().await.map_err(|e| e.to_string())?)?;
    let de_recipes = fetch_asset(client, &index, "ExportRecipes_en.json").await?;
    let de_resources = fetch_asset(client, &index, "ExportResources_en.json").await?;
    let de_manifest = fetch_asset(client, &index, "ExportManifest.json").await?;
    let recipe_count = count(&de_recipes, "ExportRecipes");
    let resource_count = count(&de_resources, "ExportResources");
    if recipe_count < 100 || resource_count < 100 {
        return Err(format!(
            "DE recipe/resource counts too low: {}/{}",
            recipe_count, resource_count
        ));
    }
    let mirror_recipe_count = count(&mirror_recipes, "ExportRecipes");
    let mirror_resource_count = count(&mirror_resources, "ExportResources");
    if recipe_count * 100 < mirror_recipe_count * 80
        || resource_count * 100 < mirror_resource_count * 80
    {
        return Err("DE recipe/resource count collapsed below 80% of mirror".into());
    }
    let mut summary = MergeSummary::default();
    let merged_recipes = merge_recipes(&mirror_recipes, &de_recipes, &mut summary);
    let merged_resources =
        merge_resources(&mirror_resources, &de_resources, &de_manifest, &mut summary);
    let merged_images = merge_images(&mirror_images, &de_manifest, &mut summary);
    if let (Some(warframes), Some(entries)) = (
        merged_warframes.as_object_mut(),
        de_manifest.get("Manifest").and_then(Value::as_array),
    ) {
        let icons = entries
            .iter()
            .filter_map(|entry| {
                let unique_name = entry.get("uniqueName")?.as_str()?;
                let texture = entry.get("textureLocation")?.as_str()?.rsplit_once('!')?.0;
                Some((unique_name, texture))
            })
            .collect::<BTreeMap<_, _>>();
        for (unique_name, record) in warframes.iter_mut() {
            if let Some(icon) = icons.get(unique_name.as_str()) {
                if let Some(object) = record.as_object_mut() {
                    if !object.contains_key("icon") {
                        object.insert("icon".into(), Value::String((*icon).into()));
                    }
                }
            }
        }
    }
    // Validate every merged value before any atomic replacement occurs.
    serde_json::to_vec(&merged_warframes).map_err(|e| e.to_string())?;
    crate::write_json_atomic(&recipe_path, &merged_recipes)?;
    crate::write_json_atomic(&resource_path, &merged_resources)?;
    crate::write_json_atomic(&image_path, &merged_images)?;
    crate::write_json_atomic(&warframe_path, &merged_warframes)?;
    crate::write_bytes_atomic(
        &export_dir.join("de/ExportRecipes_en.json"),
        serde_json::to_vec(&de_recipes).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    crate::write_bytes_atomic(
        &export_dir.join("de/ExportResources_en.json"),
        serde_json::to_vec(&de_resources).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    crate::write_bytes_atomic(
        &export_dir.join("de/ExportManifest.json"),
        serde_json::to_vec(&de_manifest).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(summary)
}
