import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScannerHookedNotification } from '../../src/lib/scannerNotification.js';
import { getRelicRewardCounts } from '../../src/lib/relicRewardModel.js';
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('scanner hooked notification evaluates translation at event time', () => {
  let translate = (key) => key;
  const getNotification = () => buildScannerHookedNotification(() => translate('app.scanner_title'));
  translate = () => 'Scanner';
  assert.equal(getNotification().title, 'Scanner');
});

test('scanner listener uses the latest translation function rather than an empty-deps stale closure', () => {
  const source = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
  assert.match(source, /buildScannerHookedNotification/);
  assert.match(source, /scannerTRef\.current/);
  const listener = source.slice(source.indexOf("listen('scanner-hooked'"), source.indexOf('// Toggle .sidebar-mode'));
  assert.doesNotMatch(listener, /\bt\s*\(/);
});

test('relic reward counts keep blueprint copies separate from completed ownership', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/overlays/RelicRewardOverlay.jsx'), 'utf8');
  assert.match(source, /getRelicRewardCounts\(item, inv\)/);
  const counts = getRelicRewardCounts(
    { name: 'Euphona Prime Blueprint' },
    { blueprintCount: 2, stock: 2, craftedCount: 0, isMastered: false },
  );
  assert.deepEqual(counts, { blueprintCount: 2, craftedCount: 0, isMastered: false });
  assert.equal(getRelicRewardCounts({ name: 'Euphona Prime Blueprint' }, { stock: 2 }).blueprintCount, 2);
});

test('real DE data: Prime Set and blueprint images resolve for both extractor sets', async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness({ locale: 'en' });
  const { parseInventory } = await import(path.join(repo, 'src/lib/inventoryParser.js'));
  const inventory = parseInventory({}, exportsBundle, dict, 'en', null);
  for (const name of ['Titan Extractor Prime', 'Distilling Extractor Prime']) {
    const set = inventory.primeSets[name];
    assert.ok(set, `${name} should be in Prime Sets`);
    assert.ok(set.image, `${name} set image should resolve from DE export data`);
    assert.ok(set.parts[0]?.image, `${name} blueprint image should resolve from DE export data`);
    assert.match(set.image, /^asset-cache:\/\/content\.warframe\.com\/PublicExport/);
    assert.match(set.parts[0].image, /^asset-cache:\/\/content\.warframe\.com\/PublicExport/);
  }
});
