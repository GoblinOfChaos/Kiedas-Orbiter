use std::fs::{self, OpenOptions};
use std::io::{Write, Read};
use tauri::AppHandle;
use chrono::{Local, NaiveDate};
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Versioned JSONL envelope shared with src/lib/logging/eventEnvelope.js.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuredEvent {
    pub schema: u32,
    pub event_id: String,
    pub session_id: String,
    pub sequence: u64,
    pub timestamp_utc: String,
    pub monotonic_ms: f64,
    pub process: String,
    pub window: String,
    pub source: String,
    pub level: String,
    pub event: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub screen: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub route: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub component: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub control_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub interaction: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_event_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phase: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,
    #[serde(default)]
    pub payload: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<Value>,
    #[serde(default)]
    pub build: Value,
}

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

/// Append a bounded frontend batch to the active session JSONL file. This is
/// deliberately separate from log_to_disk so legacy human-readable output
/// remains unchanged during the phased migration.
pub fn write_structured_batch(events: &[StructuredEvent]) -> Result<(), String> {
    if events.is_empty() { return Ok(()); }
    let session_id = events[0].session_id.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>();
    if session_id.is_empty() { return Err("structured log session id is empty".into()); }
    let path = get_log_dir().join(format!("session-{session_id}.jsonl"));
    let mut file = OpenOptions::new().create(true).append(true).open(&path).map_err(|e| e.to_string())?;
    for event in events {
        if event.schema != 1 || event.session_id != events[0].session_id { continue; }
        let line = serde_json::to_string(event).map_err(|e| e.to_string())?;
        writeln!(file, "{line}").map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn write_legacy_structured(message: &str) {
    let now = Local::now();
    let event = StructuredEvent {
        schema: 1,
        event_id: format!("legacy-{}", now.timestamp_nanos_opt().unwrap_or_default()),
        session_id: "native-legacy".into(),
        sequence: now.timestamp_millis().max(0) as u64,
        timestamp_utc: now.to_rfc3339(),
        monotonic_ms: 0.0,
        process: "kiedas-orbiter".into(),
        window: "main".into(),
        source: "rust".into(),
        level: "info".into(),
        event: "legacy.log_terminal".into(),
        screen: None, route: None, component: None, control_id: None,
        interaction: None, correlation_id: None, parent_event_id: None,
        phase: Some("complete".into()), duration_ms: None, outcome: Some("success".into()),
        payload: serde_json::json!({ "message": { "redacted": true, "type": "string", "length": message.len() } }),
        error: None,
        build: serde_json::json!({ "app_version": env!("CARGO_PKG_VERSION") }),
    };
    let _ = write_structured_batch(&[event]);
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
                    if matches!(path.extension().and_then(|s| s.to_str()), Some("log") | Some("jsonl")) {
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
