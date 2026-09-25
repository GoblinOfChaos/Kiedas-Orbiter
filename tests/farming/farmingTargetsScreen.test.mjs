import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/screens/FarmingTargets.jsx', 'utf8');

test('Preview drawer lookup includes ledger ingredients', () => {
  assert.match(source, /for \(const entry of screenModel\.ledger\)/);
  assert.match(source, /map\.set\(entry\.itemType, \{ uniqueName: entry\.itemType/);
});

test('summary telemetry is not keyed to every screen model or filter change', () => {
  assert.match(source, /\}, \[isInventoryLoading, Boolean\(store\), targets\.length\]\);/);
  assert.doesNotMatch(source, /\}, \[isInventoryLoading, store, targets\.length, screenModel\]\);/);
});

test('place index is memoized separately from filter-dependent ranking', () => {
  assert.match(source, /const previewPlaceIndex = useMemo\(\(\) => IS_PREVIEW \? buildPreviewPlaceIndex/);
  assert.match(source, /\[dropIndex, wikiResourceIndex, wikiVendorIndex\]\);/);
  assert.match(source, /placeIndex: previewPlaceIndex/);
});
