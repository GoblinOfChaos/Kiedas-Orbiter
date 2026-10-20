import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { buildIngredientSourceRows, buildRelicRarityIndex } from '../../src/lib/relicSources.js'
import { normalizeRelicEntry, relicRewardPool } from '../../src/lib/relicEntry.js'

let prepareAcquisitionSources
try {
  const relicSources = await import('../../src/lib/relicSources.js')
  prepareAcquisitionSources = typeof relicSources.prepareAcquisitionSources === 'function'
    ? relicSources.prepareAcquisitionSources
    : (sources) => sources
} catch {
  // The original-HEAD proof intentionally runs this test against a source
  // tree without the new helper; identity behavior makes the row-bound test
  // fail on the old implementation instead of failing at module loading.
  prepareAcquisitionSources = (sources) => sources
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const haveRealData = fs.existsSync(path.join(process.env.HOME || '', '.local/share/kiedas-orbiter-preview/data/export'))
globalThis.window ??= { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) }
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.__TAURI_INTERNALS__ ??= { transformCallback: () => 0, unregisterCallback() {}, invoke: async () => null, convertFileSrc: (value) => value, metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', currentWindow: { label: 'main' } } } }
globalThis.window.__TAURI_INTERNALS__ = globalThis.__TAURI_INTERNALS__
let harnessPromise
let contextPromise

async function context() {
  const harness = await (harnessPromise ||= loadRealHarness({ locale: 'en' }))
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = await (contextPromise ||= buildAllAcquisitionIndexes(harness.exportsBundle))
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const overrides = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url)))
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
}

async function loadGetSourceLabel() {
  const viteRequire = createRequire(import.meta.url).resolve('vite')
  const { build } = createRequire(viteRequire)('esbuild')
  const result = await build({
    entryPoints: [path.join(root, 'src/components/AcquisitionDrawer.jsx')],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.webp': 'empty' },
    define: { 'import.meta.env.MODE': '"preview"', 'import.meta.env': '{"MODE":"preview"}' },
    packages: 'external',
    plugins: [{ name: 'stub-vite-files', setup(buildApi) {
      buildApi.onResolve({ filter: /\?(worker|url|raw)$/ }, (args) => ({ path: args.path, namespace: 'vite-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'vite-stub' }, () => ({ contents: 'export default class {}', loader: 'js' }))
      buildApi.onLoad({ filter: /src[\\/]lib[\\/]i18n\.js$/ }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^)]*\)/g, '{}'), loader: 'js' }))
    } }],
  })
  const output = path.join(root, 'tests/.cache/drawer-rows-labels.mjs')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, result.outputFiles[0].text)
  return (await import(`${pathToFileURL(output).href}?${Date.now()}`)).getSourceLabel
}

function canonical(value) {
  return value?.replaceAll('/StoreItems/', '/')
}

test('real data: every Prime ingredient relic row uses the DE ExportRelics tier', { skip: !haveRealData }, async () => {
  const { harness, dropIndex } = await context()
  const rarityIndex = buildRelicRarityIndex(harness.exportsBundle)
  const recipes = harness.exportsBundle.ExportRecipes || {}
  const expectedByBlueprint = new Map()
  for (const [relicUniqueName, entry] of Object.entries(harness.exportsBundle.ExportRelics || {})) {
    const normalized = normalizeRelicEntry(entry, relicUniqueName)
    const relicName = `${normalized.era} ${normalized.category}`
    for (const reward of relicRewardPool(entry, harness.exportsBundle.ExportRewards, relicUniqueName)) {
      if (reward?.type && reward?.rarity) expectedByBlueprint.set(`${relicName}|${canonical(reward.type)}`, reward.rarity)
    }
  }

  let checked = 0
  const missingDeTiers = new Set()
  const mismatches = []
  for (const [recipeName, recipe] of Object.entries(recipes)) {
    if (!/Prime/i.test(recipeName) || !Array.isArray(recipe?.ingredients)) continue
    for (const ingredient of recipe.ingredients) {
      const componentType = canonical(ingredient.ItemType)
      if (!/Prime/i.test(componentType || '')) continue
      const componentRecipe = Object.entries(recipes).find(([, candidate]) => canonical(candidate?.resultType) === componentType)
      const rows = buildIngredientSourceRows({ itemType: componentType, name: componentType }, dropIndex, [], rarityIndex)
      for (const row of rows.filter((source) => source.type === 'relic')) {
        const expected = expectedByBlueprint.get(`${row.relicName}|${componentType}`)
          || expectedByBlueprint.get(`${row.relicName}|${canonical(componentRecipe?.[0])}`)
        if (!expected) {
          missingDeTiers.add(`${componentType} — ${row.relicName}`)
          if (row.rarity) mismatches.push(`${recipeName} ${componentType} ${row.relicName}: ${row.rarity} without DE tier`)
        } else {
          if (row.rarity !== expected) mismatches.push(`${recipeName} ${componentType} ${row.relicName}: ${row.rarity} != ${expected}`)
        }
        checked += 1
      }
    }
  }
  console.log(`Prime relic tier audit: checked=${checked}, mismatches=${mismatches.length}, noDeTier=${missingDeTiers.size}`)
  assert.deepEqual(mismatches, [])
  if (missingDeTiers.size > 0) console.log(`Prime parts without a matching DE relic tier: ${[...missingDeTiers].sort().join('; ')}`)
  assert.ok(checked > 0)
})

