import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTargets, dueState, reservationTotals, targetReservationQuantity } from '../../src/lib/farmingTargets/state.js';

test('due state is pure and ignores archived or completed targets', () => {
  const now = Date.parse('2026-09-25T12:00:00Z');
  assert.equal(dueState({ status: 'active', dueAt: '2026-09-25T11:00:00Z' }, now), 'due');
  assert.equal(dueState({ status: 'active', dueAt: '2026-09-26T11:00:00Z' }, now), 'scheduled');
  assert.equal(dueState({ status: 'complete', dueAt: '2026-09-20T11:00:00Z' }, now), 'none');
});

test('active target count excludes archived and complete records', () => {
  assert.deepEqual(activeTargets([{ id: 'a' }, { id: 'b', status: 'archived' }, { id: 'c', status: 'complete' }]).map((target) => target.id), ['a']);
  assert.deepEqual(activeTargets(null), []);
});

test('local date due state is stable in a UTC-7 timezone', () => {
  process.env.TZ = 'America/Los_Angeles';
  const now = new Date('2026-09-25T01:00:00Z').getTime();
  assert.equal(dueState({ status: 'active', dueAt: '2026-09-24' }, now), 'due');
  assert.equal(dueState({ status: 'active', dueAt: '2026-09-25' }, now), 'scheduled');
  assert.equal(dueState({ status: 'active', dueAt: '' }, now), 'none');
});

test('reservation input reads only the selected target quantity', () => {
  const reservations = [
    { itemType: 'O', targetId: 'a', quantity: 2 },
    { itemType: 'O', targetId: 'b', quantity: 5 },
  ];
  assert.equal(targetReservationQuantity(reservations, 'O', 'a'), 2);
  assert.equal(targetReservationQuantity(reservations, 'O', 'missing'), 0);
});

test('reservation totals are additive and ignore invalid entries', () => {
  assert.deepEqual(reservationTotals([{ itemType: 'O', quantity: 2 }, { itemType: 'O', quantity: 3 }, { itemType: 'X', quantity: -5 }, {}]), { O: 5, X: 0 });
});
