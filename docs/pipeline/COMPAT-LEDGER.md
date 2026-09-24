# Direct DE Public Export compatibility ledger

Audit run: 2026-09-23 UTC, using the live English DE index and resolved
hash-suffixed content URLs. The prototype fetched the index once and the 16
resolved entries once; its second validation run reused all 15 category assets,
and the final run fetched only the previously omitted `ExportManifest` asset.
The machine-readable record is next to this file in
`COMPAT-LEDGER.json`.

## Scope and comparison limits

The Preview source currently loads the export-plus mirror from
`src-tauri/src/main.rs` (`EXPORT_FILES`/`BASE_URL`), then adds DE-localized
`ExportUpgrades_<locale>.json`, WFCD gap-fill files, and hand-maintained
supplements. The worktree contains no downloaded runtime export-plus JSON
copies; `src-tauri/data/export` contains only the tracked `descendia.txt`.
Per the task boundary, the external app data directory was not inspected.
Therefore the DE counts below are real, but app-count diffs are recorded as
`unavailable`, not guessed.

## Ledger

| DE export | DE count | Current app contract | Classification | Count diff |
| --- | ---: | --- | --- | --- |
| ExportWarframes | 127 | ExportWarframes.json | direct | unavailable |
| ExportWeapons | 841 | ExportWeapons.json | direct | unavailable |
| ExportCustoms | 4,832 | ExportCustoms.json | direct | unavailable |
| ExportUpgrades | 1,603 | ExportUpgrades.json + localized DE file | direct | unavailable |
| ExportRecipes | 1,885 | ExportRecipes.json | direct | unavailable |
| ExportRelicArcane | 3,369 | ExportRelics.json | renamed | unavailable |
| ExportResources | 3,545 | ExportResources.json | direct | unavailable |
| ExportFlavour | 2,681 | ExportFlavour.json | direct | unavailable |
| ExportRegions | 269 | ExportRegions.json | direct | unavailable |
| ExportSentinels | 34 | ExportSentinels.json | direct | unavailable |
| ExportGear | 180 | ExportGear.json | direct | unavailable |
| ExportKeys | 49 | ExportKeys.json | direct | unavailable |
| ExportDrones | 6 | no current `EXPORT_FILES` entry | manual | unavailable |
| ExportFusionBundles | 51 | ExportBundles.json | renamed | unavailable |
| ExportSortieRewards | 17 | no equivalent current file; ExportRewards is separate | manual | unavailable |
| ExportManifest | 20,136 keys | no runtime item export | manual | unavailable |

`direct` means the DE category has a current app-facing counterpart, subject
to the raw DE wrapper and field normalization still needing implementation.
`renamed` means the semantic source exists under a different current app key.
`derived` is reserved for fields that must be computed by a later adapter;
this Phase 0 audit found no safe field-level derivation to claim without a
baseline payload. `manual` means there is no demonstrated current counterpart
or the relationship is not safe to infer.

## Narin check

`ExportWarframes` contains
`/Lotus/Powersuits/Duelist/Duelist` (`narin: true` in the JSON record). This is
source presence only; this phase does not alter the app's runtime data or claim
that the current mirror has the item.

## Source paths inspected

- `src-tauri/src/main.rs`: `BASE_URL`, `EXPORT_FILES`, `check_exports`, and
  `load_all_exports`.
- `src/contexts/MonitoringContext.jsx`: startup `check_exports`/
  `load_all_exports`, glyph supplement load, and periodic monitoring refresh.
- `src/lib/wfcdGapFill.js`: Primary/Secondary/Melee merge and Skins audit-only
  gap-fill boundaries.
- `scripts/sync-wfcd.js`: build-time bundled WFCD catalog, not runtime DE data.

The direct-DE prototype is shadow-only. Nothing in the app reads its cache.
