# Stage 4A — Foundation, Shell, and Dashboard Source Plan

**Status:** PROPOSED — PLAN ONLY — AWAITING EXPLICIT APPROVAL

**Target:** Kieda's Orbiter Preview on Linux

**Application source changed by this document:** None

**Builds or packages produced by this document:** None

**Parent plan:** `docs/revamp/stage-4/COMMAND-CENTER-IMPLEMENTATION-PLAN.md`

**Stage 4A end state:** Opening Preview is immediately recognizable as the approved command-center Dashboard, all 20 current routes remain reachable, and Stable retains its existing rendered behavior.

## 1. Purpose and approval boundary

This document turns Stage 4A of the approved master plan into a file-level implementation proposal. It names the source files, ownership boundaries, current hooks, UI states, visual landmarks, validation cases, evidence files, and package effects before application source is edited.

Approval of this document would authorize only the Stage 4A files listed in section 7. It would not authorize:

- The Stage 4B Inventory redesign or image-system migration.
- The Stage 4C Farming Targets route, persistence, aggregation, reservations, or reminders.
- Any later route migration.
- Import-workflow redesign.
- Overlay redesign.
- Stable promotion.
- Windows or macOS claims.
- Dependency or lockfile changes.
- New raster artwork or AI-generated images.

An unexpected need to edit any application file outside the authorized list, change a calculation, add a dependency, alter Stable behavior, or change a native command stops implementation for a new decision.

## 2. Frozen references and baseline

Stage 4A is planned against the accepted Stage 2 plus Stage 3A–3K state in `.preview-work/stage2/`. Implementation will begin by reconstructing that state in a fresh checkout at `.preview-work/stage4-command-center/`; it will not continue by editing the accepted Stage 3 checkout in place.

### 2.1 Binding visual references

| Reference | SHA-256 | Use |
|---|---|---|
| `docs/revamp/stage-4/COMMAND-CENTER-IMPLEMENTATION-PLAN.md` | `b4d98fd1ddd7dfb398c63743f4746e63f047f3af918479ef020f6e79bdfd8dcd` | Behavioral and architectural authority |
| `.preview-work/mockup-suite/screenshots/dashboard-desktop.png` | `890eb096b57e8baf9a3b8d7c6a344e84e180086c37890258699cec5f9b08e935` | 1440×900 layout target |
| `.preview-work/mockup-suite/screenshots/dashboard-compact.png` | `17b573e2f21bc773d2f02ada9034c738a07ba88ab402540924cfd9e31b4adaaf` | 900×500 layout target |
| `.preview-work/mockup-suite/mockup-manifest.json` | `e40d4771e99fc64c8edf4e9e2a1d3dc8d0b0690b857fa21cecb6a3a50fecc30b` | Existing feature-to-mockup coverage |
| `docs/revamp/stage-3/cumulative-implementation.patch` | `daa070f8b321c5f59c04f88a63952588fbe5d72c2917b223ce55f51682e08b0b` | Accepted cumulative Stage 3 application state |

The rejected first-pass gallery remains evidence only and is not an implementation reference.

### 2.2 Current accepted source fingerprints

These hashes were read from the accepted `.preview-work/stage2/` checkout on 2026-09-06. The Stage 4 preflight must reproduce them before editing.

| File | Current SHA-256 | Reason it is registered |
|---|---|---|
| `src/App.jsx` | `f12957ec9b0e402e721bcd31de7e84f67803d6190ba5663b56577ee3c659dca7` | Route state, providers, shell listeners, Stable navigation, Preview branch |
| `src/screens/Dashboard.jsx` | `f14802af805421af410e025fb0a869d5978eed8197fae0ad6f547a8e382b9167` | All Dashboard logic, 19 cards, dialogs, local state and actions |
| `src/components/PreviewNavigation.jsx` | `a69f4b2d21bbeeedba087acc4b3b37fd11ae4b2501a69a7d79791abb3d8bb6a4` | Transitional Stage 2 grouped navigation |
| `src/components/PreviewDashboardLayout.jsx` | `a624ad4ec319a00cf6464604b8d0923d0eff4305801e3163361fa3a50f892390` | Transitional Stage 3 Dashboard grouping wrapper |
| `src/components/PreviewImport.jsx` | `f7129bc29168e06128a37d69b65f5ef6dcf1f258a50e9115ef58094da2907ff8` | Import control that must remain reachable and unchanged |
| `src/components/UI.jsx` | `92b0ad65ce308144b53f77713f6c9ba577011fd6232d04e39aa67e394bbeed55` | Current Stable `PageLayout`, cards, tabs, modal foundations |
| `src/contexts/MonitoringContext.jsx` | `033b5f15b1ff475381d5078ca2e5b4fd0e53e845b9393ec11cae9b24ffb0626e` | Existing status, inventory, world-state and activity data owner |
| `src/contexts/ThemeContext.jsx` | `577d844ea433abc1efaf813ec23cad52ee6f9e4c89b1a47cfa2e8eb93307b190` | Existing 14-theme owner |
| `src/contexts/UpdateContext.jsx` | `de5046061b4877d20544b79ecbaf3579fbd30a1b0c8381016df68b51bb2bf0fc` | Existing update state and Preview-disabled state |
| `src/contexts/UiContext.jsx` | `ec3308c981e303a4c247a7084ffa813b31384d62e7513303d808f5050463e5ef` | English-fallback localization behavior |
| `src/lib/buildProfile.js` | `b7b4c317980fb3e585c16861801f494cf70e19c50ffc7ab9426053499b911bcc` | `IS_PREVIEW` product boundary |
| `src/lib/inventoryParser.js` | `723f47347d12a55afb8c66e4e22c1e592d5b7bad8d788b2bf584858c8c682b7d` | Existing `readyToCraft` calculation owner |
| `src/index.css` | `a1a531740606584e3441ff54969867eed15e01994f6e01bfef588c44b18bc5d5` | Existing theme variables and global rules |
| `src/lib/i18n/en.json` | `2f252d7afcf6d63b86e08c459108ec0a30fab753b72ce3b78a7fd9604b2c039c` | English UI strings and fallback source |

The original repository is at commit `f30ea7e9f7fe1f12406257018a2a8cff8c21158d` with 850 tracked files. The accepted Preview checkout is based at commit `4b89a5f0c88023b76217021eb99eac9724df423d` on `revamp/preview-shell`. The Stage 4 reconstruction record must explain this distinction and prove that the accepted cumulative patches, rather than an assumed branch tip, define the Stage 4 starting content.

