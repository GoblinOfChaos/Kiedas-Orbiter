import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { renderToString } from 'react-dom/server'
import React from 'react'
import { fixtureUiModel } from './helpers.mjs'
import { buildFarmingTargetsScreenModel } from '../../src/lib/farmingTargets/screenModel.js'

// esbuild is only a dependency of vite under pnpm: resolve it from vite's own location.
const viteRequire = createRequire(createRequire(import.meta.url).resolve('vite'))
const { build } = viteRequire('esbuild')
// Minimal browser globals: some modules touch window/localStorage asynchronously after import.
globalThis.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) })
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', windowLabel: 'main' } } }
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const entry = path.join(root, 'tests/ui/farming-targets-entry.jsx')
const tauriStub = path.join(root, 'tests/ui/tauri-stub.mjs')

async function loadScreen() {
  // vite-only import forms (?worker) are stubbed: the SSR test renders the view component, not the worker.
  const viteOnlyStubs = { name: 'vite-only-stubs', setup(b) {
    b.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'vite-stub' }))
    b.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
    // import.meta.glob is a vite compile-time feature: the locale loaders are not needed to render one view.
    b.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
  } }
  const result = await build({ plugins: [viteOnlyStubs], entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.webp': 'empty', '.ttf': 'empty', '.woff2': 'empty' }, define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' }, packages: 'external', alias: { '@tauri-apps/api/core': tauriStub } })
  // Written inside the repo (not /tmp) so the bundle can resolve 'react' and 'react-dom/server' from node_modules.
  const cacheDir = path.join(root, 'node_modules/.cache/farming-ui-ssr')
  fs.mkdirSync(cacheDir, { recursive: true })
  const file = path.join(fs.mkdtempSync(path.join(cacheDir, 'run-')), 'screen.mjs')
  fs.writeFileSync(file, result.outputFiles[0].text)
  return import(pathToFileURL(file).href)
}

const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), key)
const noOp = () => {}

test('SSR shows readable target options, blueprint rows, real mission labels, and chance input', async () => {
  const { PreviewFarmingView, UiContext } = await loadScreen()
  const { targets, model } = fixtureUiModel()
  const view = React.createElement(PreviewFarmingView, {
    targets, reservations: [], model, t, selectedTarget: targets[0].id, setSelectedTarget: noOp,
    tab: 'all', setTab: noOp, minChanceOn: false, setMinChanceOn: noOp, minChancePct: '5', setMinChancePct: noOp,
    hideDone: false, setHideDone: noOp, missionType: '', setMissionType: noOp, faction: '', setFaction: noOp,
    groupPlanet: false, setGroupPlanet: noOp, compactView: 'compact', setCompactView: noOp, toggle: noOp,
    onRemoveTarget: noOp, onQuantityChange: noOp, onTargetChange: noOp, onReserve: noOp,
  })
  const html = renderToString(React.createElement(UiContext.Provider, { value: { t, ui: {}, locale: 'en', ready: true, i18nData: null } }, view))
  assert.match(html, /Narin Neuroptics Blueprint/)
  assert.match(html, /Narin Chassis Blueprint/)
  assert.match(html, /Tuvul Commons|Everview Arc|Oro Works/)
  assert.doesNotMatch(html, /MT_/)
  assert.doesNotMatch(html, /Unknown source|drops\.wf|browse\.wf/)
  assert.match(html, /Minimum chance|farming_targets\.min_chance/)
  assert.match(html, /Narin Neuroptics/)
})

test('screen model stays under 100ms for 80 targets with an indexed place set', () => {
  const base = fixtureUiModel()
  const targets = Array.from({ length: 80 }, (_, index) => ({ ...base.targets[index % 3], id: `target-${index}` }))
  const start = performance.now()
  buildFarmingTargetsScreenModel({ targets, inventoryData: base.inventoryData, dropIndex: base.model.placeIndex ? {} : undefined, placeIndex: base.model.placeIndex })
  assert.ok(performance.now() - start < 100)
})
