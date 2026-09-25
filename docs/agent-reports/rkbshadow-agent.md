# Agent report: Regions / Keys / Bundles shadow adapters

## Plan

1. Read the design, compatibility ledger, completeness plan, existing DE adapters, shadow reports, and merge pipeline.
2. Add pure Regions, Keys, and FusionBundles adapters plus hybrid merge/report helpers that preserve mirror records and app-consumed fields.
3. Add fixture-backed Node tests, matrix canaries, and an explicit opt-in `apply-merges` output path; leave default runtime output unchanged.
4. Run only non-compiling Node/static checks and inspect real cached DE versus Preview data.
5. Document Rust follow-up requirements and write the real-data report with counts, field diffs, and examples.

## Summary

Implemented Regions, Keys, and separate FusionBundles shadow adapters with
non-destructive hybrid merges and per-field reports. Added opt-in
`--with-rkb-shadow` output only; default `apply-merges` output remains the
existing Preview baseline. Added matrix canaries for a DE-only region name /
planet and a DE-only key name, fixture-backed adapter tests, and the Rust
follow-up document.

## Files changed

- `scripts/de-export/adapters/regions-keys-bundles.mjs`
- `scripts/de-export/shadow-regions-keys-bundles.mjs`
- `scripts/de-export/apply-merges.mjs`
- `scripts/item-completeness.mjs`
- `tests/de-export/fixtures/regions-keys-bundles.mjs`
- `tests/de-export/regions-keys-bundles-adapter.test.mjs`
- `tests/de-export/apply-merges.test.mjs`
- `tests/completeness/rkb-canaries.test.mjs`
- `docs/pipeline/REGIONS-KEYS-BUNDLES-ADAPTER.md`
- `docs/agent-reports/rkbshadow.md`

## Verification

- `nice -n 19 bash -c 'for f in ...; do node --check "$f"; done'` — passed.
- `nice -n 19 node --test "tests/**/*.test.mjs"` — passed, 29/29.
- `nice -n 19 node scripts/de-export/shadow-regions-keys-bundles.mjs ...` — real report: Regions 269/354/0/269/85; Keys 49/578/3/1/532; FusionBundles 51/0/51/0/0.
- `git diff --check` — passed.

## Open questions and risks

- The design/ledger counts are stale on this data: current Preview has 578 keys and 1,164 ExportBundles; see `docs/agent-reports/rkbshadow.md`.
- DE `missionIndex` and `factionIndex` are added but remain versioned enumerations, not stable graph IDs.
- FusionBundles remains a distinct namespace and is not wired to `ExportBundles` consumers.

## Suggested follow-ups

- Review the Rust adapter fields and validation floors in `docs/pipeline/REGIONS-KEYS-BUNDLES-ADAPTER.md` before any runtime adoption.

## Execution notes

- An initial shell inspection attempted `nice -n 19 for ...`, which is invalid shell syntax; no project command or file change occurred.
- A finite data-shape inspection then assumed every category had a first record and crashed when the app had no `ExportFusionBundles.json`; no project command or file change occurred.
