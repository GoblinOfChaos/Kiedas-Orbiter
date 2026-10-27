import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { buildEnemyAreaIndex, loadEnemyModules, ENEMY_DATA_MODULES } from '../../src/lib/farmingTargets/enemyAreas.js';
import { buildFarmingTargetsScreenModel, buildPreviewPlaceIndex } from '../../src/lib/farmingTargets/screenModel.js';

const regions = [
  { name: 'Apollodorus', systemName: 'Mercury', uniqueName: 'SolNode94' },
  { name: 'Cinxia', systemName: 'Ceres', uniqueName: 'SolNode1' },
];

const grineer = {
  'Grineer Lancer': { General: { Faction: 'Grineer', Planets: ['Mercury', 'Ceres', 'Earth Proxima'], Missions: ['Apollodorus', 'Assassination', 'The New War'] } },
  'Only Unknown': { General: { Faction: 'Grineer', Planets: ['Zariman Ten Zero'], Missions: ['Invasion'] } },
  'No Location': { General: { Faction: 'Grineer', Planets: [], Missions: [] } },
  'String Fields': { General: { Faction: 'Corpus', Planets: 'ceres', Missions: 'cinxia' } },
};

test('keeps only planets and nodes that match DE regions exactly, case-insensitively', () => {
  const index = buildEnemyAreaIndex([grineer], regions);
  assert.deepEqual(index.get('grineer lancer'), { name: 'Grineer Lancer', faction: 'Grineer', planets: ['Mercury', 'Ceres'], nodes: ['Apollodorus'] });
  assert.deepEqual(index.get('string fields').planets, ['Ceres']);
  assert.deepEqual(index.get('string fields').nodes, ['Cinxia']);
});

test('enemies with no verified planet or node are left out instead of guessed', () => {
  const index = buildEnemyAreaIndex([grineer], regions);
  assert.equal(index.has('only unknown'), false);
  assert.equal(index.has('no location'), false);
});

test('region names that are dictionary keys are resolved through the language dictionary', () => {
  const keyed = [{ name: '/Lotus/Language/Regions/Apollodorus', systemName: '/Lotus/Language/Regions/Mercury' }];
  const dict = { '/Lotus/Language/Regions/Apollodorus': 'Apollodorus', '/Lotus/Language/Regions/Mercury': 'Mercury' };
  const index = buildEnemyAreaIndex([grineer], keyed, dict);
  assert.deepEqual(index.get('grineer lancer').planets, ['Mercury']);
  assert.deepEqual(index.get('grineer lancer').nodes, ['Apollodorus']);
});

test('loadEnemyModules skips modules the store does not have', async () => {
  const store = { getModule: async (title) => { if (title !== 'Module:Enemies/data/grineer') throw new Error('missing'); return { data: grineer }; } };
  const modules = await loadEnemyModules(store);
  assert.equal(modules.length, 1);
  assert.ok(ENEMY_DATA_MODULES.includes('Module:Enemies/data/grineer'));
});

test('every listed module title exists in the bundled wiki store', () => {
  const index = JSON.parse(fs.readFileSync(path.resolve('src-tauri/data/assets/wiki-store/index.json'), 'utf8'));
  const titles = new Set(index.modules.map((module) => module.title));
  for (const title of ENEMY_DATA_MODULES) assert.ok(titles.has(title), title);
});

test('the bundled wiki enemy data yields areas for real DE planets', () => {
  const root = path.resolve('src-tauri/data/assets/wiki-store');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
  const modules = ENEMY_DATA_MODULES.map((title) => {
    const record = index.modules.find((module) => module.title === title);
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, 'modules', record.file))).toString());
  });
  const areas = buildEnemyAreaIndex(modules, [{ name: 'Apollodorus', systemName: 'Mercury' }, { name: 'Cinxia', systemName: 'Ceres' }, { name: 'Tikal', systemName: 'Earth' }]);
  assert.ok(areas.size > 100, `expected over 100 enemies with a verified area, got ${areas.size}`);
  for (const area of areas.values()) assert.ok(area.planets.length || area.nodes.length);
});

test('an enemy drop source gets a wiki-listed area; an unmatched enemy stays an enemy source', () => {
  const enemyAreas = buildEnemyAreaIndex([grineer], regions);
  const placeIndex = buildPreviewPlaceIndex({
    dropIndex: {
      Ore: [
        { type: 'enemy', enemyName: 'Grineer Lancer', chance: 0.1 },
        { type: 'enemy', enemyName: 'Mystery Enemy', chance: 0.2 },
      ],
    },
    regions,
    enemyAreas,
  });
  const lancer = placeIndex.places.get('enemy:grineer lancer');
  assert.equal(lancer.level, 'wiki-area');
  assert.deepEqual(lancer.area, { faction: 'Grineer', planets: ['Mercury', 'Ceres'], nodes: ['Apollodorus'] });
  const mystery = placeIndex.places.get('enemy:mystery enemy');
  assert.equal(mystery.level, 'enemy');
  assert.equal(mystery.area, undefined);
});

test('without an area index the enemy place is unchanged', () => {
  const placeIndex = buildPreviewPlaceIndex({ dropIndex: { Ore: [{ type: 'enemy', enemyName: 'Grineer Lancer', chance: 0.1 }] }, regions });
  const lancer = placeIndex.places.get('enemy:grineer lancer');
  assert.equal(lancer.level, 'enemy');
  assert.equal(lancer.area, undefined);
});

test('the Enemies tab ranking carries the area through to the screen row', () => {
  const enemyAreas = buildEnemyAreaIndex([grineer], regions);
  const placeIndex = buildPreviewPlaceIndex({ dropIndex: { O: [{ type: 'enemy', enemyName: 'Grineer Lancer', chance: 0.1 }] }, regions, enemyAreas });
  const model = buildFarmingTargetsScreenModel({
    targets: [{ id: 'target', uniqueName: 'T', name: 'Target', quantity: 1, reservations: [] }],
    inventoryData: { all: [{ unique_name: 'O', name: 'Ore', quantity: 0 }], craftable: [{ resultType: 'T', ingredients: [{ itemType: 'O', name: 'Ore', need: 5 }] }] },
    dropIndex: { O: [{ type: 'enemy', enemyName: 'Grineer Lancer', chance: 0.1 }] },
    placeIndex,
    filters: { tab: 'enemies' },
  });
  assert.equal(model.ranked[0].place.name, 'Grineer Lancer');
  assert.deepEqual(model.ranked[0].place.area.planets, ['Mercury', 'Ceres']);
});

test('a module that fails to load is reported once per failure and skipped', async () => {
  const errors = [];
  const store = { getModule: async () => { throw new Error('bundled wiki store is unavailable'); } };
  const modules = await loadEnemyModules(store, ['Module:A', 'Module:B'], (title, error) => errors.push([title, error.message]));
  assert.deepEqual(modules, []);
  assert.deepEqual(errors, [['Module:A', 'bundled wiki store is unavailable'], ['Module:B', 'bundled wiki store is unavailable']]);
});

test('the wiki store folder is listed in the bundle resources of every platform config', () => {
  for (const file of ['tauri.linux.conf.json', 'tauri.darwin.conf.json', 'tauri.windows.conf.json']) {
    const config = JSON.parse(fs.readFileSync(path.resolve('src-tauri', file), 'utf8'));
    assert.ok(config.bundle.resources.includes('data/assets/wiki-store/**/*'), file);
  }
});
