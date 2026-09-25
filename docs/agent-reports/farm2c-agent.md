# Plan

1. Read the Farming Targets spec/reports and inspect the existing Preview store, ledger, screen model, and requested entry-point screens.
2. Add an additive versioned store migration with a best-effort pre-migration backup, pure due/reservation state helpers, and ledger wiring.
3. Add Preview-only target lifecycle controls, reservations/overcommit display, compact views, reminders as in-app due badges, logging, and shared entry points.
4. Run finite static/unit checks only; document UI/runtime limits and leave the worktree uncommitted.

# Summary

- Implemented Farming Targets remainder 2C in Preview scope.
- Added additive store version 2 fields: top-level reservations/priorities and per-target status, priority, dueAt; existing records and unknown fields are preserved.
- Older store payloads are copied to `farming-targets.json.bak` before migration when the app reads them.
- Reservations now feed the real ledger, with clamped Reserved display and overcommit warning state.
- Added priority, complete/archive, in-app due-date badge, and compact Targets/Shopping list/Target details views.
- Added `farming.targets.summary` telemetry.
- Added shared Preview-only “Add as farming target” / “Already a target” action. Preview acquisition drawer covers Inventory and Relics; explicit actions cover Foundry, Relic Planner, and Prime Resurgence. Dashboard active-target count/navigation was already present and now excludes archived/completed targets.

# Files changed

- `src/lib/farmingTargets/store.js`
- `src/lib/farmingTargets/state.js`
- `src/lib/farmingTargets/screenModel.js`
- `src/components/FarmingTargetAction.jsx`
- `src/screens/FarmingTargets.jsx`
- `src/preview/acquisition/PreviewAcquisitionDrawer.jsx`
- `src/screens/Foundry.jsx`
- `src/screens/RelicPlanner.jsx`
- `src/screens/PrimeResurgence.jsx`
- `src/screens/Dashboard.jsx`
- `src/lib/i18n/en.json`
- `tests/farming/state.test.mjs`

# Verification

- `nice -n 19 python3 /home/jedwards/.agents/skills/ui-ux-pro-max/scripts/search.py "compact dashboard tabs badge warning accessible" --domain ux -n 5` — returned accessibility guidance for selected state, badges, and labels; applied native buttons/ARIA state and labels.
- `nice -n 19 node --check src/lib/farmingTargets/store.js` — passed.
- `nice -n 19 node --check src/lib/farmingTargets/state.js` — passed.
- `nice -n 19 node --check src/lib/farmingTargets/screenModel.js` — passed.
- `nice -n 19 node --test 'tests/farming/*.test.mjs'` — 15 files, 15 passed, 0 failed.
- `git diff --check` — passed.
- No Cargo, Rust, Tauri, Vite, npm, pnpm, build, bundle, commit, push, or marketplace write was run.

# Open questions and risks

- The UI was not launched. Visual spacing, responsive behavior, focus trap interactions across the new controls, and real Tauri persistence were not visually/runtime verified.
- JSX was checked by careful source review only; the requested no-build rule prevented a bundler/compiler check.
- Shared entry-point buttons deduplicate their initial store read in-process, but separate mounted buttons do not receive live updates from another button until remounted.
- The reservation editor assigns a reservation to the currently selected target; it requires a selected target and does not invent an assignment.
- Other locales continue to use the existing English fallback for these new keys, as requested for this Preview task; translation remains follow-up work.

# Suggested follow-ups

- Launch Preview in a separate approved verification pass and test drawer focus, compact views, reservation persistence, and archive/complete restoration UX.
- Add a target archive/completed filter or restore action if product requirements need historical target management.
- Translate the new English keys after copy review.
