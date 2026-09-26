# Plan: Farming Targets + Foundry fixes and open items (Preview build)

Saved 2026-09-25. On approval this file is copied to `docs/plans/farming-and-foundry-fixes.md` in the Preview repo so Codex and Antigravity can read it. (The earlier "automated checks" plan is kept unchanged at the bottom of this file.)

## Context
The Farming Targets screen was built without checking it against how the app's other screens work or against the real Foundry. On the user's real data it showed missing blueprint rows, unresolved names, a blank Target Inspector, wrong filters and a Foundry that cannot confirm what Farming asks for. Fixes so far are built (commit 45dacd7, AppImage 19:04) but several layout and data problems remain, and Foundry is missing 1,045 of DE's 2,024 recipes, including the Narin part blueprints. Outcome wanted: Farming Targets that is correct and consistent with the rest of the app, and a Foundry that matches the in-game foundry.

## Rules for all work (from AGENTS.md and user)
- Preview build only. Never look at or mention Stable.
- Game data only from DE (WorldState, PublicExport) or wiki.warframe.com. No guessing, no screenshots as data sources. Fandom banned. The saved file `~/.local/share/kiedas-orbiter-preview/data/user/inventory.json` (not the Inventory screen) is the only source for what the user owns. The Inventory screen shows the full catalog with owned items marked, and what it displays is never used as evidence of ownership.
- Reuse existing code and patterns before writing new ones. Match other screens.
- Builds: `CARGO_BUILD_JOBS=4`, `nice -n 19`, in the `dev-fedora` distrobox, via `scripts/rebuild-appimage.sh`. State the plan and get a go-ahead before each build.
- Tell the user before using Codex or Antigravity, and why. Codex works in a `wt/<name>` worktree on an `agent/*` branch, cannot compile Rust or commit. Antigravity is told "TEXT ONLY, do not edit files" and its git diff is checked afterwards. The coordinator (Claude) runs `cargo test` and `node --test "tests/**/*.test.mjs"`, checks results on real data (`scripts/lib/real-data-harness.mjs`), commits and merges.
- Never push to `main`; no PRs unless asked. Report results plainly, including what could not be verified visually.
- Do not work on app slowness.

## Work items, easiest to hardest
Each item: what is wrong, the fix, and how it is checked.

### 1. Minimum-chance toggle moves when switched on (tiny)
- Cause: the shared `Toggle` in `src/components/UI.jsx` stretches to the width of its container; the "Hiding N drops" note appears when on, the row widens, the switch slides away from its label.
- Fix: put the toggle in its own content-width wrapper (`shrink-0`), as the other toggles in `src/screens/FarmingTargets.jsx` already are; number box and note sit to its right.
- Check: SSR render test for both states; user checks on screen.

### 2. Dropdown colour and existing blank-named targets (trivial, user step)
- The Target Inspector dropdown is already themed; the blank list was missing target names. The drawer now saves names (`PreviewAcquisitionDrawer.jsx`). The user removes and re-adds the three old Narin targets. After that, confirm the dropdown reads correctly; change styling only if it still looks wrong.

### 3. Filter row does not match other screens (small)
- Cause: built from scratch instead of reusing the Mods "Hide Conclave" pattern (`src/screens/Mods.jsx:312`) and other screens' filter rows.
- Fix: read Mods and one or two others, show the user what will be copied, then match. Tabs stay alone on one row (All, Missions, Enemies, Relics, Vendors, Conclave); other controls below.
- Check: render test; user visual check.

### 4. Inspector rows have no image (small)
- Cause: the blueprint rows added in `src/lib/farmingTargets/screenModel.js` have a name but no image.
- Fix: first check whether DE has an image for the component blueprint (ExportRecipes/ExportManifest); use it, else fall back to the part's image. Do not invent one.
- Check: real-data script shows an image for all three Narin blueprint rows.

### 5. Faction dropdown only has "All" (medium)
- Cause: no mission drop row carries a faction (0 of 34,749). DE's region export (`ExportRegions`) has `faction` per node (for example `FC_GRINEER`).
- Fix: in `sourcePlace`/`buildPreviewPlaceIndex`, look up each mission's node in `ExportRegions` and translate the code into a readable name using existing dict/locale helpers.
- Check: real-data script lists factions actually present; unit test with a fixture region.

### 6. Old open items that need no code (user or trivial)
- Delete old AppImage backups: user runs `! rm -v ~/AppImages/kiedas_orbiter_preview.appimage.bak-*` (the guard hook blocks me).
- Push `agent/data-watch-2` and the current `revamp/stage4-command-center` to `preview/stage4` when the user approves.
- Worktree cleanup; review GitHub issues #118 to #128 and close or update them.

### 7. Keys and quest items missing from Inventory (medium)
- Decide the bucket with the user, then add them in `src/lib/inventoryParser.js` and `src/screens/Inventory.jsx`. Data from DE exports only. Check on real inventory.

### 8. Foundry shows every recipe the in-game foundry can build (hard)
Rule from the user: whatever can be built in the game's foundry must be in the Foundry tab, sorted the way the game sorts it.
- Current state: DE has 2,024 recipes; Foundry lists 979; 1,045 are missing (434 under `Types/Recipes`, 269 skins, 135 `Types/Items`, 58 restoratives, 20 focus, 14 keys and small groups). The three Narin part blueprints are among them.
- Step A, research (read-only, Antigravity text-only plus me): work out how the game decides foundry categories. DE's recipe export has no category field; result items have `productCategory`. Sources: DE PublicExport and wiki.warframe.com only. Output: a written mapping of recipe to foundry tab, with the source for each rule and a list of anything unverified. Also count the 1,045 by flags (`hidden`, `excludeFromCodex`, `codexSecret`, `alwaysAvailable`) to see which may not be buildable in the game today.
- Step B, review: show the user the proposed mapping and the flagged items. No code before approval.
- Step C, build (Codex in a worktree): extend the Foundry builder in `src/lib/inventoryParser.js` and `src/screens/Foundry.jsx` (categories at `Foundry.jsx` around lines 48-100 and 298-360) so every recipe appears under its tab with materials, blueprint, owned state and how to get it. Reuse `buildRecipeResultIndex` and the existing card components.
- Check: on real data, all 2,024 recipes accounted for (shown, or listed as excluded with a reason); Narin Chassis, Systems and Neuroptics blueprints appear; Farming's blueprint rows can be matched to Foundry entries; item completeness matrix (`scripts/check-completeness.mjs`) stays green.

### 9. Parts with no drop source (hard, research)
- 384 parts have no drop rows. Research their sources from DE and the wiki, part by part, without bulk auto-classification. Output: list with sources or "unverified".

### 10. Remaining DE adoption (largest)
- Bundles and unpublished text strings, then the categories still on the community mirror. Each slice is gated by the completeness matrix (see the earlier plan below).

## Order of execution
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (A, B, then C) → 9 → 10. Items 1 to 5 go into one rebuild. Foundry gets its own rebuild after the user approves the mapping.

## Verification (every batch)
- `node --test "tests/**/*.test.mjs"` green (152 at last run) plus new tests for each item.
- Real-data scripts in the scratchpad (for example `farmfreeze.mjs`) rerun; results reported.
- Antigravity text-only review of the diff before merging; its own git diff checked afterwards.
- One AppImage rebuild per batch after the user says go; the build-mark check must pass; then the user opens the app to confirm anything visual.

---

