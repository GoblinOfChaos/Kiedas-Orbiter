# Regions, Keys, and Bundles: DE adoption design analysis

This document is analysis only. No runtime adapter is implemented here.
Evidence is the cached official DE Public Export compared with the real
Preview export directory, as recorded in `COMPAT-LEDGER.md`.

## Regions

DE has 269 records and the mirror has 354. All 269 DE keys are already in the
mirror; the mirror has 85 additional nodes, including hubs, PvP nodes, and
newer quest or social nodes. The schemas are not interchangeable: DE provides
compact mission identity and numeric fields (`missionIndex`, `factionIndex`,
`nodeType`, levels), while the mirror adds runtime graph and mission metadata
such as `missionType`, `missionName`, `faction`, `levelOverride`, `enemySpec`,
`rewardManifests`, `nextNodes`, and `founders`. DE also supplies literal
English names while the mirror supplies localization keys.

The adapter should use the mirror as the graph base, overlay only verified DE
scalar identity fields where the consumer explicitly needs them, and retain
mirror-only nodes. It must not replace `nextNodes`, reward manifests, enemy
specifications, or level overrides with absent DE values. A future design must
first inventory every consumer of `ExportRegions` and define whether DE's
`missionIndex`/`factionIndex` are authoritative identity fields or merely
parallel export enumerations. It should validate graph closure and reward
manifest references before writing.

## Keys

DE has 49 records; the mirror has 578. There are 46 shared keys, three DE-only
Tau Prologue keys, and hundreds of mirror-only quest-stage keys. Shared records
show systematic differences in `chainStages`, `rewards`, `mission`, and
`replayable`, as well as localized `name`, `description`, and `icon`. A key is
not merely an item row: its chain stages can contain trigger messages,
attachments, and quest progression references. The mirror therefore has
semantic quest-state material absent from DE's compact records.

The adapter should preserve the mirror chain graph and quest-stage records,
overlay DE literal text only for DE-only records, and merge DE fields only
after a per-field consumer audit. DE-only keys must be added without
inventing `chainStages`, `rewards`, icons, or replay behavior. Validation must
check parent/stage references and distinguish a quest key from a consumable
item key before adoption.

## Bundles

DE's `ExportFusionBundles` has 51 records and the mirror's `ExportBundles` has
1,164, with no shared unique names in the cached comparison. This is a
namespace and semantic mismatch, not a filename mismatch. DE records are
fusion/Endo bundles, with fields such as `fusionPoints`; the mirror contains
store and reward bundles with components, purchase quantities, icons, and
commerce metadata. A direct merge would silently mix currency-upgrade bundles
with purchasable/reward bundles.

The required design is a separate DE FusionBundles catalog and an explicit
consumer mapping. Only after consumers are identified should any DE record be
added to an existing app bucket. If a consumer needs both, it should receive a
tagged union or separate lookup keyed by namespace, not a merged
`ExportBundles` map. Cross-links must be validated by exact unique name and
never inferred from display names.

## Shared adapter safeguards

All three future adapters should use deterministic unique-name maps, preserve
mirror-only records, add DE-only records with literal English only, normalize
numeric floats to six decimals, and write atomically. They need per-file
minimums based on the current category size, an 80% mirror floor where the
source is intended to cover the same namespace, a 24-hour TTL, and re-merge
when a mirror input is newer. Bundles must not use the 80% rule against
`ExportBundles` because the ledger proves the namespaces are unrelated.
