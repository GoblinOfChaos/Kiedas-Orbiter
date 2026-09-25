import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addTarget,
  createFarmingTargetsStore,
  loadFarmingTargets,
  saveFarmingTargets,
  setTargetReservation,
} from '../../src/lib/farmingTargets/store.js';

const target = (id, status = 'active') => ({ id, uniqueName: `/Item/${id}`, name: id, status });

test('corrupt farming target files are read-only and never overwritten', async () => {
  const writes = [];
  const store = createFarmingTargetsStore({
    read: async () => new TextEncoder().encode('{not json'),
    write: async (path, data) => writes.push([path, data]),
    now: () => 1700000000000,
  });
  const loaded = await store.load();
  assert.equal(loaded.readOnlyCorrupt, true);
  await assert.rejects(() => store.save(addTarget(loaded, target('new'))), /corrupt/i);
  assert.equal(writes.length, 0);
});

test('newer versions preserve their version and unknown fields', () => {
  const source = { version: 99, targets: [target('newer')], futureField: { keep: true } };
  const migrated = createFarmingTargetsStore().migrate(source);
  assert.equal(migrated.version, 99);
  assert.deepEqual(migrated.futureField, source.futureField);
});

test('old-version backup is timestamped and written once per version', async () => {
  const writes = [];
  const store = createFarmingTargetsStore({
    read: async () => new TextEncoder().encode(JSON.stringify({ version: 1, targets: [] })),
    write: async (path, data) => writes.push([path, data]),
    now: () => 1700000000000,
  });
  await store.load();
  await store.load();
  assert.equal(writes.length, 1);
  assert.match(writes[0][0], /farming-targets\.json\.bak-1700000000000-v1$/);
});

test('shared mutation reloads before each queued mutation', async () => {
  let raw = JSON.stringify({ version: 2, targets: [], reservations: [], priorities: {} });
  const store = createFarmingTargetsStore({
    read: async () => new TextEncoder().encode(raw),
    write: async (_path, data) => { raw = new TextDecoder().decode(data); },
  });
  await Promise.all([
    store.mutate((current) => addTarget(current, target('a'))),
    store.mutate((current) => addTarget(current, target('b'))),
  ]);
  assert.deepEqual(JSON.parse(raw).targets.map((item) => item.id).sort(), ['a', 'b']);
});

test('mutators tolerate missing targets and incomplete reservations', () => {
  const base = { version: 1, targets: [target('a')] };
  assert.equal(setTargetReservation(base, null).reservations.length, 0);
  assert.equal(addTarget(base, target('b')).targets.length, 2);
  assert.equal(setTargetReservation(base, { itemType: 'x', targetId: 'a' }).reservations.length, 0);
});

test('public load and save use the shared adapter', async () => {
  const original = globalThis.__farmingTargetTestIO;
  const writes = [];
  globalThis.__farmingTargetTestIO = {
    read: async () => new TextEncoder().encode(JSON.stringify({ version: 2, targets: [] })),
    write: async (path, data) => writes.push([path, data]),
  };
  try {
    const loaded = await loadFarmingTargets();
    await saveFarmingTargets(addTarget(loaded, target('public')));
    assert.equal(writes.length, 1);
  } finally {
    globalThis.__farmingTargetTestIO = original;
  }
});
