use std::collections::{HashSet, VecDeque};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

pub static IS_SCANNING: AtomicBool = AtomicBool::new(false);
/// True while the Riven reroll screen is open. Global Riven grading hotkeys
/// must be ignored outside this screen so they cannot trigger an OCR capture
/// over an unrelated game view.
pub static RIVEN_SCREEN_ACTIVE: AtomicBool = AtomicBool::new(false);
// 0 = idle, 1 = waiting for process, 2 = hooked/active
pub static SCANNER_STATUS: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(0);
/// Incremented on each stop_scanner call so stale watcher threads can detect
/// they were orphaned by a restart and exit instead of continuing to run.
static SCANNER_GENERATION: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
/// Poll interval (ms) for the helper process.  Tight during fissure reward
/// windows (150ms), relaxed otherwise (400ms) to reduce CPU/IO overhead.
/// 50 ms default: the old 150 ms figure was calibrated for the C++ helper's
/// 4 MB external-read + memcpy cycle.  With direct pread on a 128 KB buffer
/// the read+diff cost is single-digit microseconds - we can poll tighter
/// with negligible CPU overhead and cut worst-case trigger latency by 3×.
pub static POLL_INTERVAL_MS: AtomicU32 = AtomicU32::new(50);

pub fn set_poll_interval(ms: u32) {
    let clamped = ms.clamp(50, 2000);
    POLL_INTERVAL_MS.store(clamped, Ordering::Relaxed);
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
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum RivenEventKind {
    ScreenOpen,
    LinkedOpen,
    LinkedClose,
    DialogCreate,
    DialogCancel,
    DialogSelect,
    ScreenClose,
}

#[derive(Default)]
struct RivenTimestampGuard {
    newest_ts: Option<f64>,
    newest_kind: Option<RivenEventKind>,
}

fn should_accept_riven_event(
    newest_ts: Option<f64>,
    newest_kind: Option<RivenEventKind>,
    event_ts: Option<f64>,
    event_kind: RivenEventKind,
) -> bool {
    let Some(ts) = event_ts else {
        return true;
    };
    match newest_ts {
        Some(newest) if ts < newest => false,
        Some(newest) if ts == newest && newest_kind == Some(event_kind) => false,
        _ => true,
    }
}

impl RivenTimestampGuard {
    fn accept(&mut self, event_ts: Option<f64>, kind: RivenEventKind) -> bool {
        if !should_accept_riven_event(self.newest_ts, self.newest_kind, event_ts, kind) { return false; }
        let Some(ts) = event_ts else { return true; };
        if self.newest_ts.map_or(true, |newest| ts >= newest) {
            self.newest_ts = Some(ts);
            self.newest_kind = Some(kind);
        }
        true
    }
}

pub struct LogScanner {
    squad_relics: Vec<RelicInfo>,
    squad_size: usize,
    is_fissure: bool,
    in_mission: bool,
    /// True from the game's end-of-match marker until the next mission starts
    /// (or its reward screen opens). Used only by the relic picker, to ignore a
    /// stale `in_mission` flag. It does not depend on which hub the player is in.
    mission_ended: bool,
    relic_picker_open: bool,
    relic_picker_opened_at: f64,
    void_tier: Option<String>,
    riven_state: RivenState,
    last_riven_open_ts: Option<f64>,
    riven_timestamp_guard: RivenTimestampGuard,
    /// True between a confirmed cycle (a new roll now shown beside the
    /// current selection) and the follow-up "keep the new roll" confirm.
    riven_roll_pending: bool,
    /// What the most recent yes/no prompt asked, when its text is one of the
    /// known English strings ("...into current selection?" = accept the
    /// pending roll, "...want to cycle..." = start a cycle). None for other
    /// languages, where the pending-roll alternation is used instead.
    riven_prompt_is_accept: Option<bool>,
    squad_channels: HashSet<String>,
    expecting_elite_alert_boosts: bool,
    is_archon_elite_alert: bool,
    min_ts: f64,
    // Netracell missions declare `mission type=MT_VAULTS` at start (confirmed
    // against a real EE.log excerpt, 2026-09-03). Unlike Deep Archimedea
    // (detected via the distinct "LabConquest.lua ... Last mission on the
    // chain" line), a Netracell's own EndOfMatch sequence is completely
    // generic ("Mission Succeeded" fires identically for any mission type),
    // so completion must be inferred by remembering this flag from mission
    // start through to that generic success line.
    is_netracell: bool,
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

/// The memory watcher only hashes lines with the normal EE.log timestamp
/// shape. This keeps binary data from the oversized read window out of the
/// dedupe set and out of the scanner's state machine.
fn looks_like_log_line(line: &str) -> bool {
    let Some(space_idx) = line.find(' ') else { return false };
    let timestamp = &line[..space_idx];
    let Some(dot_idx) = timestamp.find('.') else { return false };
    let (seconds, fraction_with_dot) = timestamp.split_at(dot_idx);
    let fraction = &fraction_with_dot[1..];
    if seconds.is_empty()
        || fraction.is_empty()
        || !seconds.bytes().all(|byte| byte.is_ascii_digit())
        || !fraction.bytes().all(|byte| byte.is_ascii_digit())
        || parse_timestamp(line).is_none()
    {
        return false;
    }
    let message = &line[space_idx + 1..];
    !message.is_empty()
        && message.chars().all(|character| character == '\t' || !character.is_control())
}

const SEEN_LINES_CAPACITY: usize = 65_536;

/// Bounded recency dedupe for the circular log buffer. The capacity is far
/// larger than the roughly thousand lines held by the ring buffer, so a hash
/// is not forgotten while its source line can still be present in the buffer.
struct SeenLines {
    hashes: HashSet<u64>,
    insertion_order: VecDeque<u64>,
    capacity: usize,
    evictions: u64,
}

impl SeenLines {
    fn new() -> Self {
        Self::with_capacity(SEEN_LINES_CAPACITY)
    }

    fn with_capacity(capacity: usize) -> Self {
        Self {
            hashes: HashSet::with_capacity(capacity),
            insertion_order: VecDeque::with_capacity(capacity),
            capacity,
            evictions: 0,
        }
    }

    fn insert(&mut self, hash: u64) -> bool {
        if !self.hashes.insert(hash) {
            return false;
        }
        self.insertion_order.push_back(hash);
        if self.hashes.len() > self.capacity {
            if let Some(oldest) = self.insertion_order.pop_front() {
                self.hashes.remove(&oldest);
                self.evictions += 1;
            }
        }
        true
    }

    fn clear(&mut self) {
        self.hashes.clear();
        self.insertion_order.clear();
    }

    fn len(&self) -> usize {
        self.hashes.len()
    }

    fn evictions(&self) -> u64 {
        self.evictions
    }
}

fn is_stale_riven_close(open_ts: Option<f64>, close_ts: Option<f64>) -> bool {
    matches!((open_ts, close_ts), (Some(open), Some(close)) if close < open)
}

#[cfg(test)]
mod tests {
    use super::{
        is_end_of_match_line, is_stale_riven_close, looks_like_log_line, picker_opened_in_mission,
        should_accept_riven_event, RivenEventKind, RivenTimestampGuard, SeenLines,
        SEEN_LINES_CAPACITY,
    };

    #[test]
    fn end_of_match_is_recognised_from_real_log_lines() {
        // Verbatim from the EE.log of 2026-10-23 (the end of the Neo mission).
        assert!(is_end_of_match_line("888.301 Script [Info]: EndOfMatch.lua: Initialize"));
        assert!(!is_end_of_match_line("888.302 Script [Info]: EndOfMatch.lua: Mission Succeeded"));
        assert!(!is_end_of_match_line(
            "888.287 Script [Info]: ProjectionRewardChoice.lua: Relic reward screen shut down"
        ));
        assert!(!is_end_of_match_line("905.895 Sys [Info]: ExitState: Connected"));
        assert!(!is_end_of_match_line(""));
    }

    #[test]
    fn stale_in_mission_flag_after_the_match_ended_is_ignored() {
        // in_mission is still true (no Disconnected was written) but the
        // end-of-match marker was seen: the picker is not in a mission.
        assert!(!picker_opened_in_mission(true, true));
    }

    #[test]
    fn picker_inside_a_mission_keeps_the_era() {
        assert!(picker_opened_in_mission(true, false));
    }

    #[test]
    fn picker_is_pre_mission_whenever_no_mission_is_active() {
        assert!(!picker_opened_in_mission(false, false));
        assert!(!picker_opened_in_mission(false, true));
    }

    #[test]
    fn stale_riven_close_requires_two_parseable_timestamps() {
        assert!(is_stale_riven_close(Some(286.169), Some(268.314)));
        assert!(!is_stale_riven_close(Some(268.314), Some(286.169)));
        assert!(!is_stale_riven_close(Some(268.314), Some(268.314)));
        assert!(!is_stale_riven_close(Some(268.314), None));
        assert!(!is_stale_riven_close(None, Some(268.314)));
    }

    #[test]
    fn monotonic_guard_ignores_replayed_open_after_newer_close() {
        let mut guard = RivenTimestampGuard::default();
        assert!(guard.accept(Some(12765.373), RivenEventKind::ScreenOpen));
        assert!(guard.accept(Some(12769.161), RivenEventKind::ScreenClose));
        assert!(!guard.accept(Some(12765.373), RivenEventKind::ScreenOpen));
    }

    #[test]
    fn monotonic_guard_resets_for_a_new_process_session() {
        let mut guard = RivenTimestampGuard::default();
        assert!(guard.accept(Some(12769.161), RivenEventKind::ScreenClose));
        assert!(!guard.accept(Some(12765.373), RivenEventKind::ScreenOpen));
        guard = RivenTimestampGuard::default();
        assert!(guard.accept(Some(1.25), RivenEventKind::ScreenOpen));
    }

    #[test]
    fn equal_timestamp_replays_of_the_same_event_are_ignored() {
        let mut guard = RivenTimestampGuard::default();
        assert!(guard.accept(Some(4.0), RivenEventKind::ScreenOpen));
        assert!(!guard.accept(Some(4.0), RivenEventKind::ScreenOpen));
        assert!(guard.accept(Some(4.0), RivenEventKind::ScreenClose));
        assert!(guard.accept(None, RivenEventKind::ScreenOpen));
    }

    #[test]
    fn pure_guard_decision_preserves_missing_timestamp_behavior() {
        assert!(!should_accept_riven_event(
            Some(9.0), Some(RivenEventKind::ScreenOpen), Some(8.0), RivenEventKind::ScreenClose
        ));
        assert!(should_accept_riven_event(
            Some(9.0), Some(RivenEventKind::ScreenOpen), None, RivenEventKind::ScreenClose
        ));
    }

    #[test]
    fn seen_lines_rejects_known_hashes() {
        let mut seen = SeenLines::with_capacity(2);
        assert!(seen.insert(10));
        assert!(!seen.insert(10));
        assert_eq!(seen.len(), 1);
    }

    #[test]
    fn seen_lines_evicts_only_the_oldest_hash() {
        let mut seen = SeenLines::with_capacity(2);
        assert!(seen.insert(10));
        assert!(seen.insert(20));
        assert!(seen.insert(30));
        assert_eq!(seen.len(), 2);
        assert_eq!(seen.evictions(), 1);
        assert!(seen.insert(10));
        assert!(!seen.insert(30));
    }

    #[test]
    fn seen_lines_respects_the_production_capacity() {
        let mut seen = SeenLines::new();
        for hash in 0..=(SEEN_LINES_CAPACITY as u64) {
            assert!(seen.insert(hash));
        }
        assert_eq!(seen.len(), SEEN_LINES_CAPACITY);
        assert_eq!(seen.evictions(), 1);
    }

    #[test]
    fn seen_lines_accepts_a_hash_again_after_eviction() {
        let mut seen = SeenLines::with_capacity(1);
        assert!(seen.insert(10));
        assert!(seen.insert(20));
        assert!(seen.insert(10));
    }

    #[test]
    fn looks_like_log_line_requires_a_timestamp_and_text() {
        assert!(looks_like_log_line(
            "12765.373 Script [Info]: OmegaRerollSelection.lua: Diorama setup"
        ));
        assert!(looks_like_log_line("12765.373 Script [Info]: Foo\tbar baz"));
        assert!(!looks_like_log_line("12765.373 Script [Info]: Foo\u{1}bar"));
        assert!(!looks_like_log_line("12765.373 \u{0}\u{0}"));
        assert!(!looks_like_log_line("12abc"));
        assert!(!looks_like_log_line("9"));
    }
}

/// Check if a line matches one of the riven menu close patterns (numeric values ignored).
impl LogScanner {
    pub fn new() -> Self {
        Self {
            squad_relics: Vec::new(),
            squad_size: 1,
            is_fissure: false,
            in_mission: false,
            mission_ended: false,
            relic_picker_open: false,
            relic_picker_opened_at: 0.0,
            void_tier: None,
            riven_state: RivenState::Idle,
            last_riven_open_ts: None,
            riven_timestamp_guard: RivenTimestampGuard::default(),
            riven_roll_pending: false,
            riven_prompt_is_accept: None,
squad_channels: HashSet::new(),
            expecting_elite_alert_boosts: false,
            is_archon_elite_alert: false,
            min_ts: f64::MAX,
            is_netracell: false,
        }
    }

    pub fn on_line(&mut self, app: &AppHandle, line: &str) {
        let ts = parse_timestamp(line).unwrap_or(0.0);
        if ts < self.min_ts {
            self.min_ts = ts;
        }
        let s = line.trim();
        if s.is_empty() {
            return;
        }

        // The game writes this once, when the end-of-match screen appears
        // (checked 2026-10-23: once per mission, and not between the rounds
        // of a survival run). Only the relic picker reads it.
        if is_end_of_match_line(s) {
            self.mission_ended = true;
        }

        // === 1. Mission Start ===
        if s.contains("_ActiveMission\"} with MissionInfo") {
            self.is_fissure = true;
            self.in_mission = true;
            self.mission_ended = false;
            self.squad_size = 1;
            self.squad_relics.clear();
            self.void_tier = parse_mission_void_tier(s);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 1: FISSURE START void_tier={:?} (LogTS: {}s)", self.void_tier, ts));
            if self.relic_picker_open {
                self.relic_picker_open = false;
                app.emit("relic-picker-closed", ()).unwrap_or_default();
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            set_poll_interval(150);
            return;
        }

        // === 7. Mission Exit ===
        if s.contains("ExitState: Disconnected") || s.contains("Game [Info]: Set state to Disconnected") {
            self.is_fissure = false;
            self.in_mission = false;
            self.relic_picker_open = false;
            self.void_tier = None;
            self.squad_relics.clear();
            self.is_netracell = false;
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

        // === Netracell start/completion ===
        // MT_VAULTS confirmed against a real EE.log excerpt, 2026-09-03: a
        // Netracell declares `mission type=MT_VAULTS` at start; unlike a
        // fissure it does not go through the "_ActiveMission"-with-
        // MissionInfo line above, so this is tracked independently of
        // is_fissure/in_mission. CaviaVaults is an operator-reported
        // alternate mission-type string for the same activity (not
        // independently confirmed against a captured log sample) - included
        // as an additional match, not a replacement, so a wrong guess here
        // only risks a missed detection, never a false positive against
        // MT_VAULTS's verified case.
        if s.contains("mission type=MT_VAULTS") || s.contains("mission type=CaviaVaults") {
            self.is_netracell = true;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Netracell mission started (LogTS: {}s)", ts));
        }
        if self.is_netracell && s.contains("EndOfMatch.lua: Mission Succeeded") {
            self.is_netracell = false;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Netracell/Deep Archimedea run completed (Netracell success) (LogTS: {}s)", ts));
            app.emit("conquest-completed", ts).unwrap_or_default();
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

                    // Detect void tier from the first relic (only if not already set from mission JSON,
                    // and only once the mission is actually running - pre-mission pool loads (e.g. the
                    // orbiter relic picker) have no fissure era to infer, and reading one from there
                    // leaks the previous run's era into the reward picker overlay).
                    if is_first && self.void_tier.is_none() && self.in_mission {
                        self.void_tier = Some(detect_void_tier(path));
                    }
                    if is_first && self.relic_picker_open && self.in_mission {
                        app.emit("relic-picker-tier",
                            serde_json::json!({ "tier": self.void_tier })
                        ).unwrap_or_default();
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
            self.mission_ended = false;
            // The next-round relic picker is always followed by the reward
            // screen (every picker opening on 2026-10-23 was). If the earlier
            // reward screen's close line was missed (18:09 that day), nothing
            // else hides the picker during the mission, so close it here.
            if self.relic_picker_open {
                self.relic_picker_open = false;
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER CLOSED (reward screen opened) (LogTS: {}s)", ts));
                app.emit("relic-picker-closed", ()).unwrap_or_default();
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
            // Omnia fallback: if squad relics span multiple tiers, it's Omnia
            if self.void_tier.as_deref() != Some("Omnia") {
                if let Some(omnia) = detect_omnia_from_squad(&self.squad_relics) {
                    crate::logger::log_to_disk(app, "[LOG SCANNER] Omnia detected from multi-tier squad relics");
                    self.void_tier = Some(omnia);
                }
            }
            if !picker_opened_in_mission(self.in_mission, self.mission_ended) {
                self.relic_picker_open = true;
                self.relic_picker_opened_at = ts;
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER OPENED (pre-mission) void_tier={:?} in_mission={} mission_ended={} (LogTS: {}s)", self.void_tier, self.in_mission, self.mission_ended, ts));
                app.emit("relic-picker-opened", serde_json::json!({ "void_tier": None::<String>, "in_mission": false })).unwrap_or_default();
                return;
            }
            self.relic_picker_open = true;
            self.relic_picker_opened_at = ts;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER OPENED (endless) void_tier={:?} in_mission={} mission_ended={} (LogTS: {}s)", self.void_tier, self.in_mission, self.mission_ended, ts));
            app.emit("relic-picker-opened", serde_json::json!({ "void_tier": self.void_tier, "in_mission": true })).unwrap_or_default();
            return;
        }

        // === Relic Picker Close (MapRedux re-subscription — in-mission) ===
        if self.relic_picker_open && s.contains("Subscribing for /Lotus/Interface/MapRedux.swf") {
            self.relic_picker_open = false;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER CLOSED (MapRedux) (LogTS: {}s)", ts));
            app.emit("relic-picker-closed", ()).unwrap_or_default();
            return;
        }

        // === Relic Picker Close (TennoShipInputFilter — orbiter relic menu) ===
        // TennoShipInputFilter fires both when the picker opens (during init)
        // and when it closes, so debounce against the open timestamp.
        const RELIC_PICKER_DEBOUNCE_S: f64 = 0.5;
        if self.relic_picker_open
            && s.contains("TennoShipInputFilter")
            && ts - self.relic_picker_opened_at > RELIC_PICKER_DEBOUNCE_S
        {
            self.relic_picker_open = false;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER CLOSED (TennoShipInputFilter) (LogTS: {}s)", ts));
            app.emit("relic-picker-closed", ()).unwrap_or_default();
            return;
        }

        // ─── Riven linked in chat ───────────────────────────────────────────
        if s.contains("ThemedDetailedPurchaseDialog.lua: PopulateInfo->")
            && s.contains("/Lotus/StoreItems/Upgrades/Mods/Randomized")
        {
            if !self.riven_timestamp_guard.accept(parse_timestamp(line), RivenEventKind::LinkedOpen) { return; }
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven linked in chat opened (LogTS: {}s)", ts));
            app.emit("riven-linked-open", ()).unwrap_or_default();
            return;
        }
        if s.contains("ThemedDetailedPurchaseDialog.lua: DBG: HudVis") {
            if !self.riven_timestamp_guard.accept(parse_timestamp(line), RivenEventKind::LinkedClose) { return; }
            app.emit("riven-linked-closed", ()).unwrap_or_default();
            return;
        }

        // ─── Riven reroll menu state machine ───────────────────────────────
        if s.contains("OmegaRerollSelection.lua: Diorama setup") {
            if !self.riven_timestamp_guard.accept(parse_timestamp(line), RivenEventKind::ScreenOpen) { return; }
            self.riven_state = RivenState::ScreenOpen;
            self.last_riven_open_ts = parse_timestamp(line);
            self.riven_roll_pending = false;
            RIVEN_SCREEN_ACTIVE.store(true, Ordering::SeqCst);
            if crate::build_profile::IS_PREVIEW {
                let _ = crate::overlay_utils::show_window_internal(app, "overlay-riven-prompt");
            }
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll screen opened (LogTS: {}s)", ts));
            app.emit("riven-screen-open", ()).unwrap_or_default();
            return;
        }

        // Track dialog lifecycle. Only real yes/no prompts count: the game
        // also opens an OkCancel "please wait" dialog (leftItem=nil) right
        // after every confirm, which must not advance the state machine.
        if s.contains("Dialog.lua: Dialog::CreateOkCancel(description=") {
            if !self.riven_timestamp_guard.accept(parse_timestamp(line), RivenEventKind::DialogCreate) { return; }
            if self.riven_state != RivenState::Idle && s.contains("leftItem=/Menu/Confirm_Item_Yes") {
                self.riven_state = RivenState::AwaitingConfirm1;
                self.riven_prompt_is_accept = if s.contains("into current selection") {
                    Some(true)
                } else if s.contains("want to cycle") {
                    Some(false)
                } else {
                    None
                };
            }
            return;
        }

        if s.contains("Dialog.lua: SendResult_MENU_CANCEL()") || s.contains("Dialog.lua: Dialog::SendResult(5)") {
            if !self.riven_timestamp_guard.accept(parse_timestamp(line), RivenEventKind::DialogCancel) { return; }
            if self.riven_state == RivenState::AwaitingConfirm1 {
                self.riven_state = RivenState::ScreenOpen;
            }
            return;
        }

        // The game writes BOTH "SendResult_MENU_SELECT()" and
        // "Dialog::SendResult(4)" for a single confirm. Only the first one
        // arrives while AwaitingConfirm1; it moves the state on, so the
        // duplicate line is ignored (previously each confirm emitted twice).
        if s.contains("Dialog.lua: SendResult_MENU_SELECT()") || s.contains("Dialog.lua: Dialog::SendResult(4)") {
            if !self.riven_timestamp_guard.accept(parse_timestamp(line), RivenEventKind::DialogSelect) { return; }
            if self.riven_state == RivenState::AwaitingConfirm1 {
                self.riven_state = RivenState::ScreenOpen;
                // Trust the prompt text when it is recognized (self-corrects
                // if a cancel/close ever left riven_roll_pending stale);
                // otherwise fall back to cycle/accept alternation.
                let is_accept = self.riven_prompt_is_accept.take().unwrap_or(self.riven_roll_pending);
                if !is_accept {
                    // First confirm: cycle -> a new roll is generated.
                    self.riven_roll_pending = true;
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll confirmed (LogTS: {}s)", ts));
                    app.emit("riven-reroll", ()).unwrap_or_default();
                } else {
                    // Second confirm: "Cycle Riven into current selection?"
                    // -> the pending roll becomes the current selection.
                    self.riven_roll_pending = false;
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven new selection confirmed (LogTS: {}s)", ts));
                    app.emit("riven-reroll-confirmed", ()).unwrap_or_default();
                }
            }
            return;
        }

        // ─── Riven close detection ────────────────────────────────────────
        // These triggers (CancelJobs, ClearAgents) fire for many unrelated game events,
        // so only act on them when the riven reroll screen is actually open.
        if self.riven_state != RivenState::Idle {
            if s.contains("CancelJobs batchcount 0")
                && self.riven_timestamp_guard.accept(parse_timestamp(line), RivenEventKind::ScreenClose)
                && !is_stale_riven_close(self.last_riven_open_ts, parse_timestamp(line))
            {
                self.riven_state = RivenState::Idle;
                self.riven_roll_pending = false;
                RIVEN_SCREEN_ACTIVE.store(false, Ordering::SeqCst);
                crate::ocr::RIVEN_CAPTURE_GEN.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll menu closed (CancelJobs) (LogTS: {}s)", ts));
                app.emit("riven-screen-closed", ()).unwrap_or_default();
                return;
            }
            if s.contains("NpcManager::ClearAgents() ReadyToCreateAgents = false")
                && self.riven_timestamp_guard.accept(parse_timestamp(line), RivenEventKind::ScreenClose)
                && !is_stale_riven_close(self.last_riven_open_ts, parse_timestamp(line))
            {
                self.riven_state = RivenState::Idle;
                self.riven_roll_pending = false;
                RIVEN_SCREEN_ACTIVE.store(false, Ordering::SeqCst);
                crate::ocr::RIVEN_CAPTURE_GEN.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven overlays closed (ClearAgents) (LogTS: {}s)", ts));
                app.emit("riven-screen-closed", ()).unwrap_or_default();
                app.emit("riven-linked-closed", ()).unwrap_or_default();
                return;
            }
        }

        // -- Deep Archimedea / Temporal Archimedea completion --
        // DE names each Archimedea variant's mission-chain script after its
        // reward deck: Deep Archimedea (Cavia/Albrecht's Labs) uses
        // "LabConquest.lua" (mapping to MissionDecks/EntratiLabConquestRewards),
        // confirmed against a real EE.log excerpt from an operator's live run,
        // 2026-09-03. Temporal Archimedea (The Hex/1999 Hollvania) uses
        // "HexConquest.lua" (MissionDecks/HexConquestRewards) by the same
        // naming convention - independently corroborated by
        // "EchoesHexConquestBonusTokensGiven" appearing in a real EE.log
        // sample from this operator's own game. Matching "Conquest.lua"
        // generally (rather than hardcoding both exact names) also covers
        // any future Archimedea-style chain DE adds using the same
        // convention. This line fires on completing the final mission of the
        // chain. No PeriodicMissionCompletions tag or ChallengeProgress entry
        // exists for any of this anywhere in inventory data (checked
        // exhaustively), so this is the only available completion signal for
        // the multi-mission chains; a standalone Netracell is handled
        // separately below via its MT_VAULTS mission-type instead, since it
        // never goes through a Conquest.lua script at all.
        if s.contains("Conquest.lua") && s.contains("Last mission on the chain") {
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Archimedea run completed (Conquest last mission) (LogTS: {}s)", ts));
            app.emit("conquest-completed", ts).unwrap_or_default();
        }

        // -- Elite Alert modifiers: first = Archon Hunt, subsequent = Arbitration --
        if self.expecting_elite_alert_boosts && (s.contains("suitType=") || s.contains("wepTypes=")) {
            self.expecting_elite_alert_boosts = false;
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
            let event_name = if self.is_archon_elite_alert { "archon-hunt-modifiers" } else { "arbitration-modifiers" };
            app.emit(event_name, serde_json::json!({
                "suitType": suit_type,
                "wepTypes": wep_types,
            })).unwrap_or_default();
            return;
        }

        if s.contains("Background.lua: EliteAlert: generated boosts for") {
            let is_archon = ts - self.min_ts < 180.0;

            if is_archon {
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Archon Hunt elite alert modifiers detected (LogTS: {}s)", ts));
            } else {
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Arbitration elite alert modifiers detected (LogTS: {}s)", ts));
            }

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
                let event_name = if is_archon { "archon-hunt-modifiers" } else { "arbitration-modifiers" };
                app.emit(event_name, serde_json::json!({
                    "suitType": suit_type,
                    "wepTypes": wep_types,
                })).unwrap_or_default();
            } else {
                self.expecting_elite_alert_boosts = true;
                self.is_archon_elite_alert = is_archon;
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
    else if path.contains("T5") { "Requiem".to_string() }
    else { "Unknown".to_string() }
}

/// True for the line the game writes once when the end-of-match screen
/// appears. Unlike `ExitState: Disconnected`, it was written after every
/// mission in the 2026-10-23 logs, including the Neo mission that left the
/// scanner believing a mission was still running.
fn is_end_of_match_line(line: &str) -> bool {
    line.contains("EndOfMatch.lua: Initialize")
}

/// The relic picker carries an era only when it opens inside a mission. A
/// stale `in_mission` flag must not do that once the match has ended.
fn picker_opened_in_mission(in_mission: bool, mission_ended: bool) -> bool {
    in_mission && !mission_ended
}

/// Parse `voidTier` from the Host loading JSON on the mission start line.
fn parse_mission_void_tier(line: &str) -> Option<String> {
    let start = line.find("Host loading ")?;
    let after = &line[start + "Host loading ".len()..];
    let json_end = after.find(" with MissionInfo")?;
    let json_str = &after[..json_end];
    let v: serde_json::Value = serde_json::from_str(json_str).ok()?;
    let vt = v.get("voidTier")?.as_str()?;
    match vt {
        "VoidT1" => Some("Lith".to_string()),
        "VoidT2" => Some("Meso".to_string()),
        "VoidT3" => Some("Neo".to_string()),
        "VoidT4" => Some("Axi".to_string()),
        "VoidT5" => Some("Requiem".to_string()),
        "VoidT6" => Some("Omnia".to_string()),
        _ => None,
    }
}

/// If squad relics span multiple tiers, it's likely an Omnia fissure.
fn detect_omnia_from_squad(squad_relics: &[RelicInfo]) -> Option<String> {
    if squad_relics.len() < 2 {
        return None;
    }
    let first_tier = &squad_relics[0].tier;
    if squad_relics.iter().any(|r| &r.tier != first_tier) {
        Some("Omnia".to_string())
    } else {
        None
    }
}

pub struct LogScannerHandle {
    pub running: Arc<AtomicBool>,
}

// ─── Lifecycle helpers - call from main.rs ─────────────────────────────────────

pub fn log_app_start(app: &AppHandle) {
    crate::logger::log_to_disk(app, "");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
    crate::logger::log_to_disk(app, "[KIEDA'S ORBITER] Application started");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
}

pub fn log_app_stop(app: &AppHandle) {
    crate::logger::log_to_disk(app, "[KIEDA'S ORBITER] Application shutting down");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
    crate::logger::log_to_disk(app, "");
}

// ──────────────────────────────────────────────────────────────────────────────

fn clear_pid_cache() {
    if let Some(cache) = CACHED_WARFRAME_PID.get() {
        if let Ok(mut c) = cache.lock() {
            *c = None;
        }
    }
}

pub fn stop_scanner(app: &AppHandle) {
    crate::logger::log_to_disk(app, "[LOG SCANNER] stop_scanner called - stopping watcher thread");
    SCANNER_GENERATION.fetch_add(1, Ordering::SeqCst);
    IS_SCANNING.store(false, Ordering::SeqCst);
    SCANNER_STATUS.store(0, Ordering::SeqCst);
    crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
    crate::overlay_utils::stop_focus_watcher();
    clear_pid_cache();
}

pub fn is_scanning() -> bool {
    IS_SCANNING.load(Ordering::SeqCst)
}

#[tauri::command]
pub fn get_scanner_status() -> String {
    match SCANNER_STATUS.load(Ordering::SeqCst) {
        1 => "waiting".to_string(),
        2 => "active".to_string(),
        3 => "stale_offset".to_string(),
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

/// Cached PID of a previously-discovered Warframe process.
/// On subsequent calls we verify the cache via a cheap existence check
/// instead of re-scanning the entire process table.  When no PID is
/// cached (or the cached PID is dead), we always do a full scan —
/// `/proc` readdir + comm/cmdline reads is microseconds of work and
/// happens at most every 2 s (the wait-loop sleep), so there is no
/// meaningful CPU cost to skip the cache on a cache-miss.
static CACHED_WARFRAME_PID: std::sync::OnceLock<Mutex<Option<u32>>> =
    std::sync::OnceLock::new();

fn with_cache(f: impl FnOnce() -> Option<u32>) -> Option<u32> {
    let lock = CACHED_WARFRAME_PID
        .get_or_init(|| Mutex::new(None));
    let mut cache = lock.lock().unwrap();

    // Fast path: cached PID still alive (avoids full /proc scan on every
    // 50 ms poll tick while hooked).
    if let Some(pid) = *cache {
        if pid_is_alive(pid) {
            return Some(pid);
        }
    }

    // Slow path: full scan
    let found = f();
    *cache = found;
    found
}

/// Linux: also re-checks the process name so a cached PID that was reused by
/// an unrelated process (or was never the game) is dropped and rediscovered.
#[cfg(target_os = "linux")]
fn pid_is_alive(pid: u32) -> bool {
    warframe_process_name(pid).is_some()
}

#[cfg(target_os = "windows")]
fn pid_is_alive(pid: u32) -> bool {
    type HANDLE = *mut std::ffi::c_void;
    type DWORD = u32;
    type BOOL = i32;
    const PROCESS_QUERY_INFORMATION: DWORD = 0x0400;
    extern "system" {
        fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }
    let h = unsafe { OpenProcess(PROCESS_QUERY_INFORMATION, 0, pid) };
    if h.is_null() { return false; }
    unsafe { CloseHandle(h); }
    true
}

#[cfg(target_os = "macos")]
fn pid_is_alive(pid: u32) -> bool {
    std::process::Command::new("kill")
        .args(["-0", &pid.to_string()])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// On Linux, returns the lowercased process name if `pid` is a Warframe
/// executable, judged by its own name only. The name is taken from
/// /proc/<pid>/comm (a Wine/Proton game shows "Warframe.x64.ex"), falling back
/// to the basename of argv[0] (Wine sets it to e.g. `S:\...\Warframe.x64.exe`).
/// Arguments are deliberately ignored: any unrelated process (an agent, shell
/// or editor) can mention "Warframe" or "x64" in its arguments or path.
#[cfg(target_os = "linux")]
fn warframe_process_name(pid: u32) -> Option<String> {
    let dir = std::path::Path::new("/proc").join(pid.to_string());
    if let Ok(comm) = std::fs::read_to_string(dir.join("comm")) {
        let comm = comm.trim().to_lowercase();
        if comm.starts_with("warframe") {
            return Some(comm);
        }
    }
    let cmdline = std::fs::read(dir.join("cmdline")).ok()?;
    let argv0 = cmdline.split(|&b| b == 0).next()?;
    let argv0 = String::from_utf8_lossy(argv0);
    let base = argv0.rsplit(|c| c == '/' || c == '\\').next().unwrap_or("").to_lowercase();
    if base.starts_with("warframe") {
        Some(base)
    } else {
        None
    }
}

/// Returns the PID of the first Warframe process found, if any.
/// Uses a cached PID to avoid scanning /proc on every call.
pub fn get_warframe_pid() -> Option<u32> {
    with_cache(|| {
        #[cfg(target_os = "windows")]
        {
            type HANDLE = *mut std::ffi::c_void;
            type DWORD = u32;
            type BOOL = i32;
            type WCHAR = u16;

            const TH32CS_SNAPPROCESS: DWORD = 0x00000002;

            #[repr(C)]
            #[allow(non_snake_case)]
            struct PROCESSENTRY32W {
                dwSize: DWORD,
                cntUsage: DWORD,
                th32ProcessID: DWORD,
                th32DefaultHeapID: *mut std::ffi::c_void,
                th32ModuleID: DWORD,
                cntThreads: DWORD,
                th32ParentProcessID: DWORD,
                pcPriClassBase: i32,
                dwFlags: DWORD,
                szExeFile: [WCHAR; 260],
            }

            extern "system" {
                fn CreateToolhelp32Snapshot(dwFlags: DWORD, th32ProcessID: DWORD) -> HANDLE;
                fn Process32FirstW(hSnapshot: HANDLE, lppe: *mut PROCESSENTRY32W) -> BOOL;
                fn Process32NextW(hSnapshot: HANDLE, lppe: *mut PROCESSENTRY32W) -> BOOL;
                fn CloseHandle(hObject: HANDLE) -> BOOL;
            }

            let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
            if snapshot.is_null() || snapshot as isize == -1 {
                return None;
            }

            let mut entry: PROCESSENTRY32W = unsafe { std::mem::zeroed() };
            entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as DWORD;

            if unsafe { Process32FirstW(snapshot, &mut entry) } == 0 {
                unsafe { CloseHandle(snapshot); }
                return None;
            }

            let mut candidates: Vec<(u32, bool)> = Vec::new();
            loop {
                // Convert wide szExeFile to a Rust string for matching
                let mut name_utf16: Vec<u16> = Vec::new();
                for &c in entry.szExeFile.iter() {
                    if c == 0 { break; }
                    name_utf16.push(c);
                }
                let name = String::from_utf16_lossy(&name_utf16);
                let lower = name.to_lowercase();

                if lower.contains("warframe") {
                    let is_game = lower.contains("x64");
                    candidates.push((entry.th32ProcessID, is_game));
                }

                if unsafe { Process32NextW(snapshot, &mut entry) } == 0 {
                    break;
                }
            }
            unsafe { CloseHandle(snapshot); }

            // Prefer the actual game binary (Warframe.x64.exe) over the launcher
            let has_game = candidates.iter().any(|(_, is_game)| *is_game);
            if has_game {
                candidates.into_iter().find(|(_, is_game)| *is_game).map(|(pid, _)| pid)
            } else {
                candidates.into_iter().next().map(|(pid, _)| pid)
            }
        }
        #[cfg(target_os = "linux")]
        {
            // Collect every process whose own executable name is Warframe,
            // preferring the game binary (Warframe.x64.exe) over the launcher
            // (the launcher won't have the EE.log ring buffer, but both start
            // with "Warframe").  Matching is on the process name only, never
            // on arguments, so unrelated processes that merely mention
            // Warframe (agents, shells, editors) can't be selected.
            let mut candidates: Vec<(u32, bool)> = Vec::new();
            if let Ok(pids) = std::fs::read_dir("/proc") {
                for entry in pids.flatten() {
                    let pid_str = entry.file_name().to_string_lossy().into_owned();
                    if !pid_str.chars().all(|c| c.is_ascii_digit()) { continue; }
                    let pid_num = match pid_str.parse::<u32>() { Ok(n) => n, Err(_) => continue };
                    if let Some(name) = warframe_process_name(pid_num) {
                        candidates.push((pid_num, name.contains("x64")));
                    }
                }
            }
            // Game binary first; ties resolved by lowest PID for determinism.
            candidates.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
            candidates.into_iter().next().map(|(pid, _)| pid)
        }
        #[cfg(target_os = "macos")]
        {
            // No -f: match the process name only, not arguments of unrelated
            // processes that happen to mention Warframe.
            if let Ok(output) = std::process::Command::new("pgrep")
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

pub fn spawn_memory_watcher(app: AppHandle) -> Result<LogScannerHandle, String> {
    if IS_SCANNING.load(Ordering::SeqCst) {
        return Err("Already scanning".to_string());
    }

    IS_SCANNING.store(true, Ordering::SeqCst);
    // Show "waiting" immediately so the UI responds right away;
    // the watcher thread will refine this to "active" or "stale_offset".
    SCANNER_STATUS.store(1, Ordering::SeqCst);

    let app_inner = app.clone();

    std::thread::spawn(move || {
        let my_gen = SCANNER_GENERATION.load(Ordering::SeqCst);
        let mut scanner = LogScanner::new();
        let mut logged_waiting = false;
        let mut ever_hooked = false;
        let mut validated = false;
        let mut had_pid = false;
        let mut discovery_attempts = 0u32;
        let mut last_pid_for_discovery: u32 = 0;

        // Try local cache first (fast - avoids full anonymous region walk).
        let mut offsets = match crate::mem_reader::load_offset_cache() {
            Some(c) => {
                crate::logger::log_to_disk(&app_inner, &format!(
                    "[MEMORY WATCHER] Using cached VA {:#x}", c.buffer_va));
                c
            }
            None => {
                crate::logger::log_to_disk(&app_inner,
                    "[MEMORY WATCHER] No cached VA found, will discover");
                crate::mem_reader::MemOffsets { buffer_va: 0, buffer_size: 0x20000 }
            }
        };

        // Scratch buffers reused across cycles (no per-cycle allocs)
        let mut raw = Vec::new();
        let mut prev = vec![0u8; 0];
        let mut seen_lines = SeenLines::new();
        let mut new_hashes_last_minute: usize = 0;
        let mut last_dedupe_report: Option<Instant> = None;
        let mut logged_first_eviction = false;

        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) || SCANNER_GENERATION.load(Ordering::SeqCst) != my_gen {
                break;
            }

            let pid = match get_warframe_pid() {
                Some(p) => p,
                None => {
                    if had_pid {
                        // Warframe closed mid-session - reset state so the
                        // next cycle re-validates the VA and re-emits events
                        // cleanly, avoiding edge cases from stale prev data.
                        validated = false;
                        ever_hooked = false;
                        prev.clear();
                        had_pid = false;
                        seen_lines.clear();
                        scanner.riven_timestamp_guard = RivenTimestampGuard::default();
                    }
                    if !logged_waiting {
                        crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Waiting for Warframe process...");
                        logged_waiting = true;
                        SCANNER_STATUS.store(1, Ordering::SeqCst);
                    }
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    continue;
                }
            };
            had_pid = true;

            // If the PID changed (e.g. we found the game process instead of
            // the launcher), reset discovery so we can discover the right VA
            // for the new process.
            if pid != last_pid_for_discovery {
                last_pid_for_discovery = pid;
                discovery_attempts = 0;
            }

            if !validated {
                let mut need_discovery = true;

                // Try cached VA first (fast path).
                if offsets.buffer_va != 0 {
                    raw.reserve(offsets.buffer_size.saturating_sub(raw.len()));
                    match crate::mem_reader::read_ring_buffer(pid, &offsets, &mut raw) {
                        Ok(()) => {
                            if crate::mem_reader::validate_buffer(&raw).is_ok() {
                                validated = true;
                                need_discovery = false;
                            }
                        }
                        Err(_) => {
                            clear_pid_cache();
                        }
                    }
                }

                if need_discovery {
                    if discovery_attempts < 5 {
                        discovery_attempts += 1;
                        crate::logger::log_to_disk(&app_inner, &format!(
                            "[MEMORY WATCHER] Discovery attempt {}/5...", discovery_attempts));
                        if let Some((found_va, found_size)) =
                            crate::memory_scan::discover_ring_buffer(pid)
                        {
                            offsets = crate::mem_reader::MemOffsets {
                                buffer_va: found_va,
                                buffer_size: found_size,
                            };
                            raw.reserve(offsets.buffer_size.saturating_sub(raw.len()));
                            match crate::mem_reader::read_ring_buffer(pid, &offsets, &mut raw) {
                                Ok(()) => {
                                    if crate::mem_reader::validate_buffer(&raw).is_ok() {
                                        validated = true;
                                        crate::mem_reader::save_offset_cache(&offsets);
                                    } else {
                                        crate::logger::log_to_disk(&app_inner, &format!(
                                            "[MEMORY WATCHER] Discovery attempt {}/5 buffer validation failed",
                                            discovery_attempts));
                                        std::thread::sleep(std::time::Duration::from_secs(3));
                                        continue;
                                    }
                                }
                                Err(e) => {
                                    clear_pid_cache();
                                    crate::logger::log_to_disk(&app_inner, &format!(
                                        "[MEMORY WATCHER] Discovery attempt {}/5 read failed: {e:?}",
                                        discovery_attempts));
                                    std::thread::sleep(std::time::Duration::from_secs(3));
                                    continue;
                                }
                            }
                        } else {
                            crate::logger::log_to_disk(&app_inner, &format!(
                                "[MEMORY WATCHER] Discovery attempt {}/5 returned no candidate",
                                discovery_attempts));
                            std::thread::sleep(std::time::Duration::from_secs(3));
                            continue;
                        }
                    } else {
                        if !logged_waiting {
                            logged_waiting = true;
                            SCANNER_STATUS.store(1, Ordering::SeqCst);
                        }
                        crate::logger::log_to_disk(&app_inner,
                            "[MEMORY WATCHER] All discovery attempts exhausted, retrying...");
                        std::thread::sleep(std::time::Duration::from_secs(2));
                        continue;
                    }
                }
            }

            // ── Steady state: read, delta-diff, parse ──────────────────────
            if let Err(e) = crate::mem_reader::read_ring_buffer(pid, &offsets, &mut raw) {
                if ever_hooked {
                    SCANNER_STATUS.store(3, Ordering::SeqCst);
                }
                crate::logger::log_to_disk(&app_inner, &format!(
                    "[MEMORY WATCHER] Read error ({:?}), retrying...", e
                ));
                // Any read failure here means the cached VA no longer points
                // at a valid ring buffer - whether the process is gone
                // entirely ("open_mem_failed") or the buffer simply moved
                // within the still-running process ("read_failed", the more
                // common real-world case). Reset so the next iteration
                // re-scans /proc and re-discovers the buffer instead of
                // retrying the same stale address forever. Also reset
                // ever_hooked so the status goes back to "active" (green)
                // once re-validation succeeds.
                validated = false;
                ever_hooked = false;
                discovery_attempts = 0;
                seen_lines.clear();
                scanner.riven_timestamp_guard = RivenTimestampGuard::default();
                crate::overlay_utils::stop_focus_watcher();
                clear_pid_cache();
                std::thread::sleep(std::time::Duration::from_millis(500));
                continue;
            }

            // ── Parse lines with hash dedup ────────────────────────────────
            // The ring buffer is circular: new lines overwrite old content at
            // a different position than where they're written.  Byte-level
            // delta-diff (extract_new) alone is unreliable for this — the
            // divergence point may be at the overwritten region, not the new
            // content.  Instead, re-parse lines and skip by hash.
            let text = String::from_utf8_lossy(&raw);
            for line in text.split('\n') {
                let line = line.trim_matches(|c: char| c.is_whitespace() || c == '\0');
                if line.is_empty() { continue; }
                if !looks_like_log_line(line) { continue; }
                let hash = line_hash(line);
                if !seen_lines.insert(hash) {
                    continue;
                }
                new_hashes_last_minute += 1;
                if !logged_first_eviction && seen_lines.evictions() > 0 {
                    crate::logger::log_to_disk(&app_inner,
                        "[MEMORY WATCHER] dedupe: first eviction occurred");
                    logged_first_eviction = true;
                }

                // On the first cycle only (prev empty), skip stateful
                // triggers to avoid stale-event noise from the initial
                // buffer dump.  After that, every new line is real.
                if prev.len() != raw.len()
                    && (line.contains("OmegaRerollSelection.lua: Diorama setup")
                        || line.contains("ThemedDetailedPurchaseDialog.lua: PopulateInfo->")
                        || line.contains("ThemedDetailedPurchaseDialog.lua: DBG: HudVis")
                        || line.contains("Dialog.lua:")
                        || line.contains("CancelJobs batchcount 0")
                        || line.contains("NpcManager::ClearAgents()")
                        || line.contains("ChatRedux.lua: Chat: Filters for")
                        || line.contains("ProjectionRewardChoice.lua: Relic reward screen shut down")
                        || line.contains("Created /Lotus/Interface/ThemedProjectionManager.swf")
                        || line.contains("Subscribing for /Lotus/Interface/MapRedux.swf"))
                {
                    continue;
                }

                scanner.on_line(&app_inner, line);
            }

            let now = Instant::now();
            if last_dedupe_report.map_or(true, |reported_at| {
                now.duration_since(reported_at) >= Duration::from_secs(60)
            }) {
                crate::logger::log_to_disk(&app_inner, &format!(
                    "[MEMORY WATCHER] dedupe: new_hashes_last_minute={} set_len={} raw_len={} evictions={}",
                    new_hashes_last_minute,
                    seen_lines.len(),
                    raw.len(),
                    seen_lines.evictions(),
                ));
                new_hashes_last_minute = 0;
                last_dedupe_report = Some(now);
            }

            if prev.len() != raw.len() {
                // First cycle done — mark hooked and save baseline.
                if !ever_hooked {
                    ever_hooked = true;
                    SCANNER_STATUS.store(2, Ordering::SeqCst);
                    logged_waiting = false;
                    app_inner.emit("scanner-hooked", ()).unwrap_or_default();
                    crate::overlay_utils::spawn_focus_watcher(&app_inner);
                }
                prev = raw.clone();
                let poll_ms = POLL_INTERVAL_MS.load(Ordering::Relaxed);
                std::thread::sleep(std::time::Duration::from_millis(poll_ms as u64));
                continue;
            }

            if !ever_hooked {
                ever_hooked = true;
                SCANNER_STATUS.store(2, Ordering::SeqCst);
                logged_waiting = false;
                app_inner.emit("scanner-hooked", ()).unwrap_or_default();
                crate::overlay_utils::spawn_focus_watcher(&app_inner);
            }

            std::mem::swap(&mut prev, &mut raw);

            let poll_ms = POLL_INTERVAL_MS.load(Ordering::Relaxed);
            std::thread::sleep(std::time::Duration::from_millis(poll_ms as u64));
        }

        // Only clear IS_SCANNING if we're still the current generation.
        // If a newer thread was spawned (generation was bumped), it manages
        // the flag — clearing it here would orphan the new thread.
        if SCANNER_GENERATION.load(Ordering::SeqCst) == my_gen {
            IS_SCANNING.store(false, Ordering::SeqCst);
        }
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}
pub fn spawn_file_watcher(app: AppHandle, path: String) -> Result<LogScannerHandle, String> {
    if IS_SCANNING.load(Ordering::SeqCst) {
        return Err("Already scanning".to_string());
    }

    IS_SCANNING.store(true, Ordering::SeqCst);
    SCANNER_STATUS.store(1, Ordering::SeqCst);

    let app_inner = app.clone();

    std::thread::spawn(move || {
        let my_gen = SCANNER_GENERATION.load(Ordering::SeqCst);
        let mut scanner = LogScanner::new();

        let mut file = loop {
            if !IS_SCANNING.load(Ordering::SeqCst) || SCANNER_GENERATION.load(Ordering::SeqCst) != my_gen {
                return;
            }
            match std::fs::File::open(&path) {
                Ok(f) => break f,
                Err(e) => {
                    crate::logger::log_to_disk(&app_inner, &format!("[FILE WATCHER] Waiting for EE.log at {}: {}", path, e));
                    std::thread::sleep(std::time::Duration::from_secs(5));
                }
            }
        };

        crate::logger::log_to_disk(&app_inner, &format!("[FILE WATCHER] Opened {}", path));
        SCANNER_STATUS.store(2, Ordering::SeqCst);

        use std::io::{BufRead, Seek};
        
        // Seek to end to avoid parsing old events on startup
        let _ = file.seek(std::io::SeekFrom::End(0));
        let mut reader = std::io::BufReader::new(file);
        let mut line = String::new();

        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) || SCANNER_GENERATION.load(Ordering::SeqCst) != my_gen {
                break;
            }

            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => {
                    // EOF - Wait before polling again
                    let poll_ms = POLL_INTERVAL_MS.load(Ordering::Relaxed);
                    std::thread::sleep(std::time::Duration::from_millis(poll_ms as u64));

                    // Warframe recreates EE.log on every relaunch, leaving
                    // this fd pointing at the old (unlinked/replaced) file -
                    // without this check the scanner sits at permanent EOF
                    // forever, silently, never seeing new events. A size
                    // shrink below our current read position is the signal:
                    // a fresh EE.log always starts smaller than the session
                    // we were already tailing.
                    if let (Ok(pos), Ok(meta)) = (reader.stream_position(), std::fs::metadata(&path)) {
                        if meta.len() < pos {
                            if let Ok(f) = std::fs::File::open(&path) {
                                crate::logger::log_to_disk(&app_inner, &format!("[FILE WATCHER] {} was rotated (shrank from {} to {} bytes), reopening", path, pos, meta.len()));
                                reader = std::io::BufReader::new(f);
                                continue;
                            }
                        }
                    }
                }
                Ok(_) => {
                    scanner.on_line(&app_inner, &line);
                }
                Err(e) => {
                    crate::logger::log_to_disk(&app_inner, &format!("[FILE WATCHER] Read error: {}", e));
                    std::thread::sleep(std::time::Duration::from_secs(1));
                }
            }
        }

        if SCANNER_GENERATION.load(Ordering::SeqCst) == my_gen {
            IS_SCANNING.store(false, Ordering::SeqCst);
        }
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}
