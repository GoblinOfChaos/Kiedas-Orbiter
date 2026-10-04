import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';

const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json');
const haveRealData = fs.existsSync(inventoryFile);

test('real data: two owned targets remain non-empty under the default additional-copies semantics', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness();
  const { parseInventory } = await import(path.join(repo, 'src/lib/inventoryParser.js'));
  const { buildFarmingTargetsScreenModel } = await import(path.join(repo, 'src/lib/farmingTargets/screenModel.js'));
  const inventoryData = parseInventory(JSON.parse(fs.readFileSync(inventoryFile, 'utf8')), exportsBundle, dict, 'en', null);
  const ownedEntries = (inventoryData.all ?? []).filter((item) => item?.unique_name && Number(item.quantity ?? (item.owned ? 1 : 0)) > 0);
  const selected = [];
  for (const item of ownedEntries) {
    const target = { id: `owned-${selected.length}`, uniqueName: item.unique_name, name: item.name, image: item.image, quantity: 1 };
    const model = buildFarmingTargetsScreenModel({ targets: [target], inventoryData, exportData: exportsBundle, dropIndex: {} });
    if (model.ledger.some((row) => row.usedBy.some((entry) => entry.targetId === target.id))) selected.push(target);
    if (selected.length === 2) break;
  }
  assert.equal(selected.length, 2, `could not find two owned real-data targets with requirement rows`);
  const model = buildFarmingTargetsScreenModel({ targets: selected, inventoryData, exportData: exportsBundle, dropIndex: {} });
  for (const target of selected) {
    assert.ok(model.ledger.some((row) => row.usedBy.some((entry) => entry.targetId === target.id)), `empty ledger for owned target ${target.name}`);
  }
});
