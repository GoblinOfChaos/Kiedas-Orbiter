# DE Customs and Flavour adapter

This slice adapts the official Digital Extremes `ExportCustoms_en.json` and
`ExportFlavour_en.json` assets. The export-plus mirror remains the base for
shared records, including its localization and presentation metadata. DE-only
records are added with DE's literal English `name` and `description`; no name
is inferred from a path or invented from a missing dictionary key.

`ExportManifest.json` is the authoritative icon source. A manifest
`textureLocation` is split at its final `!`: the path becomes the record's
`icon`, and the content hash is added to `ExportImages.json`. This makes both
cosmetics and emotes resolve through the existing hashed DE asset-cache path.

`src-tauri/src/de_customs.rs` refreshes the two assets and the manifest as one
non-fatal operation. It requires at least 100 records and at least 80% of each
mirror table, writes raw and merged data atomically, uses a 24-hour cache, and
re-merges when either mirror file is newer than its raw DE cache. Requests are
spaced by at least one second. A failed refresh leaves the mirror untouched.

Run the finite cache-only shadow comparison with:

```bash
nice -n 19 node scripts/de-export/shadow-customs-flavour.mjs \
  /home/jedwards/.cache/kiedas-de-export \
  /home/jedwards/.local/share/kiedas-orbiter-preview/data/export
```

The command writes `/tmp/de-shadow/customs-flavour-report.json`.

Cosmetics still intentionally hides records under the existing rules: custom
records must be under `/Upgrades/Skins/`, and an unowned item with neither
`icon` nor `texture` is dropped; emotes must be under
`/Lotus/Types/Items/Emotes/`; ship decorations must come from
`ExportResources` and have one of the existing `decorationParents` values.
