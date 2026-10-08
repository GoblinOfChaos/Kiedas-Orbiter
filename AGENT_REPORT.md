# P70 agent report: Inventory Weapons Zaw and Kitgun buttons

## Root cause

`src/screens/Inventory.jsx:152` exposed only Primary, Secondary, and Melee
in the Weapons tab filter configuration. Its predicates at lines 684-686 only
inspect `item.weapon_type`, but `src/lib/inventoryParser.js:1791-1815` assigns
Zaws and Kitguns to the stable `zaws` and `kitguns` category buckets without a
`weapon_type`. Consequently, the parser supplied those items to All but no
type button could select them.

## Changes

- `src/screens/Inventory.jsx:152,199,687-688,1210`
  - Added Zaw and Kitgun to the existing mutually exclusive `weapon_type`
    button group.
  - Added exact category predicates: `zaws` for Zaw and `kitguns` for Kitgun.
  - Reused the existing `category.zaws` and `category.kitguns` translations.
    Both keys already exist in all 15 locale files, so no locale key was added.
  - Left the Primary, Secondary, and Melee predicate lines unchanged.
- `tests/inventory/weapon-type-buttons.test.mjs:1-61`
  - Added synthetic isolation coverage and a source-wiring assertion.
  - Added real-data coverage for every parsed Zaw, Kitgun, and other-equipment
    item, asserting relations rather than profile-specific counts.
- `docs/agent-context/reports/weapon-type-before-after.md`
  - Recorded real-inventory before/after button counts and up to eight moved
    item names per new button.

## Before/after proof

Created the required disk-backed source proof copy at
`$TMPDIR/p70-weapon-type-before-1jCldV`, excluding `node_modules` and large
data. It was made before the Inventory change; it and the earlier failed empty
copy were deleted during cleanup.

- Before: running `weapon-type-buttons.test.mjs` with
  `P70_SOURCE_ROOT` set to that copy failed the wiring assertion because the
  Weapons filters did not contain `zaw` or `kitgun`.
- After: `timeout 180 nice -n 19 node --test --test-concurrency=2
  tests/inventory/weapon-type-buttons.test.mjs` passed (1 file, 0 failures).

## Test results

- PASS — `tests/inventory/weapon-type-buttons.test.mjs`
- PASS — `tests/inventory/mastery-filter.test.mjs`
- PASS — `tests/ui/i18n-vite-bundle.test.mjs`
- PASS — `git diff --check`
- BLOCKED (unrelated fixture) — prescribed wider suite: 71 passed, 1 failed.
  `tests/farming/acquisitionText.test.mjs` fails before its assertions because
  `/var/home/jedwards/kiedas-orbiter/.preview-work/wt/weapon-type/scratchwiki/wiki-resource-pages.json`
  is absent (`ENOENT`). No Farming code or fixtures were changed.

## Unverified or skipped

No app build or live UI run was performed, as P70 forbids builds. No network
or game-data source was accessed. The broader-suite fixture failure was not
modified because it is outside this task.

## Exact files changed

- `src/screens/Inventory.jsx`
- `tests/inventory/weapon-type-buttons.test.mjs`
- `docs/agent-context/reports/weapon-type-before-after.md`
- `AGENT_REPORT.md`
