import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { buildRelicPlaces } from '../../src/lib/farmingTargets/relicPlaces.js'
import { buildBlueprintSourceRows, buildIngredientSourceRows, buildRelicRarityIndex, getRelicSourceLabel } from '../../src/lib/relicSources.js'

const overrides = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url)))
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
let sharedHarnessPromise
let sharedIndexesPromise
let sharedDropIndex

async function sharedHarness() {
  sharedHarnessPromise ||= loadRealHarness()
  return sharedHarnessPromise
}

async function acquisition(harness, uniqueName, displayName) {
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  sharedIndexesPromise ||= buildAllAcquisitionIndexes(harness.exportsBundle)
  const indexes = await sharedIndexesPromise
  sharedDropIndex ||= buildDropIndex(harness.exportsBundle)
  return getAcquisitionInfo(
    uniqueName, displayName, sharedDropIndex, overrides,
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  )
}

test('real data: Citrine Prime Blueprint shows each relic once with the ExportRelics rarity tier', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const result = await acquisition(harness, '/Lotus/Types/Recipes/WarframeRecipes/CitrinePrimeBlueprint', 'Citrine Prime Blueprint')
  const meso = result.sources.filter((source) => source.type === 'relic' && /Meso C11/i.test(source.relicName || ''))
  assert.equal(meso.length, 1)
  assert.equal(meso[0].rarity, 'RARE')
  assert.equal(meso[0].chance, undefined)
  assert.equal(meso[0].state, undefined)
  assert.doesNotMatch(JSON.stringify(meso[0]), /Intact|Exceptional|Flawless|Radiant/i)
})

test('real data: Ash Prime Chassis relic rows are unique per relic', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const result = await acquisition(harness, '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeChassisBlueprint', 'Ash Prime Chassis Blueprint')
  const relics = result.sources.filter((source) => source.type === 'relic')
  const names = relics.map((source) => source.relicName)
  assert.equal(new Set(names).size, names.length)
  assert.ok(names.length > 0)
  assert.ok(relics.every((source) => source.chance === undefined && source.state === undefined))
})

test('real data: Prime blueprint rows use one DE-tiered relic per blueprint in the drawer path', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const dropIndex = sharedDropIndex ||= buildDropIndex(harness.exportsBundle)
  const rarityIndex = buildRelicRarityIndex(harness.exportsBundle)
  const checks = [
    ['/Lotus/Powersuits/Ninja/AshPrime', 'Ash Prime'],
    ['/Lotus/Powersuits/Geode/CitrinePrime', 'Citrine Prime'],
    ['/Lotus/Weapons/Tenno/LongGuns/PrimeAcceltra/PrimeAcceltraWeapon', 'Acceltra Prime'],
  ]
  for (const [uniqueName, displayName] of checks) {
    const result = await acquisition(harness, uniqueName, displayName)
    const fallback = harness.exportsBundle.AcquisitionItems
      .flatMap((item) => item.components || [])
      .find((component) => component.uniqueName === result.recipe.blueprintUniqueName)
    const rows = buildBlueprintSourceRows(displayName, result.recipe, dropIndex, fallback?.drops || [], rarityIndex)
    assert.ok(rows.length > 0, `${displayName} blueprint has no source rows`)
    assert.ok(rows.every((source) => source.type === 'relic'))
    assert.equal(new Set(rows.map((source) => source.relicName)).size, rows.length)
    assert.ok(rows.every((source) => source.chance === undefined && source.state === undefined))
    assert.ok(rows.every((source) => !/Intact|Exceptional|Flawless|Radiant|%/i.test(JSON.stringify(source))))
    assert.ok(rows.every((source) => source.rarity))
  }
})

