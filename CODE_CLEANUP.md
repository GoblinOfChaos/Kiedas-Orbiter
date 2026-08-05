# Code Cleanup Audit

Running list of noise/complexity/staleness found while going through the
codebase line by line. Nothing here has been acted on yet — this is a
findings log, to be used as a checklist for an actual cleanup pass at the
end of the audit.

---

## autostart_manager.py

- [ ] **Stale/misleading comment scaffolding in `reconcile_always_on()`
      (lines ~335-419).** Accumulated four separate layers of forensic
      commentary during the 2026-08-04 live debugging marathon (runaway
      watcher duplication → test-log pollution → silent launch failures →
      real answer: zombie processes treated as alive). Now that root cause
      is known and fixed (service_registry.py zombie check), most of this
      reads like leftover debugging scaffolding rather than documentation
      of the current system:
  - The unconditional "evaluated" log line (fires every tick a feature is
    down) including a `dict_id=...` field that only existed to rule out a
    "two dict instances" theory that wasn't the actual answer - this is
    diagnostic code for a solved mystery, no longer needed. Candidate for
    deletion.
  - The `_SELF_RESTARTABLE_ALWAYS_ON` comment (~16 lines) is legitimate
    (explains a real, non-obvious constraint - watcher can't self-restart)
    but can be tightened to ~5 lines.
  - The exception-safety try/except around `start_feature()` is genuinely
    good code and should stay - but its comment is a full incident report
    rather than a "why" note. Trim to the durable lesson (log failures
    must never be able to hide a real error) without the blow-by-blow.
  - Net: ~50 lines could become ~15 without losing real information.

- [ ] **`json` imported locally inside four different functions**
      (`_load_config`, `_save_config`, `_write_heartbeat`,
      `heartbeat_age_seconds`) instead of once at module top. No
      functional issue, just repetition - hoist to a single top-level
      import.

## service_registry.py

- [ ] **Stale/wrong docstring.** `is_registered_process_alive()`'s
      docstring (line ~76-78) says features are checked for being "still
      alive with a matching cmdline" - factually wrong now. The actual
      check (`_entry_alive()`) compares `create_time()`, not `cmdline`
      (cmdline is explicitly "kept for diagnostics only, not the liveness
      check" per its own inline comment). Fix the docstring to match
      reality.

## platform_utils.py

- Reviewed, no significant issues found. `_matches_pattern()`,
  `reap_zombie_children()`, and `clean_env_for_launch()` all have dense
  but legitimate "why" comments (each documents a real live bug this
  project hit before), not noise. No action items here.

## warframe-watcher.py

- Reviewed, clean. Short file, comments are proportional to the actual
  non-obvious behavior they explain. No action items.

## x11_overlay.py

- [ ] **Minor: repeated local imports.** `_log_monitor_debug()` does
      `import sys` and `move_to_monitor()` does `import json` inside the
      function body rather than at module top. Same pattern as
      autostart_manager.py - low priority, bundle with that cleanup.
- Otherwise clean - the long module docstring is legitimate (documents a
  genuinely complex, reverse-engineered X11 mechanism), not noise.

## overlay_gtk.py

- [ ] **Real hardening gap: `_enforce_singleton()`'s process-identity
      check uses a naive substring check, not the hardened matcher.**
      Line ~761: `if "overlay_gtk.py" in cmdline:` - plain Python `in`,
      not `platform_utils._matches_pattern()`. This is exactly the bug
      class found and fixed everywhere else on 2026-08-03/04 (a
      diagnostic command whose own text happened to mention a pattern
      got misidentified as a real process) - this one call site was
      missed. Low real-world risk here specifically (this checks a
      single already-known PID's own cmdline, not a full process-table
      scan, so the blast radius of a false positive is smaller - it
      would only matter if that one specific PID's cmdline happened to
      contain the string "overlay_gtk.py" without actually being that
      process), but worth fixing for consistency and to close the gap
      properly. Should use `_matches_pattern(cmdline, "overlay_gtk.py")`
      or equivalent, matching how `platform_utils.find_processes()`
      itself does it.
- [ ] **Minor: local imports.** `_enforce_singleton()` imports `os` and
      `psutil` inside the function body rather than at module top - same
      pattern noted elsewhere, low priority.
- Otherwise well-documented - the class docstrings and inline comments in
  `_show_rewards`/`_show_relics` are dense but each documents a genuinely
  non-obvious live GTK/layout bug, not filler.

## src/ownership.rs

- [ ] **Real visible bug: `Ownership::colored()`'s `Owned` and `Need`
      variants use the identical ANSI color code** (`\x1b[1;32m`, bright
      green) - line ~28-29. `UNKNOWN` correctly gets a distinct color
      (yellow, `\x1b[33m`), but `OWNED` and `NEED` are visually
      indistinguishable in `orbiter.log`'s "--- relic reward ownership
      ---" output. `NEED` should likely be a distinct color (commonly
      red/yellow, "you don't have this") - worth confirming the intended
      scheme with Jacob before picking a replacement color.
- [ ] **Genuinely dead code: `notify()` (both the Unix and Windows
      variants, ~line 79-100).** Never called anywhere in the codebase
      (confirmed via grep - only the two definitions themselves match).
      `main.rs`'s `run_detection()` has its own comment confirming this
      is intentional: "Desktop notifications are intentionally disabled.
      The overlay is the UI for reward results, and host notifications
      steal focus from Warframe." Candidate for deletion - the feature
      was deliberately removed but this leftover implementation wasn't
      cleaned up with it.

## src/theme.rs

- [ ] **Real noise: ~44 lines of commented-out dead code** (`threshold_filter()`,
      ~line 130-174). An old per-theme implementation (`Theme::Vitruvian =>
      test.hue.abs_diff_eq(...)`, etc., several with bare `todo!()`) left
      in as a comment block after being replaced by the current generic
      `color_difference()`-based approach directly above it. Git history
      preserves this if it's ever needed again - straightforward deletion
      candidate, no information lost.
- Otherwise clean - plain data/math, no other issues.

## src/database.rs

- [ ] **Dead code with debug scaffolding baked in: `single_relic_value()`
      (~line 154-186).** Computes the exact same value twice via two
      different methods (a manual sum, then a duplicate iterator-based
      sum into `value2`) purely to `println!("{plat} * {chance}")` on
      every item and `println!("{value} vs {value2}")` at the end, then
      returns only `value` - `value2` and all the printlns exist solely
      for a one-time manual verification that was apparently never
      cleaned up. Confirmed via search: never called anywhere, including
      tests. Candidate for deletion entirely (the same comparison this
      was presumably built to do is now covered properly by
      `validate_shared_relic_values` in the test module, which compares
      `shared_relic_value` against `shared_relic_value_bruteforce` with
      a real assertion instead of eyeballed console output).
- `shared_relic_value_bruteforce` (~line 198-237) is unused in
  production code but legitimately kept as a correctness oracle in
  `validate_shared_relic_values`'s test - not noise, keep.
- Otherwise clean.

## src/ocr.rs

- [ ] **Minor noise: several single-line commented-out debug artifacts**
      (e.g. `// prefilter.save("prefilter.png")...`, `// debug!("{}", ...)`,
      `// cropped.save(format!("part-{}.png"...`) scattered through
      `extract_parts_impl`/`filter_and_separate_parts_from_part_box_impl`.
      Low priority, but easy to clean up alongside the theme.rs block.
- [ ] **Known real gap still shipping:
      `filter_and_separate_parts_from_part_box_impl` (~line 389-398)
      still uses the old hardcoded 3-player-only geometry** (`box_width /
      2` offset, `player_count` only ever 3 or 4, no path for a genuine
      2-reward round at all). The generalized `reward_geometry(box_width,
      total_width, player_count)` fix (correctly centers any player
      count, tested for 2/3/4) exists on the still-open, not-yet-merged
      PR #13 - correctly pending live-test per TODO.md's checklist
      (issue #4), same situation as PR #21, not a merge mistake. Flagging
      here because it means a live 2-reward (solo, reduced-choice)
      mission would currently get wrong box positioning with the
      *current* shipped code.
- **Complexity note, not exactly noise**: `extract_parts_impl`'s
  theme-detection/box-scaling math (~line 100-260) uses many bare magic
  numbers (0.06, 0.26, 5.0, 0.007, 10.0, the `text_segments` array, the
  `top_five`/`perc_weights` selection logic) with no comments explaining
  *why* those specific values were chosen. This is inherent algorithm
  complexity rather than accumulated noise - it wasn't written
  iteratively during a debugging session the way the noisier files were,
  it looks like a deliberately tuned detection algorithm from early in
  the project. Not recommending a rewrite of the math itself (too risky
  without deep OCR-domain expertise and extensive live retesting), but
  worth flagging that this is the single hardest-to-safely-modify
  section in the whole codebase - any future change here needs unusually
  careful validation against the existing regression-test corpus.

## src/bin/main.rs (Rust detector)

- [ ] **Genuinely dead code: `benchmark()` function (~line 1570).** Never
      called anywhere in the codebase (confirmed via grep - only its own
      definition matches). References Tesseract cleanup
      (`OCR.lock()...take()`) and a hardcoded `"input3.png"` path -
      leftover from before the project moved to PaddleOCR (see PR #1's
      OCR model benchmark). Candidate for deletion, not just an
      `#[allow(dead_code)]` suppression.
- [ ] **Two disabled tests left in place: `wfi_images_exact` (~line 2488)
      and `images` (~line 2583).** Both have their `#[test]` attribute
      commented out (`// #[test]`) plus `#[allow(dead_code)]` to silence
      the resulting unused-function warning. Either re-enable them if
      they still have value, or remove them - a commented-out test
      attribute is easy to miss and just sits there unable to run or
      fail, providing no actual coverage while looking like it might.
      Worth asking Jacob why these were disabled before deciding which
      way to go. Note: `ocr_model_benchmark` (~line 2171) demonstrates
      the *correct* way to disable a test in this file - `#[ignore]`,
      still discoverable via `cargo test -- --ignored` - which makes the
      other two's commented-out attribute look more like an oversight
      than a deliberate pattern.
- The three `#[allow(dead_code)]` on `CorpusRow` struct fields (~line
  1832-1837) are legitimate - they're part of a JSON deserialization
  schema for test corpus data, kept for completeness even though not all
  fields are read in logic. Not noise.
- [ ] **Known real bug still shipping: `log_watcher()`'s
      `position = current_len` (~line 1520).** This is the exact
      incremental-cursor bug diagnosed and fixed on the still-open,
      not-yet-merged PR #21 ("Fix EE.log watcher silently dropping one
      line among many") - a metadata().len() snapshot taken *before* the
      read loop, instead of the actual bytes consumed
      (`stream_position()`), can silently skip a line that arrives in
      the snapshot/read race window. Confirmed live once already (a
      relic mission's round-4 reward screen). This is *correctly* still
      open pending live-test per TODO.md's checklist, not a merge
      mistake like #23 - but worth flagging plainly: this bug is
      currently live in the shipped binary's fallback file-tail path
      (the primary path is `memory_log_watcher()`, which uses a
      different, already-more-robust full-rescan design - see its own
      zombie/dedup handling - so real-world exposure is lower, but not
      zero, since file-tailing is the fallback whenever memory reading
      isn't available). Recommend merging #21 once live-tested rather
      than letting it sit indefinitely.
- Everything else read so far in this file (screenshot capture,
  Riven screen detection/OCR-scrubbing, reward detection/publish,
  `memory_log_watcher()`, `rewatch_with_retry()`) is dense but
  legitimately documented - every comment traces to a specific
  confirmed live bug, not filler. No structural duplication or dead
  code found in this stretch beyond what's already listed above.

---

## Codebase-wide (Python)

- No commented-out dead code blocks found anywhere in the Python side
  (checked via a heuristic scan for comment lines matching common code
  patterns - only false positives, ordinary English "for" as a
  preposition). This is a real contrast with the Rust side
  (`theme.rs`'s dead block) - the Python codebase has stayed cleaner
  here. No action needed.
- No `# TODO`/`# FIXME`/`# XXX`/`# HACK` markers anywhere - consistent
  with the project's convention of tracking outstanding work in TODO.md
  instead of inline markers.
- [ ] **Widespread bare `except Exception: pass` (and a few bare
      `except:`) with no comment - 60+ occurrences across the codebase,
      concentrated in the tab UI files** (`STATUS_TAB.py` alone has 13,
      `DASHBOARD_TAB.py` 6, `FOUNDRY_TAB.py` 5). Sampled several in
      `STATUS_TAB.py`: most are legitimate best-effort UI-refresh
      patterns (e.g. "try to restyle sibling tabs after a theme change,
      don't crash if the widget tree looks different than expected") -
      genuinely low-risk, but zero have a comment explaining why
      swallowing is safe here, which the project's own stated comment
      philosophy would call for ("only add a comment when the WHY is
      non-obvious" - a reader unfamiliar with Qt widget-tree traversal
      quirks would reasonably wonder why every exception is caught).
      This is the same class of finding as `FIX-ERROR-01` from the
      2026-08-03 audit (`claude_fix_suggestions.json`), which
      deliberately scoped itself to just `paths.py`/`autostart_manager.
      py`/`refresh_wfcd_cache.py` and treated it as "a judgment call per
      site, not a blanket fix." Given the much larger count found here,
      recommend the same approach: review each site individually (some
      may be masking real bugs, most are probably fine), not a
      mechanical find-replace. Given the volume, this is worth its own
      dedicated pass rather than folding into the same cleanup batch as
      everything else in this file.

- [ ] **Known, self-documented duplication: `_cached_warframe_geom()` /
      `_target_monitor()` are copy-pasted near-identically across three
      overlay files** (`overlay_gtk.py`, `fissure_overlay.py`,
      `riven_grader_overlay.py`). Not accidental - `fissure_overlay.py`'s
      copy explicitly says "matching overlay_gtk.py's identical helper"
      in its own docstring, so whoever wrote it knew about the
      duplication and chose it anyway (likely to avoid a cross-file
      import dependency between sibling overlay scripts that are each
      launched as their own standalone process). Still the same
      DRY-violation risk class this project has explicitly gotten burned
      by before (main.rs's detector-launch-args used to be three
      independent copies that drifted, per its own comment history) -
      three copies of monitor-targeting logic can silently diverge the
      same way. Candidate for extracting into a small shared helper
      module (or adding to `x11_overlay.py`, which these three overlays
      already share for windowing) rather than leaving three copies to
      maintain in sync by hand. Lower urgency than the other findings
      since it's self-aware/documented, not silently drifted yet.

## PROCESS GAP FOUND (not code noise, but important - already fixed)

- [x] **PR #23 ("Key reward-overlay drag position by reward count") was
      reported as merged in an earlier session but was actually never
      merged - still open on GitHub, with its commit not in main's
      history at all.** Found while checking overlay_gtk.py's history
      during this audit (`self._position_file_for()` didn't exist in
      current main despite believing it had been added). Verified it was
      still cleanly mergeable given everything since, and merged it
      2026-08-05 during this audit. Checked all other open PRs (#8, #13,
      #18, #19, #21, #22) - all of those are correctly, intentionally
      still open pending live-testing per TODO.md's checklist, not the
      same mistake. This was a one-off reporting error, not a systemic
      issue, but worth remembering: verify `gh pr view <N> --json
      mergedAt` after any merge claim rather than trusting the tool
      output alone from that point in the session.
