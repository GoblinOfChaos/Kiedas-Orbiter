# Cephalon Kronos - Architecture Overview

Tauri desktop app (Rust backend + React frontend). Reads Warframe inventory via
the game's mobile API and the live worldstate, then presents both in a single UI
shell. Also provides a real-time fissure overlay that reads the game's EE.log
ring buffer from process memory and runs PP-OCRv5 on the reward screen.

---

## High-Level Architecture

```
Warframe game process
  │
  ├── memory scan (auth token) ──► warframe-api-helper ──► inventory.json
  ├── memory scan (EE.log ring buffer) ──► warframe-api-helper ──► stdout ──► log_scanner
  │
  ▼
Rust backend (src-tauri/src/)
  main.rs           ─ Tauri entry point, IPC commands, app lifecycle
  log_scanner.rs    ─ spawns/watches warframe-api-helper --read-log-buffer,
                       parses EE.log lines, emits fissure/relic/riven events
  ocr.rs            ─ screen capture, slot detection, OCR pipeline
  ocr_engine.rs     ─ PP-OCRv5 model wrapper (ocr-rs crate)
  overlay_utils.rs  ─ window positioning helpers for overlay windows
  logger.rs         ─ debug logging to data/user/overlay_debug.log
  │
  ├── downloads/caches JSON exports from GitHub          → data/export/
  ├── downloads/caches media assets                      → data/export/maps|masteryicons/
  ├── runs warframe-api-helper for inventory              → data/user/inventory.json
  ├── reads EE.log lines from warframe-api-helper stdout → emits Tauri events
  └── exposes all of the above via Tauri IPC commands
  │
  ▼
MonitoringContext.jsx (src/contexts/MonitoringContext.jsx)
  ├── on startup: load_cached_inventory + load_all_exports
  ├── on scan: call_api_helper → fresh inventory
  ├── on each cycle: fetch worldstate from content.warframe.com
  ├── passes raw inventory + exports → parseInventory()
  └── passes raw worldstate → parseWorldstate()
  │
  ▼
src/lib/
  inventoryParser.js    parseInventory(raw, exports) → structured inventory
                        Resolves: names, images, ranks, relic rewards, rivens
  worldstateParser.js   parseWorldstate(raw, options) → dashboard data object
                        Resolves: fissures, sorties, cycles, Nightwave, etc.
  warframeUtils.js      Shared lookup tables and pure resolution functions.
                        No network calls or disk I/O.
  │
  ▼
React screens (src/screens/*.jsx) - read from MonitoringContext via useMonitoring()
  Dashboard.jsx   worldstate data (fissures, sorties, cycles, events, …)
  Inventory.jsx   all items, searchable/filterable by category and ownership
  Mastery.jsx     mastery rank progress, starchart completion, mastery XP totals
  Relics.jsx      owned relics grouped by era/name with refinement counts
  Rivens.jsx      mod parsing with live stat calculation
  Notes.jsx       Markdown notes saved to data/user/notes/ via Tauri IPC
  Checklist.jsx   persistent to-do list (localStorage)
  Maps.jsx        pannable/zoomable open-world maps from data/export/maps/
  Settings.jsx    theme picker + monitoring controls
  About.jsx       credits and disclaimer
```

---

## Subsystems

### EE.log Memory Watcher

Reads Warframe's in-process EE.log ring buffer via a bundled C++ helper that
scans all memory allocations and streams extracted log lines to stdout.

**Control flow:**

```
Rust: stop_scanner()       ─► kills helper via taskkill, sets IS_SCANNING=false
Rust: spawn_memory_watcher ─► spawns warframe-api-helper --read-log-buffer
                              reads 4-byte LE length prefix + payload from stdout
                              splits payload by newlines, hashes + deduplicates
                              passes each line to LogScanner::on_line()
                                ├── Mission Start  (_ActiveMission})
                                ├── Relic Pool     (Resloader...Projections...starting)
                                ├── Reward Screen  (Relic rewards initialized)
                                ├── Reward Close   (relic reward screen shut down)
                                ├── Endless Continue (ThemedProjectionManager.swf)
                                ├── Mission Exit   (ExitState: Disconnected)
                                ├── Riven Open     (OmegaRerollSelection.lua: Diorama setup)
                                ├── Riven Close    (DiegeticArtifactCards.lua: DBG: HudVis)
                                └── Riven Reroll   (Dialog::SendResult(4))
                              each trigger emits a Tauri event to the frontend

C++: warframe-api-helper --read-log-buffer
  loops: get Warframe process → open handle → enumerate all memory allocations
         for each allocation containing "EE [Info]:" / "Sys [Info]:" / "Script [Info]:":
           score a 64KB window centered on the match (count valid log lines)
           apply 4× penalty to allocations in the executable image address range
         pick the best-scoring allocation, clamp a 4MB read window to its bounds
         loop every 150ms:
           externalRead the window
           extract lines matching /^\d+\.?\d* (EE|Sys|Script) \[Info\]: /
           write 4-byte LE length + extracted bytes to stdout
         on read failure: break, outer loop re-discovers the buffer
```

