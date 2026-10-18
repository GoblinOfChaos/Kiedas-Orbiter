# Double-check of Codex's No-source Wiki acquisition pass (2026-10-15)

Checker: Claude Sonnet 5.5 (this session). Sources: `wiki_store/` snapshot (2026-10-14) plus live `wiki.warframe.com/api.php` parse output where the stored page held only an unexpanded `{{DropLocations}}` template or lacked the table row. No application acquisition file written; `acquisition-sections.json` untouched; nothing committed; sheet column C untouched.

## Verdict

**Do not use the original 156-entry list as-is.** One entry was false and 21 more carried unsupported or imprecise wording. Use the corrected list now in `acquisition-no-source-accept-list-2026-10-15.json`: **160 accepted, 34 unresolved** (Braton Obsidian Skin added after Jacob confirmed PlayStation-only). Every one of the 159 was checked against the cited Wiki text.

| Measure | Count |
|---|---:|
| Target rows (wiki page known, acquisition never saved) | 194 (confirmed: 156 + 38 on the sheet, 194 rows in the review table, 194 in the original JSON) |
| Rows checked | 194 (156 accepted places each read against the wiki text, plus all 38 unresolved) |
| Accepted places confirmed correct, unchanged | 134 |
| Accepted places corrected | 22 (1 false, 3 unsupported detail, 18 imprecise wording) |
| Missed places promoted from the 38 | 3 |
| Demoted to unresolved | 0 |
| **Final trustworthy accept count** | **160** |
| Final unresolved | 34 |

## 1. Count check

Sheet (`Why still on this list`): 156 concrete + 38 unresolved = 194. Review table: 194 rows. Accept-list: `accept` 156, `evidence` 156. All three agree on membership and on which rows are accepted. No count mismatch.

## 2. False accepts and corrections (uniqueName, old place, corrected place)

