# Bucket-rule supplement audit

Date: 2026-09-25. Sources: cached Digital Extremes Public Export at `/home/jedwards/.cache/kiedas-de-export`, Preview export baseline at `/home/jedwards/.local/share/kiedas-orbiter-preview/data/export`, and the DE-only analyzer output in `supplement-freshness.md`. No Fandom or third-party game-data source was used.

## Weapon buckets

The analyzer found 55 records rejected by the old combat-field predicate. Every record is `productCategory: Pistols`, has no DE `slot` field, and has `masteryReq: 0`; none is a player-masterable weapon. The first 16 are Deimos antigen/mutagen components, the next 33 are Moa/Hound components, and the final 6 are Vulpaphyla/Predasite reward definitions. They can be owned as companion components/reward items, but cannot be mastered as weapons.

Names, DE fields, and ownership/mastery result (each name in the group has the fields stated in its group):

- Deimos components — `VIROX ANTIGEN`, `DESUS ANTIGEN`, `PLAGEN ANTIGEN`, `POXI ANTIGEN`, `ADRA MUTAGEN`, `ELSA MUTAGEN`, `ZARIM MUTAGEN`, `PHIJAR MUTAGEN`, `ELASMUN ANTIGEN`, `IRANON ANTIGEN`, `IBEXAN ANTIGEN`, `TETHRON ANTIGEN`, `LEPTOSAM MUTAGEN`, `CHITEN MUTAGEN`, `ARIOLI MUTAGEN`, `MONACHOD MUTAGEN`; `Pistols`, slot absent, `masteryReq: 0`, `codexSecret: false`; ownable as parts, not masterable.
- Moa/Hound components — `Lehan Core`, `Tyli Gyro`, `Alcrom Core`, `Krisys Core`, `Drex Core`, `Lambeo Moa`, `Nychus Moa`, `Oloro Moa`, `Para Moa`, `Drimper Bracket`, `Tian Bracket`, `Jonsin Bracket`, `Gauth Bracket`, `Hona Bracket`, `Aegron Gyro`, `Trux Gyro`, `Harpen Gyro`, `Hextra Gyro`, `Munit Gyro`, `Phazor Gyro`, `Atheca Gyro`, `Adlet Core`, `Garmr Core`, `Raiju Core`, `Dorma Hound`, `Bhaira Hound`, `Hec Hound`, `Cela Bracket`, `Urga Bracket`, `Zubb Bracket`, `Wanz Stabilizer`, `Hinta Stabilizer`, `Frak Stabilizer`; `Pistols`, slot absent, `masteryReq: 0`, `codexSecret: false`; ownable as parts, not masterable.
- Companion reward definitions — `Sly Vulpaphyla`, `Panzer Vulpaphyla`, `Crescent Vulpaphyla`, `Vizier Predasite`, `Medjay Predasite`, `Pharaoh Predasite`; `Pistols`, slot absent, `masteryReq: 0`, `codexSecret: false`; obtainable as companion reward definitions, not masterable weapons.

The parser now uses DE `productCategory` (`LongGuns` primary, `Pistols` secondary, `Melee` melee) and verified slot fallbacks (`1`, `0`, `5`) before combat heuristics. It excludes DE internal companion, exalted, enemy, PvP, and bayonet-attachment paths. Current runtime-export counts are unchanged after the guard: primary 197, secondary 148, melee 225; the raw DE comparison was primary 196→196, secondary 149→149, melee 225→225.

## Mastery category findings

The two uncovered values are `SpecialItems`: `Diwata` and `Diwata Prime`, both `slot: 7`, `masteryReq: 0`, `excludeFromCodex: true`, and exalted weapons under Titania’s Powersuit. They are not real masterable items, so neither Mastery.jsx nor MonitoringContext’s mastery list was expanded. Both lists remain consistent for real mastery categories.

## Codex flags

The 60 DE-only records are 15 Honoria titles, 34 glyphs, 10 skins/animation/sigil definitions, and Kalsawi Emote. The DE records provide no `masteryReq` or DE recipe/drop proof that would justify overriding the codex flags as released player-obtainable catalog entries. Existing behavior is retained: owned items remain visible where supported; unowned codex-secret/excluded glyphs remain hidden; cosmetics with real DE artwork are handled by the existing artwork rule; Kalsawi is already consumed from ExportFlavour rather than the hidden glyph path. No codex rule was changed.

## Acquisition gaps and cosmetic addition

Using the real `getAcquisitionInfo` path with the current recipe index and acquisition data, Infernum, Gastroparesis, Cold Front, and Brood's Oversurge each currently return `sources: []`, `recipe: null`, and a non-direct official Wiki search link. The DE cache has no recipe or drop-table evidence for these augment records, so no non-invented drawer-data fix exists.

Kalsawi Emote currently has the same honest empty drawer result (`sources: []`, `recipe: null`, official Wiki search link). It is present in DE ExportFlavour and the Cosmetics screen consumes that table directly; adding it to the custom-cosmetic supplement would be the wrong table and was not done.

## Verification

- `nice -n 19 node scripts/supplement-freshness.mjs` — reproduced 4 acquisition, 1 cosmetic, 55 weapon, 60 codex, and 2 mastery findings.
- `nice -n 19 node --check scripts/supplement-freshness.mjs` and `nice -n 19 node --check scripts/item-completeness.mjs` — pass.
- `nice -n 19 node --test 'tests/**/*.test.mjs'` — 26 passed.
- `nice -n 19 npm run check:completeness` — all reported matrix rows passed; merged counts include 846 weapons and 2024 recipes.
