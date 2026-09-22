# Relic Planner preservation checklist

Status: **STAGE 3H ACCEPTED — LINUX**.

## Sources and identity

| Item | Required result |
|---|---|
| Part source | `getAllRelicRewards(exportData, 'en')`, unchanged |
| Eligible parts | Prime parts plus existing Forma exception |
| Relic source | `getRelicCatalog(exportData, 'en')`, unchanged |
| Part status | `getPartObtainedStatus`, unchanged |
| Owned relic source | `inventoryData.relics`, unchanged |
| Part identity | Exact normalized reward `uniqueName` |
| Relic identity | Existing normalized era/name catalog keys |

## Picker and selection

| Item | Required result |
|---|---|
| Search | 120ms debounce; case-insensitive name substring |
| Search reset | Visible limit resets to 60 |
| Filters | All, Never Obtained, Missing |
| Never Obtained | `everObtained === false` |
| Missing | `hasEnough === false` |
| Initial visible rows | 60 |
| Load More | Adds 60 |
| Add one | Exact identity; duplicates disabled |
| Remove one | Exact identity |
| Clear | Entire need list cleared |
| Add All Missing | Full catalog; every `hasEnough === false` item |
| Add Never Obtained | Full catalog; every `everObtained === false` item |
| Persistence | None introduced; list remains session-only |

## Matching and results

| Item | Required result |
|---|---|
| Match predicate | Selected reward `uniqueName` exists in relic rewards |
| Empty selection | No results |
| Ownership choices | All, Owned, Unowned |
| Owned count | Sum of all refinement counts |
| Primary order | Owned count descending |
| Secondary order | Matching selected-part count descending |
| Row content | Era/name, owned count, vault state, matches and needed count |
| Statistic cards | Eligible parts, selected parts, owned/total matching relics |
| Market mutation | None present; none introduced |
| Sell control | None present; none introduced |

## Layout and accessibility

| Item | Stable | Preview |
|---|---|---|
| DOM | Byte-identical before/after | Pass-through wrapper plus scoped hooks |
| Statistics | Existing responsive row | Existing row retained and contained |
| Workflow | Existing viewport breakpoint | Container-responsive three-panel workspace |
| Panel height | Existing 640px cap | Shared viewport-bounded height |
| Lists | Existing internal scrolling | Existing internal scrolling retained |
| Dense filters | Existing buttons | Contained single-line rails |
| Remove button | Existing icon-only button | Same button with item-name accessible label |
| Artwork | Existing icons | Existing icons; no AI artwork |

## Evidence gates

| Evidence | Required status |
|---|---|
| Source-derived navigation label | PASS before native assertion authoring |
| Stable exact markup matrix | PASS |
| Real helper behavior matrix | PASS |
| Picker/selection/matching matrix | PASS |
| 1200x800 and 900x500 geometry | PASS |
| Stable and Preview frontend builds | PASS |
| Fresh Ubuntu native build | PASS |
| Fresh Debian package smoke | PASS |
| Fresh AppImage smoke | PASS |
| Existing 55 packaged checks per artifact | PASS |
| Relic Planner packaged check group | PASS |
| Original tracked baseline | 850/850 unchanged |
| Cargo.lock | Unchanged |
| Cumulative patch | Native Git diff; applies cleanly |
| Stage 3I source | Not started |
