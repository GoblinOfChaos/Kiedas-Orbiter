# farm-a report

## Task 1: DE drop-table parser and validation

Built `src/lib/deDropTables/parse.js` with `parseDropTablesHtml`, `validateDropTables`, `DropTablesFormatError`, and the 20 documented `KNOWN_SECTIONS`. It parses place, by-source, and by-item rows into the fixed interfaces, converts percentages to fractions, decodes common HTML entities, skips only blank rows, and rejects unknown sections or row shapes. Real DE padded bounty rows (`Stage`/`Final Stage`) were supported after inspection.

Added `src/lib/deDropTables/fixtures/mini.html`, a hand-trimmed excerpt copied from the live DE page containing mission rotations A/B, a `resourceByAvatar` enemy source, a relic, and blank rows.

Failing-test evidence: before implementation, `nice -n 19 node --test tests/farming/dropTablesParse.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for `src/lib/deDropTables/parse.js`.

Final test: `nice -n 19 node --test tests/farming/dropTablesParse.test.mjs tests/farming/dropTablesFetch.test.mjs` -> `tests 11`, `pass 11`, `fail 0`.

Real-data command: `nice -n 19 node --input-type=module -e "...parse /tmp/kiedas-d邂droptables.html..."`. Result: 10,364 mission rows, 441 mission places, 52,914 total rows, 4,811 total sources, 4 warnings, 74 validation errors. Errors are explicit `0.00%` rows labeled `Beyond Legendary (Under Review)`; they are retained and rejected by the specified `(0,1]` validation rule.

## Task 2: refresh script and snapshot handling

Built `scripts/de-drop-tables/fetch.mjs` and `tests/farming/dropTablesFetch.test.mjs`. The script supports injected fetch/clock functions, one-hop redirects, conditional requests against the resolved URL, SHA-256 metadata, parsed JSON snapshots, atomic temp-write/rename, and last-known-good preservation on parser/validation/network failure. It creates the requested cache directory when needed.

Failing-test evidence: before implementation, `nice -n 19 node --test tests/farming/dropTablesFetch.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for `scripts/de-drop-tables/fetch.mjs`.

Final tests are included in the 11/11 summary above. Syntax checks: `node --check src/lib/deDropTables/parse.js` and `node --check scripts/de-drop-tables/fetch.mjs` passed. `git diff --check` passed.

Real run: `nice -n 19 node scripts/de-drop-tables/fetch.mjs /home/jedwards/.cache/kiedas-de-drop-tables` returned `status: rejected` with the 74 chance-bound errors above. No cache files were written; no previous cache files were changed. No live warframe.market writes occurred.

## Deviations, risks, and follow-ups

- `docs/revamp/stage-4/COMMAND-CENTER-IMPLEMENTATION-PLAN.md` is absent from this worktree, so section 9.8 could not be reread; the supplied plan and spec were used.
- The live page has real padded/stage rows beyond the simplified fixture markup; extraction was adapted minimally and kept the fixed row interfaces.
- The live page's zero-percent under-review rows make the strict validation reject the current page. Coordinator should decide policy from the primary DE data before enabling refresh acceptance.

## Files created or modified

- `AGENT_REPORT.md`
- `docs/agent-reports/farm-a.md`
- `src/lib/deDropTables/parse.js`
- `src/lib/deDropTables/fixtures/mini.html`
- `scripts/de-drop-tables/fetch.mjs`
- `tests/farming/dropTablesParse.test.mjs`
- `tests/farming/dropTablesFetch.test.mjs`

## Fix round: under-review placeholders

Updated `src/lib/deDropTables/parse.js` so a zero-chance row whose rarity contains `Under Review` (case-insensitive) is retained with `underReview: true`. Exported `realDropRows(rows)` and used it for validation and mission rotation grouping, so only flagged placeholders are excluded. Zero chance without the flag and all other out-of-range chances remain errors. Validation now reports the exact warning `74 under-review placeholder rows ignored` for the live page.

Added focused tests for placeholder parsing/validation, zero-percent Common rejection, and `realDropRows` filtering. Per the worktree rule prohibiting test scripts, these tests were not executed in this round; equivalent finite standalone assertions passed.

Real-data verification:

- `nice -n 19 node scripts/de-drop-tables/fetch.mjs /tmp/de-drop-cache` -> `status: updated`.
- `/tmp/droptables.html` and the refreshed cache both validate with `ok === true`, 74 under-review rows, and no errors.
- Final counts: 10,364 mission rows, 441 distinct mission places, 52,914 total rows; parser-wide `stats.places` is 4,811.
- Warnings also include four pre-existing mission-rotation sum warnings: 300.12%, 100.50%, 100.50%, and 99.83%.
