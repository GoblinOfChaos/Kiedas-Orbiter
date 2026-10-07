# Recurring Error & Regression Report (Since 08/20/2026)
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

Suggested order (batches that touch the same code):
1. **Prime Sets card and drawer**: 35 (part labels), 37 (badge position), 36 (Blueprint row with relics), 39 (false Market price), 9 reopened and 8 reopened (same Blueprint row and relic helper).
2. **Crash and layout quick wins**: 42 (History `locale` plus translated crash screen), 33 (currency strip, draft on `agent/b9-strip`), 41 (Rivens scrollbars), 40 (Market tabs); then recheck 43.
3. **Resources**: 38 (manual wiki-verified data for every resource), 34 (extractors), the bad decoration-market override.

| # | Status | Root cause / what changed |
|---|---|---|
| 9 Meso C11 repeated x5 | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (reopened by your check of build 795d0a7) (was: **REOPENED 2026-10-03 for Warframe drawers**: Ash Prime Neuroptics still lists (Radiant)/(Flawless) rows with ...) | Top-level sources fixed in the 20:18 build; the "Crafting requirements" ingredient rows (second path) are fixed after it by the shared `relicSources.js` helper (tier checked against ExportRelics: 101 rows, 0 mismatches). Not yet deployed |
| 14 New UI strings never translated | Fixed in code for all 14 locales, deployed 22:41, awaiting in-app check | 104 missing keys translated in every locale plus an enforcement test (completeness, placeholders, leftover-English, script checks). The Circuit title stays English (see 16). Existing real translations were verified unaltered |
| 16 Circuit title | BLOCKED | No official localized name exists in the repo data or on wiki.warframe.com; title routed through `t()` and kept "The Circuit" |
|  18 Raw key in Riven trigger | **REOPENED 2026-10-03**: "Grade Rivens" is still English in German; see section 18 addendum (earlier status: Fixed in code, deployed in the 20:18 and 22:41 builds, awaiting in-app check) | Keys moved under `ui` in all locales |
| 21 Reward overlay blueprint count | No defect found | The display path and all translation keys are correct for the logged payload; needs an overlay screenshot showing the miss |
| 23 Relic reward overlay UNRECOGNIZED | Fixed in code (OCR cleanup, tests), Rust compiled and unit-tested, deployed 22:41, awaiting in-app check | `clean_ocr_output` kept only capitalised neighbours |
| 29 Old-tree fixes not ported | Ports done: weekday/month locale, Target Inspector clipping and planet label, drawer image order, Prime ownership via recipe identity (JS) and the DE name/description merge (Rust, uncompiled); riven fixes folded into 25-27 | Re-verified against Preview by code and real-data comparison |
| 32 Dual-weapon recipes | Fixed in code, deployed 22:41, awaiting in-app check | Aklex, Akvasto, Akbronco, Akmagnus list their 2 base guns with images |
| 33 Inventory currency strip has a vertical scrollbar that scrolls into blank space (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 96bfa8f7, full suite 194/194), NOT in any build yet, awaiting a build and your in-app check** (was: Open: cause verified in code, fix drafted on a branch (`agent/b9-strip`), NOT merged or deployed...) | The Forma tooltip hangs below the strip inside an `overflow-x-auto` wrapper (see section 33) |
| 35 Prime Sets card shows only the last word of a part name ("Limb", "Limb", "Prime") (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: cause verified, NO fix started) | `PrimeSetCard.jsx:54`; 8 sets affected (see section 35) |
| 36 Drawer "Crafting requirements" omits the main Blueprint row for most Prime items (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: cause verified, 92 of 166 Prime drawers affected, NO fix started) | See section 36 |
| 37 The "xN" part-count badge sits in the top-left of the part cell and reads as belonging to the cell on its left (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: DECISION MADE (center it above the piece's image), NO fix started) | `PrimeSetCard.jsx:51`; see section 37 |
| 39 Prime Warframe drawers say the Prime Blueprint can be bought from the Market for credits (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: cause verified on real data, NO fix started) | See section 39 |
| 40 Market page under 1050px wide cuts off the top of the Active Orders / Tradeable Stock tabs (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 96bfa8f7, full suite 194/194), NOT in any build yet, awaiting a build and your in-app check** The tab row does not scroll (a Codex-added scrollbar was removed). Not confirmed in the running app. (was: Open: probable cause only, NO fix started...) | See section 40 |
| 42 History screen crashes with "Can't find variable: locale"; the crash screen shows raw `error_boundary.*` keys (new, reported 2026-10-03) | **Fixed in code 2026-10-03, merged to preview/stage4 (head 11122292, full suite 188/188), NOT in any build yet, awaiting a build and your in-app check** (was: Open: both causes verified in code and in the log, NO fix started) | See section 42 |
| 53 Forma drawer is a mess: 4,593 "other sources", a Blueprint row with a wall of wiki text with missing prices (new, reported 2026-10-03) | **Fixed in code and merged (relic rows by P19 and text by P20; suite 247/247), NOT in a build yet, needs your live check.** Forma and Forma Blueprint: 4,594 and 616 top-level rows before, 20 each after, with one grouped row for the 565 relics (tier summary from DE) and the list behind it; the Blueprint text has its real prices and no history (was: Text part fixed in code and merged; relic-row part still IN ...) | See section 53 |

Process lessons from this round (apply to all future fixes):
- Compare the whole result before and after on real data (e.g. drop-index key sets) when changing a shared parser.
- Antigravity reports were wrong or half-wrong on 3 of 7 items; verify every claimed root cause against code and data before delegating a fix.

---

## 1. Missing or Broken Acquisition Info & Empty Drawers
* **Frequency**: 12+ occurrences

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

### Current Evidence
1. `tests/farming/ledgerImages.test.mjs` already verifies the farming ledger contains `Orokin Cell` and never an `Orokin Cell Blueprint` Foundry row.
2. The remaining defect is therefore not the ledger requirement expansion covered by that test. It is in the acquisition/source presentation path, which still exposes the incorrect blueprint/drop relationship during live use.

### Required Resolution Protocol
- Trace the live Farming Targets acquisition/source rendering path from the selected Orokin Cell target through its drawer/source rows.
- Preserve only verified enemy-drop sources for the complete `Orokin Cell` resource.
- Represent the 100-Platinum Market blueprint, if shown, as a separate non-farmable purchase source; never as an enemy drop.
- Add a focused regression test that exercises the same presentation/source path as the live screen, not only the ledger model.
- Do not mark this issue resolved until it is rechecked in the deployed Preview AppImage.

* **Root cause (verified)**: `src/lib/acquisitionData.js` ~line 4356 has an entry `"orokin cell"` in the Warframe/weapon acquisitions table whose `general` AND `blueprint` fields are the resource's drop text. `resolveBlueprintOrigin` (~14919) step 2 returns `Blueprint: <that text>` for any name in that table, and `PreviewAcquisitionDrawer.jsx` (~lines 92, 246-258) prints it in the "1x Blueprint" row. The earlier fix only covered the phantom keys in `dropsParser.js`, not this path.
* **Required Resolution Protocol**: the Blueprint row for Orokin Cell must say it is a 100 Platinum Market purchase (from the recipe's `platinumCost`), not the enemy drop text; keep the drops only under the resource's own sources. Check whether other resources with a recipe have the same wrong `blueprint` field in that table (search every entry whose key is a resource name), fix at the table or in `resolveBlueprintOrigin`, add a test through the drawer path with the real export, and recheck in the app. This also overlaps item 36 (same row) and item 38 (resource data); do them together.

---

## 9. Prime Part Acquisition Drawers Repeat Relics Without Refinement Context
* **Frequency**: Reported during live Preview verification on 2026-10-01.

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
* **What the 2026-10-02 fix covered**: the top-level sources returned by `getAcquisitionInfo` (verified on real data: Acceltra Prime shows 9 relic rows for 9 distinct relics; Citrine Prime Blueprint and Ash Prime Chassis tests pass).
* **What it missed**: the "Crafting requirements" section builds each ingredient's relic list separately. `AcquisitionDrawer.jsx:318` calls `getDropSourcesWithFallback(ingredient.itemType, dropIndex, ingredient.name)` straight on the raw drop index and `PreviewAcquisitionDrawer.jsx` (around lines 240-260) does the same, so none of the new dedupe, tier-only labelling or percentage removal applies there. The raw rows still carry one row per refinement, each with its own rarity label and chance (and DE labels the Radiant row "Uncommon (10%)" while the lower refinements are "Rare"), which is why the tiers look contradictory.
* **Root cause class**: two code paths build the same relic list (same lesson as the duplicated `ExportRelics` readers, R2). The earlier test only exercised one of them.
* **Required resolution**: move the per-relic dedupe and tier labelling into one shared helper used by the top-level sources, the Crafting requirements ingredient rows, and the Foundry/farming consumers; test the ingredient path for Acceltra Prime Barrel and at least one other part, in both drawers; recheck in the deployed app.

* **Cause (partly verified)**: `buildIngredientSourceRows` only collapses refinements on sources whose `type === 'relic'`. In the bundled item data (`wfcd-combined.json`) the Ash Prime Neuroptics component has 32 drop rows such as location "Axi N2 Relic" and Chassis/Systems rows such as "Axi B1 Relic (Radiant)" with chances 16.67 and 10; those rows are plain drops, not typed relics, so they pass through unchanged (`PreviewAcquisitionDrawer.jsx` ~line 254 passes `getItemDrops(...)` as the fallback). In my real-data probe the live drop lookup by ingredient name returned nothing for the Ash Prime parts, so the fallback rows are what is shown. I have NOT yet traced it inside the running app.
* **Required Resolution Protocol**: treat any drop whose location/name is a relic (with or without a refinement suffix) as a relic source in the normalizer, so each relic shows once with its Common/Uncommon/Rare tier from ExportRelics; fix for all Prime Warframe, weapon and companion drawers; test with the real export on Ash Prime, Citrine Prime and one weapon through the same drawer path; recheck in the app. Same code area as items 36 and 8.

---

## 10. Farming Source Summaries Claim Additional Sources Missing From Their Drawers
* **Frequency**: Reported during live Preview verification on 2026-10-01.

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

### Required Resolution Protocol
- Trace Salvage's acquisition/source classification and identify why non-Conclave sources are filtered out.
- Verify the complete source set against official DE data and the official Warframe Wiki.
- Keep Conclave as a source only where verified, but do not present it as the exclusive source.
- Add a regression test that asserts Salvage includes its verified non-Conclave sources.
- Recheck the acquisition drawer in the deployed Preview AppImage.

---

## 12. Foundry Drawer Does Not Close When Clicking Outside
* **Frequency**: Reported during live Preview verification on 2026-10-01.

### Required Resolution Protocol
- Compare the Foundry drawer's dismissal handling with the shared behavior used by the other tab drawers.
- Restore outside-click dismissal without treating clicks inside the drawer or on its trigger as outside clicks.
- Preserve the explicit close button and Escape-key behavior.
- Add a focused interaction regression test for outside-click dismissal.
- Recheck the behavior in the deployed Preview AppImage.

---

## 13. Titan Extractor Prime Set and Distilling Extractor Prime Set Have Missing Artwork
* **Frequency**: Reported during live Preview verification on 2026-10-01.

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

### Current Evidence (measured 2026-10-02 on `preview/stage4`)
1. `en.json` has 1,498 `ui` keys. **Every one of the 14 other locales is missing the same 104 keys**: Farming Targets 77 (of its 78 strings, 0 translated in any locale; the 78th is an English copy), Foundry 18, `ui` 3, `preview` 3, `settings` 2, `nav` 1.
2. On top of the missing keys, many existing strings are identical to the English text (some deliberately, such as proper nouns, many not): de 212, es 174, fr 210, it 191, ja 85, ko 103, pl 162, pt 181, ru 73, tc 227, th 158, tr 177, uk 97, zh 108. Untranslated total for German: 316 of 1,498 (21%).
3. The Farming Targets screen code is correct: it has no hardcoded English in JSX and every string goes through `t()`. The gap is missing translation content, not wiring.
4. `UiContext.jsx` merges English under every locale (`{ ...en.ui, ...locale.ui }`), so a missing key silently shows English instead of failing. Nothing detects it.
5. The Riven prompt overlay strings ("RIVEN GRADING READY", "Press", "to grade your Rivens", the hint and the hotkey-missing text) and `ui.riven_overlay.scanning` are English in `de.json`, and were English in the old tree as well. The earlier fix (`042070c1`) only repaired raw keys; the values were never translated. Reported 2026-10-02 ("Riven overlay still does not translate").

### Root Cause
- New strings are added to `en.json` only. No step requires translating them, no test fails when a locale lacks a key, and the English fallback hides the gap in normal use.
- `scripts/i18n-audit.mjs` only finds hardcoded English in JSX; it never compares locale files, and nothing runs it automatically.

### Required Resolution Protocol
- **Enforcement test**: fail if any English `ui` key is missing from any locale, or if `{placeholders}` differ between English and a locale. Keep a small explicit allowlist for strings that must stay identical (proper nouns, brand names). Make the test part of the standard suite.
- **Backfill**: translate the 104 missing keys into all 14 locales (all languages, one pass). Game terms must use the official Digital Extremes localization from the project's language data; if no official term exists keep the English term; never invent names.
- **Triage**: review the strings that are identical to English per locale (list above) and separate deliberate ones from untranslated ones; translate the rest.
- **Verify**: render the Farming Targets and Foundry screens in German and one other language and assert no English from the affected key sets; recheck in the deployed Preview AppImage.
- Cross-check stale-closure translation failures (item 24) while doing this.

---

## 15. Inventory Scroll Container Overscrolls Into Empty Space
* **Frequency**: Reported during live Preview verification on 2026-10-01.

### Investigation 2026-10-02 (cause still NOT proven)
* **Verified in code**: the Inventory list is virtualized with FIXED row heights. `src/screens/Inventory.jsx` lines 38-57 define `SETS_ROW_STRIDE = 320`, `AYATAN_ROW_STRIDE = 144`, `LIST_ROW_STRIDE = 58`, `ARCANE_ROW_STRIDE` and `GENERAL_CARD_HEIGHT = 168` / `GENERAL_ROW_STRIDE = 184`. The virtual root height is `rowCount * rowStride` and each window is placed at `top: firstRow * rowStride` (lines ~1227, 1381, 1451, 787-788). The calibration step (lines ~657-766) only corrects the scroll base offset and the column count; it never measures a rendered row. So any difference between a real card's height and the constant makes the scroll range wrong, and the error grows with the number of rows. This matches the symptom, but the actual amount of drift is unmeasured.
* **Unproven claims from an Antigravity report (do not rely on them)**: real general cards render at "about 180 px instead of 184 px", and the `pb-4` bottom padding is "consumed" by the fixed height. Both were derived from class names, not from measurement.
* **Likely fix once measured**: derive the stride from a measured row (or force the card height to the constant) instead of a hardcoded number, with a pure function for the stride and a test.

### Required Resolution Protocol
- Trace the Inventory scroll container, list sizing, bottom padding, and any virtualization or spacer calculations.
- Ensure the scroll range ends at the actual rendered content rather than an oversized container or stale measured height.
- Preserve the scrollbar behavior already fixed on other screens.
- Add a regression test for the Inventory scroll boundary and recheck it in the deployed Preview AppImage.

---

## 16. The Circuit Title Is Not Localized
* **Frequency**: Reported during live Preview verification on 2026-10-01.

### Required Resolution Protocol
- Verify the official localized name from an allowed primary source or the project's established localization data.
- Route the Circuit title through the locale-aware localization path used by other game-mode names.
- Add a German localization regression check for the Circuit card, with a fallback-locale check as appropriate.
- Recheck the result in the deployed Preview AppImage.

---

## 17. Riven Overlay Does Not Appear
* **Frequency**: Reported during live Preview verification on 2026-10-01.

### Required Resolution Protocol
- Trace the Riven overlay trigger, state transition, conditional rendering, and overlay registration path.
- Determine whether the failure occurs before the open action, during overlay mounting, or because the overlay is rendered behind another layer.
- Restore the overlay without disrupting other overlay behavior, focus handling, or outside-click dismissal.
- Add a focused regression test that verifies the Riven overlay opens from its intended trigger.
- Recheck the open, close, and interaction behavior in the deployed Preview AppImage.

---

## 18. Riven Trigger Displays an Internal, Unlocalized Action Key
* **Frequency**: Reported during live Preview verification on 2026-10-01.

### Required Resolution Protocol
- Replace the internal key display with a user-facing label resolved through the shared localization system.
- Verify the wording and German translation against the project's established localization data; do not expose translation keys in the UI.
- Add a localization regression test for the Riven trigger in German and the fallback locale.
- Recheck the trigger title and its relationship to the Riven overlay in the deployed Preview AppImage.

* **Wider scope (measured)**: that baseline file accepts 1,900 English-identical UI strings across the 14 locales (de 214, tc 216, fr 209, it 186, pt 177, tr 172, es 170, pl 154, th 147, zh 97, ko 92, uk 91, ja 74, ru 67). Many are legitimate (game proper names, Discord, GitHub), but nobody has audited the list, so every language can still contain English UI text that the tests deliberately ignore. This is the real reason item 14 could not be fully proven.

---

## 19. Relic Picker Overlay Is Only Partially Localized
* **Frequency**: Reported during live Preview verification on 2026-10-01.

### Required Resolution Protocol
- Trace every user-facing string in the Relic Picker overlay, including table headings, relic labels, unavailable-relic labels, and singular/plural part counts.
- Route all non-proper-name strings through the shared localization system, including pluralization.
- Do not translate canonical relic era/name identifiers unless official locale data provides localized display values.
- Add a German localization regression check for populated, unavailable, and singular/plural part-count grid states.
- Recheck the complete overlay in the deployed Preview AppImage.

---

## 20. Relic Planner Shows Unresolved "Unknown Relic" Entries
* **Frequency**: Reported during live Preview verification on 2026-10-01.

### Required Resolution Protocol
- Trace the Relic Planner recommendation data and locale selection from its source catalog through relic-name normalization and display formatting.
- Identify why the German path falls back to internal identifiers while the English path resolves the same records to canonical relic names.
- Resolve localized display names through the established locale-aware catalog path; do not replace valid relic names with internal identifiers or invent translated names.
- If a localized name is unavailable, preserve the canonical relic identifier as a safe fallback rather than displaying a misleading internal Prime-part token.
- Add regression coverage for the affected Lith, Meso, Neo, and Axi entries and verify the Relic Planner tab in the deployed Preview AppImage.

---

## 21. Relic Reward Overlay Does Not Show Blueprint Copy Counts
* **Frequency**: Reported during live Preview verification on 2026-10-01.

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

### Required Resolution Protocol
- Trace the Relic Picker overlay window dimensions, root layout sizing, and vertical alignment for the known-era recommendation view.
- Remove the excessive blank region and size or vertically align the recommendation content consistently with the overlay's intended presentation.
- Preserve readability of all three recommendation columns at the game's supported resolutions.
- Add a visual/layout regression check for the known-era view and recheck it in the deployed Preview AppImage.

---

## 23. Relic Reward Overlay Shows "UNRECOGNIZED" For A Valid Prime Part
* **Frequency**: Reported during live Preview verification on 2026-10-02.

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

* **Symptom**: the toast shows `APP.SCANNER_TITLE` / `app.scanner_hooked_message` again. The title is upper-cased by CSS, so the raw key reaches the overlay window as the title string; the overlay only renders what it is given.
* **What is ruled out**: both keys exist under `ui` in all 15 locale files (checked again, English at `en.json` line 265); the ref fix from commit 5d4e72e9 is in the code.
* **Leading hypothesis (from code reading only, NOT reproduced)**: a startup race. `UiContext.t` returns the key whenever `state.ui` is still `{}` (before `loadSettings` + `loadLocale` finish). `log_scanner.rs` emits `scanner-hooked` on its first cycle (lines ~1364 and ~1377), so with Warframe already running when the app starts the event can fire before the locale has loaded. The ref only gives the latest `t`, which is still the empty one at that moment. The earlier fix covered a stale closure, not this ordering.
* **Process lesson**: this item was marked resolved after one in-app check. A bug that depends on timing (app start vs game already running) can pass a check done with the app opened first. The recheck must also start the app with Warframe already running.

---

## 25. Riven Prompt Banner Disappears When The Grading Hotkey Is Pressed (Regression)
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
* **Required Resolution Protocol**:
  - Make arming single-use: the hotkey arms exactly one grading; after that grading completes (or the roll is accepted, a new roll appears, or the screen closes) the overlay is disarmed again, and the next roll does nothing until the hotkey is pressed.
  - Remove the automatic grading timers for `riven-reroll` (4 s, new-card window), `riven-reroll-confirmed` (2 s, current-card window) and the `riven-linked-open` trigger when not armed, so that nothing starts OCR without a key press.
  - Add a test of the arming state across several rerolls (press, grade, roll, nothing happens, press, grade) and recheck in the deployed app.

---

## 28. Focus Watcher Floods The Log
* **Frequency**: Seen while investigating 26 (2026-10-02).
* **Evidence**: the log has 706 `[FOCUS_WATCHER] transition: focused -> unfocused, hiding overlays` lines in one session, one roughly every 0.52 seconds for long stretches. A transition message should appear once per change, so either the state is not being stored or the message is logged on every poll.
* **Concerns**: log noise that buries real events, and possible aggressive polling and repeated overlay-hide calls (AGENTS.md rule 1 forbids aggressive polling). It may also be related to overlays appearing or disappearing unexpectedly.
* **Root cause (verified in code 2026-10-02, found by an Antigravity read-only investigation and re-checked by hand)**: `src-tauri/src/overlay_utils.rs:1134` logs `transition: focused -> unfocused, hiding overlays` at the top of the `else if !focused_now && was_focused` branch, BEFORE the check `on_our_overlay` (is the active window a window of our own process). When it is, the code sets `was_focused = true`, sleeps 500 ms and `continue`s, so the next loop enters the same branch and logs again, about every 0.52 s, for as long as an app window has focus. No hide is issued on those repeats, so it is log noise plus a window-query every half second, not repeated hiding. Only one watcher thread runs (`FOCUS_WATCHER_RUNNING.swap(true)`).
* **Required Resolution Protocol**: move the log line below the own-window check so it logs only on a real transition; exempt only the OVERLAY windows (by label), not the main window, from the "still focused" rule if that does not bring back the hide/re-show loop the comment describes; add a pure decision function with unit tests for the focus states; recheck the log and CPU use with Warframe running.

---

## 29. Fixes Made In The Old Root Repo Were Never Ported To Preview (Process)
* **Frequency**: Recurring cause of "fixed but not fixed" since 2026-09-29; behind items 25 and the riven prompt text problem.
* **Fact**: `docs/agent-context/HANDOFF.md` section 5 lists root-repo fixes still to port. As of 2026-10-02 these old-tree commits are not in the Preview app: `a92b5311` (keep riven prompt banner up), `042070c1` (riven prompt raw keys), `4820397f` (riven new-roll overlay scanned the wrong region), `3e479918` (riven two-card side mapping) and others in that table. The 2026-10-02 fix round (items 8-24) did not include this list, which was a planning miss.
* **Required Resolution Protocol**: port each listed commit into the Preview repo, hand-merging conflicts, each with a test and an in-app check; reconcile the HANDOFF table against `git cherry` or equivalent so none are left unaccounted for. Treat any "this was fixed before" report as a prompt to check this list first.

---

## 30. Prime Sets Show "OWNED" When Only A Part Or The Main Blueprint Is Held

---

## 31. Prime Sets Tab Scrolls Very Slowly (Worst Scrolling Up), Possible Memory Leak
* **Frequency**: Reported 2026-10-02: scrolling through Prime Sets "has already made the app very slow ... it especially hates scrolling back up".
* **Known facts (code, not yet measured)**: the Prime Sets list is virtualized with a FIXED row height (`SETS_ROW_STRIDE = 320`, two columns on wide windows, `Inventory.jsx` ~lines 38, 1227-1233), but each set card has a variable-height parts grid, many images and price lookups; rows are not memoized, so every accepted scroll update re-renders every windowed card (comment at ~line 712). Row height mismatch is also the leading candidate for item 15.
* **Investigation 2026-10-02 (Antigravity, read-only; the top finding re-verified by hand)**:
  * **Verified in code**: `src/screens/Inventory.jsx` lines ~1313-1320, inside the per-card render, run for EVERY part of EVERY windowed Prime Set card on EVERY render: `dropIndex[partNorm]` (raw drop rows, hundreds of rows for a part with relic and mission sources), `sortSourcesByChanceInRotations(partSourcesRaw)` and a dedupe, only to compute `hasPartSources`. Nothing is cached or memoized, and rows are not `React.memo`, while scroll updates the window state about every 50 ms. This is a strong, proven cost per scroll tick (CPU plus allocation and garbage-collection pressure) that grows with the number of cards and parts in the window.
  * **Argues against a true memory leak (from code)**: the scroll effect's cleanup clears its timers and disconnects the observer; `ItemImage` does not create unrevoked object URLs or growing caches; the number of mounted cards is bounded by the overscan window. So "slows down the longer I scroll" is more likely GC pressure than a growing structure, but this is not measured.
  * **Unproven (do not rely on)**: that scrolling UP is worse because prepending grid items invalidates layout, and that `ItemImage` remounting re-decodes images. Both are plausible but not shown.
* **Required Resolution Protocol**: measure first (memory and render time while scrolling down then up in the Prime Sets tab; check image/blob caches, event listeners and timers created per scroll tick, `ItemImage` fallbacks); find the cause; fix with a regression guard where possible; recheck in the deployed app. A read-only Antigravity investigation of the code paths is being run first.

---

## 32. Dual-Weapon Prime Sets Omit The Two Base Guns From Their Recipe
* **Frequency**: Reported 2026-10-02: "a bunch of the items that require two base primes, like Aklex Prime, are not showing the two prime guns needed for the recipe. It's saying you just need the link and blueprint."
* **Root cause (verified on real data)**: in `src/lib/inventoryParser.js` ~line 2602 set parts are built from recipe ingredients filtered by `isPrimeComponent` (`PRIME_PART_PATH_RE`, which only accepts part names such as Barrel, Receiver, Link, Blueprint). The dual weapons' recipes use finished single weapons as ingredients, whose paths do not match, so they are dropped: `AklexPrimeBlueprint` = 2x `Weapons/Tenno/Pistols/PrimeLex/PrimeLex` + Aklex Prime Link; `AkvastoPrimeBlueprint` = 2x `PrimeVasto/PrimeVastoPistol` + Link; `AkbroncoPrimeBlueprint` = 2x `Pistol/BroncoPrime` + Link; `AkmagnusPrimeBlueprint` = 2x `PrimeMagnus/PrimeMagnusWeapon` + Link. Only these 4 Prime blueprints have such ingredients in the current export; the other dual Primes (Akarius, Akbolto, Akjagara, Aksomati, Akstiletto) use ordinary parts and are unaffected.
* **Required Resolution Protocol**: include non-resource weapon ingredients as set parts (named from the export, with the correct count of 2 and ownership from the weapon in inventory); show them in the Prime Sets card and any other recipe views that use the same filter (check the Foundry and acquisition drawers); add a real-data test for the four sets; recheck in the deployed app.

---

## 33. Inventory Currency Strip Has A Vertical Scrollbar That Scrolls Into Blank Space
* **Frequency**: Reported 2026-10-03 with a screenshot (Inventory page). This is the old backlog item "Currency scrollbar (needs a fresh look, not stale evidence)". It is NOT item 15 (the item list's scroll range).
* **Root cause (verified in code, not yet measured in the running app)**: `src/components/PreviewInventoryLayout.jsx` wraps the stats row in `<div className="mb-3 overflow-x-auto custom-scrollbar">`. The horizontal scroll is intentional, but in CSS any `overflow-x` other than `visible` makes `overflow-y` compute to `auto` as well. In `src/screens/Inventory.jsx` `renderHeaderStats` (~line 1725) the Forma widget has an absolutely positioned tooltip (`absolute top-full right-0 mt-2 ... opacity-0 invisible group-hover:opacity-100 group-hover:visible`) placed BELOW the widget inside that wrapper. Invisible elements still count toward scrollable overflow, so the wrapper gains a vertical scroll range equal to the hidden tooltip's height. It is the only `top-full` tooltip in `Inventory.jsx`.
* **Required Resolution Protocol**: remove the hidden absolute tooltip from the scroll container (portal tooltip), guard the wrapper with `overflow-y-hidden` (never `scrollbar-width`/`scrollbar-color`, see R1), check other `overflow-x-auto` wrappers for the same pattern, add regression tests, and recheck in the deployed app: no vertical scrollbar on the strip, hovering Forma still shows its breakdown. If the scrollbar remains, read `scrollHeight` and `clientHeight` of the wrapper in the developer tools and send both numbers.

---

## 34. Extractors Are Missing From The Inventory, And The Prime Extractors' "How To Obtain" Does Not Match The Wiki
* **Frequency**: Reported 2026-10-03 with screenshots of the Titan Extractor Prime drawer and the wiki page for the Extractors ("it did get fixed [artwork, item 13] but actually showed another bug"). Two defects.
* **Defect A: the extractors do not exist in the Inventory.** The player's raw `inventory.json` has a `Drones` list that holds an OWNED Distilling Extractor (`/Lotus/Types/Ship/BasicUcResourceDrone`, 142 HP). `src/lib/inventoryParser.js` and `src/screens/Inventory.jsx` contain no handling of drones/extractors at all (no match for "Drone" or "Extractor" outside the Prime Set artwork code), so an owned extractor and all four extractor items (Titan Extractor `BasicResourceDrone`, Titan Extractor Prime `AdvancedResourceDrone`, Distilling Extractor `BasicUcResourceDrone`, Distilling Extractor Prime `AdvancedUcResourceDrone`) are never listed. This violates the standing rule that the Inventory is the full catalog (owned and unowned, ownership marked). Only the Prime ones appear, indirectly, as "Titan/Distilling Extractor Prime Set" cards. Related: item 13.
  * Titan Extractor Prime: the drawer lists ONE source, `Sold as part of the "Ember & Frost Prime Dual Pack" Market bundle.` (from the DE bundle index). The wiki lists several: first available through Ember Prime Access (Blaze and Inferno levels); returned as part of the Prime Vault (Dec 8, 2015 to Jan 5, 2016); Vanguard Prime Resurgence Part 1 for 1 Regal Aya (until Jan 15, 2026, a date-limited statement); and the Ember Prime Pack, Frost Prime Pack and Ember & Frost Prime Dual Pack.
  * Distilling Extractor Prime: the drawer lists ONE source, `Sold as part of the "Distilling Extractor Prime" Market bundle.` (the bundle is named after the item itself, so it explains nothing). The wiki lists Rhino Prime Access (Stomp) and its Accessories pack, the Brains and Brawn Prime Vault pack, the Brute Prime pack, the Rhino Prime Accessories pack, the Magnetic Mayhem Prime Vault pack, the Mag Prime pack and Mag Prime Accessories pack, and Prime Resurgence (1 Regal Aya from Varzia, the Mag Prime Pack, or the Mag and Nova Prime Dual Pack).
  * The non-Prime pair's text is close but thinner: Titan Extractor says only "Purchase the reusable Titan Extractor blueprint from the in-game Market" (the wiki gives 50,000 Credits and notes the blueprint is reusable); Distilling Extractor already says 50,000 Credits.
  * The recipe numbers MATCH the wiki for all four (checked against `ExportRecipes`: Titan 10,000 Credits + 500 Polymer + 300 Ferrite; Titan Prime 20,000 + 500 Alloy Plate + 300 Nanospores; Distilling 50,000 + 1,000 Polymer + 150 Oxium; Distilling Prime 65,000 + 2,000 Polymer + 300 Oxium; 6 hours each), so only the "where to get it" text is wrong or incomplete.
* **Required Resolution Protocol (proposal)**:
  * Replace the vague acquisition text for the two Primes with the wiki's source list (verbatim sentences from wiki.warframe.com, which is an allowed primary source), keep date-limited statements dated, and add the Market price to the Titan Extractor line; add a regression test.
  * Check whether other inventory-owned categories in raw `inventory.json` have no handling (this is the same class as the earlier "missing from the inventory" bugs), and list them.
  * Recheck in the deployed app.

---

## 35. Prime Sets Card Shows Only The Last Word Of A Part's Name
* **Frequency**: Reported 2026-10-03 while checking item 32 (screenshots of Ballistica Prime Set and Akbronco Prime Set).
* **Root cause (verified)**: `src/components/PrimeSetCard.jsx` line 54 renders `part.name.split(' ').slice(-1)[0]`, the LAST word of the part name. "Ballistica Prime Upper Limb" and "Ballistica Prime Lower Limb" both become "Limb"; "Bronco Prime", "Lex Prime", "Magnus Prime" and "Vasto Prime" become "Prime". The dual-weapon parts became visible with item 32; the bows had the problem before.
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
* **Cause (verified)**: `src/components/PrimeSetCard.jsx` line 51: `<span className="absolute top-1 left-1 text-[14px] font-black text-kronos-accent ...">x{part.need}</span>`.
* **Required Resolution Protocol**: place the "x2" centered above the part image in the cell (keeping the platinum badge top-right and the label below), make sure it does not overlap the image or the price badge, check with 1, 2 and 3 parts per row and with the longer labels from item 35, and recheck in the deployed app. Do it together with item 35 (same component).

---

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
* **Findings so far (read-only, verified)**:
  * The only structured source is the DE drop-table export (`warframe-items-acquisition.json`): Alloy Plate has 10 rows, all mission rewards (3 Sabotage caches, 7 Conclave modes). No container or planet-location data exists there.
  * `wiki-resources-acquisition.json` (429 entries) has NO entry for Alloy Plate, Ferrite, Nano Spores, Polymer Bundle, Rubedo, Salvage, Plastids, Circuits, Morphics, Gallium or Control Module (it does have Neurodes, Orokin Cell, Detonite Ampule, Fieldron Sample, Mutagen Sample). Those resources therefore only get the drop-table text.
  * The drawer shows 5 of the 10 rows in one paragraph with one repeated percentage; the Variant Annihilation / Variant Cephalon Capture rows and the Neruda and Mars/Mercury node names are not shown. Where exactly the cut happens is NOT yet traced.
  * `acquisition_overrides.json` line ~1063 maps "Alloy Plate" (and Argon Crystal, Circuits, Control Module...) to an unrelated decoration-market sentence; it is not what the drawer showed here, but it is wrong data to review in the same pass.

---

## 39. Prime Warframe Drawers Offer The Prime Blueprint For Credits In The Market
* **Scope (measured)**: ExportRecipes has 1,766 recipes with `excludeFromMarket` and 775 with `creditsCost`; 577 recipes have BOTH, so every one of them can show a false "Market Blueprint" price. Prime Warframes are the visible case (51 Prime Warframe recipes carry `creditsCost`).
* **Required Resolution Protocol**: only treat `creditsCost` as a Market price when the recipe is not `excludeFromMarket` (and check the wiki for a few non-Prime items to confirm the meaning of the field before relying on it); for Prime items show the relic sources in the Blueprint row (item 36); drop the "Blueprint:" cost chip when it is not a real market price; test over all recipes with the real export that no `excludeFromMarket` recipe produces a Market Blueprint text; recheck in the app. Do together with items 36 and 8.

---

## 40. Market Page Under 1050px Cuts Off The Tabs
* **Reported 2026-10-03** (screenshot): with the window narrower than 1050px, the top of the "Active Orders (0)" and "Tradeable Stock (568)" tab row is clipped on the Market page.
* **Probable cause (NOT verified in the running app)**: `src/screens/Market.jsx` line ~700 lays the page out as `flex-1 p-6 flex flex-col gap-6 overflow-y-auto`. The tab row (line ~754, `flex border-b border-white/5 gap-6`) has no `flex-shrink-0`, and the tables below use `overflow-hidden`, so in a short, narrow window flex shrinking can squeeze the row below its content height and clip the text. The 1050px rules live in `src/preview/styles/preview-responsive.css` and have nothing for Market.

---

## 41. Rivens Page Shows Horizontal Scrollbars On The Filters And The Card Area
* **Reported 2026-10-03**: the Rivens page has a horizontal scrollbar under the cards section where other tabs have none; the horizontal scrollbars on the Rivens filters either cannot be grabbed or do not work. "No other filters in the app get scrollbars, these shouldn't either. They should work like other tabs. The only horizontal scrollbar is supposed to be on the currency strip in Inventory."
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

---

## 45. Inventory Parse Fails In The Worker: "Q.startsWith is not a function"
* **Evidence (app log)**: the same error is logged 10 times on 2026-10-03 (12:04:47, 12:06:42, 12:11:10, 12:11:47, 12:12:33, 12:13:37, 12:14:00, 13:38:00, 13:39:20, 13:42:53) and 4 times on 2026-10-02. They line up with app starts and data reloads, not with a screen. The game locale setting is `en`, so this is not a language problem.
* **Why it matters**: `MonitoringContext.jsx` ~line 509: when the worker call fails, the handler runs `setInventoryData(null)`. Every failed parse therefore throws away the parsed inventory until a later parse succeeds, which can make owned/unowned state, Prime Sets and the Inventory screen go empty or wrong for a while. How often you actually saw an empty Inventory is unknown; tell me if you did.
* **Required Resolution Protocol (proposal)**: reproduce with the same runtime bundle the app builds (`MonitoringContext.jsx` ~lines 700-720: `buildRuntimeExportBundle` with `wiMaps`/`wiSupplement`/`cosmeticAdditions`) in a Node test, find which entry holds the non-string, fix at the source of that data AND make every `.startsWith` in the parser safe for non-strings (a small `isLotusPath(value)` helper), add a real-data test over the runtime bundle, and stop a failed parse from wiping the last good inventory (keep the previous value and log the failure). Recheck in the app: the error no longer appears in the log.

### Addendum 2026-10-03 (after the fix): what the resource job did and did not cover
* Data source: pages fetched from wiki.warframe.com only (Category:Resources, 505 pages, one request per 1.2 seconds), saved as `scratchwiki/` snapshots (kept next to the repo, not committed); generator `scripts/build-wiki-resource-sources.mjs` produces `src-tauri/data/assets/data/wiki-resource-sources.json` deterministically.
* The 149 other entries in the acquisitions table whose `blueprint` text just repeats the drop text (item 8 audit) were listed and NOT changed.
* Extractors (item 34) are a separate job and not done yet.

---

## 46. Inventory List: Keyboard Scrolling Does Nothing, Maximizing Jumps To The Top (Related To Item 15)
* **Verified in code (a)**: `src/screens/Inventory.jsx` has no `tabIndex` and no key handler anywhere, and the shared page container (`PageLayout` in `src/components/UI.jsx`, ref callback at line ~235) is not focusable either. WebKitGTK only scrolls with End/Page Up/Page Down when a scrollable element has keyboard focus, and the virtualized list container never gets it, so the keys are ignored.
* **NOT verified (b)**: the effect at `Inventory.jsx` line ~265 scrolls to the top whenever `activeTab, searchQuery, currentFilters, sortCriteria, sortDirection, viewMode` or `resourceFamily` change; `currentFilters` is stable state, so that effect alone should not fire on a resize. The calibration effect (~lines 654-766) re-runs on `[virtualRoot, activeTab, viewMode, isPrimeParts, isAyatan, isListView]` and a ResizeObserver; when the column count changes on maximize, the virtual root height changes and the window position is recomputed from `scrollTop`. A remount of the scroll container or an unstable value among these dependencies would also reset the scroll position. The cause needs a reproduction (resize while scrolled down and log `scrollTop` before and after), not a guess.
* **Required Resolution Protocol (proposal)**: (a) make the list container focusable (`tabIndex={0}`, no visible outline) and focus it on mount and after clicks inside the list, plus handle Home, End, Page Up and Page Down explicitly (scroll by `clientHeight`, or to `scrollHeight`) so it also works while the list is virtualized; (b) reproduce the resize jump, then keep the scroll position (keep the first visible row index and restore it after the column count changes); (c) with these in place, re-measure item 15. Test: a pure function for the keyboard targets, and a test that a resize with an unchanged filter state does not reset `scrollTop`.

* The general grid window element, as inspected in the running app, is `div.absolute.inset-x-0.grid.grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4` with inline `top: 43424px`, rendered size 1388 x 1934 px, row-gap 16px, column-gap 16px.
* `43424 = 236 x 184`, exactly the fixed `GENERAL_ROW_STRIDE` (184), so the code's constant is what positions the window. The cards are `min-h-40` (a MINIMUM of 160px), so their real height follows their content and is not the 168px assumed by `GENERAL_CARD_HEIGHT`. A window of 1934px cannot hold whole 184px rows (1934 is not a multiple of 184 plus 16 less), so the real stride differs from 184 (likely 7 to 11 px per row), which makes the window drift against the virtual root height (rowCount x stride). This supports the earlier note that the real fix is a measured stride.

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

### Addendum 2026-10-03 (item 34): other owned inventory keys the parser does not handle yet

### Addendum 2026-10-03 (item 48): what the search found and what would unblock it
* The player inventory shows the calendar upgrade identifiers `/Lotus/Upgrades/Calendar/AbilityStrength`, `/Lotus/Upgrades/Calendar/ElectricStatusDamageAndChance` and `/Lotus/Upgrades/Calendar/RadialJavelinOnHeavy`; the screenshot adds `GasChanceToPrimaryAndSecondary` and `Armor`. No cached worldstate with `KnownCalendarSeasons` exists offline, so the exact event payload could not be printed.
* To fix the German text I need ONE verified source: the in-game German names (a screenshot of the in-game 1999 calendar with the game language set to German, or a German page on wiki.warframe.com that lists them). Without it, those names stay English.

---

## 49. Prime Sets Card: Last Part Cell Cut Off At A Medium Window Width
* **Probable cause (from the screenshot and the code, not yet measured in the app)**: `src/components/PrimeSetCard.jsx` line ~51 lays the parts out as `grid-template-columns: repeat(N, 1fr)` (N up to 6). A plain `1fr` column cannot shrink below the content's minimum width, and each cell has `p-3` padding plus a word such as "Blueprint", so a cell stays about 80px wide. In the screenshot five cells of about 80px (about 400px) do not fit into a card about 350px wide, and the card has `overflow-hidden`, so the fifth cell is cut. At a medium window the Inventory shows two cards per row (`lg:grid-cols-2` in `Inventory.jsx` ~line 1302), so each card is narrow; in a small window it is one wide card per row, and in full screen the cards are wide, which matches the report. Sets with 5 or 6 parts (Paris, Ballistica, Cernos, Daikyu, the Ak- sets) are the ones that can be affected. The part labels now wrap (item 35 change) but the minimum width of a cell is set by its longest word, so that change did not cause this; I could not prove whether it existed in the earlier build.
* **Required Resolution Protocol (proposal)**: let the columns shrink (`repeat(N, minmax(0, 1fr))`), reduce the cell padding at narrow widths, allow long words to break, and make the part row wrap onto a second line when five or six cells would be narrower than about 64px; keep the ×N badge, price badge and label layout; test with a render of a 6-part set at narrow container widths that no cell has a fixed minimum above the available width; recheck at small, medium and full-screen widths in the app.

---

## 50. Ash Drawer: The Top Source List Misses Sources That The Blueprint Row Lists
* **Verified (real data)**: the DE recipe `AshBlueprint` has `creditsCost: 35000` and is not `excludeFromMarket`, so a Market credits purchase is real. The hand-written warframe table in `src/lib/acquisitionData.js` has `"ash": { "blueprint": "Market (35,000 Credits) or Simaris", ... }`; `resolveBlueprintOrigin` prints that text in the Blueprint row. The top source list comes from a different path (`getAcquisitionInfo`, `src/lib/acquisitionInfo.js` ~lines 890-1000), which for this item produced only the single override/market line (375 Platinum). Nothing merges the two, so each part shows only its own fragment.
* **Why it is probably wide**: any non-Prime Warframe or weapon whose blueprint has a Market credits price or a Simaris/Dojo offer recorded only in the hand-written table can show the same disagreement. Not measured yet.
* **Required Resolution Protocol (proposal)**: build the top source list from every verified blueprint source for the item: the Platinum Market price from the market index, the credits Market price from the recipe (only when the recipe is not `excludeFromMarket`, item 39), and the extra routes named in the warframe/weapon table (split "A or B" into one row each: Simaris, Clan Dojo research, quest and so on), each as its own row, with no duplicates and the count shown correctly; keep the Blueprint requirement row as it is. Measure with real data how many Warframe and weapon drawers gain rows, test Ash (platinum, credits, Simaris) and a Dojo-only item, and recheck in the app.

### Addendum 2026-10-03 17:08 (item 50): the blueprint as a part shows NO source at all, and it is wide
* **Reported (screenshot)**: opening the part "Ash Blueprint" (category PART) shows "Where to start: 0 sources. No verified acquisition route is known for this item." with a "Know where to find it?" button. The Ash Warframe itself shows one source (Market for 375 Platinum) and its Blueprint row lists "Market (35,000 Credits) or Simaris", so the app knows the routes but the blueprint part does not use them.
* **Cause (probable, same family as the first part of this item)**: the part-blueprint drawer looks up sources only by the blueprint's own item key; the Market/Simaris/Dojo routes live in the hand-written warframe table (keyed by the Warframe's name) and in the recipe's market prices, and nothing connects the blueprint item to them.
* **Proposal**: make the blueprint part inherit the routes of its Warframe: the Platinum and credits Market prices (credits only when not `excludeFromMarket`), and every route named in the warframe table ("A or B" split into rows), plus the Warframe's own acquisition source for quest or Dojo cases. Test over all main Warframe blueprints that none returns 0 sources unless its Warframe also has none, and recheck Ash, Excalibur, Mag and Volt in the app. Same job as the first part of item 50.

---

## 51. Prime Part Drawers Show Wrong Common/Uncommon/Rare Tiers (Reopens Item 9)
* **Verified on real data**: DE `ExportRelics` (the authority) gives the right tier per relic and reward: for example Nidus Prime Chassis Blueprint is RARE in all 6 relics (Lith N12, Lith N7, Meso N14, ...), while the Nidus Prime main Blueprint is UNCOMMON. The part drawers (the "Crafting requirements" part rows) look the tier up with `buildRelicRarityIndex` (`src/lib/relicSources.js`) using the key `relic name | item path`. The index is keyed by the reward's BLUEPRINT path (`.../NidusPrimeChassisBlueprint`), but the ingredient being looked up is the COMPONENT path (`.../NidusPrimeChassisComponent`), so the lookup misses and the code falls back to the `rarity` field of the bundled item data (`wfcd-combined.json`). That bundled field is itself unreliable: for Ash Prime Chassis every relic row is labelled Uncommon even for the 25.33% (Common) rate; for Nidus Prime Chassis the 10% row is labelled Uncommon while the 2/4/6% rows are Rare; Nyx Prime Neuroptics is mixed the same way.
* **Required Resolution Protocol (proposal)**: look the tier up through the component's blueprint (the recipe index already links `blueprintUniqueName` to the component), always prefer the DE `ExportRelics` rarity, never the bundled item-data label; add a real-data test over EVERY Prime part: the tier shown equals the DE tier for that relic and reward, and no relic shows a tier that contradicts its refinement-independent DE value; recheck Nidus, Nyx, Ash and Citrine Prime in the app.

---

## 52. Orokin Cell And Other Resource Drawers: Hundreds Of Rows That Just Say "Mission"
* **Reported 2026-10-03** (screenshot): Orokin Cell drawer: "176 sources", the featured source is "Mission 50.0%" and the list is "Mission 33.3%" over and over. A screenshot earlier the same day (build 795d0a7) showed real names.
* **Measured**: Orokin Cell now returns 176 sources: 1 wiki sentence plus 136 rows of type `mission` coming from the bundled DE item data (`source: "warframe-items"`) with fields `node`, `nodeName`, `missionType` (for example `MT_PVP`), `rotation`, `chance`, and 40 more text rows. The drawer label for a mission row (`getSourceLabel`, `src/components/AcquisitionDrawer.jsx` ~line 75) does not use that field shape, so it prints just "Mission". The resource job (item 38) merged these rows into the drawer but I only checked their data, not how they render; this is a regression that was merged and built.
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
* **Required Resolution Protocol (proposal)**: make the blueprint drawer inherit the item's sources (the same rule item 50 added for Warframe and weapon blueprints, extended to the Drones), show the pair under one consistent naming and category ("Titan Extractor Prime" and "Titan Extractor Prime Blueprint"), and test that both drawers list the same routes. If you meant something else by "twice", tell me which two entries you saw.

---

## 56. Consistency: One Contract For Every Drawer
* **Honest cause**: acquisition rows come from at least six unreconciled places: the DE drop tables, the DE bundles and recipes, the bundled item data (with its unreliable labels), hand-written tables keyed by Warframe or item name, override sentences, and the wiki text files. Each fix in this report patched one path, and nothing forces two paths to produce the same shape, the same wording, or the same count rules. That is why Ash, Forma, Orokin Cell, Alloy Plate and the Primes all look different.

---

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
* **Required Resolution Protocol (proposal)**: build one vendor place per real vendor name (Acrithis, Nightwave, Baro Ki'Teer, Simaris, the syndicates and so on) from both the wiki list (read as names) and the DE vendor offers, with the price/standing in the row; the Vendor tab then ranks vendors by how many of your needed items each sells. Test on the real data that the Vendor tab has several vendors and that a target the drawer says is sold at a vendor appears under its vendor.

---

## 60. Target Inspector Hides Everything For A Target You Own
* **Needs your decision before any work**: for a target you own, should the inspector (a) still list its full build requirements with each component marked owned or needed (nothing is ranked or farmed), (b) offer a "show full requirements" switch, or (c) stay as it is? My recommendation is (a): the same list as for an unowned target, with owned items ticked, so it is never empty.

---

## 61. Inventory End Key Stops At The End Of What Is Rendered
* **What I checked in code**: the End target is `scrollHeight - clientHeight` of the scroll container (`src/lib/inventoryScroll.js` `getScrollKeyTarget`, used by the handler in `Inventory.jsx` ~lines 275-315), and the list has no progressive "load more" step: the virtual root's height is `rowCount x stride (+16px)`, so in theory `scrollHeight` already covers the whole list. There is no CSS smooth scrolling on this container (`scroll-behavior: auto !important`). So the code reading does not explain the symptom.
* **Hypotheses (not verified, in order of likelihood)**: (1) the row stride is re-measured from the first rendered row after the jump (item 46 change), the root height changes while the window is moving, and the browser clamps the scroll position before the new window has rendered; (2) the jump is applied once and the throttled window update (50 ms) renders the window at the old position, so the target was computed against a height that then changes; (3) a tab where the list is not the virtual list (a different layout) uses a different container.
* **Required Resolution Protocol (proposal)**: compute the End target from the model (`rowCount x stride + bottom padding - viewport`) instead of reading `scrollHeight`, apply it, and repeat after each animation frame until `scrollTop` and `scrollHeight` stop changing (maximum 5 passes); do the same for Home; do not re-measure the stride while a key jump is in progress; make the first measurement happen once per layout and reuse it; log the target, the final `scrollTop` and the final `scrollHeight` so a failure is visible in the log; test the pure target calculation and a simulated height change between passes; recheck in the app on at least the general grid, the Prime Sets tab and the list view. Please tell me which tab you pressed End on if it differs per tab.

* **Why my earlier searches failed**: I searched the exported data for the PATH TEXT and its words. The real names are not stored under those paths, and they are not in the German language export on this machine at all (searched for "Abgefüllter Blitz", "Dicke Haut", "Hex-Boost", "Modifikator": no hits), so there is no DE data source for the names; the game client has them.

---

## 62. Larger Project (Later): Our Own Refresh Of The Game's Language Strings
* **Why**: the app's dictionary comes from a community-processed export that lags game updates; the 1999 Hex Boost names (item 48) were missing although the game has them. The community repository `calamity-inc/warframe-languages-bin-data` (branch `senpai`, "All strings for Warframe in all languages. Updated automatically.", game version 44.0.3 at commit 826e8eab on 2026-09-30) holds all 140,286 strings in each of the 14 languages (about 19 MB per language). Its scripts show how it is made: they download each language's `Languages.bin` from Digital Extremes' own content servers (the cache manifest `H.Cache.bin`, then `B.Cache.Windows_<lang>.bin`, then `Languages.bin`), unpack it with a function from a separate tool (`warframe-cache-tools`, not in that repository), and write `<lang>.json`. The repository states no license, so its code must not be copied; the DATA is Digital Extremes' text.

* **Why it was empty**: `buildLedger` computes `stillNeeded = max(0, required - owned)` and `requirements.js` consumes owned stock before expanding a recipe, so an owned target had nothing to farm and its recipe was never expanded.

---

* **Counts (items with at least one such row)**: number cut in half at a thousands comma ("50" / "000 Standing"): **457**; Market sentence with the price missing ("purchaseable from the Market for . Bundle price ..."): **155** (armor bundles: Cirrus, Dendra, Porta, Shi, Sorex, Aesopex, Avia, Kuva, Harkonar and more); wiki or table text with history or update wording ("Beginning with Amir's Shockwave", "Originally a reward ..."): **142**; a row that is only a label ("Blueprint:"): **89**; template names with underscores ("Arca_Armor_Collection is purchaseable ..."): **14**; "Blueprint: or as a drop from: ..." (Galariak Prime): 1.
* **Cause, number split (verified in code)**: `splitAcquisitionRouteText` in `src/lib/acquisitionInfo.js` (line ~122) splits a hand-written route string at every comma outside parentheses; the comma inside "50,000" is split too (its comment says commas inside parentheses are kept, but not those in a plain number). It is used for the Warframe/weapon table text (line ~1130) and for the per-item override text (line ~1198). The override texts such as "Blueprint: or Purchased from Bird 3 (Rank 4+) for 50,000 Standing." (Grimoire) are also split at the colon-label and keep the stray label.
* **Cause, the rest**: the item 54 and 57 cleanup (P20) audited only the wiki resource texts, the extractor texts and the hand-written Warframe/component and resource tables. The armor-bundle, cosmetic and other override paths were never audited, which is exactly the gap item 56 describes (a whole-catalog audit with one contract).

---

## 64. Dashboard In Korean: Raw Node Ids, English Factions And Reward Words
* **Reported 2026-10-03** (screenshot, Korean, build 21:48, Dashboard): the Steel Path Incursions card shows "SOLNODE65, 화성", "CLANNODE2, 지구", "SOLNODE710, 데이모스" (raw node ids with a translated planet); the Invasions card shows "SolNode189", "SolNode144", "SettlementNode14" instead of place names; factions stay English (INFESTED, CORPUS, GRINEER), "Blueprint" and the item names "Detonite Injector", "Fieldron" stay English, and "THE MURMUR" is English.
* **Why this is not the item 18 work**: item 18 audited the app's OWN interface strings (the 14 locale files). These texts come from a different layer: the worldstate parser and the game dictionary (`dict.json`, downloaded per language from the community mirror `browse.wf`), and from hard-coded English tables. The earlier audit never looked at them, so "all 14 languages audited" was true for the locale files only.
* **Verified (read-only, real data)**: (1) the Korean `dict.json` now on disk (rewritten 21:54:42 when the language was switched) resolves every one of these nodes correctly: `resolveNode` returns Gradivus, Naga, Exta, Shklovsky, Coba, Paimon, Effervo for the ids in the screenshot. So the raw ids in the screenshot are a TIMING problem: the Invasions list is built once when the worldstate is parsed (`worldstateParser.js` ~line 582, `resolveNode(i.Node, dict, ERg)`) and is not rebuilt when the dictionary changes; the Incursions card resolves at render time and also showed raw ids, which suggests the dictionary was not yet loaded when the screen was drawn after the language switch. Not proven: please tell me whether the raw ids go away after Reload UI or an app restart. (2) Even loaded, node names such as "Gradivus" are the English names in the Korean dictionary (the community Korean dictionary does not translate them; the game's own Korean strings would, see item 62). (3) Factions: `resolveNode('FC_INFESTED')` returns the hard-coded English "Infested" (a MAPPING_TYPES table); there is no Korean faction entry in the dictionary or the locale files. (4) Reward text: the Korean dictionary has no values for "Detonite Injector" or "Fieldron" and "Blueprint" is appended in English by the reward-text builder; the Korean part-names that do show come from the dictionary.

### Addendum 2026-10-03 22:10 (item 64): the timing guess was wrong; the cause is proven
* **What DE's own Korean file says**: `ExportRegions_ko.json` (DE PublicExport, already downloaded) has the node name "Gradivus" and the planet "화성": DE itself keeps node names in Latin script in Korean. So the right display is "Gradivus, 화성" and no other data is needed for the nodes.
* **Which DE language files the app downloads today**: DE's own localized exports exist for only 4 variants on this machine (en, de, ja, ko; one category set per language). The dictionary `dict.json` (item names, factions, messages) still comes from the community mirror `browse.wf`, not from DE's own `Languages.bin`: that is item 62.
* **Fix proposal**: `resolveNode` must use a literal `entry.name` when it is not a dictionary key (one small change plus a test over every node id in every language that fails on a raw id); then item 62 supplies the game's own faction, item and reward strings.

---

## 65. Farming Targets: Vendors Tab Empty, Syndicate Shop Items Filed As Missions (Reopens 59)
* **Reported 2026-10-03** (two German screenshots, build 21:48): with the filter on Händler (Vendors) and on Gegner (Enemies) the list says "Keine verifizierten Quellen entsprechen diesen Filtern."
* **Cause (verified in code and data)**: `sourceType()` in `src/lib/farmingTargets/screenModel.js` (~line 147) returns 'vendor' only for sources of type 'vendor'; every other type, including 'syndicate' (and Market text rows), falls to 'mission'. Rahn Prism's only source is `{type: syndicate, syndicateName: The Quills, standing: 2500}` and Klamora Prism's is Vox Solaris 3,000 Standing: both are shop purchases, but they appear under Missionen as the places "The Quills" and "Vox Solaris". The item 59 fix only fed the Vendor type from the wiki vendor list and DE vendor offers, so it never covered syndicate offerings, and the Market purchase of Ambassador (a text row) becomes no place at all. The Enemies tab is empty because none of the 7 targets has an enemy drop source (correct).
* **Also wrong**: the syndicate rows carry `source: "drops.wf"` (the provenance website) and no readable price text; the empty-tab message does not tell which tab has results.

---

## 66. Follie Chassis Shown As Not Owned
* **Reported 2026-10-03 22:54** (build 22:48): "it says I don't own a Follie chassis, but I do. I have it built and I have a blueprint." The screen was not named yet.
* **Real data (read-only)**: the raw inventory has `MiscItems` Follie Chassis (the BUILT component) x1, `Recipes` Follie Chassis Blueprint x1, plus Follie Blueprint x2, Follie Neuroptics Blueprint x1 and Follie Systems Blueprint x1, and Neuroptics and Systems are being built right now (`PendingRecipes`, finishing 2026-10-03 later). The Follie Warframe itself is not owned (correct: only parts so far).
* **What the parser says**: in the Inventory the entry "Follie Chassis" (category parts) is owned = true, quantity 2 (1 built + 1 blueprint), crafted 1; "Follie Blueprint" owned, quantity 2; "Follie Neuroptics" and "Follie Systems" are marked owned = true with quantity 0 (they are only in progress; the flag looks wrong). The Warframe entry "Follie" has `components: []`, an empty list, so a Warframe drawer cannot show per-part ownership from that field.
* **Open question**: which screen says "not owned" (Inventory drawer of Follie, Foundry, Farming Targets, Mastery, Relic or Prime Sets)? The parsed data says owned in the Inventory list, so the wrong text is on another path. Waiting for the screen name or a screenshot; NO fix started.

### Addendum 2026-10-03 22:58 (item 66): the screen is the Foundry recipe panel, cause found in code
* **Screenshot (Foundry, Follie recipe)**: Follie main blueprint 2/1, Neuroptics 1/1, **Chassis 0/1 with "1 BP"**, Systems 1/1, Orokin Cell 7/3. The real inventory: Chassis is BUILT (MiscItems x1) with its blueprint x1; Neuroptics and Systems are only IN PROGRESS (PendingRecipes). So the panel has two of the three components backwards.
* **Cause (verified by reading `src/lib/inventoryParser.js` ~3781-3822 and ~3945-3950)**: `ownedItemCounts` is built from the raw arrays (Suits, weapons, Recipes (blueprints), ...) but NOT from MiscItems, where built components such as `FollieChassisComponent` live (they go to `resourceCounts`). For a component ingredient the Foundry code uses `have = ownedItemCounts[component]` only (the non-component branch sums `resourceCounts + ownedItemCounts`), so a built Chassis reads 0. Then the fallback loop over the processed `all` list sets `ownedItemCounts[key] = 1` for every part flagged `owned` whose key is in neither table: Follie Neuroptics and Follie Systems carry `owned = true` with quantity 0 (the flag is set by the in-progress build), so they read 1/1. The Chassis is skipped by that fallback because its key is in `resourceCounts`. This is also why those two parts say 'owned' in the Inventory with quantity 0 (see the item 66 notes above).

---

## 67. App Freeze After Inventory Refresh, Then Farming Targets
* **So the stall is probably not in the model code**: candidates are rendering or painting in the web view (WebKitGTK), or work off the main thread (the inventory parse worker after the refresh). Nothing in the logs names a screen, because screen changes are not logged.

---

## 68. Acquisition Rows That Do Not Say How To Get The Item (Follows 63)
* **Cause (verified on real data)**: the original text is one wiki sentence stored in `acquisition_overrides.json`: "Blueprints and components are a potential reward from Invasions. All components can be traded, although players must have a Mastery Rank of at least <N> to acquire the blueprint. type=Weapon". The route splitter (item 63 fixed only numeric commas) cut it at the comma into two rows, the first sentence was lost to the short table text "Invasions", and the wiki template residue `type=Weapon` was never removed. The item 63 audit had no check for these shapes, so it reported 0 violations.
* **Measured over all 13,235 catalog entries (probe `scratch/frag-scan2.mjs`)**: rows that start with a conjunction (although, which, but, and, while ...): 262 items; rows with `type=Weapon`-style residue (and one with leaked wikitable markup `{| class="wikitable"`): 46 items; bare one-word rows ("Invasions", "Glyph", "Sigil"): 92 items; rows starting in lower case (sentence halves, includes some legitimate phrases): 1,246 items; the bare "All components can be traded": 4 items (Latron Wraith, Strun Wraith ...).

* **Measured on those 31 real targets (Node, real data)**: 102 ledger rows, 203 ranked places (100 missions, 82 relics, 14 Conclave, 4 enemy, 3 vendor), 912 item chips; the model builds in about 0.15 s, the place index in 0.5 s, `computeFarmingTargetsView` in 4 ms. So the calculation is not slow in Node, and the page's element count at the freeze was a steady 1,500 (the full list would be several thousand). I could NOT reproduce a freeze outside the app; the cause is still unknown. The running app showed one thread at 100% CPU and the web view growing about 12 MB per second.
* **Needed next**: the logging gap (see the 2026-10-04 notes: no screen mount, click or farming event was written in the frozen session) and a safe default for large lists (render a first page of places with 'show more', collapse the chips), both as one job; then compare with the 21:48 build (`.bak-2248`) to see whether the last two fixes matter.

---

## 69. Farming Targets: Node Rows Do Not Say Which Planet
* **Reported 2026-10-04** (screenshot: Exta, Lu-yan, Luckless Expanse, Enkidu Ice Drifts, Fenton's Field, Vesper Relay, all "Exact node" with no planet; also with 'Group by planet' on): "having nodes is great ... except it doesn't tell me what planet even when I say group by planet".
* **Cause (verified in code)**: `sourcePlace()` in `src/lib/farmingTargets/screenModel.js` (~line 237) sets `planet: source.region ?? source.planet ?? null`, i.e. only what the drop-table row itself carries. The code DOES find the node's region record (`regionForSource`, used for the faction) but never uses it for the planet. DE's region file (`ExportRegions`, `systemName`) knows the planet of every node ("Exta" belongs to Ceres). Rows from drop tables that carry no region therefore show no planet, and 'Group by planet' has no group to put them in. Some "mission" places are really bosses or caches (Corrupted Vor, Alad V, Hallowed Flame caches) with no node at all; those need an honest label rather than a blank.

---

## 70. Leaving Any Screen Crashed The App (Caused By The Logging Added In Job P28)
* **Reported 2026-10-04 13:41** (screenshot of the error screen, build 13:15): going from an empty Farming Targets to Inventory showed "SOMETHING WENT WRONG. t is not a function. (In 't()', 't' is 41)". The app log (13:41:03) shows `t is not a function. (In 't()', 't' is 41.99999999999909)` with the component stack `PageLayout in FarmingTargets`.
* **Cause (verified in code)**: job P28 added screen-mount timing to `PageLayout` (src/components/UI.jsx ~line 206): `useEffect(() => screenMountRef.current?.tracker.complete(), [route])`. `complete()` returns the screen's duration in milliseconds (a number such as 41.99999999999909), and React treats whatever an effect returns as its cleanup function, so when the screen unmounted or the route changed React called the number as a function. Every screen uses `PageLayout`, so every screen change crashed.
* **Why nothing caught it**: the screen tests render pages on the server, which never runs effects; I merged and built without a test that runs an effect cleanup. My review of P28 did not check what the new effect returns.
* **Fix (job P33)**: the effect body no longer returns a value (`completeScreenMount` discards it); a new test (`tests/ui/effect-cleanup.test.mjs`) scans every `useEffect`/`useLayoutEffect` in `src/` for an expression-bodied callback or a non-function return (the one allowed case, `installUiDelegation`, was verified to return a real cleanup function) and checks that `completeScreenMount` returns undefined; it fails on the broken code (proved with a temp copy of HEAD). The error boundary now also writes `app.render_error` (message, first 20 stack lines, component stack) to the session log.
* **Process lesson**: any change that adds code to a shared layout needs a test that runs the effect/cleanup path; static-render tests cannot see it.

---

## 71. Inventory 'All' Tab: Unmastered + Unowned Shows Atlas Although It Is Mastered
* **Real data (parsed inventory)**: the Warframe entry "Atlas" (category warframes) is `mastered = true` (via Atlas Prime's XP) and `owned = false` (only Atlas Prime is owned): it does NOT match Unmastered, so it is not what the filter lists. The entries that DO match Unmastered + Unowned are the base-Warframe parts in category `parts`: **Atlas Blueprint, Atlas Neuroptics and Atlas Chassis** (each `owned = false`, `mastered = false`; Atlas Systems is owned). Their `mastered` flag is simply false because mastery is only computed for finished items, while the Prime parts (`prime_parts`: Atlas Prime Blueprint, Neuroptics, Chassis, Systems) inherit their parent's mastered = true. The filter code (`src/screens/Inventory.jsx` ~lines 640-672) just tests `item.mastered`.
* **So**: parts of a mastered Warframe appear as "unmastered" because components have no mastery of their own and the app does not copy the parent's state to them (it does so only for Prime parts and Prime sets). This affects every Warframe, weapon and companion whose parts are listed under category `parts`, not only Atlas.

---

## 73. Resources And Other Drawers: Wrong Labels, Walls Of Text, And Items With No Acquisition (Reopens 51 And 52)
* **Measured over every catalog entry on the real data (probe `scratch/res-scan.mjs`)**:
  * **A. No acquisition at all: 1,405 entries** (resources 405, recipes/blueprints 524, cosmetics 437, upgrades 23, gear 12, weapons 2, Warframes 1 (Excalibur Prime), Sentinels 1 (Prisma Shade)). Resources include real farmable ones (Bile, Bioplasma, Biotics, Calx, Cephalite Resonance, Cerulean Fungus Extract, Corpus Datamass, Delta Beacon, DNA Stabilizers, Dera Vandal Barrel/Receiver/Stock, Crystal Cred, Amir's Shockwave Cred) and many event or ship-decoration items (TennoCon and Conquera displays, posters, toys, scenes, 'Segment' fragments). Only 2 of the 359 distinct zero-source resource names appear in the DE drop tables and none has a wiki-resource entry.
  * **C. Walls of text: 178 items with rows over 450 characters** (Remote Observer 2,208 chars, Kullervo's Bane 714, Vome Residue 689, Cipher 615, Pathos Clamp, Kavat Genetic Code ...), and 4 items whose text contains flattened drop-table numbers (both Archon Shard entries, Lua Thrax Plasm, Corrupted Holokey): wiki tables were pasted into prose.
* **Why the earlier jobs missed it**: P20, P22 and P30 audited text SHAPE (templates, history, splits). None audited that every entry HAS a route, that every row names its place, or a length limit; and the 486 wiki-verified resource entries (item 38) never covered the 405 resources that have no drop-table or wiki entry.

### Addendum 2026-10-04 14:55 (item 73): Forma Blueprint, the same problems, and what the pattern shows
* **What the pattern shows**: every earlier fix (items 38, 52, 53, 54, 57, 63, 68) cleaned text AFTER it had already been assembled as prose; the drawer still shows whatever prose the wiki and override tables hold, one paragraph per source, with no rule that one row equals one route. That is why each new item shows a new variant. A fix at the root is the contract of item 56: acquisition is stored and shown as STRUCTURED ROUTES (kind, place, price or chance, requirement) and every sentence is generated from those fields, never pasted. This needs a phased job, not another patch.

---

## 74. Regression Of The Acquisition Rebuild (Caught Before The Build) And The Machine Freezes
* **Process lesson**: a baseline taken after a change proves nothing; every normalizer/filter change needs a differential test against the output BEFORE the change, over the whole catalog.
* **Data**: the wiki research uses only the local wiki archive (`/home/jedwards/kiedas-orbiter/wiki_pdf_archive`, 10,790 pages); no live wiki requests and no web search.

---

## 75. Items With Live-Wiki Image URLs Show A Blank Image (Corufell Prime In The Relic Reward Overlay)
* **Reported 2026-10-05** (screenshot of the in-game relic reward screen with the app's overlay card): the "Corufell Prime Blueprint" card has an empty image area while the other cards show their art.
* **DE now publishes all of them** (DE `ExportManifest`): `.../Weapons/MeleeWeapons/Weapons/CorufellPrime.png`, `.../PrimaryWeapons/Weapons/SteflosPrime.png`, `.../SecondaryWeapons/Weapons/DuelistPistols.png` (Aksondol), `.../PrimaryWeapons/Weapons/DuelistBow.png` (Nunchasa), each with its content hash. So the overrides are obsolete and wrong to prefer.
* **Required Resolution Protocol (queued as job P43)**: remove the wiki hot-links and resolve those icons through DE's manifest (the same form every other image uses); a whole-catalog audit that fails on any image that is a web address; check the overlay path renders from cached images only.

---

## 76. Relic Reward Overlay Misreads Requiem ('Kuva') Relic Reward Screens
* **Reported 2026-10-05 14:40**: "I did Kuva relics earlier and the overlay was unable to read what they were". (Requiem relics are the Kuva Lich relics; in the log they are `void_tier=Requiem`, relic names `ImmortalD`, `ImmortalOmniA`, `ImmortalABronze`.)
* **Not the same problem** (checked): the 14:34:58 reward screen where the icon scan failed four times (all template scores about 0.3 to 0.5) happened while VS Code was the active window (14:35:02), a normal Gyre Prime relic; the screen was probably covered; the scan is not the cause there.

### Addendum 2026-10-05 14:50 (item 76): CORRECTION, the reading was right; the card is a bare stub
* **Required Resolution Protocol (queued as job P45)**: resolve Requiem mods (Fass, Jahu, Khra, Lohk, Netra, Ris, Vome, Xata) from the game data like any other reward: icon from DE's manifest, the mod's real name, the owned count from the inventory, its description; log a warning event (`overlay.reward.no_icon`) whenever any overlay reward has no icon, and test the overlay payload for all eight mods.

---

## 77. Drop Data Came From A Third-Party Copy; DE's Own Drop Page Is Now The Source (2026-10-05/06)
* **What the real data showed** (read-only, 2026-10-05): over 6,441 mission rows present in both, chances differ in 0; the mirror flattens DE's rarity words ("Ultra Rare" and "Very Common" became "Rare" and "Common", 607 rows) and has doubled place names ("Ceres/Ker (Caches) (Caches)"). Over ALL 20,417 items run through the real `getAcquisitionInfo`: 20,287 identical, 130 differ only by DE's finer words and rows only DE has (Duviri Hard tiers, Deimos/Formido), nothing lost.
* **Not a rarity fix**: DE's own page labels relic rewards by chance bracket ("Axi A1: Braton Prime Stock, Uncommon (25.33%)") while DE's relic data says COMMON; all 798 relics differ the same way in the mirror AND on DE's page. Relic tiers therefore must come from `ExportRelics` (the app already does, since 4671480b..e477a431) and never from the drop tables. New test `tests/relics/relicRarityMatchesDe.test.mjs` checks every Prime part's relic rows (607 parts, 2,270 rows, 0 wrong) against DE.
* **Why it was off**: the converter output crashed `buildDropIndex` (`dropsParser.js:474 group.rewards is not iterable`) and 12 sections differed in shape (fake planet "DE", bounty names, A/B/C keys). `scripts/de-drop-tables/parity.mjs` cannot validate it (it compares mismatched keys: 0 chance differences because almost nothing matched), so the whole-catalog comparison above is the real gate.

## 78. Wiki Bounty Notes Became Fragment Rows Carrying The Row's Chance
* **Reported by the audit of the app's own rows (2026-10-05)**: Neurodes, Orokin Cell, Nano Spores, Control Module and Detonite Injector each had a row that was only "Talk to Eudico" (or "Talk to Konzu", "Must complete ...") with the chance 20% / 16.7% / 25%.
* **Cause (proved)**: the wiki node is "Orb Vallis/Fortuna, Venus; talk to Eudico"; `formatWikiResourceDrop` kept the `;`, `splitAcquisitionRouteText` cut the row there and the fragment inherited the bounty's REAL chance. 631 wiki nodes across 59 resources.
* **Fix**: the note stays in brackets on its node (`nodeWithRequirement`, commit 643e5bcb). Tests: `tests/farming/wikiResourceNodeNotes.test.mjs`; on the real data the fragment rows went from 1-2 per resource to 0.

## 79. Items With NO Acquisition In The App, Found By Comparing Every Item With Its Wiki Page
* **Root cause**: every acquisition comes from about 20 derived files looked up by name; when names do not line up the item silently ends up with nothing, and nothing ever compared the app with the wiki.
* **Fix for the core**: `scripts/wiki-audit/make-verified-routes.mjs` adds 114 entries to the `verified-routes*.json` files (0 existing entries changed), each with the wiki page, revid and a VERBATIM quote (test-enforced for every entry), no number invented (a price hidden in a template is dropped, never guessed; 37 candidates skipped, listed in `scripts/wiki-audit/wiki-routes-skipped.md`), and Axi A8 added to the Baro list. 113 of the 150 now resolve, no previously agreeing item changed (commit b427bb37).

## 80. Steam-Only Skins Shown As Market Purchases (Found By The Audit, Open)

## 81. Conflicting Acquisition Routes Between The App And The Wiki (Found By The Audit, Open)
* About 1,100 items are flagged `app_conflict_route` (both texts are kept in the audit report, the tool does NOT decide which side is right): Korumm (app Market 180 Platinum, wiki Narmer Bounties after The New War), Slaytra (app Market 175 Platinum, wiki Kahl's Garrison), Lemnas Staff Skin (app Baro, wiki TennoCon 2020), Fluctus Rahk Skin, Latron Wraith / Strun Wraith (app Invasions, wiki events; compare item 68). Needs a judgement per pattern, not item by item.

## 82. Acquisition Text With The Price Cut Out (Found By The Audit, Open)
* 56 items, for example Holster Amp ("Found at Available for creds ...") and Harrow Suffragan Helmet ("... for on a rotational basis"). Cause: the wiki writes prices with templates (`{{pc|...}}`, `{{dc|...}}`, `{{Resource|...}}`) whose value the extraction drops. The new route generator refuses to invent numbers; the existing hand-written/extracted rows still need the numbers restored from the wiki text.

## 83. The Whole-Catalog Audit Is Not Finished
* Status after four rounds: 4,002 agree, 1,452 partly covered, 359 app-has-nothing (203 of those are false alarms from a page-template token, "DropLocations"), 5,654 app-has-more-than-the-wiki (usually fine: DE data), 7,381 no wiki page of their own (5,022 earlier were cosmetics on shared pages), 1,553 unclassified. Do not treat a status as a to-fix list without grading a sample first. Outputs are git-ignored in `.preview-work/wt/wiki-audit/scripts/wiki-audit/out/` (regenerate with `scripts/wiki-audit/audit.mjs`).

## 84. Relics Screen: Empty "LITH CITRINE P..." Cards (Reported 2026-10-05 19:32, Open, Not Diagnosed)
* Screenshot of build 19:26: two cards titled "LITH CITRINE P...", "Intact 1", no reward list, 0 Ducats, 0 Plat. DE's English relic data contains no relic whose name starts "Lith Citrine", so the title comes from a fallback. The Relics screen reads `ExportRelics`/`ExportRewards` directly (not the drop tables), so the DE-drops switch is not the obvious cause, but that is unproven. Needed: the same screen in `preview-before-DE-drops.appimage`, then trace the title/reward lookup (compare the earlier Citrine Prime fixes 45d1a88f, #75).

## 85. Out-Of-Memory Freezes (Reported 2026-10-06: "you used all my memory")

---

* **Fixed (P51, commit merged 2026-10-06)**: the 71 entries are removed from `verified-routes.json` and `verified-routes.cosmetics.json` (the cosmetics file is byte-identical to its pre-P50 version; the 43 non-cosmetic routes stay), the route generator never selects cosmetics, the audit excludes 7,527 cosmetics by default (`--include-cosmetics` brings them back). The Steam-only skins finding (item 80) is closed by this decision.
* **Rule for every future job brief**: state the scope decisions (no cosmetics, current routes only) in the brief and filter by category in the tool, not afterwards.

## 87. The Same Price Template Lost Its Number In Two Wordings (Fixed 2026-10-06, In The 15:27 Build)
* Cause: the wiki writes prices as templates (`{{Nc|20}}` Nightwave creds, `{{Dc|..}}` ducats); the bundled strings had lost the value ("Available for creds ...", "Available for from the Nightwave Cred Offerings store ..."), and the legacy-text fallback put "Found at" in front of full sentences and doubled full stops.
* Fixed at the source (jobs P52 and P52b): `Nc`/`Dc` handled in `src/lib/acquisitionText.js`, unit de-duplication ("3,000 Standing standing"), 39 mod strings repaired in the data, and the whole-catalog detector (`tests/farming/acquisitionMissingNumbers.test.mjs`) widened to price prepositions with no number (reviewed allow-list of 20 cases where the wiki gives no number). Verified over every catalog item before and after: only the prices and shared sentence/unit cleanups changed (21 + 18 mods, 19 + ~100 text rows).
* The regenerated `wiki-resource-sources.json` now also contains 5 resource entries that had been dropped for an unreadable price template (Stalker Beacon, Wolf Beacon, Grustrag Three Beacon, Ki'Teer Fireworks, +1).

## 88. Audit Classifications Are Evidence, Not Verdicts (Route-Conflict Report P53)
* The report (142 records, 203 route comparisons; proposed classes 24 app_wrong_wiki_right, 17 wiki_outdated_app_right, 68 both_valid_app_incomplete, 94 needs_game_check) mixes real findings with noise: about 20 of the 24 "app wrong" are Nightwave mods where the wiki "fact" is a HISTORY sentence ("Beginning with Nightwave Nora's Mix: Vol. 6, it was added to the Nightwave Cred Offerings") and the app already shows the correct CURRENT route. A wiki sentence about when something was added is never a route.
* Needed next: teach the extractor to ignore history sentences ("Beginning with", "was added", "previously"), then regenerate before any class is used to change data.

### Addendum 2026-10-06 14:30 (item 85): the cap itself filled up with files in /tmp (two kernel warnings)
* **Lesson**: a memory cap that is full of cache or tmpfs kills innocent processes; check `memory.stat` (shmem/file) before blaming the process that got killed.

---

## 89. Non-Prime Items Hid Their Blueprint's Drop Sources In The Drawer (Found By The Wiki Audit; Fixed 2026-10-06, In The 15:27 Build)
* **Found by**: the route-conflict report (item 81). DE's drop table lists the Korumm, Nepheri and Verdilac blueprints in Cetus / Orb Vallis bounties (7.5% and 5.45%) and the Quartakk and Stubba blueprints in Ghoul bounties and Ghoul enemy drops, but their drawers showed only "Blueprint purchasable from Market for N Platinum".
* **Cause (proved with the same builders the drawers call)**: both drawers (`src/components/AcquisitionDrawer.jsx`, `src/preview/acquisition/PreviewAcquisitionDrawer.jsx`) computed the Blueprint sources only for Prime items (`recipe && isPrimeItem`, added 2026-10-03 in `0f6c2c26` for the Prime relic work, never decided for the rest). Non-Prime items got ONE line from `resolveBlueprintOrigin` (first match wins: dojo research, then Market platinum, then registry text, then blueprint drops), so a Market price ended the search before the drops. 314 non-Prime items were affected (32 Warframes, 280 weapons, 2 companions).
* **Process lessons**: (a) the first P55 run hung in its own test and produced an 872 MB log (output not limited); the brief now forces `tail`/`timeout` and no per-item dumps; (b) the earlier stale expectation in the P54 drawer proof test (it asserted the old Prime-only gate) was updated to the new behavior; (c) see item 85 addendum: temp proof copies in /tmp (RAM) filled the memory cap, so jobs now use a disk TMPDIR.

* **Where the text comes from (read from code, not yet traced end to end)**: `formatRecipeAcquisition` in `src/lib/acquisitionInfo.js` (~line 1049) always starts its detail list with the literal sentence "Built in the Foundry from a blueprint." and then appends build cost, build time, rush cost and ingredients. `AcquisitionDrawer.jsx` (~line 214) and `codexSupplement.js` (~line 47) have special cases that recognise that sentence, so it is treated as a real source.
* **Symptom class**: recipe/crafting data is presented as an acquisition source and sorted into the lead "Available source" slot; the actual acquisition route (drop, vendor, quest, bounty) is either missing for this item or pushed below the boilerplate. Whether Nunchasa Blueprint has a verified route in the wiki/DE data and the app dropped it, or has none at all, is NOT yet checked (must be checked against the DE drop tables / official wiki, never guessed).

## 91. Relics Missing (Axi A2 and Others), Wrong Rarity Labels, Relics Missing From Items' Drop Lists; #51 Still Wrong (Reported 2026-10-06 15:45-15:52, Build 15:27; Not Fixed, Cause Not Found)
* **Measured on the real data (read-only, nothing changed), data layer only**:
  * Owned relics: 88 raw `Projections` entries in `inventory.json` -> 87 owned rows in `parseInventory().relics` (refinements merged); 82 match the catalog, the other 5 are Requiem I-IV and Eterna, which `Relics.jsx` keeps by design.
  * `getRelicCatalog`: 790 relics (Lith 202, Meso 195, Neo 196, Axi 197). Axi A2 IS in it (vaulted, 6 rewards: Aklex Prime Link RARE, Aklex Prime Blueprint UNCOMMON, Lex Prime Blueprint UNCOMMON, Lex Prime Receiver COMMON, ...).
  * Drop index vs catalog: all 4,740 (relic, reward) pairs are present in `buildDropIndex` with the same rarity (0 missing, 0 wrong).
  * Same check through `getAcquisitionInfo` for all 595 reward items: 0 relic rows missing; 1 rarity difference (Forma Blueprint in Meso D1, a multi-rarity case: catalog COMMON, drawer UNCOMMON).
  * Repeated with `DropsAll` replaced by the converted DE drop tables (the path the app's worker takes since commit 94611d60): identical result.
* **Conclusion so far**: the data layer the harness can reach is consistent, so the defect is NOT in the relic data for Axi A2 as such. It lives in something the harness did not exercise: the rendered screens (Relics.jsx filters/merge, the drawers' row builders and caps, `prepareAcquisitionSources`, the shared Blueprint box from commit 5d0b5e4e), or the live app's loaded data differing from the files on disk (the Rust side, the worker, a stale cache).
* **Cause not fully proven**: the drawer's ingredient rows use `buildIngredientSourceRows(ingredient, dropIndex, getItemDrops(...))` with the recipe ingredient's component path. In my read-only harness that path returns 0 rows for Ash Prime (the app visibly gets rows), so the harness does not follow the app's exact path and I could not reproduce which data feeds the ingredient lists; the bundled fallback (`acquisitionData.js`) contains no "Vanguard" text at all (0 matches), which fits but is not proven. Scope likely every Prime warframe/weapon part that has a Vanguard relic, not only Ash Prime.

* **Decision**: the new model runs BESIDE the current row-building code until a whole-catalog check shows they match; nothing is replaced or deleted before that.
* **Design** (full text: the approved plan `~/.claude/plans/current-build-of-kiedas-merry-reddy.md`): (1) one pure function `buildItemAcquisition` returning routes, relics with tier, a separate `build` record (build recipe is never a route and never leads) and provenance per row; relic rows from one place for blueprint and ingredients alike; trust order DE data, then verified wiki routes, then bundled fallback. (2) `scripts/acquisition-model-compare.mjs`: every item compared between the model, the current drawers, the wiki audit facts and DE drop tables; difference classes with counts, lists written to a file. (3) Surfaces migrate one at a time (hover tooltip, Prime Sets card, ingredient lists, Blueprint box, Preview drawer, Farming Targets), each only after 0 unexplained differences, old path kept behind a switch until proven.
* **First test cases** (from this session): Ash Prime Chassis/Neuroptics/Systems must list Vanguard M1/P1/C1 as the wiki does; Nunchasa, Narin and the other 16 Foundry-boilerplate items must not lead with Foundry text; hover list must show every relic; Forma Blueprint in Meso D1 rarity must be settled against DE data; Relics screen sort must treat A2 before A19.
* **Status**: plan approved, nothing built. Next step is the model plus unit tests, then the comparison harness. Builds and deploys still need separate go-ahead.
* **"no acquisition in both" by category (2026-10-06 19:20, from the P57 report; the harness uses the same indexes as the drawers but may lack runtime-only data, so every count here is "no source found by this harness", NOT yet "no source in the app")**: 5,084 items: cosmetics 1,359 (out of scope by decision, item 86), resources 1,242 (names such as Kinemantik Hockey Table/KineBasik Bicycle look like decor, out of scope), mods 643 (e.g. Power Of Three, Cat's Eye, Mischief, Charm, Territorial Aggression), recipes 625 (e.g. fish bait, Moa, Jahu Gargoyle), keys 520 and regions 349 (test keys/nodes such as VANIA SURVIVAL TEST KEY: not items to obtain), arcanes 102, weapons 90, gear 79, relics 74, companions 1. To triage next: mods, arcanes, weapons, gear, relics (about 990 items that a player may actually want a route for). Also: `tests/farming/acquisitionText.test.mjs` passes 5/5 in the real tree (the worktree failure was only the missing git-ignored scratchwiki/).

* **Measured (read-only, real inventory)**: `parseInventory` produces exactly two relic rows with the code "Relics": "Lith Relics Relic" (path `.../T1VoidProjectionProteaIvaraVaultABronze`, 1 Intact) and "Neo Relics Relic" (`.../T3VoidProjectionProteaIvaraVaultABronze`, 2 Intact). The DE export names those two entries "Lith B12 Relic" and "Neo P11 Relic" (the newer ExportRelics schema: `{name, relicRewards}` with no `category` field, Protea/Ivara vault relics; Lith B12's rewards include Baza Prime Stock, Neo P11's include Protea Prime Chassis Blueprint). So the real relics exist and the code B12/P11 is in the export name, but the app derives the code "Relics". Likely cause is in `normalizeRelicEntry` (`src/lib/relicEntry.js`, category from the name) or the name the parser/harness passes in (a localized or rewritten name), NOT confirmed: my attempt to print `normalizeRelicEntry` on those entries was blocked by the permission classifier and I did not retry.
* **Scope guess to verify**: the two Protea/Ivara "Vault" relics seen here; the catalog earlier showed other Vault-named entries ("Axi A23 Relic", path `...ProteaIvaraVaultA...`), so unowned ones may have the same problem. Not checked.
