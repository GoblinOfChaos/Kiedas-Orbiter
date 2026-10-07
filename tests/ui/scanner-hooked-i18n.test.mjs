import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const viteRequire = createRequire(createRequire(import.meta.url).resolve('vite'));
const { build } = viteRequire('esbuild');

async function loadBuildScannerHookedNotification() {
  const result = await build({
    entryPoints: [path.join(root, 'src/lib/scannerNotification.js')],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    plugins: [{ name: 'stub-i18n-glob', setup(buildApi) {
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({
        contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'),
        loader: 'js',
      }));
    } }],
  });
  const output = path.join(root, 'tests/.cache/scanner-hooked-i18n.mjs');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, result.outputFiles[0].text);
  return (await import(`${pathToFileURL(output).href}?${Date.now()}`)).buildScannerHookedNotification;
}

test('scanner notification never exposes untranslated keys before locale data loads', async () => {
  const buildScannerHookedNotification = await loadBuildScannerHookedNotification();
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
