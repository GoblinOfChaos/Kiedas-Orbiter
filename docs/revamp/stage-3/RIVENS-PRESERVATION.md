# Rivens preservation checklist

Status: **ACCEPTED — LINUX MILESTONE**.

## Inventory and identity

| Item | Required result |
|---|---|
| Source | `inventoryData.rivens`, unchanged |
| Stable identity | `item_id` remains preferred |
| Veiled/challenge identity | Existing name plus state suffix remains |
| Unveiled fallback identity | Existing name plus sorted stat tags remains |
| Counts | Unveiled, challenge, veiled and capacity calculations remain exact |

## Controls

| Group | Exact current choices | Required result |
|---|---|---|
| Weapon type | All, Rifle, Pistol, Melee, Shotgun, Sniper, Kitgun, Zaw, Archgun | All nine preserved |
| State | All States, Unveiled, Challenge, Veiled | All four preserved |
| Sort | Name, Plat, Grade | All three and repeat-click direction toggle preserved |
| Search | `riven.name`, case-insensitive | Preserved |

## Pricing and grading

| Item | Required result |
|---|---|
| Eligibility | Only unveiled and non-challenge records enter the batch |
| Command | `estimate_riven_full_batch`, unchanged payload |
| Stat mapping | All current `STAT_TO_PRICER` entries retained |
| Weapon name | English name fallback order retained |
| Cache | Existing per-riven-key cache retained |
| Retry | Three-second delay, maximum three all-null retries retained |
| Sort missing value | Existing `-1` sentinel retained |
| Missing estimate | No price badge rendered |
| Numeric estimate | Existing rounded badge and tooltip retained |
| Grade | Existing `S A B C D F` order, assessment and price tie-break retained |
| Market mutation | None present; none introduced |
| Sell control | None present; none introduced |

## Rendering states

| State | Required result |
|---|---|
| Inventory loading | Existing loading `MonitorState` |
| No inventory | Existing no-data `MonitorState` |
| Frames loading | Existing loading `MonitorState` |
| No matches | Existing translated empty card |
| Veiled card | Existing label and stacked quantity |
| Challenge card | Existing challenge text and rerolls |
| Unveiled card | Existing stats, MR, rerolls, grade and optional estimate |
| Grade drawer | Existing curated and no-profile branches; existing close action |

## Layout and accessibility

| Item | Stable | Preview |
|---|---|---|
| DOM | Byte-identical before/after | Pass-through wrapper plus scoped hooks |
| Header | Unchanged | Wide row; narrow stacked controls |
| Filter rails | Unchanged | Single-line, contained horizontal scrolling |
| Card size | 200px | 200px |
| Card gap | Existing fixed 50px | Bounded responsive gap |
| Pointer open | Preserved | Preserved |
| Keyboard open | Existing behavior | Enter and Space on card wrapper |
| Nested controls | None in `RivenCard` | None introduced |
| Artwork | Existing assets | Existing assets; no AI artwork |

## Evidence gates

| Evidence | Required status |
|---|---|
| Source-derived navigation label | PASS before native assertion authoring |
| Stable exact markup matrix | PASS |
| Component behavior matrix | PASS |
| 1200x800 and 900x500 geometry | PASS |
| Stable and Preview frontend builds | PASS |
| Fresh Ubuntu native build | PASS |
| Fresh Debian package smoke | PASS |
| Fresh AppImage smoke | PASS |
| Existing 45 packaged checks per artifact | PASS |
| Rivens packaged check group | PASS |
| Original tracked baseline | 850/850 unchanged |
| Cargo.lock | Unchanged |
| Cumulative patch | Applies cleanly |
| Stage 3G source | Not started |
