# Farm-next defect fix

## Before / after

The regression fixture modeled two recipe-less user targets plus enemy, bounty, and mission sources.

| Check | Before reviewed behavior | After |
| --- | ---: | ---: |
| Direct/acquirable fixture ledger rows | 0 | 2 |
| Direct/acquirable fixture ranked places | 0 | 3 |
| Direct/acquirable fixture collapsed `drops.wf` places | 1 | 0 |
| Component-subrecipe fixture raw-resource rows | 0 | 1 |
| Component-subrecipe fixture ranked places | 0 | 1 |
| Real Preview export ledger rows (Narin + Vitality) | not measured against old code | 13 |
| Real Preview export ranked places | not measured against old code | 164 |
| Real Preview export named planets | not measured against old code | 17 |

The real proof reads `/home/jedwards/.local/share/kiedas-orbiter-preview/data/export/combined_export_cache.json` read-only, including its `DropsAll` data, and rejects empty ledgers/places/planets or a `drops.wf` place name.

## Changes

- Mark screen-model user targets acquirable by default, preserving explicit `false`.
- Prefer node, relic, enemy, and bounty names over provenance labels; use `region` for mission planets.
- Match source rows by both item type and display name.
- Add deduplicated component `subIngredients` recipes to expansion.
- Memoize the Preview place index independently of filters and compute the needed count once per view.
- Add ledger entries to the Preview acquisition drawer lookup.
- Limit summary telemetry dependencies to loading completion/store availability and target count.

## Verification

- `nice -n 19 node --check src/lib/farmingTargets/screenModel.js` — passed.
- `nice -n 19 node --check scripts/farming-targets-real-proof.js` — passed.
- `nice -n 19 node scripts/farming-targets-real-proof.js` — passed: `ledger=13 places=164 planets=17`.
- `nice -n 19 node --test "tests/**/*.test.mjs"` — passed: 24 tests, 24 passed.
- `git diff --check` — passed.

No build, bundler, Cargo, Tauri, commit, push, live market write, or file outside the worktree was used. No new UI strings were added.

## Open questions / risks

- The real proof uses the existing combined export cache snapshot; it does not fetch or mutate live DE data.
- The telemetry effect intentionally does not rerun for quantity or filter changes; it reports initial load and target-count changes only.

## Follow-ups

- Translate or revise existing Farming Targets strings only if product copy changes later.
