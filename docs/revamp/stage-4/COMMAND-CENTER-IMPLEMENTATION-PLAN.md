# Stage 4 — Command-Center Production Implementation Plan

**Status: PROPOSED — PLAN ONLY**  
**Target: Kieda's Orbiter Preview on Linux**  
**Visual contract:** `.preview-work/mockup-suite/` second pass plus the approved original Farming Targets / Combined Shopping List concept  
**Application baseline:** accepted Stage 2 isolation plus accepted Stage 3A–3K cumulative implementation  

**Revision note, 2026-09-06:** Farming Targets is now an explicit 21st route and Stage 4C capability. This revision closes the omission identified during plan review and connects Dashboard, combined shopping-list aggregation, reservations, and reminders to one persistent source of truth.

This document defines how the approved command-center mockups become the real Kieda's Orbiter interface. It does not authorize application edits, builds, installation, publication, or replacement of Stable. Implementation begins only after explicit approval of the relevant source slice.

The end product is the application shown in the approved second-pass mockups: a calm, image-led Warframe command center with large readable surfaces, clear task grouping, consistent filters, a dependable compact layout, visible error and image states, and one obvious scrolling path. Every existing feature remains available. The work changes presentation and navigation while preserving the current parsers, formulas, storage, native commands, marketplace safety boundaries, monitoring behavior, and profile isolation.

## 1. Final product goal

The completed application should feel like one coherent product rather than a collection of separately evolved tools. It will contain the 20 existing routes plus a new, distinct Farming Targets route. A user opening any page should immediately understand four things:

1. Where they are in the application.
2. What information currently needs attention.
3. What the primary action on the page is.
4. Where additional details will appear after selecting an item.

At desktop sizes, the interface should provide enough information for planning and comparison without feeling crowded. At the supported 900x500 compact size, the same tasks should remain possible without clipped controls, invisible horizontal rails, overlapping panels, or missing actions.

The redesign is complete when:

- All 20 existing routes and the new Farming Targets route use the approved command-center visual system.
- Dashboard's tracked-target summary is backed by the real Farming Targets store and aggregation engine.
- All existing user workflows have an explicit destination.
- The live application matches the approved screenshots closely enough to be visually recognizable as the same design.
- Stable remains unchanged throughout Preview development.
- Preview remains profile-isolated and unable to own live integrations or mutate marketplace orders.
- The new UI can eventually be promoted to Stable without maintaining two permanent copies of business logic.
- No AI-generated artwork is added to the application or its resources.

## 2. Binding references and precedence

Implementation decisions should use the following order of authority:

1. User-approved behavior and visual decisions.
2. This Stage 4 plan.
3. The second-pass mockup gallery and its desktop/compact screenshots.
4. The Stage 1 feature inventory and surface register.
5. Accepted Stage 2 and Stage 3 behavior-preservation records.
6. Current application source and real runtime evidence.

The mockups define layout, hierarchy, spacing, and control vocabulary. They do not define game facts, formulas, item identity, marketplace behavior, or storage formats. Synthetic mockup values must never be copied into production logic.

The current second-pass gallery contains the 20 existing routes. Before Farming Targets application source begins, the gallery must be extended with a 21st route using the approved original Combined Shopping List concept. It needs desktop and compact screenshots, target-list and shopping-list states, and updates to the gallery manifest and contact sheet. That amendment completes the visual contract; it does not defer the capability or reduce it to Relic Planner styling.

The first mockup suite is rejected and remains evidence only at `.preview-work/mockup-suite-rejected-v1/`. It must not be used as a production reference.

### 2.1 Farming Targets scope correction

Farming Targets, its combined shopping list, reservations, and reminders are included in Stage 4 as a committed end-state requirement. They are not deferred polish and are not satisfied by restyling Relic Planner. This explicitly carries forward the connected-planning work described by the earlier six-stage direction and the approved third mockup.

Relic Planner remains one of the 20 existing routes. Farming Targets becomes route 21. The two may exchange selected item identities through explicit user actions, but they do not share temporary selection state or silently convert one workflow into the other.

## 3. Decisions already made

No additional technical choices are required from the user before preparing the first implementation slice. The plan adopts these defaults:

- Continue in the existing repository and existing Preview product profile.
- Create a fresh isolated Stage 4 working checkout rather than modifying the accepted Stage 3 checkout in place.
- Keep Stable's rendered UI and behavior unchanged during Preview development.
- Build reusable Preview presentation components around existing application logic.
- Use semantic design tokens for all themes.
- Use Lucide for interface icons and the current application image pipeline for Warframe imagery.
- Use segmented controls for mutually exclusive choices.
- Use checkboxes or switches only for independently combinable or true on/off settings.
- Use a persistent inspector on wide screens and an overlay drawer on compact screens.
- Use a single page-level vertical scroll owner, with explicit exceptions for maps, tables, webviews, and editors.
- Treat 1440x900 and 900x500 as required visual targets rather than occasional smoke sizes.
- Implement the main application before redesigning overlays.
- Promote the new UI to Stable only after the full Preview release candidate is accepted.
- Add Farming Targets as its own Planning route. Keep Relic Planner focused on relic rewards.

## 4. Worktree and baseline strategy

Stage 4 should begin in:

```text
.preview-work/stage4-command-center/
```

The checkout should be reconstructed from the original baseline plus the accepted cumulative Stage 2 and Stage 3 patches. This is preferable to continuing indefinitely in the existing dirty Stage 2 checkout because it provides a clean audit boundary.

The baseline procedure should:

1. Record the original repository commit.
2. Record SHA-256 hashes for the accepted Stage 2 and Stage 3 cumulative patches.
3. Apply those patches to the fresh checkout using native Git patch output.
4. Compare all resulting application files against `.preview-work/stage2/`.
5. Record differences and stop if the two accepted states do not match.
6. Keep the accepted Stage 3 checkout and packages unchanged as rollback evidence.
7. Exclude all build output, user profiles, fixture data, and screenshots from source patches.

Every Stage 4 slice should produce an incremental patch and a cumulative patch generated with `git diff`. Custom handwritten patch construction should not be used.

## 5. Production architecture

### 5.1 Separation of logic and presentation

The existing screens combine data loading, calculations, command invocation, and rendering to different degrees. Stage 4 should avoid duplicating those operations in new components.

Each migrated screen should be divided conceptually into:

```text
Existing data sources and hooks
              ↓
Existing calculations and event handlers
              ↓
Small screen view-model adapter
              ↓
Command-center presentation component
```

The adapter should translate existing state into presentation-friendly fields such as labels, counts, image states, badges, progress, and available actions. It must not recalculate mastery, pricing, reward value, ownership, crafting readiness, acquisition, or market eligibility.

This structure has three maintenance advantages:

- Upstream data-format corrections stay in one parser or adapter.
- Stable and Preview can exercise the same business logic during the migration.
- Presentation tests can use synthetic view models without shipping a fake-data mode in the application.

### 5.2 Proposed source organization

The exact filenames may change during source planning, but the intended boundaries are:

