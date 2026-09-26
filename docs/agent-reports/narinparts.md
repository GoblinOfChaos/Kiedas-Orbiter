# Agent report: Narin parts completeness

## Plan

1. Read the completeness plan/matrix and audit every `getAcquisitionInfo` return branch for a recipe-bearing result.
2. Preserve the coordinator's dropIndex fix, add recipe propagation to remaining recipe-dropping branches, and add synthetic/all-craftable regression coverage.
3. Add conditional component-blueprint indicators, shared drawer-open evidence logging, and the required English i18n key.
4. Run finite static/Node checks only, measure the merged real-data recipe set, and record limitations without committing.

## Summary

- Preserved commit `fix: acquisition drawer dropped the recipe` at the existing dropIndex branch.
- Added `recipe: recipe || null` to the remaining six recipe-dropping fallbacks: warframe-items drops, verified disposition, Wiki disposition/verification status, DE export status, Wiki status URL, and final fallback.
- Added an all-`parseInventory().craftable` recipe ingredient/count assertion and a synthetic drops+recipe drawer regression.
- Foundry now shows `{N} BP` only when an incomplete component has `bpOwned > 0`; the detail drawer shows the same indicator.
- Added one `drawer.recipe.summary` info event per selected drawer item.
- Added `foundry.blueprints_owned` to English. `UiContext` merges every locale over English, so other locales intentionally fall back to English until translated.

## Files changed

- `src/lib/acquisitionInfo.js`
- `scripts/item-completeness.mjs`
- `tests/completeness/fixtures.mjs`
- `tests/completeness/matrix.test.mjs`
- `src/screens/Foundry.jsx`
- `src/components/AcquisitionDrawer.jsx`
- `src/lib/i18n/en.json`

## Real-data evidence

- Source: merged preview export cache and current preview `inventory.json`.
- `parseInventory().craftable`: 979 entries.
- Craftable entries with a non-empty merged DE recipe index: 938.
- Drawer recipe ingredient/count checks: 938 checked, 0 failed.
- Remaining craftable projections without a non-empty recipe-index entry: 41; they are not asserted as “with a recipe.”
- The known pre-existing Narin incident was one item on the drop-source path; the current post-fix check reports zero recipe mismatches.
- Exact historical per-branch loss counts were not persisted by the old resolver, so branch-specific “previously lost” counts cannot be reconstructed honestly from current data. Post-fix observed loss is 0 for each audited return: lines 964, 987, 1007, 1375, 1382, and 1385.

## Verification

- `timeout 20s nice -n 19 node --loader /tmp/kiedas-extension-loader.mjs --test 'tests/completeness/*.test.mjs'` — exit 0; 2 files passed.
- The loader was required because plain Node 24 cannot resolve the repository's extensionless `src/lib/logging/tauri` import and then requires JSON import attributes. It is a temporary `/tmp` loader; no repository workaround was added.
- Finite merged-data script using `parseInventory` and `checkCraftableRecipes` — `{"total":938,"failed":0}`.
- `nice -n 19 node --check scripts/item-completeness.mjs` — pass.
- `nice -n 19 node --check src/lib/acquisitionInfo.js` — pass.
- `nice -n 19 node --check src/lib/logging/logger.js` — pass.
- `git diff --check` — pass.
- No Cargo, Rust, Vite, bundler, build, commit, push, live app, inventory write, or market write was used.

## Open questions and risks

- The 41 craftable projections without recipe-index entries should be reviewed separately if they are expected to have DE ingredients; this task does not invent recipes for them.
- UI rendering was not build-tested by instruction. The JSX change was checked by careful source review; Node syntax checks do not parse JSX.
- Historical branch attribution needs a pre-fix instrumented snapshot or persisted event data; current source only supports the post-fix zero-loss result above.

## Suggested follow-ups

- Translate `foundry.blueprints_owned` in the locale files when the translation pass is scheduled.
- Add runtime branch labels to completeness evidence if future reports require historical per-branch counts rather than current recipe-preservation counts.
