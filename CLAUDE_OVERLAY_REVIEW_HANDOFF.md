# Kieda's Orbiter — Full Project Code Review and Relic Overlay Failure Handoff for Claude

**Date:** 2026-07-24  
**Repository:** `/var/home/jedwards/wfinfo-ng`  
**Scope:** Investigation of a relic reward overlay failure in an endless Defense mission plus a full, project-wide read-only review of the Python GUI, Rust detector/OCR, overlays, watchers, installers, update paths, data generators, persistence, tests, configuration, and documentation.  
**Important:** None of the fixes described below have been applied. The only repository change from this review is this handoff file.

## User report

During an endless Defense fissure mission:

1. The reward overlay worked for several rotations.
2. On the fourth rotation it showed only three entries, all `UNKNOWN`.
3. After that, the reward overlay appeared to stop working entirely.

The report is reproduced in the application logs. This is not merely a hypothetical code concern.

## Project/runtime context

- Python/PySide6 provides the main application and Qt fallback overlay.
- On Jacob's Linux/KDE/Wayland system, `overlay.py` launches `overlay_gtk.py`; GTK layer-shell is the actual reward overlay used above fullscreen Warframe.
- The Rust `orbiter` binary watches `EE.log`, invokes Spectacle/Grim, crops the Warframe monitor, performs Tesseract OCR, resolves ownership, and writes `latest-detection.json`.
- The GTK overlay polls that state file and renders up to four reward columns.
- The real app runs in Jacob's `wfinfo` distrobox/host environment. The AI shell is not equivalent. Do not rebuild `.venv` or infer runtime dependency health from this shell.
- Python does not hot-reload. Any Python fix needs a full process kill/relaunch.
- Rust fixes require rebuilding `target/release/orbiter` in the environment that actually runs the app. Verify source and binary mtimes before claiming a Rust fix is live.
- The worktree already contains a large amount of unrelated, uncommitted user work. Do not reset, clean, revert, or commit it unless explicitly requested.

## Direct evidence from 2026-07-24

Relevant files:

- Runtime detector log: `~/.local/share/kiedas-orbiter/orbiter.log`
- Runtime overlay log: `~/.local/share/kiedas-orbiter/overlay.log`
- Current state: `~/.local/share/kiedas-orbiter/latest-detection.json`
- Warframe log: `~/.local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log`

### Detector/overlay timeline

The detector generated a repeating pair of captures around each Defense rotation:

| Approx. time | Detector result | Overlay result |
|---|---|---|
| 10:06:39 | Four valid rewards | Shown, 4 rewards |
| 10:07:18 | Zero rewards | New state consumed, nothing shown |
| 10:12:21 | Four valid rewards | Shown, 4 rewards |
| 10:13:04 | Zero rewards | New state consumed, nothing shown |
| 10:17:42 | Four valid rewards | Shown, 4 rewards |
| 10:18:16 | Zero rewards | New state consumed, nothing shown |
| 10:22:31 | Three OCR results: blank, `recatan`, blank | Shown, 3 `UNKNOWN` rewards |
| 10:23:09 | Zero rewards | New state consumed, nothing shown |
| 10:27:53 | Zero rewards | New state consumed, nothing shown |
| 10:28:36 | Three OCR results: blank, `LITHYRELIC`, `JEXCEPTIONAL` | Shown, 3 `UNKNOWN` rewards |
| 10:33:06 | Zero rewards | New state consumed, nothing shown |

Examples from `orbiter.log`:

```text
Saved debug capture to /tmp/wfinfo-capture-1784913750.png
Captured
could not resolve OCR text "" to a known item
could not resolve OCR text "recatan" to a known item
could not resolve OCR text "" to a known item
--- relic reward ownership ---
  ?                                         UNKNOWN
  ? recatan                                 UNKNOWN
  ?                                         UNKNOWN
Wrote state file: /home/jedwards/.local/share/kiedas-orbiter/latest-detection.json
```

Later:

```text
Saved debug capture to /tmp/wfinfo-capture-1784914115.png
Captured
could not resolve OCR text "" to a known item
could not resolve OCR text "LITHYRELIC" to a known item
could not resolve OCR text "JEXCEPTIONAL" to a known item
```

The final state at review time was:

```json
{"timestamp":1784914386,"warframe":{"x":1920,"y":0,"width":2560,"height":1440},"rewards":[]}
```

This proves the detector and overlay did not simply die at the fourth rotation. The detector continued publishing bad/empty states, and the overlay continued consuming them. The visible symptom was caused by bad capture state plus overlay behavior.

## Root cause 1 — ambiguous trigger fires twice in endless missions

Current code: `src/bin/main.rs`, around lines 328–398, especially line 377.

```rust
if line.contains("Created /Lotus/Interface/ProjectionRewardChoice.swf") {
    reward_screen_detected = true;
}
```

