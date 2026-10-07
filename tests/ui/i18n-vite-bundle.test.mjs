import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tempRoot = process.env.TMPDIR || os.tmpdir();

test('Vite bundle loads English and German UI locale data', async (t) => {
  assert.notEqual(tempRoot, '/tmp', 'TMPDIR must be disk-backed, not /tmp');
  const outDir = fs.mkdtempSync(path.join(tempRoot, 'kiedas-i18n-vite-'));
  t.after(() => fs.rmSync(outDir, { recursive: true, force: true }));

  await build({
    configFile: false,
    mode: 'preview',
    logLevel: 'error',
    build: {
      lib: {
        entry: path.join(root, 'src/lib/i18n.js'),
        formats: ['es'],
        fileName: () => 'i18n.mjs',
      },
      outDir,
      emptyOutDir: true,
      minify: false,
      target: 'es2022',
    },
  });

  const { loadLocale } = await import(`${pathToFileURL(path.join(outDir, 'i18n.mjs')).href}?${Date.now()}`);
  const en = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/i18n/en.json'), 'utf8'));
  const de = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/i18n/de.json'), 'utf8'));
  assert.equal((await loadLocale('en')).ui['nav.inventory'], en.ui['nav.inventory']);
  assert.equal((await loadLocale('de')).ui['nav.inventory'], de.ui['nav.inventory']);
});
