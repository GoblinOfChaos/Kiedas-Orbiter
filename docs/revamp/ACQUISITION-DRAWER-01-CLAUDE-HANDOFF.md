# Selected acquisition drawer: Option 01 — Recommended Route

## Decision and scope

The user selected **Option 01**. This is the visual target, not an invitation to choose between three designs again. Build a focused right-side acquisition drawer matching the selected mockup. Preserve the existing acquisition information and workflows. Do not substitute the current card grid inside a newly styled container.

This document specifies the implementation; it does not authorize edits/builds beyond the user's existing approval rules. Inspect the current checkout, present a short exact-file source plan, then obtain application implementation approval. Do not ask the user to decide component architecture or other routine technical details.

The working application checkout is `/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/`. It contains ongoing user work. Inspect status/diffs first, preserve unrelated changes, and confirm the running package is built from this checkout before claiming native validation.

Default implementation scope is Preview. Preserve stable behavior unless explicitly authorized otherwise. Do not redesign the underlying Inventory screen, navigation, other routes, or acquisition data pipeline as part of this change.

## Binding visual references

All reference files are under `/var/home/jedwards/kiedas-orbiter/.preview-work/acquisition-drawer-mockups/`:

- `screenshots/01-desktop.png` — 1440 × 900, authoritative desktop composition.
- `screenshots/01-compact.png` — 900 × 500, authoritative compact composition.
- `index.html` — choose option 01 to inspect interactive states and themes.
- `design.html?design=1` — standalone prototype.
- `style.css` — base drawer rules plus the compact media query; **exclude `.design2` and `.design3` rules**.
- `design.js` — reference markup/interaction only; **never use its fixture values as game data**.
- `asset-provenance.json` — existing local artwork and font provenance.

Review full-size screenshots, not just the contact sheet. The backdrop is illustrative context, not another screen to implement. No AI-generated art is allowed. Use legitimate existing item artwork, current image handling, Outfit fonts, and existing Lucide icons. Do not package the mockup directory or import its fixture data into the application.

The title “Recommended Route” is a design name, not permission to implement an efficiency recommendation algorithm. Mockup Rhino Prime rates, sources, quantities, and costs are demonstrative, not verified game facts.

## What the finished drawer looks like

A blue-black panel is attached to the right edge of the route workspace, below the global app header. The page behind it is dimmed, preserving collection context. A thin rule and restrained shadow separate the drawer from the page. Inside, a large selected-item header leads into one highlighted acquisition source, followed by expandable alternatives and a compact recipe checklist. The layout reads vertically; it is not a grid of equally prominent cards.

Use this exact order:

1. **Fixed top strip:** small map icon and “How to obtain” at left; close icon at right.
2. **Scrollable item hero:** category eyebrow when known, large item name, factual badges, short contextual description if available, contained item artwork at right.
3. **Where to start:** section heading and actual displayed source count.
4. **Featured source:** accent left edge; source type/context; prominent source/reward name; chance at upper right when meaningful; contextual badges; full explanatory text; actual provenance/caveat when available.
5. **Other acquisition sources:** collapsed by default, count visible; expand to readable rows with name/location and rate/context. Keep every applicable source reachable.
6. **Crafting requirements:** only when a real recipe exists. Compact component rows with quantity requirements and optional authoritative owned counts. Keep blueprint cost, build cost, build time, and rush cost distinct.
7. **Ingredient source details:** inline expansion within the same scroll container, using existing ingredient acquisition information. Avoid another scrolling card grid.
8. **Caveats/attribution:** where real data supports them.
9. **Fixed bottom strip:** primary “Open Warframe Wiki” or existing equivalent; secondary report-source action.

If only one source exists, omit the empty alternatives disclosure. If only a recipe exists, lead with the recipe rather than an empty source card. If no recipe exists, omit crafting entirely. Missing artwork gets a visible neutral item placeholder, not invented art or blank space.

## Geometry and styling contract

| Element | Desktop target | Compact target |
| --- | --- | --- |
| Drawer | 520px wide, route-height | 465px at 900px viewport; never wider than route workspace |
| Position | right: 0, top/bottom: 0 within route | same; full route width if needed |
| Top strip | approximately 58px, 24px side padding | approximately 48px, 18px side padding |
| Content padding | 24–25px | 18–20px |
| Hero | approximately 161–175px minimum, may grow | approximately 130px minimum, may grow |
| Hero image | 150 × 150px, object-fit contain | about 110 × 120px |
| Item heading | 28–30px, weight 600 | 24–25px, weight 600 |
| Section heading | 16px, weight 600 | same |
| Source heading | about 20px | 18–20px as space permits |
| Body | 13–14px | retain readable size |
| Supporting labels | 11–12px | do not shrink to force content to fit |
| Highlighted source | 1px border, 3px accent left edge, 8px radius, 18px padding | same hierarchy |
| Footer | about 67px; 14px vertical/23px horizontal padding | about 58px; may grow for translated labels |

