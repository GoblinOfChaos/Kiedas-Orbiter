# Cosmetics preservation checklist

Status: **Stage 3E ACCEPTED — LINUX MILESTONE**. This register describes the frozen current UI and required Linux evidence. It does not certify live game data or the user's current inventory.

## Categories

| # | Internal value | Translation key | Required result |
|---:|---|---|---|
| 1 | `all` | `foundry.cat_all` | **PASS-UI / PASS-SOURCE** |
| 2 | `warframe` | `foundry.cat_warframe` | **PASS-UI / PASS-SOURCE** |
| 3 | `primary` | `foundry.cat_primary` | **PASS-UI / PASS-SOURCE** |
| 4 | `secondary` | `foundry.cat_secondary` | **PASS-UI / PASS-SOURCE** |
| 5 | `melee` | `foundry.cat_melee` | **PASS-UI / PASS-SOURCE** |
| 6 | `archwing` | `mastery.cat_archwing` | **PASS-UI / PASS-SOURCE** |
| 7 | `sentinel` | `mastery.cat_sentinel` | **PASS-UI / PASS-SOURCE** |
| 8 | `syandana` | `cosmetics.kind_syandana` | **PASS-UI / PASS-SOURCE** |
| 9 | `armor` | `cosmetics.kind_armor` | **PASS-UI / PASS-SOURCE** |
| 10 | `animation` | `cosmetics.kind_animation` | **PASS-UI / PASS-SOURCE** |
| 11 | `glyph` | `cosmetics.kind_glyph` | **PASS-UI / PASS-SOURCE** |
| 12 | `sigil` | `cosmetics.kind_sigil` | **PASS-UI / PASS-SOURCE** |
| 13 | `decoration` | `cosmetics.kind_decoration` | **PASS-UI / PASS-SOURCE** |
| 14 | `emote` | `cosmetics.kind_emote` | **PASS-UI / PASS-SOURCE** |
| 15 | `other` | `ui.inventory.other` | **PASS-UI / PASS-SOURCE** |

Filtering must continue using the internal values rather than translated labels.

## Catalog and ownership

| Surface | Current behavior to preserve | Required result |
|---|---|---|
| Skin source | ExportCustoms entries under `/Upgrades/Skins/` | **PASS-UI / PASS-SOURCE** |
| Sigil source | Same table, detected by `/Upgrades/Skins/Sigils/` | **PASS-UI / PASS-SOURCE** |
| Glyph source | `WI_Glyphs` | **PASS-UI / PASS-SOURCE** |
| Decoration source | ExportResources entries matching eight exact parent paths | **PASS-UI / PASS-SOURCE** |
| Emote source | ExportFlavour entries under `/Lotus/Types/Items/Emotes/` | **PASS-UI / PASS-SOURCE** |
| Skin exclusions | Unowned entries without icon and texture remain absent | **PASS-UI / PASS-SOURCE** |
| Glyph exclusions | Unowned hidden/secret entries remain absent; owned entries remain visible | **PASS-UI / PASS-SOURCE** |
| Owned normalization | Lowercase and collapse `/StoreItems/` | **PASS-UI / PASS-SOURCE** |
| Owned buckets | WeaponSkins, FlavourItems, MiscItems, ShipDecorations | **PASS-UI / PASS-SOURCE** |
| Warframe families | Dynamic Suit family and localized-name construction | **PASS-UI / PASS-SOURCE** |
| Weapon types | Icon path first; legacy unique-name fallback second | **PASS-UI / PASS-SOURCE** |
| Other skin types | Archwing, Sentinel, Syandana, Armor, Animation, Warframe, Other order | **PASS-UI / PASS-SOURCE** |
| Image resolution | PublicExport hash, browse.wf, direct URL, generic resolver | **PASS-UI / PASS-SOURCE** |

## Controls and derived results

