# Preview app checklist

Edit freely. Tick `[x]` only when you have SEEN it work in the live app. Allow 4-6s per screen before judging (screens render slowly). Numbers like #9 refer to `docs/RECURRING_ERRORS_REPORT.md`. Report anything wrong with a screenshot, the screen name and the app language, and I will trace it and add it to the error file.

**Order: easiest first.** Work top to bottom. Each step needs a bit more than the one before. This is an evolving list: new items are added to the step that fits their effort, confirmed items move to "Confirmed by you". Build details and the rollback copy are in the BUILD STATUS line of `docs/RECURRING_ERRORS_REPORT.md`. Everything below marked "fixed in code" is in the build deployed on 2026-10-03 at 18:01 (not in build 795d0a7, which you tested before). Items #49 and #50 were added after the 16:57 build and are only in the 18:01 build.

## Step 1 - Quick looks (under a minute each, no game needed, English is fine)

- [ ] #8 Orokin Cell drawer: the Blueprint row says it is a Market purchase for 100 Platinum, not the enemy-drop text; Forma Blueprint and Prime part drawers still list their drops
- [ ] #38 Resource drawers: Alloy Plate lists all 10 mission rows and the line "found on Venus, Jupiter, Sedna, Ceres, Phobos, Pluto and the Zariman Ten Zero"; spot-check two or three other resources (Ferrite, Nano Spores, Plastids)
- [ ] #34 Inventory: search "Extractor": four entries (Titan, Titan Prime, Distilling, Distilling Prime), the Distilling Extractor marked owned, each with an image; the two Prime extractor drawers list several wiki source rows

## Step 2 - Switch the app language (about 5 minutes)

- [ ] #14 / #18 German: Farming Targets, Foundry, Prime Sets, Riven prompt text, relic tier labels, and Settings > Hotkeys "Rivens bewerten" are German; nothing left in English except game names and "The Circuit" (no official localized name exists, so it stays English everywhere)
- [ ] #14 / #18 Japanese, then one more language of your choice (all 14 languages had an English-text audit): the same screens read natively; no raw keys
- [ ] #18 Market label in the sidebar is translated in French, Korean, Italian, Japanese, Polish, Traditional Chinese, Thai, Turkish and Ukrainian
- [ ] #29 In German: the Dashboard calendar weekday and month names are German; farming drawer items show their images (the Target Inspector dropdown and clipping you already confirmed)
- [ ] #42 With the app in a non-English language the crash screen (if you ever see it) shows real text, not `ERROR_BOUNDARY.TITLE`

## Step 3 - A little scrolling and clicking (about 5 minutes)

- [ ] #45 After using the app for a while open the log and search for `parseInventory worker call failed`: it should be gone; tell me if the Inventory ever looks empty or stale after starting

## Step 4 - Needs Warframe running

- [ ] #44 / #23 Relic mission with duplicate rewards (two of the same item): every card is recognized, none say UNRECOGNIZED (the Yareli Prime Chassis and Akbronco cases) (R)

## Step 5 - Needs you to send me something

- [ ] #21 / #30 overlay: if a relic reward card says OWNED wrongly or misses a blueprint count, send a screenshot with the item name (I could not reproduce either)
- [ ] #48 1999 Calendar upgrade names (reported 2026-10-03): the app shows path-derived English text; the real names are the Hex Boosts (Bottled Lightning = "Abgefüllter Blitz", Thick Skin = "Dicke Haut", Toxic Shot, ...). Your German screenshot and the official wiki settled it; fix proposed (verified name file, English wiki name when no German text is verified yet, type label "Hex Boost" / "Hex-Boost Modifikator"), NOT started. Each other upgrade's German name needs one screenshot from you when you see it [FIXED IN CODE 2026-10-03, merged, not in a build yet: after the next build, in German open the 1999 calendar on the Dashboard: upgrade names are the game's (Abgefüllter Blitz, Dicke Haut, ...), with their description and the type 'Hex-Boost Modifikator'. Tell me if a Hex Factor is labelled as a Boost]

