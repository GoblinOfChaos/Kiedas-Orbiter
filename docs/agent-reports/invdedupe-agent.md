# Plan

1. Inspect the required inventory reports and parser/UI/completeness flows.
2. Reconcile canonical inventory identities with equipment > parts > components > resources precedence, preserving quantities.
3. Exclude VoidProjection templates, prevent beast recipes from becoming parts, and disambiguate retained DE name collisions.
4. Add synthetic and merged-export regression coverage, completeness reporting/logging, and the requested collision ledger.
5. Run finite Node/static checks only; do not build, compile, launch, commit, or push.

## Summary

Implemented Preview inventory deduplication. `all` now has no duplicate canonical `unique_name`; duplicate bucket records merge quantities into the specific surviving bucket. VoidProjection template resources are excluded. Adarza Kavat and Sahasa Kubrow remain beasts and are no longer emitted as Parts. Retained same-name DE variants receive suffixes from their DE unique-name leaf.

## Files changed

- `src/lib/inventoryParser.js` — exclusion, reconciliation, quantity merging, name disambiguation, beast-recipe guard, canonical `all` guard, runtime `inventory.dedupe.summary` event.
- `scripts/item-completeness.mjs` — inventory-duplicates matrix rule and hoisted recipe index.
- `tests/completeness/inventory-dedupe.test.mjs` — synthetic precedence, alias/variant, template, and matrix tests.
- `tests/completeness/parts.test.mjs` — merged-data uniqueness, Narin, equipment-count, and companion assertions.
- `docs/agent-reports/invdedupe.md` — counts and per-group DE-field decisions.

## Measured merged-data result

- Resources: 1,466 -> **1,118**.
- Parts: 824 -> **821**.
- Components: **49**.
- `all`: 3,150 -> **2,799**; canonical unique names: **2,799**.
- Narin Parts: exactly Blueprint, Chassis, Neuroptics, Systems; none in Resources.
- VoidProjection template resources: **0**.
- Equipment unchanged: Warframes 118, Primary 196, Secondary 148, Melee 224.

## Verification

- `timeout 120s nice -n 19 node --test tests/completeness/inventory-dedupe.test.mjs tests/completeness/parts.test.mjs tests/completeness/matrix.test.mjs` — pass, 3 files.
- `nice -n 19 node --check src/lib/inventoryParser.js` — pass.
- `nice -n 19 node --check scripts/item-completeness.mjs` — pass.
- `nice -n 19 node --check tests/completeness/inventory-dedupe.test.mjs` — pass.
- `nice -n 19 node --check tests/completeness/parts.test.mjs` — pass.
- `git diff --check` — pass.
- Finite merged-export probe using `applyMerges` and `parseInventory` — pass; no build/bundler/Rust process run.

## Open questions and risks

- The current merged snapshot exposed 54 same-display-name groups (the brief estimated approximately 57); the complete observed ledger and decisions are in `docs/agent-reports/invdedupe.md`.
- UI rendering, locale visual fit, and live Tauri log delivery were not launched or visually verified.
- No Rust, Vite, Tauri, npm/pnpm build, commit, push, or live Warframe Market write was performed.

## Suggested follow-ups

- Translate/visually review the DE-leaf suffix presentation in every supported locale.
- Run the normal Preview build and live inventory transition check when the coordinator permits builds.
