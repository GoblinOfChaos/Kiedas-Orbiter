import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

import { createWikiStore } from '../../src/lib/wikiStore.js';

function fixture({ title = 'Module:Test/data', kind = 'json', source = '{"ok":true}\n', hash } = {}) {
  const compressed = gzipSync(source);
  const file = 'Module_Test_data.json.gz';
  return {
    compressed,
    index: {
      formatVersion: 1,
      generatedAt: new Date().toISOString(),
      modules: [{
        title,
        file,
        kind,
        revid: 7,
        sha256: hash ?? createHash('sha256').update(compressed).digest('hex'),
      }],
    },
  };
}

function fakeInvoke(fixtureData, calls) {
  return async (command, args) => {
    calls.push([command, args]);
    if (command === 'wiki_store_index') return fixtureData.index;
    if (command === 'wiki_store_get_bytes') return fixtureData.compressed;
    throw new Error(`unexpected command: ${command}`);
  };
}

test('retries a rejected index request and fetches it exactly once more', async () => {
  const data = fixture();
  let attempts = 0;
  const store = createWikiStore({ invoke: async (command) => {
    assert.equal(command, 'wiki_store_index');
    attempts += 1;
    if (attempts === 1) throw new Error('transient index failure');
    return data.index;
  } });
  await assert.rejects(() => store.getIndex(), /transient index failure/);
  assert.deepEqual(await store.getIndex(), data.index);
  assert.equal(attempts, 2);
});

test('evicts a rejected module request so the next call refetches it', async () => {
  const data = fixture();
  let byteAttempts = 0;
  const store = createWikiStore({ invoke: async (command) => {
    if (command === 'wiki_store_index') return data.index;
    byteAttempts += 1;
    if (byteAttempts === 1) throw new Error('transient byte failure');
    return data.compressed;
  } });
  await assert.rejects(() => store.getModule('Module:Test/data'), /transient byte failure/);
  assert.deepEqual((await store.getModule('Module:Test/data')).data, { ok: true });
  assert.equal(byteAttempts, 2);
});

test('getModule memoises and returns JSON data from real gzip bytes', async () => {
  const calls = [];
  const data = fixture();
  const store = createWikiStore({ invoke: fakeInvoke(data, calls) });
  const [first, second] = await Promise.all([
    store.getModule('Module:Test/data'),
    store.getModule('Module:Test/data'),
  ]);

  assert.deepEqual(first, {
    title: 'Module:Test/data',
    kind: 'json',
    revid: 7,
    data: { ok: true },
  });
  assert.deepEqual(second, first);
  assert.equal(calls.filter(([command]) => command === 'wiki_store_get_bytes').length, 1);
});

test('hash mismatch rejects with the module title', async () => {
  const data = fixture({ hash: '0'.repeat(64) });
  const store = createWikiStore({ invoke: fakeInvoke(data, []) });
  await assert.rejects(
    () => store.getModule('Module:Test/data'),
    /Module:Test\/data.*SHA-256 verification/i,
  );
});

test('corrupt gzip rejects with the module title', async () => {
  const data = fixture();
  data.compressed = new Uint8Array([1, 2, 3, 4]);
  data.index.modules[0].sha256 = createHash('sha256').update(data.compressed).digest('hex');
  const store = createWikiStore({ invoke: fakeInvoke(data, []) });
  await assert.rejects(
    () => store.getModule('Module:Test/data'),
    /Module:Test\/data.*invalid gzip/i,
  );
});

test('unknown module rejects clearly before invoking the getter', async () => {
  const calls = [];
  const data = fixture({ title: 'Module:Known' });
  const store = createWikiStore({ invoke: fakeInvoke(data, calls) });
  await assert.rejects(() => store.getModule('Module:Missing'), /not present in wiki store/i);
  assert.deepEqual(calls.map(([command]) => command), ['wiki_store_index']);
});

test('ageDays reports whole days from snapshotDate', async () => {
  const data = fixture();
  data.index.snapshotDate = '2026-09-22';
  const store = createWikiStore({ invoke: fakeInvoke(data, []) });
  assert.equal(await store.ageDays(new Date('2026-09-24T12:00:00Z')), 2);
});
