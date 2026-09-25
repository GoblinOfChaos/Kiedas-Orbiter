# Regions / Keys / Bundles shadow report

Run: 2026-09-25 UTC, using the cached Digital Extremes Public Export at
`/home/jedwards/.cache/kiedas-de-export` and the Preview export directory at
`/home/jedwards/.local/share/kiedas-orbiter-preview/data/export`. No runtime
files were changed.

## Real counts

| namespace | DE | Preview | comparable | DE-only added | changed/filled | Preview-only retained |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ExportRegions | 269 | 354 | 269 | 0 | 269 | 85 |
| ExportKeys | 49 | 578 | 46 | 3 | 1 | 532 |
| ExportFusionBundles | 51 | 0 separate bucket | 0 | 51 | 0 | 0 |

The Preview `ExportBundles.json` currently has 1,164 records and is a
different namespace; no FusionBundles unique name overlaps it. FusionBundles
was therefore not merged into ExportBundles.

## Field diffs and examples

- Regions filled `missionIndex` on all 269 shared nodes and `factionIndex` on
  all 269. Example: `ClanNode0` received DE `missionIndex: 8` and
  `factionIndex: 2`; the mirror had neither field. The merge retained all 85
  mirror-only nodes and did not replace localized `name`/`systemName`, graph,
  reward, or enemy fields.
- Keys added the three DE-only Tau Prologue records: `TauPrologueKeyChainA`,
  `B`, and `C`. One shared record, `NewWarIntroKeyChain`, received the DE
  empty `description` because the mirror had no description; mirror quest
  stages and the 532 mirror-only records were retained.
- FusionBundles added 51 records as a separate Endo/fusion map. Examples are
  `AlertFusionBundleLarge`, `AlertFusionBundleMedium`, and
  `CetusTierAEndoCommon`, each carrying DE `fusionPoints`.

## Design discrepancies / risks

The design and compatibility ledger numbers are stale relative to this real
run: the current mirror has 578 keys rather than 574, 532 mirror-only keys
rather than 528, and 1,164 ExportBundles rather than 1,155. Regions still
match the documented 269/354/85 shape. The design's conclusion remains
correct: FusionBundles and ExportBundles are not interchangeable. Numeric
region indexes are added for consumer compatibility but remain versioned DE
enumerations, not stable graph IDs. Shared literal DE names are intentionally
not used to overwrite mirror localization keys.

## Validation

- `node --check` passed for every new/changed adapter, shadow script,
  completeness script, and new test file.
- `node --test "tests/**/*.test.mjs"` passed: 29 tests, 29 pass, 0 fail.
- The real shadow command produced the counts and field diffs above.
- No cargo, Tauri, Vite, npm/pnpm build, Rust change, `check_exports` wiring,
  live warframe.market write, commit, or push was performed.