The comment directly above this code is incorrect for endless Defense. It assumes SWF creation uniquely identifies the populated reward screen.

Real `EE.log` shows two distinct uses of the same SWF per rotation.

### Real populated reward screen

```text
Sys [Info]: Created /Lotus/Interface/ProjectionRewardChoice.swf
Script [Info]: ProjectionRewardChoice.lua: Pause countdown done
Input [Info]: Subscribing for /Lotus/Interface/ProjectionRewardChoice.swf ...
Script [Info]: ProjectionRewardChoice.lua: Relic rewards initialized
Script [Info]: ProjectionRewardChoice.lua: Got rewards
...
Script [Info]: ProjectionRewardChoice.lua: Selection countdown done
Script [Info]: ProjectionRewardChoice.lua: Relic reward screen shut down
```

### Endless-mission continue/next-relic transition

Roughly 30–40 seconds later:

```text
Sys [Info]: Created /Lotus/Interface/ProjectionRewardChoice.swf
Script [Info]: ProjectionRewardChoice.lua: Relic rewards initialized
Input [Info]: Subscribing for /Lotus/Interface/ProjectionRewardChoice.swf ...
Script [Info]: ProjectionRewardChoice.lua: Reward choice force closed
Script [Info]: ProjectionRewardChoice.lua: Relic reward screen shut down
```

The second instance does **not** emit `ProjectionRewardChoice.lua: Got rewards`.

Therefore generic SWF creation is not a safe reward trigger in endless missions. It deterministically schedules one real capture and one unrelated capture per rotation.

Recommended direction: use the authoritative `ProjectionRewardChoice.lua: Got rewards` event, or implement a small state machine that requires the real reward-population sequence. Do not use `Created`, `Pause countdown done`, or `Relic rewards initialized` alone.

## Root cause 2 — configured trigger and delay are dead settings

`config.json` currently contains:

```json
"trigger_pattern": "ProjectionRewardChoice.lua: Relic rewards initialized",
"pre_capture_sleep_ms": 2500,
"poll_interval_ms": 100
```

But Rust hardcodes:

- Trigger: `Created /Lotus/Interface/ProjectionRewardChoice.swf`
- Delay: `sleep(Duration::from_millis(1500))`

Locations:

- Trigger: `src/bin/main.rs:377`
- Delay: `src/bin/main.rs:384`

Changing `pre_capture_sleep_ms` to 2500 previously appeared to be a fix, but the Rust detector never reads it. The live binary still waits 1500 ms. This is highly relevant to the partial fourth-rotation capture: SWF creation can occur before reward data/text is fully present.

Other configuration drift:

- `window_name` is parsed as a CLI argument and discarded at `src/bin/main.rs:505` (`let _ = window_name`).
- `poll_interval_ms` is read by Python overlays, not the Rust `EE.log` watcher.
- `trigger_pattern`, `pre_capture_sleep_ms`, and `window_name` still exist in legacy `SETTINGS_TAB.py`, but the current app sidebar loads `STATUS_TAB.py`, not `SETTINGS_TAB.py`.

Claude should either wire these settings into the real detector launch/runtime or remove/rename obsolete controls so the UI/config does not promise behavior that does not exist. For the immediate overlay fix, a reliable hardcoded `Got rewards` trigger is safer than retaining a user-editable ambiguous trigger without validation.

## Root cause 3 — empty OCR overwrites valid overlay state

`run_detection()` writes `latest-detection.json` even when OCR extracts zero reward boxes.

The overlay then consumes the new timestamp:

- GTK: `overlay_gtk.py:282–304`
- Qt fallback: `overlay.py:361–393`

GTK behavior:

```python
self.last_timestamp = ts
self._show_rewards(state.get("rewards", []), state.get("warframe"))
```

Then:

```python
self._clear()
if not rewards:
    return
```

Consequences:

1. Empty state is treated as a successful new detection.
2. GTK clears the existing reward widgets.
3. Nothing new is displayed.
4. `last_timestamp` has already advanced, so the state will not be retried.

Recommended protections:

- Detector should not publish an empty reward list as a successful detection.
- Prefer writing state atomically (temporary file followed by replace).
- Overlay should update `last_timestamp` only after validation/rendering succeeds.
- Empty/malformed states should be logged and ignored without clearing a currently valid display.
- Consider a bounded retry capture when extraction is empty or overwhelmingly unresolved, but avoid delaying the UI beyond Warframe's reward-selection window.

Do not simply retain the last overlay forever; normal hide timers should still work. The point is to avoid treating an invalid capture as a valid replacement event.

## High-risk detector crash paths

The Rust detector has several `unwrap()`/`expect()` calls in normal runtime paths. A single transient failure can terminate the detector, and `warframe-watcher.py` only restarts the detector when Warframe's PID changes.

