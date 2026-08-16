// Inspect raw Warframe Wiki source for acquisition fields that the rendered
// extract endpoint omits: Skinbox/Component/PackInfo template parameters and
// explicit unavailable markers. This is discovery evidence only; promotion
// into the app still requires exact-item review.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const input = JSON.parse(readFileSync(resolve(ROOT, 'scripts/data-sources/acquisition-item-evidence.json'), 'utf8'));
const items = input.items.filter((item) =>
  item.auditStatus === 'wiki-status-no-acquisition-evidence' || item.auditStatus === 'verified-unavailable',
);
const API = 'https://wiki.warframe.com/api.php';

const field = (body, name) => {
  const match = body?.match(new RegExp(`^\\|\\s*${name}\\s*=\\s*(.*?)\\s*$`, 'im'));
  return match?.[1]?.trim() || null;
};
const template = (text, name) => text?.match(new RegExp(`\\{\\{${name}\\b([\\s\\S]*?)\\}\\}`, 'i'))?.[1] || null;
const clean = (value) => value?.replace(/<[^>]*>/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, '$1').replace(/'{2,}/g, '').replace(/\s+/g, ' ').trim() || null;

async function query(batch) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', redirects: '1',
    prop: 'revisions|info', rvprop: 'content', rvslots: 'main', inprop: 'url',
    titles: batch.map((item) => item.displayName).join('|'),
  });
  const payload = await (await fetch(`${API}?${params}`)).json();
  return Object.values(payload.query?.pages || {}).map((page) => ({
    pageId: page.pageid || null,
    title: page.title || null,
    missing: Boolean(page.missing),
    url: page.fullurl || null,
    source: page.revisions?.[0]?.slots?.main?.['*'] || null,
  }));
}

const results = [];
for (let start = 0; start < items.length; start += 25) {
  const batch = items.slice(start, start + 25);
  const pages = await query(batch);
  const byTitle = new Map(pages.filter((page) => page.title).map((page) => [page.title.toLowerCase(), page]));
  for (const item of batch) {
    const page = byTitle.get(item.displayName.toLowerCase());
    const source = page?.source || '';
    const skinbox = template(source, 'Skinbox');
    const component = template(source, 'Component');
    const pack = template(source, 'PackInfo');
    const acquisition = field(skinbox, 'Acquisition') || field(source.split(/^==\s*Acquisition\s*==/im)[0], 'Acquisition');
    const price = field(skinbox, 'Price');
    const type = clean(field(component, 'type'));
    const autoDrops = clean(field(component, 'autoDrops'));
    const evidence = [
      acquisition && `Template acquisition: ${clean(acquisition)}${price ? ` (${clean(price)})` : ''}`,
      (type || autoDrops) && `Component: ${[type, autoDrops && `auto-drops ${autoDrops}`].filter(Boolean).join('; ')}`,
      pack && `PackInfo: ${clean(pack)}`,
      /\\{\\{NotAvailable\\s*\\}\\}/i.test(source) && 'Wiki marks this item unavailable.',
    ].filter(Boolean);
    results.push({ ...item, pageId: page?.pageId || null, title: page?.title || null, missing: page ? !(Number(page.pageId) > 0) : true, url: page?.url || null, evidence });
  }
  process.stdout.write(`Audited ${Math.min(start + batch.length, items.length)}/${items.length}\\r`);
}

const output = resolve(ROOT, 'scripts/data-sources/wiki-source-template-audit.json');
writeFileSync(output, `${JSON.stringify({ generated: new Date().toISOString(), total: results.length, withEvidence: results.filter((item) => item.evidence.length), items: results }, null, 2)}\n`);
const report = ['# Wiki source-template acquisition audit', '', ...results.filter((item) => item.evidence.length).map((item) => '- **' + item.displayName + '** `' + item.uniqueName + '`: ' + item.evidence.join(' | ') + ' ([page](' + (item.url || '') + '))'), ''].join('\n');
writeFileSync(resolve(ROOT, 'scripts/data-sources/wiki-source-template-audit.md'), report);
console.log(`\nWrote ${output}`);
console.log(JSON.stringify({ total: results.length, withEvidence: results.filter((item) => item.evidence.length).length, missing: results.filter((item) => item.missing).length }));