| Row | uniqueName | Kind | Old place | Corrected place |
|---:|---|---|---|---|
| 195 | `/Lotus/Upgrades/Skins/Promo/Seasonal/CandyCaneHateSkin` | imprecise wording tightened | In-game Market for 1 Credit during Tennobaum. | In-game Market for 1 Credit during Tennobaum. |
| 196 | `/Lotus/Upgrades/Skins/Promo/Seasonal/CandyCaneReaperPrimeSkin` | imprecise wording tightened | In-game Market for 1 Credit during Tennobaum. | In-game Market for 1 Credit during Tennobaum. |
| 197 | `/Lotus/Upgrades/Skins/Promo/Seasonal/CandyCaneScytheSkin` | imprecise wording tightened | In-game Market for 1 Credit during Tennobaum. | In-game Market for 1 Credit during Tennobaum. |
| 248 | `/Lotus/Upgrades/Skins/Operator/Hoods/WolfHoodAdult` | imprecise wording tightened | Nightwave Cred Offerings for 35 Nightwave Creds. | Nightwave Cred Offerings: Wolf Hood blueprint for 35 Nightwave Creds. |
| 283 | `/Lotus/Types/Restoratives/LisetMedStation` | imprecise wording tightened | Included with the Mantis landing craft; buy the Mantis or build it from its Market blueprint and rare-container component blueprints. | Included with the Mantis landing craft; buy the Mantis or build it from its Market blueprint and component blueprints from Reinforced and Rare Storage Containers. |
| 296 | `/Lotus/Types/Restoratives/SelfRifleAmmo` | unsupported detail removed | Very rare drop from the boss on Fossa, Venus; no longer sold in the Market. | No longer sold in the Market; the Fossa boss very rarely gives about 20 ammo boxes (the Wiki notes it is unknown whether this is a bug). |
| 684 | `/Lotus/Types/Items/SongItems/DreadnaughtSongItem` | imprecise wording tightened | Aspirant Zorba for 200 Atramentum. | Somachord Tone from Aspirant Zorba for 200 Atramentum. |
| 686 | `/Lotus/Types/Items/SongItems/DripSongItem` | imprecise wording tightened | Aspirant Zorba for 200 Atramentum. | Somachord Tone from Aspirant Zorba for 200 Atramentum. |
| 874 | `/Lotus/Types/Gameplay/Duviri/Resource/Fish/DuviriFishCItem` | imprecise wording tightened | Caught while fishing in Duviri. | Caught during the Golden Maw fishing side mission in Duviri; a Duviri fish is awarded if the Maw catches 15 fish before time expires on the first fishing of a Duviri run. |
| 875 | `/Lotus/Types/Items/Fish/Duviri/DuviriFishCItem` | imprecise wording tightened | Caught while fishing in Duviri. | Caught during the Golden Maw fishing side mission in Duviri; a Duviri fish is awarded if the Maw catches 15 fish before time expires on the first fishing of a Duviri run. |
| 900 | `/Lotus/Types/Items/SongItems/IceSpeakerSongItem` | imprecise wording tightened | Cephalon Melica for 50 Entropic Kuva. | Somachord Tone from Cephalon Melica for 50 Entropic Kuva. |
| 902 | `/Lotus/Types/Gameplay/Duviri/Resource/Fish/DuviriFishAItem` | imprecise wording tightened | Caught while fishing in Duviri. | Caught during the Golden Maw fishing side mission in Duviri; a Duviri fish is awarded if the Maw catches 15 fish before time expires on the first fishing of a Duviri run. |
| 903 | `/Lotus/Types/Items/Fish/Duviri/DuviriFishAItem` | imprecise wording tightened | Caught while fishing in Duviri. | Caught during the Golden Maw fishing side mission in Duviri; a Duviri fish is awarded if the Maw catches 15 fish before time expires on the first fishing of a Duviri run. |
| 1098 | `/Lotus/Types/Gameplay/Duviri/Resource/Fish/DuviriFishDItem` | imprecise wording tightened | Caught while fishing in Duviri. | Caught during the Golden Maw fishing side mission in Duviri; a Duviri fish is awarded if the Maw catches 15 fish before time expires on the first fishing of a Duviri run. |
| 1099 | `/Lotus/Types/Items/Fish/Duviri/DuviriFishDItem` | imprecise wording tightened | Caught while fishing in Duviri. | Caught during the Golden Maw fishing side mission in Duviri; a Duviri fish is awarded if the Maw catches 15 fish before time expires on the first fishing of a Duviri run. |
| 1110 | `/Lotus/Types/Items/ShipDecos/LisetPropNecraMechDrone` | unsupported detail removed | In-game Market for 100 Platinum; also included in the Sanctum Supporter Pack. | Bought separately for 100 Platinum, or in the Sanctum Supporter Pack. |
| 1605 | `/Lotus/Types/Items/SongItems/StainedVespersSongItem` | imprecise wording tightened | Aspirant Zorba for 200 Atramentum. | Somachord Tone from Aspirant Zorba for 200 Atramentum. |
| 1737 | `/Lotus/Types/Items/SongItems/OnlyneTheGreatKIMSongItem` | imprecise wording tightened | Aoi for 5,000 Standing after reaching Rank 5 (Pizza Party) with The Hex. | Somachord Tone from Aoi for 5,000 Standing after reaching Rank 5 (Pizza Party) with The Hex. |
| 1885 | `/Lotus/Types/Gameplay/Duviri/Resource/Fish/DuviriFishBItem` | imprecise wording tightened | Caught while fishing in Duviri. | Caught during the Golden Maw fishing side mission in Duviri; a Duviri fish is awarded if the Maw catches 15 fish before time expires on the first fishing of a Duviri run. |
| 1886 | `/Lotus/Types/Items/Fish/Duviri/DuviriFishBItem` | imprecise wording tightened | Caught while fishing in Duviri. | Caught during the Golden Maw fishing side mission in Duviri; a Duviri fish is awarded if the Maw catches 15 fish before time expires on the first fishing of a Duviri run. |
| 1939 | `/Lotus/Types/Sentinels/SentinelPrecepts/Sanctuary` | FALSE (place not on the Wiki) | Dropped by Bombard variants and Void Treasure Room containers; also available from normal Circuit tier rewards. | Dropped by Bombard, Kuva Bombard, Narmer Bombard, Tusk Bombard and Tusk Mortar Bombard (3% drop table, 0.5% item chance). |
| 1944 | `/Lotus/Powersuits/Ranger/PrimeExaltedBow` | unsupported detail removed | Automatically available with Ivara Prime; summoned by the Artemis Bow ability. | Ivara Prime's signature Exalted Weapon, summoned by the Artemis Bow ability. |

