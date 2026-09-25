# Inventory catalog audit (Preview)

Source: the checked-in Preview export directory and DE cache supplied for this worktree. Counts below are static export/catalog counts, not a claim about a player’s owned inventory.

## DE families and current routing

| DE source/family | DE records | Current Preview tab before pass | Pass-2 result | Notes |
| --- | ---: | --- | --- | --- |
| ExportResources: fish | 169 | Resources, owned-only | Resources, full catalog + Fish family | Includes fish and fish parts; quantity is raw inventory count or 0. |
| ExportResources: gems | 60 | Resources, owned-only | Resources, full catalog + Gems family | |
| ExportResources: plants | 14 | Resources, owned-only | Resources, full catalog + Plants family | |
| ExportResources: Ayatan/fusion | 2 | Ayatan special tab / partial resource routing | Resources family metadata; Ayatan special tab remains | Existing Ayatan screen behavior is preserved. |
| ExportResources: Duviri resources | 17 | Resources, owned-only | Resources + Duviri family | |
| ExportResources: Railjack resources | 16 | Resources, owned-only | Resources + Railjack family | |
| ExportResources: Incarnon adapters | 45 | Resources, owned-only | Resources + Incarnon family | |
| ExportResources: Focus Lens | 23 | Resources, owned-only | Resources + Focus Lens family | |
| ExportResources: other legitimate resource/held families | 1,554 | Resources only when discovered/owned | Resources + Other family | Includes currencies, minerals, tokens and miscellaneous held items where DE does not mark a presentation parent. |
| ExportResources total | 3,571 | Narrow nine-parent full catalog | 1,900 non-excluded DE records considered; 1,466 parsed unowned catalog resources with empty inventory | 1,671 records excluded by explicit parent/product/presentation rules. |
| ExportGear | 180 | Consumables catalog | Existing full Gear catalog retained | Gear remains the consumables/gear view; no duplicate resource routing. |
| ExportWarframes | 127 | Warframes | Unchanged | Equipment catalog remains separate from Resources. |
| ExportWeapons | 846 | Primary/Secondary/Melee and modular buckets | Unchanged | Includes Archwing, Necramech, Amp, Kitgun and Zaw routing already present. |
| ExportSentinels | 38 | Companions / sentinel and pet buckets | Unchanged | Pet parts remain Components/parts where parser already routes them. |
| ExportRelics | 3,197 | Relics screen | Excluded from this pass | Relics remain on their own screen. |
| ExportArcanes | 177 | Arcanes screen | Excluded from this pass | Arcanes remain on their own screen. |
| ExportKeys | 578 | No complete Inventory tab | Gap remains | Keys/quest items need a separate verified adapter and are not guessed into Resources. |
| ExportRewards | 1,102 | Acquisition/reward data | Not an inventory catalog | Rewards are sources, not necessarily holdable inventory identities. |

## Explicit exclusions

The pass excludes `parentName` families for `ShipDecoItem`, fish trophies, Shawzin/ship decoration families, photobooth tiles, ship features, navigation features, song items, and void projections. It also excludes DE `productCategory` values `ShipDecorations`, `Glyphs`, `Emotes`, `Flavour`, and `ShipFeatures`, plus path-confirmed ShipDecos/Glyphs/GlyphBoxes/Emotes. `excludeFromCodex` is deliberately not a blanket exclusion: the export applies it to legitimate held resources as well as presentation data.

## Existing-tab gap ledger

| Item category | Existing tab | Gap status |
| --- | --- | --- |
| Warframes, weapons, Archwing, Necramech, K-drive, Amps, Kitgun/Zaw parts | Equipment tabs / Parts | No new gap found in this pass. |
| Sentinel/pet equipment and pet crafting parts | Companions / Parts / Components | No new gap found in this pass. |
| Fish, gems, plants, minerals and Railjack/Duviri resources | Resources | Fixed: full DE catalog, owned/unowned, family filters. |
| Ayatan sculptures/stars | Ayatan | Existing special view retained; not duplicated into the generic resource view when already represented by its special path. |
| Consumable gear and lures | Consumables | Existing Gear-derived catalog retained. |
| Void traces, Endo, credits-like values and other counters | Header/account counters and/or Resources when DE provides an item record | Partial by design; header counters are not duplicated without a verified DE item identity. |
| Keys and quest items | No complete Inventory tab | Open gap; requires a dedicated DE `ExportKeys`/raw-inventory adapter. |
| Mission tokens and syndicate/vendor tokens | Resources or source-specific screens depending on DE parent | Needs per-family validation; no guessed inclusion beyond ExportResources. |
| Mods, relics, rivens | Dedicated screens | Explicitly excluded from this task. |
| Cosmetics, glyphs, emotes, syandanas, ephemera, ship decorations | Cosmetics or no inventory catalog | Explicitly excluded from this task. |

## Counts before/after

The supplied prior inventory report recorded **807 Resources** and **67 Components**. With an empty raw inventory against the current merged exports, the updated parser produced **1,466 Resources**, **49 Components**, and **3,190 total `all` records**; owned-player counts require the player inventory payload and were not read under this task’s filesystem restriction. Existing equipment source counts remained Warframes 118, Primary 196, Secondary 148, Melee 224, and Companions 86 in the same empty-inventory parser check; the prior real-inventory report remains the source for owned-state counts.

## Validation matrix

| Check | Result |
| --- | --- |
| Merged DE family sample has name and image path | Pass: `tests/de-export/inventory-catalog.test.mjs` |
| Cosmetics/presentation parents absent by exclusion predicate | Pass: same test |
| Existing parser syntax | Pass: `node --check` for parser, completeness script, and catalog test |
| Full UI rendering, virtualization and visual density | Not verified; builds/app launch were prohibited |
| Player-owned quantities against raw inventory | Not verified; player inventory was out of scope for this pass |
