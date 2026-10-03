import test from 'node:test';
import assert from 'node:assert/strict';
import { groupRankedByPlanet } from '../../src/lib/farmingTargets/groupRankedByPlanet.js';

const row = (id, name, planet, coveredItems) => ({
  place: { id, name, planet },
  coverage: coveredItems.length,
  coveredItems,
});

test('groups ranked nodes by planet and preserves member order', () => {
  const ranked = [
    row('mars-one', 'Mars One', 'Mars', [
      { itemType: 'ore', name: 'Ore', chance: 0.1, rotation: 'C', sources: [{ chance: 0.1, rotation: 'C', placeId: 'mars-one' }, { chance: 0.2, rotation: 'A', placeId: 'mars-one' }] },
      { itemType: 'alloy', name: 'Alloy', chance: 0.4, rotation: 'B' },
    ]),
    row('mars-two', 'Mars Two', 'Mars', [
      { itemType: 'ore', name: 'Ore', chance: 0.7, rotation: 'C', sources: [{ chance: 0.7, rotation: 'C', placeId: 'mars-two' }, { chance: 0.1, rotation: 'A', placeId: 'mars-two' }] },
      { itemType: 'nano', name: 'Nano', chance: 0.3, rotation: 'A' },
    ]),
    row('unknown-one', 'Unknown One', null, [{ itemType: 'ore', name: 'Ore', chance: 0.5 }]),
    row('unknown-two', 'Unknown Two', undefined, [{ itemType: 'nano', name: 'Nano', chance: 0.6 }]),
  ];

  const grouped = groupRankedByPlanet(ranked);
  assert.deepEqual(grouped.map((entry) => entry.planet), ['Mars', null, null]);
  assert.deepEqual(grouped[0].members.map((member) => member.place.name), ['Mars One', 'Mars Two']);
  assert.deepEqual(grouped[0].coveredItems.map((item) => item.itemType), ['ore', 'alloy', 'nano']);
  assert.equal(grouped[0].coverage, 3);

  const ore = grouped[0].coveredItems.find((item) => item.itemType === 'ore');
  assert.deepEqual(ore.sources.map((source) => source.chance), [0.7, 0.2]);
  assert.equal(ore.sources.find((source) => source.rotation === 'C').chance, 0.7);
  assert.equal(grouped[1].members[0], ranked[2]);
  assert.equal(grouped[2].members[0], ranked[3]);
});

test('does not create a shared null-planet group', () => {
  const first = row('one', 'One', null, [{ itemType: 'a', name: 'A', chance: 0.1 }]);
  const second = row('two', 'Two', null, [{ itemType: 'b', name: 'B', chance: 0.2 }]);
  const grouped = groupRankedByPlanet([first, second]);
  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped.map((entry) => entry.members[0]), [first, second]);
});