### What was actually wrong

- **Sanctuary (mod)**: the stored page has only `{{DropLocations|Sanctuary}}`. The live Wiki render lists Bombard, Kuva Bombard, Narmer Bombard, Tusk Bombard and Tusk Mortar Bombard (3% drop table, 0.5% item chance) and nothing else. The old text (Void Treasure Room containers, Circuit tier rewards) appears nowhere on the Wiki page. Codex rejected Energy Field for exactly this template state but accepted Sanctuary with text of unknown origin.
- **Necramite deco**: the Wiki says it "can be bought separately for 100 Platinum"; it does not say Market.
- **Artemis Bow Prime**: the Wiki says it is Ivara Prime's signature Exalted Weapon; "automatically available" is not stated.
- **Rifle Ammo Box**: the Wiki does not say Venus, and says it is unknown whether the Fossa drop is a bug.
- **Duviri fish (8 rows)**: "caught while fishing" omitted the condition: a Duviri fish is awarded only if the Golden Maw catches 15 fish on the first fishing of a Duviri run.
- **Spearmint Scythe (3 rows)**: the page is marked Not Available; the old text read as if currently buyable.
- **Song items (5 rows)**: what the Wiki sells is the Somachord Tone, not the song.
- Mantis Med-Tower, Wolf Hood: container wording and blueprint-only wording.

## 3. Risky classes, all checked

- Market prices (Operator Suit Collection, Manduka Pack, Umbra Operator Collection, Definitive Salon Pack, Chrysalis/Ictus/Para wings, Domestik Drone, Grand Finale, Genetic Code Template, Health Restore, Antitoxins incl. Vermillion): all match the Wiki. Vermillion is listed as "Bought from Market" 1,500 Credits on `Blueprints/Item` even though the Antidote Pack excludes it, so it stays accepted.
- Nightwave ranks and Creds (Chitoid rank 29, Emissary rank 30 and Dreams of the Dead reissue, Wolf Hood 35 Creds, 17 Cred rows): all match; every "No longer obtainable" Cred row has a Wiki start/end date.
- Prime Access wings (Ictus, Orcus, Summus, Unda): match `Sentinel Cosmetics` anchors.
- VERD-IE wings (3 rows): Hombask, 10,000 Holdfasts Standing, Rank 5 Angel, confirmed on `Hombask`. The three uniqueNames share one Wiki name; accepted as name-level matches.
- Stims: `Blueprints/Item` shows "Replicated from Tenno Lab" for 5,000 Credits.
- Fishing/conservation: Conservation tags are species-specific per the Wiki; Nexifera/Undazoa/Avichaea/Cryptilex have per-variant subpages naming each tag. Predasite and Vulpaphyla variants rest on the general rule, not a variant-specific line.
- Baro: Ki'Teer Fireworks 100,000 Credits + 50 Ducats confirmed.
- Haemadys Mask: the $1.99 PC price is only on the live `TennoGen` page (not in the stored snapshot, and not on the cited bundle page). Live page confirmed it; `TennoGen` added to its evidence.

## 4. The 38 unresolved: missed places

| Row | uniqueName | New place | Evidence |
|---:|---|---|---|
| 1131 | `/Lotus/Types/Items/Ships/NoraShip` | Nightwave Cred Offerings: the Nightwave landing craft's main blueprint and each component blueprint (Avionics, Engines, Fuselage) for 35 Nightwave Creds each; it was also the Rank 3 reward of Nightwave: Nora's Mix Volume 8. | Nightwave (Landing Craft); Nightwave/Offerings; Nightwave/Nora's Mix Volume 8 |
| 1601 | `/Lotus/Types/Items/ShipDecos/LisetPropNokkoBabyDrone` | Orbiter decoration for 100 Platinum; also included in the Nokko Bundle (Market, 815 Platinum). | Decorations/Orbiter Decorations; Nokko Bundle |
| 1930 | `/Lotus/Upgrades/Mods/Warframe/AvatarDamageResistancePoison` | The Circuit (Duviri), Normal Tier 1 and Tier 3 rewards, rotation A (0.67%); also dropped by Fusion MOA and Vapos Fusion MOA (3% drop table, 5.53% item chance). | Antitoxin (Mod) |