### 2.3 Preflight procedure after approval

Before changing application source:

1. Create `.preview-work/stage4-command-center/` as a new isolated checkout.
2. Apply the accepted Stage 2 and cumulative Stage 3 patches with native Git operations.
3. Compare every resulting application file byte-for-byte with `.preview-work/stage2/`.
4. Write `docs/revamp/stage-4/stage4a-source-register.json` with hashes, commits, patch provenance and comparison results.
5. Stop if any accepted file differs, if the original 850 tracked-file baseline changes, or if the accepted checkout has unrecorded source not represented by the cumulative evidence.
6. Preserve `.preview-work/stage2/`, its packages and its evidence unchanged.

No build occurs during this preflight.

## 3. Current source architecture and hooks

### 3.1 `src/App.jsx`

`AppContent` currently owns the application-level state and must remain the only route-selection owner in Stage 4A.

| Current hook or boundary | Current behavior | Stage 4A treatment |
|---|---|---|
| `activeTab` / `setActiveTab` | Holds one of the 20 current route IDs; defaults to `dashboard` | Retain as the route source of truth; pass into the new Preview shell and route search |
| `sidebarActive` / `sidebarSide` | Mirrors native sidebar mode and side | Preserve; pass layout state into the Preview shell without changing native behavior |
| `useMonitoring()` | Reads `lastUpdate`, `monitorResult`, and `isMonitoring` for shell status | Expand the destructure only to data already exposed by the context and needed for truthful status; do not add context behavior |
| `useUpdate()` | Supplies update banners and install callback | Preserve unchanged; Preview remains disabled by `UpdateContext` and Rust/plugin policy |
| `scannerStatus` | Polls `get_scanner_status` every two seconds | Stable keeps the poll; Preview skips the poll and reports scanner/live integration as disabled |
| `scanner-hooked` listener | Invokes `show_notification` | Stable keeps the listener; Preview does not register it |
| `sidebar-mode-changed` listener | Updates body class and React state | Preserve |
| `sidebar-prepare` listener | Reorders shell and adjusts navigation border before native resize | Preserve; target a named primary navigation element rather than an ambiguous first `nav` in the new shell |
| `useUIIcons()` | Loads current UI icons through `read_file_bytes` | Preserve as the existing icon source; no new raster files |
| `screens` object | Maps all 20 IDs to lazy screen components | Preserve the same lazy imports and component mapping; Dashboard gains `onNavigate` just as Market already has it |
| root providers | `ThemeProvider → UiProvider → MonitoringProvider → UpdateProvider` | Preserve exact provider order |
| `OverlayApp` | Deliberately excludes `MonitoringProvider` | Do not edit or wrap it in the command-center shell |
| `SetupScreen` | Handles first-run setup and already gates startup hotkeys/scanner in Preview | Preserve; it remains outside the shell redesign |

The current inline `NAV_ITEMS` array is duplicated conceptually by `PreviewNavigation`'s group list. Stage 4A removes that duplication through one route registry.

### 3.2 `src/components/PreviewNavigation.jsx`

The accepted transitional component already provides six groups, all 20 route IDs, collapsed-group persistence, favorites, keyboard-operable buttons, an isolated-profile message and the `PreviewImport` entry. It is fixed at 208px and has no compact rail, navigation drawer or global-search integration.

Stage 4A replaces it with the command-center navigation. The following accepted behavior remains:

- Six groups: Today, Collection, Planning, Trading, Journal & Tools, Application.
- Every current route appears exactly once.
- Active selection is visible and exposed with `aria-current="page"`.
- The import control remains reachable.
- Navigation preferences remain Preview-profile browser storage.
- Storage failure remains a visible alert.

Favorites are retained as a convenience but do not create duplicate route entries in the semantic navigation tree. A favorite marker may decorate an existing row or appear in a clearly labeled shortcuts region whose buttons still refer to the same registry entry.

### 3.3 `src/screens/Dashboard.jsx`

Dashboard remains the owner of its existing data access, calculations and event handlers. Stage 4A changes how those results are arranged; it does not move game logic into the presentation layer.

Current context inputs from `useMonitoring()` are:

- `exportData`, `worldState`, `spIncursions`, `arbys`, `archonModifiers`, `arbitrationModifiers`.
- `dict`, `suppDict`, `EC`, `ERg`, `EI`, `nameToImage`, `uniqueNameToName`, `ES`, `ENWRawRewards`, `ExportImages`, `ExportTextIcons`, `arbyTiers`.
- `rawInventory`, `inventoryData`, `allPrices`, `cardImagesPath`.
- `manualRefresh` and `lastUpdate`.

Current local state remains owned by Dashboard:

- Local world-state copy and loading state.
- Bounty cycle state.
- Fissure, Archimedea and bounty tabs.
- Baro, wishlist, Descendia and visibility-panel state.
- UI icon/frame paths.
- 1999 calendar month/day state.
- `dashboard_hidden_cards` persistence.
- `nightwave_seen_below_goal` persistence.
- Descendia expanded-week state and reset behavior.

Current side effects remain in Dashboard:

- Load current icons and mod-frame paths.
- Persist hidden-card selection.
- Persist Nightwave below-goal state.
- Initialize the 1999 calendar selection.
- Mirror context world state into local loading state.
- Fetch and refresh the existing bounty-cycle source.
- Delegate manual refresh to `manualRefresh`.

No endpoint, interval, parser, formula, ownership rule, market-price rule or persistence key changes in Stage 4A.

### 3.4 Existing 19 Dashboard surfaces

Each existing `cards` entry remains a canonical React node created by `Dashboard.jsx`. The new Preview view places those nodes; it does not recreate their contents.

