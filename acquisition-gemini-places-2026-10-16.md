# Gemini-linked wiki pages: acquisition places (2026-10-16)

Source: official Warframe Wiki only (local `wiki_store` snapshot of 2026-10-14; live read-only `api.php` for the relic pages, whose stored copy is just a template; Fandom not used; AlecaFrame not needed). No `acquisition-sections.json` written, nothing committed.

## Counts

| Measure | Rows |
|---|---:|
| Rows attempted (column C filled, column M empty) | 983 |
| Places saved to column M (sheet rows) | 817 |
| Distinct uniqueNames added to the accept-list | 793 (160 -> 953) |
| Verified place held back: dual-title conflict | 8 |
| No place saved (total) | 158 |
| - weak: item name not on linked pages / generic name | 71 |
| - no place on page: page names or mentions the item without saying how to get it | 53 |
| - rule: Operator brow / Somatics (no price) | 28 |
| - rule: Helminth secretion (left unresolved) | 6 |
| Total | 983 |

Saved places by family:

- Other (quests, vendors, bundles, components, misc): 341
- Void Relics: 111
- Market decorations / Noggles / Displays: 98
- Captura scenes: 75
- Prime parts (relic drops): 58
- Nightcap Nursery plants: 44
- Prex cards: 29
- Technocyte Coda Floofs / Posters: 22
- Steel Path emotes: 22
- Pride event items: 17

## Files changed

- `acquisition-without-source.xlsx` (sheet `No source`): column M, H, N, O filled for the saved rows only. Column C untouched. Backup before editing: `/tmp/acquisition-without-source.pre-places-2026-10-16.xlsx`.
- `acquisition-no-source-accept-list-2026-10-15.json`: new uniqueName -> place entries added with page evidence; the original 160 entries are unchanged (checked equal to the pre-edit copy `/tmp/accept-list.pre-places-2026-10-16.json`). `_meta.geminiPlacesPass` records the pass.
- `acquisition-gemini-places-2026-10-16.md` (this file).

## How places were chosen

- Only text the wiki states: vendor tables (`SynOfferBox`, `OfferingsBox`, `MarketBox`), Captura `SceneBox` notes, Prex tables, relic drop tables, quest reward lists, `Acquisition` sections on weapon / mod / ship pages. Name matched whole-word, case-insensitive. Search snippets were not used as evidence.
- Where the linked page only named the item (checklists such as "Item Checklist for Thrax Plasm" are crafting costs, not acquisition), the item's own wiki page was read instead when it existed in the store (for example `Aeolak`, `Ambassador`, `Cinta`, `Hespar`, `Mantis`, `Scimitar`, `Parallax`, `Xiphos`, `Enkaus`, `Dorrclave`). Those pages are listed in column N and in the accept-list evidence, even though column C was left as Gemini wrote it.
- Event / holiday items state when they are available (Pride each June, TennoCon relay dates, Dog Days, Star Days, Conquera). No "not currently available" wording was written.
- Relics: the 4 refinement rows of one relic share one place. Neo K10 (column C points only at `Void Relic`) used the `Neo K10` relic page.
- Prime parts say "Dropped by Void Relics, including: ..." because only the relic pages Gemini linked were checked; the list may not be complete.
- Several Pride / Floof / display rows say only which event or collection they belong to because the wiki gives no mechanic or price; the wording says so.

## Held back (dual-title conflict, per instructions)

| Row | Item | Verified place (not written) |
|---:|---|---|
| 281 | Lanzo Fishing Spear | Bought from Hai-Luk (Cetus) for 500 Standing. |
| 291 | Peram Fishing Spear | Bought from Hai-Luk (Cetus) for 500 Standing at rank Neutral. |
| 301 | Shockprod Fishing Spear | Bought from The Business (Fortuna) for 500 Standing. |
| 307 | Stunna Fishing Spear | Bought from The Business (Fortuna) for 5,000 Standing at rank Doer, after buying the Shockprod Fishing Spear. |
| 312 | Tulok Fishing Spear | Bought from Hai-Luk (Cetus) for 500 Standing at rank Neutral. |
| 1934 | Negation Armor | Arbiters of Hexis at Rank Maxim or The Perrin Sequence at Rank Partner, for 25,000 Standing; also periodically from The Circuit. |
| 1940 | Teleport Rush | Arbiters of Hexis at Rank Maxim or Red Veil at Rank Exalted, for 25,000 Standing. |
| 1942 | Viral Tempest | Cephalon Suda at Rank Genius or New Loka at Rank Flawless, for 25,000 Standing; also periodically from The Circuit. |