Why these were missed: Nightwave landing craft has its own page `Nightwave (Landing Craft)` that Codex's title lookup did not reach; the Sprodling deco is priced on `Decorations/Orbiter Decorations` and listed in `Nokko Bundle`; the standard Antitoxin mod is a different uniqueName from the Flawed one (`.../Beginner/AvatarDamageResistancePoisonBeginner`), so it was not covered by the Flawed-mod boundary, and its live drop table is concrete.

### Confirmed correctly unresolved (35)

- Braton Obsidian Skin: **accepted after Jacob** — PlayStation exclusive (Obsidian skins). Included in the PlayStation Ultimate Fan Pack. (uniqueName still differs from wiki module `PS4Braton`; accepted on PlayStation-exclusive Obsidian + Ultimate Fan Pack evidence).
- Somatics markings (10): Operator/Customization lists them with no place or price.
- Glyph Prism (2): Glyph page explains use only.
- Lotus helmet, Saryn Prime Helmet: identity mismatch; no `Lotus Helmet` or `Saryn Prime Helmet` page exists, even live.
- Missile Battery, Snow Globe, Vortex: Wiki titles are an enemy and two abilities; the Wiki's landing-craft air-support list (Override, Med-Tower, Dreamers, Orokin Eye, Carpet Bomb, Kahl Beacon, Sentry Gun) does not include them.
- Celestial Clash, Running Late, Sacred Light, This Is What You Are deco: soundtrack pages give no tone or deco acquisition. Celestial Clash reason text updated (the soundtrack page exists but is a stub).
- Cerulean Fungus Extract, Ghost Brush Extract, Skateweed Extract, Frostcap, Orokin Monitor, Lich Token: no page exists live and no stored page mentions the name.
- Energy Field: live Drop Locations has no tables; reason text updated.
- Helminth secretions (Bile, Biotics, Calx, Oxides, Pheromones, Synthetics): left unresolved. The Wiki does say they are produced by feeding resources to the Helminth, so this is a judgment call for Jacob, not an error.

## 5. Sheet vs accept-list

Before my edits: 0 mismatches across all 156 (place text, sheet row, game name, Wiki page title, "Wiki pages we checked", and the review table). After my edits: re-run, 159 of 159 agree across sheet column M, accept-list, evidence and review table. Accepted places live in column M ("Where it comes from (from wiki pages)"). Sheet column C: compared cell by cell against a pre-edit copy, identical. Row 1933 (Harrowing Spire) already had a typed URL in C; left alone.

## 6. Files changed

- `acquisition-no-source-accept-list-2026-10-15.json` (22 places corrected, 3 added, evidence updated, `_meta` counts and `doubleCheck` block)
- `acquisition-without-source.xlsx` sheet `No source`: columns G (1 cell), H, M, N, O only; 41 cells total; `Read me first` and `Summary` untouched; package parts unchanged
- `acquisition-no-source-review-2026-10-15.md` (table rows, header counts, unresolved section)
- `acquisition-no-source-doublecheck-2026-10-15.md` (this file)
- Pre-edit copies of the three files: `/tmp/chk/backup/` (temporary)

## 7. Accepted with a note (still weakest)

- Exalted Prime Blade, Shattered Lash Prime, Whipclaw Prime: place is the owning Prime Warframe; the Wiki states ownership, not a separate acquisition step.
- Simulacrum Access Key: Wiki table lists it as a Cephalon Simaris offer at 50,000 Standing; the Simulacrum page itself does not name Simaris.
- Orokin Archive (ArchWingNavCode): the Archwing page calls it the Orokin Archive coordinate.
- Jahu Gargoyle, Omni, Liset, Override and landing-craft ability rows describe where the owning item comes from, which the Wiki states.
