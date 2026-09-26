# DE official localisation adapter

Phase 1 keeps the mirror export as the canonical record set and overlays
literal fields from Digital Extremes' per-locale PublicExport files in memory.
Rust caches `index_<locale>.txt.lzma` and the 14 localized category files under
`data/export/de/<Category>_<locale>.json`; failed refreshes retain the prior
file and are non-fatal.

`buildRuntimeExportBundle` calls `applyDeLocale` after the normal gap-fill and
before consumers receive the bundle. Records are matched only by
`uniqueName`. `name`, `description`, `passiveDescription`, Warframe ability
text, and localized Upgrade `levelStats` are copied only when the DE value is a
non-empty literal. Missing records and DE `/Lotus/` locTags retain mirror data.
English bypasses the adapter, so changing back to English returns the original
mirror fields without rewriting any export file.

The adapter covers `ExportWarframes`, `ExportWeapons`, `ExportUpgrades`,
`ExportCustoms`, `ExportFlavour`, `ExportResources`, `ExportRelicArcane`,
`ExportGear`, `ExportRegions`, `ExportSentinels`, `ExportKeys`, `ExportDrones`,
`ExportFusionBundles`, and `ExportSortieRewards`. The recipe export is
intentionally excluded because DE publishes it identically for every locale.

The finite cache helper can fetch `de`, `fr`, and `ja` fixtures with at least
one second between requests. Each JSON file must contain at least one record
and may not collapse below 80% of its prior count. The parity harness always
checks synthetic invariants; cached-locale comparisons run when locale files
are present.

