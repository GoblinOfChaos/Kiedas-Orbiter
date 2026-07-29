fn main() {
    tauri_build::build();

// Walk data/assets/ and data/wfcd/ at compile time to generate a list of
// bundled asset files.  Tauri's resource glob includes everything under
// these directories, but its resolve_resource() only works on individual
// files, not directories, so we need the exact file list to extract them
// at runtime.  card-images/ is excluded - those are extracted by the
// exporter at runtime.
let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
let mut files: Vec<String> = Vec::new();

// data/assets/
let assets_dir = std::path::PathBuf::from(&manifest_dir).join("data/assets");
if assets_dir.exists() {
    walk_dir(&assets_dir, &assets_dir, &mut files, "data/assets");
}

// data/wfcd/ (warframe-items JSON, synced from npm package by scripts/sync-wfcd.js)
let wfcd_dir = std::path::PathBuf::from(&manifest_dir).join("data/wfcd");
if wfcd_dir.exists() {
    walk_dir(&wfcd_dir, &wfcd_dir, &mut files, "data/wfcd");
}

    // Emit as a Rust array literal
    let output = format!(
        "const BUNDLED_ASSET_FILES: &[&str] = &[{}];",
        files
            .iter()
            .map(|f| format!("\"{}\"", f))
            .collect::<Vec<_>>()
            .join(", ")
    );
    let out_dir = std::env::var("OUT_DIR").unwrap();
    std::fs::write(std::path::PathBuf::from(&out_dir).join("bundled_assets.rs"), &output)
        .unwrap();
}

fn walk_dir(base: &std::path::Path, dir: &std::path::Path, files: &mut Vec<String>, prefix: &str) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Skip card-images - extracted by the exporter at runtime
                if path.file_name().and_then(|n| n.to_str()) == Some("card-images") {
                    continue;
                }
                walk_dir(base, &path, files, prefix);
            } else if path.is_file() {
                let rel = path.strip_prefix(base).unwrap();
                let rel_str = rel.to_string_lossy().to_string().replace('\\', "/");
                files.push(format!("{}/{}", prefix, rel_str));
            }
        }
    }
}
