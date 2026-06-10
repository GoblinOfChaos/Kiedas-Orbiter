use std::collections::HashSet;
use std::io::Read;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

pub static IS_SCANNING: AtomicBool = AtomicBool::new(false);
// 0 = idle, 1 = waiting for process, 2 = hooked/active
pub static SCANNER_STATUS: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(0);

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

#[derive(PartialEq)]
enum RivenState {
    Idle,
    ScreenOpen,
    AwaitingConfirm1,
    Wait4s,
    AwaitingConfirm2,
}

pub struct LogScanner {
    squad_relics: Vec<RelicInfo>,
    squad_size: usize,
    is_fissure: bool,
    in_mission: bool,
    riven_state: RivenState,
    squad_channels: HashSet<String>,
    expecting_archon_boosts: bool,
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

/// Check if a line matches one of the riven menu close patterns (numeric values ignored).
impl LogScanner {
    pub fn new() -> Self {
        Self {
            squad_relics: Vec::new(),
            squad_size: 1,
            is_fissure: false,
            in_mission: false,
            riven_state: RivenState::Idle,
            squad_channels: HashSet::new(),
            expecting_archon_boosts: false,
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
            app.emit("fissure-reward-closed", ()).unwrap_or_default();
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

        // === 4. Reward Screen Trigger ===
        if (s.contains("Relic rewards initialized") || s.contains("ProjectionRewardChoice.lua: Got rewards")) && self.is_fissure {
            if crate::ocr::ICON_SCAN_ACTIVE.load(Ordering::SeqCst) {
                return;
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
            let app_clone = app.clone();
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 4: REWARD SCREEN DETECTED (Starting icon scan) (LogTS: {}s)", ts));
            std::thread::spawn(move || {
                crate::ocr::detect_slot_count_from_icons(app_clone, false);
            });
            return;
        }

        // === 5. Reward Screen Closure ===
        if s.contains("ProjectionRewardChoice.lua: Relic reward screen shut down") {
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 5: REWARD SCREEN CLOSE (LogTS: {}s)", ts));
            app.emit("fissure-reward-closed", ()).unwrap_or_default();
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

        // ─── Riven linked in chat ───────────────────────────────────────────
        if s.contains("ThemedDetailedPurchaseDialog.lua: PopulateInfo->")
            && s.contains("/Lotus/StoreItems/Upgrades/Mods/Randomized")
        {
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven linked in chat opened (LogTS: {}s)", ts));
            app.emit("riven-linked-open", ()).unwrap_or_default();
            return;
        }
        if s.contains("ThemedDetailedPurchaseDialog.lua: DBG: HudVis") {
            app.emit("riven-linked-closed", ()).unwrap_or_default();
            return;
        }

        // ─── Riven reroll menu state machine ───────────────────────────────
        if s.contains("OmegaRerollSelection.lua: Diorama setup") {
            self.riven_state = RivenState::ScreenOpen;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll screen opened (LogTS: {}s)", ts));
            app.emit("riven-screen-open", ()).unwrap_or_default();
            return;
        }

        // Track dialog lifecycle
        if s.contains("Dialog.lua: Dialog::CreateOkCancel(description=") {
            match self.riven_state {
                RivenState::ScreenOpen => {
                    self.riven_state = RivenState::AwaitingConfirm1;
                }
                RivenState::Wait4s => {
                    self.riven_state = RivenState::AwaitingConfirm2;
                }
                _ => {}
            }
            return;
        }

        if s.contains("Dialog.lua: SendResult_MENU_CANCEL()") || s.contains("Dialog.lua: Dialog::SendResult(5)") {
            // Dialog cancelled - go back to previous state
            match self.riven_state {
                RivenState::AwaitingConfirm1 => {
                    self.riven_state = RivenState::ScreenOpen;
                }
                RivenState::AwaitingConfirm2 => {
                    // If second dialog cancelled, the whole menu might be closing
                    self.riven_state = RivenState::ScreenOpen;
                }
                _ => {}
            }
            return;
        }

        if s.contains("Dialog.lua: SendResult_MENU_SELECT()") || s.contains("Dialog.lua: Dialog::SendResult(4)") {
            match self.riven_state {
                RivenState::AwaitingConfirm1 => {
                    self.riven_state = RivenState::Wait4s;
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll confirmed, waiting for second dialog (LogTS: {}s)", ts));
                    app.emit("riven-reroll", ()).unwrap_or_default();
                }
                RivenState::AwaitingConfirm2 => {
                    self.riven_state = RivenState::ScreenOpen;
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven new selection confirmed (LogTS: {}s)", ts));
                    app.emit("riven-reroll-confirmed", ()).unwrap_or_default();
                }
                _ => {}
            }
            return;
        }

        // ─── Riven close detection ────────────────────────────────────────
        if s.contains("CancelJobs batchcount 0") {
            self.riven_state = RivenState::Idle;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll menu closed (CancelJobs) (LogTS: {}s)", ts));
            app.emit("riven-screen-closed", ()).unwrap_or_default();
            return;
        }
        if s.contains("NpcManager::ClearAgents() ReadyToCreateAgents = false") {
            self.riven_state = RivenState::Idle;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven overlays closed (ClearAgents) (LogTS: {}s)", ts));
            app.emit("riven-screen-closed", ()).unwrap_or_default();
            app.emit("riven-linked-closed", ()).unwrap_or_default();
            return;
        }

        // ─── Archon Hunt Elite Alert modifiers ────────────────────────────
        if self.expecting_archon_boosts && (s.contains("suitType=") || s.contains("wepTypes=")) {
            self.expecting_archon_boosts = false;
            let mut suit_type = String::new();
            let mut wep_types: Vec<String> = Vec::new();
            if let Some(suit_start) = s.find("suitType=") {
                let after = &s[suit_start + 9..];
                if let Some(end) = after.find(' ') {
                    suit_type = after[..end].to_string();
                } else {
                    suit_type = after.to_string();
                }
            }
            if let Some(wep_start) = s.find("wepTypes=") {
                let after = &s[wep_start + 9..];
                for path in after.split(',') {
                    let p = path.trim().trim_end_matches(',');
                    if !p.is_empty() && p != "," {
                        wep_types.push(p.to_string());
                    }
                }
            }
            app.emit("archon-hunt-modifiers", serde_json::json!({
                "suitType": suit_type,
                "wepTypes": wep_types,
            })).unwrap_or_default();
            return;
        }

        if s.contains("Background.lua: EliteAlert: generated boosts for") {
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Archon Hunt elite alert modifiers detected (LogTS: {}s)", ts));
            
            // Check if modifiers are on the same line
            if s.contains("suitType=") {
                let mut suit_type = String::new();
                let mut wep_types: Vec<String> = Vec::new();
                if let Some(suit_start) = s.find("suitType=") {
                    let after = &s[suit_start + 9..];
                    if let Some(end) = after.find(' ') {
                        suit_type = after[..end].to_string();
                    } else {
                        suit_type = after.to_string();
                    }
                }
                if let Some(wep_start) = s.find("wepTypes=") {
                    let after = &s[wep_start + 9..];
                    for path in after.split(',') {
                        let p = path.trim().trim_end_matches(',');
                        if !p.is_empty() && p != "," {
                            wep_types.push(p.to_string());
                        }
                    }
                }
                app.emit("archon-hunt-modifiers", serde_json::json!({
                    "suitType": suit_type,
                    "wepTypes": wep_types,
                })).unwrap_or_default();
            } else {
                self.expecting_archon_boosts = true;
            }
            return;
        }

        // ─── Chat squad channel tracking ───────────────────────────────────
        if let Some(hash_start) = s.find("IRC out: JOIN #") {
            let hash = &s[hash_start + 14..]; // skip "IRC out: JOIN #"
            let hash = hash.trim();
            self.squad_channels.insert(hash.to_string());
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Squad channel joined: #{} (LogTS: {}s)", hash, ts));
            return;
        }

        if s.contains("ChatRedux.lua: Chat: Filters for") && s.contains(":") {
            // Extract channel name
            if let Some(filters_start) = s.find("Filters for") {
                let after = &s[filters_start + 11..];
                if let Some(colon) = after.find(':') {
                    let channel = after[..colon].trim();
                    // Skip public channels
                    let is_public = channel.contains("G_EN_") || channel.contains("R_EN_")
                        || channel.contains("Q_EN_") || channel.contains("T_EN_");
                    if !is_public && self.squad_channels.contains(channel) {
                        crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Chat incoming message (squad channel: {}) (LogTS: {}s)", channel, ts));
                        app.emit("chat-incoming-message", serde_json::json!({
                            "channel": channel,
                        })).unwrap_or_default();
                        return;
                    }
                }
            }
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
    SCANNER_STATUS.store(0, Ordering::SeqCst);
    crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
    // Kill any orphaned helper so the blocking read_exact unblocks
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = std::process::Command::new("taskkill")
            .args(["/f", "/im", "warframe-api-helper.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }
    #[cfg(not(windows))]
    {
        // macOS and Linux
        let _ = std::process::Command::new("pkill")
            .args(["-f", "warframe-api-helper"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }
}

pub fn is_scanning() -> bool {
    IS_SCANNING.load(Ordering::SeqCst)
}

#[tauri::command]
pub fn get_scanner_status() -> String {
    match SCANNER_STATUS.load(Ordering::SeqCst) {
        1 => "waiting".to_string(),
        2 => "active".to_string(),
        _ => "idle".to_string(),
    }
}

// ─── Memory watcher ────────────────────────────────────────────────────────────

fn line_hash(s: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for &b in s.as_bytes() {
        hash ^= b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn is_warframe_running() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        if let Ok(output) = std::process::Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq Warframe.x64.exe", "/NH"])
            .creation_flags(0x08000000)
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("Warframe.x64.exe") {
                return true;
            }
        }
        false
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(pids) = std::fs::read_dir("/proc") {
            for entry in pids.flatten() {
                let pid = entry.file_name();
                if !pid.to_string_lossy().chars().all(|c| c.is_ascii_digit()) { continue; }
                let comm_path = std::path::Path::new("/proc").join(&pid).join("comm");
                if let Ok(comm) = std::fs::read_to_string(&comm_path) {
                    if comm.contains("Warframe") || comm.contains("warframe.exe") || comm.contains("warframe") {
                        return true;
                    }
                }
                let cmd_path = std::path::Path::new("/proc").join(&pid).join("cmdline");
                if let Ok(cmd) = std::fs::read_to_string(&cmd_path) {
                    if cmd.contains("Warframe") || cmd.contains("warframe.exe") || cmd.contains("warframe") {
                        return true;
                    }
                }
            }
        }
        false
    }
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("pgrep")
            .arg("-f")
            .arg("Warframe")
            .output()
        {
            if output.status.success() {
                return true;
            }
        }
        false
    }
}

pub fn spawn_memory_watcher(app: AppHandle, _log_path: PathBuf) -> Result<LogScannerHandle, String> {
    if IS_SCANNING.load(Ordering::SeqCst) {
        return Err("Already scanning".to_string());
    }

    let bin_name = format!("warframe-api-helper{}", std::env::consts::EXE_SUFFIX);
    let relative = format!("data/bin/{}", bin_name);

    let writable = crate::get_data_root().join(&relative);
    let helper_path = if writable.exists() {
        writable
    } else if let Some(bundled) = app.path().resolve(&relative, tauri::path::BaseDirectory::Resource).ok() {
        if bundled.exists() { bundled } else { return Err("warframe-api-helper not found".to_string()); }
    } else {
        return Err("warframe-api-helper not found".to_string());
    };

    IS_SCANNING.store(true, Ordering::SeqCst);

    let app_inner = app.clone();

    std::thread::spawn(move || {
        let mut scanner = LogScanner::new();
        let mut seen_set: std::collections::HashSet<u64> = std::collections::HashSet::new();
        let mut logged_waiting = false;

        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) {
                break;
            }
            
            if !is_warframe_running() {
                if !logged_waiting {
                    crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Waiting for Warframe process...");
                    logged_waiting = true;
                    SCANNER_STATUS.store(1, Ordering::SeqCst);
                }
                std::thread::sleep(std::time::Duration::from_secs(10));
                continue;
            }

            let mut cmd = std::process::Command::new(&helper_path);
            cmd.arg("--read-log-buffer")
               .stdout(std::process::Stdio::piped())
               .stderr(std::process::Stdio::piped());
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                cmd.creation_flags(CREATE_NO_WINDOW);
            }
            let mut child = match cmd.spawn()
            {
                Ok(c) => c,
                Err(e) => {
                    crate::logger::log_to_disk(&app_inner, &format!(
                        "[MEMORY WATCHER] Failed to spawn helper (will retry): {}", e
                    ));
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    continue;
                }
            };

            crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Helper started");

            let mut reader = match child.stdout.take() {
                Some(s) => std::io::BufReader::new(s),
                None => continue,
            };
            let mut buf = Vec::new();
            let mut first_data = true;

            loop {
                if !IS_SCANNING.load(Ordering::SeqCst) {
                    let _ = child.kill();
                    break;
                }

                let mut len_buf = [0u8; 4];
                if reader.read_exact(&mut len_buf).is_err() {
                    crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Helper stream ended, restarting...");
                    let _ = child.kill();
                    break;
                }
                let data_len = u32::from_le_bytes(len_buf) as usize;

                // Sanity check: prevent OOM from corrupt length values.
                // EE.log lines are typically <4 KB; 1 MB is a generous limit.
                if data_len > 1_048_576 {
                    crate::logger::log_to_disk(&app_inner, &format!(
                        "[MEMORY WATCHER] Corrupt data length {}, restarting helper...", data_len
                    ));
                    let _ = child.kill();
                    break;
                }

                if data_len == 0 {
                    if !logged_waiting {
                        crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Waiting for Warframe process...");
                        logged_waiting = true;
                        SCANNER_STATUS.store(1, Ordering::SeqCst);
                    }
                    // Kill helper so it restarts and re-hooks if Warframe was launched
                    let _ = child.kill();
                    std::thread::sleep(std::time::Duration::from_secs(10));
                    break;
                }

                buf.resize(data_len, 0);
                if reader.read_exact(&mut buf).is_err() {
                    crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Read error, restarting helper...");
                    let _ = child.kill();
                    break;
                }

                if first_data {
                    crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Hooked into Warframe RAM! Backfill — populating dedup set, suppressing events.");
                    SCANNER_STATUS.store(2, Ordering::SeqCst);
                    first_data = false;
                    let text = String::from_utf8_lossy(&buf);
                    for line in text.split('\n') {
                        let line = line.trim_matches(|c: char| c.is_whitespace() || c == '\0');
                        if line.is_empty() { continue; }
                        if !line.starts_with(|c: char| c.is_ascii_digit()) { continue; }
                        let hash = line_hash(line);
                        seen_set.insert(hash);
                        // Static info events (archon modifiers) should fire immediately
                        if line.contains("EliteAlert: generated boosts for") {
                            scanner.on_line(&app_inner, line);
                        }
                    }
                    continue;
                }

                let text = String::from_utf8_lossy(&buf);
                for line in text.split('\n') {
                    let line = line.trim_matches(|c: char| c.is_whitespace() || c == '\0');
                    if line.is_empty() {
                        continue;
                    }
                    if !line.starts_with(|c: char| c.is_ascii_digit()) {
                        continue;
                    }
                    let hash = line_hash(line);
                    if !seen_set.insert(hash) {
                        continue;
                    }
                    scanner.on_line(&app_inner, line);
                }
            }
            
            // Sleep before restarting the helper to prevent CPU spinning when it crashes or exits immediately
            std::thread::sleep(std::time::Duration::from_secs(10));
        }

        IS_SCANNING.store(false, Ordering::SeqCst);
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}