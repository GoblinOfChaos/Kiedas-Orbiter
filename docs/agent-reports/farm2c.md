# Farming Targets remainder 2C

Implemented the Preview-only remainder: additive version-2 target storage with a pre-migration `.bak`, top-level reservations wired into the ledger, overcommit warnings, priorities, complete/archive state, in-app due badges, compact three-view switching, shared target-entry actions, active Dashboard count, and `farming.targets.summary` logging.

Changed pure logic in `src/lib/farmingTargets/state.js` and added `tests/farming/state.test.mjs`. Existing ledger arithmetic remains inventory-once: Reserved is a labelled subset and does not reduce Still needed a second time.

Verification:

- `nice -n 19 node --test 'tests/farming/*.test.mjs'` — 15 passed.
- `nice -n 19 node --check` passed for store, state, and screen model.
- `git diff --check` passed.
- No build/compiler/UI launch or external write was performed.

Visual layout, live Tauri persistence, focus behavior, and cross-screen mounted-state refresh remain unverified because the task forbade running the UI/build toolchain. New strings are English-only with the existing fallback for other locales.
