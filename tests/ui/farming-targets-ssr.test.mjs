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
import { catalogTarget } from '../helpers/real-data-fixtures.mjs'

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
  const cacheDir = path.join(root, 'tests/.cache/farming-ui-ssr')
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

test('SSR keeps an owned target inspector populated and renders the count-owned switch', async () => {
  const { PreviewFarmingView, UiContext } = await loadScreen()
  const targets = [{ id: 'owned-x', uniqueName: 'OWNED_X', name: 'Owned X', quantity: 1 }]
  const inventoryData = {
    all: [{ unique_name: 'OWNED_X', name: 'Owned X', quantity: 1 }, { unique_name: 'OWNED_RAW', name: 'Owned Raw', quantity: 2 }],
    craftable: [{ resultType: 'OWNED_X', uniqueName: 'OWNED_X_BLUEPRINT', bpName: 'Owned X Blueprint', ingredients: [{ itemType: 'OWNED_RAW', name: 'Owned Raw', need: 2 }] }],
  }
  const model = buildFarmingTargetsScreenModel({ targets, inventoryData, dropIndex: { OWNED_RAW: [{ type: 'mission', nodeName: 'Owned Node', chance: 0.5 }] } })
  const html = renderToString(React.createElement(UiContext.Provider, { value: { t, ui: {}, locale: 'en', ready: true, i18nData: null } }, React.createElement(PreviewFarmingView, {
    targets, reservations: [], model, t, selectedTarget: targets[0].id, setSelectedTarget: noOp,
    tab: 'all', setTab: noOp, minChanceOn: false, setMinChanceOn: noOp, minChancePct: '5', setMinChancePct: noOp,
    hideDone: true, setHideDone: noOp, hideConclave: false, setHideConclave: noOp, groupPlanet: false, setGroupPlanet: noOp,
    toggle: noOp, onRemoveTarget: noOp, onQuantityChange: noOp, onTargetChange: noOp, onReserve: noOp,
  })))
  assert.match(html, /Owned Raw/)
  assert.match(html, /farming_targets\.count_owned/)
  assert.doesNotMatch(html, /farming_targets\.inspector_resolved/)
})

test('SSR keeps the minimum-chance toggle wrapper separate from its conditional note', async () => {
  const { PreviewFarmingView, UiContext } = await loadScreen()
  const { targets, model } = fixtureUiModel()
  const render = (minChanceOn) => renderToString(React.createElement(UiContext.Provider, { value: { t, ui: {}, locale: 'en', ready: true, i18nData: null } }, React.createElement(PreviewFarmingView, {
    targets, reservations: [], model, t, selectedTarget: targets[0].id, setSelectedTarget: noOp,
    tab: 'all', setTab: noOp, minChanceOn, setMinChanceOn: noOp, minChancePct: '5', setMinChancePct: noOp,
    hideDone: false, setHideDone: noOp, hideConclave: false, setHideConclave: noOp, faction: '', setFaction: noOp,
    groupPlanet: false, setGroupPlanet: noOp, toggle: noOp, onRemoveTarget: noOp, onQuantityChange: noOp,
    onTargetChange: noOp, onReserve: noOp,
  })))
  const off = render(false)
  const on = render(true)
  const toggleWrapper = '<div class="shrink-0"><button'
  assert.equal((off.match(new RegExp(toggleWrapper, 'g')) ?? []).length >= 1, true)
  assert.equal((on.match(new RegExp(toggleWrapper, 'g')) ?? []).length >= 1, true)
  assert.match(on, /farming_targets\.min_chance_hidden/)
  assert.doesNotMatch(off, /farming_targets\.min_chance_hidden/)
  assert.match(on, /<div class="shrink-0"><button[\s\S]*?<\/div><div class="flex items-center gap-2 text-xs text-kronos-dim">[\s\S]*?farming_targets\.min_chance_hidden/)
})