| Surface | Current behavior to preserve | Required result |
|---|---|---|
| Search | Case-insensitive display-name substring | **PASS-UI / PASS-SOURCE** |
| Sort | Name ascending/descending; active choice toggles direction | **PASS-UI / PASS-SOURCE** |
| Ownership | All, Owned, Unowned | **PASS-UI / PASS-SOURCE** |
| Combined filters | Search, kind and ownership compose | **PASS-UI / PASS-SOURCE** |
| Initial/reset page | First 120; reset by search, kind or ownership change | **PASS-UI / PASS-SOURCE** |
| Load More | Adds 120 from the same filtered order | **PASS-UI / PASS-SOURCE** |
| Subtitle | Owned count over complete assembled catalog count | **PASS-UI / PASS-SOURCE** |
| Loading | Localized card while export data is absent | **PASS-UI / PASS-SOURCE** |
| No match | Localized empty state with Sparkles icon | **PASS-UI / PASS-SOURCE** |

## Rendering and interactions

| Surface | Current behavior to preserve or extend | Required result |
|---|---|---|
| Catalog grid | Auto-fill with 220px minimum cards | **PASS-UI / PASS-SOURCE** |
| Card image | Existing ItemImage source and placeholder | **PASS-UI / PASS-SOURCE** |
| Ownership badge | Existing owned/missing visual states | **PASS-UI / PASS-SOURCE** |
| Kind badge | Existing raw `item.kind` text, including German locale | **PASS-UI / PASS-SOURCE** |
| Pointer card shortcut | Opens existing Acquisition Drawer | **PASS-UI / PASS-SOURCE** |
| Acquisition button | Native button remains the keyboard path | **PASS-UI / PASS-SOURCE** |
| Button propagation | One activation; outer card handler is not double-fired | **PASS-UI / PASS-SOURCE** |
| Outer card semantics | No nested `role=button`, tab stop or keyboard button behavior | **PASS-UI / PASS-SOURCE** |
| Drawer | Existing acquisition content and close behavior | **PASS-UI / PASS-SOURCE** |
| Kind controls | All 15 reachable at both target sizes without page overflow | **PASS-UI / PASS-SOURCE** |
| Ownership and sort | Reachable at both target sizes | **PASS-UI / PASS-SOURCE** |

## Data, command and source boundaries

| Boundary | Required result |
|---|---|
| Catalog/classification expressions | **PASS-SOURCE** — exact restoration proof |
| Search/filter/sort/pagination expressions | **PASS-SOURCE** — unchanged |
| Acquisition-info construction and argument order | **PASS-SOURCE** — unchanged |
| Intentional `undefined` relic-state placeholder | **PASS-SOURCE** — retained |
| `read_file_bytes` acquisition overrides | **PASS-UI / PASS-NATIVE** — retained and invoked |
| Market mutation commands | NOT APPLICABLE — none exist |
| Price/Sell UI | NOT APPLICABLE — none exists |
| Stable DOM/actions | **PASS-UI** — six exact comparisons |
| Preview 1200x800 | **PASS-UI / PASS-NATIVE** — responsive bounds and interactions |
| Preview 900x500 | **PASS-UI / PASS-NATIVE** — responsive bounds and interactions |
| German labels | **PASS-UI / PASS-SOURCE** — translated controls plus disclosed raw kind badge |
| Dependencies/Cargo.lock/backend/shared components/global CSS/translations | **PASS-SOURCE** — unchanged |

## Evidence limits

Synthetic fixtures may validate rendering, catalog branching, filters, sorting, pagination and drawer interactions. They do not prove the official current cosmetic catalog or the user's inventory. No network, game-process integration or marketplace mutation is required for this layout slice.


## Validation totals

- Styled component browser: **101/101**.
- Stable exact markup: **6/6**.
- Ubuntu Debian native package: **45/45**.
- Ubuntu AppImage native package: **45/45**.
- Original tracked-file baseline: **850/850**, no mismatches.
- Cargo.lock: unchanged.
- Windows: **OPEN / BLOCKED** under the persistent platform ledger.
- macOS: **OPEN / UNAVAILABLE** under the persistent platform ledger.
