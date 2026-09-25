# Relic places report

## Result

Implemented Preview Farm-next Relics tab behavior for prime-part ledger rows.
Relics are ranked by obtainable status, distinct needed-part coverage, needed
quantity, then the highest verified chance. Each row carries owned total and
Intact/Exceptional/Flawless/Radiant counts, every refinement chance, and an
explicit vaulted badge. Vaulted relics remain visible for honest coverage but
are never presented as obtainable. Unvaulted rows with indexed drops link to
the existing acquisition drawer.

## Files changed

- `src/lib/farmingTargets/relicPlaces.js` — pure catalog/inventory/ledger model.
- `src/lib/farmingTargets/screenModel.js` — supplies relic rows to the tab.
- `src/screens/FarmingTargets.jsx` — renders relic rows, badges, link, and telemetry.
- `src/lib/relicParser.js` — `.js` specifiers so plain Node proof imports work.
- `src/lib/i18n/en.json` — English-only new strings; other locales use fallback.
- `tests/farming/fixtures/relic-places.json` and `tests/farming/relicPlaces.test.mjs`.
- `scripts/farming-targets-relic-real-proof.js` — explicit-input real-data proof.

## Verification

- `nice -n 19 node --test tests/farming/relicPlaces.test.mjs tests/farming/farmingTargetsScreen.test.mjs` — passed, 2 test files, 2 passed.
- `nice -n 19 node --check src/lib/farmingTargets/relicPlaces.js` — passed.
- `nice -n 19 node --check src/lib/farmingTargets/screenModel.js` — passed.
- `nice -n 19 node --check src/lib/relicParser.js` — passed.
- `nice -n 19 node --check scripts/farming-targets-relic-real-proof.js` — passed.
- `git diff --check` — passed.

No Cargo, Rust, Vite, Tauri, npm/pnpm build, commit, push, or marketplace
write was run. The real-data proof was not run because no external export or
inventory input was copied into this worktree; it accepts explicit paths and
prints per-relic coverage when run by the coordinator.

## Open questions and visual verification

- The preview UI was not launched, so drawer navigation, responsive layout,
  fallback rendering, and visual spacing remain unverified.
- The acquisition drawer must resolve the catalog relic unique name against
  the coordinator's refreshed Preview indexes; this was checked by source
  wiring only, not live rendering.
- The proof uses the existing parser/catalog and does not fetch live DE data.
