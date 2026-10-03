# Preview app checklist

Edit freely. Tick `[x]` when verified in the live app. Allow 4-6s per screen before judging (screens render slowly).

Sources: the pasted list from an earlier chat (statuses there are unverified by this session) and the 2026-09-29 walkthrough.

## Highest priority - "fixed" but first attempts failed, recheck

- [x] Farming target images (drawer + ledger, blueprints and raw resources)
- [x] Citrine Prime relics: Relics tab, Relic Planner, Relics screen, Inventory
- [ ] Relic reward overlay: Citrine Prime not "Unrecognized" (needs game running; uncommitted `relicParser.js` change)
- [ ] #14 No untranslated UI anywhere (all 14 languages): in German and at least one other language, Farming Targets (78 strings), Foundry and every other screen show translated text. No English left over, no raw keys (except game names and "The Circuit", which has no official localized name). Status: fixed in code for all 14 languages, deployed in build 795d0a78; awaiting your check

## Fixed in code 2026-10-02, verify in the deployed build (tick only when seen in the app)

Numbers refer to `docs/RECURRING_ERRORS_REPORT.md`.

- [x] #12 Foundry: open a recipe panel, click outside it, it closes; Escape closes it; the close button still works; clicking inside the panel does not close it (confirmed by the user 2026-10-02, build 63121682)
- [ ] #18 Settings > Hotkeys: the Riven action reads "Grade Rivens", not `settings.hotkey_action_grade_rivens`; also check the Riven prompt text in German
- [ ] #18 Market label in the sidebar is translated in French, Korean, Italian, Japanese, Polish, Traditional Chinese, Thai, Turkish and Ukrainian (a translation was nearly lost in one fix and restored)
- [ ] #9 Prime part drawers (for example Ash Prime Chassis, Citrine Prime Blueprint): each relic appears once with (Common/Uncommon/Rare), no Intact/Exceptional/Flawless/Radiant rows, no raw key like `ui.relic_rarity.rare`
- [ ] #8 Farming Targets: Orokin Cell is not shown as having a blueprint that drops from enemies; Forma Blueprint and Prime part drawers still list their drops
- [ ] #10 Voidgel Orb drawer: the sources listed match the summary; no "+N more sources" text without matching rows (spot-check two other items)
- [ ] #11 Salvage drawer: no ship-decoration paragraph; Conclave appears as drop sources. A Market source is NOT added yet
- [ ] #17 Riven reroll screen: the overlay appears and stays; closing the screen hides it
- [ ] #23 Relic mission with Sevagoth Prime: all reward cards are recognized (Sevagoth Prime Neuroptics Blueprint)

## Deployed 2026-10-02 22:41 (build 795d0a78): verify these in the app

These were merged after the 20:18 build and are in the build deployed at 22:41 (commit `795d0a78`; the Rust unit tests, 47, passed before the build). The AppImage footer shows the build commit and time: check it reads `Build 795d0a7 2026-10-02 22:40` (the footer shows a 7-character hash and the compile start time) before testing. Items marked (R) involve the Rust side. If this build is worse than the previous one, the previous build (20:18, commit `63121682`) is kept as `~/AppImages/kiedas_orbiter_preview.appimage.bak-2241`. Numbers refer to `docs/RECURRING_ERRORS_REPORT.md`. Tick a box only when you have seen it work; report anything wrong with a screenshot, the screen name and the language.

- [ ] #9 Acceltra Prime (and any Prime weapon): the "Crafting requirements" part rows show each relic once with (Common/Uncommon/Rare), no repeats, no percentages
- [ ] #11 Salvage drawer: Conclave drops AND the wiki lines (Market 30 Platinum for 3000, Carme and Olympus farming notes)
- [ ] #13 Inventory: Titan Extractor and Distilling Extractor Prime Sets show real artwork (set and blueprint)
- [ ] #14 Switch the app to German, then Japanese (and any other): Farming Targets, Foundry, Riven prompt and relic tier labels are fully translated; nothing left in English except game names and "The Circuit"
- [ ] #24 (R-free) Start the scanner in a non-English language: the "scanner hooked" toast shows real text, not `app.scanner_title`
- [ ] #25 Riven screen: the "press hotkey" banner stays visible after you press the hotkey and disappears only when you leave the riven screen (R)
- [ ] #26 Riven screen: leaving the riven screen hides the overlay and it does not reappear on its own later; look at `app-YYYY-MM-DD.log` for `[MEMORY WATCHER] dedupe:` lines (R)
- [ ] #27 Riven reroll: grading starts ONLY when you press the hotkey, once per press; pressing again re-grades; rolling or accepting does not start grading by itself; the new-roll window clears when a new roll appears and hides about 2 seconds after you accept (R)
- [ ] #17 Riven overlay appears when it should and stays until you leave the screen (R)
- [ ] #23 Relic mission with Sevagoth Prime: all reward cards are recognized (R)
- [ ] #28 The log no longer fills with `[FOCUS_WATCHER] transition: focused -> unfocused` every half second (R)
- [ ] #29 Dashboard calendar weekday and month names follow the app language; Farming Targets Target Inspector dropdown is not cut off and ranked places show the planet; farming drawer items show their images
- [ ] #30 Prime Sets tab: OWNED only on sets whose finished item you own (for example Nyx, Vauban, Garuda, Carrier Prime are NOT owned if only the blueprint is held)
- [ ] #31 Prime Sets tab: scrolling up and down is smooth and does not get slower; if it is still slow, record a 5 second Performance profile and send it (steps in the report, section 31)
- [ ] #32 Prime Sets tab: Aklex, Akvasto, Akbronco and Akmagnus Prime list their two base guns as well as the Link and Blueprint
- [ ] #15 Inventory scroll range: open developer tools, click one general inventory card and read its `offsetHeight` and the grid `row-gap`; send me both numbers (the fix waits for them)
- [ ] #21 / #30 overlay: if a relic reward card says OWNED wrongly or misses a blueprint count, send a screenshot with the item name (I could not reproduce either)

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
- [ ] Circuit translation for the other 13 locales (Farming Targets and all other missing strings for every language are tracked under #14)

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
