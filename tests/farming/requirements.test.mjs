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

test('adds an unowned recipe blueprint before expanding its ingredients', () => {
  const result = expandTargets([{ id: 'part', itemType: 'PART', name: 'Narin Chassis', quantity: 1 }], context([
    { ...recipe('PART', [ingredient('RAW', 'Argon Crystal', 2)]), uniqueName: 'PART_BLUEPRINT', bpName: 'Narin Chassis Blueprint' },
  ]));
  assert.equal(result.leaves.get('PART_BLUEPRINT').name, 'Narin Chassis Blueprint');
  assert.equal(result.leaves.get('PART_BLUEPRINT').required, 1);
  assert.equal(result.leaves.get('RAW').required, 2);
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

test('keeps an owned shared direct resource as one leaf and applies inventory once', () => {
  const result = expandTargets([
    { id: 'a', itemType: 'X', name: 'X', quantity: 1 },
    { id: 'b', itemType: 'Y', name: 'Y', quantity: 1 },
  ], context([
    recipe('X', [ingredient('G', 'Gallium', 3)]),
    recipe('Y', [ingredient('G', 'Gallium', 4)]),
    { ...recipe('G', [ingredient('RAW', 'Raw', 1)]), craftable: false },
  ], { G: 1326 }));
  assert.equal(result.leaves.get('G').required, 7);
  assert.deepEqual(result.leaves.get('G').contributions, [
    { targetId: 'a', quantity: 3 }, { targetId: 'b', quantity: 4 },
  ]);
  assert.equal(result.leaves.has('RAW'), false);
});

test('supports an acquisition-only target as a direct leaf', () => {
  const result = expandTargets([{ id: 'pvp', itemType: 'Blind Shot', name: 'Blind Shot', isAcquirable: true }], context([]));
  assert.equal(result.errors.length, 0);
  assert.equal(result.unresolved.length, 0);
  assert.equal(result.leaves.get('Blind Shot').required, 1);
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

test('random acyclic graphs match an independent naive recursive reference', () => {
  let seed = 0xC0FFEE;
  const random = () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
  };
  const naive = (key, amount, recipes, leaves) => {
    const current = recipes.get(key);
    if (!current) {
      leaves.set(key, (leaves.get(key) ?? 0) + amount);
      return;
    }
    const batches = Math.ceil(amount / current.outputQty);
    for (const item of current.ingredients) naive(item.itemType, batches * item.need, recipes, leaves);
  };
  for (let run = 0; run < 200; run += 1) {
    const recipes = [];
    for (let i = 0; i < 4; i += 1) {
      const ingredients = [];
      const ingredientCount = 1 + Math.floor(random() * 2);
      for (let count = 0; count < ingredientCount; count += 1) {
        const itemIndex = i + 1 + Math.floor(random() * (4 - i));
        ingredients.push(ingredient(itemIndex < 4 ? `I${itemIndex}` : `L${run}_${count}`, 'ingredient', 1 + Math.floor(random() * 3)));
      }
      recipes.push(recipe(`I${i}`, ingredients, 1 + Math.floor(random() * 3)));
    }
    const target = { id: `t${run}`, itemType: 'I0', name: 'I0', quantity: 1 + Math.floor(random() * 4) };
    const reference = new Map();
    naive(target.itemType, target.quantity, new Map(recipes.map((value) => [value.resultType, value])), reference);
    const result = expandTargets([target], context(recipes));
    assert.deepEqual(new Map([...result.leaves].map(([key, value]) => [key, value.required])), reference);
  }
});

test('random intermediate inventory never exceeds the no-inventory reference', () => {
  let seed = 0xC0FFEE;
  const random = () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
  };
  const naive = (key, amount, recipes, leaves) => {
    const current = recipes.get(key);
    if (!current) {
      leaves.set(key, (leaves.get(key) ?? 0) + amount);
      return;
    }
    const batches = Math.ceil(amount / current.outputQty);
    for (const item of current.ingredients) naive(item.itemType, batches * item.need, recipes, leaves);
  };
  for (let run = 0; run < 200; run += 1) {
    const recipes = [
      recipe('I0', [ingredient('I1', 'I1', 1 + Math.floor(random() * 3)), ingredient(`L${run}`, 'leaf', 1 + Math.floor(random() * 3))], 1 + Math.floor(random() * 3)),
      recipe('I1', [ingredient(`L${run + 1}`, 'leaf', 1 + Math.floor(random() * 3))], 1 + Math.floor(random() * 3)),
    ];
    const target = { id: `owned-${run}`, itemType: 'I0', name: 'I0', quantity: 1 + Math.floor(random() * 4) };
    const reference = new Map();
    naive(target.itemType, target.quantity, new Map(recipes.map((value) => [value.resultType, value])), reference);
    const owned = { I1: Math.floor(random() * 5) };
    const result = expandTargets([target], context(recipes, owned));
    for (const [key, value] of result.leaves) {
      assert.ok(value.required >= 0);
      assert.ok(value.required <= (reference.get(key) ?? 0));
    }
  }
});
