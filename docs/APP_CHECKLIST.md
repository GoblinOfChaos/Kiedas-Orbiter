# Preview app checklist

Edit freely. Tick `[x]` only when you have SEEN it work in the live app. Allow 4-6s per screen before judging (screens render slowly). Numbers like #9 refer to `docs/RECURRING_ERRORS_REPORT.md`. Report anything wrong with a screenshot, the screen name and the app language, and I will trace it and add it to the error file.

**Order: easiest first.** Work top to bottom. Each step needs a bit more than the one before. This is an evolving list: new items are added to the step that fits their effort, confirmed items move to "Confirmed by you". Build details and the rollback copy are in the BUILD STATUS line of `docs/RECURRING_ERRORS_REPORT.md`. UPDATE 22:41 (2026-10-04): the newest build has the acquisition rebuild, the End key fix, Atlas mastery and the missing images (rollback `.bak-2241` is the 14:03 build, the last good one before the rebuild). UPDATE 14:03 (2026-10-04): the newest build fixes the screen-change crash (#70); rollbacks: `.bak-1403` (13:15, crashes on screen change), `.bak-1315` (12:50, freezes), `.bak-1250` (22:48, freezes); the last good build (21:48) was deleted. UPDATE 13:15 (2026-10-04): the newest build adds #66 to #69 and the freeze fix (rollback `.bak-1315` is the 12:50 build, which freezes; `.bak-2248` is the last one without the Vendors tab). UPDATE 22:48: the newest build adds #64 and #65 (rollback `.bak-2248` is the 21:48 build). UPDATE 21:48: a newer build is deployed (adds #63, the Railjack/Drifter Inventory items, the tooltip tiers of #51; rollback `.bak-2148` is the 20:40 build). Everything below marked "fixed in code" is in the build deployed on 2026-10-03 at 21:48 (or the 20:40 build before it) (not in the 18:01 build you tested before). The 20:40 build adds #48, #51 to #55, #57 to #61 on top of everything from the 18:01 build; the new checks are in the "New findings" section below, each with what to look at.

## Step 1 - Quick looks (under a minute each, no game needed, English is fine)

- [ ] #89 The Blueprint box in the acquisition drawer looks the same for EVERY item (your decision: the closer the boxes look, the better). FIXED, in your 15:27 build (2026-10-06). Check: open Korumm: heading "1x Korumm Blueprint", then the Market line and four bounty rows (Cetus and Orb Vallis, Rare, 7.5% and 5.45%); Quartakk and Stubba: Market line, the Ghoul drops and the Ghoul bounty rows; Atlas, Chroma and Gara (Warframes) and Nikana, Soma: the same box style; Braton Prime: the same box, but its 46 relic rows are now ONE expandable line ("46 sources, Common / Uncommon") that opens to each relic with its tier. That collapsed line is the only visible change for Prime items: tell me if you want the relic rows open by default. Tell me any item whose box looks different from the others.

- [ ] #79 Items that showed NOTHING now have a wiki-sourced route, each with its wiki page and an exact quote behind it. FIXED, in your 11:38 build (2026-10-06). Check: Relics: Axi A2, Axi A5, Axi V8, Axi M5, Neo O1 and Axi A8 say "Sold by Baro Ki'Teer" on the main card; Brood's Oversurge (Cephalon Suda or New Loka rank, 25,000 Standing), Lua Unairu Lens (Lua Disruption), Moonflesh (Operation: Taubound) and Primed Charged Chamber (Baro) each show a source. The 71 COSMETIC routes that were also in that build are removed in your 15:27 build (your decision: no cosmetics); tell me any route that reads wrong or out of date, rotating-event items are the likeliest.
- [ ] #78 Wiki bounty notes stay on their own row. FIXED, in your 11:38 build (2026-10-06). Check: Neurodes and Orokin Cell have no row that is only "Talk to Eudico", "Talk to Konzu" or "Must complete ..."; the note sits in brackets at the end of its bounty row, next to the chance.
- [ ] #77 Drops now come from Digital Extremes' own drop-table page (warframe.com/droptables); the old community copy is kept only for Syndicate/Simaris offerings. FIXED, in your 11:38 build (2026-10-06). Check: Serration and Vitality list many places with chances; rarity words may now read "Ultra Rare" or "Very Common" (DE's own words); Ambush, Looter and Negate still say Cephalon Simaris and NOT "100% Common drop"; a Cetus or Fortuna bounty reward shows its rotation and stage; Axi A1 lists Braton Prime Stock as Common (DE's drop page calls it Uncommon, the relic data says Common, the app uses the relic data). The first launch downloads DE's page: if drops look unchanged, close and reopen once.

## Step 2 - Switch the app language (about 5 minutes)

- [x] #14 / #18 German: Farming Targets, Foundry, Prime Sets, Riven prompt text, relic tier labels, and Settings > Hotkeys "Rivens bewerten" are German; nothing left in English except game names and "The Circuit" (no official localized name exists, so it stays English everywhere)
- [x] #14 / #18 Japanese, then one more language of your choice (all 14 languages had an English-text audit): the same screens read natively; no raw keys
- [x] #18 Market label in the sidebar is translated in French, Korean, Italian, Japanese, Polish, Traditional Chinese, Thai, Turkish and Ukrainian
- [x] #29 In German: the Dashboard calendar weekday and month names are German; farming drawer items show their images (the Target Inspector dropdown and clipping you already confirmed)
- [x] #42 With the app in a non-English language the crash screen (if you ever see it) shows real text, not `ERROR_BOUNDARY.TITLE`

## Step 3 - A little scrolling and clicking (about 5 minutes)

- [ ] #45 After using the app for a while open the log and search for `parseInventory worker call failed`: it should be gone; tell me if the Inventory ever looks empty or stale after starting

## Step 4 - Needs Warframe running

- [ ] #44 / #23 Relic mission with duplicate rewards (two of the same item): every card is recognized, none say UNRECOGNIZED (the Yareli Prime Chassis and Akbronco cases) (R)

## Step 5 - Needs you to send me something

- [ ] #21 / #30 overlay: if a relic reward card says OWNED wrongly or misses a blueprint count, send a screenshot with the item name (I could not reproduce either)
- [x] #48 1999 Calendar upgrade names (reported 2026-10-03; the app showed path text like 'Electric Status Damage And Chance'). FIXED, in your 20:40 and 21:48 builds. Check in German: open the 1999 calendar on the Dashboard; upgrades show the game's names (Abgefüllter Blitz, Dicke Haut, ...) with their description and the type 'Hex-Boost Modifikator'. Tell me if a Hex Factor is labelled as a Boost (the real worldstate has no field to tell them apart, so every upgrade uses the Boost label). Each other upgrade's German name is taken from the game's published strings

## From your checks of the 18:01 build: all FIXED in the builds you have now, 20:40 and 21:48 (waiting for your in-app check)

- [ ] #51 Prime part drawers: Common/Uncommon/Rare tier per relic. FIXED, in your 20:40 build. Check: Nidus Prime and Nyx Prime show each part's real tier (Nidus Prime Chassis: Rare); also hover a part on a Prime Sets card (Sources) and an item's Drop sources: the tiers now match the drawer and are in your language (in your 21:48 build)
- [ ] #52 Orokin Cell and other resource drawers: no bare "Mission" rows. FIXED, in your 20:40 build. Check: Orokin Cell and Alloy Plate show named nodes with rotation and chance, at most 40 rows, and a collapsed 'more places' group
- [ ] #53 Forma drawer (reopened 2026-10-04: one run-on paragraph, repeated again under 'Other acquisition sources'). FIXED in the acquisition rebuild, in your 22:41 build. Check: Forma and Forma Blueprint list one route per row (Acrithis for Pathos Clamps, Market for 20 Platinum, the three-Forma bundle for 35 Platinum, Teshin, relic drops) with no repeated paragraph and no text run together
- [x] #54 Wiki text with template residue. FIXED, in your 20:40 build. Check: Alloy Plate has clean sentences, no 'Beginning in 9', no sentence with a missing price
- [x] #55 Prime extractors shown twice with different information. ROUTES FIXED, in your 20:40 build. DECIDED by you 2026-10-03: they do NOT need to share a category; they behave like every other Prime: the whole item and its Blueprint are separate entries (already the case on your real data: 'Titan Extractor Prime' as the item, 'Titan Extractor Prime Blueprint' as the part, like Ash Prime and Ash Prime Blueprint). Check: Titan and Distilling Extractor Prime drawers (item and Blueprint) show the same current-state text
- [ ] #57 Acquisition text says how to get it NOW, no history or update numbers. FIXED for the extractor Primes, Alloy Plate, Forma and the wiki and resource tables, in your 20:40 build. Check: Titan and Distilling Extractor Prime drawers show only the current state; tell me any drawer that still shows history or an update number (the armor, cosmetic and other override tables are NOT covered yet: that is #63)
- [x] #58 Rivens filters at a small width. FIXED, in your 20:40 build. Check: the funnel and sort icons sit next to their buttons, not on their own line
- [x] #59 Farming Targets Vendor tab. FIXED, in your 20:40 build. Check: Farming Targets > Vendors lists several named vendors (107) with the items they sell, not one 'Vendor' row
- [x] #60 Farming Targets: owned targets. FIXED (your decision: a target means 'N more'), in your 20:40 build. Check: pick a target you own; the Target Inspector lists its full requirements with owned parts marked; the 'Count the copies I already own' switch restores the old behaviour
- [ ] #61 Inventory End key stops early (reported 2026-10-03, REOPENED 2026-10-04; the app log proved the cause: the list's container was squeezed by the layout, so the page was about 6,800 px high while End asked for 349,000). FIXED IN CODE, in your 22:41 build. Check: open Inventory (general grid, Prime Sets, Parts, list view), press End, Home, Page Down, Page Up, also after maximizing and after a filter: End must reach the true last row. If it still stops early the log (`inventory.scroll.key_jump`) records the model height next to the real height; tell me the time

## Open: NOT fixed, waiting for your go

- [ ] #56 Consistency across all drawers (your principle, 2026-10-03): FIRST VERSION DONE (a whole-catalog audit test over every item's rows, 0 violations; see #63). The full contract (one assembler for every path) is not built; say go if you want it
- [ ] #64 Dashboard in other languages: node names, factions, reward words (reported 2026-10-03, Korean screenshot, build 21:48). FIXED, in your 22:48 build. Check: in Korean the Steel Path Incursions and Invasions cards show place names ('Gradivus, 화성', 'Naga, 세드나'), not SolNode/ClanNode ids; reward items are Korean ('데토나이트 인젝터', '필드론') with 'Blueprint' as the game's word; look at German and Japanese too. Tell me which factions (Infested, Corpus, Grineer) still read English: they only change if the game dictionary has them, the rest needs #62
- [ ] #65 Farming Targets Vendors tab (reported 2026-10-03, German, build 21:48; reopens #59). FIXED, in your 22:48 build. Check with your own targets: Händler lists The Quills (Rahn Prism, 2,500 Standing), Vox Solaris (Klamora Prism, 3,000 Standing) and Market (Ambassador, 225 Platinum); Missionen no longer lists The Quills and Vox Solaris; when a tab is empty the message names the tabs that have results
- [ ] #68 Acquisition text that does not say how to get the item (reported 2026-10-04, Latron Wraith). FIXED, in your 13:15 build. Check: Latron Wraith, Strun Wraith, Karak Wraith (Invasion reward and the Mastery Rank sentence, no 'type=Weapon'), Hyacinth Fur Pattern (five whole sentences), Fluctus. Tell me any drawer that still shows half a sentence, leftover code or a one-word row; some items whose only text was unusable now show no row (for example Jade Axa Shoulder Guard)
- [ ] #66 Foundry recipe panel counts parts wrongly (reported 2026-10-03, screenshot, Follie). FIXED, in your 13:15 build. Check: open a recipe where you have a built Chassis, Neuroptics or Systems (it shows 1/1); a part you are still building shows 0/1 with a small 'being built' note; 66 such built parts were read as missing across 811 recipes (Ash, Xaku, Jade, Garuda Prime, Mesa chassis...)
- [ ] #67 App freeze when opening Farming Targets (reported 2026-10-04). CAUSE FOUND and FIXED, in your 13:15 and 14:03 builds (you reported at 14:14 that it no longer freezes: tick it when you are happy): the place list was rebuilt with tens of millions of slow text operations in WebKit (about half an hour); now 0.5 s with identical results. Check: open Farming Targets with your 31 targets and tell me how long it takes to load and whether the window stays usable (your note: it freezes while it walks your inventory for requirements; the log now records every step's duration, so I will read them). If it still freezes, note the time and leave it for a minute
- [ ] #69 Farming Targets: node rows do not say which planet (reported 2026-10-04). FIXED, in your 13:15 build. Check: every node (Exta, Lu-yan, Vesper Relay ...) shows its planet; 'Group by planet' groups nodes under their planet; bosses and caches show what they are (boss, cache); the list shows 40 places with a 'Show more' button
- [ ] #70 Every screen change crashed the app with 'SOMETHING WENT WRONG: t is not a function' (reported 2026-10-04, screenshot, build 13:15; my mistake in the logging job). FIXED, in your 14:03 build. Check: open Farming Targets, then Inventory, Foundry, Dashboard and back: no error screen; and tell me how long Farming Targets takes to load with your targets (the log now has the step timings)
- [ ] #71 Parts of a mastered item read 'unmastered' (reported 2026-10-04, Atlas Blueprint). FIXED, in your 22:41 build. Check: Inventory All tab, filters Unmastered + Unowned: Atlas Blueprint, Neuroptics and Chassis no longer appear while Atlas is mastered; the Mastery screen's totals did not change
- [ ] #72 Missing images: Cyte-09, Jade, their Blueprints, the six Veiled Rivens (reported 2026-10-04). FIXED, in your 22:41 build. Check: search Cyte-09 and Jade in the Inventory: images show; a Veiled Riven has its card image
- [ ] #73 Resources and many other drawers: wrong labels, walls of text, items with no acquisition (reported 2026-10-04, Archon Shard, Arbucep Receiver, Amir's Shockwave Cred; also reopens your #51 'labels still wrong' and #52). MOSTLY FIXED, in your 22:41 build; research continues. Check: Archon Shard (clear sentences about Archon Hunts, Netracells, Fusion, no flattened table numbers), Arbucep Receiver (rows say 'Nokko: Critter Liberation Rewards', not just 'Rare Rot B'), Amir's Shockwave Cred ('Earn by ranking in Amir's Shockwave'), Accelerated Blast (Nightmare Mode drops), Atrox/Kexat/Nesyr fur patterns (sold for 150,000 Credits and 285 Ducats ...), Cycuta Prime Syandana (Prime Access and 'From Prime Resurgence for 2 Regal Aya'). STILL OPEN: about 440 resources and cosmetics (for example Bile, Bioplasma, Biotics, Calx) say 'How to get this item has not been researched yet' because the local wiki archive does not describe them; each researched route carries a quote from the wiki archive; tell me any drawer that is still wrong, with a screenshot
- [x] #80 Steam-only skins listed as Market purchases: CLOSED BY YOUR DECISION 2026-10-06, cosmetics (skins, helmets, syandanas, ephemeras, glyphs, emotes, decorations) are out of scope: no work, no checks. (405 items, all cosmetics; DE's market data and the wiki disagree, nobody verified in game.)
- [ ] #81 Route conflicts between the app and the wiki, NON-cosmetic. RESOLVED in code 2026-10-19 against the current wiki and DE data (not in a build yet). Archgun Riven Mod: now "Purchased from Arbitration Honors for 35 Vitus Essence" (wiki + DE vendor). Companion Weapon Riven Mod: now Cephalon Simaris for 100,000 Standing or Acrithis in Duviri for 20 Pathos Clamps (commit 24fe66eb). Archgun Arcane Adapter: the app already lists Nightcap (80 Fergolyte), Market (20 Platinum) and the Deepmines bounty drops, matching the wiki; no change. Latron Wraith and Strun Wraith: the wiki now says "can now be found as an Invasion reward", matching the app; no change. Still unverified: the same generic riven text sits on the other riven types, Oull and the four Primed Bane mods.
- [ ] #82 Acquisition text with the price cut out. FIXED, in your 15:27 build (2026-10-06). Check: Holster Amp, Corrosive Projection, Dizzying Rounds, Napalm Grenades read "Available for 20 creds from the Nightwave Cred Offerings store" (39 Nightwave mods fixed; the wiki writes the price as {{Nc|20}} and the app had lost it); no "Found at" in front of a full sentence, no double full stops, no "3,000 Standing standing". 20 resources still say "for Platinum" without a number on purpose: the wiki gives none (Ferment Bladder, the Fisher Hai-Luk fish bundles ...).
- [ ] #83 Whole-catalog wiki audit (all 20,417 items compared with their wiki pages; wiki saved locally: 10,952 pages, 26,230 redirects). Cosmetics are now EXCLUDED by decision (7,527 items); 12,890 non-cosmetic items remain. Done so far: the 150 "app has nothing" cases (non-cosmetic part fixed, #79), prices (#82), conflicts reported (#81). Not done: the partly-covered list (about 1,450 before cosmetics were excluded, 86% real in my sample) and items with no wiki page of their own. Do not treat a status as a to-fix list without grading a sample first.
- [ ] #84 Relics screen shows empty "LITH CITRINE P..." cards (reported 2026-10-05 19:32, screenshot, build 19:26): two cards with Intact 1, no reward list and 0 Ducats / 0 Plat. NOT diagnosed (DE's relic data has no relic named like that). Needs: open ~/AppImages/preview-before-DE-drops.appimage once and tell me whether the same cards appear there.
- [x] #92 Mastered Duviri melee weapons show as unmastered: Argo & Vel, Sun & Moon, Sampotes, Edun, Syam, Azothane (reported 2026-10-09; errors report item 92). FIXED in code 2026-10-19 (commit 9e54dc6c; not in a build yet). Cause: DE lists each twice, the Drifter copy (DrifterMelee) and the Warframe weapon; the Drifter copy has no XP and is not in XPInfo, so it is now "(Drifter)" in its name (commit 6e3a3d22) and does not count toward mastery. Measured on the real inventory: none appear under Inventory > Weapons > Mastered "no"; masterable items 2,181 to 2,175, mastered unchanged at 1,624. Mk1-Bo is a different case and was not changed.
- [ ] #93 Non-Prime filter keeps some Prime weapons: Corufell Prime, Sagek Prime, Galariak Prime, Steflos Prime (reported 2026-10-09; errors report item 93). NOT fixed. Cause found: the Prime flag looks only at the end of the internal path, and these four paths do not end in "Prime". Check after a fix: Inventory > Weapons > Prime "no": none of the four appear.
- [ ] #62 Larger project, later: our own refresh of the game's language strings straight from Digital Extremes' servers (replaces the lagging community dictionary; the calendar names use the published strings for now). Planned, NOT started; see the report, section 62

## Confirmed by you (kept for the record)

- [x] #8 Orokin Cell drawer: the Blueprint row says it is a Market purchase for 100 Platinum, not the enemy-drop text; Forma Blueprint and Prime part drawers still list their drops (confirmed by you 2026-10-03, build 21:48)
- [x] #38 Resource drawers: Alloy Plate lists all 10 mission rows and the line "found on Venus, Jupiter, Sedna, Ceres, Phobos, Pluto and the Zariman Ten Zero"; spot-check two or three other resources (Ferrite, Nano Spores, Plastids) (confirmed by you 2026-10-03, build 21:48)
- [x] #34 Inventory: search "Extractor": four entries (Titan, Titan Prime, Distilling, Distilling Prime), the Distilling Extractor marked owned, each with an image; the two Prime extractor drawers list several wiki source rows (confirmed by you 2026-10-03, build 21:48)
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
- [x] #43 Wiki tab blank after a crash (closed by you 2026-10-03: not seen again; reopen and send the log if it happens again)

## Blocked or waiting on something other than a check

- [ ] #16 "The Circuit" translation: BLOCKED. No official localized name exists in the repo data or on wiki.warframe.com; the title stays "The Circuit" in every language until an official source is found
- [ ] #19, #20, #22 (relic picker translations, relic planner names in German, picker layout): fixed in an earlier snapshot, never confirmed in the app. Check them during Step 2 and Step 4 when you are on those screens
- [ ] Other owned items the Inventory parser does not read yet: DONE for the ones with real names, in your 21:48 build: Inventory > Parts now has 56 Railjack parts and plating (31 owned, 25 not owned) and Melee has your 6 Drifter weapons (Sun & Moon, Edun, Azothane, Syam, ...). Left out on purpose because the DE exports have no name for them (waits for #62): Focus upgrades, email items, boosters, Railjack weapons, crew, Kubrow prints, harness, data knife, horse, motorcycle, scoops; quest keys and level keys (not farmable) and Operator suits (your saved outfits) are not items

## Backlog (kept from earlier lists)

Known, root-caused, not fixed:

- [ ] Which desktop side shows which riven card (code fixed 2026-10-03, commit 3e479918 'riven two-card desktop-side mapping, with real state tracking'; this needs a two-card reroll check by you)

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
