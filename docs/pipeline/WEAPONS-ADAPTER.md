# Weapons DE adapter

This slice compares cached Digital Extremes PublicExport
`ExportWeapons_en.json` with the Preview runtime's `ExportWeapons.json`.
The shadow run read `/home/jedwards/.cache/kiedas-de-export` and made no
network request.

## Shape and field policy

DE supplies an `ExportWeapons` array. The adapter accepts that wrapper, an
array, or a keyed record map and emits a deterministically sorted object keyed
by `uniqueName`. It copies only fields read by the app's inventory, mastery,
classification, and Riven paths. Unknown DE fields are not forwarded.

For shared records, the export-plus mirror remains the base: localization,
images, commerce metadata, behaviours, and other presentation fields remain
untouched. DE replaces only adapter app-readable fields when present. Numeric
scalars and numeric array elements are normalized to six decimal places before
comparison and merge; integer-valued results stay integers. DE-only records
are added with literal English text, and mirror-only records are retained.

## Refresh behavior

`src-tauri/src/de_weapons.rs` follows the Warframes refresh pattern. It reads
the official DE index, resolves `ExportWeapons_en.json!<hash>`, waits one
second before the manifest request, validates record counts, writes the raw
asset atomically under `data/export/de/`, and atomically writes the hybrid
mirror. It is non-fatal with a 24-hour TTL in `check_exports`.

## Real-data shadow result

The cache has 841 raw DE records and 839 unique adapter records. The current
Preview mirror has 842 records; 835 are comparable, 4 are DE-only, and 7 are
mirror-only. The normalized merge has 281 changed existing records, 4
DE-only additions, and 7 mirror-only records retained.

Changed-field breakdown: `damagePerShot` 185, `fireRate` 55,
`omegaAttenuation` 44, `accuracy` 6, and `procChance` 2. The previous 843/8
mirror count was stale; this run read 842/7.

The complete report is `/tmp/de-shadow/weapons-report.json`.
