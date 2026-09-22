# Known issues backlog — documented, not yet worked on

Per explicit user instruction: record these now so they aren't lost, but do not start fixing any of them without being told to.

## 0. FUTURE TASK: Full wiki-archive-vs-app item audit

**Requested**: 2026-09-07 by the user, as a large future to-do, not to be started now.

Eventually, go through every single wiki page downloaded in `wiki_pdf_archive/` (10,796+ files) that documents an in-game item, and cross-check whether the app's acquisition-data layers (`RESOURCE_LOCATIONS` in `acquisitionData.js`, the two bundled fallback JSONs, and `DropsAll.json`) actually cover it. The Scorpion Specter investigation (item #4 below) is the pilot case for this method: read the real downloaded wiki page(s), extract the actual verified item list/acquisition sources, then check each one against every data layer the app uses — not the other way around (never start from the app's data and assume it's complete).

**Status**: Not started. Logged as a standing to-do for a future dedicated session — this is a large undertaking (thousands of wiki pages) and should not be attempted piecemeal without a clear plan for scope and verification methodology.

## 1. Stable/live app: Checklist wrongly marks "Maroo's Ayatan Hunt" as done

**Reported**: 2026-09-07 ~17:42, by the user, about the **live/Stable app** (not Preview) — "the live app, not the preview says I've done ayatan hunt when I havent."

**Where to start looking**: the task is defined in `src/contexts/MonitoringContext.jsx:533` — `{ id: 'ayatan', label: "Maroo's Ayatan Hunt", labelKey: 'checklist.task_ayatan' }`. That's the only reference to `'ayatan'` in that file, meaning the actual completion-detection logic (whatever marks it done) is either generic/shared across many tasks (not ayatan-specific code) or lives somewhere not yet located (e.g. `Checklist.jsx` itself). Not investigated further — needs its own dedicated look at how ANY weekly task's "done" state gets computed/reset, since the bug might be in that shared logic rather than anything ayatan-specific.

**Status**: Documented only. Not fixed. Not investigated beyond locating the task definition.

## 2. Faction "treasure"/junk turn-in items missing acquisition info — confirmed real, scoped, not yet fixed

**Reported**: 2026-09-07 ~17:40-17:53. User showed "35mm Film" displaying no acquisition info, said "dont just look at fixing this one item," then corrected two wrong guesses made while investigating (see below), then clarified the real category: "this is one of the faction items you pick up and can turn in for standing. theres a whole category for these across a ton of factions."

**How acquisition info actually resolves (traced through the real code, not assumed)**, in order:
1. `getItemDrops()` in `acquisitionData.js` — checks an in-memory index built from `DropsAll.json`, a **third-party community drop-table database** (`drops.warframestat.us`, maintained by WFCD, not this project).
2. `RESOURCE_LOCATIONS` — a large hand-curated object literal hardcoded directly in `acquisitionData.js`.
3. `wiki-resources-acquisition.json` — a small bundled "last resort" fallback file (429 entries), explicitly documented in code as only covering cases where the richer async data hasn't loaded yet.

**Confirmed via the real wiki (not guessed)**: "The Hex" syndicate has exactly 8 "Hex Treasures" traded to Leticia Garcia for standing — Big Bytes Pizza (2,500), Argon Burger Meal (1,500), 35mm Film (750), Cheddar Crowns Cereal (750), Mood Crystal (750), Chuggin' Along Sixpack (750), On-lyne CD (750), The Countessa Comic (750). **None of these 8 appear in any of the three resolution layers above** — confirmed by direct search, not assumption.

**Checked Red Veil too** (user asked specifically): Red Veil's equivalent turn-in item is **Syndicate Medallions** (a mechanic shared across all six "Old War" syndicates - Red Veil/Steel Meridian/Perrin Sequence/Arbiters of Hexis/New Loka/Cephalon Suda - not per-syndicate named treasures like Hex has). Medallions are absent from `RESOURCE_LOCATIONS` and the fallback JSON, but **are present in `DropsAll.json`** (the primary layer) — so medallions likely already resolve correctly via the drop-table path and are probably NOT actually broken. Not fully confirmed end-to-end (didn't trace a medallion through the full UI), but the data exists where it needs to for the primary lookup to work, unlike Hex Treasures.

**Two wrong guesses made and corrected during this investigation** (both flagged and retracted by the user, keeping here as a record, not to repeat):
1. Wrongly assumed the "1999Wf" folder-name prefix meant "recently added content, scrape predates it" — user confirmed this content has been out over a year. Retracted; the real reason WFCD's community database doesn't track these is more likely that "walk up and interact with a treasure to turn in for standing" isn't a "drop" in the traditional kill/mission-reward sense their database is built around, not a timing issue.
2. Loosely called `wiki-resources-acquisition.json`'s origin "a scrape" without ever finding or verifying an actual scrape script — no such script was found in either the isolated checkout or the main repo. Its actual generation process is still unknown.

**Hex Treasures: FIXED (2026-09-07, during the "work on this page's problems" round).** Added all 8 verified entries to `RESOURCE_LOCATIONS` in `acquisitionData.js`: Big Bytes Pizza and Argon Burger Meal noted as guaranteed Höllvania-mission finds; the other 6 (35mm Film, Cheddar Crowns Cereal, Mood Crystal, Chuggin' Along Sixpack, On-lyne CD, The Countessa Comic) noted as random finds among themselves — the wiki doesn't differentiate acquisition further between those 6, so using the same text for them reflects the source accurately rather than guessing a pattern. All 8 also note the shared alternate sources (Techrot Safe via Biocode in Hell-Scrub, Höllvania Bounties, Parazon Mercy on Technocyte Coda). Not yet visually confirmed in the running app.

**Syndicate Medallions**: not fixed, not fully confirmed either way — left as "probably fine via `DropsAll.json`" per the earlier note. Someone should spot-check one directly before assuming.

## 3. Minor / other item bugs

- **Sidebar (main nav) text too small — FIXED, not yet visually confirmed.** Bumped `.preview-nav__group-heading` from 9px→10px and `.preview-nav__row > button:first-child` from 12px→13px in `preview-shell.css`.
- **Acquisition detail panel text too small — FIXED, not yet visually confirmed.** Bumped every hardcoded size in `AcquisitionDrawer.jsx` by +2px (9→11, 10→12, 11→13), across the ingredient list, ingredient ownership rows, drop-source rows, and the "How to Obtain" label. (Caught and fixed a bug in my own fix along the way: a naive sequential find-and-replace double-bumped three of the original-9px lines to 13px instead of 11px — corrected before rebuilding.)
- **Window-resize stutter** — not yet investigated. Could be related to the new `clamp()`/`auto-fill` responsive CSS added this session, or pre-existing. Needs its own look, not a guess.
- **"Railjack Recall" shows as not-owned — FIXED, not yet visually confirmed.** Confirmed via the user's own real inventory data that Railjack ownership is signaled by a non-empty `raw.CrewShips` array (their account has exactly 1 entry there). Mirrored the exact existing special-case pattern already used for the Archwing Omni Tool (`RepairTool`, which checks `raw.ArchwingEnabled` since it's auto-granted rather than stocked like a normal consumable) — added the same treatment for `RecallToRailjack` in `inventoryParser.js`, checking `raw.CrewShips.length > 0` instead. Wiki lookups for "Railjack Recall" specifically both 404'd; this fix relies on the user's own firsthand account of the mechanic plus the real inventory-data structure, not a wiki citation.
- **"Scorpion Specter" wiki link — RESOLVED. Confirmed correct name via the game's own export data, not a bug.** Checked `ExportGear.json` + `dict.json` directly (ground truth, not the wiki, not a guess): `MacheteWomanBall`'s name key (`/Lotus/Language/Items/MacheteWomanBall`) resolves to `"Scorpion Specter"`, description `"Deploys a SCORPION EXIMUS unit to fight for you."` — a real, correctly-named combat specter (same `SummonNpcItem` family as StalkerBall, ClemBall, MoaBall, AncientHealerBall, etc.).
  - User correctly flagged that "Scorpion Eximus" isn't a real, distinct enemy type. Verified: `MacheteWoman` is DE's internal name for the actual Grineer **Scorpion** unit (confirmed via other real dict entries using the same internal name — "Kuva Scorpion", "Drekar Scorpion", "Narmer Scorpion"). "Eximus" is not a unique enemy — it's the generic modifier system applicable to most enemy types across factions. So the description means "summons a Scorpion-type unit with the Eximus modifier applied," a generic composition, not a uniquely-named creature. That's exactly why it has no dedicated wiki article and why the search-based wiki link correctly finds nothing — not a translation error, not a code bug. No code changed, no fix needed.
  - Investigated because the user recalled a gear-wheel item with one fixed name whose summoned result depends on whichever crew member is currently assigned — that's a **different, real item**: `CrewmateBall`, in-game name **"On Call Crew"** ("Call in a designated crew member for backup in non-Railjack missions"). Unrelated to Scorpion Specter; they're just neighboring entries in the same gear family. No action needed on this either — just a naming mix-up during investigation, now cleared up.

## 4. Scorpion Specter is not an isolated gap — 6 gear-wheel Specters/Summons have zero acquisition data anywhere in the app

**Reported**: 2026-09-07, user asked to check the downloaded Specter wiki pages against the app's coverage of the whole `SummonNpcItem`/"Ball" gear family (StalkerBall, ClemBall, MoaBall, MacheteWomanBall, etc.) that Scorpion Specter belongs to, not just that one item.

**Method**: Checked the real in-game names/descriptions for all 13 items in this family directly against `ExportGear.json` + `dict.json`, then checked each against all data layers the app's acquisition lookup actually uses: `RESOURCE_LOCATIONS` (hand-curated, in `acquisitionData.js`), `wiki-resources-acquisition.json` (429-entry fallback), `wiki-page-acquisition.json` (770-entry fallback), and `DropsAll.json` (primary community drop-table database). Cross-referenced against the downloaded `Syndicate.pdf` wiki page, which documents 6 of these 13 as the standard Rank 1 "Eximus Specter" purchase offered by each of the 6 core Faction Syndicates.

**Confirmed covered** (present in `DropsAll.json`, so the primary lookup path should already resolve them — not verified end-to-end in the live UI):
- Ancient Protector Specter (New Loka Rank 1)
- Charger Specter (Red Veil Rank 1)
- Corrupted Lancer Specter (Arbiters of Hexis Rank 1)
- MOA Specter (The Perrin Sequence Rank 1)
- Roller Specter (Steel Meridian Rank 1)
- Shield Osprey Specter (Cephalon Suda Rank 1)
- Clem Clone