## New findings from your checks of the 18:01 build (not fixed yet; waiting for your go)

- [ ] #51 Prime part drawers show wrong Common/Uncommon/Rare tiers (Nidus Prime all Uncommon, Nyx Prime wrong) (reported 2026-10-03, build 18:01). Cause verified on real data (lookup key mismatch, then an unreliable bundled label), NO fix started [IN PROGRESS 2026-10-03 20:13: Codex job P19 is writing the fix; it will be in the next build, not the 18:01 one]
- [ ] #52 Orokin Cell (and other resource) drawers: hundreds of rows that just say "Mission" (reported 2026-10-03; regression from the resource job). Cause partly verified, NO fix started [IN PROGRESS 2026-10-03 20:13: Codex job P19 is writing the fix; it will be in the next build, not the 18:01 one]
- [ ] #53 Forma drawer: 4,593 other sources, a wall of wiki text with missing prices in the Blueprint row (reported 2026-10-03). Measured, NO fix started [TEXT FIXED IN CODE 2026-10-03, merged, not in a build yet; the relic-row count (565 relics, 4,593 rows) is still being fixed by job P19]
- [ ] #54 Wiki text with unresolved templates, e.g. Alloy Plate "Beginning in 9 materials could be purchased ... for Platinum." (reported 2026-10-03). Cause verified, NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: after the next build open Alloy Plate: clean sentences, no 'Beginning in 9', no sentence with a missing price]
- [ ] #55 Prime extractors appear twice with different information (item as a part, Blueprint as a prime part) (reported 2026-10-03). Verified on real data, NO fix started [IN PROGRESS 2026-10-03 20:13: Codex job P19 is writing the fix; it will be in the next build, not the 18:01 one]
- [ ] #56 Consistency across all drawers (your principle, 2026-10-03): proposal for one shared contract plus an audit test over every item; waiting for your go
- [ ] #57 Acquisition text must say how to get the item NOW, never its history or update numbers (your rule, 2026-10-03). Applies to the extractor Primes, Alloy Plate, Forma and every wiki-derived entry. NO work started; part of the consistency plan (#56) [FIXED IN CODE 2026-10-03, merged, not in a build yet: after the next build open the Titan and Distilling Extractor Prime drawers: only the current state, no dates, no 'originally'; tell me any drawer that still shows history or an update number]
- [ ] #58 Rivens filters at a small width: the funnel and sort icons sit alone on their own line, the buttons wrap below (reported 2026-10-03, from the #41 change). Cause verified, NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: after the next build check the Rivens page at a small width: the funnel and sort icons sit next to their buttons, not on their own line]
- [ ] #59 Farming Targets: the Vendor tab shows nothing; the place list builds only one generic "Vendor" place because the wiki vendor list holds names, not objects (reported 2026-10-03). Verified on real data, NO fix started [FIXED IN CODE 2026-10-03, merged, not in a build yet: after the next build open Farming Targets > Vendors: several named vendors with the items they sell, not one 'Vendor' row. Items that were at a vendor in the drawer now appear there]
- [ ] #60 Farming Targets (reported 2026-10-03): a target you already own shows nothing and no build requirements. DECIDED by you: a target means "I want N more", owned targets stay farmable and the Target Inspector always lists the full requirements (owned parts ticked), with a per-target switch to count your owned copies. [IN PROGRESS: Codex job P21 starts when the Vendor job P17 finishes; it will be in the next build]
- [ ] #61 Inventory: End goes to the end of the rendered part, not the end of the whole list (reported 2026-10-03). Cause not verified, NO fix started (needs a reproduction approach, see the report) [FIXED IN CODE 2026-10-03, merged, not in a build yet; needs your live check after the next build: press End on the general grid, on Prime Sets and in the list view, right after opening the tab and after maximizing; it should reach the true last row. If it still stops early, send the app log: it now records the target and the final position]
- [ ] #62 Larger project, later: our own refresh of the game's language strings straight from Digital Extremes' servers (replaces the lagging community dictionary; the calendar names use the published strings for now). Planned, NOT started; see the report, section 62

