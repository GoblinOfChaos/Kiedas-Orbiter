use std::{collections::BTreeMap, fs, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};
use serde_json::Value;
const MAX_FILE: u64 = 32 * 1024 * 1024;
const CHECKLIST_KEYS: &[&str] = &["checklist_completed", "checklist_hidden", "checklist_auto_track", "checklist_last_conquest_completion", "checklist_completed_reset_at"];
fn read(path: &Path) -> Result<Vec<u8>, String> {
    let meta = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if !meta.is_file() || meta.file_type().is_symlink() || meta.len() > MAX_FILE { return Err("Import accepts only regular files up to 32 MiB".into()); }
    fs::read(path).map_err(|e| e.to_string())
}
fn scrub(value: &mut Value) {
    match value {
        Value::Object(map) => { map.retain(|key, _| { let k = key.to_ascii_lowercase(); !k.contains("token") && !k.contains("password") && !k.contains("secret") && !k.contains("session") && k != "authorization" && k != "cookie" }); for v in map.values_mut() { scrub(v); } },
        Value::Array(values) => for v in values { scrub(v); }, _ => {}
    }
}
fn json_bytes(path: &Path) -> Result<Vec<u8>, String> {
    let mut value: Value = serde_json::from_slice(&read(path)?).map_err(|e| e.to_string())?;
    scrub(&mut value);
    serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())
}
pub fn import(source: &Path, target: &Path, categories: &[String], replace: bool) -> Result<String, String> {
    crate::build_profile::require_preview()?;
    let _import_guard = lock(target, ".preview-import.lock")?;
    recover_locked(target)?;
    if categories.is_empty() { return Err("Select at least one category".into()); }
    let source = source.canonicalize().map_err(|e| e.to_string())?;
    fs::create_dir_all(target).map_err(|e| e.to_string())?;
    let target = target.canonicalize().map_err(|e| e.to_string())?;
    if source.starts_with(&target) || target.starts_with(&source) { return Err("Source and Preview profile must not overlap".into()); }
    let mut files = BTreeMap::<PathBuf, Vec<u8>>::new();
    for category in categories {
        match category.as_str() {
            "inventory" | "history" => {
                let name = if category == "inventory" { "inventory.json" } else { "inventory_history.json" };
                files.insert(PathBuf::from(name), json_bytes(&source.join(name))?);
            },
            "notes" | "maps" => {
                let (dir, ext) = if category == "notes" { ("notes", "md") } else { ("map-configs", "json") };
                let folder = source.join(dir);
                if fs::symlink_metadata(&folder).map_err(|e| e.to_string())?.file_type().is_symlink() { return Err("Import folders must not be symlinks".into()); }
                for entry in fs::read_dir(folder).map_err(|e| e.to_string())? {
                    let entry = entry.map_err(|e| e.to_string())?;
                    if entry.path().extension().and_then(|s| s.to_str()) == Some(ext) {
                        let bytes = if ext == "json" { json_bytes(&entry.path())? } else { read(&entry.path())? };
                        files.insert(Path::new(dir).join(entry.file_name()), bytes);
                    }
                    if files.values().map(|v| v.len()).sum::<usize>() > 128 * 1024 * 1024 { return Err("Import exceeds 128 MiB".into()); }
                    if files.len() > 2000 { return Err("Import limited to 2000 files".into()); }
                }
            },
            "preferences" => {
                let raw: Value = serde_json::from_slice(&read(&source.join("settings.json"))?).map_err(|e| e.to_string())?;
                let mut current: Value = if target.join("settings.json").exists() { serde_json::from_slice(&read(&target.join("settings.json"))?).map_err(|e| e.to_string())? } else { serde_json::json!({}) };
                let obj = current.as_object_mut().ok_or("Preview settings must be an object")?;
                for key in ["kronos-theme", "gameLocale", "uiLocale"] {
                    if let Some(value) = raw.get(key) { obj.insert(key.into(), value.clone()); }
                }
                files.insert(PathBuf::from("settings.json"), serde_json::to_vec_pretty(&current).map_err(|e| e.to_string())?);
            },
            "checklist" => {
                let raw: Value = serde_json::from_slice(&read(&source.join("checklist-export.json"))?).map_err(|e| e.to_string())?;
                let obj = raw.as_object().ok_or("Checklist export must be an object of checklist localStorage keys and string values")?;
                if obj.is_empty() || obj.iter().any(|(key, val)| !CHECKLIST_KEYS.contains(&key.as_str()) || !val.is_string() || serde_json::from_str::<Value>(val.as_str().unwrap()).is_err()) { return Err("Invalid checklist export keys or values".into()); }
                files.insert(PathBuf::from("preview-checklist-import.json"), serde_json::to_vec(&serde_json::json!({"revision": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos().to_string(), "keys": raw})).map_err(|e| e.to_string())?);
            },
            _ => return Err("Unknown import category".into())
        }
    }
    if files.is_empty() { return Err("No selected content found".into()); }
    if files.values().map(|v| v.len()).sum::<usize>() > 128 * 1024 * 1024 { return Err("Import exceeds 128 MiB".into()); }
    for relative in files.keys() {
        let path = target.join(relative);
        let parent = path.parent().unwrap();
        if parent.exists() && (fs::symlink_metadata(parent).map_err(|e| e.to_string())?.file_type().is_symlink() || !parent.canonicalize().map_err(|e| e.to_string())?.starts_with(&target)) { return Err("Preview destination escapes profile".into()); }
        if fs::symlink_metadata(&path).map(|m| m.file_type().is_symlink()).unwrap_or(false) { return Err("Preview destination must not be a symlink".into()); }
        if path.exists() && !replace { return Err("Selected Preview files already exist. Enable replacement to retain a backup and replace them.".into()); }
    }
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    let backup = target.join(format!("preview-import-backup-{stamp}"));
    fs::create_dir(&backup).map_err(|e| e.to_string())?;
    let journal = Journal { version: 1, files: files.keys().map(|relative| JournalFile { relative: relative.clone(), existed: target.join(relative).exists() }).collect() };
    durable_new(&backup.join("journal.json"), &serde_json::to_vec(&journal).map_err(|e| e.to_string())?)?;
    let stage = backup.join("staged"); fs::create_dir(&stage).map_err(|e| e.to_string())?;
    // Write all staged payloads and backups before replacing any destination.
    for (relative, bytes) in &files {
        let staging = stage.join(relative); fs::create_dir_all(staging.parent().unwrap()).map_err(|e| e.to_string())?;
        fs::write(staging, bytes).map_err(|e| e.to_string())?;
        let dest = target.join(relative);
        if dest.exists() { let saved = backup.join(relative); fs::create_dir_all(saved.parent().unwrap()).map_err(|e| e.to_string())?; fs::write(saved, read(&dest)?).map_err(|e| e.to_string())?; }
    }
    // Flush every payload/backup before publishing the ready marker.
    for relative in files.keys() {
        fs::OpenOptions::new().write(true).open(stage.join(relative)).and_then(|f| f.sync_all()).map_err(|e| e.to_string())?;
        let saved = backup.join(relative);
        if saved.exists() { fs::OpenOptions::new().write(true).open(&saved).and_then(|f| f.sync_all()).map_err(|e| e.to_string())?; sync_dir(saved.parent().unwrap())?; }
        sync_dir(stage.join(relative).parent().unwrap())?;
    }
    sync_dir(&backup)?;
    mark(&backup, "ready")?;
    sync_dir(&target)?;
    for relative in files.keys() {
        let dest = target.join(relative);
        let result = fs::create_dir_all(dest.parent().unwrap()).and_then(|_| {
            // Windows rename cannot overwrite an existing file: preserve old file by moving it.
            if dest.exists() { fs::rename(&dest, backup.join(relative).with_extension("replaced"))?; }
            fs::rename(stage.join(relative), &dest)
        });
        if let Err(error) = result {
            let rollback_errors = match recover_one(&target, &backup) { Ok(()) => Vec::new(), Err(e) => vec![e] };
            return Err(format!("Import failed: {error}; rollback errors: {rollback_errors:?}. Backup retained at {}", backup.display()));
        }
        sync_dir(dest.parent().unwrap())?;
    }
    mark(&backup, "committed")?;
    Ok(format!("Imported {} files. Preview backup: {}. Reload Preview to use the copy.", files.len(), backup.display()))
}