test('real data: resource mission rows have useful labels and stay bounded', { skip: !haveRealData }, async () => {
  const { harness, indexes, acquisition } = await context()
  const getSourceLabel = await loadGetSourceLabel()
  const en = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/i18n/en.json'), 'utf8'))
  const t = (key, values = {}) => {
    const text = en.ui?.[key] || en.acquisition_drawer?.[key] || key
    return Object.entries(values).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, String(value)), text)
  }
  const entries = Object.values(harness.exportsBundle.ExportResources || {})
  for (const entry of entries) {
    const displayName = harness.dict?.[entry?.name] || entry?.name
    if (!entry?.uniqueName || !displayName || String(displayName).startsWith('/')) continue
    const result = acquisition(entry.uniqueName, displayName)
    const rows = prepareAcquisitionSources(result.sources, {
      rarityIndex: buildRelicRarityIndex(harness.exportsBundle),
      itemType: result.recipe?.blueprintUniqueName || entry.uniqueName,
    })
    assert.ok(rows.length <= 40, `${displayName} has ${rows.length} top-level rows`)
    for (const row of rows.flatMap((source) => source.type.endsWith('-group') ? source.sources : [source])) {
      if (row.type !== 'mission') continue
      const label = getSourceLabel(row, t)
      assert.ok(label && label !== 'Mission', `${displayName} has an unlabeled mission row: ${JSON.stringify(row)}`)
    }
    if (/^(Orokin Cell|Alloy Plate)$/.test(displayName)) {
      assert.ok(rows.some((row) => /Adrastea|Cephalon Capture|Gradivus|Terminus|Neruda/i.test(getSourceLabel(row, t))))
    }
  }
  for (const [uniqueName, displayName] of [
    ['/Lotus/Types/Items/MiscItems/OrokinCell', 'Orokin Cell'],
    ['/Lotus/Types/Items/MiscItems/AlloyPlate', 'Alloy Plate'],
  ]) {
    const result = acquisition(uniqueName, displayName)
    const rows = prepareAcquisitionSources(result.sources, {
      rarityIndex: buildRelicRarityIndex(harness.exportsBundle),
      itemType: result.recipe?.blueprintUniqueName || uniqueName,
    })
    assert.ok(rows.length <= 40, `${displayName} has ${rows.length} top-level rows`)
    assert.ok(rows.some((row) => /Adrastea|Cephalon Capture|Gradivus|Terminus|Neruda/i.test(getSourceLabel(row, t))))
  }
})

test('real data: Forma drawers collapse relics and mission rows', { skip: !haveRealData }, async () => {
  const { harness, acquisition } = await context()
  const rarityIndex = buildRelicRarityIndex(harness.exportsBundle)
  for (const [uniqueName, displayName] of [
    ['/Lotus/Types/Items/MiscItems/Forma', 'Forma'],
    ['/Lotus/Types/Recipes/Components/FormaBlueprint', 'Forma Blueprint'],
  ]) {
    const result = acquisition(uniqueName, displayName)
    const rows = prepareAcquisitionSources(result.sources, {
      rarityIndex,
      itemType: result.recipe?.blueprintUniqueName || uniqueName,
    })
    assert.ok(rows.length < 40, `${displayName} has ${rows.length} top-level rows`)
    assert.ok(rows.some((row) => row.type === 'relic-group' && row.relicCount >= 30), `${displayName} lacks its relic count group`)
  }
})

