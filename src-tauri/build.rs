fn main() {
    tauri_build::build();

// Walk data/assets/ at compile time to generate a list of bundled asset files.
// Tauri's resource glob includes everything under data/assets/, but its
// resolve_resource() only works on individual files, not directories, so we
// need the exact file list to extract them at runtime.  card-images/ is
// excluded — those are extracted by the exporter at runtime.
let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
let assets_dir = std::path::PathBuf::from(&manifest_dir).join("data/assets");
let mut files: Vec<String> = Vec::new();
if assets_dir.exists() {
    walk_dir(&assets_dir, &assets_dir, &assets_dir, &mut files);
}
    // Emit as a Rust array literal
    let output = format!(
        "const BUNDLED_ASSET_FILES: &[&str] = &[{}];",
        files
            .iter()
            .map(|f| format!("\"data/assets/{}\"", f))
            .collect::<Vec<_>>()
            .join(", ")
    );
    let out_dir = std::env::var("OUT_DIR").unwrap();
    std::fs::write(std::path::PathBuf::from(&out_dir).join("bundled_assets.rs"), &output)
        .unwrap();
}

fn walk_dir(base: &std::path::Path, root: &std::path::Path, dir: &std::path::Path, files: &mut Vec<String>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Skip card-images — extracted by the exporter at runtime
                if path.file_name().and_then(|n| n.to_str()) == Some("card-images") {
                    continue;
                }
                walk_dir(base, root, &path, files);
            } else if path.is_file() {
                let rel = path.strip_prefix(base).unwrap();
                files.push(rel.to_string_lossy().to_string().replace('\\', "/"));
            }
        }
    }
}
