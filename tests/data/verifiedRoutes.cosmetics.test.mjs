import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scope = JSON.parse(fs.readFileSync(path.join(root, 'docs/agent-context/briefs-2026-10-03/data/zero-cosmetics.json')));
const routes = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/data/assets/data/verified-routes.cosmetics.json')));
const unresolved = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/data/assets/data/verified-routes.cosmetics.unresolved.json')));
const scopeByKey = new Map(scope.map((entry) => [entry.uniqueName, entry]));
const allowedKinds = new Set(['drop', 'vendor', 'market', 'quest', 'event', 'crafting', 'reward', 'not_obtainable']);
const history = /\b(?:originally|formerly|first available|returned|previously)\b|\bupdate\s+\d+\b|\b(?:19|20)\d{2}\b/i;
const notObtainableProof = /\b(?:not obtainable|no longer|no way to obtain|unavailable|discontinued|retired|previously obtainable|remain exclusive)\b/i;

test('cosmetics outputs cover each scope entry exactly once', () => {
  const routeKeys = new Set(Object.keys(routes));
  const unresolvedKeys = new Set(Object.keys(unresolved));
  const overlap = [...routeKeys].filter((key) => unresolvedKeys.has(key));
  const actual = new Set([...routeKeys, ...unresolvedKeys]);
  const missing = [...scopeByKey.keys()].filter((key) => !actual.has(key));
  const extra = [...actual].filter((key) => !scopeByKey.has(key));
  assert.equal(overlap.length + missing.length + extra.length, 0, `scope mismatch: overlap=${overlap.slice(0, 25).join(', ')} missing=${missing.slice(0, 25).join(', ')} extra=${extra.slice(0, 25).join(', ')}`);
});

test('cosmetics route schema has current, short text and archive evidence', () => {
  for (const [key, entry] of Object.entries(routes)) {
    assert.equal(entry.name, scopeByKey.get(key).name);
    assert.ok(Array.isArray(entry.routes) && entry.routes.length > 0);
    for (const route of entry.routes) {
      assert.ok(allowedKinds.has(route.kind));
      assert.ok(typeof route.text === 'string' && route.text.length > 0 && route.text.length <= 200);
      assert.equal(history.test(route.text), false, `${entry.name}: ${route.text}`);
      assert.equal(route.text.includes('='), false);
      assert.equal(route.text.includes('{{'), false);
      assert.equal(route.text.includes('|'), false);
      assert.ok(typeof route.place === 'string' && route.place.length > 0);
      assert.equal(route.source.archive, 'wiki_pdf_archive');
      assert.ok(typeof route.source.page === 'string' && route.source.page.length > 0);
      assert.ok(typeof route.source.quote === 'string' && route.source.quote.length > 0);
      if (route.kind === 'not_obtainable') assert.ok(notObtainableProof.test(route.source.quote) || /^Nightwave\//i.test(route.source.page), `${key}: unproven not_obtainable route`);
      assert.ok(Array.isArray(entry.routes));
    }
  }
  for (const [key, entry] of Object.entries(unresolved)) {
    assert.equal(entry.name, scopeByKey.get(key).name);
    assert.ok(typeof entry.reason === 'string' && entry.reason.length > 0);
    assert.ok(Array.isArray(entry.pagesChecked));
  }
});

test('Python verifier confirms citations against the local wiki archive', { timeout: 120_000 }, (t) => {
  const archive = '/home/jedwards/kiedas-orbiter/wiki_pdf_archive/_titles.json';
  if (!fs.existsSync(archive)) {
    t.skip('local wiki archive is not present');
    return;
  }
  execFileSync('python3', ['scripts/verify-verified-routes.py', '--group', 'cosmetics'], { cwd: root, stdio: 'inherit' });
});
