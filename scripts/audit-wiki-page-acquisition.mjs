// Audit unresolved catalog entries against current Warframe Wiki pages.
// This records page/section availability for review; it deliberately does not
// turn free-form prose into app acquisition claims automatically.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const evidencePath = resolve(ROOT, 'scripts/data-sources/acquisition-item-evidence.json');
const outputPath = resolve(ROOT, 'scripts/data-sources/wiki-page-acquisition-audit.json');
const reportPath = resolve(ROOT, 'scripts/data-sources/wiki-page-acquisition-audit.md');
const statusAssetPath = resolve(ROOT, 'src-tauri/data/assets/data/wiki-acquisition-status.json');
const API = 'https://wiki.warframe.com/api.php';
const BATCH_SIZE = 50;
const CONCURRENCY = 4;

const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const items = evidence.items
  .filter((item) => item.auditStatus === 'wiki-status-no-acquisition-evidence')
  .map(({ displayName: name, uniqueName, sourcedCategories }) => ({ name, uniqueName, category: sourcedCategories.join(', ') }));

function extractAcquisition(text) {
  if (typeof text !== 'string') return null;
  // Keep nested acquisition subsections (=== 10x Blueprint ===, tables,
  // etc.) inside the top-level section. Only another level-two heading ends
  // the acquisition block.
  const match = text.match(/^==\s*(Acquisition|Drop Locations|Farming Locations|Sources|Obtaining)\s*==+\s*\n([\s\S]*?)(?=^==\s+|$)/im);
  const value = match?.[2]?.replace(/\n{3,}/g, '\n\n').trim();
  if (value) return { section: match[1], text: value };

  // Some current Wiki pages put a verified route in the lead and use the
  // formal section only for generated drop-table headings. Preserve that
  // exact lead as a discovery candidate, but keep it marked separately for
  // review instead of silently treating every descriptive sentence as proof.
  const lead = text.split(/^==\s+/m, 1)[0]?.replace(/\n{3,}/g, '\n\n').trim();
  if (lead && /\b(obtain(?:ed|able)?|acquir(?:ed|e)|drop(?:s|ped)?|purchas(?:ed|e)|available|awarded|earned|received|crafted|built|redeem(?:ed|ing)|reward)\b/i.test(lead)) {
    return { section: 'Lead acquisition statement', text: lead };
  }
  return null;
}

async function queryBatch(batch) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', redirects: '1',
    prop: 'revisions|info', rvprop: 'content', rvslots: 'main', inprop: 'url',
    titles: batch.map((item) => item.name).join('|'),
  });
  const response = await fetch(`${API}?${params}`);
  if (!response.ok) throw new Error(`Wiki query failed: ${response.status}`);
  const payload = await response.json();
  const redirects = new Map((payload.query?.redirects || []).map((redirect) => [
    String(redirect.from || '').toLowerCase(),
    String(redirect.to || '').toLowerCase(),
  ]));
  return Object.values(payload.query?.pages || {}).map((page) => ({
    pageId: Number.isFinite(Number(page.pageid)) ? Number(page.pageid) : null,
    title: page.title || null,
    redirectFrom: [...redirects.entries()].find(([, target]) => target === String(page.title || '').toLowerCase())?.[0] || null,
    // Missing pages are returned as synthetic -1 pages with an empty
    // `missing` value, so Boolean(page.missing) is not a valid presence test.
    missing: page.pageid == null || Number(page.pageid) < 1 || Object.prototype.hasOwnProperty.call(page, 'missing'),
    url: page.fullurl || null,
    acquisition: extractAcquisition(page.revisions?.[0]?.slots?.main?.['*']),
  }));
}

const batches = [];
for (let i = 0; i < items.length; i += BATCH_SIZE) batches.push(items.slice(i, i + BATCH_SIZE));
const results = [];
let nextBatch = 0;
async function worker() {
  while (nextBatch < batches.length) {
    const batch = batches[nextBatch++];
    let pages;
    try { pages = await queryBatch(batch); }
    catch (error) {
      pages = batch.map(() => ({ error: String(error.message || error) }));
    }
  const byTitle = new Map(pages.filter((page) => page.title).map((page) => [page.title.toLowerCase(), page]));
    for (const item of batch) {
      const page = byTitle.get(item.name.toLowerCase())
        || byTitle.get(redirectsTarget(pages, item.name));
      results.push({ ...item, ...(page || { missing: true, pageId: null, title: null, url: null, acquisition: null }) });
    }
    process.stdout.write(`Audited ${Math.min(results.length, items.length)}/${items.length}\r`);
  }
}