## Rows with no place (reason on each)

| Row | Item | Group | Reason |
|---:|---|---|---|
| 11 | Brow 61-T | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 12 | Brow 71-J | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 13 | Brow 80-N | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 14 | Brow E8-C | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 15 | Brow I4-7 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 16 | Brow K5-6 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 17 | Brow L0-3 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 18 | Brow M5-9 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 19 | Brow O1-1 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 20 | Brow P4-X | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 21 | Brow Q6-R | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 22 | Brow R7-0 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 23 | Brow S4-J | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 24 | Brow T3-4 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 25 | Brow U4-v | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 26 | Brow V9-5 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 27 | Brow W2-4 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 28 | Brow X0-9 | rule | Operator/Customization lists the brow by name only; no acquisition or price given. |
| 90 | Harrow Profitas Helmet | weak | Harrow Profitas Skin page does not name the Harrow Profitas Helmet; no place for the helmet itself. |
| 91 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 92 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 93 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 94 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 95 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 96 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 97 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 98 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 99 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 100 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 101 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 102 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 103 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 104 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 105 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 106 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 107 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 108 | Helmet Or Syandana | weak | Generic game name "Helmet Or Syandana"; linked Update 16 page only describes Arcane attachment, no place for this item. |
| 109 | Hildryn Sarcostema Helmet | no place on page | Linked pages do not state how this item is obtained. |
| 126 | Lotus | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 132 | LotusWarframeCustomization | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 146 | Nautilus Skin | no place on page | Linked pages do not state how this item is obtained. |
| 173 | Seal Of Honoring | no place on page | Sigils page only lists the Xbox One Anniversary Sigil by name; no acquisition text. |
| 174 | Seal Of Honoring II | no place on page | Sigils page only lists the Xbox One Anniversary Sigil by name; no acquisition text. |
| 175 | Seal Of Honoring III | no place on page | Sigils page only lists the Xbox One Anniversary Sigil by name; no acquisition text. |
| 176 | Seal Of Honoring IV | no place on page | Sigils page only lists the Xbox One Anniversary Sigil by name; no acquisition text. |
| 178 | Sigma Engines | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 179 | Sigma Plating | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 180 | Sigma Reactor | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 181 | Sigma Shield Array | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 185 | Somatics Asa-03 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 186 | Somatics Asa-23 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 187 | Somatics D11 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 188 | Somatics Dev-64 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 189 | Somatics Fa-13 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 190 | Somatics J-02 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 191 | Somatics K5 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 192 | Somatics Ln2 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 193 | Somatics Rev-16 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 194 | Somatics Tt-11 | rule | Operator/Customization lists the Somatic marking by name only; no acquisition or price given. |
| 214 | Tauron Prime Regalia | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 215 | Tauron Prime Regalia | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 223 | TennoVIP Xi'an 2026 Sigil | no place on page | Sigils page lists the Live Event Sigil by name only; no acquisition text. |
| 243 | Vena's Talons | no place on page | Gemini Skins page does not state that Vena's Talons come with the skin; no place stated. |
| 246 | Voruna Prime Helmet | no place on page | Linked pages do not state how this item is obtained. |
| 247 | Vox Solaris Mask | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 275 | Glyph Prism | no place on page | Glyph page describes what a Glyph Prism does, not how to get it. |
| 276 | Glyph Prism | no place on page | Glyph page describes what a Glyph Prism does, not how to get it. |
| 284 | Missile Battery | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 294 | Railjack Recall | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 304 | Snow Globe | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 315 | Vortex | no place on page | Linked pages do not state how to get this item (name only appears in unrelated text, patch notes or checklists). |
| 424 | "Circle of Comrades" Series on VHS | no place on page | KIM page lists this item only as a compatible gift (Chemistry value); no place to get it. |
| 463 | Alpine Monitor Sawgaw Floof | no place on page | The Business page shows the floof only in a Tags gallery with no stated price or condition. |
| 483 | Archon Boreal's Shard | no place on page | Archon Boreal and Archon Hunt pages mention the shard only in patch notes. |
| 493 | Ashen Kuaka Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 514 | Bile | rule | Helminth secretion: left unresolved (Jacob's earlier call). |
| 516 | Biotics | rule | Helminth secretion: left unresolved (Jacob's earlier call). |
| 519 | Black-Banded Bolarola Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 524 | Brindle Kubrodon Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 528 | CERES NAV SEGMENT | weak | Linked pages do not state how this segment is obtained (name absent or only in patch notes). |
| 537 | Calx | rule | Helminth secretion: left unresolved (Jacob's earlier call). |
| 547 | Celestial Clash | no place on page | Linked page does not state how to get the Somachord/song item. |
| 564 | Coastal Mergoo Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 566 | Common Condroc Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 572 | Conquera 2025 Community Display | no place on page | Orbiter Decorations lists the Conquera 2025 Community Display with no acquisition note. |
| 580 | Conquera Virmink Floof | no place on page | Decorations page mentions the Conquera Virmink Floof only in patch notes. |
| 612 | Dappled Horrasque Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 629 | Delicate Pobber Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 632 | Devourer | no place on page | Linked page does not state how to get the Somachord/song item. |
| 659 | Display - TennoCon 2025 | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 701 | Duviri Senate Seat | no place on page | Duviri Senate Seat: linked Clan Dojo page lists it only in patch notes; no place stated. |
| 723 | Emperor Condroc Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 744 | Eros Oro Ornament | weak | Orbiter Decorations lists "Eros Oro", not "Eros Oro Ornament"; name does not match whole. |
| 753 | FUSELAGE REPAIRS | no place on page | Linked pages do not state how to get this item (name only in unrelated text or patch notes). |
| 785 | Flossy Sawgaw Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 790 | Follie's Shadowgraph | no place on page | Linked pages do not state how to get this item (name only in unrelated text or patch notes). |
| 796 | Fuming Dax Stover Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 831 | Ghost Kuaka Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 842 | Glowing Sentient Core Decoration | no place on page | Linked pages mention the decoration only in patch notes/gallery. |
| 855 | Gral's Kubrodon Floof | weak | Nightwave/Offerings page does not name this item (WEAK per Gemini check). |
| 856 | Gral's Pobber Floof | weak | Nightwave/Offerings page does not name this item (WEAK per Gemini check). |
| 857 | Gral's Thumper Floof | weak | Nightwave/Offerings page does not name this item (WEAK per Gemini check). |
| 892 | Horrasque Stormer Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 937 | Keratinos Blades | no place on page | Linked pages do not state how to get this item (name only in unrelated text or patch notes). |
| 975 | Kinetic Siphon Trap Decoration | weak | Nightwave/Offerings page does not name this item (WEAK per Gemini check). |
| 982 | Kubrodon Incarnadine Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 991 | Legendary Mastery Slate | no place on page | Mastery Rank page names only the Aurichalc Legendary Mastery Slate; no place for this item. |
| 994 | Level Up for St. Jude | no place on page | Bombyx Syandana page ties the St. Jude campaign to the syandana, not to this decoration. |
| 1012 | Long Live the King | no place on page | Linked pages do not state how to get this item (name only in unrelated text or patch notes). |
| 1033 | Madurai Poster | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1034 | Madurai Vosphene | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1073 | Mod Transmute Segment | weak | Linked pages do not state how this segment is obtained (name absent or only in patch notes). |
| 1096 | NEPTUNE NAV SEGMENT | weak | Linked pages do not state how this segment is obtained (name absent or only in patch notes). |
| 1102 | Naramon Poster | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1103 | Naramon Vosphene | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1132 | Nightwave Avionics | weak | Nightwave/Offerings page does not name this item (WEAK per Gemini check). |
| 1133 | Nightwave Engines | weak | Nightwave/Offerings page does not name this item (WEAK per Gemini check). |
| 1134 | Nightwave Fuselage | weak | Nightwave/Offerings page does not name this item (WEAK per Gemini check). |
| 1222 | Noggle Statue - Gauss | no place on page | Prime Access page lists "Noggle Statue - Gauss Prime", not this item. |
| 1245 | Noggle Statue - Kahl-175 | no place on page | Update 32 notes mention Kahl customizations but not this Noggle. |
| 1311 | Noggle Statue - The Wolf | weak | Pages name a different item ("Wolf of Saturn Six Noggle") for the Nightwave reward; name does not match. |
| 1360 | Ollie Floof | no place on page | Devstream 186 mentions the Ollie Floof only as a limited real-world merchandise item; no in-game place. |
| 1373 | On-lyne: The Boys R Back | no place on page | KIM page lists this item only as a compatible gift (Chemistry value); no place to get it. |
| 1378 | Onkko's Coffer | no place on page | Onkko's Coffer appears only in quest story text; no place for the decoration stated. |
| 1388 | Oro Ornament | weak | No linked page names "Oro Ornament". |
| 1401 | Ostia Vasca Kavat Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1409 | Oxides | rule | Helminth secretion: left unresolved (Jacob's earlier call). |
| 1431 | Pheromones | rule | Helminth secretion: left unresolved (Jacob's earlier call). |
| 1433 | Plains Kuaka Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1457 | Profit-Taker Orb Articula | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1505 | Rogue Condroc Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1514 | Running Late | no place on page | Linked page does not state how to get the Somachord/song item. |
| 1519 | SENTIENT APPETITE | no place on page | Linked pages do not state how to get this item (name only in unrelated text or patch notes). |
| 1520 | SISTER OF PARVOS TOKEN | no place on page | Public Export listing only; no wiki acquisition text. |
| 1524 | STOCKING | no place on page | Linked quote/patch pages do not state how to get the item. |
| 1525 | Sacred Light | no place on page | Linked page does not state how to get the Somachord/song item. |
| 1529 | Saggen Well Decoration | no place on page | Linked pages do not state how to get this item (name only in unrelated text or patch notes). |
| 1554 | Sentinel Stover Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1596 | Splendid Mergoo Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1599 | Spotted Bolarola Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1637 | Sunny Pobber Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1640 | Synthetics | rule | Helminth secretion: left unresolved (Jacob's earlier call). |
| 1729 | The Citadel Simulacrum | no place on page | Linked pages do not state how to get this item (name only in unrelated text or patch notes). |
| 1739 | The New War Orbiter Decoration | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1775 | Thorny Bolarola Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1795 | URANUS NAV SEGMENT | weak | Linked pages do not state how this segment is obtained (name absent or only in patch notes). |
| 1799 | Unairu Poster | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1800 | Unairu Vosphene | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1810 | Unity | weak | Linked pages do not match this item (Orbiter Decorations "Unity" entry is a different Pride decoration). |
| 1827 | Vallis Kubrodon Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1835 | Vazarin Poster | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1836 | Vazarin Vosphene | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1855 | Warframe: 1999 Graphica Cover Display | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1866 | White-Breasted Virmink Tag | weak | Linked species page covers the animal, not the tag item; no place for the tag stated (WEAK per Gemini check). |
| 1919 | Zenurik Poster | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1920 | Zenurik Vosphene | weak | Linked Orbiter Decorations page does not name this item; no place stated. |
| 1932 | Energy Field | no place on page | Energy Field: live render shows no mission or enemy drop tables; page names no source. |
| 1938 | Rush | no place on page | Rush: page gives no acquisition text (drop-table template only). |

## Review suggestions

- 24 sheet rows share a uniqueName with another row (relic rows exist twice, once under ExportRelics and once under ExportResources); both rows carry the same place.
- Judgment calls worth a look: TennoGen helmets (place is the parent skin's Acquisition section), Hound parts (generic "blueprint from Sisters of Parvos" from the Hound page), Mantis / Scimitar / Xiphos / Parallax ship components, Ticker and Bird 3 decorations (price bands only), Lyon decorations (random daily price).