**Confirmed missing from every single layer** — no acquisition info anywhere in the app:
- **Scorpion Specter** (`MacheteWomanBall`)
- Corrupted Bombard Specter
- Corrupted Heavy Gunner Specter
- Desert Skate Specter
- Stalker Specter
- On Call Crew (`CrewmateBall`)

None of these 6 are among the standard 6 syndicate-rank-1 offerings, which is presumably why the community drop-table database doesn't track them either.

**Update — real sources found via the wiki's master `Specter` page** (https://wiki.warframe.com/w/Specter, downloaded as `Specter.pdf`), which has a dedicated "Miscellaneous Specters" section:
- **Clem Clone**: reward for the final mission of "A Man of Few Words" quest; additional blueprints from Darvo's weekly "merchandise acquisition" Survival mission.
- **Corrupted Bombard Specter**: was a Baro Ki'Teer exclusive, available Feb 24–26, 2017 (PC) for 100 Ducats + 50,000 Credits.
- **Corrupted Heavy Gunner Specter**: was a Baro Ki'Teer exclusive, available May 4–6, 2018 (PC) for 100 Ducats + 40,000 Credits.
- **Desert Skate Specter**: guaranteed reward from the Baro Void-Signal mission.
- **Stalker Specter**: reward from Nightwave's Nora's Mix Volume 7, returned as a reward in Operation: Belly of the Beast.
- **On Call Crew**: confirms the earlier finding — unlocked at Command Intrinsic Rank 9.

These 5 (On Call Crew already covered) now have real, verifiable sources and could be added to `RESOURCE_LOCATIONS` in a future round.

**Scorpion Specter is the outlier**: it does not appear ANYWHERE on this page, including its thorough "Miscellaneous Specters" list which documents even one-time Baro exclusives from 2017/2018 and the very recently added "Surge Eximus" specter. Given how exhaustive this page is, the omission suggests Scorpion Specter may be unused/inaccessible content rather than just a documentation gap — not confirmed, but this is the strongest signal yet that it may not be legitimately obtainable in the live game at all. No acquisition entry should be written for it without further evidence it's actually reachable by players.

**Root cause of why this whole category was missed** (user asked directly: "how did you miss these specters"):
1. `RESOURCE_LOCATIONS` was hand-curated almost entirely around mining/fishing resources, materials, and standing-bought blueprints (sampled the real entries to confirm: pyrotic alloy, fish oil, coprun, alloys bought from Old Man Suumbaat/Smokefinger, etc.). Gear-wheel consumables like specters were never in scope for whoever built that list — the Hex Treasures added earlier this session were the first non-resource items added to it, and only because a bug was reported.
2. `DropsAll.json` (the primary/automatic layer) only models actual in-mission RNG drop tables. It has the 6 syndicate specters because their blueprints genuinely drop from Death Squad kills — a real drop table. It structurally cannot have Clem Clone (quest reward), the two Corrupted specters (one-time Baro purchases), Desert Skate (fixed mission reward), or Stalker Specter (Nightwave reward) — none of those are "drops," so no drop-table database, however complete, would ever contain them.

Conclusion: not an oversight on any one item, but a structural gap between "normal resource" (covered) and "normal RNG drop" (covered) that this whole "rare/one-off specter" category falls through. Same root cause likely applies to other item categories — see item #0 above (full wiki-archive-vs-app audit, future task).

## Future feature ideas (not bugs — do not start without explicit ask)

- **Mastery screen: imagery on the mastery tabs.** Requested 2026-09-07 by the user while reviewing the Mastery screen. Currently the category tabs/list (Warframes, Weapons, Star Chart, etc.) appear to be text-only; user would like some kind of visual/image element added to these tabs. No specifics given yet on what imagery (category icons? item thumbnails? something else) — needs clarification before implementation.
- **Collectibles screen: add game achievements ("Challenges").** Requested 2026-09-08 by the user — the Collectibles screen is aimed at completionists, and achievements fit that theme. **Corrected feasibility note** — initially wrongly claimed Warframe has no in-game achievement system and would need a separate Steam/platform API integration; user corrected this by pointing to `https://wiki.warframe.com/w/Challenges`. Verified: Warframe has its own DE-tracked in-game "Challenges" system (pause-menu screen, permanent goals across categories like Nightwave/Evolution/Riven/Account, not platform-specific), and it's **fully feasible with data this app already has**:
  - `ExportChallenges.json` (already fetched by this app's normal export pipeline) has 584 real challenge definitions — `name`/`description`/`icon`/`requiredCount` per entry (e.g. `Challenge_Solve1000Ciphers_Name` → "Cryptographer", description "Solve 1,000 Ciphers.").
  - The player's own `ChallengeProgress` array in their local `inventory.json` (already parsed by this app) has 789 real entries — `{"Name": "Solve1000Ciphers", "Progress": 1000}` — directly matchable to the export definitions by name.
  - No external platform API/auth needed at all; this is the same local-data + DE-export pattern every other screen in this app already uses. Not started — needs a plan (new screen section vs. new Collectibles category) before implementation.
- **Foundry: clicking an ingredient in the recipe panel should open its own acquisition-info popup.** Requested 2026-09-08 by the user. Currently `RecipeDrawer`'s ingredient rows (in `Foundry.jsx`) are static — image, name, have/need counts — with no click interaction. The ask: clicking one should open the same acquisition-info popup pattern used elsewhere in the app (`AcquisitionDrawer`, the panel used by Mods/Cosmetics/Relics/Rivens, just fixed for Foundry's own recipe panel in this same session) showing that specific ingredient's acquisition sources. Not started — would need wiring `AcquisitionDrawer`/`useAcquisitionDrawer` into `Foundry.jsx` (it currently doesn't import either) and deciding how a second-level nested panel (ingredient info opened from within the recipe panel, which is itself a panel) should stack/behave, since there isn't an existing precedent for a panel-within-a-panel in this app yet.

**Status**: 5 of 6 items now have verified real-world sources (documented above, not yet added to code). Scorpion Specter's status remains open and is now the most interesting outlier — possibly cut/unused content. Nothing coded yet.

## 5. Mods screen — exhaustive wiki cross-check, RESOLVED (2026-09-07 night session)

**Reported**: user asked why the app showed only 6 Exilus mods and ~1400 total mods against the wiki's ~1529, then explicitly demanded an exhaustive, every-category check of the wiki's "List of Mods" page rather than spot-checks.

**Root-caused, fixed, and verified via a real Node harness running the actual `parseInventory()` production code** (not guessed, not spot-checked in the UI):

