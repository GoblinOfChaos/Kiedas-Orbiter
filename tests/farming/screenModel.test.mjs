import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildFarmingTargetsScreenModel } from '../../src/lib/farmingTargets/screenModel.js';

const fixture = JSON.parse(fs.readFileSync(path.resolve('tests/farming/fixtures/screen-model-defects.json'), 'utf8'));

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

test('resolves mission types and excludes nameless provenance places', () => {
  const model = buildFarmingTargetsScreenModel({
    targets: [{ id: 'part', uniqueName: 'PART', name: 'Narin Chassis', quantity: 1 }],
    inventoryData: { all: [], craftable: [{ resultType: 'PART', uniqueName: 'PART_BLUEPRINT', bpName: 'Narin Chassis Blueprint', ingredients: [{ itemType: 'RAW', name: 'Argon Crystal', need: 2 }] }] },
    exportData: { dict: {}, ExportRecipes: {} },
    dropIndex: { PART_BLUEPRINT: [{ type: 'mission', nodeName: 'Tuvul Commons', missionType: 'MT_VOID_FLOOD', chance: 0.5 }], RAW: [{ type: 'mission', source: 'drops.wf', missionType: 'MT_CACHE', chance: 0.5 }] },
  });
  assert.equal(model.ledger.some((row) => row.name === 'Narin Chassis Blueprint'), true);
  assert.equal(model.ranked.some((row) => row.place.name === 'Tuvul Commons'), true);
  assert.equal(model.ranked.some((row) => row.place.name === 'Unknown source' || row.place.name === 'drops.wf' || row.place.name === 'browse.wf'), false);
  assert.equal(model.ranked.some((row) => /^MT_/.test(row.place.missionType ?? '')), false);
});

test('recipe-less user targets remain acquirable and preserve enemy and bounty places', () => {
  const model = buildFarmingTargetsScreenModel({
    ...fixture,
    targets: fixture.targets,
    inventoryData: { all: [], craftable: [] },
  });
  assert.equal(model.unresolved.length, 0);
  assert.equal(model.ledger.length, 2);
  assert.deepEqual(model.ranked.map((row) => row.place.name).sort(), ['Test Bounty', 'Test Enemy', 'Narin Node'].sort());
  assert.ok(model.ranked.every((row) => row.place.name !== 'drops.wf'));
  assert.equal(model.ranked.find((row) => row.place.name === 'Narin Node').place.planet, 'Earth');
});

test('source rows match by item type or display name and expand component sub-recipes', () => {
  const model = buildFarmingTargetsScreenModel({
    ...fixture,
    targets: [{ id: 'frame', uniqueName: '/Items/Frame', name: 'Frame', quantity: 1 }],
    dropIndex: {
      '/Resources/Alloy': [{ type: 'mission', nodeName: 'Alloy Node', region: 'Mars', source: 'drops.wf', chance: 0.4 }],
    },
  });
  assert.deepEqual(model.ledger.map((row) => [row.itemType, row.stillNeeded]), [['/Resources/Alloy', 3], ['/Items/FrameChassis', 1]]);
  assert.equal(model.ranked[0].place.name, 'Alloy Node');
  assert.equal(model.ranked[0].place.planet, 'Mars');

  const byDisplayName = buildFarmingTargetsScreenModel({
    targets: [{ id: 'mod', uniqueName: '/Mods/TestMod', name: 'Test Mod', quantity: 1 }],
    inventoryData: { all: [], craftable: [] },
    dropIndex: { '/Mods/TestMod': [{ type: 'mission', nodeName: 'Mod Node', source: 'drops.wf', chance: 0.3, itemName: 'Test Mod' }] },
  });
  assert.equal(byDisplayName.ranked[0].coveredItems[0].sources[0].source, 'Mod Node');
});
test('screen source filters completed target reservations from the ledger', () => {
  const source = fs.readFileSync('src/lib/farmingTargets/screenModel.js', 'utf8');
  assert.match(source, /activeTargetIds/);
  assert.match(source, /activeTargetIds\.has\(reservation\?\.targetId\)/);
});

test('completed target reservations stay stored but do not enter the ledger', () => {
  const model = buildFarmingTargetsScreenModel({
    targets: [
      { id: 'active', uniqueName: 'T', name: 'Target', quantity: 1, status: 'active' },
      { id: 'done', uniqueName: 'D', name: 'Done', quantity: 1, status: 'complete' },
    ],
    reservations: [
      { itemType: 'O', targetId: 'active', quantity: 2 },
      { itemType: 'O', targetId: 'done', quantity: 9 },
    ],
    inventoryData: {
      all: [{ unique_name: 'O', name: 'Ore', quantity: 20 }],
      craftable: [
        { resultType: 'T', ingredients: [{ itemType: 'O', name: 'Ore', need: 5 }] },
        { resultType: 'D', ingredients: [{ itemType: 'O', name: 'Ore', need: 5 }] },
      ],
    },
    dropIndex: {},
  });
  assert.equal(model.ledger.find((row) => row.itemType === 'O').reserved, 2);
});
