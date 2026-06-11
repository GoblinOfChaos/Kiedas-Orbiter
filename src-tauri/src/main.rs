// Hide the console window on Windows release builds.
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use std::fs;
use tauri::{AppHandle, Manager, Emitter};
use std::io::Cursor;
use std::sync::{Arc, Mutex};
use serde_json::Value;


mod log_scanner;
mod ocr;
mod ocr_engine;
mod overlay_utils;
mod logger;
mod pricer;

pub struct AppState {
    pub notif_sound: Arc<Mutex<String>>,
    pub log_scanner: Arc<Mutex<Option<log_scanner::LogScannerHandle>>>,
    pub log_scanner_path: Arc<Mutex<Option<String>>>,
    pub active_relic_data: Arc<Mutex<Option<serde_json::Value>>>,
    pub target_monitor: Arc<Mutex<Option<usize>>>,
}

// --- Path Resolution ---
//
// In dev builds, paths are resolved relative to the Cargo manifest directory so
// that assets sit alongside the source tree.  In release builds they're resolved
// relative to the executable so the installed app is self-contained.
// When running from an AppImage, the mounted FS is read-only, but the APPIMAGE
// relative to the real file -- we use its parent dir for writable data so
// everything stays in one portable folder.

fn get_app_root() -> PathBuf {
    if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    } else if let Ok(appimage_path) = std::env::var("APPIMAGE") {
        let path = PathBuf::from(appimage_path);
        path.parent().map(|p| p.to_path_buf()).unwrap_or(PathBuf::from("."))
    } else {
        std::env::current_exe()
            .map(|p| p.parent().unwrap_or(Path::new(".")).to_path_buf())
            .unwrap_or_else(|_| PathBuf::from("."))
    }
}

/// Returns the writable data root.
/// Portable on all platforms -- data always lives next to the app.
/// - AppImage: directory containing the .AppImage file
/// - macOS .app: directory containing the .app bundle
/// - Everything else: directory containing the binary
pub fn get_data_root() -> PathBuf {
    if let Ok(appimage_path) = std::env::var("APPIMAGE") {
        return PathBuf::from(appimage_path)
            .parent()
            .unwrap_or(Path::new("."))
            .to_path_buf();
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(exe) = std::env::current_exe() {
            let path_str = exe.to_string_lossy();
            if let Some(app_pos) = path_str.find(".app/") {
                let app_path = PathBuf::from(&path_str[..app_pos + 4]);
                if let Some(parent) = app_path.parent() {
                    return parent.to_path_buf();
                }
            }
        }
    }

    get_app_root()
}

/// Build an absolute path from a path relative to the writable data root.
fn resolve_path(relative: &str) -> PathBuf {
    get_data_root().join(relative)
}

/// Build an absolute path from a path relative to the bundled app root.
/// Used as fallback when writable data root doesn't have the file yet (e.g. AppImage first run).
fn resolve_bundled_path(app_handle: &tauri::AppHandle, relative: &str) -> Option<PathBuf> {
    app_handle.path().resolve(relative, tauri::path::BaseDirectory::Resource).ok()
}

/// Simple command to proxy frontend logs to the terminal/stdout.
#[tauri::command]
fn log_terminal(message: String) {
    eprintln!("[JS] {}", message);
}

// --- Export Management ---
//
// JSON exports come from the warframe-public-export-plus mirror on GitHub and
// are cached in data/export/.  They're refreshed every 24 hours.
//
// Supplementary dictionary fields come from oracle.browse.wf (used for item
// name look-ups that aren't covered by the standard export files).
//
// TXT data files (arbitration/Steel Path data) come from browse.wf and are
// cached for 6 hours because they change more often.

const EXPORT_FILES: &[&str] = &[
    "ExportWarframes.json",
    "ExportWeapons.json",
    "ExportSentinels.json",
    "ExportUpgrades.json",
    "ExportAvionics.json",
    "ExportArcanes.json",
    "ExportResources.json",
    "ExportRelics.json",
    "ExportRewards.json",
    "ExportChallenges.json",
    "ExportRegions.json",
    "ExportNightwave.json",
    "ExportSyndicates.json",
    "ExportBoosterPacks.json",
    "ExportRecipes.json",
    "ExportCustoms.json",
    "ExportGear.json",
    "ExportImages.json",
    "ExportTextIcons.json",
    "dict.en.json",
    "supp-dict-en.json",
];

const BASE_URL: &str =
    "https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/master";

// TXT files are optional - download failures are non-fatal.
const TXT_FILES: &[(&str, &str)] = &[
    ("arbys.txt",         "https://browse.wf/arbys.txt"),
    ("sp-incursions.txt", "https://browse.wf/sp-incursions.txt"),
];

// --- Shared Download Helper ---

/// Download a file from `url` and write it to `dest`.
/// Returns `Ok(true)` on success, or an error string on failure.
async fn download_file(client: &reqwest::Client, url: &str, dest: &std::path::Path) -> Result<bool, String> {
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {} for {}", resp.status(), url));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    fs::write(dest, bytes).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Return the age in seconds of a file on disk, or `u64::MAX` if the metadata
/// can't be read (treats unreadable files as needing a refresh).
fn file_age_secs(path: &std::path::Path) -> u64 {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| SystemTime::now().duration_since(t).ok())
        .map(|d| d.as_secs())
        .unwrap_or(u64::MAX)
}

// --- Tauri Commands ---
//
// All functions marked `#[tauri::command]` are callable from the frontend via
// `invoke('command_name', args)`.  See MonitoringContext.jsx for the primary
// call sites.

/// Download or refresh all game data exports (JSON + TXT).
/// Called by MonitoringContext on startup and on each monitoring cycle.
/// JSON exports are refreshed every 24 h; TXT files every 6 h.
#[tauri::command]
async fn check_exports() -> Result<String, String> {
    let export_dir = resolve_path("data/export");
    if !export_dir.exists() {
        fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    }

    let client = reqwest::Client::new();
    let mut updated_count = 0u32;

    // JSON exports - refresh once per day
    for file_name in EXPORT_FILES {
        let path = export_dir.join(file_name);
        let needs_update = !path.exists() || file_age_secs(&path) > 86_400;

        if needs_update {
            let url = if *file_name == "supp-dict-en.json" {
                "https://oracle.browse.wf/dicts/en.json".to_string()
            } else {
                format!("{}/{}", BASE_URL, file_name)
            };
            download_file(&client, &url, &path).await.map_err(|e| {
                format!("Failed to download {}: {}", file_name, e)
            })?;
            updated_count += 1;
        }
    }

    // TXT data files - refresh every 6 hours; failures are non-fatal
    for (file_name, url) in TXT_FILES {
        let path = export_dir.join(file_name);
        let needs_update = !path.exists() || file_age_secs(&path) > 21_600;

        if needs_update {
            match download_file(&client, url, &path).await {
                Ok(_) => updated_count += 1,
                Err(e) => eprintln!("Warning: could not download {}: {}", file_name, e),
            }
        }
    }

    Ok(format!("Updated {} files", updated_count))
}

/// Download the riven pricing ONNX model and vocab files if not already cached.
#[tauri::command]
async fn check_pricer_models() -> Result<String, String> {
    let models_dir = crate::pricer::get_models_dir();
    if !models_dir.exists() {
        std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;
    }
    let version = env!("CARGO_PKG_VERSION");
    let base = format!("https://raw.githubusercontent.com/glowseeker/cephalon-kronos/v{}/src-tauri/data/bin/pricer-models", version);
    let files = &[
        "price_model.onnx",
        "weapon_vocab.json",
        "attr_vocab.json",
        "items_data.json",
        "attribute_name_shortcuts.json",
        "effect_to_url_name.json",
    ];
    let client = reqwest::Client::new();
    let mut downloaded = 0u32;
    for file in files {
        let path = models_dir.join(file);
        if !path.exists() {
            let url = format!("{}/{}", base, file);
            download_file(&client, &url, &path).await.map_err(|e| {
                format!("Failed to download pricer model {}: {}", file, e)
            })?;
            downloaded += 1;
        }
    }
    Ok(format!("Downloaded {} pricer model files", downloaded))
}

/// Download PP-OCRv5 models for ocr-rs if not already cached.
#[tauri::command]
async fn check_ocr_models() -> Result<String, String> {
    let models_dir = crate::ocr_engine::models_dir();
    if !models_dir.exists() {
        std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;
    }
    let rec_path = models_dir.join("PP-OCRv5_mobile_rec.mnn");
    let keys_path = models_dir.join("ppocr_keys_v5.txt");
    let mut downloaded = 0u32;
    let client = reqwest::Client::new();
    let base = "https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/main/models";
    let det_path = models_dir.join("PP-OCRv5_mobile_det.mnn");
    if !det_path.exists() {
        let url = format!("{}/PP-OCRv5_mobile_det.mnn", base);
        download_file(&client, &url, &det_path).await.map_err(|e| {
            format!("Failed to download PP-OCRv5 detection model: {}", e)
        })?;
        downloaded += 1;
    }
    if !rec_path.exists() {
        let url = format!("{}/PP-OCRv5_mobile_rec.mnn", base);
        download_file(&client, &url, &rec_path).await.map_err(|e| {
            format!("Failed to download PP-OCRv5 recognition model: {}", e)
        })?;
        downloaded += 1;
    }
    if !keys_path.exists() {
        let url = format!("{}/ppocr_keys_v5.txt", base);
        download_file(&client, &url, &keys_path).await.map_err(|e| {
            format!("Failed to download PP-OCRv5 charset: {}", e)
        })?;
        downloaded += 1;
    }
    Ok(format!("Downloaded {} OCR model files", downloaded))
}

