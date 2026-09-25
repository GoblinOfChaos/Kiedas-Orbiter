# DE Sentinels and Gear adapter

This slice adapts the official Digital Extremes `ExportSentinels_en.json` and
`ExportGear_en.json` assets while keeping the export-plus mirror as the runtime
base. Shared records retain mirror localization keys, icons, commerce fields,
and other presentation metadata. DE overlays only fields consumed by the
inventory parser: Sentinel stats/classification and Gear `parentName` plus
`codexSecret`. DE-only records are added with DE's literal English `name` and
`description`; mirror-only records are never removed.

The Node adapter is `scripts/de-export/adapters/sentgear.mjs`; the merge and
six-decimal numeric normalization are in `merge-sentgear.mjs`. The Rust
runtime implementation is `src-tauri/src/de_sentgear.rs`, called non-fatally
from `check_exports`. It reads the official index, waits at least one second
between manifest requests, validates Sentinels at a category-specific minimum
of 30 and Gear at 100, requires each file to be at least 80% of its mirror,
and writes both the raw DE cache and merged mirror atomically.

The runtime refresh uses a 24-hour TTL and re-merges when either mirror file is
newer than its DE cache. A failed request, parse, count validation, or write
leaves the last valid mirror in place. No Warframe Market data is used.

## Shadow command

```bash
nice -n 19 node scripts/de-export/shadow-sentgear.mjs \
  /home/jedwards/.cache/kiedas-de-export \
  /home/jedwards/.local/share/kiedas-orbiter-preview/data/export
```

The command is cache-only and writes the complete report to
`/tmp/de-shadow/sentgear-report.json`.

## Consumer rules

Sentinels feed `inventoryParser.js` companion classification and the Foundry
companion tab. Gear feeds the full `consumables_catalog`; Foundry filters that
catalog to recipes and deduplicates display names. The adapter does not change
those ownership, recipe, or category rules.
