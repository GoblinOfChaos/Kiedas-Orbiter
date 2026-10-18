# Gemini column C check — 2026-10-16

Sheet: `acquisition-without-source.xlsx` / `No source`, column C. Rows with a value: **1511** before, **1509** after my edits.
Method: every URL (2,760) was parsed, mapped to a `wiki_store` title (direct, redirect, or case-insensitive), then the page text was searched for the row's game name (word-boundary, casefold, also without a trailing "Relic"/"Skin"). 128 pages that are template-only stubs in the store (all the relic pages, Void Relic/*) were read from the live wiki API (read-only `action=parse`). Rows that did not match were then reviewed by hand against page context. Fandom links: none. Dead / non-wiki / unresolvable URLs: none.

## Counts (1511 rows)

| Class | Rows | Meaning |
|---|---|---|
| OK | 1197 | a cited page names the item exactly |
| OK-family | 90 | parent page names it by family (e.g. `Acceltra Prime` for a Prime part, `Kuaka` for "Ashen Kuaka Tag", `Cephalon Melica` for "Tethyan Parchment Tatter" (plural), `Emotes` for "The Steel Path - X" (page writes "The Steel Path: X")) |
| OK-generic | 160 | only a big list page names it: Orbiter Decorations (75), Operator/Customization (48), Captura (25), Sigils (5), Nightwave/Offerings (5), Emblems (1), Third Party Deals (1). The item is named, but the page often gives no acquisition (see below) |
| WEAK | 60 | no cited page names the item; page is related but generic |
| WRONG → fixed | 2 | rows 271, 445, now OK |
| WRONG → cleared | 2 | rows 143, 1121 |
| BROKEN | 0 | |

Total 1197+90+160+60+2+2 = 1511.

## Worst examples / patterns

1. **Wrong-page padding (WRONG, 4 rows).** Row 143 `NONE` (the "no hood" option) cited Sevagoth, Turret, Excalibur, Nekros, Trinity (matched only on the word "None" in infoboxes). Rows 271 (Corrupted Heavy Gunner Specter) and 445 (Aged Claret of DeNas) cited Baro Ki'Teer plus four unrelated skin pages; the item is actually listed on `Baro Ki'Teer/TennoCon Items`. Row 1121 Neolyst Natah Floof cited `Epoch Operation: Taubound`, which never mentions it; no store page does.
2. **Extra unrelated URLs on otherwise good rows:** 27 URLs on 17 rows cite pages that do not mention the item (the item has another good URL in those rows, so the row is not wrong).
3. **WEAK families (60 rows), all generic pages that do not name the item:**
   - Conservation tags (Nexifera/Cryptilex/Avichaea/Condroc/Vulpaphyla/Predasite/Undazoa "… Tag", ~21): page covers the animals, not the tag items. Ostia Vasca Kavat Tag → `Vasca Kavat`.
   - Orbiter Decorations: Prex, Poster, Vosphene, Kuva Globule, Vintage Corpus Locker, TennoCon display etc. (~22); page does not name them.
   - Nightwave: Gral's Floofs, Avionics/Engines/Fuselage, Kinetic Siphon Trap Decoration (→ Nightwave/Offerings; page text lacks those exact names), Emissary Greaves/Hood/Sleeves/Suit/Cred (→ Operator/Customization, Nightwave/Series 2).
   - Harrow Profitas Helmet → `Harrow Profitas Skin`; Vena's Talons → Garuda pages; Glacial Laboratory Scene → Entropic Kuva/Cephalon Melica (The Icebind only mentions the location, not a "Scene" item); Lavos/other Prex pointed at Codex; Mod Transmute Segment; CERES NAV SEGMENT; Profit-Taker Orb Articula; Display - TennoCon 2025.
4. **Operator brows/looks/paints/Somatics (48 rows) → `Operator/Customization`:** every one is named in a gallery on that page (verified individually), so they are valid pointers. But the page lists names and images only for brows, looks and Somatics. It gives no acquisition for them (paints have a Focus price). The URL is a name reference, not an acquisition source.
5. Relics (Axi/Lith/Meso/Neo X## Relic) all resolve to their relic pages and are named there (checked with live render). Prime parts: either the relic pages name them, or the parent Prime page exists (OK-family).
6. Dual-title conflicts: only Alpha/Beta/Stable Corruptor, which have the same name with two URL sets (`Corruptor` alone vs `Operation Sling-Stone | Corruptor`). Both valid; not changed.
7. Obsidian/PS exclusives (Braton Obsidian Skin → Braton, Third Party Deals, Cross Platform Save): pages exist; Third Party Deals names the platform pack. Left as is (OK by name via Third Party Deals).

## Cells I changed (column C)

| Row | Item | Change |
|---|---|---|
| 271 | Corrupted Heavy Gunner Specter | → `https://wiki.warframe.com/w/Baro_Ki%27Teer/TennoCon_Items` (page lists "5 x Corrupted Heavy Gunner Specter") |
| 445 | Aged Claret of DeNas | → same page (lists "Aged Claret of Denas") |
| 143 | NONE | cleared (junk URLs, no proof of a page) |
| 1121 | Neolyst Natah Floof | cleared (no wiki_store page names it) |

Column M and all other cells untouched. `acquisition-sections.json` not written, nothing committed. Backup of the sheet before my edits: `/tmp/acquisition-without-source.pre-check-2026-10-16.xlsx`.

**Heads-up:** the workbook is open in OnlyOffice right now (lock file, started 10:22). My four edits were written to disk. If the open copy is saved, it will overwrite them; close and reopen first, or re-apply the four rows.

## Trust recommendation

Column C can be used as a **wiki pointer list**, with the above caveats: ~96% of rows (1449 of 1511, OK + family + generic) have a page that names the item (OK + family + generic). Do **not** read it as an acquisition source: pages for 160 generic-list rows and many Prime parts show the name, not always a source. The 60 WEAK rows (listed by family above) should be treated as "no page found" rather than evidence. Don't copy URLs from rows with 4+ URLs without checking that each one is relevant.
