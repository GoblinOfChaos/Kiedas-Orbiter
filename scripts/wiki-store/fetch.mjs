import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { safeModuleName } from './build.mjs';

export const API_BASE = 'https://wiki.warframe.com/api.php';
export const USER_AGENT = 'Kiedas-Orbiter wiki-fetch (github.com/GoblinOfChaos/Kiedas-Orbiter)';
export const SCRIPT_VERSION = '1.0.0';
const REQUEST_SPACING_MS = 300;
const BATCH_SIZE = 50;

const sleepDefault = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

export function parseArgs(args) {
  const options = { out: 'wiki-archive', only: null, limit: null };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--out') options.out = args[++index];
    else if (argument === '--only') options.only = args[++index];
    else if (argument === '--limit') options.limit = Number(args[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.only && !['modules', 'articles'].includes(options.only)) throw new Error('--only must be modules or articles');
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error('--limit must be a positive integer');
  return options;
}

function pagesFromQuery(payload) {
  return Array.isArray(payload?.query?.pages) ? payload.query.pages : Object.values(payload?.query?.pages ?? {});
}

function isRetryable(status, payload) {
  return status === 429 || status >= 500 || payload?.error?.code === 'maxlag';
}

function retryDelay(attempt, response) {
  const retryAfter = Number(response?.headers?.get?.('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return retryAfter * 1000;
  return Math.min(10_000, 500 * (2 ** attempt));
}

export function createRequester({ fetchImpl = fetch, sleep = sleepDefault, now = () => Date.now(), spacingMs = REQUEST_SPACING_MS, maxRetries = 5 } = {}) {
  let lastRequestAt = -Infinity;
  return async (params) => {
    const url = new URL(API_BASE);
    url.search = new URLSearchParams({ ...params, format: 'json', formatversion: '2', maxlag: '5' });
    for (let attempt = 0; ; attempt += 1) {
      const waitForSpacing = spacingMs - (now() - lastRequestAt);
      if (waitForSpacing > 0) await sleep(waitForSpacing);
      lastRequestAt = now();
      const response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
      let payload;
      try { payload = await response.json(); } catch { payload = null; }
      if (response.ok && !payload?.error) return payload;
      if (isRetryable(response.status, payload) && attempt < maxRetries) {
        await sleep(retryDelay(attempt, response));
        continue;
      }
      const code = payload?.error?.code ? ` ${payload.error.code}` : '';
      throw new Error(`MediaWiki API request failed: HTTP ${response.status}${code}`);
    }
  };
}

async function listAllPages(request, namespace, filterRedirects) {
  const titles = [];
  let continuation = {};
  do {
    const payload = await request({ action: 'query', list: 'allpages', apnamespace: String(namespace), ...(filterRedirects ? { apfilterredir: 'nonredirects' } : {}), ...continuation });
    titles.push(...(payload?.query?.allpages ?? []).map((page) => page.title).filter(Boolean));
    continuation = payload?.continue ?? null;
  } while (continuation);
  return titles;
}

async function fetchSources(request, titles, failed) {
  const sources = new Map();
  const uniqueTitles = [...new Set(titles)];
  for (let start = 0; start < uniqueTitles.length; start += BATCH_SIZE) {
    const batch = uniqueTitles.slice(start, start + BATCH_SIZE);
    const returned = new Set();
    let continuation = {};
    try {
      // The API may split a content-heavy batch across several responses
      // (rvcontinue); keep going until it stops handing back a continuation.
      do {
        const payload = await request({ action: 'query', prop: 'revisions', rvprop: 'ids|timestamp|content', rvslots: 'main', titles: batch.join('|'), ...continuation });
        for (const page of pagesFromQuery(payload)) {
          const title = page.title;
          const revision = page.revisions?.[0];
          const content = revision?.slots?.main?.content;
          if (!title || page.missing || !revision || typeof content !== 'string') continue;
          returned.add(title);
          sources.set(title, { content, pageid: Number(page.pageid), revid: Number(revision.revid), timestamp: revision.timestamp });
        }
        continuation = payload?.continue ?? null;
      } while (continuation);
    } catch (error) {
      for (const title of batch) if (!returned.has(title)) failed.push({ title, error: error.message });
      continue;
    }
    for (const title of batch) if (!returned.has(title)) failed.push({ title, error: 'Page missing or has no main-slot wikitext' });
  }
  return sources;
}

function addUniqueFailure(failed, entries) {
  const seen = new Set(failed.map((entry) => entry.title));
  for (const entry of entries) if (!seen.has(entry.title)) { failed.push(entry); seen.add(entry.title); }
}

async function ensureNewDirectory(directory) {
  try {
    await stat(directory);
    throw new Error(`Archive directory already exists: ${directory}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(directory, { recursive: true });
}

async function writeSources(directory, kind, titles, sources) {
  const folder = kind === 'modules' ? 'modules' : 'articles';
  await mkdir(join(directory, folder), { recursive: true });
  const stems = new Map();
  for (const title of titles) {
    const stem = safeModuleName(title);
    if (stems.has(stem) && stems.get(stem) !== title) throw new Error(`Wiki filename collision: ${stems.get(stem)} and ${title} both map to ${stem}`);
    stems.set(stem, title);
    const source = sources.get(title);
    if (!source) continue;
    const extension = kind === 'modules' ? '.lua' : '.wikitext';
    await writeFile(join(directory, folder, `${stem}${extension}`), source.content);
  }
}

export async function fetchWiki({ outDir = 'wiki-archive', only = null, limit = null, fetchImpl = fetch, sleep = sleepDefault, now = () => Date.now(), timestamp = new Date(), spacingMs = REQUEST_SPACING_MS } = {}) {
  const request = createRequester({ fetchImpl, sleep, now, spacingMs });
  const failed = [];
  const selected = only ? [only] : ['modules', 'articles'];
  const titlesByKind = { modules: [], articles: [] };
  for (const kind of selected) {
    try {
      titlesByKind[kind] = await listAllPages(request, kind === 'modules' ? 828 : 0, kind === 'articles');
    } catch (error) {
      failed.push({ title: `__${kind}_enumeration__`, error: error.message });
      continue;
    }
    if (titlesByKind[kind].length === 0) failed.push({ title: `__${kind}_enumeration__`, error: 'Namespace enumeration returned zero pages' });
    if (limit !== null) titlesByKind[kind] = titlesByKind[kind].slice(0, limit);
  }
  const sourcesByKind = { modules: new Map(), articles: new Map() };
  for (const kind of selected) {
    const sourceFailures = [];
    sourcesByKind[kind] = await fetchSources(request, titlesByKind[kind], sourceFailures);
    addUniqueFailure(failed, sourceFailures);
  }
  const outRoot = resolve(outDir);
  await mkdir(outRoot, { recursive: true });
  const archiveName = timestamp.toISOString().replace(/\.\d{3}Z$/, '').replace(/[-:]/g, (match) => match === ':' ? '' : match).replace('T', '-');
  const archiveDir = join(outRoot, archiveName);
  await ensureNewDirectory(archiveDir);
  for (const kind of selected) await writeSources(archiveDir, kind, titlesByKind[kind], sourcesByKind[kind]);
  const pages = { modules: {}, articles: {} };
  for (const kind of selected) for (const [title, source] of sourcesByKind[kind]) pages[kind][title] = { pageid: source.pageid, revid: source.revid, timestamp: source.timestamp };
  const manifest = { fetchedAt: timestamp.toISOString(), api: API_BASE, scriptVersion: SCRIPT_VERSION, counts: { modules: titlesByKind.modules.length, articles: titlesByKind.articles.length }, pages, revisions: { ...pages.modules, ...pages.articles }, failed: failed.map((entry) => entry.title), failureDetails: failed };
  await writeFile(join(archiveDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(outRoot, 'latest.json'), `${JSON.stringify({ archive: archiveName }, null, 2)}\n`);
  if (failed.length > 0) {
    const error = new Error(`Wiki fetch completed with ${failed.length} failed title(s)`);
    error.manifest = manifest;
    throw error;
  }
  return { archiveName, archiveDir, manifest };
}

async function main() {
  const { out, only, limit } = parseArgs(process.argv.slice(2));
  const result = await fetchWiki({ outDir: out, only, limit });
  console.log(`Fetched ${result.manifest.counts.modules} modules and ${result.manifest.counts.articles} articles into ${result.archiveDir}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
