# P69 — Rahn Prism vendor placement

## Root cause

`buildPreviewPlaceIndex` indexed vendor acquisition labels exactly as supplied. The
real-data source uses `Rahn Prism Blueprint`, while the recipe ledger asks for the
canonical catalog item `Rahn Prism`. The existing catalog-key normalizer at
`src/lib/farmingTargets/screenModel.js:330` stripped only ` | Blueprint`, not a
plain ` Blueprint` suffix, and `add` at lines 352–363 never converted the source
label through that catalog lookup. Consequently, the `vendor:the quills` place
existed but had no source reachable by the Rahn Prism ledger row.

## Change

`src/lib/farmingTargets/screenModel.js` now recognizes either Blueprint suffix
spelling and canonicalizes each indexed source item through the existing
export-name lookup before creating its place-index key and row. This preserves an
unknown item label unchanged.

```diff
diff --git a/src/lib/farmingTargets/screenModel.js b/src/lib/farmingTargets/screenModel.js
@@
-  const nameKey = (value) => vendorKey(value, normalizer).replace(/\s*\|\s*blueprint$/i, '');
+  const nameKey = (value) => vendorKey(value, normalizer).replace(/\s*(?:\|\s*)?blueprint$/i, '');
@@
-    const place = sourcePlace(normalizedSource, item, { dict, regions, normalizer });
+    const canonicalItem = itemNameForKey(item) || item;
+    const place = sourcePlace(normalizedSource, canonicalItem, { dict, regions, normalizer });
@@
-    const key = lower(item, normalizer);
+    const key = lower(canonicalItem, normalizer);
@@
-      item,
+      item: canonicalItem,
```

## Before/after proof

I used a new, disk-backed temporary proof copy under `$TMPDIR`, excluding
`node_modules` and large data; it linked the existing dependencies and read-only
asset data. The proof directory was deleted before handoff.

All commands used `timeout 180 nice -n 19 node --test --test-concurrency=2`.

| Test file | Before | After (proof) | After (worktree) |
| --- | --- | --- | --- |
| `tests/farming/vendorPlaces.test.mjs` | FAIL, exit 1: `Rahn Prism should be under The Quills in Vendors` | PASS, exit 0 | PASS, exit 0 |
| `tests/farming/placeIndex.test.mjs` | PASS, exit 0 | PASS, exit 0 | PASS, exit 0 |
| `tests/farming/screenModel.test.mjs` | PASS, exit 0 | PASS, exit 0 | PASS, exit 0 |
| `tests/farming/ledger.test.mjs` | PASS, exit 0 | PASS, exit 0 | PASS, exit 0 |
| `tests/farming/farmNext.test.mjs` | PASS, exit 0 | PASS, exit 0 | PASS, exit 0 |
| `tests/farming/requirements.test.mjs` | PASS, exit 0 | PASS, exit 0 | PASS, exit 0 |
| `tests/ui/farming-targets-ssr.test.mjs` | PASS, exit 0 | PASS, exit 0 | PASS, exit 0 |
| `tests/relics/vault-state.test.mjs` | PASS, exit 0 | PASS, exit 0 | PASS, exit 0 |

`tests/farming/acquisitionText.test.mjs` was not run, exactly as directed. No
build or network access was used. `git diff --check` passed.

## Files changed

- `src/lib/farmingTargets/screenModel.js`
- `AGENT_REPORT.md`