```text
src/preview/
  shell/
    PreviewAppShell.jsx
    PreviewNavigation.jsx
    PreviewGlobalHeader.jsx
    PreviewStatusSummary.jsx
    PreviewPage.jsx

  components/
    PreviewButton.jsx
    PreviewPanel.jsx
    PreviewSearch.jsx
    PreviewSegmentedControl.jsx
    PreviewFilterBar.jsx
    PreviewFilterChips.jsx
    PreviewCategoryNavigator.jsx
    PreviewViewSelector.jsx
    PreviewInspector.jsx
    PreviewDrawer.jsx
    PreviewDataTable.jsx
    PreviewItemImage.jsx
    PreviewEmptyState.jsx
    PreviewLoadingState.jsx
    PreviewErrorState.jsx
    PreviewDialog.jsx
    PreviewProgress.jsx
    PreviewBadge.jsx

  layouts/
    PreviewCatalogLayout.jsx
    PreviewSplitWorkspace.jsx
    PreviewEditorWorkspace.jsx
    PreviewCanvasWorkspace.jsx

  view-models/
    dashboardViewModel.js
    inventoryViewModel.js
    farmingTargetsViewModel.js
    ...one adapter per migrated route...

  styles/
    preview-tokens.css
    preview-shell.css
    preview-components.css
    preview-responsive.css
```

Shared components may be consolidated when that genuinely reduces complexity. The goal is a clear ownership boundary, not a large number of tiny files.

### 5.3 Preview gating

During implementation, `IS_PREVIEW` remains the product boundary. Stable should continue through its existing render path. Preview receives the new shell and migrated presentation components.

The stable pass-through must remain explicit and testable. A migrated screen should not make Stable render a hidden wrapper, new attributes, changed tab order, different disabled state, or new default state unless a separate stable correction is approved.

After the entire Preview is accepted, a later promotion milestone may make the command-center UI the common layout for both products. At that point, build profiles should control only identity, profile root, updater channel, and live capabilities. The interface should no longer need two permanent implementations.

## 6. Shared visual system

### 6.1 Color and depth

The visual system should use semantic roles rather than page-specific color literals:

- Canvas: near-black navy application background.
- Raised surface: dark slate cards and workspaces.
- Selected surface: deeper cyan-tinted slate.
- Primary text: warm white.
- Secondary text: cool desaturated gray.
- Accent: bright cyan for navigation, progress, focus, and primary actions.
- Detail accent: restrained gold for Prime, reward, and completion details.
- Positive: green for confirmed ownership or success.
- Warning: amber for attention or incomplete requirements.
- Destructive: red for deletion, failure, or unsafe action.
- Preview: violet or cyan-violet for isolated-channel notices.

Cards should be distinguished through subtle borders, background depth, and limited shadow. The design should not depend on glowing every interactive element.

### 6.2 Typography

Typography should follow the approved mockups:

- Page identity: 26–34px depending on available width.
- Major workspace section: 18–22px.
- Card title: 14–18px.
- Normal body text: 12–14px.
- Supporting metadata: 10–12px.
- Eyebrows and labels: small uppercase text with spacing, used sparingly.

The compact layout may reduce headings slightly, but normal controls and body text should remain readable. Shrinking everything to fit 900x500 is not acceptable; the page should reorganize and scroll vertically instead.

### 6.3 Spacing

The design should use a small spacing scale shared by every route. A likely scale is 4, 8, 12, 16, 20, 24, and 32px. Components should consume named spacing tokens. Screen-specific arbitrary margins should be rare.

Large surfaces should have enough interior padding to keep titles, artwork, and actions visually separate. Dense tables may use tighter row spacing because comparison is their purpose.

### 6.4 Buttons and actions

Four action levels should be visually distinct:

1. Primary: one main page or workflow action.
2. Secondary: normal bounded action.
3. Quiet: toolbar or inline action.
4. Destructive: delete, purge, close, or irreversible external mutation.

Disabled actions must retain readable labels and expose why they are disabled. Preview safety restrictions should not rely on low opacity alone.

### 6.5 Filter vocabulary

Every screen should use the same interaction rules:

- Mutually exclusive state: segmented control or select menu.
- Independent condition: checkbox.
- Binary application preference: switch.
- Sort: labeled field plus visible direction.
- Active filters: removable chips and Clear all.
- Categories: persistent category navigator on wide screens; labeled menu or drawer on compact screens.

Examples:

```text
All | Owned | Unowned
All | Mastered | Unmastered
Grid | List
```

The current mixed pattern where some controls are separate buttons and others secretly cycle through states must be removed from the Preview UI.

### 6.6 Focus and keyboard behavior

Every interactive card must be a real button, link, input, or correctly implemented composite control. Focus rings should be high-contrast and visually consistent.

Required keyboard behaviors include:

- Tab reaches all visible actions in visual order.
- Enter and Space activate cards and segmented options where appropriate.
- Escape closes drawers and dialogs and restores focus to the opener.
- Arrow-key behavior follows platform conventions for menus, tabs, and segmented controls.
- Disabled Preview actions cannot be invoked from the keyboard.

## 7. Application shell

### 7.1 Expanded navigation

At desktop width, the application uses an approximately 236–250px grouped sidebar. It contains:

- Kieda's Orbiter identity.
- Preview channel indicator.
- The existing six navigation groups.
- All 20 existing routes plus Farming Targets exactly once.
- Strong active-page treatment.
- User/profile identity at the bottom.

The navigation itself may scroll vertically when window height requires it. Its scrollbar should be visible when scrolling is possible. It should never force the content page to become wider.

### 7.2 Compact navigation

At narrower content widths, the sidebar becomes an approximately 72px icon rail. Labels remain available through accessible names and tooltips. A menu action opens the full grouped navigation as a drawer.

The compact rail must not remove routes or reorder them. Opening and closing the drawer should preserve the selected route and return focus correctly.

### 7.3 Global header

The top header contains:

- Menu/drawer action when required.
- Large global search.
- Compact, real status indicators.
- Current build/profile label.
- Overflow menu for infrequent shell actions.

Only real application states may appear. The production header may show inventory synchronization, game monitoring, WFM connectivity, notification/overlay ownership, and profile identity. It must not copy the synthetic `Data up to date` state from the mockup as a hard-coded claim.

### 7.4 Page header

Every ordinary route receives a consistent page header containing:

- Navigation group eyebrow.
- Page title.
- One-line current status or summary.
- Primary and secondary actions.

Specialized full-canvas routes such as Maps, Wiki, and Notes may use a more compact header integrated into their workspace.

### 7.5 Scrolling contract

The shell contains one primary vertical scroll region for the current route. Horizontal page scrolling is prohibited.

Allowed internal scroll regions are:

- A data table whose columns require comparison.
- A map canvas.
- An embedded webview.
- An editor or preview pane.
- A bounded drawer or dialog.
- Long navigation at short window heights.

Every allowed region must have an obvious boundary and visible scrollbar or controls. Primary filters and categories may not depend on a hover-only scrollbar.

## 8. Image system

Production should continue using the existing item-image resolver and cache. The mockup's copied assets are reference artifacts and should not be imported wholesale into the application.

`PreviewItemImage` should expose four explicit states:

1. Loading: fixed-size skeleton retaining layout.
2. Available: image with correct aspect fit and stable bounds.
3. Unavailable: visible icon and `Image unavailable` explanation.
4. Error: visible retry or diagnostic state where retry is meaningful.

