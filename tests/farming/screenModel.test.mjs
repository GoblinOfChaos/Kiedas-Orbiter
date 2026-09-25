import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFarmingTargetsScreenModel } from '../../src/lib/farmingTargets/screenModel.js';

test('screen model uses engine ledger and keeps chance rows visible', () => {
  const model = buildFarmingTargetsScreenModel({
    targets: [{ id: 'target', uniqueName: 'T', name: 'Target', quantity: 1, reservations: [] }],
    inventoryData: {
      all: [{ unique_name: 'O', name: 'Ore', quantity: 2 }],
      craftable: [{ resultType: 'T', ingredients: [{ itemType: 'O', name: 'Ore', need: 5 }] }],
    },
    dropIndex: {
      O: [
        { type: 'mission', nodeName: 'Alpha', chance: 0.1, rotation: 'B' },
        { type: 'mission', nodeName: 'Alpha', chance: 0.4, rotation: 'A' },
      ],
    },
  });
  assert.equal(model.ledger[0].stillNeeded, 3);
  assert.equal(model.ranked[0].place.name, 'Alpha');
  assert.deepEqual(model.ranked[0].coveredItems[0].sources.map((source) => source.chance), [0.4, 0.1]);
  assert.equal(model.ranked[0].place.level, 'node');
});

test('minimum chance is opt-in and does not invent planet chances', () => {
  const input = {
    targets: [{ id: 'target', uniqueName: 'T', name: 'Target', quantity: 1 }],
    inventoryData: { all: [], craftable: [{ resultType: 'T', ingredients: [{ itemType: 'O', name: 'Ore', need: 1 }] }] },
    dropIndex: { O: [{ type: 'mission', nodeName: 'Alpha', chance: 0.01 }] },
  };
  assert.equal(buildFarmingTargetsScreenModel(input).ranked.length, 1);
  assert.equal(buildFarmingTargetsScreenModel({ ...input, filters: { minChance: 0.05 } }).ranked.length, 0);
});

