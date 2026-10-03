# Preview app checklist

Edit freely. Tick `[x]` when verified in the live app. Allow 4-6s per screen before judging (screens render slowly).

Sources: the pasted list from an earlier chat (statuses there are unverified by this session) and the 2026-09-29 walkthrough.

## Highest priority - "fixed" but first attempts failed, recheck

- [x] Farming target images (drawer + ledger, blueprints and raw resources)
- [x] Citrine Prime relics: Relics tab, Relic Planner, Relics screen, Inventory
- [ ] Relic reward overlay: Citrine Prime not "Unrecognized" (needs game running; uncommitted `relicParser.js` change)
- [ ] Farming Targets screen fully in German (all 78 strings, not just one label)

## Fixed in code 2026-10-02, verify in the deployed build (tick only when seen in the app)

Numbers refer to `docs/RECURRING_ERRORS_REPORT.md`.

- [ ] #12 Foundry: open a recipe panel, click outside it, it closes; Escape closes it; the close button still works; clicking inside the panel does not close it
- [ ] #18 Settings > Hotkeys: the Riven action reads "Grade Rivens", not `settings.hotkey_action_grade_rivens`; also check the Riven prompt text in German
- [ ] #18 Market label in the sidebar is translated in French, Korean, Italian, Japanese, Polish, Traditional Chinese, Thai, Turkish and Ukrainian (a translation was nearly lost in one fix and restored)
- [ ] #9 Prime part drawers (for example Ash Prime Chassis, Citrine Prime Blueprint): each relic appears once with (Common/Uncommon/Rare), no Intact/Exceptional/Flawless/Radiant rows, no raw key like `ui.relic_rarity.rare`
- [ ] #8 Farming Targets: Orokin Cell is not shown as having a blueprint that drops from enemies; Forma Blueprint and Prime part drawers still list their drops
- [ ] #10 Voidgel Orb drawer: the sources listed match the summary; no "+N more sources" text without matching rows (spot-check two other items)
- [ ] #11 Salvage drawer: no ship-decoration paragraph; Conclave appears as drop sources. A Market source is NOT added yet
- [ ] #17 Riven reroll screen: the overlay appears and stays; closing the screen hides it
- [ ] #23 Relic mission with Sevagoth Prime: all reward cards are recognized (Sevagoth Prime Neuroptics Blueprint)

## Fixed earlier, needs retest

- [ ] Riven single-card grading
- [ ] Target Inspector dropdown clipping
- [ ] Farm Next planet + node display
- [ ] Calendar weekday locale
- [ ] "The Circuit" translation

## Fixed 2026-09-29, verify

- [x] Double scrollbar gone: Inventory, Rivens, Relics, Market, Relic Planner, Dashboard live activities, sidebar, Notes tab strip
- [x] Scrollbars (8px) are grabbable by mouse and not big or white
- [ ] Window under 1050px wide: collapsed sidebar rail scrollbar OK
- [ ] Startup and updater/HTTP calls fine on Tauri core 2.12.0 + plugins

## Known, root-caused, not fixed

- [ ] Which desktop side shows which riven card
- [ ] Currency scrollbar (needs a fresh look, not stale evidence)
- [ ] "ROATS OBLIVION" (find which widget it is under)

## Untouched

- [ ] Drop-chance ordering
- [ ] Language-change bug
- [ ] Market tab riven filters
- [ ] #109 leftovers
- [ ] Mission-percentage gap (#131)
- [ ] Circuit / Farming Targets translations for the other 13 locales

## Open from 2026-09-29 walkthrough

- [ ] Navigation lag of 4-6s per screen (profile before guessing a cause)
- [ ] Dead `.is-overlay` CSS rule at `src/index.css:309`
- [ ] Cosmetics "MISSING" pill: confirm it means "not owned"
- [ ] Commit the Tauri dependency updates and `preview:deploy` script (uncommitted)

## Known-good items to re-check after data changes

Search Inventory for each:

- [ ] Narin: Warframe + Blueprint, Chassis, Neuroptics, Systems
- [ ] Citrine Prime: Warframe + 3 Prime parts
- [ ] Grimoire + Grimoire Blueprint

## Screen sweep

- [ ] Dashboard
- [ ] Inventory (3508 items, category sidebar, resource strip, search, filters)
- [ ] Mastery
- [ ] Mods (1508)
- [ ] Cosmetics
- [ ] Collectibles
- [ ] Foundry (365/831 owned, recipe bubbles)
- [ ] Relics (796/2046 types)
- [ ] Relic Planner
- [ ] Prime Resurgence
- [ ] Farming Targets
- [ ] Market
- [ ] Rivens
- [ ] History
- [ ] Adversaries
- [ ] Maps
- [ ] Wiki (wiki.warframe.com only, never Fandom)
- [ ] Notes
- [ ] Checklist
- [ ] Settings
- [ ] About
