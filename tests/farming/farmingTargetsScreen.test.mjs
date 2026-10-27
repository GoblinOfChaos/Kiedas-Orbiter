import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/screens/FarmingTargets.jsx', 'utf8');
const drawerSource = fs.readFileSync('src/lib/farmingTargets/drawerLookup.js', 'utf8');

test('Preview drawer lookup includes ledger ingredients', () => {
  assert.match(source, /buildFarmingDrawerLookup/);
  assert.match(drawerSource, /for \(const entry of ledger \?\? \[\]\)/);
  assert.match(drawerSource, /map\.set\(entry\.itemType, \{ uniqueName: entry\.itemType/);
});

test('summary telemetry is not keyed to every screen model or filter change', () => {
  assert.match(source, /\}, \[isInventoryLoading, Boolean\(store\), targets\.length\]\);/);
  assert.doesNotMatch(source, /\}, \[isInventoryLoading, store, targets\.length, screenModel\]\);/);
});

test('place index is memoized separately from filter-dependent ranking', () => {
  assert.match(source, /const previewPlaceIndex = useMemo\(\(\) => IS_PREVIEW \? runFarmingSpan\('farming\.place_index\.build'/);
  assert.match(source, /\[dropIndex, wikiResourceIndex, wikiVendorIndex, exportVendorIndex, marketIndex, acquisitionOverrides, exportData\]\);/);
  assert.match(source, /placeIndex: previewPlaceIndex/);
});

test('the screen shows no wiki-listed enemy area line and does not load wiki enemy data', () => {
  assert.doesNotMatch(source, /data-farming-enemy-area/);
  assert.doesNotMatch(source, /enemyAreas|loadEnemyModules|createWikiStore/);
});
