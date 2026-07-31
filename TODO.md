# Kieda's Orbiter — Project TODO

Living checklist, shared across conversations/sessions. Check items off as they're
completed; add new ones as they come up. Source of most items below: `CLAUDE_OVERLAY_REVIEW_HANDOFF.md`
(2026-07-24 full project review) plus in-progress Dashboard editable-layout work.

## In progress — Dashboard layout

- [x] Replace guessed default card heights/positions with Jacob's actual saved
      `dashboard_layout.json` values (real tuned sizes, not estimates) — fixed
      in `DASHBOARD_TAB.py`: fissures 420→780, nightwave 300→422 (also fixed
      its width, was using a stale `COL0_W=620` while Fissures alone had
      already been widened to 720), archon 220→241, descendia 500→623
- [x] Align card edges in the saved `dashboard_layout.json` — Cycles and
      Nightwave now share Void Fissures' left/right edges (x=4, width=720),
      Steel Path's left edge matches Fissures' left edge, Arbitration's right
      edge matches Fissures' right edge, and Sortie/Archon/Baro all share
      Descendia's left/right edges (x=737, width=440)
- [x] Bake the real tuned layout into the shipped code default (was only in
      the saved JSON, so clicking Reset Layout — which deletes the JSON and
      rebuilds from code — kept throwing Arbitration/Steel Path back into
      the wrong column). `DASHBOARD_TAB.py`'s `_rebuild()` now uses a fixed
      per-card `DEFAULTS` dict (exact x/y/width/height) instead of the old
      column-flow layout math, so Reset Layout — and any fresh install with
      no saved layout yet — reproduces this exact arrangement.
- [x] Fix card disappearing behind others (z-order) when dragged toward the
      right/edge of the canvas — turned out Jacob wanted overlap rejected
      outright, not just a z-order fix. `EditableCard` now checks a
      proposed move/resize against every other card's rect
      (`_overlaps_any()`) and refuses the move/resize entirely if it would
      intersect a sibling, for both body-drag and all four edge grips
      (`editable_layout.py`).
- [x] Fix cards getting clipped/cut off after being dragged to the right —
      `EditableCanvas._update_canvas_size()` only called `setMinimumSize()`,
      which is just a constraint since the canvas has no QLayout of its
      own; nothing ever actually resized the widget, so the outer
      `QScrollArea` (`setWidgetResizable(False)`, scrolls based on the
      canvas's real size) clipped anything dragged past the canvas's last
      real size. Added an explicit `self.resize(...)` alongside
      `setMinimumSize()` (`editable_layout.py`). Follow-up: this still
      clipped during a live drag itself (only fixed on mouse release)
      because the canvas-size update only fired once, on the `moved`
      signal at release — now fires on every `mouseMoveEvent` too, so the
      canvas/scrollbar track the card in real time while dragging.
- [x] Fix drag stutter — emitting `moved` on every `mouseMoveEvent` (the
      clipping fix above) meant `_update_canvas_size()` ran full
      `resize()`/`setMinimumSize()` calls on every pixel of every drag.
      Now skips the actual resize when the target size hasn't changed
      (`editable_layout.py`).
- [x] Fix drag freezing completely once a card's edge touches a neighbor's
      — the overlap check tested the whole (x, y) move as one unit, so any
      diagonal drift while touching got rejected outright, even on the
      axis that wasn't actually the problem; felt fully stuck until
      release + a fresh drag. `mouseMoveEvent` now tries x and y
      independently, so sliding along a touching edge still works
      (`editable_layout.py`).
- [x] Verify no-overlap holds with the new fixed-height + internal-scroll
      approach (repeat Reset Layout testing a few times in a row) —
      confirmed by Jacob
- [x] Settings/Status page needs the same editable-layout treatment as
      Dashboard eventually (once the Dashboard approach is solid/verified) —
      done: drag/resize/save/reset all working on Settings now, same as
      Dashboard.
- [x] Settings: the Refresh Data button is currently not movable or resizable
      like the other cards — it had no title-bar header like every other
      card, so `EditableCanvas._install_inner()` (which always pulls the
      content's first child out as the header/drag handle) grabbed the
      button itself; a `QPushButton` swallows its own mouse-press events,
      so clicks never reached the card to start a drag. Wrapped it in a
      real card header via `self._card()` (`STATUS_TAB.py`).
- [x] Bake Jacob's tuned Settings/Status layout into the shipped code
      default, same fix (and same mistake, twice) as Dashboard — edits to
      `status_layout.json` alone don't survive Reset Layout, which
      rebuilds from code. `STATUS_TAB.py`'s `_setup_ui()` now uses a fixed
      `STATUS_DEFAULTS` dict (exact x/y/width/height per card, replacing
      the old row-group/flow layout math) so Reset Layout — and any fresh
      install — reproduces the real arrangement: Live Status left-aligned
      only, Refresh Data's right edge matching every other card's right
      edge (900), everything else already full-width.
- [x] Settings resize issues found during testing: (1) cards could be
      shrunk well past the point their content could fit, clipping text —
      raised `editable_layout.py`'s per-card minimum width from a
      hardcoded 180 to a named `MIN_CARD_WIDTH = 260`; (2) Overlay
      Display's Save Monitor Choice / Reset Position buttons shrank
      unevenly (Reset squeezed to unreadable, Save barely moved) because
      their row had no stretch factors — gave both equal stretch
      (`STATUS_TAB.py`); (3) the Colorblindness Reference chart's swatch
      colors were hand-picked hex values that had drifted from the
      theme's real colors (e.g. Naramon showed `#f0f0f0` while its real
      accent is `#ffbe40`) — now pulled live from `get_palette(name)
      ['accent']` so it's an honest preview of what picking that theme
      actually looks like.
- [x] Colorblindness Reference chart follow-up: per-item `setBackground()`/
      `setForeground()` on a `QTableWidgetItem` got silently overridden by
      the table's own `setStyleSheet()` (real Qt/QSS quirk: a style sheet
      on an item view takes over item painting, ignoring the model's own
      brushes) — rebuilt as plain `QLabel` cells in a `QGridLayout`
      instead, each row styled directly with that theme's real
      `bg_panel`/`fg` (`STATUS_TAB.py`). The top single-theme preview box
      (`_cb_info_lbl`) had the same class of bug in a different spot: its
      background/border used the currently-*applied* app theme instead of
      the theme being *previewed* in the dropdown, so e.g. picking Naramon
      showed Naramon's name in gold sitting on whatever theme (e.g.
      Madurai) happened to be actually applied — fixed to restyle the
      whole box per-preview too.
- [x] `_action_btn`'s buttons had a hard floor at their full text width —
      a plain `QPushButton`'s minimumSizeHint is basically its full text,
      so no stretch factor can shrink it below that, which is also why
      cards clipped instead of buttons shrinking gracefully. Added
      `_ElidingButton` (`STATUS_TAB.py`), a `QPushButton` subclass that
      elides its own text with `…` as it narrows.
- [x] Settings page couldn't scroll horizontally at all — outer
      `QScrollArea` had `setWidgetResizable(True)` + horizontal scrollbar
      forced off, so any 900px-wide card was hard-clipped with the window
      narrower than that and no way to reach the rest. First fix attempt
      (flip `setWidgetResizable` to `False`) blanked the entire page
      instead, because the canvas was wrapped in an extra `content`
      widget that only auto-sizes when `widgetResizable` is `True` -
      turning it off with that wrapper still in place left `content` at
      zero size. Fixed by removing the wrapper entirely and giving the
      canvas directly to the scroll area, matching Dashboard's already-
      working structure (`STATUS_TAB.py`).
- [x] Obsidian theme redesigned — it shared its exact `bg_panel`/`fg`
      values with Naramon in `theme.py` (both independently landed on
      `#181818`/`#f0f0f0`), making two supposedly-distinct themes nearly
      indistinguishable. Redone as a genuinely darker near-black with a
      cool blue-violet sheen throughout (fg/border/accent all shifted
      cooler), instead of Naramon's warm neutral-gray/gold. Updated in
      both `THEME_OBSIDIAN` (stylesheet) and `THEME_PALETTES["Obsidian"]`
      (per-widget palette dict) since they're maintained separately.
- [x] "File Paths card still cuts off" turned out not to be the scroll bug
      at all (confirmed via temporary debug prints in
      `_update_canvas_size()` — canvas really was resizing correctly to
      fit its widest card). The `paths` card's own saved width in
      `status_layout.json` had been narrowed to 434 (vs. 900 for every
      sibling card), almost certainly from an accidental drag during
      testing — widened back to 900 to match. Follow-up: rebuilt the
      card's construction from scratch (new `QFrame`, new header, new
      layout) instead of continuing to patch the original — but adding
      `setMinimumWidth(900)` during that rebuild was itself a bug: it
      meant the card could never shrink below 900 regardless of what the
      outer `EditableCard` wrapper was set to, so narrowing it just left
      content overflowing/clipped instead of actually resizing like every
      other card. Removed that, and added `_ElidingLabel` (same idea as
      `_ElidingButton`) for the "Found: /long/path..." status labels,
      which had no text truncation at all - narrowing the card would
      otherwise still clip them mid-character instead of showing `…`.
      Outer-box-narrower-than-content symptom (visible rounded card
      border stops short of the actual content width) was NOT introduced
      by the "from scratch" rebuild attempt — pre-dated it, back when the
      card used the same `self._card()` helper every other card uses.
      **Actual root cause (found by Codex after Claude failed to solve it
      across many attempts)**: the path `QLineEdit` had a hard
      `setFixedWidth(260)` and the "Found: /path" status `QLabel` had no
      way to shrink below its natural text width — so the row's real
      minimum width was wider than whatever the card had actually been
      resized to, and the row just overflowed the frame instead of the
      frame tracking it. Fixed in `STATUS_TAB.py`: the edit is now
      `setMaximumWidth(260)` + `setMinimumWidth(0)` + `Expanding` size
      policy, and the status label uses `QSizePolicy.Ignored` so it can
      go narrower than its text's sizeHint, paired with the earlier
      `_ElidingLabel` fix so it shows `…` instead of raw clipping once it
      does. **Status: fix applied and syntax-verified, NOT YET
      user-confirmed in the running app** — Jacob hit session limits
      switching between assistants; next step is just to have him
      relaunch and confirm the File Paths card now resizes/displays
      correctly at both wide and narrow window sizes, same as its
      siblings.

## Priority 1 — the actual reported bug (relic reward overlay failing in endless Defense)

- [x] Fix reward trigger: detector now uses the authoritative
      `ProjectionRewardChoice.lua: Got rewards` event instead of ambiguous SWF
      creation, with a regression test proving the endless-mission continue
      transition does not trigger a capture (`src/bin/main.rs`). Syntax and
      formatting were inspected; focused test compilation is blocked in the
      Codex shell by the missing native Leptonica `lept.pc` dependency.
- [x] Wire up the dead `pre_capture_sleep_ms` config value (Rust hardcoded
      1500ms regardless of `config.json`). Added a `--pre-capture-sleep-ms`
      CLI flag to `src/bin/main.rs` (default `1500`, threaded through
      `log_watcher()` in place of the hardcoded `Duration::from_millis
      (1500)`), a `get_pre_capture_sleep_ms()` getter in `paths.py`, and
      wired all three places that launch/restart the detector
      (`autostart_manager.py`, `control-panel.py`, `STATUS_TAB.py`) to pass
      the flag — only when it differs from 1500, matching the existing
      `--hotkey` convention that avoids breaking older orbiter binaries
      that don't know the flag yet. **NOT compile-verified**: `cargo check`
      is blocked in this sandbox by the same missing native Leptonica
      (`lept.pc`) dependency Codex hit earlier — needs a real build/test on
      Jacob's actual dev machine before trusting it fully. Warned in
      Priority 2's item below: `warframe-watcher.py`'s `restart_wfinfo()`
      still doesn't pass `--hotkey` OR this new flag at all (pre-existing,
      separate bug, not touched here).
- [x] Stop publishing empty/garbage OCR states as valid detections; fix overlay
      consume-before-validate ordering so a bad capture doesn't permanently
      block/clear a good display (`overlay_gtk.py`, `overlay.py`). Two-part
      fix: (1) `src/bin/main.rs`'s `run_detection()` now returns early
      (without writing `latest-detection.json` at all) when OCR resolves
      zero rewards, instead of publishing an empty-rewards "detection" as
      valid; (2) added a monotonic `seq` counter (`AtomicU64`) written
      alongside the existing whole-second `timestamp` field - the overlay
      previously compared only on `timestamp`, and a bad capture followed
      shortly by a real one within the same wall-clock second would look
      like a duplicate and get silently skipped (this exact bug was
      already found and fixed once before for the relic-recommend overlay
      specifically, see `overlay_gtk.py`'s `RelicRecommendOverlay`
      2026-07-21 comment - same root cause, different overlay). Both
      `overlay.py` and `overlay_gtk.py`'s reward `Overlay.poll()` /
      `_poll()` now key off `seq` (falling back to `timestamp` for an
      older, not-yet-rebuilt detector binary), and mark a state consumed
      immediately but only *act on it* (show/hide) once `rewards` is
      confirmed non-empty - defensive backup for the Rust-side fix, in
      case an old binary is still running. **NOT compile/runtime-verified
      — same Leptonica sandbox limitation as the item above; Python
      changes are syntax-checked only, not exercised against a live
      detector.**
      **UPDATE 2026-07-25: live-tested by Jacob against a real in-game
      reward capture — the reward trigger, `seq`/`state_id` tracking, and
      empty-detection guard all worked correctly end to end** (real
      reward names/statuses showed up in the overlay from an actual
      detection, not a synthetic test; `state_id=0` in the log also
      confirms the rebuilt binary is genuinely running the new `seq`
      counter, not falling back to the old timestamp). This is the first
      of the Rust changes to get genuine runtime confirmation, not just a
      syntax check.
      **New issue found from this same live test**: overlay didn't
      appear until ~3 seconds were left on the reward-choice timer -
      `orbiter.log` had timestamps fully disabled
      (`.format_timestamp(None)`), making it impossible to tell how much
      of that delay is the configured 2.5s `pre_capture_sleep_ms` vs.
      actual OCR/capture time. Enabled millisecond timestamps
      (`format_timestamp_millis()`) so the next real capture would show
      the actual breakdown.
      **Follow-up measurement**: with timestamps enabled, one real
      capture showed `Detected, waiting...` → `Wrote state file` took
      only ~3.8s total (2.5s configured sleep + ~1s screenshot + ~0.3s
      OCR) - overlay's own poll interval is 250ms, negligible. That's
      nowhere near enough to explain an ~12s perceived delay on its own,
      so the missing time is most likely happening *before* the Rust
      trigger even fires - i.e. between the reward screen visually
      appearing and Warframe's own client actually writing the "Got
      rewards" line to EE.log, which is outside this app's control (and
      possibly an inherent side effect of the reward-trigger fix now
      correctly waiting for that authoritative-but-later event instead
      of the old buggy-but-earlier one). **However, a second live test
      the same session showed the overlay appearing after only ~2s with
      no perceived delay at all** - so the delay is inconsistent/
      variable, not a reliable reproduction. Not resolved, not clearly
      a bug in this codebase either - needs more data points (ideally
      several `orbiter.log` timing captures across both a "fast" and
      "slow" case) before concluding anything further. One lever fully
      within Jacob's control if he wants to experiment: `pre_capture_sleep_ms`
      is 2.5 of the 3.8s measured pipeline time and is user-configurable
      in Settings.