### Unnecessary debug write can panic every detection

`src/ocr.rs:85`:

```rust
image.save("input.png").unwrap();
```

This runs inside `extract_parts_impl()` for normal production OCR. If the current directory becomes unwritable, disk is full, the file is locked, or encoding fails, the detector panics. Debug output should never be required for successful detection. Remove it or log-and-continue.

### Tesseract calls can panic

`src/ocr.rs:394–416`:

```rust
let mut ocr = tesseract.take().unwrap();
...
.expect("Failed to set image");
let result = ocr.get_text().expect("Failed to get text");
```

Additional mutex unwraps occur in the iterator paths around lines 426 and 445. Any Tesseract error can panic the main detection loop. A panic while the Tesseract value has been taken can also leave the shared `Option` empty or mutex poisoned.

Recommended direction:

- Make OCR return `Result` rather than panic.
- Restore/reinitialize Tesseract on failure.
- Let one bad reward/capture fail gracefully without terminating the long-lived detector.
- Catch failure at the `run_detection` boundary, log it, and remain available for the next rotation.

### Log watcher can panic or silently die

`src/bin/main.rs:330–388` contains `unwrap()` around opening, seeking, watching, reopening, metadata, and `event_sender.send()`.

`EE.log` can be replaced/truncated during Warframe restarts. The current watcher stores a byte offset and assumes the file only grows. If the file length becomes less than `position`, seeking succeeds but no new lines are read, and the offset can become inconsistent. If file operations fail, the watcher thread can panic. The main process may remain alive while no longer receiving automatic detections.

This creates another “process exists but overlay never works again” failure mode.

Recommended direction:

- Detect truncation/rotation (`metadata.len() < position`) and reset offset.
- Replace runtime unwraps with logged recovery.
- If the log-watcher thread exits, terminate/restart the detector or supervise/recreate the watcher; do not leave a half-alive process.

## Conflicting detector launch paths

Normal autostart uses `autostart_manager._start_detector()` (`autostart_manager.py:107–137`). It:

- Calls `get_ee_log_path()` and passes the resolved path.
- Calls `get_screenshot_hotkey()` and passes a non-default hotkey.
- On Linux launches `./launch-orbiter.sh`.
- Removes the inherited `LD_LIBRARY_PATH` so host Spectacle does not load PySide6's incompatible Qt libraries.
- On Windows selects `orbiter.exe`.

But `warframe-watcher.restart_wfinfo()` (`warframe-watcher.py:36–46`) does this:

```python
WFINFO_BIN = WFINFO_DIR / "target/release/orbiter"
...
launch_detached([str(WFINFO_BIN)], cwd=WFINFO_DIR,
                env=clean_env, log_file=LOG_FILE)
```

This restart path drops:

- Resolved/custom `EE.log` path.
- Configured screenshot hotkey.
- `launch-orbiter.sh` setup.
- The detector-specific removal of `LD_LIBRARY_PATH`.
- Windows `.exe` selection and installed-root fallback.

This is a significant architectural conflict: the same detector behaves differently depending on whether it was started by application autostart or restarted after Warframe starts.

Recommended direction: create one canonical detector command/environment builder and call it from both locations. Avoid calling `autostart_manager.start_feature("detector")` naïvely from the watcher if its `is_running` checks or watcher recursion introduce side effects; factor the shared launch specification cleanly.

## Mastery/crafted status inconsistency

The handoff states that `populate_equipment.py` was corrected to use actual XP thresholds:

- 405,000 for weapon-class items.
- 810,000 for Warframe-class items.

However, `missing-parts.py:514–557`, especially lines 538–543, still does:

```python
for it in inv.get("XPInfo", []) or []:
    ...
    # FIX: presence of XPInfo entry = mastered (XP resets to 0 when sold)
    if p:
        paths.add(p)
```

That comment and behavior conflict with the newer threshold-based correction. A partially leveled Prime item present in `XPInfo` can still cause every component in that set to be marked automatically crafted. That can propagate incorrect `CRAFTED` status into Missing Parts and `crafted_parts.json`, which both Qt and GTK reward overlays consult.

Claude should reuse one mastery predicate/constants implementation rather than maintaining independent interpretations in `populate_equipment.py` and `missing-parts.py`.

## Cross-platform state path mismatch

`src/bin/main.rs:303` says the Rust data directory must exactly match `paths.py`, but the implementations differ.

Python `paths.py`:

- Windows: `%APPDATA%/kiedas-orbiter`
- macOS: `~/Library/Application Support/kiedas-orbiter`
- Linux: valid non-sandbox `XDG_DATA_HOME`, otherwise `~/.local/share/kiedas-orbiter`
- Explicitly ignores XDG paths contaminated by VS Code/Flatpak sandbox indicators.