| ID | Surface | Preserved behavior | Stage 4A placement |
|---|---|---|---|
| `timers` | World timers | Existing cycles, countdowns and conditional presence | All activities / Now |
| `alerts` | Alerts | Empty/populated rendering and rewards | All activities / Now |
| `arb` | Arbitration | Current/upcoming, time and grade | All activities / Now |
| `inf` | Steel Path incursions | Nodes and rewards | All activities / Now |
| `fiss` | Fissures | Normal, Steel Path and Void Storm tabs | Promoted Live activities; canonical card remains the one source |
| `inv` | Invasions | Factions, rewards, progress | All activities / Now |
| `bounty` | Bounties | Six location tabs and rewards | All activities / Activities & rotations |
| `nightwave` | Nightwave | Challenge, progress and below-goal persistence | Promoted Live activities |
| `sortie` | Sortie | Stages, modifiers and expiry | All activities / Activities & rotations |
| `hunt` | Archon Hunt | Stages, modifiers and expiry | All activities / Activities & rotations |
| `arch` | Archimedea | Deep and Temporal tabs | All activities / Activities & rotations |
| `desc` | Descendia | Current rotation and upcoming dialog | All activities / Activities & rotations |
| `circuit` | Circuit | Current reward and ownership presentation | All activities / Activities & rotations |
| `1999` | 1999 calendar | Month/day selection and details | All activities / Activities & rotations |
| `baro` | Baro Ki'Teer | Visit state, countdown and stock dialog | Promoted Live activities |
| `event` | Events | Rows, rewards and expiry | All activities / News & offers |
| `deal` | Daily deals | First deal, stock and discount | All activities / News & offers |
| `sales` | Market sales | Offers and wishlist dialog | All activities / News & offers |
| `news` | News | Text/time and `open_url` links | All activities / News & offers |

Promoting Fissures, Baro and Nightwave means moving the existing card nodes into the right column. It does not render a second copy. If the user hides one through Dashboard customization, its promoted slot disappears and the layout closes the gap. The remaining cards appear once under the existing Now, Activities & rotations, and News & offers groupings.

### 3.5 Current theme and localization contracts

`ThemeContext` owns 14 themes: Vitruvian, Corpus, Fortuna, Equinox, Harrier, Grineer, Stalker, Conquera, Lunar Renewal, Baruuk, Dark Lotus, Deadlock, Legacy and POM-2. `src/index.css` exposes the current base variables:

- `--color-bg`
- `--color-panel`
- `--color-accent`
- `--color-accent-rgb`
- `--color-accent-secondary`
- `--color-text`
- `--color-text-dim`
- `--glow-color`

Stage 4A semantic tokens derive from those variables. ThemeContext and the existing theme definitions are not edited.

`UiContext` loads English first and overlays the selected locale, so missing locale keys safely fall back to English. Stage 4A adds new command-center strings to `en.json` only. It does not fabricate translations. All 15 locales continue to work through the documented English fallback, and untranslated Stage 4 strings are listed in the evidence report for later human translation.

## 4. Stage 4A product behavior

### 4.1 Preview shell

Desktop Preview uses a 248px grouped navigation, a 70px global header and a route viewport. At widths below 1050px, navigation becomes a 72px icon rail. A real menu button opens a 248px grouped drawer. The drawer traps focus while open, closes with Escape or its close control, and restores focus to the menu button.

The route viewport itself stays `overflow: hidden`. Each ordinary Preview page owns one named vertical scroller. Unmigrated screens continue using their current `PageLayout` scroll owner until their Stage 4 route migration. This prevents the shell from creating a second vertical page scrollbar around existing pages.

The global header contains:

- Compact-menu control when the rail is active.
- Route search.
- Truthful inventory-sync status from `monitorResult`, `statusText` and `lastUpdate`.
- A fixed Preview capability status stating that live integrations are disabled.
- `Preview · Isolated profile` identity.
- An overflow menu containing the existing profile-import entry and other shell-only actions that are actually available.

Stage 4A search covers the 20 registered routes and their verified labels/search aliases. Its placeholder says `Search screens…`; it does not claim to search items or recipes yet. Later stages may register item providers behind the same search interface. Search supports pointer selection, Arrow Up/Down, Enter and Escape, and returns focus predictably.

Warframe.Market connection is not shown in Stage 4A because no reliable application-level connection hook currently exists. Notification/overlay ownership and scanner state are summarized as `Disabled in Preview`, which is a build-capability fact rather than a live probe. No synthetic `Data up to date` claim from the mockup ships.

### 4.2 Dashboard composition

The production Preview Dashboard follows the approved visual hierarchy:

1. `Your next adventure` page identity and one-line explanation.
2. Three large summary panels.
3. `Continue your plans` in the main column.
4. A right-hand `Live activities` column using the canonical Fissures, Baro and Nightwave cards.
5. `Since this session` using real in-memory activity history when present and an explicit empty state otherwise.
6. `Ready in your Foundry` using existing parser output.
7. `All activities`, preserving every non-promoted Dashboard card and the visibility controls.

The three summary panels are:

| Summary | Stage 4A source | Truth rule |
|---|---|---|
| Tracked targets | Fixed pre-capability state supplied by `dashboardViewModel` | Always `0` and `Not set up yet` until Stage 4C's real repository exists |
| Ready to craft | `inventoryData.craftable` entries whose existing `readyToCraft` field is exactly `true` | Count and rows come directly from parser results; Stage 4A does not recompute ingredients |
| New activity | `notificationHistory` entries produced in the current app session | Label explicitly says `this session`; empty means zero, never an invented count |

The Foundry strip shows at most two existing `readyToCraft` records, using `baseName || bpName`, the existing resolved image, and a `View in Foundry` route action. It does not alter ingredient allocation or claim that an item is currently building or ready to claim.

The session panel summarizes real `notificationHistory` records. It does not load inventory history, infer deltas from the current inventory, or manufacture `+12 items` / `+3 mastered` values from the mockup.

### 4.3 Truthful pre-target empty state

Stage 4A does not create a target store, infer targets from Relic Planner, or add a hidden production fixture mode.

`Continue your plans` renders:

- `0 tracked targets`.
- A plain explanation that no Farming Targets exist in this Preview build.
- An `Add a farming target` button.
- On activation, an inline status message: `Farming Targets are not available in this Preview build yet.`

The button does not navigate to Relic Planner, create local storage, or imply that data was saved. Its callback boundary is named `onAddFarmingTarget`. Stage 4C replaces the informational handler with navigation to the real route and repository without redesigning the panel.

Controlled component fixtures may show the populated Rhino Prime/Lex Prime composition solely for screenshot comparison with the approved mockup. Fixture data lives outside `src/`, is labeled synthetic, and cannot be enabled from the packaged application.

### 4.4 Loading, empty and error behavior

