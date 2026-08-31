use std::fs::{self, OpenOptions};
use std::io::{Write, Read};
use tauri::AppHandle;
use chrono::{Local, NaiveDate};
use std::path::{Path, PathBuf};

fn get_log_dir() -> PathBuf {
    let root = crate::get_data_root();
    let path = root.join("data/user/logs");
    let _ = fs::create_dir_all(&path);
    path
}

pub fn log_to_disk(_app: &AppHandle, message: &str) {
    let path = get_log_dir();
    let now = Local::now();
    let date_str = now.format("%Y-%m-%d").to_string();
    let log_file = path.join(format!("app-{}.log", date_str));
    
    let wall_time = now.format("%H:%M:%S%.3f").to_string();
    let line = format!("[{}] {}", wall_time, message);

    eprintln!("{line}");

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file) 
    {
        let _ = writeln!(file, "{line}");
    }
}

pub fn cleanup_old_logs() {
    let path = get_log_dir();
    let now = Local::now().naive_local().date();
    
    if let Ok(entries) = fs::read_dir(&path) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    let file_name = entry.file_name().to_string_lossy().into_owned();
                    if file_name.starts_with("app-") && file_name.ends_with(".log") {
                        let date_part = &file_name[4..file_name.len()-4];
                        if let Ok(log_date) = NaiveDate::parse_from_str(date_part, "%Y-%m-%d") {
                            let diff = now.signed_duration_since(log_date);
                            if diff.num_days() > 2 {
                                let _ = fs::remove_file(entry.path());
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn zip_logs(desktop_path: &Path) -> Result<PathBuf, String> {
    let log_dir = get_log_dir();
    let zip_path = desktop_path.join("Kiedas-Orbiter-Logs.zip");
    
    let file = fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    if let Ok(entries) = fs::read_dir(&log_dir) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("log") {
                        let name = path.file_name().unwrap().to_string_lossy();
                        if zip.start_file(name.as_ref(), options).is_ok() {
                            if let Ok(mut f) = fs::File::open(&path) {
                                let mut buffer = Vec::new();
                                if f.read_to_end(&mut buffer).is_ok() {
                                    let _ = zip.write_all(&buffer);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    zip.finish().map_err(|e| e.to_string())?;
    Ok(zip_path)
}
