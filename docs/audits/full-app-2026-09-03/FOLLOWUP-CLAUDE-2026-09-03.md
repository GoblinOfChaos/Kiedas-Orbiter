# Audit Follow-Up — Claude, 2026-09-03 (continuation of the Codex audit in this directory)

## Status

This continues the audit in `MASTER-REPORT.md`/`FAILURES.md` (Codex, same day). That audit was itself explicitly incomplete — its own status line says so, and its "work still required" section lists the screen-by-screen runtime pass, overlay testing, and the live gameplay matrix as not yet done. This document covers work done after that point:

- Live runtime screenshots of 9 screens (Dashboard, Prime Resurgence, Market, Inventory, Foundry, Mods, Rivens, Relics, Cosmetics) — confirmed rendering correctly.
- Source-level review of the remaining 11 screens (RelicPlanner, Collectibles, Adversaries, Wiki, About, Mastery, Maps, Notes, Checklist, Settings, History) by parallel review agents.
- Source-level review of all 6 overlay components (RelicRewardOverlay, RivenOverlay, ToastOverlay, SidebarOverlay, RelicPickerOverlay, OverlayRouter).
- Source-level review of the full Rust backend (`main.rs`, `log_scanner.rs`, `overlay_utils.rs`, `memory_scan.rs`, `mem_reader.rs`, `market.rs`, `pricer.rs`, `ocr.rs`, `ocr_engine.rs`, `weapon_i18n.rs`).
- A live-reproduced bug: a Riven comparison overlay got stuck visible on screen after the in-game Riven menu was closed, confirming a race condition already suspected from source review. Cleared manually via window-manager unmap; root cause traced fully (see Critical/High below).
- A systemic acquisition-data bug found via a live report ("Follie" the Warframe showing Prex Card text) and then traced to its full scope (~60+ affected items) via targeted data-collision scan.
- Locale key-parity re-verification (corrected an earlier flawed check) and one precisely-traced permanent-untranslatability bug.