- World-state loading uses the command-center loading surface while retaining the existing refresh control.
- Missing world state does not hide the shell or navigation.
- No inventory produces `Inventory not available` for Foundry readiness rather than `0 ready`, because zero and unknown are different states.
- An empty `craftable` array produces `0 ready to craft`.
- Empty `notificationHistory` produces `No new activity this session`.
- Hidden promoted cards do not reappear in a different location.
- If all 19 cards are hidden, the recovery state still exposes Refresh and `Choose visible cards`.
- Recoverable status errors use text and icon treatment, not color alone.

## 5. Component boundaries

### 5.1 Logic ownership rule

```text
MonitoringContext and existing parsers
        ↓ unchanged data and calculated flags
Dashboard.jsx
        ↓ existing cards, handlers and raw presentation inputs
dashboardViewModel.js
        ↓ normalized display-only model
PreviewDashboardView.jsx
        ↓ command-center DOM and callbacks
Preview shell
```

`dashboardViewModel.js` may select, count, label and normalize existing output. It may not calculate crafting requirements, ownership, mastery, reward value, market value, fissure value, notification eligibility or target progress.

### 5.2 Shell component contracts

| Component | Inputs | Owns | Must not own |
|---|---|---|---|
| `PreviewAppShell` | Active route, route content, route registry, status model, navigation callbacks, UI icons, sidebar mode | Overall grid, expanded/compact choice, drawer state, route viewport | Route data, native commands, screen calculations |
| `PreviewNavigation` | Registry, active ID, icons, navigation callback, translation function | Six groups, active treatment, favorite/collapse browser preferences, visible nav scrolling | Route components or native sidebar resizing |
| `PreviewGlobalHeader` | Search component, status summary, profile text, menu actions | Header layout and overflow menu state | Invented connectivity or polling |
| `PreviewRouteSearch` | Registry and `onNavigate` | Query, result highlight, keyboard selection, no-match state | Item/catalog searching before providers exist |
| `PreviewStatusSummary` | Normalized status model | Text/icon rendering and details popover | Tauri invocation or source-state derivation |
| `PreviewPage` | Eyebrow, title, summary, actions, content | One route-level vertical scroll owner and page header | Business logic |

### 5.3 Shared visual primitives introduced now

| Component | Stage 4A use | Future use |
|---|---|---|
| `PreviewButton` | Header, empty state, route actions | All command-center actions |
| `PreviewPanel` | Summary cards, plan area, session and Foundry strips | All raised workspaces |
| `PreviewStatusBadge` | Preview identity and status labels | Statuses, ownership, safety and warnings |
| `PreviewDataState` | Loading, empty, unavailable and recoverable error panels | Shared route data states |

These primitives accept content and semantic variants. They do not embed Dashboard strings or logic.

### 5.4 Dashboard presentation contract

`PreviewDashboardView` receives:

- `model`: serializable summary/status data from `createDashboardViewModel`.
- `cards`: the current 19 keyed React nodes from `Dashboard.jsx`.
- `promotedCardIds`: fixed to `fiss`, `baro`, `nightwave` for this slice.
- `sections`: the accepted Now / Activities & rotations / News & offers registry.
- `loading` and recoverable-error state.
- `onRefresh`, `onCustomize`, `onNavigate`, and `onAddFarmingTarget`.
- Existing modal nodes remain siblings owned by `Dashboard.jsx`, not children rebuilt by the view.

The view never calls `invoke`, reads local storage, fetches data, or imports MonitoringContext.

## 6. Route and status contracts

### 6.1 Single route registry

The registry contains, for every current route:

- `id`
- `groupId`
- `labelKey`
- English fallback label
- existing icon filename or Lucide component
- verified search aliases
- `available: true`

It contains exactly the 20 current IDs. Farming Targets is not inserted until Stage 4C. Because Stable's current flat icon order differs from Preview's grouped order, each record carries both `stableOrder` and `groupOrder`; neither product's accepted order is silently changed. The registry exports the Stable-sorted list, six Preview groups and icon filename list so Stable navigation, Preview navigation, route search and route tests read one source.

| ID | Stable order | Preview group / order | Label fallback | Icon source |
|---|---:|---|---|---|
| `dashboard` | 1 | Today / 1 | Dashboard | `IconDashboard.png` |
| `prime-resurgence` | 2 | Planning / 4 | Prime Resurgence | `BaroKiTeerFlat.png` |
| `market` | 3 | Trading / 1 | Market | `IconMarket.png` |
| `inventory` | 4 | Collection / 1 | Inventory | `IconInventory.png` |
| `foundry` | 5 | Planning / 1 | Foundry | `IconFoundry.png` |
| `mods` | 6 | Collection / 3 | Mods | `Mods.png` |
| `rivens` | 7 | Trading / 2 | Rivens | `IconRiven.png` |
| `relics` | 8 | Planning / 2 | Relics | `IconRelic.png` |
| `relic-planner` | 9 | Planning / 3 | Relic Planner | `VoidSymbol.png` |
| `collectibles` | 10 | Collection / 5 | Collectibles | `GrimoireMarker.png` |
| `cosmetics` | 11 | Collection / 4 | Cosmetics, Decorations, Emotes | `Appearance.png` |
| `adversaries` | 12 | Journal & Tools / 2 | Adversaries | `Adversaries.png` |
| `mastery` | 13 | Collection / 2 | Mastery | `IconMastery.png` |
| `history` | 14 | Journal & Tools / 1 | History | installed Lucide `BarChart3` |
| `maps` | 15 | Journal & Tools / 3 | Maps | `IconMap.png` |
| `wiki` | 16 | Journal & Tools / 4 | Wiki | `Wiki.png` |
| `notes` | 17 | Journal & Tools / 5 | Notes | `IconNotes.png` |
| `checklist` | 18 | Journal & Tools / 6 | Checklist | `IconChecklist.png` |
| `settings` | 19 | Application / 1 | Settings | `IconSettings.png` |
| `about` | 20 | Application / 2 | About | `IconInfo.png` |

Search terms are generated from the real translated label, English fallback label, route ID tokens and real group label. Stage 4A adds no guessed Warframe terminology or hidden synonyms. This keeps search useful across locales without creating another manually maintained alias catalog.

Stable continues rendering its current icon rail from that registry. Registry extraction must produce byte-identical Stable navigation markup for the same state.

### 6.2 Status normalization

`App.jsx` constructs a display-only shell status object:

```text
inventorySync:
  state: idle | success | cached | error
  label: translated existing sync label
  detail: statusText or formatted lastUpdate

liveIntegrations:
  state: disabled
  label: Live integrations disabled
  detail: Preview cannot own monitoring, hotkeys, notifications or overlays

profile:
  state: preview
  label: Preview
  detail: Isolated profile
```

