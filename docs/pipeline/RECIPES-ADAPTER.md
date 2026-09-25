# DE Recipes, Resources, and Images Adapter

This slice supplements the export-plus mirror with verified English Digital Extremes Public Export data. The mirror remains the baseline: records present only in the mirror are retained, and shared recipes keep mirror fields except for the app-consumed `resultType`, `buildPrice`, `buildTime`, `num`, and `ingredients` fields when DE supplies them.

`scripts/de-export/adapters/recipes.mjs` and `resources.mjs` normalize the cached DE arrays into the app's keyed record shape. `merge-recipes.mjs` performs the conservative recipe/resource merge and turns DE `ExportManifest.Manifest[].textureLocation` values (`path!contentHash`) into the app's `ExportImages.json` path→`{contentHash}` map. DE-only resource and Warframe records also receive their manifest icon path so `resolveImage` can use the hashed image entry.

The runtime implementation in `src-tauri/src/de_recipes.rs` fetches one DE index and then the recipe, resource, and image-manifest assets with at least one second between asset requests. It validates that recipes and resources each contain at least 100 records and at least 80% of the mirror count, writes each result through the existing temp-file/rename helpers, and keeps the mirror on any failure. The cache is refreshed at most once per 24 hours unless `check_exports(force: true)` is requested.

## Real-cache shadow command

Run the following finite, network-free command from the repository root:

```bash
nice -n 19 node scripts/de-export/shadow-recipes.mjs \
  /home/jedwards/.cache/kiedas-de-export \
  /home/jedwards/.local/share/kiedas-orbiter-preview/data/export
```

The command prints counts, writes the complete JSON ledger to `/tmp/de-shadow/recipes-report.json`, and verifies Narin's blueprint, Warframe result, and three component dependencies each resolve to a name and manifest image. The report records every DE-only recipe, resource, and image path plus every mirror-only record.

The checked cache result for adoption slice 4 was: DE recipes 1,885 vs mirror 2,005 (19 DE-only; 139 mirror-only), DE resources 3,545 vs mirror 3,524 (47 DE-only; 26 mirror-only), and 20,136 manifest image records with 151 image paths absent from the mirror. Narin's blueprint and all three component records resolved with names and hashed image entries.

