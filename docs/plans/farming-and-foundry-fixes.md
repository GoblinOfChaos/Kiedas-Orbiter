# Plan: Farming Targets + Foundry fixes and open items (Preview build)

## Context

- Preview build only. Never look at or mention Stable.
- Reuse existing code and patterns before writing new ones. Match other screens.
- Builds: `CARGO_BUILD_JOBS=4`, `nice -n 19`, in the `dev-fedora` distrobox, via `scripts/rebuild-appimage.sh`. State the plan and get a go-ahead before each build.
- Never push to `main`; no PRs unless asked. Report results plainly, including what could not be verified visually.
- Do not work on app slowness.

## Work items, easiest to hardest
Each item: what is wrong, the fix, and how it is checked.

### 1. Minimum-chance toggle moves when switched on (tiny)
- Cause: the shared `Toggle` in `src/components/UI.jsx` stretches to the width of its container; the "Hiding N drops" note appears when on, the row widens, the switch slides away from its label.
- Fix: put the toggle in its own content-width wrapper (`shrink-0`), as the other toggles in `src/screens/FarmingTargets.jsx` already are; number box and note sit to its right.

### 3. Filter row does not match other screens (small)
- Cause: built from scratch instead of reusing the Mods "Hide Conclave" pattern (`src/screens/Mods.jsx:312`) and other screens' filter rows.

### 4. Inspector rows have no image (small)
- Cause: the blueprint rows added in `src/lib/farmingTargets/screenModel.js` have a name but no image.
- Fix: first check whether DE has an image for the component blueprint (ExportRecipes/ExportManifest); use it, else fall back to the part's image. Do not invent one.
- Check: real-data script shows an image for all three Narin blueprint rows.

### 5. Faction dropdown only has "All" (medium)
- Cause: no mission drop row carries a faction (0 of 34,749). DE's region export (`ExportRegions`) has `faction` per node (for example `FC_GRINEER`).
- Fix: in `sourcePlace`/`buildPreviewPlaceIndex`, look up each mission's node in `ExportRegions` and translate the code into a readable name using existing dict/locale helpers.
- Check: real-data script lists factions actually present; unit test with a fixture region.

- Worktree cleanup; review GitHub issues #118 to #128 and close or update them.

### 7. Keys and quest items missing from Inventory (medium)

### 8. Foundry shows every recipe the in-game foundry can build (hard)
- Current state: DE has 2,024 recipes; Foundry lists 979; 1,045 are missing (434 under `Types/Recipes`, 269 skins, 135 `Types/Items`, 58 restoratives, 20 focus, 14 keys and small groups). The three Narin part blueprints are among them.
- Step A, research (read-only, Antigravity text-only plus me): work out how the game decides foundry categories. DE's recipe export has no category field; result items have `productCategory`. Sources: DE PublicExport and wiki.warframe.com only. Output: a written mapping of recipe to foundry tab, with the source for each rule and a list of anything unverified. Also count the 1,045 by flags (`hidden`, `excludeFromCodex`, `codexSecret`, `alwaysAvailable`) to see which may not be buildable in the game today.
- Check: on real data, all 2,024 recipes accounted for (shown, or listed as excluded with a reason); Narin Chassis, Systems and Neuroptics blueprints appear; Farming's blueprint rows can be matched to Foundry entries; item completeness matrix (`scripts/check-completeness.mjs`) stays green.

### 9. Parts with no drop source (hard, research)
- 384 parts have no drop rows. Research their sources from DE and the wiki, part by part, without bulk auto-classification. Output: list with sources or "unverified".

### 10. Remaining DE adoption (largest)
- Bundles and unpublished text strings, then the categories still on the community mirror. Each slice is gated by the completeness matrix (see the earlier plan below).

## Order of execution

## Verification (every batch)
- `node --test "tests/**/*.test.mjs"` green (152 at last run) plus new tests for each item.
- Real-data scripts in the scratchpad (for example `farmfreeze.mjs`) rerun; results reported.
- Antigravity text-only review of the diff before merging; its own git diff checked afterwards.

---

