# Stage 3 screen-redesign scope

Status: **RECOMMENDED SCREEN-REDESIGN SCOPE COMPLETE — LINUX**

This document fixes the intended end state of the Preview screen-redesign work after the accepted Dashboard, Inventory, Mastery, Mods and Cosmetics slices. It does not authorize app-source edits or builds. Each recommended screen retains its own source-plan and approval gate.

## Recommended remaining layout slices

| Sequence | Screen | Recommendation | Source-grounded reason |
|---|---|---|---|
| Stage 3E | Cosmetics | Accepted | Fifteen kind tabs and three ownership tabs share a wrapping control surface with no screen-level responsive breakpoints. The 220px auto-fill catalog is sound, so the slice should organize the controls and preserve the existing cards, pagination and acquisition drawer. |
| Stage 3F | Rivens | Accepted | Search, state filters and sort controls now use the accepted bounded Preview layout while stable markup and the existing 200px cards remain preserved. |
| Stage 3G | Relics | Accepted | Search, ownership, squad size, refinement, era, quality, vault state, five sort modes and Void Traces now use the accepted bounded Preview layout while valuation and acquisition logic remain preserved. |
| Stage 3H | Relic Planner | Accepted | The core workflow is three coordinated panels. Below the large breakpoint they become one long vertical stack, which makes selection, needed parts and suggested relics difficult to compare in the 900x500 window. Preserve all planner calculations and state. |
| Stage 3I | Market | Accepted | The accepted Linux slice adds a responsive workspace and Preview mutation-safe presentation while preserving read-only data access and stable behavior. |
| Stage 3J | Settings | Accepted | The validated slice adds section navigation and container-responsive composition, visibly disables Preview live controls, records zero `relay_event`/`stop_log_scanner` calls, and preserves stable markup and interactions. |
| Stage 3K | Maps | Accepted | The map workspace uses an absolute canvas composition, a fixed 320px configuration panel and overlapping floating controls. The plan proposes a specialized narrow-window layout plus two separately identified backend reliability corrections. |

## Screens to retain as-is

| Screen | Recommendation | Reason |
|---|---|---|
| Prime Resurgence | Retain | The screen is compact and already shifts its search/filter row and card grids at responsive breakpoints. A wrapper slice would mostly restyle working behavior. |
| Foundry | Retain | It already has a responsive search/filter composition, auto-fill recipe grid and bounded recipe drawer. Its current recipe-detail workflow is already the intended kind of end state. |
| Collectibles | Retain | Its top-level catalog already scales from two to six columns and uses a bounded detail drawer. Most of its size is catalog and progress logic rather than a layout problem. |
| Adversaries | Retain | It is a small form/results screen with responsive one-, two- and three-column sections. |
| History | Retain | The chart and log already switch from side-by-side to vertical below the large breakpoint, and the chart controls flex within their card. Further work would primarily be polish unless native geometry exposes a concrete failure. |
| Wiki | Retain | This screen is a lightweight controller for the separate wiki webview. Its value lies in tab synchronization and lifecycle commands, not a richer in-app layout. |
| Notes | Retain | It is already a purpose-built full-height editor with a horizontally scrollable file strip and wrapping editor toolbar. Reworking it would add risk around the third-party editor for limited layout gain. |
| Checklist | Retain | Although logic-heavy, its visible sections already use responsive two-to-five-column and auto-fill grids. More work would mostly restyle cards rather than improve access. |
| About | Retain | It is a short, low-frequency attribution and links page with no dense workspace to reorganize. |

Retained screens still receive defect fixes if native evidence reveals clipping, inaccessible controls or incorrect behavior. “Retain” means no pre-planned layout slice; it does not exempt the screen from regression smoke coverage.

## Sequence and estimate

Stage 3K Maps is accepted on Linux. The recommended screen-redesign sequence is complete. No retained screen receives a redesign slice unless native evidence exposes a concrete defect and the user separately authorizes the resulting app-source scope.

## Stopping point

The recommended stopping point is **after Stage 3K Maps**. At that point the five accepted overview/catalog screens and the six remaining dense or narrow-width-sensitive screens will have Preview-specific composition. The other nine screens already have appropriate layouts for their complexity. Continuing wrapper-by-wrapper after that point would create more regression and maintenance surface than user-visible benefit.

Do not expand the redesign merely to make all 20 routes carry a Preview wrapper. Reopen a retained screen only for a concrete native failure or a separately approved workflow improvement.

## Independent Stage 2 and release-validation track

The following are not screen redesign work and are not resolved by additional Stage 3 slices:

- Windows runtime validation remains **OPEN / BLOCKED** until suitable hardware or CI exists.
- macOS runtime validation remains **OPEN / UNAVAILABLE** until suitable hardware or CI exists.
- A real published-version upgrade test remains pending until there are distinct release versions to install and upgrade.
- Exhaustive runtime tracing remains a separate evidence/instrumentation activity.

No recommended screen slice depends on those items. Linux-scoped screen work can proceed with the current accepted package and native-smoke method. Conversely, completing every screen slice does not change any of those items to passed. Cross-platform validation should reopen only when its named access condition changes, and the real-version upgrade test should run against the eventual release candidate rather than block layout development.