- [x] Replace the fixed-delay reward capture with bounded adaptive retries
      after Jacob's five-round Defense test showed visibly inconsistent
      timing and one all-blank OCR result. The millisecond detector log only
      proved that the work *after* `Got rewards` was consistently ~3.6s; it
      did not prove that the screenshot landed at a consistent point in the
      visible 15-second reward countdown. Changes in `src/bin/main.rs`:
      automatic reward events now capture immediately and make up to four
      attempts with 250ms between rejected attempts; manual hotkey captures
      remain single-shot. A capture counts as valid only when at least one
      OCR result resolves to a real database item. This fixes the earlier
      incomplete `resolved.is_empty()` guard, which incorrectly accepted four
      blank strings because they had already been converted into four
      `Ownership::Unknown` placeholder entries. Invalid captures are never
      published and are retained with millisecond filenames under
      `DATA_DIR/failed-captures/` so a later successful retry cannot overwrite
      the evidence. Every attempt, success/failure, and total elapsed time is
      logged with milliseconds. The old `pre_capture_sleep_ms` CLI argument is
      still accepted for launcher/backward compatibility but is logged as a
      legacy setting and no longer delays automatic capture.
      Added end-to-end timing instrumentation too: detector state now includes
      `written_at_ms`; `overlay_gtk.py` now actually appends to its previously
      declared-but-unused `DATA_DIR/overlay-gtk.log` with millisecond ISO
      timestamps and logs both state age at poll and state-to-`show_all()`
      latency. **Verification attempted 2026-07-25:** `rustfmt` completed on
      `src/bin/main.rs`; `python3 -m py_compile overlay_gtk.py` passed; and
      `git diff --check` passed for both edited files. `cargo check --bin
      orbiter` was attempted and remains blocked before compiling this crate
      because the host lacks Leptonica's `lept.pc` pkg-config file (same known
      environment limitation as earlier work). A full `cargo fmt -- --check`
      also reports pre-existing formatting differences in `src/ocr.rs`; the
      edited `main.rs` itself was formatted. **LIVE TEST 2026-07-25:** Jacob
      completed six endless-Defense reward rounds. Every overlay appeared with
      about 4 seconds visibly remaining. The new GTK timings were only 21-83ms
      from detector state write to `show_all()`, ruling out overlay polling or
      rendering as the delay. Detector logs showed all six captures succeeded
      on attempt 1 in ~1.1-1.24s, proving the adaptive retries never engaged
      because the `Got rewards` trigger itself arrived late. EE.log provides a
      better event: `VoidProjections: OpenVoidProjectionRewardScreenRMI` occurs
      about five seconds before `Got rewards` and is specific to opening the
      real relic reward flow, unlike the ambiguous SWF creation signal. Follow-
      up applied: trigger on that earlier RMI and raise the bounded automatic
      attempts from four to six so retries span the five-second reveal phase.
      During the same test, three remaining players correctly produced three
      cards, but two remaining players produced four OCR slots with the blank
      outer two displayed as `UNKNOWN`. Follow-up applied: retain valid known
      rewards but filter `Ownership::Unknown` placeholders from the published
      JSON, so this two-player layout produces only the two real cards.
      **REBUILT LIVE TEST 2026-07-25 — MIXED RESULT:** Jacob reported immediate
      display for five rounds, but round 3 displayed with only 4 seconds left
      in the actual item-selection window. EE/orbiter logs contain six relic
      reward-choice events; every capture succeeded on attempt 1 in 1.23-1.61s
      and GTK displayed the written state in 7-98ms. Those measurements prove
      capture/OCR and GTK were fast after the RMI; they do not contradict the
      observed late overlay. The RMI itself was late relative to the visible
      reward-selection screen in round 3, so timing is not fully resolved. A
      reduced three-player round correctly published and displayed exactly
      three cards. A two-player round was not available in this retest, so
      exact two-card rendering remains an opportunistic follow-up.
- [ ] DEFERRED BY JACOB 2026-07-25 — Resolve the remaining intermittent late reward trigger. In the rebuilt
      six-event Defense test, five overlays were immediate but one appeared
      with only 4 seconds left to choose the item, despite first-attempt OCR
      and sub-100ms GTK display. The next investigation must identify an event
      that reliably precedes the *visible* choice screen; RMI timing alone is
      not reliable enough.
      **LIVE UPDATE 2026-07-28:** a 21-round Defense mission with rewards
      every 3 rounds showed every overlay within about one second of the cards
      becoming visible. One rotation needed five attempts over ~7 seconds from
      the deliberately early RMI event, but those attempts covered Warframe's
      reveal/loading phase; no user-visible late overlay occurred. Keep this
      deferred unless the symptom recurs.
- [x] NEW (found during the above live test, not on the original list) —
      reward overlay text wasn't wrapping at all for long item names
      (e.g. "Harrow Prime Systems Blueprint"), overflowing past its
      column instead. Root cause in `overlay_gtk.py`: `set_line_wrap
      (True)` alone doesn't force GTK to actually wrap - without
      `set_max_width_chars()`, GTK still computes the label's *natural*
      size as the full unwrapped single-line width. A prior comment had
      deliberately skipped `set_max_width_chars()` reasoning it would
      "request its own preferred width independent of the column" -
      backwards: `set_max_width_chars(1)` is the standard fix for exactly
      this, since it caps the *natural size request* down to ~nothing,
      letting the column's actual allocated width (the real reward box's
      width, from the existing `rect`-based `set_size_request()`) govern
      wrapping instead. Also added a sensible fallback column width
      (reusing the existing `REFERENCE_BOX_WIDTH` reference) for when no
      `rect` is available (older orbiter binary / synthetic test
      detection), since `set_max_width_chars(1)` with no width
      constraint at all would otherwise wrap to one word per line.
      **LIVE-TESTED AND CONFIRMED 2026-07-25** — Jacob verified during a real
      reward detection that long item names now wrap cleanly.

## Priority 2 — reliability / crash hardening