/// Read a cached TXT file from data/export/ and return its contents as a string.
/// Returns an empty string if the file doesn't exist (e.g. first run offline).
/// Called by the Dashboard to load arbitration/Steel Path data.
#[tauri::command]
async fn load_txt_file(app_handle: tauri::AppHandle, name: String) -> Result<String, String> {
    // Try writable location first, fall back to bundled
    let path = resolve_path("data/export").join(&name);
    if path.exists() {
        return fs::read_to_string(&path).map_err(|e| e.to_string());
    }
    
    if let Some(bundled) = resolve_bundled_path(&app_handle, &format!("data/export/{}", name)) {
        if bundled.exists() {
            return fs::read_to_string(&bundled).map_err(|e| e.to_string());
        }
    }
    
    Ok(String::new())
}

// --- Inventory Management ---
//
// Inventory data is obtained by running the bundled warframe-api-helper binary,
// which authenticates with Warframe's servers using the local game session.
// The result is stored as data/user/inventory.json.

/// Load the previously saved inventory JSON and its file modification timestamp.
/// Returns `None` if no inventory has been fetched yet (fresh install).
/// Called by MonitoringContext on startup to restore the last known state.
#[tauri::command]
async fn load_cached_inventory() -> Result<Option<(Value, u64)>, String> {
    let path = resolve_path("data/user/inventory.json");
    if !path.exists() {
        return Ok(None);
    }
    let timestamp = fs::metadata(&path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or_else(|| {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        });
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read inventory.json: {e}"))?;
    let json: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse inventory.json: {e}"))?;
    Ok(Some((json, timestamp)))
}

/// Run the warframe-api-helper binary to fetch a fresh inventory from the game
/// servers, save it to data/user/inventory.json, and return the parsed JSON.
/// Called by MonitoringContext on manual scan and on each monitoring tick.
#[tauri::command]
async fn call_api_helper(app_handle: tauri::AppHandle) -> Result<Value, String> {
    // Binary is always bundled - check writable location first, fall back to bundled
    let bin_name = format!("warframe-api-helper{}", std::env::consts::EXE_SUFFIX);
    let relative_bin = format!("data/bin/{}", bin_name);
    let writable_bin = resolve_path(&relative_bin);
    let bundled_bin = resolve_bundled_path(&app_handle, &relative_bin);
    let bin_path = if writable_bin.exists() {
        writable_bin
    } else if let Some(b) = bundled_bin.clone().filter(|p| p.exists()) {
        b
    } else {
        return Err(format!(
            "warframe-api-helper not found. Writable: {:?}, Bundled: {:?}",
            writable_bin, bundled_bin
        ));
    };
    
    let inv_dir = resolve_path("data/user");
    let inv_path = inv_dir.join("inventory.json");

    if !inv_dir.exists() {
        fs::create_dir_all(&inv_dir).map_err(|e| e.to_string())?;
    }

    // Make the binary executable on Unix platforms.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = fs::metadata(&bin_path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&bin_path, perms);
        }
    }

    let mut cmd = std::process::Command::new(&bin_path);
    cmd.arg(format!("--output={}", inv_path.to_string_lossy()))
       .current_dir(&inv_dir);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output()
        .map_err(|e| format!("Failed to launch warframe-api-helper: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("warframe-api-helper failed: {stderr}"));
    }

    let content = fs::read_to_string(&inv_path)
        .map_err(|e| format!("Failed to read inventory.json after update: {e}"))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse updated inventory.json: {e}"))
}

/// Load all JSON export files into a single JSON object keyed by file stem
/// (e.g. `{ "ExportWeapons": [...], "ExportWarframes": [...], ... }`).
/// Called by MonitoringContext once on startup; passed to inventoryParser.js.
#[tauri::command]
async fn load_all_exports(app_handle: tauri::AppHandle) -> Result<Value, String> {
    let export_dir = resolve_path("data/export");
    let mut result = serde_json::Map::new();

    for file_name in EXPORT_FILES {
        // Try writable location first, fall back to bundled
        let path = export_dir.join(file_name);
        
        let path = if path.exists() {
            path
        } else if let Some(bundled) = resolve_bundled_path(&app_handle, &format!("data/export/{}", file_name)) {
            if bundled.exists() { bundled } else { continue }
        } else {
            continue
        };
        
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let key = file_name.trim_end_matches(".json");
        result.insert(key.to_string(), json);
    }
    Ok(Value::Object(result))
}

// --- Notes Management ---
//
// Notes are stored as individual Markdown files under data/user/notes/.
// The Notes screen calls these commands directly via Tauri invoke.

