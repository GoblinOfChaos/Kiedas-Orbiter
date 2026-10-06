import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createWikiRequester,
  downloadWiki,
} from '../../scripts/wiki-download/download.mjs';

function response(payload, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    async json() {
      return payload;
    },
  };
}

function page(title, revid, wikitext = `text for ${title}`) {
  return {
    pageid: revid + 100,
    title,
    revisions: [{
      revid,
      timestamp: '2026-10-05T00:00:00Z',
      slots: { main: { content: wikitext } },
    }],
  };
}

async function withOutDir(fn) {
  const outDir = await mkdtemp(join(tmpdir(), 'kiedas-wiki-download-'));
  try {
    return await fn(outDir);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

function clock() {
  let current = 0;
  const waits = [];
  return {
    now: () => current,
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
      current += milliseconds;
    },
    waits,
    get current() {
      return current;
    },
  };
}

test('batches pages, lists redirect titles, resolves real redirect shapes, and round-trips JSONL', async () => {
  await withOutDir(async (outDir) => {
    const calls = [];
    const time = clock();
    const fetchImpl = async (url) => {
      const params = new URL(url).searchParams;
      calls.push(Object.fromEntries(params));
      if (params.get('generator') === 'allpages') {
        if (!params.has('gapcontinue')) {
          return response({
            continue: { continue: '-||', gapcontinue: 'Beta' },
            query: { pages: [page('Alpha', 1)] },
          });
        }
        return response({ query: { pages: [page('Beta', 2)] } });
      }
      if (params.get('list') === 'allpages') {
        assert.equal(params.get('apfilterredir'), 'redirects');
        if (!params.has('apcontinue')) {
          return response({
            continue: { continue: '-||', apcontinue: 'Old Beta' },
            query: { allpages: [{ ns: 0, title: 'Old Alpha' }] },
          });
        }
        return response({ query: { allpages: [{ ns: 0, title: 'Old Beta' }] } });
      }
      assert.equal(params.get('redirects'), '1');
      assert.equal(params.get('titles'), 'Old Alpha|Old Beta');
      return response({ query: { redirects: [{ from: 'Old Alpha', to: 'Alpha', tofragment: 'History' }] } });
    };

    const result = await downloadWiki({ outDir, fetchImpl, now: time.now, sleep: time.sleep });
    const lines = (await readFile(join(outDir, 'pages.jsonl'), 'utf8')).trim().split('\n');
    assert.deepEqual(lines.map((line) => JSON.parse(line).title), ['Alpha', 'Beta']);
    assert.deepEqual(JSON.parse(await readFile(join(outDir, 'redirects.json'), 'utf8')), { 'Old Alpha': 'Alpha#History' });
    assert.deepEqual(JSON.parse(await readFile(join(outDir, 'redirects.unresolved.json'), 'utf8')), ['Old Beta']);
    assert.equal(result.counts.pages, 2);
    assert.equal(result.counts.redirects, 1);
    assert.equal(calls.filter((call) => call.generator === 'allpages').length, 2);
    assert.equal(calls.filter((call) => call.list === 'allpages').length, 2);
    assert.equal(calls.filter((call) => call.redirects === '1').length, 1);
    assert.equal(calls[1].gapcontinue, 'Beta');
    assert.ok(time.waits.some((milliseconds) => milliseconds >= 1200));
  });
});

test('resume skips the same revision and replaces a changed revision without duplicate titles', async () => {
  await withOutDir(async (outDir) => {
    const time = clock();
    let revision = 1;
    const fetchImpl = async (url) => {
      const params = new URL(url).searchParams;
      if (params.get('generator') === 'allpages') {
        return response({ query: { pages: [page('Alpha', revision, `revision ${revision}`)] } });
      }
      return response({ query: { allpages: [] } });
    };

    await downloadWiki({ outDir, fetchImpl, now: time.now, sleep: time.sleep });
    revision = 2;
    const second = await downloadWiki({ outDir, fetchImpl, now: time.now, sleep: time.sleep });

    const records = (await readFile(join(outDir, 'pages.jsonl'), 'utf8'))
      .trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(records, [{
      title: 'Alpha', pageid: 102, revid: 2,
      timestamp: '2026-10-05T00:00:00Z', wikitext: 'revision 2',
    }]);
    assert.equal(second.counts.pages, 1);
  });
});

test('maxlag honors Retry-After and retries up to the successful response', async () => {
  const time = clock();
  let attempts = 0;
  const requester = createWikiRequester({
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) return response({ error: { code: 'maxlag', info: 'busy' } }, 200, { 'Retry-After': '2' });
      return response({ query: { pages: [] } });
    },
    now: time.now,
    sleep: time.sleep,
  });

  const payload = await requester.request({ action: 'query' });
  assert.deepEqual(payload, { query: { pages: [] } });
  assert.equal(attempts, 2);
  assert.ok(time.waits.includes(2000));
});

