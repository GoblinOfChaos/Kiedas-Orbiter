import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlaceIndex } from '../../src/lib/farmingTargets/placeIndex.js';

const dropTables = {
  sections: {
    missionRewards: [
      { place: 'Assassination - Vor', item: 'Orokin Cell', chance: 0.1, rarity: 'Uncommon', rotation: null },
    ],
    resourceByAvatar: [
      { source: 'Corrupted Vor', item: 'Argon Crystal', chance: 0.2, rarity: 'Rare' },
      { source: 'Vem Tabook', item: 'Orokin Cell', chance: 0.01, rarity: 'Rare' },
      { source: 'Unknown Enemy', item: 'Ferrite', chance: 0.1, rarity: 'Common' },
      { source: 'Weekly Conclave Challenge Reward', item: 'Conclave Mod', chance: 0.25, rarity: 'Uncommon' },
    ],
  },
};

const wiki = {
  enemies: {
    'Corrupted Vor': { General: { Faction: 'Orokin', Type: 'Enemy', InternalName: '/Lotus/Enemies/Vor', Planets: ['Void'], TileSets: ['Orokin Tower'], Missions: ['The Undercroft'] } },
    'Vem Tabook': { General: { Faction: 'Grineer', Type: 'Enemy', InternalName: '/Lotus/Enemies/Vem', Planets: [], TileSets: [], Missions: [] } },
    'Unknown Enemy': { General: { Faction: 'Grineer', Type: 'Enemy', InternalName: '/Lotus/Enemies/Unknown', Planets: ['Not A Planet'], TileSets: [], Missions: [] } },
  },
  missions: {
    'Assassination - Vor': { Planet: 'Mercury', Type: 'Assassination', Faction: 'Grineer', Boss: 'Vor' },
  },
  resources: {},
};

const regions = [
  { uniqueName: 'SolNode1', name: 'Assassination - Vor', systemName: 'Mercury', missionIndex: 1, factionIndex: 1 },
  { uniqueName: 'SolNode2', name: 'The Undercroft', systemName: 'Void', missionIndex: 2, factionIndex: 2 },
];

test('builds honest enemy areas, fixed boss nodes, and Conclave places', () => {
  const index = buildPlaceIndex({ dropTables, wiki, regions });
  const enemy = index.places.get('enemy:corrupted vor');
  assert.equal(enemy.level, 'wiki-area');
  assert.deepEqual(enemy.area.planets, ['Void']);
  assert.deepEqual(enemy.area.tilesets, ['Orokin Tower']);
  assert.deepEqual(enemy.area.missions, ['The Undercroft']);

  const unknown = index.places.get('enemy:vem tabook');
  assert.equal(unknown.level, 'unknown');
  assert.equal(unknown.badge, 'no listed location');

  const boss = index.places.get('mission:assassination - vor');
  assert.equal(boss.level, 'fixed-boss');
  const conclave = index.places.get('conclave:weekly conclave challenge reward');
  assert.equal(conclave.pvp, true);
  assert.equal(conclave.type, 'conclave');
});

test('keeps chance fractions and reports unmatched wiki locations without forcing joins', () => {
  const index = buildPlaceIndex({ dropTables, wiki, regions });
  assert.equal(index.byItem.get('argon crystal')[0].chance, 0.2);
  assert.equal(index.byItem.get('oro kin cell')?.length ?? 0, 0);
  assert.equal(index.byItem.get('orokin cell').length, 2);
  assert.equal(index.audit.enemiesTotal, 3);
  assert.equal(index.audit.enemiesWithLocation, 2);
  assert.equal(index.audit.planetTotal, 2);
  assert.equal(index.audit.planetMatched, 1);
  assert.equal(index.audit.missionTotal, 1);
  assert.equal(index.audit.missionMatched, 1);
});

test('uses redundant by-drop sections only as an audit cross-check', () => {
  const index = buildPlaceIndex({
    dropTables: { sections: {
      modByAvatar: [{ source: 'Corrupted Vor', item: 'Shared Mod', chance: 0.25 }],
      modByDrop: [{ source: 'Corrupted Vor', item: 'Shared Mod', chance: 0.25 }],
    } }, wiki, regions,
  });
  assert.equal(index.places.size, 1);
  assert.equal(index.places.has('enemy:corrupted vor'), true);
  assert.equal(index.places.get('enemy:corrupted vor').type, 'enemy');
  assert.equal(index.byItem.get('shared mod').length, 1);
  assert.deepEqual(index.audit.byDrop.mod, { byDropOnly: 0, byAvatarOnly: 0 });
});

test('planet resources create chance-less planet sources from explicit locations', () => {
  const index = buildPlaceIndex({
    dropTables: { sections: {} },
    wiki: { enemies: {}, missions: {}, resources: { Resources: {
      Neurodes: { Name: 'Neurodes', Description: 'Location: Earth, Lua, Eris, and Deimos' },
    } } },
    regions: [],
  });
  assert.deepEqual([...index.byItem.get('neurodes')].map((source) => [source.placeId, source.chance]), [
    ['planet:deimos', null], ['planet:earth', null], ['planet:eris', null], ['planet:lua', null],
  ]);
  assert.equal(index.places.get('planet:earth').level, 'planet');
  assert.equal(index.places.get('planet:earth').badge, 'planet-wide resource (per wiki)');
});

test('section category wins when a mission shares an enemy name', () => {
  const index = buildPlaceIndex({
    dropTables: { sections: { missionRewards: [{ place: 'Shared Name', item: 'Reward', chance: 0.5 }] } },
    wiki: { enemies: { 'Shared Name': { General: { Planets: ['Earth'] } } }, missions: { 'Shared Name': { Boss: false } }, resources: {} },
    regions: [],
  });
  assert.equal(index.places.get('mission:shared name').type, 'mission');
});

test('normalizes literal rotation labels and keeps null for base rotation', () => {
  const index = buildPlaceIndex({ dropTables: { sections: {
    missionRewards: [
      { place: 'Node', item: 'A', chance: 0.5, rotation: 'Rotation A' },
      { place: 'Node', item: 'B', chance: 0.5, rotation: null },
    ],
  } }, wiki: {}, regions: [] });
  assert.equal(index.byItem.get('a')[0].rotation, 'A');
  assert.equal(index.byItem.get('b')[0].rotation, null);
});
