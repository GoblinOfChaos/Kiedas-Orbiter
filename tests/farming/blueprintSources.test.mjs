import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'

const overrides = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url)))
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
let harnessPromise
let indexesPromise
let dropIndex

async function getContext() {
  const harness = await (harnessPromise ||= loadRealHarness({ locale: 'en' }))
  const { buildAllAcquisitionIndexes } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = await (indexesPromise ||= buildAllAcquisitionIndexes(harness.exportsBundle))
  dropIndex ||= buildDropIndex(harness.exportsBundle)
  return { harness, indexes }
}

async function acquisition(uniqueName, displayName) {
  const { getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const { indexes } = await getContext()
  return getAcquisitionInfo(
    uniqueName, displayName, dropIndex, overrides,
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  )
}

function sourceTexts(result) {
  return result.sources.map((source) => source.text || source.location || source.relicName)
}

test('real data: Ash item and blueprint expose distinct Platinum, Credits, and Simaris routes', { skip: !haveRealData }, async () => {
  const ash = await acquisition('/Lotus/Powersuits/Ninja/Ninja', 'Ash')
  const ashBlueprint = await acquisition('/Lotus/Types/Recipes/WarframeRecipes/AshBlueprint', 'Ash Blueprint')
  for (const result of [ash, ashBlueprint]) {
    const texts = sourceTexts(result)
    assert.equal(texts.length, 3)
    assert.equal(new Set(texts).size, 3)
    assert.ok(texts.some((text) => /375 Platinum/i.test(text)))
    assert.ok(texts.some((text) => /35,000 Credits/i.test(text)))
    assert.ok(texts.some((text) => /Simaris/i.test(text)))
  }
})

test('real data: named non-Prime Warframe blueprint parts resolve through their result item', { skip: !haveRealData }, async () => {
  for (const name of ['Excalibur', 'Mag', 'Volt']) {
    const result = await acquisition(
      `/Lotus/Types/Recipes/WarframeRecipes/${name === 'Volt' ? 'VOLT' : name}Blueprint`,
      `${name} Blueprint`,
    )
    assert.ok(result.sources.length > 0, `${name} Blueprint has no acquisition source`)
  }
})

test('real data: main Warframe blueprint parts are not empty when their Warframe has a source', { skip: !haveRealData }, async () => {
  const { harness } = await getContext()
  const frameEntries = new Set(Object.keys(harness.exportsBundle.ExportWarframes || {}))
  const rows = Object.entries(harness.exportsBundle.ExportRecipes || {}).filter(([blueprintUniqueName, recipe]) =>
    /^\/Lotus\/Types\/Recipes\/WarframeRecipes\/[^/]+Blueprint$/.test(blueprintUniqueName)
    && !/(Prime|Chassis|Neuroptics|Systems|Helmet|Harness|Wings)Blueprint$/i.test(blueprintUniqueName)
    && frameEntries.has(recipe?.resultType),
  )
  assert.equal(rows.length, 67)
  for (const [blueprintUniqueName, recipe] of rows) {
    const frame = harness.exportsBundle.ExportWarframes[recipe.resultType]
    const nameKey = frame?.name
    const name = harness.dict[nameKey] || harness.dict[`/${nameKey}`] || nameKey
    const parent = await acquisition(recipe.resultType, name)
    const blueprint = await acquisition(blueprintUniqueName, `${name} Blueprint`)
    if (parent.sources.length > 0) {
      assert.ok(blueprint.sources.length > 0, `${name} Blueprint is empty while ${name} has a source`)
    }
  }
})

test('real data: a Dojo blueprint route remains visible on a non-Prime Warframe', { skip: !haveRealData }, async () => {
  const result = await acquisition('/Lotus/Types/Recipes/WarframeRecipes/WukongBlueprint', 'Wukong Blueprint')
  assert.ok(result.sources.some((source) => /Clan Dojo|Tenno Lab/i.test(source.text || '')))
})