### OCR Pipeline (PP-OCRv5)

Uses `ocr-rs` crate with PP-OCRv5 mobile model.

**Control flow:**

```
Relic rewards initialized trigger
  ─► Rust sets ICON_SCAN_ACTIVE=true
  ─► captures screen via xcap
  ─► detects slot rectangles (template matching)
  ─► for each slot:
       extract sub-image → CatmullRom 3× upscale → invert
       → ocr_engine::recognize() → RecModel inference → text
  ─► clean_ocr_output(): strip leading junk tokens (-Forma → Forma)
  ─► fuzzy-match against relic reward pool (levenshtein)
  ─► emit overlay-update-ocr event to frontend
```

Models downloaded automatically from GitHub on first run.

### Warframe Overlay

Four transparent click-through Tauri windows positioned at top-left, top-center,
top-right, and bottom-center (`overlay-relic`). Toggled from the frontend
settings panel via `start_log_scanner` / `stop_log_scanner`.

**Window positions:**

| Label | Position |
|-------|----------|
| overlay-tl | top-left, 16px margin |
| overlay-tc | top-center |
| overlay-tr | top-right, 16px margin |
| overlay-relic | bottom-center, 40px from bottom |

---

## File-by-File Reference

### `src-tauri/src/main.rs`

Rust backend entry point. All `#[tauri::command]` functions callable from
frontend via `invoke()`.

| Command | Called by | Purpose |
|---------|-----------|---------|
| `check_exports` | MonitoringContext (startup) | Download/refresh JSON exports |
| `load_all_exports` | MonitoringContext (startup) | Read all exports into one object |
| `call_api_helper` | MonitoringContext (scan) | Run the API helper, get fresh inventory |
| `load_cached_inventory` | MonitoringContext (startup) | Load last saved inventory from disk |
| `check_media_assets` | MonitoringContext (startup) | Download map + rank icon images |
| `load_txt_file` | Dashboard (arbitration data) | Read TXT data files from disk |
| `start_log_scanner` | Frontend (fissure overlay toggle) | Start memory watcher thread |
| `stop_log_scanner` | Frontend (fissure overlay toggle) | Kill helper, stop watcher thread |
| `list_notes` / `read_note` / `save_note` / `delete_note` | Notes.jsx | CRUD for Markdown notes |
| `open_data_folder` | Settings.jsx | Open data/ in OS file browser |
| `show_notification` | Frontend | Show toast notification overlay |
| `show_relic_overlay` | Frontend | Show relic reward overlay |
| `show_overlay_window` / `hide_overlay_window` | Frontend | Overlay window visibility |
| `resize_overlay_window` | Frontend | Position and size overlay windows |
| `relay_event` | Frontend | Cache + re-emit fissure events |
| `set_notification_sound` | Settings.jsx | Persist sound preference |
| `register_hotkey` / `unregister_all_hotkeys` | Settings.jsx | Global hotkeys |
| `save_settings` / `load_settings` | Settings.jsx | Persist preferences |
| `check_ocr_models` | Startup | Download PP-OCRv5 models |
| `save_debug_screenshot` / `start_debug_ocr_session` | Debug | Capture + OCR debug |
| `get_available_monitors` / `set_target_monitor` | Settings.jsx | Multi-monitor support |

### `src-tauri/src/log_scanner.rs`

EE.log parsing engine. Contains `LogScanner` struct with `on_line()` that
receives each log line and checks for known trigger patterns. Event flow:

```
Mission Start  ─► sets in_mission, clears state ─► emits nothing (frontend polls state)
Relic Pool     ─► parses relic path → RelicInfo  ─► emits overlay-update-relics
Reward Screen  ─► starts icon scan thread        ─► emits overlay-update-ocr
Reward Close   ─► clears scan flag               ─► emits fissure-reward-closed
Mission Exit   ─► resets all state               ─► emits fissure-reward-closed
Riven Open     ─►                                ─► emits riven-screen-open
Riven Close    ─►                                ─► emits riven-screen-closed
Riven Reroll   ─►                                ─► emits riven-reroll
```

