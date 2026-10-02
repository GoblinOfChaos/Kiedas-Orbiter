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

## 14. Farming Targets Surface Is Not Localized
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: With German selected, the Farming Targets home summary and screen remain English or mixed. This includes headings, counters, search placeholders, filter tabs, switches, buttons, target descriptions, and source labels.

### Required Resolution Protocol
- Trace all user-facing strings in the Farming Targets flow, including the home-screen summary component.
- Replace hard-coded or bypassed English strings with the shared localization system.
- Cover headings, counters, controls, filters, placeholders, buttons, target descriptions, source labels, empty states, and error states.
- Add a German localization regression check covering the full Farming Targets surface.
- Recheck the result in the deployed Preview AppImage.

---

## 15. Inventory Scroll Container Overscrolls Into Empty Space
* **Frequency**: Reported during live Preview verification on 2026-10-01.
* **User Symptom**: The Inventory scrollbar can scroll above or below the rendered inventory content into empty space. The last inventory row does not align with the effective bottom of the scrollable content.

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

## Summary of Standing Enforcement Rules
1. **Rule #1 (Zero Guesswork & Primary Sources Only)**: Only use official DE WorldState (`api.warframe.com`), DE PublicExport manifests (`content.warframe.com`), and official Warframe Wiki (`wiki.warframe.com`). Fandom wiki is strictly banned.
2. **Rule #2 (Hardware Protection)**: All Rust/Cargo build jobs MUST run with `CARGO_BUILD_JOBS=4` and `nice -n 19`.
3. **Rule #3 (Pre-Build Audits)**: `npm run audit` must execute and pass with 0 errors across all 19 screens and 6 overlays prior to any packaging.
