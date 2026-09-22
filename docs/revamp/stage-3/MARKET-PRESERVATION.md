# Market preservation checklist

Status: **ACCEPTED — LINUX**.

## Read-only sources

| Item | Required result |
|---|---|
| Token source | Isolated profile `loadSettings()` / `getSetting('wfm_token')` |
| Order source | Existing `get_my_market_orders` parsing |
| Catalog source | Existing WFM v2 item catalog paths and caches |
| Stock identity | `lookupWfmItem` verified WFM ID |
| Tradability | `wfmItem.tradable !== false` |
| Quantity | Positive player-inventory quantity |
| Price source | `getPriceState` with explicit status |
| Missing price | `platPrice: null`, visible `?`, Sell disabled |
| Read-only Preview access | Catalog, prices, order sync and external website retained |

## Valuation and ordering

| Item | Required result |
|---|---|
| Sell for Plat | Price >= 15 or Plat/Ducat >= 0.22 |
| Keep for Ducats | Ducat/Plat >= 15 or Ducats >= 45 and price <= 3 |
| Otherwise | Fair Value |
| Price states | Loading, ready, no orders, error remain distinct |
| Duplicate | Quantity > 1 |
| Mastered | Existing boolean mapping |
| Stock order | Stable while prices resolve |
| Explicit reorder | Refresh Sort behavior retained |
| Sort modes | Six existing choices retained |
| Dormant filter | `unmastered` predicate remains unreachable |

## Controls and states

| Area | Existing controls or states | Required result |
|---|---|---|
| Top actions | Sync Listings, Open Website | Retained in Preview and stable |
| Tabs | Active Orders, Tradeable Stock | Both retained and keyboard reachable |
| Metrics | Four summary cards | Existing calculations retained |
| Orders | All, Sell, Buy, Hidden, search | All filters and substring search retained |
| Order table | Item, Type, Quantity, Price, Status, Actions | All columns retained; Preview gets internal horizontal containment |
| Stock | All, Sell for Plat, Best for Ducats, Duplicates, Mastered | All five reachable filters retained |
| Stock tools | Search, six-choice sort, Refresh Sort | All retained |
| Catalog | Loading, error/retry, empty, populated | All retained |
| Orders | No token, loading, empty, populated, success, error | All retained |

## Mutation boundary

| Interaction | Stable | Preview |
|---|---|---|
| List stock item | Existing payload shape retained; approved fix uses explicit entry or displayed verified price | Control visibly disabled; direct IPC still rejected |
| Delete order | Existing `delete_market_order` payload unchanged | Control visibly disabled; direct IPC still rejected |
| Mark sold | Existing `close_market_order` payload unchanged | Control visibly disabled; direct IPC still rejected |
| Toggle visibility | Existing `update_market_order` nullable payload unchanged | Control visibly disabled; direct IPC still rejected |
| Edit/save price | Existing `update_market_order` nullable payload unchanged | Editing disabled; direct IPC still rejected |
| Security boundary | Existing stable backend | Rust `require_live()` remains authoritative |

## Layout and accessibility

| Item | Stable | Preview |
|---|---|---|
| DOM | Byte-identical before/after | Pass-through wrapper plus scoped hooks and disabled-state notice |
| Header/metrics | Existing layout | Container-responsive composition |
| Tab/filter rails | Existing layout | Contained single-line rails |
| Order table | Existing `overflow-hidden` wrapper | Internal horizontal scroll boundary |
| Stock grid | Existing viewport breakpoints | Container-responsive columns |
| Mutating controls | Existing behavior | Disabled with consistent reason |
| Artwork | Existing icons | Existing icons; no AI artwork |

## Evidence gates

| Evidence | Required status |
|---|---|
| Source-derived navigation label | PASS before native assertion authoring |
| Stable exact-markup matrix | PASS |
| Stable mutation command/payload parity | PASS for all five interactions |
| Preview zero frontend mutation invokes | PASS |
| Direct Preview IPC guards | PASS for all four commands |
| Filters/search/sorts/price states/formulas | PASS |
| 1200x800 and 900x500 geometry | PASS for both tabs |
| Stable and Preview frontend builds | PASS |
| Fresh Ubuntu native build | PASS |
| Fresh Debian package smoke | 70/70 target |
| Fresh AppImage smoke | 70/70 target |
| Original tracked baseline | 850/850 unchanged |
| Cargo.lock | Unchanged |
| Cumulative patch | Native Git diff; applies cleanly |
| Stage 3J source | Not started |

## Validation result

The final evidence records 61/61 component checks, 15/15 stable exact-markup comparisons, and 70/70 cumulative checks for each fresh Debian and AppImage artifact. `preview_mutation_invocations` is empty. All four Preview mutation commands were directly invoked at the native IPC boundary and rejected.