- [x] Unify detector launch/restart construction — `autostart_manager.py`,
      `control-panel.py`, and `STATUS_TAB.py` each independently rebuilt the
      same "EE.log override + --hotkey + --pre-capture-sleep-ms" arg list,
      and `warframe-watcher.py`'s `restart_wfinfo()` (triggered on every
      Warframe restart) built none of it at all, plus hardcoded a
      Linux-only binary path with no Windows `.exe` handling and no
      `LD_LIBRARY_PATH` cleanup. Added one shared `build_detector_args()`
      in `paths.py` (actually test-executed in this sandbox, not just
      syntax-checked - confirmed it correctly picks up the real
      auto-detected EE.log path and a live `pre_capture_sleep_ms`
      override) and switched all three "normal launch" call sites to use
      it. For the watcher specifically, rather than adding a *fourth*
      copy of the Linux/Windows branching + env-cleanup logic, its
      `restart_wfinfo()` now just calls `autostart_manager._start_detector()`
      directly (already imported there) - one single implementation of
      the actual launch, reused everywhere. Verified by actually importing
      `warframe-watcher.py` and `autostart_manager.py` in this sandbox
      (with a `psutil` stub, since real `psutil` isn't installed in this
      environment's system Python) and confirming both modules load and
      `restart_wfinfo`/`_start_detector` resolve correctly - stronger
      verification than a plain syntax check, though still not a live
      Warframe-restart test.
- [x] Remove production OCR panics (`unwrap()`/`expect()`
      in `src/ocr.rs`, including an unconditional debug `input.png` write)
      and harden the log watcher against `EE.log` truncation/rotation.
      Completed: (1) the unconditional `image.save("input.png").unwrap()`
      no longer panics on a write failure (permissions/disk full/read-only
      cwd) - now logs a warning instead, matching the non-panicking
      pattern `main.rs` already uses for its own debug image dumps;
      (2) `OCR.lock().unwrap()` (both call sites) now recovers from a
      poisoned Mutex instead of panicking - previously, if a single OCR
      call ever panicked while holding that lock, the Mutex would stay
      poisoned forever and every future call would also panic,
      permanently breaking the detector for the rest of the process's
      life; (3) `log_watcher()`'s per-event handling in `src/bin/main.rs`
      no longer panics on a transient reopen/seek/metadata failure (EE.log
      briefly missing during Warframe's own log rotation used to kill the
      whole watcher thread on one bad event) and now actually detects
      truncation (current file length < last read position) and resets to
      reading from the start instead of seeking past the new EOF and
      silently missing everything written since. Completed: the deeper
      Tesseract-related panics inside `image_to_string()`
      (`tesseract.take().unwrap()`, `.expect("Failed to set image")`,
      `.expect("Failed to get text")`, and `Tesseract::new(...).expect(...)`
      at lazy_static init) now return/log recoverable errors. Only the
      low-level `image_to_string()` signature changed to `Result`; stable
      reward-name APIs convert a failed card to an empty placeholder, which
      existing capture validation rejects safely, so other binary callers do
      not require a signature cascade. Tesseract initialization is lazy and
      retryable, and final mutex cleanup also recovers poison.
      **VERIFIED 2026-07-25:** Jacob's host `cargo build --release --bin
      orbiter` completed successfully after these OCR changes. A new host build
      is still required for the later dependency modernization below.
- [x] Fix Linux fresh-install detector location mismatch — `download_helper.py`
      writes to `WFINFO_DIR/orbiter`, but launchers expect
      `WFINFO_DIR/target/release/orbiter`. `launch-orbiter.sh` (a symlink
      to `launch-wfinfo.sh`) only ever checked `target/release/orbiter` -
      added a fallback to the flat `./orbiter` path, mirroring the
      fallback Windows' own `launcher.py` resolution already has for
      `orbiter.exe` next to the app, rather than moving where the
      downloader writes (target/ is cargo's own directory; a downloaded
      binary living there would get silently deleted by `cargo clean`).
      Errors clearly if neither path exists instead of failing
      obscurely. Verified with `bash -n` (real syntax check, not just a
      read-through).
- [x] Fix `launch-wfinfo.sh` shell bug — `local` used outside a function with
      `set -e` kills the fallback recovery path instead of running it; also
      leaks a temp dir per detector launch (cleanup can't run after `exec`).
      (1) `local fallback` was inside a top-level `for` loop, not a
      function - bash's `local` fails outright there ("can only be used
      in a function"), and with `set -e` active that killed the whole
      script exactly when the fallback path was needed (right after the
      primary copy had already failed) - so the fallback logic never
      actually ran. Changed to a plain assignment. (2) the no-op
      `notify-send` shim used `mktemp -d` - a brand new directory every
      single launch, with no cleanup possible since the script always
      ends by `exec`-ing the orbiter binary, which replaces the shell's
      process image entirely (an `EXIT` trap would never fire either -
      `exec` bypasses normal shell exit). Switched to one fixed, reused
      path under `$XDG_CACHE_HOME` instead of an ever-growing pile of
      orphaned temp dirs. Verified with `bash -n`.
- [x] Consolidate conflicting
      autostart systems: `install.sh` still creates legacy
      `~/.config/autostart/orbiter-overlay.desktop` +
      `orbiter-watcher.desktop` XDG login-autostart entries, fully
      independent of `autostart_manager.py`'s own in-app autostart
      system - confirmed both exist and can genuinely double-launch
      overlay/watcher. Deliberately not touched overnight: deciding which
      mechanism should be authoritative (and what happens to users who
      already ran `install.sh` and rely on the OS-level entries) is a
      product decision, not a code fix - the wrong unilateral call here
      (e.g. silently deleting the `.desktop` files) could break autostart
      for existing installs with no one awake to notice. Needs Jacob's
      input on the intended direction before touching it.
      **DECIDED/IMPLEMENTED 2026-07-28:** Jacob chose the in-app Auto-Start
      panel as the single authority. `install.sh` no longer creates the legacy
      overlay/watcher entries; `install.py` and app startup migrate the two
      exact old filenames to recoverable non-`.desktop` backups. Unrelated
      autostart entries are untouched. Added focused migration tests.
- [x] Fix overbroad process kill/singleton logic — `find_processes()`/
      `kill_processes()` match by substring (can kill unrelated processes);
      GTK overlay singleton PID files don't check process identity/start time
      before signaling. Three-part fix, actually test-executed in this
      sandbox (with fake `psutil` process objects, since real `psutil`
      isn't installed in this environment's system Python), not just
      read through: (1) `platform_utils.py`'s `find_processes()` used to
      join the entire cmdline into one string and substring-match against
      that (`pattern in " ".join(cmdline)`), which could match across the
      boundary between two unrelated arguments - now matches each cmdline
      argument individually; (2) confirmed via an actual test run that
      this alone wasn't enough - the bare `"orbiter"` pattern used by two
      "Restart Detector" button handlers (`STATUS_TAB.py`, `control-
      panel.py`) still matched a fake unrelated process (`vim /home/
      user/orbiter-notes/todo.txt`) even under per-argument matching,
      since "orbiter" is a genuine substring of that single argument -
      switched both call sites to the two specific canonical patterns
      (`"target/release/orbiter"`, `"orbiter.exe"`) already used
      elsewhere (`autostart_manager.py`'s `_PROCESS_PATTERNS`), confirmed
      via the same test run to match only the real detector process, not
      the fake unrelated one; (3) both `overlay.py`'s and `overlay_gtk
      .py`'s singleton-lock `os.kill(old_pid, signal.SIGTERM)` fired at
      whatever PID was on record with zero verification it still WAS that
      overlay process - since the OS reuses PIDs once a process exits,
      this could kill a completely unrelated process. Both now use
      `psutil.Process(old_pid)` to check the recorded PID's actual
      cmdline still contains `"overlay.py"`/`"overlay_gtk.py"` before
      calling `.terminate()`, logging instead of signaling if it doesn't
      match.

- [~] Investigate Riven inventory overlay not appearing. **REPORTED 2026-07-25:**
      while viewing Rivens in the in-game inventory, no Riven overlay appears at
      all. **ROOT CAUSE CONFIRMED:** the watcher and overlay are healthy (26
      Rivens graded and shown without crash errors), but the overlay only reacts
      to periodic `inventory.json` refreshes and auto-hides after two minutes.
      Opening the Riven inventory emits no state change and there is no
      screen-open detector to show it again. Remaining behavior clarified by
      Jacob: match AlecaFrame's Riven Reroll overlay, automatically appearing when a Riven is selected for rerolling; show the
      selected old roll on the initial `CYCLE FOR` screen, then compare the old
      roll on the left with the new option on the right on the `CONFIRM` screen.
      Implement both screen states using visual/OCR detection and selected-card
      matching, rather than displaying the full owned-Riven list. Implemented:
      orbiter now performs debounced,
      resolution-normalized OCR for `INVENTORY / MODS` plus `CYCLE FOR` or
      `CONFIRM`, publishes `riven-screen.json`, and shares a capture lock with
      reward OCR. The GTK overlay is screen-state-driven, matches the selected
      weapon against owned Rivens, shows one roll on Cycle and an old/new layout
      on Confirm, and grades visible new stat combinations without inventing an
      unavailable pre-selection perfectness value. Added both supplied
      screenshots as fixture tests. **HOST TEST CONFIRMED 2026-07-25:** both
      Cycle and Confirm fixtures pass after restricting Confirm OCR to the card
      text panels and recognizing Warframe's deliberately dimmed old-card
      lavender by hue. Pending only: a live two-screen reroll test.
- [~] Modernize Riven grading so the several-year-old 416-weapon community
      spreadsheet is historical seed guidance, not a supposedly definitive
      universal grade. Research completed in `RIVEN_GRADING_RESEARCH.md` against
      calamity-inc/warframe-riven-info and its browse.wf Riven calculator,
      ruali-dev/Riven-Analyst, RivenForge, WFCD, Warframe.Market, Overframe.gg,
      and current appraisers. Next implementation should
      separate objective stat perfectness from contextual desirability; use
      current WFCD weapon/variant/disposition facts; add versioned, explainable,
      player-editable positive/negative profiles with source/review metadata;
      return REVIEW on stale/missing/uncertain knowledge; and keep market value
      separate. Independently adopt the robust OCR concepts (generated-name
      decoding, CONFIRM-relative card location, physical limits, repeated-frame
      consensus) without copying RivenForge code, whose repository is unlicensed.
      **IMPLEMENTED 2026-07-25:** the bundled dataset now declares its historical
      spreadsheet provenance and unreviewed status; its UI/overlay verdicts are
      explicitly ADVISORY, missing/empty profiles return REVIEW, and grader state
      carries source, review status, and an explanation trace. Optional
      app-data `riven_profiles.json` entries override individual weapons as
      player-authoritative guidance; a documented example and fallback tests
      were added. Objective curse perfectness now correctly uses browse.wf's
      inverse scale. Eight focused grader tests pass directly. **VERIFIED
      2026-07-25:** Jacob ran the complete host suite after the initial slice:
      34 passed in 5.63s, then 36 passed in 6.35s after variant/OCR-shape tests.
      Current WFCD-compatible variants now travel with grader state and appear
      in the detail panel with exact attenuation and UI disposition; multiple
      variants are shown as candidates because the fingerprint identifies a
      family, not the player's intended variant. Impossible/incomplete visible
      stat counts now return REVIEW instead of a reroll grade. Ten focused
      grader tests pass directly. Repeated-frame consensus is implemented
      without delaying overlay appearance: the first frame opens the overlay as
      VERIFYING OCR, and a new-roll grade is allowed only after a second
      identical capture. **VERIFIED 2026-07-25:** both release-mode Rust Riven
      fixtures pass and the refreshed complete Python suite passes (36 tests in
      6.23s). Automatic FITS IN OCR now resolves the exact displayed compatible
      variant (for example Tenet Arca Plasmor), feeds it into consensus, and
      shows that variant's current WFCD attenuation in the live overlay; fixture
      and full-suite reruns are pending. Eleven focused grader tests pass
      directly. Remaining modernization: optional same-condition build
      analysis. **GENERATED-NAME DECODING IMPLEMENTED 2026-07-25:** the
      wiki naming chart correctly points to DE's official
      `ExportUpgrades_en.json`; the current export and this project's cleaned
      `ExportUpgrades.json` both retain each randomized-mod entry's `tag`,
      `prefixTag`, and `suffixTag`. Generate the decoder from those official
      fields instead of copying the wiki or an unlicensed parser table. The
      checked-in 62-entry offline fragment cache exactly matches DE's current
      export, and the canonical game-patch updater now resolves DE's hashed
      manifest URL, regenerates the cache, validates at least 50 entries, and
      commits atomically. Live OCR decodes two- and three-positive names using
      the selected weapon class, fills missing visible positives from the name,
      and returns REVIEW when name and visible-stat OCR conflict. Thirteen
      focused grader tests pass directly. **VERIFIED 2026-07-25:** both
      release-mode Rust fixtures pass with the FITS IN assertion, and the
      complete host Python suite passes (40 tests in 5.45s). Remaining required
      validation is a live two-screen reroll. **PRODUCTION BUILD VERIFIED
      2026-07-25:** Jacob's `cargo build --release --bin orbiter` completed in
      3.56s. Added `capture_riven_diagnostics.py` to timestamp every unstable/
      stable screen-state transition and bundle detector/overlay logs plus
      graded state during that live test. Optional same-condition build analysis requires a separate
      product/metric decision. **LIVE DIAGNOSTIC 2026-07-25:** the first bundle
      captured 19 state transitions. Meaningful card and FITS IN text repeated
      consistently, but animated-screen OCR garbage changed on every capture,
      so exact raw-text consensus never reached `stable=true` and no grade was
      shown. **USER OBSERVATION:** no overlay appeared at any point during this
      diagnostic run, including no visible VERIFYING OCR state. Replaced raw
      equality with semantic token consensus: matching
      screen mode/card count plus at least two shared meaningful tokens and 60%
      overlap per card/variant now stabilizes animation-noisy captures, while a
      genuinely changed roll resets verification. Added a Rust regression test
      using the captured Confirm text. **HOST VERIFIED 2026-07-25:** all three
      focused Riven tests pass (including both screen fixtures and animation-noise
      consensus), and the release orbiter build succeeds. The shutdown-only
      Tesseract ObjectCache warnings did not fail the tests. Pending only: a live
      two-screen reroll retest confirming that an overlay now actually appears.
      **SECOND LIVE DIAGNOSTIC 2026-07-25:** detector consensus succeeded for
      both Cycle and Confirm, and the overlay process logged six show calls, but
      the user saw no overlay. Root cause was the persisted GTK position
      `{top: 15078, right: 1479314}`, which placed the window far off-screen.
      The shared GTK drag helper now rejects invalid saved margins back to the
      visible defaults and clamps future movement to the selected monitor.
      Python syntax validation passes; host Python regression suite and one
      restart/live visibility check remain pending.
      **THIRD LIVE DIAGNOSTIC:** still no visible overlay despite fresh process
      startup and four successful show calls; the corrupt position file had not
      been rewritten. Recovery now persists corrected coordinates immediately,
      and the Riven window uses the same proven TOP+LEFT anchoring as the working
      reward/fissure overlays. Post-show logs now report GTK visible/mapped state,
      allocation, and effective margins. Another restart/live check is pending.
      **FOURTH LIVE DIAGNOSTIC:** overlay visibility is finally confirmed, but
      repeated OCR misses made it appear for 1–2 seconds, disappear for roughly
      10 seconds, and prevented consensus from leaving VERIFYING OCR. The
      detector now retains its visible state and pending/stable signature across
      eight misses (~12 seconds) instead of clearing after two. The temporary
      top-left debugging position is restored to the intended top-right anchor.
      Grader criteria are now persisted with each owned/visible Riven, and the
      overlay explicitly labels GOOD/OFF-TARGET positives, SAFE/RISKY negatives,
      MISSING REQUIRED stats, and the full grade explanation. Rust formatting
      and Python syntax checks pass. **HOST VERIFIED 2026-07-25:** all three
      focused Riven tests pass, the release build succeeds, and the complete
      Python suite passes (40 tests in 6.12s). A pre-build overlay remained
      stuck after leaving the reroll screen, exposing a stale-state failure mode:
      the detector now refreshes `written_at_ms` as a live heartbeat while the
      screen is positively detected, and GTK hides any visible state whose
      heartbeat is older than 18 seconds. Heartbeats are excluded from the UI
      render signature to avoid rebuild flicker. Pending rebuild/restart of this
      final safeguard and one live Cycle/Confirm/exit confirmation.
      **FIFTH LIVE DIAGNOSTIC:** visibility/consensus and eventual exit now work,
      but live UX is not yet acceptable: Confirm detection lagged, the compact
      panel was tiny and misplaced, GTK rejected the new assessment lines due to
      unquoted markup attributes, and physical card positions caused CURRENT/NEW
      identities to flip when the player selected the old roll. Confirmed against
      AlecaFrame's official docs that CURRENT must remain left and NEW OFFER right,
      with readable per-attribute grading and best/worst guidance. Began replacing
      the legacy compact inventory-list presentation: detector cadence is 500 ms
      while retaining a 24-miss (~12 s) debounce; active-theme CSS now scales from
      Warframe geometry with substantially larger text/panels; layout is positioned
      relative to the game card area; markup is corrected; the selected current
      Riven and last valid new offer are cached so selection animation cannot swap
      their identities; provisional new grading appears on the first physically
      valid capture. Rust formatting and Python syntax pass. Pending host tests,
      build, live visual verification, and further AlecaFrame-parity work for
      per-stat strength grades/market context beyond historical advisory guidance.
      **ALECAFRAME OCR RESEARCH 2026-07-25:** inspected the official readable
      Overwolf 2.6.90 OPK and documented the pipeline in
      `RIVEN_GRADING_RESEARCH.md`. AlecaFrame is event driven: Overwolf highlighted
      item data plus EE.log reroll lifecycle signatures trigger focused captures;
      it edge-crops each card with retry/rough-crop fallback, sends the crop to its
      private `/new/ocr/single` server, domain-validates the result, and maintains
      durable current-left/new-right state. Its overlay is a transparent full-game
      coordinate-space window, not a draggable corner panel. Next implementation
      must replace continuous full-screen discovery with an EE.log-driven local
      equivalent, retaining visual polling only as fallback; private server OCR
      cannot and should not be copied. **EVENT-DRIVEN TRIGGER IMPLEMENTED
      2026-07-25:** Orbiter now classifies the exact live EE.log messages for
      reroll Diorama setup, Cycle confirmation, and selection confirmation.
      Those events immediately activate 500 ms focused local captures; inactive
      full-screen visual discovery is reduced to a five-second recovery probe.
      Opening a fresh reroll session resets prior OCR consensus, successful
      fallback discovery activates the fast session, and the existing 24-miss
      close debounce remains. Added a Rust classifier test using the exact log
      lines observed on this machine. The GTK overlay also clears cached current
      and offered rolls when the detector publishes a true invisible state.
      **HOST VERIFIED 2026-07-25:** all four focused Riven tests pass, the
      release Orbiter build succeeds, and the complete Python regression suite
      passes (40 tests in 5.90s). Tesseract emitted its known ObjectCache
      shutdown warnings after the successful Rust tests. Pending only restart
      and live Cycle/Confirm/offer-switch/exit UX verification.
      **SIXTH LIVE DIAGNOSTIC 2026-07-25:** first Cycle presentation took about
      eight seconds, disappeared once, then returned; Confirm initially exposed
      `bh` and subsequently cycled through corrupt sentences/currency symbols.
      The 92-transition bundle proves raw animated-frame OCR was republished on
      every heartbeat even after consensus. State publication now freezes the
      last confirmed snapshot, never exposes an unconfirmed frame, and shows a
      fixed reading placeholder until a new offer has two matching captures.
      Generated-name decoding now supplies canonical stat labels rather than
      raw punctuation. The one-time disappearance was a late Diorama event
      resetting an already confirmed visual fallback; late Opened events no
      longer reset an active session. The log also captured Spectacle blocking
      for eight seconds before returning success without a file, delaying event
      handling; screenshot child processes now have a two-second timeout.
      Pending host tests/build and another live verification.
      **SEVENTH LIVE DIAGNOSTIC 2026-07-25:** unacceptable self-capture was
      confirmed. The transition log shows Spectacle's desktop notification
      (`A screenshot was saved...`) entering the `FITS IN` OCR region at
      121 seconds and being promoted to stable state. Orbiter now rejects every
      variant crop lacking the literal normalized `FITS IN` anchor. The Riven
      window now uses the TOP layer, below Spectacle's OVERLAY-layer selection
      UI, so it cannot block interactive screenshots. Confirm placement moved
      below the header OCR crop and remains above all card/action crops; the
      window may exist in the desktop bitmap but cannot cover any detector ROI.
      This avoids a capture-hide handshake that would visibly blink every
      second. Added a Rust regression test using the captured Spectacle
      notification. Pending host tests/build and live timing/self-capture
      verification. **HOST VERIFIED 2026-07-25:** all five focused Riven
      tests pass, including the captured-notification rejection; the release
      build succeeds; and all 40 Python tests pass in 6.28s. The known
      non-failing Tesseract ObjectCache shutdown warnings remain. Pending only
      a complete application restart and live timing/screenshot-isolation UX
      verification. **EIGHTH LIVE DIAGNOSTIC 2026-07-25:** detector publication
      remained healthy (fresh stable Cycle states), but no overlay was visible.
      This isolates the failure to changing GTK from OVERLAY to TOP: TOP falls
      below fullscreen Warframe on this KDE/gamescope setup. Restored the proven
      OVERLAY layer. OCR isolation continues through non-overlapping placement
      and strict `FITS IN` validation rather than lowering the window. Pending
      Python regression and immediate live visibility retest; no Rust rebuild is
      required for this Python-only correction.
      **NINTH LIVE DIAGNOSTIC 2026-07-25:** overlay visibility returned, but the
      user measured 10 seconds for the first card, 3 seconds for the comparison,
      and 8 seconds to collapse back to one card. Logs show the application
      started a healthy Orbiter at 17:34:41, then the legacy Warframe watcher
      deliberately killed/restarted it at 17:34:52–58 because Warframe was
      already running. That X11-handle restart is obsolete with portal capture
      and has been removed. Inactive visual recovery is reduced from five to one
      second; GTK state polling is reduced from 1000ms to 100ms; and the real
      `SelectionConfirmed` EE.log event now collapses Confirm to Cycle
      immediately instead of awaiting readable post-animation OCR. Pending host
      tests/build and another measured live run.
      **TENTH LIVE REPORT 2026-07-25:** active detection monopolized Spectacle's
      single application instance, causing the user's screenshot action to
      become a background autosave instead of opening the screenshot UI. Linux
      capture now tries the already-linked xcap X11 monitor backend first and
      invokes Spectacle only if direct capture fails. The displayed
      `Ampi-lexipha` offer was incorrectly marked uncertain because the parser
      discarded wrapped `Ampi-` and decoded only `lexipha`; generated-name
      extraction now reconstructs two-line hyphenated names. Internal OCR
      conflict prose is no longer rendered in the live overlay. Immediate menu
      exit handling now distinguishes an unreadable animated card from loss of
      the stable `INVENTORY / MODS` menu anchor: anchor-present frames preserve
      confirmed content, while two anchor-absent captures close the overlay.
      Capture-backend failures never count as closure. With direct capture this
      targets roughly one-second removal instead of the former 24-miss delay.
      Parser-uncertain candidates are no longer eligible for the live NEW OFFER
      panel at all: the fixed reading placeholder remains until generated-name
      and visible-stat validation produce a real grade, so `REVIEW · uncertain
      OCR` and its internal wording cannot appear to the user.
      **BUILD CORRECTION:** first xcap build attempt failed because Cargo had
      declared xcap only under `cfg(windows)`. Moved the existing locked xcap
      0.9.7 dependency into cross-platform dependencies and adjusted its 0.9.7
      fallible monitor-name API. Python remained healthy (40 tests in 5.78s).
      Follow-up compilation reached the linker but xcap 0.9.7 required the
      unavailable system library `libgbm`. Switched to cached xcap 0.0.4, whose
      Linux capture backend uses XCB plus vendored D-Bus and does not link the
      GBM/PipeWire/Wayland capture stack. Added explicit raw-RGBA conversion
      across its image 0.24 boundary so the project retains image 0.25.
      **HOST VERIFIED 2026-07-26:** the corrected xcap 0.0.4 build links
      successfully; all five focused release-mode Riven tests pass in 0.54s;
      and `cargo build --release --bin orbiter` succeeds. The familiar
      Tesseract ObjectCache messages remain shutdown-only warnings. Cargo also
      reports that xcap 0.0.4 contains code subject to a future Rust rejection;
      direct XCB capture must therefore be treated as a working compatibility
      bridge, with replacement/upgrading still required before the affected
      future toolchain becomes mandatory.
      **LIVE XCAP VERIFIED 2026-07-26:** after the rebuilt Orbiter fully
      restarted, `orbiter.log` reports repeated `Screenshot via xcap monitor
      DP-1: 2560x1440` captures. The earlier Spectacle lines belonged to the
      preceding process. Direct capture is therefore active on the correct game
      monitor; the screenshot application should no longer be monopolized.
      **ELEVENTH LIVE UI REPORT 2026-07-26:** Spectacle now works normally and
      the Confirm overlay is visible, but the NEW OFFER leaked a raw negative
      OCR line (`... Damage to Grineer #?`), the heading unnecessarily said
      `CURRENT ROLL · ALWAYS LEFT`, and the historical profile explanation was
      excess live-screen prose. All positive and negative stat displays now use
      canonical legend labels after parsing (for example `-Damage to Grineer`),
      the heading is simply `CURRENT ROLL`, and explanation paragraphs are no
      longer rendered in the live overlay. Assessment labels and compact
      variant/reroll metadata remain.
      **PAUSE CHECKPOINT — 2026-07-25:**

      Completed in the current unverified build:

      - Removed the obsolete watcher behavior that killed and restarted a
        healthy Orbiter about ten seconds after application startup.
      - Reduced inactive Riven discovery to one second and GTK state polling to
        100ms; `SelectionConfirmed` immediately collapses Confirm to Cycle.
      - Preserved confirmed OCR snapshots instead of displaying changing raw
        frames; provisional/uncertain parser output and internal explanations
        are never eligible for the NEW OFFER panel.
      - Reconstructed wrapped generated names such as `Ampi-` + `lexipha` before
        official fragment decoding.
      - Rejected Spectacle notifications or other variant crops without the
        normalized `FITS IN` anchor.
      - Replaced the 24-miss close delay with two captures lacking the stable
        `INVENTORY / MODS` anchor, while animation/card OCR misses with that
        anchor present retain the confirmed overlay.
      - Added direct Linux xcap capture ahead of the Spectacle fallback so
        Orbiter should no longer monopolize the screenshot application. Fixed
        the initial Linux compile error by making locked xcap 0.9.7 a
        cross-platform Cargo dependency and using its fallible `name()` API.
      - Restored GTK's OVERLAY layer because TOP is hidden below fullscreen
        Warframe on this KDE/gamescope setup; placement remains outside all OCR
        regions.
      - Latest completed Python verification: 40 passed in 5.78s. The last
        previously released Rust checkpoint had five focused Riven tests and a
        successful release build, but predates the newest timing/xcap changes.

      Required after the break:

      - **COMPLETED 2026-07-26:** `cargo test --release --bin orbiter riven_
        -- --nocapture` passes all five tests and the release build succeeds
        with xcap 0.0.4.
      - Fully restart the application and confirm `orbiter.log` says
        `Screenshot via xcap monitor ...`. Treat any continuous
        `falling back to portal`/Spectacle capture as unresolved because it can
        still prevent normal screenshot-program use.
      - Confirm the screenshot program opens interactively while Orbiter is
        active and no screenshot notification can alter Riven state.
      - Measure first Cycle appearance, Confirm/new-offer appearance, and return
        to Cycle. Confirm leaving `INVENTORY / MODS` removes the overlay in
        roughly one second rather than leaving it stuck over other menus.
      - Verify a wrapped card such as `Ampi-lexipha` receives a real decoded
        grade when readable; otherwise it must remain the fixed reading
        placeholder with no `REVIEW · uncertain OCR`, token conflicts, random
        prose, or punctuation artifacts.
      - Verify `watcher.log` no longer records `Restarting orbiter` after normal
        application startup.

- [x] Make Riven screenshot capture event-driven:
      - [x] Do not capture while the Riven menu is inactive. **FIXED
            2026-07-26 (Claude)** — `riven_screen_watcher()` in
            `src/bin/main.rs` was still taking a full-desktop screenshot
            every 1 second even while completely inactive, as a
            "missed log event" recovery probe. That's the actual root
            cause behind Jacob's report that the screenshot program
            looked like malware, running constantly even when Warframe
            wasn't open — this ran regardless of Warframe's process
            state, gated only by the `orbiter` detector process itself
            being alive. Removed the probe entirely: the loop now does
            nothing at all (just cheaply polls the EE.log event channel
            every 100ms) until a real trigger event sets `active`. Trades
            away a small reliability safety net (a missed/dropped log
            line means that reroll session is never detected at all) for
            not continuously screenshotting the user's desktop.
            Brace-balance checked (paren-count check was a false
            positive from unrelated pre-existing text elsewhere in the
            file, confirmed by counting parens in just the inserted block
            alone: balanced 7/7) - **not yet rebuilt/live-tested**, same
            Leptonica sandbox limitation as other Rust changes.
      - [x] Start on `Created /Lotus/Interface/OmegaRerollSelection.swf` or
        `OmegaRerollSelection.lua: Diorama setup` — already implemented
        by Codex (`riven_log_event()`'s `Opened` match covers both).
      - [x] Capture every 500 ms only while active — already the
        behavior; now the *only* capture cadence that exists at all
        (the inactive 1s cadence is gone, see above).
      - [x] Stop after frames confirm `INVENTORY / MODS` has closed —
        already implemented by Codex (tuned live from 2→6 frames to
        tolerate header-OCR flakiness without false-closing).
      - [x] Regression coverage for the early SWF creation event — added
        by Codex, 5/5 focused Riven tests passing per session notes.
      - [x] Live-test that `orbiter.log` has no screenshot entries outside
        the Riven menu — **CONFIRMED 2026-07-27 live**: a real reroll
        showed zero captures until the `Opened` event fired, matching the
        design.

      **Root cause of the earlier "looks like malware" report, found via
      the same live test**: those weren't background captures at all —
      `xcap 0.0.4` (Cargo.lock confirms it depends directly on `dbus`)
      can't do direct X11 pixel-grab on Jacob's confirmed native Wayland
      session (`XDG_SESSION_TYPE=wayland`), so it silently falls back to
      the XDG portal internally on every single capture call, showing a
      bouncing "Portal" taskbar icon each time. This is Wayland's own
      anti-spyware protection working as designed (apps can't silently
      screenshot without some visible indicator) - not a bug, though the
      per-capture re-prompt (vs. one indicator for a whole session) is
      because xcap 0.0.4 doesn't reuse portal/PipeWire sessions across
      calls. A newer xcap version might fix that, but Codex already hit
      a missing-`libgbm` build failure trying to upgrade - deferred, not
      attempted again given the same environment constraint.

      **New regression found from the same live test, now fixed**: taking
      a manual screenshot (Spectacle/PrintScreen) while the Riven overlay
      was active made it disappear and never come back - direct
      side-effect of the "no screenshot while inactive" fix above. The
      manual screenshot momentarily disrupts what our own capture sees,
      making a single frame look like the menu closed; previously the
      (since-removed) always-on probe would eventually notice the false
      close and self-correct, but with it gone, a false close had no way
      back in without a fresh EE.log event. Fixed with a bounded grace
      period instead of reintroducing constant screenshotting:
      `riven_screen_watcher()` now allows up to `RECOVERY_CHECKS = 6`
      extra checks at a slow 1s cadence right after declaring closed,
      specifically to catch and self-correct a false close, before going
      fully silent again. **NOT yet live-tested** (found and fixed in the
      same session, no rebuild/verification pass yet) - confirmed by code
      trace: brace-balanced, both the reactivate path (`Some(...)` branch
      resets it to 0) and the give-up path (decrements to 0 then the
      `!active && recovery_checks_remaining == 0` gate stops all capture)
      were manually traced through.

- [x] FIXED 2026-07-27 (Claude) — "NEW OFFER" panel in the Riven overlay
      got permanently stuck on the "Reading Riven stats..." placeholder
      after a reroll, even though "CURRENT ROLL" populated correctly.
      Root cause was NOT the OCR-consensus/stabilization logic (that part
      was working fine) - it was `riven_grader_overlay.py`'s "does the
      generated name decode to the same stats as what's visibly OCR'd"
      sanity check, in `_grade_visible_card()`. `riven-overlay.log` showed
      the exact rejection reason for every stuck case (`"new offer stuck:
      Generated name 'Decinok' decodes to ['PUNC', 'SD'], but visible
      stat OCR read ['PT', 'SD']"` and similar) - "PUNC" and "PT" are
      genuinely different Warframe stats (Puncture vs. Punch Through), so
      whenever a Riven actually rolled Punch Through, this check saw a
      permanent, unresolvable mismatch and rejected the grade forever.
      Traced to `riven_grader_watcher.py`'s `TAG_MAP`: DE's own internal
      game-data tag `WeaponPunctureDepthMod` (sounds like Puncture) was
      mapped to `"PUNC"`, but empirically confirmed (by loading the
      actual exported upgrade data directly in Python and inspecting its
      `prefixTag`/`suffixTag` fields) that this tag's own localization
      keys say `PunchThroughPrefix`/`PunchThroughSuffix` in **every**
      weapon pool (Archgun/Pistol/Rifle/Shotgun/Modular Pistol) - it's
      DE's actual Punch Through tag, just confusingly named. It's also
      the *only* Punch-Through-or-Puncture-related tag that appears
      anywhere in the exported data at all (the other three TAG_MAP
      entries for this stat family never occur in any pool). Changed the
      mapping to `"PT"`. **Empirically verified, not just reasoned about**:
      re-ran `_decode_riven_generated_name()` directly against the real
      exported data before and after - "Decinok" went from `['PUNC','SD']`
      to the correct `['PT','SD']`, matching the visible OCR exactly. Pure
      Python fix (`riven_grader_watcher.py`), **no Rust rebuild needed** -
      takes effect on next app restart.
      **Separate, NOT fixed**: several other historical "stuck" log
      entries (`satides`, `puratis`, `Argi-toxitis`) show a different
      pattern - the decoded set is missing one extra genuinely-visible
      stat, consistent with a 3-positive (hyphenated, e.g.
      "Arma-satides") generated name only getting partially captured
      before decoding. Not chased further - needs the actual raw
      multi-line OCR text from a live stuck session to confirm, not
      enough evidence yet to diagnose blind.

- [x] FIXED 2026-07-27 (Claude) — initially misdiagnosed as a transient
      debounce-timing artifact (self-corrected once, so it looked benign),
      but Jacob reproduced it again and it stayed stuck for 10+ seconds
      with no self-correction: the overlay's "NEW OFFER" showed
      +Critical Damage/+Toxin (matching the actual **left/current**
      in-game card, "Arca Plasmor Toxitis") while "CURRENT ROLL" showed
      +Damage/+Ammo Maximum (matching the actual **right/new-offer**
      card, "Arca Plasmor Ampiata") - the two panels were consistently
      swapped, not just briefly stale. Real root cause in
      `riven_grader_overlay.py`'s confirm-mode candidate-grading loop: it
      iterated over *both* card positions (`card_texts[0]` = current/left,
      `card_texts[1]` = new-offer/right, matching `src/bin/main.rs`'s
      `card_rects` order) and took whichever one *first* graded as
      "different from old" - but "old" (CURRENT ROLL's cached reference)
      can itself be stale, so the left/current card can also legitimately
      differ from it and win that race, getting mislabeled as the new
      offer while the real new-offer card (index 1) never got considered
      at all. Fixed to only ever grade `card_texts[1]` (the actual
      new-offer position), never the current/left one. Pure Python fix,
      **no Rust rebuild needed** - takes effect on next app restart.
      **VERIFIED 2026-07-27 live**: no further swap reports after this
      fix. Separately, a related Cycle-mode instance (single card, not
      the two-card Confirm swap) showed stale "CD/Toxin, 73 rerolls"
      instead of a fresh "Croni-decitis" card (Fire Rate/Critical Damage/
      Status Duration, 74 rerolls) - `riven-screen.json` confirmed Rust
      already had the correct fresh data (`stable:true`) at the time, and
      directly re-running `_grade_visible_card()` against that exact raw
      OCR text graded it correctly (not rejected), so the decode logic
      itself wasn't at fault here. It self-corrected shortly after and
      Jacob confirmed the overlay now shows the right card - most likely
      the same class of transient lag as the "would prefer instant, will
      live with it" item above (the live-regrade path in `_show_reroll_
      screen()`'s cycle-mode branch needs a few polls to catch up), not a
      new distinct bug. Not chased further given it self-resolved and the
      grading logic tested clean.

- [x] REAL BUG, FIXED AND LIVE-VERIFIED 2026-07-28 — Riven overlay could go fully silent
      ("no overlay") for over a minute while Jacob is genuinely still on
      the Riven screen the whole time, with no way back in short of a
      manual "kick" (screenshot + navigate away and back to force a
      refresh). Confirmed via `riven-screen.json` directly: `visible:
      false` for ~2 minutes straight while the user insisted he never
      left the menu. Two contributing problems: (1) the display not
      reliably reacting to fresh confirmed data on its own (needed a
      manual kick even when the underlying data was already correct -
      NOT explained yet, needs more investigation); (2) the bounded
      recovery window added 2026-07-26 (`RECOVERY_CHECKS` in
      `riven_screen_watcher()`, `src/bin/main.rs`) was only 6 seconds -
      nowhere near enough to survive whatever's actually causing
      `riven_menu_anchor_present()` to keep failing its OCR read for a
      full minute+ on a screen that's genuinely still open. Two changes
      made, NOT yet compile/live-verified (same Leptonica sandbox
      limitation as other Rust changes):
      **FINAL LIVE RESULT 2026-07-28:** after atomic state writes, tolerant
      close anchors, immediate EE.log-driven provisional display, removal of
      per-frame diagnostic PNG encoding, and composite-process health repair,
      the overlay appeared immediately, populated after about one second, and
      followed repeated rolls/card swaps without errors or disappearing.
      - Added `warn!` diagnostic logging of the *raw* OCR text on every
        anchor-check failure (both the header region and the action-row
        region), instead of only ever logging the high-level "closed"
        event with no visibility into why. This is the actual missing
        piece needed to root-cause problem (1) above instead of guessing
        again.
      - Widened `RECOVERY_CHECKS` from 6 to 60 (was ~6s of tolerance on
        top of the ~6s it already takes to declare closed; now ~66s
        total) - still bounded, not a return to the old
        forever-screenshotting design, just generous enough to actually
        ride out a much longer OCR flakiness streak before giving up.
      **Next step after rebuild**: reproduce the same "no overlay while
      still on screen" scenario again and capture the new `Riven anchor
      miss (header/action row): ...` log lines - that raw OCR text is
      what will actually reveal why the anchor check is failing, rather
      than continuing to guess at causes.

## Live test follow-up — plain X11 overlay rewrite (2026-07-27)

- [x] LIVE TEST FAILED THREE TIMES — reward Test Overlay continued to appear on the app monitor after both the scale-matching and forced-X11 changes, disproving both claimed diagnoses. Code inspection then found a definite separate bug: synthetic Test Overlay rewards have no OCR `rect` values, and `_show_rewards()` only moved the window inside its `if rects:` branch. Although Auto resolved a target monitor, that result was never used for the synthetic test. Added an explicit no-rect move to the selected monitor plus backend, selected-monitor, final-window-position, and rect-count logging. **RESULT: still failed live even after this fix** (see below) — window landed on the correct monitor and still never appeared.
- [x] LIVE TEST FAILED — the relic recommendation watcher detected the screen and generated 20 recommendations; `overlay-gtk.log` recorded the window as shown, but Jacob saw nothing over Warframe. **CONFIRMED ROOT CAUSE 2026-07-27: the plain-X11 always-on-top rewrite was insufficient and has been reverted back to gtk-layer-shell.** Checked Cephalon Kronos's actual `overlay_utils.rs` (not just its Cargo.toml dependency list, which is all we'd checked before) - their real mechanism is far heavier than a one-time `set_keep_above()`: raw X11 `override_redirect`, direct Xlib `_NET_WM_STATE`/`_NET_WM_DESKTOP` property writes, and critically a persistent "AOT keeper" timer that repeatedly calls `XRaiseWindow` + re-asserts always-on-top (a one-time hint isn't enough - something keeps contesting stacking order). Their own comment explicitly warns against setting `_NET_WM_WINDOW_TYPE` at all ("KWin may still apply placement policies... fighting our position") - which is exactly what our `Gdk.WindowTypeHint.UTILITY` call did. Replicating their full mechanism correctly would be a much larger, riskier undertaking than gtk-layer-shell, which has actual proven working history in this project. **Reverted**: `x11_overlay.py`, `gtk_overlay_drag.py`, and all 4 overlay files (`overlay_gtk.py`, `fissure_overlay.py`, `riven_grader_overlay.py`) back to gtk-layer-shell (OVERLAY layer, TOP+LEFT anchors/margins) - same public function names in `x11_overlay.py` (`setup_always_on_top`, `position`, `monitor_origin`, `move_to_monitor`, `target_monitor`) now wrap `GtkLayerShell` calls instead of plain GDK/X11 ones, so the overlay files' call sites didn't need per-line changes back. Removed the `GDK_BACKEND=x11` forcing from all 4 entrypoints (layer-shell requires the native Wayland backend, not X11). **NOT yet live-retested** - needs Restart Overlay + Test Overlay to confirm the revert itself didn't introduce a new bug.

## Priority 3 — data consistency

- [x] Unify mastery/XP threshold logic — added dependency-free `mastery.py`
      as the single source for rank limits, affinity curves, rank conversion,
      and completion checks. `populate_equipment.py`, Mastery Helper, Modular,
      and `missing-parts.py` now share it. Correct rank-30 thresholds are
      450,000 for weapons and 900,000 for heavy equipment; Kuva/Tenet/Coda/
      Paracesis and Necramechs require their full rank-40 threshold. Follow-up
      source review against WFCD and FrameHub made WFCD's explicit
      `maxLevelCap` authoritative wherever present; name/type detection remains
      only as compatibility for older caches (including the current local cache)
      that predate that field. Current ownership still counts as crafted, but a
      historical `XPInfo` entry alone no longer does. Added
      `tests/test_mastery.py`; 10 tests pass.
- [x] Unify data-directory selection between `paths.py` and `src/bin/main.rs`.
      Rust now mirrors Python's canonical policy: `%APPDATA%` with the same
      Windows fallback, `~/Library/Application Support` on macOS, and
      `XDG_DATA_HOME` on Linux only when non-empty and not a known VS Code/
      VSCodium/Flatpak sandbox path, otherwise `~/.local/share`. Python's
      duplicate public `get_data_dir()` now returns the already-resolved
      `DATA_DIR` instead of independently reinterpreting the environment.
      Added a focused Rust sandbox-path regression test. Verification:
      `python3 -m py_compile paths.py` passed; runtime assertions confirmed
      `get_data_dir() == DATA_DIR` and sandbox filtering; `rustfmt` passed.
      `cargo check --bin orbiter` was attempted and remains environment-limited
      in the Codex/VS Code Flatpak shell. After exposing vcpkg's Leptonica with
      Flatseal and setting `PKG_CONFIG_PATH`, `pkg-config` resolves Leptonica
      1.87.0 and compilation advances; the next blocker is bindgen's unavailable
      Flatpak-compatible `libclang`. Actual release builds continue in the
      working `wfinfo` distrobox.
- [x] Route every inventory consumer through `paths.get_inventory_path()`.
      Migrated the standalone refresh/worker consumers (`populate_crafted.py`,
      `populate_relics.py`, `populate_equipment.py`, `record_stats_snapshot.py`,
      `riven_grader_watcher.py`, `missing-parts.py`, and `health.py`) plus all
      direct-reading collection views (Glyph, Conservation Tags, Modular, Mod
      Collection, Ephemera, Ayatan, Arcane, Cephalon Fragments, Emblem, Captura,
      and Mastery Helper). Removed Status Tab's unused stale direct-path
      constant. A repository-wide executable-code audit now finds no direct
      `inventory.json` construction outside `paths.py` itself, where the repo
      path is intentionally the canonical default when no configured override
      exists. Verification: `python3 -m py_compile` passed for all 20 touched
      Python files and `git diff --check` passed.
- [x] Fix `paths.py` internal data-directory inconsistency — completed with
      the cross-language consolidation above. The public accessor now returns
      canonical `DATA_DIR`, so callers cannot bypass sandbox/environment
      filtering.
- [x] Reload `owned_items.json` without requiring a full detector restart;
      add an explicit freshness policy for cached downloaded prices (currently
      reused indefinitely once present in `/tmp`). The detector now compares
      ownership file modification time/size before each capture and swaps in a
      valid changed file while retaining the last known-good data on errors.
      Downloaded prices/items expire after 24 hours, downloaded responses must
      be JSON arrays, network/HTTP/validation failures fall back locally, and
      launcher cache seeding preserves source mtimes so old local data cannot
      masquerade as a fresh download.

## Priority 4 — update system

- [x] Consolidate the overlapping update implementations (`update_manager.py`,
      `update.py`, `update_data.py`, `update.sh`, `update_all.sh`) behind one
      path with schema/shape validation, HTTPS (currently plain HTTP in
      `update_manager.py`), retries, and atomic same-filesystem temp-file commits.
      `update_manager.py` is now canonical; the other four files are thin
      compatibility entrypoints. All remote reads are HTTPS-only with three
      bounded attempts, JSON content thresholds, preserved previous versions,
      and fsynced same-directory temporary files committed with `os.replace`.
      Drop-data URLs now use HTTPS and subprocesses reuse the active Python
      interpreter rather than a Linux-only venv path.
- [x] Add integrity checks for downloaded executables — `download_helper.py`
      never verifies a checksum/signature; Windows ZIP extraction doesn't
      validate members (path traversal risk). Every installed release asset
      now requires GitHub's published SHA-256 digest and byte size to match.
      ZIP extraction is member-by-member and rejects absolute/parent/drive
      paths and symlinks; files are written through per-file temporary paths.
      **VERIFIED 2026-07-25:** complete suite passes, 18 tests in 5.43s
      (seven new download-integrity/ZIP-safety cases plus eleven existing).

## Priority 5 — code quality / correctness

- [x] Move `config.json`/`column_widths.json` out of the source tree (currently
      tracked, causes dirty-tree conflicts and fails on a read-only install dir).
      Both now live under canonical `DATA_DIR`; first use atomically migrates
      an existing legacy source-tree file without overwriting newer user data.
      All runtime config consumers and column persistence write only to the
      per-user location, allowing a read-only application install.
- [x] Mastery Helper: rank-0 owned items disappear from every category; "From
      Relics" tab includes items regardless of `fully_coverable` (only affects
      sort/color, not inclusion); component recipe quantities ignored (a
      blueprint needing 2 of a part is treated as satisfied by 1). Rank-0
      inventory items now appear under Easy; From Relics requires every
      deficit to be covered by enough owned relics; owned/missing totals and
      purchase estimates now honor WFCD `itemCount`.
- [x] Mod Collection: chained `QTimer.singleShot(0, ...)` population has no
      generation token — reloading while old callbacks are queued can interleave
      old/new data and re-enable sorting incorrectly. Added a monotonically
      increasing population generation; stale queued chunks now exit before
      touching the replacement table or re-enabling sorting.
- [x] `record_stats_snapshot.count_prime_sets()` ignores recipe quantities for
      multi-part prime sets (same class of bug as Mastery Helper's). Replaced
      suffix-based grouping with WFCD recipe validation using `itemCount`.
- [x] Validate Riven grader's `TAG_MAP` semantic reductions and the 75%
      "GOD ROLL" threshold in `_roll_perfectness` against a reference
      implementation (browse.wf). The loaded RivenParser uses `0x3FFFFFFF`,
      not signed-int max; corrected the scale and malformed-value behavior.
      Removed false semantic aliases (combo duration→status duration,
      lifesteal→damage, combo-on-hit→initial combo, Corrupted damage→base
      damage), added exact missing parser aliases for slide crit, melee
      finisher, and recoil reduction, and replaced the unsupported 75% God
      Roll cutoff with browse.wf's 97.5% S-grade boundary. Added regression
      fixtures for scale endpoints, unsafe aliases, and threshold behavior.
- [x] Fix Dashboard refresh race condition — no request/generation ordering
      guard, an older network response can overwrite newer data; also
      inconsistent HTML-escaping of externally sourced strings inserted into
      Qt RichText. Both world-state fetchers now assign monotonically
      increasing generations and suppress stale network results before cache
      writes or UI signals; slots independently reject obsolete signals.
      Mission type, node, and modifier values are HTML-escaped before insertion.
- [x] Update the stale test suite — `tests/test_imports.py` imports the removed
      `SETTINGS_TAB` instead of `STATUS_TAB`, assumes Relic Planner has 3
      columns (actually 6), assumes Mod Collection populates synchronously.
      Updated it for `StatusTab`, six reward columns, and queued Mod Collection
      completion before cell assertions. Follow-up test run found the Riven
      Grader assertion also referenced its removed generic `_table`; updated
      the smoke test to validate the current owned/detail tables instead.
      **VERIFIED 2026-07-25:** Jacob ran the complete suite in the project
      virtual environment: 11 passed in 6.48s.
- [x] Fix `warframe_mem_log.py` — abandoned timed-out daemon threads leak;
      clearing the seen-set after 16,384 entries without resetting
      `_first_read_done` can replay old triggers. Each reader now owns one
      bounded reusable executor worker; a stuck syscall causes immediate
      subsequent fallbacks without creating threads or queued tasks. Seen-set
      compaction retains the hashes in the current ring-buffer snapshot after
      reporting new lines, so the snapshot cannot replay on the next poll.
- [x] Resolve `helper-update-sentinel.py` assumptions (`~/helper-src`, branch
      `senpai`) against what installers/docs actually set up — mismatch can
      make the sentinel start and immediately exit forever. The sentinel now
      monitors Sainan's platform-specific GitHub release asset—the same source
      used by normal installs—instead of requiring an undocumented source
      clone/branch. `download_helper.py` atomically records installed version,
      asset, and verified digest metadata so notifications compare the actual
      installed binary with the latest published digest.

      **REGRESSION SUITE VERIFIED 2026-07-25:** Jacob ran the complete Python
      suite after the updater, state migration, Dashboard, memory-log, and
      helper-sentinel changes: 25 passed in 5.33s. After the single-instance
      socket cleanup regression and subsequent additions, the complete suite
      passed again: 29 passed in 5.40s.

## Priority 6 — housekeeping

- [x] Reconcile documentation conflicts (README/Help claim a 5-minute riven/stats
      scheduler that doesn't exist, "3 overlays" when there are 4, a GTK riven
      overlay close button that isn't there, reward overlay showing platinum
      value when it only shows ownership status). README and in-app Help now
      describe refresh-triggered Riven grading/stat snapshots, all four
      overlays including the persistent fissure HUD, the GTK riven overlay's
      actual no-button behavior, and ownership/crafted reward status.
- [~] Upgrade aging Cargo dependencies (eframe/egui 0.19, notify 4, image 0.24,
      indexmap 1.9); split GUI/dev-only binaries (ability-timer, theme_tune,
      check_image, image, relics) out of the production `orbiter` build.
      Production modernization completed: `notify` 4→8 with the current event
      API, `image` 0.24→0.25, `indexmap` 1→2, and Windows-only `xcap` 0.0.4→0.9.7;
      xcap is no longer compiled on Linux. Disabled Cargo autobin discovery and
      gated all five GUI/diagnostic binaries plus eframe/egui/rdev/indexmap
      behind an explicit `dev-tools` feature, so normal `orbiter` builds no
      longer compile them. **VERIFIED 2026-07-25:** Jacob ran
      `cargo build --release --bin orbiter`; the modernized production build
      completed successfully in 27.59s with no xcap future-compatibility warning.
      Remaining: eframe/egui themselves stay at 0.19
      inside the opt-in developer feature because current egui removed the
      RetainedImage API used by theme_tune; upgrading that tool needs a focused
      UI port, not a production dependency change.
- [x] Remove tracked `src/bin/main.rs.backup` dead file. Confirmed it was
      unreferenced, only 373 lines versus the active file's 941, and preserved
      an obsolete pre-portal/pre-ownership implementation already superseded
      by Git history; removed it from the worktree.
- [x] Document licensing/provenance for ported code (Cephalon Kronos, browse.wf,
      upstream wfinfo-ng) — repo is GPL, some files port logic/formulas from
      those projects without a documented compliance note. Added
      `THIRD_PARTY_NOTICES.md` with per-project source, verified license, exact
      adaptation scope, Commons-Clause boundary for the separately bundled
      helper, and preserved MIT copyright/permission notices. Corrected the
      in-app helper credit to Sainan and added Cephalon Kronos explicitly.

## Standalone / previously queued

- [x] Implement a single-instance lock so relaunching while the app is already
      running (even minimized to tray) doesn't spawn a duplicate process.
      The main GUI now owns a per-user Qt local server. A second launch sends
      an activation command and exits; the primary restores/raises its existing
      window from the tray. Stale endpoints are removed only after a failed
      connection proves no process is listening. Follow-up from the first full
      test run: disconnect cleanup now only releases Python's reference because
      Qt may already have destroyed the socket; this removes the asynchronous
      Shiboken "C++ object already deleted" traceback. **VERIFIED 2026-07-25:**
      focused single-instance test passes with no asynchronous traceback.
- [ ] Periodically re-check our open bugs/planned features against the
      current <https://github.com/glowseeker/cephalon-kronos> before spending
      time reverse-engineering or debugging from scratch. Found 2026-07-27
      while fixing the broken Arbitration display: Kronos already ships a
      precomputed fix for that exact upstream API bug (a baked hour-by-hour
      schedule instead of trusting api.warframestat.us's broken live
      calculation), which we copied in rather than inventing our own. Worth
      checking Kronos first any time we're about to build something it
      might already solve, and whenever we hit a bug that might just be
      "upstream data/API is wrong" rather than our own code.
- [x] **MANDATORY**: `KRONOS_FIXES_REFERENCE.md` (repo root) is a full,
      categorized pull of all 522 Kronos commits (overlay/window/focus/X11,
      screen capture, OCR/riven parsing, memory-scan/log-scanner, pricing,
      build/packaging, CI, UI misc), built 2026-07-27. Check it FIRST before
      diagnosing any new error in this project - many of its entries are
      structural KWin/X11/Wayland gotchas that apply to any Linux GTK/X11
      app, not just Kronos's Tauri stack, so the underlying lesson usually
      still transfers even though the code is different.

## 2026-07-27/28 — overlay windowing saga + OCR engine swap

- [x] Overlay windowing: reverted the brief plain-GDK-always-on-top attempt
      (see "Live test follow-up" section above) back toward a Kronos-style
      mechanism, this time replicating their *actual* `overlay_utils.rs` in
      full (read end-to-end, not just skimmed) instead of guessing at a
      Python equivalent: `override_redirect` on the GDK window (detaches it
      from KWin's management entirely), raw Xlib `_NET_WM_STATE`/
      `_NET_WM_DESKTOP`/`_MOTIF_WM_HINTS` writes via `ctypes` (deliberately
      never `_NET_WM_WINDOW_TYPE` - Kronos's own comment: KWin "may still
      apply placement policies... fighting our position" for those), and a
      persistent focus-lost "AOT keeper" that re-raises the window every
      time it loses focus (Kronos's own code proves a one-time
      always-on-top request doesn't stick under KWin). Jacob's explicit
      call: try the focus-accepting keeper as Kronos actually built it,
      despite a real but eventually-clarified-as-low theoretical risk it
      could steal input focus from Warframe during play (override-redirect
      windows structurally can't easily take real X11 focus through the
      normal WM-mediated path, per a GNOME bug report found during
      research - reduces but doesn't 100% eliminate the concern).
      New shared module `x11_overlay.py` (`setup_overlay_window`,
      `show_at`, `apply_position`, `raise_and_keep_on_top`, `monitor_origin`,
      `target_monitor`, `move_to_monitor`) used by all 4 overlays;
      `gtk_overlay_drag.py` rewritten for real absolute X11 drag positions.
      **Bugs found and fixed during live testing** (each one real, found via
      actual tracebacks/logs, not guessed):
      1. `ctypes.c_void_p(xdisplay)` "cannot be converted to pointer" -
         PyGObject's `GdkX11.X11Display.get_xdisplay()` doesn't return a
         plain int here; fixed by calling the raw C function
         `gdk_x11_get_default_xdisplay()` directly via `ctypes.CDLL` on
         libgdk-3 instead, bypassing that binding entirely (matches what
         Kronos's Rust code does too - a raw FFI call, not a higher-level
         method - which should have been the first attempt, not the fix
         after the first attempt failed).
      2. Raw `XUnmapWindow`/`XMapWindow` calls (mirroring Kronos's Rust
         code) desync GTK3/PyGObject's own `window.get_mapped()` tracking
         from real X server state - GTK's own docs are explicit that
         `gdk_window_show()` "also updates internal GDK state, which means
         that you can't really use XMapWindow() directly on a GDK window."
         Fixed by using `window.hide()`/`window.show()` for the unmap/remap
         step instead, keeping the raw property writes (not something GDK
         tracks state for) going straight through Xlib.
      3. Position was set (`apply_position()`) *before* content was built
         and `show_all()` finalized the window's real size, mirroring a bug
         Kronos found and fixed themselves (`647ffd7`: "raise_x11 +
         set_always_on_top after backing-store invalidation so KWin
         stacking sticks" - KWin re-evaluates window state on the
         `ConfigureNotify` from any size change, undoing whatever was set
         beforehand). Fixed in `overlay_gtk.py` (`_show_rewards`,
         `_show_relics`) and `riven_grader_overlay.py`: position/raise now
         happens *after* `show_all()`, not before.
      **Verified live** (Jacob, 2026-07-27 evening): reward overlay and
      relic-recommend overlay both confirmed appearing in the correct
      position on the correct monitor across multiple real detections and
      a real relic-crack mission, no further wrong-monitor reports since
      fix #3. Riven overlay windowing itself never got a real live test
      because it was blocked further upstream (see next item) - once that
      unblocks, the windowing mechanism still needs its own confirmation.
      **Not resolved**: whether the focus-accepting AOT keeper ever
      actually steals keyboard/controller focus from Warframe during real
      gameplay - no report of it happening in this session's tests, but
      genuinely not stress-tested (needs extended real play, not just a
      quick check).
- [x] Riven overlay never appearing (root cause **found and fixed**, not
      just windowing): `orbiter`'s Rust-side OCR could not read the "INVENTORY
      / MODS" header anchor at all - logs showed `Riven anchor miss (header):
      "O"` repeating continuously, so `riven-screen.json` never flipped to
      `visible: true` and the overlay (correctly) never had anything to
      display. Root cause was **not** a resolution/crop bug - it was that
      `riven_ocr_image()`'s "gold_only" color filter assumed the header text
      is gold-colored and erased everything else, silently destroying real
      (non-gold) header text before Tesseract ever saw it. This is the same
      bug class as a second, independently-found issue in reward detection
      (see below) - both preprocessing steps were built for Tesseract's
      needs and were actively counter-productive once the engine changed.
- [x] **Replaced Tesseract with PaddleOCR** (`ocr-rs` crate, PP-OCRv5 mobile
      detection+recognition models via MNN) for both reward detection and
      Riven screen/card detection - Jacob's explicit call after scoping out
      the tradeoffs (no overlay-appearance impact; OCR-only change).
      Kronos's own `ocr_engine.rs` never needed any color-isolation
      preprocessing at all to read Warframe's UI reliably, which was the
      actual tell that our color-filter-based preprocessing (both the
      Riven `gold_only` filter above and reward detection's
      `filter_and_separate_parts_from_part_box_impl`, which binarized the
      whole crop to pure black/white via a per-theme color threshold) was
      Tesseract-specific baggage, not a real requirement.
      Model files (`ocr-models/PP-OCRv5_mobile_det.mnn`,
      `PP-OCRv5_mobile_rec.mnn`, `ppocr_keys_v5.txt`, ~21MB total) pulled
      from the crate maintainer's own GitHub repo (zibo-chen/rust-paddle-ocr,
      Apache-2.0) - verified byte-identical (md5) to Kronos's bundled
      copies, confirming it's the genuine upstream file, not something
      copied from Kronos itself.
      `image_to_string()` in `src/ocr.rs` (the single shared entry point
      both reward and Riven detection already funneled through) rewritten
      to use the full `OcrEngine` (detection+recognition), not
      recognition-only `RecModel` - first attempt at recognition-only
      produced garbled results ("OclavaPripe yslems" for "Octavia Prime
      Systems") because reward names and Riven stat blocks are genuinely
      *multiple* stacked text lines, not one; recognition-only mode
      assumes a single line and jumbles separate lines together.
      Also fixed during live iteration: (1) `normalize_string()` now maps
      Unicode "fullwidth" Latin letters back to ASCII before filtering -
      PP-OCRv5 is multilingual (covers CJK scripts) and occasionally
      recognizes an ASCII letter as its fullwidth-block equivalent (e.g.
      "INＶENTORY" instead of "INVENTORY"), which the old ASCII-only filter
      silently deleted rather than counted, missing the header match by
      exactly one letter; (2) added a proper row-then-left-to-right
      reading-order sort (group detections into rows using a threshold,
      not exact-equality `top()` comparison, then sort each row
      left-to-right) - a naive top-only sort left multi-word lines in the
      wrong order (e.g. "Plasmor Arca" instead of "Arca Plasmor").
      **VERIFIED**: `cargo build --release --bin orbiter` succeeds cleanly
      (no warnings) using `LIBCLANG_PATH=<path to a libclang.so>` at build
      time only (bindgen needs it to generate MNN FFI bindings; the
      compiled binary itself needs nothing extra at runtime beyond the
      `ocr-models/` files). Removing Tesseract also removes the
      Leptonica system-library dependency that blocked every previous
      `cargo build` attempt in the dev sandbox this project's sessions
      used all along - this is the first session where a real build could
      be verified at all, not just syntax-checked.
      Test suite: 8/10 pass (up from unable-to-run before this fix, then
      6/10 immediately after the raw engine swap before the preprocessing
      fixes above). Remaining 2 failures: `wfi_images_99_percent` needs a
      `WFI test images/` fixture directory that only has its `labels.json`
      manifest present, all 84 referenced screenshots missing (pre-existing
      gap, unrelated to this change - would have failed identically before
      it too); `detects_riven_confirmed_fixture` fails on one single stray
      mis-recognized character ("ArcaF" instead of "Arca") in one specific
      test image - real OCR noise, not a detection failure, much smaller
      in scope than the original "doesn't detect at all" problem this
      whole effort started from.
      **NOT YET DONE**: confirming `ocr-models/` actually ships alongside
      the binary in the real install/download flow (currently just sits in
      the repo root, same convention as other bundled data files, but
      nothing in `install.py`/`download_helper.py` has been taught about it
      yet) - needs a real fresh-install check, not just "it works from the
      repo checkout."

## 2026-07-28 — post-rebuild test bugs

- [x] Two lingering PaddleOCR-swap test failures fixed. (1)
      `detects_riven_confirm_fixture` ("ArcaF Plasmor" instead of "Arca
      Plasmor"): `riven_ocr_region()` upscaled Riven crops 2x, then handed
      them to the shared `image_to_string()`, which upscales 2x again -
      4x total via two chained Lanczos3 resamples, while every other OCR
      call site (reward detection) only goes through one. The redundant
      resize was introducing a spurious inserted character. Removed the
      duplicate upscale in `riven_ocr_region()` (`src/bin/main.rs`).
      (2) `wfi_images_99_percent`: confirmed the 84 referenced screenshots
      have never existed in this repo, any branch of upstream
      knoellle/wfinfo-ng, or WFCD/WFinfo further upstream (checked all of
      them via `gh api` - none commit these PNGs or document another
      source). They're a personal local OCR-accuracy test corpus,
      `.gitignore`'d everywhere. Changed the test to skip gracefully (log
      + early return) when the images aren't present instead of hard-
      failing on a fixture gap. **VERIFIED**: all 10 tests pass, release
      build clean.
- [x] REAL BUG, FIXED 2026-07-28 — Riven overlay (and reward detection)
      went completely silent after a live test; `orbiter.log` showed
      `Could not reopen EE.log (rotation in progress?): No such file or
      directory` followed by `Failed to re-watch EE.log after reopen
      failure: No path was found`, then total silence for the rest of the
      session. Root cause: Warframe under Steam Proton actually deletes
      and recreates `EE.log` at some point during startup rather than
      just appending to it, and the recreate isn't instantaneous - the
      existing recovery code (added 2026-07-24) made exactly one
      immediate re-watch attempt, which can itself hit ENOENT if the file
      is still momentarily gone. No further retry existed, so the shared
      EE.log watcher thread (both reward and Riven detection depend on
      it) died permanently with no crash to explain why. Added
      `rewatch_with_retry()` (`src/bin/main.rs`): up to 20 attempts, 250ms
      apart (~5s bounded window), used at both existing re-watch call
      sites (reopen failure and detected-truncation). Build and full test
      suite verified clean; **live re-test after this fix is still
      pending**.
      **Checked against Kronos per standing practice (see
      `KRONOS_FIXES_REFERENCE.md` item above) - found a real structural
      mismatch worth recording**: Kronos does not watch EE.log on disk at
      all (`10c048a`, 2026-07-22 - "scanner reads ring buffer from memory,
      not disk"). Their whole log pipeline reads Warframe's own in-memory
      EE.log ring buffer directly out of the process's virtual address
      space (PID-based, native memory-scanning helper), so there is no
      file handle, inode, or filesystem watch to lose in the first place
      - this exact bug class (a delete+recreate race killing an inotify
      watch) structurally cannot happen to them. Our `notify`-crate
      file-watching approach is the fragile design they moved away from;
      the retry fix above patches this specific race but doesn't close
      the underlying gap.
- [x] REAL BUG, FIXED 2026-07-28 — Riven overlay's "NEW OFFER" panel was
      back to being permanently stuck on "Reading Riven stats..." right
      after the EE.log fix above, live-confirmed via `riven-overlay.log`:
      `new offer stuck: Read 0 positive and 1 negative stats; an unveiled
      Riven must have 2–3 positives and at most 1 negative.` for a card
      whose raw OCR clearly had 3 positives (Punch Through/Damage/Status
      Duration) and 1 negative (Damage to Grineer). This is a genuine
      regression from the 2026-07-28 Tesseract→PaddleOCR engine swap
      itself, unrelated to today's other two fixes. Root cause in
      `image_to_string()` (`src/ocr.rs`): detected text rows were joined
      with a plain space (`" "`) instead of a newline, flattening an
      entire multi-line Riven card into one line. `riven_grader_overlay
      .py`'s `_clean_ocr_lines()` (Python) calls `splitlines()` expecting
      one visible stat per line - with everything flattened, only one
      stat code was ever extracted for the whole card (whichever phrase
      matched first), and curse/positive classification scanned the
      *entire* blob for `"x0."` instead of that one stat's own line.
      Fixed by joining rows with `\n` instead of `" "`. Existing Rust test
      fixtures (`main.rs:1578`/`1580`) already constructed multi-row OCR
      strings with `\n` between rows, confirming newline-separated rows
      were always the expected shape - the actual join call just didn't
      match it. **VERIFIED**: all 10 tests pass, release build clean.
      Live re-test still pending.
- [x] REAL BUG, FIXED 2026-07-28 (found via Codex review) — `riven-screen
      .json` was written with a plain `std::fs::write()`, not atomically.
      `riven_grader_overlay.py` polls this file on its own schedule and
      can open it mid-write, reading a truncated/empty file - confirmed
      live via a real `JSONDecodeError: Expecting value: line 1 column 1`
      in `riven-overlay.log` from exactly this race. Fixed by writing to
      a same-directory temp file and `rename()`-ing over the real path
      (`write_riven_screen_state_ex()`, `src/bin/main.rs`) - rename is
      atomic on the same filesystem, so a reader always sees either the
      complete old file or the complete new one, never a partial write.
      This is a real contributor to "intermittent missed/flickering
      updates" but not the primary blocker (empty action-row/header OCR,
      tracked separately above, still blocks detection outright when it
      happens). **VERIFIED**: all 10 tests pass, release build clean.
- [x] REAL BUG, FIXED 2026-07-28 (found via Codex review) — the detector
      process-match patterns used by "Restart Detector" (`STATUS_TAB.py`,
      `control-panel.py`) and status displays, plus `autostart_manager
      .py`'s own `_PROCESS_PATTERNS`, only recognized `target/release/
      orbiter` and `orbiter.exe`. The Linux flat-fallback binary
      (`download_helper.py` writes a downloaded detector to `WFINFO_DIR/
      orbiter`; `launch-wfinfo.sh` execs it as the literal relative path
      `./orbiter` when `target/release/orbiter` doesn't exist - see the
      earlier "fresh-install detector location mismatch" fix) was never
      added to any of these three pattern lists, so a downloaded (not
      cargo-built) detector could show as not-running when it was, and
      "Restart Detector" couldn't actually stop it before launching a
      new one. Added `"./orbiter"` alongside the existing two patterns in
      all three places. Used the `./` prefix specifically, not bare
      `"orbiter"` - matches the exact real invocation shape and avoids
      repeating the substring-collision bug fixed here before (bare
      `"orbiter"` matching an unrelated `vim .../orbiter-notes/todo.txt`
      process; that path has no `./` immediately before `orbiter`, so it
      isn't affected by this pattern). Verified via `python3 -m
      py_compile` on all three touched files.
- [x] DEFERRED BY JACOB 2026-07-28, TAKEN ON 2026-07-30 — full port of
      Kronos's memory-scan approach (read EE.log ring buffer via
      `/proc/<pid>/mem` instead of file-watching, dynamic ring-buffer
      address discovery, rework line-diffing for a circular buffer instead
      of an append-only file) is a real architecture change affecting both
      reward and Riven triggers, not a small patch - Kronos's own history
      shows ~22 commits to get it solid, including a rewrite from
      byte-level diffing to full-buffer-reparse-with-hash-dedup once
      circular wraparound broke incremental diffing.
      **CONNECTION FOUND 2026-07-30:** this item stopped being a pure
      architecture nice-to-have and became the likely real fix for the
      confirmed ~10s Riven trigger delay above. Checked AlecaFrame's actual
      official Overwolf 2.6.90 client directly (already documented in
      `RIVEN_GRADING_RESEARCH.md`): its primary reroll-screen trigger isn't
      the EE.log line at all - it's Overwolf's own Game Events Provider
      forwarding Warframe's `match_info.highlighted` event in real time via
      `ItemJustHighlighted`, with the same EE.log line only as a secondary
      signal. Jacob has never experienced AlecaFrame's overlay feeling
      delayed. Overwolf's GEP can't be used directly (it only works for
      apps built on Overwolf's own platform, a different tech stack
      entirely), but it almost certainly gets that real-time data by
      reading the game's process memory directly rather than waiting on a
      disk write - the same category of technique as this deferred item.
      Independent supporting evidence found directly in Kronos's own
      `memory_scan.rs`: a code comment there says explicitly that too small
      a memory read window on their ring-buffer reader "produc[ed] the
      'hella delayed' riven overlay symptom" before they fixed it - the
      exact symptom class this project is chasing, confirmed as a real,
      previously-hit failure mode of this exact technique. See
      `docs/superpowers/plans/2026-07-30-ee-log-memory-scan.md` for the
      implementation plan.
      **LIVE VERIFICATION 2026-07-31:** memory watching activated against
      the real Warframe process with a validated 1 MiB ring-buffer window
      (`VA 0x14289a900`). Three initial Riven-page opens produced the
      provisional overlay in under one second instead of the previous
      measured ~10-second wait. Six subsequent real relic reward screens
      all appeared and populated in under two seconds, which Jacob considers
      acceptable. Full Riven rolling remains blocked by a separate downstream
      NEW OFFER grading failure (the fuzzy stat matcher falsely reads the
      Arca Plasmor card title as `AMMO`); that does not invalidate the
      memory-trigger timing result.

## 2026-07-28 — live Riven and endless-Defense verification

- [x] Riven roller live test passed: immediate provisional overlay, graded
      content populated after about one second, and repeated rolls/card swaps
      completed without errors, stale data, or disappearing transitions.
- [x] Completed a 21-round Defense fissure with rewards every 3 rounds. Every
      visible reward screen received its overlay promptly; adaptive retries
      correctly bridged Warframe's loading/reveal phase.
- [x] Reward overlay now gives a player-saved drag position precedence over
      automatic OCR-box placement on later reward choices.
- [x] Relic recommendation overlay no longer lets duplicate "picker opened"
      states restart its timeout indefinitely; a missed close signal now falls
      back to a bounded 60-second display.
- [x] In-app Auto-Start is now the single authority. Legacy XDG overlay and
      watcher entries are migrated to recoverable disabled backups on startup
      or install, and the old shell installer no longer creates them. This
      machine already had no active legacy entries; only the independent helper
      update sentinel remains.

## HANDOFF 2026-07-28 14:20 — Claude at session limit, Codex picking up

Historical handoff state at 14:20: the binary still had a temporary
diagnostic change and the Riven overlay was unreliable. **Superseded later
2026-07-28:** the diagnostic was reverted and the rebuilt Riven flow passed
live repeated-roll/card-swap testing; see the live-verification section above.

### Leading theory, NOT YET FIXED — self-capture of our own screenshot
notification is very likely the dominant remaining cause

Live-confirmed in `orbiter.log` (2026-07-28T21:18:42-47Z, and also seen
02:34/02:46 earlier the same day): `Riven anchor miss (header)` repeatedly
logged the literal text `EEXPORTEDINEWSCREENSHOTNEWRECORDINGOPTIONSTHESCREEN
SHOTHASBEENCOPIEDTOTHECLIPBOARD` instead of "INVENTORY / MODS" - that is
KDE's own "Screenshot copied to clipboard" notification toast text, being
read by our OCR instead of the game UI. Confirmed via the surrounding log
that this happened during a `Screenshot via xcap monitor DP-1` **success**
(not a fallback-to-spectacle failure), so `take_screenshot()`'s "direct"
xcap path is truly grabbing real desktop pixels - which include this
notification toast.

Working theory: `xcap` 0.0.4 cannot do a true direct X11 grab on Jacob's
native Wayland session (documented earlier, 2026-07-26/27 - "xcap 0.0.4
... silently falls back to the XDG portal internally on every single
capture call, showing a bouncing 'Portal' taskbar icon each time"). Jacob
independently reported this session that "the portal program is back on,
constantly going" - consistent with every automatic Riven capture (every
500ms-1s while active) triggering its own portal screenshot request, and
each of THOSE requests apparently produces a real desktop notification
toast ("Screenshot copied to clipboard") that then lingers on screen long
enough to get captured by the *next* automatic capture, blocking the real
header text on that frame. This would be self-perpetuating for as long as
captures keep firing (which is continuous while `active`), which matches
the observed *sustained*, not just occasional, header-miss failures far
better than random OCR noise does.

This exact failure MODE (self-capturing our own screenshot side-effect) was
already found and fixed once before, but only for ONE of the three OCR
regions: `riven_variant_region_is_valid()` (`src/bin/main.rs:462`) rejects
any variant-crop text that doesn't contain the literal `FITS IN` anchor,
specifically to reject a captured Spectacle notification (see the
SEVENTH LIVE DIAGNOSTIC entry, 2026-07-25, in the Riven section above, and
the `rejects_screenshot_notifications_as_riven_variants` test at
`src/bin/main.rs:1598`). The header check (`riven_menu_anchor_present()`,
line ~429) and the action-row check inside `detect_riven_screen()` (line
~393) never got the equivalent protection - they have no defense against a
captured frame being a notification toast instead of the real game screen,
they just log it as a generic "anchor miss" and count toward the 6-miss
close threshold.

**Next step for Codex**: this is genuinely still a hypothesis, not
confirmed - the header/action anchor checks don't have per-region rejection
today. Recommended path:
1. First get direct visual proof: the diagnostic build (see below) saves
   every Riven-session capture to `/tmp/wfinfo-capture-<unix-seconds>.png`.
   Correlate timestamps against a run that shows the notification-text
   misses in `orbiter.log`, open the corresponding PNG(s), and confirm with
   your own eyes that the notification toast is really sitting over the
   header region (top-left) in the captured frame.
2. If confirmed, the fix is NOT necessarily "reject this exact string" (too
   narrow, breaks the moment KDE changes wording/locale) - consider either:
   (a) a general "does this frame look like a notification toast rather
       than game UI" heuristic (e.g. a rejection list of a few known KDE/
       Wayland system-notification phrases, matching the existing
       `FITS IN`-anchor pattern's spirit, applied to header/action checks
       too), or
   (b) the more fundamental fix: investigate whether xcap (or an upgrade
       past 0.0.4, previously deferred for a `libgbm` build failure - see
       the xcap upgrade item further up this file) can use the
       `org.freedesktop.portal.ScreenCast` API instead of
       `org.freedesktop.portal.Screenshot` - ScreenCast is the
       persistent-session, no-notification API meant for screen-sharing/
       recording use cases exactly like this, vs. Screenshot's one-shot,
       user-facing, toast-producing API. If that pans out it would remove
       the self-capture problem at the source instead of pattern-matching
       around its output.
3. Whichever fix, verify against a real live Riven reroll session
   afterward - this bug class has burned multiple "verified in isolation,
   still broken live" cycles already (see the whole Riven section above),
   so don't trust a fixture-test pass alone.

### Completed cleanup - temporary diagnostic reverted

`riven_screen_watcher()` (`src/bin/main.rs`, around where `take_screenshot`
is called in the main polling loop) temporarily called `take_screenshot(true)`
instead of `take_screenshot(false)` - this was turned on this session to
capture every Riven-session frame to `/tmp/wfinfo-capture-<unix-seconds>
.png` for exactly the investigation above. **Reverted to `false` on
2026-07-28**; normal Riven polling no longer writes every desktop frame to
disk.

### REAL BUG, FIXED 2026-07-28 - reroll-after-confirm overlay glitch

Jacob's own words: after confirming a reroll and immediately rerolling
again from the same screen, "the overlay kind of freaked out a bit, went
back to one card overlay, then back to two card with the wrong info."

**Root cause confirmed via `orbiter.log` timestamps** (no guessing - traced
the exact sequence): at 21:18:29.049Z two EE.log lifecycle events landed in
the same instant, `SelectionConfirmed` and `CycleRequested` (matches
Jacob's action: accept a roll, immediately reroll again). `riven_screen_
watcher()`'s loop only ever received and handled ONE queued event per
iteration, then fell through unconditionally into taking a real screenshot/
OCR capture attempt *before* looping back to receive the next already-
queued event. So the actual sequence was: (1) handle `SelectionConfirmed` -
writes Cycle-mode state with the just-confirmed single card (Jacob's "back
to one card"); (2) same iteration falls through and takes a screenshot,
which caught the screen still visually mid-transition, still reading as
Confirm mode; since `pending_signature` had just been cleared by step 1,
this looked like a brand-new detection and got written out as Confirm mode
paired with `stable_signature`'s cards - the *previous* roll's data, not
the new one (Jacob's "back to two card with the wrong info"); (3) only
*then* did the next loop iteration finally process the still-queued
`CycleRequested` event. Log timestamps confirm this exactly: the "detected:
Confirm" line and "Activating focused Riven capture from CycleRequested"
land at the identical timestamp, 21:18:31.636Z.

**Checked against Kronos per standing practice**: their `log_scanner.rs`
structurally can't hit this at all - it parses EE.log lines one at a time
into a `RivenState` enum and emits typed frontend events, with NO
screenshot/OCR capture interleaved into that same loop at all; capture is
triggered independently by the frontend reacting to each emitted event.
Log-line processing and screenshotting are fully decoupled for them. Jacob
confirmed 2026-07-28 ("go ahead and move to the kronos style") to move our
design the same direction, at least for this specific race.

**Fix applied**: `riven_screen_watcher()` (`src/bin/main.rs`) now drains
every event already queued in the channel (via `try_recv()` in a loop)
immediately after handling the first one, before falling through to the
screenshot/capture section - so two events landing in the same instant get
fully processed as a batch first, closing the window where a stale/
transitional capture could land between them. This is a targeted version
of Kronos's decoupling (event processing no longer has a capture
interleaved *within* a single batch), not the full architectural rewrite
(their capture is also decoupled *across* every event, triggered
independently per-event from the frontend rather than from the same
polling loop at all - that larger decoupling remains a possible future
direction if this bug class resurfaces in a different shape).
**VERIFIED**: `cargo build --release --bin orbiter` clean, all 10 tests
pass. **Live re-test still pending** - this bug class has a long history
in this file of fixes that looked right in isolation but didn't hold up
live, so don't treat this as fully closed until Jacob reproduces the same
fast-reroll-then-reroll-again sequence live and confirms no more flash-to-
wrong-info.

### Already fixed and verified this session (2026-07-28), for context

- Two lingering PaddleOCR-swap test failures (double-upscale stray
  character; missing WFI test-image fixtures) - see entry above.
- EE.log watcher permanently dying after a Proton-side delete+recreate
  race - added `rewatch_with_retry()` - see entry above.
- Riven card OCR rows joined with `" "` instead of `"\n"`, flattening
  multi-stat cards to a single line and breaking the Python-side per-line
  stat parser - see entry above. This was confirmed fixed via a fixture
  test, and this session's later live tests DID show CURRENT ROLL
  populating correctly (the original visible symptom of this bug), so
  treat this one as resolved; the NEW OFFER stuck-reading symptom from
  earlier in the session has not reappeared since, only the separate
  detection-never-succeeds symptom covered above.
- Non-atomic `riven-screen.json` write causing an intermittent
  `JSONDecodeError` in the Python overlay - fixed via temp-file + rename.
- Missing `./orbiter` flat-binary process-match pattern in three places
  (`autostart_manager.py`, `STATUS_TAB.py`, `control-panel.py`) - fixed.

All of the above were verified via `cargo test --release --bin orbiter`
(10/10 passing) and a clean `cargo build --release --bin orbiter`
(`LIBCLANG_PATH=/var/home/linuxbrew/.linuxbrew/lib` needed for bindgen in
this sandbox - may not be needed on Jacob's actual dev machine/distrobox).

## RESEARCH SPIKE — read Riven stats from Warframe's process memory instead of OCR (2026-07-30)

- [x] **REJECTED after feasibility review (2026-07-30) — do not implement.**
      Although reading already-committed Riven inventory data appears technically
      portable to Linux, attaching to and scanning Warframe's process memory comes
      too close to Digital Extremes' third-party-software/EULA boundaries. Read-only
      access does not make it approved, and the account-risk tradeoff is unacceptable
      for this project. FrameForge also still uses OCR for the unaccepted new roll on
      the reroll comparison screen, so its inventory blob would not solve the primary
      problem anyway. Keep all future Riven stat acquisition screen/OCR-based; do not
      pursue process-memory inventory or transient-roll scanning.

  **Why this exists**: even after the 2026-07-28 Tesseract→PaddleOCR swap
  fixed the "doesn't detect at all" class of Riven bugs (see the dated
  section above), a live test the same week hit a *new* OCR misread
  ("+44% Critical Damage" read as "+44% Critical I 1Damage", garbling the
  stat name enough that our own name-vs-OCR mismatch guard refused to
  grade it - functioning as designed, but still a dead end for the user).
  Jacob's reaction: OCR misreads on Riven stats have now recurred across
  multiple different engines/approaches (Tesseract, then PaddleOCR), and
  he wants to investigate a fundamentally different data source instead of
  continuing to patch individual misreads one at a time.

  **Confirmed dead end**: Warframe's EE.log does NOT contain Riven stat
  text anywhere. Checked directly against a real, current EE.log on this
  machine - the only Riven-related lines are lifecycle/menu-transition
  events already used for trigger timing (e.g. the "Cycle Riven into
  current selection?" confirm dialog), never actual stat values. No
  chat-link text either. EE.log remains useful only for *when* to look,
  never *what the stats are*.

  **Confirmed: Kronos does NOT do anything different from us here.**
  Re-verified directly against their actual source (not just assumed):
  `ocr_engine.rs`'s `recognize_riven()` runs the full PaddleOCR
  detection+recognition pipeline on the visible card crop - same category
  of approach as our own post-2026-07-28 code, same fundamental exposure
  to misreads. Their `memory_scan.rs` only reads the Warframe.Market auth
  token from memory, not Riven data. Their `log_scanner.rs` is a pure
  event-timing state machine, same idea as our own EE.log-driven triggers.
  So copying Kronos further does not solve this class of bug - they have
  never solved it either.

  **The actual lead**: `WyrmStudios/FrameForge` (GPLv3, Windows-only Tauri
  app; <https://github.com/WyrmStudios/FrameForge>) reads Warframe's
  *entire account inventory* directly out of process memory as an exact
  JSON blob (`Actual_inventory_FULL_ACCOUNT`) - not OCR, not screen
  reading at all. Its `src-tauri/src/memory_scanner.rs` defines (verified
  by reading the actual file, not just the README):

  ```rust
  pub struct BlobRivenEntry {
      pub item_id: String,           // MongoDB ObjectId hex, empty if unrevealed
      pub item_type: String,         // Lotus path, e.g. .../LotusMeleeRandomModRare
      pub riven_state: RivenState,   // Unrevealed | Revealed | Unlocked
      pub compat: Option<String>,    // exact weapon this riven is rolled for (Unlocked only)
      pub challenge_type: Option<String>,        // for Revealed (not yet completed) rivens
      pub challenge_complication: Option<String>,
      pub lvl_req: Option<u32>,
      pub polarity: Option<String>,
      pub buffs: Vec<BlobRivenStat>,   // EXACT rolled positive stats: { tag: String, value: i64 }
      pub curses: Vec<BlobRivenStat>,  // EXACT rolled negative stats, same shape
      pub mod_rank: u8,
      pub count: u32,
      pub rerolls: u32,                // Kuva-reroll count
      pub mod_name: String,            // generated riven name, computed from buffs at parse time
  }
  ```

  This is Warframe's own internal data structure, read straight out of
  memory - every owned riven (veiled, revealed-but-unrolled, or fully
  unlocked), with exact stat values, zero pixel-to-text step, zero
  possibility of a misread character. If real, this would eliminate the
  entire class of bug this research spike exists to escape.

  **Why it might transfer to Linux (unconfirmed, the actual thing to
  verify)**: FrameForge's implementation is Windows-only -
  `#[cfg(target_os = "windows")]`, using Win32 `VirtualQueryEx`/
  `ReadProcessMemory` to enumerate Warframe's committed memory regions and
  scan for the blob's literal text marker. But the *algorithm* (walk
  committed memory regions, search for a literal marker string, parse the
  JSON found after it) is the same class of operation our own
  `src/bin/main.rs` / `warframe_mem_log.py` already do successfully on
  Linux today, via `/proc/<pid>/maps` (region enumeration, the Linux
  analogue of `VirtualQueryEx`) and `/proc/<pid>/mem` (region reading, the
  analogue of `ReadProcessMemory`). Warframe on Linux runs under
  Proton/Wine, which is still an ordinary Linux process with an ordinary
  `/proc/pid/mem` - there is real reason to believe the same blob exists
  and is reachable the same way, since it's produced by the same game
  client code regardless of platform, but this has never actually been
  tried by us or (as far as this research found) anyone else on Linux.

  **Open questions a feasibility review needs to answer, not yet checked**:
  1. Does the `Actual_inventory_FULL_ACCOUNT` marker/blob actually exist,
     byte-for-byte the same, in a Linux/Proton Warframe process's memory?
     (Only checkable by actually scanning a live Linux Warframe process -
     static code reading can't confirm this.)
  2. What do the `BlobRivenStat.tag` strings actually look like (raw
     Warframe internal stat codes, e.g. something like
     `WeaponCritChanceMod`)? Need a mapping table from tag → our own
     stat-code system (the same `TAG_MAP` class of thing
     `riven_grader_watcher.py` already has for a *different* internal tag
     source - may be directly reusable or may need its own table).
  3. How large/expensive is the full-process memory scan in practice (the
     README doesn't say) - our existing EE.log ring-buffer read is a
     small, fixed-size, known-offset read; scanning for an unknown-offset
     blob across a whole process's memory is a fundamentally bigger
     operation, and would need its own performance/reliability
     characterization before treating it as production-ready.
  4. Licensing/scope: FrameForge is GPLv3 - same license family as this
     project (per `THIRD_PARTY_NOTICES.md`'s existing handling of ported
     Kronos/browse.wf logic), so porting logic (not copying code verbatim
     without attribution) should be fine, but needs the same
     provenance/compliance treatment already given to Kronos.
  5. DE's own stance: FrameForge's README notes its memory-reading feature
     is explicitly EULA-grey-area, off by default, opt-in with a warning -
     worth knowing that context before deciding to build on it, separate
     from the pure technical feasibility question.

  **If this pans out**: EE.log/screen-state detection stays exactly as it
  is today (still needed to know *when* the riven screen is open, for
  overlay timing) - only the *stat-reading* step would change, from
  OCR-the-visible-card to read-the-owned-riven-from-memory-by-matching-
  item_id/compat. The generated-name-decode/OCR-cross-check safety logic
  this project already has could most likely be retired entirely once
  stats come from an authoritative source instead of a fallible one.

## Reward overlay misaligned specifically for 3-reward (solo) missions (2026-07-30)

- [ ] **Logged only, not fixed.** Confirmed against a real live detection,
      not a guess: for a 3-reward mission, the Rust-detected box rects come
      back packed edge-to-edge with zero gap between them, e.g.
      (from `latest-detection.json`, real capture):
      ```
      Sevagoth Prime Neuroptics Blueprint: x=805,  width=316
      Forma Blueprint:                     x=1121, width=316  (starts at 805+316)
      Corvas Prime Blueprint:               x=1437, width=316  (starts at 1121+316)
      ```
      but the real screenshot from the same detection shows Warframe's
      actual 3-card layout with clearly visible gaps between the cards -
      not a subset of the 4-card grid squeezed together. OCR text itself
      was perfectly correct for all three items; this is purely a
      box-geometry/positioning bug, unrelated to the 2026-07-28
      Tesseract→PaddleOCR swap (this code path was never touched by that
      change).
      Root cause: `filter_and_separate_parts_from_part_box_impl()` in
      `src/ocr.rs` always divides the detection region into exactly
      `width / 4` slots (`box_width = filtered.width() / 4`), then for the
      3-reward case (`total_odd > total_even`) just shifts the start by
      half a box-width and uses 3 of those 4 quarter-slots
      (`curr_left = box_width / 2; player_count = 3`). This assumes
      Warframe's real 3-card layout is "the 4-card grid minus one slot,
      cards touching" - it isn't; Warframe uses wider, more spread-out
      cards for the 3-reward layout specifically. 4-reward mission layouts
      were unaffected (confirmed correct in the same session, real
      4-reward captures at `state_id=0` and `state_id=1` both showed
      correct alignment per `overlay-gtk.log`).
      **RECONFIRMED LIVE 2026-07-31:** during a six-relic memory-watcher
      verification run, every reward overlay appeared and populated in under
      two seconds, but the three-choice layout was still visibly off-center.
      Jacob supplied a screenshot showing the overlay's three columns shifted
      relative to Warframe's three reward cards. Timing passed; this geometry
      bug remains open.
      **TRIGGER-SEQUENCING OBSERVATION 2026-07-31:** during the same run,
      `Capture attempt ...` log lines began during Warframe's three-second
      countdown before the relic reward screen, while the regular mission room
      was still visible. This may simply give the existing adaptive retries an
      early start before the cards become readable; no incorrect output was
      observed across the six attempts, so it is recorded as timing evidence,
      not currently classified as a bug.

## Riven reroll overlay trigger fires ~10s late relative to the visible screen (2026-07-30)

- [ ] **Logged only, not fixed.** Live-tested during Plan 5 (OCR anchor-miss
      rescue) verification. Jacob timed two live attempts with a phone
      stopwatch: attempt 1, waited ~5s with nothing on screen at all, backed
      out; attempt 2, confirmed with an explicit timer that **no overlay of
      any kind appeared for ~10 seconds** after entering the reroll screen -
      not even the blank placeholder box the detector writes immediately on
      the `Opened` EE.log event - then the blank box appeared and real stat
      content populated within under a second after that.
      Cross-checked against `orbiter.log`/`riven-overlay.log`/`EE.log`
      directly (not inferred): the detector reacts to its `Opened` trigger
      line (`Created /Lotus/Interface/OmegaRerollSelection.swf` /
      `OmegaRerollSelection.lua: Diorama setup`) within ~50ms every time -
      the overlay's blank shell shows essentially the same instant the
      trigger fires. So the missing ~10s is not inside the detector, GTK
      overlay, or OCR pipeline at all - it's the gap between Jacob actually
      seeing the reroll screen and Warframe itself writing that EE.log line,
      almost certainly a loading/transition-animation phase before the
      Diorama scene finishes setting up.
      **This is the same category of problem as the already-deferred
      "intermittent late reward trigger" entry above** (RMI/log event firing
      late relative to the *visible* screen), just newly confirmed for the
      Riven reroll flow specifically rather than the reward-choice flow.
      That entry's own history is the relevant precedent: chasing a single
      "obviously right" trigger line by inspection repeatedly turned out to
      still be late relative to the real visible screen, and only real timed
      live tests (not log inspection alone) ever settled anything.
      **Not caused by, and does not affect the validity of, Plan 5's OCR
      anchor-miss rescue** (`docs/superpowers/plans/2026-07-30-ocr-riven-anchor-rescue.md`)
      - that mechanism fired correctly and as designed later in the same
      test session (`Riven anchor header miss rescued by still-valid card
      content`, 2026-07-30 15:14:58 PDT).
      Next investigation should look for an earlier, more reliable EE.log
      line specific to the reroll flow (same spirit as the reward flow's
      eventual switch to an earlier RMI event), and should budget for
      needing several real timed live tests rather than trusting log
      timestamps alone, since this exact flow already has a long history in
      this file of live measurement contradicting log-only inspection.

## Riven close triggers a full 60s of visible screenshotting (2026-07-31)

- [ ] **Logged only, not fixed.** Confirmed live during memory-scan-watcher
      testing (not caused by that work - reproduced with hard evidence
      before drawing that conclusion): after `Riven reroll screen closed`
      fires, `riven_screen_watcher()`'s bounded false-close recovery window
      (`RECOVERY_CHECKS = 60`, `src/bin/main.rs:722`, one xcap screenshot
      per second) runs to completion every time - confirmed via
      `orbiter.log`, exactly 60 `Screenshot via xcap monitor ...` lines
      after the close line, then it genuinely stops (not a runaway loop).
      This is working exactly as designed (a real false-close protection
      added for a real past bug - see the `RECOVERY_CHECKS` history
      earlier in this file), but the user-visible effect is a full minute
      of the portal capture indicator flashing after simply backing out of
      the Riven menu, which reads as broken/malware-like even though it
      isn't - the same category of bad first impression already fixed once
      for the *inactive* probe (see "Root cause of the earlier 'looks like
      malware' report" above) but not yet addressed for this *post-close*
      window. Worth a future pass to either shorten the window, replace
      the per-second full screenshot with something cheaper (e.g. a
      memory/EE.log activity check instead of a real capture) now that the
      memory-scan watcher exists, or make the recovery period visually
      silent somehow. Not urgent - purely cosmetic/trust, not a
      correctness bug.
      **FOLLOW-UP MEASUREMENT 2026-07-31:** Jacob reported screenshotting
      still visibly running "over 2 minutes" after he'd left the Riven
      screen (in-game, on the navigation screen). Re-confirmed directly
      against a second live occurrence: the recovery window itself is
      still correctly bounded (exactly 60 captures, then genuinely stops -
      re-verified by watching `orbiter.log` stop growing for 15+ seconds
      after the 60th). So the "2 minutes" isn't the recovery window alone
      running long - it's two delays stacking: however long the 6-miss
      close *detection* itself takes after Jacob actually leaves (anchor
      OCR has to accumulate enough misses first), plus this full 60s
      recovery window on top of that. Combined, that's a substantially
      worse real-world experience than the 60s number alone suggests.
      Reinforces that shortening/replacing this window (per the note
      above) is worth prioritizing, not purely cosmetic severity-wise even
      though it's not a correctness bug.
