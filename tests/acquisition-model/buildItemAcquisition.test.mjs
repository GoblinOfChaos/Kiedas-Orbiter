import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR, canonicalPath } from '../../scripts/lib/real-data-harness.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))

// Imported after real-data-harness registers its JSON module hook.
const { buildItemAcquisition, buildItemRelics } = await import('../../src/lib/acquisitionModel/buildItemAcquisition.js')

function deRelicTruthForTest(itemUniqueName, recipeByResult) {
  const targets = new Set([canonicalPath(itemUniqueName)])
  const itemRecipe = recipeByResult.get(canonicalPath(itemUniqueName))
  if (itemRecipe) {
    targets.add(itemRecipe.blueprintUniqueName)
    for (const ingredient of itemRecipe.recipe.ingredients || []) {
      const ingredientType = canonicalPath(ingredient.ItemType || ingredient.itemType)
      if (!ingredientType) continue
      targets.add(ingredientType)
      const ingredientRecipe = recipeByResult.get(ingredientType)
      if (ingredientRecipe) targets.add(ingredientRecipe.blueprintUniqueName)
    }
  }
  return { targets, recipeByResult }
}

async function realContext() {
  const harness = await loadRealHarness({ locale: 'en' })
  const { buildAllAcquisitionIndexes } = await import('../../src/lib/acquisitionInfo.js')
  const { buildDropIndex } = await import('../../src/lib/dropsParser.js')
  const { buildRelicRarityIndex, normalizeRelicName } = await import('../../src/lib/relicSources.js')
  const { normalizeRelicEntry, relicRewardPool } = await import('../../src/lib/relicEntry.js')
  const { loadAcquisitionData, getItemDrops } = await import('../../src/lib/acquisitionData.js')
  await loadAcquisitionData()
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const ctx = { ...indexes, dropIndex: buildDropIndex(harness.exportsBundle), rarityIndex: buildRelicRarityIndex(harness.exportsBundle), getItemDrops, exportData: harness.exportsBundle }
  const recipeByResult = new Map()
  for (const [blueprintUniqueName, recipe] of Object.entries(harness.exportsBundle.ExportRecipes || {})) {
    if (recipe?.resultType) recipeByResult.set(canonicalPath(recipe.resultType), { blueprintUniqueName: canonicalPath(blueprintUniqueName), recipe })
  }
  const rewardsByTarget = new Map()
  for (const [relicUniqueName, entry] of Object.entries(harness.exportsBundle.ExportRelics || {})) {
    const normalized = normalizeRelicEntry(entry, relicUniqueName)
    if (!normalized.era || !normalized.category) continue
    const relic = normalizeRelicName(`${normalized.era} ${normalized.category}`)
    for (const reward of relicRewardPool(entry, harness.exportsBundle.ExportRewards, relicUniqueName)) {
      const target = canonicalPath(reward?.type)
      if (!target || !reward?.rarity) continue
      const targetRewards = rewardsByTarget.get(target) || new Map()
      const tiers = targetRewards.get(relic) || new Set()
      tiers.add(String(reward.rarity).toUpperCase())
      targetRewards.set(relic, tiers)
      rewardsByTarget.set(target, targetRewards)
    }
  }
  const truthRows = (uniqueName) => {
    const { targets } = deRelicTruthForTest(uniqueName, recipeByResult)
    const relics = new Map()
    for (const target of targets) for (const [relic, tiers] of rewardsByTarget.get(target) || []) {
      const combined = relics.get(relic) || new Set()
      for (const tier of tiers) combined.add(tier)
      relics.set(relic, combined)
    }
    return [...relics].sort(([left], [right]) => left.localeCompare(right)).map(([relic, tierSet]) => {
      const tiers = [...tierSet].sort()
      return { relic, tier: tiers[0] || null, ...(tiers.length > 1 ? { tiers, tierConflict: true } : {}) }
    })
  }
  return { harness, ctx, truthRows }
}

function fixtureContext({ infoByPath = {}, recipes = new Map(), names = {} } = {}) {
  return {
    dropIndex: {},
    recipeResultIndex: recipes,
    rarityIndex: new Map(),
    resolveName: (uniqueName) => names[uniqueName] || uniqueName.split('/').pop(),
    getAcquisitionInfo: (uniqueName) => infoByPath[uniqueName] || { sources: [], recipe: recipes.get(uniqueName) || null },
  }
}

