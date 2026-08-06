

# Kieda's Orbiter — Project TODO

**As of 2026-08-06, GitHub Issues is the source of truth for open bugs and
feature requests** (labeled by area and severity) — this file is now a
historical/diagnostic record, not the tracker. Code fixes go into PRs that
reference an issue number (e.g. "Fixes #45") so merging closes it
automatically. See `CURRENT_TODO.md` for a short pointer list if Issues
aren't handy, and `TODO_ARCHIVE.md` for older fully-completed sections
moved out of this file.

Living checklist, shared across conversations/sessions. Check items off as they're
completed; add new ones as they come up. Source of most items below: `CLAUDE_OVERLAY_REVIEW_HANDOFF.md`
(2026-07-24 full project review) plus in-progress Dashboard editable-layout work.

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
      **RECONFIRMED LIVE AFTER TRIGGER FIX 2026-07-31:** a fresh relic run
      successfully triggered and displayed the overlay, confirming the event
      matcher fix. The reward overlay remains visibly off-center relative to
      Warframe's two-card layout (both cards are shifted right); keep the
      reward-card geometry correction open.
      **RECONFIRMED LIVE 4-CARD 2026-07-31:** a four-choice relic reward
      appeared with the overlay correctly aligned and adjusted. The remaining
      geometry validation is specifically the three-choice layout.

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

## CURRENT ROLL displays stale data that does not match the visible card (2026-07-31)

- [ ] **Logged only, not fixed. Jacob: "this is unacceptable."** Confirmed
      with two live screenshots, both showing the CURRENT ROLL panel
      (`riven_grader_overlay.py`) displaying stat text that matches
      **neither** card actually visible on screen at the time - not a
      1-second flicker, a genuinely wrong persistent display.

      **Screenshot 1 (Cycle mode, single card):**
      - Overlay CURRENT ROLL: `Arca Plasmor` / `ADVISORY · BAD` /
        `+Damage · +Reload Speed · +Status Duration` /
        `GOOD +Damage` / `OFF-TARGET +Reload Speed` /
        `OFF-TARGET +Status Duration` / `MISSING REQUIRED +Multishot` /
        `95 rerolls  Tenet Arca Plasmor · attenuation 0.55`
      - Actual visible game card: `Arca Plasmor Acri-satipha` /
        `+49.8% Critical Damage` / `+47.6% Heat` / `+65.4% Multishot` /
        `-39.8% Status Duration` / `MR 15` / reroll counter `95`
      - These share zero real stats: overlay claims
        Damage/Reload Speed/Status Duration-as-positive; the actual card
        shows Critical Damage/Heat/Multishot as positives and Status
        Duration as the **negative** (opposite sign from what the overlay
        implies). Reroll count matches (95 = 95), so this is genuinely the
        same Riven/session, just showing a stale prior snapshot instead of
        what's actually equipped right now.

      **Screenshot 2 (Confirm mode, dual card, captured ~1 reroll later):**
      - Overlay CURRENT ROLL: `Arca Plasmor` / `ADVISORY · BAD` /
        `+Damage · +Damage to Corpus · +Heat` / `GOOD +Damage` /
        `OFF-TARGET +Damage to Corpus` / `OFF-TARGET +Heat` /
        `MISSING REQUIRED +Multishot` /
        `96 rerolls  Tenet Arca Plasmor · attenuation 0.55`
      - Overlay NEW OFFER: stuck on `Reading Riven stats...`, never
        populated for the rest of the observed session.
      - Actual visible left/current game card: `Arca Plasmor Acri-satipha`
        (same card as screenshot 1) / `+49.8% Critical Damage` /
        `+47.6% Heat` / `+65.4% Multishot` / `-39.8% Status Duration` /
        reroll counter `97`.
      - Actual visible right/new-offer game card: `Arca Plasmor Croninok` /
        `+1.7 Punch Through` / `+57.6% Fire Rate (x2 for Bows)` /
        `-25.5% Critical Chance` / reroll counter `97`.
      - Overlay shows a **third**, still-different stat combination
        (Damage/Damage to Corpus/Heat) matching neither visible card. Its
        displayed reroll count (`96`) is exactly one behind the actual
        current card's reroll count (`97`) - consistent with the overlay
        being permanently one reroll cycle stale, not a one-off glitch.

      Jacob's own description, verbatim: **"if you do it quickly the game
      just doesn't update the current roll"** - rapid rerolling appears to
      prevent the live-OCR override from ever catching up at all.

      **Suspected code path** (not yet confirmed - needs real
      investigation, not a guess-fix): `riven_grader_overlay.py`'s
      `_poll()` (~line 470-504). `old` starts as the cached entry from
      `riven-graded.json` (written by the separate, slower
      `riven_grader_watcher.py` / `inventory.json` refresh cycle - can be
      arbitrarily stale). There's supposed to be a live-correction step:
      `if stable and mode == "cycle" and card_texts: live =
      _grade_visible_card(card_texts[0], old); if live and
      live.get("guidance_status") != "ocr_uncertain": ... old = live` -
      this should overwrite the stale cached `old` with a fresh grade of
      what's actually on screen, but evidently is not firing (or not
      firing fast enough relative to rapid rerolling) in these two
      captures.

      **Open questions for investigation, not yet answered:**
      1. Is `_grade_visible_card(card_texts[0], old)` actually being
         called during Cycle mode display in these sessions, or is some
         earlier condition (`stable`, `mode == "cycle"`, non-empty
         `card_texts`) failing silently and skipping the correction
         entirely?
      2. When it is called, is it returning `None` or
         `guidance_status == "ocr_uncertain"` every time (which would
         explain the override never applying) - and if so, why? Note this
         session **also** shipped a same-day change to
         `_grade_visible_card`'s line filtering (`_looks_like_stat_line()`,
         added to fix a different confirmed bug - a false `AMMO` match
         from the heading line poisoning the generated-name cross-check).
         That fix was validated against the two specific failing OCR
         captures it targeted, but was **not** validated against this
         stale-CURRENT-ROLL symptom - rule in or out whether it made this
         symptom more likely by being too strict about which lines count
         as stat lines.
      3. Why is the overlay's reroll count consistently exactly one behind
         the real card's reroll count, both times observed? This is a
         specific, reproducible offset, not random staleness - suggests
         the correction logic is either reading `card_texts` from the
         previous poll cycle instead of the current one, or `old` is being
         reassigned somewhere with an off-by-one relative to when the
         fresh capture actually lands.
      4. NEW OFFER never leaving `Reading Riven stats...` in screenshot 2
         at all, for the rest of the observed session - is this the same
         root cause as the CURRENT ROLL staleness (the live grading path
         broadly not completing), or a separate failure specific to the
         New Offer side of `_poll()`?

      **Not yet done:** no code changes attempted for this specific bug -
      Jacob asked to stop live-testing and log it precisely instead of
      guess-fixing under time pressure. Needs real investigation with
      fresh eyes (add targeted logging around the `live =
      _grade_visible_card(...)` call and its result before touching
      anything), not another live-tested patch attempt.