Images must never overlap titles or controls. Failed loads must never collapse into invisible blank space. Every decorative image should have empty alternative text; meaningful item images should use the item name.

An asset provenance check should inspect newly bundled raster files. Any new app resource must point to an existing approved local source or a verified Digital Extremes source. AI-generated images, generated approximations of Warframe art, and unverified external image downloads are prohibited.

## 9. Screen outcomes

Each screen below describes the required final appearance and function. Existing behavior not explicitly mentioned remains preserved according to the Stage 1 feature inventory.

### 9.1 Dashboard

**End goal:** Opening the application should answer “What should I do next?” rather than presenting an undifferentiated grid.

The top-left area uses the large `Your next adventure` heading and three substantial summary cards for tracked targets, craft readiness, and new activity. The tracked-target count and the broad, image-led target rows must read from the generalized Farming Targets capability defined in section 9.8. They must not count Relic Planner selections, copy mockup fixture values, or maintain a second Dashboard-only target list. Each target row shows real completion derived from the shared target view model and opens either the target detail or the consolidated shopping list.

A right-hand column presents live activities such as fissures, Baro Ki'Teer, and Nightwave using recognizable imagery and short status summaries. Session changes and Foundry-ready items follow underneath.

All existing Dashboard surfaces, customization controls, calendar behavior, refresh actions, timers, dialogs, hidden-card settings, and 19 current card sources remain reachable. Less urgent cards may live behind customization or a secondary `All activities` view, but they may not disappear.

At compact size, the page becomes a prioritized single-column feed. The most urgent status and tracked plan remain first. The user scrolls vertically for live activities and session details.

Before Farming Targets is implemented, the Stage 4A Dashboard must show a truthful zero-target empty state with an `Add a farming target` action. Stage 4C connects that action and summary to the persistent target store. No temporary synthetic target count may ship in Preview.

### 9.2 Inventory

**End goal:** Inventory becomes a visual collection browser with a dependable detail workspace.

The left/main region contains page identity, total count, persistent search, explicit ownership/mastery filters, category navigation, sort, and view selection. Grid mode uses large two-column cards at wide sizes. List mode provides faster comparison for large collections.

Selecting an item opens a large right inspector containing artwork, ownership, mastery, quantities, crafting requirements, reserved components, acquisition sources, and applicable value information. The inspector becomes an overlay drawer at compact width.

All 15 current categories remain. Prime Sets, Ayatan, Arcanes, resources, equipment, and other specialized results retain their data-specific fields. Dormant Inventory marketplace code remains unreachable unless separately reviewed and approved.

This migration must eliminate the horizontal category strip, invisible scrollbar, secondary unexplained bar, clipped search controls, and secret click-to-cycle mastery behavior reported during live review.

### 9.3 Mastery

**End goal:** Mastery reads as progress toward the next meaningful achievement.

The page begins with a compact rank hero showing current rank, accumulated XP, next threshold, and readiness. The 24 existing completion rows become readable progress tiles or rows. Railjack Intrinsics, Drifter Intrinsics, Star Chart, and Steel Path remain visibly distinct.

Selecting a category opens the shared inspector with completed, remaining, and XP contribution details. Summary categories continue to be excluded from total-XP aggregation exactly as they are today.

### 9.4 Mods

**End goal:** Mods supports both recognizable browsing and rapid numerical comparison.

The category navigator replaces the long horizontal rail. Search, ownership, rank, Conclave, and sorting use shared controls. Grid mode retains recognizable mod-card presentation. List mode aligns name, polarity, rank, owned count, and value for comparison.

The acquisition drawer becomes the shared inspector/drawer. Existing price badges remain visible only for positive resolved values. No marketplace mutation path is introduced.

### 9.5 Cosmetics

**End goal:** Cosmetics becomes a stable visual catalog that always scrolls and always explains missing artwork.

The page keeps search, category, ownership, and sorting visible at the top. Large catalog cards display artwork, name, ownership, and equipped state. Selection opens acquisition information in the shared inspector.

There must be one working vertical page scrollbar. Load-more and pagination controls must remain reachable after large result sets. Category controls may wrap or move into a menu, but may not become a hidden horizontal rail.

### 9.6 Collectibles

**End goal:** The user can understand collection completion by family and locate the next missing entry.

A collection-family navigator occupies the left side on desktop. The main region shows overall and family progress, followed by known, found, missing, and unknown entries with clearly different presentation. Selecting an entry reveals location and acquisition details.

The compact layout replaces the family rail with a labeled selector and moves details into a drawer.

### 9.7 Foundry

**End goal:** Foundry answers what can be crafted, what is missing, and what should be farmed.

The desktop workspace is split between a recipe browser and a recipe detail panel. Recipe rows show blueprint ownership, crafted count, readiness, and missing-component status. The selected recipe displays exact required components, owned and needed quantities, credits, time, and an action to add missing parts to the planner.

Craftable and ready conditions remain independent checkboxes. Ownership and mastery remain explicit segmented choices. The canonical EW/EWf/ES identity and existing crafting logic remain authoritative. Consumables remain excluded according to existing behavior.

Compact mode presents the recipe list first and opens details in a full-height drawer. The result should remain a recipe workflow rather than an image catalog.

### 9.8 Farming Targets

**End goal:** Farming Targets is a generalized, persistent planning workspace where the user can track any recognized item and see one consolidated shopping list across every target.

This is a new route with route ID `farming-targets`, navigation label `Farming Targets`, and group `Planning`. It is separate from Relic Planner. Relic Planner answers which relics best cover selected relic rewards; Farming Targets answers what the user is trying to obtain or build across the entire game and what combined requirements remain.

The wide-screen layout follows the approved third concept:

- A page summary showing active targets, completed targets, unresolved requirements, and optional due reminders.
- Large target cards with item artwork, desired quantity, owned quantity, progress, status, and the next useful action.
- A consolidated shopping-list table occupying the main workspace.
- A selected-target inspector showing its exact contribution to each shopping-list row.
- Actions to add a target, adjust desired quantity, reserve owned items, mark or archive a target, and open acquisition sources.
- Clear links into Foundry, Relics, Prime Resurgence, Inventory, Maps, or the official Wiki when those existing tools are relevant.

The combined shopping-list table should use stable, comparable columns:

| Column | Purpose |
|---|---|
| Item | Image state, canonical display name, and type |
| Required | Total verified contribution from all active targets |
| Owned | Current quantity from the player inventory |
| Reserved | Owned quantity explicitly committed to targets |
| Still needed | Combined shortfall after usable inventory is applied once |
| Used by | Contributing target count with an expandable contribution breakdown |
| Source / next action | Existing acquisition destination such as Foundry, Relics, map, or Wiki |

Rows should group or filter by useful acquisition context without changing their canonical aggregation identity. Sorting may use name, still-needed quantity, target count, acquisition family, or priority. Completed rows remain available through an explicit filter rather than disappearing unpredictably.

At compact size, the screen becomes three explicit views: `Targets`, `Shopping list`, and `Target details`. The current view occupies the full content width. Switching views must preserve search, filters, selection, and scroll position where practical.

#### Supported targets

