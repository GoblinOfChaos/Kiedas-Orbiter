use serde_json::Value;
use std::fs;
use std::path::{Component, Path, PathBuf};

const STORE_RELATIVE: &str = "data/wiki-store";
const BUNDLED_STORE_RELATIVE: &str = "data/assets/wiki-store";

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
    let index = read_index(&root)?;
    let indexed_file = indexed_file(&index, safe_file)?;
    fs::read(root.join("modules").join(indexed_file))
        .map_err(|e| format!("read wiki module bytes: {e}"))
}
