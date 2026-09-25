# Item completeness harness v2

## Scope

This report covers the merged-data harness and the false-green recipe decision.
`apply-merges.mjs` copies the selected app export into a temporary data
directory, applies the existing DE adapters and merge functions, and writes
the same keyed export shape used by the Rust startup refresh. Recipe presence
is decided from the cached DE `ExportRecipes` asset, independently of the app
mirror. The check workflow runs both the raw and merged app data against the
three explicit canaries.

## Verification

Commands were run from the worktree root with no compilation, bundling, Rust,
Tauri, network, or warframe.market writes:

- `nice -n 19 node --check scripts/de-export/apply-merges.mjs` — PASS.
- `nice -n 19 node --check scripts/item-completeness.mjs` — PASS.
- `nice -n 19 node --check scripts/check-completeness.mjs` — PASS.
- `nice -n 19 node --test $(rg --files tests -g '*.test.mjs')` — 18 tests,
  18 passed, 0 failed.
- `nice -n 19 npm run check:completeness` — exit 1 because Narin and Citrine
  still have the known missing acquisition-source rows; Volt Prime passes in
  both modes. The npm warning about `package-manager-strict` is pre-existing
  environment configuration and does not affect the check.

## Real-data result

DE cache: `/home/jedwards/.cache/kiedas-de-export`; app data:
`/home/jedwards/.local/share/kiedas-orbiter-preview/data`.

| Mode | Item | Inventory | Image | DE recipe / Foundry | Components | Acquisition | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raw | Narin | FAIL | FAIL | present / FAIL | 0/0 | FAIL: no bundled source rows for the parent or its components | FAIL |
| Raw | Citrine Prime | FAIL | FAIL | present / FAIL | 0/0 | FAIL: no bundled source rows for the parent or its components | FAIL |
| Raw | Volt Prime | PASS | PASS | present / PASS | 4/4 | PASS | PASS |
| Merged | Narin | PASS | PASS | present / PASS | 4/4 | FAIL: no bundled source rows for the parent or its components | FAIL |
| Merged | Citrine Prime | PASS | PASS | present / PASS | 4/4 | FAIL: no bundled source rows for the parent or its components | FAIL |
| Merged | Volt Prime | PASS | PASS | present / PASS | 4/4 | PASS | PASS |

The merged run reported 127 Warframes, 846 weapons, 2024 recipes, 3571
resources, and 12618 images. Narin's DE recipe is therefore no longer shown
as N/A: the cache contains it, the merged app recipe is found, and all four
projected component names/images resolve. Its remaining failure is precisely
the absence of bundled parent/component acquisition rows, which is outside
this task's structural attribution scope.

## Files changed

- `scripts/de-export/apply-merges.mjs`
- `scripts/check-completeness.mjs`
- `scripts/item-completeness.mjs`
- `scripts/item-completeness.canaries.json`
- `tests/de-export/apply-merges.test.mjs`
- `tests/completeness/item-completeness.test.mjs`
- `package.json`
- `docs/agent-reports/completeness2.md`
- `AGENT_REPORT.md`

## Risks and follow-ups

- The harness uses the existing bundled acquisition dataset and does not
  invent missing Narin attribution. A separate acquisition-structure task is
  needed to make Narin fully pass.
- Rust was not compiled or executed per task restrictions. The Node parity
  fixture covers the merge output shape and the existing adapter/merge tests
  cover individual field behavior; coordinator compilation/runtime validation
  remains a follow-up.
- No commit or push was performed.
