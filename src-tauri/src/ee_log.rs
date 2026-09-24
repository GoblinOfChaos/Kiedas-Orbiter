use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::io::Read;
use std::time::SystemTime;

const EE_LOG_SUFFIX: &str = "steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EeLogStatus {
    pub exists: bool,
    pub readable: bool,
    pub modified_ago_secs: Option<u64>,
}

#[cfg(target_os = "linux")]
fn linux_roots() -> Vec<PathBuf> {
    let home = std::env::var_os("HOME").map(PathBuf::from).unwrap_or_default();
    vec![
        home.join(".local/share/Steam"),
        home.join(".steam/steam"),
        home.join(".var/app/com.valvesoftware.Steam/.local/share/Steam"),
    ]
}

#[cfg(target_os = "linux")]
fn library_folders_files() -> Vec<PathBuf> {
    linux_roots().into_iter()
        .map(|root| root.join("steamapps/libraryfolders.vdf"))
        .filter(|path| path.is_file())
        .collect()
}

#[cfg_attr(not(test), allow(dead_code))]
fn parse_library_folders(contents: &str) -> Vec<PathBuf> {
    let mut folders = Vec::new();
    for line in contents.lines() {
        let mut remaining = line;
        while let Some(key) = remaining.find("\"path\"") {
            let rest = &remaining[key + 6..];
            let Some(start) = rest.find('"').map(|index| index + 1) else { break };
            let value = &rest[start..];
            let Some(end) = value.find('"') else { break };
            folders.push(PathBuf::from(value[..end].replace("\\\\", "\\")));
            remaining = &value[end + 1..];
        }
    }
    folders
}

#[cfg(target_os = "linux")]
fn dedupe_paths(paths: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut seen = Vec::new();
    paths.into_iter().filter(|path| {
        let key = fs::canonicalize(path).unwrap_or_else(|_| path.clone());
        if seen.contains(&key) { false } else { seen.push(key); true }
    }).collect()
}

#[cfg(target_os = "linux")]
fn candidate_paths() -> Vec<PathBuf> {
    let mut roots = linux_roots();
    for path in library_folders_files() {
        let Ok(mut file) = fs::File::open(path) else { continue };
        let mut contents = String::new();
        if file.take(2 * 1024 * 1024).read_to_string(&mut contents).is_ok() {
            roots.extend(parse_library_folders(&contents));
        }
    }
    dedupe_paths(roots.into_iter().map(|root| root.join(EE_LOG_SUFFIX)).collect())
}

#[cfg(target_os = "windows")]
fn candidate_paths() -> Vec<PathBuf> {
    std::env::var_os("LOCALAPPDATA")
        .map(|path| vec![PathBuf::from(path).join("Warframe/EE.log")])
        .unwrap_or_default()
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn candidate_paths() -> Vec<PathBuf> {
    Vec::new()
}

#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn effective_path(path: &str) -> Option<PathBuf> {
    if path.trim().is_empty() {
        let candidates = candidate_paths();
        candidates.iter().find(|candidate| candidate.is_file()).cloned()
            .or_else(|| candidates.into_iter().next())
    } else {
        Some(PathBuf::from(path))
    }
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
    if !metadata.is_file() {
        return EeLogStatus { exists: false, readable: false, modified_ago_secs: None };
    }
    let readable = fs::File::open(&path).is_ok();
    let modified_ago_secs = metadata.modified().ok()
        .and_then(|modified| SystemTime::now().duration_since(modified).ok())
        .map(|duration| duration.as_secs());
    EeLogStatus { exists: true, readable, modified_ago_secs }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;

    #[test]
    fn parses_all_library_folder_entries() {
        assert_eq!(parse_library_folders(
            r#""0" { "path" "/home/test/.local/share/Steam" } "1" { "path" "D:\\SteamLibrary" }"#
        ), vec![PathBuf::from("/home/test/.local/share/Steam"), PathBuf::from("D:\\SteamLibrary")]);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn deduplicates_canonical_paths_and_raw_fallbacks() {
        let root = std::env::temp_dir().join(format!("kiedas-ee-log-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("real")).unwrap();
        let alias = root.join("alias");
        #[cfg(unix)] std::os::unix::fs::symlink(root.join("real"), &alias).unwrap();
        let paths = dedupe_paths(vec![root.join("real"), alias, root.join("missing"), root.join("missing")]);
        assert_eq!(paths, vec![root.join("real"), root.join("missing")]);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn status_rejects_directory_before_opening_it() {
        let root = std::env::temp_dir().join(format!("kiedas-ee-status-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let status = ee_log_status(root.to_string_lossy().into_owned());
        assert!(!status.exists);
        assert!(!status.readable);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn status_accepts_regular_file() {
        let path = std::env::temp_dir().join(format!("kiedas-ee-file-{}", std::process::id()));
        let mut file = File::create(&path).unwrap();
        file.write_all(b"EE.log").unwrap();
        let status = ee_log_status(path.to_string_lossy().into_owned());
        assert!(status.exists);
        assert!(status.readable);
        let _ = fs::remove_file(path);
    }
}
