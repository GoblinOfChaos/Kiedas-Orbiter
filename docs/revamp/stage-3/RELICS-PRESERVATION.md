# Relics preservation checklist

Status: **ACCEPTED — LINUX MILESTONE**.

## Inventory, catalog and identity

| Item | Required result |
|---|---|
| Owned source | `inventoryData.relics`, unchanged |
| Catalog source | `getRelicCatalog(exportData, 'en')`, unchanged |
| Catalog scope | Existing Lith/Meso/Neo/Axi catalog behavior retained |
| Owned merge | Owned record replaces its matching catalog placeholder |
| Unmatched owned | Existing records such as Requiem remain present |
| Display identity | `unique_name`, unchanged |
| Acquisition identity | `real_unique_name` preferred; `unique_name` fallback retained |
| Catalog artwork | Existing `ExportImages` and asset-cache resolution retained |

## Controls

| Group | Exact current choices | Required result |
|---|---|---|
| Ownership | All, Owned, Unowned | All three preserved |
| Squad | 1, 2, 3, 4 | All four preserved |
| EV target | Intact, Exceptional, Flawless, Radiant | All four preserved |
| Era | All plus present Lith, Meso, Neo, Axi, Requiem, Omnia, Other | Dynamic visibility and order preserved |
| Owned refinement | All, Intact, Refined, Exceptional, Flawless, Radiant | All six preserved |
| Vault | All, Vaulted, Unvaulted | All three preserved; unknown remains unknown |
| Sort | Name, Ducats, Plat, Refine (D), Refine (P) | All five and repeat-click direction preserved |
| Search | Relic name or reward name, case-insensitive all-words; separate ampersand-stripped reward highlighting | Preserved |

## Expected value and prices

| Item | Required result |
|---|---|
| Formula | Existing `getRelicEV`, unchanged |
| Refinement probabilities | Existing Intact/Exceptional/Flawless/Radiant tables retained |
| Squad behavior | Existing best-of-1 through best-of-4 calculation retained |
| Requiem | Existing all-common flat-table branch retained |
| Gains | Existing Radiant minus Intact platinum and ducat calculations retained |
| Missing reward price | Existing zero fallback retained |
| Missing relic price | Existing zero fallback retained |
| Individual price badges | Render only when above zero |
| Expected value | Existing rounded value remains visible, including zero |
| Market mutation | None present; none introduced |
| Sell control | None present; none introduced |

## Rendering and acquisition

| State | Required result |
|---|---|
| Inventory loading | Existing loading `MonitorState` |
| No inventory | Existing no-data `MonitorState` |
| No matches | Existing translated empty card and message distinction |
| Price loading | Both current progress and indeterminate messages retained |
| Grouping | Era groups for Name; translated single group for value sorts |
| Card | Existing ownership dimming, vault label, artwork, counts, rewards and EV footer |
| Void Traces | Current and maximum values retained |
| Drawer | Existing acquisition lookup, vaulted status and close behavior retained |

## Layout and accessibility

| Item | Stable | Preview |
|---|---|---|
| DOM | Byte-identical before/after | Pass-through wrapper plus scoped hooks |
| Primary controls | Unchanged | Wide compact grid; narrow stacked groups |
| Secondary controls | Unchanged | Labeled, single-line contained rails |
| Void Traces | Unchanged | Bounded visible header summary |
| Result grid | Existing responsive classes | Existing responsive classes retained |
| Pointer open | Preserved | Preserved |
| Keyboard open | Existing behavior | Enter and Space on card wrapper |
| Artwork | Existing assets | Existing assets; no AI artwork |

## Evidence gates

| Evidence | Required status |
|---|---|
| Source-derived navigation label | PASS before native assertion authoring |
| Stable exact markup matrix | PASS |
| Component behavior and formula matrix | PASS |
| 1200x800 and 900x500 geometry | PASS |
| Stable and Preview frontend builds | PASS |
| Fresh Ubuntu native build | PASS |
| Fresh Debian package smoke | PASS |
| Fresh AppImage smoke | PASS |
| Existing 50 packaged checks per artifact | PASS |
| Relics packaged check group | PASS |
| Original tracked baseline | 850/850 unchanged |
| Cargo.lock | Unchanged |
| Cumulative patch | Native Git diff; applies cleanly |
| Stage 3H source | Not started |