/// Return a sorted list of all note filenames (*.md) in data/user/notes/.
#[tauri::command]
async fn list_notes(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let notes_dir = resolve_path("data/user/notes");
    
    // Ensure writable directory exists
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }
    
    let mut notes = Vec::new();
    
    // Read from writable location first
    if let Ok(entries) = fs::read_dir(&notes_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".md") {
                    notes.push(name.to_string());
                }
            }
        }
    }

    // If no notes exist, create the Welcome note
    if notes.is_empty() {
        let welcome_name = "Welcome.md".to_string();
        let welcome_content = r#"# Welcome to Cephalon Kronos

This is a showcase of the **Notes** feature. You can use this space to either write your own notes or import guides from elsewhere.

Basic text formatting like **bold**, *italic*, <u>underscore</u>

* Bulletpoint lists

1. Numbered lists

* [ ] Checkmarks

`inline code`

***

| Support for tables |   |   |
| ------------------ | - | - |
|                    |   |   |
|                    |   |   |
"#;
        let welcome_path = notes_dir.join(&welcome_name);
        let _ = fs::write(welcome_path, welcome_content);
        notes.push(welcome_name);
    }
    
    // Also check bundled location for notes that haven't been copied yet
    // Skip this in debug builds to avoid issues with source/data being the same
    if !cfg!(debug_assertions) {
        if let Some(bundled_dir) = resolve_bundled_path(&app_handle, "data/user/notes") {
            if bundled_dir.exists() && bundled_dir != notes_dir {
                if let Ok(entries) = fs::read_dir(&bundled_dir) {
                    for entry in entries.flatten() {
                        if let Some(name) = entry.file_name().to_str() {
                            if name.ends_with(".md") && !notes.contains(&name.to_string()) {
                                // Copy to writable location first
                                let dest = notes_dir.join(name);
                                if !dest.exists() {
                                    let _ = fs::copy(entry.path(), &dest);
                                }
                                notes.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    
    notes.sort();
    Ok(notes)
}

/// Read the contents of a single note file.
/// Returns an empty string if the file doesn't exist.
#[tauri::command]
async fn read_note(filename: String) -> Result<String, String> {
    let path = resolve_path("data/user/notes").join(filename);
    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

/// Write content to a note file, creating it if it doesn't exist.
#[tauri::command]
async fn save_note(filename: String, content: String) -> Result<(), String> {
    let notes_dir = resolve_path("data/user/notes");
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }
    fs::write(notes_dir.join(filename), content).map_err(|e| e.to_string())
}

/// Delete a note file.  No-op if it doesn't exist.
#[tauri::command]
async fn delete_note(app_handle: tauri::AppHandle, filename: String) -> Result<(), String> {
    let path = resolve_path("data/user/notes").join(&filename);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())
    } else {
        if let Some(bundled) = resolve_bundled_path(&app_handle, &format!("data/user/notes/{}", filename)) {
            if bundled.exists() {
                fs::remove_file(bundled).map_err(|e| e.to_string())
            } else {
                Ok(())
            }
        } else {
            Ok(())
        }
    }
}

/// Open the data/ directory in the OS file browser.
/// Called from the Settings screen.
#[tauri::command]
async fn open_data_folder() -> Result<(), String> {
    let path = resolve_path("data");
    #[cfg(target_os = "windows")]
    { std::process::Command::new("explorer").arg(path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "linux")]
    { std::process::Command::new("xdg-open").arg(path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "macos")]
    { std::process::Command::new("open").arg(path).spawn().map_err(|e| e.to_string())?; }
    Ok(())
}

// --- Media Assets ---
//
// Map images and mastery rank icons are downloaded on demand from the GitHub
// repo and cached permanently (no re-download once present).

const MAP_FILES: &[&str] = &[
    "PlainsofEidolon_4k_Map.png",
    "OrbVallis4kMap-min.png",
    "CambianDrift4kMap.png",
    "Duviri_map_with_caves.png",
];

// Rank names up to 30 are suffixed in filenames (e.g. Rank01Initiate.png).
// Ranks 31+ use a plain numeric filename (e.g. Rank31.png).
const RANK_NAMES: &[&str] = &[
    "Unranked", "Initiate", "SilverInitiate", "GoldInitiate",
    "Novice", "SilverNovice", "GoldNovice",
    "Disciple", "SilverDisciple", "GoldDisciple",
    "Seeker", "SilverSeeker", "GoldSeeker",
    "Hunter", "SilverHunter", "GoldHunter",
    "Eagle", "SilverEagle", "GoldEagle",
    "Tiger", "SilverTiger", "GoldTiger",
    "Dragon", "SilverDragon", "GoldDragon",
    "Sage", "SilverSage", "GoldSage",
    "Master", "MiddleMaster", "GrandMaster"
];

include!(concat!(env!("OUT_DIR"), "/bundled_assets.rs"));

fn extract_bundled_assets(app_handle: &tauri::AppHandle) {
    // Copy bundled asset files from inside the AppImage to the writable
    // data root.  Runs once at startup so resolve_path finds everything.
    for rel in BUNDLED_ASSET_FILES {
        let dest = resolve_path(rel);
        if dest.exists() {
            continue;
        }
        if let Some(parent) = dest.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Some(bundled) = resolve_bundled_path(app_handle, rel) {
            if bundled.exists() {
                let _ = fs::copy(&bundled, &dest);
            }
        }
    }
}

/// Download any map or mastery icon assets that aren't already cached.
/// Called by MonitoringContext on startup.  Failures are non-fatal per asset.
#[tauri::command]
async fn check_media_assets() -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut downloaded = 0u32;
    let base_url = "https://raw.githubusercontent.com/glowseeker/cephalon-kronos/main/src-tauri/data/export";

    // Download open-world maps to assets (used by Maps screen)
    let maps_dir = resolve_path("data/assets/maps");
    if !maps_dir.exists() {
        fs::create_dir_all(&maps_dir).map_err(|e| e.to_string())?;
    }
    
    for map in MAP_FILES {
        let path = maps_dir.join(map);
        if !path.exists() {
            let url = format!("{}/maps/{}", base_url, map);
            if download_file(&client, &url, &path).await.is_ok() {
                downloaded += 1;
            }
        }
    }

    // Download mastery rank icons to assets (used by Mastery screen)
    let icons_dir = resolve_path("data/assets/mastery-icons");
    if !icons_dir.exists() {
        fs::create_dir_all(&icons_dir).map_err(|e| e.to_string())?;
    }
    
    for rank in 0..=40 {
        let filename = if rank <= 30 {
            format!("Rank{:02}{}.png", rank, RANK_NAMES[rank])
        } else {
            format!("Rank{}.png", rank)
        };
        let path = icons_dir.join(&filename);
        if !path.exists() {
            let url = format!("{}/masteryicons/{}", base_url, filename);
            if download_file(&client, &url, &path).await.is_ok() {
                downloaded += 1;
            }
        }
    }

    Ok(format!("Downloaded {} media assets", downloaded))
}

/// Return the absolute path to the mastery icons directory.
/// Used by the Mastery screen to construct file:// image URLs.
#[tauri::command]
fn get_mastery_icons_path() -> String {
    resolve_path("data/assets/mastery-icons").to_string_lossy().to_string()
}

/// Return the absolute path to the maps directory.
/// Used by the Maps screen to construct file:// image URLs.
#[tauri::command]
fn get_maps_path() -> String {
    resolve_path("data/assets/maps").to_string_lossy().to_string()
}

/// Return the absolute path to the assets directory.
/// Used to display decorative images in the UI.
#[tauri::command]
fn get_assets_path() -> String {
    resolve_path("data/assets").to_string_lossy().to_string()
}

/// Return the absolute path to the mod frame images directory.
#[tauri::command]
fn get_mod_frames_path() -> String {
    resolve_path("data/assets/mod-frames").to_string_lossy().to_string()
}

/// Return the absolute path to the icons directory.
#[tauri::command]
fn get_icons_path() -> String {
    resolve_path("data/assets/ui").to_string_lossy().to_string()
}

/// Return the absolute path to the UI assets directory (faction icons, nav icons, etc.).
#[tauri::command]
fn get_ui_path() -> String {
    resolve_path("data/assets/ui").to_string_lossy().to_string()
}

/// Return the Warframe image CDN base URL for loading syndicate/focus icons.
#[tauri::command]
fn get_cdn_base_url() -> String {
    "https://browse.wf".to_string()
}

// --- Card Images Extraction ---
//
// Card images are extracted from the local Warframe game cache using the
// bundled Warframe-Exporter-CLI tool.  The user must have Warframe installed
// with a populated cache (i.e. they've run the game at least once).

/// Return the absolute path to the card images directory.
#[tauri::command]
fn get_card_images_path() -> String {
    resolve_path("data/assets/card-images").to_string_lossy().to_string()
}

/// Read a file from the data root as raw bytes. Used by the frontend to
/// bypass CORS restrictions on the asset protocol when processing images via canvas.
#[tauri::command]
fn read_file_bytes(relative: String) -> Result<Vec<u8>, String> {
    let path = resolve_path(&relative);
    fs::read(&path).map_err(|e| e.to_string())
}

// ─── Card image pre-processing ───────────────────────────────────────────────

#[derive(Clone, serde::Serialize)]
struct CardProgress { phase: String, current: usize, total: usize, current_file: String }

/// Consolidated card-image pipeline: extract → fix → composite, with
/// unified progress events so the frontend only calls a single command.
#[tauri::command]
async fn ensure_card_images(
    app_handle: tauri::AppHandle,
    window: tauri::WebviewWindow,
    cache_path: String,
) -> Result<String, String> {
    let card_root = resolve_path("data/assets/card-images");
    std::fs::create_dir_all(&card_root).map_err(|e| e.to_string())?;

    // 1. Extract
    let _ = window.emit("card-progress", CardProgress {
        phase: "extracting".into(),
        current: 0, total: 1, current_file: String::new(),
    });
    extract_card_images_inner(&app_handle, &cache_path)
        .map_err(|e| format!("Extraction failed: {e}"))?;
    let _ = window.emit("card-progress", CardProgress {
        phase: "extracting".into(),
        current: 1, total: 1, current_file: String::new(),
    });

    // 2. Fix (spawn_blocking so it doesn't block the async runtime)
    let fix_root = card_root.clone();
    let fix_win = window.clone();
    tokio::task::spawn_blocking(move || {
        let manifest_path = fix_root.join(".fix-manifest.json");

        let mut processed: std::collections::HashSet<String> =
            std::fs::read_to_string(&manifest_path).ok()
                .and_then(|b| serde_json::from_str::<Vec<String>>(&b).ok())
                .map(|v| v.into_iter().collect())
                .unwrap_or_default();

        let mut pending: Vec<std::path::PathBuf> = Vec::new();
        let mut stack = vec![fix_root.to_path_buf()];
        while let Some(dir) = stack.pop() {
            let Ok(rd) = std::fs::read_dir(&dir) else { continue };
            for e in rd.flatten() {
                let p = e.path();
                if p.is_dir() { stack.push(p); }
                else if p.extension().map_or(false, |x| x.eq_ignore_ascii_case("png")) {
                    if let Ok(rel) = p.strip_prefix(&fix_root) {
                        let key = rel.to_string_lossy().replace('\\', "/");
                        if key.starts_with("Lotus/Interface/Icons/") { continue; }
                        if !processed.contains(&key) { pending.push(p); }
                    }
                }
            }
        }

        let total = pending.len();
        let _ = fix_win.emit("card-progress", CardProgress {
            phase: "fixing".into(), current: 0, total,
            current_file: String::new(),
        });

        for (i, file) in pending.iter().enumerate() {
            if i % 10 == 0 {
                let _ = fix_win.emit("card-progress", CardProgress {
                    phase: "fixing".into(), current: i, total,
                    current_file: file.file_name()
                        .map(|n| n.to_string_lossy().into_owned())
                        .unwrap_or_default(),
                });
            }
            if let Err(e) = make_fully_opaque(file) {
                eprintln!("ensure_card_images: skip corrupt {:?}: {e}", file);
            }
            if let Ok(rel) = file.strip_prefix(&fix_root) {
                processed.insert(rel.to_string_lossy().replace('\\', "/"));
            }
        }

        if !pending.is_empty() {
            let mut list: Vec<&String> = processed.iter().collect();
            list.sort();
            let _ = std::fs::write(&manifest_path, serde_json::to_string(&list).unwrap());
        }

        let _ = fix_win.emit("card-progress", CardProgress {
            phase: "fixing".into(), current: total, total,
            current_file: String::new(),
        });
    }).await.map_err(|e| format!("Fix task failed: {e}"))?;

    // 3. Composite
    composite_card_overlays_inner(&card_root);

    let _ = window.emit("card-progress", CardProgress {
        phase: "done".into(), current: 1, total: 1, current_file: String::new(),
    });

    Ok(card_root.to_string_lossy().to_string())
}

/// Fast check: returns the number of PNGs NOT yet in the manifest.
/// If 0, the frontend can skip the fix overlay entirely.
#[tauri::command]
fn count_unfixed_card_images(path: String) -> usize {
    let root = std::path::Path::new(&path);
    if !root.exists() { return 0; }

    let manifest_path = root.join(".fix-manifest.json");
    let processed: std::collections::HashSet<String> =
        std::fs::read_to_string(&manifest_path).ok()
            .and_then(|body| serde_json::from_str::<Vec<String>>(&body).ok())
            .map(|v| v.into_iter().collect())
            .unwrap_or_default();

    let mut count = 0;
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let Ok(rd) = std::fs::read_dir(&dir) else { continue };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() { stack.push(p); }
            else if p.extension().map_or(false, |x| x.eq_ignore_ascii_case("png")) {
                if let Ok(rel) = p.strip_prefix(root) {
                    let key = rel.to_string_lossy().replace('\\', "/");
                    // Skip files under Lotus/Interface/Icons/ — these are
                    // UI icons (Antivirus, ImmortalRunes, etc.) that must
                    // keep their original transparency.
                    if key.starts_with("Lotus/Interface/Icons/") { continue; }
                    if !processed.contains(&key) { count += 1; }
                }
            }
        }
    }
    count
}



/// Set alpha=255 on every pixel of a PNG in-place.
fn make_fully_opaque(path: &std::path::Path)
    -> Result<(), Box<dyn std::error::Error + Send + Sync>>
{
    let bytes = std::fs::read(path)?;
    let img = image::load_from_memory(&bytes)?;
    let mut rgba = img.to_rgba8();

    for pixel in rgba.pixels_mut() {
        pixel[3] = 255;
    }

    let mut out = Vec::with_capacity(bytes.len());
    rgba.write_to(&mut Cursor::new(&mut out), image::ImageFormat::Png)?;
    std::fs::write(path, out)?;
    Ok(())
}

/// Composite an overlay icon onto a card image (in-place).
/// The overlay is scaled down and centered on the card with alpha blending.
fn composite_overlay(card_path: &std::path::Path, overlay_path: &std::path::Path)
    -> Result<(), Box<dyn std::error::Error + Send + Sync>>
{
    let card_bytes = std::fs::read(card_path)?;
    let mut card_img = image::load_from_memory(&card_bytes)?.to_rgba8();

    let ov_bytes = std::fs::read(overlay_path)?;
    let ov_img = image::load_from_memory(&ov_bytes)?.to_rgba8();

    // Scale the overlay to 80% of the card's shorter dimension
    let card_min = card_img.width().min(card_img.height());
    let ov_max = ov_img.width().max(ov_img.height());
    let scale = (card_min as f64 * 0.8 / ov_max as f64).min(1.0);
    let ov_w = (ov_img.width() as f64 * scale).round() as u32;
    let ov_h = (ov_img.height() as f64 * scale).round() as u32;
    let mut ov_scaled = image::imageops::resize(&ov_img, ov_w.max(1), ov_h.max(1),
        image::imageops::Lanczos3);

    // Reduce overlay opacity to 50% before compositing
    for pixel in ov_scaled.pixels_mut() {
        pixel[3] = pixel[3] / 2;
    }

    // Center the scaled overlay on the card
    let x = (card_img.width().saturating_sub(ov_scaled.width())) / 2;
    let y = (card_img.height().saturating_sub(ov_scaled.height())) / 2;

    image::imageops::overlay(&mut card_img, &ov_scaled, x as i64, y as i64);

    let mut out = Vec::with_capacity(card_bytes.len());
    card_img.write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png)?;
    std::fs::write(card_path, out)?;
    Ok(())
}

