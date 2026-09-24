import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { refreshDropTables } from '../../scripts/de-drop-tables/fetch.mjs';

const fixture = '<!doctype html><h3 id="missionRewards">Missions:</h3><table><tr><th colspan="2">Place</th></tr><tr><td>Item</td><td>Common (100.00%)</td></tr></table>';

function response(status, body = '', headers = {}) {
  return { status, headers: { get(name) { return headers[name] ?? headers[name.toLowerCase()] ?? null; } }, async text() { return body; } };
}

test('first refresh writes HTML and parsed snapshot', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'farm-drop-'));
  const result = await refreshDropTables({ cacheDir, fetchImpl: async () => response(200, fixture, { 'last-modified': 'Wed, 23 Sep 2026 12:00:00 GMT' }) });
  assert.equal(result.status, 'updated');
  assert.equal((await readFile(join(cacheDir, 'droptables.html'), 'utf8')), fixture);
  const parsed = JSON.parse(await readFile(join(cacheDir, 'droptables.parsed.json'), 'utf8'));
  assert.equal(parsed.lastModified, 'Wed, 23 Sep 2026 12:00:00 GMT');
  assert.equal(parsed.stats.rows, 1);
});

test('second refresh sends If-Modified-Since and preserves a 304', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'farm-drop-'));
  const calls = [];
  const first = async (url, options) => { calls.push({ url, options }); return response(200, fixture, { 'last-modified': 'Wed, 23 Sep 2026 12:00:00 GMT' }); };
  await refreshDropTables({ cacheDir, fetchImpl: first });
  const second = async (url, options) => { calls.push({ url, options }); return response(304); };
  const result = await refreshDropTables({ cacheDir, fetchImpl: second });
  assert.equal(result.status, 'not-modified');
  assert.equal(calls.at(-1).options.headers['If-Modified-Since'], 'Wed, 23 Sep 2026 12:00:00 GMT');
});

test('rejected HTML leaves previous files byte-identical', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'farm-drop-'));
  const good = async () => response(200, fixture, { 'last-modified': 'good' });
  await refreshDropTables({ cacheDir, fetchImpl: good });
  const before = await Promise.all(['droptables.html', 'droptables.parsed.json'].map((name) => readFile(join(cacheDir, name))));
  const bad = async () => response(200, fixture.replace('missionRewards', 'unknownSection'), { 'last-modified': 'bad' });
  const result = await refreshDropTables({ cacheDir, fetchImpl: bad });
  assert.equal(result.status, 'rejected');
  const after = await Promise.all(['droptables.html', 'droptables.parsed.json'].map((name) => readFile(join(cacheDir, name))));
  assert.deepEqual(after, before);
});

test('follows the DE redirect once and records resolvedUrl', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'farm-drop-'));
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return calls.length === 1
      ? response(302, '', { location: 'https://cdn.example.test/droptables.html' })
      : response(200, fixture, { 'last-modified': 'redirected' });
  };
  const result = await refreshDropTables({ cacheDir, fetchImpl });
  assert.equal(result.status, 'updated');
  assert.deepEqual(calls, ['https://www.warframe.com/droptables', 'https://cdn.example.test/droptables.html']);
  const parsed = JSON.parse(await readFile(join(cacheDir, 'droptables.parsed.json'), 'utf8'));
  assert.equal(parsed.resolvedUrl, 'https://cdn.example.test/droptables.html');
});