test('real data: plain Prime component drops become unique DE-tiered relic rows', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const item = harness.exportsBundle.AcquisitionItems.find((entry) => entry.name === 'Ash Prime')
  const ingredient = item.components.find((component) => component.name === 'Neuroptics')
  const rows = buildIngredientSourceRows(
    { itemType: ingredient.uniqueName, name: 'Ash Prime Neuroptics' },
    {},
    ingredient.drops,
    buildRelicRarityIndex(harness.exportsBundle),
  )
  assert.ok(rows.length > 0)
  assert.equal(new Set(rows.map((source) => source.relicName)).size, rows.length)
  assert.ok(rows.every((source) => source.type === 'relic' && source.chance === undefined && source.state === undefined))
  assert.ok(rows.every((source) => !/Intact|Exceptional|Flawless|Radiant|%/i.test(JSON.stringify(source))))
})

test('real data: Acceltra Prime Barrel ingredient rows show each relic once with only its tier', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const recipe = harness.exportsBundle.ExportRecipes['/Lotus/Types/Recipes/Weapons/AcceltraPrimeBlueprint']
  const ingredient = recipe.ingredients.find((entry) => /AcceltraPrimeBarrel/.test(entry.ItemType))
  const rows = buildIngredientSourceRows({ itemType: ingredient.ItemType, name: 'Acceltra Prime Barrel', count: ingredient.ItemCount }, sharedDropIndex ||= buildDropIndex(harness.exportsBundle))
  const relics = rows.filter((source) => source.type === 'relic')
  assert.equal(relics.length, new Set(relics.map((source) => source.relicName)).size)
  const lith = relics.filter((source) => source.relicName === 'Lith A11')
  assert.equal(lith.length, 1)
  assert.equal(lith[0].rarity, 'RARE')
  assert.equal(lith[0].chance, undefined)
  assert.equal(lith[0].state, undefined)
  assert.doesNotMatch(JSON.stringify(lith[0]), /Intact|Exceptional|Flawless|Radiant/i)
  const en = JSON.parse(fs.readFileSync(new URL('../../src/lib/i18n/en.json', import.meta.url)))
  const label = getRelicSourceLabel(lith[0], (key) => en.ui[key] ?? key)
  assert.equal(label, 'Lith A11 (Rare)')
  assert.doesNotMatch(label, /relic_rarity|%|Intact|Exceptional|Flawless|Radiant/i)
})

test('real data: another prime ingredient also dedupes relic refinements', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const rows = buildIngredientSourceRows({ itemType: '/Lotus/Types/Recipes/WarframeRecipes/AshPrimeChassisBlueprint', name: 'Ash Prime Chassis Blueprint', count: 1 }, sharedDropIndex ||= buildDropIndex(harness.exportsBundle))
  const relics = rows.filter((source) => source.type === 'relic')
  assert.ok(relics.length > 0)
  assert.equal(new Set(relics.map((source) => source.relicName)).size, relics.length)
  assert.ok(relics.every((source) => source.chance === undefined && source.state === undefined))
})

test('real data: Farming Targets relic coverage and refinement chances remain unchanged', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/relic-places.json', import.meta.url)))
  const rows = buildRelicPlaces(fixture)
  assert.deepEqual(rows[0].place.refinements, { Intact: 2, Exceptional: 1, Flawless: 0, Radiant: 1 })
  assert.deepEqual(rows[0].coveredItems[0].chances, { Intact: 0.02, Exceptional: 0.04, Flawless: 0.06, Radiant: 0.1 })
})

test('real data: live Voidgel Orb sources replace the truncated override summary', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const result = await acquisition(harness, '/Lotus/Types/Gameplay/Zariman/Resources/ZarimanMiscItemA', 'Voidgel Orb')
  assert.ok(result.sources.length > 6)
  assert.ok(result.sources.every((source) => !/\+\d+ more sources/i.test(source.text || '')))
  assert.equal(result.sources.some((source) => source.type === 'mission'), true)
})