test('SSR shows the planet for ungrouped ranked places and leaves the inspector dropdown unclipped', async () => {
  const { PreviewFarmingView, UiContext } = await loadScreen()
  const { targets, model } = fixtureUiModel()
  model.ranked[0].place.planet = 'Mars'
  const html = renderToString(React.createElement(UiContext.Provider, { value: { t, ui: {}, locale: 'en', ready: true, i18nData: null } }, React.createElement(PreviewFarmingView, {
    targets, reservations: [], model, t, selectedTarget: targets[0].id, setSelectedTarget: noOp,
    tab: 'all', setTab: noOp, minChanceOn: false, setMinChanceOn: noOp, minChancePct: '5', setMinChancePct: noOp,
    hideDone: false, setHideDone: noOp, hideConclave: false, setHideConclave: noOp, groupPlanet: false, setGroupPlanet: noOp,
    toggle: noOp, onRemoveTarget: noOp, onQuantityChange: noOp, onTargetChange: noOp, onReserve: noOp,
  })))
  assert.match(html, /Mars — (Tuvul Commons|Everview Arc|Oro Works)/)
  const inspector = html.slice(html.indexOf('farming_targets.target_inspector'))
  assert.match(inspector, /p-0/)
  assert.doesNotMatch(inspector.slice(0, inspector.indexOf('farming_targets.ledger')), /p-0 overflow-hidden/)
  assert.match(inspector, /rounded-b-lg overflow-hidden/)
})

test('SSR groups ranked places by planet and keeps node names underneath', async () => {
  const { PreviewFarmingView, UiContext } = await loadScreen()
  const { targets, model } = fixtureUiModel()
  const groupedModel = {
    ...model,
    ranked: model.ranked.map((row, index) => ({
      ...row,
      place: { ...row.place, planet: index < 2 ? 'Mars' : 'Earth', name: `Node ${index + 1}` },
    })),
  }
  const render = (groupPlanet) => renderToString(React.createElement(UiContext.Provider, { value: { t, ui: {}, locale: 'en', ready: true, i18nData: null } }, React.createElement(PreviewFarmingView, {
    targets, reservations: [], model: groupedModel, t, selectedTarget: targets[0].id, setSelectedTarget: noOp,
    tab: 'all', setTab: noOp, minChanceOn: false, setMinChanceOn: noOp, minChancePct: '5', setMinChancePct: noOp,
    hideDone: false, setHideDone: noOp, hideConclave: false, setHideConclave: noOp, groupPlanet, setGroupPlanet: noOp,
    toggle: noOp, onRemoveTarget: noOp, onQuantityChange: noOp, onTargetChange: noOp, onReserve: noOp,
  })))

  const grouped = render(true)
  assert.equal((grouped.match(/<strong class="text-sm">Mars<\/strong>/g) ?? []).length, 1)
  assert.equal((grouped.match(/<strong class="text-sm">Earth<\/strong>/g) ?? []).length, 1)
  assert.match(grouped, /Node 1/)
  assert.match(grouped, /Node 2/)
  assert.match(grouped, /Node 3/)
  assert.match(grouped, /farming_targets\.node_count/)

  const ungrouped = render(false)
  assert.match(ungrouped, /Mars — Node 1/)
  assert.match(ungrouped, /Mars — Node 2/)
  assert.match(ungrouped, /Earth — Node 3/)
})

