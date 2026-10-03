import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { buildRelicPlaces } from '../../src/lib/farmingTargets/relicPlaces.js'

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
