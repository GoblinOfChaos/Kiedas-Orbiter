import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseDropTablesHtml, validateDropTables } from '../../src/lib/deDropTables/parse.js';

export const DROP_TABLES_URL = 'https://www.warframe.com/droptables';

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

async function atomicWrite(path, contents) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, contents);
  await rename(temporary, path);
}

function header(response, name) {
  return response.headers?.get?.(name) ?? null;
}

function isAllowedRedirect(url) {
  const parsed = new URL(url);
  return parsed.protocol === 'https:' && (
    parsed.hostname === 'warframe.com' ||
    parsed.hostname.endsWith('.warframe.com') ||
    parsed.hostname === 'warframe-web-assets.nyc3.cdn.digitaloceanspaces.com'
  );
}

async function fetchOnce(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { redirect: 'manual', headers });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = header(response, 'location');
    if (!location) throw new Error(`DE drop-table redirect from ${url} did not include Location`);
    const resolvedUrl = new URL(location, url).href;
    if (!isAllowedRedirect(resolvedUrl)) {
      throw new Error(`DE drop-table redirect target is not an approved HTTPS Warframe host: ${resolvedUrl}`);
    }
    const redirected = await fetchImpl(resolvedUrl, { redirect: 'manual', headers });
    if ([301, 302, 303, 307, 308].includes(redirected.status)) throw new Error(`DE drop-table redirect chain exceeds one hop at ${resolvedUrl}`);
    return { response: redirected, resolvedUrl };
  }
  return { response, resolvedUrl: url };
}

export async function refreshDropTables({ cacheDir, fetchImpl = fetch, now = () => new Date() }) {
  await mkdir(cacheDir, { recursive: true });
  const htmlPath = join(cacheDir, 'droptables.html');
  const parsedPath = join(cacheDir, 'droptables.parsed.json');
  const previous = await readJson(parsedPath);
  const requestUrl = previous?.resolvedUrl || DROP_TABLES_URL;
  const headers = {};
  if (previous?.lastModified) headers['If-Modified-Since'] = previous.lastModified;

  try {
    const { response, resolvedUrl } = await fetchOnce(fetchImpl, requestUrl, headers);
    if (response.status === 304) return { status: 'not-modified', stats: previous?.stats };
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const parsed = parseDropTablesHtml(html);
    const validation = validateDropTables(parsed, previous);
    if (!validation.ok) return { status: 'rejected', errors: validation.errors };
    const snapshot = {
      sourceUrl: DROP_TABLES_URL,
      resolvedUrl,
      lastModified: header(response, 'last-modified') || previous?.lastModified || null,
      fetchedAt: now().toISOString(),
      sha256: createHash('sha256').update(html).digest('hex'),
      stats: parsed.stats,
      sections: parsed.sections,
    };
    await atomicWrite(htmlPath, html);
    await atomicWrite(parsedPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    return { status: 'updated', stats: parsed.stats, warnings: validation.warnings };
  } catch (error) {
    return { status: 'rejected', errors: [error instanceof Error ? error.message : String(error)] };
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const cacheDir = process.argv[2];
  if (!cacheDir) {
    console.error('Usage: node scripts/de-drop-tables/fetch.mjs <cache-dir>');
    process.exitCode = 1;
  } else {
    const result = await refreshDropTables({ cacheDir });
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'rejected') process.exitCode = 1;
  }
}
