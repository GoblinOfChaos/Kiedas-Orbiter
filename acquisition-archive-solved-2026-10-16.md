# Archive of solved acquisition rows, 2026-10-16

Workbook: `acquisition-without-source.xlsx`. Backup before any change: `acquisition-without-source.xlsx.pre-20261016-archive`.
Column C and the Item id / Game name columns were not changed on any row (checked against the backup; 1,973 rows before and after).

## Counts
| Step | Rows |
|---|---|
| Rows on `No source` with a place in M at start | 1,367 |
| Fixed during verification (kept as solved) | 2 |
| Place cleared as broken/unverifiable, left on `No source` | 4 |
| Archived from the existing M-filled set | 1,363 |
| Empty-M rows filled from the wiki and archived this pass | 135 |
| **`Archive` tab now** | **1,498** (all have a place) |
| **`No source` now** | **475** (all with empty M, unsolved) |

## Verification fixes
- Lith Relic: place was "1500 credits". Replaced with the generic relic text used for Meso/Neo/Axi (Void Relic page). Archived.
- Display - TennoCon 2021: stray "Merch" word removed. Archived.
- Cleared and left on No source: Noggle Statue - Ember and Noggle Statue - Hydroid (the wiki's Dog Days price is for the separate "Reprise" Noggles), Orokin Derelict Plaza Scene (broken template text), Varzia's Offerings (empty sentence).
- Row 590 Corufell Prime Stock kept as Stock ("Lith C15 relic drop.").
- Kept: Helminth Invigoration Segment (a Necralisk/Market purchase, not a secretion).
- No residual `{{...}}` templates remain in archived places.

## Wiki-filled and archived (135), per-item evidence from `Decorations/Orbiter Decorations`, `Nightwave/Offerings`, and the species pages
- 47 Prime Warframe Noggles listed in the "Prime Warframe Variants" gallery (the page says these come only from the Prime Access/Vault pack or Varzia during Prime Resurgence).
- 11 Noggles with a named source (The Hex finale x5, Nights of Naberus Market x6) and 9 one-offs (Founders, Switch, Xbox, PS4, Anniversary, Umbra statue, Riptide Pack).
- 35 Mastery Slates (rank test from the page's rank table; Legendary 1-5).
- 10 Focus Represent posters and Vosphene glyphs.
- 3 Gral's Floofs, Kinetic Siphon Trap, 3 Nightwave landing-craft blueprints (Nightwave Offerings creds).
- 5 Conservation tags with an explicit location (Ashen/Ghost/Plains Kuaka, Common/Rogue Condroc).
- 8 TennoCon digital-pack displays, TennoTrivia 2020, Follie's Shadowgraph, Jack o'Naut Statue.

Samples: "Reward for passing the Mastery Rank 6 Test." / "Included in the Prime Access or Prime Vault pack for this Warframe, or sold individually by Varzia during Prime Resurgence." / "Purchase from Nightwave Offerings for 40 Nightwave Creds."

## Left on `No source` (475, empty M)
No page gives a per-item place, so these were not filled:
- 18 Operator brows and 10 Somatics markings (wiki lists them with no price), 19 junk "Helmet Or Syandana" rows, internal/test items (NAV segments, repairs, test forma, fake items).
- Fishing spears, augment mods, dual-title rows (held for a decision).
- Helminth secretions (Bile, Biotics, Calx, Oxides, Pheromones, Synthetics, Sentient Appetite) stay empty by instruction.
- 24 Sevagoth/Hydroid vault relics, Noggle Ember/Hydroid, Retro decoration props, other Conservation tags without a stated location.

## Not done
- The accept-list JSON was not changed (archived places remain in it; the 135 new places were not added to it).
- Nothing was rebuilt, committed, or written to `acquisition-sections.json`.
- Summary sheet formulas use fixed ranges A2:A2006, so they now count the 475 rows left on `No source`.

## Warning
If the workbook is open in OnlyOffice, closing it with "Save" overwrites these edits. Close without saving, then reopen.