test('synthetic: recipe facts live in build, while an acquisition route remains first', () => {
  const item = '/weapons/recipe-only'
  const blueprint = '/recipes/recipe-only-blueprint'
  const part = '/parts/vanguard-part'
  const recipe = { blueprintUniqueName: blueprint, creditsCost: 15000, buildTime: 43200, rushCost: 25, ingredients: [{ ItemType: part, ItemCount: 3 }] }
  const result = buildItemAcquisition(item, 'Recipe Only', fixtureContext({
    recipes: new Map([[item, recipe]]), names: { [part]: 'Vanguard Part' },
    infoByPath: {
      [item]: { sources: [{ type: 'mission', nodeName: 'Earth', source: 'DE drop tables' }], recipe },
      [blueprint]: { sources: [{ type: 'relic', relicName: 'Vanguard E1', rarity: 'COMMON', source: 'DE ExportRelics' }] },
      [part]: { sources: [{ type: 'relic', relicName: 'Vanguard M1', rarity: 'RARE', source: 'DE ExportRelics' }] },
    },
  }))
  assert.equal(result.routes[0].type, 'mission')
  assert.ok(result.build)
  assert.equal(result.build.credits, 15000)
  assert.equal(result.build.ingredients[0].count, 3)
  assert.ok(!result.routes.some((route) => /foundry|built in/i.test(route.text || '')))
  assert.deepEqual(result.relics.map((row) => row.relic), ['Vanguard E1', 'Vanguard M1'])
})

test('synthetic: a weapon with only a recipe never invents a Foundry route', () => {
  const item = '/weapons/only-recipe'
  const recipe = { blueprintUniqueName: '/recipes/only-recipe-blueprint', creditsCost: 25000, buildTime: 3600, ingredients: [] }
  const result = buildItemAcquisition(item, 'Only Recipe', fixtureContext({ recipes: new Map([[item, recipe]]) }))
  assert.deepEqual(result.routes, [])
  assert.equal(result.build.credits, 25000)
})

test('synthetic: Nightwave and vendor records are routes with their source provenance', () => {
  const ctx = fixtureContext({ infoByPath: {
    '/mods/nightwave': { sources: [{ type: 'non-drop', text: 'Sold by Nora Night for 20 Nora\'s Mix Vol. 1 Cred.', source: 'DE export' }] },
    '/vendor/item': { sources: [{ type: 'verified-route', text: 'Sold by Hombask.', source: 'Warframe Wiki (https://wiki.warframe.com/w/Hombask)' }] },
  } })
  const mod = buildItemAcquisition('/mods/nightwave', 'Nightwave Mod', ctx)
  const vendor = buildItemAcquisition('/vendor/item', 'Vendor Item', ctx)
  assert.equal(mod.routes[0].provenance.kind, 'de-export')
  assert.equal(vendor.routes[0].provenance.kind, 'verified-route')
  assert.match(vendor.routes[0].provenance.page, /wiki\.warframe\.com/)
})

test('synthetic: multiple DE tiers for one relic are retained and flagged', () => {
  const item = '/items/forma-blueprint'
  const result = buildItemAcquisition(item, 'Forma Blueprint', fixtureContext({ infoByPath: {
    [item]: { sources: [
      { type: 'relic', relicName: 'Meso D1', rarity: 'COMMON', source: 'DE ExportRelics' },
      { type: 'relic', relicName: 'Meso D1', rarity: 'UNCOMMON', source: 'DE ExportRelics' },
    ] },
  } }))
  assert.deepEqual(result.relics[0].tiers, ['COMMON', 'UNCOMMON'])
  assert.equal(result.relics[0].tierConflict, true)
})

test('real data: Ash Prime parts retain DE Vanguard relics and Nunchasa does not lead with Foundry text', { skip: !haveRealData }, async () => {
  const { harness, ctx } = await realContext()
  const ashItem = harness.exportsBundle.AcquisitionItems.find((item) => item.name === 'Ash Prime')
  assert.ok(ashItem, 'missing real-data acquisition record for Ash Prime')
  const ash = ashItem.components.filter((component) => ['Blueprint', 'Chassis', 'Neuroptics', 'Systems'].includes(component.name)).map((component) => {
    const name = component.name === 'Blueprint' ? 'Ash Prime Blueprint' : `Ash Prime ${component.name}`
    return [name, buildItemAcquisition(component.uniqueName, name, ctx)]
  })
  const expected = {
    'Ash Prime Blueprint': ['Axi I3', 'Lith S3', 'Lith V7', 'Meso C1', 'Meso S3', 'Vanguard E1'],
    'Ash Prime Chassis': ['Axi B1', 'Axi K12', 'Lith V8', 'Meso V2', 'Neo N4', 'Vanguard M1'],
    'Ash Prime Neuroptics': ['Axi N2', 'Meso N2', 'Meso P12', 'Meso V4', 'Neo A4', 'Neo N3', 'Neo V4', 'Vanguard P1'],
    'Ash Prime Systems': ['Axi A7', 'Axi N1', 'Neo A10', 'Neo N5', 'Vanguard C1'],
  }
  for (const [name, model] of ash) assert.deepEqual(model.relics.map((row) => row.relic).sort(), expected[name].sort(), name)
  const nunchasaUniqueName = Object.entries(harness.exportsBundle).filter(([tableName, table]) => tableName.startsWith('Export') && table && typeof table === 'object')
    .flatMap(([, table]) => Object.entries(table)).find(([, entry]) => entry?.name === 'Nunchasa')?.[0]
  assert.ok(nunchasaUniqueName, 'missing real-data catalog entry for Nunchasa')
  const nunchasa = buildItemAcquisition(nunchasaUniqueName, 'Nunchasa', ctx)
  assert.ok(!/foundry|built in/i.test(nunchasa.routes[0]?.text || ''), JSON.stringify(nunchasa.routes[0]))
  assert.ok(!nunchasa.routes.some((route) => /^\s*(?:build cost|rush)\s*:/i.test(route.text)), JSON.stringify(nunchasa.routes))
  assert.ok(!nunchasa.routes.some((route) => /^\s*components\s*:/i.test(route.text)), JSON.stringify(nunchasa.routes))
  assert.equal(nunchasa.build?.credits, 20000)
  assert.equal(nunchasa.build?.rush, 25)
})

