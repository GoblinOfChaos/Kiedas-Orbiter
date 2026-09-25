use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::time::Duration;

const INDEX_URL: &str = "https://origin.warframe.com/PublicExport/index_en.txt.lzma";
const MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport/Manifest";
const SENTINEL_MINIMUM: usize = 30;
const GEAR_MINIMUM: usize = 100;
const SENTINEL_FIELDS: &[&str] = &[
    "uniqueName",
    "name",
    "description",
    "health",
    "shield",
    "armor",
    "stamina",
    "power",
    "codexSecret",
    "excludeFromCodex",
    "productCategory",
    "exalted",
];
const GEAR_FIELDS: &[&str] = &[
    "uniqueName",
    "name",
    "description",
    "parentName",
    "codexSecret",
];
const SENTINEL_MERGE_FIELDS: &[&str] = &[
    "health",
    "shield",
    "armor",
    "stamina",
    "power",
    "codexSecret",
    "excludeFromCodex",
    "productCategory",
    "exalted",
];
const GEAR_MERGE_FIELDS: &[&str] = &["parentName", "codexSecret"];

#[derive(Debug, Default)]
pub struct MergeSummary {
    pub sentinels_changed: usize,
    pub sentinels_added: usize,
    pub sentinels_mirror_only: usize,
    pub gear_changed: usize,
    pub gear_added: usize,
    pub gear_mirror_only: usize,
}

