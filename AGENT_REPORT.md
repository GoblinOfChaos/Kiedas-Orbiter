# P56

P56's side-by-side acquisition model, its real-data harness test, and comparison reports remain the base for this work. P57 replaces only the model's relic/tier derivation with exact DE reward identities.

# P57 - DE relic agreement

## Root cause and change

P56 collected relics from the acquisition-source lists assembled in `src/lib/acquisitionModel/buildItemAcquisition.js:74-116`. Those lists include generic ingredient routes and display-name lookup results (`:77-84`), then `collectRelics` retained their source tier (`:94-116`). That allowed a generic Forma route, or an unrelated same-name route such as Boot Trophy, to be attributed to the requested item.

Added `src/lib/acquisitionModel/deRelicTruth.js:7-74`. It indexes DE `ExportRelics`/`ExportRewards` once, selects only the item, its blueprint, direct ingredients, and those ingredients' blueprints (`:45-56`), and returns every exact DE tier, setting `tierConflict` whenever one target has multiple DE tiers (`:65-73`). `buildItemRelics` now prefers those DE facts at `buildItemAcquisition.js:120-124`; `buildItemAcquisition` uses it at `:146-150`. The legacy source collector remains only as the no-DE-data fallback for synthetic/headless callers.

## Tests and before/after proof

- Added real-data tests in `tests/acquisition-model/buildItemAcquisition.test.mjs:164-207`:
  - the five named false-positive records;
  - every `discoverSubjects()` model relic set/tier against independently built DE truth rows;
  - three single-tier and three genuine-conflict cases;
  - three DE-absent generic rows.
- Before proof: a source-only copy under `$TMPDIR` (disk-backed `~/.cache/codex-tmp`, never `/tmp`) used the P56 committed model plus the new test. `timeout 240 nice -n 19 node --test --test-concurrency=2 tests/acquisition-model/buildItemAcquisition.test.mjs 2>&1 | tail -n 60` exited 1.
- After proof: the identical command exited 0 (the P57 file passed in 15.9 s).
- The temporary proof copy was deleted. A detached `git worktree` proof was unavailable because the linked-worktree administrative directory is mounted read-only; no stash was attempted.

## DE tier evidence

Each `x4` is the four DE refinement records carrying the same reward row. The full-catalog test checks every relic row; the listed named unresolved cases resolve as follows.

| Item / relic | Exact matching DE reward row(s) | Model output |
| --- | --- | --- |
| Forma Axi A10, A12, A13 | `/Lotus/Types/Recipes/Components/FormaBlueprint` Common x4 | Common |
| Ayatan Amber Star Requiem I-IV | `/Lotus/Types/Items/FusionTreasures/OroFusexOrnamentB` Common x4, each | Common, each |
| Sevagoth Prime Axi B10; Neo H5 | none; none | omitted; omitted |
| Burston Prime Lith S20; Neo H5 | none; `BurstonPrimeReceiver` Common x4 | omitted; Common |
| Bronco Prime Lith S20; Meso E8 | `BroncoPrimeReceiver` Common x4; none | Common; omitted |
| Ballistica Prime Lith S20; Meso E8; Axi N14 | `PrimeBallisticaLowerLimb` Common x4; none; none | Common; omitted; omitted |
| Nautilus Prime Axi N14; Neo H5 | `NautilusPrimeCerebrum` Rare x4; none | Rare; omitted |

The conflict checks retain, rather than choose between, all DE tiers: Odonata Prime/Axi V8 is Common+Uncommon; Sevagoth Prime/Lith S20 is Rare+Uncommon; Forma/Meso D1 is Common+Uncommon. Citrine Prime/Neo C11 is Common only.

## Comparison report

`scripts/acquisition-model-compare.mjs` now writes `category` on every difference, category counts for `no-acquisition-in-both`, and a route-only-in-old subclass with count plus no more than five names. Current 76 route-only-old records are all `foundry-build-sentence` (Nunchasa, Aksondol, Atterax Desert-Camo Skin, Hek Desert-Camo Skin, Karak Desert-Camo Skin).

| Class | Before | After |
| --- | ---: | ---: |
| foundry-text-leads-old | 58 | 58 |
| no-acquisition-in-both | 5,083 | 5,084 |
| relic-missing-in-old | 138 | 139 |
| relic-missing-in-model | 0 | 56 |
| route-only-in-old | 76 | 76 |
| tier-differs | 17 | 13 |

The comparison counts describe differences from the legacy drawers, not DE correctness. The whole-catalog P57 test is the DE invariant and passed with zero mismatches. Regeneration passed: 20,416 subjects and 5,355 differences.

## Validation and blocked work

- Passed: P57 real-data test file (before/after evidence above); comparison regeneration; `git diff --check`.
- Broad throttled suite: 64 passed, 1 failed. `tests/farming/acquisitionText.test.mjs:55` requires the missing, git-ignored `scratchwiki/wiki-resource-pages.json` and failed with `ENOENT`. This is unrelated to P57; per the brief it was not created or changed.
- No build, deployment, network access, Rust, data, i18n, `src-tauri`, or existing non-`src/lib/acquisitionModel` source file was changed. Wiki audit remains skipped because no stable machine-readable relic-set schema is selected.

## Exact P57 files changed

- `src/lib/acquisitionModel/deRelicTruth.js`
- `src/lib/acquisitionModel/buildItemAcquisition.js`
- `tests/acquisition-model/buildItemAcquisition.test.mjs`
- `scripts/acquisition-model-compare.mjs`
- `docs/agent-context/reports/acquisition-model-diff.json`
- `docs/agent-context/reports/acquisition-model-diff.md`
- `AGENT_REPORT.md`

The three pre-existing modified tracked files under `tests/.cache/` were preserved. Test-created untracked cache directories were deleted.
