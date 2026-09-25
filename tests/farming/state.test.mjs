import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTargets, dueState, reservationTotals } from '../../src/lib/farmingTargets/state.js';

test('due state is pure and ignores archived or completed targets', () => {
  const now = Date.parse('2026-09-25T12:00:00Z');
  assert.equal(dueState({ status: 'active', dueAt: '2026-09-25T11:00:00Z' }, now), 'due');
  assert.equal(dueState({ status: 'active', dueAt: '2026-09-26T11:00:00Z' }, now), 'scheduled');
  assert.equal(dueState({ status: 'complete', dueAt: '2026-09-20T11:00:00Z' }, now), 'none');
});

test('active target count excludes archived and complete records', () => {
  assert.deepEqual(activeTargets([{ id: 'a' }, { id: 'b', status: 'archived' }, { id: 'c', status: 'complete' }]).map((target) => target.id), ['a']);
});

test('reservation totals are additive and ignore invalid entries', () => {
  assert.deepEqual(reservationTotals([{ itemType: 'O', quantity: 2 }, { itemType: 'O', quantity: 3 }, { itemType: 'X', quantity: -5 }, {}]), { O: 5, X: 0 });
});
