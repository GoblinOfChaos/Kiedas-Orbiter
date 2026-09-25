# DE adoption slice 3: weapons

## Summary

The weapons adapter/merge/shadow pipeline and non-fatal Rust refresh remain in
place. This follow-up normalizes every numeric scalar and array element to six
decimal places before comparison and merge, preserving integer-valued results.

## Real-data result

The cached DE asset has 841 raw records and 839 unique records after adapter
identity mapping. The current Preview mirror has 842 records; 835 are
comparable, 4 are DE-only, and 7 are mirror-only. After normalization, the
hybrid report is 281 changed, 4 added, and 7 mirror-only retained.

Changed-field breakdown: `damagePerShot` 185, `fireRate` 55,
`omegaAttenuation` 44, `accuracy` 6, and `procChance` 2. The prior 843/8
mirror count was stale; this run read 842 records and 7 mirror-only records.
The detailed report is `/tmp/de-shadow/weapons-report.json`.

## Verification

- `nice -n 19 node scripts/de-export/shadow-weapons.mjs` — passed with the
  counts above and wrote `/tmp/de-shadow/weapons-report.json`.
- `nice -n 19 node tests/de-export/merge-weapons.test.mjs` — 5 tests passed.
- `nice -n 19 node --check scripts/de-export/adapters/merge-weapons.mjs` and
  `nice -n 19 node --check scripts/de-export/shadow-weapons.mjs` — passed.
- `git diff --check` — passed.
- `src-tauri/src/de_weapons.rs` was read twice after the final edit; no Cargo,
  rustc, build, bundler, or compile test was run.

## Open questions and risks

- The prior report recorded 843 mirror records and 8 mirror-only records; the
  current allowed Preview export reads 842 and 7. The drift is recorded rather
  than guessed or reconciled by editing external data.
- Rust compilation and runtime refresh behavior remain unverified by task
  restriction.
- The cache has 841 raw versus 839 unique DE identities; keyed mapping
  deterministically collapses duplicates as before.

## Suggested follow-ups

Run the throttled Preview Rust build and live refresh validation when permitted.
Review the four DE-only identities and translate any user-facing literal
English through localization.