Rust `src/bin/main.rs:305–319`:

- Windows: APPDATA fallback.
- Every non-Windows platform: `XDG_DATA_HOME`, otherwise `~/.local/share/kiedas-orbiter`.
- No macOS Application Support handling.
- No sandbox-path filtering.

Thus macOS is guaranteed to split detector and overlay state paths, and Linux direct launches from a sandbox-contaminated environment can also split them. Normal launch helpers currently force host XDG paths, which masks the Linux issue in some launch paths but not all.

Recommended direction: pass the exact data directory to Rust via an environment variable/CLI argument from `paths.py`, or implement identical platform/path rules in Rust with tests.

## Overlay event-consumption bug

Both overlay pollers set their last-seen timestamp before rendering.

GTK `overlay_gtk.py:282–295`:

```python
if ts != self.last_timestamp:
    self.last_timestamp = ts
    ...
    self._show_rewards(...)
```

Qt `overlay.py:361–382` follows the same order.

Exceptions are caught, so the process survives, but the failing state is permanently marked consumed. Correct ordering is validation/render success first, timestamp commit second, or an explicit rejected-state record if repeat attempts must be bounded.

Malformed `rect` dictionaries are one possible GTK render exception because code later indexes `r["x"]`, `r["y"]`, `r["height"]`, and `r["width"]` directly.

## Test and validation gaps

### What passed

- Project Python files compile successfully when `.venv` and `target` are excluded.
- All top-level shell scripts pass `sh -n` syntax validation.
- `git diff --check` reported no whitespace errors.

### What could not run in the AI shell

- System-Python pytest collection failed because system Python lacks PySide6.
- Project `.venv` has PySide6 but does not have pytest.
- `cargo check --all-targets` could not find `lept.pc`/Leptonica development metadata in this shell.

These are environment/test-infrastructure limitations, not proof that the application code fails compilation in Jacob's runtime.

### Test suite is stale relative to the app

`tests/test_imports.py` imports and instantiates `SETTINGS_TAB.SettingsTab`, but the current app sidebar imports `STATUS_TAB.StatusTab`. `STATUS_TAB.py` is heavily modified and is not covered by the existing smoke test.

No automated tests cover:

- Endless mission double SWF creation.
- Correct reward log-sequence discrimination.
- Configured capture delay/trigger wiring.
- Empty OCR state handling.
- OCR error recovery.
- `EE.log` truncation/replacement.
- Canonical detector restart arguments/environment.
- Cross-platform data directory parity.
- Overlay retry/commit ordering.

Suggested unit-test seam: extract a pure function/state machine that accepts log lines and returns whether to capture. Feed it recorded normal and endless sequences. Also extract detector launch command construction and test it for Linux/Windows with configured EE path and hotkey.

## Minor findings

1. `cargo fmt --all -- --check` currently reports formatting differences in `src/bin/main.rs` and `src/ocr.rs`.
2. `platform_utils.launch_detached()` opens a log file handle and passes it to `Popen`, but does not close the parent's copy after spawning. Repeated starts from a long-lived GUI/watcher can accumulate descriptors.
3. State/config writers generally use direct `write_text`/`File::create` rather than atomic replace. Pollers catch partial-JSON errors, but atomic state publication would remove the race and make event delivery easier to reason about.
4. Timestamps use whole Unix seconds. Two legitimate detections/test events within one second share the same identity and the second can be ignored by overlays. Uncommon for normal relic rotations, but easy to hit with manual/test triggers. A monotonic sequence or millisecond/nanosecond timestamp is safer.

## Full project-wide code review

This section is not limited to the relic overlay. Approximately 22,000 lines of Python, Rust, and shell code were inspected, including every major GUI tab and background service. The review also covered top-level JSON data/configuration files, installers, launchers, update scripts, tests, and the large uncommitted working tree.

The worktree contains 41 modified tracked files plus numerous untracked additions. The handoff history describes much of this as Claude-era work, but Git cannot prove authorship for individual uncommitted lines. Treat the attribution below as “custom/Claude-era code identified by the handoffs,” not definitive line-by-line authorship.

### Static verification performed

- Python compilation with compileall passed.
- All top-level JSON files parsed successfully.
- Bash syntax checks passed.
- git diff --check passed.
- No duplicate Python AST definitions were detected.
- cargo fmt --all -- --check failed because src/bin/main.rs and src/ocr.rs are not formatted.
- cargo check could not complete because this host lacks Leptonica development metadata (lept.pc). That is an environment limitation, not proof of a Rust source failure.
- Neither cargo-audit nor pip-audit is installed, so dependency vulnerability scanning was not completed.
- A complete live runtime review was not possible without Warframe and Jacob's real distrobox/runtime environment.

### Current test environment is not trustworthy