These are reference proportions, not fixed heights that clip translations. Use flex column: top strip `flex-shrink: 0`, body `flex: 1; min-height: 0; overflow-y: auto`, footer `flex-shrink: 0`. The body is the **only drawer scroll region**. Its scrollbar must remain discoverable without hovering. Hero scrolls with the body. Keep both chrome and footer visible at 900 × 500. Scrolling to crafting below the fold is expected, not a failure.

Use the actual route bounds rather than hardcoding the prototype's 64px/52px global header heights. At smaller available widths, cap to 100% of the route. Let action labels wrap or stack if required; do not hide actions or introduce horizontal page scrolling.

Map colors to the existing semantic theme tokens. Reference appearance: canvas `#04060b`, panel `#0c101a`, raised region `#121c28`, accent `#75b5d0`, gold detail `#b99354`, text `#eff5fb`, muted text `#9aaabb`, rules `#263340`. These describe the screenshot; do not replace the user's theme with hardcoded colors. The hero uses only a subtle CSS accent wash, never a wallpaper. Use color plus text/icon for ownership and warning states.

## Interaction contract

Implement a modal right drawer for the new Preview presentation. Background content must be inert while open; trap focus, support Escape, and restore focus to the triggering item when closed. Provide at least a 40 × 40px close hit area, improving on the prototype's smaller target. Use a labelled dialog and native accessible buttons/disclosures.

Backdrop click may close the drawer; dragging the scrollbar or selecting text inside must not. Preserve the underlying route's filters, selected category, and scroll position. A programmatic item change while open must replace item content, reset obsolete disclosures/scroll, and prevent late enrichment results from the old item appearing in the new one.

Expand alternatives without changing the featured source or dropping context. Ingredient details expand inline; preserve the parent recipe and quantities. Do not invent a nested navigation system unless current ingredient data requires it and the source plan explicitly covers it.

When the existing report dialog opens, it becomes the active modal. Suspend the drawer's focus trap/Escape handler until that dialog closes; closing the report must not also close the drawer. Restore focus to the report trigger afterward.

Wiki/report actions must use their real existing integrations. Do not leave prototype notice/toast substitutes in production. Do not introduce crafting, market posting, reservations, or inventory mutation actions.

## Current source and recommended implementation boundaries

The following were checked on 2026-09-15; re-read current files because this checkout is active:

- `src/components/AcquisitionDrawer.jsx` exports `formatChance`, `getSourceLabel`, `useAcquisitionDrawer`, and the default component accepting `{ item, onClose, variant = 'drawer' }`.
- It performs source sorting, unconfirmed-text handling, asynchronous Codex enrichment, preservation of `baseInfo.wikiLink`, recipe rendering, Wiki opening, and the report modal.
- Existing recipe rendering includes `blueprintCost`, `buildCost`, `buildTime`, `rushCost`, and ingredient rows. All must survive the presentation change.
- `variant === 'panel'` currently selects an existing presentation. Trace **all** callers, including omitted/default variants, before changing how Preview selects the new right drawer.

Suggested source plan:

1. Keep the shared public component/hook API compatible; add only optional presentation data where genuinely needed.
2. Add `src/preview/acquisition/PreviewAcquisitionDrawer.jsx` for option 01 composition, modal lifecycle, and shell.
3. Add `src/preview/acquisition/preview-acquisition.css` for scoped styles using existing tokens. Avoid unscoped selectors like `.hero`, `.row`, or global `button` from the prototype.
4. Extract source/recipe presentation into local subcomponents only where useful. Do not create a second acquisition resolver.
5. Modify `AcquisitionDrawer.jsx` only enough to supply current resolved data/actions to the Preview composition and preserve the stable path. Keep hook order valid and avoid duplicate enrichment requests.
6. If hero artwork or owned counts are unavailable, identify exact caller/adapter changes in the source plan before adding them. Do not assume `item` already contains image URLs, item class, ownership, or readiness.
7. Add translation keys through the repository's current localization policy. Do not silently hardcode all new English strings.

Inspect `ItemImage.jsx`, `BugReporterModal.jsx`, `src/preview/styles/preview-tokens.css`, and current acquisition helper modules before integration. Image URLs must go through the correct existing URL/file handling path; a remote/custom-protocol URL is not a filesystem path to feed to `convertFileSrc`.

Treat `acquisitionInfo.js`, `acquisitionData.js`, and `codexSupplement.js` as read-only by default. If a missing capability requires backend/data-layer changes, report the specific need before expanding scope. No dependency or lockfile changes are expected.

## Data truthfulness rules

