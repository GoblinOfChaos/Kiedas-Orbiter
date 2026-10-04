import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';
import { catalogTarget } from '../helpers/real-data-fixtures.mjs';

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'));

test('real data: every ledger row for a catalog-derived target has an image', { skip: !haveRealData }, async () => {
  const { exportsBundle, EI, nameToImage, uniqueNameToName, repo } = await loadRealHarness({ locale: 'en' });
  const { parseInventory } = await import(path.join(repo, 'src/lib/inventoryParser.js'));
  const { buildFarmingTargetsScreenModel } = await import(path.join(repo, 'src/lib/farmingTargets/screenModel.js'));
  const targets = [catalogTarget(exportsBundle, uniqueNameToName, 'Orokin Cell')];
  const inventoryData = parseInventory({}, exportsBundle, {}, 'en', null);
  const model = buildFarmingTargetsScreenModel({
    targets, reservations: [], inventoryData, exportData: exportsBundle,
    dropIndex: {}, wikiResourceIndex: {}, wikiVendorIndex: {}, imageMaps: { EI, nameToImage, uniqueNameToName },
  });
  const missing = model.ledger.filter((row) => !row.image).map((row) => row.name);
  assert.deepEqual(missing, [], `ledger rows without an image: ${missing.join(', ')}`);
});

test('real data: farmable resources are plain ledger leaves, never a made-in-Foundry "<Resource> Blueprint" row', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, EI, nameToImage, uniqueNameToName, repo } = await loadRealHarness({ locale: 'en' });
  const { parseInventory } = await import(path.join(repo, 'src/lib/inventoryParser.js'));
  const { buildFarmingTargetsScreenModel } = await import(path.join(repo, 'src/lib/farmingTargets/screenModel.js'));
  const inventoryData = parseInventory({}, exportsBundle, dict, 'en', null);
  const targets = [catalogTarget(exportsBundle, uniqueNameToName, 'Orokin Cell')];
  const model = buildFarmingTargetsScreenModel({
    targets, reservations: [], inventoryData, exportData: exportsBundle,
    dropIndex: {}, wikiResourceIndex: {}, wikiVendorIndex: {}, imageMaps: { EI, nameToImage, uniqueNameToName },
  });
  const names = model.ledger.map((row) => row.name);
  assert.ok(!names.some((name) => /^Orokin Cell Blueprint$/i.test(name)), `ledger still has: ${names.join(', ')}`);
  assert.ok(names.includes('Orokin Cell'), 'Orokin Cell should be a plain resource row');
});