## Riven remediation pass started (2026-07-30)

- [x] Added targeted `live current grade start/result` logging around the
      visible-card correction path. It records mode, card count, cached
      reroll count, raw OCR, guidance status, and decoded stat sets.
- [x] Prevented a cached inventory snapshot from being rendered as the visible
      current card when stable live grading returns no result or an
      OCR-uncertain result. The UI falls back to a neutral OCR card until a
      valid live grade exists; NEW OFFER grading retains cached identity only
      as its grading reference.
- [x] Added exact-first fuzzy weapon matching for OCR insertions such as
      `ArcaF Plasmor`, with unit coverage for exact, inserted-noise, unrelated,
      and empty inputs. Python tests: 21 passed.
- [x] Reduced post-close OCR recovery from 60 screenshots (60 seconds) to 12
      bounded checks. EE.log lifecycle events remain event-driven and are still
      handled immediately.
- [x] Corrected 3-card reward geometry using the documented Warframe layout:
      retain quarter-width cards, but place their centers across thirds so the
      three rectangles have visible gaps instead of touching. Four-card
      quarter-slot geometry is unchanged. Added deterministic geometry tests
      for both layouts.
- [ ] Live validation remains required: rapid reroll/confirm/cancel, close
      indicator duration, and 3-card/4-card reward layouts.

## Follow-up live failure: reward capture starts before cards exist (2026-07-31)

- [ ] **Observed live, fix applied but not yet retested.** The reward-ready
      memory event fired correctly, but all six automatic captures were still
      mission-room frames and were rejected with `OCR resolved zero known
      rewards`. The latest failed PNG visibly shows the Defense room, not the
      reward screen. This explains why no relic reward overlay appeared.
