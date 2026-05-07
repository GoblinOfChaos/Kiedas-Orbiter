use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};

static IS_SCANNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RelicInfo {
    pub unique_name: String,
    pub tier: String,
    pub refinement: String,
    pub era: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct FissureEvent {
    pub event_type: String,
    pub squad_relics: Vec<RelicInfo>,
    pub local_reward: Option<String>,
    pub squad_size: usize,
    pub void_tier: Option<String>,
}

pub struct LogScanner {
    squad_relics: Vec<RelicInfo>,
    squad_size: usize,
    is_fissure: bool,
    has_triggered_reward: bool,
    wait_for_root_types: bool,
}

fn parse_timestamp(line: &str) -> Option<f64> {
    // Format: "5687.320 Sys" from EE.log
    if let Some(space_idx) = line.find(' ') {
        let prefix = &line[..space_idx];
        if prefix.contains('.') {
            return prefix.parse::<f64>().ok();
        }
    }
    // Format: "[SystemTime: 1777981758260ms]" from overlay_debug
    if line.starts_with('[') {
        if let Some(end) = line.find(']') {
            let inner = &line[1..end];
            if let Some(ms_pos) = inner.find("SystemTime: ") {
                let ms_str = &inner[ms_pos + 11..];
                if let Some(ms_end) = ms_str.find("ms") {
                    let ms_num = &ms_str[..ms_end];
                    return ms_num.parse::<f64>().ok();
                }
            }
        }
    }
    None
}

impl LogScanner {
    pub fn new() -> Self {
        Self {
            squad_relics: Vec::new(),
            squad_size: 1,
            is_fissure: false,
            has_triggered_reward: false,
            wait_for_root_types: false,
        }
    }

    pub fn on_line(&mut self, app: &AppHandle, line: &str, _silent: bool) {
        let ts = parse_timestamp(line).unwrap_or(0.0);

        let s = line.trim();
        if s.is_empty() {
            return;
        }

        // === 1. Mission Start/End Detection ===
        if line.contains("_ActiveMission\"} with MissionInfo") {
            self.is_fissure = true;
            self.squad_size = 1;
            self.squad_relics.clear();
            self.has_triggered_reward = false;
            self.wait_for_root_types = false;
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 1: FISSURE START (LogTS: {}s)", ts));
            return;
        }

        // --- Step 7: Mission Exit ---
        if line.contains("ExitState: Disconnected") || line.contains("Game [Info]: Set state to Disconnected") {
            self.is_fissure = false;
            self.squad_relics.clear();
            self.has_triggered_reward = false;
            self.wait_for_root_types = false;
            // Stop any in-progress icon scan
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 7: MISSION EXIT (LogTS: {}s)", ts));
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // --- Step 2: Relic Pool Detection ---
        if line.contains("Resloader") && line.contains("/Lotus/Types/Game/Projections/") && line.contains("starting") {
            if let Some(start) = line.find("(/Lotus") {
                if let Some(end) = line[start..].find(')') {
                    let path = &line[start + 1..start + end];
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 2: RELIC POOL - {} (LogTS: {}s)", path, ts));
                    let relic = parse_relic_path(path);
                    self.squad_relics.push(relic);
                    self.is_fissure = true;
                }
            }
            return;
        }

// --- Step 4: 10 Reactant Trigger ---
        if line.contains("DVRCAftermathLotus") {
            if self.has_triggered_reward || self.wait_for_root_types {
                return;
            }
            self.wait_for_root_types = true;
            // Arm the icon scan flag before spawning so the poll loop doesn't
            // exit on the very first check
            crate::ocr::ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
            let app_clone = app.clone();
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 4: 10 REACTANT DETECTED (Starting icon scan) (LogTS: {}s)", ts));
            std::thread::spawn(move || {
                crate::ocr::detect_slot_count_from_icons(app_clone);
            });
            return;
        }

        // --- Step 5: Reward Screen Closure ---
        if line.contains("ProjectionRewardChoice.lua: Relic reward screen shut down") {
            self.has_triggered_reward = false;
            self.wait_for_root_types = false;
            // Stop icon scan if it's still polling (reward never appeared or
            // screen closed before we could detect it)
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 5: REWARD SCREEN CLOSE (LogTS: {}s)", ts));
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // --- Step 6: Endless Mission Handling ---
        if line.contains("Created /Lotus/Interface/ThemedProjectionManager.swf") {
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 6: ENDLESS CONTINUE (LogTS: {}s)", ts));
            self.squad_relics.clear();
            self.has_triggered_reward = false;
            self.wait_for_root_types = false;
            return;
        }
    }

    fn trigger_overlay(&self, app: &AppHandle) {
        let app_c = app.clone();
        let sz = self.squad_size;
        let relics = self.squad_relics.clone();

        if let Some(window) = app.get_window("overlay-relic") {
            let _ = window.show();
        }
        
        let event_payload = FissureEvent {
            event_type: "relic_phase_start".to_string(),
            squad_relics: relics,
            local_reward: None,
            squad_size: sz,
            void_tier: None,
        };

        // Cache the session data in AppState
        let state = app.state::<crate::AppState>();
        if let Ok(mut cached) = state.active_relic_data.lock() {
            *cached = Some(serde_json::to_value(&event_payload).unwrap_or(serde_json::Value::Null));
        }

        app.emit_all("scanner-relic-phase-start", serde_json::json!({ "squad_size": sz })).unwrap_or_default();
        app.emit_all("fissure-relic-phase", &event_payload).unwrap_or_default();
        
        crate::ocr::run_ocr_pipeline_with_size(app_c.clone(), sz);
    }
}

fn parse_relic_path(path: &str) -> RelicInfo {
    let tier_code = if path.contains("T1") {
        "Lith"
    } else if path.contains("T2") {
        "Meso"
    } else if path.contains("T3") {
        "Neo"
    } else if path.contains("T4") {
        "Axi"
    } else if path.contains("T5") {
        "Requiem"
    } else {
        "Unknown"
    };

    let refinement = if path.ends_with("Bronze") {
        "Intact"
    } else if path.ends_with("Silver") {
        "Exceptional"
    } else if path.ends_with("Gold") {
        "Flawless"
    } else if path.ends_with("Platinum") {
        "Radiant"
    } else {
        "Intact"
    };

    RelicInfo {
        unique_name: path.to_string(),
        tier: tier_code.to_string(),
        refinement: refinement.to_string(),
        era: tier_code.to_string(),
    }
}

pub struct LogScannerHandle {
    pub running: Arc<AtomicBool>,
}

pub fn stop_scanner() {
    IS_SCANNING.store(false, Ordering::SeqCst);
    // Also stop any in-flight icon scan
    crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
}

pub fn is_scanning() -> bool {
    IS_SCANNING.load(Ordering::SeqCst)
}

pub fn spawn_log_watcher(app: AppHandle, log_path: PathBuf) -> Result<LogScannerHandle, String> {
    if IS_SCANNING.load(Ordering::SeqCst) {
        return Err("Already scanning".to_string());
    }
    IS_SCANNING.store(true, Ordering::SeqCst);

    let app_inner = app.clone();

    std::thread::spawn(move || {
        let mut scanner = LogScanner::new();
        let mut pos = 0u64;
        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) {
                break;
            }

            let file_result = File::open(&log_path);
            if let Err(e) = file_result {
                let msg = format!("[LOG SCANNER] Failed to open log: {}", e);
                eprintln!("{}", msg);
                crate::logger::log_to_disk(&app_inner, &msg);
                thread::sleep(Duration::from_secs(1));
                continue;
            }

            if let Ok(mut file) = file_result {
                if let Ok(metadata) = file.metadata() {
                    let new_len = metadata.len();

                    if new_len < pos {
                        pos = 0;
                    }

                    if new_len > pos {
                        let mut buffer = Vec::new();
                        if file.seek(SeekFrom::Start(pos)).is_ok() {
                            if file.read_to_end(&mut buffer).is_ok() && !buffer.is_empty() {
                                let text = String::from_utf8_lossy(&buffer);
                                for line in text.lines() {
                                    scanner.on_line(&app_inner, line, false);
                                }
                            }
                        }
                        pos = new_len;
                    }
                }
            }

            thread::sleep(Duration::from_millis(50));
        }
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}