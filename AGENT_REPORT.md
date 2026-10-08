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

---

# P71 agent report: vaulted tag

## Root cause

`src/lib/acquisitionInfo.js` only had a late relic-specific fallback based on
raw `vaultedAt`/`vaulted` values, so it neither distinguished unknown vault
states nor modeled items whose every relic route is confirmed vaulted.
`AcquisitionDrawer` could therefore render ordinary sources instead of the
required wiki-directed vaulted prompt. The P71 test also initially treated
the Baro Axi A8 export date as a normal past-date result, contrary to the
owner's declared Baro precedence.

## Changes

- `src/lib/relicParser.js:90-99`
  - Baro-exclusive relics return `false` before any export metadata. The
    comment records that they are sold by Baro and not vaulted.
  - Retained the established `vaulted`/`isVaulted` compatibility fields; a
    record with no vault metadata remains `null`.
- `src/lib/acquisitionInfo.js:770-780,1543-1575,1698-1703,2067-2070`
  - Indexes normalised relic identity and evaluates confirmed vault status.
  - Tags direct confirmed-vaulted relics, and items only when every known
    route is a confirmed-vaulted relic. Unknown and available routes prevent
    the tag.
  - Keeps normalized model routes for non-drawer consumers; the UI suppresses
    their display instead of breaking Farming Targets source coverage.
- `src/components/AcquisitionDrawer.jsx:269-306`
  - Shows `acquisition_drawer.vaulted_check_wiki` in place of source rows.
    The existing wiki button and `wikiLink` remain directly below it.
- `src/lib/i18n/{de,en,es,fr,it,ja,ko,pl,pt,ru,tc,th,tr,uk,zh}.json`
  - Added `acquisition_drawer.vaulted_check_wiki`.
- `tests/acquisition-model/vaulted-tag.test.mjs`
  - Added synthetic and real-data coverage. The real-data past-date loop
    excludes the six Baro relics, which are asserted separately as untagged.
- `tests/relics/vault-state.test.mjs`
  - Updated the Baro expectation to `false`.
- `docs/agent-context/reports/vaulted-tag-before-after.md`
  - Records proof details, before/after counts, and examples.

## Before/after proof

The required proof copy was created in
`$TMPDIR/vaulted-tag-proof-copy-22pC1A` without `node_modules` or large test
data. `git worktree add` and `git stash` were unavailable because the shared
worktree Git metadata is read-only. In the copied `HEAD` baseline the P71
test failed its synthetic confirmed-vaulted assertion and a real past-date
relic assertion. The completed implementation passes the same test with real
data: 727 tagged relics and 387 tagged items.

## Test results

- PASS — `timeout 180 nice -n 19 node --test --test-concurrency=2 tests/acquisition-model/vaulted-tag.test.mjs`
- PASS — `timeout 180 nice -n 19 node --test --test-concurrency=2 tests/ui/i18n-vite-bundle.test.mjs`
- PASS — `timeout 180 nice -n 19 node --test --test-concurrency=2 tests/relics/vault-state.test.mjs`
- PASS — `timeout 180 nice -n 19 node --test --test-concurrency=2 tests/farming/acquisitionC1.test.mjs`
- PASS — `git diff --check`
- BLOCKED (unrelated fixture) — the wider suite reaches
  `tests/farming/acquisitionText.test.mjs`, which fails before its assertions
  because `scratchwiki/wiki-resource-pages.json` is absent. No unrelated
  source or fixture was created.

## Translation status

`acquisition_drawer.vaulted_check_wiki` is English in all 15 locale files.
Needs translation: de, es, fr, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh.

## Unverified or skipped

No build, network operation, or live UI run was performed, as P71 forbids
builds and network access. The `$TMPDIR` proof copy was deleted after the
reports were written. The wider-suite fixture blocker is the only incomplete
validation.

## Exact files changed

- `src/components/AcquisitionDrawer.jsx`
- `src/lib/acquisitionInfo.js`
- `src/lib/relicParser.js`
- `src/lib/i18n/de.json`
- `src/lib/i18n/en.json`
- `src/lib/i18n/es.json`
- `src/lib/i18n/fr.json`
- `src/lib/i18n/it.json`
- `src/lib/i18n/ja.json`
- `src/lib/i18n/ko.json`
- `src/lib/i18n/pl.json`
- `src/lib/i18n/pt.json`
- `src/lib/i18n/ru.json`
- `src/lib/i18n/tc.json`
- `src/lib/i18n/th.json`
- `src/lib/i18n/tr.json`
- `src/lib/i18n/uk.json`
- `src/lib/i18n/zh.json`
- `tests/acquisition-model/vaulted-tag.test.mjs`
- `tests/relics/vault-state.test.mjs`
- `docs/agent-context/reports/vaulted-tag-before-after.md`
- `AGENT_REPORT.md`

---

# P72 Prime Set vault status report

## Root cause

`src/screens/Inventory.jsx` built `unvaultedRewards` with `!relic.vaulted` and then classified a set as vaulted only when none of its parts were in that set. Relic vault state is three-valued: `true`, `false`, or `null`; therefore `!null` incorrectly marked unknown relic rewards as available. The inverse Prime Parts filter also treated a `null` set value as unvaulted.

## Changes

- Added `src/lib/acquisitionModel/relicVaultState.js`, the shared relic-source lookup and confirmed-vaulted predicate.
- Moved `acquisitionInfo`'s existing confirmed-vaulted source predicate to that shared acquisition-model helper without changing its behavior.
- Added `getPrimeSetVaultedStatus` and `matchesPrimeSetVaultFilter` to `src/lib/primeSets.js`.
- Replaced the reward-name heuristic in `Inventory.jsx` with per-part relic-source classification and strict true/false filter matching.
- Did not change `PrimeSetCard.jsx`: it has no vault-status label, so P72 requires no new card text or localization changes.

## Tests and proof

- Before proof copy: `/var/home/jedwards/.cache/codex-tmp/prime-set-vault-before-fSqp7y`.
  `timeout 180 nice -n 19 node --test --test-concurrency=2 tests/inventory/prime-set-vault.test.mjs` failed before the implementation because `primeSets.js` did not export `getPrimeSetVaultedStatus`.
- After: `tests/inventory/prime-set-vault.test.mjs` passed (real-data coverage included).
- Passed: `tests/ui/prime-set-card.test.mjs`.
- Passed: `tests/inventory/mastery-filter.test.mjs`.
- Passed: `tests/relics/vault-state.test.mjs`.
- The full suite was not run: the prescribed full-suite glob includes existing tests that create `os.tmpdir()` proof directories, which conflicts with the P72/Common prohibition on creating temporary files under `/tmp`.

## Before and after

- Before: 107 vaulted, 59 available, 0 unknown.
- After: 102 vaulted, 13 available, 51 unknown.
- Changed states: 4 vaulted to unknown, 47 available to unknown, and 1 vaulted to available. The bounded name lists are in `docs/agent-context/reports/prime-set-vault-before-after.md`.

## Exact files changed

- `src/lib/acquisitionModel/relicVaultState.js` (new)
- `src/lib/acquisitionInfo.js`
- `src/lib/primeSets.js`
- `src/screens/Inventory.jsx`
- `tests/inventory/prime-set-vault.test.mjs` (new)
- `docs/agent-context/reports/prime-set-vault-before-after.md` (new)
- `AGENT_REPORT.md` (new)

No network access, builds, commits, or deployment actions were performed.