`isMonitoring` may refine Stable-only display but cannot make Preview appear active. Stage 4A does not invent WFM status.

### 6.3 Exact new English fallback strings

The `en.json` change uses the existing flat dotted-key convention inside the `ui` object. The planned keys and English values are:

| Key | English fallback |
|---|---|
| `preview.shell.menu` | Menu |
| `preview.shell.close_navigation` | Close navigation |
| `preview.shell.search_placeholder` | Search screens… |
| `preview.shell.search_results` | Screen results |
| `preview.shell.search_no_results` | No matching screens |
| `preview.shell.more_actions` | More actions |
| `preview.shell.import_profile` | Import a profile copy |
| `preview.status.preview` | Preview |
| `preview.status.isolated_profile` | Isolated profile |
| `preview.status.live_disabled` | Live integrations disabled |
| `preview.status.live_disabled_detail` | Monitoring, hotkeys, notifications and overlays are disabled in Preview. |
| `preview.dashboard.eyebrow` | Today |
| `preview.dashboard.heading` | Your next adventure |
| `preview.dashboard.subtitle` | Your collection, plans, and live activities in one place. |
| `preview.dashboard.tracked_targets` | tracked targets |
| `preview.dashboard.targets_not_ready` | Not set up yet |
| `preview.dashboard.ready_to_craft` | ready to craft |
| `preview.dashboard.new_activity` | new activity this session |
| `preview.dashboard.continue_plans` | Continue your plans |
| `preview.dashboard.no_targets` | No farming targets yet |
| `preview.dashboard.no_targets_detail` | Farming Targets are not available in this Preview build yet. |
| `preview.dashboard.add_target` | Add a farming target |
| `preview.dashboard.live_activities` | Live activities |
| `preview.dashboard.session` | Since this session |
| `preview.dashboard.no_session_activity` | No new activity this session |
| `preview.dashboard.foundry_ready` | Ready in your Foundry |
| `preview.dashboard.inventory_unavailable` | Inventory not available |
| `preview.dashboard.view_foundry` | View in Foundry |
| `preview.dashboard.view_history` | View history |
| `preview.dashboard.view_all_activities` | View all live activities |
| `preview.dashboard.all_activities` | All activities |
| `preview.dashboard.customize` | Choose visible cards |

Existing `nav.*`, `sync.*`, Dashboard card, tab and dialog strings remain the source for existing content. If implementation reveals that a new label is necessary, it must be added to this list through plan approval rather than embedded as an unregistered literal.

## 7. Exact authorized application-source files

No application-source file may be added, modified, moved or deleted outside this list without a new approval.

### 7.1 Modified files

| File | Exact change |
|---|---|
| `src/App.jsx` | Import the single route registry and new Preview shell; preserve the Stable branch; pass Dashboard navigation; construct truthful status props; skip scanner polling and scanner-hook notification registration in Preview; retain provider/setup/overlay/update/sidebar behavior |
| `src/screens/Dashboard.jsx` | Keep all existing data, derived values, cards, handlers and dialogs; accept `onNavigate`; build the display-only model; branch Preview into `PreviewDashboardView`; preserve Stable JSX exactly |
| `src/lib/i18n/en.json` | Add English fallback keys for shell search/status, Dashboard hierarchy, truthful target state, session state and data-state labels |

### 7.2 New files

| File | Responsibility |
|---|---|
| `src/preview/navigation.js` | Single 20-route registry, six groups, icon filename export and search aliases |
| `src/preview/shell/PreviewAppShell.jsx` | Responsive command-center shell and drawer state |
| `src/preview/shell/PreviewNavigation.jsx` | Expanded sidebar, compact rail and drawer content |
| `src/preview/shell/PreviewGlobalHeader.jsx` | Search/status/profile/overflow composition |
| `src/preview/shell/PreviewRouteSearch.jsx` | Route-only search and keyboard behavior |
| `src/preview/shell/PreviewStatusSummary.jsx` | Truthful normalized status display |
| `src/preview/shell/PreviewPage.jsx` | Page header and one primary vertical scroll owner |
| `src/preview/components/PreviewButton.jsx` | Shared action variants and focus behavior |
| `src/preview/components/PreviewPanel.jsx` | Shared raised-surface structure |
| `src/preview/components/PreviewStatusBadge.jsx` | Shared semantic badge |
| `src/preview/components/PreviewDataState.jsx` | Loading, empty, unavailable and recoverable error surfaces |
| `src/preview/dashboard/PreviewDashboardView.jsx` | Dashboard command-center composition only |
| `src/preview/view-models/dashboardViewModel.js` | Pure display selection/count/normalization from existing values |
| `src/preview/styles/preview-tokens.css` | Command-center semantic tokens derived from existing theme variables |
| `src/preview/styles/preview-shell.css` | Shell, header, nav, drawer and route viewport |
| `src/preview/styles/preview-components.css` | Buttons, panels, badges, states and focus rules |
| `src/preview/styles/preview-dashboard.css` | Dashboard desktop/compact layout and card placement |
| `src/preview/styles/preview-responsive.css` | Shared 1050px/height/900×500 rules and reduced-motion behavior |

### 7.3 Deleted files

| File | Replacement |
|---|---|
| `src/components/PreviewNavigation.jsx` | `src/preview/shell/PreviewNavigation.jsx` plus the single registry |
| `src/components/PreviewDashboardLayout.jsx` | `src/preview/dashboard/PreviewDashboardView.jsx` |

Deletion occurs only after imports have moved and component tests prove the replacement behavior. Native Git diff generates the patch; no custom patch generator is used.

### 7.4 Explicitly unchanged source

The following are registered as unchanged and hashed after implementation:

- `src/components/PreviewImport.jsx`
- `src/components/UI.jsx`
- `src/contexts/MonitoringContext.jsx`
- `src/contexts/ThemeContext.jsx`
- `src/contexts/UpdateContext.jsx`
- `src/contexts/UiContext.jsx`
- `src/lib/buildProfile.js`
- `src/lib/inventoryParser.js`
- `src/index.css`
- Every screen except `Dashboard.jsx`
- All `src-tauri/**` files
- `package.json`, package-manager lockfiles and `src-tauri/Cargo.lock`
- Tauri config, capabilities, updater config and bundle metadata
- All raster assets

