import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const scope = JSON.parse(fs.readFileSync(path.join(root, 'docs/agent-context/briefs-2026-10-03/data/zero-resources.json'), 'utf8'));
const resolved = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/data/assets/data/verified-routes.resources.json'), 'utf8'));
const unresolved = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/data/assets/data/verified-routes.resources.unresolved.json'), 'utf8'));
const expected = new Map(scope.map((item) => [item.uniqueName, item.name]));

const history = /(?:\b\d{4}\b|\bUpdate\s+\d+\b|originally|formerly|first available|previously|returned)/i;

test('verified resources routes cover the scope exactly once', () => {
  assert.equal(scope.length, 389);
  assert.equal(expected.size, scope.length);
  assert.deepEqual(new Set([...Object.keys(resolved), ...Object.keys(unresolved)]), new Set(expected.keys()));
  assert.equal(Object.keys(resolved).filter((key) => key in unresolved).length, 0);
});

test('resolved resources routes have structured current text and source proof', () => {
  for (const [uniqueName, entry] of Object.entries(resolved)) {
    assert.equal(entry.name, expected.get(uniqueName));
    assert.ok(Array.isArray(entry.routes) && entry.routes.length > 0);
    for (const route of entry.routes) {
      assert.ok(['drop', 'vendor', 'market', 'quest', 'event', 'crafting', 'reward', 'not_obtainable'].includes(route.kind));
      assert.ok(typeof route.text === 'string' && route.text.length > 0 && route.text.length <= 200);
      assert.equal(history.test(route.text), false, `${uniqueName}: ${route.text}`);
      assert.equal(/[=|{}]/.test(route.text), false, `${uniqueName}: template residue`);
      assert.ok(route.place);
      assert.equal(route.source.archive, 'wiki_pdf_archive');
      assert.equal(route.source.url, `https://wiki.warframe.com/w/${route.source.page.replaceAll(' ', '_')}`);
      assert.ok(route.source.quote);
      if (route.price) {
        assert.equal(typeof route.price.amount, 'number');
        assert.ok(route.price.currency);
      }
      if (route.chance !== undefined) assert.equal(typeof route.chance, 'number');
    }
  }
});

test('unresolved resources entries explain the checked evidence', () => {
  for (const [uniqueName, entry] of Object.entries(unresolved)) {
    assert.equal(entry.name, expected.get(uniqueName));
    assert.ok(entry.reason);
    assert.ok(Array.isArray(entry.pagesChecked) && entry.pagesChecked.length > 0);
  }
});

test('archive-backed Python verifier passes when the archive is available', { skip: !fs.existsSync('/home/jedwards/kiedas-orbiter/wiki_pdf_archive') }, () => {
  const result = spawnSync('python3', ['scripts/verify-verified-routes.py', '--group', 'resources'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
