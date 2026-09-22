# Mods preservation checklist

Status: **Stage 3D ACCEPTED — LINUX**. This register documents the current UI and required Linux evidence. It does not certify live game data or current Warframe.Market prices.

## Categories

| # | Translation key | Internal category | Icon asset | Required result |
|---:|---|---|---|---|
| 1 | `mods.cat_all` | `All` | `All` | **PASS-UI / PASS-SOURCE** |
| 2 | `mods.cat_warframe` | `Warframe` | `Warframe` | **PASS-UI / PASS-SOURCE** |
| 3 | `mods.cat_primary` | `Primary` | `Primary` | **PASS-UI / PASS-SOURCE** |
| 4 | `mods.cat_secondary` | `Secondary` | `Secondary` | **PASS-UI / PASS-SOURCE** |
| 5 | `mods.cat_melee` | `Melee` | `Melee` | **PASS-UI / PASS-SOURCE** |
| 6 | `mods.cat_sentinels` | `Sentinels` | `Sentinels` | **PASS-UI / PASS-SOURCE** |
| 7 | `mods.cat_robotic` | `Robotic` | `Companion` | **PASS-UI / PASS-SOURCE** |
| 8 | `mods.cat_beasts` | `Beasts` | `Beasts` | **PASS-UI / PASS-SOURCE** |
| 9 | `mods.cat_stance` | `Stance` | `Stance` | **PASS-UI / PASS-SOURCE** |
| 10 | `mods.cat_aura` | `Aura` | `Aura` | **PASS-UI / PASS-SOURCE** |
| 11 | `mods.cat_exilus` | `Exilus` via `isExilus` | `Exilus` | **PASS-UI / PASS-SOURCE** |
| 12 | `mods.cat_railjack` | `Railjack` | `Railjack` | **PASS-UI / PASS-SOURCE** |
| 13 | `mods.cat_archgun` | `Archgun` | `Archgun` | **PASS-UI / PASS-SOURCE** |
| 14 | `mods.cat_archmelee` | `Archmelee` | `Archmelee` | **PASS-UI / PASS-SOURCE** |
| 15 | `mods.cat_parazon` | `Parazon` | `Parazon` | **PASS-UI / PASS-SOURCE** |
| 16 | `mods.cat_augment` | `Augment` | `Augment` | **PASS-UI / PASS-SOURCE** |
| 17 | `mods.cat_antique` | `Antique` | `Antique` | **PASS-UI / PASS-SOURCE** |
| 18 | `mods.cat_tome` | `Tome` | `Mods` | **PASS-UI / PASS-SOURCE** |
| 19 | `mods.cat_vehicles` | `Vehicles` | `Vehicles` | **PASS-UI / PASS-SOURCE** |

Labels may be translated or fall back through the existing English-base merge. Filtering must continue using the internal category, never the display label.

## Controls and derived results

| Surface | Current behavior to preserve | Required result |
|---|---|---|
| Search | Case-insensitive; every query word must match name, description, level stats, Arcane type or wiki tags | **PASS-UI / PASS-SOURCE** |
| Sort: Name | `name`, ascending/descending | **PASS-UI / PASS-SOURCE** |
| Sort: Rank | `rank`, ascending/descending | **PASS-UI / PASS-SOURCE** |
| Sort: Count | `quantity`, ascending/descending | **PASS-UI / PASS-SOURCE** |
| Sort: Rarity | common, uncommon, rare, legendary index order | **PASS-UI / PASS-SOURCE** |
| Sort: Maxed value | resolved price; missing price sorts as zero only | **PASS-UI / PASS-SOURCE** |
| Sort switching | Active sort toggles direction; new sort resets ascending | **PASS-UI / PASS-SOURCE** |
| Ownership | All, Owned, Unowned | **PASS-UI / PASS-SOURCE** |
| Max Rank | `rank >= max_rank` | **PASS-UI / PASS-SOURCE** |
| Hide Conclave | Excludes `/PvPMods/` unique names | **PASS-UI / PASS-SOURCE** |
| Combined filters | Search/category/ownership/max-rank/Conclave compose | **PASS-UI / PASS-SOURCE** |
| Header statistics | Filtered total, unique display names, quantity-greater-than-one count | **PASS-UI / PASS-SOURCE** |
| Initial/reset page | First 60; resets on search/category/ownership/filter changes | **PASS-UI / PASS-SOURCE** |
| Load More | Adds 60 from the same filtered order | **PASS-UI / PASS-SOURCE** |
| Sticker exclusion | `_isSticker` rows do not appear in Mods | **PASS-UI / PASS-SOURCE** |

