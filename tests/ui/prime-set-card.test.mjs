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
globalThis.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) })
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', currentWindow: { label: 'main' }, windowLabel: 'main' } } }
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
const entry = process.env.PRIME_SET_CARD_ENTRY
  ? path.resolve(process.env.PRIME_SET_CARD_ENTRY)
  : path.join(root, 'tests/ui/prime-set-card-entry.jsx')
const tauriStub = path.join(root, 'tests/ui/tauri-stub.mjs')

async function loadCard() {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.webp': 'empty', '.ttf': 'empty', '.woff2': 'empty' },
    define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' },
    packages: 'external',
    alias: { '@tauri-apps/api/core': tauriStub },
    plugins: [{ name: 'stub-vite-files', setup(buildApi) {
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
    } }],
  })
  const cacheDir = path.join(root, 'tests/.cache/prime-set-card-ssr')
  fs.mkdirSync(cacheDir, { recursive: true })
  const file = path.join(fs.mkdtempSync(path.join(cacheDir, 'run-')), 'card.mjs')
  fs.writeFileSync(file, result.outputFiles[0].text)
  return import(pathToFileURL(file).href)
}

const t = (key) => key
const set = {
  name: 'Ballistica Prime', owned: false, mastered: false, parts: [
    { name: 'Ballistica Prime Upper Limb', unique_name: '/upper', image: '/upper.png', quantity: 0, need: 2 },
    { name: 'Ballistica Prime Lower Limb', unique_name: '/lower', image: '/lower.png', quantity: 0, need: 1 },
  ],
}

function makePart(name, index, extra = {}) {
  return { name, unique_name: `/part-${index}`, image: `/part-${index}.png`, quantity: 0, need: 1, ...extra }
}

function renderCard(PrimeSetCard, UiContext, cardSet, dropIndex = {}) {
  return renderToString(React.createElement(UiContext.Provider, {
    value: { t, ui: {}, locale: 'en', ready: true, i18nData: null },
  }, React.createElement(PrimeSetCard, {
    set: cardSet, primePrices: {}, isPriceLoading: false, dropIndex, uiPath: '',
    resolveImgFallback: null, toggle: () => {}, t,
  })))
}

test('SSR centers a needed-part badge above its image and omits it for need one', async () => {
  const { PrimeSetCard, UiContext } = await loadCard()
  const html = renderCard(PrimeSetCard, UiContext, set)

  assert.match(html, /×(?:<!-- -->)?2/)
  assert.match(html, /justify-center/)
  assert.doesNotMatch(html, /top-1 left-1/)
  assert.match(html, /Upper Limb/)
  assert.match(html, /Lower Limb/)
  assert.equal((html.match(/×1/g) ?? []).length, 0)
  assert.doesNotMatch(html, /truncate/)
})

test('SSR keeps five and six part grids shrink-safe and wraps at the cell minimum', async () => {
  const { PrimeSetCard, UiContext } = await loadCard()
  const fivePartSet = {
    name: 'Paris Prime', owned: false, mastered: false, parts: [
      makePart('Paris Prime Blueprint', 1),
      makePart('Paris Prime Lower Limb', 2),
      makePart('Paris Prime Upper Limb', 3),
      makePart('Paris Prime Grip', 4),
      makePart('Paris Prime String', 5),
    ],
  }
  const sixPartSet = {
    name: 'Synthetic Six Prime', owned: false, mastered: false, parts: [
      makePart('Synthetic Six Prime Blueprint', 6),
      makePart('Synthetic Six Prime Lower Limb', 7),
      makePart('Synthetic Six Prime Upper Limb', 8),
      makePart('Synthetic Six Prime Grip', 9),
      makePart('Synthetic Six Prime String', 10),
      makePart('Synthetic Six Prime Receiver', 11),
    ],
  }
  const source = [{ type: 'relic', relicName: 'Lith', rarity: 'common' }]
  const sourceIndex = { '/part-1': source, '/part-6': source }

  for (const cardSet of [fivePartSet, sixPartSet]) {
    const html = renderCard(PrimeSetCard, UiContext, cardSet, sourceIndex)
    assert.match(html, /repeat\(auto-fit, minmax\(min\(64px, 100%\), 1fr\)\)/)
    assert.doesNotMatch(html, /repeat\(\d+,\s*1fr\)/)
    assert.match(html, /min-w-0[^\"]*break-words/)
    assert.match(html, /p-1\.5/)
    assert.match(html, /max-w-full[^\"]*object-contain/)
    assert.match(html, /Upper Limb/)
    assert.match(html, /Sources|ui\.inventory\.sources/)
  }
})