- [x] Extended automatic reward capture from 6 attempts at 250ms spacing to 12
      attempts at 500ms spacing, giving the early EE.log trigger a bounded
      longer reveal window while avoiding unbounded desktop capture.
- [x] Added startup cleanup in `relic_recommend_watcher.py`: it now writes a
      hidden state immediately on launch. This prevents a stale visible
      recommendation file from surviving a Warframe/watcher relaunch and
      repeatedly reopening the recommender.

## Latest relic attempt: no reward trigger observed (2026-07-31)

- [x] **Root cause identified.** The live EE.log emitted
      `VoidProjections: OpenVoidProjectionRewardScreen - PostMigration: 0`,
      while `src/bin/main.rs` only matched the older
      `OpenVoidProjectionRewardScreenRMI` spelling. The watcher was active but
      could never classify the current event as reward-ready.
- [x] Broadened the specific reward-screen matcher to the shared
      `VoidProjections: OpenVoidProjectionRewardScreen` prefix. The generic
      `ProjectionRewardChoice.swf` creation line remains excluded, preventing
      the known endless-mission false trigger. Focused release test passes.
- [x] Rebuilt/relaunched the installed Orbiter binary and ran one relic
      mission: the fresh reward trigger and overlay were confirmed live.
- [x] **Adaptive-capture retest confirmed 2026-08-01:** two fresh relic
      rewards triggered capture and succeeded on attempt 2, after 3.27s and
      3.13s respectively. Attempt 1 correctly rejected the still-loading
      mission/reward frame; the later retry published the state file.
- [ ] **Subsequent live relic run had no overlay (2026-08-01):** do not count
      the prior successful runs as this test. No new reward-trigger or capture
      lines were present after the latest run, so this remains an intermittent
      trigger/runtime failure and needs a fresh log-correlated reproduction.
- [x] **Fresh correlated run 2026-08-01 05:31Z:** reward trigger fired,
      attempts 1-3 correctly rejected frames with zero known rewards, and
      attempt 4 published the state file successfully after 7.116s. This
      confirms the bounded adaptive retry can bridge the early trigger to the
      visible reward cards; the remaining concern is intermittent runs where
      no trigger/capture lines appear at all.
- [x] **Latest live relic mission produced no overlay and no reward-capture
      attempt.** After the run, `orbiter.log` contained no new `Reward-ready
      event detected`, `Capture attempt`, `Wrote state file`, or rejection
      lines; `latest-detection.json` remained the old July 30 file. This is
      therefore not evidence that the 12-attempt adaptive OCR change failed:
      the reward handler was never reached (or the running process was not the
      expected updated watcher). Verify process/build/runtime state, then
      repeat one relic mission with the live log tail before changing OCR.
- [ ] The supplied Riven screenshot remains a separate issue: the visible new
      card is readable, but `riven-screen.json` was still `stable:false`, so the
      overlay correctly showed `NEW OFFER · PROVISIONAL`. A fresh build/live
      retest is needed to see whether the longer OCR consensus window or the
      live-grade diagnostics resolves it.
- [x] Adjusted Riven OCR consensus to ignore the changing MR/reroll badge line
      (`MR 15 0100` versus `MR 15 0101`) while retaining weapon/stat text for
      identity. Added a regression test; focused Rust Riven tests pass.
- [x] Removed stale NEW OFFER reuse: failed offers are now cleared instead of
      carrying forward from an earlier comparison, and a confirmed roll is
      promoted only after grading the card Rust emitted for that confirmation.
      If that transitional card is not gradeable yet, the overlay suppresses
      it until the next stable cycle capture rather than showing an unpicked
      offer.
- [x] Suppressed cached CURRENT ROLL data during unstable OCR/animation frames.
      Rapid rolls could briefly render the cached previous offer before the
      left card had been live-graded; unstable frames now show neutral
      provisional OCR instead of labeling cached stats as current.
- [x] Changed the neutral fallback text to `Reading Riven stats — please
      wait…` so transitional frames do not look like a real card.
- [x] Reworked Riven placement to fixed vertical slots matching the supplied
      layout: CURRENT ROLL is always in the lower-left slot; NEW OFFER appears
      in the upper-left slot only during Confirm mode. Cycle mode uses only the
      lower slot, and Confirm mode uses one fixed-width vertical stack instead
      of switching between wide horizontal and narrow layouts.
