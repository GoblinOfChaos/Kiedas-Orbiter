import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { loadRealHarness, DEFAULT_DATA_DIR, canonicalPath } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { normalizeRelicEntry, relicRewardPool } from '../../src/lib/relicEntry.js'
import {
  buildBlueprintSourceRows,
  buildIngredientSourceRows,
  buildRelicRarityIndex,
  getRelicSourceLabel,
  normalizeRelicName,
  normalizeRelicSources,
  resolveRelicRarity,
} from '../../src/lib/relicSources.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/i18n/en.json'), 'utf8'))
const t = (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), en.ui?.[key] || key)

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
    plugins: [{ name: 'p42-stubs', setup(buildApi) {
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'p42-vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'p42-vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
      buildApi.onResolve({ filter: /acquisitionData(?:\.js)?$/ }, () => ({ path: 'p42-acquisition-data', namespace: 'p42-acquisition-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'p42-acquisition-stub' }, () => ({ contents: `
        export function getItemDrops(key) { return globalThis.__P42_ITEM_DROPS__?.[key] || null }
        export function getItemRecipe() { return null }
        export function resolveBlueprintOrigin() { return null }
      `, loader: 'js' }))
      buildApi.onResolve({ filter: /MonitoringContext(?:\.jsx)?$/ }, () => ({ path: 'p42-monitoring-context', namespace: 'p42-monitoring-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'p42-monitoring-stub' }, () => ({ contents: `
        import { createContext, useContext } from 'react'
        export const MonitoringContext = createContext(null)
        export const useMonitoring = () => useContext(MonitoringContext)
      `, loader: 'js', resolveDir: ROOT }))
    } }],
  }).then(async (result) => {
    const file = path.join(fs.mkdtempSync(path.join(ROOT, 'tests/.cache/p42-drawer-')), 'drawer.mjs')
    fs.writeFileSync(file, result.outputFiles[0].text)
    return import(`${pathToFileURL(file).href}?${Date.now()}`)
  })
  return drawerModulePromise
}

let contextPromise
async function realContext() {
  if (contextPromise) return contextPromise
  contextPromise = (async () => {
    const harness = await loadRealHarness({ locale: 'en' })
    const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
    const indexes = await buildAllAcquisitionIndexes(harness.exportsBundle)
    const dropIndex = buildDropIndex(harness.exportsBundle)
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
    return { harness, indexes, dropIndex, acquisition }
  })()
  return contextPromise
}

function componentByName(item, name) {
  return item.components?.find((component) => component.name === name)
}

function rawRowsForPart(item, component, dropIndex, rarityIndex) {
  if (!component?.uniqueName || !Array.isArray(component.drops)) return []
  const ingredient = { itemType: component.uniqueName, name: `${item.name} ${component.name}` }
  return component.name === 'Blueprint'
    ? buildBlueprintSourceRows(item.name, { blueprintUniqueName: component.uniqueName }, dropIndex, component.drops, rarityIndex)
    : buildIngredientSourceRows(ingredient, dropIndex, component.drops, rarityIndex)
}

function dropsForIdentity(harness, identity) {
  const wanted = canonicalPath(identity).toLowerCase()
  const drops = []
  for (const [uniqueName, entry] of Object.entries(harness.exportsBundle.ExportRelics || {})) {
    const normalized = normalizeRelicEntry(entry, uniqueName)
    const relicName = `${normalized.era} ${normalized.category}`
    for (const reward of relicRewardPool(entry, harness.exportsBundle.ExportRewards, uniqueName)) {
      if (canonicalPath(reward?.type || '').toLowerCase() !== wanted) continue
      drops.push({ location: `${relicName} Relic`, type: reward.type, chance: undefined, rarity: reward.rarity })
    }
  }
  return drops
}

function displayIdentity(identity) {
  return String(identity || '').split('/').pop()
    .replace(/(?:Component|Blueprint)$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/Prime([A-Z])/g, 'Prime $1')
}

function dePrimeParts(harness) {
  const parts = new Map()
  const recipes = harness.exportsBundle.ExportRecipes || {}
  const add = (identity, fallbackIdentity = identity) => {
    const itemType = canonicalPath(identity)
    if (!itemType || !/Prime/i.test(itemType) || !/(?:\/Recipes\/|\/WeaponParts\/)/i.test(itemType)) return
    if (!parts.has(itemType)) parts.set(itemType, {
      name: displayIdentity(itemType),
      component: { name: displayIdentity(itemType), uniqueName: itemType, drops: dropsForIdentity(harness, fallbackIdentity) },
    })
  }
  for (const [uniqueName, entry] of Object.entries(harness.exportsBundle.ExportRelics || {})) {
    for (const reward of relicRewardPool(entry, harness.exportsBundle.ExportRewards, uniqueName)) {
      const rewardType = canonicalPath(reward?.type)
      if (!rewardType) continue
      add(rewardType)
      const recipe = recipes[rewardType] || recipes[rewardType.replace('/StoreItems/', '/')]
      if (/Blueprint$/i.test(rewardType) && /Component$/i.test(recipe?.resultType || '')) add(recipe.resultType, rewardType)
    }
  }
  return [...parts.values()]
}

function derivedPrimeSample(harness, name) {
  const existing = harness.exportsBundle.AcquisitionItems.find((item) => item.name === name)
  if (existing) return existing
  const recipes = harness.exportsBundle.ExportRecipes || {}
  const parentRecipeEntry = Object.entries(recipes).find(([, recipe]) => recipe?.resultType && harness.exportsBundle.ExportWarframes?.[recipe.resultType]?.name === name)
    || Object.entries(recipes).find(([, recipe]) => recipe?.resultType && harness.exportsBundle.ExportWeapons?.[recipe.resultType]?.name === name)
    || Object.entries(recipes).find(([, recipe]) => recipe?.resultType && /Prime$/i.test(name) && canonicalPath(recipe.resultType).toLowerCase().includes(name.replace(/\s+/g, '').toLowerCase()))
  if (!parentRecipeEntry) return { name, components: [] }
  const [blueprintUniqueName, recipe] = parentRecipeEntry
  const components = [{ name: 'Blueprint', uniqueName: blueprintUniqueName, drops: dropsForIdentity(harness, blueprintUniqueName) }]
  for (const ingredient of recipe.ingredients || []) {
    const itemType = ingredient.ItemType
    if (!/Prime/i.test(itemType || '') || !/Component$|WeaponParts\//i.test(itemType || '')) continue
    const leaf = itemType.split('/').pop().replace(/(?:Component|Blueprint)$/i, '')
    const partName = leaf.match(/Prime(Helmet|Chassis|Systems)$/i)?.[1]?.replace(/^Helmet$/i, 'Neuroptics') || leaf.replace(/Prime/i, '')
    components.push({ name: partName, uniqueName: itemType, drops: dropsForIdentity(harness, itemType.replace(/Component$/i, 'Blueprint')) })
  }
  return { name, components }
}

function renderedRelicLabels(html) {
  return [...html.matchAll(/(?:Lith|Meso|Neo|Axi|Requiem)\s+[A-Z]\d+(?:\s+Relic)?(?:\s+\((?:Common|Uncommon|Rare)\))?/g)].map((match) => match[0])
}

function printRows(label, rows, rarityIndex, itemType) {
  const output = rows.map((row) => `${getRelicSourceLabel(row, t)} [DE=${resolveRelicRarity(rarityIndex, row.relicName, itemType) || 'none'}]`)
  console.log(`${label}: ${output.join(' | ')}`)
}

function independentExpectedMap(harness) {
  const expected = new Map()
  const recipes = harness.exportsBundle.ExportRecipes || {}
  const blueprintToResult = new Map(Object.entries(recipes).map(([blueprint, recipe]) => [canonicalPath(blueprint), canonicalPath(recipe?.resultType)]).filter(([, result]) => result))
  for (const [uniqueName, entry] of Object.entries(harness.exportsBundle.ExportRelics || {})) {
    const normalized = normalizeRelicEntry(entry, uniqueName)
    const relicName = normalizeRelicName(`${normalized.era} ${normalized.category}`)
    for (const reward of relicRewardPool(entry, harness.exportsBundle.ExportRewards, uniqueName)) {
      if (!reward?.type || !reward?.rarity) continue
      const rewardType = canonicalPath(reward.type)
      expected.set(`${relicName.toLowerCase()}|${rewardType.toLowerCase()}`, reward.rarity)
      const componentType = blueprintToResult.get(rewardType)
      if (componentType) expected.set(`${relicName.toLowerCase()}|${componentType.toLowerCase()}`, reward.rarity)
    }
  }
  return expected
}

function expectedTier(expected, relicName, itemType) {
  return expected.get(`${normalizeRelicName(relicName).toLowerCase()}|${canonicalPath(itemType || '').toLowerCase()}`)
}

async function renderAshDrawer(context) {
  const { PreviewAcquisitionDrawer, UiContext, MonitoringContext } = await loadDrawer()
  const ash = context.harness.exportsBundle.AcquisitionItems.find((item) => item.name === 'Ash Prime')
  const info = await context.acquisition('/Lotus/Powersuits/Ninja/AshPrime', 'Ash Prime')
  globalThis.__P42_ITEM_DROPS__ = Object.fromEntries((ash.components || []).filter((component) => component.uniqueName && component.drops).map((component) => [component.uniqueName, component.drops.map((drop) => ({ type: 'drop', location: drop.location, dropType: drop.type, chance: drop.chance, rarity: drop.rarity }))]))
  const value = React.createElement(MonitoringContext.Provider, { value: { dropIndex: context.dropIndex, exportData: context.harness.exportsBundle } },
    React.createElement(UiContext.Provider, { value: { t, ui: en, locale: 'en', ready: true, i18nData: en } },
      React.createElement(PreviewAcquisitionDrawer, { item: { uniqueName: '/Lotus/Powersuits/Ninja/AshPrime', displayName: 'Ash Prime', image: null, info }, onClose: () => {} })))
  return renderToString(value)
}

test('P42 shared relic identity handles component paths, blueprint paths, display names, and no-DE tiers', () => {
  const exportData = {
    ExportRecipes: { '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeHelmetBlueprint': { resultType: '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeHelmetComponent' } },
    ExportRelics: { '/Lotus/Types/Game/Projections/T4AxiN2Bronze': { name: 'Axi N2 Relic', relicRewards: [{ rewardName: '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeHelmetBlueprint', rarity: 'UNCOMMON' }] } },
    AcquisitionItems: [{ name: 'Ash Prime', components: [{ name: 'Neuroptics', uniqueName: '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeHelmetComponent' }] }],
  }
  const index = buildRelicRarityIndex(exportData)
  assert.equal(resolveRelicRarity(index, 'Axi N2 Relic', '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeHelmetComponent'), 'UNCOMMON')
  assert.equal(resolveRelicRarity(index, 'Axi N2', '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeHelmetBlueprint'), 'UNCOMMON')
  assert.equal(resolveRelicRarity(index, 'Axi N2', 'Ash Prime Neuroptics'), 'UNCOMMON')
  const known = normalizeRelicSources([{ type: 'drop', location: 'Axi N2 Relic (Radiant)', rarity: 'RARE' }], { rarityIndex: index, itemType: '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeHelmetComponent' })
  assert.equal(getRelicSourceLabel(known[0], t), 'Axi N2 (Uncommon)')
  const unknown = normalizeRelicSources([{ type: 'drop', location: 'Axi Z99 Relic (Intact)', rarity: 'RARE' }], { rarityIndex: index, itemType: '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeHelmetComponent' })
  assert.equal(getRelicSourceLabel(unknown[0], t), 'Axi Z99')
})

test('P42 reproduces the real Ash Prime drawer and shows all four groups with DE tiers', { skip: !haveRealData }, async () => {
  const context = await realContext()
  const html = await renderAshDrawer(context)
  const labels = renderedRelicLabels(html)
  console.log(`P42 SSR Ash Prime rendered relic labels (${labels.length}): ${labels.join(' | ')}`)
  assert.match(html, /Ash Prime Neuroptics/)
  assert.match(html, /Ash Prime Chassis/)
  assert.match(html, /Ash Prime Systems/)
  assert.match(html, /Axi N2 \(Uncommon\)/)
  assert.match(html, /Axi B1 \(Common\)/)
  assert.match(html, /Neo N5 \(Uncommon\)/)
  assert.doesNotMatch(html, /Axi N2 Relic|Axi B1 Relic|Neo N5 Relic/)
})

test('P42 audits every Prime part relic row against DE ExportRelics', { skip: !haveRealData }, async () => {
  const context = await realContext()
  const rarityIndex = buildRelicRarityIndex(context.harness.exportsBundle)
  const expected = independentExpectedMap(context.harness)
  const violations = []
  const counts = { parts: 0, rows: 0, noDeTier: 0, mismatchedTier: 0, bareRelic: 0, duplicates: 0, refinements: 0, percentages: 0 }
  for (const { name, component } of dePrimeParts(context.harness)) {
    counts.parts += 1
    const rows = rawRowsForPart({ name }, component, context.dropIndex, rarityIndex).filter((row) => row.type === 'relic')
    counts.rows += rows.length
    const names = new Set()
    for (const row of rows) {
      const label = getRelicSourceLabel(row, t)
      const deTier = expectedTier(expected, row.relicName, component.uniqueName)
      if (!row.rarity) counts.noDeTier += 1
      if (deTier && row.rarity !== deTier) {
        counts.mismatchedTier += 1
        violations.push(`${name} ${component.name}: ${row.relicName} ${row.rarity} != ${deTier}`)
      }
      if (!deTier && row.rarity) {
        counts.mismatchedTier += 1
        violations.push(`${name} ${component.name}: ${row.relicName} has non-DE tier ${row.rarity}`)
      }
      if (!names.add(row.relicName)) {
        counts.duplicates += 1
        violations.push(`${name} ${component.name}: duplicate ${row.relicName}`)
      }
      if (/\bRelic\b$/i.test(label)) {
        counts.bareRelic += 1
        violations.push(`${name} ${component.name}: bare relic ${label}`)
      }
      if (/Intact|Exceptional|Flawless|Radiant/i.test(label)) {
        counts.refinements += 1
        violations.push(`${name} ${component.name}: refinement ${label}`)
      }
      if (/%/.test(label)) {
        counts.percentages += 1
        violations.push(`${name} ${component.name}: percentage ${label}`)
      }
    }
  }
  const offenders = violations.slice(0, 25).map((violation) => violation.slice(0, 240))
  console.log(`P42 Prime part audit: ${JSON.stringify(counts)}`)
  assert.ok(violations.length === 0, `P42 violations=${violations.length}; first25=${JSON.stringify(offenders)}`)
  assert.ok(counts.parts > 0)
})

test('P42 prints the requested Prime samples with the DE tier beside each row', { skip: !haveRealData }, async () => {
  const context = await realContext()
  const rarityIndex = buildRelicRarityIndex(context.harness.exportsBundle)
  const wanted = ['Ash Prime', 'Nidus Prime', 'Nyx Prime', 'Citrine Prime', 'Akarius Prime', 'Excalibur Prime']
  for (const name of wanted) {
    const item = derivedPrimeSample(context.harness, name)
    assert.ok(item, `${name} must exist in the real acquisition bundle`)
    let printed = false
    for (const component of item.components || []) {
      const rows = rawRowsForPart(item, component, context.dropIndex, rarityIndex)
      if (rows.length) {
        printRows(`${name} ${component.name}`, rows, rarityIndex, component.uniqueName)
        printed = true
      }
    }
    if (!printed) console.log(`${name}: no DE ExportRelics rows (the final drawer has no relic rows for this Prime item)`)
  }
})
