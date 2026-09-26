# Plan

1. Verify the review claims against the farm2c worktree and inspect existing Tauri file IO.
2. Add node:test regressions that fail against the reviewed defects.
3. Implement safe store migration/backup behavior, serialized shared mutations, reservation/date fixes, and Preview gating.
4. Run non-compiling static checks and the farming test suite; record evidence and open risks.

# Summary

Implemented the farm2c defect fixes with user-data safety as the priority. Corrupt or failed loads are read-only and cannot be overwritten; corrupt state is surfaced in the Farming Targets screen. Newer schema versions and unknown fields pass through unchanged. Older versions receive one timestamped backup before migration writes, and migration is refused if the backup cannot be created.

Farming Target Action now uses shared subscriptions and a serialized mutation queue that reloads from disk before each mutation. Reservation inputs use the effective target and its own quantity; ledger totals remain aggregate. Due dates use validated local YYYY-MM-DD values. Completed/archived reservations remain stored but are excluded from the active ledger. Preview actions are gated in Foundry, Prime Resurgence, and Relic Planner; Inventory has no FarmingTargetAction mount.

# Files changed

- `src/lib/farmingTargets/store.js`, `state.js`, `screenModel.js`
- `src/components/FarmingTargetAction.jsx`
- `src/screens/FarmingTargets.jsx`, `Foundry.jsx`, `PrimeResurgence.jsx`, `RelicPlanner.jsx`
- `src/lib/i18n/*.json` (English warning copied to all 15 locale files; non-English text needs translation)
- `tests/farming/store.test.mjs`, `state.test.mjs`, `screenModel.test.mjs`

# Verification

- `nice -n 19 node --test 'tests/farming/*.test.mjs'` — 16 passed, 0 failed.
- `nice -n 19 node --check src/lib/farmingTargets/store.js` — passed.
- `nice -n 19 node --check src/lib/farmingTargets/state.js` — passed.
- `nice -n 19 node --check src/lib/farmingTargets/screenModel.js` — passed.
- `nice -n 19 node -e ... src/lib/i18n/*.json` — all locale JSON valid.
- `git diff --check` — passed.
- No Rust, Cargo, Vite, Tauri, bundler, or compile/test-build command was run.

# Open questions and risks

- Visual browser/runtime verification was not possible under the no-build/no-running-app constraint; the JSX changes were checked by careful source inspection and existing test coverage.
- The warning text is English in non-English locale files and is listed for translation.
- Missing-file detection relies on the existing Tauri error text containing “not found”; other read failures are intentionally read-only to avoid destructive recovery.
- Existing Farming Targets screen mutations still use its established save path; shared action-button mutations are serialized and disk-reloaded as required.

# Suggested follow-ups

- Translate `farming_targets.corrupt_warning` in the 14 non-English locale files.
- Run the Preview UI manually and verify warning rendering, two-button concurrent additions, reservation editing, and date behavior in a UTC-7 environment.