The workspace .venv/bin/python resolves to the system Python 3.13 interpreter while its packages are stored under .venv/lib/python3.14/site-packages. PySide6 and the intended pytest environment therefore cannot be imported through that interpreter.

Do not rebuild this venv from the AI shell. The mismatch must be resolved in the environment Jacob actually uses.

Even after the environment is repaired, the existing tests require updates:

- tests/test_imports.py imports removed SETTINGS_TAB while the application uses STATUS_TAB.
- It expects the Relic Planner to have three columns; the current implementation has six.
- It assumes Mod Collection cells are populated immediately, but that table now populates asynchronously in queued chunks.
- There are no tests for overlay state machines, Defense log fixtures, installer binary locations, custom inventory paths, updater atomicity, or cross-platform launch construction.

## Critical/high project findings

### 1. Fresh Linux installation can download a detector that is never launched

download_helper.py writes the Linux detector to WFINFO_DIR/orbiter.

The Linux paths in launcher.py, launch-wfinfo.sh, launch-orbiter.sh, and the autostart manager expect WFINFO_DIR/target/release/orbiter. Unlike the Windows launcher, the Linux launcher has no repository-root orbiter fallback. A user without Rust can therefore receive a successful prebuilt download while the runtime still reports that no detector exists.

install.sh independently tries to compile the detector. When Cargo is absent or compilation fails, it warns but does not reliably install the prebuilt detector. If its helper download branch runs, it still installs the detector at the incompatible repository-root location.

Choose one canonical detector location for both built and downloaded binaries, or give every launcher a consistent ordered lookup list. Add a clean-install test for Linux without Cargo.

### 2. launch-wfinfo.sh contains an immediate fallback-path shell failure

The script uses local fallback at top level around line 45. local is legal only inside a shell function. With set -e, reaching the fallback recovery branch terminates the launcher instead of restoring a usable data file.

The same launcher creates a temporary directory for a fake notify-send, then uses exec; its cleanup code cannot run after the exec. This leaks one temporary directory per detector launch.

### 3. Installer and in-app autostart systems conflict

autostart_manager.py declares itself the single source of truth for six background features. install.py largely follows that model, but install.sh still installs separate desktop-login entries for the reward overlay and Warframe watcher.

Running the shell installer and enabling in-app autostart can create duplicate launch authorities. The overlay attempts singleton enforcement, but the watcher does not. This can produce multiple watchers, competing detector restarts, inconsistent arguments/environments, and processes that the UI does not accurately own.

Delete or migrate legacy autostart entries and keep exactly one launch authority. Process identity should be explicit, not inferred from substring matching.

### 4. The custom inventory-path setting is only partially honored

The Settings UI advertises support for a custom inventory.json. Status refresh passes that path only to part of the generation pipeline. These components, among others, still use the repository inventory directly:

- populate_crafted.py
- populate_relics.py
- populate_equipment.py
- record_stats_snapshot.py
- riven_grader_watcher.py
- CONSERVATION_TAG_TAB.py
- MOD_COLLECTION_TAB.py
- EPHEMERA_TAB.py
- AYATAN_TAB.py
- ARCANE_TAB.py
- MASTERY_HELPER_TAB.py
- Several other collection tabs

This produces split-brain state: one tab can use the configured inventory while another silently reads a stale repository copy. Route every inventory consumer through paths.get_inventory_path() or inject the path as a dependency.

### 5. Update logic is duplicated, inconsistent, and not fully atomic

The project has overlapping update implementations in update_manager.py, update.py, update_data.py, update.sh, update_all.sh, and several refresh/enrichment scripts. They differ in remote sources, validation, backup behavior, retry behavior, and atomicity.

Confirmed problems:

- The Status tab's “Update Game Data” path uses the weaker update_data.py rather than the more defensive manager.
- update_manager.py still fetches drop data over plain HTTP.
- Its claimed freshness/ETag behavior partly compares only response size within a tolerance. A changed same-sized file can remain incorrectly classified as current.
- _safe_write first renames the live file to .previous, then moves the new file into place. If the second operation fails, the live path is absent.
- Several scripts validate only that a response is JSON; a valid but structurally wrong object such as an empty object can replace good data.
- update_manager.py hardcodes .venv/bin/python, which is invalid on Windows.
- Price enrichment repeatedly rewrites its cache and also renames the active prices file before committing the replacement.

Consolidate all updates behind one implementation with schema/shape validation, HTTPS, retries, and a same-filesystem temporary file committed atomically. Preserve the good active file until the new file has been fully validated and committed.

### 6. Downloaded executables are not integrity-checked

download_helper.py imports hashlib but does not verify a published or pinned digest/signature before installing executable GitHub release assets.

The Windows ZIP path calls ZipFile.extractall(WFINFO_DIR) without validating members. If an archive or release account were compromised, parent-directory or absolute-path entries could escape the intended extraction directory.

