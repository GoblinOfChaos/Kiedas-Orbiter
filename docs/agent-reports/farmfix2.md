# Agent report

## Scope

Preview Farming Targets only. No Rust files, Cargo commands, builds, or commits were touched.

## Changes

- `src/screens/FarmingTargets.jsx`: isolated the Minimum chance `Toggle` in its own `shrink-0` wrapper; kept the number input and conditional note beside it. Added the localized “All factions” label for the faction filter.
- `src/lib/farmingTargets/screenModel.js`: resolved blueprint/component images through the existing DE image maps and `resolveAnyImage`, falling back to the component image; propagated the image onto blueprint ledger leaves. Mission places now match their node/nodeName against `ExportRegions`, resolve `faction` through `resolveNode`, and omit faction when no region match succeeds. Region entries are indexed once per place-index build to preserve the farming screen performance budget.
- `src/lib/i18n/en.json`: added `farming_targets.faction_filter_all`.
- `tests/farming/screenModel.test.mjs`: added faction matching and DE-image/component-fallback coverage.
- `tests/ui/farming-targets-ssr.test.mjs`: added SSR coverage for minimum-chance off/on states and separate toggle/note markup. The SSR scratch cache now uses the writable `tests/.cache` path in this worktree.

## Verification

- `nice -n 19 node --test "tests/**/*.test.mjs"`: **155 passed, 0 failed**.
- `git diff --check`: passed.
- Real-data verification used `loadRealHarness()`, `parseInventory()`, and `buildDropIndex()` with the Preview DE export cache and Preview inventory. It found **28 ranked places** and the distinct ranked faction **Grineer**. The three requested blueprint rows all had images:
  - Narin Chassis Blueprint: `GenericWarframeChassis.png`
  - Narin Systems Blueprint: `GenericWarframeSystem.png`
  - Narin Neuroptics Blueprint: `GenericWarframeHelmet.png`

The verification script used DE’s `NarinHelmetComponent`/`NarinHelmetBlueprint` identity for the Neuroptics row because that is the identity present in the DE ExportRecipes data.
