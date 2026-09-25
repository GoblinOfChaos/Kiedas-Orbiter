# Regions / Keys / Bundles shadow adapter

This document describes the reviewed hand-off from the JavaScript shadow
adapter to a future Rust export loader. It is not a runtime switch. The
default `apply-merges.mjs` output is unchanged; the three tables are emitted
only with `--with-rkb-shadow`.

## Namespaces and output

- `ExportRegions`: merge into the app `ExportRegions` map. Keep mirror-only
  nodes and all mirror graph fields (`missionType`, `missionName`, `faction`,
  `levelOverride`, `enemySpec`, `rewardManifests`, `nextNodes`, `founders`).
  Add DE-only nodes with `uniqueName`, literal `name` and `systemName`, plus
  DE numeric identity fields.
- `ExportKeys`: merge into the app `ExportKeys` map. Keep mirror chain stages,
  rewards, icons, and replay metadata. Add the three DE-only Tau keys with
  literal `name`/`description`; do not invent chain stages or rewards.
- `ExportFusionBundles`: retain as its own output map and namespace. Never
  merge it into `ExportBundles`, whose 1,155 app records are commerce/reward
  bundles rather than Endo/fusion records.

## Rust fields and validation floors

The Rust module should deserialize the following optional fields without
renaming them:

| table | fields | required checks |
| --- | --- | --- |
| Regions | `uniqueName`, `name`, `systemName`, `systemIndex`, `nodeType`, `masteryReq`, `missionIndex`, `factionIndex`, `minEnemyLevel`, `maxEnemyLevel`; preserve all mirror graph fields | unique names; no mirror record deletion; DE-only name and planet non-empty; graph references resolve or are explicitly reported; reward manifest references are not overwritten |
| Keys | `uniqueName`, `name`, `description`, `parentName`, `codexSecret`, `excludeFromCodex`; preserve mirror `chainStages`, rewards, icon, replay fields | unique names; chain-stage and attachment references remain intact; DE-only records do not receive synthetic stages/rewards; 80% mirror floor is not a validity rule because the namespaces overlap only partially |
| FusionBundles | `uniqueName`, `description`, `codexSecret`, `fusionPoints` | unique names; `fusionPoints` is numeric and non-negative; validate the separate namespace; never compare its count to `ExportBundles` as a same-table floor |

All numeric values should use the existing six-decimal normalization rule.
Writes should be atomic. The category count must not collapse below 50% of the
previous cached category, and a same-namespace mirror floor of 80% should be
applied only to Regions/Keys after semantic review—not to FusionBundles versus
ExportBundles.

## Risks requiring review

DE literal English names are safe fallback display values for DE-only records,
but must not replace mirror localization keys on shared records. `name` and
`systemName` therefore remain mirror-authoritative when present. Numeric
region identity fields can still be parallel export enumerations; consumers
must not use `missionIndex` or `factionIndex` as stable graph IDs without a
separate DE-version validation. Key `parentName` and chain stages encode quest
semantics and must not be flattened. Fusion bundle consumers need an explicit
tagged namespace or separate lookup.
