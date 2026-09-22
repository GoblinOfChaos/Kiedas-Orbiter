# Revamp acceptance ledger

## Accepted scope

Stage 2 is **ACCEPTED — Linux-only development milestone**, by explicit user decision on 2026-09-05. The existing evidence and named deferrals in stage-2/GATE-REVIEW.md are accepted within that scope. Stage 3 may proceed scoped to Linux. This is not authorization to publish, replace stable, enable live integrations, remove features, or introduce AI artwork.

## Persistent platform items

| ID | Status | Scope | Reopen condition |
|---|---|---|---|
| PLATFORM-WINDOWS | **OPEN / BLOCKED** | Windows native build/install/profile/webview/runtime validation | Suitable Windows hardware or CI access becomes available |
| PLATFORM-MACOS | **OPEN / UNAVAILABLE** | macOS native build/install/profile/webview/runtime validation | Suitable macOS hardware or CI access becomes available |

These are permanent named ledger entries: retained across all future milestones, never silently dropped and never counted as passed. They remain open until validation can actually be performed. They do not block accepted Linux-scoped development and must not be re-litigated in routine reports. Reopen validation only when the stated access condition changes. Preserve cross-platform architecture and packaging; absence of runtime access is not permission to remove support.

## Accepted Stage 3 slices

| Slice | Status | Scope |
|---|---|---|
| Stage 3A Dashboard | **ACCEPTED — Linux** | Preview Dashboard grouping and responsive layout; all 19 existing cards/actions retained; stable behavior preserved; evidence recorded in stage-3/IMPLEMENTATION-PLAN.md |
| Stage 3B Inventory | **ACCEPTED — Linux** | Preview Inventory responsive composition; all 15 visible categories and existing business logic retained; stable markup preserved; evidence recorded in stage-3/INVENTORY-IMPLEMENTATION-PLAN.md |
| Stage 3C Mastery | **ACCEPTED — Linux** | Preview Mastery responsive composition and keyboard/dialog semantics; all 24 completion rows and mastery logic retained; stable markup preserved; evidence recorded in stage-3/MASTERY-IMPLEMENTATION-PLAN.md |
| Stage 3D Mods | **ACCEPTED — Linux** | Preview Mods responsive controls and keyboard-accessible cards; all 19 categories and existing search/filter/sort/price/acquisition behavior retained; stable markup preserved; evidence recorded in stage-3/MODS-IMPLEMENTATION-PLAN.md |
| Stage 3E Cosmetics | **ACCEPTED — Linux** | Preview Cosmetics responsive controls and bounded category rail; all 15 kinds, three ownership filters, catalog, pagination and acquisition behavior retained; stable markup preserved; evidence recorded in stage-3/COSMETICS-IMPLEMENTATION-PLAN.md |
| Stage 3F Rivens | **ACCEPTED — Linux** | Preview Rivens responsive controls, contained filter rails and keyboard-accessible cards; all nine weapon types, four states, three sorts, pricing/grading and drawer behavior retained; stable markup preserved; evidence recorded in stage-3/RIVENS-IMPLEMENTATION-PLAN.md |
| Stage 3G Relics | **ACCEPTED — Linux** | Preview Relics responsive control hierarchy, contained filter rails and keyboard-accessible cards; catalog merge, filters, expected-value formulas, prices and acquisition behavior retained; stable markup preserved; evidence recorded in stage-3/RELICS-IMPLEMENTATION-PLAN.md |
| Stage 3H Relic Planner | **ACCEPTED — Linux** | Preview Relic Planner coordinated three-panel workspace, bounded heights, contained filters and keyboard-accessible removal; catalog, status, ownership and matching behavior retained; stable markup preserved; evidence recorded in stage-3/RELIC-PLANNER-IMPLEMENTATION-PLAN.md |
| Stage 3I Market | **ACCEPTED — Linux** | Preview Market responsive workspace and mutation-safe presentation; zero frontend mutation invocations and direct rejection of all four mutation IPC commands; stable displayed-price fallback corrected; evidence recorded in stage-3/MARKET-IMPLEMENTATION-PLAN.md |
| Stage 3J Settings | **ACCEPTED — Linux** | Preview Settings section navigation and responsive composition; live controls visibly disabled; zero Preview `relay_event` and `stop_log_scanner` invocations; five guarded commands directly rejected; stable markup and interactions preserved; evidence recorded in stage-3/SETTINGS-IMPLEMENTATION-PLAN.md |
| Stage 3K Maps | **ACCEPTED — Linux** | Preview Maps responsive workspace and keyboard-accessible markers; atomic configuration writes and fresh-folder opening verified across isolated stable/Preview roots; Debian and AppImage passed 96/96; evidence recorded in stage-3/MAPS-IMPLEMENTATION-PLAN.md |

Stage 3A through Stage 3E were explicitly accepted by the user on 2026-09-05. Stage 3F through Stage 3K were explicitly accepted by the user on 2026-09-06. Acceptance does not authorize later screen implementations; each app-source slice keeps its own approval gate.

## Current Stage 3 gate

Stage 3K Maps is **ACCEPTED — LINUX**. The recommended Preview screen-redesign scope is complete. No further screen is authorized unless a concrete native defect is found in a retained screen and the user separately approves its app-source scope.

## Current Stage 4 gate

Stage 4A Foundation, Shell, and Dashboard is **IMPLEMENTED AND VALIDATED — LINUX — awaiting user acceptance**. The isolated implementation introduces the command-center shell and Dashboard contract, preserves Stable Dashboard markup and behavior, records zero forbidden Preview shell invocations, and passes the rebuilt Debian and AppImage matrices. Evidence and the reviewable patch are recorded in `stage-4/STAGE-4A-IMPLEMENTATION-REPORT.md`. Stage 4B and later app-source work remains separately gated.

## Dormant safety items

| ID | Status | Scope | Reopen condition |
|---|---|---|---|
| INVENTORY-DORMANT-SALE | **OPEN / UNREACHABLE** | Inventory.jsx retains a dormant `1p` substitution and no-`tradable`-check sale path; both current callers are unreachable | Any change to Inventory tab IDs, `activeTab` setters, Prime Parts render ordering or sale-control reachability |

Verify this path before making it reachable. Its presence is not evidence of a currently user-triggerable production defect.

## Other carried coverage

The remaining release/environment/instrumentation coverage in stage-2/GATE-REVIEW.md is explicitly deferred under the accepted scope, not passed. Track it in stage-2/STAGE-2-REMAINING.md and revisit at its stated trigger or when a change directly affects it. Historical test reports retain their original status text; this ledger and the current stage acceptance document govern present status.
