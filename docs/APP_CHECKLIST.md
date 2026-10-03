# Preview app checklist

Edit freely. Tick `[x]` only when you have SEEN it work in the live app. Allow 4-6s per screen before judging (screens render slowly). Numbers like #9 refer to `docs/RECURRING_ERRORS_REPORT.md`. Report anything wrong with a screenshot, the screen name and the app language, and I will trace it and add it to the error file.

**Order: easiest first.** Work top to bottom. Each step needs a bit more than the one before. This is an evolving list: new items are added to the step that fits their effort, confirmed items move to "Confirmed by you". Build details and the rollback copy are in the BUILD STATUS line of `docs/RECURRING_ERRORS_REPORT.md`.

## Step 1 - Quick looks (under a minute each, no game needed, English is fine)

- [ ] #13 Inventory: search "Titan Extractor" and "Distilling Extractor": the Prime Set card and its Blueprint show real artwork, not IMAGE UNAVAILABLE
- [ ] #32 Prime Sets tab: Aklex Prime, Akvasto Prime, Akbronco Prime and Akmagnus Prime list their two base guns (for example Lex Prime) as well as the Link and Blueprint
- [ ] #30 Prime Sets tab: OWNED appears only on sets whose finished item you own. Nyx, Vauban, Garuda, Carrier, Limbo, Nidus and Akbolto Prime must NOT say OWNED if you only hold the blueprint or parts (the completion ring "1/2 (50%)" still shows held parts)
- [ ] #11 Salvage drawer: no ship-decoration paragraph; Conclave drops are listed AND the wiki lines (Market: 30 Platinum for 3000 Salvage; Carme Mobile Defense and Olympus Disruption farming notes)
- [ ] #10 Voidgel Orb drawer: the sources listed match the summary; no "+N more sources" text without matching rows (spot-check two other items)
- [ ] #8 REOPENED 2026-10-03: your check found it is not fixed. The Orokin Cell drawer's "1x Blueprint" row shows the resource's enemy-drop text; it should be the 100 Platinum Market purchase. Cause found, NO fix started; goes with #36 and #38. The Forma Blueprint and Prime part drawers part of this check still stands [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #9 REOPENED 2026-10-03 for Warframe drawers: Ash Prime Neuroptics still lists (Radiant)/(Flawless) rows with percentages. Cause partly found, NO fix started. The part-drawer checks for Citrine Prime Blueprint and Acceltra Prime below still stand. Original text: Prime part drawers (Ash Prime Chassis, Citrine Prime Blueprint, Acceltra Prime): each relic appears once with (Common/Uncommon/Rare), no Intact/Exceptional/Flawless/Radiant rows, no percentages, no raw key like `ui.relic_rarity.rare`. Check BOTH the top "How to obtain" list AND the "Crafting requirements" part rows [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #18 Settings > Hotkeys: the Riven action reads "Grade Rivens", not `settings.hotkey_action_grade_rivens`
- [ ] #18 REOPENED 2026-10-03: the Riven hotkey label "Grade Rivens" is still English when the app is not in English. Found: German is untranslated (the other 13 are done), and the tests accepted it. Tell me which language you saw it in. NO fix started; part of the wider English-text audit (see the report, section 18 addendum)
- [ ] Window under 1050px wide: collapsed sidebar rail scrollbar OK

## Step 2 - Switch the app language (about 5 minutes)

- [ ] #14 German: Farming Targets (all 78 strings), Foundry, Prime Sets, Riven prompt text and relic tier labels are fully translated; nothing left in English except game names and "The Circuit" (no official localized name exists, so it stays English everywhere)
- [ ] #14 Japanese, then one more language of your choice: the same screens read natively; no raw keys
- [ ] #18 Market label in the sidebar is translated in French, Korean, Italian, Japanese, Polish, Traditional Chinese, Thai, Turkish and Ukrainian (a translation was nearly lost in one fix and restored)
- [ ] #29 In German: the Dashboard calendar weekday and month names are German; Farming Targets > Target Inspector: the dropdown opens fully (not cut off) and ranked places show the planet with the place; farming drawer items show their images

## Step 3 - A little scrolling and clicking (about 5 minutes)