Require checksums/signatures and explicitly reject unsafe ZIP member paths before extraction.

### 7. Process discovery and termination are overbroad

platform_utils.find_processes() considers a process a match when the requested string occurs anywhere in its command line or executable name. Calls such as kill_processes("orbiter") and kill_processes("overlay.py") can terminate unrelated applications containing those substrings.

GTK overlay singleton files read a PID and signal it without checking executable identity or process start time. If a stale PID has been reused, starting the overlay can terminate an unrelated process.

Use precise executable paths, PID plus creation-time validation, or Qt's QLockFile for Qt-owned applications. QLockFile includes stale-lock handling and process-name checks: <https://doc.qt.io/qtforpython-6/PySide6/QtCore/QLockFile.html>

### 8. Detector and watcher failure handling can leave half-alive processes

The Rust detector uses unwrap()/expect() on external JSON, file opening/seeking, watcher registration, channel sends, mutexes, Tesseract calls, and image writes. src/ocr.rs unconditionally saves input.png with unwrap(), so a read-only current directory or filesystem error can terminate detection.

Some watcher/hotkey failures occur inside spawned threads. A thread can die while the process remains visible, causing process checks to report “running” even though capture no longer works.

The old notify 4 debounced watcher handles only simple writes. It does not robustly recover from EE.log truncation, rename, replacement, or rotation. Move to a current notify::RecommendedWatcher flow and explicitly monitor worker liveness: <https://docs.rs/notify/latest/notify/type.RecommendedWatcher.html>

### 9. Detector state and capture behavior become stale

- owned_items.json is loaded only when the Rust detector starts. Inventory refreshes do not update overlay ownership until detector restart.
- Downloaded prices/items are cached in /tmp and reused whenever the file exists, with no reliable freshness policy.
- Debug captures are always written to /tmp, and input.png is always written in the current directory. This is a privacy/storage concern and introduces a failure point into normal operation.
- Overlay monitor selection changes where GTK renders, but Rust capture still relies on hardcoded/default monitor geometry and ignores window_name. OCR can capture a different display than the overlay targets.

Reload ownership on change, use an explicit expiring cache, put debug output behind an opt-in flag, and share one monitor/window selection model between capture and display.

### 10. Path/config state is internally inconsistent

paths.py contains both _get_data_dir() and a later public get_data_dir() with different sandbox/environment handling. DATA_DIR is constructed from the first implementation, while callers can receive a different result from the second.

Other settings and runtime files—including config.json and tracked column_widths.json—remain in the source directory. This causes dirty-tree conflicts and fails when the application directory is read-only.

Use a single platform API for writable locations. Qt provides QStandardPaths for configuration, data, and cache directories: <https://doc.qt.io/qt-6/qstandardpaths.html>

## GUI and data correctness findings

### Mastery Helper

1. “Easy” skips an owned item when its XP is zero. “Never Owned” also skips it because it is present in owned_unames. A rank-zero owned item therefore disappears from every category.
2. “From Relics” includes an item when any missing part is available from an owned relic. The heading/docstring suggests these are items buildable from owned relics. fully_coverable only changes sorting/coloring; it does not gate inclusion.
3. Component recipe quantities are ignored. A count of one is treated as sufficient even when a blueprint requires two of that component.
4. populate_equipment.py uses 405,000/810,000 weapon mastery XP thresholds, while Mastery Helper derives 450,000/900,000 from its rank formula. This makes mastery status disagree across tabs.

Centralize mastery rules and recipe sufficiency in one tested domain module rather than recomputing them differently in each tab/script.

### Mod Collection

The table is populated with chained QTimer.singleShot(0, ...) callbacks. Filtering before population completes hides only the rows that already exist; later chunks do not necessarily receive the active filter. Reloading while old callbacks remain queued can interleave old and new data, and an old completion callback can re-enable sorting during a new build.

Use a generation token/cancellation check for every chunk, apply the active filter as each row is added, and enable sorting only if the finishing generation is still current. A model/view implementation would be cleaner than filling thousands of QTableWidgetItem objects.

### Statistics

record_stats_snapshot.count_prime_sets() groups parts by name and checks whether each grouped part count is at least one. It ignores blueprint recipe quantities, so dual weapons or other multi-part requirements can be counted as complete when they are not.

### Riven grading

The grader has a custom TAG_MAP with suspect semantic reductions—for example faction damage, lifesteal, magazine, or charge-related properties can be collapsed into unrelated generic buckets. _roll_perfectness manually interprets encoded values and labels results at or above 75% as “GOD ROLL.” Both the decoding and subjective label threshold need independent validation.

The watcher also hardcodes the inventory path and writes state non-atomically.

### Dashboard