function redirectsTarget(pages, sourceTitle) {
  const source = sourceTitle.toLowerCase();
  return pages.find((page) => page.redirectFrom === source)?.title?.toLowerCase() || '';
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
results.sort((a, b) => a.name.localeCompare(b.name) || a.uniqueName.localeCompare(b.uniqueName));

const stats = {
  total: results.length,
  pages: results.filter((item) => !item.missing && !item.error).length,
  acquisitionSections: results.filter((item) => item.acquisition).length,
  missingPages: results.filter((item) => item.missing).length,
  errors: results.filter((item) => item.error).length,
};
writeFileSync(outputPath, `${JSON.stringify({ generated: new Date().toISOString(), stats, items: results }, null, 2)}\n`);

// MediaWiki represents a missing page as a synthetic page with pageid -1 and
// an empty `missing` field. Boolean(page.missing) therefore misclassifies it
// as present. Keep the runtime status asset tied to the same exact API result
// used by this audit, and require a real positive page id for pageFound.
const existingStatus = JSON.parse(readFileSync(statusAssetPath, 'utf8'));
const status = { ...existingStatus };
for (const item of results) {
  if (item.error) continue;
  status[item.uniqueName] = {
    ...(status[item.uniqueName]?.exportDisposition ? { exportDisposition: status[item.uniqueName].exportDisposition } : {}),
    displayName: item.name,
    pageFound: !item.missing && Number.isFinite(item.pageId) && item.pageId > 0,
    url: item.url || null,
  };
}
writeFileSync(statusAssetPath, `${JSON.stringify(status, null, 2)}\n`);
// Discovery only: candidates are reviewed against the exact export path before
// they are promoted into app data. This prevents a page snippet or stale Wiki
// prose from becoming an acquisition claim automatically.
const candidatesPath = resolve(ROOT, 'scripts/data-sources/wiki-page-acquisition-candidates.json');
writeFileSync(candidatesPath, `${JSON.stringify({ generated: new Date().toISOString(), items: results.filter((item) => item.acquisition) }, null, 2)}\n`);

const byCategory = new Map();
for (const item of results) {
  const bucket = byCategory.get(item.category) || { total: 0, pages: 0, sections: 0 };
  bucket.total++;
  if (!item.missing && !item.error) bucket.pages++;
  if (item.acquisition) bucket.sections++;
  byCategory.set(item.category, bucket);
}
const lines = [
  '# Wiki page acquisition audit', '',
  `Generated: ${new Date().toISOString()}`, '',
  `Status-only records checked: **${stats.total}**`,
  `Wiki pages found: **${stats.pages}**`,
  `Pages with an explicit Acquisition section: **${stats.acquisitionSections}**`,
  `Missing pages: **${stats.missingPages}**`,
  `Query errors: **${stats.errors}**`, '',
  'This is a discovery list. Acquisition prose is not imported automatically because it requires source-quality review against the exact DE export object.', '',
  '## By category', '', '| Category | Gaps | Pages | Acquisition sections |', '|---|---:|---:|---:|',
  ...[...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, value]) => `| ${category} | ${value.total} | ${value.pages} | ${value.sections} |`), '',
  '## Items with Acquisition sections', '', '| Name | Unique name | Category | Wiki page | Acquisition text |', '|---|---|---|---|---|',
  ...results.filter((item) => item.acquisition).map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | [page](${item.url}) | **${item.acquisition.section}:** ${item.acquisition.text.replaceAll('|', '\\|').replaceAll('\n', '<br>')} |`), '',
  '## Pages without Acquisition sections', '', '| Name | Unique name | Category | Wiki page |', '|---|---|---|---|',
  ...results.filter((item) => !item.acquisition && !item.missing && !item.error).map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | [page](${item.url}) |`), '',
  '## Missing or errored pages', '', '| Name | Unique name | Category | Status |', '|---|---|---|---|',
  ...results.filter((item) => item.missing || item.error).map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | ${item.error || 'page not found'} |`), '',
];
writeFileSync(reportPath, `${lines.join('\n')}\n`);
console.log(`\nWrote ${outputPath}, ${reportPath}, ${candidatesPath}, and ${statusAssetPath}`);
console.log(JSON.stringify({ ...stats, candidates: results.filter((item) => item.acquisition).length }));
