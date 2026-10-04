# Preview app checklist

Edit freely. Tick `[x]` only when you have SEEN it work in the live app. Allow 4-6s per screen before judging (screens render slowly). Numbers like #9 refer to `docs/RECURRING_ERRORS_REPORT.md`. Report anything wrong with a screenshot, the screen name and the app language, and I will trace it and add it to the error file.

**Order: easiest first.** Work top to bottom. Each step needs a bit more than the one before. This is an evolving list: new items are added to the step that fits their effort, confirmed items move to "Confirmed by you". Build details and the rollback copy are in the BUILD STATUS line of `docs/RECURRING_ERRORS_REPORT.md`. Everything below marked "fixed in code" is in the build deployed on 2026-10-03 at 20:40 (not in the 18:01 build you tested before). The 20:40 build adds #48, #51 to #55, #57 to #61 on top of everything from the 18:01 build; the new checks are in the "New findings" section below, each with what to look at.

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

## From your checks of the 18:01 build: all FIXED in the 20:40 build you have now (waiting for your in-app check)

- [ ] #51 Prime part drawers: Common/Uncommon/Rare tier per relic. FIXED, in your 20:40 build. Check: Nidus Prime and Nyx Prime show each part's real tier (Nidus Prime Chassis: Rare); also hover a part on a Prime Sets card and tell me if its tier looks wrong (that tooltip uses a different path)
- [ ] #52 Orokin Cell and other resource drawers: no bare "Mission" rows. FIXED, in your 20:40 build. Check: Orokin Cell and Alloy Plate show named nodes with rotation and chance, at most 40 rows, and a collapsed 'more places' group
- [ ] #53 Forma drawer. FIXED, in your 20:40 build. Check: Forma and Forma Blueprint show about 20 rows, a '565 relics' group, and clean Blueprint sentences with prices
- [ ] #54 Wiki text with template residue. FIXED, in your 20:40 build. Check: Alloy Plate has clean sentences, no 'Beginning in 9', no sentence with a missing price
- [ ] #55 Prime extractors shown twice with different information. ROUTES FIXED, in your 20:40 build. Check: Titan and Distilling Extractor Prime drawers (item and Blueprint) show the same routes. Your decision: they are still filed under two categories ('part' and 'prime_parts'); tell me whether that still looks like a duplicate
- [ ] #57 Acquisition text says how to get it NOW, no history or update numbers. FIXED for the extractor Primes, Alloy Plate, Forma and the wiki and resource tables, in your 20:40 build. Check: Titan and Distilling Extractor Prime drawers show only the current state; tell me any drawer that still shows history or an update number (the armor, cosmetic and other override tables are NOT covered yet: that is #63)
- [ ] #58 Rivens filters at a small width. FIXED, in your 20:40 build. Check: the funnel and sort icons sit next to their buttons, not on their own line
- [ ] #59 Farming Targets Vendor tab. FIXED, in your 20:40 build. Check: Farming Targets > Vendors lists several named vendors (107) with the items they sell, not one 'Vendor' row
- [ ] #60 Farming Targets: owned targets. FIXED (your decision: a target means 'N more'), in your 20:40 build. Check: pick a target you own; the Target Inspector lists its full requirements with owned parts marked; the 'Count the copies I already own' switch restores the old behaviour
- [ ] #61 Inventory End key. FIXED IN CODE, in your 20:40 build, but the cause was reasoned, not proven live. Check: press End on the general grid, Prime Sets and the list view, right after opening the tab and after maximizing; it should reach the true last row. If it still stops early, send the app log (it now records the target and final position)

## Open: NOT fixed, waiting for your go

- [ ] #56 Consistency across all drawers (your principle, 2026-10-03): proposal for one shared contract plus an audit test over every item; waiting for your go
- [ ] #62 Larger project, later: our own refresh of the game's language strings straight from Digital Extremes' servers (replaces the lagging community dictionary; the calendar names use the published strings for now). Planned, NOT started; see the report, section 62
- [ ] #63 Hand-written acquisition rows are broken in many drawers (found by the coordinator 2026-10-03, read-only, real data): 457 items show a number cut in half (Grimoire: "for 50" and "000 Standing" as two rows), 155 armor-bundle drawers say "purchaseable from the Market for ." with no price, 142 carry history or update wording, 89 have a row that only says "Blueprint:", 14 show names with underscores. Cause verified (route splitter cuts at the thousands comma; the earlier audit never covered these paths). NO fix started; proposal in the report, section 63, waiting for your go

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

- [ ] Which desktop side shows which riven card (code fixed 2026-10-03, commit 3e479918 'riven two-card desktop-side mapping, with real state tracking'; this needs a two-card reroll check by you)
- [ ] "ROATS OBLIVION" (found by the coordinator 2026-10-03: it is the Descendia boss row on the Dashboard, `ui.dashboard.roathe_oblivion` in `Dashboard.jsx:1204`, shown in capitals; what is wrong with it is still unknown: tell me what you expected)

Untouched:

- [ ] Drop-chance ordering (code done earlier: commit b1354d76 orders all drop-chance lists highest to lowest; relic reward overlay untouched; tick after you see it)
- [ ] Language-change bug
- [ ] Market tab riven filters
- [ ] #109 leftovers
- [ ] Mission-percentage gap (#131)
- [ ] Circuit translation for the other 13 locales (tracked under #16: blocked until an official source exists)

Open from the 2026-09-29 walkthrough:

- [ ] Navigation lag of 4-6s per screen (profile before guessing a cause)
- [ ] Dead `.is-overlay` CSS rule at `src/index.css:309` (checked 2026-10-03: NOT dead; `index.html` adds the class for overlay windows and both rules use it; nothing to do, tick if you agree)
- [ ] Cosmetics "MISSING" pill: confirm it means "not owned" (checked in code 2026-10-03: `Cosmetics.jsx:175` shows Owned when you own it, otherwise Missing, so it means not owned; tick if you agree)
- [ ] Commit the Tauri dependency updates and `preview:deploy` script (verified 2026-10-03: already committed in `56796f00`, nothing uncommitted; tick if you agree)

Known-good items to re-check after data changes (search Inventory for each):

- [ ] Narin: Warframe + Blueprint, Chassis, Neuroptics, Systems (coordinator real-data check 2026-10-03: the Narin Warframe drawer lists 11 sources, Zariman Void Flood/Cascade rows; the blueprint parts are not separate catalog names, so the drawer check is yours)
- [ ] Citrine Prime: Warframe + 3 Prime parts (coordinator real-data check 2026-10-03: the Warframe lists its 4 relics Axi C12, Lith S19, Neo C11, Meso C11)
- [ ] Grimoire + Grimoire Blueprint (coordinator real-data check 2026-10-03: BROKEN, rows "for 50" / "000 Standing." / "Blueprint:"; see #63)

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