## Rendering and interactions

| Surface | Current behavior to preserve or extend | Required result |
|---|---|---|
| Populated card grid | Centered auto-fill, 200px cards, source order after filtering/sorting | **PASS-UI / PASS-SOURCE** |
| Owned/unowned card | Unowned wrapper remains grayscale and reduced opacity | **PASS-UI / PASS-SOURCE** |
| ModCard variants | Existing shared frames, ranks, quantities, descriptions, images and fallbacks | **PASS-UI / PASS-SOURCE** |
| Positive price | Existing price badge shown | **PASS-UI / PASS-SOURCE** |
| Zero/absent price | No price badge; never literal `0p` | **PASS-UI / PASS-SOURCE** |
| Price loading | Existing card skeleton and screen-level fetch status | **PASS-UI / PASS-SOURCE** |
| Market actions | No Sell control and no market mutation invocation | **PASS-UI / PASS-SOURCE** |
| Pointer activation | Opens existing Acquisition Drawer | **PASS-UI / PASS-SOURCE** |
| Keyboard activation | Preview adds focus plus Enter/Space; stable remains unchanged | **PASS-UI / PASS-SOURCE** |
| Drawer | Existing acquisition body, wiki/report actions and close path remain unchanged | **PASS-UI / PASS-SOURCE** |
| Category controls | All 19 reachable at both target sizes without page overflow | **PASS-UI / PASS-SOURCE** |
| Controls | Search, five sorts, ownership and two filters remain reachable | **PASS-UI / PASS-SOURCE** |

## Conditional states

| State | Current branch | Required result |
|---|---|---|
| Fix pre-check | Inventory exists and `fixProgress.checking` | **PASS-UI / PASS-SOURCE** |
| Fix phases | extracting, fixing, compositing, preparing with count/file | **PASS-UI / PASS-SOURCE** |
| Inventory loading | `isInventoryLoading` spinner | **PASS-UI / PASS-SOURCE** |
| No inventory | `MonitorState` | **PASS-UI / PASS-SOURCE** |
| Frames pending | empty `framesPath` spinner | **PASS-UI / PASS-SOURCE** |
| No match | localized empty message | **PASS-UI / PASS-SOURCE** |
| Price fetch progress | current/total progress label | **PASS-UI / PASS-SOURCE** |
| Price loading | localized fetching-prices label | **PASS-UI / PASS-SOURCE** |
| Populated | grid plus optional Load More | **PASS-UI / PASS-SOURCE** |

## Data, command and source boundaries

| Boundary | Required result |
|---|---|
| `mods_catalog ?? mods` and sticker exclusion | **PASS-SOURCE** — exact restoration proof |
| Search/filter/sort/pagination expressions | **PASS-SOURCE** — unchanged |
| Acquisition-info construction and indices | **PASS-SOURCE** — unchanged |
| `ModCard` props and shared component | **PASS-SOURCE** — unchanged |
| `read_file_bytes` acquisition overrides | **PASS-UI / PASS-NATIVE** — retained and invoked |
| `get_mod_frames_path` | **PASS-UI / PASS-NATIVE** — retained and invoked |
| `get_icons_path` | **PASS-UI / PASS-NATIVE** — retained and invoked |
| Stable DOM/actions | **PASS-UI** — nine exact comparisons |
| Preview 1200x800 | **PASS-UI / PASS-NATIVE** — responsive bounds and interactions |
| Preview 900x500 | **PASS-UI / PASS-NATIVE** — responsive bounds and interactions |
| German labels | **PASS-UI / PASS-SOURCE** — translated labels plus English fallback for Robotic/Tome |
| Dependencies/Cargo.lock/backend/shared components/global CSS/translations | **PASS-SOURCE** — unchanged |

## Evidence limits

Synthetic fixtures may validate rendering, filter and sort behavior, accessibility, pagination and drawer interactions. They do not prove the official game catalog, live prices, live account state or the user's inventory. No network, game-process integration or market mutation is required for this layout slice.


## Validation totals

- Styled component browser: **119/119**.
- Stable exact markup: **9/9**.
- Ubuntu Debian native package: **40/40**.
- Ubuntu AppImage native package: **40/40**.
- Original tracked-file baseline: **850/850**, no mismatches.
- Cargo.lock: unchanged.
- Windows: **OPEN / BLOCKED** under the persistent platform ledger.
- macOS: **OPEN / UNAVAILABLE** under the persistent platform ledger.
