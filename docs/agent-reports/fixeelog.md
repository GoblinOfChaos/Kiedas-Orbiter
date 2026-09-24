# EE.log picker integration fix

Implemented the requested EE.log fixes in `src-tauri/src/ee_log.rs`, `src-tauri/src/main.rs`, and `src/screens/Settings.jsx`.

- Regular-file guard and camelCase status serialization added.
- Linux discovery now reads all native/Flatpak library VDFs with a 2 MiB cap and canonical-path de-duplication.
- Empty-path selection prefers an existing candidate and scanner startup uses the same helper.
- Settings status polling is isolated, delayed 400 ms for path edits, visibility-aware, and limited to 10 seconds; the parent 1-second interval was removed.
- Browse detection no longer populates the visible candidate list.
- Focused Rust unit tests were added, but not executed because compilation is prohibited.

Verification: `nice -n 19 node --test "tests/ee-log/*.test.mjs"` passed 1 test file with 1 test and 0 failures; `nice -n 19 node --check src/lib/eeLogPaths.js` and `git diff --check` passed. The EE.log-specific 1-second timer is gone; unrelated pre-existing Settings timers remain. See the worktree-root `AGENT_REPORT.md` for the full plan, evidence, risks, and follow-ups.
