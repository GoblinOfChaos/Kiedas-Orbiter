use std::path::Path;
use std::time::Duration;

use reqwest::Client;
use serde_json::Value;

const DE_BASE: &str = "https://content.warframe.com/PublicExport";
const DE_LOCALES: &[&str] = &[
    "de", "es", "fr", "it", "ja", "ko", "pl", "pt", "ru", "tc", "th", "tr", "uk", "zh",
];

pub const DE_LOCALE_CATEGORIES: &[&str] = &[
    "ExportWarframes",
    "ExportWeapons",
    "ExportUpgrades",
    "ExportCustoms",
    "ExportFlavour",
    "ExportResources",
    "ExportRelicArcane",
    "ExportGear",
    "ExportRegions",
    "ExportSentinels",
    "ExportKeys",
    "ExportDrones",
    "ExportFusionBundles",
    "ExportSortieRewards",
];

fn count_records(value: &Value, category: &str) -> usize {
    if let Some(records) = value.as_array() {
        return records.len();
    }
    let Some(object) = value.as_object() else {
        return 0;
    };
    if let Some(records) = object.get(category).and_then(Value::as_array) {
        return records.len();
    }
    object
        .values()
        .filter_map(Value::as_array)
        .map(Vec::len)
        .sum()
}

fn index_target(category: &str, locale: &str, index: &str) -> Result<String, String> {
    let target = format!("{}_{}.json", category, locale);
    index
        .lines()
        .map(str::trim)
        .find(|line| line.starts_with(&target))
        .map(|line| line.replace('!', "%21"))
        .ok_or_else(|| format!("{} missing from DE manifest index", target))
}

async fn fetch_json(client: &Client, url: &str) -> Result<Value, String> {
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!(
            "DE locale returned HTTP {} for {}",
            response.status(),
            url
        ));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| format!("invalid JSON from {}: {}", url, e))
}

/// Refreshes literal DE PublicExport localization tables. A failed category
/// never removes its previous good file; callers treat all failures as non-fatal.
pub async fn refresh_de_locale(
    client: &Client,
    export_dir: &Path,
    locale: &str,
    force: bool,
) -> Result<u32, String> {
    if locale == "en" {
        return Ok(0);
    }
    if !DE_LOCALES.contains(&locale) {
        return Err(format!("unsupported DE locale {}", locale));
    }
    let de_dir = export_dir.join("de");
    let needs_index = force
        || DE_LOCALE_CATEGORIES.iter().any(|category| {
            let path = de_dir.join(format!("{}_{}.json", category, locale));
            !path.exists() || crate::file_age_secs(&path) > 86_400
        });
    if !needs_index {
        return Ok(0);
    }

    tokio::time::sleep(Duration::from_secs(1)).await;
    let index_url = format!("{}/index_{}.txt.lzma", DE_BASE, locale);
    let index_response = client
        .get(&index_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !index_response.status().is_success() {
        return Err(format!(
            "DE locale index returned HTTP {}",
            index_response.status()
        ));
    }
    let index_bytes = index_response.bytes().await.map_err(|e| e.to_string())?;
    let index_text = crate::decompress_lzma(&index_bytes)?;
    let mut updated = 0u32;
    for category in DE_LOCALE_CATEGORIES {
        let destination = de_dir.join(format!("{}_{}.json", category, locale));
        if !force && destination.exists() && crate::file_age_secs(&destination) <= 86_400 {
            continue;
        }
        let manifest_line = index_target(category, locale, &index_text)?;
        tokio::time::sleep(Duration::from_secs(1)).await;
        let url = format!("{}/Manifest/{}", DE_BASE, manifest_line);
        let value = fetch_json(client, &url).await?;
        let count = count_records(&value, category);
        if count < 1 {
            return Err(format!("{} has no records", category));
        }
        if let Ok(previous_bytes) = std::fs::read(&destination) {
            if let Ok(previous) = serde_json::from_slice::<Value>(&previous_bytes) {
                let previous_count = count_records(&previous, category);
                if previous_count > 0 && count * 100 < previous_count * 80 {
                    return Err(format!(
                        "{} count collapsed from {} to {}",
                        category, previous_count, count
                    ));
                }
            }
        }
        crate::write_export_json_atomic(&destination, &value)?;
        updated += 1;
    }
    Ok(updated)
}
