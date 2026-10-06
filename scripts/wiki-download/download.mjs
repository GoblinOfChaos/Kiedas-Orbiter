import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const API_BASE = 'https://wiki.warframe.com/api.php';
export const USER_AGENT = 'kiedas-orbiter-research/0.1 (jacob.lewis.edwards@gmail.com)';
export const VERSION = '0.1.0';
const MIN_INTERVAL_MS = 1200;
const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;

const realSleep = (milliseconds) => new Promise((resolvePromise) => {
  setTimeout(resolvePromise, milliseconds);
});

function retryAfterMilliseconds(response, now) {
  const value = response.headers?.get?.('retry-after');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - now());
  return undefined;
}

async function responseJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return { error: { code: 'invalid-response', info: error.message } };
  }
}

function apiError(payload, status) {
  const error = payload?.error;
  if (error?.code) return new Error(`MediaWiki API error ${error.code}: ${error.info ?? 'unknown error'}`);
  return new Error(`MediaWiki HTTP error ${status}`);
}

export function createWikiRequester({
  apiBase = API_BASE,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  sleep = realSleep,
  minIntervalMs = MIN_INTERVAL_MS,
  maxRetries = MAX_RETRIES,
  userAgent = USER_AGENT,
  onRequest,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  let lastRequestStartedAt;
  let requestCount = 0;

  async function waitForRequestSlot() {
    if (lastRequestStartedAt !== undefined) {
      const elapsed = now() - lastRequestStartedAt;
      const waitMilliseconds = Math.max(0, minIntervalMs - elapsed);
      if (waitMilliseconds > 0) await sleep(waitMilliseconds);
    }
    lastRequestStartedAt = now();
  }

  async function request(parameters) {
    let throttleStreak = 0;
    let retryCount = 0;
    while (true) {
      await waitForRequestSlot();
      const url = new URL(apiBase);
      for (const [key, value] of Object.entries(parameters)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent,
        },
      });
      requestCount += 1;
      onRequest?.(requestCount, { url: url.toString(), status: response.status });
      const payload = await responseJson(response);
      const status = response.status;
      const isThrottle = status === 403 || status === 429;

      if (isThrottle) {
        throttleStreak += 1;
        if (throttleStreak >= 2) {
          throw new Error(`HTTP ${status} repeated twice; stopping to protect the wiki`);
        }
        if (retryCount >= maxRetries) throw apiError(payload, status);
        const delay = retryAfterMilliseconds(response, now)
          ?? (BACKOFF_BASE_MS * (2 ** retryCount));
        retryCount += 1;
        await sleep(delay);
        continue;
      }
      throttleStreak = 0;

      const code = payload?.error?.code;
      if (code === 'maxlag') {
        if (retryCount >= maxRetries) {
          throw new Error(`MediaWiki maxlag persisted after ${maxRetries} retries: ${payload.error.info ?? 'unknown error'}`);
        }
        const delay = retryAfterMilliseconds(response, now)
          ?? (BACKOFF_BASE_MS * (2 ** retryCount));
        retryCount += 1;
        await sleep(delay);
        continue;
      }

      if (!response.ok || code) throw apiError(payload, status);
      return payload;
    }
  }

  return {
    request,
    get requestCount() {
      return requestCount;
    },
  };
}

function pageList(query) {
  if (Array.isArray(query?.pages)) return query.pages;
  throw new Error('MediaWiki page response is missing query.pages array');
}

function revisionContent(revision) {
  const main = revision?.slots?.main;
  if (typeof main?.content === 'string') return { present: true, value: main.content };
  if (typeof main?.['*'] === 'string') return { present: true, value: main['*'] };
  if (typeof revision?.content === 'string') return { present: true, value: revision.content };
  if (typeof revision?.['*'] === 'string') return { present: true, value: revision['*'] };
  return { present: false, value: '' };
}

function pageRecord(page) {
  if (!page?.title || typeof page.title !== 'string') {
    throw new Error(`MediaWiki page response is missing a title: ${JSON.stringify(page)}`);
  }
  const revision = page?.revisions?.[0];
  const emptyRecord = (reason) => ({
    kind: 'empty',
    record: { title: page.title, pageid: page.pageid, reason },
  });
  if (!revision) return emptyRecord('no-revision');
  if (revision.revid === undefined || revision.revid === null) {
    return emptyRecord('missing-revid');
  }
  const content = revisionContent(revision);
  if (!content.present) return emptyRecord('missing-slot-content');
  if (!content.value.trim()) return emptyRecord('empty-wikitext');
  return {
    kind: 'page',
    record: {
      title: page.title,
      pageid: page.pageid,
      revid: revision.revid,
      timestamp: revision.timestamp,
      wikitext: content.value,
    },
  };
}

