use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use rustc_hash::FxHashSet;

pub static IS_SCANNING: AtomicBool = AtomicBool::new(false);
// 0 = idle, 1 = waiting for process, 2 = hooked/active
pub static SCANNER_STATUS: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(0);
/// Poll interval (ms) for the helper process.  Tight during fissure reward
/// windows (150ms), relaxed otherwise (400ms) to reduce CPU/IO overhead.
pub static POLL_INTERVAL_MS: AtomicU32 = AtomicU32::new(150);

pub fn set_poll_interval(ms: u32) {
    let clamped = ms.clamp(50, 2000);
    POLL_INTERVAL_MS.store(clamped, Ordering::Relaxed);
    // Write to shared file so the already-running helper picks up the new
    // interval on its next cycle - no kill/restart needed, no buffer rediscovery.
    let poll_path = std::path::Path::new("/tmp/kronos/helper_poll_ms");
    let _ = std::fs::create_dir_all(poll_path.parent().unwrap());
    let _ = std::fs::write(poll_path, clamped.to_string());
}

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
    relic_picker_open: bool,
    void_tier: Option<String>,
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
            relic_picker_open: false,
            void_tier: None,
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
            self.void_tier = None;
            if self.relic_picker_open {
                self.relic_picker_open = false;
                app.emit("relic-picker-closed", ()).unwrap_or_default();
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            set_poll_interval(150);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 1: FISSURE START (LogTS: {}s)", ts));
            return;
        }

        // === 7. Mission Exit ===
        if s.contains("ExitState: Disconnected") || s.contains("Game [Info]: Set state to Disconnected") {
            self.is_fissure = false;
            self.in_mission = false;
            self.relic_picker_open = false;
            self.void_tier = None;
            self.squad_relics.clear();
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            set_poll_interval(150);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 7: MISSION EXIT (LogTS: {}s)", ts));
            let state = app.state::<crate::AppState>();
            if let Ok(mut cached) = state.active_relic_data.lock() {
                *cached = None;
            }
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
                    let is_first = self.squad_relics.is_empty();
                    self.squad_relics.push(relic);
                    self.is_fissure = true;
                    set_poll_interval(150);

                    // Detect void tier from the first relic
                    if is_first {
                        self.void_tier = Some(detect_void_tier(path));
                        if self.relic_picker_open {
                            app.emit("relic-picker-tier",
                                serde_json::json!({ "tier": self.void_tier })
                            ).unwrap_or_default();
                        }
                    }

                    let state = app.state::<crate::AppState>();
                    if let Ok(mut cached) = state.active_relic_data.lock() {
                        *cached = Some(serde_json::json!({
                            "squad_relics": self.squad_relics,
                            "squad_size": self.squad_size,
                            "void_tier": self.void_tier,
                        }));
                    };
                }
            }
            return;
        }

        // === 4. Reward Screen Trigger ===
        if s.contains("Relic rewards initialized") || s.contains("ProjectionRewardChoice.lua: Got rewards") {
            if !self.is_fissure {
                self.is_fissure = true;
                self.in_mission = true;
            }
            set_poll_interval(150);
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
            set_poll_interval(150);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 5: REWARD SCREEN CLOSE (LogTS: {}s)", ts));
            // Clear cached relic data so the next round starts fresh
            let state = app.state::<crate::AppState>();
            if let Ok(mut cached) = state.active_relic_data.lock() {
                *cached = None;
            }
            app.emit("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // === 6. Relic Picker / Endless Mission Handling ===
        if s.contains("Created /Lotus/Interface/ThemedProjectionManager.swf") {
            if !self.in_mission {
                self.relic_picker_open = true;
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER OPENED (pre-mission) (LogTS: {}s)", ts));
                app.emit("relic-picker-opened", serde_json::json!({ "void_tier": self.void_tier })).unwrap_or_default();
                return;
            }
            self.relic_picker_open = true;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER OPENED (endless) (LogTS: {}s)", ts));
            app.emit("relic-picker-opened", serde_json::json!({ "void_tier": self.void_tier })).unwrap_or_default();
            return;
        }

        // === Relic Picker Close (MapRedux re-subscription) ===
        if self.relic_picker_open && s.contains("Subscribing for /Lotus/Interface/MapRedux.swf") {
            self.relic_picker_open = false;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER CLOSED (MapRedux) (LogTS: {}s)", ts));
            app.emit("relic-picker-closed", ()).unwrap_or_default();
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
        // These triggers (CancelJobs, ClearAgents) fire for many unrelated game events,
        // so only act on them when the riven reroll screen is actually open.
        if self.riven_state != RivenState::Idle {
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

fn detect_void_tier(path: &str) -> String {
    if path.contains("T1") { "Lith".to_string() }
    else if path.contains("T2") { "Meso".to_string() }
    else if path.contains("T3") { "Neo".to_string() }
    else if path.contains("T4") { "Axi".to_string() }
    else { "Unknown".to_string() }
}

pub struct LogScannerHandle {
    pub running: Arc<AtomicBool>,
}

// ─── Lifecycle helpers - call from main.rs ─────────────────────────────────────

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
    crate::logger::log_to_disk(app, "[LOG SCANNER] stop_scanner called - stopping watcher thread");
    IS_SCANNING.store(false, Ordering::SeqCst);
    SCANNER_STATUS.store(0, Ordering::SeqCst);
    crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
    crate::overlay_utils::stop_focus_watcher();
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
    #[cfg(target_os = "linux")]
    {
        match get_warframe_pid() {
            Some(pid) if is_game_process(pid) => true,
            Some(_) => {
                // Cached PID is the launcher - clear and re-scan so we
                // discover the game if it started since the last check.
                clear_pid_cache();
                get_warframe_pid().map_or(false, is_game_process)
            }
            None => false,
        }
    }
    #[cfg(not(target_os = "linux"))]
    {
        get_warframe_pid().is_some()
    }
}

/// Cached PID of a previously-discovered Warframe process.
/// On subsequent calls we verify the cache via a cheap existence check
/// instead of re-scanning the entire process table.
/// When no Warframe is found, the "not found" result is also cached with
/// a TTL so the waiting loop doesn't hammer /proc every 2 seconds.
static CACHED_WARFRAME_PID: std::sync::OnceLock<Mutex<(Option<u32>, std::time::Instant)>> =
    std::sync::OnceLock::new();
/// Minimum time between full /proc scans when Warframe is not running.
const PID_CACHE_MISS_TTL: std::time::Duration = std::time::Duration::from_secs(5);
/// Sentinel Instant far enough in the past that the first access / post-clear
/// call always triggers a real scan instead of short-circuiting on the TTL.
fn stale_instant() -> std::time::Instant {
    std::time::Instant::now() - PID_CACHE_MISS_TTL - std::time::Duration::from_secs(1)
}

fn clear_pid_cache() {
    *CACHED_WARFRAME_PID
        .get_or_init(|| Mutex::new((None, stale_instant())))
        .lock()
        .unwrap() = (None, stale_instant());
}

fn with_cache(f: impl FnOnce() -> Option<u32>) -> Option<u32> {
    let lock = CACHED_WARFRAME_PID
        .get_or_init(|| Mutex::new((None, stale_instant())));
    let mut cache = lock.lock().unwrap();
    let (pid, checked_at) = &*cache;
    let age = checked_at.elapsed();

    // Fast path: cached PID still alive
    if let Some(pid) = pid {
        if pid_is_alive(*pid) {
            return Some(*pid);
        }
    } else if age < PID_CACHE_MISS_TTL {
        // "Not found" result is still fresh - skip the /proc scan
        return None;
    }

    // Slow path: full scan
    let found = f();
    *cache = (found, std::time::Instant::now());
    found
}

#[cfg(target_os = "linux")]
fn pid_is_alive(pid: u32) -> bool {
    std::path::Path::new("/proc").join(pid.to_string()).join("status").exists()
}

#[cfg(target_os = "windows")]
fn pid_is_alive(pid: u32) -> bool {
    use std::os::windows::process::CommandExt;
    // Quick check via tasklist filtering on one PID
    std::process::Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/NH", "/FO", "CSV"])
        .creation_flags(0x08000000)
        .output()
        .ok()
        .map(|o| {
            let stdout = String::from_utf8_lossy(&o.stdout);
            stdout.contains(&pid.to_string())
        })
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn pid_is_alive(pid: u32) -> bool {
    std::process::Command::new("kill")
        .args(["-0", &pid.to_string()])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// On Linux, checks whether the process at `pid` looks like the actual game
/// binary (Warframe.x64.exe) rather than the launcher.
#[cfg(target_os = "linux")]
fn is_game_process(pid: u32) -> bool {
    let comm_path = std::path::Path::new("/proc").join(pid.to_string()).join("comm");
    if let Ok(comm) = std::fs::read_to_string(&comm_path) {
        if comm.contains(".x64") || comm.contains("x64") {
            return true;
        }
    }
    let cmd_path = std::path::Path::new("/proc").join(pid.to_string()).join("cmdline");
    if let Ok(cmd) = std::fs::read_to_string(&cmd_path) {
        if cmd.contains(".x64") || cmd.contains("x64") {
            return true;
        }
    }
    false
}

/// Returns the PID of the first Warframe process found, if any.
/// Uses a cached PID to avoid scanning /proc on every call.
fn get_warframe_pid() -> Option<u32> {
    with_cache(|| {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            if let Ok(output) = std::process::Command::new("tasklist")
                .args(["/FI", "IMAGENAME eq Warframe.x64.exe", "/NH", "/FO", "CSV"])
                .creation_flags(0x08000000)
                .output()
            {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let line = line.trim();
                    if line.is_empty() { continue; }
                    let fields: Vec<&str> = line.split(',').collect();
                    if fields.len() >= 2 {
                        let pid_str = fields[1].trim_matches('"');
                        if let Ok(pid) = pid_str.parse::<u32>() {
                            return Some(pid);
                        }
                    }
                }
            }
            None
        }
        #[cfg(target_os = "linux")]
        {
            // Collect all matching PIDs, preferring the game binary over the
            // launcher (the launcher won't have the EE.log ring buffer, but
            // both contain "Warframe" in the name).  The game process
            // (Proton/Wine) typically shows "Warframe.x64.exe" in its comm or
            // cmdline, so we pick that one when it exists.
            let mut candidates: Vec<(u32, bool)> = Vec::new();
            if let Ok(pids) = std::fs::read_dir("/proc") {
                for entry in pids.flatten() {
                    let pid = entry.file_name();
                    let pid_str = pid.to_string_lossy();
                    if !pid_str.chars().all(|c| c.is_ascii_digit()) { continue; }
                    let pid_num = match pid_str.parse::<u32>() { Ok(n) => n, Err(_) => continue };
                    let comm_path = std::path::Path::new("/proc").join(&pid).join("comm");
                    if let Ok(comm) = std::fs::read_to_string(&comm_path) {
                        if comm.contains("Warframe") || comm.contains("warframe") {
                            candidates.push((pid_num, true));
                            continue;
                        }
                    }
                    let cmd_path = std::path::Path::new("/proc").join(&pid).join("cmdline");
                    if let Ok(cmd) = std::fs::read_to_string(&cmd_path) {
                        if cmd.contains("Warframe") || cmd.contains("warframe") {
                            candidates.push((pid_num, false));
                        }
                    }
                }
            }
            // Among candidates: prefer one with ".x64" in its name (the game),
            // then one with only comm matching (more likely the game), then
            // any other match.
            candidates.sort_by(|a, b| {
                let a_game = is_game_process(a.0);
                let b_game = is_game_process(b.0);
                b_game.cmp(&a_game).then(a.1.cmp(&b.1))
            });
            candidates.into_iter().next().map(|(pid, _)| pid)
        }
        #[cfg(target_os = "macos")]
        {
            if let Ok(output) = std::process::Command::new("pgrep")
                .arg("-f")
                .arg("Warframe")
                .output()
            {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Some(pid_str) = stdout.lines().next() {
                        if let Ok(pid) = pid_str.trim().parse::<u32>() {
                            return Some(pid);
                        }
                    }
                }
            }
            None
        }
    })
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
        let mut seen_set: FxHashSet<u64> = FxHashSet::with_capacity_and_hasher(4096, Default::default());
        let mut seen_count: usize = 0;
        const SEEN_RESET_THRESHOLD: usize = 16_384;
        let mut logged_waiting = false;
        let mut ever_hooked = false;

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
                std::thread::sleep(std::time::Duration::from_secs(2));
                continue;
            }

            let mut cmd = std::process::Command::new(&helper_path);
            cmd.arg("--read-log-buffer");
            // Pass the target PID so the helper skips its own name-based
            // discovery and goes straight to the right process.
            if let Some(pid) = get_warframe_pid() {
                cmd.arg(format!("--pid={pid}"));
            }
            let poll_ms = POLL_INTERVAL_MS.load(Ordering::Relaxed);
            cmd.arg(format!("--poll-ms={poll_ms}"));
            // Pass --profile in debug builds or when KRONOS_PROFILE_HELPER is set
            if cfg!(debug_assertions)
                || std::env::var("KRONOS_PROFILE_HELPER").is_ok()
            {
                cmd.arg("--profile");
            }
            cmd.stdout(std::process::Stdio::piped())
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
                    std::thread::sleep(std::time::Duration::from_secs(2));
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
            // On Windows, ReadProcessMemory can succeed on a terminated process
            // (pages linger until freed), so the helper never detects Warframe
            // closed.  We track the PID we hooked into and re-verify it
            // periodically - if the PID changed (launcher->game transition, or
            // process died) we force a restart so the helper re-discovers the
            // real buffer.
            let mut hooked_pid: Option<u32> = get_warframe_pid();

            // When Warframe starts *after* the app, the helper finds the process
            // but discovelogBuffer may return nothing (EE.log ring buffer isn't
            // populated yet).  The helper silently retries with a 5s sleep without
            // writing anything to stdout, so read_exact would block forever.
            // Use a timed byte-at-a-time read instead.
            fn timed_read(reader: &mut impl std::io::Read, buf: &mut [u8], timeout: std::time::Duration) -> std::io::Result<()> {
                let start = std::time::Instant::now();
                let mut offset = 0;
                while offset < buf.len() {
                    if start.elapsed() >= timeout {
                        return Err(std::io::Error::new(std::io::ErrorKind::TimedOut, "timeout"));
                    }
                    match reader.read(&mut buf[offset..]) {
                        Ok(0) => return Err(std::io::Error::new(std::io::ErrorKind::UnexpectedEof, "eof")),
                        Ok(n) => offset += n,
                        Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                        Err(e) => return Err(e),
                    }
                }
                Ok(())
            }

            loop {
                if !IS_SCANNING.load(Ordering::SeqCst) {
                    let _ = child.kill();
                    break;
                }

                // Verify the Warframe process is still alive and hasn't
                // changed PIDs (launcher->game transition).  Cheap: just a
                // /proc/<pid>/status stat call.
                if let Some(expected) = hooked_pid {
                    if let Some(current) = get_warframe_pid() {
                        if current != expected {
                            crate::logger::log_to_disk(&app_inner, &format!(
                                "[MEMORY WATCHER] Warframe PID changed ({} -> {}), restarting helper...",
                                expected, current
                            ));
                            clear_pid_cache();
                            let _ = child.kill();
                            break;
                        }
                    } else {
                        crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Warframe process gone, restarting helper...");
                        clear_pid_cache();
                        let _ = child.kill();
                        break;
                    }
                }

                let mut len_buf = [0u8; 4];
                const READ_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(15);
                if let Err(e) = timed_read(&mut reader, &mut len_buf, READ_TIMEOUT) {
                    crate::logger::log_to_disk(&app_inner, &format!("[MEMORY WATCHER] Helper read error ({}), restarting...", e));
                    clear_pid_cache();
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
                    clear_pid_cache();
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
                    clear_pid_cache();
                    let _ = child.kill();
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    break;
                }

                buf.resize(data_len, 0);
                // Data payload should arrive immediately after the length prefix,
                // but use a short timeout for robustness.
                const PAYLOAD_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(2);
                if let Err(e) = timed_read(&mut reader, &mut buf, PAYLOAD_TIMEOUT) {
                    crate::logger::log_to_disk(&app_inner, &format!("[MEMORY WATCHER] Payload read error ({}), restarting...", e));
                    clear_pid_cache();
                    let _ = child.kill();
                    break;
                }

                if first_data {
                    crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Hooked into Warframe RAM! Backfill - dedup seeding, firing immediate-state events.");
                    SCANNER_STATUS.store(2, Ordering::SeqCst);
                    logged_waiting = false;
                    first_data = false;
                    hooked_pid = get_warframe_pid();
                    let text = String::from_utf8_lossy(&buf);
                    for line in text.split('\n') {
                        let line = line.trim_matches(|c: char| c.is_whitespace() || c == '\0');
                        if line.is_empty() { continue; }
                        if !line.starts_with(|c: char| c.is_ascii_digit()) { continue; }
                        let hash = line_hash(line);
                        seen_set.insert(hash);
                        // Fire state-tracking events so mid-mission restarts catch up,
                        // but skip overlay-triggering events (riven screen, UI dialogs)
                        // that would open stale windows.
                        let trimmed = line.trim();
                        if trimmed.contains("OmegaRerollSelection.lua: Diorama setup")
                            || trimmed.contains("ThemedDetailedPurchaseDialog.lua: PopulateInfo->")
                            || trimmed.contains("ThemedDetailedPurchaseDialog.lua: DBG: HudVis")
                            || trimmed.contains("Dialog.lua:")
                            || trimmed.contains("CancelJobs batchcount 0")
                            || trimmed.contains("NpcManager::ClearAgents()")
                            || trimmed.contains("ChatRedux.lua: Chat: Filters for")
                            || trimmed.contains("ProjectionRewardChoice.lua: Relic reward screen shut down")
                            || trimmed.contains("Created /Lotus/Interface/ThemedProjectionManager.swf")
                            || trimmed.contains("Subscribing for /Lotus/Interface/MapRedux.swf")
                        {
                            continue;
                        }
                        scanner.on_line(&app_inner, line);
                    }
                    // Emit scanner-hooked once per scanner session (user toggle
                    // off/on resets it).  Still filtered by first_data so a
                    // transient helper crash mid-session doesn't re-trigger it.
                    if !ever_hooked {
                        ever_hooked = true;
                        app_inner.emit("scanner-hooked", ()).unwrap_or_default();
                        // Start the Warframe focus watcher so overlays track
                        // the game window and hide on alt+tab.
                        crate::overlay_utils::spawn_focus_watcher(&app_inner);
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
                    seen_count += 1;
                    if seen_count >= SEEN_RESET_THRESHOLD {
                        seen_set.clear();
                        seen_count = 0;
                    }
                    scanner.on_line(&app_inner, line);
                }
            }
            
            // Only sleep before restarting if Warframe isn't running - prevents CPU spinning
            // when the helper crashes on a cold start. If the game is already up, retry
            // immediately so we hook in as fast as possible.
            if IS_SCANNING.load(Ordering::SeqCst) && !is_warframe_running() {
                std::thread::sleep(std::time::Duration::from_secs(2));
            }
        }

        IS_SCANNING.store(false, Ordering::SeqCst);
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}