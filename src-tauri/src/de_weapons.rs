use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::time::Duration;

const INDEX_URL: &str = "https://origin.warframe.com/PublicExport/index_en.txt.lzma";
const MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport/Manifest";
const MERGE_FIELDS: &[&str] = &[
    "codexSecret", "damagePerShot", "totalDamage", "criticalChance", "criticalMultiplier",
    "procChance", "fireRate", "masteryReq", "productCategory", "slot", "accuracy",
    "omegaAttenuation", "primeOmegaAttenuation", "noise", "trigger", "magazineSize",
    "reloadTime", "multishot", "blockingAngle", "comboDuration", "followThrough",
    "heavyAttackDamage", "heavySlamAttack", "heavySlamRadialDamage", "heavySlamRadius",
    "range", "sentinel", "slamAttack", "slamRadialDamage", "slamRadius", "slideAttack",
    "windUp", "excludeFromCodex", "maxLevelCap",
];
const ADAPTER_FIELDS: &[&str] = &[
    "uniqueName", "name", "description", "codexSecret", "damagePerShot", "totalDamage",
    "criticalChance", "criticalMultiplier", "procChance", "fireRate", "masteryReq",
    "productCategory", "slot", "accuracy", "omegaAttenuation", "primeOmegaAttenuation",
    "noise", "trigger", "magazineSize", "reloadTime", "multishot", "blockingAngle",
    "comboDuration", "followThrough", "heavyAttackDamage", "heavySlamAttack",
    "heavySlamRadialDamage", "heavySlamRadius", "range", "sentinel", "slamAttack",
    "slamRadialDamage", "slamRadius", "slideAttack", "windUp", "excludeFromCodex",
    "maxLevelCap",
];

#[derive(Debug, Default)]
pub struct MergeSummary { pub mirror: usize, pub de: usize, pub merged: usize, pub changed: usize, pub added: usize, pub mirror_only: usize }

fn records(value: &Value) -> Vec<(String, Value)> {
    let source = value.get("ExportWeapons").unwrap_or(value);
    if let Some(array) = source.as_array() {
        return array.iter().filter_map(|record| Some((record.get("uniqueName")?.as_str()?.to_owned(), record.clone()))).collect();
    }
    source.as_object().map(|object| object.iter().filter_map(|(key, record)| {
        let unique_name = record.get("uniqueName").and_then(Value::as_str).unwrap_or(key).to_owned();
        if unique_name.is_empty() { None } else { Some((unique_name, record.clone())) }
    }).collect()).unwrap_or_default()
}

fn map_records(value: &Value) -> BTreeMap<String, Map<String, Value>> {
    records(value).into_iter().filter_map(|(unique_name, record)| record.as_object().map(|object| (unique_name, object.clone()))).collect()
}

fn adapted_record(raw: &Map<String, Value>) -> Map<String, Value> {
    ADAPTER_FIELDS.iter().filter_map(|field| raw.get(*field).map(|value| ((*field).to_owned(), normalize_numbers(value)))).collect()
}

fn rounded_number(value: &Value) -> Value {
    value.as_f64().map(|number| {
        let adjusted = number - number.signum() * 1e-7;
        let rounded = (adjusted * 1_000_000.0).round() / 1_000_000.0;
        if rounded.fract() == 0.0 { Value::from(rounded as i64) } else { Value::from(rounded) }
    }).unwrap_or_else(|| value.clone())
}

fn normalize_numbers(value: &Value) -> Value {
    if value.is_number() {
        return rounded_number(value);
    }
    if let Some(array) = value.as_array() {
        return Value::Array(array.iter().map(normalize_numbers).collect());
    }
    value.clone()
}

fn ordered_record(record: Map<String, Value>) -> Map<String, Value> { record.into_iter().collect::<BTreeMap<_, _>>().into_iter().collect() }