## 8. Semantic token map

`preview-tokens.css` scopes tokens beneath `.preview-command-center` and maps them to the current themes:

| New role | Existing source |
|---|---|
| `--preview-canvas` | `var(--color-bg)` |
| `--preview-surface` | `var(--color-panel)` |
| `--preview-surface-raised` | panel plus a fixed translucent white layer |
| `--preview-surface-selected` | `rgba(var(--color-accent-rgb), 0.12)` |
| `--preview-line` | `rgba(var(--color-accent-rgb), 0.22)` |
| `--preview-line-subtle` | translucent current text |
| `--preview-text` | `var(--color-text)` |
| `--preview-muted` | `var(--color-text-dim)` |
| `--preview-accent` | `var(--color-accent)` |
| `--preview-detail` | `var(--color-accent-secondary)` |
| `--preview-focus` | `var(--color-accent)` |
| `--preview-positive` | accessible green with text/icon reinforcement |
| `--preview-warning` | accessible amber with text/icon reinforcement |
| `--preview-danger` | accessible red with text/icon reinforcement |
| `--preview-channel` | accent-derived Preview treatment |

Spacing tokens are 4, 8, 12, 16, 20, 24 and 32px. Radius, shadow, typography and transition tokens are centralized. Components cannot introduce page-specific raw accent colors. A `prefers-reduced-motion` rule removes nonessential movement.

## 9. Fixture states

Fixture data exists only under `.preview-work/stage4-validation/fixtures/`. Each fixture exports the exact presentation model consumed by production components and includes `fixtureSource: "synthetic-ui-only"`.

### 9.1 Shell fixtures

1. Expanded desktop, Dashboard active, successful recent sync.
2. Expanded desktop, cached sync.
3. Expanded desktop, sync error with a long detail string.
4. Expanded desktop, never-synced idle state.
5. Compact rail with drawer closed.
6. Compact rail with drawer open.
7. Compact drawer at 900×500 with short-height navigation scrolling.
8. Route-search empty query.
9. Route-search one match.
10. Route-search multiple matches with keyboard highlight.
11. Route-search no matches.
12. Long translated route labels through verified source strings.
13. Navigation preference storage failure.
14. Each of the 14 existing themes using the same DOM and geometry expectations.

### 9.2 Dashboard fixtures

1. Approved-mockup populated composition, explicitly synthetic.
2. Production Stage 4A pre-target state: zero targets and informational action.
3. Inventory unavailable: readiness unknown.
4. Inventory available with zero ready recipes.
5. Inventory available with two ready recipes.
6. More than two ready recipes, proving the strip truncates visibly and offers `View all in Foundry`.
7. Empty in-session activity.
8. Populated in-session activity.
9. World-state loading.
10. Recoverable world-state error.
11. Sparse world state where conditional cards are absent.
12. All 19 cards visible.
13. Fissures hidden.
14. Baro hidden.
15. Nightwave hidden.
16. All 19 cards hidden with recovery controls.
17. Bounty tabs: Holdfasts, Cavia, Hex, Cetus, Deimos and Vallis.
18. Fissure tabs: Normal, Steel Path and Void Storm.
19. Archimedea tabs: Deep and Temporal.
20. 1999 calendar month/day interaction.
21. Baro stock dialog open.
22. Wishlist dialog open.
23. Descendia upcoming dialog open, expanded, close and reopen reset.
24. Long labels and large counts.

Fixture screenshots cannot be presented as live-game evidence. Packaged tests separately capture the actual profile-backed Stage 4A empty-target state.

## 10. Visual landmarks

These are acceptance ranges, not instructions to reproduce the mockup with absolute positioning.

### 10.1 Desktop — 1440×900

| Landmark | Required result |
|---|---|
| Expanded navigation | 236–250px wide; left edge fixed; visible separation line |
| Global header | 68–72px high; starts after navigation; route search approximately 440–470px wide |
| Route content origin | 24–32px inside the route viewport, visually aligning near the mockup's x=276 |
| Page identity | `Your next adventure` is the dominant 26–34px heading |
| Main Dashboard split | Main column roughly two-thirds; Live activities 310–360px; 24–32px gap and visible divider |
| Summary row | Three equal panels, one row, 12–16px gaps, no clipped labels |
| Continue panel | Dominant broad surface beneath summaries |
| Live activities | Fissures, Baro and Nightwave stacked once in the right column |
| Session panel | Full main-column width below plan state |
| Foundry strip | Full available width below the first Dashboard band; no claim shown from unavailable inventory |
| All activities | Begins after priority content and contains every remaining visible registered card |
| Scroll | One route-level vertical scrollbar; no page-level horizontal scrollbar |

### 10.2 Intermediate — 1200×800 and 1024×640

- At 1200px, expanded navigation may remain if the main column and 310px live column fit without clipping.
- At the 1050px threshold, the shell changes once to the compact rail; it does not oscillate based on scrollbar appearance.
- At 1024×640, the compact rail is active, the live column stacks below the priority region, and summary panels may remain three across only when every label fits.
- Page actions wrap within the page header; none move offscreen.
- Navigation scrolling and route scrolling remain distinct, visible regions.

### 10.3 Compact — 900×500

| Landmark | Required result |
|---|---|
| Compact rail | 68–72px wide; icons remain 40–44px targets |
| Global header | 58–62px high; menu, route search, concise sync state and overflow remain visible |
| Drawer | 236–250px wide, fully within viewport, independently and visibly scrollable if needed |
| Content inset | 16–20px; content begins after the 72px rail |
| Page heading | 22–26px and fully visible |
| Priority layout | Single vertical flow; summary panels wrap without horizontal scrolling |
| Target empty state | Explanation and action are visible before lower-priority activity content |
| Live activities | Stack below the plan area; no permanent right column |
| Existing cards | Reachable by vertical scroll; internal tabs wrap or retain an obvious bounded scroll only where already required |
| Scroll | `documentElement` and body do not horizontally overflow; exactly one primary route scroller |

### 10.4 Visual comparison rule

The component fixture matching the approved mockup is captured at exactly 1440×900 and 900×500. Comparison checks measure the landmarks above and generate side-by-side images. Screenshot difference is diagnostic only. Human review decides whether the result evokes the approved design; passing geometry alone cannot accept Stage 4A.

## 11. Accessibility and interaction contract

