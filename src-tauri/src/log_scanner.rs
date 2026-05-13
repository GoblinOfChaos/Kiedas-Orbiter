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
    in_mission: bool,
}

fn parse_timestamp(line: &str) -> Option<f64> {
    if let Some(space_idx) = line.find(' ') {
        let prefix = &line[..space_idx];
        if prefix.contains('.') {
            return prefix.parse::<f64>().ok();
        }
    }
    if let Some(ms_pos) = line.find("SystemTime: ") {
        let start = ms_pos + 12;
        if let Some(ms_end) = line[start..].find("ms") {
            return line[start..start + ms_end].parse::<f64>().ok();
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
            in_mission: false,
        }
    }

    pub fn on_line(&mut self, app: &AppHandle, line: &str) {
        let ts = parse_timestamp(line).unwrap_or(0.0);
        let s = line.trim();
        if s.is_empty() {
            return;
        }

        // === 1. Mission Start ===
        if s.contains("_ActiveMission\"} with MissionInfo") {
            self.is_fissure = true;
            self.in_mission = true;
            self.squad_size = 1;
            self.squad_relics.clear();
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 1: FISSURE START (LogTS: {}s)", ts));
            return;
        }

        // === 7. Mission Exit ===
        if s.contains("ExitState: Disconnected") || s.contains("Game [Info]: Set state to Disconnected") {
            self.is_fissure = false;
            self.in_mission = false;
            self.squad_relics.clear();
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 7: MISSION EXIT (LogTS: {}s)", ts));
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // === 2. Relic Pool Detection ===
        if s.contains("Resloader") && s.contains("/Lotus/Types/Game/Projections/") && s.contains("starting") {
            if let Some(start) = s.find("(/Lotus") {
                if let Some(end) = s[start..].find(')') {
                    let path = &s[start + 1..start + end];
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 2: RELIC POOL - {} (LogTS: {}s)", path, ts));
                    let relic = parse_relic_path(path);
                    self.squad_relics.push(relic);
                    self.is_fissure = true;

                    let state = app.state::<crate::AppState>();
                    if let Ok(mut cached) = state.active_relic_data.lock() {
                        *cached = Some(serde_json::json!({
                            "squad_relics": self.squad_relics,
                            "squad_size": self.squad_size,
                        }));
                    };
                }
            }
            return;
        }

        // === 4. 10 Reactant Trigger ===
        if s.contains("DVRCAftermathLotus") {
            if crate::ocr::ICON_SCAN_ACTIVE.load(Ordering::SeqCst) {
                return;
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
            let app_clone = app.clone();
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 4: 10 REACTANT DETECTED (Starting icon scan) (LogTS: {}s)", ts));
            std::thread::spawn(move || {
                crate::ocr::detect_slot_count_from_icons(app_clone, false);
            });
            return;
        }

        // === 5. Reward Screen Closure ===
        if s.contains("ProjectionRewardChoice.lua: Relic reward screen shut down") {
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 5: REWARD SCREEN CLOSE (LogTS: {}s)", ts));
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // === 6. Endless Mission Handling ===
        if s.contains("Created /Lotus/Interface/ThemedProjectionManager.swf") {
            if !self.in_mission {
                return;
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 6: ENDLESS CONTINUE (LogTS: {}s)", ts));
            return;
        }
    }
}

fn parse_relic_path(path: &str) -> RelicInfo {
    let tier_code = if path.contains("T1") { "Lith" }
        else if path.contains("T2") { "Meso" }
        else if path.contains("T3") { "Neo"  }
        else if path.contains("T4") { "Axi"  }
        else if path.contains("T5") { "Requiem" }
        else { "Unknown" };

    let refinement = if path.ends_with("Bronze")   { "Intact"      }
        else if path.ends_with("Silver")            { "Exceptional" }
        else if path.ends_with("Gold")              { "Flawless"    }
        else if path.ends_with("Platinum")          { "Radiant"     }
        else                                        { "Intact"      };

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

// ─── Lifecycle helpers — call from main.rs ─────────────────────────────────────

pub fn log_app_start(app: &AppHandle) {
    crate::logger::log_to_disk(app, "");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
    crate::logger::log_to_disk(app, "[KRONOS] Application started");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
}

pub fn log_app_stop(app: &AppHandle) {
    crate::logger::log_to_disk(app, "[KRONOS] Application shutting down");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
    crate::logger::log_to_disk(app, "");
}

// ──────────────────────────────────────────────────────────────────────────────

pub fn stop_scanner(app: &AppHandle) {
    crate::logger::log_to_disk(app, "[LOG SCANNER] stop_scanner called — stopping watcher thread");
    IS_SCANNING.store(false, Ordering::SeqCst);
    crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
}

pub fn is_scanning() -> bool {
    IS_SCANNING.load(Ordering::SeqCst)
}

// ─── Main watcher ──────────────────────────────────────────────────────────────

pub fn spawn_log_watcher(app: AppHandle, log_path: PathBuf) -> Result<LogScannerHandle, String> {
    if IS_SCANNING.load(Ordering::SeqCst) {
        return Err("Already scanning".to_string());
    }
    IS_SCANNING.store(true, Ordering::SeqCst);

    crate::logger::log_to_disk(&app, &format!(
        "[LOG SCANNER] Scanner initialised — watching: {}",
        log_path.display()
    ));

    let app_inner = app.clone();

    std::thread::spawn(move || {
        let mut scanner = LogScanner::new();
        let mut remainder = String::new();
        let mut activity_confirmed = false;
        let mut error_logged = false;
        let mut pos;

        // ── Initial Open & Catch-up ──────────────────────────────────────────
        // Wait for the file to exist, then read the tail for context.
        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) { return; }
            if let Ok(mut file) = File::open(&log_path) {
                let file_size = file.metadata().map(|m| m.len()).unwrap_or(0);
                crate::logger::log_to_disk(&app_inner, &format!(
                    "[LOG SCANNER] EE.log found — size: {} bytes", file_size
                ));

                // Catch-up: Scan last 50KB to see if we're mid-mission.
                let catchup_start = file_size.saturating_sub(50_000);
                if file.seek(SeekFrom::Start(catchup_start)).is_ok() {
                    let mut catchup_buf = Vec::new();
                    if file.read_to_end(&mut catchup_buf).is_ok() {
                        let text = String::from_utf8_lossy(&catchup_buf);
                        let mut n = 0usize;
                        for line in text.lines() {
                            scanner.on_line(&app_inner, line);
                            n += 1;
                        }
                        crate::logger::log_to_disk(&app_inner, &format!(
                            "[LOG SCANNER] Catch-up complete — processed {} historical lines", n
                        ));
                    }
                }
                pos = file_size;
                break;
            }
            thread::sleep(Duration::from_millis(1000));
        }

        // ── Main Polling Loop ────────────────────────────────────────────────
        // We open the file fresh on every iteration. This is microseconds of 
        // overhead but makes stale handles structurally impossible on Windows.
        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) {
                crate::logger::log_to_disk(&app_inner, "[LOG SCANNER] Watcher thread stopping");
                break;
            }

            match File::open(&log_path) {
                Ok(mut file) => {
                    error_logged = false; // reset error state if we successfully opened

                    if let Ok(current_len) = file.seek(SeekFrom::End(0)) {
                        if current_len < pos {
                            crate::logger::log_to_disk(&app_inner, "[LOG SCANNER] EE.log truncated/reset — seeking to start");
                            pos = 0;
                            remainder.clear();
                        }

                        if current_len > pos {
                            if file.seek(SeekFrom::Start(pos)).is_ok() {
                                let mut buffer = Vec::new();
                                if let Ok(bytes_read) = file.read_to_end(&mut buffer) {
                                    if bytes_read > 0 {
                                        if !activity_confirmed {
                                            crate::logger::log_to_disk(&app_inner, "[LOG SCANNER] EE.log activity confirmed — scanner is live");
                                            activity_confirmed = true;
                                        }

                                        let raw = String::from_utf8_lossy(&buffer);
                                        let mut full = if remainder.is_empty() {
                                            raw.into_owned()
                                        } else {
                                            let mut s = std::mem::take(&mut remainder);
                                            s.push_str(&raw);
                                            s
                                        };

                                        // Handle partial lines at the end of the chunk
                                        if !full.ends_with('\n') {
                                            if let Some(last_nl) = full.rfind('\n') {
                                                remainder = full.split_off(last_nl + 1);
                                            } else {
                                                remainder = full;
                                                pos += bytes_read as u64;
                                                thread::sleep(Duration::from_millis(100));
                                                continue;
                                            }
                                        }

                                        for line in full.lines() {
                                            scanner.on_line(&app_inner, line);
                                        }
                                        pos += bytes_read as u64;
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    if !error_logged {
                        crate::logger::log_to_disk(&app_inner, &format!(
                            "[LOG SCANNER] EE.log became inaccessible (waiting...): {}", e));
                        error_logged = true;
                        activity_confirmed = false;
                    }
                }
            }

            thread::sleep(Duration::from_millis(100));
        }
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}