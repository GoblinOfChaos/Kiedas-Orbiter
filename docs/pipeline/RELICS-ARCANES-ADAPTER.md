# DE Relics and Arcanes adapter

This slice adapts the cached Digital Extremes `ExportRelicArcane_en.json` asset. The mirror remains the base: shared records keep mirror localization keys and mirror-only records remain. DE-only records use DE's literal English `name` and `description` values.

The asset contains both categories in one array. Records whose `uniqueName` contains `/CosmeticEnhancers/` are arcanes; the remaining records are relics. Relic records preserve DE's supplied `relicRewards` only; the adapter does not manufacture an `ExportRewards` map or convert a DE record into a missing `rewardManifest`.

`ExportRewards.json` has no corresponding DE asset in the fetched category set. A newly added relic therefore resolves rewards only when its DE record has `relicRewards`; otherwise it needs a matching mirror `rewardManifest` and an existing mirror `ExportRewards` entry. No reward data is inferred from names, eras, or other records.

The arcane allowlist/category gate in `src/lib/inventoryParser.js` is unchanged. Consequently, DE-only arcanes not recognized by `detectArcaneCategory` or `ARCANE_DISPLAY_NAME_CATEGORY` can still be hidden by the existing inventory behavior; this slice does not broaden that gate.

Run the finite cache-only shadow comparison with:

```bash
nice -n 19 node scripts/de-export/shadow-relics-arcanes.mjs \
  /home/jedwards/.cache/kiedas-de-export \
  /home/jedwards/.local/share/kiedas-orbiter-preview/data/export
```

The command writes `/tmp/de-shadow/relics-arcanes-report.json` with DE-only, mirror-only, changed-field, and reward-source ledgers.
