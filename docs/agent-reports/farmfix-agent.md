# Farm-next defect fix report

## Plan

1. Verify the reviewed defects against `requirements.js`, `screenModel.js`, and `FarmingTargets.jsx`.
2. Apply minimal Preview-only fixes for acquisition identity, source/place indexing, recipe expansion, drawer lookup, performance, and telemetry.
3. Add regression tests and a read-only real-data proof for Narin and a mod.
4. Run static Node checks and the full requested Node test command; do not build, compile, commit, or push.

## Summary

Fixed all eight reviewed Farm-next defects in Preview: acquirable target defaults, source naming, display-name source lookup, component sub-recipes, region planets, place-index memoization, needed-count reuse, ledger drawer lookup, and summary telemetry dependencies.

## Files changed

- `src/lib/farmingTargets/screenModel.js`
- `src/screens/FarmingTargets.jsx`
- `tests/farming/fixtures/screen-model-defects.json`
- `tests/farming/screenModel.test.mjs`
- `tests/farming/farmingTargetsScreen.test.mjs`
- `scripts/farming-targets-real-proof.js`
- `tests/farming/realProof.test.mjs`
- `docs/agent-reports/farmfix.md`

## Verification

- `nice -n 19 node --check src/lib/farmingTargets/screenModel.js` — passed.
- `nice -n 19 node --check scripts/farming-targets-real-proof.js` — passed.
- `nice -n 19 node scripts/farming-targets-real-proof.js` — passed: ledger 13, places 164, planets 17 for Narin and Vitality from the read-only Preview export cache.
- `nice -n 19 node --test "tests/**/*.test.mjs"` — passed: 24/24.
- `git diff --check` — passed.

## Open questions and risks

- Real proof uses the existing local combined export cache and does not fetch live data.
- Telemetry now reports load completion and target-count changes, intentionally excluding quantity and filter clicks.

## Follow-ups

No required follow-up. No build, bundler, Cargo, Tauri, commit, push, live market write, or outside-worktree file change was performed.