/// Read the overlay map and composite each overlay onto its card image.
/// Tracks already-composited cards in .overlay-manifest.json so it is
/// idempotent — subsequent calls skip cards already processed.
fn composite_card_overlays_inner(card_root: &std::path::Path) {
    let overlay_map_path = card_root.join("../data/card-overlay-map.json");
    let Ok(body) = std::fs::read_to_string(&overlay_map_path) else { return };
    let Ok(map) = serde_json::from_str::<std::collections::HashMap<String, String>>(&body) else { return };

    let manifest_path = card_root.join(".overlay-manifest.json");
    let mut done: std::collections::HashSet<String> = std::fs::read_to_string(&manifest_path).ok()
        .and_then(|b| serde_json::from_str::<Vec<String>>(&b).ok())
        .map(|v| v.into_iter().collect())
        .unwrap_or_default();

    for (card_rel, overlay_rel) in &map {
        let key = card_rel.clone();
        if done.contains(&key) { continue; }
        let card_path = card_root.join(card_rel);
        let overlay_path = card_root.join(overlay_rel);
        if card_path.exists() && overlay_path.exists() {
            if let Err(e) = composite_overlay(&card_path, &overlay_path) {
                eprintln!("composite_overlay {}: {e}", card_rel);
            }
        }
        done.insert(key);
    }

    if !map.is_empty() {
        let mut list: Vec<&String> = done.iter().collect();
        list.sort();
        let _ = std::fs::write(&manifest_path, serde_json::to_string(&list).unwrap());
    }
}

/// Auto-detect the Warframe cache directory by checking Steam registry.
/// Returns the cache path on success or an error if not found.
#[tauri::command]
fn detect_warframe_cache() -> Result<String, String> {
    detect_cache_inner().ok_or_else(|| {
        "Could not find Warframe cache. Please set the path manually in Settings.".to_string()
    })
}

