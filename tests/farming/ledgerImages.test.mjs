import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';

const targetsFile = path.join(DEFAULT_DATA_DIR, 'user/farming-targets.json');
const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json');
const haveRealData = fs.existsSync(targetsFile) && fs.existsSync(inventoryFile);

test('real data: every ledger row for the current farming targets has an image', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, EI, nameToImage, uniqueNameToName, repo } = await loadRealHarness();
  const { parseInventory } = await import(path.join(repo, 'src/lib/inventoryParser.js'));
  const { buildFarmingTargetsScreenModel } = await import(path.join(repo, 'src/lib/farmingTargets/screenModel.js'));
  const store = JSON.parse(fs.readFileSync(targetsFile, 'utf8'));
  const targets = store.targets ?? [];
  assert.ok(targets.length > 0, 'no farming targets in the real store');
  const inventoryData = parseInventory(JSON.parse(fs.readFileSync(inventoryFile, 'utf8')), exportsBundle, dict, 'en', null);
  const model = buildFarmingTargetsScreenModel({
    targets, reservations: store.reservations, inventoryData, exportData: exportsBundle,
    dropIndex: {}, wikiResourceIndex: {}, wikiVendorIndex: {}, imageMaps: { EI, nameToImage, uniqueNameToName },
  });
  const missing = model.ledger.filter((row) => !row.image).map((row) => row.name);
  assert.deepEqual(missing, [], `ledger rows without an image: ${missing.join(', ')}`);
});

test('real data: farmable resources are plain ledger leaves, never a made-in-Foundry "<Resource> Blueprint" row', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, EI, nameToImage, uniqueNameToName, repo } = await loadRealHarness();
  const { parseInventory } = await import(path.join(repo, 'src/lib/inventoryParser.js'));
  const { buildFarmingTargetsScreenModel } = await import(path.join(repo, 'src/lib/farmingTargets/screenModel.js'));
  const store = JSON.parse(fs.readFileSync(targetsFile, 'utf8'));
  const inventoryData = parseInventory(JSON.parse(fs.readFileSync(inventoryFile, 'utf8')), exportsBundle, dict, 'en', null);
  const model = buildFarmingTargetsScreenModel({
    targets: store.targets ?? [], reservations: store.reservations, inventoryData, exportData: exportsBundle,
    dropIndex: {}, wikiResourceIndex: {}, wikiVendorIndex: {}, imageMaps: { EI, nameToImage, uniqueNameToName },
  });
  const names = model.ledger.map((row) => row.name);
  assert.ok(!names.some((name) => /^Orokin Cell Blueprint$/i.test(name)), `ledger still has: ${names.join(', ')}`);
  assert.ok(names.includes('Orokin Cell'), 'Orokin Cell should be a plain resource row');
});