test('real data: Salvage keeps Conclave drops without the decoration blurb', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const result = await acquisition(harness, '/Lotus/Types/Items/MiscItems/Salvage', 'Salvage')
  assert.ok(result.sources.some((source) => source.type === 'mission'))
  assert.ok(result.sources.every((source) => !/vast selection of decorations|exclusive to bundles/i.test(source.text || '')))
  assert.ok(result.sources.some((source) => source.type === 'non-drop' && /30 Platinum for 3000 Salvage/i.test(source.text || '') && source.source === 'Warframe Wiki (wiki.warframe.com/w/Salvage)'))
  assert.ok(result.sources.some((source) => source.type === 'non-drop' && /Carme \(Mobile Defense\) on Jupiter/i.test(source.text || '') && source.source === 'Warframe Wiki (wiki.warframe.com/w/Salvage)'))
  assert.ok(result.sources.some((source) => source.type === 'non-drop' && /Olympus \(Disruption\) on Mars/i.test(source.text || '') && source.source === 'Warframe Wiki (wiki.warframe.com/w/Salvage)'))
  assert.ok(result.sources.every((source) => !/ship decoration|decoration blurb/i.test(source.text || '')))
})

test('real data: quantity-prefixed Orokin Cell does not create a blueprint display key', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const index = buildDropIndex(harness.exportsBundle)
  assert.equal(index['display:2x orokin cell blueprint'], undefined)
  assert.equal(index['/Lotus/Types/Items/MiscItems/OrokinCell']?.length > 0, true)
  assert.equal(index['/Lotus/Types/Recipes/WarframeRecipes/NarinChassisBlueprint']?.length, 3)
  assert.equal(index['/Lotus/Types/Recipes/WarframeRecipes/CitrinePrimeChassisBlueprint']?.length, 8)
  assert.equal(index['/Lotus/Types/Recipes/Weapons/GrimoireBlueprint']?.length || 0, 0)
})

test('real data: Orokin Cell blueprint origin is the recipe-derived Market price', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const result = await acquisition(harness, '/Lotus/Types/Items/MiscItems/OrokinCell', 'Orokin Cell')
  const { resolveBlueprintOrigin } = await import('../../src/lib/acquisitionData.js')
  assert.equal(result.recipe.blueprintPlatinumCost, 100)
  assert.equal(resolveBlueprintOrigin('Orokin Cell', result.recipe), 'Market Blueprint: 100 Platinum')
  assert.doesNotMatch(resolveBlueprintOrigin('Orokin Cell', result.recipe), /Saturn|Ceres|Deimos|enemy drops/i)
})

test('real data: excluded recipes never expose creditsCost as a Market blueprint price', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const { buildRecipeResultIndex } = await import('../../src/lib/acquisitionInfo.js')
  const recipeIndex = buildRecipeResultIndex(harness.exportsBundle)
  for (const recipe of Object.values(harness.exportsBundle.ExportRecipes || {})) {
    if (recipe?.excludeFromMarket !== true || !recipe?.creditsCost) continue
    const indexed = recipeIndex.get(recipe.resultType)
    if (!indexed) continue
    assert.equal(indexed?.blueprintMarketEligible, false)
    assert.equal(indexed?.blueprintCost, null)
  }
})

test('real data: non-Prime priced recipes retain their verified blueprint prices', { skip: !haveRealData }, async () => {
  const harness = await sharedHarness()
  const { buildRecipeResultIndex } = await import('../../src/lib/acquisitionInfo.js')
  const recipeIndex = buildRecipeResultIndex(harness.exportsBundle)
  const samples = [
    ['/Lotus/Types/Items/Ships/ZarimanShip', 70000, null],
    ['/Lotus/Types/Items/MiscItems/NeuralSensor', null, 100],
  ]
  for (const [resultType, creditsCost, platinumCost] of samples) {
    const indexed = recipeIndex.get(resultType)
    assert.equal(indexed?.blueprintMarketEligible, true)
    if (creditsCost != null) assert.equal(indexed?.blueprintCost, creditsCost)
    if (platinumCost != null) assert.equal(indexed?.blueprintPlatinumCost, platinumCost)
  }
})