- [ ] #31 Prime Sets tab: scroll down and then UP quickly; it should feel smooth and not get slower over time. If it is still slow, record a 5 second Performance profile and send it (steps in the report, section 31)
- [ ] Old items now merged into the ones above, re-check once: "Target Inspector dropdown clipping", "Farm Next planet + node display", "Calendar weekday locale" (all covered by #29)

## Step 4 - Needs Warframe running

- [ ] #24 Start the scanner (launch the game) with the app in a non-English language: the "scanner hooked" toast shows real text, not `app.scanner_title`
- [ ] #28 After a session with the game open, the log (`~/.local/share/kiedas-orbiter-preview/data/user/logs/app-YYYY-MM-DD.log`) does not fill with `[FOCUS_WATCHER] transition: focused -> unfocused` every half second (R)
- [ ] #17 / #25 / #26 Riven reroll screen: the grading banner appears and STAYS visible after you press the hotkey, and disappears only when you leave the riven screen; leaving the screen hides everything and nothing reappears on its own later; look in the log for `[MEMORY WATCHER] dedupe:` lines (R)
- [ ] #27 Riven reroll: grading starts ONLY when you press the hotkey, once per press; pressing again re-grades the same roll; rolling a new card or accepting does NOT start grading by itself; the new-roll window clears when a new roll appears and hides about 2 seconds after you accept (R)
- [ ] #23 Relic mission (Citrine/Sevagoth Prime or any relic): all reward cards are recognized, none say UNRECOGNIZED (R)
- [ ] Riven single-card grading (one card only, before any reroll)

## Step 5 - Needs measuring or sending me something

- [ ] #15 Inventory scroll range: open developer tools, click one general inventory card and read its `offsetHeight` and the grid `row-gap`; send me both numbers (the fix waits for them). Also say which tab shows the empty space
- [ ] #21 / #30 overlay: if a relic reward card says OWNED wrongly or misses a blueprint count, send a screenshot with the item name (I could not reproduce either)

## Confirmed by you (kept for the record)

- [x] #12 Foundry: open a recipe panel, click outside it, it closes; Escape closes it; the close button still works; clicking inside the panel does not close it (confirmed by the user 2026-10-02, build 63121682)
- [x] Farming target images (drawer + ledger, blueprints and raw resources)
- [x] Citrine Prime relics: Relics tab, Relic Planner, Relics screen, Inventory
- [x] Double scrollbar gone: Inventory, Rivens, Relics, Market, Relic Planner, Dashboard live activities, sidebar, Notes tab strip
- [x] Scrollbars (8px) are grabbable by mouse and not big or white

## Blocked or waiting on something other than a check

- [ ] #16 "The Circuit" translation: BLOCKED. No official localized name exists in the repo data or on wiki.warframe.com; the title stays "The Circuit" in every language until an official source is found
- [ ] #33 Inventory currency strip vertical scrollbar (reported 2026-10-03; this replaces the old backlog line "Currency scrollbar"): cause found, fix drafted on a branch, NOT merged or deployed. When it is deployed it becomes a Step 1 check: the top strip has no vertical scrollbar and hovering Forma still shows the breakdown [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #34 Extractors (reported 2026-10-03): Titan Extractor, Titan Extractor Prime, Distilling Extractor and Distilling Extractor Prime are missing from the Inventory (you own a Distilling Extractor and it does not show), and the Prime extractors' "how to obtain" text does not match the wiki. Cause found, NO fix started; waiting for your go-ahead
- [ ] #35 Prime Sets part labels (reported 2026-10-03): Paris, Ballistica, Cernos and Daikyu Prime show two cards both labelled "Limb" (Upper/Lower Limb), and Akbronco, Aklex, Akmagnus and Akvasto Prime show a card labelled only "Prime". Cause found, NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #36 Drawer "Crafting requirements" has no Blueprint row for 92 of 166 Prime items (for example Akarius Prime), although the Prime Sets card lists the Blueprint. Cause found, NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #37 The "x2" badge on Prime Sets part cells (reported 2026-10-03): decision made, it goes centered directly above the image of the needed piece. NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #38 Resource drawers (reported 2026-10-03): Alloy Plate lists only some mission drops and none of the planet/container sources the wiki gives; most common resources have no wiki entry in the app data. Cause partly found, NO fix started; needs your decision on a manual wiki-verified overhaul Decision 2026-10-03: manual wiki.warframe.com-verified data for ALL resources, scheduled after the Prime Sets work
- [ ] #39 Prime Warframe drawers (reported 2026-10-03): say the Prime Blueprint costs credits in the Market ("Market Blueprint: 25,000 Credits" on Ash Prime). Cause found on real data (DE marks those blueprints excludeFromMarket), NO fix started; goes with #36, #8 and #9 [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #40 Market under 1050px wide: the Active Orders / Tradeable Stock tab row is cut off at the top (reported 2026-10-03). Probable cause found, NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #41 Rivens page: horizontal scrollbars on the filters (state, sort, weapon type) that cannot be grabbed, plus one under the cards (reported 2026-10-03). Filters found, cards need a screenshot or dev-tools element. Decision: only the Inventory currency strip keeps a horizontal scrollbar. NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build] (the card-area scrollbar was not located; tell me if it is still there)
- [ ] #42 History crash "Can't find variable: locale" when hovering the chart, and the crash screen shows raw `ERROR_BOUNDARY.*` text (reported 2026-10-03). Both causes verified, NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: check it after the next build]
- [ ] #43 Wiki tab blank after that crash; only restarting the app fixed it (reported 2026-10-03). Not understood. If it happens again, send me the log file before restarting
- [ ] #19, #20, #22 (relic picker translations, relic planner names in German, picker layout): fixed in an earlier snapshot, never confirmed in the app. Check them during Step 2 and Step 4 when you are on those screens

## Backlog (not part of the 22:41 build; kept from earlier lists)

Known, root-caused, not fixed:

- [ ] Which desktop side shows which riven card
- [ ] "ROATS OBLIVION" (find which widget it is under)

Untouched:

- [ ] Drop-chance ordering
- [ ] Language-change bug
- [ ] Market tab riven filters
- [ ] #109 leftovers
- [ ] Mission-percentage gap (#131)
- [ ] Circuit translation for the other 13 locales (tracked under #16: blocked until an official source exists)

Open from the 2026-09-29 walkthrough:

- [ ] Navigation lag of 4-6s per screen (profile before guessing a cause)
- [ ] Dead `.is-overlay` CSS rule at `src/index.css:309`
- [ ] Cosmetics "MISSING" pill: confirm it means "not owned"
- [ ] Commit the Tauri dependency updates and `preview:deploy` script (verified 2026-10-03: already committed in `56796f00`, nothing uncommitted; tick if you agree)

Known-good items to re-check after data changes (search Inventory for each):

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
