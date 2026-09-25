# Farm screen Stage 2 report

## Summary

Implemented the Preview-only Farming Targets Stage 2 screen upgrade. The existing non-Preview MVP branch and target store remain intact.

## Changed

- Added `src/lib/farmingTargets/screenModel.js`, a pure adapter that feeds the Stage 1 requirements, ledger, place index, and Farm-next ranking engine from existing monitoring inputs.
- Added `src/lib/farmingTargets/screenModel.js` support for chance rows in rotation order, source-only/node/planet honesty levels, and existing vendor/resource indexes where available.
- Extended `farmNext.js` with mission-type/faction filter compatibility while retaining coverage-first ranking and Conclave-only behavior.
- Added the Preview screen in `FarmingTargets.jsx`: summary strip, Farm-next tabs, minimum-chance toggle (off by default), mission/faction filters, group-by-planet presentation, target inspector, ledger columns, source links, and Conclave badges.
- Added English locale keys only; the app’s existing English fallback handles other locales.
- Added `farming.screen.summary` event logging with target, ledger, still-needed, place, and Conclave-only counts.
- Added `tests/farming/screenModel.test.mjs`.

## Verification

`nice -n 19 node --test "tests/farming/*.test.mjs"` -> 11 test files, 11 passed, 0 failed.

`nice -n 19 node --check src/lib/farmingTargets/screenModel.js` -> passed.

`nice -n 19 node --check src/lib/farmingTargets/farmNext.js` -> passed.

`nice -n 19 node -e "JSON.parse(require('node:fs').readFileSync('src/lib/i18n/en.json','utf8'))"` -> passed.

`git diff --check` -> passed.

No Cargo, Tauri, Vite, npm, pnpm, build, compiler, commit, push, or live warframe.market write was run.

## Open questions / risks

- UI rendering, visual spacing, responsive behavior, keyboard interaction, and runtime log delivery were not visually verified because the UI could not be run under the task constraints.
- Runtime currently exposes the existing DE-backed `dropIndex` rather than the parsed Stage 1 drop-table/wiki bundle. Missing metadata remains absent and is not guessed; richer node/faction/planet honesty requires wiring that prepared store into monitoring.
- No migration was needed. Existing user targets are preserved and never deleted.
