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

## Status Log (2026-10-02): items 8-23 after the Codex fix round

"Fixed in code" means: root cause identified, regression test added and passing, merged to `preview/stage4` (full suite 179/179 as of 2026-10-02 22:30, head `60afb5cc`). Nothing below is "resolved" until the user confirms it in a deployed Preview AppImage; confirmations are recorded in `docs/APP_CHECKLIST.md`. BUILD STATUS: the AppImage deployed on 2026-10-02 22:41 was built from commit `795d0a78` (code identical to `60afb5cc`, the last code merge) and contains every fix marked "fixed in code" below; the Rust unit tests (47) passed before the build. Rows say "deployed 22:41" for these. The previous build (20:18, commit `63121682`) is kept as `~/AppImages/kiedas_orbiter_preview.appimage.bak-2241` for rollback.

| # | Status | Root cause / what changed |
|---|---|---|
| 8 Orokin Cell Blueprint as enemy drop | Fixed in code, deployed in the 20:18 and 22:41 builds, awaiting in-app check | `dropsParser.js` filed unresolved names such as "2X Orokin Cell" under phantom `display:<name> blueprint` keys (731 keys); quantity prefixes are stripped and no blueprint key is invented |
| 9 Meso C11 repeated x5 | Fixed in code (both paths), deployed 22:41 (top-level paths also in the 20:18 build) | Top-level sources fixed in the 20:18 build; the "Crafting requirements" ingredient rows (second path) are fixed after it by the shared `relicSources.js` helper (tier checked against ExportRelics: 101 rows, 0 mismatches). Not yet deployed |
| 10 "+N more" without rows | Fixed in code, deployed in the 20:18 and 22:41 builds, awaiting in-app check | 85 override strings carried "(+N more sources)"; live drop rows replace them |
| 11 Salvage Conclave-only | Fixed in code, deployed 22:41 (Market and farming sources added after the 20:18 build), awaiting in-app check | Decoration blurb removed; wiki.warframe.com Market and farming sentences added verbatim as separate sources |
| 12 Foundry drawer outside click | RESOLVED: confirmed by the user in the app 2026-10-02 (build 63121682). See R4 | `RecipeDrawer` got the shared backdrop, click guard and Escape |
| 13 Extractor Prime Set artwork | Fixed in code, deployed 22:41, awaiting in-app check | Set and blueprint images resolved from DE `ExportBundles` (only the 4 intended images changed out of 764) | The user reported on 2026-10-03 that the artwork now shows (awaiting their tick); the artwork fix exposed the separate problems in item 34
| 14 New UI strings never translated | Fixed in code for all 14 locales, deployed 22:41, awaiting in-app check | 104 missing keys translated in every locale plus an enforcement test (completeness, placeholders, leftover-English, script checks). The Circuit title stays English (see 16). Existing real translations were verified unaltered |
| 15 Inventory overscroll | OPEN, not fixed deliberately | Fixed row-height constants; rows are CSS grid rows as tall as their tallest card, so no uniform stride is exact; a correct fix needs a variable-height virtualizer. Waiting for the user's measurement (see section 15) |
| 16 Circuit title | BLOCKED | No official localized name exists in the repo data or on wiki.warframe.com; title routed through `t()` and kept "The Circuit" |
| 17 Riven overlay does not appear | Fixed in code (stale close + replay guards), Rust compiled and unit-tested, deployed 22:41, awaiting in-app check | See 26 |
| 18 Raw key in Riven trigger | Fixed in code, deployed in the 20:18 and 22:41 builds, awaiting in-app check | Keys moved under `ui` in all locales |
| 19, 20, 22 | Fixed in an earlier snapshot, never confirmed in the app | Need the user's check |
| 21 Reward overlay blueprint count | No defect found | The display path and all translation keys are correct for the logged payload; needs an overlay screenshot showing the miss |
| 23 Relic reward overlay UNRECOGNIZED | Fixed in code (OCR cleanup, tests), Rust compiled and unit-tested, deployed 22:41, awaiting in-app check | `clean_ocr_output` kept only capitalised neighbours |
| 24 Scanner toast raw keys | Fixed in code, deployed 22:41, awaiting in-app check | Listener and Maps timer read `t` through a ref |
| 25 Riven banner vanishes on hotkey | Fixed in code, deployed 22:41, awaiting in-app check | Banner hides only on screen close |
| 26 Riven overlay stuck / replayed log lines | Fixed in code (monotonic guard + bounded dedupe + garbage filter + diagnostics), Rust compiled and unit-tested, deployed 22:41, awaiting in-app check | Mechanism partly proven (the scanner reads up to 1 MiB per poll and wiped its whole dedupe set at 16,384 new hashes); diagnostics added to prove it next session |
| 27 Riven grading per press | Fixed in code, deployed 22:41, awaiting in-app check | Every hotkey press grades once; no timers; new-roll result clears on a new roll and hides on accept |
| 28 Focus watcher log flood | Fixed in code, Rust compiled and unit-tested, deployed 22:41, awaiting in-app check | The main-window exemption remains (documented) |
| 29 Old-tree fixes not ported | Ports done: weekday/month locale, Target Inspector clipping and planet label, drawer image order, Prime ownership via recipe identity (JS) and the DE name/description merge (Rust, uncompiled); riven fixes folded into 25-27 | Re-verified against Preview by code and real-data comparison |
| 30 Prime Sets OWNED | Fixed in code, deployed 22:41, awaiting in-app check | 62 of 166 sets wrongly owned -> 0 on the real inventory; the overlay part could not be reproduced and needs an example |
| 31 Prime Sets scroll slowness | Fixed in code (cached part sources, memoized cards; 362 ms -> 1.9 ms simulated), deployed 22:41, awaiting in-app check, NOT yet measured in the app | Not a leak per the code review |
| 32 Dual-weapon recipes | Fixed in code, deployed 22:41, awaiting in-app check | Aklex, Akvasto, Akbronco, Akmagnus list their 2 base guns with images |
| 33 Inventory currency strip has a vertical scrollbar that scrolls into blank space (new, reported 2026-10-03) | Open: cause verified in code, fix drafted on a branch (`agent/b9-strip`), NOT merged or deployed | The Forma tooltip hangs below the strip inside an `overflow-x-auto` wrapper (see section 33) |
| 34 Extractors: not in the Inventory at all; Prime extractors' "how to obtain" is vague and incomplete vs the wiki (new, reported 2026-10-03) | Open: cause verified in code and real data, NO fix started (waiting for the user's go-ahead) | See section 34 |
| 35 Prime Sets card shows only the last word of a part name ("Limb", "Limb", "Prime") (new, reported 2026-10-03) | Open: cause verified, NO fix started | `PrimeSetCard.jsx:54`; 8 sets affected (see section 35) |
| 36 Drawer "Crafting requirements" omits the main Blueprint row for most Prime items (new, reported 2026-10-03) | Open: cause verified, 92 of 166 Prime drawers affected, NO fix started | See section 36 |
| 37 The "xN" part-count badge sits in the top-left of the part cell and reads as belonging to the cell on its left (new, reported 2026-10-03) | Open: placement decision needed from the user, NO fix started | `PrimeSetCard.jsx:51`; see section 37 |


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
* **Needs a decision from the user**: where it should go. The top-right already holds the platinum price badge, so the user suggested centering. Options: centered above or below the image, or in the label line ("x2 Bronco Prime"). NO change has been made.
* **Required Resolution Protocol**: after the decision, move the badge, check it with 1, 2 and 3 parts per row and with long labels (item 35), recheck in the deployed app.

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
