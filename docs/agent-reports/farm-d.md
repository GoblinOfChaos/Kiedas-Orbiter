# farm-d agent report

## Fix round plan

1. Add failing-first regression coverage for owned shared leaves, source-section enemy merging, target record identity, acquisition-only leaves, and compact input output.
2. Fix recipe classification, place-type mapping/merging, deterministic place-name normalization, and proof target/input rendering.
3. Add the verified Conclave-only `Blind Shot` target to the real evidence input and regenerate the proof and worksheet.
4. Run the required farming test suite, static checks, and exact evidence command without compilation, commits, pushes, or marketplace writes.

## Task 7: place index

Built `placeIndex.js` and `placeAliases.js`. It consumes parsed drop sections, excludes under-review/zero-chance rows, preserves fractional chances, maps enemy wiki areas and fixed-boss missions, keeps unmatched names unmatched, and marks Conclave using `(Conclave)`, `Weekly Conclave Challenge Reward`, or a Conclave section/label. Added focused tests: 2 passed.

Real-data preparation checked the cached DE parsed tables and found the exact Conclave place pattern `Saturn/Cephalon Capture (Conclave)` plus the exact weekly reward label. The real proof audit after excluding pre-U36 files was `898/1020` enemies with location, `713/1007` planets matched, and `55/624` missions matched. These counts are snapshot-derived and are not asserted as current live data.

## Task 8: Farm-next ranking

Built deterministic coverage ranking with coverage, still-needed quantity, best chance, and name/id tie-breaks. Minimum chance is off by default; source chances remain on every covered item. Combined ranking hides ordinary Conclave places and surfaces Conclave-only items with a reason; the Conclave tab always includes them. Focused tests: 4 passed.

## Task 9: proof

Built `scripts/farming-targets-proof.js` with sha256 inputs, snapshot, target identities, optional requirement/recipe edges, ledger, top-15 ranking, and audit output. Added fixture coverage for success, malformed input (exit 1), and recipe cycles (exit 2). Focused proof tests: 3 passed.

The real run used the read-only player inventory, DE `ExportRecipes`, cached DE parsed drop tables, DE ExportRegions, and the official-wiki JSON snapshot. Targets were Atlas Prime Systems and Ash Prime Chassis; they share Gallium, and Argon Crystal remained at 2 needed. No Conclave-only mod target was selected because the raw inventory target path did not expose one verifiably. Raw stdout is saved in `docs/superpowers/evidence/2026-09-24-farm-next-proof.txt`; the 10-line worksheet is beside it.

## Verification and deviations

- Exact final command: `nice -n 19 node --test tests/farming/*.test.mjs` -> 44 tests, 44 pass, 0 fail.
- Exact static checks: `nice -n 19 node --check scripts/farming-targets-proof.js`; equivalent checks for `placeIndex.js`, `placeAliases.js`, and `farmNext.js`; `git diff --check` -> all pass.
- No cargo, Tauri, Vite, npm/pnpm build, commit, push, or live marketplace write was performed.
- `inventoryParser.js` could not be imported by plain Node due to its extensionless `warframeUtils` import; the permitted temporary `/tmp` craftable extraction was used instead. The real wiki directory also lacked `index.json`, so the proof used `Module_DatastoreManifest.json`'s official snapshot attribution timestamp.

## Fix round

### Summary

- Fixed Gallium loss in `requirements.js`: recipes explicitly marked `craftable: false` remain direct leaves. The proof normalizer marks DE `/Lotus/Types/Items/` recipe-source outputs as direct resources; actual crafted target/component recipes still expand. Gallium now prints required 7, owned 1326, still needed 0, with Ash 3 and Atlas 4 contributors.
- Fixed enemy source mapping in `placeIndex.js`: wiki-confirmed enemies remain `enemy` across `modByDrop`, `resourceByDrop`, and all other by-source sections. Corrupted Vor now merges into one place.
- Added deterministic `(Caches)`, `Event:`, and `Planet/Node` candidate normalization for audit/region joins; no fuzzy matching. Real audit remains enemies 898/1020 with location, planets 713/1007 matched, missions 55/624 matched.
- Added acquisition-only direct leaves and included real parsed-table Conclave-only Blind Shot as the third evidence target. The proof prints `[PvP]` and `Conclave-only source for Blind Shot`.
- Compact proof inputs now hash inventory, targets, parsed drop tables, ExportRegions, and recipe source individually; wiki JSON is one sorted-name combined hash. `--verbose-inputs` restores per-file wiki hashes. Snapshot source is printed.
- Corrected the real evidence target artifact so each id/name/itemType is one record; added a regression assertion.

