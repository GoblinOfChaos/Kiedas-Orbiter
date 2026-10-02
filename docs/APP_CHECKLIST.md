# Preview app checklist

Edit freely. Tick `[x]` when verified in the live app. Allow 4-6s per screen before judging (screens render slowly).

Sources: the pasted list from an earlier chat (statuses there are unverified by this session) and the 2026-09-29 walkthrough.

## Highest priority - "fixed" but first attempts failed, recheck

- [x] Farming target images (drawer + ledger, blueprints and raw resources)
- [x] Citrine Prime relics: Relics tab, Relic Planner, Relics screen, Inventory
- [ ] Relic reward overlay: Citrine Prime not "Unrecognized" (needs game running; uncommitted `relicParser.js` change)
- [ ] Farming Targets screen fully in German (all 78 strings, not just one label)

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
