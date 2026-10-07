import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { buildBlueprintAcquisitionRows, buildRelicRarityIndex } from '../../src/lib/relicSources.js'
import { sourceLabel } from '../../src/lib/sourceLabel.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const TEMP_ROOT = fs.mkdtempSync(path.join(process.env.TMPDIR, 'kiedas-p55-'))
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(TEMP_ROOT, 'node_modules'), 'dir')
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/i18n/en.json'), 'utf8'))
const t = (key, values = {}) => Object.entries(values)
  .reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), en.ui?.[key] || key)

globalThis.window ??= Object.assign(globalThis, { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) })
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', currentWindow: { label: 'main' } } } }
globalThis.window.__TAURI_INTERNALS__ = globalThis.__TAURI_INTERNALS__

let drawerModulePromise
async function loadDrawer() {
  if (drawerModulePromise) return drawerModulePromise
  const viteRequire = createRequire(import.meta.url).resolve('vite')
  const { build } = createRequire(viteRequire)('esbuild')
  const entry = path.join(ROOT, 'tests/ui/p42-drawer-entry.jsx')
  drawerModulePromise = build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    packages: 'external',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.webp': 'empty', '.ttf': 'empty', '.woff2': 'empty' },
    define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' },
    plugins: [{ name: 'p55-stubs', setup(buildApi) {
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'p55-vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'p55-vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
      buildApi.onResolve({ filter: /acquisitionData(?:\.js)?$/ }, () => ({ path: 'p55-acquisition-data', namespace: 'p55-acquisition-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'p55-acquisition-stub' }, () => ({ contents: `
        export function getItemDrops(key) { return globalThis.__P55_ITEM_DROPS__?.[key] || null }
        export function getItemRecipe() { return null }
        export function getWikiLink() { return null }
        export function isCraftable() { return false }
        export const WARFRAME_ACQUISITIONS = {}
        export function resolveBlueprintOrigin(name) { return globalThis.__P55_BLUEPRINT_ORIGINS__?.[name] || null }
      `, loader: 'js' }))
      buildApi.onResolve({ filter: /MonitoringContext(?:\.jsx)?$/ }, () => ({ path: 'p55-monitoring-context', namespace: 'p55-monitoring-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'p55-monitoring-stub' }, () => ({ contents: `
        import { createContext, useContext } from 'react'
        export const MonitoringContext = createContext(null)
        export const useMonitoring = () => useContext(MonitoringContext)
      `, loader: 'js', resolveDir: ROOT }))
    } }],
  }).then(async (result) => {
    const file = path.join(TEMP_ROOT, 'drawer.mjs')
    fs.writeFileSync(file, result.outputFiles[0].text)
    return import(`${pathToFileURL(file).href}?${Date.now()}`)
  })
  return drawerModulePromise
}

let originResolverPromise
async function loadOriginResolver() {
  if (originResolverPromise) return originResolverPromise
  const viteRequire = createRequire(import.meta.url).resolve('vite')
  const { build } = createRequire(viteRequire)('esbuild')
  originResolverPromise = build({
    entryPoints: [path.join(ROOT, 'src/lib/acquisitionData.js')],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    define: { 'import.meta.env.MODE': '"test"', 'import.meta.env': '{}' },
    plugins: [{ name: 'p55-tauri-stub', setup(buildApi) {
      buildApi.onResolve({ filter: /logging[\\/]tauri(?:\\.js)?$/ }, () => ({ path: 'p55-tauri', namespace: 'p55-tauri' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'p55-tauri' }, () => ({ contents: 'export const invoke = async () => null; export const convertFileSrc = (value) => value', loader: 'js' }))
    } }],
  }).then(async (result) => {
    const file = path.join(TEMP_ROOT, 'acquisition-data.mjs')
    fs.writeFileSync(file, result.outputFiles[0].text)
    return import(pathToFileURL(file).href)
  })
  return originResolverPromise
}

let contextPromise
async function realContext() {
  if (contextPromise) return contextPromise
  contextPromise = (async () => {
    const harness = await loadRealHarness({ locale: 'en' })
    const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
    const indexes = await buildAllAcquisitionIndexes(harness.exportsBundle)
    const dropIndex = buildDropIndex(harness.exportsBundle)
    const { resolveBlueprintOrigin } = await loadOriginResolver()
    const overrides = JSON.parse(fs.readFileSync(path.join(ROOT, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'))
    const acquisition = (uniqueName, displayName) => getAcquisitionInfo(
      uniqueName, displayName, dropIndex, overrides,
      indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
      indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
      indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
      indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
      indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
      indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
    )
    return { harness, dropIndex, acquisition, resolveBlueprintOrigin }
  })()
  return contextPromise
}

function findItem(harness, name) {
  const item = harness.exportsBundle.AcquisitionItems.find((entry) => entry.name === name)
  assert.ok(item?.uniqueName, `${name} must be present in the real acquisition bundle`)
  return item
}

async function renderItem(context, name) {
  const { PreviewAcquisitionDrawer, UiContext, MonitoringContext } = await loadDrawer()
  const item = findItem(context.harness, name)
  const info = context.acquisition(item.uniqueName, name)
  const blueprint = item.components?.find((component) => /^Blueprint$/i.test(component.name || ''))
  globalThis.__P55_ITEM_DROPS__ = { [blueprint?.uniqueName]: blueprint?.drops?.map((drop) => ({ type: 'drop', location: drop.location, dropType: drop.type, chance: drop.chance, rarity: drop.rarity })) }
  globalThis.__P55_BLUEPRINT_ORIGINS__ = { [name]: context.resolveBlueprintOrigin(name, info.recipe) }
  const value = React.createElement(MonitoringContext.Provider, { value: { dropIndex: context.dropIndex, exportData: context.harness.exportsBundle } },
    React.createElement(UiContext.Provider, { value: { t, ui: en, locale: 'en', ready: true, i18nData: en } },
      React.createElement(PreviewAcquisitionDrawer, { item: { uniqueName: item.uniqueName, displayName: name, image: null, info }, onClose: () => {} })))
  return { html: renderToString(value), info, item }
}

test('P55 Preview blueprint boxes are uniform for Prime and non-Prime items', { skip: !haveRealData }, async () => {
  const context = await realContext()
  const counts = {}
  for (const name of ['Braton Prime', 'Nyx Prime', 'Ash Prime', 'Korumm', 'Nepheri', 'Verdilac', 'Quartakk', 'Stubba', 'Nikana', 'Soma', 'Atlas', 'Chroma', 'Gara', 'Inaros', 'Octavia', 'Carrier']) {
    const { html, info } = await renderItem(context, name)
    assert.ok(info.recipe, `${name} must have a recipe`)
    assert.match(html, new RegExp(`1x\\s*(?:<!-- -->\\s*)?${name} Blueprint`), `${name} must use the item-specific blueprint heading`)
    assert.match(html, /data-blueprint-box="true"/, `${name} must render a blueprint box`)
    assert.match(html, /data-blueprint-source-row="true"/, `${name} must use the shared source-row markup`)
    const rowClasses = [...html.matchAll(/class="([^"]+)" data-blueprint-source-row="true"/g)].map((match) => match[1])
    assert.ok(rowClasses.length > 0, `${name} must render blueprint source rows`)
    assert.equal(new Set(rowClasses).size, 1, `${name} must use one row class for every blueprint source`)
    counts[name] = (html.match(/data-blueprint-source-row="true"/g) || []).length
  }
  console.log(`P55 named blueprint rows: ${Object.keys(counts).length} items; Korumm=${counts.Korumm}; Braton Prime=${counts['Braton Prime']}`)

  const korumm = await renderItem(context, 'Korumm')
  assert.match(korumm.html, /Blueprint purchasable from Market for \d+ Platinum/)
  assert.match(korumm.html, /Cetus|Orb Vallis/)
  assert.match(korumm.html, /7\.5%|5\.45%/)
  assert.equal((korumm.html.match(/data-blueprint-source-row="true"/g) || []).length, 5, 'Korumm must show the origin and four bounty rows')

  const quartakk = await renderItem(context, 'Quartakk')
  assert.match(quartakk.html, /Blueprint purchasable from Market for \d+ Platinum/)
  assert.match(quartakk.html, /Ghoul Auger Alpha/)
  assert.match(quartakk.html, /Cetus|Ghoul/)
})

test('P55 whole catalog uses one bounded blueprint-row path without duplicate rows', { skip: !haveRealData }, async () => {
  const context = await realContext()
  const rarityIndex = buildRelicRarityIndex(context.harness.exportsBundle)
  const stats = { recipes: 0, prime: 0, nonPrime: 0, gainedRows: 0, unavailable: 0 }
  const unavailableNames = []
  const largest = []
  for (const item of context.harness.exportsBundle.AcquisitionItems || []) {
    const blueprint = item.components?.find((component) => /^Blueprint$/i.test(component.name || ''))
    if (!item.uniqueName || !blueprint || !item.components?.some((component) => !/^Blueprint$/i.test(component.name || ''))) continue
    const info = context.acquisition(item.uniqueName, item.name)
    if (!info.recipe?.blueprintUniqueName) continue
    stats.recipes += 1
    const prime = /\bPrime\b/i.test(item.name || '')
    stats[prime ? 'prime' : 'nonPrime'] += 1
    const origin = context.resolveBlueprintOrigin(item.name, info.recipe)
    const rows = buildBlueprintAcquisitionRows(item.name, info.recipe, context.dropIndex, blueprint.drops || [], rarityIndex, origin, info.sources)
    if (rows.length === 0) {
      stats.unavailable += 1
      if (unavailableNames.length < 5) unavailableNames.push(item.name)
      continue
    }
    const expanded = rows.flatMap((row) => row?.type?.endsWith('-group') ? row.sources : [row])
    const identities = expanded.map((row) => `${row.text || sourceLabel(row) || row.location || row.relicName || JSON.stringify(row)}|${row.chance ?? ''}`)
    assert.equal(new Set(identities).size, identities.length, `${item.name} has duplicate blueprint rows`)
    assert.ok(rows.length <= 40, `${item.name} has ${rows.length} top-level blueprint rows`)
    assert.ok(rows.length > 0, `${item.name} has an empty blueprint box`)
    if (expanded.length > 1) stats.gainedRows += 1
    largest.push({ name: item.name, rows: expanded.length, topLevelRows: rows.length })
  }
  largest.sort((a, b) => b.rows - a.rows || a.name.localeCompare(b.name))
  console.log(`P55 whole-catalog blueprint stats: recipes=${stats.recipes}, prime=${stats.prime}, nonPrime=${stats.nonPrime}, gainedRows=${stats.gainedRows}, unavailable=${stats.unavailable}`)
  console.log(`P55 source-unavailable examples: ${unavailableNames.join(', ') || 'none'}`)
  console.log(`P55 five largest blueprint boxes: ${largest.slice(0, 5).map(({ name, rows }) => `${name}=${rows}`).join(', ')}`)
  assert.ok(stats.recipes > 300)
  assert.ok(stats.prime > 0)
  assert.ok(stats.nonPrime > 0)
  assert.ok(stats.gainedRows > 250, `expected broad non-Prime coverage, gainedRows=${stats.gainedRows}`)
})

test.after(() => {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true })
})