`spawn_memory_watcher()` - spawns the helper binary with `--read-log-buffer`,
reads the binary framing (4-byte LE length + payload), splits by newlines,
hashes for dedup, passes to `on_line()`.

`stop_scanner()` - sets `IS_SCANNING=false`, kills helper via `taskkill` so the
blocking `read_exact` unblocks and the thread exits cleanly.

### `src-tauri/src/ocr.rs`

Screen capture and OCR pipeline.

- `detect_slot_count_from_icons()` - captures screen, finds slot UI elements via
  template matching, extracts each slot image, runs OCR, matches against reward pool.
- `clean_ocr_output()` - strips leading junk characters from OCR text, handles
  prefixes like `-Forma` → `Forma`.
- `trigger_manual_ocr()` - re-runs OCR on demand via hotkey.
- `save_debug_screenshot()` - captures and annotates debug screenshot.

### `src-tauri/src/ocr_engine.rs`

Thin wrapper around `ocr-rs` PP-OCRv5 model. Uses `OnceLock<Option<RecModel>>`
for lazy one-time init. `recognize()` does CatmullRom 3× upscale + invert before
inference.

### `warframe-api-helper` (C++ source: `helpers/main.cpp`)

Bundled binary with three modes:

| Mode | Flag | Purpose |
|------|------|---------|
| Auth gruzzling | (default) | Scan Warframe memory for `?accountId=...&nonce=...`, then fetch inventory from `mobile.warframe.com` |
| Log buffer | `--read-log-buffer` | Scan Warframe memory allocations for the EE.log ring buffer, poll every 150ms, write extracted lines to stdout with 4-byte length prefix |
| Skip scan | `--skip-scan` | Use provided accountId/nonce without memory scan |

Rust spawns with `CREATE_NO_WINDOW` to hide the console window.

---

## Data Directory Layout

```
src-tauri/data/
  bin/
    warframe-api-helper.exe      bundled helper binary
  export/
    ExportWarframes.json         game data (refreshed daily)
    ExportWeapons.json
    … (all ExportXxx.json files)
    dict.en.json                 main localisation dictionary
    supp-dict-en.json            supplementary oracle dictionary
    arbys.txt                    arbitration data (refreshed every 6h)
    sp-incursions.txt            Steel Path incursion data (refreshed every 6h)
    maps/                        open-world map PNGs
    masteryicons/                mastery rank icon PNGs
  user/
    inventory.json               latest fetched inventory
    notes/                       user Markdown notes (*.md)
    overlay_debug.log            debug log (app + memory watcher + OCR)
```

---

## External Data Sources

| Source | What it provides | Refresh rate |
|--------|-----------------|--------------|
| `raw.githubusercontent.com/calamity-inc/warframe-public-export-plus` | Game data exports | Daily |
| `oracle.browse.wf/dicts/en.json` | Supplementary localisation dictionary | Daily |
| `browse.wf/arbys.txt` | Current arbitration rotation | Every 6 h |
| `browse.wf/sp-incursions.txt` | Steel Path incursions | Every 6 h |
| `oracle.browse.wf/worldState.json` | Live worldstate (cached by Oracle) | Each monitoring cycle |
| `browse.wf` | Item images (via icon URLs in exports) | On demand |

---

## Project Root Layout

```
/
  helpers/                          one-off source files
    main.cpp                        C++ source for warframe-api-helper.exe
    training_extractor.rs           standalone OCR training data extractor
    theme_training_extractor.rs     standalone theme training data extractor
  src-tauri/                        Tauri app (Rust + frontend)
    src/                            Rust source
    data/                           bundled assets (exports, binary, audio)
  src/                              React frontend
    contexts/                       MonitoringContext, ThemeContext
     lib/                            Parser modules
    screens/                        UI screens
```

---

## EE.log Memory Based Triggers

Documentation of all log triggers used by the scanner.
Triggers fire from the memory-based EE.log watcher (`log_scanner.rs` → C++ helper `--read-log-buffer`).

### Fissure / Relic Workflow