The user may add any item that can be resolved through the application's existing canonical item catalog, including equipment, Prime equipment and parts, weapons, Warframes, companions, Mods, Arcanes, resources, cosmetics, collectibles, relic rewards, and other inventory-recognized item types.

Different target types produce different planning behavior:

- A craftable item expands through its verified recipe and component quantities.
- A set or composite item expands through verified constituent parts when the current data source defines them.
- A directly acquired item remains a direct shopping-list or acquisition task.
- An item with acquisition information but no recipe links to those sources without inventing ingredients.
- An item whose identity or requirements cannot be verified may still remain as a target, but it must display `Requirements unavailable` and must not contribute guessed quantities to the shopping list.

No recipe, item relationship, drop location, quantity, or acquisition method may be inferred from its name. Existing parsers, PublicExport data, verified official Wiki supplements, and the player's inventory remain authoritative.

#### Target record

The preferred persistent record is a versioned profile file, provisionally `data/user/farming-targets.json`, stored beneath the active build profile's data root. The exact command and schema are finalized in the Stage 4C source plan after inspecting existing persistence helpers.

A target record should store only user intent and stable identity:

- Unique target record ID.
- Canonical item identity and display fallback.
- Desired finished quantity.
- Optional priority.
- Optional due date or reminder time.
- Optional user note.
- Created and updated timestamps.
- Active, completed, or archived state.

Owned quantities, recipes, acquisition text, prices, images, completion percentage, and shopping-list totals should be derived at read time. They should not be copied into the target record because those values can change when inventory or source data updates.

Writes must be atomic. A malformed or unsupported schema version must fail visibly without replacing the existing file. Preview and Stable use their already-isolated data roots. Import/export and future Stable promotion require an explicit schema/version record.

#### Canonical identity

Target identity must reuse the application's existing canonical-name and export-identity handling. It must account for the already-supported `EW`, `EWf`, and `ES` families and normalized result paths rather than creating a new name-only lookup.

If a saved identity no longer resolves after a data update, the target remains visible as unresolved. The application should preserve the user's record, stop it from contributing guessed shopping totals, and offer a repair/reselect action.

#### Requirement expansion

Requirement expansion should build a directed requirement graph from verified existing recipe/component relationships. The engine should:

1. Start with desired finished quantity.
2. Subtract finished copies already owned when the user chooses to count them.
3. Expand only the remaining quantity through a verified recipe.
4. Respect the recipe's verified output quantity. Required craft batches are calculated with ceiling division before multiplying component quantities.
5. Apply already-owned intermediate components once before expanding the remaining intermediate requirement.
6. Respect verified reusable/non-consumed inputs where the existing data model distinguishes them; do not assume every listed requirement is consumed.
7. Recurse through craftable subcomponents only when a verified subrecipe exists.
8. Detect and stop cycles.
9. Retain the path from each requirement back to every contributing target.
10. Leave unsupported branches as direct acquisition tasks.

The system must never silently choose between blueprint ownership, crafted ownership, mastered status, or reserved quantity. Those concepts remain separate fields in the derived view model.

#### Consolidated shopping-list aggregation

Aggregation happens by canonical item identity after each active target has produced verified requirement contributions. Contributions from all targets are summed first. The player's inventory is then applied once to the combined total.

For example, if Rhino Prime requires 10 Orokin Cells and Lex Prime requires 5, the table should contain one Orokin Cell row:

```text
Required across targets: 15
Owned:                   8
Reserved for targets:    6
Still needed:            7
Contributors: Rhino Prime 10, Lex Prime 5
```

The owned count is not subtracted separately for each target. That would reuse the same inventory twice and understate the real shortfall. The combined shortfall is `max(0, combined required - usable owned)` using quantities from the player inventory and explicit reservation rules.

Combined totals and per-target progress are related but separate calculations. The combined shopping-list shortfall never depends on target ordering. For individual progress, explicitly reserved quantities are allocated first. Remaining unreserved inventory is allocated deterministically by target priority and then creation order solely for presentation. The inspector must label this as shared inventory allocation so a user can distinguish an owned item from an item explicitly reserved for that target.

Changing target priority may change which target appears covered, but it must not change the combined required, owned, or still-needed totals. Tests must prove this invariant.

Each consolidated row must expose its target contributions so the user can understand why the total exists. Removing or changing a target recomputes the row immediately. Zero-required rows may remain visible as complete when useful, or be hidden by an explicit `Still needed` filter.

#### Reservations

Reservations express that owned copies or resources are committed to a target. They do not change the player's inventory and do not fabricate ownership.

The reservation model should record canonical item identity, quantity, and target ID. Reserved quantity is a labeled subset of owned inventory; it is never subtracted from shopping requirements a second time. The UI must prevent the total reserved quantity from silently exceeding current ownership. When inventory decreases below the reserved amount, the affected reservation becomes visibly overcommitted and requires user attention; it is not silently reduced.

For future Stable market recommendations, available surplus is derived from owned quantity after all explicit reservations and other already-established protected quantities are accounted for. A reservation may reduce a sale recommendation to zero; it must never increase or create a sale quantity.

Reservations feed:

- Farming Targets progress and contribution details.
- Inventory's `Reserved items` section.
- Dashboard target attention states.
- Market surplus recommendations after a separately reviewed integration.

Preview cannot mutate marketplace orders. Before Stable promotion, Market must prove that reserved quantities are excluded from saleable surplus and that no reservation can create a sell quantity. This is a high-risk cross-feature gate.

#### Reminders

A target may have an optional due date or reminder. In Preview, reminders appear only inside the application and on Dashboard because Preview cannot own OS notifications. No notification command may be invoked.

Integrating target reminders with Stable notifications is deferred to the Stable-promotion plan. That integration must reuse the existing notification rule/cooldown system and receive separate approval.

#### Connections to existing screens

- Dashboard reads active-target count, progress, due state, and next action from this target store.
- Inventory can add the selected item as a target and display current reservations.
- Foundry can create a target for a recipe or open a target's missing crafted requirements.
- Relic Planner can send selected Prime rewards into Farming Targets, but its temporary relic comparison remains separate.
- Relics can show which rewards contribute to active targets.
- Prime Resurgence can show offers that satisfy active targets.
- Checklist may show due target reminders without duplicating target state.
- Market may read reservations for surplus calculations only after its separate safety validation.

These connections should use a single target repository/context and derived selectors. No screen may keep its own independent copy of target or reservation data.

#### Farming Targets acceptance requirements

- The route appears exactly once in desktop navigation, compact navigation, global search, and route tests.
- At least one target of every supported behavior class is covered with synthetic component fixtures: craftable, composite, direct acquisition, unresolved requirements, and archived.
- Multi-target aggregation proves a shared requirement is summed once and inventory is subtracted once.
- Recursive recipes prove batch-output ceiling, intermediate inventory application, quantities, and cycle detection.
- Changing target priority changes only per-target allocation presentation and never the consolidated shortfall.
- Editing quantity, removing, completing, archiving, and restoring targets recomputes the list correctly.
- Reservations prove normal, fully reserved, partially reserved, and overcommitted states.
- Dashboard count and rows equal the Farming Targets repository output.
- Preview reminder behavior records zero notification invocations.
- Persistence survives reload, malformed input fails visibly, atomic-write interruption preserves the prior valid file, and Stable/Preview roots remain isolated.
- Desktop and compact layouts match the approved combined-shopping-list concept.
- No guessed game data or synthetic fixture enters the production profile.