- All navigation entries are real buttons with visible text in expanded/drawer modes and accessible names in rail mode.
- The active route uses `aria-current="page"`.
- Route search uses combobox/listbox semantics and documented arrow/Enter/Escape behavior.
- Drawer opening moves focus into the drawer; closing restores the opener.
- Escape closes the drawer, search results, overflow menu and existing Dashboard dialogs in their established order.
- Focus rings use the semantic focus token and are never clipped by an overflow container.
- Dashboard summary cards that navigate are buttons or links; informational summaries remain noninteractive.
- `Add a farming target` announces the Stage 4A unavailable message through a polite status region.
- Existing Dashboard tabs remain the current Tabs component, preserving their existing interaction semantics.
- All actions remain reachable at 900×500 by keyboard without horizontal page scrolling.

## 12. Validation tooling and evidence paths

Test tooling is outside application resources:

```text
.preview-work/stage4-validation/
  fixtures/
    shell-fixtures.mjs
    dashboard-fixtures.mjs
  stage4a-component-entry.jsx
  stage4a-component.html
  stage4a-source-facts.py
  stage4a-component-runner.py
  stage4a-visual-compare.py
  stage4a-native-smoke.py
  stage4a-package-batch.py
  stage4a-finalize.py
```

These runners reuse:

- `.preview-work/ubuntu-build/toolkit/common.py`
- `.preview-work/ubuntu-build/toolkit/native_preflight.py`
- `.preview-work/ubuntu-build/toolkit/run_bounded_container.py`
- `.preview-work/ubuntu-build/toolkit/source_facts.py`

Complex shell commands are written to files first. Every path is absolute. Every mutating runner validates its expected checkout, source and output paths before changes. Native preflight isolates/cleans target and AppDir output. Containers wait for a terminal state and propagate the real exit code. Rust builds use `CARGO_BUILD_JOBS=4` under `nice -n 19` with no more than four CPUs.

Permanent evidence is written under:

```text
docs/revamp/stage-4/
  STAGE-4A-FOUNDATION-SHELL-DASHBOARD-SOURCE-PLAN.md
  STAGE-4A-IMPLEMENTATION-REPORT.md
  stage4a-source-register.json
  stage4a-implementation.patch
  stage4a-cumulative.patch
  evidence/
    stage4a-preflight.json
    stage4a-source-facts.json
    stage4a-component.json
    stage4a-stable-markup.json
    stage4a-accessibility.json
    stage4a-theme-matrix.json
    stage4a-visual-landmarks.json
    stage4a-visual-comparison.json
    stage4a-dashboard-desktop.png
    stage4a-dashboard-compact.png
    stage4a-deb-packaged-smoke.json
    stage4a-appimage-packaged-smoke.json
    stage4a-release-artifacts.json
    stage4a-baseline-check.json
    stage4a-evidence-integrity.json
    before-*/
```

Any failed or superseded run is preserved under a descriptive `before-*` prefix. Evidence scripts may be corrected and rerun without a new app-source approval, but every correction is disclosed.

## 13. Test matrix

### 13.1 Source and registry checks

| Check | Required evidence |
|---|---|
| Stage 4 checkout equals accepted Stage 3 state before edits | Per-file comparison and hashes |
| Route registry contains exactly 20 unique current IDs | Printed registry table and duplicate/missing assertion |
| Six navigation groups match accepted grouping | Printed group-to-ID table |
| Every lazy screen mapping has one registry entry | Bidirectional source check |
| Every registry icon references an existing approved asset or installed Lucide icon | Path/component list |
| New Preview components contain no Tauri imports or `invoke` calls | Static import/invocation scan |
| No new raster files | Before/after asset inventory and hashes |
| No dependencies or lockfiles changed | Hash comparison |
| High-stakes calculation standard | Recorded `NOT APPLICABLE`: no calculation is introduced or changed; Foundry readiness consumes the existing parser's boolean directly |

### 13.2 Stable regression matrix

Stable renders before/after exact markup for:

1. Shell with idle update state.
2. Shell with update available.
3. Shell in left sidebar mode.
4. Shell in right sidebar mode.
5. Dashboard loading.
6. Dashboard sparse/empty world state.
7. Dashboard fully populated.
8. Dashboard all cards hidden.
9. Fissure tabs across all three values.
10. Bounty tabs across all six values.
11. Archimedea tabs across both values.
12. Each of the three Dashboard dialogs open.

Where full-root byte equality is impractical because of generated IDs or time text, the fixture freezes time and source inputs. Any remaining dynamic field is named and compared structurally. Stable navigation order, labels, tab order, command names, payloads and enabled states must remain identical.

### 13.3 Preview shell component matrix

- 20/20 route entries activate the correct `activeTab` exactly once.
- Desktop expanded navigation and compact rail preserve route order.
- Drawer contains all 20 routes exactly once and restores focus.
- Search matches exact labels and verified aliases; no-match is explicit.
- Search keyboard selection navigates and closes results.
- Import remains reachable from the overflow/profile area.
- Navigation collapse/favorite preferences survive reload.
- Storage failure is visible and does not block navigation.
- Inventory-sync labels match `idle`, `success`, `cached` and `error` inputs.
- Preview live-integration and isolated-profile status are always explicit.
- Update availability cannot appear as enabled Preview behavior.
- The shell contains no fake WFM connection status.

### 13.4 Dashboard component matrix

- Every fixture in section 9 renders without an uncaught error.
- Production pre-target state is exactly zero and contains no synthetic target names/counts.
- `Add a farming target` produces only the truthful unavailable status.
- Ready count equals the number of input records with `readyToCraft === true`.
- Unknown inventory is distinct from an empty ready list.
- Session count equals the supplied real-history array length.
- Fissures, Baro and Nightwave each appear at most once.
- All 19 registered card IDs are reachable when visible.
- Hiding any promoted card removes it without duplication elsewhere.
- All-hidden state exposes refresh and customization.
- Existing tab selections, calendar selection, dialogs and Descendia reset behave as before.
- `View in Foundry`, `View history`, Refresh and Customize dispatch only their named callbacks.

### 13.5 Responsive and visual matrix

For 1440×900, 1200×800, 1024×640 and 900×500:

- No horizontal body/page overflow.
- No clipped primary action.
- Exactly one primary route vertical scroller.
- Navigation scroll, when required by height, is visible and bounded.
- Drawer and menus remain within the viewport.
- Focus remains visible after every layout change.
- Text/artwork do not overlap.
- Every current route can be selected.