Refresh operations can overlap. There is no request/generation ordering guard, so an older network response can arrive later and overwrite newer data. Some externally sourced strings are also inserted into Qt RichText without consistent HTML escaping.

### Editable layout

editable_layout.py is approximately 450 lines of custom absolute positioning, dragging, resizing, and JSON persistence. Child widgets may consume mouse events before the parent card sees them, and persistence is non-atomic. If the intended UX can be represented as movable/floating panels, QDockWidget plus QMainWindow.saveState()/restoreState() already provides this behavior:

- <https://doc.qt.io/qtforpython-6/PySide6/QtWidgets/QDockWidget.html>
- <https://doc.qt.io/qtforpython-6/PySide6/QtWidgets/QMainWindow.html>

### Python memory-log scanner

warframe_mem_log.py is explicitly a Python port of upstream Cephalon Kronos Rust logic. Its _run_with_timeout() abandons a timed-out daemon thread because Python cannot kill the blocked operation. Repeated blocked scans can leak threads and open process handles indefinitely.

The scanner clears its seen set after 16,384 entries but leaves _first_read_done true. Old lines still in the ring buffer can then be interpreted as newly observed lines, replaying triggers.

Prefer integrating the native upstream scanner or execute scans in a killable subprocess rather than repeatedly abandoning Python threads.

### Riven/helper sentinel

helper-update-sentinel.py assumes ~/helper-src and branch senpai, while installer documentation and messages describe a specific upstream helper and log that “Sainan pushed.” Normal installations do not necessarily clone ~/helper-src; the installed login sentinel can therefore start and immediately exit forever. The configured local source, upstream repository, branch, and log wording need one explicit contract.

## Documentation conflicts

- README/Help say riven grading and statistics snapshots run every five minutes while Warframe is running. Code grades on inventory.json mtime changes, and inventory refresh is manual; no five-minute scheduler was found.
- Documentation says Refresh requires Warframe and warns the user. Current code intentionally tries a cached token without enforcing that gate.
- Documentation refers to three overlays, but the fissure tracker makes four.
- Documentation says the GTK riven overlay has a close button; none was found.
- README says the reward overlay shows platinum value, while the current reward overlay renders ownership/crafted/unknown status only.

Update documentation only after behavior is settled so it does not become another conflicting source of truth.

## Dependency/build organization

Cargo.toml contains aging major versions such as eframe/egui 0.19, notify 4, image 0.24, and indexmap 1.9. No vulnerability claim should be made without cargo audit, but the dependency set needs a deliberate upgrade and compatibility pass.

Several development binaries (ability-timer, theme_tune, check_image, image, and relics) share the detector's main dependency graph. GUI/dev-only dependencies such as eframe/egui/rdev should be optional features or separate workspace/dev-tool crates so a production orbiter build does not carry unrelated build complexity.

src/bin/main.rs.backup is tracked source-like dead code. Preserve history in Git and remove the backup file after confirming nothing invokes it.

The workspace itself is approximately 4.5 GB, largely because of ignored archives, target output, caches, a venv, and a large VS Code orbital-session artifact. This is housekeeping rather than an application defect, but it complicates backups and AI/tooling scans.

## Custom/Claude-era code that should use maintained implementations

The following are the strongest replacement/refactoring candidates:

| Custom implementation | Recommended maintained primitive/upstream |
|---|---|
| PID-file singleton plus direct SIGTERM | Qt QLockFile for Qt processes; validated PID/creation-time identity elsewhere |
| Direct JSON writes for application settings | Qt QSettings, which supplies platform-native storage and atomic sync behavior: <https://doc.qt.io/qtforpython-6/PySide6/QtCore/QSettings.html> |
| Direct writes or rename-before-replace for state and data | Qt QSaveFile for Qt code or same-directory temp plus atomic replace elsewhere: <https://doc.qt.io/qtforpython-6/PySide6/QtCore/QSaveFile.html> |
| Hand-written platform data/config/cache locations | Qt QStandardPaths: <https://doc.qt.io/qt-6/qstandardpaths.html> |
| Custom _version_tuple parser | PyPA packaging.version.Version, which handles prerelease/post/dev/local versions correctly: <https://packaging.pypa.io/en/stable/version.html> |
| Custom absolute card canvas | QDockWidget/QMainWindow.saveState() if dock semantics meet the UX |
| Python port of process-memory/ring-buffer scanning | Native/upstream Cephalon Kronos implementation, or a separately supervised subprocess: <https://github.com/glowseeker/cephalon-kronos> |
| Bespoke reward trigger/OCR lifecycle | Reuse tested concepts/modules from maintained WFInfo and original Linux wfinfo-ng rather than continuing independent lifecycle code: <https://github.com/WFCD/WFinfo> and <https://github.com/knoellle/wfinfo-ng> |
| Custom Riven formula/data interpretation | Validate against the cited browse.wf implementation and fixtures rather than an undocumented approximation: <https://github.com/calamity-inc/browse.wf> |
| Old notify 4 debounced watcher | Current notify::RecommendedWatcher with explicit rename/truncate recovery |