#### Standalone runnable calculation proof

Stage 4C must ship a real, directly executable Node.js entry-point file for the pure calculation engine. It must be a plain `.js` script, provisionally `scripts/farming-targets-proof.js`, invoked directly as `node /absolute/path/farming-targets-proof.js ...`. It must require no build step, bundler, transpiler, test framework, Tauri runtime, React runtime, webview, or application launch. The script must import and execute the exact production aggregation module; it must not reimplement the formulas for the proof.

The entry point must:

- Run directly with the installed Node.js executable and no preparation beyond providing the required data files and arguments.
- Run without Tauri, React, Vite, WebDriver, a webview, a test framework, a build step, a network connection, or access to application windows.
- Require explicit input paths rather than silently locating a convenient fixture.
- Read the real exported player inventory from the user-selected `inventory.json` path.
- Read the same real catalog and verified recipe data used by the application.
- Accept a small target-selection file containing canonical identities and desired quantities. If no real Farming Targets profile exists yet, this file may select two or three real catalog items for review, but it may not supply invented owned counts, recipes, output quantities, or component requirements.
- Run read-only. It must not modify the player inventory, target store, cache, catalog, or application profile.
- Print a human-readable shopping-list table directly to stdout.
- Print the selected targets, canonical identities, desired quantities, actual owned quantities, verified recipe edges, craft batch/output calculations, inventory application, reservation application, contributor subtotals, and final combined shortfalls.
- Provide an explanation mode that prints the requirement tree for each target and shows how every consolidated row was formed.
- Print hashes and paths for all input files and the exact production aggregation module so the calculation can be tied to reviewed evidence.
- Exit nonzero and print a clear error for unresolved identity, malformed input, unsupported schema, recipe cycle, or missing required source data unless the selected proof explicitly demonstrates that failure state.

A typical reviewer command should be one direct invocation with absolute paths, conceptually:

```bash
node /absolute/repository/scripts/farming-targets-proof.js \
  --inventory /absolute/profile/data/user/inventory.json \
  --catalog /absolute/application/catalog.json \
  --recipes /absolute/application/recipes.json \
  --targets /absolute/evidence/reviewer-targets.json \
  --explain
```

The final argument names and catalog paths must come from the source audit rather than being guessed from this example. The completed implementation report must provide one exact copy-pasteable command that begins with `cd`, invokes the `.js` file with plain `node`, uses absolute input paths, and states which output rows the reviewer should see. Running that command from a clean checkout must not first require `npm run build`, Vite, a test command, generated bundles, or application startup.

Raw stdout must be preserved as evidence without rewriting it into a summary-only JSON report. A structured JSON export may be supplied in addition to the table, but it cannot replace the readable stdout proof.

#### Property and invariant tests

Example fixtures are necessary for recognizable scenarios, but they are insufficient for aggregation correctness. The pure engine must also have deterministic property-style tests that generate many combinations of targets, quantities, recipes, inventory counts, reservations, priorities, and input orderings.

The generated tests must cover at least these invariants:

- Permuting target order does not change consolidated required, owned, reserved, or still-needed totals.
- Changing priority changes only per-target allocation presentation, never consolidated totals.
- Owned inventory is applied at most once to each canonical consolidated requirement.
- `still needed` is never negative.
- Increasing owned quantity cannot increase the combined shortfall.
- Increasing a target quantity cannot reduce the combined required quantity when the verified recipe graph is otherwise unchanged.
- Duplicating a target contribution increases combined requirement by exactly that contribution before inventory is applied.
- Contributor subtotals reconcile exactly to every consolidated required total.
- Reserved quantity is counted as a subset of owned quantity and is never subtracted from shopping requirements twice.
- Total normal reservations do not exceed owned quantity; deliberately generated overcommit scenarios are surfaced explicitly rather than silently normalized.
- Reordering reservations does not change consolidated totals.
- Recipe output batches use ceiling division and never underproduce the requested remaining output.
- Owned intermediate components are applied once before their remaining quantity is expanded.
- Reordering independent recipe branches does not change leaf requirements.
- Cyclic graphs terminate with an explicit error and never produce a partial apparently-valid total.
- Unresolved or unsupported branches never contribute guessed numeric requirements.

The generator must use fixed recorded seeds for reproducibility and enough cases to exercise varied graph depth, shared components, zero ownership, excess ownership, partial reservations, batch outputs greater than one, and cycles. The report must include case count, seeds, and the first minimized failing case if a property fails. A single aggregate `all passed` boolean is not adequate evidence.

No new application dependency should be added merely to generate cases. A dependency-free deterministic generator in test tooling is preferred. Any proposed dependency still requires explicit approval.

#### Independent real-data cross-check

The aggregation engine cannot be accepted solely from a test suite written alongside the implementation. Stage 4C must include an independently checkable real-data worksheet for two or three reviewer-selected targets resolved from the actual catalog and actual player inventory.

For each selected target, the evidence must expose:

1. Canonical target identity and desired quantity.
2. Relevant real owned quantities read from the player inventory.
3. Every verified recipe/output edge used in the calculation.
4. Per-target arithmetic before aggregation.
5. Shared canonical requirements and their contributor subtotals.
6. The single application of real owned inventory.
7. Reservations, if included in the case.
8. Final combined shortfalls.

At least one selected pair must share a real requirement so the reviewer can verify that it appears once in the consolidated table, with contributions summed and owned inventory subtracted once. At least one selected recipe should exercise batch output or an intermediate component when the verified real data provides a reasonably reviewable case.

The standalone entry point must produce these results directly from the recorded real input files. The reviewer must be able to calculate the same rows with ordinary arithmetic from the printed recipe edges. The evidence should include the untouched raw command output, input hashes, and a short worksheet; it must not ask the reviewer to trust an internally generated expected-value field.

Player inventory is ground truth for ownership. The evidence record should disclose only the selected items and required structural values, avoiding unrelated profile data or credentials. Redaction must happen when preparing the review artifact, not by substituting synthetic ownership values in the proof run.

#### Stage 4C risk and source boundary

Farming Targets is a higher-risk feature milestone because it adds a route, versioned persistence, recursive derived data, and connections to several existing screens. Its source plan must enumerate every proposed file before implementation. Likely surfaces include the route registry, a target repository/context, a pure aggregation module, a presentation view model, the Farming Targets screen, shared target/requirement components, Dashboard selectors, Inventory/Foundry/Relic entry actions, and explicit persistence commands or existing safe file helpers.

The pure aggregation engine should have no Tauri, React, network, or filesystem dependency. Given a canonical catalog, verified recipe graph, inventory quantities, targets, and reservations, it should return deterministic target progress and shopping rows. Keeping this logic pure makes update behavior testable and prevents UI changes from altering quantities.

Market recommendation changes and Stable notification delivery are outside the initial Stage 4C write scope. Stage 4C records the reservation and reminder data needed by those later integrations. Market reads reservations only in its separately reviewed Stage 4F safety slice; Stable OS notifications are considered only during promotion.