## Confirmed by you (kept for the record)

- [x] #12 Foundry: open a recipe panel, click outside it, it closes; Escape closes it; the close button still works; clicking inside the panel does not close it (confirmed by the user 2026-10-02, build 63121682)
- [x] Farming target images (drawer + ledger, blueprints and raw resources)
- [x] Citrine Prime relics: Relics tab, Relic Planner, Relics screen, Inventory
- [x] Double scrollbar gone: Inventory, Rivens, Relics, Market, Relic Planner, Dashboard live activities, sidebar, Notes tab strip
- [x] Scrollbars (8px) are grabbable by mouse and not big or white
- [x] #13 Inventory: search "Titan Extractor" and "Distilling Extractor": the Prime Set card and its Blueprint show real artwork, not IMAGE UNAVAILABLE (confirmed by you 2026-10-03, build 795d0a7)
- [x] #30 Prime Sets tab: OWNED appears only on sets whose finished item you own. Nyx, Vauban, Garuda, Carrier, Limbo, Nidus and Akbolto Prime must NOT say OWNED if you only hold the blueprint or parts (the completion ring "1/2 (50%)" still shows held parts) (confirmed by you 2026-10-03, build 795d0a7)
- [x] #11 Salvage drawer: no ship-decoration paragraph; Conclave drops are listed AND the wiki lines (Market: 30 Platinum for 3000 Salvage; Carme Mobile Defense and Olympus Disruption farming notes) (confirmed by you 2026-10-03, build 795d0a7)
- [x] #10 Voidgel Orb drawer: the sources listed match the summary; no "+N more sources" text without matching rows (spot-check two other items) (confirmed by you 2026-10-03, build 795d0a7)
- [x] #18 Settings > Hotkeys: the Riven action reads "Grade Rivens", not `settings.hotkey_action_grade_rivens` (confirmed by you 2026-10-03, build 795d0a7)
- [x] Window under 1050px wide: collapsed sidebar rail scrollbar OK (confirmed by you 2026-10-03, build 795d0a7)
- [x] #24 Start the scanner (launch the game) with the app in a non-English language: the "scanner hooked" toast shows real text, not `app.scanner_title` (confirmed by you 2026-10-03, build 795d0a7)
- [x] #17 / #25 / #26 Riven reroll screen: the grading banner appears and STAYS visible after you press the hotkey, and disappears only when you leave the riven screen; leaving the screen hides everything and nothing reappears on its own later; look in the log for `[MEMORY WATCHER] dedupe:` lines (R) (confirmed by you 2026-10-03, build 795d0a7)
- [x] #27 Riven reroll: grading starts ONLY when you press the hotkey, once per press; pressing again re-grades the same roll; rolling a new card or accepting does NOT start grading by itself; the new-roll window clears when a new roll appears and hides about 2 seconds after you accept (R) (confirmed by you 2026-10-03, build 795d0a7)
- [x] Riven single-card grading (one card only, before any reroll) (confirmed by you 2026-10-03, build 795d0a7)
- [x] #15 measurement step in the developer tools (done by you 2026-10-03; it is replaced by the live check in Step 3, item #46 / #15)
- [x] #35 / #37 / #32 Prime Sets tab: Paris, Ballistica, Cernos, Daikyu Prime show "Upper Limb" and "Lower Limb" (not two "Limb"); Akbronco, Aklex, Akmagnus, Akvasto Prime show their two base guns with real names (for example "Lex Prime", not "Prime") plus Link and Blueprint; the "x2" badge sits centered directly above the part's image (confirmed by you 2026-10-03, build 18:01)
- [x] #49 Prime Sets at a medium window width: the last part cell of a 5-part set (the String of Paris Prime) is cut off by the card (reported 2026-10-03 in the 16:57 build). Cause probable (the parts columns cannot shrink below about 80px), NO fix started [FIXED IN CODE 2026-10-03 after the 16:57 build, merged, not in a build yet: after the next build check Paris Prime at small, medium and full-screen widths; all five parts visible, nothing cut off] (confirmed by you 2026-10-03, build 18:01)
- [x] #50 Ash drawer (reported 2026-10-03): "Where to start" shows only "Market for 375 Platinum"; the credits price (35,000) and Simaris appear only in the Blueprint row further down. Cause verified, NO fix started [Addendum 17:08: the part "Ash Blueprint" shows 0 sources; 35 of 71 main Warframe blueprints do, measured on your real data] [FIXED IN CODE 2026-10-03 after the 16:57 build, merged, not in a build yet: after the next build open Ash (Warframe) and Ash Blueprint (part): both list Market for 375 Platinum, Market for 35,000 Credits and Simaris; spot-check Excalibur, Mag, Volt and two weapons' blueprint parts: none says '0 sources'] (confirmed by you 2026-10-03, build 18:01)
- [x] #36 / #39 Prime drawers (Akarius Prime, Ash Prime, Citrine Prime): "Crafting requirements" has a "1x ... Blueprint" row listing its relics once each with (Common/Uncommon/Rare); Ash Prime no longer says "Market Blueprint: 25,000 Credits" (confirmed by you 2026-10-03, build 18:01)
- [x] #9 Ash Prime Neuroptics / Chassis / Systems rows and Citrine Prime Blueprint, Acceltra Prime: each relic once with its tier, no Intact/Exceptional/Flawless/Radiant, no percentages, no raw key like `ui.relic_rarity.rare` (confirmed by you 2026-10-03, build 18:01)
- [x] #33 Inventory top strip: no vertical scrollbar; hovering Forma still shows the breakdown (Forma, Aura, Stance, Umbra) (confirmed by you 2026-10-03, build 18:01)
- [x] #41 Rivens page: the state, sort and weapon-type filters wrap onto more lines and have NO horizontal scrollbar; tell me if a scrollbar is still under the cards (confirmed by you 2026-10-03, build 18:01)
- [x] #40 Market page with the window under 1050px wide: the "Active Orders" and "Tradeable Stock" tabs are fully visible (confirmed by you 2026-10-03, build 18:01)
- [x] #42 History: hover over the chart points; the screen no longer crashes (confirmed by you 2026-10-03, build 18:01)
- [x] #47 Farming Targets: turn on "Group by planet": each planet appears once with "N nodes" and its nodes underneath; off, nothing changes (confirmed by you 2026-10-03, build 18:01)
- [x] #31 Prime Sets tab scrolling smoothness (closed by you 2026-10-03: no practical way to test it, no profile was taken)
- [x] #46 / #15 Inventory list: click in the list and press End, Home, Page Down, Page Up (they scroll; typing in the search box still works); scroll down and maximize the window (the list stays where it was); scroll to the very end of a tab (the last row fully visible, nothing blank under it, a small one-time shift when the first row is measured is expected) (confirmed by you 2026-10-03, build 18:01; End still stops early: #61)
- [x] #28 After a session with the game open, the log does not fill with `[FOCUS_WATCHER] transition` lines every half second (coordinator count 2026-10-03: 26 in 1.5 hours with the old build 795d0a7, versus 459 in a day before; your call to tick) (confirmed by you 2026-10-03, build 18:01)
- [x] #43 Wiki tab blank after a crash (closed by you 2026-10-03: not seen again; reopen and send the log if it happens again)

## Blocked or waiting on something other than a check

- [ ] #16 "The Circuit" translation: BLOCKED. No official localized name exists in the repo data or on wiki.warframe.com; the title stays "The Circuit" in every language until an official source is found
- [ ] #19, #20, #22 (relic picker translations, relic planner names in German, picker layout): fixed in an earlier snapshot, never confirmed in the app. Check them during Step 2 and Step 4 when you are on those screens
- [ ] Other owned items the Inventory parser does not read yet (Focus upgrades, Boosters, Email items, Railjack salvage and more; the list is in the report under item 34): tell me which of them you want shown

## Backlog (kept from earlier lists)

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
