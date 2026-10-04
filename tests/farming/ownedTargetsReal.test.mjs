import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';
import { catalogTarget } from '../helpers/real-data-fixtures.mjs';

const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json');
const haveRealData = fs.existsSync(inventoryFile);

test('real data: two owned targets remain non-empty under the default additional-copies semantics', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' });
  const { exportsBundle, dict, repo } = harness;
  const { parseInventory } = await import(path.join(repo, 'src/lib/inventoryParser.js'));
  const { buildFarmingTargetsScreenModel } = await import(path.join(repo, 'src/lib/farmingTargets/screenModel.js'));
  const raw = structuredClone(JSON.parse(fs.readFileSync(inventoryFile, 'utf8')));
  const selected = ['Orokin Cell', 'Alloy Plate'].map((name) => catalogTarget(exportsBundle, harness.uniqueNameToName, name, `owned-${name.toLocaleLowerCase().replaceAll(' ', '-')}`));
  raw.MiscItems = [
    ...(raw.MiscItems ?? []).filter((entry) => !selected.some((target) => entry?.ItemType === target.uniqueName)),
    ...selected.map((target) => ({ ItemType: target.uniqueName, ItemCount: 1 })),
  ];
  const inventoryData = parseInventory(raw, exportsBundle, dict, 'en', null);
  const model = buildFarmingTargetsScreenModel({ targets: selected, inventoryData, exportData: exportsBundle, dropIndex: {} });
  for (const target of selected) {
    assert.ok(model.ledger.some((row) => row.usedBy.some((entry) => entry.targetId === target.id)), `empty ledger for owned target ${target.name}`);
  }
});