// Immutable journal plus one-way phase markers. Recovery is repeatable after SIGKILL.
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Journal { version: u32, files: Vec<JournalFile> }
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct JournalFile { relative: PathBuf, existed: bool }

fn checked_file(path: &Path) -> Result<(), String> {
    if let Ok(meta) = fs::symlink_metadata(path) {
        if !meta.is_file() || meta.file_type().is_symlink() {
            return Err(format!("Not a regular file: {}", path.display()));
        }
    }
    Ok(())
}
fn checked_dir(path: &Path) -> Result<(), String> {
    let meta = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if !meta.is_dir() || meta.file_type().is_symlink() { return Err(format!("Not a regular directory: {}", path.display())); }
    Ok(())
}
fn lock(target: &Path, name: &str) -> Result<fs::File, String> {
    fs::create_dir_all(target).map_err(|e| e.to_string())?;
    checked_dir(target)?;
    let path = target.join(name); checked_file(&path)?;
    let file = fs::OpenOptions::new().read(true).write(true).create(true).truncate(false).open(&path).map_err(|e| e.to_string())?;
    file.try_lock().map_err(|e| format!("Preview profile/import is busy ({}): {e}", path.display()))?;
    Ok(file)
}
fn sync_dir(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    fs::File::open(path).and_then(|f| f.sync_all()).map_err(|e| e.to_string())?;
    #[cfg(not(unix))] let _ = path;
    Ok(())
}
fn durable_new(path: &Path, bytes: &[u8]) -> Result<(), String> {
    use std::io::Write;
    checked_file(path)?;
    let temporary = path.with_extension("tmp"); checked_file(&temporary)?;
    if temporary.exists() { fs::remove_file(&temporary).map_err(|e| e.to_string())?; }
    let mut f = fs::OpenOptions::new().write(true).create_new(true).open(&temporary).map_err(|e| e.to_string())?;
    f.write_all(bytes).and_then(|_| f.sync_all()).map_err(|e| e.to_string())?;
    fs::rename(&temporary, path).map_err(|e| e.to_string())?;
    sync_dir(path.parent().unwrap())
}
fn marker(backup: &Path, name: &str) -> Result<bool, String> {
    let p = backup.join(name); checked_file(&p)?;
    if !p.exists() { return Ok(false); }
    if read(&p)? != b"1\n" { return Err(format!("Invalid transaction marker: {}", p.display())); }
    Ok(true)
}
fn mark(backup: &Path, name: &str) -> Result<(), String> {
    if !marker(backup, name)? { durable_new(&backup.join(name), b"1\n")?; }
    Ok(())
}
fn validate_relative(path: &Path) -> Result<(), String> {
    use std::path::Component;
    let parts: Vec<_> = path.components().collect();
    if parts.iter().any(|p| !matches!(p, Component::Normal(_))) { return Err("Invalid journal path".into()); }
    let allowed = if parts.len() == 1 {
        matches!(path.to_str(), Some("inventory.json" | "inventory_history.json" | "settings.json" | "preview-checklist-import.json"))
    } else if parts.len() == 2 {
        (path.starts_with("notes") && path.extension().and_then(|s| s.to_str()) == Some("md")) ||
        (path.starts_with("map-configs") && path.extension().and_then(|s| s.to_str()) == Some("json"))
    } else { false };
    if !allowed { return Err("Journal path is not an import destination".into()); }
    Ok(())
}
fn validate_destination(root: &Path, relative: &Path) -> Result<PathBuf, String> {
    validate_relative(relative)?;
    let p = root.join(relative);
    let parent = p.parent().unwrap();
    if parent.exists() || fs::symlink_metadata(parent).is_ok() { checked_dir(parent)?; }
    checked_file(&p)?;
    Ok(p)
}
fn recover_one(target: &Path, backup: &Path) -> Result<(), String> {
    checked_dir(backup)?;
    let journal_path = backup.join("journal.json");
    if !journal_path.exists() {
        checked_file(&journal_path)?;
        // Old successful backups have an empty staging directory. An old partial
        // transaction cannot safely be inferred without its list of new files.
        let staged = backup.join("staged");
        if staged.exists() {
            checked_dir(&staged)?;
            for entry in fs::read_dir(&staged).map_err(|e| e.to_string())? {
                let p = entry.map_err(|e| e.to_string())?.path();
                if p.is_dir() { checked_dir(&p)?; if fs::read_dir(p).map_err(|e| e.to_string())?.next().is_some() { return Err("Legacy unfinished import needs manual backup recovery".into()); } }
                else { return Err("Unjournaled staged content needs manual backup recovery".into()); }
            }
        }
        return Ok(());
    }
    let journal: Journal = serde_json::from_slice(&read(&journal_path)?).map_err(|e| e.to_string())?;
    if journal.version != 1 || journal.files.is_empty() || journal.files.len() > 2000 { return Err("Invalid import journal version or file count".into()); }
    let mut seen = std::collections::BTreeSet::new();
    for file in &journal.files {
        validate_relative(&file.relative)?;
        if !seen.insert(&file.relative) { return Err("Duplicate journal destination".into()); }
    }
    if marker(backup, "committed")? || marker(backup, "recovered")? { return Ok(()); }
    if marker(backup, "ready")? {
        // Validate the entire rollback plan before touching destinations.
        for file in &journal.files {
            validate_destination(target, &file.relative)?;
            if file.existed { let saved = validate_destination(backup, &file.relative)?; read(&saved)?; }
        }
        for file in journal.files.iter().rev() {
            let dest = validate_destination(target, &file.relative)?;
            if file.existed {
                fs::create_dir_all(dest.parent().unwrap()).map_err(|e| e.to_string())?;
                fs::copy(backup.join(&file.relative), &dest).and_then(|_| fs::OpenOptions::new().write(true).open(&dest)?.sync_all()).map_err(|e| e.to_string())?;
            } else if dest.exists() { fs::remove_file(&dest).map_err(|e| e.to_string())?; }
            if dest.parent().unwrap().exists() { sync_dir(dest.parent().unwrap())?; }
        }
    }
    mark(backup, "recovered")
}
fn recover_locked(target: &Path) -> Result<(), String> {
    let mut backups = Vec::new();
    for entry in fs::read_dir(target).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_name().to_string_lossy().starts_with("preview-import-backup-") { backups.push(entry.path()); }
    }
    backups.sort();
    for backup in backups {
        recover_one(target, &backup).map_err(|e| format!("Preview import recovery failed: {e}. Backup retained at {}. Close Preview and repair the backup before retrying.", backup.display()))?;
    }
    Ok(())
}
pub fn initialize(target: &Path) -> Result<fs::File, String> {
    crate::build_profile::require_preview()?;
    let profile = lock(target, ".preview-profile.lock")?;
    let _import = lock(target, ".preview-import.lock")?;
    recover_locked(target)?;
    Ok(profile) // Held by main for the lifetime of this Preview process.
}

#[cfg(all(test, feature = "preview"))]
#[path = "preview_import_tests.rs"]
mod tests;