1. **Exilus detection was using the wrong field.** `polarity === 'AP_TACTIC'` (Naramon) was mistaken for the Exilus marker; DE's real field is `isUtility: true`. Fixed in `isModExilus()` in `inventoryParser.js`. Verified: 152 mods now match, vs. the wiki's 153.
2. **My own audit methodology was checking the wrong artifact for over half the session.** Checking raw `ExportUpgrades.json` on disk directly (as if it were the only data source) made ~54 mods look missing, mostly Plexus mods. The real app pipeline merges in `WI_Upgrades` — mod data from the bundled `warframe-items` npm package (already the latest published version, 1.1269.87) — which already has all 82 current Plexus mods. A Node harness that actually calls `parseInventory()` with the real merged data proved this: 0 Plexus mods were actually missing. Lesson: any future "is X in the app" check must go through the real merge pipeline, never the raw export file alone.
3. **Genuinely missing (verified via wiki, not assumed): "Flawed Mods" were being silently discarded by the display-name dedup.** DE gives a Flawed mod's `name` loctag the *exact same* resolved string as its normal counterpart (`isStarter: true` is the only distinguishing field) — so the catalog's `name.trim().toLowerCase()` dedup key treated every Flawed mod as a duplicate of the normal one and dropped it. Fixed: `isFlawedMod()` now prepends `"Flawed "` to the display name before the dedup key is computed, in both the owned-mods and mods_catalog loops in `inventoryParser.js`. Recovered 104 real, separately-obtainable items (Cressa Tal / Iron Wake antiques, confirmed via `ExportVendors.json`'s `IronwakeFlawedModVendorManifest`).
4. **2 real, very recent mods (Overpressured Rounds, Prototype Shock Coils — Update 43.5, 2026-08-12) were missing because the bundled npm package lags the `warframe-items` GitHub repo by weeks**, which itself lags the live game. Fixed with a new, narrow live-fetch gap-fill path: `WFCD_Mods.json` added to `WFCD_GAPFILL_FILES` in `main.rs` (refreshed daily, same as the existing weapon/skin gap-fill files), merged into `WI_Upgrades` via the new `fillModGaps()` in `wfcdGapFill.js` (wired into `MonitoringContext.jsx`) — only adds a uniqueName genuinely absent from the bundled map, never overrides it. This is a real, ongoing gap: `warframe-public-export-plus` (the primary DE-data mirror) itself hadn't been updated in 5+ weeks as of this session (confirmed via `gh api` against the live repo), so both of the app's normal update paths can lag a live content release by a month or more; this live WFCD_Mods fetch is the fix for that specific gap.
5. **2 real, verified, currently-obtainable "Primed" Baro Ki'Teer mods (Primed Combustion Rounds, Primed Polar Magazine) were being wrongly hidden** by the blanket "hide unowned + `excludeFromCodex`" filter. DE marks a Primed mod's definition `excludeFromCodex: true` because in-game it's shown merged into the base mod's card, not as a separate Codex entry — but it IS a separately purchasable item. Verified individually via the wiki (both introduced this game update cycle: Hotfix 42.0.11 and 43.5.4) before fixing — per this project's standing rule, never pattern-guessed or batch-applied. Fixed via a new, narrow `VERIFIED_REAL_DESPITE_EXCLUDE_FROM_CODEX` allowlist next to the existing `UNOBTAINABLE_UNOWNED_MODS` set in `inventoryParser.js`. **Other `.../Expert/`-path mods individually re-checked (2026-09-08), all 4 confirmed correctly hidden.** The 4 mods already in `UNOBTAINABLE_UNOWNED_MODS` (`WeaponCritChanceModExpert` / "Primed Shotgun Crit Chance", `SniperReloadDamageModExpert`, `ArchwingWeaponElectricityDamageModExpert`, `AvatarShieldRechargeRateModExpert`) were checked against the live export data and the wiki, unlike the 2 Primed Baro mods above. Unlike those two, these carry DE's own never-released markers: all 4 have `isFrivolous: true`, `tradable: false`, and `codexSecret: true`; `ArchwingWeaponElectricityDamageModExpert` additionally has `introducedAt: 9999999999` (DE's sentinel for content that was never shipped). Cross-checked against the wiki's "List of Mods" page: the only mods with "Legendary" rarity documented anywhere on that page are the 5 real Archon mods (Continuity/Flow/Intensify/Stretch/Vitality) — none of these 4 appear under any name. No fix needed; correctly hidden as-is.
6. **2 wiki-listed mods (Martial Magnetism, Tracking Shot) are confirmed correctly absent** — the wiki's own "Archived" Conclave section, meaning DE removed them from the game entirely. Verified they have zero trace anywhere in the game's localization dictionary, not just the mod table. Not a bug.

**Final verified state**: mods catalog produces 1505 entries in the running app (confirmed visually 2026-09-08, up from the 1503 harness figure due to normal live-data drift since), matching every one of the ~1236 mod/augment names transcribed from every section of the wiki's "List of Mods" page (Warframe, Aura, all weapon types, Companion, Archwing, Plexus, Necramech, K-Drive, full Weapon Augments by-source and by-weapon, full Conclave, full Antique/Focus) except the 2 confirmed-removed Conclave mods above.

**Native rebuild + in-app re-confirmation: DONE.** Preview app rebuilt and relaunched, mod-card icons confirmed loading correctly, total count confirmed showing 1505. Mods screen audit is closed.

## 6. Broader WFCD cross-check (started per user request, not exhaustive yet)

User asked to also cross-check all other item categories (not just Mods) against WFCD's live data, and to look at WFCD's other GitHub repos for anything useful. Time-boxed first pass, not exhaustive:

- **Weapons and Cosmetics**: already covered by the existing `wfcdGapFill.js` live gap-fill (added a prior session, confirmed still working).
- **Warframes**: 1 discrepancy — Excalibur Prime missing from the unowned catalog. Very likely deliberate (Founders-exclusive, permanently unobtainable, commonly excluded from "browsable catalog" tools) rather than a bug, but not verified either way — needs an individual check before touching.
- **Sentinels, Arcanes**: no confirmed gap found (Arcanes' check script had a field-name issue and its "app=2" result should not be trusted — needs re-running with the correct field before concluding anything).
- **Resources**: 1 discrepancy — "Ascaris Prime" (`TwelveBossResourcePrimesItem`), name pattern suggests an internal/placeholder entry, not verified either way.
- **Relics**: attempted, inconclusive — a quick harness check came back with "0 relics in the app" against WFCD's 3120, which is obviously wrong (the Void Relics screen visibly works and was already QA-confirmed this session) and means the check script read the wrong result field or needs real inventory data to populate the relic catalog, not that relics are actually missing. Needs a corrected script, not a re-guess at the result.
- **Not checked at all yet**: Gear, Customs/cosmetics beyond the existing gap-fill, Rivens, Syndicates, Nightwave, K-Drive, Necramech gear, Focus (Amps/Operator items beyond the mod list already checked).

**WFCD repo research** (per user's request to look for other useful WFCD tools):
- **`WFCD/mod-generator`** — a TypeScript library that renders full mod card PNGs (common/uncommon/rare/primed frames + rivens) programmatically from `warframe-items` data (name, rank, rarity, polarity) rather than needing DE's real hash-addressed icon CDN path at all. Directly relevant: every mod this session's gap-fill added (Flawed mods, Plexus mods, the 2 new Baro Primed mods, Overpressured Rounds/Prototype Shock Coils) has no real DE icon and shows the "Image Unavailable" placeholder today. This library could generate real-looking card art for exactly those items. **Not implemented** — this is a real architecture decision (Node/canvas-based image generation, needs either a Rust equivalent or a build-time pre-render step bundled as static assets), not a narrow bug fix, so it needs the user's buy-in before starting.
- **`WFCD/warframe-patchlogs`** — parsed, structured patch notes with per-item lookup. Could replace this whole session's manual "diff the wiki against the data" approach with an automated "what did the last N patches add" check — worth considering as the real long-term fix for the staleness problem found in item #5.4 above, instead of repeating ad hoc audits like this one.
- **`WFCD/warframe-relic-data`** — an easier-to-parse relic dataset; could be a freshness cross-check for Relics the same way `warframe-items`/Mods.json was for Mods, if the not-yet-checked Relics audit above turns up real gaps.
- Confirmed **`warframe-public-export-plus` (the primary DE-data mirror this app's main export pipeline uses) had gone 5+ weeks without an update** as of this session (last commit 2026-07-29) — this is the root cause behind item #5.4 and is worth knowing about generally: any category that relies solely on that source (not just Mods) can silently lag a real content update by a month or more until its next commit.

## 7. Inventory: "Circle of Comrades" Series on VHS shows "no verified acquisition route" — unverified, not a bug fix, just missing data

**Reported**: 2026-09-08, Inventory screen, item detail panel says "No verified acquisition route is known for this item."

**Same root cause as item #2 above (Hex Treasures), not a wiki-staleness issue** — corrected after initially misdiagnosing this as the wiki archive being too old for recent content (it isn't; retracted, see below). Not the same issue as the earlier "long title breaking mid-word" display bug for this same item either (that was a pure CSS fix, already resolved — see `FULL-APP-QA-PASS.md`).

The item (`/Lotus/Types/Gameplay/1999Wf/Gifts/VideoCassette`, `productCategory: MiscItems`) is a "Gift" item from the 1999/Höllvania Hex content — same family as the Hex Treasures (`35mm Film` etc.) in item #2, but the "Gifts" sub-mechanic rather than the "Treasures" one already fixed there. Traced through the same 3 resolution layers item #2 used: confirmed absent from `DropsAll.json` (0 matches), `RESOURCE_LOCATIONS` in `acquisitionData.js` (0 matches), and every `wiki-*-acquisition.json` fallback file (0 matches). Same likely explanation as item #2: a give-to-NPC mechanic isn't a "drop" in the traditional kill/mission sense `DropsAll.json`'s community database is built around, not a timing/staleness problem.

**Retracted wrong guess**: initially checked only the local wiki archive (`wiki_pdf_archive.sqlite`) and, finding no coverage there, concluded the archive predates this recent content. That was the wrong layer to check — the actual bug lives in the acquisition-resolution data (above), and checking wiki-page completeness for a name match doesn't test that path. Flagged by the user, who correctly identified this as the same already-known category as item #2.

**Not fixed, not chased further per user's explicit choice** ("if it's in the log of fixes, that's fine, and will probably be caught by the Gemini wiki finds" — see `FULL-CATALOG-WIKI-AUDIT-BRIEF.md`). If picked up, fix the same way Hex Treasures were fixed: find the real wiki-verified "Gifts" acquisition source (likely a Höllvania shop purchase or bounty/standing reward) and add a verified entry to `RESOURCE_LOCATIONS` — do not guess from the item name.

## 8. Fan Channel Partner Glyphs (453 items) show raw scraped payment-pitch text instead of a real promo code — deferred, scoped, real data already gathered

**Reported**: 2026-09-08, Inventory screen, "-Chroma- Prime Partner Glyph" acquisition panel showed unrendered markdown (`* Join the youtube channel member (payable)` / `[community](url)` shown as literal brackets, not a link) sourced from `browse-wf-glyphs.json`. User: "this is unacceptable acquisition."

**Root cause**: `/Lotus/Types/StoreItems/AvatarImages/FanChannel/...` is DE's real "Creator Glyph" program — 453 entries in `browse-wf-glyphs.json` (out of 484 total glyphs in that file), each a named content creator's exclusive profile glyph. The acquisition text for these currently comes straight from that file's raw `markdown` field (a scraped copy of the creator's own promotional blurb), rendered as plain text with no markdown parsing and no framing that it's a personal-creator perk rather than a normal DE-sold item.

**Real fix, verified against the live wiki (`https://wiki.warframe.com/w/Glyph`, "Creator Glyphs" section), not the flattened PDF archive (which strips hrefs)**:
- The wiki's own text: "many are implemented with universal Promo Codes which can be freely redeemed by any player... some are only given out by the creators personally."
- Redemption URL format, confirmed via WebSearch + the live page's actual links: `https://www.warframe.com/promocode?code=<CODE>` (codes are entered in-game via Market > Redeem Code, or the URL auto-fills the box).
- Scraped the live page's HTML directly (not the archive) and extracted **271 real creator→code pairs** into `docs/revamp/stage-4/creator-glyph-promo-codes.json` for whoever picks this up — no need to re-scrape. **Caveat**: this raw extraction wasn't scoped strictly to the "Creator Glyphs" section: the same page also has a separate "Promo Code/Drop Glyphs" section using the identical link format, so a few non-creator codes (e.g. `CONQUER`, `QTCC`, `WARWITHIN`) are mixed into the same file. Needs re-scoping to just the Creator Glyphs section (or cross-checking against `browse-wf-glyphs.json`'s 453 names) before use.
- Checked the specific reported item directly: **"-Chroma-Prime" has no code among those 271** — confirmed via the live page, not assumed. This one is a genuine "personally distributed" case per the wiki's own caveat; the current text isn't factually wrong, just badly presented (raw markdown, payment-pitch framing).

**Proposed fix (not implemented, deferred per user's explicit choice — "put in bug fix list to do later")**:
1. Match `browse-wf-glyphs.json`'s 453 Fan Channel entries against the creator-code list by name (formatting differs between sources, e.g. WFCD's `"-Chroma- Prime Partner Glyph"` vs the wiki's `"-Chroma-Prime"` — needs careful normalization, not a naive string match).
2. For matched (coded) creators: replace the raw markdown with something like "Made for content creator **{name}**. Redeem promo code **{code}** in the in-game Market, or visit warframe.com/promocode?code={code}."
3. For unmatched (personal-only) creators: a neutral note naming the creator without reproducing their raw payment pitch — e.g. "Personal fan-channel glyph for content creator **{name}**. No public promo code is documented; distributed directly by the creator to channel members."
4. Should probably also be checked by the Gemini full-catalog wiki audit already running (`FULL-CATALOG-WIKI-AUDIT-BRIEF.md`) — Cosmetics/Glyphs is in its scope.

## 9. Default skins with no unlock condition (e.g. "Amesha Skin") wrongly show as MISSING — same root cause as this session's emote fix, not yet applied generally

**Reported**: 2026-09-08, Cosmetics screen, Archwing filter, "Amesha Skin" shows the MISSING badge under the Unowned filter, but its own acquisition panel says "Available directly in the in-game customization menu" — a direct contradiction on screen.

**Root cause, confirmed via export data (not guessed)**: `/Lotus/Upgrades/Skins/Archwing/SupportDefaultArchwingSkin` (Amesha's default look) carries `alwaysAvailable: true` with **no** `requirement` field at all — `tradable: false`, `excludeFromMarket: true`. This is the exact same flag combination as the Emotes fixed earlier this session (Agree, Wave, etc. — see item resolved in `FULL-APP-QA-PASS.md`/this session's Cosmetics work): `alwaysAvailable` + no paired `requirement` token means genuinely free-for-everyone, per `acquisitionInfo.js`'s own `buildAlwaysAvailableIndex` comment, which already documents this exact distinction (paired `requirement` = conditional/frame-locked, like Animation Sets; no `requirement` = unconditionally free, like Emotes).

**Why it's still broken here**: the emote fix in `Cosmetics.jsx` (`entry?.alwaysAvailable === true` in the ownership check) was applied narrowly to the Emotes loop only. The general Skins loop (which Amesha Skin and any other default Warframe/Archwing/weapon skin goes through) never got the same check, so any skin sharing this flag combination has the identical bug, not just Amesha.

**Not fixed yet — logged per user's request to check/update the bug list, not act immediately.** Likely fix: in the Skins `flatMap` in `Cosmetics.jsx`, add `|| (entry?.alwaysAvailable === true && !entry?.requirement)` to the `isOwned` check, mirroring the emote logic — this is applying an already-verified codebase convention broadly, not a new per-item guess, but should be spot-checked against a few other default skins (e.g. other Archwings' default skins, base Warframe skins) before considering it done.

## 10. Collectibles: Cephalon Fragment location text is a generic fallback for many entries instead of the real wiki-verified planet

**Reported**: 2026-09-08, Collectibles screen, user noticed the "Archaic Weapons" Cephalon Fragment shows a generic "found on the Star Chart" note and pointed out the wiki actually lists specific planets per fragment.

**Confirmed via the live wiki** (`https://wiki.warframe.com/w/Cephalon_Fragments`, not in the local archive — that page wasn't captured in `wiki_pdf_archive.sqlite`): "Archaic Weapons" is listed as **Mercury** specifically (5 scans required), not a generic Star Chart spawn.

**Root cause**: `collectible-locations.json`'s `fragmentItems["Cephalon Fragments"]` has real, correct per-planet text for planet-named fragments (`EarthFragmentA` → "Earth (Grineer Forest)", `VenusFragmentA` → "Venus (Corpus Outpost)", etc.) but falls back to vague category-level text for faction/topic-themed fragments — `ArchaicWeaponsFragmentA` → "Star Chart missions", `GrineerLeadershipFragmentA` → "Grineer Star Chart missions". Scope: **54 total Cephalon Fragment items, only 29 distinct location strings** — meaning a meaningful number share these generic fallbacks rather than a real per-item wiki-verified planet.

**Not fixed — deferred per user's explicit choice** ("log it, let Gemini's audit catch it"). Added Collectibles/Lore Fragments as an explicit category to `FULL-CATALOG-WIKI-AUDIT-BRIEF.md`, noting it's a different kind of check than that brief's other categories (acquisition-*location* accuracy for items that already exist, not missing/wrongly-hidden items). If picked up manually instead: fix the same way as prior items here — look up each generic-fallback fragment's real planet on the live wiki individually, no guessing/pattern-copying between entries even though they're all in the same category.

## 11. Foundry UI: Filter bar does not remain sticky when scrolling

**Reported**: 2026-09-08, Foundry screen, user reported that the filters area does not stay fixed/sticky while scrolling through items (it stays at the top of the page container so when scrolling down, it disappears off-screen, unlike other tabs where filter sticky positioning is implemented).

## 12. Foundry UI: Missing categories and incorrect category order compared to in-game Foundry

**Reported**: 2026-09-08, Foundry screen, user reported that the Foundry tab is missing categories and the filter order does not match the official in-game Foundry layout.

**In-game category list and sequence**:
1. All
2. In Progress
3. Ready to Build
4. Warframe
5. Primary
6. Secondary
7. Melee
8. Archwing
9. Companion
10. Landing Craft
11. Appearance
12. Gear
13. Keys
14. Modular (in-game Modular category, distinct from Zaw/Kitgun modular weapon filters)
15. Mining
16. Miscellaneous

**Action required**: Update Foundry filters to include all missing categories and align tab sequence strictly with the in-game order.

**Scoping notes (2026-09-08, checked against the app's current `CATEGORIES` array in `Foundry.jsx`)**: the app currently has only 8 tabs — All, Warframe, Primary, Secondary, Melee, Modular, Arch (Archwing/Archgun/Necramech combined), Companion — versus the 16 real in-game ones above. Confirmed bigger than a reorder:
- **Straightforward reorder/rename**: Warframe, Primary, Secondary, Melee, Archwing, Companion already exist as data (`inventoryData.warframes/primary/secondary/melee/archwings/companions` etc. in `inventoryParser.js`) - just need new tab entries in the right sequence.
- **"Modular" is broader than initially concluded - real screenshots from the user's own in-game Foundry (2026-09-08) confirmed it. PARTIALLY FIXED.** First checked the wiki's "Modular Weapon" page and wrongly concluded "Modular" only meant Zaw/Kitgun/Amp (matching this app's existing tab) - the user's own screenshots of their real in-game Modular category prove otherwise. It contains: Amp prisms (Raplak Prism), MOA/Hound component parts (Cela Bracket, Urga Bracket, Adlet Core), and Predasite/Vulpaphyla breeding materials (Adra/Arioli/Chiten/Zarim Mutagen, Desus/Poxi/Tethron/Virox Antigen).
  - **MOA/Hound/Amp/Zaw component parts: FIXED.** Confirmed real via `partType: "LWPT_ZANUKA_BODY"` on `ZanukaPetPartBodyA` (= "Adlet Core") in `ExportWeapons.json`, with real matching recipes in `ExportRecipes.json`. These were already being parsed into `inventoryData.components` (used elsewhere in the app) but never wired into Foundry's Modular tab. Added `'components'` to the Modular category's `keys` in `Foundry.jsx` (and to `ALL_KEYS`). Also set `masterable: false` on these raw component objects in `inventoryParser.js` (they previously had no `mastered`/`masterable` field at all, which would have wrongly shown them under the "Unmastered" filter). Verified all 22 of the current player's owned components match a real recipe via the existing `recipeByResult` lookup, so they aren't excluded by the #19/#20 no-recipe filter either. **Known limitation**: this only surfaces *owned* components (the underlying array is built from raw inventory only) - unlike every other Foundry category, unowned/browsable component parts don't show yet. Would need extending the data pipeline to enumerate the full component catalog (owned + unowned), not just wiring, if that's wanted.
  - **Predasite/Vulpaphyla Mutagen/Antigen items: NOT FIXED - genuine data gap, not a wiring problem.** Searched every bundled export file (`ExportResources.json`, `ExportGear.json`, `ExportVendors.json`, `ExportWeapons.json`, `ExportSentinels.json`, etc.) for these exact items - none exist anywhere in this app's current data pipeline. The only "Mutagen" hits anywhere are unrelated Clan Research items ("Mutagen Mass"/"Mutagen Sample"). This needs a new data source (e.g. WFCD's `warframe-items` gap-fill, same pattern used for the Mods staleness fix earlier this session) before it can be wired in at all - there's currently nothing to point Foundry at.
- **"In Progress" / "Ready to Build"**: not categories at all in the current data model - these are computed states (a build with a timer running vs. `isReadyToCraft()` already true) cutting across every other category, not a discrete data bucket. Doable, but needs its own filter-predicate logic, not a data key.
- **"Landing Craft", "Appearance", "Gear", "Keys", "Mining", "Miscellaneous"**: none of these have existing category keys in `inventoryParser.js`'s `all`/`craftable` arrays at all - would need real new data wiring (what export tables define them, what counts as owned/built) before they could be added, not just a UI reorder.

## 13. Foundry UI: Raw internal category strings (e.g. `COMPANION_WEAPONS`) and "No recipe data" state on non-craftable items (e.g. Artax)

**Reported**: 2026-09-08, Foundry screen item detail drawer (example shown with **Artax**):
1. **Raw internal key displayed as category**: Sub-header under item name shows `COMPANION_WEAPONS` in raw UPPER_SNAKE_CASE instead of clean user-facing text (e.g., "Companion Weapon" / "Sentinel Weapon").
2. **Missing recipe feedback for non-blueprinted items**: Selecting items like Artax displays "No recipe data is available for this item." in the detail panel.

**Details & Action Required**:
- **Category string formatting**: Ensure category/type tags pass through a display Formatter or dictionary lookup to convert raw internal constants (`COMPANION_WEAPONS`, `LANDING_CRAFT`, etc.) to title-case human-readable labels.
- **Recipe vs Acquisition handling**:
  - Audit items included in the Foundry view — items that do not have blueprints/recipes (such as default Sentinel weapons like Artax, which are granted automatically with the Companion) should either be omitted from the Foundry craftable items list or clearly explain how the item is obtained (e.g. "Acquired automatically with Taxon Sentinel") rather than displaying a blank "No recipe data is available for this item" message.

## 14. Companion / Catalog UI: Custom pet name (e.g. "Chow Chow") overwrites base item name in catalog title

**Reported**: 2026-09-08, Foundry / Companion item card (example shown with **Chow Chow (Chesa Kubrow)**):
- The app is displaying the user custom named companion ("Chow Chow") directly in the item card header.

**Details & Action Required**:
- **Problem**: Player inventory instance data (which contains custom pet names like "Chow Chow") is leaking into or overwriting the primary catalog item title.
- **Expected behavior**: Catalog, Foundry, and general item views should always display the canonical base item name ("Chesa Kubrow"). Custom user-assigned pet names should only be shown on specific instance details or as secondary metadata, not as the main catalog item title.

## 15. Ownership False Positive: Vizier Predasite falsely marked as OWNED when not in player inventory

**Reported**: 2026-09-08, Companion / Inventory view, **Vizier Predasite** displays as OWNED despite the player not owning the companion in game.

**Details & Action Required**:
- **Problem**: Vizier Predasite shows as owned in the app, but the player does not own an assembled Vizier Predasite in their actual inventory (`inventory.json`).
- **Likely root cause**: Ownership checking logic for Deimos/modular companions may be false-positives matching on unbuilt components, captured wild tags (e.g. *Vizier Predasite Tag* / *Weakened Vizier Predasite*), or utilizing loose string matching on item names/uniqueNames instead of verifying an active built companion entry.
- **Action required**: Audit ownership verification for modular pets (Predasites, Vulpaphylas, Zaws, Kitguns) to ensure component items/tags do not trigger `isOwned` for the finished companion/weapon.

## 16. Companion / Robotic Ownership Mismatches: Modular Hounds (e.g. Fetch.exe) falsely shown as UNOWNED

**Reported**: 2026-09-08, Companion / Inventory screen:
1. **Fetch.exe Hound false UNOWNED status**: Player owns a **Fetch.exe** Hound in their game inventory, but the app marks it as MISSING/UNOWNED.
2. **General Companion/Robotic matching errors**: Major ownership mismatches across Hounds, MOAs, and other modular robotic companions.

**Details & Action Required**:
- **Problem**: Modular robotic pets (Hounds, MOAs, Predasites, Vulpaphylas) store instance data with model/component parameters in `inventory.json`. The catalog `isOwned` matcher fails to map assembled Hound instances (e.g. Fetch.exe model) back to their corresponding base catalog entries.
- **Action required**: Comprehensive audit of Companion, Sentinel, Hound, and MOA ownership mapping logic against player inventory (`inventory.json`). Update uniqueName and model resolution so all built robotic companions accurately reflect true ownership status.

## 17. Foundry UI: Mastered and Unmastered filters clear all items in the Modular tab

**Reported**: 2026-09-08, Foundry screen, `MODULAR` category tab:
- Selecting either the **Mastered** or **Unmastered** filter toggle removes all items from the view (0 items displayed for both settings).

**Details & Action Required**:
- **Problem**: Modular items (Zaw strikes, Kitgun chambers, Amp prisms, K-Drive boards, etc.) fail mastery status evaluation in the filter logic. Because `isMastered` resolves to `undefined` or null for these items, both `isMastered === true` and `isMastered === false` (or `!isMastered`) filter checks fail to match any items.
- **Action required**:
  1. Fix mastery status resolution for modular weapon components so that strike/chamber components properly inherit or evaluate mastery progress from player inventory/mastery data.
  2. Fallback/sanitize filter checks so undefined/null mastery states default cleanly (e.g. Treat unmastered component as `isMastered === false`).

## 18. Mastery Status False Negative: Grimoire (Secondary Tome) falsely marked as UNMASTERED

**Reported**: 2026-09-08, Weapons / Secondary view:
- **Grimoire** is incorrectly displayed as UNMASTERED despite the player having fully mastered the weapon in-game.

**Details & Action Required**:
- **Problem**: The Grimoire (Tome category secondary weapon) fails mastery verification when checking player inventory/mastery data (`inventory.json`).
- **Likely root cause**: Grimoire belongs to the newer `Tome` weapon category (`/Lotus/Weapons/Tenno/Grimoire/...`). The mastery lookup logic may be missing the Tome category mapping or failing uniqueName normalization when matching player XP records.
- **Action required**: Audit mastery tracking logic for Tomes and newer weapon classes (Grimoire, Dante weapons, etc.) to ensure player XP entries correctly flip `isMastered` to true.

## 19. Foundry Data Pipeline: Non-craftable pre-built weapons (e.g. Zylock) leaking into Foundry catalog with missing recipes

**Reported**: 2026-09-08, Foundry screen, **Zylock**:
- **Zylock** appears in the Foundry view with "No recipe data is available for this item."

**Details & Systemic Issue**:
- **Non-craftable item leak**: Zylock is a pre-built weapon (purchased directly from Baro Ki-Teer or event rewards) and has **no** crafting blueprint or recipe components in Warframe.
- **Root Cause**: The Foundry item catalog pipeline is not properly restricting the Foundry list to craftable/blueprinted items. Pre-built weapons, syndicate weapons, and event rewards without blueprints are leaking into the Foundry screen, generating "No recipe data" errors.
- **Action Required**:
  1. Audit catalog filter logic for the Foundry tab (`sync-wfcd.js`, `acquisitionInfo.js`, or item indexing).
  2. Enforce a strict filter: Foundry catalog items MUST have a valid crafting recipe/blueprint dataset (`components`, `ingredients`, or `recipe`).
  3. Non-craftable items should be strictly excluded from the Foundry tab (and placed only in Weapons/Inventory acquisition views).

## 20. Foundry Data Pipeline: Non-craftable Adversary weapons (Technocyte Coda, Kuva, Tenet) appearing in Foundry tabs

**Reported**: 2026-09-08, Foundry screen, Primary category filter:
- Non-craftable **Coda weapons** (1999 Technocyte Coda adversary weapons) appear in the Primary Foundry list with no recipe data.

**Details & Action Required**:
- **Problem**: Adversary weapons (Technocyte Coda, Kuva, and Tenet variants) are obtained fully built upon vanquishing adversaries. They are not crafted in the Foundry and do not have blueprints.
- **Scope**: Affects Coda, Kuva, and Tenet weapons appearing under Primary, Secondary, and Melee Foundry tabs.
- **Action Required**: Add explicit category/item filtering to strip non-craftable Adversary variants (`Coda`, `Kuva`, `Tenet`) from the Foundry item index.

- **Additional examples reported**: **Dex Sybaris** (Anniversary gift pre-built weapon delivered via inbox with pre-installed Orokin Catalyst). Other non-craftable lines to filter out include Dex weapons, Syndicate pre-builts, Invasion pre-builts, and Quest pre-builts.

## 21. Relics UI: Unclear header counter phrasing ("Showing 768 relic types. Out of 2006 total")

**Reported**: 2026-09-08, Relics screen sub-header:
- Relics tab displays counter text: "Showing 768 relic types. Out of 2006 total"

**Details & Action Required**:
- **Inconsistent UX**: Other screens (Foundry, Cosmetics, Inventory) use standardized counter formatting such as `41 / 109 OWNED`. The Relics phrasing is inconsistent with overall app header styling.
- **Action Required**: Update Relics header stat counter to align with standard app format (e.g. `768 / 2006 RELICS OWNED` or `768 / 2006 OWNED`).

## 22. Relics Data: Vaulted Relics (e.g. Lith A7 Relic) display active acquisition drop data

**Reported**: 2026-09-08, Relics screen detail drawer for **Lith A7 Relic**:
- **Lith A7 Relic** (which is vaulted) displays active drop location data despite having no current drop sources in game.

**Details & Action Required**:
- **Data inaccuracy**: Vaulted relics do not drop from active Star Chart mission rewards. Displaying mission drop locations for vaulted relics misleads players into trying to farm vaulted items.
- **Root Cause**: Relic drop location lookups are failing to check the `vaulted: true` status flag before rendering drop tables.
- **Action Required**:
  1. Audit relic acquisition rendering (`relics.json`, `acquisitionInfo.js`).
  2. For vaulted relics (`vaulted === true`), suppress active Star Chart mission drop tables and display a clear Vaulted notice (e.g. *"Vaulted — Cannot be acquired from Star Chart missions. Obtainable via trading or Prime Resurgence"*).

- **Investigation Note**: Investigate where the stale drop locations are being ingested from. Check if static drop tables (`relic-locations.json`, `dropSources`, or static dataset files) are caching legacy/historical drop tables without filtering out vaulted relics or if the drop table merger is erroneously attaching active drop nodes to vaulted relic IDs.

## 23. Relics UI: Excessive filter bar height restricts visible Relic grid to ~2 rows

**Reported**: 2026-09-08, Relics screen layout (screenshot provided):
- Filter section spans 5 stacked control rows (Search/Squad/Target, Era, Refinement, Vault, Sort), consuming ~50% of vertical screen height and leaving room for only ~2 visible rows of relics at a time.

**Details & Action Required**:
- **UX / Layout Issue**: Stacking five separate filter bars vertically starves the main content area of screen real estate.
- **Action Required**:
  1. Compact/condense the Relics filter section (e.g. Combine Era + Vault into inline pills, use compact dropdowns, or make secondary filters collapsible).
  2. Reduce top/bottom margins and padding to maximize vertical viewport space for the Relic grid (~4-5 visible rows).

## 24. Relics UI: Filter controls clip off screen edge when window is resized narrower

**Reported**: 2026-09-08, Relics screen layout (screenshot provided):
- When narrowing the application window, the top filter control row (e.g. `TARGET 1 E F R...` group) fails to wrap or adjust, overflowing and clipping off the right edge of the viewport.

**Details & Action Required**:
- **Responsiveness Issue**: Top filter container lacks responsive flex-wrapping or mobile/narrow viewport handling (`flex-nowrap`), making right-aligned controls inaccessible on smaller window sizes.
- **Action Required**:
  1. Apply `flex-wrap: wrap` or container query / media query breakpoints to allow filter pills and target controls to reflow naturally.
  2. Ensure no filter controls are cut off or overflow outside the visible application window boundary.

- **Compact View Update**: The exact same horizontal clipping behavior occurs in **Compact View** mode (sidebar collapsed to icon-only navigation), where the `TARGET` filter controls (`TARGET 1 E F R`) are severely truncated and pushed off the right edge of the viewport.

## 25. Relics UI: Filter logic discrepancy (e.g. Lith A10 renders as Owned but vanishes from both OWNED and UNOWNED filters)

**Reported**: 2026-09-08, Relics screen, **Lith A10 Relic**:
1. In the default unfiltered grid, Lith A10 renders with active "Owned" visual styling (highlighted card with quantity).
2. Setting filters to **Vaulted + Owned** excludes Lith A10 from the results.
3. Switching the ownership filter to **Unowned** also fails to display Lith A10.

**Details & Action Required**:
- **Filtering Discrepancy**: The card rendering pipeline ownership condition differs from the header filter bar ownership filter predicate.
- **Result**: Relics fall into a logic gap where they fail both owned and unowned filter checks, causing them to completely vanish when any ownership filter toggle is active.
- **Action Required**:
  1. Unify ownership determination logic across the Relic catalog, card renderer, and filter pipeline.
  2. Ensure every relic unambiguously resolves to owned or unowned status so no relics disappear under ownership filters.

- **Systemic Scope Confirmed**: **Lith A8 Relic** displays the exact same bug (shows as owned in default grid, but disappears under both Owned and Unowned filter toggles). This confirms a widespread structural discrepancy across the entire Relics catalog filtering pipeline, not an isolated single-item anomaly.

## 26. Relics UI: Unexplained Squad Value Calculation (Plat/Ducat values change without Radshare math explanation)

**Reported**: 2026-09-08, Relics screen, **SQUAD 1 / 2 / 3 / 4** selector:
- Changing the Squad size selector dynamically alters the displayed expected Platinum and Ducat values on relic cards, but gives no indication or tooltip explaining how this math is computed.

**Details & Action Required**:
- **Usability / Transparency Issue**: The squad value calculation assumes a Radshare / Relic Share scenario ($N$ players all running the identical relic at the selected refinement level, calculating expected best-drop probability $1 - (1 - P)^N$). Without context, players find the changing values confusing and misleading.
- **Action Required**:
  1. Add an explanatory info icon / tooltip next to the SQUAD selector (e.g. *"Expected Plat/Ducats assumes a squad of N players running the same relic"*).
  2. Add explicit label context on the card metric when Squad > 1 (e.g. *"Radshare Expected Plat"*).

- **User Preference / Recommendation**: Remove the SQUAD selector entirely from the Relics filter header. Value calculations should focus solely on the individual player expected yields (Squad = 1), removing unnecessary multi-player Radshare math clutter and simplifying the UI.

## 27. Relics Ownership Breakdown: Entire Axi Era relics falsely reported as UNOWNED (0 Owned)

**Reported**: 2026-09-08, Relics screen, **AXI ERA** tab:
- App reports player owns 0 Axi relics.
- Ground truth inventory (`inventory.json`) contains multiple owned Axi relics (e.g. 2x Axi A2, 1x Axi P8, 1x Axi S20).

**Details & Action Required**:
- **Systemic Relic Inventory Disconnect**: Inventory parsing and matching logic for Axi relics fails to connect player inventory quantities to catalog entries.
- **Action Required**:
  1. Audit relic name / `uniqueName` matching in the Relic inventory pipeline for Axi, Lith, Meso, Neo, and Requiem relics.
  2. Ensure inventory relic quantities (`inventory.json`) accurately populate relic card counts and header counters across all Eras.

## 28. Relic Planner UI: Text-heavy layout clashes with app design system & visual aesthetics

**Reported**: 2026-09-08, Relic Planner screen (screenshot provided):
- User reported that the Relic Planner feels completely out of place: plain text bullet lists (`• Akbolto Prime Blueprint`), stark empty column boxes, and lack of visual item cards/thumbnails clash with the app visual style.

**Details & Action Required**:
- **Design Discrepancy**: Unlike the rest of Kieda Orbiter (which uses rich card grids, item renders, status badges, and polished glassmorphism), Relic Planner relies on plain bulleted text lists with no item thumbnails or visual hierarchy.
- **Proposed Redesign Directions**:
  1. **Visual Prime Set & Part Cards**: Replace the plaintext bullet list with visual item cards featuring official Warframe thumbnails, category filters (Warframes, Weapons, Companions), and set completion progress bars (e.g., 3/4 parts owned).
  2. **Interactive Need List**: Represent selected target parts as visual chips/cards with one-click add/remove controls.
  3. **Rich Relic Match Results**: Render recommended relics using the app standard Relic visual cards (including Era icons, refinement tiers, drop probability badges, and owned quantities).


**Detailed Redesign Concepts to Address Later**:
- **Concept 1: Visual Set & Part Card Grid**:
  - Replace plaintext bullet list with visual Prime Set Cards (e.g. Saryn Prime, Lex Prime) featuring official Warframe render thumbnails, category filters (Warframe, Primary, Secondary, Melee), and completion progress bars (e.g. 2/4 parts owned).
  - Expanding a set shows sub-parts as visual badges with one-click "+ Need" toggles.
- **Concept 2: Target Chips & Rich Relic Cards**:
  - Center/Need List: Represent selected targets as interactive part chips with item icons, rarity indicators (Common / Uncommon / Rare), and single-click remove buttons.
  - Right/Best Relics Panel: Render matching relics as standard Relic Cards (matching the main Relics tab) showing official Relic renders, Era badges, owned quantity counter, drop probability badges, and refinement tier toggles (Intact -> Radiant).
- **Concept 3: Goal-Oriented Farm Planner Layout**:
  - Two-stage flow: Select Prime Goal (e.g. Mesa Prime Set) -> Optimal Relic Run Strategy.
  - Highlights owned relics in green cards, unowned relics in orange, and calculates total expected Void Trace / Relic run costs to complete the set.

## 29. Relic Planner UI: Primary action buttons (Clear, Add All Missing, Add Never Obtained) hidden below scroll fold

**Reported**: 2026-09-08, Relic Planner screen (screenshot provided):
- Action buttons (`Clear`, `Add All Missing Parts`, `Add Never Obtained`) at the bottom of the **NEED LIST** column are pushed below the visible container area, requiring immediate scrolling to see or click.

**Details & Action Required**:
- **UX Issue**: Important bulk-action buttons are hidden below the scroll fold instead of being permanently visible.
- **Action Required**:
  1. Make action buttons a sticky footer or move them to the column header so they remain permanently visible regardless of list scroll position.
  2. Incorporate fixed action controls into the planned Relic Planner redesign (Issue #28).

## 30. Prime Resurgence UI: Generic list layout lacks Varzia event branding, Aya currency badges, and consistent app styling

**Reported**: 2026-09-08, Prime Resurgence screen:
- User noted that the Prime Resurgence screen does not match the app visual style or feel intuitive.

**Details & Action Required**:
- **Design & Experience Gaps**:
  1. **Lacks Event Context**: Does not feature Varzia event branding, active rotation countdown hero card, or Aya / Regal Aya currency cost badges.
  2. **Claustrophobic Card Layout**: Equipment cards use cramped 2-column layouts with tiny 9px sub-part rows that clash with the spacious grid cards used on Inventory and Relics.
  3. **Inconsistent Filter System**: Uses custom ad-hoc inline filter buttons (`bg-black/20 border-white/5`) instead of the app standardized filter bar components.
- **Proposed Redesign**:
  - Add a **Prime Resurgence Rotation Hero Header** featuring Varzia event banner, rotation countdown timer, and player Aya / Regal Aya balances.
  - Add **Aya / Regal Aya price tags** to all sets, relics, and cosmetics.
  - Redesign Equipment Cards into spacious, visual Prime Set cards with full component thumbnails and set completion progress bars.
  - Standardize search and filter controls with the app core UI system.

## 31. Inventory & Prime Resurgence UI: Missing Aya and Regal Aya currency counters in top header bars

**Reported**: 2026-09-08, Inventory and Prime Resurgence screens:
- User noted that neither Inventory nor Prime Resurgence display player **Aya** and **Regal Aya** balances in their top currency header bars.

**Details & Action Required**:
- **Feature Gap**: Aya and Regal Aya are core event/vault currencies. The top currency tracking bar (which tracks Platinum, Credits, Ducats, Void Traces) currently omits Aya and Regal Aya.
- **Action Required**:
  1. Update top currency header component on the **Inventory** page to include live **Aya** and **Regal Aya** balance counters.
  2. Add **Aya** and **Regal Aya** balance counters to the top header of the **Prime Resurgence** page.
  3. Display explicit Aya and Regal Aya price tags on all items, relics, cosmetics, and bundles in the Prime Resurgence view.

## 32. Inventory UI: Missing core Warframe currencies in header stat tracker (Aya, Regal Aya, Ducats, Void Traces, Vitus Essence, Steel Essence)

**Reported**: 2026-09-08, Inventory screen header bar:
- User requested an audit of all major Warframe currencies missing from the top inventory tracking header bar.

**Current Inventory Header Tracking**:
- Only tracks: **Credits**, **Platinum**, **Endo**, **Forma** (Forma / Aura / Stance / Umbra), and **Reactors/Catalysts**.

**Missing Key Currencies & Tokens**:
1. **Aya** & **Regal Aya** (Prime Resurgence / Varzia Vault)
2. **Ducats** (Baro Ki-Teer Prime Relay trader)
3. **Void Traces** (Relic Refinement & Dragon Keys, with cap indicator: e.g., 1,060 / 1,650)
4. **Vitus Essence** (Arbitration Honors vendor)
5. **Steel Essence** (Steel Path Teshin Honors)
6. **Riven Slivers** (Palladino Weekly Riven exchange)

**Action Required**:
- Expand the top currency tracking component across **Inventory** (and shared page headers) to include live balance counters for all major Warframe currencies.

## 33. Navigation Sidebar UI: Small tab typography, text truncation, and dim section header styling

**Reported**: 2026-09-08, Navigation Sidebar (screenshot provided):
- User requested larger tab title text, fixing text truncation on long labels, and overall visual beautification of the left navigation panel.

**Details & Action Required**:
- **Design & Readability Improvements**:
  1. **Tab Label Size & Contrast**: Increase navigation item font size from `text-xs` (12px) to `text-sm` (14px) with improved contrast and hover/active indicator styling.
  2. **Prevent Truncation**: Adjust sidebar width / padding so long tab labels (e.g. *Cosmetics, Decorations & Vehicles*) display fully without truncating to `Cosmetics, Decorations...`.
  3. **Beautify Category Headers**: Refine section headers (`TODAY`, `COLLECTION`, `PLANNING`, `TRADING`, `JOURNAL & TOOLS`) with polished typography, subtle icon/border accents, and letter-spacing.

- **Typography & Legibility**: Micro-text across Prime Resurgence cards is excessively small (relying on tiny 9px and 10px fonts for sub-part rows, relic lists, and status badges). Upgrade typography hierarchy so secondary details use a minimum of 12px/13px and labels are clean and easy to read.

## 34. Market UI: Ambiguous "Potential Platinum" metric displays unhelpful 0 state when unauthenticated

**Reported**: 2026-09-08, Market screen header:
- User noted that "Potential Platinum" metric is ambiguous and displays `0 plat` without context when warframe.market session cookie is missing.

**Details & Action Required**:
- **Ambiguity & UX Issue**:
  - The calculation sums the value of active `sell` listings on warframe.market (`sellListings.reduce(...)`).
  - When unauthenticated, `sellListings` is empty and renders `0 plat` without explanation. Players mistake "Potential Platinum" for the total estimated market value of tradeable items in their inventory.
- **Action Required**:
  1. Rename/relabel metric to **"Active Listed Orders Value"** or **"Active Sell Listings"**.
  2. Add an info tooltip: *"Total platinum value of active sell orders currently listed on warframe.market"*.
  3. When unauthenticated, display an actionable state (e.g., *"Link warframe.market account to track active listings"*) rather than a bare 0.

## 35. Market UI: Blinding white text inputs (`bg-white`) clash with dark theme aesthetics

**Reported**: 2026-09-08, Market screen (screenshot provided):
- User reported that text inputs on the Market page (e.g. search input `Search active listings...` and price inputs) render as bright, blinding white boxes (`bg-white`).

**Details & Action Required**:
- **Design System Violation**: `Market.jsx` contains unstyled or hardcoded `bg-white` input elements that break the dark glassmorphism theme.
- **Action Required**:
  1. Audit all input fields in `Market.jsx` (search inputs, price inputs, quantity fields).
  2. Replace raw `bg-white` inputs with the standardized dark theme `<Input>` component (`bg-white/5 border-white/10 text-white placeholder-white/40`).

- **Additional Specific Examples Confirmed**:
  - `Search stock...` search bar in the Tradeable Stock tab header.
  - Per-card `Plat: [  ] p` price numeric input boxes rendered on every tradeable item card (`Odonata Prime Blueprint`, `Nautilus Prime Blueprint`, `Nautilus Prime Cerebrum`, etc.).

- **Theme System Clarification**: Inputs must NOT be hardcoded to static dark colors. They must consume active theme design tokens/classes (`<Input>` component, `bg-kronos-...`, theme CSS variables) so inputs automatically adapt to whichever user-configured theme (Kronos, etc.) is currently selected.

## 36. Rivens UI: Hover popover displays raw missing i18n translation keys and stat text renders double percent signs (% %)

**Reported**: 2026-09-08, Rivens screen (screenshot provided):
1. **Raw missing translation keys on card hover**: Hovering over a Riven card renders a tooltip popover containing un-translated raw i18n keys:
   - `ui.riven_overlay.tier_meta`
   - `ui.riven_card.tier_weapon,`
   - `ui.riven_overlay.roll_badui.riven_card.rolls`
2. **Double percent symbol bug**: Riven stat lines render duplicate percent signs (e.g. `+5.6% % Magazine Capacity`, `+9.7% % Critical Chance`, `-4.8% % Weapon Recoil`).

**Details & Action Required**:
- **Translation & Formatting Bugs**:
  - The hover overlay tooltip calls missing locale keys (`ui.riven_overlay...`).
  - Stat string formatter blindly appends `%` to values that already contain a percent symbol.
- **Action Required**:
  1. Audit Riven tooltip overlay component and add missing translation strings to `en.json` (or fix i18n interpolation).
  2. Sanitize stat text formatting to eliminate duplicate `%` symbols (e.g. format cleanly as `+5.6% Magazine Capacity`).

## 37. Rivens UI: Ambiguous "WEAPON RANK" metric (#85/507) lacks explanation and missing Sort/Filter controls

**Reported**: 2026-09-08, Rivens screen tooltip popover:
- Popover displays `WEAPON RANK: #85/507`.
- User noted that it is completely unclear whether #1 represents most popular, highest value, or lowest disposition, and requested sort/filter integration.

**Details & Action Required**:
- **Ambiguity & Usability Gaps**:
  - Displays `#85/507` with no context explaining what metric determines ranking (e.g. *Riven Trade Volume Popularity*).
  - The top header sort bar offers `NAME`, `PLAT`, `GRADE`, but omits `WEAPON RANK` (Popularity Rank).
- **Action Required**:
  1. Add explicit label context / tooltip to WEAPON RANK (e.g. *"Ranked #85 of 507 weapons by Riven trade volume/popularity"*).
  2. Add **WEAPON RANK** (Popularity Rank) to the top header Sort controls.

## 38. Rivens UI: Confusing pricing metrics (Top-Right Badge vs AVG VALUE vs YOUR VALUE) lack explanatory labels

**Reported**: 2026-09-08, Rivens screen item cards:
- User asked why the top-right card badge (`39p`) differs from `AVG VALUE` (`45p`) in the hover popover, and whether the top-right number is a suggested selling price.

**Details & Action Required**:
- **Pricing Clarity & Terminology**:
  - The **top-right card badge** displays `YOUR VALUE` (algorithmic estimated sell price tailored to that specific Riven roll grade and stat combination).
  - The popover displays `AVG VALUE` (unrolled/baseline average price for that weapon) alongside `YOUR VALUE` (stat-adjusted price for your specific roll).
  - Without badge labels or tooltips, players cannot distinguish between average weapon price and suggested roll price.
- **Action Required**:
  1. Add a clear tooltip / label to the top-right card badge (e.g. *"Suggested Listing Price: 39p (Stat-Adjusted)"*).
  2. Relabel `AVG VALUE` to *"Weapon Baseline Avg"* and `YOUR VALUE` to *"Roll Estimated Value"* in the hover popover.

## 39. Market & Rivens Integration: Missing Riven listing management in Market tab and 1-Click Riven listing from Riven cards

**Reported**: 2026-09-08, Market and Rivens screens:
- User requested reworking the Market tab to include Rivens and enabling direct warframe.market trading interactions directly from the Rivens tab.

**Details & Action Required**:
- **Feature & Integration Gaps**:
  - The Market tab (`Market.jsx`) tracks tradeable inventory (prime parts, mods) but excludes Rivens from stock analysis, pricing trade-offs, and active order tracking.
  - The Rivens screen (`Rivens.jsx`) calculates roll-adjusted valuations (`YOUR VALUE`), but lacks a direct "1-Click Sell on Warframe.Market" button to publish listings.
- **Action Required**:
  1. **1-Click Riven Listing on Riven Cards**: Add a "Sell on WFM" action button to Riven cards/popovers that pre-populates Riven stats and suggested price (`YOUR VALUE`) for 1-click listing.
  2. **Market Tab Riven Stock**: Expand Market tab Tradeable Stock and Active Orders to include a dedicated **Rivens** category filter.

## 40. Market Data Audit: Expand Tradeable Stock to include all sellable warframe.market categories (Arcanes, Relics, Ayatan, Gems/Fish, Imprints, Lenses)

**Reported**: 2026-09-08, Market screen Tradeable Stock tab:
- User requested auditing all item types supported by warframe.market and expanding the Market screen Tradeable Stock analyzer to include all sellable item categories.

**Details & Action Required**:
- **Current Limitation**: The Market tab primarily covers Prime Parts and Mods, omitting several high-volume tradeable item categories.
- **Complete warframe.market Sellable Item Categories to Support**:
  1. **Arcanes** (Warframe, Primary/Secondary, Operator, Amp, Zaw, Kitgun)
  2. **Relics** (Lith, Meso, Neo, Axi, Requiem)
  3. **Ayatan Sculptures & Stars** (Anasa, Orta, Ayr, Sah, Valana, Vaya, Piv, Zambuka, etc.)
  4. **Gems & Fish** (Deimos, Cetus, Fortuna tradeable resources)
  5. **Companion Genetic Imprints** (Kubrow, Kavat, Predasite, Vulpahyla imprints)
  6. **Focus Lenses** (Basic, Greater, Eidolon, Lua Lenses)
  7. **Syndicate & Faction Items** (Augments, Captura Scenes, Archwing components)
  8. **Special Weapon Components** (Vandal/Wraith parts, Baro items, Necramech parts)
  9. **Rivens** (Veiled & Unveiled)
- **Action Required**:
  1. Audit market indexer against official warframe.market item manifests.
  2. Update `Market.jsx` Tradeable Stock category filters to include: `All`, `Primes`, `Mods`, `Arcanes`, `Relics`, `Ayatan`, `Gems/Fish`, `Imprints`, `Rivens`.

## 41. Adversaries UI: Ergo Glast Holokey weapons (Tenet Agendus, Exec, Livia, Grigori, Ferrox) falsely listed as Sister Adversary drops

**Reported**: 2026-09-08, Adversaries screen:
- User reported that the Adversaries tab lists Ergo Glast Tenet weapons (purchased with Corrupted Holokeys) as if they are spawned by Sisters of Parvos.

**Details & Action Required**:
- **Game Data & Categorization Error**:
  - **True Sister Adversary Drops**: Tenet Envoy, Tenet Diplos, Tenet Spirex, Tenet Tetra, Tenet Flux Rifle, Tenet Arca Plasmor, Tenet Cycron, Tenet Detron.
  - **Ergo Glast Holokey Vendor Weapons**: Tenet Agendus, Tenet Exec, Tenet Livia, Tenet Grigori, Tenet Ferrox (purchased from Ergo Glast at Relays using 40 Corrupted Holokeys — not spawned by Sisters).
- **Action Required**:
  1. Audit Adversary weapon category filters in `Adversaries.jsx` / `adversaries.json`.
  2. Differentiate Ergo Glast Holokey weapons from true Sister of Parvos adversary drops, clearly labeling Holokey items with their Relay Vendor source (*"Ergo Glast Shop — Corrupted Holokeys"*).

- **Screenshot Example Confirmed**: Under the **OWNED SISTER WEAPONS** section (*"These weapons confirm Sister victories..."*), Holokey items like **Tenet Livia**, **Tenet Agendus**, and **Tenet Grigori** are incorrectly displayed as `"Converted evidence Tenet Livia"`. Owning an Ergo Glast Holokey weapon does not prove a Sister victory or conversion, since Sisters never spawn melee Holokey weapons.

## 42. Navigation & Feature Request: Route Wiki links to internal Wiki tab instead of launching external browser

**Reported**: 2026-09-08, Global link handling:
- User requested that clicking Wiki links anywhere in Kieda Orbiter should open the page inside the internal **Wiki tab** rather than launching an external system browser window.

**Details & Action Required**:
- **UX & App Integration Feature**:
  - Currently, clicking Wiki buttons or item wiki links opens an external web browser.
  - Routing Wiki URLs (`https://wiki.warframe.com/...`) directly into the internal Wiki view (`UiContext` navigation: `navigate("wiki", { url })`) provides a seamless, self-contained app experience.
- **Action Required**:
  1. Update global link handler / Wiki button onClick handlers to intercept `wiki.warframe.com` URLs and trigger internal tab navigation to the **Wiki** screen with the target URL loaded.
  2. Add an optional preference setting: *"Open Wiki links: [Internal App Tab | External Browser]"*.

- **Tab State Preservation vs Wiki Overlay Modal Options**:
  - **Context Problem**: Currently, switching tabs resets screen state and scroll position (e.g. If a user is viewing Acceltra in Inventory and switches tabs, returning to Inventory resets to the top of the page).
  - **Proposed Implementation Options**:
    1. **Option A (Tab State & Scroll Preservation)**: Keep screen components mounted or persist `UiContext` drawer/scroll state per tab so switching back restores exact scroll position and open drawers.
    2. **Option B (Wiki Drawer / Modal Overlay - Recommended)**: Instead of switching tabs away, clicking a Wiki link opens an **In-App Wiki Modal / Drawer Overlay** directly over the current screen. Closing the modal leaves the user exactly where they were without any navigation state loss or tab switching.

## 43. Foundry UI: Card color scheme uses hardcoded styles and ignores active user theme setting

**Reported**: 2026-09-08, Foundry screen (screenshot provided):
- User reported that when changing the active application theme in Settings (e.g. Red theme), Foundry item cards retain hardcoded blue/emerald colors and ignore theme changes.

**Details & Action Required**:
- **Theme System Failure**:
  - While header filters update to match the selected theme (e.g. red accent pills), item cards in `Foundry.jsx` use hardcoded color values (`bg-[#182030]`, `border-emerald-500`) rather than dynamic theme tokens.
- **Action Required**:
  1. Audit `Foundry.jsx` card styling and strip all hardcoded color classes.
  2. Map card backgrounds, borders, badges, and hover states to dynamic theme tokens (`bg-kronos-card`, `border-kronos-accent`, `bg-kronos-panel`) so Foundry cards automatically adapt to any user-selected theme.

**PARTIALLY FIXED (2026-09-08).** Checked the actual reported hardcoded value: `bg-[#182030]` isn't in the current code, but a real equivalent was - `bg-[#202a40]` on the unowned-card background, the only literal hex color in the whole file (everywhere else uses relative tones like `bg-black/20`). Fixed by replacing it with `bg-black/20`, matching the convention already used everywhere else in this file and in Cosmetics.jsx/Mods.jsx. **The `emerald-*` colors are NOT a bug and were left as-is** - checked Cosmetics.jsx and confirmed it uses the exact same `border-emerald-500`/`bg-emerald-400` for its own owned-state indicator. This is consistent, app-wide semantic coloring (green = owned/ready), not a Foundry-specific theme failure - a success/owned indicator staying green regardless of the selected accent theme is standard UI practice, not a bug.

## 44. UNRESOLVED — Foundry Modular tab: Balla (and Plague Keewar) missing from "Mastered"/"Unmastered" filter tabs despite showing correctly (mastered=true) under "All"

**Status: OPEN, NOT FIXED. Handed off for someone else to investigate — do not re-attempt the same static-analysis approach without new information; see "What was already ruled out" below.**

**Reported**: 2026-09-08, Foundry screen, Modular category, live running Preview build.

**Symptom** (confirmed via user screenshots + live DOM inspection):
- Player's real, in-game-mastered-for-2+-years Zaw "Balla" (and a second Zaw, "Plague Keewar") DO NOT appear when the Foundry Modular tab's ownership/mastery filter is set to **Mastered**, and also do not appear under **Unmastered**.
- The SAME items DO appear under the **All** filter, and DOM inspection of that "All" view confirms the card genuinely renders a `<svg class="lucide lucide-star text-emerald-300...">` (the mastered-star indicator) on Balla's card — i.e. `item.mastered === true` is genuinely true and genuinely rendered in the live app for this item, in this same running session.
- Two non-Zaw modular items (Raplak Prism, Vermisplicer) correctly appear under Mastered. Only the two Zaws are missing from that filtered view.
- User confirmed Balla has been mastered in-game for **over 2 years** — ruling out any "recently mastered, stale sync" explanation.

**What the code SHOULD do** (verified via an exact line-for-line Node harness replica of Foundry.jsx's `items`/`filteredItems` useMemo, run against the real production `inventoryParser.js` and the user's real `inventory.json`/export data): the harness produces **4** items for `masteryFilter='mastered'` — Balla, Plague Keewar, Raplak Prism, Vermisplicer. The live app only shows 2 (missing both Zaws). This is a live discrepancy between (a) a harness running the actual shipped parsing/filtering logic against the actual user data, and (b) what the actual running compiled app displays for the same filter, in the same session, on the same machine.

**What was already ruled out this session** (do not re-check these without a genuinely new angle):
- Wrong/duplicate item entries in the catalog (checked — no duplicates for Balla or Plague Keewar).
- `sourceItem`/ownership computation in `inventoryParser.js` (`isGilded`, `owned`) — fixed a real regression here for Kitgun/Zaw parts (both now fall back to `xp > 0` when `sourceItem` is null, since the assembled weapon lives under a generic shared `ItemType` in `raw.Melee`, not under the Tip/Barrel's own uniqueName). Verified via harness this fix is correct and produces `mastered: true` for both Zaws — this is what "All" already shows correctly.
- Stale compiled binary from incremental build — ruled out via a plain, unmodified rebuild (`pnpm run preview:build`, standard command, no source changes, no clean/deletion) per the user's explicit "rebuild like normal, don't do anything weird" instruction. **Rebuild completed successfully; bug persisted afterward** ("surprising no one, its not fixed").
- WebKitGTK per-app disk cache (`~/.cache/com.jacob.kiedasorbiter.preview/`) — checked, empty (0 bytes except a `.cookies` file).
- Binary string-search for stale embedded JS (`grep -a` for literal strings like partType constants) — tried, found unreliable/inconclusive because Tauri compresses/embeds frontend assets into the binary; plain grep returns no matches regardless of whether code is present. Not proof of anything either way.
- localStorage / settings-based staleness — no mastery-related code found in `log_scanner.rs` or `mem_reader.rs` (the EE.log-derived data path); this was investigated once and the user then explicitly said to stop pursuing it as a detour.

**What was NOT yet tried / possible next angles for whoever picks this up**:
- Actually opening browser DevTools **while the Mastered tab is selected** and checking whether Balla's card exists anywhere in the DOM (just visually hidden/filtered by CSS) versus genuinely absent from the React render output. This distinguishes a JS filter-logic bug from a CSS/render bug and was the very next step proposed but not yet executed before this handoff.
- Checking whether the live app's `masteryFilter` state value itself is actually `'mastered'`/`'unmastered'` as expected when those tabs are clicked (e.g. via React DevTools component inspector on the Foundry component), rather than assuming the tab click sets the state correctly.
- Confirming the running binary's build timestamp actually matches the latest `preview:build` run (in case the app being tested was not actually relaunched after the rebuild, or a second stale instance was still running — checked via `flatpak-spawn --host ps aux | grep -i kiedas` for existing processes, but not double-checked immediately post-rebuild before the user reported "still not fixed").
- Re-examining whether `masterable` is being set correctly on these two specific items elsewhere in the pipeline in a way that only affects the Mastered/Unmastered branch of the filter predicate but not the All branch — the filter predicate is `(masteryFilter === 'all' || (item.masterable === false ? false : (masteryFilter === 'mastered' ? item.mastered : !item.mastered)))`; if `item.masterable` were `false` for these two items specifically (even though `item.mastered` is `true`), that would exactly reproduce this symptom (visible under All, absent under both Mastered and Unmastered) and was not directly checked against the two Zaw items specifically in the harness comparison.

## 45. UNRESOLVED — getAcquisitionInfo(): structured-route branches discard override text instead of merging, silently dropping other valid routes

**Found**: 2026-09-14, while implementing a priority-reorder fix in `getAcquisitionInfo()` (`src/lib/acquisitionInfo.js` and the Preview copy) to make `dropIndex` (built from `DropsAll.json`, the official warframestat.us/drops.wf mirror) take priority over `getItemDrops()` (the bundled `warframe-items` package) for items with no override — `getItemDrops()`'s source data conflates guaranteed Syndicate/vendor standing purchases with real mission drops (both show as `chance:1`/100% with no type distinction), which caused ~78% of merged mod overrides to be silently shadowed earlier this session (the "Abating Link" bug). `dropIndex` tags syndicate offerings with their own `type: 'syndicate'`, so it doesn't have that problem. That reorder is implemented and confirmed working for "Abating Link."

**The new problem, found while verifying the reorder against "Mag":** Mag's override text is `"Blueprint purchasable from Market for 75 Platinum or Purchased from Conclave (Rank 5+) for 60,000 Standing. Components - ..."` — correctly listing both routes. But the live drawer shows only `"Sold by Conclave."` This is caused by a **separate, pre-existing** branch in `getAcquisitionInfo()`: once `overrideText` exists, four "structured route" checks (`baroOverrideHasStructuredRoute`, `tennoGenOverrideHasStructuredRoute`, `vendorOverrideHasStructuredRoute`, and the `resourceOverrideIsMarketOnly`/`researchOverrideHasStructuredRoute` suppression pair) each fully *replace* the override text with a short canned sentence instead of merging with it. Mag hits `vendorOverrideHasStructuredRoute` because `wikiVendorIndex` has a structured "mag" → `["Conclave"]` entry, so the branch fires and the Market portion of the override vanishes. This branch predates tonight's session entirely — it was never GUI-verified against an item that actually hits it until now.

**What needs investigating (not yet done, do not start fixing without a plan)**:
1. Quantify scope: script-check every override entry for cases where the override text mentions Market/Platinum/Baro/TennoGen/Research **and also** has a structured-index match that would trigger one of these four branches — same ground-truth-diff methodology used earlier this session for the Market-completeness audit (found 76 entries missing a real Market mention), just targeting these four specific branches instead of a straight-deletion case.
2. Decide the fix shape: these branches should likely *combine* (structured sentence + ", also purchasable from the Market for Xp.") rather than fully replace — or only fire when the override text does not already mention a route the structured index doesn't independently capture.
3. Re-verify the `getAcquisitionInfo()` priority-reorder fix (override → exalted → dropIndex → getItemDrops, in that order) against more real items beyond Abating Link and Mag — this session's track record is that narrow single-item spot-checks repeatedly missed adjacent bugs.
4. Check whether `acquisitionData.js`'s `FAKE_DROP_VENDOR_NAMES` blocklist hack (used by `getItemDrops()`, which `codexSupplement.js` also calls directly, bypassing `getAcquisitionInfo()` entirely) is now redundant or in conflict with the newly-promoted `dropIndex`-based syndicate typing, or still needed for that separate code path.

**State as of pause**: the priority-reorder fix is implemented in both `src/lib/acquisitionInfo.js` and `.preview-work/stage4-command-center/src/lib/acquisitionInfo.js`, rebuilt into the Preview binary, and confirmed correct for "Abating Link." The four-branch truncation bug above is found but **not fixed** — left as-is pending the investigation steps above.

**Relevant files**: `.preview-work/stage4-command-center/src/lib/inventoryParser.js` (owns `masterable`/`mastered`/`isModular`/`isGilded` computation), `.preview-work/stage4-command-center/src/screens/Foundry.jsx` (owns the `items`/`filteredItems` useMemo and the mastery filter predicate above).