### Files changed

- `src/lib/farmingTargets/requirements.js`, `src/lib/farmingTargets/placeIndex.js`, `src/lib/farmingTargets/placeAliases.js`
- `scripts/farming-targets-proof.js`
- `tests/farming/requirements.test.mjs`, `tests/farming/placeIndex.test.mjs`, `tests/farming/proof.test.mjs`
- `docs/superpowers/evidence/2026-09-24-farm-next-real-targets.json`
- Regenerated `docs/superpowers/evidence/2026-09-24-farm-next-proof.txt` and `...proof-worksheet.md`

### Verification

- `nice -n 19 node --test "tests/farming/*.test.mjs"` -> 10 test files, 10 pass, 0 fail, 0 cancelled.
- `nice -n 19 node --check` for proof script and all changed farming modules -> passed.
- `git diff --check` -> passed.
- Real evidence command: `nice -n 19 node scripts/farming-targets-proof.js ... --explain` with read-only preview inventory, cached parsed DE tables, cached DE ExportRegions, cached recipe source, and wiki JSON snapshot -> passed; output regenerated.
- No cargo, Tauri, Vite, npm/pnpm build/test, commit, push, marketplace write, app/inventory mutation, or files outside the worktree were performed. The proof only read the external source/cache inputs named above.

### Open questions and risks

- The source snapshot is `2026-08-30T18:56:00.283Z`, read from `Module_DatastoreManifest.json._attribution.converted_at`; it is not a live refresh.
- The DE recipe-source classification intentionally treats `/Lotus/Types/Items/` outputs as direct resources. If DE introduces a genuine craft recipe under that namespace, the normalizer needs an explicit metadata override.
- Existing real audit misses remain unmatched rather than guessed; improving them requires additional verified primary-source joins.

### Fix round follow-up

- `rankPlaces` defaults nullish `filters.tab` to `all`; combined ranking now admits all needed items from a Conclave place when that place serves a Conclave-only item, so the real Conclave places cover Argon Crystal and Blind Shot together.
- Added two explicit default-ranking regressions: Conclave-only coverage is ranked first with `pvp: true` and the reason, while ordinary-only needs exclude Conclave places.
- Updated proof output to show `[PvP]` in the main ranking. Regenerated evidence with the same command and targets; ranks 1-14 are Conclave places with coverage 2 and the Blind Shot reason, and Corrupted Vor is rank 15.
- Required command: `nice -n 19 node --test "tests/farming/*.test.mjs"` -> 10 tests, 10 pass, 0 fail, 0 cancelled.
- Static checks: `nice -n 19 node --check src/lib/farmingTargets/farmNext.js`; `nice -n 19 node --check scripts/farming-targets-proof.js`; `git diff --check` -> all passed.
- Real proof command passed with the existing read-only inventory, cached parsed DE tables, cached ExportRegions, cached recipe source, and official-wiki JSON snapshot. No build, commit, push, or live marketplace write.

## Files created/modified

- `src/lib/farmingTargets/placeIndex.js`
- `src/lib/farmingTargets/placeAliases.js`
- `src/lib/farmingTargets/farmNext.js`
- `scripts/farming-targets-proof.js`
- `tests/farming/placeIndex.test.mjs`
- `tests/farming/farmNext.test.mjs`
- `tests/farming/proof.test.mjs`
- `tests/farming/fixtures/*`
- `docs/superpowers/evidence/2026-09-24-farm-next-proof.txt`
- `docs/superpowers/evidence/2026-09-24-farm-next-proof-worksheet.md`
- `AGENT_REPORT.md`
