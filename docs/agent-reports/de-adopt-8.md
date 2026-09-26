# DE adoption slice 8: Sentinels + Gear

Source: cached official DE Public Export under
`/home/jedwards/.cache/kiedas-de-export`; baseline: real Preview export under
`/home/jedwards/.local/share/kiedas-orbiter-preview/data/export`. No network
request or baseline write was made for this report.

## Before / after

| File | Before mirror | DE adapter | After hybrid | DE-only added | Mirror-only retained | Shared changed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ExportSentinels | 38 | 34 | 38 | 0 | 4 | 0 |
| ExportGear | 180 | 180 | 180 | 0 | 0 | 0 |

The four retained Sentinel-only records are the Moa/Hound paths
`/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPowerSuit`,
`/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetAPowerSuit`,
`ZanukaPetBPowerSuit`, and `ZanukaPetCPowerSuit` under the same parent path.
The full machine-readable shadow result is
`/tmp/de-shadow/sentgear-report.json`.

## Validation

- `nice -n 19 node --check` passed for both adapters, the shadow script, and
  the adapter test file.
- `nice -n 19 node --input-type=module -e "import('./scripts/de-export/sentgear-adapter.test.mjs')"`
  passed all 3 adapter checks.
- `nice -n 19 node scripts/de-export/shadow-sentgear.mjs ...` passed against
  the real cache and baseline, with no count collapse and complete mirror
  retention.
- `git diff --check` passed.
- Rust was not compiled. `rustfmt --edition 2021 --check
  src-tauri/src/de_sentgear.rs` passed after formatting the new module. A
  whole-main formatting check was not clean because existing Rust files have
  unrelated formatting drift. The Rust module and its `check_exports` call
  site were re-read twice; the call is
  `refresh_de_sentgear(&client, &export_dir)` and the returned summary fields
  match the logging site.

## Open questions and risks

- The current cache has no DE-only Sentinel or Gear records, so literal-English
  addition behavior is covered by fixture tests rather than real additions.
- `node --test scripts/de-export/sentgear-adapter.test.mjs` reported one
  top-level test despite the direct module run reporting all three tests; the
  direct run is the verification recorded above and this runner discrepancy
  should be checked before CI wiring.
- Existing consumer rules for ownership, recipe gating, name deduplication,
  and category classification were not changed. Live UI behavior remains
  unverified because builds and the running app are out of scope.

## Follow-ups

- Resolve the Node test-runner reporting discrepancy and add the new test file
  to the repository's normal test discovery if desired.
- Run the real item-completeness matrix after a Preview runtime refresh.
- Review `docs/pipeline/REGIONS-KEYS-BUNDLES-DESIGN.md` before implementing
  those critical categories.