Do not replace everything indiscriminately:

- Keep gtk-layer-shell; it is the correct maintained primitive for a Wayland top-layer overlay.
- The simple FlowLayout is small and follows a standard Qt pattern; a third-party dependency is unnecessary.
- Warframe-specific acquisition/component overrides may be unavoidable, but they should be generated or schema-validated instead of expanded as unreviewed hand-maintained dictionaries.

### Provenance/licensing note

The local repository has a GPL license and originated from the GPL-licensed Linux wfinfo-ng project. Some current files explicitly say they port logic from Cephalon Kronos or derive formulas/data from browse.wf. Before release, document the exact copied/ported portions, confirm each upstream license, and retain all notices required for substantial copied code. Do not assume a comment naming the source is sufficient license compliance.

## Recommended project-wide priority order

1. Fix and regression-test the Defense reward trigger/state machine.
2. Stop publishing empty OCR states; add detector/worker health reporting and eliminate production panics.
3. Unify detector binary location and launch construction across installer, launcher, watcher, Linux, and Windows.
4. Remove duplicate legacy autostart entries and adopt one process owner.
5. Route every inventory consumer through the configured inventory path.
6. Consolidate update code, require HTTPS/integrity checks, validate schemas, and make writes atomic.
7. Replace substring process killing and unsafe PID singletons.
8. Repair the runtime/test environment, update stale tests, and add focused regression fixtures.
9. Centralize mastery, recipe-quantity, prime-set, and Riven domain calculations.
10. Migrate config/runtime state out of the source tree and remove tracked per-user state.
11. Replace or isolate the Python memory scanner and review upstream provenance.
12. Upgrade/split Rust dependencies and clean dead development artifacts only after behavior is covered by tests.

## Recommended implementation order

Do not bundle unrelated UI work into this fix. Suggested order:

1. **Fix reward trigger semantics** using `Got rewards` or an equivalent verified state machine.
2. **Make configured timing truthful**: either wire `pre_capture_sleep_ms` into Rust/launch args or remove the dead setting. Re-evaluate whether any delay is still needed after triggering on `Got rewards` rather than SWF creation.
3. **Reject empty detections** and ensure overlays do not clear/consume invalid states.
4. **Unify detector launch/restart construction** so autostart and watcher restart have identical args/environment/platform selection.
5. **Remove production OCR panics** and recover from log truncation/watcher-thread failure.
6. **Unify mastery determination** between equipment generation and Missing Parts.
7. **Unify data-directory selection** across Python and Rust.
8. Add focused regression tests, then format and run full checks in Jacob's actual runtime/build environment.

## Verification plan before claiming fixed

### Static/unit verification

- Add recorded-log tests proving exactly one capture event per endless Defense rotation.
- Test that a continue/next-relic SWF sequence without `Got rewards` produces no capture.
- Test that configured EE path and hotkey survive watcher restart.
- Test empty OCR does not publish a successful new state.
- Test overlay does not advance its event identity when validation/render fails.
- Test log truncation resets the watcher position.

### Runtime verification on Jacob's Linux setup

1. Rebuild the Rust binary in the real `wfinfo` environment.
2. Verify `target/release/orbiter` mtime is newer than the changed Rust sources.
3. Fully kill stale processes before relaunch; closing the GUI may only minimize it to tray.
4. Start Warframe and verify only one detector and one overlay process exist.
5. Run an endless Defense fissure for at least five reward rotations.
6. For each rotation, correlate:
   - `EE.log` real reward sequence.
   - Exactly one `Detected, waiting...` in `orbiter.log`.
   - Exactly one non-empty state write.
   - Exactly one overlay `shown, 4 rewards` (or legitimate party-size count).
7. Confirm no capture occurs during the continue/next-relic transition.
8. Confirm one forced OCR failure does not kill the detector or prevent the following rotation.

### Windows verification

- Confirm watcher restart launches `orbiter.exe`, not `target/release/orbiter`.
- Confirm custom EE path and hotkey args are retained.
- Confirm Python and Rust write/read the same `%APPDATA%/kiedas-orbiter/latest-detection.json`.

## Constraints from Jacob

- Jacob is a beginner and should not be asked to manually edit files.
- Verify before claiming fixed.
- Do not rebuild venvs from the AI shell.
- Do not run external/third-party programs without asking first.
- Do not commit unless Jacob explicitly requests it.
- Rust changes require a rebuilt binary; source edits alone are not a live fix.
- When giving Jacob a command, provide it as a standalone fenced copy/paste block.