fn records(value: &Value, category: &str) -> BTreeMap<String, Map<String, Value>> {
    let source = value.get(category).unwrap_or(value);
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
                    if unique_name.is_empty() {
                        None
                    } else {
                        Some((unique_name, record.as_object()?.clone()))
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

fn adapted(
    raw: &BTreeMap<String, Map<String, Value>>,
    fields: &[&str],
) -> BTreeMap<String, Map<String, Value>> {
    raw.iter()
        .map(|(key, record)| {
            (
                key.clone(),
                fields
                    .iter()
                    .filter_map(|field| {
                        record
                            .get(*field)
                            .map(|value| ((*field).to_owned(), normalize_numbers(value)))
                    })
                    .collect(),
            )
        })
        .collect()
}

fn rounded_number(value: &Value) -> Value {
    value
        .as_f64()
        .map(|number| {
            let adjusted = number - number.signum() * 1e-7;
            let rounded = (adjusted * 1_000_000.0).round() / 1_000_000.0;
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
        return rounded_number(value);
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

fn merge_map(
    mirror: &BTreeMap<String, Map<String, Value>>,
    de: &BTreeMap<String, Map<String, Value>>,
    fields: &[&str],
) -> (Value, usize, usize, usize) {
    let keys = mirror
        .keys()
        .chain(de.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    let mut output = Map::new();
    let mut changed = 0;
    let mut added = 0;
    let mut mirror_only = 0;
    for key in keys {
        match (mirror.get(&key), de.get(&key)) {
            (None, Some(record)) => {
                output.insert(key, Value::Object(ordered(record.clone())));
                added += 1;
            }
            (Some(record), None) => {
                output.insert(key, Value::Object(ordered(record.clone())));
                mirror_only += 1;
            }
            (Some(mirror_record), Some(de_record)) => {
                let mut result = mirror_record.clone();
                let mut did_change = false;
                for field in fields {
                    if let Some(value) = de_record.get(*field) {
                        let value = normalize_numbers(value);
                        if result.get(*field).map(normalize_numbers).as_ref() != Some(&value) {
                            did_change = true;
                        }
                        result.insert((*field).into(), value);
                    }
                }
                if did_change {
                    changed += 1;
                }
                output.insert(key, Value::Object(ordered(result)));
            }
            _ => unreachable!(),
        }
    }
    (Value::Object(output), changed, added, mirror_only)
}

fn count(value: &Value, category: &str) -> usize {
    records(value, category).len()
}

pub async fn refresh_de_sentgear(
    client: &reqwest::Client,
    export_dir: &Path,
) -> Result<MergeSummary, String> {
    let sentinel_path = export_dir.join("ExportSentinels.json");
    let gear_path = export_dir.join("ExportGear.json");
    let sentinel_mirror: Value = serde_json::from_slice(
        &std::fs::read(&sentinel_path).map_err(|e| format!("read mirror Sentinels: {}", e))?,
    )
    .map_err(|e| format!("parse mirror Sentinels: {}", e))?;
    let gear_mirror: Value = serde_json::from_slice(
        &std::fs::read(&gear_path).map_err(|e| format!("read mirror Gear: {}", e))?,
    )
    .map_err(|e| format!("parse mirror Gear: {}", e))?;
    let index = client
        .get(INDEX_URL)
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !index.status().is_success() {
        return Err(format!(
            "DE Sentinels/Gear index returned HTTP {}",
            index.status()
        ));
    }
    let text = crate::decompress_lzma(&index.bytes().await.map_err(|e| e.to_string())?)?;
    let sentinel_line = text
        .lines()
        .map(str::trim)
        .find(|line| line.starts_with("ExportSentinels_en.json!"))
        .ok_or("ExportSentinels_en.json missing from DE manifest index")?
        .to_owned();
    let gear_line = text
        .lines()
        .map(str::trim)
        .find(|line| line.starts_with("ExportGear_en.json!"))
        .ok_or("ExportGear_en.json missing from DE manifest index")?
        .to_owned();
    tokio::time::sleep(Duration::from_secs(1)).await;
    let sentinel_response = client
        .get(format!(
            "{}/{}",
            MANIFEST_BASE,
            sentinel_line.replace('!', "%21")
        ))
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !sentinel_response.status().is_success() {
        return Err(format!(
            "DE Sentinels returned HTTP {}",
            sentinel_response.status()
        ));
    }
    let sentinel_bytes = sentinel_response.bytes().await.map_err(|e| e.to_string())?;
    tokio::time::sleep(Duration::from_secs(1)).await;
    let gear_response = client
        .get(format!(
            "{}/{}",
            MANIFEST_BASE,
            gear_line.replace('!', "%21")
        ))
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !gear_response.status().is_success() {
        return Err(format!("DE Gear returned HTTP {}", gear_response.status()));
    }
    let gear_bytes = gear_response.bytes().await.map_err(|e| e.to_string())?;
    let sentinel_de: Value = serde_json::from_slice(&sentinel_bytes)
        .map_err(|e| format!("parse DE Sentinels: {}", e))?;
    let gear_de: Value =
        serde_json::from_slice(&gear_bytes).map_err(|e| format!("parse DE Gear: {}", e))?;
    let sentinel_records = records(&sentinel_de, "ExportSentinels");
    let gear_records = records(&gear_de, "ExportGear");
    if sentinel_records.len() < SENTINEL_MINIMUM || gear_records.len() < GEAR_MINIMUM {
        return Err(format!(
            "DE Sentinels/Gear minimum failed: {} / {}",
            sentinel_records.len(),
            gear_records.len()
        ));
    }
    if sentinel_records.len() * 100 < count(&sentinel_mirror, "ExportSentinels") * 80
        || gear_records.len() * 100 < count(&gear_mirror, "ExportGear") * 80
    {
        return Err("DE Sentinels/Gear count collapsed below 80% of mirror".into());
    }
    crate::write_bytes_atomic(
        &export_dir.join("de/ExportSentinels_en.json"),
        &sentinel_bytes,
    )
    .map_err(|e| e.to_string())?;
    crate::write_bytes_atomic(&export_dir.join("de/ExportGear_en.json"), &gear_bytes)
        .map_err(|e| e.to_string())?;
    let (sentinels, sentinels_changed, sentinels_added, sentinels_mirror_only) = merge_map(
        &records(&sentinel_mirror, "ExportSentinels"),
        &adapted(&sentinel_records, SENTINEL_FIELDS),
        SENTINEL_MERGE_FIELDS,
    );
    let (gear, gear_changed, gear_added, gear_mirror_only) = merge_map(
        &records(&gear_mirror, "ExportGear"),
        &adapted(&gear_records, GEAR_FIELDS),
        GEAR_MERGE_FIELDS,
    );
    crate::write_json_atomic(&sentinel_path, &sentinels)?;
    crate::write_json_atomic(&gear_path, &gear)?;
    Ok(MergeSummary {
        sentinels_changed,
        sentinels_added,
        sentinels_mirror_only,
        gear_changed,
        gear_added,
        gear_mirror_only,
    })
}