test('real data: extractor blueprints inherit the finished-item routes', { skip: !haveRealData }, async () => {
  const { acquisition } = await context()
  for (const [itemPath, itemName, blueprintPath, blueprintName] of [
    ['/Lotus/Types/Ship/AdvancedResourceDrone', 'Titan Extractor Prime', '/Lotus/Types/Recipes/Drones/AdvancedResourceDroneBlueprint', 'Titan Extractor Prime Blueprint'],
    ['/Lotus/Types/Ship/AdvancedUcResourceDrone', 'Distilling Extractor Prime', '/Lotus/Types/Recipes/Drones/AdvancedUcResourceDroneBlueprint', 'Distilling Extractor Prime Blueprint'],
  ]) {
    const itemRoutes = new Set(acquisition(itemPath, itemName).sources.map((source) => source.text || source.location || source.relicName))
    const blueprintRoutes = new Set(acquisition(blueprintPath, blueprintName).sources.map((source) => source.text || source.location || source.relicName))
    assert.deepEqual(blueprintRoutes, itemRoutes, blueprintName)
  }
})

test('drawer rows with a chance run from highest to lowest, whatever their row type', () => {
  const rows = prepareAcquisitionSources([
    { type: 'non-drop', text: 'Purchased from the Market.' },
    { type: 'transient', location: 'Event cache', chance: 0.11 },
    { type: 'transient', location: 'Seasonal reward', chance: 0.07 },
    { type: 'mission', node: 'Node A', rotation: 'C', chance: 0.22 },
    { type: 'mission', node: 'Node B', chance: 0.04 },
  ])
  assert.equal(rows[0].type, 'non-drop')
  assert.deepEqual(rows.slice(1).map((row) => row.chance), [0.22, 0.11, 0.07, 0.04])
})

test('real data: the Forma Blueprint box lists drop chances from highest to lowest', { skip: !haveRealData }, async () => {
  const { harness, dropIndex, acquisition } = await context()
  const { buildBlueprintAcquisitionRows } = await import('../../src/lib/relicSources.js')
  const rarityIndex = buildRelicRarityIndex(harness.exportsBundle)
  const info = acquisition('/Lotus/Types/Items/MiscItems/Forma', 'Forma')
  const rows = buildBlueprintAcquisitionRows('Forma', info.recipe, dropIndex, [], rarityIndex, null, info.sources)
  const chances = rows.filter((row) => typeof row.chance === 'number').map((row) => row.chance)
  assert.ok(chances.length >= 5, `only ${chances.length} chance rows`)
  for (let i = 1; i < chances.length; i += 1) {
    assert.ok(chances[i] <= chances[i - 1], `row ${i} (${chances[i]}) is below a lower-chance row (${chances[i - 1]})`)
  }
})

test('real data: dojo, Sentinel and Archwing blueprints show their own routes, not the built item price', { skip: !haveRealData }, async () => {
  const { acquisition } = await context()
  const texts = (uniqueName, name) => acquisition(uniqueName, name).sources.map((source) => source.text || '')
  for (const [uniqueName, name, expected] of [
    ['/Lotus/Weapons/ClanTech/Energy/ChainLightningRifleBlueprint', 'Amprex Blueprint', /Energy Lab/],
    ['/Lotus/Weapons/ClanTech/Bio/BioWeaponBlueprint', 'Torid Blueprint', /Bio Lab/],
    ['/Lotus/Types/Recipes/SentinelRecipes/CarrierSentinelBlueprint', 'Carrier Blueprint', /Blueprint purchasable from Market for 100,000 Credits/],
    ['/Lotus/Types/Recipes/ArchwingRecipes/DemolitionArchwing/DemolitionArchwingBlueprint', 'Elytron Blueprint', /Tenno Lab/],
  ]) {
    const rows = texts(uniqueName, name)
    assert.ok(rows.some((text) => expected.test(text)), `${name}: ${JSON.stringify(rows)}`)
    assert.ok(!rows.some((text) => /^(?:Sold fully built|Buy the complete|The built weapon is also sold)/.test(text)), `${name} shows the built item's price: ${JSON.stringify(rows)}`)
  }
})
