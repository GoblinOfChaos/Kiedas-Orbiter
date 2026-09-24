use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::SystemTime;

const STORE_RELATIVE: &str = "data/wiki-store";
const BUNDLED_STORE_RELATIVE: &str = "data/assets/wiki-store";

struct CachedIndex {
    modified: SystemTime,
    value: Value,
}

static INDEX_CACHE: OnceLock<Mutex<HashMap<PathBuf, CachedIndex>>> = OnceLock::new();

fn live_store_path() -> PathBuf {
    crate::get_data_root().join(STORE_RELATIVE)
}

fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let live = live_store_path();
    if live.join("index.json").exists() {
        return Ok(live);
    }

    let bundled = crate::resolve_bundled_path(app, BUNDLED_STORE_RELATIVE)
        .ok_or_else(|| "bundled wiki store is unavailable".to_string())?;
    if bundled.join("index.json").exists() {
        return Ok(bundled);
    }

    Err("wiki store index is unavailable".to_string())
}

fn read_index(root: &Path) -> Result<Value, String> {
    let bytes =
        fs::read(root.join("index.json")).map_err(|e| format!("read wiki store index: {e}"))?;
    serde_json::from_slice(&bytes).map_err(|e| format!("parse wiki store index: {e}"))
}

fn read_cached_index(root: &Path) -> Result<Value, String> {
    let path = root.join("index.json");
    let modified = fs::metadata(&path)
        .and_then(|metadata| metadata.modified())
        .map_err(|e| format!("stat wiki store index: {e}"))?;
    let cache = INDEX_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    let mut entries = cache.lock().map_err(|_| "wiki store index cache is poisoned".to_string())?;
    if let Some(cached) = entries.get(root) {
        if cached.modified == modified {
            return Ok(cached.value.clone());
        }
    }
    let value = read_index(root)?;
    entries.insert(root.to_path_buf(), CachedIndex { modified, value: value.clone() });
    Ok(value)
}

fn safe_store_file(file: &str) -> Result<&str, String> {
    if file.is_empty() || file.contains('/') || file.contains('\\') {
        return Err("invalid wiki module path".to_string());
    }

    let path = Path::new(file);
    if path.components().count() != 1
        || path
            .components()
            .any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("invalid wiki module path".to_string());
    }
    Ok(file)
}

fn indexed_file<'a>(index: &'a Value, file: &str) -> Result<&'a str, String> {
    index
        .get("modules")
        .and_then(Value::as_array)
        .and_then(|modules| {
            modules.iter().find_map(|module| {
                let indexed = module.get("file").and_then(Value::as_str)?;
                (indexed == file).then_some(indexed)
            })
        })
        .ok_or_else(|| format!("wiki module file is not present in store: {file}"))
}

#[tauri::command]
pub async fn wiki_store_index(app: tauri::AppHandle) -> Result<Value, String> {
    read_index(&store_path(&app)?)
}

#[tauri::command]
pub async fn wiki_store_get_bytes(app: tauri::AppHandle, file: String) -> Result<Vec<u8>, String> {
    let safe_file = safe_store_file(&file)?;
    let root = store_path(&app)?;
    let index = read_cached_index(&root)?;
    let indexed_file = indexed_file(&index, safe_file)?;
    fs::read(root.join("modules").join(indexed_file))
        .map_err(|e| format!("read wiki module bytes: {e}"))
}
