# Feature preservation inventory

Baseline: `f30ea7e9f7fe1f12406257018a2a8cff8c21158d`. This is a source inventory, not a runtime audit. Every row remains REQUIRED / RUNTIME PENDING. Stage 2 retains the existing screen implementations and their nested components; these summaries never authorize dropping an unlisted control.

## Hard requirements

- Preserve all existing functionality, notifications, overlays, monitoring, OCR, hotkeys, themes and locales.
- NO AI-GENERATED ART in the application: no generated logos, icons, backgrounds, item images or other visual assets. Previous generated mockups are layout references only and must not be copied into bundles. Use existing legitimate assets, verified official game imagery, and conventional code/CSS UI with established icons. Record source/licensing provenance for additions; unknown provenance requires review.
- Keep React/Tauri/Rust and Windows/Linux/macOS packaging. Validate live capabilities separately; do not claim parity from compilation.
- Preserve first, add features later. Review at each milestone; no automatic continuation past a gate.

## All 20 navigation destinations

Source for each row: `src/screens/<Screen>.jsx`; route IDs from `src/App.jsx`. Same route IDs and components remain in Stage 2.

| ID | Screen | New group | Behaviors to preserve |
|---|---|---|---|
| dashboard | Dashboard | Today | Activity cards, fissure/Archimedea/bounty tabs, rotations, calendar selection, Baro/wishlist dialogs, hidden-card preferences, timers and refresh |
| inventory | Inventory | Collection | All categories, ownership/mastery filters, search/sort, prime sets/parts, quantities, details and acquisition actions |
| mastery | Mastery | Collection | Rank/progress, category views, owned/mastered distinctions, completion information |
| mods | Mods | Collection | Categories, search/filter/sort, rank/count information, card rendering and details |
| cosmetics | Cosmetics | Collection | Cosmetics, decorations and emotes; category/ownership browsing, acquisition details |
| collectibles | Collectibles | Collection | Every collection category, subpanels, location information, known versus unknown progress |
| foundry | Foundry | Planning | Category/status filters, recipe selection, ingredients/quantities, crafted/blueprint distinctions, detail drawer |
| relics | Relics | Planning | Era/refinement grouping, reward details, ownership context, filters/sorting and pricing |
| relic-planner | RelicPlanner | Planning | Existing selection, planning, filters and results; keep distinct from future Farming Targets |
| prime-resurgence | PrimeResurgence | Planning | Rotation, equipment/cosmetics/ownership filters, item availability and details |
| market | Market | Trading | Active orders and tradeable stock, filters/sorts, editable prices, sell/buy/hidden state, listing/update/close/delete actions and authentication |
| rivens | Rivens | Trading | Veiled/unveiled/challenge views, search/filter/sort, stat display, grading/pricing and details |
| history | History | Journal & Tools | Time ranges, metrics, tracked items, search, charts and range controls |
| adversaries | Adversaries | Journal & Tools | Existing adversary records, details and progress views |
| maps | Maps | Journal & Tools | All maps, pan/zoom, configurations, markers/routes, notes, editing, deletion confirmation, context menus and persistence |
| wiki | Wiki | Journal & Tools | Existing browsing/search and external-link behavior |
| notes | Notes | Journal & Tools | Markdown editing, selection, creation/save/delete, dialogs, import/export/share controls where present |
| checklist | Checklist | Journal & Tools | Daily/weekly tasks, completion/reset tracking, hiding/showing, automatic tracking, syndicate/focus information |
| settings | Settings | Application | Every section and nested setting, notification rule editor, monitoring/refresh, asset/cache paths, OCR/overlay configuration, hotkey recorder and management |
| about | About | Application | Version, credits/license, help/disclaimer and project links |

## Cross-screen and background surfaces

- First-run setup and disclaimer, language selection, path browsing, startup readiness.
- Themes and all 15 translation files; UI and game localization remain distinct where currently configured.
- Item/mod/Riven cards; acquisition/grade/help/bug-report dialogs; share bundles; tooltips; scroll/navigation helpers.
- Inventory acquisition/cache/history, export loading, WorldState polling, pricing refresh and cancellation/error paths.
- Notifications: fissure, arbitration, void-traces cap, incoming chat, syndicate cap, syndicate waste, foundry completion, mastery progress, checklist reminder, wishlist sale, bounty availability. Preserve rule creation/edit/delete/enable state, all dynamic filter options, timing/cooldown and sound/position preferences.
- Preserve every hotkey action in Settings' HOTKEY_ACTIONS, including manual OCR and sidebar toggle; record/rebind/remove behavior and modifier validation.
- Preserve main versus mirrored sidebar state synchronization, settings propagation and window startup responsibilities.

## Eight overlay windows

| Window | Retained behavior |
|---|---|
| overlay-tl | Top-left notification toast |
| overlay-tc | Top-center notification toast |
| overlay-tr | Top-right notification toast |
| overlay-riven-current | Current Riven display and refresh |
| overlay-riven-new | New reroll display, selection/closure lifecycle |
| overlay-relic | Reward recognition, ownership/prices, repeated mission cycles |
| overlay-relic-picker | Relic selection information and tier updates |
| overlay-sidebar | Interactive sidebar, mirrored app data and toggle |

Preserve geometry, monitor selection, scaling, visibility, focus/click-through and closure behavior. Exact original properties are in `window-baseline.json`.

## Detailed control evidence and limitations

`surface-register.json` and `SURFACE-REGISTER.md` enumerate source candidates for interaction handlers, rendered controls, state, option definitions, persistence, commands, events and platform branches. IDs are stable within this frozen baseline. Counts are occurrences, not unique features.

The register is regex-derived and intentionally includes non-UI candidates. It is not a claim that every dynamic instance or multiline declaration has been semantically resolved. Before redesigning any screen, inspect its entire frozen source and imported components, expand data-driven menus/tabs, and classify each candidate as preserved, relocated or non-user-facing with evidence. New runtime checks must cover options, not merely opening the screen. Never mark a feature passed from source presence.

Stage 2 changes the shell only; existing screen bodies remain the preservation boundary. The exhaustive per-control runtime matrix is a later validation deliverable, not completed in Stage 1.
