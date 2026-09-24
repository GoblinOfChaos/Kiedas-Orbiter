import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { buildWikiStore, fetchRevisions } from '../../scripts/wiki-store/build.mjs';

async function fixtureDirs() {
  const root = await mkdtemp(join(tmpdir(), 'wiki-store-test-'));
  const luaDir = join(root, 'lua');
  const jsonDir = join(root, 'json');
  const outDir = join(root, 'out');
  await Promise.all([mkdir(luaDir), mkdir(jsonDir), mkdir(outDir)]);
  await writeFile(join(luaDir, 'Module_Test_data.lua'), 'return { lua = true }\n');
  await writeFile(join(luaDir, 'Module_Only_data.lua'), 'return { only = true }\n');
  await writeFile(join(luaDir, 'Module_Prefer_data.lua'), 'return { lua = true }\n');
  await writeFile(join(jsonDir, 'Module_Prefer_data.json'), '{"json":true}\n');
  const revisionsFile = join(root, 'revisions.json');
  await writeFile(revisionsFile, JSON.stringify({
    'Module:Test/data': { revid: 12, timestamp: '2026-09-24T00:00:00Z' },
    'Module:Only/data': { revid: 13, timestamp: '2026-09-24T00:00:00Z' },
  }));
  return { root, luaDir, jsonDir, outDir, revisionsFile };
}

test('builds a sorted complete index, preferring JSON and preserving missing revisions', async () => {
  const dirs = await fixtureDirs();
  const index = await buildWikiStore({ ...dirs, snapshotDate: '2026-09-24' });

  assert.deepEqual(index.modules.map((module) => module.title), [
    'Module:Only/data',
    'Module:Prefer/data',
    'Module:Test/data',
  ]);
  assert.equal(index.formatVersion, 1);
  assert.equal(index.snapshotDate, '2026-09-24');
  assert.equal(index.modules[1].kind, 'json');
  assert.equal(index.modules[1].file, 'Module_Prefer_data.json.gz');
  assert.equal(index.modules[1].encoding, 'gzip');
  assert.equal(index.modules[2].revid, 12);
  assert.equal(index.modules[1].revid, null);

  for (const module of index.modules) {
    const bytes = await readFile(join(dirs.outDir, 'modules', module.file));
    assert.equal(module.bytes, bytes.length);
    assert.equal(module.sha256, createHash('sha256').update(bytes).digest('hex'));
  }
  assert.deepEqual(JSON.parse(await readFile(join(dirs.outDir, 'index.json'), 'utf8')), index);
});

test('fetchRevisions batches 50 titles, sleeps between requests, and preserves normalized titles', async () => {
  const titles = Array.from({ length: 51 }, (_, index) => `Module:Test${index}/data`);
  const requests = [];
  const sleeps = [];
  const revisions = await fetchRevisions({
    titles,
    fetchImpl: async (url) => {
      requests.push(new URL(url));
      const requested = new URL(url).searchParams.get('titles').split('|');
      return new Response(JSON.stringify({ query: { pages: requested.map((title, index) => ({ title, pageid: index + 1, revisions: [{ revid: index + 100, timestamp: '2026-09-24T00:00:00Z' }] })) } }), { status: 200 });
    },
    sleep: async (milliseconds) => sleeps.push(milliseconds),
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].searchParams.get('titles').split('|').length, 50);
  assert.equal(requests[1].searchParams.get('titles').split('|').length, 1);
  assert.deepEqual(sleeps, [1200]);
  assert.equal(typeof revisions['Module:Test50/data'].revid, 'number');
});