All 14 themes render the same shell and Dashboard fixture at 1200×800. The matrix records computed semantic token values, text/background contrast warnings and landmark geometry. Vitruvian additionally receives all four viewport captures. Equinox and one warm theme receive 900×500 captures to prove layout is palette-independent.

### 13.6 Native Preview safety matrix

Instrumentation records frontend Tauri invocation names while exercising initial load, refresh, all shell controls, all 20 routes, reload and Dashboard interactions.

Required results:

- Zero Preview invocations of `get_scanner_status` from the shell poll.
- Zero Preview invocations of `show_notification` from the `scanner-hooked` listener.
- Zero Preview invocations of `relay_event` and `stop_log_scanner`.
- Zero marketplace mutation invocations.
- The four market mutation IPC commands remain directly rejected when invoked as negative probes.
- Existing guarded live-integration and updater negative probes remain rejected.
- No stable profile path or legacy-adjacent profile is read or created.
- Preview import remains available and uses the existing isolated import implementation.

The first two checks specifically validate the new `App.jsx` Preview gating. The remaining checks prove the shell refactor did not regress accepted Stage 2/3 safety.

### 13.7 Linux package matrix

Stage 4A changes the shell used by every route, so it receives full Debian and AppImage validation rather than waiting for a later phase batch.

For both artifacts:

1. Rebuild from the Ubuntu 24.04 baseline with the bounded-container toolkit.
2. Record binary and package hashes.
3. Install or mount in a disposable, network-disabled environment.
4. Launch with isolated XDG/HOME paths.
5. Run the accepted Stage 3K 96-check package suite.
6. Run every new Stage 4A shell, Dashboard, accessibility and invocation check.
7. Exercise all 20 routes at 1200×800 and 900×500.
8. Reload and confirm navigation, theme and Dashboard visibility persistence.
9. Remove/purge and verify owned files are gone.

The report lists individual checks and grouped arithmetic. It does not use a total pass count as a substitute for screenshots, raw DOM text, invocation logs or human visual review. The expected baseline is 96 accepted checks per artifact plus the Stage 4A assertions; the final total is derived from the actual harness rather than hard-coded in advance.

## 14. Package and installation impact

### 14.1 Expected changes

- Preview JavaScript and CSS bundle hashes change.
- Preview native binary, Debian package and AppImage hashes change because the frontend bundle is embedded.
- Package byte size may change; before/after bytes are recorded rather than predicted.
- No new external network dependency or runtime service is introduced.
- No new raster asset is bundled.

### 14.2 Expected unchanged behavior and metadata

- Product name, identifier, executable name, desktop entry and icon identity.
- Preview data root and webview-storage isolation.
- Updater-disabled Preview configuration.
- Tauri permissions/capabilities.
- Rust commands and their guards.
- Debian/AppImage dependency set.
- Stable installed package and user data.
- Import journal, locking, backup, rollback and crash recovery.
- All overlay binaries/windows and their behavior.

The current accepted Stage 3K packages are copied to a `before-stage4a-packages/` evidence directory before a shared output path is cleaned. The package index marks whether each recorded artifact remains live on disk. No package is installed on the host; installation and removal occur only in disposable containers.

## 15. Implementation order after approval

1. Reconstruct and verify the fresh Stage 4 checkout.
2. Freeze source facts, route labels, current Dashboard card IDs, current selectors and mockup hashes.
3. Add the single route registry and prove the Stable nav output remains identical.
4. Add semantic tokens and shared primitives.
5. Add shell components, route search and status normalization.
6. Wire the Preview shell in `App.jsx`, including Preview-only scanner poll/listener suppression.
7. Add the pure Dashboard view-model adapter.
8. Add the command-center Dashboard view and wire `Dashboard.jsx` through the Preview branch.
9. Run source, component, Stable-regression, accessibility, responsive and visual checks.
10. Stop for approval if an application defect or out-of-scope source need appears.
11. Rebuild Debian and AppImage with the bounded toolkit.
12. Run the complete package and safety matrices.
13. Generate native Git incremental/cumulative patches, evidence integrity records and the implementation report.
14. Present desktop/compact screenshots and evidence for explicit Stage 4A acceptance.

## 16. Stop conditions

Implementation stops before correction if any of the following occurs:

- The fresh checkout does not reproduce the accepted Stage 3 file state.
- A 21st route is needed before Stage 4C.
- A real Farming Targets count or record is needed before its repository exists.
- Ready-to-craft presentation requires changing or reimplementing the parser's calculation.
- A shell status requires a new API, native command or inferred connectivity state.
- Stable markup, behavior, commands or tab order changes.
- Any existing Dashboard card, tab, dialog, customization control or persistence key becomes unreachable.
- A new application file outside section 7 is needed.
- Any Rust, dependency, lockfile, capability, config, package metadata or raster asset change is needed.
- The visual result cannot match the approved command-center direction within the stated layout boundaries.

Test-harness, fixture and evidence-script defects are corrected immediately, preserved and disclosed under the user's standing low-blast-radius rule. Application-source defects or scope changes return for explicit approval.

## 17. Acceptance gate

Stage 4A may be accepted as a Linux Preview milestone only when:

- The live Preview visibly matches the approved Dashboard command-center direction at 1440×900 and 900×500.
- The truthful zero-target state is present and no synthetic target data ships.
- All 20 routes remain reachable in expanded navigation, compact rail, drawer and route search.
- All 19 Dashboard surfaces and their existing controls remain reachable exactly once.
- Stable regression evidence passes.
- Preview performs zero shell-originated scanner polling or scanner-hook notification invocation.
- Existing live-integration, updater, market-mutation and profile-isolation protections still pass.
- All 14 themes map through semantic tokens without layout drift.
- No horizontal page overflow or second route-level vertical scrollbar exists at required sizes.
- Debian and AppImage pass the full Linux package matrix.
- The original 850 tracked-file baseline and accepted Stage 2/3 evidence remain unchanged.
- No AI-generated art, unverified image or new raster asset is present.
- The user reviews the real screenshots and explicitly accepts Stage 4A.

Windows remains **OPEN / BLOCKED**, macOS remains **OPEN / UNAVAILABLE**, a genuine published-version upgrade remains **PENDING**, and exhaustive runtime tracing remains **PENDING**. These independent tracks do not block the Linux Stage 4A implementation and are carried in the acceptance ledger without being relitigated in each routine report.
