# Mastery preservation checklist

Status: **Stage 3C ACCEPTED — LINUX**, by explicit user decision on 2026-09-05. This register documents the current UI and the required evidence. It does not certify live game data or official mastery formulas.

## Completion rows

| # | Translation key | Current source/data behavior | Required result |
|---:|---|---|---|
| 1 | `mastery.cat_warframe` | `warframes` | **PASS-UI / PASS-SOURCE** |
| 2 | `mastery.cat_primary` | `primary` | **PASS-UI / PASS-SOURCE** |
| 3 | `mastery.cat_secondary` | Secondary plus Kitgun chambers | **PASS-UI / PASS-SOURCE** |
| 4 | `mastery.cat_melee` | Melee plus Zaw strikes | **PASS-UI / PASS-SOURCE** |
| 5 | `mastery.cat_kitgun` | Display-only Kitgun summary | **PASS-UI / PASS-SOURCE** |
| 6 | `mastery.cat_zaw` | Display-only Zaw summary | **PASS-UI / PASS-SOURCE** |
| 7 | `mastery.cat_amp` | `amps` | **PASS-UI / PASS-SOURCE** |
| 8 | `mastery.cat_sentinel` | `sentinels` | **PASS-UI / PASS-SOURCE** |
| 9 | `mastery.cat_sentinel_weapon` | `companion_weapons` | **PASS-UI / PASS-SOURCE** |
| 10 | `mastery.cat_moa` | `moaHeads` | **PASS-UI / PASS-SOURCE** |
| 11 | `mastery.cat_hound` | `houndHeads` | **PASS-UI / PASS-SOURCE** |
| 12 | `mastery.cat_robotics` | Display-only combined Robotics summary | **PASS-UI / PASS-SOURCE** |
| 13 | `mastery.cat_companions` | Beast companions | **PASS-UI / PASS-SOURCE** |
| 14 | `mastery.cat_archwing` | `archwings` | **PASS-UI / PASS-SOURCE** |
| 15 | `mastery.cat_archgun` | Archweapons filtered to Archgun | **PASS-UI / PASS-SOURCE** |
| 16 | `mastery.cat_archmelee` | Archweapons filtered to Archmelee | **PASS-UI / PASS-SOURCE** |
| 17 | `mastery.cat_necramech` | `necramechs` | **PASS-UI / PASS-SOURCE** |
| 18 | `mastery.cat_kdrive` | `kdrives` | **PASS-UI / PASS-SOURCE** |
| 19 | `mastery.cat_plexus` | `plexus` | **PASS-UI / PASS-SOURCE** |
| 20 | `mastery.cat_vehicles` | Display-only combined Vehicles summary | **PASS-UI / PASS-SOURCE** |
| 21 | `mastery.cat_railjack_intrinsic` | Railjack Intrinsics; total 50 | **PASS-UI / PASS-SOURCE** |
| 22 | `mastery.cat_drifter_intrinsic` | Drifter Intrinsics; total 40 | **PASS-UI / PASS-SOURCE** |
| 23 | `mastery.cat_starchart` | Origin Starchart | **PASS-UI / PASS-SOURCE** |
| 24 | `mastery.cat_steel_path` | Steel Path Starchart | **PASS-UI / PASS-SOURCE** |

Kitgun, Zaw, Robotics and Vehicles remain `isSummary` rows and do not add XP a second time.

## Rank and summary states