### 9.9 Relics

**End goal:** Relics supports fast selection based on ownership, refinement, vault state, rewards, and value.

Era, search, ownership, refinement, vault state, squad size, and sort controls are grouped by purpose. Void Traces remain visible as a persistent resource summary. Grid and list presentations show relic ownership, refinement, vault state, estimated value, and reward summary.

Selecting a relic opens its reward table and acquisition details in the shared inspector. Existing catalog merging, price lookup, squad-size calculations, and expected-value formulas remain unchanged.

### 9.10 Relic Planner

**End goal:** Relic-specific reward comparison becomes one understandable three-step task while remaining distinct from generalized Farming Targets.

The desktop workspace coordinates:

1. Find and select needed parts.
2. Review the target set.
3. Compare suggested relics.

The panels remain visually connected so the user can see how a selected part affects recommendations. Existing ownership rules, status handling, filtering, and suggestion calculations remain unchanged.

At compact size, this becomes a labeled stepper. Only the active step needs to dominate the screen, while completed steps retain summaries and remain easy to revisit.

Relic Planner selections are temporary planning state unless the user explicitly sends a selected reward to Farming Targets. They do not implicitly become generalized targets, reservations, Dashboard counts, or reminders.

### 9.11 Prime Resurgence

**End goal:** The current rotation and its urgency are immediately visible.

The page opens with a rotation hero containing remaining time, Aya and Regal Aya context, and the current featured Prime set. Equipment and cosmetics are separated into clear groups. Ownership and availability filters use shared controls. Selecting an offer opens its requirements and acquisition context.

Existing rotation parsing, missing-only behavior, acquisition information, and source data remain unchanged.

### 9.12 Market

**End goal:** Market becomes a safe, legible workspace where every price state and mutation is explicit.

Active Orders and Tradable Stock are separate top-level workspaces. Stock rows show item, owned quantity, mastery, Ducats, market value, and recommendation. Prices distinguish loading, valid positive value, no market data, fetch failure, and non-tradable state. Unknown values never render as `0p`.

Preview displays read-only market information and a visible capability notice. All mutation controls remain disabled, zero frontend mutation invocations are allowed, and direct invocation of all four Rust mutation commands must be rejected.

Stable listing forms require a visible positive price and show the exact mutation payload before confirmation. The accepted fallback from explicit user price to the currently displayed verified `item.platPrice` remains intact.

### 9.13 Rivens

**End goal:** Rivens supports card recognition and side-by-side stat/value comparison.

Veiled, unveiled, and challenge views remain distinct. Search, weapon type, status, grade, and sorting use shared controls. Grid mode preserves Riven-card character. List mode aligns weapon, polarity, rolls, rank, value, and grade.

The shared inspector presents grade reasoning and market detail. Existing grading, pricing, OCR-derived data handling, and drawer behavior remain unchanged.

### 9.14 History

**End goal:** History shows meaningful change over time alongside the events that caused it.

The page begins with summary metrics. Time range and tracked-item controls sit together above the primary chart. The event log appears alongside the chart on wide screens and below it on compact screens.

Existing ranges, metrics, searches, chart calculations, and recorded events remain unchanged.

### 9.15 Adversaries

**End goal:** Each adversary reads as a concise profile with an understandable progression history.

The main view uses compact profiles showing status, weapon, element, rank/progression, and outcome. Selecting a profile opens a detailed timeline or inspector. Empty and incomplete records receive intentional states rather than broken-looking cards.

### 9.16 Maps

**End goal:** The map remains the dominant surface while configuration and marker tools stop consuming permanent space.

The canvas occupies the full working region. A consistent floating vertical palette contains pointer, marker, path, measurement, zoom, locate, and reset tools. Map selection becomes compact when width is limited. Configuration, layers, and selected-marker details live in a collapsible inspector.

At compact size, the canvas remains dominant and temporary panels overlay it. Pan, zoom, reset, markers, paths, context menus, import, configuration editing, and deletion remain available. All accepted coordinate, scale, persistence, atomic-write, and directory-creation behavior remains unchanged.

### 9.17 Wiki

**End goal:** Wiki behaves like a small dependable browser rather than a page with detached controls.

The toolbar contains back, forward, refresh, address/search, external-open, and tab context. Loading, connection, and error states remain visible. The embedded webview owns the remaining workspace.

At compact width, controls collapse by priority while back, refresh, address, and external-open remain reachable.

### 9.18 Notes

**End goal:** Notes becomes a focused Markdown workspace with explicit file and save state.

Desktop uses a file list plus split editor/preview. Compact mode switches between Edit and Preview. Creation, rename, save, delete, import, export, and share remain available through consistent menus. Unsaved changes are always visible.

Editor and preview panes may scroll internally because their bounds and purpose are explicit. The overall page must not acquire an additional competing scroll path.

### 9.19 Checklist

**End goal:** Checklist emphasizes today's remaining work while preserving all longer-cycle tasks.

The header shows completion and reset timing. Daily, weekly, syndicate, focus, and existing task groups remain distinct. Completed, incomplete, hidden, and automatically tracked states must be visually clear. Compact mode uses collapsible sections without deleting information.

### 9.20 Settings

**End goal:** Settings becomes a predictable sectioned control panel where risky actions are unmistakable.

Desktop uses a persistent section navigator. Compact mode uses a labeled section menu. Sections cover appearance, notifications, monitoring, paths/cache, language, sidebar, hotkeys, safe mode, market, maintenance, and updates.

Related settings are grouped into panels. Live, destructive, and maintenance actions receive stronger visual treatment. Preview capability restrictions are visible. Preview must record zero `relay_event` and zero `stop_log_scanner` invocations because those paths lack the same Rust `require_live()` protection as the guarded commands.

### 9.21 About

**End goal:** About provides a polished identity and trustworthy support record.

The page shows product name, version, channel, profile identity, project links, help, diagnostics, credits, licenses, source attribution, and legal disclaimer. It becomes a simple single column at compact size.

## 10. Guided import workflow

The import experience is part of the command-center implementation because manual Preview testing showed that its current conflict behavior is hard to understand.

The final workflow should be:

1. Choose a Stable `data/user` source.
2. Scan without modifying either profile.
3. Display every supported category and discovered source file.
4. Mark missing required files before import.
5. Mark destination conflicts before import.
6. Explain that credentials and live-integration settings are excluded.
7. Allow replacement per category or for all selected categories.
8. Explain that replaced files receive a dated backup.
9. Show the exact set of files to copy, skip, scrub, or replace.
10. Enable Import only when all selected conflicts are resolved.
11. Show progress and a final result summary.

The existing source-unchanged guarantee, credential scrub, transaction journal, profile lock, import lock, rollback, crash recovery, and failure dialog remain authoritative. The redesign changes clarity and control flow rather than weakening the recovery model.

After Farming Targets exists, the guided import/export inventory must recognize its versioned file as a separate optional category. Import is offered only when the selected source contains that explicit file. It must never infer targets from Relic Planner state, Dashboard cards, inventory favorites, or checklist entries. Replacement follows the same explicit conflict and backup rules as other imported Preview files.

## 11. Overlay phase

Overlay redesign begins after all 21 main routes and the import workflow are accepted. The eight surfaces are:

