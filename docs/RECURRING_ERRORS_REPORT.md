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

## Summary of Standing Enforcement Rules
1. **Rule #1 (Zero Guesswork & Primary Sources Only)**: Only use official DE WorldState (`api.warframe.com`), DE PublicExport manifests (`content.warframe.com`), and official Warframe Wiki (`wiki.warframe.com`). Fandom wiki is strictly banned.
2. **Rule #2 (Hardware Protection)**: All Rust/Cargo build jobs MUST run with `CARGO_BUILD_JOBS=4` and `nice -n 19`.
3. **Rule #3 (Pre-Build Audits)**: `npm run audit` must execute and pass with 0 errors across all 19 screens and 6 overlays prior to any packaging.