| Surface | Current behavior to preserve | Required result |
|---|---|---|
| Loading | Loading when inventory is actively loading or `undefined` | **PASS-UI / PASS-SOURCE** |
| No inventory | Monitoring empty state when inventory is `null` | **PASS-UI / PASS-SOURCE** |
| MR0 | Unranked title and rank-0 icon selection | **PASS-UI / PASS-SOURCE** |
| MR1–29 | Standard rank title progression and next MR | **PASS-UI / PASS-SOURCE** |
| MR30 | True Master title | **PASS-UI / PASS-SOURCE** |
| Legendary | LR title/icon naming for rank 31+ | **PASS-UI / PASS-SOURCE** |
| Progress state | Current/next rank, titles, total XP, XP left, percentage and threshold endpoints | **PASS-UI / PASS-SOURCE** |
| Rank-up state | Current/next icons, Ready marker, rank-up text, Teshin image and relay guidance | **PASS-UI / PASS-SOURCE** |
| Item completion | 20 rows, incomplete styling, mastered/total and earned XP | **PASS-UI / PASS-SOURCE** |
| Intrinsic completion | Two rows with accumulated ranks and XP | **PASS-UI / PASS-SOURCE** |
| Starchart completion | Origin and Steel Path counts and XP | **PASS-UI / PASS-SOURCE** |

## Detail interactions

| Surface | Current behavior to preserve or extend | Required result |
|---|---|---|
| Completion-card pointer activation | Opens selected category | **PASS-UI / PASS-SOURCE** |
| Completion-card keyboard activation | Preview adds focus plus Enter/Space; stable remains unchanged | **PASS-UI / PASS-SOURCE** |
| Standard item detail | Incomplete first, mastered last, alphabetical within each state; rank and MP | **PASS-UI / PASS-SOURCE** |
| Intrinsic detail | Uses existing generic item-detail rendering | **PASS-UI / PASS-SOURCE** |
| Origin Starchart | System/name ordering and `played` completion | **PASS-UI / PASS-SOURCE** |
| Steel Path | System/name ordering and `sp_played` completion | **PASS-UI / PASS-SOURCE** |
| Junction/non-mastery labels | Existing badges and XP/no-XP text | **PASS-UI / PASS-SOURCE** |
| Hide Non-Mastery | Visible only for Starchart details; toggles filtered nodes | **PASS-UI / PASS-SOURCE** |
| Empty detail | Existing no-items/no-mastery-nodes messages | **PASS-UI / PASS-SOURCE** |
| Backdrop close | Closes selected category | **PASS-UI / PASS-SOURCE** |
| Close button | Closes selected category and remains keyboard reachable | **PASS-UI / PASS-SOURCE** |
| Dialog semantics | Preview gains role/label semantics without changing stable markup | **PASS-UI / PASS-SOURCE** |

`hideNonMastery` currently survives closing one detail and opening another Starchart detail because its state is screen-scoped. Preserve that behavior unless a separate product decision changes it.

## Data, assets and source boundaries

| Boundary | Required result |
|---|---|
| `getStats`, deduplication and `totalXP` expressions | **PASS-SOURCE** — exact restoration proof |
| Rank threshold/title/icon functions | **PASS-SOURCE** — unchanged |
| Inventory and `masteryProgress` inputs | **PASS-SOURCE** — unchanged MonitoringContext contract |
| Mastery icons | **PASS-UI / PASS-SOURCE** — existing command retained and invoked |
| Teshin image | **PASS-UI / PASS-NATIVE** — existing asset retained; no replacement or AI artwork |
| Translations | **PASS-SOURCE** — no key or locale-file changes |
| Stable DOM/actions | **PASS-UI** — eight exact stable comparisons |
| Preview 1200x800 | **PASS-UI / PASS-NATIVE** — responsive bounds and interactions pass |
| Preview 900x500 | **PASS-UI / PASS-NATIVE** — responsive bounds and interactions pass |
| German labels | **PASS-UI** — 24 German labels and modal/body bounds pass |
| Dependencies/Cargo.lock/backend/shared UI/global CSS | **PASS-SOURCE** — unchanged |

## Evidence limits

Synthetic fixtures may validate rendering, arithmetic consistency with unchanged local functions, accessibility behavior and modal interactions. They do not prove the official game formula, the current catalog or the user's real completion. No network, live account mutation or game-process integration is required for this layout slice.
