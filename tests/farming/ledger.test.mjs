import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLedger } from '../../src/lib/farmingTargets/ledger.js';

const leaves = new Map([
  ['O', { itemType: 'O', name: 'Orokin Cell', required: 15, contributions: [
    { targetId: 'rhino', quantity: 10 }, { targetId: 'lex', quantity: 5 },
  ] }],
]);
const owned = (itemType) => itemType === 'O' ? 8 : 0;

test('applies owned inventory once and labels reservations', () => {
  const [row] = buildLedger({ leaves, owned, reservations: [{ itemType: 'O', targetId: 'rhino', quantity: 6 }] });
  assert.deepEqual(row, {
    itemType: 'O', name: 'Orokin Cell', required: 15, owned: 8, reserved: 6,
    overcommitted: false, stillNeeded: 7,
    usedBy: [{ targetId: 'lex', quantity: 5 }, { targetId: 'rhino', quantity: 10 }],
  });
});

test('flags reservations beyond owned inventory', () => {
  assert.equal(buildLedger({ leaves, owned, reservations: [{ itemType: 'O', targetId: 'x', quantity: 9 }] })[0].overcommitted, true);
});

test('priorities do not change arithmetic', () => {
  const base = buildLedger({ leaves, owned });
  const prioritized = buildLedger({ leaves, owned, priorities: { rhino: 99, lex: 1 } });
  assert.deepEqual(prioritized, base);
});

test('still needed is never negative and increases in owned reduce it', () => {
  assert.equal(buildLedger({ leaves, owned: () => 99 })[0].stillNeeded, 0);
  assert.ok(buildLedger({ leaves, owned })[0].stillNeeded >= 0);
});

test('ledger ordering and usedBy are deterministic', () => {
  const rows = buildLedger({ leaves: new Map([
    ['B', { itemType: 'B', name: 'Beta', required: 2, contributions: [{ targetId: 'z', quantity: 2 }] }],
    ['A', { itemType: 'A', name: 'Alpha', required: 4, contributions: [{ targetId: 'z', quantity: 4 }] }],
  ]), owned: () => 0 });
  assert.deepEqual(rows.map((row) => row.itemType), ['A', 'B']);
  assert.equal(rows.every((row) => row.usedBy.reduce((sum, entry) => sum + entry.quantity, 0) === row.required), true);
});

test('seeded priorities and target order never change ledger arithmetic', () => {
  let seed = 0xC0FFEE;
  const random = () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
  };
  for (let run = 0; run < 200; run += 1) {
    const leaves = new Map();
    const ownedCounts = {};
    for (let item = 0; item < 4; item += 1) {
      const itemType = `I${item}`;
      const first = 1 + Math.floor(random() * 8);
      const second = 1 + Math.floor(random() * 8);
      leaves.set(itemType, {
        itemType, name: itemType, required: first + second,
        contributions: [{ targetId: `t${item}`, quantity: first }, { targetId: `t${item + 1}`, quantity: second }],
      });
      ownedCounts[itemType] = Math.floor(random() * 12);
    }
    const owned = (itemType) => ownedCounts[itemType] ?? 0;
    const reservations = [...leaves.keys()].map((itemType, item) => ({ itemType, targetId: `t${item}`, quantity: Math.floor(random() * 8) }));
    const baseline = buildLedger({ leaves, owned, reservations });
    const reversedLeaves = new Map([...leaves].reverse());
    const priorities = Object.fromEntries([...leaves.keys()].map((itemType, item) => [`t${item}`, Math.floor(random() * 100)]));
    const varied = buildLedger({ leaves: reversedLeaves, owned, reservations: [...reservations].reverse(), priorities });
    assert.deepEqual(varied, baseline);
    for (const row of baseline) {
      assert.equal(row.usedBy.reduce((sum, entry) => sum + entry.quantity, 0), row.required);
      assert.ok(row.required >= 0 && row.owned >= 0 && row.reserved >= 0 && row.stillNeeded >= 0);
    }
  }
});
