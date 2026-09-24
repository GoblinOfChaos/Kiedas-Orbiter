import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';

const MODULE_PREFIX = 'Module:';
const SOURCE_EXTENSIONS = new Set(['.lua', '.json']);

export function safeModuleName(title) {
  return title.replace(/[\\/:*?"<>|]/g, '_');
}

function titleFromFilename(fileName, knownTitles) {
  const stem = fileName.replace(/\.(?:lua|json)$/, '');
  const exact = knownTitles.find((title) => safeModuleName(title) === stem);
  if (exact) return exact;
  const encoded = stem.startsWith('Module_') ? stem.slice('Module_'.length) : stem;
  const parts = encoded.split('_');
  if (parts.length === 1) return `${MODULE_PREFIX}${encoded}`;
  return `${MODULE_PREFIX}${parts.slice(0, -1).join('/')}/${parts.at(-1)}`;
}

async function readTitles(luaDir, jsonDir, revisions) {
  const candidates = [
    join(dirname(luaDir), '_all_643_titles.json'),
    join(dirname(jsonDir), '_all_643_titles.json'),
  ];
  for (const path of candidates) {
    try {
      const value = JSON.parse(await readFile(path, 'utf8'));
      if (Array.isArray(value)) return value;
    } catch {
      // The fixture and callers may not have the archive's title index.
    }
  }
  return Object.keys(revisions);
}

async function sourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('_') && SOURCE_EXTENSIONS.has(extname(entry.name)))
    .map((entry) => join(directory, entry.name));
}

export async function buildWikiStore({ luaDir, jsonDir, revisionsFile, outDir, snapshotDate }) {
  const revisions = JSON.parse(await readFile(revisionsFile, 'utf8'));
  const knownTitles = await readTitles(luaDir, jsonDir, revisions);
  const sources = [...await sourceFiles(luaDir), ...await sourceFiles(jsonDir)];
  const chosen = new Map();

  for (const source of sources) {
    const kind = extname(source).slice(1);
    const title = titleFromFilename(basename(source), knownTitles);
    if (!chosen.has(title) || kind === 'json') chosen.set(title, { source, kind });
  }

  await rm(join(outDir, 'modules'), { recursive: true, force: true });
  await mkdir(join(outDir, 'modules'), { recursive: true });
  const modules = [];
  for (const title of [...chosen.keys()].sort((a, b) => a.localeCompare(b))) {
    const { source, kind } = chosen.get(title);
    const raw = await readFile(source);
    if (kind === 'json') JSON.parse(raw.toString('utf8'));
    const compressed = gzipSync(raw, { level: 6 });
    const file = `${safeModuleName(title)}.${kind}.gz`;
    await writeFile(join(outDir, 'modules', file), compressed);
    const revision = revisions[title];
    modules.push({
      title,
      file,
      kind,
      encoding: 'gzip',
      bytes: compressed.length,
      sha256: createHash('sha256').update(compressed).digest('hex'),
      revid: Number.isInteger(revision?.revid) ? revision.revid : null,
      timestamp: typeof revision?.timestamp === 'string' ? revision.timestamp : null,
    });
  }

  const index = {
    formatVersion: 1,
    snapshotDate,
    generatedAt: new Date().toISOString(),
    modules,
  };
  await writeFile(join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

export async function fetchRevisions({ titles, fetchImpl = fetch, sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds)) }) {
  const result = {};
  const uniqueTitles = [...new Set(titles)].sort((a, b) => a.localeCompare(b));
  for (let start = 0; start < uniqueTitles.length; start += 50) {
    if (start > 0) await sleep(1200);
    const batch = uniqueTitles.slice(start, start + 50);
    const url = new URL('https://wiki.warframe.com/api.php');
    url.search = new URLSearchParams({
      action: 'query',
      prop: 'revisions',
      rvprop: 'ids|timestamp',
      format: 'json',
      titles: batch.join('|'),
    });
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`MediaWiki revisions request failed: ${response.status}`);
    const payload = await response.json();
    const pages = Array.isArray(payload?.query?.pages)
      ? payload.query.pages
      : Object.values(payload?.query?.pages ?? {});
    for (const page of pages) {
      const revision = page.revisions?.[0];
      if (revision && page.title) result[page.title] = { revid: Number(revision.revid), timestamp: revision.timestamp };
    }
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const value = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : fallback;
  };
  const luaDir = resolve(value('--lua-dir', 'wiki_module_archive'));
  const jsonDir = resolve(value('--json-dir', 'wiki_module_json'));
  const revisionsFile = resolve(value('--revisions', join(luaDir, 'revisions.json')));
  const outDir = resolve(value('--out', 'src-tauri/data/assets/wiki-store'));
  const snapshotDate = value('--snapshot-date', new Date().toISOString().slice(0, 10));
  const index = await buildWikiStore({ luaDir, jsonDir, revisionsFile, outDir, snapshotDate });
  console.log(`Built ${index.modules.length} wiki modules in ${outDir}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
