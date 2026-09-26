# Agent report: Inventory parts

## Plan

1. Read the existing inventory parser, Preview Inventory tab/search/drawer flow, completeness scripts, and locale conventions.
2. Add a non-Prime recipe-part projection that preserves every existing bucket and appends compact `parts` entries to `all`.
3. Add the Preview-only Parts tab, parent-aware search/sort, and component-specific acquisition lookup.
4. Add finite Node tests/static checks for synthetic data, real merged Narin/Prime controls, and bucket-count regression; extend completeness reporting and write real counts to `docs/agent-reports/partsinv.md`.

Implementation is authorized by the coordinator brief. No builds, bundlers, Rust/Cargo commands, commits, pushes, live app changes, inventory writes, or market writes will be used.

## Summary

Implemented Preview-only non-Prime recipe parts. The parser now adds compact `parts` records for equipment blueprints and recipe-backed components, preserves existing bucket arrays, skips Prime-set parts, and appends parts to `all`. Inventory has a Preview Parts tab with owned filtering, parent-aware search, parent/part sorting, quantity and blueprint state, virtualization through the existing grid/list path, and component-specific drawer lookup.

## Files changed

- `src/lib/inventoryParser.js`
- `src/screens/Inventory.jsx`
- `src/lib/i18n/*.json` (15 locale files; English fallback copied as requested)
- `scripts/item-completeness.mjs`
- `tests/completeness/parts.test.mjs`
- `docs/agent-reports/partsinv.md`
- `AGENT_REPORT.md`

## Verification

- `timeout 60s nice -n 19 node --loader /tmp/kiedas-extension-loader.mjs --test 'tests/completeness/parts.test.mjs'` — pass.
- Same command with `'tests/completeness/matrix.test.mjs'` — both files pass.
- `nice -n 19 node --check src/lib/inventoryParser.js` and `scripts/item-completeness.mjs` — pass.
- `git diff --check` — pass.
- Finite real merged-export parse: 864 parts, 259 owned; Narin has four named/image-backed cards; no Volt Prime parts; existing bucket counts recorded in `docs/agent-reports/partsinv.md`.
- No build, bundler, Rust/Cargo, live app, inventory write, market write, commit, or push was used. UI visual verification remains unavailable under the brief.

## Open questions and risks

- The real completeness helper exposed 92 image/source-label gaps among 902 recipe-part rows; these are reported for follow-up rather than hidden.
- Live Preview rendering, drawer visuals, large-list performance, and translated wording were not visually verified.

## Suggested follow-ups

- Translate the copied `Parts` locale values.
- Review the 92 completeness gaps and rerun the full completeness command in a normal Preview runtime.