| Step | Event | Trigger |
|------|-------|---------|
| 1  | Mission Start | `_ActiveMission"}` with MissionInfo |
| 2  | Relic Pool Detection | `Resloader` + `/Lotus/Types/Game/Projections/` + `starting` |
| 3  | Reward Screen | `ProjectionRewardChoice.lua: Got rewards` or `Relic rewards initialized` |
| 4  | Requiem Mod Detection | Relic tier = T5 (NCC template matching, no trigger string) |
| 5  | Reward Screen Detection | Icon scan polls for rarity icons at 7 known positions |
| 6  | Reward Screen Closure | `ProjectionRewardChoice.lua: Relic reward screen shut down` |
| 7  | Endless Continue | `Created /Lotus/Interface/ThemedProjectionManager.swf` |
| 8  | Mission Exit | `ExitState: Disconnected` or `Game [Info]: Set state to Disconnected` |

### Riven Overlays

**Linked in Chat**

| Event | Trigger |
|-------|---------|
| Open  | `ThemedDetailedPurchaseDialog.lua: PopulateInfo->/Lotus/StoreItems/Upgrades/Mods/Randomized` |
| Close | `ThemedDetailedPurchaseDialog.lua: DBG: HudVis` |

**Reroll Menu**

| Event | Trigger | Action |
|-------|---------|--------|
| Screen Opened | `OmegaRerollSelection.lua: Diorama setup` | Show RivenCurrent (left) overlay, OCR card |
| First Dialog | `Dialog.lua: Dialog::CreateOkCancel(description=` | await confirm/cancel |
| First Confirm | `Dialog::SendResult(4)` or `SendResult_MENU_SELECT()` | Emit `riven-reroll`, wait 4s, show RivenNew (right) overlay + OCR |
| First Cancel | `Dialog::SendResult(5)` or `SendResult_MENU_CANCEL()` | Back to screen open |
| Second Dialog | `Dialog.lua: Dialog::CreateOkCancel(description=` | await confirm/cancel |
| Second Confirm | `Dialog::SendResult(4)` or `SendResult_MENU_SELECT()` | Emit `riven-reroll-confirmed`, wait 2s, refresh left overlay, close right |
| Second Cancel | `Dialog::SendResult(5)` or `SendResult_MENU_CANCEL()` | Back to screen open |
| Menu Closed | `CancelJobs batchcount 0` | Hide reroll overlay |

**Close Detection**

| Trigger | Effect |
|---------|--------|
| `AI [Info]: NpcManager::ClearAgents() ReadyToCreateAgents = false` | Closes BOTH overlays (catch-all) |
| `Sys [Info]: CancelJobs batchcount 0` | Closes only reroll overlay |
| `Script [Info]: ... DBG: HudVis` | Closes only linked-in-chat overlay |

**Riven Card OCR Coordinates**

Captures card slots from the reroll screen. Bounds defined at 1920×1080 and scaled to the target monitor's resolution:

| Slot   | Bounds (x1, y1, x2, y2) | Stored as (x, y, w, h) |
|--------|-------------------------|------------------------|
| Left   | (486, 506, 711, 831)    | (486, 506, 225, 325)   |
| Middle | (815, 468, 1107, 882)   | (815, 468, 292, 414)   |
| Right  | (1210, 511, 1433, 822)  | (1210, 511, 223, 311)  |
| Linked | (840, 376, 1074, 704)   | (840, 376, 234, 328)   |

Scaling: `cx = x1 * (screen_w / 1920)`, `cy = y1 * (screen_h / 1080)`, `cw = (x2-x1) * (screen_w / 1920)`, `ch = (y2-y1) * (screen_h / 1080)`.

Test from browser console: `await invoke('ocr_riven_card', { position: 'Linked' })`

After cropping each card region:
1. Convert to grayscale, apply contrast stretch (stretch min→max to full 0-255 range)
2. Upscale 3× via CatmullRom, run full detection+recognition pipeline (`ocr_engine::recognize_image` via `OcrEngine`)
3. Join recognized text regions with ` | ` separator, parse into structured stats on frontend

### Chat Incoming Messages

No trigger for the message text itself. Instead, detect when the squad channel is ready:

```
IRC out: JOIN #<hash>           → track squad channel and exclude it from chat-incoming-message
Chat: Filters for <hash>:       → channel ready, emit chat-incoming-message, hash being user
```

Exclude: `G_EN_EU` (region), `R_EN_EU` (recruitment), `Q_EN_EU` (Q&A), `T_EN_EU` (trade).

### Archon Hunt Modifiers

```
Script [Info]: Background.lua: EliteAlert: generated boosts for <player>:
  suitType=<path> wepTypes=<path1>, <path2>, <path3>
```

Parsed and displayed in Dashboard under Archon Hunt card.
```
