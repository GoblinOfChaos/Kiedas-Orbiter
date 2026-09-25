# DE official localisation: real-data parity (coordinator measurement, 2026-09-25)

Method: DE `Export<Category>_<locale>.json` (fetched from content.warframe.com via `scripts/de-export/de-export.mjs fetch`, cached under ~/.cache/kiedas-de-export/assets/<locale>/) compared record by record (by uniqueName) with the community mirror text: mirror `name` loctag resolved through the mirror `dict.<locale>.json` (raw.githubusercontent.com/calamity-inc/warframe-public-export-plus). "same" = identical after trim.

| Category | de: same / diff / no-mirror-key | ja: same / diff / no-mirror-key |
| --- | --- | --- |
| Warframes (127) | 125 / 0 / 2 | 125 / 0 / 2 |
| Weapons (841) | 837 / 0 / 4 | 837 / 0 / 4 |
| Upgrades (1603) | 1596 / 2 / 0 (+5 DE-only) | 1596 / 2 / 0 (+5 DE-only) |
| Resources (3545) | 3480 / 2 / 48 | 3480 / 2 / 48 |
| Customs (4833) | 4681 / 6 / 9 | 4682 / 5 / 9 |
| Flavour (2681) | 2590 / 1 / 0 | 2591 / 0 / 0 |
| Gear (180) | 175 / 5 / 0 | 172 / 8 / 0 |
| Sentinels (34) | 34 / 0 / 0 | 34 / 0 / 0 |

Differences are (a) newer DE wording than the mirror (e.g. de `Gas-Beben` vs mirror `Nachhallendes Beben`), (b) typography (straight vs curly apostrophes, quote styles) and (c) letter case (`Echo-Köder` vs `ECHO-KÖDER`). No record had an empty or /Lotus/ key text. Note: for ja, DE leaves some upgrade names in English (`Sonic Siphon`); `applyDeLocale` only replaces text with non-empty literals, so those show DE's official wording.
The unit test tests/de-export/i18n-parity.test.mjs only checks synthetic invariants plus the presence of cached locale provenance; this document is the real-data evidence. Locale switching is in-memory only (`src/lib/deLocale.js`), nothing localized is written into Export*.json.
