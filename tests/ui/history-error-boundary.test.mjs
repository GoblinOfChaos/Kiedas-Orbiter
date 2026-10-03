import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { renderToString } from 'react-dom/server'
import React from 'react'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const viteRequire = createRequire(createRequire(import.meta.url).resolve('vite'))
const { build } = viteRequire('esbuild')
const tauriStub = path.join(root, 'tests/ui/tauri-stub.mjs')

globalThis.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {}, location: { reload() {} } })
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', windowLabel: 'main' } } }

async function loadEntry(entryName, cacheName) {
  const entry = path.join(root, 'tests/ui', entryName)
  const result = await build({
    plugins: [{ name: 'vite-only-stubs', setup(buildApi) {
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
    } }],
    entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', packages: 'external',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.webp': 'empty', '.ttf': 'empty', '.woff2': 'empty' },
    define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' },
    alias: { '@tauri-apps/api/core': tauriStub },
  })
  const cacheDir = path.join(root, 'tests/.cache', cacheName)
  fs.mkdirSync(cacheDir, { recursive: true })
  const output = path.join(fs.mkdtempSync(path.join(cacheDir, 'run-')), 'entry.mjs')
  fs.writeFileSync(output, result.outputFiles[0].text)
  return import(pathToFileURL(output).href)
}

test('History CustomTooltip formats numeric payload values without throwing', async () => {
  const { CustomTooltip } = await loadEntry('history-entry.jsx', 'history-ui')
  const html = renderToString(React.createElement(CustomTooltip, {
    active: true,
    label: Date.UTC(2026, 0, 2),
    locale: 'de',
    payload: [{ dataKey: 'credit', value: 1234567 }],
    activeMetrics: ['credit'],
    trackedItems: [],
    t: (key) => key,
  }))
  assert.match(html, /1\.234\.567/)
  assert.doesNotMatch(html, /ReferenceError|locale/)
})

test('ErrorBoundary uses active translations and real English fallback text', async () => {
  const { ErrorBoundary, UiContext } = await loadEntry('error-boundary-entry.jsx', 'error-boundary-ui')
  const throwingChild = React.createElement('span', null, 'child')
  const instance = new ErrorBoundary({ children: throwingChild })
  instance.state = ErrorBoundary.getDerivedStateFromError(new Error('boom'))
  instance.context = { t: (key) => ({ 'error_boundary.title': 'Translated title', 'error_boundary.message': 'Translated message', 'error_boundary.reload': 'Translated reload' }[key] || key) }
  const withContext = renderToString(instance.render())
  void UiContext
  instance.context = null
  const withoutContext = renderToString(instance.render())
  assert.match(withContext, /Translated title/)
  assert.match(withContext, /Translated message/)
  assert.doesNotMatch(withContext, /error_boundary\./)
  assert.match(withoutContext, /Something went wrong/)
  assert.match(withoutContext, /An unexpected error occurred and the app couldn&#x27;t continue\./)
  assert.match(withoutContext, /Reload/)
  assert.doesNotMatch(withoutContext, /error_boundary\./)
})
