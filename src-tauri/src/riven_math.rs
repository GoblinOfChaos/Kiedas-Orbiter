//! Riven base-stat data for reverse-computing roll quality ("perfectness")
//! from a live OCR-read Riven card, where (unlike an owned Riven parsed from
//! the save file) the game's raw roll fraction isn't available - only the
//! displayed percentage.
//!
//! Source of truth: the app's own downloaded ExportWeapons.json (per-weapon
//! Riven Disposition, `omegaAttenuation`) and ExportUpgrades.json (per-stat
//! base values under the `/Randomized/*RandomModRare` entries) - the same
//! DE public-export files wiki.warframe.com's own Riven base-value table
//! cites as its source, so this reads the authoritative data directly
//! instead of transcribing the wiki's rendering of it.

use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize)]
pub struct RivenBaseData {
    pub disposition: f64,
    pub riven_type: String,
    pub base_values: HashMap<String, f64>,
}

fn read_json_file(path: &std::path::Path) -> Option<serde_json::Value> {
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

fn resolve_file(app: &tauri::AppHandle, relative: &str) -> Option<std::path::PathBuf> {
    let path = crate::resolve_path(relative);
    if path.exists() {
        return Some(path);
    }
    crate::resolve_bundled_path(app, relative).filter(|p| p.exists())
}

/// Map a weapon's ExportWeapons productCategory/holsterCategory (plus its
/// uniqueName, for modular Zaw/Kitgun detection) to the matching Riven
/// `/Randomized/*RandomModRare` type name. Returns None for categories with
/// no dedicated Rare Riven base-stat entry in the export (e.g. Robotic/
/// Sentinel weapons) rather than guessing a substitute.
fn riven_type_for_weapon(unique_name: &str, product_category: &str, holster_category: &str) -> Option<&'static str> {
    if unique_name.contains("/ModularMelee/") || unique_name.contains("Zaw") {
        return Some("LotusModularMeleeRandomModRare");
    }
    if unique_name.contains("/ModularPistol/") || unique_name.contains("KitGun") {
        return Some("LotusModularPistolRandomModRare");
    }
    match product_category {
        "LongGuns" if holster_category == "SHOTGUN" => Some("LotusShotgunRandomModRare"),
        "LongGuns" => Some("LotusRifleRandomModRare"),
        "Pistols" => Some("LotusPistolRandomModRare"),
        "Melee" => Some("PlayerMeleeWeaponRandomModRare"),
        "SpaceGuns" => Some("LotusArchgunRandomModRare"),
        _ => None,
    }
}

pub fn get_riven_base_data(app: &tauri::AppHandle, weapon_name_en: &str) -> Option<RivenBaseData> {
    let vocab = crate::weapon_i18n::wfcd_vocab_weapons(app);
    let unique_name = vocab.get(weapon_name_en)?;

    let weapons_path = resolve_file(app, "data/export/ExportWeapons.json")?;
    let weapons = read_json_file(&weapons_path)?;
    let entry = weapons.get(unique_name)?;

    let disposition = entry.get("omegaAttenuation").and_then(|v| v.as_f64()).unwrap_or(1.0);
    let product_category = entry.get("productCategory").and_then(|v| v.as_str()).unwrap_or("");
    let holster_category = entry.get("holsterCategory").and_then(|v| v.as_str()).unwrap_or("");
    let riven_type = riven_type_for_weapon(unique_name, product_category, holster_category)?;

    let upgrades_path = resolve_file(app, "data/export/ExportUpgrades.json")?;
    let upgrades = read_json_file(&upgrades_path)?;
    let riven_key = format!("/Lotus/Upgrades/Mods/Randomized/{}", riven_type);
    let riven_entry = upgrades.get(&riven_key)?;

    let mut base_values = HashMap::new();
    if let Some(entries) = riven_entry.get("upgradeEntries").and_then(|v| v.as_array()) {
        for ue in entries {
            let tag = ue.get("tag").and_then(|v| v.as_str());
            let value = ue
                .get("upgradeValues")
                .and_then(|v| v.as_array())
                .and_then(|a| a.first())
                .and_then(|uv| uv.get("value"))
                .and_then(|v| v.as_f64());
            if let (Some(tag), Some(value)) = (tag, value) {
                base_values.insert(tag.to_string(), value);
            }
        }
    }

    Some(RivenBaseData { disposition, riven_type: riven_type.to_string(), base_values })
}