test('real data: P57 named relic records use only their exact DE reward identities', { skip: !haveRealData }, async () => {
  const { harness, ctx, truthRows } = await realContext()
  const subjects = (await import('../../scripts/item-completeness.mjs')).discoverSubjects(harness)
  for (const name of ['Hydroid Prime', 'Sevagoth Prime', 'Umbra Forma', 'Exilus Weapon Adapter', 'Boot Trophy']) {
    const subject = subjects.find((entry) => entry.name === name && entry.category !== 'recipes')
    const actual = buildItemAcquisition(subject.uniqueName, name, ctx).relics.map(({ relic, tier, tiers, tierConflict }) => ({ relic, tier, ...(tiers ? { tiers } : {}), ...(tierConflict ? { tierConflict } : {}) }))
    assert.deepEqual(actual, truthRows(subject.uniqueName), name)
  }
})

test('real data: every acquisition-model relic set and tier exactly matches its DE reward rows', { skip: !haveRealData, timeout: 180000 }, async () => {
  const { harness, ctx, truthRows } = await realContext()
  const { discoverSubjects } = await import('../../scripts/item-completeness.mjs')
  const mismatches = []
  for (const subject of discoverSubjects(harness)) {
    const actual = buildItemRelics(subject.uniqueName, ctx).map(({ relic, tier, tiers, tierConflict }) => ({ relic, tier, ...(tiers ? { tiers } : {}), ...(tierConflict ? { tierConflict } : {}) }))
    const expected = truthRows(subject.uniqueName)
    if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push({ name: subject.name, actual, expected })
  }
  assert.deepEqual(mismatches, [], `DE relic mismatches: ${JSON.stringify(mismatches.slice(0, 5))}`)
})

test('real data: DE-only tiers keep three single tiers and three genuine conflicts', { skip: !haveRealData }, async () => {
  const { harness, ctx } = await realContext()
  const subjects = (await import('../../scripts/item-completeness.mjs')).discoverSubjects(harness)
  const subjectFor = (name) => subjects.find((subject) => subject.name === name && subject.category !== 'recipes')
  const row = (name, relic) => buildItemAcquisition(subjectFor(name).uniqueName, name, ctx).relics.find((entry) => entry.relic === relic)
  assert.deepEqual(row('Citrine Prime', 'Neo C11'), { relic: 'Neo C11', tier: 'COMMON', source: 'de-exportrelics', provenance: [{ kind: 'de-exportrelics' }] })
  assert.deepEqual(row('Ayatan Amber Star', 'Requiem I'), { relic: 'Requiem I', tier: 'COMMON', source: 'de-exportrelics', provenance: [{ kind: 'de-exportrelics' }] })
  assert.deepEqual(row('Forma', 'Axi A10'), { relic: 'Axi A10', tier: 'COMMON', source: 'de-exportrelics', provenance: [{ kind: 'de-exportrelics' }] })
  for (const [name, relic, tiers] of [['Odonata Prime', 'Axi V8', ['COMMON', 'UNCOMMON']], ['Sevagoth Prime', 'Lith S20', ['RARE', 'UNCOMMON']], ['Forma', 'Meso D1', ['COMMON', 'UNCOMMON']]]) {
    assert.deepEqual(row(name, relic)?.tiers, tiers, `${name} ${relic}`)
    assert.equal(row(name, relic)?.tierConflict, true, `${name} ${relic}`)
  }
})

test('real data: DE-absent generic relic rows are not attributed to three unrelated items', { skip: !haveRealData }, async () => {
  const { harness, ctx } = await realContext()
  const subjects = (await import('../../scripts/item-completeness.mjs')).discoverSubjects(harness)
  const subjectFor = (name) => subjects.find((subject) => subject.name === name && subject.category !== 'recipes')
  for (const [name, relic] of [['Sevagoth Prime', 'Axi B10'], ['Burston Prime', 'Lith S20'], ['Nautilus Prime', 'Neo H5']]) {
    const actual = buildItemAcquisition(subjectFor(name).uniqueName, name, ctx).relics
    assert.equal(actual.some((entry) => entry.relic === relic), false, `${name} must not include ${relic}`)
  }
})
