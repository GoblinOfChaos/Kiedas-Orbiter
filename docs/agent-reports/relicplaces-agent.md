# Agent report

## Plan

1. Read the farming design/reports and inspect relic parser, inventory, model,
   screen, and existing test/proof conventions.
2. Add a pure relic-place model using existing catalog, vault, inventory,
   drop-index, ledger, and parser probability contracts.
3. Wire the existing Preview Relics tab, honesty UI, acquisition link, English
   fallback strings, and `farming.relics.summary` telemetry.
4. Add fixture tests, an explicit-input real-data proof script, and reports.
5. Run only finite non-compiling Node/static checks and review the diff.

## Summary

Implemented roadmap 2B relic places for the Preview Farm-next screen. The
Relics tab now ranks relics covering needed prime parts, shows ownership and
refinement counts, displays parser-derived chances for all four refinements,
and marks vaulted relics as not currently obtainable.

## Files changed

See `docs/agent-reports/relicplaces.md` for the full file list. No store data
shape was changed. No Rust or stable-app file was touched.

## Verification

- `nice -n 19 node --test tests/farming/relicPlaces.test.mjs tests/farming/farmingTargetsScreen.test.mjs` — passed.
- `nice -n 19 node --check src/lib/farmingTargets/relicPlaces.js` — passed.
- `nice -n 19 node --check src/lib/farmingTargets/screenModel.js` — passed.
- `nice -n 19 node --check src/lib/relicParser.js` — passed.
- `nice -n 19 node --check scripts/farming-targets-relic-real-proof.js` — passed.
- `git diff --check` — passed.

No build, compiler, bundler, Cargo, Tauri, commit, push, live network, or live
marketplace operation was performed.

## Open questions and risks

The real-data proof and visual UI verification remain coordinator follow-ups;
the required explicit input files were not accessed outside this worktree.
The new English strings intentionally rely on the existing English fallback
for the 14 other locale files and need translation later.

## Suggested follow-ups

Run the real proof against refreshed DE export, player inventory, and drop
index inputs, then launch Preview and inspect the Relics tab plus the linked
relic acquisition drawer.