- Top-left notification.
- Top-center notification.
- Top-right notification.
- Current Riven overlay.
- New Riven overlay.
- Relic reward overlay.
- Relic picker.
- Interactive sidebar overlay.

The visual goal is to apply the same type, color, border, status, and button system while preserving each overlay's existing size, position, click-through behavior, focus behavior, timing, hotkeys, and monitoring ownership.

Overlay acceptance requires real process-level testing. Static component screenshots are insufficient because focus, click-through, window positioning, monitor selection, and game-window interaction are native behaviors.

## 12. Implementation sequence

### Stage 4A — Foundation, shell, and Dashboard

Create the Stage 4 checkout, semantic tokens, shell, navigation, global header, status contract, primary scroll region, core buttons/panels/states, and production Dashboard.

**End state:** Opening Preview visibly matches the approved Dashboard mockup and all 20 routes remain reachable through the new shell.

### Stage 4B — Inventory and image system

Implement production image states, category navigation, explicit filter controls, grid/list catalog, and item inspector.

**End state:** Inventory matches the approved anchor mockup and closes the reported menu, scrollbar, toggle, and missing-image defects.

### Stage 4C — Farming Targets

Extend the approved mockup suite to 21 routes, then implement the versioned target store, canonical target resolution, verified requirement graph, cross-target aggregation, reservations, in-app reminders, combined shopping list, target inspector, and Dashboard/Inventory/Foundry/Relic connections described in section 9.8. Deliver the standalone real-data proof command, invariant/property suite, raw stdout, and independently checkable arithmetic worksheet in the same milestone.

**End state:** Dashboard's tracked-target summary is real; the user can track any recognized item; shared requirements are consolidated once across targets; inventory is applied once; reservations and unsupported data states are explicit; Relic Planner remains a separate specialized tool.

This is a new capability and a new persisted-data surface. Stage 4C requires its own detailed source plan and explicit approval before any app or Rust source changes.

### Stage 4D — Collection

Migrate Mastery, Mods, Cosmetics, and Collectibles one route at a time.

**End state:** All collection browsing uses the same filters, images, cards, inspectors, and compact rules.

### Stage 4E — Planning

Migrate Foundry, Relics, Relic Planner, and Prime Resurgence, including their approved links to the shared Farming Targets repository.

**End state:** Crafting, relic selection, rotations, and generalized targets form one connected planning workflow while preserving current calculations and data sources.

### Stage 4F — Trading

Migrate Market as a dedicated high-risk slice, followed by Rivens.

**End state:** Read-only Preview behavior is unmistakable, marketplace safety evidence remains complete, and trading information is easy to compare.

### Stage 4G — Journal and tools

Migrate History, Adversaries, Maps, Wiki, Notes, and Checklist.

**End state:** Specialized workspaces share the shell without forcing unsuitable generic card layouts onto maps, webviews, editors, or charts.

### Stage 4H — Application and import

Migrate Settings, About, and guided import.

**End state:** Profile identity, capability restrictions, maintenance actions, support information, and migration are understandable without technical knowledge.

### Stage 4I — Overlays

Apply the approved visual system to the eight existing overlay windows.

**End state:** Overlay windows look related to the main application while retaining their native interaction behavior.

### Stage 4J — Linux release candidate

Run the complete source, component, package, upgrade, coexistence, recovery, and native interaction matrix.

**End state:** A reviewable Linux Preview package contains the complete command-center UI and can coexist with Stable without sharing profile data or live integrations.

### Stage 4K — Stable promotion planning

After explicit acceptance of the Preview release candidate, prepare a separate promotion plan.

**End state:** The new presentation becomes the shared production UI without maintaining the old visual implementation indefinitely. Stable promotion is never implicit in Stage 4 Preview acceptance.

## 13. Validation strategy

### 13.1 Visual contract testing

Each route receives production screenshots at 1440x900 and 900x500 using controlled component fixtures. The fixture layer supplies view models directly and is excluded from production bundles.

Validation should combine:

- Side-by-side review against the approved mockup.
- Landmark geometry checks for major regions.
- Typography and spacing-token checks.
- Screenshot difference measurement as a warning tool.
- Human visual acceptance as the final decision.

Pixel similarity alone must not approve a page, because real fonts, data length, and platform rendering create legitimate differences. Geometry passing alone also must not approve a page, because the rejected first suite proved that technically valid geometry can still miss the desired design.

### 13.2 Feature preservation

The route manifest should map every Stage 1 feature and every approved Farming Targets capability to:

- Production component or background service.
- Wide-screen location.
- Compact-screen location.
- Keyboard path.
- Empty/loading/error behavior.
- Evidence record.

No screen is accepted while one of its registered features lacks a destination or documented background role.

### 13.3 Stable regression

While Preview-only gating exists, representative Stable states should render byte-identical markup where feasible. For behavior-heavy screens, tests should compare exact command names, payloads, state transitions, and visible results.

Stable corrections already accepted in Stage 2/3 remain present. Stage 4 must not accidentally reverse the Market displayed-price correction, Maps atomic write, map-directory creation, recovery exit status, updater disabled state, or import crash recovery.

### 13.4 Responsive testing

Every screen should be exercised at:

- 1440x900.
- 1200x800.
- 1024x640.
- 900x500.

Checks include:

- No horizontal page overflow.
- No clipped primary action.
- No inaccessible category or filter.
- No overlapping text and artwork.
- One main vertical scroll owner.
- Every permitted internal scrollbar visibly discoverable.
- Drawer/dialog within viewport and internally scrollable when required.
- Focus remains visible after responsive rearrangement.

### 13.5 Data-state testing

Every relevant screen should render:

- Normal populated data.
- Loading.
- Empty data.
- Search with no matches.
- Recoverable data error.
- Partial image availability.
- Long localized labels.
- Large user counts or values.

Trading and integration screens receive additional disconnected, unauthorized, disabled, and stale-data states.

### 13.6 Linux package testing

High-risk milestones and the final release candidate should rebuild Debian and AppImage artifacts using the hardened bounded-container toolkit:

- Absolute paths.
- Four-CPU limit.
- `CARGO_BUILD_JOBS=4`.
- `nice -n 19`.
- Network disabled for smoke tests.
- Preflight cleanup of shared target/AppDir output.
- Wait for terminal container state.
- Preserve before/failure evidence.

Routine low-risk screen slices can use component and frontend validation first, with native package matrices run at the end of each phase. Market, Settings, Maps, import, overlays, and final release candidate always require native evidence.

### 13.7 Evidence integrity

Every implementation report should include:

- Exact source files changed.
- Incremental and cumulative patch hashes.
- Before/after source hashes.
- Build and artifact hashes.
- Check counts and failures.
- Preserved failed runs.
- Original tracked-file baseline comparison.
- Cargo lockfile comparison.
- Mockup reference hash.
- Explicit BLOCKED and UNAVAILABLE coverage.

Test-harness fixes may be applied and rerun immediately when confined to fixtures, mocks, evidence scripts, or runners. Application-source defects, dependency changes, backend changes, and unexpected behavior changes require a new approval before correction.

### 13.8 Independently checkable calculation evidence

