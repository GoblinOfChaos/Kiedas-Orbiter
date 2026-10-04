# Recurring Error & Regression Report (Since 08/20/2026)
**Target Audience**: Claude / AI Engineering Agents & Developers  
**Scope**: `kiedas-orbiter` (Tauri + React + Vite + DE WorldState / PublicExport / Official Wiki Integration)  
**Date Generated**: 2026-08-23  

---

## Executive Summary
This document catalogs every recurring error, architectural regression, and failure mode that has occurred **more than twice** across the development sessions between **August 20, 2026 and August 23, 2026**.

Each section details:
1. **The Exact Error / Symptom**
2. **Frequency Count**
3. **Root Cause Analysis**
4. **Why Past Fixes Failed / Regressed**
5. **Enforced Rules & Permanent Solution Architecture**

---

## Status Log (updated 2026-10-03 20:40, third build deployed): items 8-62; items 33-43 are new findings from the user's in-app checks of build 795d0a7

"Fixed in code" means: root cause identified, regression test added and passing, merged to `preview/stage4` (full suite 179/179 as of 2026-10-02 22:30, head `60afb5cc`). Nothing below is "resolved" until the user confirms it in a deployed Preview AppImage; confirmations are recorded in `docs/APP_CHECKLIST.md`. BUILD STATUS (newest, 2026-10-03 20:40): the AppImage deployed at 20:40 was built from commit `4b64f92d` (code identical to every later docs-only commit) with the same throttled command the user pre-approved (4 jobs, nice 19), after the full JS suite (252 tests, run with the tests/inventory folder included) and with the native tests unchanged since the 16:40 run (48). It contains everything from the 18:01 build plus items 48 (calendar names from the game's strings), 51 (Prime tiers), 52 (Mission rows), 53 (Forma), 54 and 57 (clean current-route text), 55 (extractor routes), 58 (Rivens filter icons), 59 (Vendor tab), 60 (owned targets) and 61 (End key). ROLLBACK COPIES: `~/AppImages/kiedas_orbiter_preview.appimage.bak-2040` is the 18:01 build, `.bak-1801` is the 16:57 build, `.bak-1657` is build 795d0a7 (2026-10-02 22:41); `.bak-2241` (the 20:18 build) was deleted by the retention rule. Nothing in it is confirmed until the user checks it in the app (docs/APP_CHECKLIST.md). PREVIOUS BUILD NOTE (2026-10-03 18:01): earlier entry follows. BUILD STATUS (2026-10-03 18:01): the AppImage deployed at 18:01 was built from commit `6831bfde` (code identical to every later docs-only commit) with the same throttled command (4 jobs, nice 19). It contains everything from the 16:57 build plus item 49 (Prime Sets part cells no longer cut off) and item 50 (blueprint parts and Warframe/weapon drawers list every route). The JS suite (228) and the native tests (48) passed before the build. ROLLBACK COPIES: `~/AppImages/kiedas_orbiter_preview.appimage.bak-1801` is the 16:57 build (without items 49 and 50), `.bak-1657` is build 795d0a7 from 2026-10-02 22:41, `.bak-2241` is the 20:18 build; `.bak-2018` was deleted by the retention rule. PREVIOUS BUILD NOTE (2026-10-03 16:57): earlier entry follows. BUILD STATUS (2026-10-03 16:57): the AppImage deployed at 16:57 was built from commit `b3745a02` (code identical to every later docs-only commit) with the throttled build command the user approved (4 jobs, nice 19). It contains every item marked "Fixed in code 2026-10-03, merged" in this report: 8, 9, 15/46, 18 (all 14 languages), 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44, 45 and 47, and the partial fix of 48. The JS suite (223) and the native tests (48) passed before the build; the build compiled with the usual 4 dead-code warnings. ROLLBACK: the previous build (795d0a7, 2026-10-02 22:41) is `~/AppImages/kiedas_orbiter_preview.appimage.bak-1657`; the older copies `.bak-2018` (63121682 build) and `.bak-2241` (20:18 build) were kept, `.bak-1317` was deleted by the build's retention rule. Nothing in this build is confirmed until the user checks it in the app (see docs/APP_CHECKLIST.md). OLDER BUILD NOTE (2026-10-02 22:41): the earlier text follows. BUILD STATUS: the AppImage deployed on 2026-10-02 22:41 was built from commit `795d0a78` (code identical to `60afb5cc`, the last code merge) and contains every fix marked "fixed in code" below; the Rust unit tests (47) passed before the build. Rows say "deployed 22:41" for these. The previous build (20:18, commit `63121682`) is kept as `~/AppImages/kiedas_orbiter_preview.appimage.bak-2241` for rollback.


### Open fix queue and user decisions (2026-10-03)
UPDATE 20:13: after the 18:01 build the user's checks produced items 49 to 61; 49 and 50 were fixed and built (18:01 build). Six more Codex jobs are running in parallel on gpt-5.6-luna: P15 (item 48, calendar names from the game's own strings), P16 (58), P17 (59), P18 (61), P19 (51, 52, 55 and the relic part of 53), P20 (54, 57 and the text part of 53, with the first audit tests of 56). Open and waiting on the user: 60 (decision), 56 (full audit), 62 (larger project). New confirmations are in R7.
UPDATE 16:40: the whole queue is merged (items 34, 38, 44, 45, 46/15, 47 fixed in code; 48 partly, see its addendum; translation audits for all 14 languages). JS suite 223/223 (run it with the extra folder: tests/inventory/*.test.mjs), native tests 48/48. NOTHING is in a build yet. Next step: a build, then the user's in-app checks.
UPDATE 15:35: also fixed in code and merged since then: item 44 (relic OCR, native tests 48/48), item 38 (resources), item 18 translation audits for all 14 languages (T1 to T3, suite 207/207). Queue still running one at a time on Codex gpt-5.6-luna: extractors (34), then Inventory scrolling and keyboard (46, 15), then the parseInventory error (45, approved by the user 2026-10-03). New open findings not queued yet: 47 (Group by planet), 48 (calendar upgrade names in German).
UPDATE 13:40: batch 2 also fixed in code and merged: items 33, 40, 41 (Codex gpt-5.6-luna, included in ChatGPT Plus; suite 194/194). Remaining queue: resources (38, 34), then translations (18).
UPDATE 13:15: batch 1 and the History crash are fixed in code and merged (items 35, 36, 37, 39, 8, 9, 42; built by Codex gpt-5.6-luna, included in ChatGPT Plus; full suite 188/188). Not in a build yet. The out-of-scope-variable scan for item 42 was NOT run (ESLint is not installed); the other 149 resource-name entries in the acquisitions table that repeat `general` as `blueprint` were listed in the Codex report and NOT changed (they belong to item 38). Everything else below is not started.
Reopened by the user's own checks of build 795d0a7 (not fixed after all): **8** (Orokin Cell Blueprint row shows the resource drop text), **9** (Ash Prime Warframe drawer still lists refinement rows and percentages), **18** (Grade Rivens untranslated in German; ~1,900 English-identical UI strings are hidden by the test baseline). The earlier "fixed in code" status for those three was wrong for the paths named in their addenda.

User decisions: item 37 badge goes centered above the piece image; item 38 is to be done as a **manual, wiki.warframe.com-verified overhaul for ALL resources**, scheduled after the Prime Sets work; item 41 only the Inventory currency strip may keep a horizontal scrollbar; no per-build preambles in the checklist.

Suggested order (batches that touch the same code):
1. **Prime Sets card and drawer**: 35 (part labels), 37 (badge position), 36 (Blueprint row with relics), 39 (false Market price), 9 reopened and 8 reopened (same Blueprint row and relic helper).
2. **Crash and layout quick wins**: 42 (History `locale` plus translated crash screen), 33 (currency strip, draft on `agent/b9-strip`), 41 (Rivens scrollbars), 40 (Market tabs); then recheck 43.
3. **Resources**: 38 (manual wiki-verified data for every resource), 34 (extractors), the bad decoration-market override.
4. **Translations (last)**: 18 (English-identical audit, 14 languages). The user speaks English, so anything that affects the English side goes first, Prime Sets work outranks translations, and translations come after every English-side fix.

Usage rule (user, 2026-10-03): the user is low on weekly Claude usage. Hold off on intensive Claude work until the very last fixes; do the fixes with Codex (included in ChatGPT Plus) and keep Claude to short reviews, merges and the docs. Provider, exact model and cost category are still disclosed before every delegation.
Blocked or needs the user: 16, 15 (measurement), 21 and the overlay part of 30 (screenshot), 41 cards (screenshot), 43 (log if it recurs), 19/20/22 (unconfirmed).

| # | Status | Root cause / what changed |
|---|---|---|
| 8 Orokin Cell Blueprint as enemy drop | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (reopened by your check of build 795d0a7) (was: **REOPENED 2026-10-03**: the phantom-key part was fixed, but the Orokin Cell drawer's "1x Blueprint" row still...) | See section 8 addendum. Earlier fix: `dropsParser.js` filed unresolved names such as "2X Orokin Cell" under phantom `display:<name> blueprint` keys (731 keys); quantity prefixes are stripped and no blueprint key is invented |
| 9 Meso C11 repeated x5 | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (reopened by your check of build 795d0a7) (was: **REOPENED 2026-10-03 for Warframe drawers**: Ash Prime Neuroptics still lists (Radiant)/(Flawless) rows with ...) | Top-level sources fixed in the 20:18 build; the "Crafting requirements" ingredient rows (second path) are fixed after it by the shared `relicSources.js` helper (tier checked against ExportRelics: 101 rows, 0 mismatches). Not yet deployed |
| 10 "+N more" without rows | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code, deployed in the 20:18 and 22:41 builds, awaiting in-app check...) | 85 override strings carried "(+N more sources)"; live drop rows replace them |
| 11 Salvage Conclave-only | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code, deployed 22:41 (Market and farming sources added after the 20:18 build), aw...) | Decoration blurb removed; wiki.warframe.com Market and farming sentences added verbatim as separate sources |
| 12 Foundry drawer outside click | RESOLVED: confirmed by the user in the app 2026-10-02 (build 63121682). See R4 | `RecipeDrawer` got the shared backdrop, click guard and Escape |
| 13 Extractor Prime Set artwork | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code, deployed 22:41, awaiting in-app check...) | Set and blueprint images resolved from DE `ExportBundles` (only the 4 intended images changed out of 764) | The user reported on 2026-10-03 that the artwork now shows (awaiting their tick); the artwork fix exposed the separate problems in item 34 |
| 14 New UI strings never translated | Fixed in code for all 14 locales, deployed 22:41, awaiting in-app check | 104 missing keys translated in every locale plus an enforcement test (completeness, placeholders, leftover-English, script checks). The Circuit title stays English (see 16). Existing real translations were verified unaltered |
| 15 Inventory overscroll | **Fixed in code 2026-10-03, merged to preview/stage4 (suite 216/216), NOT in any build yet, and NOT proven in the running app (Codex cannot run it): needs your live check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). Home, End, Page Up, Page Down and Space now scroll the Inventory list (it takes keyboard focus on open and when you click in the list, never while you type in a field); the row height is measured from the first rendered row instead of the fixed 184px; the scroll position keeps the first visible item when the column count changes (maximize); the list height includes the bottom padding so the last row is reachable (item 15 is covered by the same change; the real stride fix may still show as a one-time small shift when the first row is measured) (was: OPEN, not fixed deliberately...) | Fixed row-height constants; rows are CSS grid rows as tall as their tallest card, so no uniform stride is exact; a correct fix needs a variable-height virtualizer. Waiting for the user's measurement (see section 15) |
| 16 Circuit title | BLOCKED | No official localized name exists in the repo data or on wiki.warframe.com; title routed through `t()` and kept "The Circuit" |
| 17 Riven overlay does not appear | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code (stale close + replay guards), Rust compiled and unit-tested, deployed 22:41...) | See 26 |
|  18 Raw key in Riven trigger | **REOPENED 2026-10-03**: "Grade Rivens" is still English in German; see section 18 addendum (earlier status: Fixed in code, deployed in the 20:18 and 22:41 builds, awaiting in-app check) | Keys moved under `ui` in all locales |
| 19, 20, 22 | Fixed in an earlier snapshot, never confirmed in the app | Need the user's check |
| 21 Reward overlay blueprint count | No defect found | The display path and all translation keys are correct for the logged payload; needs an overlay screenshot showing the miss |
| 23 Relic reward overlay UNRECOGNIZED | Fixed in code (OCR cleanup, tests), Rust compiled and unit-tested, deployed 22:41, awaiting in-app check | `clean_ocr_output` kept only capitalised neighbours |
| 24 Scanner toast raw keys | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code, deployed 22:41, awaiting in-app check...) | Listener and Maps timer read `t` through a ref |
| 25 Riven banner vanishes on hotkey | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code, deployed 22:41, awaiting in-app check...) | Banner hides only on screen close |
| 26 Riven overlay stuck / replayed log lines | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code (monotonic guard + bounded dedupe + garbage filter + diagnostics), Rust comp...) | Mechanism partly proven (the scanner reads up to 1 MiB per poll and wiped its whole dedupe set at 16,384 new hashes); diagnostics added to prove it next session |
| 27 Riven grading per press | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code, deployed 22:41, awaiting in-app check...) | Every hotkey press grades once; no timers; new-roll result clears on a new roll and hides on accept |
| 28 Focus watcher log flood | **CONFIRMED by the user 2026-10-03 (ticked after the coordinator's log count). See R7.** (was: Fixed in code, Rust compiled and unit-tested, deployed 22:41...) | The main-window exemption remains (documented) |
| 29 Old-tree fixes not ported | Ports done: weekday/month locale, Target Inspector clipping and planet label, drawer image order, Prime ownership via recipe identity (JS) and the DE name/description merge (Rust, uncompiled); riven fixes folded into 25-27 | Re-verified against Preview by code and real-data comparison |
| 30 Prime Sets OWNED | **RESOLVED: confirmed by the user in the running app 2026-10-03 (build 795d0a7). See R5.** (was: Fixed in code, deployed 22:41, awaiting in-app check...) | 62 of 166 sets wrongly owned -> 0 on the real inventory; the overlay part could not be reproduced and needs an example |
| 31 Prime Sets scroll slowness | **CLOSED by the user 2026-10-03: marked complete because there is no practical way to test it (no performance profile was taken).** (was: Fixed in code (cached part sources, memoized cards; 362 ms -> 1.9 ms simulated),...) | Not a leak per the code review |
| 32 Dual-weapon recipes | Fixed in code, deployed 22:41, awaiting in-app check | Aklex, Akvasto, Akbronco, Akmagnus list their 2 base guns with images |
| 33 Inventory currency strip has a vertical scrollbar that scrolls into blank space (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 96bfa8f7, full suite 194/194), NOT in any build yet, awaiting a build and your in-app check** (was: Open: cause verified in code, fix drafted on a branch (`agent/b9-strip`), NOT merged or deployed...) | The Forma tooltip hangs below the strip inside an `overflow-x-auto` wrapper (see section 33) |
| 34 Extractors: not in the Inventory at all; Prime extractors' "how to obtain" is vague and incomplete vs the wiki (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (suite 209/209), NOT in any build yet, awaiting a build and your in-app check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). All four extractors now appear in the Inventory (Distilling Extractor owned, quantity 1, from your Drones list; the other three not owned), with DE images; the two Prime extractors list every source sentence from wiki.warframe.com (page Extractor, revision 2783845), and Titan Extractor says 50,000 Credits and that the blueprint is reusable (was: Open: cause verified in code and real data, NO fix started (...) | See section 34 |
| 35 Prime Sets card shows only the last word of a part name ("Limb", "Limb", "Prime") (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: cause verified, NO fix started) | `PrimeSetCard.jsx:54`; 8 sets affected (see section 35) |
| 36 Drawer "Crafting requirements" omits the main Blueprint row for most Prime items (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: cause verified, 92 of 166 Prime drawers affected, NO fix started) | See section 36 |
| 37 The "xN" part-count badge sits in the top-left of the part cell and reads as belonging to the cell on its left (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: DECISION MADE (center it above the piece's image), NO fix started) | `PrimeSetCard.jsx:51`; see section 37 |
| 38 Resource drawers (Alloy Plate and most common resources) show only a few mission drops and none of the world-container/planet sources the wiki lists (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head e0ea0de9, full suite 198/198), NOT in any build yet, awaiting a build and your in-app check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). Alloy Plate now returns all 10 DE rows plus the wiki 'found on' line and other wiki source sections; 486 resources have wiki-verified entries (page url and revision recorded per entry); 14 wrong decoration overrides removed (was: Open: cause partly verified, NO fix started; needs a manual overhaul decision...) | See section 38 |
| 39 Prime Warframe drawers say the Prime Blueprint can be bought from the Market for credits (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: cause verified on real data, NO fix started) | See section 39 |
| 40 Market page under 1050px wide cuts off the top of the Active Orders / Tradeable Stock tabs (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 96bfa8f7, full suite 194/194), NOT in any build yet, awaiting a build and your in-app check** The tab row does not scroll (a Codex-added scrollbar was removed). Not confirmed in the running app. (was: Open: probable cause only, NO fix started...) | See section 40 |
| 41 Rivens page has horizontal scrollbars on the filters and the card area; they cannot be grabbed or do not work (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 96bfa8f7, full suite 194/194), NOT in any build yet, awaiting a build and your in-app check** Filters verified and fixed. The scrollbar under the cards was NOT located: Codex changed the grid so it can shrink (a likely but unproven cause), so if a bar remains under the cards after the next build, send a screenshot or the dev-tools element. (was: Open: filters verified, card area NOT yet traced, NO fix started...) | See section 41 |
| 42 History screen crashes with "Can't find variable: locale"; the crash screen shows raw `error_boundary.*` keys (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: both causes verified in code and in the log, NO fix started) | See section 42 |
| 43 Wiki tab is a blank white box after the History crash; Reload UI and fullscreen do not fix it, restarting the app does (new, reported 2026-10-03) | **CLOSED by the user 2026-10-03 (ticked; it has not recurred and could not be reproduced). Reopen if the Wiki tab goes blank again: send the log first.** (was: Open: not reproduced, cause unknown, NO fix started...) | See section 43 |
| 44 Relic reward overlay says UNRECOGNIZED for one of two identical-looking items: "Yareli Prime Chassis Blueprint" and "Akbronco Prime Blueprint" (new, reported 2026-10-03, REOPENS item 23) | **Fixed in code 2026-10-03, merged to preview/stage4 (JS suite 206/206, native tests 48/48 including the new hyphen test), NOT in any build yet, awaiting a build and a real relic mission.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus), native tests run by the coordinator (was: Open: both causes verified from the log and by reproduction, NO fix st...) | See section 44 |
| 45 Inventory parse fails in the worker: `Q.startsWith is not a function` (new, found by the user in the developer tools 2026-10-03) | **Hardened and merged 2026-10-03 (suite 223/223 including the new inventory tests), NOT in any build yet; the exact runtime value behind the logged error was NOT reproduced.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). The parser can no longer throw on non-text names, descriptions or custom names (one safe `isLotusPath` helper replaces every raw startsWith), and a failed parse now keeps the last good inventory instead of wiping it. After the next build check the log: if `parseInventory worker call failed` still appears, the failing value is something else and I need that log line (was: Open: reproduced in the log (10 times today, 4 on ...) | See section 45 |
| 46 Inventory: End and Page Down do nothing; maximizing the window jumps the list to the top; no extra room at the end of the list on the tab tried (new, reported 2026-10-03, related to item 15) | **Keys confirmed by the user 2026-10-03 (Home, Page Up and Page Down work; ticked). The End key still stops early: item 61, job P18 running.**  (was: **Fixed in code 2026-10-03, merged to preview/stage4 (suite ...) | See section 46 |
| 47 Farming Targets 'Group by planet' only changes the wording of each row, rows stay separate and look like duplicates (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (suite 212/212), NOT in any build yet, awaiting a build and your in-app check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). With 'Group by planet' on, the places are merged into one row per planet (planet heading, '{count} nodes', the union of covered items with the best chance per rotation, nodes listed underneath in a collapsible); off is unchanged; the relics tab is untouched (was: Open: cause verified in code, NO fix started...) | See section 47 |
| 48 1999 Calendar: upgrade names such as 'Electric Status Damage And Chance' stay English in German (new, reported 2026-10-03) | **Fixed in code 2026-10-03 after the 18:01 build, merged (suite 237/237), NOT in a build yet, needs your check in the German game language.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). The calendar's upgrades now take the game's own name, description and type label for the active language from the published game strings (github.com/calamity-inc/warframe-languages-bin-data, commit 826e8eab, game version 44.0.3, text only; 391 calendar strings in each of 15 language ids, in src-tauri/data/assets/data/calendar-language.json): German 'Abgefüllter Blitz' with 'Gewährt allen Waffen 25 % Statusschaden und Elektrizität-Statuschance.' and 'Dicke Haut', English 'Bottled Lightning' and 'Thick Skin'. The type label is the game's own ('Hex-Boost Modifikator' in German; the English game string is 'Hex Boost Override'). The real worldstate events carry no minor/major field, so every upgrade uses the Minor label (an unconfirmed assumption: a Hex Factor may be labelled 'Hex Boost' too) (was: IN PROGRESS 2026-10-03 20:13: Codex job P15 (gpt-5.6-luna, h...) | See section 48 |
| 49 Prime Sets card at a medium window width cuts off the last part cell (the String of Paris Prime) (new, reported 2026-10-03, build 16:57) | **Fixed in code 2026-10-03 after the 16:57 build, merged to preview/stage4 (suite 224/224), NOT in a build yet, needs your live check at small, medium and full-screen widths.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). The parts row now uses `auto-fit, minmax(min(64px, 100%), 1fr)` tracks: one row of equal columns when there is room, shrinking or wrapping onto a second line when the card is narrow; cells can shrink and long words break; sets with 5 or more parts use tighter cell padding at every width (a slight look change at full screen) (was: Open: probable cause from the screenshot arithmeti...) | See section 49 |
| 50 Ash (non-Prime Warframe) drawer: "Where to start" lists 1 source (Market for 375 Platinum) while the Blueprint row below also gives Market for credits and Simaris (new, reported 2026-10-03, build 16:57) | **Fixed in code 2026-10-03 after the 16:57 build, merged to preview/stage4 (suite 228/228), NOT in a build yet, needs your live check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). Measured on your real export before the fix: 32 of 67 main Warframe blueprint parts and 166 of 317 main weapon blueprint parts had 0 sources, and 61 Warframe and 267 weapon drawers lacked a credits or table route. After: 0 empty blueprint parts in both groups. The Ash drawer and the Ash Blueprint part now list three separate routes: Market for 375 Platinum, Market for 35,000 Credits (only when the recipe is not excludeFromMarket) and Simaris; blueprint parts inherit the routes of the item they build; Prime relic rows and the item 39 rule are unchanged (was: Open: cause verified in data and code, N...) | See section 50 | Addendum 17:08: the PART "Ash Blueprint" drawer says "0 sources / No verified acquisition route"; 35 of 71 main Warframe blueprints are affected, see the addendum |
| 51 Prime part drawers show wrong Common/Uncommon/Rare tiers (Nidus Prime says Uncommon for everything; Nyx Prime and "all Primes" wrong) (new, reported 2026-10-03, build 18:01; REOPENS item 9) | **Fixed in code 2026-10-03 after the 18:01 build, merged (suite 247/247), NOT in a build yet, needs your live check. Built by Codex gpt-5.6-luna (included in ChatGPT Plus).** Measured on your real data: before, 17 tier mismatches across 2,141 relic rows; after, 0. The tier is now looked up through the component's blueprint in DE ExportRelics and the unreliable bundled label is never used when the DE tier is known; 14 component/relic combinations have no DE reward tier in the current export and show no tier instead of a wrong one. NOT covered: the Prime Set card's part tooltip reads its tier from a different path (the raw drop index) and was not changed; check it too (was: IN PROGRESS 2026-10-03 20:13: Codex job P19 (gpt-5.6-luna, h...) | See section 51 |
| 52 Orokin Cell (and other resource) drawers list hundreds of rows that just say "Mission" (new, reported 2026-10-03; regression from the resource job, item 38) | **Fixed in code 2026-10-03 after the 18:01 build, merged (suite 247/247), NOT in a build yet, needs your live check. Built by Codex gpt-5.6-luna (included in ChatGPT Plus).** Orokin Cell: 176 top-level rows before, 40 after; resource mission rows show node, mission type, rotation and chance (no bare 'Mission'); duplicates removed; the top 15 by chance stay visible and the rest sit behind a collapsed group; Alloy Plate shows node names; an audit over all resources found no bare 'Mission' label (was: IN PROGRESS 2026-10-03 20:13: Codex job P19 (gpt-5.6-luna, h...) | See section 52 |
| 53 Forma drawer is a mess: 4,593 "other sources", a Blueprint row with a wall of wiki text with missing prices (new, reported 2026-10-03) | **Fixed in code and merged (relic rows by P19 and text by P20; suite 247/247), NOT in a build yet, needs your live check.** Forma and Forma Blueprint: 4,594 and 616 top-level rows before, 20 each after, with one grouped row for the 565 relics (tier summary from DE) and the list behind it; the Blueprint text has its real prices and no history (was: Text part fixed in code and merged; relic-row part still IN ...) | See section 53 |
| 54 Wiki text with unresolved template residue shows nonsense, e.g. Alloy Plate "Beginning in 9 materials could be purchased directly from the market for Platinum." (new, reported 2026-10-03; from the resource job) | **Fixed in code 2026-10-03 after the 18:01 build, merged (suite 243/243), NOT in a build yet, needs your live check. Built by Codex gpt-5.6-luna (included in ChatGPT Plus).** The wiki templates are now expanded or the sentence is dropped, so nothing like 'Beginning in 9 materials ... for Platinum.' can appear: Alloy Plate now reads 'Alloy Plate is a common resource that can be found on Venus, Jupiter, Sedna, Ceres, Phobos, Pluto, and the Zariman Ten Zero.'; the malformed Market quote is dropped because the DE Market index already supplies the price (was: IN PROGRESS 2026-10-03 20:13: Codex job P20 (gpt-5.6-luna, h...) | See section 54 |
| 55 Prime extractors appear twice with different information (the finished item as a "part" and the "... Prime Blueprint" as a "prime part") (new, reported 2026-10-03) | **Route part fixed in code 2026-10-03, merged (suite 247/247), NOT in a build yet. The category naming of the pair is still open.** Titan and Distilling Extractor Prime: the Blueprint drawer now shows exactly the same routes as the finished item. The Inventory still files the finished item under category 'part' and the blueprint under 'prime_parts' (inventoryParser.js was not changed): decide whether they should share a category (was: IN PROGRESS 2026-10-03 20:13: Codex job P19 (gpt-5.6-luna, h...) | See section 55 |
| 56 Consistency: the same kind of thing is built differently in different drawers (user's principle, 2026-10-03) | **First version done 2026-10-03 (merged, suite 260/260, not in a build): the whole-catalog audit test over every item's acquisition rows exists and passes with 0 violations (see 63). The wider contract (one assembler for every path) is NOT built.** | See section 56 |
| 57 Acquisition text carries history and update numbers that do not help the player now (new, user rule 2026-10-03) | **Fixed in code 2026-10-03 after the 18:01 build, merged (suite 243/243), NOT in a build yet, needs your live check. Built by Codex gpt-5.6-luna (included in ChatGPT Plus).** The user's rule (how to get it now, no history or update numbers) is enforced by a new text module and an audit over 4,994 route strings (wiki resources, extractors, the hand-written Warframe/component and resource tables): before 1,310+8+4,116 strings had 170+4+810 violations, after 0. Dropped sentences are not rewritten: an item whose only text was history can now show no text for that route (the DE data and market rows still show). The two Prime extractors now say only their current state: 'Vaulted: not sold in the Market. Obtainable through Prime Resurgence when it is in rotation.' (was: IN PROGRESS 2026-10-03 20:13: Codex job P20 (gpt-5.6-luna, h...) | See section 57 |
| 58 Rivens filters at a small width: the filter icon (funnel, sort arrows) sits alone on its own line and the buttons wrap below (new, reported 2026-10-03, build 18:01; from the item 41 change) | **Fixed in code 2026-10-03 after the 18:01 build, merged (suite 237/237), NOT in a build yet, needs your live check at a small width.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). The state and sort filter rows no longer wrap; the icon stays beside the first row of buttons and the button group takes the remaining width and wraps inside itself (was: IN PROGRESS 2026-10-03 20:13: Codex job P16 (gpt-5.6-luna, h...) | See section 58 |
| 59 Farming Targets: the Vendor tab/filter shows nothing (new, reported 2026-10-03) | **Fixed in code 2026-10-03 after the 18:01 build, merged, NOT in a build yet, needs your live check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). Measured on your real data: before, exactly 1 generic place called Vendor; after, 107 distinct vendor places (Acrithis, Nightwave and so on) built from the wiki vendor list and the DE vendor offers, with the listed price where DE gives one; the Vendor tab ranks vendors by how many of your needed items each sells; Orokin Reactor and Catalyst rank under Acrithis in the test (was: IN PROGRESS 2026-10-03 20:13: Codex job P17 (gpt-5.6-luna, h...) | See section 59 |
| 60 Farming Targets Target Inspector shows nothing for a target you already own and does not list the items needed to build it (new, reported 2026-10-03) | **Fixed in code 2026-10-03 after the 18:01 build, merged (suite 252/252), NOT in a build yet, needs your live check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). A target now means 'N more': the top-level item's own stock is not subtracted by default, so an owned craftable target expands its recipe and lists what is still missing, and an owned raw target asks for N more; components below it still use your stock. A per-target checkbox 'Count the copies I already own' (translated in all 14 languages) restores the old behaviour; old saved targets load with it off. The Target Inspector always lists every requirement row (required, owned, still needed, with an owned/needed mark) and is never empty. Tests include two targets you actually own (was: DECISION made by the user 2026-10-03: owned targets stay far...) | See section 60 |
| 61 Inventory End / Page Down: End goes to the end of the rendered part of the list, not the end of the whole list (new, reported 2026-10-03, build 18:01; item 46 follow-up) | **Fixed in code 2026-10-03 after the 18:01 build, merged (suite 231/231), NOT in a build yet; the cause is reasoned from the code, not proven live, so it needs your check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus). End and Home now use the list's own model maximum, repeat the jump after each frame until the position and height stop changing (at most 6 passes), do not re-measure the row height during a jump, and write a warning to the log if End still ends more than 2px short (was: IN PROGRESS 2026-10-03 20:13: Codex job P18 (gpt-5.6-luna, h...) | See section 61 |
| 63 Acquisition rows broken into fragments, missing prices, history in hand-written tables (new, found by the coordinator 2026-10-03) | **Fixed in code 2026-10-03 after the 20:40 build, merged (suite 260/260), NOT in a build yet, needs your live check.** Built by Codex gpt-5.6-luna (included in ChatGPT Plus), jobs P22 and P24. Real-data counts over 13,235 catalog entries, before to after: number cut at the comma 457 to 0 real (12 legitimate numbers), missing price 155 to 1 valid sentence, history 142 to 0, label-only rows 89 to 0, underscore names 14 to 0. A new whole-catalog audit (`tests/farming/catalogAudit.test.mjs`, item 56 first version) finds 0 violations. Honest gaps: 279 entries (mostly Obsidian skins and Ephemeras) now have no hand-written text because it was only history; 11 resources lost their wiki text because no clean current route remained (Stalker Beacon, Wolf Beacon, Omni Forma and others); Diriga Desert-Camo Skin lost its Baro price | See section 63 |
| 62 Larger project (not started, later): own refresh of the game's language strings straight from Digital Extremes' servers, instead of the app's lagging community-built dictionary (new, user decision 2026-10-03) | Planned, NOT started | See section 62 |


Process lessons from this round (apply to all future fixes):
- A passing test is not proof: two Codex changes shipped bugs their own tests missed (9 locales lost `nav.market`; the tier label key lacked the `ui.` prefix, so the app would have printed a raw key). Always render the real label or screen on real data.
- Compare the whole result before and after on real data (e.g. drop-index key sets) when changing a shared parser.
- Antigravity reports were wrong or half-wrong on 3 of 7 items; verify every claimed root cause against code and data before delegating a fix.

---

## 1. Missing or Broken Acquisition Info & Empty Drawers
* **Frequency**: 12+ occurrences
* **User Symptom**: Clicking an item in Inventory, Mastery, or Cosmetics opens the Acquisition Drawer, but the drawer is either empty, missing component drops, or fails to resolve the item's origin.

### Root Cause
1. **Fragmented Data Lookups**: Warframe items have multiple naming layers:
   - Export Path: `/Lotus/Powersuits/Excalibur/Excalibur`
   - Store Item Path: `/Lotus/StoreItems/Powersuits/Excalibur/Excalibur`
   - Localized Name: `"Excalibur"`
   - Recipe Key: `/Lotus/Types/Recipes/WarframeRecipes/Excalibur`
2. Previous resolver implementations made single-pass lookups against incomplete tables or only looked up by `uniqueName` rather than fallback keys (`displayName`, canonical normalized paths, recipe results).
3. Clan Dojo lab weapons (*Amesha, Elytron, Itzal, Dagath*), 1999 Technocyte Coda adversary weapons, and Railjack components had incomplete coverage in DE drop manifests.

### Permanent Resolution Protocol
- Always query the complete layered hierarchy:
  1. `getItemDrops(dropIndexKey)` / `ExportDropTables.json` (Direct drop rates & missions)
  2. `getItemRecipe(dropIndexKey)` / `ExportRecipes.json` (Foundry components & ingredient drop tables)
  3. `bundledWikiMasterAcquisition` (`wiki-master-acquisitions.json` — 3,626 items)
  4. `bundledWikiVendorsIndex` (`wiki-vendors-acquisition.json` — 2,482 items)
  5. `bundledWikiBaroIndex` (`wiki-baro-acquisition.json` — 465 items)
  6. `bundledWikiResearchIndex` (`wiki-research-acquisition.json` — 319 Dojo items)
  7. `bundledWarframeItems` (`wfcd-combined.json` — 14,518 DE objects)
- **Do not overwrite structured recipe/relic components with flat generic text strings.**

---

## 2. Generic "Fallback Text" Appearing in UI
* **Frequency**: 8+ occurrences
* **User Directive**: *"Delete all fallback text. Which SHOULD NOT EXIST IN MY APP. There should be 0 empty things. It's all on the wiki."*

### Root Cause
1. In `src/lib/acquisitionInfo.js` and `AcquisitionDrawer.jsx`, developers inserted default return strings such as:
   - `"Crafted in the Foundry or purchased from in-game syndicate / Market vendors. See the official Warframe Wiki for details."`
   - `"A Warframe Wiki page exists, but its current page audit found no explicit structured acquisition section."`
   - `"Acquired in-game via missions, vendors, or Market."`
   - `"Known source"` / `"Not obtained from a drop table"`
2. When an item had a valid recipe or drop table, but a broad fallback block matched first, the app displayed these vague generic paragraphs instead of the actual Foundry ingredients and relic drop chances.

### Permanent Resolution Protocol
- **Strictly Ban Generic Fallback Text**: No catch-all placeholder paragraphs allowed in `acquisitionInfo.js` or `AcquisitionDrawer.jsx`.
- If an item is unclassified, return empty sources `{ sources: [], recipe: null }` and let the UI render the native verified components or wiki link cleanly.

---

## 3. ReferenceErrors / Undefined Variables Crashing the UI
* **Frequency**: 12+ occurrences
* **User Symptom**: Blank white screen or broken screen component with browser console errors:
  - `[Error] ReferenceError: Can't find variable: fetchBounties`
  - `[Error] ReferenceError: mulberry32 is not defined`
  - `[Error] ReferenceError: resolveHoldfastsGiver is not defined`

### Root Cause
1. Quick edits refactored functions (e.g. moving `fetchBounties` to a context or adding `mulberry32` PRNG for bounty rotations) without ensuring all JSX click handlers or module exports were in scope.
2. The manual build script previously lacked an automated AST static analyzer to catch unreferenced variables before packaging the AppImage.

### Permanent Resolution Protocol
- **Automated AST Audit in Build Pipeline**:
  `scripts/audit_static.js` runs Babel/ESLint AST traversals across all 19 screens and 6 overlays before any compilation or AppImage build.
- Any undefined variable or unhandled reference aborts the build with exit code 1 immediately.

---

## 4. Dashboard Bounties Missing or Incorrect Rotations
* **Frequency**: 6+ occurrences
* **User Symptom**: Dashboard "Bounties" card renders "No active bounties" or shows incorrect mission challenges for Cetus, Fortuna, Deimos, Zariman, Cavia, and Höllvania (1999).

### Root Cause
1. **DE WorldState Asymmetry**:
   - Digital Extremes `worldState.php` sends live `Jobs` arrays for `CetusSyndicate`, `SolarisSyndicate`, and `EntratiSyndicate`.
   - However, for `ZarimanSyndicate`, `EntratiLabSyndicate`, and `HexSyndicate`, DE sends `Jobs: []` with a deterministic PRNG `Seed` (e.g. `Seed: 61322`).
2. If the parser only read `sm.Jobs`, the Zariman, Cavia, and Hex tabs were completely blank.
3. The Dashboard previously defaulted to the `holdfasts` (Zariman) tab on load, causing the entire card to appear empty on startup.

### Permanent Resolution Protocol
- In `src/lib/worldstateParser.js`, `parseBounties()` checks for live jobs; if empty, it executes the Mulberry32 PRNG seed rotation using `ExportRegions.json` and `ExportChallenges.json`.
- Default `bountyTab` in `Dashboard.jsx` is set to `'cetus'` (which always has live jobs in DE WorldState).

---

## 5. Checklist Auto-Tracking Not Marking Tasks Completed
* **Frequency**: 10+ occurrences
* **User Symptom**: Daily/Weekly recurring tasks (e.g. *Sorties, Archon Hunts, Netracells, EDA, Steel Path Incursions, Syndicate Standing, Clem Weekly*) remain unchecked even after the player completes them in-game.

### Root Cause
1. **Inventory Timestamp Schema Mismatch**:
   - DE saves timestamps in `inventory.json` in varying formats:
     - ISO string: `"2026-08-23T12:00:00Z"`
     - Direct epoch integer: `1787520000`
     - BSON format: `{"": {"": "1787520000000"}}`
     - Object with ``: `{"": 1787520000}`
2. The checklist completion checker used a flat `Date.parse()` on the outer object, which returned `NaN` for BSON objects, preventing task completion from triggering.
3. Certain weekly missions (like Netracells and Archimedea) are stored under `PeriodicMissionCompletions` or `WeeklyRaidCompletions` rather than standard quest flags.

### Permanent Resolution Protocol
- Use the recursive timestamp extractor `extractEpoch()` in `src/screens/Checklist.jsx`.
- Query both `inventory.MissionCompletions` and `inventory.PeriodicMissionCompletions`.

---

## 6. AppImage Rebuild Locking ("Text file busy" / ETXTBSY)
* **Frequency**: 15+ occurrences
* **User Symptom**: Running `rebuild-appimage.sh` failed with `cp: cannot create regular file '/home/jedwards/AppImages/kiedas_orbiter.appimage': Text file busy`.

### Root Cause
- On Linux, copying directly over an actively running binary executable (`cp source target`) fails with `ETXTBSY` because the file's inode is locked by the OS loader.

### Permanent Resolution Protocol
- In `scripts/rebuild-appimage.sh`, always unlink the destination before copying:
  ```bash
  cp --remove-destination "" ""
  # or
  install -m 755 "" ""
  ```
- All build processes MUST strictly respect the hardware protection rule:
  ```bash
  export CARGO_BUILD_JOBS=4
  nice -n 19 bash scripts/rebuild-appimage.sh
  ```

---

## 7. Missing Icons, Character Portraits, and Artwork (e.g. Deathblossom)
* **Frequency**: 13+ occurrences
* **User Symptom**: Mini-map icons, Syndicate bounty portraits (*Konzu, Eudico, Mother, Quinn, Fibonacci, The Hex*), and certain abilities/upgrades (*Deathblossom*, Operator Focus icons) showed broken image glyphs or disappeared.

### Root Cause
1. Mini-map icon filenames in DE exports are prefixed (e.g. `MiniMapBountySource.png`, `MiniMapZariman.png`), whereas some components requested `BountySource.png`.
2. Character portraits for Zariman/Cavia were using dynamic naming that didn't match the on-disk asset files.
3. Missing or failing `resolveAnyImage()` fallbacks for unindexed weapon skins or special avatar animations.

### Permanent Resolution Protocol
- All bounty tabs now use verified, on-disk character portraits:
  - `BountyKonzu.png`, `BountyEudico.png`, `BountyTheBusiness.png`, `BountyMother.png`, `BountyOtak.png`, `BountyQuinn.png`, `BountyFibonacci.png`, `BountyTechrot.png`.
- Icons are indexed in `src/lib/iconMap.js` and verified by `scripts/audit_e2e.js`.

---

## 8. Orokin Cell Blueprint Incorrectly Presented as an Enemy Drop
* **Frequency**: Reported again during live Preview verification on 2026-10-01.
* **User Symptom**: Farming Targets presents **Orokin Cell Blueprint** as an enemy drop. This is incorrect: enemy sources award the complete **Orokin Cell** resource. The blueprint is a Market purchase for 100 Platinum and must not be presented as a farmable enemy drop.

### Current Evidence
1. `tests/farming/ledgerImages.test.mjs` already verifies the farming ledger contains `Orokin Cell` and never an `Orokin Cell Blueprint` Foundry row.
2. The remaining defect is therefore not the ledger requirement expansion covered by that test. It is in the acquisition/source presentation path, which still exposes the incorrect blueprint/drop relationship during live use.

### Required Resolution Protocol
- Trace the live Farming Targets acquisition/source rendering path from the selected Orokin Cell target through its drawer/source rows.
- Preserve only verified enemy-drop sources for the complete `Orokin Cell` resource.
- Represent the 100-Platinum Market blueprint, if shown, as a separate non-farmable purchase source; never as an enemy drop.
- Add a focused regression test that exercises the same presentation/source path as the live screen, not only the ledger model.
- Do not mark this issue resolved until it is rechecked in the deployed Preview AppImage.

### Addendum 2026-10-03: NOT fully fixed (user screenshot of the Orokin Cell drawer)
* **User Symptom**: Orokin Cell drawer (BLUEPRINT + COMPONENTS), "Crafting requirements": Build 15,000 Credits, 1h, Rush 2 Platinum, then "1x Blueprint: Saturn, Ceres, and Deimos missions - Planetary enemy drops, Cell Array deposits, and Boss drops (General Sargas Ruk, Lieutenant Lech Kril, Stalker)." That is where the resource drops, shown as where the blueprint comes from. "Where to start" also features "Level 40 - 60 Orb Vallis Bounty" first, among 136 sources.
* **Root cause (verified)**: `src/lib/acquisitionData.js` ~line 4356 has an entry `"orokin cell"` in the Warframe/weapon acquisitions table whose `general` AND `blueprint` fields are the resource's drop text. `resolveBlueprintOrigin` (~14919) step 2 returns `Blueprint: <that text>` for any name in that table, and `PreviewAcquisitionDrawer.jsx` (~lines 92, 246-258) prints it in the "1x Blueprint" row. The earlier fix only covered the phantom keys in `dropsParser.js`, not this path.
* **Real data (user's export, ExportRecipes)**: `/Lotus/Types/Recipes/Components/OrokinCellResourceBlueprint` builds Orokin Cell: 15,000 credits, 1 hour, 100 Platinum market price, ingredients 50,000 Alloy Plate, 50,000 Nano Spores, 25,000 Salvage.
* **Required Resolution Protocol**: the Blueprint row for Orokin Cell must say it is a 100 Platinum Market purchase (from the recipe's `platinumCost`), not the enemy drop text; keep the drops only under the resource's own sources. Check whether other resources with a recipe have the same wrong `blueprint` field in that table (search every entry whose key is a resource name), fix at the table or in `resolveBlueprintOrigin`, add a test through the drawer path with the real export, and recheck in the app. This also overlaps item 36 (same row) and item 38 (resource data); do them together.

---

## 9. Prime Part Acquisition Drawers Repeat Relics Without Refinement Context
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: Acquisition drawers for Prime blueprints and Prime weapon/frame parts repeatedly list the same relic, often with different percentages. Citrine Prime Blueprint is one confirmed example: **Meso C11** appears five times. The repeated entries are not explained, so the display reads as contradictory duplicate data rather than distinct relic-refinement chances.

### Current Evidence
1. The live drawer presents five Meso C11 rows with differing percentages for the same Citrine Prime Blueprint acquisition.
2. The same repeated-relic pattern has been observed across Prime-part acquisition drawers, not only Citrine Prime.
3. The most likely interpretation is that the rows correspond to the base relic plus its four Void Relic refinement levels, but the app does not label that distinction.
4. This interpretation must be verified against the authoritative DE relic reward/refinement data before implementation; do not collapse or relabel rows based on an assumption.

### Required Resolution Protocol
- Trace the shared acquisition drawer relic-source aggregation for multiple Prime parts, including Citrine Prime Blueprint and Meso C11.
- Verify whether each row corresponds to an intact or refined relic state using DE PublicExport data.
- If so, present one clearly grouped Meso C11 source with explicit refinement labels and their verified reward chances (for example: Intact, Exceptional, Flawless, Radiant), rather than ambiguous duplicate relic names.
- If the rows are not refinement variants, identify the distinct source keys and display the differentiating data.
- Add regression coverage for multiple Prime-part acquisition presentations and recheck them in the deployed Preview AppImage.

### Update 2026-10-02 (evening): only half fixed, second path still shows duplicates
* **User check (screenshot of Acceltra Prime Barrel, "Crafting requirements")**: the same relic still appears several times, with different tiers and percentages (for example `Lith A11 (Uncommon) 10.0%` and `Lith A11 (Rare) 6.0%`).
* **What the 2026-10-02 fix covered**: the top-level sources returned by `getAcquisitionInfo` (verified on real data: Acceltra Prime shows 9 relic rows for 9 distinct relics; Citrine Prime Blueprint and Ash Prime Chassis tests pass).
* **What it missed**: the "Crafting requirements" section builds each ingredient's relic list separately. `AcquisitionDrawer.jsx:318` calls `getDropSourcesWithFallback(ingredient.itemType, dropIndex, ingredient.name)` straight on the raw drop index and `PreviewAcquisitionDrawer.jsx` (around lines 240-260) does the same, so none of the new dedupe, tier-only labelling or percentage removal applies there. The raw rows still carry one row per refinement, each with its own rarity label and chance (and DE labels the Radiant row "Uncommon (10%)" while the lower refinements are "Rare"), which is why the tiers look contradictory.
* **Root cause class**: two code paths build the same relic list (same lesson as the duplicated `ExportRelics` readers, R2). The earlier test only exercised one of them.
* **Required resolution**: move the per-relic dedupe and tier labelling into one shared helper used by the top-level sources, the Crafting requirements ingredient rows, and the Foundry/farming consumers; test the ingredient path for Acceltra Prime Barrel and at least one other part, in both drawers; recheck in the deployed app.

### Addendum 2026-10-03: NOT fixed on Prime Warframe drawers (user screenshot of the Ash Prime drawer)
* **User Symptom**: Ash Prime drawer, "Crafting requirements", "1x Ash Prime Neuroptics" lists "Axi N2 Relic (Radiant) - Ash Prime Neuroptics Blueprint 20.0%", "Meso N2 Relic (Radiant) ... 20.0%", then "(Flawless) ... 17.0%": refinement levels, percentages and a repeated relic. The Chassis check from the earlier fix passed, so this is the Warframe-recipe path.
* **Cause (partly verified)**: `buildIngredientSourceRows` only collapses refinements on sources whose `type === 'relic'`. In the bundled item data (`wfcd-combined.json`) the Ash Prime Neuroptics component has 32 drop rows such as location "Axi N2 Relic" and Chassis/Systems rows such as "Axi B1 Relic (Radiant)" with chances 16.67 and 10; those rows are plain drops, not typed relics, so they pass through unchanged (`PreviewAcquisitionDrawer.jsx` ~line 254 passes `getItemDrops(...)` as the fallback). In my real-data probe the live drop lookup by ingredient name returned nothing for the Ash Prime parts, so the fallback rows are what is shown. I have NOT yet traced it inside the running app.
* **Required Resolution Protocol**: treat any drop whose location/name is a relic (with or without a refinement suffix) as a relic source in the normalizer, so each relic shows once with its Common/Uncommon/Rare tier from ExportRelics; fix for all Prime Warframe, weapon and companion drawers; test with the real export on Ash Prime, Citrine Prime and one weapon through the same drawer path; recheck in the app. Same code area as items 36 and 8.

---

## 10. Farming Source Summaries Claim Additional Sources Missing From Their Drawers
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: In *Where to Start*, affected items show an available-source summary ending in `+N more`, but opening the acquisition drawer does not show those additional sources. Voidgel Orb is one confirmed example, and the same mismatch has been observed on other farming targets.

### Current Evidence
1. Voidgel Orb displays a source summary with `+5 more`.
2. The corresponding drawer does not contain those additional five source rows.
3. The recurrence across multiple items indicates a shared summary-versus-drawer filtering or rendering problem, not necessarily a Voidgel Orb data problem.

### Required Resolution Protocol
- Trace the shared source-summary and acquisition-drawer filtering paths.
- Ensure the `+N more` count is calculated from sources that the drawer can actually render.
- If sources are intentionally hidden, provide a working expansion or pagination control.
- Add a regression test for Voidgel Orb and at least one other affected item, comparing the summary count with the drawer's rendered source set.
- Recheck the behavior in the deployed Preview AppImage.

---

## 11. Salvage Acquisition Is Incorrectly Restricted to Conclave
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: The Salvage acquisition drawer says Salvage is available only in Conclave. This is false and produces an incomplete, misleading source list.

### Required Resolution Protocol
- Trace Salvage's acquisition/source classification and identify why non-Conclave sources are filtered out.
- Verify the complete source set against official DE data and the official Warframe Wiki.
- Keep Conclave as a source only where verified, but do not present it as the exclusive source.
- Add a regression test that asserts Salvage includes its verified non-Conclave sources.
- Recheck the acquisition drawer in the deployed Preview AppImage.

---

## 12. Foundry Drawer Does Not Close When Clicking Outside
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: The Foundry tab's open drawer closes only when its close button is clicked. Clicking outside the drawer does not dismiss it, unlike drawers on other tabs.

### Required Resolution Protocol
- Compare the Foundry drawer's dismissal handling with the shared behavior used by the other tab drawers.
- Restore outside-click dismissal without treating clicks inside the drawer or on its trigger as outside clicks.
- Preserve the explicit close button and Escape-key behavior.
- Add a focused interaction regression test for outside-click dismissal.
- Recheck the behavior in the deployed Preview AppImage.

---

## 13. Titan Extractor Prime Set and Distilling Extractor Prime Set Have Missing Artwork
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: Inventory cards for **Titan Extractor Prime Set** and **Distilling Extractor Prime Set** show `IMAGE UNAVAILABLE` for the set artwork and their blueprint sections.

### Current Evidence
1. The live Inventory screenshot shows both Prime Set cards without artwork.
2. The previous image audit reported zero missing catalog entries, so inventory Prime Set variants are not fully covered by the audit or shared image-resolution mapping.

### Required Resolution Protocol
- Resolve verified official artwork for both Prime Sets and their blueprint entries.
- Extend the image audit to include inventory-renderable Prime Set variants and blueprint cards.
- Add regression coverage for both affected Prime Sets.
- Recheck the actual artwork in the deployed Preview AppImage; a generic placeholder does not resolve this issue.

---

## 14. New UI Strings Are Never Translated (Whole App, All 14 Non-English Locales)
* **Frequency**: Recurring. First found in the 2026-09-16 full-app locale audit (184 + 39 + 43 keys missing in all 14 locales, then translated by hand); reported again on 2026-10-01 (Farming Targets, Circuit, Riven prompt, Relic Picker) and 2026-10-02 (Farming Targets still fully English in German). Replaces the earlier Farming Targets-only wording of this item.
* **User Symptom**: With German (or any other language) selected, anything added recently shows English: the whole Farming Targets screen, most of Foundry's new text, and other new labels. "Anything that was written by the agents is never translated." Related raw-key symptoms are items 16, 18, 19, 20 and 24.

### Current Evidence (measured 2026-10-02 on `preview/stage4`)
1. `en.json` has 1,498 `ui` keys. **Every one of the 14 other locales is missing the same 104 keys**: Farming Targets 77 (of its 78 strings, 0 translated in any locale; the 78th is an English copy), Foundry 18, `ui` 3, `preview` 3, `settings` 2, `nav` 1.
2. On top of the missing keys, many existing strings are identical to the English text (some deliberately, such as proper nouns, many not): de 212, es 174, fr 210, it 191, ja 85, ko 103, pl 162, pt 181, ru 73, tc 227, th 158, tr 177, uk 97, zh 108. Untranslated total for German: 316 of 1,498 (21%).
3. The Farming Targets screen code is correct: it has no hardcoded English in JSX and every string goes through `t()`. The gap is missing translation content, not wiring.
4. `UiContext.jsx` merges English under every locale (`{ ...en.ui, ...locale.ui }`), so a missing key silently shows English instead of failing. Nothing detects it.
5. The Riven prompt overlay strings ("RIVEN GRADING READY", "Press", "to grade your Rivens", the hint and the hotkey-missing text) and `ui.riven_overlay.scanning` are English in `de.json`, and were English in the old tree as well. The earlier fix (`042070c1`) only repaired raw keys; the values were never translated. Reported 2026-10-02 ("Riven overlay still does not translate").

### Root Cause
- New strings are added to `en.json` only. No step requires translating them, no test fails when a locale lacks a key, and the English fallback hides the gap in normal use.
- `scripts/i18n-audit.mjs` only finds hardcoded English in JSX; it never compares locale files, and nothing runs it automatically.
- The 2026-09-16 audit's lesson (translate every new key into all 14 locales; check with a key and `{placeholder}` diff) was recorded only in memory under a different project path, which is not loaded in this project, so later work (including agent briefs on 2026-10-02 that explicitly said not to translate) repeated the mistake.

### Required Resolution Protocol
- **Rule**: every new or changed UI string is translated into all 14 non-English locales in the same change. English-only keys are not accepted. Put this rule in every agent brief.
- **Enforcement test**: fail if any English `ui` key is missing from any locale, or if `{placeholders}` differ between English and a locale. Keep a small explicit allowlist for strings that must stay identical (proper nouns, brand names). Make the test part of the standard suite.
- **Backfill**: translate the 104 missing keys into all 14 locales (all languages, one pass). Game terms must use the official Digital Extremes localization from the project's language data; if no official term exists keep the English term; never invent names.
- **Triage**: review the strings that are identical to English per locale (list above) and separate deliberate ones from untranslated ones; translate the rest.
- **Verify**: render the Farming Targets and Foundry screens in German and one other language and assert no English from the affected key sets; recheck in the deployed Preview AppImage.
- Cross-check stale-closure translation failures (item 24) while doing this.

---

## 15. Inventory Scroll Container Overscrolls Into Empty Space
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: The Inventory scrollbar can scroll above or below the rendered inventory content into empty space. The last inventory row does not align with the effective bottom of the scrollable content.

### Investigation 2026-10-02 (cause still NOT proven)
* **Verified in code**: the Inventory list is virtualized with FIXED row heights. `src/screens/Inventory.jsx` lines 38-57 define `SETS_ROW_STRIDE = 320`, `AYATAN_ROW_STRIDE = 144`, `LIST_ROW_STRIDE = 58`, `ARCANE_ROW_STRIDE` and `GENERAL_CARD_HEIGHT = 168` / `GENERAL_ROW_STRIDE = 184`. The virtual root height is `rowCount * rowStride` and each window is placed at `top: firstRow * rowStride` (lines ~1227, 1381, 1451, 787-788). The calibration step (lines ~657-766) only corrects the scroll base offset and the column count; it never measures a rendered row. So any difference between a real card's height and the constant makes the scroll range wrong, and the error grows with the number of rows. This matches the symptom, but the actual amount of drift is unmeasured.
* **Unproven claims from an Antigravity report (do not rely on them)**: real general cards render at "about 180 px instead of 184 px", and the `pb-4` bottom padding is "consumed" by the fixed height. Both were derived from class names, not from measurement.
* **Earlier attempt**: an old agent worktree (`agent/inv-scroll`) only added `container.style.overflowAnchor = 'none'` (scroll-anchoring stutter). That change is already in the main tree (`Inventory.jsx` ~664-665) and does not address the range.
* **Measurement the user can do (about two minutes)**: in the running app open the developer tools, select one rendered general inventory card and read its `offsetHeight`; select the grid wrapper holding the cards and read its computed `row-gap`; the real row stride is `offsetHeight + row-gap`. Compare with 184 (general cards), 320 (Prime sets) and 144 (Ayatan). Do the same for the tab where the empty space appears.
* **Likely fix once measured**: derive the stride from a measured row (or force the card height to the constant) instead of a hardcoded number, with a pure function for the stride and a test.

### Required Resolution Protocol
- Trace the Inventory scroll container, list sizing, bottom padding, and any virtualization or spacer calculations.
- Ensure the scroll range ends at the actual rendered content rather than an oversized container or stale measured height.
- Preserve the scrollbar behavior already fixed on other screens.
- Add a regression test for the Inventory scroll boundary and recheck it in the deployed Preview AppImage.

---

## 16. The Circuit Title Is Not Localized
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: With German selected, the game-mode card still displays **THE CIRCUIT** in English. The official German display name must be verified rather than assumed.

### Required Resolution Protocol
- Verify the official localized name from an allowed primary source or the project's established localization data.
- Route the Circuit title through the locale-aware localization path used by other game-mode names.
- Add a German localization regression check for the Circuit card, with a fallback-locale check as appropriate.
- Recheck the result in the deployed Preview AppImage.

---

## 17. Riven Overlay Does Not Appear
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: The Riven overlay does not appear at all when it should be opened.

### Required Resolution Protocol
- Trace the Riven overlay trigger, state transition, conditional rendering, and overlay registration path.
- Determine whether the failure occurs before the open action, during overlay mounting, or because the overlay is rendered behind another layer.
- Restore the overlay without disrupting other overlay behavior, focus handling, or outside-click dismissal.
- Add a focused regression test that verifies the Riven overlay opens from its intended trigger.
- Recheck the open, close, and interaction behavior in the deployed Preview AppImage.

---

## 18. Riven Trigger Displays an Internal, Unlocalized Action Key
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: The Riven trigger's action title displays the internal key `settings.hotkey_action_grade_rivens` instead of a readable localized label. The trigger title is therefore confusing and remains untranslated when German is selected.

### Required Resolution Protocol
- Replace the internal key display with a user-facing label resolved through the shared localization system.
- Verify the wording and German translation against the project's established localization data; do not expose translation keys in the UI.
- Add a localization regression test for the Riven trigger in German and the fallback locale.
- Recheck the trigger title and its relationship to the Riven overlay in the deployed Preview AppImage.

### Addendum 2026-10-03: the hotkey label is still English in a non-English language (user report)
* **User Symptom**: Settings > Hotkeys reads "Grade Rivens" in English, and also "Grade Rivens" (English) when the app is in another language.
* **Cause (verified)**: `ui.settings.hotkey_action_grade_rivens` is translated in 13 locales (es "Evaluar Rivens", fr "Evaluer les Rivens", ja, ko, it, pl, pt, ru, tc, th, tr, uk, zh) but **de.json still holds the English text "Grade Rivens"**. The German translation pass (commit 8ad7f108) allowed it because `tests/fixtures/i18n-identical-baseline.json` lists it as an accepted English-identical string for de. The user's report does not say which language, so if it also happens in another language, that is a different cause and I need the language name.
* **Wider scope (measured)**: that baseline file accepts 1,900 English-identical UI strings across the 14 locales (de 214, tc 216, fr 209, it 186, pt 177, tr 172, es 170, pl 154, th 147, zh 97, ko 92, uk 91, ja 74, ru 67). Many are legitimate (game proper names, Discord, GitHub), but nobody has audited the list, so every language can still contain English UI text that the tests deliberately ignore. This is the real reason item 14 could not be fully proven.
* **Required Resolution Protocol (proposal)**: (1) translate "Grade Rivens" into German ("Rivens bewerten", consistent with the app's other German riven wording; a real German string, checked in the German riven screens); (2) audit the 1,900 baseline entries per language, translating the ones that are real UI text and keeping only game names/brands, with a short reason list in the allowlist; (3) shrink the baseline in the tests so a new English-only string cannot hide; (4) recheck in the deployed app in at least German plus one other language. Delegated per the translation rules (Codex, one language group at a time), with real-text checks after each.

---

## 19. Relic Picker Overlay Is Only Partially Localized
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: With German selected, the Relic Picker overlay is mixed-language. Its shell is partly translated, but grid content still uses English strings such as `Relic`, `Unknown Relic`, and `PART`/`PARTS`.

### Required Resolution Protocol
- Trace every user-facing string in the Relic Picker overlay, including table headings, relic labels, unavailable-relic labels, and singular/plural part counts.
- Route all non-proper-name strings through the shared localization system, including pluralization.
- Do not translate canonical relic era/name identifiers unless official locale data provides localized display values.
- Add a German localization regression check for populated, unavailable, and singular/plural part-count grid states.
- Recheck the complete overlay in the deployed Preview AppImage.

---

## 20. Relic Planner Shows Unresolved "Unknown Relic" Entries
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: In German, the Relic Planner tab displays recommendation cards with internal identifiers such as `Lith CitrinePrimeD`, `Meso CitrinePrimeB`, `Neo CitrinePrimeA`, and `Axi CitrinePrimeB`. The same records resolve correctly in English to normal names such as `Meso V17`, `Lith C15`, `Neo C10`, and `Axi C12`, proving that the underlying relic records are present and that the failure is locale-dependent name resolution.

### Required Resolution Protocol
- Trace the Relic Planner recommendation data and locale selection from its source catalog through relic-name normalization and display formatting.
- Identify why the German path falls back to internal identifiers while the English path resolves the same records to canonical relic names.
- Resolve localized display names through the established locale-aware catalog path; do not replace valid relic names with internal identifiers or invent translated names.
- If a localized name is unavailable, preserve the canonical relic identifier as a safe fallback rather than displaying a misleading internal Prime-part token.
- Add regression coverage for the affected Lith, Meso, Neo, and Axi entries and verify the Relic Planner tab in the deployed Preview AppImage.

---

## 21. Relic Reward Overlay Does Not Show Blueprint Copy Counts
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: During a relic mission, the reward overlay did not show that the account had two copies of **Euphona Prime Blueprint**. The overlay's logged payload reported `blueprintCount: 2` and `stock: 2`, but the visible ownership/mastery indicators do not communicate the blueprint quantity.

### Current Evidence
1. The 2026-10-01 overlay log identifies Euphona Prime Blueprint as reward slot 2.
2. The same payload records two blueprint copies while setting `isOwned: false` and `isMastered: false`.
3. `isOwned` and `isMastered` appear to describe the completed item, not blueprint inventory, but the reward card does not present the separate blueprint count.

### Required Resolution Protocol
- Trace the reward overlay presentation for Prime blueprints and distinguish blueprint count from completed-item ownership and mastery.
- Display the account's blueprint quantity when it is greater than zero, while retaining separate completed-item ownership/mastery information if useful.
- Add regression coverage using an account state with blueprint copies but no completed weapon.
- Recheck the Euphona Prime Blueprint reward card in the deployed Preview AppImage.

---

## 22. Relic Picker Overlay Has a Large Unexplained Empty Region
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: The Relic Picker overlay opens as an oversized dark panel with a large empty area above its recommendation columns. The recommendations are pushed far down the window without a title, mission context, or other content explaining the unused space.

### Required Resolution Protocol
- Trace the Relic Picker overlay window dimensions, root layout sizing, and vertical alignment for the known-era recommendation view.
- Remove the excessive blank region and size or vertically align the recommendation content consistently with the overlay's intended presentation.
- Preserve readability of all three recommendation columns at the game's supported resolutions.
- Add a visual/layout regression check for the known-era view and recheck it in the deployed Preview AppImage.

---

## 23. Relic Reward Overlay Shows "UNRECOGNIZED" For A Valid Prime Part
* **Frequency**: Reported during live Preview verification on 2026-10-02.
* **User Symptom**: During a relic mission the first reward card (Sevagoth Prime Neuroptics Blueprint) showed "UNRECOGNIZED / NeuropticsBlueprint" while the other three cards matched.

### Root Cause
1. App log: `[OCR] Slot 1 cleaned: "Sevagoth prime NeuropticsBlueprint" -> "NeuropticsBlueprint"`. OCR read "Prime" in lowercase and lost the space before "Blueprint".
2. `src-tauri/src/ocr.rs` `clean_ocr_output` accepted a leading token only if the next token also started with a capital, so "Sevagoth" and "prime" were discarded.
3. The candidate pool (`getAllRelicRewards`) already contained "Sevagoth Prime Neuroptics Blueprint" under that exact name, so no data change was needed.

### Resolution
- `clean_ocr_output` now keeps following alphabetic words regardless of case and only drops real junk. The helpers were hoisted to module level so they can be unit-tested. Rust unit tests (`ocr::tests`, 3) and a real-data JS test (`tests/relics/rivenOcrMatch.test.mjs`) cover it; a truncated "NeuropticsBlueprint" alone still stays unmatched (no fabrication).
- Not yet confirmed in a live relic mission.

---

## 24. Scanner "Hooked" Toast Shows Raw Translation Keys
* **Frequency**: Reported again during live Preview verification on 2026-10-02 (recurrence of an earlier i18n stale-closure bug).
* **User Symptom**: The top-right toast that appears when the scanner latches onto Warframe shows `APP.SCANNER_TITLE` and `app.scanner_hooked_message` instead of the translated title and message.

### Current Evidence
1. `src/App.jsx` registers the `scanner-hooked` listener in a `useEffect` with an empty dependency list (`[]`, lines ~274-285) and calls `t('app.scanner_title')` and `t('app.scanner_hooked_message')` inside the callback.
2. `UiContext.jsx` starts with `ui: {}` and loads the locale asynchronously; `t` changes identity when the data arrives, but the listener keeps the `t` it captured on the first render, so it returns the raw key.
3. Both keys exist under `ui` in all 15 locale files, so this is not a missing-translation problem.
4. A heuristic scan for effects that call `t()` inside event/async callbacks without `t` in their dependencies found one more candidate: `src/screens/Maps.jsx` (~line 144, deps `duviriCycle`). Not confirmed as a visible bug; the scan can miss other closure patterns.

### Required Resolution Protocol
- Make the `scanner-hooked` listener always use the latest `t` (a ref updated every render, or `t` in the effect dependencies with correct listener cleanup).
- Check `Maps.jsx` and any other callback that reads `t` after an await, timer or event.
- Add a test that fires the event before the locale data has loaded and after, and asserts the translated string (never a raw key); it must fail on the current code.
- Recheck the toast in the deployed Preview AppImage in English and one other language.

---

## 25. Riven Prompt Banner Disappears When The Grading Hotkey Is Pressed (Regression)
* **Frequency**: Reported 2026-10-02 against the build deployed at 20:18. User: "we had fixed this in the past but now it does it again."
* **User Symptom**: Pressing Shift+C (the Riven grading hotkey) makes the "press hotkey to grade" banner disappear. The user wants it to stay up for the whole riven-screen session.
* **Root Cause (proven)**: `src/components/overlays/RivenPromptOverlay.jsx` in Preview still hides the banner on `riven-grade-activate`, which fires the moment the hotkey is pressed (`main.rs` `grade_rivens` emits `riven-grade-armed` and `riven-grade-activate`). The fix was committed only in the OLD root repo as `a92b5311` ("keep prompt banner up"); its message records: "Confirmed live 2026-09-27: you want the reminder banner to stay up for the whole riven-screen session ... only riven-screen-closed should hide it". That repo is not the one the app is built from, and the commit is not in Preview's history (`git merge-base` reports the hash as not a valid object in the Preview repo).
* **Required Resolution Protocol**: port the behavior (remove the `riven-grade-activate` hide, keep `riven-screen-closed` as the only hide); add a test that the banner stays visible after the hotkey event and hides on screen close; recheck in the deployed app. See also 29.

---

## 26. Riven Overlay Stuck Visible Outside The Riven Screen
* **Frequency**: Reported 2026-10-02 ("the riven overlay is now up on my monitor when not in the riven screen ... right now"). Item 17 (overlay opens then closes instantly) is the same family.
* **Evidence (app log 2026-10-02)**:
  - 20:44:34 `Riven reroll screen opened (LogTS: 12765.373s)`; 20:44:38 `overlays closed (ClearAgents) (LogTS: 12769.161s)`.
  - 20:45:39 `Riven reroll screen opened (LogTS: 12765.373s)`: the SAME game timestamp as the first open, processed again about 65 seconds later, after the real close. Nothing closes it afterwards, so the overlay stays up.
  - Earlier evidence from 2026-10-01 shows the same replay (a stale ClearAgents with an older LogTS processed right after an open).
* **Mechanism (partly proven)**: `log_scanner.rs` re-parses the game's circular log buffer on every poll and skips lines already seen by hashing each line. Anything that makes an old line look new (for example the seen-set reset at `SEEN_RESET_THRESHOLD = 16_384`, a re-hook, or a line changed by the ring buffer overwriting it) replays old state transitions out of order. Which of these occurs here is NOT proven.
* **Why the 2026-10-02 fix did not cover it**: the stale-close guard (merged for item 17) ignores a close older than the last open. It does nothing for a replayed OPEN, which is what happened here.
* **Required Resolution Protocol**: add a monotonic LogTS guard for all riven state-machine transitions (ignore any trigger line older than the newest riven event already processed; reset it when the Warframe process or hook restarts); show the overlay only while the screen state is genuinely open; add a unit test with the 20:44-20:45 sequence; investigate which condition replays lines; recheck in the deployed app. Also consider whether the overlay should hide when Warframe loses focus.

---

## 27. Riven Grader Runs On Every Roll After One Hotkey Press (Needs A Decision)
* **Frequency**: Reported 2026-10-02: "it's now auto doing the roll grader when I click to do a roll ... it's supposed to only activate on my input."
* **Evidence**: app log: `Riven reroll screen opened 20:40:25`, Riven OCR at 20:40:30 (hotkey arming not logged), `reroll confirmed 20:41:19` then OCR at 20:41:24, `new selection confirmed 20:42:16` then OCR at 20:42:19, `reroll confirmed 20:42:21` then OCR at 20:42:26.
* **How the code behaves (both old and new trees)**: `RivenOverlay.jsx` starts disarmed on `riven-screen-open`; the hotkey sets `armedRef = true`; after that, `riven-reroll` (new-card window, 4 s timer) and `riven-reroll-confirmed` (current-card window, 2 s timer) run the OCR automatically until `riven-screen-closed` resets the flag. The old root tree changed card positions but did NOT change arming, so there is no evidence this ever worked per roll.
* **Decision (user, 2026-10-02)**: **each roll needs its own hotkey press to start a new grading.** Reason: the automatic grading fired on timers while the cards were still moving or blurry (and rolls came too fast), so the screenshot could not be read properly and the grades were often wrong. The "one press arms the whole session" behavior is therefore the bug.
* **Required Resolution Protocol**:
  - Make arming single-use: the hotkey arms exactly one grading; after that grading completes (or the roll is accepted, a new roll appears, or the screen closes) the overlay is disarmed again, and the next roll does nothing until the hotkey is pressed.
  - Remove the automatic grading timers for `riven-reroll` (4 s, new-card window), `riven-reroll-confirmed` (2 s, current-card window) and the `riven-linked-open` trigger when not armed, so that nothing starts OCR without a key press.
  - Keep the banner visible between presses (item 25) so the user knows to press again.
  - The user presses when the cards have settled, so the capture should not add its own early timer; if a short settle delay is wanted it must start after the key press, not after the game event.
  - Add a test of the arming state across several rerolls (press, grade, roll, nothing happens, press, grade) and recheck in the deployed app.

---

## 28. Focus Watcher Floods The Log
* **Frequency**: Seen while investigating 26 (2026-10-02).
* **Evidence**: the log has 706 `[FOCUS_WATCHER] transition: focused -> unfocused, hiding overlays` lines in one session, one roughly every 0.52 seconds for long stretches. A transition message should appear once per change, so either the state is not being stored or the message is logged on every poll.
* **Concerns**: log noise that buries real events, and possible aggressive polling and repeated overlay-hide calls (AGENTS.md rule 1 forbids aggressive polling). It may also be related to overlays appearing or disappearing unexpectedly.
* **Root cause (verified in code 2026-10-02, found by an Antigravity read-only investigation and re-checked by hand)**: `src-tauri/src/overlay_utils.rs:1134` logs `transition: focused -> unfocused, hiding overlays` at the top of the `else if !focused_now && was_focused` branch, BEFORE the check `on_our_overlay` (is the active window a window of our own process). When it is, the code sets `was_focused = true`, sleeps 500 ms and `continue`s, so the next loop enters the same branch and logs again, about every 0.52 s, for as long as an app window has focus. No hide is issued on those repeats, so it is log noise plus a window-query every half second, not repeated hiding. Only one watcher thread runs (`FOCUS_WATCHER_RUNNING.swap(true)`).
* **Related finding for item 26**: the same check treats ANY window of the app's own process as "still focused", including the main Orbiter window, not only the overlay windows. So while the user works in the main app window, overlays are never hidden by the focus watcher. This can leave a stale overlay (such as the Riven overlay in item 26) on the monitor. Hypothesis: not yet confirmed as the cause of what the user saw.
* **Required Resolution Protocol**: move the log line below the own-window check so it logs only on a real transition; exempt only the OVERLAY windows (by label), not the main window, from the "still focused" rule if that does not bring back the hide/re-show loop the comment describes; add a pure decision function with unit tests for the focus states; recheck the log and CPU use with Warframe running.

---

## 29. Fixes Made In The Old Root Repo Were Never Ported To Preview (Process)
* **Frequency**: Recurring cause of "fixed but not fixed" since 2026-09-29; behind items 25 and the riven prompt text problem.
* **Fact**: `docs/agent-context/HANDOFF.md` section 5 lists root-repo fixes still to port. As of 2026-10-02 these old-tree commits are not in the Preview app: `a92b5311` (keep riven prompt banner up), `042070c1` (riven prompt raw keys), `4820397f` (riven new-roll overlay scanned the wrong region), `3e479918` (riven two-card side mapping) and others in that table. The 2026-10-02 fix round (items 8-24) did not include this list, which was a planning miss.
* **Required Resolution Protocol**: port each listed commit into the Preview repo, hand-merging conflicts, each with a test and an in-app check; reconcile the HANDOFF table against `git cherry` or equivalent so none are left unaccounted for. Treat any "this was fixed before" report as a prompt to check this list first.

---

## 30. Prime Sets Show "OWNED" When Only A Part Or The Main Blueprint Is Held
* **Frequency**: Reported 2026-10-02. User: primed items say owned when the main blueprint is owned, not when the completed item is owned; "evident in the overlay and in the Prime Sets tab".
* **Root cause (Prime Sets tab, verified)**: `src/screens/Inventory.jsx` ~line 407: `const ownedSet = (parent.owned ?? false) || (set.parts ?? []).some((p) => p.quantity > 0)`. Any held part, including the main Blueprint, marks the whole set OWNED. The code comment calls this deliberate ("ownership is the finished item OR any part held"), but the user's rule is: OWNED means the completed item is owned.
* **Evidence on the user's real inventory (2026-10-02)**: 166 Prime Sets; **62** show OWNED while the finished item is NOT owned, and in **41** of those the held part is the main blueprint (for example Carrier, Garuda, Limbo, Nidus, Nyx, Vauban, Afuris and Akbolto Prime). The Akvasto Prime set in the user's screenshot is NOT one of them: that weapon really is owned and mastered, so its badge was correct.
* **Overlay (not reproduced)**: `getRewardInventoryContext` in `src/lib/relicParser.js` (used by the relic reward overlay) returns the correct values on the real inventory for Nyx, Vauban, Garuda, Carrier and Akbolto Prime (`isOwned: false`, blueprint counted as a blueprint, `craftedCount: 0`). So the overlay's data is right for those; the user saw something wrong in the overlay that I cannot yet match. NEEDED: a screenshot or the name of an overlay card that wrongly says owned.
* **Required Resolution Protocol**: make the Prime Sets OWNED badge reflect only the finished item (`parent.owned`); keep the existing completion ring ("1/2 (50%)") and part indicators for held parts; check every other place that derives ownership from parts (Prime Sets sort/filter, overlay badges, Relic Planner); add a real-data test using the user's inventory shape (set with only the main blueprint held -> not owned); recheck in the deployed app. Related: item 21.

---

## 31. Prime Sets Tab Scrolls Very Slowly (Worst Scrolling Up), Possible Memory Leak
* **Frequency**: Reported 2026-10-02: scrolling through Prime Sets "has already made the app very slow ... it especially hates scrolling back up".
* **Known facts (code, not yet measured)**: the Prime Sets list is virtualized with a FIXED row height (`SETS_ROW_STRIDE = 320`, two columns on wide windows, `Inventory.jsx` ~lines 38, 1227-1233), but each set card has a variable-height parts grid, many images and price lookups; rows are not memoized, so every accepted scroll update re-renders every windowed card (comment at ~line 712). Row height mismatch is also the leading candidate for item 15.
* **Investigation 2026-10-02 (Antigravity, read-only; the top finding re-verified by hand)**:
  * **Verified in code**: `src/screens/Inventory.jsx` lines ~1313-1320, inside the per-card render, run for EVERY part of EVERY windowed Prime Set card on EVERY render: `dropIndex[partNorm]` (raw drop rows, hundreds of rows for a part with relic and mission sources), `sortSourcesByChanceInRotations(partSourcesRaw)` and a dedupe, only to compute `hasPartSources`. Nothing is cached or memoized, and rows are not `React.memo`, while scroll updates the window state about every 50 ms. This is a strong, proven cost per scroll tick (CPU plus allocation and garbage-collection pressure) that grows with the number of cards and parts in the window.
  * **Argues against a true memory leak (from code)**: the scroll effect's cleanup clears its timers and disconnects the observer; `ItemImage` does not create unrevoked object URLs or growing caches; the number of mounted cards is bounded by the overscan window. So "slows down the longer I scroll" is more likely GC pressure than a growing structure, but this is not measured.
  * **Unproven (do not rely on)**: that scrolling UP is worse because prepending grid items invalidates layout, and that `ItemImage` remounting re-decodes images. Both are plausible but not shown.
* **Still unknown**: actual memory growth and frame times; nothing has been profiled in the running app. Measurement for the user: open the developer tools Performance tab, record about 5 seconds of scrolling the Prime Sets tab up and down, look for long scripting blocks in `sortSourcesByChanceInRotations` and for frequent GC; Memory tab, "Allocation instrumentation on timeline" should show a sawtooth, not a rising staircase.
* **Required Resolution Protocol**: measure first (memory and render time while scrolling down then up in the Prime Sets tab; check image/blob caches, event listeners and timers created per scroll tick, `ItemImage` fallbacks); find the cause; fix with a regression guard where possible; recheck in the deployed app. A read-only Antigravity investigation of the code paths is being run first.

---

## 32. Dual-Weapon Prime Sets Omit The Two Base Guns From Their Recipe
* **Frequency**: Reported 2026-10-02: "a bunch of the items that require two base primes, like Aklex Prime, are not showing the two prime guns needed for the recipe. It's saying you just need the link and blueprint."
* **Root cause (verified on real data)**: in `src/lib/inventoryParser.js` ~line 2602 set parts are built from recipe ingredients filtered by `isPrimeComponent` (`PRIME_PART_PATH_RE`, which only accepts part names such as Barrel, Receiver, Link, Blueprint). The dual weapons' recipes use finished single weapons as ingredients, whose paths do not match, so they are dropped: `AklexPrimeBlueprint` = 2x `Weapons/Tenno/Pistols/PrimeLex/PrimeLex` + Aklex Prime Link; `AkvastoPrimeBlueprint` = 2x `PrimeVasto/PrimeVastoPistol` + Link; `AkbroncoPrimeBlueprint` = 2x `Pistol/BroncoPrime` + Link; `AkmagnusPrimeBlueprint` = 2x `PrimeMagnus/PrimeMagnusWeapon` + Link. Only these 4 Prime blueprints have such ingredients in the current export; the other dual Primes (Akarius, Akbolto, Akjagara, Aksomati, Akstiletto) use ordinary parts and are unaffected.
* **Required Resolution Protocol**: include non-resource weapon ingredients as set parts (named from the export, with the correct count of 2 and ownership from the weapon in inventory); show them in the Prime Sets card and any other recipe views that use the same filter (check the Foundry and acquisition drawers); add a real-data test for the four sets; recheck in the deployed app.

---

## 33. Inventory Currency Strip Has A Vertical Scrollbar That Scrolls Into Blank Space
* **Frequency**: Reported 2026-10-03 with a screenshot (Inventory page). This is the old backlog item "Currency scrollbar (needs a fresh look, not stale evidence)". It is NOT item 15 (the item list's scroll range).
* **User Symptom**: The strip with the currency and resource widgets (above the search and filter row) shows a small vertical scrollbar; scrolling it shows only blank space.
* **Root cause (verified in code, not yet measured in the running app)**: `src/components/PreviewInventoryLayout.jsx` wraps the stats row in `<div className="mb-3 overflow-x-auto custom-scrollbar">`. The horizontal scroll is intentional, but in CSS any `overflow-x` other than `visible` makes `overflow-y` compute to `auto` as well. In `src/screens/Inventory.jsx` `renderHeaderStats` (~line 1725) the Forma widget has an absolutely positioned tooltip (`absolute top-full right-0 mt-2 ... opacity-0 invisible group-hover:opacity-100 group-hover:visible`) placed BELOW the widget inside that wrapper. Invisible elements still count toward scrollable overflow, so the wrapper gains a vertical scroll range equal to the hidden tooltip's height. It is the only `top-full` tooltip in `Inventory.jsx`.
* **Status**: a fix was drafted by Codex on branch `agent/b9-strip` (replace the tooltip with the existing portal `Tooltip` from `src/components/UI.jsx`, add `overflow-y-hidden` to the wrapper, scan other screens for the same pattern, add tests). It is NOT merged, built or deployed; it waits for the user's go-ahead.
* **Required Resolution Protocol**: remove the hidden absolute tooltip from the scroll container (portal tooltip), guard the wrapper with `overflow-y-hidden` (never `scrollbar-width`/`scrollbar-color`, see R1), check other `overflow-x-auto` wrappers for the same pattern, add regression tests, and recheck in the deployed app: no vertical scrollbar on the strip, hovering Forma still shows its breakdown. If the scrollbar remains, read `scrollHeight` and `clientHeight` of the wrapper in the developer tools and send both numbers.

---

## 34. Extractors Are Missing From The Inventory, And The Prime Extractors' "How To Obtain" Does Not Match The Wiki
* **Frequency**: Reported 2026-10-03 with screenshots of the Titan Extractor Prime drawer and the wiki page for the Extractors ("it did get fixed [artwork, item 13] but actually showed another bug"). Two defects.
* **Defect A: the extractors do not exist in the Inventory.** The player's raw `inventory.json` has a `Drones` list that holds an OWNED Distilling Extractor (`/Lotus/Types/Ship/BasicUcResourceDrone`, 142 HP). `src/lib/inventoryParser.js` and `src/screens/Inventory.jsx` contain no handling of drones/extractors at all (no match for "Drone" or "Extractor" outside the Prime Set artwork code), so an owned extractor and all four extractor items (Titan Extractor `BasicResourceDrone`, Titan Extractor Prime `AdvancedResourceDrone`, Distilling Extractor `BasicUcResourceDrone`, Distilling Extractor Prime `AdvancedUcResourceDrone`) are never listed. This violates the standing rule that the Inventory is the full catalog (owned and unowned, ownership marked). Only the Prime ones appear, indirectly, as "Titan/Distilling Extractor Prime Set" cards. Related: item 13.
* **Defect B: acquisition text differs from the wiki (verified on real data, wiki quoted from the user's screenshot of wiki.warframe.com).**
  * Titan Extractor Prime: the drawer lists ONE source, `Sold as part of the "Ember & Frost Prime Dual Pack" Market bundle.` (from the DE bundle index). The wiki lists several: first available through Ember Prime Access (Blaze and Inferno levels); returned as part of the Prime Vault (Dec 8, 2015 to Jan 5, 2016); Vanguard Prime Resurgence Part 1 for 1 Regal Aya (until Jan 15, 2026, a date-limited statement); and the Ember Prime Pack, Frost Prime Pack and Ember & Frost Prime Dual Pack.
  * Distilling Extractor Prime: the drawer lists ONE source, `Sold as part of the "Distilling Extractor Prime" Market bundle.` (the bundle is named after the item itself, so it explains nothing). The wiki lists Rhino Prime Access (Stomp) and its Accessories pack, the Brains and Brawn Prime Vault pack, the Brute Prime pack, the Rhino Prime Accessories pack, the Magnetic Mayhem Prime Vault pack, the Mag Prime pack and Mag Prime Accessories pack, and Prime Resurgence (1 Regal Aya from Varzia, the Mag Prime Pack, or the Mag and Nova Prime Dual Pack).
  * The non-Prime pair's text is close but thinner: Titan Extractor says only "Purchase the reusable Titan Extractor blueprint from the in-game Market" (the wiki gives 50,000 Credits and notes the blueprint is reusable); Distilling Extractor already says 50,000 Credits.
  * The recipe numbers MATCH the wiki for all four (checked against `ExportRecipes`: Titan 10,000 Credits + 500 Polymer + 300 Ferrite; Titan Prime 20,000 + 500 Alloy Plate + 300 Nanospores; Distilling 50,000 + 1,000 Polymer + 150 Oxium; Distilling Prime 65,000 + 2,000 Polymer + 300 Oxium; 6 hours each), so only the "where to get it" text is wrong or incomplete.
* **Status**: investigated read-only; NO fix started. The user decides whether and when to fix.
* **Required Resolution Protocol (proposal)**:
  * Add the Drones list to the inventory parser and show all four extractors in the Inventory (owned and unowned, ownership from `Drones` and the quantity of blueprints/crafted, with their own images from DE exports), in a sensible category (for example "Extractors" or Parts), following the full-catalog rule; add a real-data test using the user's inventory shape (an owned `BasicUcResourceDrone` is listed as owned).
  * Replace the vague acquisition text for the two Primes with the wiki's source list (verbatim sentences from wiki.warframe.com, which is an allowed primary source), keep date-limited statements dated, and add the Market price to the Titan Extractor line; add a regression test.
  * Check whether other inventory-owned categories in raw `inventory.json` have no handling (this is the same class as the earlier "missing from the inventory" bugs), and list them.
  * Recheck in the deployed app.

---

## 35. Prime Sets Card Shows Only The Last Word Of A Part's Name
* **Frequency**: Reported 2026-10-03 while checking item 32 (screenshots of Ballistica Prime Set and Akbronco Prime Set).
* **User Symptom**: Ballistica Prime Set shows two cards both labelled "Limb" (they are the Upper Limb and the Lower Limb); Akbronco Prime Set shows a card labelled just "Prime" (the Bronco Prime gun it needs twice). "This error might be elsewhere too."
* **Root cause (verified)**: `src/components/PrimeSetCard.jsx` line 54 renders `part.name.split(' ').slice(-1)[0]`, the LAST word of the part name. "Ballistica Prime Upper Limb" and "Ballistica Prime Lower Limb" both become "Limb"; "Bronco Prime", "Lex Prime", "Magnus Prime" and "Vasto Prime" become "Prime". The dual-weapon parts became visible with item 32; the bows had the problem before.
* **Scope (measured on the user's real inventory, 166 sets)**: 8 sets: Akbronco, Aklex, Akmagnus and Akvasto Prime (label "Prime") and Paris, Ballistica, Cernos and Daikyu Prime (two cards labelled "Limb"). A pattern search found no other use of the last-word trick in `src`; other places that shorten part names in a different way were not searched.
* **Required Resolution Protocol (proposal)**: show the part name WITHOUT the set's own name prefix ("Upper Limb", "Lower Limb", "Barrel", "Blueprint") and keep a gun's full name ("Lex Prime"); allow the label to wrap to two lines instead of truncating; keep a safe fallback to the full name when the prefix is not found (other languages order words differently); add a test over all 166 real sets that no two cards in a set share a label and that no label is just "Prime"; recheck in the deployed app.

---

## 36. Drawer "Crafting Requirements" Omits The Main Blueprint Row For Most Prime Items
* **Frequency**: Reported 2026-10-03 (screenshot of the Akarius Prime drawer): the Prime Sets card lists the Blueprint, but the drawer's "Crafting requirements" list shows 2x Barrel, 2x Receiver and 1x Link and no Blueprint.
* **Root cause (verified)**: `PreviewAcquisitionDrawer.jsx` (lines ~246-258) renders a "1x Blueprint" row only when `blueprintOrigin` is set, and `resolveBlueprintOrigin` (`src/lib/acquisitionData.js` ~line 14919) returns text only for four cases: clan dojo research, the warframe/weapon registry `blueprint` field, `recipe.blueprintDrops`, or a market blueprint price. A Prime item whose blueprint drops from relics matches none of them, so no row is shown. Where a row does appear it is a single summary line ("Blueprint Drops: A, B, C (+N more)"), not the per-relic list with tiers that the Barrel, Receiver and Link rows have.
* **Scope (measured on the real export, 166 Prime item drawers)**: 74 have a Blueprint row; **92 do not** (examples: Citrine, Acceltra, Afuris, Akarius, Akbolto, Akjagara, Aksomati, Akstiletto, Alternox, Ankyros, Astilla, Athodai Prime).
* **Required Resolution Protocol (proposal)**: always show a "1x <Item> Blueprint" requirement row for Prime items, listing the blueprint's relics (one row per relic with its Common/Uncommon/Rare tier, using the shared relic helper from item 9) and falling back to the existing origin text for non-relic blueprints; apply it to both drawers; add a real-data test that no Prime drawer lacks the row; recheck in the deployed app.

---

## 37. The "xN" Part-Count Badge Is Positioned Misleadingly
* **Frequency**: Reported 2026-10-03 (Akbronco Prime Set screenshot).
* **User Symptom**: The "x2" shown for parts that are needed more than once sits in the TOP-LEFT of the part cell, so it looks like it belongs to the cell on its left. Almost everything else in the app is centered, or in the top right (like the platinum value).
* **Cause (verified)**: `src/components/PrimeSetCard.jsx` line 51: `<span className="absolute top-1 left-1 text-[14px] font-black text-kronos-accent ...">x{part.need}</span>`.
* **Decision (user, 2026-10-03, with a marked-up screenshot)**: the badge goes **centered, directly above the image of the needed piece** (the top-right is taken by the platinum value). NO change has been made yet.
* **Required Resolution Protocol**: place the "x2" centered above the part image in the cell (keeping the platinum badge top-right and the label below), make sure it does not overlap the image or the price badge, check with 1, 2 and 3 parts per row and with the longer labels from item 35, and recheck in the deployed app. Do it together with item 35 (same component).

---

## Resolved (confirmed by the user in the deployed Preview app)

Entries move here only after the user confirms the fix in the running app (ticked in `docs/APP_CHECKLIST.md`). They stay in this file so a recurrence can be recognized and the test that should have caught it is known. The four below were ticked in the checklist before 2026-10-02; the exact confirmation date was not recorded. Facts come from `docs/agent-context/HANDOFF.md` and were re-verified in the code on 2026-10-02 where noted.

### R1. Double / oversized / white scrollbars (Inventory, Rivens, Relics, Market, Relic Planner, Dashboard live activities, sidebar, Notes tab strip)
* **Status**: Resolved. Checklist: "Double scrollbar gone" and "Scrollbars (8px) are grabbable by mouse and not big or white".
* **Symptom**: Two scrollbars on one list, or a bar that was too large, white, or hard to grab. Reported repeatedly before the fix.
* **Root cause**: WebKitGTK draws elements styled with the standard `scrollbar-width` / `scrollbar-color` properties as a native overlay bar on top of the content, in addition to the app's own styled bar. An earlier attempt in the old root repo (the `GTK_OVERLAY_SCROLLING` environment variable) was never needed and is not in Preview's `main.rs`; some code comments wrongly said it was.
* **Fix**: every live `scrollbar-width` / `scrollbar-color` rule was removed and replaced with `::-webkit-scrollbar` rules at 8px (class `custom-scrollbar`) in `src/index.css`, the `Preview*Layout.jsx` components, `src/preview/styles/*.css`, and the Inventory, Mods, Cosmetics and Notes screens. Re-verified 2026-10-02: the 11 remaining mentions of those properties in `src` are all comments explaining the removal.
* **Tests**: none automated; scrollbar rendering can only be checked in the running app.
* **Rule**: never use `scrollbar-width` or `scrollbar-color` in this app (WebKitGTK). A related open item is #15 (Inventory overscroll) and the currency scrollbar noted in the checklist.

### R2. Citrine Prime relics missing or "Unrecognized" in Relics tab, Relic Planner, Relics screen and Inventory
* **Status**: Resolved for those screens (checklist: "Citrine Prime relics: Relics tab, Relic Planner, Relics screen, Inventory"). The relic reward overlay path is tracked separately (item 23 and checklist).
* **Symptom**: Citrine Prime relics did not appear, or appeared with internal names.
* **Root cause**: DE's `ExportRelics` has two schemas. The 108 new-format relics (all Citrine Prime) use `{ name, uniqueName, relicRewards: [{ rewardName }] }` with no era, category, quality, icon or rewardManifest. Every screen carried its own copy of an old-schema reader, so each one dropped them independently. `mapReward` also read `r.type` instead of `r.rewardName`.
* **Fix**: one shared reader, `src/lib/relicEntry.js`, now used by `relicParser.js`, `inventoryParser.js`, `dropsParser.js` and `primeResurgence.js`.
* **Tests**: `tests/relics/relicEntry.test.mjs`, including a real-export test where every relic resolves era, category, icon and rewards and Citrine reaches the catalog.
* **Lesson**: duplicated readers of the same data drift apart. Before fixing "X missing on screen A", grep every consumer of that export (`grep -rn ExportRelics src`) and check each handles every schema variant.

### R3. Farming target images and drawer sources
* **Status**: Resolved. Checklist: "Farming target images (drawer + ledger, blueprints and raw resources)".
* **Symptom**: Missing images in the Farming Targets ledger and drawer, and raw resources shown as expanded recipes.
* **Root cause**: raw resources got no image in the ledger, the drawer did not receive the ledger row's image, and farmable resources such as Orokin Cell were expanded through a Foundry recipe row. Earlier fixes (for example `db9ea507`, `94fcc649`) were made in the wrong git repository (the old root repo) and never reached the app.
* **Fix**: `src/lib/farmingTargets/screenModel.js` and `src/screens/FarmingTargets.jsx`: raw resources get images, the drawer uses the ledger row's image, and farmable resources are leaves in the ledger.
* **Tests**: `tests/farming/ledgerImages.test.mjs` (recorded in HANDOFF as failing without the fix).
* **Lesson**: run every git command from the Preview repo and confirm the fix is in the built AppImage (the footer shows the build commit). Items 8 and 10 are later, separate farming-drawer defects.

### R4. Foundry drawer did not close when clicking outside it (item 12)
* **Status**: Resolved. Checklist item #12, confirmed by the user in the deployed Preview app on 2026-10-02 (build `63121682`).
* **Symptom**: The Foundry tab's recipe panel closed only with its close button; clicking outside did nothing, unlike the drawers on other tabs.
* **Root cause**: `RecipeDrawer` in `src/screens/Foundry.jsx` rendered only the panel. It had no backdrop, no click guard and no Escape handling, while the shared `PreviewAcquisitionDrawer` has all three.
* **Fix**: the same dismissal pattern reusing the existing `preview-acq-backdrop` class (stylesheet imported in Foundry), `stopPropagation` on the panel and an Escape key listener; the close button and the non-panel variant still work.
* **Tests**: `tests/ui/foundry-drawer-i18n.test.mjs` (backdrop wiring, Escape handling).
* **Lesson**: before writing a new dismissal pattern, reuse the shared one; when two screens do the same job, compare them first (this was found by comparing the Foundry panel with the shared drawer).

---

## Summary of Standing Enforcement Rules
1. **Rule #1 (Zero Guesswork & Primary Sources Only)**: Only use official DE WorldState (`api.warframe.com`), DE PublicExport manifests (`content.warframe.com`), and official Warframe Wiki (`wiki.warframe.com`). Fandom wiki is strictly banned.
2. **Rule #2 (Hardware Protection)**: All Rust/Cargo build jobs MUST run with `CARGO_BUILD_JOBS=4` and `nice -n 19`.
3. **Rule #3 (Pre-Build Audits)**: `npm run audit` must execute and pass with 0 errors across all 19 screens and 6 overlays prior to any packaging.

---

## 38. Resource Drawers Miss Most Sources (Alloy Plate And Other Common Resources)
* **Frequency**: Reported 2026-10-03 while checking item 11 (screenshots: app Alloy Plate drawer vs wiki.warframe.com Alloy Plate page).
* **User Symptom**: Alloy Plate says "1 source" with one text block: "Drops from: Annihilation (Conclave), Cephalon Capture (Conclave), Tier 1 Reactor Sabotage Resource Caches, Team Annihilation (Conclave), Lunaro (Conclave)". The wiki also lists where it is found in the world (Venus, Jupiter, Sedna, Ceres, Phobos, Pluto, the Zariman) in containers, and its Mission Drop Tables show Sabotage nodes (Ishtar/Venus, Terminus/Mercury, Gradivus/Mars) and Saturn Conclave nodes. The user's point: most resources are found in containers on planets, not only as enemy or mission drops.
* **Findings so far (read-only, verified)**:
  * The only structured source is the DE drop-table export (`warframe-items-acquisition.json`): Alloy Plate has 10 rows, all mission rewards (3 Sabotage caches, 7 Conclave modes). No container or planet-location data exists there.
  * `wiki-resources-acquisition.json` (429 entries) has NO entry for Alloy Plate, Ferrite, Nano Spores, Polymer Bundle, Rubedo, Salvage, Plastids, Circuits, Morphics, Gallium or Control Module (it does have Neurodes, Orokin Cell, Detonite Ampule, Fieldron Sample, Mutagen Sample). Those resources therefore only get the drop-table text.
  * The drawer shows 5 of the 10 rows in one paragraph with one repeated percentage; the Variant Annihilation / Variant Cephalon Capture rows and the Neruda and Mars/Mercury node names are not shown. Where exactly the cut happens is NOT yet traced.
  * `acquisition_overrides.json` line ~1063 maps "Alloy Plate" (and Argon Crystal, Circuits, Control Module...) to an unrelated decoration-market sentence; it is not what the drawer showed here, but it is wrong data to review in the same pass.
* **Required Resolution Protocol (proposal, needs the user's decision)**: (1) trace why only 5 of 10 DE rows appear and show them as a proper list (one row per source with chance, nodes included); (2) add a wiki.warframe.com-verified "where it is found" entry per common resource (planets, container types, enemies), written as a manual data file with the wiki page and fetch date for each, never guessed (AGENTS.md rule 4); (3) fix or remove the bad decoration-market override; (4) test over every resource that none has an empty or single-line source; (5) recheck in the deployed app. Suggested to do manually for the roughly 40 common resources, in batches.

---

## 39. Prime Warframe Drawers Offer The Prime Blueprint For Credits In The Market
* **Frequency**: Reported 2026-10-03 (Ash Prime drawer screenshot; the user says it is evident on all Prime Warframe sets).
* **User Symptom**: The Ash Prime drawer shows "Blueprint: 25,000 Credits" in the cost line and a "1x Blueprint: Market Blueprint: 25,000 Credits" row. Prime blueprints cannot be bought from the Market; they come from relics. The row also hides the real source (the relics), the same gap as item 36.
* **Cause (verified on the user's export)**: ExportRecipes `AshPrimeBlueprint` has `creditsCost: 25000` (the same number as its build price) AND `excludeFromMarket: true`. `acquisitionInfo.js` ~line 249 copies `creditsCost` into `blueprintCost` without looking at `excludeFromMarket`, and `resolveBlueprintOrigin` (`acquisitionData.js` ~line 14945) turns it into "Market Blueprint: N Credits".
* **Scope (measured)**: ExportRecipes has 1,766 recipes with `excludeFromMarket` and 775 with `creditsCost`; 577 recipes have BOTH, so every one of them can show a false "Market Blueprint" price. Prime Warframes are the visible case (51 Prime Warframe recipes carry `creditsCost`).
* **Required Resolution Protocol**: only treat `creditsCost` as a Market price when the recipe is not `excludeFromMarket` (and check the wiki for a few non-Prime items to confirm the meaning of the field before relying on it); for Prime items show the relic sources in the Blueprint row (item 36); drop the "Blueprint:" cost chip when it is not a real market price; test over all recipes with the real export that no `excludeFromMarket` recipe produces a Market Blueprint text; recheck in the app. Do together with items 36 and 8.

---

## 40. Market Page Under 1050px Cuts Off The Tabs
* **Reported 2026-10-03** (screenshot): with the window narrower than 1050px, the top of the "Active Orders (0)" and "Tradeable Stock (568)" tab row is clipped on the Market page.
* **Probable cause (NOT verified in the running app)**: `src/screens/Market.jsx` line ~700 lays the page out as `flex-1 p-6 flex flex-col gap-6 overflow-y-auto`. The tab row (line ~754, `flex border-b border-white/5 gap-6`) has no `flex-shrink-0`, and the tables below use `overflow-hidden`, so in a short, narrow window flex shrinking can squeeze the row below its content height and clip the text. The 1050px rules live in `src/preview/styles/preview-responsive.css` and have nothing for Market.
* **Required Resolution Protocol**: get the measured heights from the user (or the dev tools) to confirm, then stop the tab row and the stat cards from shrinking (`flex-shrink-0`/`min-height: auto`) and let the page scroll; check at 800, 1000 and 1049px; recheck in the app.

---

## 41. Rivens Page Shows Horizontal Scrollbars On The Filters And The Card Area
* **Reported 2026-10-03**: the Rivens page has a horizontal scrollbar under the cards section where other tabs have none; the horizontal scrollbars on the Rivens filters either cannot be grabbed or do not work. "No other filters in the app get scrollbars, these shouldn't either. They should work like other tabs. The only horizontal scrollbar is supposed to be on the currency strip in Inventory."
* **Verified (filters)**: `src/components/PreviewRivensLayout.jsx` deliberately gives the state filter, the sort filter (`[data-preview-rivens-state]`, `[data-preview-rivens-sort]`, `overflow-x: auto`, lines ~33-55) and the weapon-type row (`.preview-rivens-types`, `flex-wrap: nowrap; overflow-x: auto`, lines ~65-80) their own 8px horizontal scrollbars with `width: max-content` children. That is the scrollbars the user sees; they are hard to grab for the same WebKitGTK reason as the earlier scrollbar items (R1).
* **NOT verified (cards)**: the card grid (`Rivens.jsx` line ~342) is `repeat(auto-fill, 200px)` with a container-query gap; the page scroller (`preview-page__scroll`) hides horizontal overflow, so the scrollbar under the cards must come from another element. I have not located it and need either the dev tools element or a screenshot with the scrollbar visible.
* **Required Resolution Protocol**: remove the horizontal scrollbars from the three filter rows and let them wrap onto several lines like the other tabs; find and fix the card-area overflow; leave only the Inventory currency strip with a horizontal scroll (a test that lists every `overflow-x: auto` in `src` and allows only that one); recheck at normal width and under 1050px.

---

## 42. History Screen Crashes: "Can't find variable: locale"; Crash Screen Shows Raw Keys
* **Reported 2026-10-03** (screenshot of the crash screen). The app log confirms three crashes today at 12:10:56, 12:11:22 and 12:13:55: `ReferenceError: Can't find variable: locale` then `Unhandled render error`.
* **Cause 1 (verified)**: in `src/screens/History.jsx`, `CustomTooltip` (line ~184) is a separate function with parameters `{ active, payload, label, span, activeMetrics, trackedItems, t }` but line ~208 calls `formatNumber(p.value, locale)`. `locale` is never defined there and the chart (line ~154) does not pass it, so hovering a numeric point on the history chart throws and the whole screen is replaced by the error screen. Same class as the stale-closure bugs in the report (a value used where it is not in scope).
* **Cause 2 (verified)**: `src/App.jsx` lines ~578-589 mounts `<ErrorBoundary>` OUTSIDE `<UiProvider>`. `ErrorBoundary.jsx` reads `this.context?.t`, which is empty there, so it falls back to `(key) => key` and prints `ERROR_BOUNDARY.TITLE` etc. Its own comment says it falls back to English literals; the code returns the key instead. The keys exist in all 14 locales.
* **Required Resolution Protocol**: pass `locale` into `CustomTooltip` (and add a test that renders it with a numeric payload); move the boundary inside the UI provider or give it a real English fallback and a language read from saved settings so the crash screen is always translated; search all screens for the same out-of-scope variable pattern (lint rule `no-undef` on the screens, run over `src/screens`); recheck in the app by hovering the History chart.

---

## 43. Wiki Tab Blank After The Crash (Not Understood)
* **Reported 2026-10-03**: after the History crash the Wiki tab was a blank white box; Settings > Reload UI did not fix it, making the app fullscreen did not fix it, closing and restarting the app did. Repeating the History crash and then opening Wiki worked the next time, so it is intermittent.
* **What I know**: the Wiki screen is a native child webview managed by Rust (`show_wiki_tab`, `reflow_wiki_tab`, `hide_wiki_tab`; `Wiki.jsx` lines ~60-140). Its React cleanup hides the active webview, and the module variable `lastActiveId` that remembers the active tab is reset by a page reload, while the Rust side keeps its webview list across a UI reload (`list_wiki_tabs`). A crash while the Wiki was mounted or just left could leave Rust and React disagreeing about which tab is shown. The app log of 2026-10-03 has no wiki, webview or reflow lines at all, so there is no evidence of what happened.
* **NOT verified**: this is a hypothesis. It needs a reproduction: after the History crash, open Wiki, and send me the log file (`~/.local/share/kiedas-orbiter-preview/data/user/logs/app-2026-10-03.log`) plus whether the white box is the whole content area. Likely to disappear if item 42 is fixed, because the crash is what triggers it.
* **Required Resolution Protocol**: fix item 42 first; then try to reproduce by forcing an error, add logging to the wiki show/hide/reflow commands, and make the Wiki screen re-sync with the Rust tab list on every mount.

---

## 44. Relic Reward Overlay: One Card Of A Duplicate Pair Is UNRECOGNIZED (Reopens Item 23)
* **Reported 2026-10-03** (two screenshots, build 795d0a7): in one mission the 3rd card, "Yareli Prime Chassis Blueprint", is UNRECOGNIZED; in another the 2nd card, "Akbronco Prime Blueprint", is UNRECOGNIZED while the 3rd card with the same name is recognized. The rest of the reward cards are fine, so item 23's main fix works but two OCR edge cases remain.
* **Evidence (app log, 2026-10-03)**: 13:58:03 slot 3 raw OCR `"Yareli-Prime Chassis Blueprint"` -> cleaned `"Chassis Blueprint"` -> unmatched. 14:02:24 slot 2 raw OCR `"AkbrOnco Prime Blueprint"` (the game text was read with a capital O) -> unmatched; slot 3 read `"Akbronco Prime Blueprint"` correctly and matched.
* **Cause A, Yareli (verified in code and by running it)**: the Rust cleaner `clean_ocr_output` (`src-tauri/src/ocr.rs` ~line 1254) keeps a token only if all its characters are letters. The OCR read the first two words as one hyphenated token `Yareli-Prime`, which is dropped, leaving only `Chassis Blueprint`, which matches no candidate. The matcher itself handles `"Yareli-Prime Chassis Blueprint"` correctly (reproduced: it returns Yareli Prime Chassis Blueprint). So only the Rust cleaner is at fault. This needs a Rust change and a Rust test run.
* **Cause B, Akbronco (verified by running it)**: `fuzzyMatchReward` (`src/lib/relicParser.js` ~line 759) first runs `splitPascal`, which splits `AkbrOnco` into `Akbr Onco` at the capital O; the root word `AKBR` vs `AKBRONCO` is only 50 percent similar, below the 60 percent root gate, so the candidate is discarded. Reproduced: `"AkbrOnco Prime Blueprint"` -> no match, `"Akbronco Prime Blueprint"` -> match. JS only.
* **Required Resolution Protocol (proposal)**: (B) compare the OCR text both with and without the Pascal split, using the better score (and when a candidate matches only by ignoring case and spaces, accept it), with tests for `AkbrOnco`, `Akbronco`, and other mixed-case mistakes of real names. (A) in `clean_ocr_output` split hyphenated tokens into words (`Yareli-Prime` -> `Yareli Prime`) instead of dropping them, with unit tests including this exact case; as a safety net in JS, when the text is a trailing part of exactly one squad candidate (for example `Chassis Blueprint`), match that candidate. The native half needs the user's explicit yes plus the throttled test command stated first. Recheck in a real relic mission.

---

## 45. Inventory Parse Fails In The Worker: "Q.startsWith is not a function"
* **Found by the user in the developer tools on 2026-10-03**: `[Error] parseInventory worker call failed: TypeError: Q.startsWith is not a function. (In 'Q.startsWith("/Lotus/")', 'Q.startsWith' is undefined)`, stack: a function inside the parser, an anonymous function, `forEach`, then the worker call (minified `index-BYfalBBr.js`).
* **Evidence (app log)**: the same error is logged 10 times on 2026-10-03 (12:04:47, 12:06:42, 12:11:10, 12:11:47, 12:12:33, 12:13:37, 12:14:00, 13:38:00, 13:39:20, 13:42:53) and 4 times on 2026-10-02. They line up with app starts and data reloads, not with a screen. The game locale setting is `en`, so this is not a language problem.
* **Why it matters**: `MonitoringContext.jsx` ~line 509: when the worker call fails, the handler runs `setInventoryData(null)`. Every failed parse therefore throws away the parsed inventory until a later parse succeeds, which can make owned/unowned state, Prime Sets and the Inventory screen go empty or wrong for a while. How often you actually saw an empty Inventory is unknown; tell me if you did.
* **Cause (partly verified)**: some value that the parser expects to be a text string (a name, a description key or a dictionary value) is an object, number or other non-string at that point. `src/lib/inventoryParser.js` has about 20 `.startsWith('/Lotus/')` calls; several are unguarded (for example line ~495 `locKey.startsWith` where `locKey` is `entry.name ?? entry.displayName`, line ~1148 `v.startsWith` on a dictionary value, lines ~1575, ~2162, ~2288 and ~2470 on `descLoctag`). I could NOT reproduce it offline: running `parseInventory` in Node on the user's real `inventory.json` with the harness export bundle and the English dictionary succeeds (3,679 items). The app builds a richer runtime bundle (wiki supplements, cosmetic additions, gap-fill) before parsing, so the offending value probably comes from that runtime data, not from the base exports.
* **Required Resolution Protocol (proposal)**: reproduce with the same runtime bundle the app builds (`MonitoringContext.jsx` ~lines 700-720: `buildRuntimeExportBundle` with `wiMaps`/`wiSupplement`/`cosmeticAdditions`) in a Node test, find which entry holds the non-string, fix at the source of that data AND make every `.startsWith` in the parser safe for non-strings (a small `isLotusPath(value)` helper), add a real-data test over the runtime bundle, and stop a failed parse from wiping the last good inventory (keep the previous value and log the failure). Recheck in the app: the error no longer appears in the log.

### Addendum 2026-10-03 (after the fix): what the resource job did and did not cover
* Data source: pages fetched from wiki.warframe.com only (Category:Resources, 505 pages, one request per 1.2 seconds), saved as `scratchwiki/` snapshots (kept next to the repo, not committed); generator `scripts/build-wiki-resource-sources.mjs` produces `src-tauri/data/assets/data/wiki-resource-sources.json` deterministically.
* 19 fetched pages had no usable source text and were left out (Axidite, Cephalite Resonance, Corpus Cipher, Echo-Lure, Grand Finale, Hesperon, the Moonlight/Sunlight plants, Omega Isotope, Starburst, Tethra ciphers, Travoride, Venerol, and the Codex object list). Resources without a wiki entry (fish, scenes, keys and similar DE resource-path items) keep their DE rows only.
* The 149 other entries in the acquisitions table whose `blueprint` text just repeats the drop text (item 8 audit) were listed and NOT changed.
* Extractors (item 34) are a separate job and not done yet.

---

## 46. Inventory List: Keyboard Scrolling Does Nothing, Maximizing Jumps To The Top (Related To Item 15)
* **Reported 2026-10-03** while trying the item 15 measurement: (a) pressing End or Page Down in the Inventory does nothing, so there is no quick way to reach the bottom; (b) making the window large (maximizing) puts the list all the way at the top; (c) on the tab tried there is NO extra empty room at the end of the list to click (so the overscroll of item 15 was not visible there; the user could not run the measurement snippet successfully, which printed nothing).
* **Verified in code (a)**: `src/screens/Inventory.jsx` has no `tabIndex` and no key handler anywhere, and the shared page container (`PageLayout` in `src/components/UI.jsx`, ref callback at line ~235) is not focusable either. WebKitGTK only scrolls with End/Page Up/Page Down when a scrollable element has keyboard focus, and the virtualized list container never gets it, so the keys are ignored.
* **NOT verified (b)**: the effect at `Inventory.jsx` line ~265 scrolls to the top whenever `activeTab, searchQuery, currentFilters, sortCriteria, sortDirection, viewMode` or `resourceFamily` change; `currentFilters` is stable state, so that effect alone should not fire on a resize. The calibration effect (~lines 654-766) re-runs on `[virtualRoot, activeTab, viewMode, isPrimeParts, isAyatan, isListView]` and a ResizeObserver; when the column count changes on maximize, the virtual root height changes and the window position is recomputed from `scrollTop`. A remount of the scroll container or an unstable value among these dependencies would also reset the scroll position. The cause needs a reproduction (resize while scrolled down and log `scrollTop` before and after), not a guess.
* **Required Resolution Protocol (proposal)**: (a) make the list container focusable (`tabIndex={0}`, no visible outline) and focus it on mount and after clicks inside the list, plus handle Home, End, Page Up and Page Down explicitly (scroll by `clientHeight`, or to `scrollHeight`) so it also works while the list is virtualized; (b) reproduce the resize jump, then keep the scroll position (keep the first visible row index and restore it after the column count changes); (c) with these in place, re-measure item 15. Test: a pure function for the keyboard targets, and a test that a resize with an unchanged filter state does not reset `scrollTop`.

### Addendum 2026-10-03 15:00 (items 15 and 46): evidence from the user's developer-tools screenshot
* The general grid window element, as inspected in the running app, is `div.absolute.inset-x-0.grid.grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4` with inline `top: 43424px`, rendered size 1388 x 1934 px, row-gap 16px, column-gap 16px.
* `43424 = 236 x 184`, exactly the fixed `GENERAL_ROW_STRIDE` (184), so the code's constant is what positions the window. The cards are `min-h-40` (a MINIMUM of 160px), so their real height follows their content and is not the 168px assumed by `GENERAL_CARD_HEIGHT`. A window of 1934px cannot hold whole 184px rows (1934 is not a multiple of 184 plus 16 less), so the real stride differs from 184 (likely 7 to 11 px per row), which makes the window drift against the virtual root height (rowCount x stride). This supports the earlier note that the real fix is a measured stride.
* The user could not run the console measurement (no output appeared). It is no longer needed.
* Fix queued (user said yes, 2026-10-03 15:04): Codex job P9, chained after the translation audits and the extractors: keyboard Home/End/PageUp/PageDown, measured row stride, resize keeps the first visible item, last row fully reachable.

### Addendum 2026-10-03 15:08 (item 28): log check by the coordinator, and one small thing it showed
* **The reported flood is gone.** Today's log (app-2026-10-03.log, build 795d0a7, game running about 1.5 hours): 26 `[FOCUS_WATCHER] transition` lines (13 pairs), at most 5 in one minute, versus 459 for the whole of 2026-10-02 with the old build and up to 115 in a single minute (20:43). The other focus-watcher lines (`active_window(...)`, 154 of them) appear only a couple of times per minute, so they are not a flood either.
* **Observed, not yet understood**: twice the focus flapped for a moment right when a relic reward overlay appeared: 13:58:10.007 focused, 13:58:10.600 unfocused (0.6 s later, reward screen detected 13:58:03), and at 14:02:28 to 14:02:40 three quick unfocused/focused changes in 13 seconds (reward screen detected 14:02:16, overlays shown 14:02:24). That fits the overlay window briefly taking focus from the game, the watcher hiding the overlays, and focus coming back, which would look like a short overlay flicker. It stops by itself within about 15 seconds and happens only around the reward overlay. Not verified as the cause. Please tell me if you saw the reward overlay flash or disappear and reappear during a relic mission.

---

## 47. Farming Targets: "Group by planet" Changes Only The Wording
* **Reported 2026-10-03** (screenshot): in Farming Targets, "Group by planet" changes the wording on some lines but does nothing else. With it on, the list shows several identical-looking rows ("Pluto - Exact node - Covers 1 of 9 - Argon Crystal 3.67% Rot C") one after another.
* **Cause (verified in code)**: `src/screens/FarmingTargets.jsx` line ~110: `groupPlanet ? (row.place.planet || row.place.name) : (planet ? planet + ' — ' + name : name)`. The toggle only switches the heading text. `model.ranked` (the rows) is not regrouped, so places on the same planet stay separate rows, and with the toggle on their node names are dropped from the heading, so different Pluto nodes look like duplicates. They are not duplicates, they are different nodes.
* **Required Resolution Protocol (proposal)**: when the toggle is on, merge the ranked places by planet into one row per planet (planet heading, number of nodes, the union of covered items with their best source, and the individual nodes listed underneath, collapsible); when off, show the node-level rows as today with the node name in the heading. Keep the order by coverage. Test with real data that, with grouping on, each planet appears once and the sum of covered items is not larger than the union; recheck in the app.

---

## 48. 1999 Calendar: Upgrade Names Stay English In German
* **Reported 2026-10-03** (screenshot, app in German): in the Dashboard 1999 calendar the day card says `VERBESSERUNG` (translated) but the names under it, "Electric Status Damage And Chance", "Gas Chance To Primary And Secondary" and "Armor", stay English. The rest of the calendar is translated.
* **Cause (partly verified)**: `src/lib/worldstateParser.js` ~line 678, for `CET_UPGRADE` events: `name = resolveItemName(ev.upgrade, mergedDict, uniqueNameToName, locale)`. I found no German text for these upgrade names in the German dictionary (`dict.json` has the other calendar rewards and challenges in German, but nothing for the calendar upgrade entries) nor in `ExportUpgrades_de.json` (no calendar entries), so the name is built from the English path text. The DE source of a localized name has NOT been located yet.
* **Required Resolution Protocol (proposal)**: find the real source (the worldstate `upgrade` value and the matching DE language key, or the wiki.warframe.com calendar page for the English names plus the Calendar reward/upgrade strings in the other languages' export files); if DE provides no localized text, say so and keep the English name for those entries, translating only what has a verified source (never invent names). Test the parser with the real worldstate for the current season in `de`.


## R5. Confirmed by the user in the running app, 2026-10-03 (build 795d0a7)
Confirmed by the user's checklist ticks and messages on 2026-10-03: item 13 (extractor artwork), item 30 (OWNED only on sets whose finished item is owned), item 11 (Salvage drawer), item 10 (Voidgel drawer, no "+N more"), item 18 (the English Riven hotkey label; the German label was untranslated and was fixed in code separately, see the item 18 addendum), item 24 (scanner toast shows real text; "Scanner" is the correct German word too), items 17, 25 and 26 (riven banner stays up, nothing reappears; log checked by the coordinator), item 27 (grading only on the hotkey), single-card riven grading, the narrow-window (under 1050px) sidebar rail, and from item 29: the Target Inspector dropdown works and no longer clips. The user also reported that the relic reward overlay never flashed (see the item 28 addendum), so the short focus flap seen in the log did not show as a visible problem.

### Addendum 2026-10-03 (item 34): other owned inventory keys the parser does not handle yet
The extractor job listed the top-level keys of your real inventory.json that hold owned item records and that the parser does not read: Antiques (1), Boosters (12), CrewMembers (4), CrewShipAmmo (3), CrewShipHarnesses (1), CrewShipRawSalvage (70), CrewShipWeaponSkins (4), CrewShipWeapons (2), DataKnives (1), DrifterMelee (6), EmailItems (22), FocusUpgrades (60), Horses (1), KubrowPetPrints (4), LevelKeys (4), Motorcycles (1) and others (full list in the job report, `wt/p7-extractors/AGENT_REPORT.md`). Under the Inventory-is-the-full-catalog rule each of these is a possible "missing from the Inventory" bug of the same class as the extractors. Not started; the user decides which matter.

### Addendum 2026-10-03 (item 48): what the search found and what would unblock it
* The player inventory shows the calendar upgrade identifiers `/Lotus/Upgrades/Calendar/AbilityStrength`, `/Lotus/Upgrades/Calendar/ElectricStatusDamageAndChance` and `/Lotus/Upgrades/Calendar/RadialJavelinOnHeavy`; the screenshot adds `GasChanceToPrimaryAndSecondary` and `Armor`. No cached worldstate with `KnownCalendarSeasons` exists offline, so the exact event payload could not be printed.
* To fix the German text I need ONE verified source: the in-game German names (a screenshot of the in-game 1999 calendar with the game language set to German, or a German page on wiki.warframe.com that lists them). Without it, those names stay English.

---

## 49. Prime Sets Card: Last Part Cell Cut Off At A Medium Window Width
* **Reported 2026-10-03** (screenshot of the Paris Prime Set card in the 16:57 build): at a medium window size the parts row shows Blueprint, Lower Limb, Upper Limb, Grip and then only a sliver of the fifth part (String); the card clips it. The user says it is correct in a small window and in full screen.
* **Probable cause (from the screenshot and the code, not yet measured in the app)**: `src/components/PrimeSetCard.jsx` line ~51 lays the parts out as `grid-template-columns: repeat(N, 1fr)` (N up to 6). A plain `1fr` column cannot shrink below the content's minimum width, and each cell has `p-3` padding plus a word such as "Blueprint", so a cell stays about 80px wide. In the screenshot five cells of about 80px (about 400px) do not fit into a card about 350px wide, and the card has `overflow-hidden`, so the fifth cell is cut. At a medium window the Inventory shows two cards per row (`lg:grid-cols-2` in `Inventory.jsx` ~line 1302), so each card is narrow; in a small window it is one wide card per row, and in full screen the cards are wide, which matches the report. Sets with 5 or 6 parts (Paris, Ballistica, Cernos, Daikyu, the Ak- sets) are the ones that can be affected. The part labels now wrap (item 35 change) but the minimum width of a cell is set by its longest word, so that change did not cause this; I could not prove whether it existed in the earlier build.
* **Required Resolution Protocol (proposal)**: let the columns shrink (`repeat(N, minmax(0, 1fr))`), reduce the cell padding at narrow widths, allow long words to break, and make the part row wrap onto a second line when five or six cells would be narrower than about 64px; keep the ×N badge, price badge and label layout; test with a render of a 6-part set at narrow container widths that no cell has a fixed minimum above the available width; recheck at small, medium and full-screen widths in the app.

---

## 50. Ash Drawer: The Top Source List Misses Sources That The Blueprint Row Lists
* **Reported 2026-10-03** (screenshot of the Ash drawer, build 16:57): "Where to start" says "1 source": "Blueprint purchasable from Market for 375 Platinum." The cost line shows "Blueprint: 35,000 Credits", and further down the "Blueprint" requirement row says the blueprint can be bought in the Market and from Simaris. The user's point: the top list should also say it can be bought for credits and from Simaris; the two parts of the same drawer disagree.
* **Verified (real data)**: the DE recipe `AshBlueprint` has `creditsCost: 35000` and is not `excludeFromMarket`, so a Market credits purchase is real. The hand-written warframe table in `src/lib/acquisitionData.js` has `"ash": { "blueprint": "Market (35,000 Credits) or Simaris", ... }`; `resolveBlueprintOrigin` prints that text in the Blueprint row. The top source list comes from a different path (`getAcquisitionInfo`, `src/lib/acquisitionInfo.js` ~lines 890-1000), which for this item produced only the single override/market line (375 Platinum). Nothing merges the two, so each part shows only its own fragment.
* **Why it is probably wide**: any non-Prime Warframe or weapon whose blueprint has a Market credits price or a Simaris/Dojo offer recorded only in the hand-written table can show the same disagreement. Not measured yet.
* **Required Resolution Protocol (proposal)**: build the top source list from every verified blueprint source for the item: the Platinum Market price from the market index, the credits Market price from the recipe (only when the recipe is not `excludeFromMarket`, item 39), and the extra routes named in the warframe/weapon table (split "A or B" into one row each: Simaris, Clan Dojo research, quest and so on), each as its own row, with no duplicates and the count shown correctly; keep the Blueprint requirement row as it is. Measure with real data how many Warframe and weapon drawers gain rows, test Ash (platinum, credits, Simaris) and a Dojo-only item, and recheck in the app.

### Addendum 2026-10-03 17:08 (item 50): the blueprint as a part shows NO source at all, and it is wide
* **Reported (screenshot)**: opening the part "Ash Blueprint" (category PART) shows "Where to start: 0 sources. No verified acquisition route is known for this item." with a "Know where to find it?" button. The Ash Warframe itself shows one source (Market for 375 Platinum) and its Blueprint row lists "Market (35,000 Credits) or Simaris", so the app knows the routes but the blueprint part does not use them.
* **Measured on the user's real data** (running `getAcquisitionInfo` over the real export): `Ash Blueprint` returns 0 sources; so do Excalibur Blueprint, Mag Blueprint and Volt Blueprint. Of the 71 main (non-Prime, non-component) Warframe blueprint recipes I tested, **35 return 0 sources** (for example Ash, Banshee, Berserker, Dagath, Ember, Excalibur, Excalibur Umbra, Frost; a few of the 71 are not real Warframe blueprints, such as the Chroma beacon entries, so the true count is a little lower).
* **Cause (probable, same family as the first part of this item)**: the part-blueprint drawer looks up sources only by the blueprint's own item key; the Market/Simaris/Dojo routes live in the hand-written warframe table (keyed by the Warframe's name) and in the recipe's market prices, and nothing connects the blueprint item to them.
* **Proposal**: make the blueprint part inherit the routes of its Warframe: the Platinum and credits Market prices (credits only when not `excludeFromMarket`), and every route named in the warframe table ("A or B" split into rows), plus the Warframe's own acquisition source for quest or Dojo cases. Test over all main Warframe blueprints that none returns 0 sources unless its Warframe also has none, and recheck Ash, Excalibur, Mag and Volt in the app. Same job as the first part of item 50.

---

## 51. Prime Part Drawers Show Wrong Common/Uncommon/Rare Tiers (Reopens Item 9)
* **Reported 2026-10-03** (build 18:01): Nidus Prime says everything is Uncommon; the wiki disagrees. Nyx Prime also shows wrong Common/Uncommon/Rare tags; the user says all Primes have wrong markers.
* **Verified on real data**: DE `ExportRelics` (the authority) gives the right tier per relic and reward: for example Nidus Prime Chassis Blueprint is RARE in all 6 relics (Lith N12, Lith N7, Meso N14, ...), while the Nidus Prime main Blueprint is UNCOMMON. The part drawers (the "Crafting requirements" part rows) look the tier up with `buildRelicRarityIndex` (`src/lib/relicSources.js`) using the key `relic name | item path`. The index is keyed by the reward's BLUEPRINT path (`.../NidusPrimeChassisBlueprint`), but the ingredient being looked up is the COMPONENT path (`.../NidusPrimeChassisComponent`), so the lookup misses and the code falls back to the `rarity` field of the bundled item data (`wfcd-combined.json`). That bundled field is itself unreliable: for Ash Prime Chassis every relic row is labelled Uncommon even for the 25.33% (Common) rate; for Nidus Prime Chassis the 10% row is labelled Uncommon while the 2/4/6% rows are Rare; Nyx Prime Neuroptics is mixed the same way.
* **Required Resolution Protocol (proposal)**: look the tier up through the component's blueprint (the recipe index already links `blueprintUniqueName` to the component), always prefer the DE `ExportRelics` rarity, never the bundled item-data label; add a real-data test over EVERY Prime part: the tier shown equals the DE tier for that relic and reward, and no relic shows a tier that contradicts its refinement-independent DE value; recheck Nidus, Nyx, Ash and Citrine Prime in the app.

---

## 52. Orokin Cell And Other Resource Drawers: Hundreds Of Rows That Just Say "Mission"
* **Reported 2026-10-03** (screenshot): Orokin Cell drawer: "176 sources", the featured source is "Mission 50.0%" and the list is "Mission 33.3%" over and over. A screenshot earlier the same day (build 795d0a7) showed real names.
* **Measured**: Orokin Cell now returns 176 sources: 1 wiki sentence plus 136 rows of type `mission` coming from the bundled DE item data (`source: "warframe-items"`) with fields `node`, `nodeName`, `missionType` (for example `MT_PVP`), `rotation`, `chance`, and 40 more text rows. The drawer label for a mission row (`getSourceLabel`, `src/components/AcquisitionDrawer.jsx` ~line 75) does not use that field shape, so it prints just "Mission". The resource job (item 38) merged these rows into the drawer but I only checked their data, not how they render; this is a regression that was merged and built.
* **Likely wider**: every resource that gets those rows (Alloy Plate and most common resources) renders the same way; the user reported it for Orokin Cell.
* **Required Resolution Protocol (proposal)**: render every mission row as "Planet / node (mission type), Rotation X, chance"; group by planet or mission type with a count and expand-on-demand when a resource has more than about 15 rows; remove duplicate conclave/variant rows; add a real-data test over all resources that no row label is just "Mission"; recheck Orokin Cell, Alloy Plate and Ferrite in the app.

---

## 53. Forma Drawer Is A Mess
* **Reported 2026-10-03** (screenshots): the Forma drawer says "Other acquisition sources 4593", then "Crafting requirements: Build 35,000 Credits, Time 23h, Rush 10 Platinum" and a "1x Blueprint" row containing one long unbroken block of wiki text with missing numbers ("Purchased complete from the Market for Purchased complete from the Market as a three-Forma bundle for .").
* **Measured**: the Forma Blueprint item alone returns 616 sources (565 relic rows, 48 mission rows, 3 transient). The 4,593 count for the Forma item itself is consistent with the same relic rows multiplied by refinement levels (about 8 per relic) that are not collapsed on this path (the item 9 normalizer only collapses sources typed as relic that go through the part-row path), plus the missions. The Blueprint row text is the raw wiki sentence list for Forma stored in the hand-written table, with price templates removed so numbers are missing (same family as item 54).
* **Required Resolution Protocol (proposal)**: collapse the 565 relics into one grouped row ("Forma Blueprint drops from 565 relics, mostly Common", with the list collapsible, tiers per DE), apply the refinement collapse on every path, split the Blueprint text into one row per sentence with the template fixes of item 54, and test that Forma has under about 40 top-level rows; recheck in the app.

---

## 54. Wiki Text With Unresolved Templates Reads As Nonsense
* **Reported 2026-10-03**: Alloy Plate shows "Beginning in 9 materials could be purchased directly from the market for Platinum."
* **Cause (verified in the saved wiki source text)**: the wiki page says `Beginning in {{ver|9}} materials could be purchased directly from the market for {{Resource|Platinum}}.` and the quote above it uses `{{pc|30}} for 1500 [[Alloy Plate]]`. The resource generator (`scripts/build-wiki-resource-sources.mjs`) strips the wiki templates instead of expanding them: `{{ver|9}}` should read "Update 9", `{{Resource|Platinum}}` should read "Platinum", and `{{pc|30}}` should read "30 Platinum". The same stripping loses the prices in the Forma text (item 53).
* **Required Resolution Protocol (proposal)**: expand the common templates (`pc`, `ver`, `Resource`, `WF`, `Companion`, `StoreTableCell` and so on) in the generator, drop (never show) any sentence that still contains an unresolved template or a dangling "for ." gap, rebuild `wiki-resource-sources.json`, and add a test over all 486 entries that no text contains `{{`, `}}`, "for .", "for ," or "in <number> " without a version word.

---

## 55. Prime Extractors Appear Twice With Different Information
* **Reported 2026-10-03**: the Prime extractors are in the app twice with different information, one as a "part", the other as a "prime part".
* **Verified on the user's real inventory data**: the Inventory now contains BOTH `Titan Extractor Prime` and `Distilling Extractor Prime` as finished items (category part, `Ship/AdvancedResourceDrone`, added by the extractor job, item 34) AND `Titan Extractor Prime Blueprint` and `Distilling Extractor Prime Blueprint` as prime parts (`Drones/AdvancedResourceDroneBlueprint`, the older Prime Set system). Each pair is the item and its blueprint, the same pattern as "Ash Prime" and "Ash Prime Blueprint", but the two drawers show different sources (the finished item has the wiki list, the blueprint still has the single bundle line) and use different category names, so it looks like a duplicate.
* **Required Resolution Protocol (proposal)**: make the blueprint drawer inherit the item's sources (the same rule item 50 added for Warframe and weapon blueprints, extended to the Drones), show the pair under one consistent naming and category ("Titan Extractor Prime" and "Titan Extractor Prime Blueprint"), and test that both drawers list the same routes. If you meant something else by "twice", tell me which two entries you saw.

---

## 56. Consistency: One Contract For Every Drawer
* **The user's principle (2026-10-03)**: "why are things getting build differently? consistency is a core component and that's not happening."
* **Honest cause**: acquisition rows come from at least six unreconciled places: the DE drop tables, the DE bundles and recipes, the bundled item data (with its unreliable labels), hand-written tables keyed by Warframe or item name, override sentences, and the wiki text files. Each fix in this report patched one path, and nothing forces two paths to produce the same shape, the same wording, or the same count rules. That is why Ash, Forma, Orokin Cell, Alloy Plate and the Primes all look different.
* **Proposal (needs the user's go)**: (1) write the contract once: what a source row must contain (label, kind, place or price, rotation, chance, tier) and what is forbidden (a bare "Mission", template residue, refinement levels, percentages on relics, a missing price); (2) funnel every path through one assembler and one normalizer (dedupe, collapse relics, group big lists with a count); (3) add ONE audit test that runs over EVERY item in the catalog (Warframes, weapons, blueprint parts, Prime parts, resources, Forma, mods, cosmetics) and fails on any contract violation, so a regression anywhere shows up before a build; (4) fix the violations the audit finds. Items 51 to 55 are the first violations it would have caught.

---

## 57. Acquisition Text Must Say How To Get It Now, Not Its History (User Rule 2026-10-03)
* **The user's rule**: an acquisition drawer is for how to get the item NOW. "Why would you need to know about past acquisition that doesn't affect now, or which update it happened in? That's unnecessary commentary."
* **Where it is broken today**: the wiki sentences stored verbatim by the extractor job (item 34) and the resource job (item 38) include history: "It was first available to the Blaze and Inferno levels of Ember Prime Access", "returned temporarily at December 8, 2015 through January 5, 2016 as part of the purchase-able Prime Vault", "Originally, it was only available to the Stomp level of Rhino Prime Access"; Alloy Plate "Beginning in Update 9 materials could be purchased directly from the market for Platinum" (also broken, item 54); the Forma Blueprint wall of text (item 53) lists past Nightwave ranks, calendar months and bundles.
* **Why it happened**: the standing rule says never invent game text, only use verified wiki and DE sources. I satisfied it by pasting whole wiki sentences instead of extracting the facts. Wiki prose mixes current routes with history, so the history came along. Pasting prose is also what makes the drawers inconsistent (item 56).
* **Required Resolution Protocol**: store and show STRUCTURED facts only (where, the vendor or node, the price in its currency, the rotation or chance, the tier), and generate one short sentence per current route from them in a fixed pattern. Drop any sentence or clause that is about the past: update or version numbers, "first", "originally", "was", "returned", past dates, "until <date>" statements about earlier availability. For items that cannot currently be obtained (Prime items in the vault), say only the current state ("Vaulted: only through Prime Resurgence or trading when it is in rotation"), taken from DE data where available. Add the check to the audit in item 56: no drawer text may contain an update number, a past date, or the words originally, formerly, first available, returned, previously. Apply to the extractor Primes first (item 55), then Alloy Plate and Forma (items 53, 54), then every wiki-derived entry.

---

## 58. Rivens Filters At A Small Width: The Icon Gets Its Own Line
* **Reported 2026-10-03** (screenshot, build 18:01): at a small window width the funnel icon (state filter) and the sort-arrows icon (sort filter) each sit alone on the first line and the buttons wrap onto the line below.
* **Cause (verified in code, from the item 41 change)**: in `src/screens/Rivens.jsx` lines ~260 and ~275 each filter is a flex row with an icon and ONE inner `div` that holds the buttons. The item 41 change in `PreviewRivensLayout.jsx` made the outer row `flex-wrap: wrap` and the inner group `min-width: 0; flex-wrap: wrap`. The inner group's preferred width is "all buttons on one line", which does not fit beside the icon, so the whole group wraps below the icon instead of shrinking and wrapping its own buttons next to the icon.
* **Required Resolution Protocol (proposal)**: keep the icon and the buttons on the same row: do not wrap the outer row, let the inner group take the remaining width (`flex: 1 1 0; min-width: 0`) and wrap its buttons inside it, with the icon aligned to the first button row; test with a render at 280, 400 and 600px container widths that the icon and the first button are on the same row; recheck at small and medium widths in the app.

---

## 59. Farming Targets: The Vendor Tab Shows Nothing
* **Reported 2026-10-03**: the Vendor filter in Farming Targets does nothing. Two of the user's targets say in their drawer that they are sold at a vendor, but they do not appear under the Vendor tab.
* **Verified on the user's real data**: the place index (`buildPreviewPlaceIndex`, `src/lib/farmingTargets/screenModel.js` ~line 203) builds vendor places from `wikiVendorIndex`. That index has 2,482 items, and each entry is a LIST OF NAMES, for example `["Acrithis","Nightwave"]`; the code reads each entry as an object (`entry.vendor ?? entry.name`), finds neither on a text value, and uses the fallback name 'Vendor'. Result on the real data: place types are mission 905, enemy 923, conclave 15, relic 800 and exactly ONE vendor place, called "Vendor". The DE vendor offers (`exportVendorIndex`, 1,870 items, the source the drawers use for "sold by...") are not used by the place index at all. So the Vendor tab can only ever show one generic "Vendor" row, and only for items in the wiki list.
* **Required Resolution Protocol (proposal)**: build one vendor place per real vendor name (Acrithis, Nightwave, Baro Ki'Teer, Simaris, the syndicates and so on) from both the wiki list (read as names) and the DE vendor offers, with the price/standing in the row; the Vendor tab then ranks vendors by how many of your needed items each sells. Test on the real data that the Vendor tab has several vendors and that a target the drawer says is sold at a vendor appears under its vendor.

---

## 60. Target Inspector Hides Everything For A Target You Own
* **Reported 2026-10-03**: the Target Inspector says you have the item, so it displays nothing; the user wants to see the things needed to build those items.
* **Understanding**: the Farming Targets ledger lists what you still NEED. A target you already own has nothing missing, so the inspector and the Vendor and other tabs have nothing to rank. That matches how the ledger was designed, but it conflicts with the standing rule that the app shows the full catalog with owned and unowned marked, and with what the user expects from the inspector.
* **Needs your decision before any work**: for a target you own, should the inspector (a) still list its full build requirements with each component marked owned or needed (nothing is ranked or farmed), (b) offer a "show full requirements" switch, or (c) stay as it is? My recommendation is (a): the same list as for an unowned target, with owned items ticked, so it is never empty.

## R6. Confirmed by the user in the running app, 2026-10-03 (build 18:01), Step 1 of the checklist
Confirmed by the user's ticks: items 35, 37 and 32 (Prime Sets labels, base guns, badge), 49 (Prime Sets part cells at a medium width) and 50 (Ash drawer routes), 36 and 39 (Prime drawer Blueprint row, no false Market price), 9 (Ash Prime and Citrine relic rows; the Nidus and Nyx Prime TIERS are still wrong, item 51), 33 (currency strip), 41 (Rivens filters wrap, no horizontal scrollbar; the icon-on-its-own-line problem at a small width is item 58), 40 (Market tabs), 42 (History chart no longer crashes), 47 (Group by planet). Not ticked and still open from Step 1: item 8 (Orokin Cell), item 38 (resources), item 34 (extractors); the user's findings on them are items 52 to 55.

---

## 61. Inventory End Key Stops At The End Of What Is Rendered
* **Reported 2026-10-03** (build 18:01): the keys work, but End does not go to the end of the list; it goes to the end of the part that is currently rendered. (The user marked item 31 complete in the same message.)
* **What I checked in code**: the End target is `scrollHeight - clientHeight` of the scroll container (`src/lib/inventoryScroll.js` `getScrollKeyTarget`, used by the handler in `Inventory.jsx` ~lines 275-315), and the list has no progressive "load more" step: the virtual root's height is `rowCount x stride (+16px)`, so in theory `scrollHeight` already covers the whole list. There is no CSS smooth scrolling on this container (`scroll-behavior: auto !important`). So the code reading does not explain the symptom.
* **Hypotheses (not verified, in order of likelihood)**: (1) the row stride is re-measured from the first rendered row after the jump (item 46 change), the root height changes while the window is moving, and the browser clamps the scroll position before the new window has rendered; (2) the jump is applied once and the throttled window update (50 ms) renders the window at the old position, so the target was computed against a height that then changes; (3) a tab where the list is not the virtual list (a different layout) uses a different container.
* **Required Resolution Protocol (proposal)**: compute the End target from the model (`rowCount x stride + bottom padding - viewport`) instead of reading `scrollHeight`, apply it, and repeat after each animation frame until `scrollTop` and `scrollHeight` stop changing (maximum 5 passes); do the same for Home; do not re-measure the stride while a key jump is in progress; make the first measurement happen once per layout and reuse it; log the target, the final `scrollTop` and the final `scrollHeight` so a failure is visible in the log; test the pure target calculation and a simulated height change between passes; recheck in the app on at least the general grid, the Prime Sets tab and the list view. Please tell me which tab you pressed End on if it differs per tab.

### Addendum 2026-10-03 20:10 (item 48): ground truth from the user's German game screenshot and the official wiki
* **What the user's screenshot shows (German client, 1999 Calendar, day 8)**: Amir's offer is named "Abgefüllter Blitz", type "Hex-Boost Modifikator", text "Gewährt allen Waffen 25 % Statusschaden und Elektrizität-Statuschance."; Eleanor's offer is named "Dicke Haut". The app shows "Electric Status Damage And Chance", "Gas Chance To Primary And Secondary" and "Armor" with the type label "VERBESSERUNG".
* **What the official wiki says (wiki.warframe.com, page "1999 Calendar", revision 2814649, "Hex Boost List")**: Bottled Lightning (Amir): "Add 25% Status Damage and Electricity Status Chance to all weapons"; Thick Skin (Eleanor): "Gain +250 Armor"; Toxic Shot (Quincy): "Add 30% Gas Status Chance to Primary and Secondary Weapons"; and so on. So the real English names are Bottled Lightning, Thick Skin, Toxic Shot; the in-game German names are Abgefüllter Blitz and Dicke Haut (user screenshot). The type is "Hex Boost" (German "Hex-Boost Modifikator"), not "Verbesserung".
* **Why my earlier searches failed**: I searched the exported data for the PATH TEXT and its words. The real names are not stored under those paths, and they are not in the German language export on this machine at all (searched for "Abgefüllter Blitz", "Dicke Haut", "Hex-Boost", "Modifikator": no hits), so there is no DE data source for the names; the game client has them.
* **The calendar upgrades in today's official worldstate (api.warframe.com, current season)** and the wiki name they match by description (description match, not an id: please confirm with the game): `Armor` = Thick Skin (confirmed by the user's screenshot: Eleanor, Dicke Haut); `ElectricStatusDamageAndChance` = Bottled Lightning (confirmed: description matches the German text); `GasChanceToPrimaryAndSecondary` = Toxic Shot; `BlastEveryXShots` = Have A Blast (listed under Hex Factors on the wiki); `CompanionsRadiationChance` = Friendly Fallout (Hex Factor); `EnergyRestoration` = Espresso Shots; `MeleeAttackSpeed` = No Quarter; `RadialJavelinOnHeavy` = Heavy Javelin (Hex Factor); also `AbilityStrength` (seen in the player data) = Power Gains.
* **Required Resolution Protocol (proposal)**: add a small verified data file keyed by the upgrade path with the English name, description and type from the wiki page (revision recorded) and, where the user has supplied the in-game German text, the German name and description (today: Abgefüllter Blitz with its text, Dicke Haut); the parser uses it instead of the path text; where no German text is verified yet the English wiki name is shown (never path text); the type label becomes "Hex Boost" / "Hex-Boost Modifikator" (German label from the screenshot); each time the user sees another upgrade in the German game, a screenshot adds its German entry. Short English-only descriptions, no history (item 57).

---

## 62. Larger Project (Later): Our Own Refresh Of The Game's Language Strings
* **Decision 2026-10-03 (user)**: fix what can be fixed now with the published strings, and record the bigger project here so it is not forgotten and does not use today's session.
* **Why**: the app's dictionary comes from a community-processed export that lags game updates; the 1999 Hex Boost names (item 48) were missing although the game has them. The community repository `calamity-inc/warframe-languages-bin-data` (branch `senpai`, "All strings for Warframe in all languages. Updated automatically.", game version 44.0.3 at commit 826e8eab on 2026-09-30) holds all 140,286 strings in each of the 14 languages (about 19 MB per language). Its scripts show how it is made: they download each language's `Languages.bin` from Digital Extremes' own content servers (the cache manifest `H.Cache.bin`, then `B.Cache.Windows_<lang>.bin`, then `Languages.bin`), unpack it with a function from a separate tool (`warframe-cache-tools`, not in that repository), and write `<lang>.json`. The repository states no license, so its code must not be copied; the DATA is Digital Extremes' text.
* **Interim (done in this session)**: item 48 uses only the 391 calendar strings per language from that repository, kept in `src-tauri/data/assets/data/calendar-language.json` with the repository, commit, game version and date recorded. The user approved using the repository as a text-only source (names and descriptions, never game logic) on 2026-10-03; AGENTS.md rule 4 was not edited.
* **The project**: (1) write our own small downloader in the app's tooling (Node) that fetches the manifest and `Languages.bin` per language from DE's servers, decodes it (format learned from the data itself; no copying of the community code), and writes a compact dictionary; (2) refresh it per game version and compare with the app's current dictionary: list every key the app lacks or has in English only per language; (3) feed the gaps (names, descriptions, calendar, Nightwave, Hex and so on) into the screens and into the English-text audit of item 18; (4) add a freshness check to the data-watch so a game update does not silently outdate it. Before starting: review the downloader approach once with the user (it contacts DE's content servers), decide where the files live (the data dir, not the repository), and keep it read-only for the game folder.
* **Not needed**: reading the game's local cache files (`Cache.Windows`, German files written on the day the user switched the game language): the same strings come from DE's servers.


## R7. Confirmed by the user in the running app, 2026-10-03 (build 18:01), Steps 3 to 5
Confirmed by the user's ticks: item 46 / 15 keys (Home, Page Up, Page Down; End still stops early, item 61), item 28 (focus log, after the coordinator's count: 26 transitions in 1.5 hours, none every half second), and item 43 (blank Wiki tab: no recurrence, closed; reopen if it happens again). The user also marked item 31 complete on 2026-10-03 (cannot be tested in practice).

### Addendum 2026-10-03 20:25 (item 60): the user's decision and the design
* **Decision (user)**: "Yes, because you could be searching for things you want that you already have and need more of, or are farming for platinum items." A target means "I want N MORE", not "show me what I am missing".
* **Design handed to Codex (job P21)**: the top-level target item's own stock is not subtracted by default (a target of N asks for N more; its recipe is always expanded for N crafts); the components and raw resources below it still use owned stock, so parts you own are not farmed twice; a per-target switch "count the copies I already own" restores the old behaviour (off by default, old stored targets migrate to the default); the Target Inspector always lists the full requirement tree (required, owned, still needed, owned/needed mark) and is never empty; tests for an owned craftable target, an owned resource asked for 500 more, the switch, the migration, and two real targets from the user's inventory. New strings (the switch) in all 14 locales.
* **Why it was empty**: `buildLedger` computes `stillNeeded = max(0, required - owned)` and `requirements.js` consumes owned stock before expanding a recipe, so an owned target had nothing to farm and its recipe was never expanded.

---

## 63. Acquisition Rows Broken Into Fragments, Missing Prices And History In The Hand-Written Tables (New, Found By The Coordinator 2026-10-03 20:55, Read-Only)
* **How it was found**: the checklist's "known-good items" re-check (Grimoire) showed the drawer rows "Purchased from Bird 3 (Rank 4+) for 50" and "000 Standing." as two rows, plus a row that only says "Blueprint:". I then ran the real drawer function (`getAcquisitionInfo`) over all 13,235 catalog entries on the user's real data (probe `scratch/frag-scan.mjs`, not committed) and counted rows by defect.
* **Counts (items with at least one such row)**: number cut in half at a thousands comma ("50" / "000 Standing"): **457**; Market sentence with the price missing ("purchaseable from the Market for . Bundle price ..."): **155** (armor bundles: Cirrus, Dendra, Porta, Shi, Sorex, Aesopex, Avia, Kuva, Harkonar and more); wiki or table text with history or update wording ("Beginning with Amir's Shockwave", "Originally a reward ..."): **142**; a row that is only a label ("Blueprint:"): **89**; template names with underscores ("Arca_Armor_Collection is purchaseable ..."): **14**; "Blueprint: or as a drop from: ..." (Galariak Prime): 1.
* **Cause, number split (verified in code)**: `splitAcquisitionRouteText` in `src/lib/acquisitionInfo.js` (line ~122) splits a hand-written route string at every comma outside parentheses; the comma inside "50,000" is split too (its comment says commas inside parentheses are kept, but not those in a plain number). It is used for the Warframe/weapon table text (line ~1130) and for the per-item override text (line ~1198). The override texts such as "Blueprint: or Purchased from Bird 3 (Rank 4+) for 50,000 Standing." (Grimoire) are also split at the colon-label and keep the stray label.
* **Cause, the rest**: the item 54 and 57 cleanup (P20) audited only the wiki resource texts, the extractor texts and the hand-written Warframe/component and resource tables. The armor-bundle, cosmetic and other override paths were never audited, which is exactly the gap item 56 describes (a whole-catalog audit with one contract).
* **Required Resolution Protocol (proposal, needs the user's go)**: (1) never split a number: treat `\d,\d{3}` as one token; (2) drop label-only rows and fix "Blueprint: or ..." strings; (3) regenerate the 155 armor-bundle sentences with their real price or drop the price clause (the DE market data supplies prices); (4) drop or rewrite the 142 history sentences by the item 57 rule; (5) turn this probe into the item 56 audit test over every catalog entry (fragment, missing price, label-only, underscore, history, update number) so it fails before a build. Delegation would go to Codex gpt-5.6-luna (included in ChatGPT Plus, usage-capped).

