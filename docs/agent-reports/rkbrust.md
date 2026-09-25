# Regions / Keys runtime adoption report

## Scope

Implemented the approved add-only DE adoption for `ExportRegions` and
`ExportKeys`. `ExportFusionBundles` remains a separate Node-only opt-in
namespace and is not wired into the Rust runtime.

## Counts

Source counts are from the cached official DE Public Export and the Preview
mirror recorded by `rkbshadow.md`.

| Area | Before | After / expected from deterministic merge |
| --- | --- | --- |
| Regions | DE 269 / mirror 354 / merged 354 | DE 269 / mirror 354 / merged 354; 85 mirror-only retained |
| Keys | DE 49 / mirror 578 / merged 578; 3 DE-only missing from app matrix | DE 49 / mirror 578 / merged 581; 3 Tau keys added, 532 mirror-only retained |
| FusionBundles | 51 DE records in separate namespace; not in `ExportBundles` | unchanged and still opt-in in Node; absent from Rust runtime |
| Completeness matrix | keys: 0 PASS / 3 FAIL / 0 CANNOT | keys: 3 PASS / 0 FAIL / 0 CANNOT expected after default Node merge; regions resolver rule added |

The after counts are source/merge-derived, not a live runtime run. No build or
test command was run under the no-compilation instruction.

## Validation and behavior

- Mirror is always the base; mirror-only records survive.
- Shared Regions keep mirror names/system names and graph fields; DE numeric
  identity fields are normalized and overlaid.
- Shared Keys keep mirror names, descriptions, stages, rewards, icons, and
  replay metadata; only codex flags overlay and absent fields fill.
- DE-only records retain literal DE English text and receive no synthetic
  stages, rewards, graph, or replay fields.
- The Rust adapter validates unique-name-derived records, requires non-empty
  literal `name`/`systemName` for DE-only Regions and `name`/`description` for
  DE-only Keys, enforces a 50% prior-DE-cache floor, and enforces an 80%
  merged-output floor against the mirror for both tables.
- Unresolved `nextNodes` references are counted and logged rather than hidden.
- Rust writes compact JSON atomically and refresh failures retain the mirror.
- Node `apply-merges` now applies Regions and Keys by default; `--with-rkb-shadow`
  additionally applies FusionBundles.

## Verification

- `nice -n 19 node --check scripts/de-export/apply-merges.mjs` — passed.
- `nice -n 19 node --check scripts/item-completeness.mjs` — passed.
- `nice -n 19 node --check tests/de-export/apply-merges.test.mjs` — passed.
- `nice -n 19 node --check scripts/de-export/adapters/regions-keys-bundles.mjs` — passed.
- `nice -n 19 git diff --check` — passed.
- Rust was reviewed statically twice, including every changed call signature,
  map insertion path, `Option`/`Result` flow, numeric literal, and `Value`
  accessor. Cargo/Tauri/build/test commands were not run.

## Open questions and risks

- The 269 current DE Regions all overlap the mirror, so no live DE-only Region
  canary exists in this cache; the resolver rule is covered by the existing
  synthetic canary test.
- DE `missionIndex` and `factionIndex` remain versioned export enumerations,
  not stable graph identifiers.

## Follow-up

Run the Rust unit tests and the real completeness matrix in the coordinator
environment, then verify one live refresh and one forced refresh transition.