function normalizeEmptyRecord(record) {
  if (!record?.title) return record;
  if (typeof record.reason === 'string' && record.reason.trim()) {
    return { title: record.title, pageid: record.pageid, reason: record.reason };
  }
  if ('wikitext' in record && !String(record.wikitext).trim()) {
    return { title: record.title, pageid: record.pageid, reason: 'empty-wikitext' };
  }
  return record;
}

async function readText(path, fallback) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function readJson(path, fallback) {
  const text = await readText(path, undefined);
  return text === undefined ? fallback : JSON.parse(text);
}

async function readPageRecords(path) {
  const text = await readText(path, '');
  const records = new Map();
  let hadDuplicates = false;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (records.has(record.title)) hadDuplicates = true;
    records.set(record.title, record);
  }
  return { records, hadDuplicates };
}

function mapFromRecords(records) {
  return new Map(records
    .map(normalizeEmptyRecord)
    .filter((record) => record?.title)
    .map((record) => [record.title, record]));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeCanonicalPages(path, records) {
  const lines = [...records.values()].map((record) => JSON.stringify(record));
  await writeFile(path, lines.length ? `${lines.join('\n')}\n` : '');
}

async function appendPageRecords(path, records) {
  if (records.length === 0) return;
  await appendFile(path, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
}

function defaultState(mode, titlesKey) {
  return {
    version: 1,
    pages: {
      mode,
      titlesKey,
      complete: false,
      continuation: undefined,
      titleOffset: 0,
    },
    redirects: {
      complete: false,
      listComplete: false,
      listContinuation: undefined,
      titles: [],
      resolveOffset: 0,
    },
  };
}

function parseTitles(value, source) {
  const titles = Array.isArray(value) ? value : value?.titles;
  if (!Array.isArray(titles) || titles.some((title) => typeof title !== 'string' || !title.trim())) {
    throw new Error(`Titles file must contain a JSON array of non-empty strings: ${source}`);
  }
  return [...new Set(titles.map((title) => title.trim()))];
}

function titleKey(titles) {
  return titles.join('\u0000');
}

async function processPages(pages, records, emptyRecords, pagesPath, emptyPath) {
  const append = [];
  let needsCanonicalRewrite = false;
  for (const page of pages) {
    const result = pageRecord(page);
    const record = result.record;
    const previous = records.get(record.title) ?? emptyRecords.get(record.title);
    if (result.kind === 'page') {
      if (records.get(record.title)?.revid === record.revid) continue;
      if (records.has(record.title)) needsCanonicalRewrite = true;
      if (emptyRecords.delete(record.title)) needsCanonicalRewrite = true;
      records.set(record.title, record);
      if (!previous) append.push(record);
    } else {
      if (records.delete(record.title)) needsCanonicalRewrite = true;
      emptyRecords.set(record.title, record);
    }
  }
  if (needsCanonicalRewrite) await writeCanonicalPages(pagesPath, records);
  else await appendPageRecords(pagesPath, append);
  await writeJson(emptyPath, [...emptyRecords.values()]);
  return pages.length;
}

function validate(records, emptyRecords, duplicateInput) {
  if (duplicateInput) throw new Error('pages.jsonl contained duplicate titles after resume');
  for (const record of records.values()) {
    if (!record.title || !String(record.wikitext).trim()) {
      throw new Error(`Invalid non-empty page record for ${record.title ?? '<unknown>'}`);
    }
  }
  for (const record of emptyRecords.values()) {
    if (!record.title || typeof record.reason !== 'string' || !record.reason.trim()) {
      throw new Error(`Invalid empty page record for ${record.title ?? '<unknown>'}`);
    }
  }
}

function queryObject(payload) {
  if (!payload?.query || typeof payload.query !== 'object') {
    throw new Error('MediaWiki response is missing query object');
  }
  return payload.query;
}

export async function downloadWiki({
  outDir,
  limit,
  redirectLimit,
  titles,
  apiBase = API_BASE,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  sleep = realSleep,
  minIntervalMs = MIN_INTERVAL_MS,
  userAgent = USER_AGENT,
  log = console.log,
} = {}) {
  if (!outDir) throw new Error('outDir is required');
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }
  const outputDir = resolve(outDir);
  await mkdir(outputDir, { recursive: true });
  const pagesPath = join(outputDir, 'pages.jsonl');
  const emptyPath = join(outputDir, 'empty.json');
  const redirectsPath = join(outputDir, 'redirects.json');
  const unresolvedRedirectsPath = join(outputDir, 'redirects.unresolved.json');
  const manifestPath = join(outputDir, 'manifest.json');
  const statePath = join(outputDir, 'state.json');
  const requestedTitles = titles ? parseTitles(titles, '<provided titles>') : undefined;
  const mode = requestedTitles ? 'titles' : 'allpages';
  const titlesKey = requestedTitles ? titleKey(requestedTitles) : undefined;
  const loadedState = await readJson(statePath, undefined);
  let state = loadedState ?? defaultState(mode, titlesKey);
  if (state.pages?.mode !== mode || (mode === 'titles' && state.pages.titlesKey !== titlesKey)
      || state.pages?.complete) {
    state = { ...state, pages: defaultState(mode, titlesKey).pages };
  }
  if (redirectLimit !== undefined && (!Number.isInteger(redirectLimit) || redirectLimit < 1)) {
    throw new Error('--redirect-limit must be a positive integer');
  }
  if (!state.redirects?.titles || state.redirects.listComplete === undefined
      || state.redirects.resolveOffset === undefined) {
    state.redirects = defaultState(mode, titlesKey).redirects;
  }

  const pageData = await readPageRecords(pagesPath);
  const records = pageData.records;
  const emptyRecords = mapFromRecords(await readJson(emptyPath, []));
  const requester = createWikiRequester({
    apiBase,
    fetchImpl,
    now,
    sleep,
    minIntervalMs,
    userAgent,
    onRequest: (count) => {
      if (count % 10 === 0) log(`[wiki-download] requests=${count}`);
    },
  });

  let processedThisRun = 0;
  let pagesComplete = Boolean(state.pages.complete);
  while (!pagesComplete && (limit === undefined || processedThisRun < limit)) {
    let payload;
    let requestedCount;
    if (requestedTitles) {
      const offset = state.pages.titleOffset ?? 0;
      if (offset >= requestedTitles.length) {
        pagesComplete = true;
        state.pages.complete = true;
        break;
      }
      const remaining = limit === undefined ? 50 : Math.min(50, limit - processedThisRun);
      const batch = requestedTitles.slice(offset, offset + remaining);
      requestedCount = batch.length;
      payload = await requester.request({
        action: 'query', format: 'json', formatversion: '2',
        titles: batch.join('|'), prop: 'revisions', rvprop: 'ids|timestamp|content',
        rvslots: 'main', maxlag: '5',
      });
      state.pages.titleOffset = offset + batch.length;
    } else {
      requestedCount = limit === undefined ? 50 : Math.min(50, limit - processedThisRun);
      payload = await requester.request({
        action: 'query', format: 'json', formatversion: '2',
        generator: 'allpages', gapnamespace: '0', gapfilterredir: 'nonredirects',
        gaplimit: String(requestedCount), prop: 'revisions', rvprop: 'ids|timestamp|content',
        rvslots: 'main', maxlag: '5',
        ...(state.pages.continuation ?? {}),
      });
    }
    const pages = pageList(queryObject(payload));
    await processPages(pages, records, emptyRecords, pagesPath, emptyPath);
    processedThisRun += requestedCount;
    if (requestedTitles) {
      pagesComplete = (state.pages.titleOffset ?? 0) >= requestedTitles.length;
    } else if (payload.continue) {
      state.pages.continuation = payload.continue;
      pagesComplete = false;
    } else {
      state.pages.continuation = undefined;
      pagesComplete = true;
    }
    state.pages.complete = pagesComplete;
    state.updatedAt = new Date(now()).toISOString();
    await writeJson(statePath, state);
  }

  if (!state.redirects.complete) {
    const redirectState = state.redirects;
    const redirectMap = new Map(Object.entries(await readJson(redirectsPath, {})));
    const unresolved = new Set(await readJson(unresolvedRedirectsPath, []));
    let resolvedThisRun = 0;

    while (!redirectState.listComplete
      && (redirectLimit === undefined
        || redirectState.titles.length < redirectState.resolveOffset + redirectLimit)) {
      const payload = await requester.request({
        action: 'query', format: 'json', formatversion: '2',
        list: 'allpages', apnamespace: '0', apfilterredir: 'redirects', aplimit: '500',
        ...(redirectState.listContinuation ?? {}),
      });
      const query = queryObject(payload);
      if (!Array.isArray(query.allpages)) {
        throw new Error('MediaWiki redirect response is missing query.allpages array');
      }
      for (const item of query.allpages) {
        if (typeof item?.title === 'string' && item.title.trim()
            && !redirectState.titles.includes(item.title)) {
          redirectState.titles.push(item.title);
        }
      }
      if (payload.continue) {
        redirectState.listContinuation = payload.continue;
      } else {
        redirectState.listContinuation = undefined;
        redirectState.listComplete = true;
      }
      state.updatedAt = new Date(now()).toISOString();
      await writeJson(statePath, state);
    }

    while (redirectState.resolveOffset < redirectState.titles.length
      && (redirectLimit === undefined || resolvedThisRun < redirectLimit)) {
      const remaining = redirectLimit === undefined ? 50 : redirectLimit - resolvedThisRun;
      const batch = redirectState.titles.slice(
        redirectState.resolveOffset,
        redirectState.resolveOffset + Math.min(50, remaining),
      );
      const payload = await requester.request({
        action: 'query', format: 'json', formatversion: '2',
        titles: batch.join('|'), redirects: '1',
      });
      const query = queryObject(payload);
      if (!Array.isArray(query.redirects)) {
        throw new Error('MediaWiki redirect response is missing query.redirects array');
      }
      const resolved = new Map(query.redirects
        .filter((item) => item?.from)
        .map((item) => [item.from, item]));
      for (const source of batch) {
        const pair = resolved.get(source);
        if (!pair?.to) {
          unresolved.add(source);
          continue;
        }
        unresolved.delete(source);
        const fragment = pair.tofragment ? `#${pair.tofragment}` : '';
        redirectMap.set(source, `${pair.to}${fragment}`);
      }
      redirectState.resolveOffset += batch.length;
      resolvedThisRun += batch.length;
      redirectState.complete = redirectState.listComplete
        && redirectState.resolveOffset >= redirectState.titles.length;
      await writeJson(redirectsPath, Object.fromEntries([...redirectMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))));
      await writeJson(unresolvedRedirectsPath, [...unresolved].sort((a, b) => a.localeCompare(b)));
      state.updatedAt = new Date(now()).toISOString();
      await writeJson(statePath, state);
    }

    redirectState.complete = redirectState.listComplete
      && redirectState.resolveOffset >= redirectState.titles.length;
    await writeJson(redirectsPath, Object.fromEntries([...redirectMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))));
    await writeJson(unresolvedRedirectsPath, [...unresolved].sort((a, b) => a.localeCompare(b)));
    state.updatedAt = new Date(now()).toISOString();
    await writeJson(statePath, state);
  }

  validate(records, emptyRecords, pageData.hadDuplicates);
  const counts = {
    pages: records.size,
    redirects: Object.keys(await readJson(redirectsPath, {})).length,
    empty: emptyRecords.size,
    noRevision: [...emptyRecords.values()]
      .filter((record) => record.reason !== 'empty-wikitext').length,
    requests: requester.requestCount,
  };
  const manifest = {
    fetchedAt: new Date(now()).toISOString(),
    apiBase,
    counts,
    userAgent,
    version: VERSION,
    license: 'CC BY-NC-SA 3.0',
    attribution: 'Article wikitext retrieved from the official Warframe Wiki (wiki.warframe.com).',
  };
  await writeJson(manifestPath, manifest);
  await writeJson(statePath, state);
  return { counts, manifest, state };
}

async function parseCli(argv) {
  const [outDir, ...rest] = argv;
  if (!outDir) throw new Error('Usage: node scripts/wiki-download/download.mjs <outDir> [--limit N] [--redirect-limit N] [--titles file.json]');
  const options = { outDir };
  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index];
    if (option === '--limit') {
      const value = Number(rest[++index]);
      if (!Number.isInteger(value) || value < 1) throw new Error('--limit requires a positive integer');
      options.limit = value;
    } else if (option === '--titles') {
      options.titles = parseTitles(JSON.parse(await readFile(resolve(rest[++index]), 'utf8')), rest[index]);
    } else if (option === '--redirect-limit') {
      const value = Number(rest[++index]);
      if (!Number.isInteger(value) || value < 1) throw new Error('--redirect-limit requires a positive integer');
      options.redirectLimit = value;
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = await parseCli(argv);
  const result = await downloadWiki(options);
  console.log(`[wiki-download] pages=${result.counts.pages} redirects=${result.counts.redirects} empty=${result.counts.empty} no-revision=${result.counts.noRevision}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[wiki-download] ${error.message}`);
    process.exitCode = 1;
  });
}
