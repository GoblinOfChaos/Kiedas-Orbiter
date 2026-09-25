# DE Upgrades/mods adapter

This slice adopts the English Digital Extremes `ExportUpgrades_en.json` asset while keeping the export-plus mirror as the catalog base. The adapter reads only the asset's `ExportUpgrades` array; wrapper sections such as `ExportModSet`, `ExportAvionics`, and `ExportFocusUpgrades` are not silently treated as mods.

For shared uniqueNames, mirror identity and text remain authoritative while DE numeric fields and `levelStats` replace their corresponding values. Numeric values are recursively rounded to six decimal places. Mirror-only records are retained. DE-only records receive DE's literal English `name`, a description derived from the first official `levelStats` text when the asset has no separate description, and a manifest icon path. `ExportManifest` texture locations are also added to `ExportImages.json` with their content hashes.

The runtime `src-tauri/src/de_upgrades.rs` refresh is non-fatal and validates at least 100 DE records and at least 80% of the mirror count before writing. `check_exports` runs it on a 24-hour TTL, and re-runs it whenever `ExportUpgrades.json` is newer than `de/ExportUpgrades_en.json`. The index, upgrades, and image-manifest requests are separated by at least one second. Validated outputs use the existing atomic JSON/byte writers; failed refreshes leave the existing mirror files available.

## Cache-only shadow comparison

```bash
nice -n 19 node scripts/de-export/shadow-upgrades.mjs \
  /home/jedwards/.cache/kiedas-de-export \
  /home/jedwards/.local/share/kiedas-orbiter-preview/data/export
```

The command writes `/tmp/de-shadow/upgrades-report.json` and checks the four adoption targets: Brood's Oversurge, Cold Front, Gastroparesis, and Infernum. It records DE-only and mirror-only counts plus manifest-backed hashed image URLs.
