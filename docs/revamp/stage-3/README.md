# Stage 3 — Linux screen redesign planning

Status: Stage 3A through Stage 3H are accepted as Linux milestones. Stage 2 is accepted; its platform deferrals are governed by ../ACCEPTANCE-LEDGER.md and will not be reopened without hardware/CI access.

The retained Stage 1 plan calls for small screen-redesign groups, then service/data-update improvements and connected planning features at separate gates. No detailed original Stage 3 screen ordering was found in the current revamp documents. The proposed first slice is **Dashboard / Today**, not an app-wide rewrite or a marketplace logic change.

## First slice preparation

Inventory every current Dashboard control and conditional state before editing. Initial source inspection finds 19 visibility preferences: bounty, news, timers, arb, nightwave, inv, fiss, baro, arch, 1999, inf, desc, sortie, hunt, circuit, deal, sales, alerts, event. Preserve the dashboard_hidden_cards preference, refresh/sync behavior, loading state, nested tabs, calendar controls and Baro/wishlist/detail dialogs. This list is an initial registry, not a completed dynamic-control audit.

Proposed layout direction: a compact Today header with refresh/customization, then clearly grouped current activities and rotations, with all existing cards reachable. Use existing components, icons and theme variables; no AI art. Final placement and responsive behavior must follow the completed control inventory. Keep existing data/parsing/service behavior unchanged in this first UI slice; data-source improvements require their own verified plan.

## Implementation boundaries to resolve in the concrete plan

- Develop from the accepted isolated Preview state; retain the accepted patch/artifacts as the Stage 2 baseline.
- Keep stable rendering isolated from the new Preview layout; choose the smallest shared-component boundary after inspecting Dashboard's nested render functions.
- Preserve all 20 routes, existing features, eight overlays and Stage 2 integration guards.
- Supply a per-control preservation/checklist and exact source-file scope with the proposed layout before app-source edits.
- Validate Linux at 900x500 and normal size, keyboard/focus, hidden-card persistence, empty/loading/populated states, and existing nested actions. Use synthetic or appropriately sourced fixtures; never invent game logic or treat missing prices as zero.
- Keep build/test CPU limits and evidence provenance. Review this slice before expanding to other screens.

Before Stage 3F, the reusable Linux runner toolkit was installed at `.preview-work/ubuntu-build/toolkit/`. Its bounded Podman completion, stale-output cleanup, absolute-path guards, inline-shell rejection and source-derived selector checks passed their self-test. Stage 3F through Stage 3H used this toolkit with native Git diff output for implementation patches.
The Dashboard and Inventory slices are implemented, validated and accepted as Linux milestones. See IMPLEMENTATION-PLAN.md for its implementation and evidence record. The accepted Stage 3B implementation and validation are documented in INVENTORY-IMPLEMENTATION-PLAN.md and INVENTORY-PRESERVATION.md. Stage 3C Mastery, Stage 3D Mods, Stage 3E Cosmetics, Stage 3F Rivens, Stage 3G Relics, Stage 3H Relic Planner, Stage 3I Market and Stage 3J Settings are accepted as Linux milestones. Stage 3K Maps is plan-only; no Stage 3K app-source work has started. The proposed end state for the remaining screen work is fixed in SCREEN-REDESIGN-SCOPE.md.

Accepted first slice: [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md). Dashboard preservation checklist: [DASHBOARD-PRESERVATION.md](DASHBOARD-PRESERVATION.md). Accepted Stage 3B slice: [INVENTORY-IMPLEMENTATION-PLAN.md](INVENTORY-IMPLEMENTATION-PLAN.md). Inventory preservation checklist: [INVENTORY-PRESERVATION.md](INVENTORY-PRESERVATION.md).


Accepted Stage 3C slice: [MASTERY-IMPLEMENTATION-PLAN.md](MASTERY-IMPLEMENTATION-PLAN.md). Mastery preservation checklist: [MASTERY-PRESERVATION.md](MASTERY-PRESERVATION.md).

Accepted Stage 3D slice: [MODS-IMPLEMENTATION-PLAN.md](MODS-IMPLEMENTATION-PLAN.md). Mods preservation checklist: [MODS-PRESERVATION.md](MODS-PRESERVATION.md).

Proposed remaining scope and stopping point: [SCREEN-REDESIGN-SCOPE.md](SCREEN-REDESIGN-SCOPE.md).

Accepted Stage 3E slice: [COSMETICS-IMPLEMENTATION-PLAN.md](COSMETICS-IMPLEMENTATION-PLAN.md). Cosmetics preservation checklist: [COSMETICS-PRESERVATION.md](COSMETICS-PRESERVATION.md).
Accepted Stage 3F slice: [RIVENS-IMPLEMENTATION-PLAN.md](RIVENS-IMPLEMENTATION-PLAN.md). Rivens preservation checklist: [RIVENS-PRESERVATION.md](RIVENS-PRESERVATION.md).

Accepted Stage 3G slice: [RELICS-IMPLEMENTATION-PLAN.md](RELICS-IMPLEMENTATION-PLAN.md). Relics preservation checklist: [RELICS-PRESERVATION.md](RELICS-PRESERVATION.md).

Accepted Stage 3H slice: [RELIC-PLANNER-IMPLEMENTATION-PLAN.md](RELIC-PLANNER-IMPLEMENTATION-PLAN.md). Relic Planner preservation checklist: [RELIC-PLANNER-PRESERVATION.md](RELIC-PLANNER-PRESERVATION.md).

Accepted higher-risk Stage 3I slice: [MARKET-IMPLEMENTATION-PLAN.md](MARKET-IMPLEMENTATION-PLAN.md). Market preservation checklist: [MARKET-PRESERVATION.md](MARKET-PRESERVATION.md).

Accepted higher-risk Stage 3J slice: [SETTINGS-IMPLEMENTATION-PLAN.md](SETTINGS-IMPLEMENTATION-PLAN.md). Settings preservation checklist: [SETTINGS-PRESERVATION.md](SETTINGS-PRESERVATION.md).

Proposed final Stage 3K slice, awaiting explicit app-source approval: [MAPS-IMPLEMENTATION-PLAN.md](MAPS-IMPLEMENTATION-PLAN.md). Maps preservation checklist: [MAPS-PRESERVATION.md](MAPS-PRESERVATION.md).
