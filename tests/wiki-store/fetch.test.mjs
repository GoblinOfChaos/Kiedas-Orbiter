import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fetchWiki } from '../../scripts/wiki-store/fetch.mjs';

function response(payload, status = 200, headers = {}) {
  return { ok: status >= 200 && status < 300, status, headers: { get: (name) => headers[name.toLowerCase()] ?? null }, json: async () => payload };
}

function clock() {
  let value = 0;
  return { now: () => value, sleep: async (milliseconds) => { value += milliseconds; } };
}

test('fetches continued namespaces, retries maxlag, writes sources and manifest', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'wiki-fetch-'));
  const time = clock();
  const calls = [];
  let articleAttempts = 0;
  const fetchImpl = async (url, options) => {
    const params = Object.fromEntries(url.searchParams);
    calls.push({ params, options });
    if (params.list === 'allpages' && params.apnamespace === '828') return response(params.apcontinue ? { query: { allpages: [{ title: 'Module:Beta' }] } } : { query: { allpages: [{ title: 'Module:Alpha' }] }, continue: { apcontinue: 'Module:Beta', continue: '-||' } });
    if (params.list === 'allpages') return response({ query: { allpages: [{ title: 'Article/One' }] } });
    if (params.titles === 'Article/One' && articleAttempts++ === 0) return response({ error: { code: 'maxlag' } }, 200);
    const pages = params.titles.split('|').map((title, index) => ({ title, pageid: index + 1, revisions: [{ revid: index + 10, timestamp: '2026-09-26T00:00:00Z', slots: { main: { content: `source for ${title}` } } }] }));
    return response({ query: { pages } });
  };
  try {
    const result = await fetchWiki({ outDir, limit: 1, fetchImpl, sleep: time.sleep, now: time.now, timestamp: new Date('2026-09-26T01:02:03Z') });
    assert.equal(result.archiveName, '2026-09-26-010203');
    assert.equal(result.manifest.counts.modules, 1);
    assert.equal(result.manifest.counts.articles, 1);
    assert.equal(result.manifest.pages.modules['Module:Alpha'].revid, 10);
    assert.equal(await readFile(join(result.archiveDir, 'modules', 'Module_Alpha.lua'), 'utf8'), 'source for Module:Alpha');
    assert.equal(await readFile(join(result.archiveDir, 'articles', 'Article_One.wikitext'), 'utf8'), 'source for Article/One');
    assert.match(calls[0].options.headers['User-Agent'], /^Kiedas-Orbiter wiki-fetch/);
    assert.equal(calls.some(({ params }) => params.continue === '-||'), true);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test('fails when a requested page cannot be fetched and preserves the manifest', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'wiki-fetch-'));
  const time = clock();
  const fetchImpl = async (url) => {
    const params = Object.fromEntries(url.searchParams);
    if (params.list === 'allpages') return response({ query: { allpages: [{ title: params.apnamespace === '828' ? 'Module:Missing' : 'Article' }] } });
    return response({ query: { pages: [{ title: 'Module:Missing', missing: true }] } });
  };
  await assert.rejects(fetchWiki({ outDir, only: 'modules', fetchImpl, sleep: time.sleep, now: time.now, timestamp: new Date('2026-09-26T01:02:03Z') }), /1 failed title/);
  const manifest = JSON.parse(await readFile(join(outDir, '2026-09-26-010203', 'manifest.json'), 'utf8'));
  assert.equal(manifest.failed[0], 'Module:Missing');
  await rm(outDir, { recursive: true, force: true });
});

test('CLI --out/--only/--limit map onto fetchWiki option names', async () => {
  const { parseArgs } = await import('../../scripts/wiki-store/fetch.mjs');
  assert.deepEqual(parseArgs(['--out', '/tmp/x', '--only', 'modules', '--limit', '3']), { out: '/tmp/x', only: 'modules', limit: 3 });
});
