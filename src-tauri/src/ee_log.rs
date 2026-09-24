use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const EE_LOG_SUFFIX: &str = "steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log";

#[derive(Serialize)]
pub struct EeLogStatus {
    pub exists: bool,
    pub readable: bool,
    pub modified_ago_secs: Option<u64>,
}

fn linux_roots() -> Vec<PathBuf> {
    let home = std::env::var_os("HOME").map(PathBuf::from).unwrap_or_default();
    vec![
        home.join(".local/share/Steam"),
        home.join(".steam/steam"),
        home.join(".var/app/com.valvesoftware.Steam/.local/share/Steam"),
    ]
}

fn library_folders_file() -> Option<PathBuf> {
    linux_roots().into_iter()
        .map(|root| root.join("steamapps/libraryfolders.vdf"))
        .find(|path| path.is_file())
}

fn parse_library_folders(contents: &str) -> Vec<PathBuf> {
    contents.lines().filter_map(|line| {
        let key = line.find("\"path\"")?;
        let rest = &line[key + 6..];
        let start = rest.find('"')? + 1;
        let value = &rest[start..];
        let end = value.find('"')?;
        Some(PathBuf::from(value[..end].replace("\\\\", "\\")))
    }).collect()
}

fn candidate_paths() -> Vec<PathBuf> {
    #[cfg(target_os = "macos")]
    { return Vec::new(); }

    #[cfg(target_os = "windows")]
    {
        return std::env::var_os("LOCALAPPDATA")
            .map(|path| vec![PathBuf::from(path).join("Warframe/EE.log")])
            .unwrap_or_default();
    }

    #[cfg(target_os = "linux")]
    {
        let mut roots = linux_roots();
        if let Some(path) = library_folders_file().and_then(|path| fs::read_to_string(path).ok()) {
            roots.extend(parse_library_folders(&path));
        }
        let mut candidates = Vec::new();
        for root in roots {
            let path = root.join(EE_LOG_SUFFIX);
            if !candidates.contains(&path) { candidates.push(path); }
        }
        candidates
    }
}

fn effective_path(path: &str) -> Option<PathBuf> {
    if path.trim().is_empty() { candidate_paths().into_iter().next() }
    else { Some(PathBuf::from(path)) }
}

#[tauri::command]
pub fn detect_ee_log_paths() -> Vec<String> {
    candidate_paths().into_iter()
        .filter(|path| path.is_file())
        .filter_map(|path| path.to_str().map(ToOwned::to_owned))
        .collect()
}

#[tauri::command]
pub fn ee_log_status(path: String) -> EeLogStatus {
    let Some(path) = effective_path(&path) else {
        return EeLogStatus { exists: false, readable: false, modified_ago_secs: None };
    };
    let Ok(metadata) = fs::metadata(&path) else {
        return EeLogStatus { exists: false, readable: false, modified_ago_secs: None };
    };
    let readable = fs::File::open(&path).is_ok();
    let modified_ago_secs = metadata.modified().ok()
        .and_then(|modified| SystemTime::now().duration_since(modified).ok())
        .map(|duration| duration.as_secs());
    EeLogStatus { exists: true, readable, modified_ago_secs }
}