pub fn merge_weapons(mirror_export: &Value, de_export: &Value) -> (Value, MergeSummary) {
    let mirror = map_records(mirror_export);
    let de = map_records(de_export).into_iter().map(|(key, record)| (key, adapted_record(&record))).collect::<BTreeMap<_, _>>();
    let mut merged = Map::new();
    let mut summary = MergeSummary { mirror: mirror.len(), de: de.len(), ..Default::default() };
    let keys = mirror.keys().chain(de.keys()).cloned().collect::<BTreeSet<_>>();
    for unique_name in keys {
        match (mirror.get(&unique_name), de.get(&unique_name)) {
            (None, Some(record)) => { merged.insert(unique_name, Value::Object(ordered_record(record.clone()))); summary.added += 1; }
            (Some(record), None) => { merged.insert(unique_name, Value::Object(ordered_record(record.clone()))); summary.mirror_only += 1; }
            (Some(mirror_record), Some(de_record)) => {
                let mut result = mirror_record.clone();
                let mut changed = false;
                for field in MERGE_FIELDS {
                    let Some(value) = de_record.get(*field) else { continue };
                    let value = normalize_numbers(value);
                    let mirror_value = result.get(*field).map(normalize_numbers);
                    if mirror_value.as_ref() != Some(&value) { changed = true; }
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

#[cfg(test)]
mod tests {
    use super::{normalize_numbers, rounded_number};
    use serde_json::json;

    #[test]
    fn rounds_scalars_and_preserves_integer_numbers() {
        assert_eq!(rounded_number(&json!(0.60000002)), json!(0.6));
        assert_eq!(rounded_number(&json!(7.5000005)), json!(7.5));
        assert_eq!(rounded_number(&json!(14)), json!(14));
    }

    #[test]
    fn rounds_numeric_array_elements() {
        assert_eq!(normalize_numbers(&json!([7.5000005, 14])), json!([7.5, 14]));
    }
}

fn count_records(value: &Value) -> usize { map_records(value).len() }

/// Refresh and merge DE's English weapon export. Failure leaves the mirror intact.
pub async fn refresh_de_weapons(client: &reqwest::Client, export_dir: &Path) -> Result<MergeSummary, String> {
    let mirror_path = export_dir.join("ExportWeapons.json");
    let mirror: Value = serde_json::from_slice(&std::fs::read(&mirror_path).map_err(|e| format!("read mirror Weapons: {}", e))?).map_err(|e| format!("parse mirror Weapons: {}", e))?;
    let mirror_count = count_records(&mirror);
    let index = client.get(INDEX_URL).header("User-Agent", "KiedasOrbiter/1.3.3").send().await.map_err(|e| e.to_string())?;
    if !index.status().is_success() { return Err(format!("DE Weapons index returned HTTP {}", index.status())); }
    let line = crate::decompress_lzma(&index.bytes().await.map_err(|e| e.to_string())?)?.lines().map(str::trim).find(|line| line.starts_with("ExportWeapons_en.json!")).ok_or("ExportWeapons_en.json missing from DE manifest index")?.to_owned();
    tokio::time::sleep(Duration::from_secs(1)).await;
    let response = client.get(format!("{}/{}", MANIFEST_BASE, line.replace('!', "%21"))).header("User-Agent", "KiedasOrbiter/1.3.3").send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() { return Err(format!("DE Weapons returned HTTP {}", response.status())); }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let de: Value = serde_json::from_slice(&bytes).map_err(|e| format!("parse DE Weapons: {}", e))?;
    let de_count = count_records(&de);
    if de_count < 100 { return Err(format!("DE Weapons count {} is below minimum 100", de_count)); }
    if mirror_count > 0 && de_count * 100 < mirror_count * 80 { return Err(format!("DE Weapons count {} collapsed below 80% of mirror {}", de_count, mirror_count)); }
    crate::write_export_json_atomic(&export_dir.join("de/ExportWeapons_en.json"), &de)?;
    let (merged, summary) = merge_weapons(&mirror, &de);
    crate::write_export_json_atomic(&mirror_path, &merged)?;
    Ok(summary)
}
