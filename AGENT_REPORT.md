# P62 - ingredient drawer relic rows

## Root cause

`src/lib/relicSources.js:304-310` passes an ingredient's exact item type to `getDropSourcesWithFallback`. That reader only joins an exact drop-index key and an optional display-name key (`src/lib/dropsParser.js:689-696`). `buildDropIndex` indexes relic rewards under the raw DE reward identity (`src/lib/dropsParser.js:649-670`). The three Vanguard manifests carry `AshPrimeHelmetBlueprint` (P1/Common), `AshPrimeChassisBlueprint` (M1/Common), and `AshPrimeSystemsBlueprint` (C1/Uncommon), while the drawer ingredients use the corresponding `...Component` paths. Therefore the old lookup never reaches those three reward rows. I did not change that legacy lookup.

## Change

- Added `src/lib/acquisitionModel/ingredientRelicRows.js`. `buildIngredientRowsWithModel()` preserves every non-relic source object, replaces all relic rows with `buildItemRelics()` DE facts, orders them Lith, Meso, Neo, Axi, Vanguard and then numeric code, and exposes `ACQUISITION_MODEL_INGREDIENT_RELICS`.
- Conflict rows carry every translated DE tier in the existing drawer label shape, because `getRelicSourceLabel()` supports one rarity field only.
- `src/components/AcquisitionDrawer.jsx:14,230,364-367` and `src/preview/acquisition/PreviewAcquisitionDrawer.jsx:13,39,293-296` now memoize `{ exportData }` and select the helper only while the switch is on. The model's DE index remains cached by `exportData`; it is not rebuilt on each render.
- The Blueprint box component was not changed. Test-only module stubs in the two existing SSR files were extended for the helper's transitive imports.

## Ash Prime relic lists (real data)

Before proof used the committed drawer call sites in a disk-backed `$TMPDIR` copy, with the current regression assertions. It failed at the missing `Vanguard P1 (Common)` assertion. The old displayed relic lists were:

- Blueprint: Axi I3 (Uncommon), Lith S3 (Uncommon), Lith V7 (Uncommon), Meso C1 (Uncommon), Meso S3 (Uncommon), Vanguard E1 (Uncommon).
- Neuroptics: Axi N2 (Uncommon), Meso N2 (Uncommon), Meso P12 (Uncommon), Meso V4 (Uncommon), Neo A4 (Uncommon), Neo N3 (Uncommon), Neo V4 (Uncommon).
- Chassis: Axi B1 (Common), Axi K12 (Common), Lith V8 (Common), Meso V2 (Common), Neo N4 (Common).
- Systems: Neo N5 (Uncommon), Axi A7 (Rare), Axi N1 (Rare), Neo A10 (Rare).

After the model replacement, the Blueprint box is unchanged. The ingredient sets retain those rows and add: Neuroptics `Vanguard P1 (Common)`, Chassis `Vanguard M1 (Common)`, and Systems `Vanguard C1 (Uncommon)`. The Preview drawer SSR test renders all three literal labels. The helper orders the final relic display rows by era/code as specified rather than by the legacy drop source order.

## Tests and evidence

- Before/after proof: a data-excluding, disk-backed copy under `$TMPDIR/kiedas-p62-before-proof-20261007` used HEAD versions of the two drawer call sites and the current P42 test. The throttled command exited 1 specifically because `Vanguard P1 (Common)` was absent. The copy and all proof logs were deleted afterward.
- Passed, throttled: `timeout 240 nice -n 19 node --test --test-concurrency=2 tests/acquisition-model/ingredientRelicRows.test.mjs tests/ui/p42-prime-drawer-ssr.test.mjs tests/ui/p55-blueprint-box.test.mjs 2>&1 | tail -n 60` (3 files, 0 failures).
- Passed, direct evidence from `ingredientRelicRows.test.mjs`: 5 tests; synthetic replacement/non-relic/order/conflict-label coverage; switch-off identity coverage; Ash P1/M1/C1 real-data coverage; 518 Prime recipe ingredients with zero model-row/DE-fact mismatches; Blueprint-box audit.
- Blueprint-box audit: 1,245 recipes checked. Two existing box/model relic-set discrepancies were reported, not changed: `Exilus Weapon Adapter` and `Forma`.
- Passed, real SSR: `p42-prime-drawer-ssr.test.mjs` rendered P1/M1/C1 for Ash Prime. `p55-blueprint-box.test.mjs` also passed.
- `git diff --check` passed before the report write.

## Wider suite status

The required throttled suite completed with 67 passing and 2 failing test files. These are outside P62 and were not changed:

- `tests/farming/acquisitionText.test.mjs`: `ENOENT` for the git-ignored `scratchwiki/wiki-resource-pages.json` fixture.
- `tests/farming/vendorPlaces.test.mjs`: `Rahn Prism should be under The Quills in Vendors` assertion failed.

No build, deployment, network request, Rust, data file, `src-tauri`, `src/lib/i18n.js`, `src/lib/scannerNotification.js`, `Inventory.jsx`, or Blueprint-box component was changed. Live-app verification is intentionally skipped because this task forbids a build/deploy.

## Exact changed files

- `src/lib/acquisitionModel/ingredientRelicRows.js`
- `src/components/AcquisitionDrawer.jsx`
- `src/preview/acquisition/PreviewAcquisitionDrawer.jsx`
- `tests/acquisition-model/ingredientRelicRows.test.mjs`
- `tests/ui/p42-prime-drawer-ssr.test.mjs`
- `tests/ui/p55-blueprint-box.test.mjs`
- `AGENT_REPORT.md`