- [x] Split CURRENT ROLL and NEW OFFER into separate top-level overlay windows.
      Each can now be shown/hidden independently in the requested upper/lower
      slots. Both windows are marked non-focusable to reduce the chance of the
      overlay consuming Warframe keyboard input (including `E`).
- [x] Corrected Confirm-mode positioning so the CURRENT ROLL window uses the
      lower slot and NEW OFFER uses the upper slot. A first split-window build
      accidentally applied the upper coordinates to both windows, causing the
      overlap shown in live testing.
- [x] Narrowed both independent cards from 520px to 380px and enabled stat/
      grade wrapping so they occupy the taller, narrower red-box regions
      without covering the in-game Riven cards.
- [x] Unified both window widths with the same explicit scaled card width and
      slightly increased typography. Wrapped content now grows vertically
      instead of allowing CURRENT ROLL and NEW OFFER to size differently.

## Claude handoff — memory watcher and relic validation (2026-08-01)

### Completed and live-confirmed

- Memory-based EE.log watcher starts successfully and uses the discovered
  Warframe ring buffer.
- Riven opening/rolling behavior and the fixed two-window layout were live
  tested; the remaining Riven concern is downstream OCR/provisional grading,
  not the memory trigger.
- Relic reward trigger matcher now accepts both Warframe event spellings:
  `OpenVoidProjectionRewardScreenRMI` and the current
  `OpenVoidProjectionRewardScreen - PostMigration: 0` form. The focused Rust
  regression test passes.
- Adaptive reward capture was live-correlated: early attempts rejected
  mission/loading frames, then attempt 2 or 4 succeeded once cards existed
  (examples: 3.13s, 3.27s, and 7.116s). A four-card reward overlay was also
  confirmed correctly aligned.

### Still open, do not mark complete

- Three-card relic reward geometry remains visibly off-center; four-card
  geometry is confirmed correct.
- Some later relic runs produced no overlay and no new trigger/capture lines.
  This is an intermittent trigger/process/runtime issue, distinct from the
  adaptive OCR timing path. Do not infer OCR failure when no `Reward-ready`
  line exists.

### Next owner action

1. Reproduce one no-overlay run with a fresh `tail -F` log started before the
   mission; classify it as (a) no trigger, (b) trigger plus all rejected
   captures, or (c) state written but GTK not shown.
2. For a no-trigger case, inspect the running process/binary and memory watcher
   lifecycle before changing OCR or retry timing.
3. Fix and live-test the three-card geometry separately.

The latest source changes are intentionally uncommitted alongside the existing
dirty worktree; preserve unrelated edits when committing or branching.

## 2026-08-01 (evening) - Live test list (blocking PR #18 and #19 merge)

  The following need a real live Warframe session to confirm before further
  merges/closures. PR #18 and PR #19 are held open (not merged) until their
  items below are confirmed - both touch behavior that can only be verified
  live, not via unit tests.

  1. **PR #18 (stale CURRENT ROLL / NEW OFFER fix, supersedes #14 and #9)**
     - needs a rapid-reroll session (same shape as the one that produced
       issue #7) to confirm CURRENT ROLL no longer shows stale data and
       NEW OFFER doesn't resurrect a previously-rejected offer.
  2. **PR #19 (two-window overlay layout)** - not yet live-tested; confirm
     CURRENT ROLL and NEW OFFER render correctly as separate fixed-position
     windows during a real reroll session.
  3. **Issue #3 - intermittent late reward-choice overlay trigger** -
     retest now that PR #16 (trigger spelling + capture window widening)
     is merged; check whether it's resolved or still reproduces.
  4. **Issue #5 - Riven reroll overlay fires late relative to the visible
     screen** - needs a timed live session to check whether this is still
     happening post-fixes.
  5. **Issue #4 - 3-reward overlay misalignment** - retest once PR #13
     (general reward-centering geometry) merges, on a real solo (3-reward)
     mission.
  6. **Issue #12 - reward overlay intermittently invisible despite
     successful detection** - stacking-race hypothesis, not yet confirmed
     live; needs a session where it reproduces to check overlay/window-manager
     behavior.
  7. **Issue #6 - 60s of visible screenshotting on Riven close** - should
     now be much shorter after PR #15's 60->12 recovery-window reduction;
     confirm the actual visible duration live.

## 2026-08-02 - Round-4 no-overlay root-caused: EE.log watcher dropped one line

  Live evidence: a relic mission's round-4 reward screen had no overlay
  even though Warframe's own EE.log confirms it fired (5 reward-screen
  trigger lines in the session; `log_watcher()` in `src/bin/main.rs` only
  turned 4 into a `Reward-ready` detection). Not a process crash - the
  process stayed running and correctly caught the very next reward screen
  9 minutes later. Root cause: `position` was set to a `metadata().len()`
  snapshot taken BEFORE the read loop ran, so a line appended between that
  snapshot and the reader reaching true EOF could be silently skipped.
  Cephalon Kronos hit the same bug class tailing its own EE.log ring
  buffer (commit `bcb44b1d`) and fixed it by abandoning a single trusted
  cursor in favor of full re-scan + dedup - applied the same idea:
  8KB safety-margin re-read each cycle, actual `stream_position()` instead
  of the pre-read snapshot, bounded recent-lines dedup, and per-cycle
  debug logging of the seek/read range.

  8. **PR #21 (EE.log watcher missed-line fix)** - not yet live-tested;
     needs a multi-round relic session (4+ rounds) to confirm no reward
     screen goes without an overlay again, and to see the new per-cycle
     debug logging in action if it happens again despite the fix.

