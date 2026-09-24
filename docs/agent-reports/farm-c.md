# farm-c agent report

## Fix round

Plan:

1. Trace `ExportRecipes.num` through `parseInventory()` into each `craftable` recipe object.
2. Add `outputQty` with a positive-integer value, defaulting to 1 only when the upstream `num` field is absent.
3. Verify the requirements engine prioritizes `outputQty` and add the requested 10-output ceiling test.
4. Check whether `inventoryParser.js` is directly importable by plain Node; if not, add a clearly labelled static source guard.
5. Run the requested farming test command without builds, compilers, or package-manager commands.

The upstream field feeding `outputQty` is `ExportRecipes[recipeKey].num`. `parseInventory()` converts `exports.ExportRecipes` through its local `toMap()` helper into `ERecipe`, and the craftable builder iterates those `ERecipe` entries.

Implementation and verification:

- Added `outputQty: recipe.num` to each craftable object, using `1` only when `recipe.num` is `undefined`; DE's `ExportRecipes.num` is the verified positive integer output quantity per craft.
- Kept `requirements.js`'s existing compatibility names, with `outputQty` checked first, and updated its parser-data comment.
- Added the requested 25-result/10-output test: one `B` per craft produces 3 crafts and 3 `B` required.
- Plain Node import check was blocked by the existing extensionless import `./warframeUtils` in `inventoryParser.js`, yielding `ERR_MODULE_NOT_FOUND`; added a weak, clearly static source assertion instead.
- `git diff --check`: passed.
- `node --check src/lib/inventoryParser.js`: passed.
- `node --check src/lib/farmingTargets/requirements.js`: passed.
- `nice -n 19 node --test "tests/farming/*.test.mjs"`: 14 tests, 14 passed, 0 failed, 0 cancelled.

## Task 5: requirements engine

Built `src/lib/farmingTargets/requirements.js` with deterministic target ordering, recipe lookup by item identity/name fields, ceiling batch calculation, explicit output-quantity support, one-time owned-intermediate consumption, unresolved target reporting, and cycle detection that discards all partial leaves for the affected target.

Tests cover single crafts, multi-output recipes, owned intermediates, shared leaves and contributions, cycles, unresolved targets, target permutation invariance, and 200 seeded acyclic cases. Final command:

```text
nice -n 19 node --test tests/farming/requirements.test.mjs tests/farming/ledger.test.mjs
ℹ tests 2
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
```

Real-data result: not applicable; Task 5 is pure JS and tests use injected recipe/inventory fakes. No network access was used.

Deviation: `inventoryParser.js`'s `craftable` output contains `resultType` and ingredient `need`, but no output-count property. The engine defaults to one output and accepts explicit `outputQty`, `outputQuantity`, `resultCount`, and `resultQuantity` fields for prepared data. This is recorded as an open integration question rather than inferred from game data.

## Task 6: ledger

Built `src/lib/farmingTargets/ledger.js`. It combines leaf requirements, applies owned inventory once, clamps still-needed at zero, labels reserved inventory, flags reservations above ownership, groups and deterministically sorts contributors, ignores priorities for arithmetic, and sorts rows by still-needed quantity, name, and item type.

The tests cover the plan's 15-required/8-owned/6-reserved example, overcommitment, priority invariance, non-negative still-needed values, contributor reconciliation, and deterministic ordering. The same final test command and result are shown above.

Real-data result: not applicable; no network or filesystem data input is required by this task.

## Deviations and blockers

- `docs/revamp/stage-4/COMMAND-CENTER-IMPLEMENTATION-PLAN.md` requested by the brief is not present in this worktree. The mandated foundation plan and farming spec were read; the missing section could not be checked.
- No build, compiler, Tauri, Vite, package-manager, commit, or push command was run.

## Files created/modified

- `AGENT_REPORT.md`
- `src/lib/farmingTargets/requirements.js`
- `src/lib/farmingTargets/ledger.js`
- `tests/farming/requirements.test.mjs`
- `tests/farming/ledger.test.mjs`
- `docs/agent-reports/farm-c.md`
