import test from 'node:test';
import assert from 'node:assert/strict';
import { expandTargets } from '../../src/lib/farmingTargets/requirements.js';

const recipe = (resultType, ingredients, outputQty = 1) => ({ resultType, ingredients, outputQty });
const ingredient = (itemType, name, need) => ({ itemType, name, need });
const context = (recipes, owned = {}) => ({
  recipes: new Map(recipes.map((r) => [r.resultType, r])),
  owned: (itemType) => owned[itemType] ?? 0,
});
const leavesObject = (leaves) => Object.fromEntries(
  [...leaves.entries()].map(([key, value]) => [key, {
    ...value,
    contributions: [...value.contributions].sort((a, b) => a.targetId.localeCompare(b.targetId)),
  }]).sort(([a], [b]) => a.localeCompare(b)),
);

test('expands a single craft into leaf requirements', () => {
  const result = expandTargets([{ id: 'rhino', itemType: 'R', name: 'Rhino', quantity: 2 }], context([
    recipe('R', [ingredient('A', 'Alloy Plate', 3)]),
  ]));
  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.leaves.get('A'), {
    itemType: 'A', name: 'Alloy Plate', required: 6,
    contributions: [{ targetId: 'rhino', quantity: 6 }],
  });
});

test('uses outputQty before calculating ceiling craft batches', () => {
  const result = expandTargets([{ id: 'x', itemType: 'X', name: 'X', quantity: 25 }], context([
    recipe('X', [ingredient('B', 'B', 1)], 10),
  ]));
  assert.equal(result.leaves.get('B').required, 3);
});

test('uses owned intermediates once before expanding them', () => {
  const result = expandTargets([{ id: 'x', itemType: 'X', name: 'X', quantity: 1 }], context([
    recipe('X', [ingredient('B', 'B', 5)]),
    recipe('B', [ingredient('A', 'A', 2)]),
  ], { B: 4 }));
  assert.equal(result.leaves.get('A').required, 2);
  assert.equal(result.leaves.has('B'), false);
});

test('combines shared leaves with target contributions', () => {
  const result = expandTargets([
    { id: 'a', itemType: 'X', name: 'X', quantity: 1 },
    { id: 'b', itemType: 'Y', name: 'Y', quantity: 1 },
  ], context([
    recipe('X', [ingredient('A', 'A', 2)]), recipe('Y', [ingredient('A', 'A', 3)]),
  ]));
  assert.equal(result.leaves.get('A').required, 5);
  assert.deepEqual(result.leaves.get('A').contributions, [
    { targetId: 'a', quantity: 2 }, { targetId: 'b', quantity: 3 },
  ]);
});

test('reports cycles without partial leaves for that target', () => {
  const result = expandTargets([{ id: 'cycle', itemType: 'A', name: 'A', quantity: 1 }], context([
    recipe('A', [ingredient('B', 'B', 1)]), recipe('B', [ingredient('A', 'A', 1)]),
  ]));
  assert.equal(result.leaves.size, 0);
  assert.equal(result.errors.length, 1);
  assert.deepEqual(result.errors[0].path, ['A', 'B', 'A']);
});

test('unresolved target contributes nothing', () => {
  const result = expandTargets([{ id: 'unknown', itemType: 'U', name: 'Unknown', quantity: 1 }], context([]));
  assert.equal(result.leaves.size, 0);
  assert.equal(result.unresolved.length, 1);
});

test('target order does not change the result', () => {
  const targets = [
    { id: 'b', itemType: 'Y', name: 'Y', quantity: 1 },
    { id: 'a', itemType: 'X', name: 'X', quantity: 1 },
  ];
  const recipes = [recipe('X', [ingredient('A', 'A', 2)]), recipe('Y', [ingredient('A', 'A', 3)])];
  assert.deepEqual(leavesObject(expandTargets(targets, context(recipes)).leaves), leavesObject(expandTargets([...targets].reverse(), context(recipes)).leaves));
});

test('random acyclic graphs produce non-negative naive-equivalent leaves', () => {
  let seed = 0xC0FFEE;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let run = 0; run < 200; run += 1) {
    const recipes = [];
    for (let i = 1; i < 5; i += 1) {
      recipes.push(recipe(`I${i}`, [ingredient(`L${i}`, `L${i}`, 1 + Math.floor(random() * 3))], 1 + Math.floor(random() * 3)));
    }
    const target = { id: `t${run}`, itemType: 'I1', name: 'I1', quantity: 1 + Math.floor(random() * 4) };
    const result = expandTargets([target], context(recipes));
    for (const leaf of result.leaves.values()) assert.ok(leaf.required >= 0);
  }
});
