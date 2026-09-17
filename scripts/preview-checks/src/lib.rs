#[path = "../../../src-tauri/src/build_profile.rs"]
pub mod build_profile;
#[path = "../../../src-tauri/src/preview_import.rs"]
pub mod preview_import;
#[cfg(test)] mod tests {
    use super::*;
    use std::{fs, path::PathBuf, time::{SystemTime, UNIX_EPOCH}};
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!("preview-test-{}-{}", std::process::id(), SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
            fs::create_dir_all(path.join("source")).unwrap(); fs::create_dir_all(path.join("preview")).unwrap(); Self(path)
        }
        fn source(&self) -> PathBuf { self.0.join("source") }
        fn dest(&self) -> PathBuf { self.0.join("preview") }
    }
    impl Drop for Fixture { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); } }
    #[cfg(not(feature = "preview"))]
    #[test] fn stable_build_rejects_import_before_touching_files() {
        let f = Fixture::new();
        assert!(preview_import::import(&f.source(), &f.dest(), &["inventory".into()], false).is_err());
        assert_eq!(fs::read_dir(f.dest()).unwrap().count(), 0);
    }
    #[cfg(feature = "preview")]
    #[test] fn credentials_removed_source_unchanged() {
        let f=Fixture::new(); let raw = br#"{"Recipes":[],"token":"secret","nested":{"sessionId":"secret","ItemType":"recipe"}}"#;
        fs::write(f.source().join("inventory.json"), raw).unwrap();
        preview_import::import(&f.source(), &f.dest(), &["inventory".into()], false).unwrap();
        assert_eq!(fs::read(f.source().join("inventory.json")).unwrap(),raw);
        let value: serde_json::Value=serde_json::from_slice(&fs::read(f.dest().join("inventory.json")).unwrap()).unwrap();
        assert!(value.get("token").is_none()); assert!(value["nested"].get("sessionId").is_none()); assert_eq!(value["nested"]["ItemType"],"recipe");
    }
    #[cfg(feature = "preview")]
    #[test] fn replacement_requires_choice_and_keeps_backup() {
        let f=Fixture::new();fs::write(f.source().join("inventory.json"),"{\"new\":1}").unwrap();fs::write(f.dest().join("inventory.json"),"{\"old\":1}").unwrap();
        assert!(preview_import::import(&f.source(), &f.dest(), &["inventory".into()], false).is_err());
        assert_eq!(fs::read_to_string(f.dest().join("inventory.json")).unwrap(),"{\"old\":1}");
        preview_import::import(&f.source(), &f.dest(), &["inventory".into()], true).unwrap();
        let backup=fs::read_dir(f.dest()).unwrap().flatten().find(|e| e.file_name().to_string_lossy().starts_with("preview-import-backup")).unwrap().path();
        assert_eq!(fs::read_to_string(backup.join("inventory.json")).unwrap(),"{\"old\":1}");
    }
    #[cfg(feature = "preview")]
    #[test] fn malformed_and_unknown_categories_do_not_replace_content() {
        let f=Fixture::new();fs::write(f.source().join("inventory.json"),"invalid").unwrap();
        assert!(preview_import::import(&f.source(), &f.dest(), &["inventory".into()],true).is_err());
        assert!(preview_import::import(&f.source(), &f.dest(), &["credentials".into()],true).is_err());
        assert!(!f.dest().join("inventory.json").exists());
    }
    #[cfg(feature = "preview")]
    #[test] fn preferences_allowlist_excludes_live_and_credentials() {
        let f=Fixture::new();fs::write(f.source().join("settings.json"),r#"{"gameLocale":"de","wfm_token":"secret","autoStartMonitoring":true,"hotkeys":[1]}"#).unwrap();
        preview_import::import(&f.source(), &f.dest(), &["preferences".into()],false).unwrap();
        let v:serde_json::Value=serde_json::from_slice(&fs::read(f.dest().join("settings.json")).unwrap()).unwrap();assert_eq!(v,serde_json::json!({"gameLocale":"de"}));
    }
    #[cfg(feature = "preview")]
    #[test] fn overlapping_profiles_are_rejected() {
        let f=Fixture::new();assert!(preview_import::import(&f.dest(),&f.dest(), &["inventory".into()],true).is_err());
    }
    #[cfg(all(unix, feature = "preview"))] #[test] fn source_symlinks_are_rejected() {
        let f=Fixture::new();fs::write(f.0.join("private.json"),"{}").unwrap();std::os::unix::fs::symlink(f.0.join("private.json"),f.source().join("inventory.json")).unwrap();
        assert!(preview_import::import(&f.source(), &f.dest(), &["inventory".into()],false).is_err());
    }
}

#[cfg(test)] mod config_tests {
    #[test] fn real_tauri_schema_accepts_all_preview_merges() {
        let base: serde_json::Value = serde_json::from_str(include_str!("../../../src-tauri/tauri.conf.json")).unwrap();
        let patch: serde_json::Value = serde_json::from_str(include_str!("../../../src-tauri/tauri.preview.conf.json")).unwrap();
        for platform in [include_str!("../../../src-tauri/tauri.linux.conf.json"), include_str!("../../../src-tauri/tauri.windows.conf.json"), include_str!("../../../src-tauri/tauri.darwin.conf.json")] {
            let mut value = base.clone();
            json_patch::merge(&mut value, &serde_json::from_str(platform).unwrap());
            json_patch::merge(&mut value, &patch);
            assert!(value["plugins"].get("updater").is_none());
            // Production Tauri resolves ../package.json relative to src-tauri;
            // this standalone crate resolves that same file explicitly, without changing cwd.
            let package: serde_json::Value = serde_json::from_str(include_str!("../../../package.json")).unwrap();
            value["version"] = package["version"].clone();
            let config: tauri_utils::config::Config = serde_json::from_value(value).unwrap();
            assert_eq!(config.identifier, "com.jacob.kiedasorbiter.preview");
            assert_eq!(config.app.windows.len(), 9);
        }
    }
}