fn detect_cache_inner() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        // Try Steam registry
        if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey(r"Software\Valve\Steam")
        {
            if let Ok(steam_path) = hkcu.get_value::<String, _>("SteamPath") {
                // SteamPath uses forward slashes
                let steam_path = steam_path.replace('/', r"\");
                let candidate = format!(r"{}\steamapps\common\Warframe\Cache.Windows", steam_path);
                let path = Path::new(&candidate);
                if path.exists() {
                    return Some(candidate);
                }
                // Also try libraryfolders.vdf for alternate install dirs
                let library_path = format!(r"{}\steamapps\libraryfolders.vdf", steam_path);
                if let Ok(content) = std::fs::read_to_string(&library_path) {
                    for line in content.lines() {
                        if let Some(path_part) = line.split('"').nth(3) {
                            let path_part = path_part.replace(r"\\", r"\");
                            let alt = format!(r"{}\steamapps\common\Warframe\Cache.Windows", path_part.trim());
                            if Path::new(&alt).exists() {
                                return Some(alt);
                            }
                        }
                    }
                }
            }
        }

        // Fallback: try common locations
        let drives = ["C:", "D:", "E:", "F:"];
        for drive in &drives {
            let candidate = format!(r"{}\Program Files (x86)\Steam\steamapps\common\Warframe\Cache.Windows", drive);
            if Path::new(&candidate).exists() {
                return Some(candidate);
            }
        }

        // Last resort: try to find the running Warframe process path via WMIC
        if let Ok(output) = std::process::Command::new("wmic")
            .args(["process", "where", "name=\"Warframe.x64.exe\"", "get", "ExecutablePath"])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() && !trimmed.eq_ignore_ascii_case("ExecutablePath") {
                        let exe_path = Path::new(trimmed);
                        if let Some(parent) = exe_path.parent() {
                            let candidate = parent.join("Cache.Windows");
                            if candidate.exists() {
                                return Some(candidate.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Steam on Linux: try common install paths
        if let Ok(home) = std::env::var("HOME") {
            let candidates = [
                format!("{}/.steam/steam/steamapps/common/Warframe/Cache.Windows", home),
                format!("{}/.local/share/Steam/steamapps/common/Warframe/Cache.Windows", home),
                format!("{}/snap/steam/common/.local/share/Steam/steamapps/common/Warframe/Cache.Windows", home),
            ];
            for c in &candidates {
                if Path::new(c).exists() {
                    return Some(c.clone());
                }
            }
        }

        // Fallback: try to find the running Warframe process via /proc
        if let Ok(pids) = std::fs::read_dir("/proc") {
            for entry in pids.flatten() {
                let pid = entry.file_name();
                let pid_str = pid.to_string_lossy();
                if !pid_str.chars().all(|c| c.is_ascii_digit()) { continue; }
                let exe_path = Path::new("/proc").join(&pid).join("exe");
                if let Ok(target) = std::fs::read_link(&exe_path) {
                    let target_str = target.to_string_lossy();
                    if target_str.contains("Warframe") || target_str.contains("warframe") {
                        if let Some(parent) = target.parent() {
                            let candidate = parent.join("Cache.Windows");
                            if candidate.exists() {
                                return Some(candidate.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Steam on macOS via CrossOver/Whisky or native Steam
        if let Ok(home) = std::env::var("HOME") {
            let candidates = [
                // Native Steam (if Warframe were supported)
                format!("{}/Library/Application Support/Steam/steamapps/common/Warframe/Cache.Windows", home),
                // CrossOver default bottle
                format!("{}/Library/Application Support/CrossOver/Bottles/Steam/drive_c/Program Files (x86)/Steam/steamapps/common/Warframe/Cache.Windows", home),
                // Whisky bottles
                format!("{}/Library/Containers/com.isaacmarovitz.Whisky/Bottles/Steam/drive_c/Program Files (x86)/Steam/steamapps/common/Warframe/Cache.Windows", home),
            ];
            for c in &candidates {
                if Path::new(c).exists() {
                    return Some(c.clone());
                }
            }
        }

        // Fallback: try to find Warframe process via `mdfind` or `pgrep`
        if let Ok(output) = std::process::Command::new("pgrep")
            .args(["-fl", "Warframe"])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if let Some(exe_path) = line.split_whitespace().nth(1) {
                        let exe_path = Path::new(exe_path);
                        if let Some(parent) = exe_path.parent() {
                            let candidate = parent.join("Cache.Windows");
                            if candidate.exists() {
                                return Some(candidate.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

/// Extract card images from the Warframe cache using the bundled CLI.
/// Skips if already extracted (output dir has PNG files).
fn extract_card_images_inner(app_handle: &tauri::AppHandle, cache_path: &str) -> Result<u32, String> {
    let output_dir = resolve_path("data/assets/card-images");
    std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;

    // Locate the CLI binary
    let bin_name = format!("Warframe-Exporter-CLI{}", std::env::consts::EXE_SUFFIX);
    let relative_bin = format!("data/bin/{}", bin_name);
    let writable_bin = resolve_path(&relative_bin);
    let bundled_bin = resolve_bundled_path(app_handle, &relative_bin);

    #[cfg(target_os = "linux")]
    let (writable_bin, bundled_bin) = {
        let appimage_name = "data/bin/Warframe-Exporter-CLI_Linux.AppImage";
        let wb = if !writable_bin.exists() {
            resolve_path(appimage_name)
        } else {
            writable_bin
        };
        let bb = if bundled_bin.as_ref().map_or(true, |p| !p.exists()) {
            resolve_bundled_path(app_handle, appimage_name)
        } else {
            bundled_bin
        };
        (wb, bb)
    };

    let bin_path = if writable_bin.exists() {
        writable_bin
    } else if let Some(b) = bundled_bin.clone().filter(|p| p.exists()) {
        b
    } else {
        return Err(format!(
            "Warframe-Exporter-CLI not found. Writable: {:?}, Bundled: {:?}",
            writable_bin, bundled_bin
        ));
    };

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(&bin_path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&bin_path, perms);
        }
    }

    // Only do the main Cards/Images extraction if the output directory
    // is empty (first run or after a clean).
    if walk_dir_count(&output_dir) == 0 {
        let mut cmd = std::process::Command::new(&bin_path);

        #[cfg(target_os = "linux")]
        {
            cmd.env("APPIMAGE_EXTRACT_AND_RUN", "1");
            cmd.env_remove("APPDIR");
            cmd.env_remove("APPIMAGE");
        }

        cmd.arg("--cache-dir")
           .arg(cache_path)
           .arg("--game")
           .arg("Warframe")
           .arg("--extract-textures")
           .arg("--package")
           .arg("Texture")
           .arg("--texture-format")
           .arg("PNG")
           .arg("--internal-path")
           .arg("/Lotus/Interface/Cards/Images/")
           .arg("--output-path")
           .arg(&output_dir);

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let output = cmd.output().map_err(|e| format!("Failed to launch Warframe-Exporter-CLI: {e}"))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Warframe-Exporter-CLI failed: {stderr}"));
        }
    }

    let mut extracted = walk_dir_count(&output_dir);

    // Antivirus / Requiem / Tome cards: the game ships them as UI icons
    // (/Lotus/Interface/Icons/...) rather than card textures, so the
    // Card pass above produces nothing for those paths. Re-run the
    // exporter targeting the well-known UI icon subfolders and drop the
    // results into the same card-images tree so the frontend can find
    // them under its expected paths.
    //
    // Always check each UI icon path individually — they may not have
    // been extracted on a previous run (e.g. if the early-return guard
    // was in place before this restructuring).
    let ui_icon_paths = [
        "/Lotus/Interface/Icons/Antivirus/",
        "/Lotus/Interface/Icons/ImmortalRunes/",
        "/Lotus/Interface/Icons/Tomes/",
        "/Lotus/Interface/Icons/RailjackSystemMods/",
        "/Lotus/Interface/Icons/Stickers/",
        "/Lotus/Interface/Icons/CosmeticEnhancers/",
    ];
    for internal_path in ui_icon_paths.iter() {
        let ui_dir = output_dir.join(internal_path.trim_start_matches('/'));
        // If the directory exists but the files may have been alpha-fixed
        // by a previous run, wipe them so the extraction puts fresh copies.
        // We use a sentinel file (<dir>/.fresh) to know if we already did this.
        let sentinel = ui_dir.join(".fresh");
        if ui_dir.exists() && walk_dir_count(&ui_dir) > 0 && !sentinel.exists() {
            let _ = std::fs::remove_dir_all(&ui_dir);
        }
        if ui_dir.exists() && walk_dir_count(&ui_dir) > 0 {
            continue;
        }
        std::fs::create_dir_all(&ui_dir).ok();
        let _ = std::fs::write(&sentinel, b"1");
        let mut ui_cmd = std::process::Command::new(&bin_path);
        #[cfg(target_os = "linux")]
        {
            ui_cmd.env("APPIMAGE_EXTRACT_AND_RUN", "1");
            ui_cmd.env_remove("APPDIR");
            ui_cmd.env_remove("APPIMAGE");
        }
        ui_cmd.arg("--cache-dir")
              .arg(cache_path)
              .arg("--game")
              .arg("Warframe")
              .arg("--extract-textures")
              .arg("--package")
              .arg("Texture")
              .arg("--texture-format")
              .arg("PNG")
              .arg("--internal-path")
              .arg(internal_path)
              .arg("--output-path")
              .arg(&output_dir);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            ui_cmd.creation_flags(CREATE_NO_WINDOW);
        }
        let _ = ui_cmd.output();
        extracted = walk_dir_count(&output_dir);
    }

    Ok(extracted)
}

fn walk_dir_count(dir: &Path) -> u32 {
    let mut count = 0u32;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                count += walk_dir_count(&entry.path());
            } else if entry.file_name().to_string_lossy().ends_with(".png") {
                count += 1;
            }
        }
    }
    count
}

#[derive(Clone, serde::Serialize)]
struct NotificationPayload {
    id: String,
    title: String,
    message: String,
    image: String,
    position: String,
    persistent: bool,
}

#[tauri::command]
async fn show_relic_overlay(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    rewards: Value,
    persistent: Option<bool>,
) -> Result<(), String> {
    // Play sound
    let sound = state.notif_sound.lock().unwrap().clone();
    let app = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let _ = play_notification_sound(app, sound).await;
    });

    let app = app_handle.clone();

    let payload = serde_json::json!({
        "rewards": rewards,
        "persistent": persistent.unwrap_or(false)
    });

    // Show and position the relic window first
    let _ = show_overlay_window(app.clone(), "overlay-relic".to_string());

    // Longer delay - window needs time to actually appear and JS to be ready
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    app.emit("show-relic-rewards", payload)
        .map_err(|e| e.to_string())?;

    // (Rust-side timer for relics removed on Linux, now handled by start_notif_autoclose_timer from frontend)

    Ok(())
}

#[tauri::command]
fn hide_overlay_window(
    app_handle: tauri::AppHandle,
    label: String,
) -> Result<(), String> {
    if let Some(w) = app_handle.get_webview_window(&label) {
        let _ = w.hide();
    }
    Ok(())
}
#[tauri::command]
fn relay_event(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    event: String,
    payload: Value,
) -> Result<(), String> {
    // 1. Log the action
    logger::log_to_disk(&app_handle, &format!("[RELAY EVENT] Event: {}, Payload: {}", event, payload));

    // 2. Cache if it's a relic/reward update
    if event == "overlay-update-relics" || event == "overlay-update-reward" {
        let mut cached = state.active_relic_data.lock().unwrap();
        *cached = Some(payload.clone());
    }

    // 3. Reset cache if session closed
    if event == "fissure-reward-closed" {
         let mut cached = state.active_relic_data.lock().unwrap();
         *cached = None;
    }

    app_handle.emit(&event, payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_active_relic_session(state: tauri::State<'_, AppState>) -> Option<Value> {
    let cached = state.active_relic_data.lock().unwrap();
    cached.clone()
}

#[tauri::command]
fn set_notification_sound(state: tauri::State<'_, AppState>, sound: String) -> Result<(), String> {
    // Update in-memory state
    let mut current = state.notif_sound.lock().unwrap();
    *current = sound.clone();
    
    // Also persist to settings file
    let settings_path = resolve_path("data/user/settings.json");
    let mut settings: Value = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::json!({})
    };
    settings["notif_sound"] = serde_json::json!(sound);
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    
    // Ensure directory exists
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    std::fs::write(&settings_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn show_overlay_window(
    app_handle: tauri::AppHandle,
    label: String,
) -> Result<(), String> {
    overlay_utils::show_window_internal(&app_handle, &label)
}

#[tauri::command]
fn resize_overlay_window(
    app_handle: tauri::AppHandle,
    label: String,
    width: u32,
    height: u32,
) -> Result<(), String> {
    overlay_utils::resize_overlay_window(&app_handle, &label, width as f64, height as f64)
}

#[tauri::command]
fn raise_overlay(window: tauri::WebviewWindow) -> Result<(), String> {
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn set_ignore_cursor_events(
    app_handle: tauri::AppHandle,
    label: String,
    ignore: bool,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(&label)
        .ok_or_else(|| format!("window '{}' not found", label))?;
    window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())
}

#[tauri::command]
async fn play_notification_sound(app_handle: tauri::AppHandle, sound: String) -> Result<(), String> {
    if sound == "none" {
        return Ok(());
    }

    // Resolve from bundled resources (works in both dev and production)
    let sound_path = app_handle.path().resolve(format!("data/assets/audio/{}", sound), tauri::path::BaseDirectory::Resource).ok();
    
    let path = if let Some(p) = sound_path.filter(|p| p.exists()) {
        p
    } else {
        return Err(format!("Sound file not found: {}", sound));
    };
    
    let path_str = path.to_string_lossy().to_string();
    
    // Play using platform-native audio commands
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::ffi::OsStrExt;
            
            // Remove \\?\ prefix if present (PlaySound doesn't like it)
            let clean_path = path_str.replace("\\\\?\\", "");
            let wide_path: Vec<u16> = std::ffi::OsStr::new(&clean_path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            unsafe {
                #[link(name = "winmm")]
                extern "system" {
                    fn PlaySoundW(pszSound: *const u16, hmod: *mut std::ffi::c_void, fdwSound: u32) -> i32;
                }
                const SND_FILENAME: u32 = 0x00020000;
                const SND_ASYNC: u32 = 0x00000001;
                const SND_NODEFAULT: u32 = 0x00000002;
                
                eprintln!("[Audio] Playing via PlaySoundW: {}", clean_path);
                PlaySoundW(wide_path.as_ptr(), std::ptr::null_mut(), SND_FILENAME | SND_ASYNC | SND_NODEFAULT);
            }
        }
        
        #[cfg(target_os = "macos")]
        {
            eprintln!("[Audio] Playing via afplay: {}", path_str);
            let _ = std::process::Command::new("afplay")
                .arg(&path_str)
                .spawn();
        }
        
        #[cfg(target_os = "linux")]
        {
            eprintln!("[Audio] Playing via native player: {}", path_str);
            let played = std::process::Command::new("pw-play")
                .arg(&path_str)
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
                .map(|s| s.success())
                .unwrap_or(false);
            if !played {
                let played2 = std::process::Command::new("paplay")
                    .arg(&path_str)
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false);
                if !played2 {
                    let _ = std::process::Command::new("aplay")
                        .arg(&path_str)
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null())
                        .spawn();
                }
            }
        }
    }).await.ok();
    
    Ok(())
}


/// Show a notification toast. Routes to the correct overlay window by position.
/// Emits 'new-notification' globally; the matching window picks it up.
/// Plays the configured notification sound.
#[tauri::command]
async fn show_notification(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: Option<String>,
    title: String,
    message: String,
    image: Option<String>,
    position: Option<String>,
    persistent: Option<bool>,
    silent: Option<bool>,
    no_focus: Option<bool>,
) -> Result<(), String> {
    let pos       = position.unwrap_or_else(|| "top-right".to_string());
    let img       = image.unwrap_or_default();
    let persist   = persistent.unwrap_or(false);
    let silent    = silent.unwrap_or(false);
    let no_focus  = no_focus.unwrap_or(false);
    let notif_id  = id.unwrap_or_else(|| format!("notif-{}",
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
    ));

    // Determine which window label handles this position
    let label = match pos.as_str() {
        "top-left"   => "overlay-tl",
        "top-center" => "overlay-tc",
        _            => "overlay-tr",
    };

    // Show/reposition the overlay window (unless no_focus is set).
    // Note: get_webview_window is NOT used as a guard here — windows are created
    // dynamically by show_window_internal so they may not exist yet on first call.
    if !no_focus {
        // Wipe stale toasts if window already exists and was hidden
        if let Some(w) = app_handle.get_webview_window(label) {
            let was_hidden = !w.is_visible().unwrap_or(true);
            if was_hidden {
                let _ = w.emit("wipe-state", pos.clone());
            }
        }
        // Always call — creates the window if it doesn't exist yet
        let _ = show_overlay_window(app_handle.clone(), label.to_string());
    }

    // Play sound (unless silent)
    if !silent {
        let sound = state.notif_sound.lock().unwrap().clone();
        let app = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let _ = play_notification_sound(app, sound).await;
        });
    }

    // Emit the notification -- the matching overlay window renders it
    // Small delay lets the webview finish mounting before receiving the event
    tokio::time::sleep(std::time::Duration::from_millis(150)).await;

    app_handle.emit("new-notification", NotificationPayload {
        id: notif_id,
        title,
        message,
        image: img,
        position: pos,
        persistent: persist,
    }).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn open_url(_app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;

        // 1. Sanitize PATH to remove AppImage internal folders.
        let path = std::env::var("PATH").unwrap_or_default();
        let clean_path = path.split(':')
            .filter(|p| !p.contains(".mount_"))
            .collect::<Vec<_>>()
            .join(":");

        let toxic_vars = [
            "APPDIR", "APPIMAGE", "LD_LIBRARY_PATH", "LD_PRELOAD",
            "PYTHONPATH", "QT_PLUGIN_PATH", "GDK_BACKEND",
        ];

        let try_cmd = |cmd: &str, args: &[&str]| -> bool {
            let mut command = Command::new(cmd);
            command.args(args);
            command.env("PATH", &clean_path);
            for var in toxic_vars { command.env_remove(var); }
            matches!(command.status(), Ok(s) if s.success())
        };

        // Method A: Python webbrowser
        if try_cmd("python3", &["-c", "import webbrowser, sys; webbrowser.open(sys.argv[1])", &url]) { return Ok(()); }
        
        // Method B: gio open
        if try_cmd("gio", &["open", &url]) { return Ok(()); }

        // Method C: xdg-open
        if try_cmd("xdg-open", &[&url]) { return Ok(()); }

        // Method D: Portal
        if try_cmd("busctl", &[
            "--user", "call",
            "org.freedesktop.portal.Desktop",
            "/org/freedesktop/portal/desktop",
            "org.freedesktop.portal.OpenURI",
            "OpenURI", "ss", "", &url, "0"
        ]) { return Ok(()); }
    }

    // Fallback
    tauri_plugin_opener::open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

// --- Log Scanner Commands ---

#[tauri::command]
async fn start_log_scanner(app: tauri::AppHandle, state: tauri::State<'_, AppState>, path: String) -> Result<(), String> {
    use std::path::PathBuf;
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err("Log file does not exist".to_string());
    }
    
    let mut scanner_lock = state.log_scanner.lock().unwrap();
    let mut path_lock = state.log_scanner_path.lock().unwrap();
    
    let existing = path_lock.as_ref().map(|s| s.as_str()).unwrap_or("");
    let is_same = scanner_lock.is_some() && existing == path;
    eprintln!("[LOG_SCANNER] start called path={}, existing={}, is_same={}", path, existing, is_same);
    
    if is_same {
        return Ok(());
    }

    // Properly stop any existing scanner before spawning a new one,
    // so IS_SCANNING is cleared and spawn_memory_watcher won't reject us
    if scanner_lock.is_some() {
        drop(scanner_lock);
        drop(path_lock);
        crate::log_scanner::stop_scanner(&app);
        scanner_lock = state.log_scanner.lock().unwrap();
        path_lock = state.log_scanner_path.lock().unwrap();
    }
    
    *scanner_lock = None;
    *path_lock = Some(path.clone());
    drop(path_lock);
    drop(scanner_lock);
    
    let handle = match log_scanner::spawn_memory_watcher(app.clone(), path_buf) {
        Ok(h) => h,
        Err(e) => {
            crate::log_scanner::stop_scanner(&app);
            return Err(e);
        }
    };
    let mut scanner_lock = state.log_scanner.lock().unwrap();
    *scanner_lock = Some(handle);
    
    Ok(())
}

#[tauri::command]
async fn stop_log_scanner(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut scanner_lock = state.log_scanner.lock().unwrap();
    *scanner_lock = None;
    crate::log_scanner::stop_scanner(&app);
    Ok(())
}

#[tauri::command]
async fn validate_log_path(path: String) -> Result<serde_json::Value, String> {
    use std::io::Read;
    use std::path::PathBuf;
    
    let path_buf = PathBuf::from(path);
    if !path_buf.exists() {
        return Ok(serde_json::json!({ "valid": false, "reason": "File not found" }));
    }
    
    let mut file = std::fs::File::open(&path_buf).map_err(|e| e.to_string())?;
    let mut head = [0u8; 1024];
    let _ = file.read(&mut head);
    let s = String::from_utf8_lossy(&head);
    
    if s.contains("Sys [Info]:") || s.contains("Game [Info]:") {
        Ok(serde_json::json!({ "valid": true }))
    } else {
        Ok(serde_json::json!({ "valid": false, "reason": "Invalid log format" }))
    }
}

#[tauri::command]
fn is_scanning() -> bool {
    crate::log_scanner::is_scanning()
}

#[tauri::command]
async fn simulate_fissure_event(app: tauri::AppHandle) -> Result<(), String> {
    use crate::log_scanner::{FissureEvent, RelicInfo};
    use tokio::time::{sleep, Duration};

    // 1. Relic Phase
    app.emit("fissure-relic-phase", FissureEvent {
        event_type: "relic_phase_start".to_string(),
        squad_relics: vec![
            RelicInfo { unique_name: "/Lotus/Types/Game/Projections/T1VoidProjectionGaussPrimeBBronze".to_string(), tier: "Lith".to_string(), refinement: "Intact".to_string(), era: "Lith".to_string() },
            RelicInfo { unique_name: "/Lotus/Types/Game/Projections/T2VoidProjectionSevagothPrimeCBronze".to_string(), tier: "Meso".to_string(), refinement: "Intact".to_string(), era: "Meso".to_string() },
            RelicInfo { unique_name: "/Lotus/Types/Game/Projections/T3VoidProjectionHarrowPrimePBronze".to_string(), tier: "Neo".to_string(), refinement: "Intact".to_string(), era: "Neo".to_string() },
            RelicInfo { unique_name: "/Lotus/Types/Game/Projections/T4VoidProjectionKhoraPrimeBBronze".to_string(), tier: "Axi".to_string(), refinement: "Intact".to_string(), era: "Axi".to_string() },
        ],
        local_reward: None,
        squad_size: 4,
        void_tier: Some("VoidT3".to_string()),
    }).unwrap_or_default();

    sleep(Duration::from_millis(500)).await;

    // 2. Reward Phase
    app.emit("fissure-reward-phase", FissureEvent {
        event_type: "reward_phase".to_string(),
        squad_relics: vec![],
        local_reward: Some("/Lotus/StoreItems/Types/Recipes/Weapons/BroncoPrimeBlueprint".to_string()),
        squad_size: 4,
        void_tier: Some("VoidT3".to_string()),
    }).unwrap_or_default();

    Ok(())
}

#[tauri::command]
fn start_notif_autoclose_timer(app_handle: tauri::AppHandle, id: serde_json::Value, seconds: u64) {
    let id_str = match id {
        serde_json::Value::String(s) => s,
        serde_json::Value::Number(n) => n.to_string(),
        _ => return,
    };
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(seconds));
        let _ = app_handle.emit("expire-notification", id_str);
    });
}

#[tauri::command]
async fn register_hotkey(app: AppHandle, shortcut: String, action: String) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
    let shortcut_for_err = shortcut.clone();
    let action_clone = action.clone();
    let shortcut_str = shortcut.clone();

    // Unregister first to avoid duplicates if called multiple times
    let _ = app.global_shortcut().unregister(shortcut.as_str());

    let registration_result = app.global_shortcut().on_shortcut(shortcut.as_str(), move |app_c, _sc, event| {
        if event.state() != ShortcutState::Pressed { return; }
        eprintln!("[Hotkeys] Triggered: {} -> {}", shortcut_str, action_clone);
        let app_c = app_c.clone();
        let action_c = action_clone.clone();

        tauri::async_runtime::spawn(async move {
            match action_c.as_str() {
                "manual_ocr" => {
                    let _ = crate::ocr::trigger_manual_ocr(app_c, None).await;
                }
                pos @ ("ocr_riven_left" | "ocr_riven_middle" | "ocr_riven_right" | "ocr_riven_linked") => {
                    let position = match pos {
                        "ocr_riven_left"   => crate::ocr::RivenCardPosition::Left,
                        "ocr_riven_middle" => crate::ocr::RivenCardPosition::Middle,
                        "ocr_riven_right"  => crate::ocr::RivenCardPosition::Right,
                        _                  => crate::ocr::RivenCardPosition::Linked,
                    };
                    let pos_name = format!("{:?}", position);
                    match crate::ocr::ocr_riven_card(app_c.clone(), position) {
                        Ok(result) => {
                            let debug_path = format!("data/user/riven_ocr_{}.png", pos_name);
                            let msg = if result.text.is_empty() {
                                format!("[{}] No text found -- check {} for what was captured", pos_name, debug_path)
                            } else {
                                format!("[{}] {}", pos_name, result.text)
                            };
                            let _ = app_c.emit("riven-ocr-result", &msg);
                        }
                        Err(e) => {
                            let _ = app_c.emit("riven-ocr-result", &format!("[{}] Error: {}", pos_name, e));
                        }
                    }
                }
                _ => {
                    eprintln!("[Hotkeys] Unknown action: {}", action_c);
                }
            }
        });
    });

    match registration_result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to register hotkey {}: {:?}", shortcut_for_err, e)),
    }
}

