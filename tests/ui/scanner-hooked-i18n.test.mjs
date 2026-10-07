import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScannerHookedNotification } from '../../src/lib/scannerNotification.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('scanner notification never exposes untranslated keys before locale data loads', () => {
  const notification = buildScannerHookedNotification((key) => key);
  assert.deepEqual(
    [notification.title, notification.message],
    ['Scanner', 'Log scanner hooked into Warframe'],
  );
});

test('scanner listener defers a pre-ready event and delivers it exactly once after locale readiness', () => {
  const source = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
  const listener = source.slice(source.indexOf("listen('scanner-hooked'"), source.indexOf('// Toggle .sidebar-mode'));
  assert.match(listener, /if \(!scannerReadyRef\.current\)/);
  assert.match(listener, /scannerHookedPendingRef\.current = true/);
  assert.match(source, /if \(!ready \|\| !scannerHookedPendingRef\.current\) return/);
  assert.match(source, /scannerHookedPendingRef\.current = false/);
});