test('SSR collapses a place with more than six item chips behind a plus count', async () => {
  const { PreviewFarmingView, UiContext } = await loadScreen()
  const { targets, model } = fixtureUiModel()
  const sourceItems = Array.from({ length: 7 }, (_, index) => ({ itemType: `item-${index}`, name: `Item ${index}`, chance: 0.1 }))
  const chipModel = { ...model, ranked: [{ ...model.ranked[0], coveredItems: sourceItems }] }
  const html = renderToString(React.createElement(UiContext.Provider, { value: { t, ui: {}, locale: 'en', ready: true, i18nData: null } }, React.createElement(PreviewFarmingView, {
    targets, reservations: [], model: chipModel, t, selectedTarget: targets[0].id, setSelectedTarget: noOp,
    tab: 'all', setTab: noOp, minChanceOn: false, setMinChanceOn: noOp, minChancePct: '5', setMinChancePct: noOp,
    hideDone: false, setHideDone: noOp, hideConclave: false, setHideConclave: noOp, groupPlanet: false, setGroupPlanet: noOp,
    toggle: noOp, onRemoveTarget: noOp, onQuantityChange: noOp, onTargetChange: noOp, onReserve: noOp,
  })));
  assert.match(html, />\+1<\/button>/)
  assert.doesNotMatch(html, /Item 6/)
})

test('screen model stays under 100ms for 80 targets with an indexed place set', () => {
  const base = fixtureUiModel()
  const targets = Array.from({ length: 80 }, (_, index) => ({ ...base.targets[index % 3], id: `target-${index}` }))
  const start = performance.now()
  buildFarmingTargetsScreenModel({ targets, inventoryData: base.inventoryData, dropIndex: base.model.placeIndex ? {} : undefined, placeIndex: base.model.placeIndex })
  assert.ok(performance.now() - start < 100)
})

test('SSR pages a catalog-derived farming fixture at forty places and offers show more', async () => {
  const { loadRealHarness } = await import('../../scripts/lib/real-data-harness.mjs');
  const { parseInventory } = await import('../../src/lib/inventoryParser.js');
  const { buildDropIndex } = await import('../../src/lib/dropsParser.js');
  const harness = await loadRealHarness({ locale: 'en' });
  const targetNames = [
    'Orokin Cell', 'Alloy Plate', 'Ferrite', 'Rubedo', 'Neurodes', 'Gallium', 'Salvage',
    'Control Module', 'Nano Spores', 'Morphics', 'Argon Crystal', 'Tellurium', 'Kuva',
    'Cryotic', 'Oxium', 'Fieldron', 'Detonite Injector', 'Mutagen Mass', 'Neural Sensors',
    'Plastids', 'Polymer Bundle', 'Circuits', 'Scrap', 'Entrati Obols', 'Voidgel Orb', 'Isos', 'Stela',
  ];
  const targets = targetNames.map((name, index) => catalogTarget(harness.exportsBundle, harness.uniqueNameToName, name, `catalog-${index}`));
  const inventoryData = parseInventory({}, harness.exportsBundle, harness.dict, 'en', null);
  const model = buildFarmingTargetsScreenModel({
    targets,
    reservations: [],
    inventoryData,
    exportData: harness.exportsBundle,
    dropIndex: buildDropIndex(harness.exportsBundle),
    imageMaps: { EI: harness.EI, nameToImage: harness.nameToImage, uniqueNameToName: harness.uniqueNameToName },
  });
  assert.ok(model.ranked.length > 40, `expected more than 40 ranked places, got ${model.ranked.length}`);
  const { PreviewFarmingView, UiContext } = await loadScreen();
  const html = renderToString(React.createElement(UiContext.Provider, { value: { t, ui: {}, locale: 'en', ready: true, i18nData: null } }, React.createElement(PreviewFarmingView, {
    targets, reservations: [], model, t, selectedTarget: targets[0]?.id, setSelectedTarget: noOp,
    tab: 'all', setTab: noOp, minChanceOn: false, setMinChanceOn: noOp, minChancePct: '5', setMinChancePct: noOp,
    hideDone: false, setHideDone: noOp, hideConclave: true, setHideConclave: noOp, groupPlanet: false, setGroupPlanet: noOp,
    toggle: noOp, onRemoveTarget: noOp, onQuantityChange: noOp, onTargetChange: noOp, onReserve: noOp,
  })));
  assert.ok((html.match(/data-farming-place-row/g) ?? []).length <= 40);
  assert.match(html, /farming_targets\.show_more/);
});