test('two consecutive 429 responses stop immediately', async () => {
  const time = clock();
  let attempts = 0;
  const requester = createWikiRequester({
    fetchImpl: async () => {
      attempts += 1;
      return response({ error: { code: 'ratelimited' } }, 429, { 'Retry-After': '0' });
    },
    now: time.now,
    sleep: time.sleep,
  });

  await assert.rejects(() => requester.request({ action: 'query' }), /429.*twice|repeated 429/i);
  assert.equal(attempts, 2);
});

test('requests are spaced by the injectable minimum interval', async () => {
  const time = clock();
  const starts = [];
  let calls = 0;
  const requester = createWikiRequester({
    fetchImpl: async () => {
      starts.push(time.current);
      calls += 1;
      return response({ query: { n: calls } });
    },
    now: time.now,
    sleep: time.sleep,
  });

  await requester.request({ action: 'query', n: 'one' });
  await requester.request({ action: 'query', n: 'two' });
  await requester.request({ action: 'query', n: 'three' });
  assert.deepEqual(starts, [0, 1200, 2400]);
});

test('empty wikitext is recorded separately and not emitted as a page record', async () => {
  await withOutDir(async (outDir) => {
    const time = clock();
    const fetchImpl = async (url) => {
      const params = new URL(url).searchParams;
      if (params.get('generator') === 'allpages') {
        return response({ query: { pages: [page('Empty', 4, '   '), page('Full', 5)] } });
      }
      return response({ query: { allpages: [] } });
    };
    const result = await downloadWiki({ outDir, fetchImpl, now: time.now, sleep: time.sleep });
    const pages = (await readFile(join(outDir, 'pages.jsonl'), 'utf8')).trim().split('\n');
    const empty = JSON.parse(await readFile(join(outDir, 'empty.json'), 'utf8'));
    assert.equal(pages.length, 1);
    assert.equal(JSON.parse(pages[0]).title, 'Full');
    assert.equal(empty[0].title, 'Empty');
    assert.equal(result.counts.empty, 1);
  });
});

test('--limit still runs redirects and --redirect-limit resumes redirect batches', async () => {
  await withOutDir(async (outDir) => {
    const time = clock();
    const calls = [];
    const fetchImpl = async (url) => {
      const params = new URL(url).searchParams;
      calls.push(Object.fromEntries(params));
      if (params.get('generator') === 'allpages') {
        if (!params.has('gapcontinue')) {
          return response({
            continue: { continue: '-||', gapcontinue: 'Beta' },
            query: { pages: [page('Alpha', 1)] },
          });
        }
        return response({ query: { pages: [page('Beta', 2)] } });
      }
      if (params.get('list') === 'allpages') {
        return response({ query: { allpages: [{ title: 'Old Alpha' }, { title: 'Old Beta' }] } });
      }
      const titles = params.get('titles').split('|');
      return response({
        query: { redirects: titles.map((title) => ({ from: title, to: title.replace('Old ', '') })) },
      });
    };

    const first = await downloadWiki({ outDir, limit: 1, redirectLimit: 1, fetchImpl, now: time.now, sleep: time.sleep });
    assert.deepEqual(JSON.parse(await readFile(join(outDir, 'redirects.json'), 'utf8')), { 'Old Alpha': 'Alpha' });
    assert.equal(first.state.pages.complete, false);
    assert.equal(first.state.redirects.complete, false);
    assert.equal(first.state.redirects.resolveOffset, 1);
    assert.ok(calls.some((call) => call.list === 'allpages'));

    const second = await downloadWiki({ outDir, limit: 1, fetchImpl, now: time.now, sleep: time.sleep });
    assert.deepEqual(JSON.parse(await readFile(join(outDir, 'redirects.json'), 'utf8')), {
      'Old Alpha': 'Alpha', 'Old Beta': 'Beta',
    });
    assert.equal(second.state.redirects.complete, true);
    assert.equal(calls.filter((call) => call.list === 'allpages').length, 1);
  });
});

test('resolves redirects in batches of 50 and writes sorted output', async () => {
  await withOutDir(async (outDir) => {
    const time = clock();
    const redirectTitles = ['Zed', 'Alpha', ...Array.from({ length: 49 }, (_, index) => `Title ${index + 1}`)];
    const batchSizes = [];
    const fetchImpl = async (url) => {
      const params = new URL(url).searchParams;
      if (params.get('generator') === 'allpages') {
        return response({ query: { pages: [page('Alpha', 1)] } });
      }
      if (params.get('list') === 'allpages') {
        return response({ query: { allpages: redirectTitles.map((title) => ({ title })) } });
      }
      const titles = params.get('titles').split('|');
      batchSizes.push(titles.length);
      return response({ query: { redirects: titles.map((title) => ({ from: title, to: `Target ${title}` })) } });
    };

    await downloadWiki({ outDir, fetchImpl, now: time.now, sleep: time.sleep });
    const redirects = JSON.parse(await readFile(join(outDir, 'redirects.json'), 'utf8'));
    assert.deepEqual(batchSizes, [50, 1]);
    assert.deepEqual(Object.keys(redirects).slice(0, 2), ['Alpha', 'Title 1']);
    assert.equal(Object.keys(redirects).length, 51);
  });
});