#[tauri::command]
async fn unregister_all_hotkeys(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    app.global_shortcut().unregister_all().map_err(|e| format!("{:?}", e))
}

/// Save a JSON settings object to data/user/settings.json.
#[tauri::command]
async fn save_settings(settings: Value) -> Result<(), String> {
    let settings_dir = resolve_path("data/user");
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(settings_dir.join("settings.json"), content).map_err(|e| e.to_string())
}

/// Load the JSON settings object from data/user/settings.json.
/// Returns an empty object if the file doesn't exist.
#[tauri::command]
async fn load_settings() -> Result<Value, String> {
    let path = resolve_path("data/user/settings.json");
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct MonitorInfo {
    index: usize,
    name: String,
    width: u32,
    height: u32,
    is_primary: bool,
}

#[derive(serde::Serialize)]
struct WarframeWindowRect {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

/// Find the Warframe window rect by running the helper with --get-window-rect.
#[tauri::command]
async fn get_warframe_window_rect() -> Result<Option<WarframeWindowRect>, String> {
    let bin_name = format!("warframe-api-helper{}", std::env::consts::EXE_SUFFIX);
    let relative = format!("data/bin/{}", bin_name);
    let helper_path = crate::get_data_root().join(&relative);
    if !helper_path.exists() {
        return Err("warframe-api-helper not found".to_string());
    }

    let output = std::process::Command::new(&helper_path)
        .arg("--get-window-rect")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout == "not found" || stdout.is_empty() {
        return Ok(None);
    }

    let parts: Vec<&str> = stdout.split_whitespace().collect();
    if parts.len() < 4 {
        return Ok(None);
    }

    let x = parts[0].parse::<i32>().map_err(|_| "bad x".to_string())?;
    let y = parts[1].parse::<i32>().map_err(|_| "bad y".to_string())?;
    let w = parts[2].parse::<u32>().map_err(|_| "bad w".to_string())?;
    let h = parts[3].parse::<u32>().map_err(|_| "bad h".to_string())?;

    Ok(Some(WarframeWindowRect { x, y, width: w, height: h }))
}

/// Auto-detect which monitor Warframe is on and set target_monitor to it.
#[tauri::command]
async fn auto_detect_warframe_monitor(state: tauri::State<'_, AppState>) -> Result<Option<usize>, String> {
    let rect = match get_warframe_window_rect().await? {
        Some(r) => r,
        None => return Ok(None),
    };

    let cx = rect.x + rect.width as i32 / 2;
    let cy = rect.y + rect.height as i32 / 2;

    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    for (idx, m) in monitors.iter().enumerate() {
        let mx = m.x().unwrap_or(0) as i32;
        let my = m.y().unwrap_or(0) as i32;
        let mw = m.width().unwrap_or(1920) as i32;
        let mh = m.height().unwrap_or(1080) as i32;
        if cx >= mx && cx < mx + mw && cy >= my && cy < my + mh {
            // Persist to state and settings
            *state.target_monitor.lock().unwrap() = Some(idx);
            let settings_path = crate::resolve_path("data/user/settings.json");
            let mut settings: serde_json::Value = if settings_path.exists() {
                std::fs::read_to_string(&settings_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default()
            } else {
                serde_json::json!({})
            };
            settings["fissure_target_monitor"] = serde_json::json!(idx);
            if let Some(parent) = settings_path.parent() {
                std::fs::create_dir_all(parent).ok();
            }
            let _ = std::fs::write(&settings_path, serde_json::to_string_pretty(&settings).unwrap());
            return Ok(Some(idx));
        }
    }

    Ok(None)
}

#[tauri::command]
async fn get_available_monitors() -> Result<Vec<MonitorInfo>, String> {
    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    let list = monitors.into_iter().enumerate().map(|(idx, m)| {
        let name = m.name().map(|n| n.to_string()).unwrap_or_else(|_| format!("Monitor {}", idx + 1));
        let width = m.width().unwrap_or(1920);
        let height = m.height().unwrap_or(1080);
        let is_primary = m.is_primary().unwrap_or(false);
        MonitorInfo {
            index: idx,
            name,
            width,
            height,
            is_primary,
        }
    }).collect();
    Ok(list)
}

#[tauri::command]
fn set_target_monitor(state: tauri::State<'_, AppState>, monitor: Value) -> Result<(), String> {
    let mut current = state.target_monitor.lock().unwrap();
    let new_val = match &monitor {
        Value::Number(n) => n.as_u64().map(|v| v as usize),
        Value::String(s) => {
            if s == "auto" { None } else { s.parse::<usize>().ok() }
        }
        _ => None,
    };
    *current = new_val;
    
    // Also persist to settings file
    let settings_path = resolve_path("data/user/settings.json");
    let mut settings: Value = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::json!({})
    };
    settings["fissure_target_monitor"] = monitor;
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    std::fs::write(&settings_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn is_warframe_focused() -> bool {
    if let Ok(window) = active_win_pos_rs::get_active_window() {
        let name = window.app_name.to_lowercase();
        let title = window.title.to_lowercase();
        return name.contains("warframe") || title.contains("warframe");
    }
    false
}

/// Estimate the platinum price of a riven using the pricing model.
/// Returns None if the model isn't loaded (e.g. no pricer-models present).
#[tauri::command]
fn estimate_riven_price(input: pricer::RivenInput) -> Option<f32> {
    pricer::estimate_price(&input)
}

// --- Entry Point ---

 fn main() {
    #[cfg(target_os = "linux")]
    {
        // Raise file descriptor limit — WebKit + software rendering (GDK_BACKEND=x11
        // + WEBKIT_DISABLE_COMPOSITING_MODE) uses significantly more SHM segments.
        // The default 1024 isn't enough; give ourselves plenty of headroom.
        unsafe {
            let mut lim: libc::rlimit = std::mem::zeroed();
            if libc::getrlimit(libc::RLIMIT_NOFILE, &mut lim) == 0 {
                lim.rlim_cur = 65536u64.min(lim.rlim_max);
                libc::setrlimit(libc::RLIMIT_NOFILE, &lim);
            }
        }

        webkit2gtk_nvidia_quirk::apply_workaround_with_options(Default::default());
        // The quirk crate may not detect the Nvidia driver inside AppImage
        // environments. Set DMABUF disable as a hard fallback.
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        // Force X11 backend unconditionally — X11 is required for:
        //   1. Raw XMoveWindow to position transparent (ARGB visual) windows
        //   2. _NET_WM_STATE_ABOVE for reliable always-on-top
        // Both break under the Wayland backend (compositor controls placement).
        // KDE always provides XWayland, so this is safe.
        std::env::set_var("GDK_BACKEND", "x11");
    }
    // Clear old debug log on startup so it doesn't grow infinitely
    let log_path = resolve_path("data/user/overlay_debug.log");
    let _ = std::fs::write(&log_path, "");

    // Load settings at startup to get saved notif_sound and notif_position
    let saved_settings = std::fs::read_to_string(resolve_path("data/user/settings.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .unwrap_or_default();
    
    let saved_sound = saved_settings.get("notif_sound")
        .and_then(|v| v.as_str())
        .unwrap_or("notification1.wav");

    let target_monitor_val = saved_settings.get("fissure_target_monitor");
    let target_monitor_idx = match target_monitor_val {
        Some(Value::Number(n)) => n.as_u64().map(|v| v as usize),
        Some(Value::String(s)) => {
            if s == "auto" { None } else { s.parse::<usize>().ok() }
        }
        _ => None,
    };
    
    // Fix xcap screen capture on Linux inside AppImage:
    // When run from an AppImage, the usual env-var workarounds for WebKit / Mesa
    // are not set automatically.  Set them here so xcap always gets a working
    // software-renderer path and GDK_BACKEND is forced to X11.
    // Linux env vars set above at process start
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            notif_sound: Arc::new(Mutex::new(saved_sound.to_string())),
            log_scanner: Arc::new(Mutex::new(None)),
            log_scanner_path: Arc::new(Mutex::new(None)),
            active_relic_data: Arc::new(Mutex::new(None)),
            target_monitor: Arc::new(Mutex::new(target_monitor_idx)),
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if window.label() == "main" {
                    crate::log_scanner::stop_scanner(&window.app_handle());
                    crate::log_scanner::log_app_stop(&window.app_handle());
                    std::process::exit(0);
                } else {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .setup(|app| {
            crate::log_scanner::log_app_start(&app.handle());
            let ah = app.handle().clone();
            if let Some(main_win) = app.get_webview_window("main") {
                let _ = main_win.show();
                let _ = main_win.set_focus();
            }
            // Extract bundled assets from inside the AppImage to the writable data root
            extract_bundled_assets(&ah);
            // Download PP-OCRv5 models in background (needed by ocr_engine)
            tauri::async_runtime::spawn(async move {
                match check_ocr_models().await {
                    Ok(msg) => eprintln!("[OCR MODELS] {}", msg),
                    Err(e) => eprintln!("[OCR MODELS] Download failed: {}", e),
                }
            });
            // Download riven pricing model in background (needed by pricer)
            tauri::async_runtime::spawn(async move {
                match check_pricer_models().await {
                    Ok(msg) => eprintln!("[PRICER MODELS] {}", msg),
                    Err(e) => eprintln!("[PRICER MODELS] Download failed: {}", e),
                }
            });
            // Position and configure all overlay windows once at startup.
            // They start hidden (tauri.conf.json) so show() in show_window_internal
            // makes them visible only after the webview has loaded transparent content,
            // avoiding the first-frame black flash on Linux.
            // Overlays start hidden (tauri.conf.json visible=false).
            // Shown on-demand by show_overlay_window. Pre-showing races webview load on Linux.
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // --- data ---
            load_cached_inventory,
            call_api_helper,
            check_exports,
            check_ocr_models,
            check_pricer_models,
            check_media_assets,
            load_all_exports,
            load_txt_file,
            // --- notes ---
            list_notes,
            read_note,
            save_note,
            delete_note,
            // --- misc ---
            open_data_folder,
            get_mastery_icons_path,
            get_maps_path,
            get_assets_path,
            get_cdn_base_url,
            get_mod_frames_path,
            get_icons_path,
            get_ui_path,
            // --- card images ---
            get_card_images_path,
            read_file_bytes,
            count_unfixed_card_images,
            ensure_card_images,
            detect_warframe_cache,
            // --- log scanner ---
            crate::log_scanner::get_scanner_status,
            start_log_scanner,
            stop_log_scanner,
            validate_log_path,
            is_scanning,
            simulate_fissure_event,
            crate::ocr::save_debug_screenshot,
            crate::ocr::start_debug_ocr_session,
            crate::ocr::trigger_manual_ocr,
            // --- overlay ---
            show_notification,
            show_relic_overlay,
            show_overlay_window,
            hide_overlay_window,
            resize_overlay_window,
            raise_overlay,
            set_ignore_cursor_events,
            play_notification_sound,
            set_notification_sound,
            start_notif_autoclose_timer,
            relay_event,
            get_active_relic_session,
            open_url,
            save_settings,
            load_settings,
            log_terminal,
            register_hotkey,
            unregister_all_hotkeys,
            crate::ocr::set_fissure_ui_scale,
            crate::ocr::ocr_riven_card,
            crate::ocr::ocr_riven_card_from_file,
            estimate_riven_price,
            get_available_monitors,
            set_target_monitor,
            get_warframe_window_rect,
            auto_detect_warframe_monitor,
            is_warframe_focused,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Extract card images synchronously before the event loop starts,
    // so file watcher (dev mode) doesn't catch writes and restart.
    if let Some(cache_path) = detect_cache_inner() {
        match extract_card_images_inner(&app.handle(), &cache_path) {
            Ok(count) => eprintln!("[CARD IMAGES] Extracted {} images", count),
            Err(e) => eprintln!("[CARD IMAGES] Extraction failed: {}", e),
        }
    }

    app.run(|_app_handle, _event| {});
}