- Reuse existing source formatting, chance precision, and ordering. Do not interpret the first sorted source as the best farm.
- Default the featured-source caption to **“Available source”**. Only show “Highest listed chance” if compatible reward, rotation, and refinement context is actually established. No new recommendation math is required for this design.
- Distinguish the acquired object from the selected parent item: a blueprint or component reward is not a complete built Warframe.
- Keep mission/rotation, enemy, relic/refinement, vendor/currency, and free-text source context. Unknown source types retain their readable text.
- No drop rate means an absent/unknown rate, never `0%`. Preserve very small positive values through `formatChance`.
- Only show owned/required values when ownership is correctly resolved for that ingredient from actual player inventory. Crafted ownership and blueprint counts are not interchangeable. If unavailable, show required quantity alone and no missing/ready claim.
- Do not calculate acquisition efficiency, expected runs, cross-target shopping totals, or new reservation logic in this presentation task.
- Provenance must come from real resolver metadata. Do not display a green verification check just because the source rendered.

## Required states

| State | Visible result |
| --- | --- |
| Populated | featured source, all alternatives, actual recipe if present |
| Enrichment loading | retain useful known information; show local loading indication |
| No known source | explain that no source is recorded; keep Wiki/report available; never claim unobtainable |
| Vaulted | factual badge/caveat; do not equate vaulted with lookup failure |
| Unconfirmed | explicit warning beside the affected information |
| Fetch failure | failure distinct from empty data; only expose retry if a real retry path exists |
| Image loading/failure | visible loading/placeholder treatment; title and actions remain usable |
| Unknown ownership | required-only quantity or explicit unknown; no false zero-owned count |
| Recipe-only / source-only | coherent composition without empty cards or headings |

If the current enrichment API cannot distinguish failure from empty data, identify that limitation in the source plan rather than fabricate an error state. Visual fixture coverage does not establish live behavior.

## Implementation and validation order

1. Inspect the screenshots, current drawer, helpers, caller list, current git status, and any applicable local instructions. Capture the exact source boundaries and baseline.
2. Present a concise exact-file plan, including optional item-data additions and any behavior difference caused by moving default Preview callers to a modal right drawer.
3. After approval, implement option 01 using existing data/actions. Preserve unrelated source changes.
4. Validate deterministic component states and keyboard behavior, then compare full-size rendered screenshots against both selected references. Fixing geometry alone is not visual acceptance.
5. Validate real representative items using current exported/player data, clearly separating real data from synthetic layout stress fixtures.
6. Run the project's appropriate bounded checks/builds. All Rust builds use `CARGO_BUILD_JOBS=4` and `nice -n 19`. Reuse the existing bounded container tooling where applicable; preserve prior artifacts before rebuilding shared outputs.
7. Produce a report with exact changed files, real screenshots, test outcomes, and the artifact/package containing the change. Label untested items pending/blocked rather than passed.

### Acceptance checklist

- Desktop and compact screenshots visibly match option 01's composition, width, hero, accent-edged source, alternatives, recipe rows, and fixed footer.
- One vertical content scrollbar; scroll reaches the last ingredient/source; no horizontal page overflow at 900 × 500.
- Long names/translations and 20+ sources remain readable; no important information is hidden to make screenshots fit.
- A mod with several sources, craftable item, relic-sourced item, vendor cosmetic, vaulted item, recipe-only item, and no-source item all retain their available information.
- Source count/disclosure matches actual represented sources. All existing source types and chance precision survive.
- Recipe fields and ingredient quantities match existing resolved data. Owned counts, if present, match real inventory.
- Close, Escape, focus trap/restoration, backdrop behavior, report-dialog nesting, and rapid item changes work.
- Wiki URL and report item context match the selected item, including after asynchronous enrichment.
- Loading/unknown/unconfirmed/error/vaulted/image-failure distinctions are verified where the current data interface supports them.
- Existing themes work; semantic color changes do not alter layout. No generated artwork or mockup fixture data enters resources.
- Stable behavior remains unchanged unless separately authorized; each caller's intended Preview presentation is documented.
- Native proof identifies the actual rebuilt binary/package. A screenshot from static HTML is never reported as native implementation proof.

## Ready-to-paste instruction for Claude

> I selected acquisition drawer **Option 01 — Recommended Route**. Read `docs/revamp/ACQUISITION-DRAWER-01-CLAUDE-HANDOFF.md` and inspect the option 01 desktop/compact screenshots under `.preview-work/acquisition-drawer-mockups/screenshots/`. This is the required visual target: a right drawer with a large item header, one highlighted acquisition source, expandable alternatives, a compact recipe checklist, one visible scrollbar, and a fixed Wiki/report footer. Inspect the current checkout and all acquisition-drawer callers, then present the exact-file implementation plan for approval under our existing rules. Preserve acquisition logic, information, themes, and unrelated work. Do not use mockup game values or implement options 02/03. Handle routine technical choices yourself; flag only concrete scope changes or missing data that need approval.
