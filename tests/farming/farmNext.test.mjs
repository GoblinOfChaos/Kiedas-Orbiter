import test from 'node:test';
import assert from 'node:assert/strict';
import { rankPlaces } from '../../src/lib/farmingTargets/farmNext.js';

const places = new Map([
  ['mission:a', { id: 'mission:a', name: 'Alpha', type: 'mission', pvp: false }],
  ['mission:b', { id: 'mission:b', name: 'Beta', type: 'mission', pvp: false }],
  ['mission:c', { id: 'mission:c', name: 'Gamma', type: 'mission', pvp: false }],
  ['conclave:pvp', { id: 'conclave:pvp', name: 'Saturn/Team Annihilation (Conclave)', type: 'conclave', pvp: true }],
]);

function index(sources) {
  const byItem = new Map();
  for (const source of sources) {
    if (!byItem.has(source.item)) byItem.set(source.item, []);
    byItem.get(source.item).push(source);
  }
  return { byItem, places };
}

const ledger = [
  { itemType: 'A', name: 'Alpha item', stillNeeded: 10 },
  { itemType: 'B', name: 'Beta item', stillNeeded: 1 },
  { itemType: 'C', name: 'Conclave item', stillNeeded: 4 },
  { itemType: 'D', name: 'Done item', stillNeeded: 0 },
];

test('coverage outranks chance and still-needed quantity is the first tiebreak', () => {
  const result = rankPlaces({ ledger, placeIndex: index([
    { item: 'a', placeId: 'mission:a', chance: 0.01, rotation: 'A' },
    { item: 'b', placeId: 'mission:a', chance: 0.01, rotation: 'A' },
    { item: 'a', placeId: 'mission:b', chance: 0.99, rotation: 'A' },
    { item: 'c', placeId: 'mission:c', chance: 0.5, rotation: 'A' },
  ]) });
  assert.equal(result.ranked[0].place.name, 'Alpha');
  assert.equal(result.ranked[0].coverage, 2);
  assert.equal(result.ranked[0].totalStillNeeded, 11);
  assert.equal(result.ranked[0].coveredItems.every((item) => item.chance != null), true);
});

test('combined ranking hides ordinary Conclave sources but surfaces Conclave-only items', () => {
  const onlyConclave = rankPlaces({ ledger, placeIndex: index([
    { item: 'a', placeId: 'mission:a', chance: 0.2 },
    { item: 'c', placeId: 'conclave:pvp', chance: 0.0025 },
  ]) });
  assert.equal(onlyConclave.ranked.some((row) => row.place.type === 'conclave'), true);
  assert.deepEqual(onlyConclave.conclaveOnlyItems, ['C']);
  const ordinary = rankPlaces({ ledger: ledger.filter((row) => row.itemType !== 'C'), placeIndex: index([
    { item: 'a', placeId: 'mission:a', chance: 0.2 },
    { item: 'a', placeId: 'conclave:pvp', chance: 0.9 },
  ]) });
  assert.equal(ordinary.ranked.some((row) => row.place.type === 'conclave'), false);
});

test('default ranking includes Conclave places for Conclave-only needs', () => {
  const result = rankPlaces({
    ledger: [
      { itemType: 'A', name: 'Argon Crystal', stillNeeded: 2 },
      { itemType: 'C', name: 'Blind Shot', stillNeeded: 1 },
    ],
    placeIndex: index([
      { item: 'a', placeId: 'conclave:pvp', chance: 0.0025 },
      { item: 'c', placeId: 'conclave:pvp', chance: 0.0248 },
      { item: 'a', placeId: 'mission:a', chance: 0.5 },
    ]),
  });
  const conclave = result.ranked.find((row) => row.place.type === 'conclave');
  assert.ok(conclave);
  assert.equal(conclave.place.pvp, true);
  assert.equal(conclave.coverage, 2);
  assert.equal(conclave.reason, 'Conclave-only source for Blind Shot');
  assert.equal(result.ranked[0], conclave);
});

test('default ranking excludes Conclave places when all needs have ordinary sources', () => {
  const result = rankPlaces({
    ledger: [
      { itemType: 'A', name: 'Argon Crystal', stillNeeded: 2 },
      { itemType: 'B', name: 'Alloy Plate', stillNeeded: 1 },
    ],
    placeIndex: index([
      { item: 'a', placeId: 'mission:a', chance: 0.5 },
      { item: 'b', placeId: 'mission:a', chance: 0.5 },
      { item: 'a', placeId: 'conclave:pvp', chance: 0.9 },
    ]),
  });
  assert.equal(result.ranked.some((row) => row.place.type === 'conclave'), false);
});

test('conclave tab and minimum chance filter are explicit', () => {
  const placeIndex = index([
    { item: 'a', placeId: 'mission:a', chance: 0.01 },
    { item: 'a', placeId: 'mission:b', chance: 0.05 },
    { item: 'c', placeId: 'conclave:pvp', chance: 0.0025 },
  ]);
  assert.equal(rankPlaces({ ledger, placeIndex }).ranked.some((row) => row.place.name === 'Alpha'), true);
  assert.equal(rankPlaces({ ledger, placeIndex, filters: { minChance: 0.05 } }).ranked.find((row) => row.place.name === 'Alpha'), undefined);
  assert.equal(rankPlaces({ ledger, placeIndex, filters: { tab: 'conclave' } }).ranked[0].place.type, 'conclave');
});

test('input source order does not affect result', () => {
  const sources = [
    { item: 'a', placeId: 'mission:b', chance: 0.5 },
    { item: 'b', placeId: 'mission:a', chance: 0.5 },
    { item: 'a', placeId: 'mission:a', chance: 0.5 },
  ];
  const first = rankPlaces({ ledger, placeIndex: index(sources) }).ranked.map((row) => row.place.id);
  const second = rankPlaces({ ledger, placeIndex: index([...sources].reverse()) }).ranked.map((row) => row.place.id);
  assert.deepEqual(first, second);
});
