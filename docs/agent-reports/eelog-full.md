# Implementation plan

1. Add pure JavaScript EE.log path/VDF/status helpers and focused node:test coverage.
2. Add `src-tauri/src/ee_log.rs` with platform-aware candidate detection and metadata status commands, then register both commands.
3. Extend Preview Settings with browse, auto-detect, candidate selection, editable path, and live status while preserving scanner-toggle behavior.
4. Add the new i18n keys to all locale files with English fallback text, perform static checks and the requested tests, and record limitations.

# Summary

- Added `src-tauri/src/ee_log.rs` with Linux, Windows, and macOS candidate detection plus metadata/readability status commands; registered both commands in `main.rs`.
- Added Preview Settings Browse and Auto-detect controls, clickable candidates, editable path behavior independent of the scanner toggle, and a live status line.
- Added pure path/VDF/status helpers and four focused Node tests.
- Added five English i18n keys to `en.json` and all 14 other locale files. The non-English values are intentionally English fallbacks and need translation.

# Files changed

- `src-tauri/src/ee_log.rs`, `src-tauri/src/main.rs`
- `src/screens/Settings.jsx`, `src/lib/eeLogPaths.js`
- `tests/ee-log/eeLogPaths.test.mjs`
- `src/lib/i18n/{en,de,es,fr,it,ja,ko,pl,pt,ru,tc,th,tr,uk,zh}.json`
- `docs/agent-reports/eelog.md`

# Verification

- `nice -n 19 node --test "tests/ee-log/*.test.mjs"`: passed, 1 file / 4 tests.
- `nice -n 19 node --check src/lib/eeLogPaths.js`: passed.
- `git diff --check`: passed.
- Parsed every locale JSON file with Node: passed.
- Read the new Rust module and its `main.rs` registration twice for ownership, cfg, and serde shape issues. No build, Cargo, Tauri, Vite, or bundler command was run.
- `node --check src/screens/Settings.jsx` was attempted but Node rejects `.jsx` with `ERR_UNKNOWN_FILE_EXTENSION`; no JSX-aware compiler was run because builds/bundles are prohibited.

# Suggested follow-ups

Translate the five new fallback strings in the non-English locale files. Compile/runtime validation remains for the coordinator because it was explicitly prohibited here.