## 2026-08-02 (night) - Live relic session findings: 2nd bug class + positioning regression

  Live relic mission run tonight, memory-based EE.log watcher active
  (not the file-based one PR #21 fixed). Two real, separate findings:

  9. **Reward-overlay positioning regression - overlay renders in the
     top-left corner, not near the actual reward boxes.** Confirmed on
     both a 3-item and a 2-item reward round. `overlay-gtk.log` shows the
     window being commanded to a position near the real boxes
     (`window_pos=(root_x=2565, root_y=124)`, computed from the OCR
     rects) for both rounds, but Jacob directly observed it rendering in
     the top-left corner instead - meaning either the window manager is
     silently overriding/undoing the position after GTK reports it
     applied, or something resets it back to a default corner shortly
     after. `x11_overlay.py`'s existing diagnostic logging (added earlier
     tonight for issue #12) produced zero output for either round -
     every step in the show sequence reported success, so this isn't an
     API-level failure our current instrumentation can catch; it needs
     new diagnostics specifically comparing "position we told the window
     to go to" against "position it actually ends up at a moment later"
     (e.g. re-reading `window.get_position()` or the raw X geometry a
     short delay after the show sequence completes, not just
     immediately after issuing the position calls). Also worth checking
     whether this is new because PR #13's generalized geometry changed
     card widths/positions in a way that interacts differently with the
     WM than the old hardcoded 3-card path did.

  10. **A second, distinct "reward screen never detected" bug - not the
      one PR #21 fixed.** A ~9.5 minute gap with zero `Reward-ready`
      events between two otherwise-working rounds; the missed round had
      4 reward items. Tonight's session used `memory_log_watcher()`
      (`src/bin/main.rs`), which already does full-buffer rescan + hash
      dedup every 150ms cycle - a design that should already be immune
      to the incremental-cursor bug PR #21 fixed in the file-based
      watcher. No error, no crash, nothing abnormal logged for that
      round. Leading theory (unconfirmed): a full-buffer overwrite
      landing between two 150ms polls during a bursty scene-load
      transition, losing the target line before it was ever captured in
      any snapshot - but the read window is already the 1MB cap
      (`src/mem_log.rs` `MAX_READ_SIZE`), which is a lot of text to fully
      overwrite in 150ms, so this needs real evidence, not more
      speculation. PR #22 adds debug-level per-cycle logging
      (buffer_len/total_lines/new_lines/seen_count) so a repeat
      occurrence leaves an actual trace instead of requiring
      after-the-fact timing reconstruction.

  11. **PR #22 (memory watcher cycle diagnostics)** - not yet live-tested;
      needs a session with `WFINFO_LOG=debug` running to actually catch
      the bug in the act, since it's purely diagnostic, not a fix.

  12. **Root-caused finding #9 above (positioning regression) - PR #23.**
      Jacob confirmed directly: "something's messing up the overlay is
      that I've moved it" - not a window-manager bug at all. The reward
      overlay's dragged position was a single monitor-relative offset
      reused identically across every reward count; a drag saved during
      a 4-item round replayed as-is on 2-/3-item rounds on a different
      monitor, landing nowhere near that round's actual boxes. Fixed by
      keying the saved position file per reward count instead of one
      shared file (`overlay-gtk-position.json` for 4, `-2`/`-3` suffixed
      files for smaller counts) - `gtk_overlay_drag.py`'s `enable_drag()`
      now accepts a callable position_file, resolved fresh per drag.
      **Not yet live-tested** - needs a session where Jacob drags each
      reward-count layout separately and confirms they hold position
      independently afterward.

## 2026-08-03 - Queued feature: Nightwave + Deep/Temporal Archimedea tracking

  Not started - Jacob asked to queue this, not implement yet.

  1. **Nightwave task tracking** - show which current Nightwave
     (weekly/daily) challenges are still incomplete, so Jacob can see at
     a glance what's left to focus on this act/week.
  2. **Deep Archimedea** - show the current week's mission list and the
     loadout each mission requires (deviations/decrees interact with
     specific frame/weapon choices).
  3. **Temporal Archimedea** - same as above: current mission list +
     required loadout per mission.

  Needs research before implementation: confirm what real-time source
  actually exposes current Nightwave/Archimedea state (WFCD-style static
  data won't have rotating weekly content) - likely the same category of
  work as the existing warframestat.us/WFCD drop-data integration this
  project already uses elsewhere, or Warframe's own API if reachable.
  Check for prior art (Kronos, other companion apps) before designing
  anything new, per standing research-first direction.

## 2026-08-03 (night) - Service-lifecycle refactor: Phases 1-2 done

  Jacob requested the "full refactor" after two audit files
  (`claude_audit_findings.json`, `claude_fix_suggestions.json` - both
  legitimate and accurate, unlike an earlier `audit_report.txt` that
  described an unrelated Angular/RabbitMQ codebase and was disregarded).
  Full plan written to
  `docs/superpowers/plans/2026-08-03-service-lifecycle-refactor.md`,
  phased per the audit's own priority order. Two phases implemented and
  PR'd tonight; deliberately stopped there rather than pushing through
  all five phases in one sitting, per the plan's own "each phase its own
  PR, don't destabilize the app" constraint.

  - **PR #24** - fixed the actual concrete bug found while diagnosing
    tonight's "Status tab says online but nothing is really running"
    report: `is_running()`'s substring matching counted a diagnostic
    `python -c "..."` one-liner as a running orbiter/overlay process,
    because its own inline script text happened to mention those path
    patterns. Live-reproduced, not theoretical.
  - **PR #25** (stacked on #24) - Phase 1, `FIX-PROCESS-01`: structured
    PID-based service registry (`service_registry.py`), replacing
    substring-scan liveness checks with precise PID + `create_time()`
    comparison. Falls back to the substring scan only when there's no
    registry entry at all.
  - **PR #26** (stacked on #25) - Phase 2, `FIX-PROCESS-02`: directly
    fixes two live-confirmed silent-death bugs - (1) `detector`/`watcher`
    were never reconciled after their one-time launch at app start, so a
    mid-session death (like orbiter's tonight) was never noticed or
    recovered; (2) `warframe-watcher.py`'s own `log()` had no safety net
    against its own write failing from inside an exception handler,
    which is the likely exact mechanism behind the "STOP ... reason:
    unspecified, then 12+ hours of total silence" bug from earlier
    tonight. Also adds a persisted heartbeat so a stalled-but-alive
    watcher is distinguishable from a genuinely dead one.

  **Not yet live-tested** - all three PRs need a real session:
  confirm the Status tab agrees with reality, deliberately kill
  orbiter/watcher mid-session and confirm `reconcile_always_on()`
  brings them back, and confirm the heartbeat-staleness display works.

  Phases 3 (error diagnostics), 4 (atomic config writes), and 5 (update-
  pipeline robustness) remain unimplemented - see the plan doc for scope.
  The audit's package-reorganization suggestion (`FIX-ARCH-01`/`02`) was
  deliberately excluded from the plan entirely - see "Deliberately
  excluded" in the plan doc for why.

## 2026-08-04 (night) - Bug: not all owned items are being detected

  **Fixed 2026-08-05** (PR #37): root cause was populate_equipment.py's
  resource_counts only reading inventory.json's MiscItems category, never
  Recipes (where Blueprints live) - Shedu Blueprint now correctly shows
  as owned. A related but separate staleness bug (Afentis Prime showing
  as needed despite being fully mastered - tabs never refreshed after
  "Refresh Data") was fixed in PR #39 via a new shared inventory_data.py
  cache. See the 2026-08-05 live-test findings section below for further
  issues found while validating these two fixes.

## 2026-08-05 (live-test findings after PR #39) - by severity, not yet fixed

  All items below are queued, NOT started - Jacob asked for a severity-
  ordered TODO entry before any further work, found while live-testing
  PR #39 (shared inventory_data.py cache / Set Progress+Equipment tab
  reload fix).

  ### High severity

  - [ ] **Set Progress undercounts multi-quantity parts.** Afuris Prime
        shows "3/4, just need Receiver" in Set Progress, but the actual
        in-game Foundry/Inventory screen shows 1 Barrel and 2 Receivers
        still needed - i.e. real total parts needed is higher than what
        Set Progress reports. Set Progress's `_compute_set_data()` (and
        the underlying owned/auto_crafted counting in
        `_build_sets_tab`/`missing-parts.py`) appears to treat each part
        *name* as a single yes/no unit (own 1 = satisfied) rather than
        tracking the real required quantity per part - Jacob: "this is
        probably going to be consistent throughout [Set Progress]," i.e.
        suspected to affect every multi-quantity part, not just Afuris
        Prime's Receiver. Needs the actual per-part required quantity
        (not just presence) cross-referenced against real owned count.

  - [ ] **Almost all Equipment tabs can't be sorted by clicking column
        headers** - confirmed working only for Arcanes and Modular
        Weapons; every other Equipment tab (Warframe, Primary, Secondary,
        Melee, Archwing, Necramech, Sentinel, Sentinel Weapon, Pet - all
        built via `equipment_tabs.py`'s `EquipmentTabBuilder`) has no
        working column-click sort, unlike the fix just added to Set
        Progress's table in PR #39. Likely the same missing
        `sectionClicked` wiring needs to be added to
        `EquipmentTabBuilder`'s `QTreeWidget` header the same way it was
        added to Set Progress's `QTableWidget` header.

  ### Medium severity

  - [ ] **Inventory is missing an Amps tab/category entirely.** No
        tracking exists anywhere in the Inventory/Equipment section for
        Amps (Operator/Drifter weapons) - not in
        `equipment_tabs.py`'s `TAB_CONFIG`, not in `populate_equipment.py`.
        Needs a new tab added following the existing per-category pattern
        (WFCD source file + inventory key(s) for ownership/mastery).

  - [ ] **Sigils are miscategorized as "Emblems."** Also: "Acolyte Emblem"
        (currently listed) doesn't exist as a real Warframe item - the
        real item is "Acolyte Sigil." Whatever collectible-list source
        `EMBLEM_TAB.py` builds from needs Sigils split out into their own
        category (or correctly relabeled) instead of being lumped into
        Emblems, and the bad "Acolyte Emblem" entry needs to either be
        renamed to "Acolyte Sigil" or moved to wherever Sigils end up
        living.

  ### Low severity / new features (not bugs)

  - [ ] **Add a Challenges section under Collectibles** - tracking for
        in-game Challenges (daily/weekly/etc. - scope of exactly which
        challenge types not yet specified by Jacob) doesn't exist
        anywhere in the app yet.

  - [ ] **Add a Syndicates section** (location in the sidebar not yet
        decided - possibly its own top-level section). Should show, per
        syndicate: current standing out of the max standing for the
        player's current rank/level with that syndicate (max scales with
        rank), and remaining daily standing cap. Needs research into
        what inventory.json/the Warframe API actually exposes for
        syndicate standing + daily caps before this can be scoped
        further. **RESEARCH NOTE 2026-08-06:** `D-Goth/Warframe-Tracker`
        and `Oreshec/warframe-mods-analyzer` both implement syndicate
        standing tracking as reference points - see the new feature
        backlog below.

## Architecture note - overlay stutter fallback option (2026-08-06)

  Reviewed `albrektsson/warframe-lite` (closest Linux/X11 architectural
  sibling) as part of a broader repo comparison. It splits into three
  separate binaries (overlay, tray, settings) specifically so overlay
  rendering is isolated from other work and can't be blocked by it.
  Jacob and Claude agreed **not** to pursue this now - our overlay
  stutter root causes found so far (X11/capture-lock contention, OCR
  blocking) were fixed with targeted patches, not a process-split, and
  the refactor cost (pulling apart whatever currently shares a process
  with the overlay, adding IPC, re-verifying all timing-sensitive logic
  like capture locks/heartbeats) is high for an unproven benefit.
  **Keeping this noted as a fallback**: if a future overlay stutter/
  responsiveness bug turns out to be genuinely unresolvable with
  targeted fixes and is traced back to process-sharing specifically,
  revisit this multi-binary split as the structural fix.

## New feature backlog from repo comparison (2026-08-06), by priority

  Found while reviewing six other Warframe community tools
  (`Oreshec/warframe-mods-analyzer`, `Ezeqielle/aowa-agent`,
  `albrektsson/warframe-lite`, `Warframe-Frames/.github`,
  `D-Goth/Warframe-Tracker`, `NightmareFTW/NightmareFTW.github.io`) for
  features/trackers wfinfo-ng doesn't have yet. Jacob asked to add all
  of these, in priority order, tackled one at a time - none started yet.

  1. [ ] **Worldstate/cycle timers** - Void Fissures, Sorties, Baro
         Ki'Teer location+countdown, Archon Hunt, Cetus/Vallis/Deimos
         day-night cycles, Arbitrations. Seen in `aowa-agent` and
         `NightmareFTW.github.io`. Sourced from the free public
         **warframestat.us** API - no game-client memory-scan or OCR
         needed, so this is independent of our existing detection
         pipeline. Highest priority: cheap, high value, no dependency
         on anything fragile.

  2. [ ] **Searchable drop-table browser** - filterable by
         source/rarity/relic tier/planet, ~14,000+ entries in
         `NightmareFTW.github.io`'s version, built from WFCD-parsed drop
         data (same WFCD data source we already use elsewhere in the
         app). Complements existing relic-reward detection. Static
         data, low effort.

  3. [ ] **Syndicate standing tracking** - current standing vs. max for
         player's rank, remaining daily cap. This is the existing
         "Add a Syndicates section" TODO item above (Low severity
         list) - `Warframe-Tracker` and `warframe-mods-analyzer` are
         reference implementations; the latter also value-scores
         syndicate mods by price-per-standing-cost using
         warframe.market data, which could be a nice bonus once basic
         tracking exists.

  4. [ ] **Prime vault/access status tracking** - which Prime
         Warframes/weapons are vaulted vs. currently available. Seen in
         `Warframe-Tracker`. Static WFCD-sourced data, low effort.

  5. [ ] **Farm/foundry component calculator** - what's still needed to
         build a target frame/weapon and where to farm it. Seen in
         `Warframe-Tracker`. Overlaps significantly with our existing
         equipment/mastery/Set Progress data (`missing-parts.py`,
         `_build_sets_tab`) - likely extends that existing
         infrastructure rather than needing new data sources. Blocked
         behind fixing the Set Progress multi-quantity-undercounting
         bug above, since this would inherit that same bug if built on
         top of it now.

  6. [ ] **Archon Shard inventory/allocation tracking** - which shards
         are owned and how they're allocated. Seen in
         `Warframe-Tracker`. Small addition given we already track
         equipment; needs confirming what `inventory.json` actually
         exposes for shard allocation.

  7. [ ] **Kuva Lich / Sister of Parvos tracking** - active Lich/Sister,
         element, and bonus tracking. Seen in `Warframe-Tracker`. More
         complex than the others - likely needs live game-state (not
         just static WFCD data) for which Lich/Sister is currently
         active and its rolled bonus, so needs scoping against what's
         actually readable from memory-scan or `inventory.json` before
         committing to it.

  8. [ ] **Ayatan/Baro checklist + Incarnon Genesis circuit rotation
         tracking** - note: `AYATAN_TAB.py` already covers ownership
         tracking for Ayatan sculptures; `Warframe-Tracker`'s version
         additionally bundles a "has Baro brought me this yet" checklist
         across vendor visits, which is a different feature (shopping
         list, not ownership). Incarnon circuit rotation tracking (which
         weapons are available in the current Steel Path circuit
         rotation) is entirely new. Lowest priority - nice-to-have, not
         a reported gap or bug.

