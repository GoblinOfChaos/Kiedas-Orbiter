# P68 relic vault-state before and after

## Counts from local DE export data

| State | Before | After |
| --- | ---: | ---: |
| `true` | 733 | 733 |
| `false` | 61 | 0 |
| `null` | 0 | 61 |

The `true` total is unchanged: 727 relics have a past `vaultedAt`, and the six Baro-exclusive relics remain explicitly vaulted (`Axi A2`, `Axi A5`, `Axi A8`, `Axi M5`, `Axi V8`, `Neo O1`). No current export relic has a future vault date.

## Changed relics

All 61 entries in [relics-unknown-vault.md](relics-unknown-vault.md) changed from `false` to `null`: Axi A21, A22, A23, B10, C12, D6, N14, P10, S20, S21, S8, T13, V10, V14; Lith A12, A13, B12, C15, C7, G14, K12, L8, Q3, S18, S19, S20, T14, V11; Meso A12, C11, D8, D9, E8, I3, K8, K9, L5, N11, V13, V15, V16, V17, X1, Y2; Neo A16, C10, C11, C7, C8, C9, H5, K10, N25, O4, P11, T11, V12, V13, V9, Y1, Y2. That document has each display key and DE unique name, grouped by era.

## `vaulted` consumer audit

The `rg` search for `.vaulted` and `vaulted:` under `src/` found these consumers and producers.

| Location | What it does | Change |
| --- | --- | --- |
| `src/lib/relicParser.js:94-97,321` | Reads DE status fields and assigns the catalog state. | Returns `null` when no status metadata exists; Baro exception remains `true`. |
| `src/screens/Relics.jsx:96,108,126-127,240,498-499` | Propagates catalog status, applies strict vault filters, suppresses sources only for `true`, and shows the badge only for `true`. | No change needed; `null` is already All-only and is not displayed as vaulted or unvaulted. |
| `src/screens/RelicPlanner.jsx:166,345-346` | Carries catalog status to planner rows and labels only `true` as vaulted. | No change needed. |
| `src/lib/farmingTargets/relicPlaces.js:127-136` | Converts catalog entries into Farming Targets places. | Changed `obtainable` and `howToGet` to require `vaulted === false`, so unknown is not offered as available. |
| `src/screens/FarmingTargets.jsx:71,82-83,289` | Renders Farming Targets vault presentation and metrics. | Changed the How to get button gate to `place.obtainable`; the summary sees the already-boolean place state. |
| `src/screens/Inventory.jsx:176,190,238,547,692,699` | Prime Sets and inventory filters use their separate `isVaulted`/item status. | Intentionally unchanged per the brief; this is not relic catalog status. |
| `src/components/AcquisitionDrawer.jsx:304` and `src/preview/acquisition/PreviewAcquisitionDrawer.jsx:180` | Treat only `info.vaulted === true` as a vaulted acquisition result. | No change needed. |
| `src/lib/acquisitionAudit.js:7,196,204` | Audits acquisition info and treats only explicit `true` as vaulted. | No change needed. |
| `src/lib/acquisitionInfo.js:858,2326` | Builds and checks its separate acquisition/relic-state index from `IsVaulted` or `vaultedAt`. | No catalog consumer change needed. |

`src/lib/i18n/*` matches were translation strings only and are not consumers of a relic object's field.