Any Stage 4 slice that introduces or materially changes high-stakes calculation logic must meet the same evidence standard as Farming Targets. Internal test counts, component screenshots, and generated `pass: true` records are supporting evidence; they are not sufficient by themselves.

High-stakes logic includes at least:

- Farming-target requirement expansion.
- Cross-target shopping-list aggregation.
- Inventory allocation and reservation allocation.
- Any new market price, surplus, tradability, or listing-quantity calculation.
- Any changed mastery, reward-value, relic probability, crafting, or progress formula.
- Any derived value that could cause the user to farm, reserve, sell, spend, or discard the wrong item.

For each such calculation, the stage must provide:

1. **A standalone runnable proof.** A real `.js` entry-point file runs directly as `node script.js`, imports the exact production calculation module, accepts explicit real-data paths, requires no build step or test framework, runs without the app/component pipeline, and prints readable inputs, steps, and results to stdout.
2. **Property-style invariant tests.** Generated cases exercise algebraic and ordering invariants across recorded deterministic seeds, with failing cases preserved and minimized where practical.
3. **An independent cross-check case.** Two or three small real-data examples expose all source values and arithmetic needed for a human reviewer to reproduce the result without trusting the implementation's own expected-value field.

The proof command, raw stdout, source/input hashes, property seeds, case counts, and cross-check worksheet must be stored as separate evidence artifacts. Summaries may link to them, but may not replace them.

The standalone proof must call the production module directly. A second implementation of the same algorithm is useful only as an optional differential oracle and cannot serve as the sole proof, because two implementations can share the same mistaken assumption. Human-readable source values and arithmetic remain required.

Unchanged existing calculations do not need a new standalone CLI merely because their screen is restyled. This requirement activates when Stage 4 adds a calculation, rewrites it, changes its inputs, changes its outputs, or uses it for a new consequential decision. Source inspection must record whether the requirement is applicable for each stage.

If real source data cannot provide a small independently reviewable example, that part of validation remains BLOCKED or PENDING. Synthetic fixtures may continue testing UI and edge states, but they cannot be presented as real-data proof.

## 14. Maintenance design

Low maintenance is a primary requirement. Stage 4 should reduce future work through the following structure:

### Single route registry

Navigation group, route ID, label key, icon, search terms, and capability metadata should live in one registry. Navigation, the compact drawer, global search, and route tests should consume that registry so a new route cannot silently appear in only one place.

### Shared controls

Screens should consume the same segmented control, search, sort, category navigator, image state, inspector, drawer, and empty/error components. Fixing a focus ring, compact menu, or scrollbar should repair every screen that uses it.

### View-model adapters

Game-data format changes should be absorbed by existing parsers or one screen adapter. Presentation components should not know PublicExport field variants, WFM response structure, or inventory-export aliases.

### Semantic tokens

Themes should supply token values without duplicating component CSS. New themes should not require screen-level edits.

### Contract tests

Automated checks should detect:

- Duplicate or missing route IDs.
- Features with no mapped destination.
- Horizontal page overflow.
- Mixed filter semantics.
- Unknown or zero price displayed as valid value.
- Missing-image blank space.
- New unproven raster assets.
- Preview mutation or live-integration invocation.
- Stable/Preview profile crossover.
- Farming-target contributions whose aggregated quantities do not reconcile.
- Inventory quantities being subtracted more than once across targets.
- Dashboard target summaries that diverge from the target repository.

### No synthetic production mode

Fixture data stays in test tooling. The shipped app should not contain a query string, setting, or hidden toggle that swaps real user data for the mockup dataset.

## 15. Platform and release boundaries

Stage 4 is Linux-scoped because that is the available validated environment.

- Windows remains **OPEN / BLOCKED** until suitable hardware or CI exists.
- macOS remains **OPEN / UNAVAILABLE** until suitable hardware or CI exists.
- A real published-version upgrade remains pending until two genuine release versions exist.
- Exhaustive tracing remains a separate instrumentation track.

These items remain named in the acceptance ledger. They do not block Linux implementation and are not converted to passes by completing the UI.

## 16. Approval cadence

The expected work comprises:

- One foundation/shell unit.
- Twenty existing-route migrations.
- One new Farming Targets route and persistence/aggregation unit.
- One guided-import unit.
- One overlay unit.
- One Linux release-candidate unit.

Low-risk routes may be grouped into phase reports, but each route must retain its own screenshots, feature ledger, and acceptance result. Dashboard, Inventory, Farming Targets, Market, Settings, Maps, import, overlays, and the release candidate should remain individual approval gates.

The likely total is approximately 11–13 consolidated review rounds if routine screens are grouped after their individual source plans are accepted. Keeping every screen as a completely separate build/package round would raise that to roughly 25 rounds without improving safety proportionally.

## 17. Stop conditions

Implementation should stop for a new decision before:

- Changing a game formula, ownership rule, price rule, reward calculation, mastery total, crafting rule, or acquisition source.
- Changing stored user-data schema or migration behavior.
- Changing the approved target aggregation, reservation-allocation, or canonical-identity rules.
- Changing a marketplace mutation payload or safety guard.
- Enabling Preview monitoring, hotkeys, notifications, overlays, updater, relay events, scanner control, or marketplace mutation.
- Adding a dependency or changing a lockfile.
- Adding an unverified image source.
- Adding AI-generated artwork.
- Removing or hiding an existing feature.
- Changing Stable behavior beyond an already accepted correction.
- Expanding Stage 4 into Windows/macOS claims without a real validation environment.

Several failures within the same application category should be diagnosed and proposed together. Test-tooling failures should be corrected immediately, preserved, and disclosed in the next consolidated report.

## 18. Definition of complete

Stage 4 Preview is complete only when all of the following are true:

- All 20 existing production routes plus Farming Targets match the approved command-center direction.
- The mockup gallery contains 21 desktop and 21 compact route screenshots, including Farming Targets.
- Desktop and compact screenshots have been visually accepted.
- Every Stage 1 feature and every approved Farming Targets capability has a visible destination or documented background role.
- The reported menu scaling, invisible horizontal rails, mixed filter behavior, Cosmetics scrolling, import conflict clarity, and missing-image problems are closed with direct runtime evidence.
- All existing formulas, storage, data sources, and native commands remain accounted for.
- Market and live-integration safety checks pass.
- Import rollback and crash recovery pass.
- Farming Targets persistence, aggregation, reservation, Dashboard consistency, and interruption tests pass.
- Standalone real-data proof, deterministic property tests, and independently hand-checkable calculation evidence are present for every new high-stakes Stage 4 calculation.
- Debian and AppImage install, launch, coexistence, upgrade, and removal checks pass within the stated Linux environment.
- No AI-generated artwork or unverified raster asset is present.
- The original repository baseline, accepted Stage 2/3 evidence, and Stable installation remain intact.
- The user explicitly accepts the Linux Preview release candidate.

The next actionable document after approval of this master plan should be **Stage 4A — Foundation, Shell, and Dashboard Source Plan**. That plan should name the exact files, current hooks, component boundaries, fixture states, visual landmarks, truthful pre-target empty state, test matrix, and package impact before any application source is edited. Stage 4C will receive a separate detailed data-model and source plan before the new Farming Targets capability is implemented.
