# Stage 4B/4C — Direct-implementation progress status

This document now covers all screens touched during direct implementation (Codex unavailable, ~92%+ of weekly quota, resets 2026-09-13). Same verification method throughout: `vite build --mode preview` and `--mode development`, both must pass clean, plus manual code/diff review. No native build/screenshot evidence has been captured for any of this — noted per-screen below.

## Inventory (Stage 4B)

**Author:** Claude Code, taking over direct implementation per `STAGE-4A-HANDOFF.md` (Codex usage constrained until 2026-09-13). No native build/package pipeline was run for this work — verification was `vite build` in both `preview` and `development` mode (compiles clean, both pass) plus manual code review, not the full Debian/AppImage matrix prior stages used.

**Checkout:** `.preview-work/stage4-command-center/` (same checkout Stage 4A produced; nothing committed, matching the established "intentionally uncommitted cumulative" working model).

## Done and build-verified

All changes below are gated behind `IS_PREVIEW` unless noted, preserving Stable's exact prior markup/behavior — verified by rebuilding in both `--mode preview` and `--mode development`.

1. **Filter-uniformity fix** (`src/screens/Inventory.jsx`): `Mastered`/`Subsumed`/`Socketed`/`Prime`/`Vaulted` converted from a single button silently cycling off→yes→no→off (no visible indication a third state existed) to the same explicit three-button All/Yes/No pattern already used for `Owned`. `Primary`/`Secondary`/`Melee` and `Archwing`/`K-Drive`/`Necramech` converted from independently-combinable toggles (could select more than one simultaneously despite being mutually exclusive types) into one segmented control each. `Incarnon` (the one true independent boolean) restyled as a real checkbox. **Preview-only** — Stable keeps the exact original cycling-button code path unchanged (a duplicate branch was added rather than modifying the shared one, specifically so this didn't need to be bundled into a Stable-behavior-change approval).
2. **Header wrap fix**: the search/filter/sort row now wraps (`flex-wrap`) instead of squeezing the search input to near-zero width at narrow content widths. **Preview-only.**
3. **Category-strip scrollbar**: explicit `overflow-x-auto` + visible thin scrollbar on the category tab strip, replacing an effectively-invisible default browser scrollbar. **Preview-only** (Stable renders the bare `Tabs` element with no extra wrapping node, exactly as before).
4. **`PreviewInventoryLayout.jsx` simplified**: removed a positional-selector CSS hack (`div:nth-child(2)`, `@container` grid overrides reaching into `Inventory.jsx`'s internal markup by sibling index) that was retrofitting wrap/scroll behavior the markup now provides natively. Kept only the resource-stats row's intentional horizontal scroll.
5. **Right-side inspector**: `AcquisitionDrawer.jsx` gained an opt-in `variant="panel"` prop (right-side fixed panel, full-width overlay at narrow widths, single-column source list) alongside its unchanged default `variant="drawer"` (bottom-fixed bar). Inventory passes `variant={IS_PREVIEW ? 'panel' : 'drawer'}`. Verified the other 4 callers (`Rivens` via `RivenGradeDrawer` — actually a separate component, doesn't use `AcquisitionDrawer` — plus `Mods.jsx`, `Cosmetics.jsx`, `Relics.jsx`) all call without a `variant` prop, so they get byte-identical default behavior.
6. **Image states** (`src/components/ItemImage.jsx`): added real Loading (pulsing skeleton via `animate-pulse`), Available, Unavailable (no image URL ever known — a real data gap), and Error (URL existed but failed even after the one fallback retry — previously indistinguishable from Unavailable) states. **Applied universally, not `IS_PREVIEW`-gated** — this is a low-level component used by every screen with no existing Preview-awareness, gating it per call-site across the whole app isn't practical, and the change is strictly additive (same immediate placeholder for a missing image; a distinguishable one only for a genuine load failure, plus a non-jarring loading pulse). Flagging this explicitly since every other change in this pass was kept Preview-only.

## Update: both deferred pieces completed in a follow-up pass

1. **Persistent left category navigator** — done. `Inventory.jsx`'s main content was extracted into a `mainContent` variable (mechanical refactor, zero behavior change, rebuilt-verified before adding anything else), which unblocked a Preview-only `renderCategoryNavigator()` sidebar (`hidden lg:flex` — visible only at wide widths, matching the master plan's "persistent navigator on wide screens" rule) rendered alongside `PageLayout` rather than inside it. The horizontal tab strip remains as the compact/narrow-width selector, both driven by the same `activeTab` state.
2. **Grid/list view toggle** — done, scoped to what's safely generalizable. A `viewMode` state plus a Grid/List toggle control (Preview-only, hidden for Prime Parts/Ayatan which keep their bespoke layouts) switches the generic item branch (12 of 15 categories) between the existing wide Card layout and a new dense single-line list row reusing the exact same already-computed per-item fields (image, category label, name, rank, mastery/subsumed, quantity) — no new data logic, just a second rendering of existing values. Arcanes keeps rendering via the shared `ModCard` component in both view modes (not given a custom list row, to avoid touching that shared component).
3. Ayatan and Prime Parts tabs keep their existing bespoke layouts untouched (deliberately out of scope for both pieces above).

Both additions rebuilt clean in `--mode preview` and `--mode development` immediately after implementation.

## Verification performed

- `vite build --mode preview`: clean, no errors, both before and after each edit in this pass.
- `vite build --mode development` (Stable path): clean, no errors — run specifically after discovering and fixing a gating mistake (see below).
- Manual `grep`/read verification that the 4 other `AcquisitionDrawer` callers pass no `variant` prop.
- No native package/Debian/AppImage build was run. No screenshot comparison against the mockup was performed for this Inventory work (unlike Stage 4A's Dashboard, which had real desktop/compact screenshots) — this is a real gap relative to prior stages' evidence standard, disclosed rather than glossed over.

## One correction made mid-pass, worth recording

The first version of the filter-uniformity and header-wrap changes edited `renderHeaderPanel()` directly without gating them behind `IS_PREVIEW`, which would have leaked new markup/behavior into Stable — violating the byte-identical-Stable rule every prior stage (3A through 4A) held. Caught before reporting completion; both pieces were corrected to duplicate the original Stable code path explicitly rather than share a single unconditional render path. Rebuilt and reverified in both modes after the fix.

## Mods (Stage 4C)

Assessed first: `ownershipFilter` here was already a correct three-button pattern (no uniformity bug like Inventory had), and the categories row already used `flex-wrap` in its own JSX. Real gap found on closer inspection, not from the JSX alone:

1. **`PreviewModsLayout.jsx` was actively regressive**, not just brittle. Its injected CSS forced the categories/sort/filter rows into `flex-wrap: nowrap` + horizontal scroll via attribute selectors (`[data-preview-mods-categories] { flex-wrap: nowrap; overflow-x: auto; }`), directly fighting the JSX's own `flex-wrap` class. Preview was scrolling horizontally where Stable simply wrapped — a real regression, not a missing feature. Replaced with a plain pass-through wrapper, same treatment as Inventory's `PreviewInventoryLayout.jsx`.
2. **Category sidebar** — added, same `hidden lg:flex` pattern as Inventory's `renderCategoryNavigator()`. The existing horizontal categories row is now `lg:hidden`, remaining as the compact-width selector.
3. **Grid/list toggle** — added. List mode shows name, polarity, rank/max_rank, owned+quantity, and resolved plat value in one row per mod — reusing already-available fields (`mod.polarity`, `mod.rank`, `mod.max_rank`, `mod.owned`, `mod.quantity`, `modPrices[...]`), no new calculations. `ModCard` itself untouched; list mode is a separate row renderer, not a ModCard variant.

All Preview-only, gated the same way as Inventory (Stable's `renderHeaderPanel()`/grid rendering path unchanged for non-list-mode, non-sidebar cases). Both build modes verified clean after each change.

**Not done for Mods**: no visual confirmation (same caveat as Inventory — compiles clean, never rendered/screenshotted in this pass).

## Cosmetics (Stage 4C)

Same regressive-CSS-hack pattern as Mods, found in `PreviewCosmeticsLayout.jsx`: `.preview-cosmetics-kind-tabs { flex-wrap: nowrap; overflow-x: auto; }` was forcing the 15-kind category Tabs strip into a horizontal-scroll rail — precisely the defect the master plan names for this screen ("category controls may wrap or move into a menu, but may not become a hidden horizontal rail"). Third occurrence of this same anti-pattern across three screens now (Inventory, Mods, Cosmetics) - worth checking the remaining screens for it too before assuming any given `PreviewXLayout.jsx` file is harmless boilerplate.

Fix: simplified `PreviewCosmeticsLayout.jsx` to a plain pass-through (same treatment as the other two), added a category sidebar for the 15 kinds (no icons needed here, plain text labels, simpler than Inventory/Mods), kept the existing Tabs strip as the `lg:hidden` compact-width fallback. No grid/list toggle added — the master plan doesn't call for one on this screen, just large catalog cards.

## Collectibles — not started, and why

Checked before starting: `Collectibles.jsx` (478 lines) has **zero** existing `IS_PREVIEW` references and no `PreviewCollectiblesLayout.jsx` file — unlike Inventory/Mods/Cosmetics, it never received any Stage 3 treatment at all. Applying the sidebar+list-view pattern here would mean building the Preview scaffolding from scratch on an unfamiliar screen, not extending already-established groundwork. Given that's a meaningfully different (bigger, less precedented) task than what the last three screens needed, stopping here rather than starting it without a checkpoint.

## Session stopping point

Three screens (Inventory, Mods, Cosmetics) got real fixes this pass, all build-verified in both Stable and Preview modes, none visually confirmed (no native build/screenshot taken - see per-screen notes above). Notably, the same regressive CSS anti-pattern (`flex-wrap: nowrap` + forced horizontal scroll fighting the JSX's own wrap classes) was found and fixed in all three `PreviewXLayout.jsx` transitional files - worth checking any remaining ones (`PreviewMasteryLayout`, `PreviewMapsLayout`, `PreviewMarketLayout`, `PreviewRelicPlannerLayout`, `PreviewRelicsLayout`, `PreviewRivensLayout`, `PreviewSettingsLayout`) for the same issue before assuming they're fine.

Mastery was reviewed and found to already be in good shape from prior Stage 3C work - no changes made there this pass.

**Follow-up check performed**: grepped every remaining `PreviewXLayout.jsx` for the same `nowrap` pattern. `PreviewMasteryLayout.jsx` and `PreviewSettingsLayout.jsx` are clean (0 matches). Five more have it and have **not** been reviewed or fixed yet: `PreviewMapsLayout.jsx` (1), `PreviewMarketLayout.jsx` (1), `PreviewRelicPlannerLayout.jsx` (1), `PreviewRelicsLayout.jsx` (2), `PreviewRivensLayout.jsx` (1). Do not blanket-fix these - `nowrap` + scroll is sometimes the *correct* choice (e.g. a genuinely long single-row table or toolbar that should scroll rather than wrap), not automatically a regression like the three cases fixed this pass. Each needs the same per-screen diagnosis: read the screen's actual JSX to see whether it already wraps on its own (making the CSS override a fighting regression, as in Inventory/Mods/Cosmetics) or whether the screen's JSX has no wrap behavior of its own and the forced scroll is the deliberate, correct design for that specific row.

## Suggested next steps

1. Extract `Inventory.jsx`'s main content JSX into a `mainContent` variable as its own small, low-risk refactor (no behavior change), which unblocks the category-navigator sidebar cleanly.
2. Scope the list-view work category-by-category rather than attempting all 15 at once, starting with the categories sharing the most similar fields.
3. When a real build/screenshot pipeline is available again (Codex resumes 2026-09-13, or a native build is run manually), get actual visual confirmation of everything in this document — none of it has been seen rendered, only compiled.

## Round 2: real-device QA pass (2026-09-06 overnight) — Inventory fully fixed and visually confirmed

User did hands-on QA against a native Preview build (screenshots + written report) and found several real regressions the compile-only verification above had missed entirely. Per explicit process rule ("one page at a time — check for everything on a page before moving to another"), all of the below is scoped to Inventory only; Mods/Cosmetics fixes from the prior pass are still visually unconfirmed.

**Bugs found and fixed, each verified against the running native binary (not just a clean build):**

1. **Triple-filter labels wrong** — `Mastered`/`Prime`/etc.'s "no" state was reusing the same `NEG_LABELS` object as the old cycling-button code, which produced duplicated/wrong text (e.g. "ALL MASTERED MASTERED" instead of "ALL MASTERED UNMASTERED"). Fixed by adding a separate `TRIPLE_NEG_LABELS` map with correct distinct per-filter labels for the new three-button rendering, leaving `NEG_LABELS` and the Stable cycling-button path untouched. **Confirmed**: Owned/Mastered/Prime all now show correct distinct labels in the running app.
2. **Incarnon checkbox showed no checkmark** — the checked-state visual was missing/invisible. Fixed the checkbox span markup to swap fill/border color and render a `Check` icon when state is `'yes'`. **Confirmed**: clicking Incarnon now shows a filled checkbox with a visible checkmark and correctly filters to Incarnon-capable weapons (42/42 on Melee).
3. **Category tabs stayed visible at wide widths alongside the new sidebar** (duplicate navigation) — the horizontal tab strip wrapper was missing `lg:hidden`. Fixed. **Confirmed**: tabs are hidden at wide widths, sidebar is the sole navigator; tabs correctly reappear when the window is narrowed below the `lg` breakpoint.
4. **Item detail panel overlapped the global header** — `AcquisitionDrawer`'s `variant="panel"` root used `position: fixed`, which is viewport-relative and ignored the header's height; also `.preview-route-viewport` had no `position: relative` for the panel to anchor against as an ancestor. Fixed by switching the panel root to `position: absolute` and adding `position: relative` to `.preview-route-viewport`. **Confirmed**: panel now opens correctly below the header, title and CLOSE button both visible and clickable; closing restores the grid without side effects; state (active filters/tab) is preserved across open/close.

**Additional checks performed this round (no bug found):**

- Sidebar category click correctly resets filters/sort — re-checked the code directly; this was never actually broken (self-corrected from an earlier, wrong initial triage note).
- "Merged sidebar/content" appearance — was a screenshot-resolution artifact from viewing a scaled-down full-desktop capture, not a real rendering bug. Confirmed clean separation once screenshots were cropped to the actual app window's native pixel bounds.
- Narrow-window responsive behavior (~1000px) — sidebar hides, main nav collapses to icon rail, horizontal category tabs and search field reappear and render correctly. Search field does not oversize at this width.
- Very narrow width (~750px) — filter/tab rows overflow the right edge (scrollable, no wrap). Not a reported regression and an extreme width; noted but not treated as a blocking bug.

**Not yet investigated** (deferred, lower priority per user, not blocking "Inventory done"): "Peely Pix says no acquisition info" — likely a pre-existing data gap rather than a Stage 4 regression, not yet confirmed either way.

**Verification method for this round**: native Preview binary built via the podman/tauri-CLI recipe (frontend via `vite build --mode preview`, `tauri build` CLI inside a container with host Rust/Node/Cargo-cache mounts, base `tauri.conf.json`'s `devUrl` temporarily stripped and restored around the build), launched on the real desktop, driven via `xdotool` clicks/window resize, verified via `spectacle` screenshots cropped to the exact app-window pixel bounds (`xdotool getwindowgeometry` + `convert -crop`) rather than full-desktop captures. This is a materially stronger verification standard than the compile-only checks in the rest of this document, and it is the standard that actually caught real bugs — worth applying to every remaining screen before calling any of them done.

**Inventory is now considered fully fixed and confirmed** for everything in the user's QA report except the Peely Pix acquisition-info item. Per the one-page-at-a-time rule, next up is Dashboard (Nightwave card layout, already root-caused: `renderNightwave()` assumes full page width and breaks in Stage 4A's narrower "Live activities" column).
