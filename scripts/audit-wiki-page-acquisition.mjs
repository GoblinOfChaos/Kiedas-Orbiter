// Audit unresolved catalog entries against current Warframe Wiki pages.
// This records page/section availability for review; it deliberately does not
// turn free-form prose into app acquisition claims automatically.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const gapsPath = resolve(ROOT, 'scripts/data-sources/current-acquisition-gaps.md');
const outputPath = resolve(ROOT, 'scripts/data-sources/wiki-page-acquisition-audit.json');
const reportPath = resolve(ROOT, 'scripts/data-sources/wiki-page-acquisition-audit.md');
const API = 'https://wiki.warframe.com/api.php';
const BATCH_SIZE = 50;
const CONCURRENCY = 4;

const gapText = readFileSync(gapsPath, 'utf8');
const items = [...gapText.matchAll(/^\| (.*?) \| `([^`]+)` \| ([^|]+) \|/gm)]
  .map((match) => ({ name: match[1], uniqueName: match[2], category: match[3].trim() }));

function extractAcquisition(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/^==+\s*(Acquisition|Drop Locations|Farming Locations|Sources|Obtaining)\s*==+\s*\n([\s\S]*?)(?=^==+\s+|$)/im);
  const value = match?.[2]?.replace(/\n{3,}/g, '\n\n').trim();
  return value ? { section: match[1], text: value } : null;
}

async function queryBatch(batch) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', redirects: '1',
    prop: 'extracts|info', explaintext: '1', inprop: 'url',
    titles: batch.map((item) => item.name).join('|'),
  });
  const response = await fetch(`${API}?${params}`);
  if (!response.ok) throw new Error(`Wiki query failed: ${response.status}`);
  const payload = await response.json();
  return Object.values(payload.query?.pages || {}).map((page) => ({
    pageId: page.pageid || null,
    title: page.title || null,
    missing: Boolean(page.missing),
    url: page.fullurl || null,
    acquisition: extractAcquisition(page.extract),
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
      const page = byTitle.get(item.name.toLowerCase());
      results.push({ ...item, ...(page || { missing: true, pageId: null, title: null, url: null, acquisition: null }) });
    }
    process.stdout.write(`Audited ${Math.min(results.length, items.length)}/${items.length}\r`);
  }
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
  `Remaining app gaps checked: **${stats.total}**`,
  `Wiki pages found: **${stats.pages}**`,
  `Pages with an explicit Acquisition section: **${stats.acquisitionSections}**`,
  `Missing pages: **${stats.missingPages}**`,
  `Query errors: **${stats.errors}**`, '',
  'This is a discovery list. Acquisition prose is not imported automatically because it requires source-quality review.', '',
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
console.log(`\nWrote ${outputPath} and ${reportPath}`);
console.log(JSON.stringify(stats));