Nothing in this document was fixed — read-only investigation throughout, per standing project rule (AGENTS.md #2).

## Findings

Findings are grouped by severity. Each cites its file/line and was independently verified, not inferred.

### Critical

**C1 — Inventory history is silently destroyed once it exceeds 10,000 entries**
`src-tauri/src/main.rs:720-724`, `diff_and_save_inventory`:
```rust
if history.len() > 10_000 {
    let trimmed = history.split_off(history.len() - 10_000);
    let _ = trimmed;
}
```
`Vec::split_off(at)` returns the tail (`at..len`) and leaves the original holding only the head (`0..at`). This keeps `history` (the *oldest* entries) and discards `trimmed` (the *last* 10,000 — what the comment says should be kept). The first time history crosses 10,001 entries, it's silently truncated to a sliver of the oldest records. Runs on every monitoring poll (~every 3 minutes). No error is surfaced.

**C2 — Notes: unsaved edits are lost on app close, with no warning**
`src-tauri/src/main.rs:4139-4150`, the `CloseRequested` handler calls `std::process::exit(0)` immediately for the main window — never `api.prevent_close()`, never gives the frontend a chance to flush dirty note state. `src/screens/Notes.jsx` only persists via a 15s autosave interval, a tab-switch save, or a fire-and-forget unmount save — none of which fire on process exit. Typing into a note and closing the app within the 15s window (routine, not an edge case) loses those edits permanently, no prompt.

**C3 — ~60+ items display wrong acquisition text due to a systemic name-collision bug**
`src/lib/acquisitionInfo.js:757-760`:
```js
const overrideText = overridesData?.mods?.[displayName]
  ?? overridesData?.components?.[dropIndexKey]     // safe: unique per item
  ?? overridesData?.components?.[displayName]       // unsafe: shared across item types
  ?? overridesData?.components?.[`${displayName}|Blueprint`];
```
The bare-`displayName` fallback fires before the (often correct) `|Blueprint`-suffixed key. Confirmed live: the Warframe "Follie" shows Prex Card text ("Prex are cards that depict an artwork of a Warframe or character...") instead of its own acquisition info. A full data-collision scan found this is systemic, not a one-off:

- **Class 1 (34 items)**: bare key masks the item's own correct text sitting under `X|Blueprint` in the same file. Affects Galatine, Nikana, Viper, Silva & Aegis, Attica, Spira, Hek, Scoliac, Serro, Grattler, Akmagnus, Quanta, Tiberon, Okina, Corinth, Twin Grakatas, Tonkor, Cassowar, Dual Kamas, Guandao, Lesion, and Warframe entries overlapping with Class 2.
- **Class 2 (26 Warframes + 2 Color Palette items)**: Warframe display name collides with a Prex Card of the same name (the Follie pattern exactly). Affects Ash, Atlas, Caliban, Citrine, Cyte-09, Dagath, Dante, Ember, Garuda, Gauss, Grendel, Gyre, Ivara, Jade, Koumei, Lavos, Nezha, Nova, Protea, Sevagoth, Styanax, Temple, Titania, Vauban, Voruna, Xaku, Yareli, plus "Rhino Heirloom" and "Ember Heirloom" (Color Palette).
- **Class 3**: "Gara" (Warframe) and "Slap" (Kitgun component) collide with Creator Glyph text.
- **Class 4**: 6 pets (Pharaoh/Medjay/Vizier Predasite, Crescent/Panzer/Sly Vulpaphyla) collide with unrelated Conservation "wounded prey" Misc items, showing plushie-purchase text instead of breeding info.
- **Class 5**: smaller one-offs — "Sacred Vessel" (Gear/Key vs. Ship Decoration), "Lunar Renewal Soar Sigil" (Skin vs. Sigil).

**Fix is a code change, not a data edit**: reorder the fallback chain to prefer type-scoped keys (`|Blueprint` etc.) over the bare-name fallback, or stop trusting the bare-name fallback when a more specific key exists. Does not require touching any of the ~60 already-curated text values individually.

### High

**H1 — Riven overlay can become permanently un-hideable (live-reproduced)**
Two compounding bugs in the show/hide path:
- `overlay_utils.rs:13-15` documents a known Tauri 2 bug: `get_webview_window(label)` returns `None` for *all* windows after any `add_child` call corrupts an internal registry — worked around elsewhere via `find_overlay_window()`/a cache. `hide_overlay_window` (`main.rs:2207-2217`) never uses that bypass; `show_overlay_window`'s internal path does. Once the corruption occurs (reachable — `add_child` is called at `main.rs:3730`), hide silently no-ops while show keeps working, and the overlay can never be hidden again short of an app restart.
- Independent of that: `RivenOverlay.jsx`'s `show()`/`hide()` (lines 255-278) each fire a separate unawaited `invoke()` with no ordering guarantee and no generation/cancellation guard (unlike the OCR calls in the same file, which do have one). `hide_overlay_window` is a trivial, near-instant Rust call; `show_window_internal` (`overlay_utils.rs:499-703`) does monitor lookup, X11 property writes, and a **hardcoded 50ms sleep** plus several more round-trips — so a `show` reliably outlasts a `hide` fired shortly after it, and re-maps the window at the raw X11 level with no way to know a hide happened in between.
- Live-reproduced this session: a Riven comparison overlay stayed visible on screen after the in-game Riven menu was closed. Cleared manually via `xdotool windowunmap` (window manager level); the app's own internal state was left inconsistent (still believed the overlay visible) until the app was restarted.

**H2 — Live-confirmed reward misidentification, root cause found**
`src/lib/relicParser.js`, `fuzzyMatchReward()`, lines 823-850. The scoring loop only checks whether every word in a *candidate* name appears in the OCR text — never the reverse. A general/parent name (e.g. "Yareli Prime Blueprint") and a more specific component name (e.g. "Yareli Prime Chassis Blueprint") both score a perfect 1.0 against OCR text "Yareli Prime Chassis Blueprint," because the parent is never penalized for missing "Chassis." Ties go to whichever candidate appears first in the DE drop-table manifest order — arbitrary, not correctness-based. Reproduced live on 2026-09-03 (see Codex's OCR-LIVE-001) and now root-caused.

**H3 — Fabricated reward data on low-confidence OCR**
`src/contexts/MonitoringContext.jsx:1113-1120`. When no fuzzy match clears the 0.65 threshold, the code invents a synthetic item: a `uniqueName` that doesn't exist in any export table, and a ducat value guessed from a naive "contains the word BLUEPRINT" check (15 or 45). Directly conflicts with the project's own documented "zero fallback text, nothing invented" rule (`docs/RECURRING_ERRORS_REPORT.md`).

**H4 — Inventory's 1-click Sell can post a duplicate real Warframe.Market listing**
`src/screens/Inventory.jsx:216-260`, `handleSellOnWfm`. Tracks a `sellStatusMap` loading state but never uses it to disable the Sell button — unlike `Market.jsx`'s own close/delete buttons, which correctly disable during their request. A double-click or slow network response creates two separate real listings from one intended action. Also posts at an app-computed price estimate with no confirmation/preview step.

**H5 — Maps.jsx: typing in marker labels/notes can silently lose keystrokes**
`src/screens/Maps.jsx:369-375`, `593-596`, `655-658`. Every keystroke in a marker's label/notes field fires an unawaited, undebounced full-file overwrite (`invoke('write_map_config', ...)`, backed by a plain `fs::write` with no lock or version check). Concurrent writes have no ordering guarantee; a later keystroke's write can complete before an earlier one's, so the file can end up holding stale content and silently drop part of what was typed.

**H6 — Settings.jsx: clearing the EE.log path permanently breaks the log scanner**
`src/screens/Settings.jsx:418-429` saves an empty string with no validation. `src-tauri/src/main.rs:2822-2833`, `get_setting_string` returns `Some("")` for an emptied field — it only returns `None` for a genuinely missing key — so the fallback to auto-detection never fires. The scanner then loops forever trying to open an empty path. No debounce on the same field also means every keystroke while typing a path restarts the scanner mid-type.

**H7 — EE.log rotation is not handled at all**
`src-tauri/src/log_scanner.rs:1033-1104`, acknowledged in the code's own comment. If Warframe recreates `EE.log` (happens on every relaunch), the held file descriptor keeps pointing at the old inode; the scanner sits at permanent EOF against a dead file, silently, with no reopen/restart logic.

**H8 — Inventory files bypass the app's own atomic-write pattern**
`src-tauri/src/main.rs` lines 612, 675, 729, 1034 use plain `fs::write` for `nemesis-history.json`, `inventory_snapshot.json`, `inventory_history.json`, `inventory.json` — unlike `settings.json`, which consistently uses the `write_json_atomic()` helper built specifically because a process killed mid-write corrupts a file in place. `load_inventory_history` (line 745) then treats a corrupt/truncated file as an empty history (`unwrap_or_default()`), not an error. No lock (unlike `settings_lock`) also allows two overlapping saves to clobber each other's appended history entries.

**H9 — Linux memory reads can silently return stale data as fresh**
`src-tauri/src/mem_reader.rs:66-73`. `read_at`/`pread64` can do a short read without erroring; the return value's byte count is discarded entirely, so a short read looks identical to a full success. `Vec::resize` (used to size the read buffer) doesn't re-zero on a no-op resize, so a short read leaves stale prior-cycle bytes in the tail of the buffer, which then gets treated as fresh EE.log content — potentially silently missing a cycle's worth of real game events. The Windows sibling function and `memory_scan.rs`'s own Linux scanner both correctly check for this; only this one function omits it.

**H10 — Stale/non-primary data source** *(Codex, re-confirmed still open)*, **H11 — Path traversal in file commands** *(Codex, re-confirmed still open)*, **H12 — Exposed JWT credential** *(Codex, re-confirmed still open)*, **H13 — Clean-install packaged resource path mismatch** *(Codex, re-confirmed still open)*, **H14 — Notifications never fire** *(Codex, re-confirmed still open)* — see FAILURES.md for full detail, not re-derived here.

### Medium

**M1 — Every riven scan leaks raw i18n keys into the overlay UI**
`RivenOverlay.jsx` lines 453-454, 457 call `t()` with keys missing the `ui.` prefix used everywhere else in the file. Those bare keys exist in `en.json` but *outside* the `ui` object the loader actually reads, so `t()` falls back to returning the key text itself. The tier/roll summary line renders literally as `riven_overlay.tier_meta Weapon · riven_overlay.roll_perfectriven_card.rolls` on every successful scan. Same bug in `src/components/RivenCard.jsx:250`.

**M2 — Overlay riven grade can never show S/God Roll**
`RivenOverlay.jsx:202` hardcodes `perfectness: 0` when grading a live-scanned riven; `rivenGrader.js` only awards grade S at `perfectness >= 97.5`. The same riven can correctly show S on the main Rivens screen (which uses real computed perfectness) while capped at A in the overlay.

**M3 — History screen: three real bugs**
- Chart tooltips never translate — `CustomTooltip` doesn't receive `t` at all (`History.jsx:152-153`), falls back to capitalizing the raw metric key.
- Multi-metric charts render broken/gappy — each metric is downsampled independently to different x-coordinates, then merged without `connectNulls`, producing visibly disconnected line segments when 2+ metrics or tracked items are active.
- Toggling a single cached metric still re-sorts/re-filters the entire history array (up to 10,000 entries) every time, defeating the caching the code's own comment says it's for.

**M4 — Checklist: two named tasks never auto-track, one dead-code reference**
"Pulses" (Netracell/Archimedea) and "Syndicate Standing" have zero auto-tracking logic despite being the exact tasks `RECURRING_ERRORS_REPORT.md` names as needing `PeriodicMissionCompletions` support. Separately, dead code sets `auto.arbitration = true` for a task id that no longer exists in the current task list — sign of a rename/removal that wasn't fully cleaned up. (The historically-recurring `extractEpoch()` timestamp bug itself is confirmed genuinely fixed and correctly handles the real on-disk data shape.)

**M5 — Collectibles screen is entirely unlocalized**
`src/screens/Collectibles.jsx` destructures `t` from `useUi()` but never calls it anywhere in the file — every visible string is hardcoded English, unlike every other screen audited.

**M6 — OCR pipeline: no cancellation, silent panics, silent wrong-region capture**
- `ocr_riven_card`/`ocr_card_image` (`ocr.rs`) have no cancellation flag (unlike the reward-icon loop's `ICON_SCAN_ACTIVE`). An in-flight capture that started before the riven screen closes runs to completion regardless, unconditionally logging its result (including an always-on debug PNG write) — this is the confirmed mechanism behind garbage OCR text appearing ~2.7s after a "Riven overlays closed" event in today's live log.
- `apply_ocr_preprocessing` (`ocr.rs:1089-1162`) can panic on a degenerate zero-size crop (reachable at extreme UI-scale settings); that panic is silently swallowed by `h.join()` at line 1318-1323, so the slot's result just vanishes with no log trace.
- `ocr.rs:61-68`: a negative crop offset silently clamps to 0 via `as u32` saturation instead of erroring, so the capture can silently target the wrong screen region and produce plausible-looking but bogus text.
- `ocr_engine.rs` returns the identical empty result for "OCR model failed to load" and "card was genuinely blank," with zero logging in either case — a broken OCR install would be invisible.
- `clean_ocr_output` (`ocr.rs:1268-1300`) only trims leading junk tokens, never trailing ones, so OCR noise appended after a real item name can still feed H2's ambiguous-scoring bug undiminished. The riven-card OCR path does no equivalent cleanup at all.

**M7 — "Reroll Potential %" is presented as more precise than it is**
`pricer.rs:276-330`. The displayed percentage derives from the weapon's overall market price distribution, not anything conditioned on the riven's actual current roll. A separate `expected_on_reroll` field is a pure unused duplicate of `expected_value` under a different name.

**M8 — Windows/macOS updater entries are broken** *(Codex, re-confirmed still open)*, **M9 — CSP broader than necessary** *(Codex, re-confirmed still open)*, **M10 — Async listener unmount race** *(Codex, re-confirmed still open)*, **M11 — Dependency CVEs unaddressed** *(Codex, re-confirmed still open)* — see FAILURES.md.

### Low

**L1 — Two Checklist tasks can never be translated in any language**
`checklist.task_glast` and `checklist.task_eleanor` (plus their Batch A/B sub-labels) exist in `en.json` but sit outside the JSON's `ui` object — the only place the i18n loader reads from. The render code's defensive fallback (`t(key) !== key ? t(key) : label`) prevents a raw-key leak, so this silently degrades to permanent English-only display for these two tasks regardless of locale completeness, rather than crashing or leaking text.

**L2 — Scattered smaller i18n gaps**: Mastery.jsx's MR/Legendary rank heading (no key exists at all), 4 hardcoded strings in RelicPlanner.jsx, 2 in Settings.jsx (hotkey action labels, WFM card description) where equivalent translated keys already exist elsewhere and simply weren't reused.

**L3 — `scripts/audit_e2e.js` actively produces false confidence.** Prints "100% COMPLETE AUDIT PASSED" without driving the app — confirmed it reported 0 Rivens when 52 exist, and 4,722 cosmetics when the real count is 7,382. This ran before every build today. Recommend fixing or removing before it's trusted again.

**L4 — Clippy warning, AppImage packaging metadata warnings, bundle-size warnings** — cosmetic/maintainability only, no demonstrated runtime failure.

### Resolved — no action needed

**R1 — Prime Resurgence rotation data already auto-updates correctly without a new app release.** `primeResurgence.js`'s model is built entirely dynamically from `exportData.VaultTrader` (no hardcoded prime-set list anywhere), and `main.rs:388-407` confirms export data already refreshes every 24 hours in the background. If stale rotation data was observed in practice, that points to the refresh cycle not completing, not a missing feature.

## What was fixed and verified live today (separate from the above, already shipped)

- Cosmetics screen: added a sort control (previously had none).
- Foundry screen: search box reordered to lead the row (previously category tabs came first), matching the rest of the app.
- Ownership-toggle consistency: Cosmetics, Mods, Foundry, and Relics all converted to the same click-directly multi-button style (previously a mix of that and single-button cycling).
- Relics: mislabeled "Owned:" header (actually a refinement-tier filter) relabeled to "Refinement:" across all 15 locales.

## Coverage note

Everything above is either directly cited to file/line and independently re-derived, or a live-reproduced/live-observed symptom traced to its source. Nothing in this document was fixed. What remains genuinely untested: interactive/control-level testing of the 11 source-reviewed screens (source review confirms logic, not rendering or every interaction path), overlay behavior under real gameplay beyond the one incident reproduced here, the coordinated fissure/relic/riven gameplay matrix, full 14-locale visual smoke testing, accessibility, and performance/CPU measurement.
