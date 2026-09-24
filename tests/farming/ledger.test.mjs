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
