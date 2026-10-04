import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

const inventoryFile = path.join(
  process.env.HOME,
  '.local/share/kiedas-orbiter-preview/data/user/inventory.json',
)

test('real inventory lists all four extractors with DE images and correct drone ownership', async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness()
  const { parseInventory } = await import(process.env.P7_PARSER_PATH || path.join(repo, 'src/lib/inventoryParser.js'))
  assert.ok(fs.existsSync(inventoryFile), 'real inventory is required for this regression')

  const parsed = parseInventory(JSON.parse(fs.readFileSync(inventoryFile, 'utf8')), exportsBundle, dict, 'en', null)
  assert.equal(parsed.extractors.length, 4)
  const extractorNames = [
    'Distilling Extractor',
    'Distilling Extractor Prime',
    'Titan Extractor',
    'Titan Extractor Prime',
  ]
  const extractors = parsed.all.filter((item) => extractorNames.includes(item.name))
  const byName = new Map(extractors.map((item) => [item.name, item]))

  assert.deepEqual([...byName.keys()].sort(), [
    'Distilling Extractor',
    'Distilling Extractor Prime',
    'Titan Extractor',
    'Titan Extractor Prime',
  ])
  assert.equal(byName.get('Distilling Extractor')?.owned, true)
  assert.equal(byName.get('Distilling Extractor')?.quantity, 1)
  for (const name of ['Titan Extractor', 'Titan Extractor Prime', 'Distilling Extractor Prime']) {
    assert.equal(byName.get(name)?.owned, false, `${name} should be unowned in the real inventory`)
  }
  for (const item of byName.values()) {
    assert.match(item.image, /^asset-cache:\/\/content\.warframe\.com\/PublicExport/)
  }

  const blueprintOnly = parseInventory({
    Recipes: [{ ItemType: '/Lotus/Types/Recipes/Drones/BasicResourceDroneBlueprint', ItemCount: 2 }],
  }, exportsBundle, dict, 'en', null)
  const blueprint = blueprintOnly.extractors.find((item) => item.name === 'Titan Extractor')
  assert.equal(blueprint.owned, false)
  assert.equal(blueprint.blueprintOwned, true)
  assert.equal(blueprint.blueprint_quantity, 2)
})

test('real extractor acquisition data keeps current routes only', async () => {
  const harness = await loadRealHarness()
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import(process.env.P7_ACQUISITION_INFO_PATH || '../../src/lib/acquisitionInfo.js')
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const overrides = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url), 'utf8'))
  const getInfo = (uniqueName, displayName) => getAcquisitionInfo(
    uniqueName,
    displayName,
    {},
    overrides,
    indexes.recipeResultIndex,
    indexes.marketIndex,
    indexes.bundleIndex,
    indexes.syndicateIndex,
    indexes.wikiSigilIndex,
    indexes.wikiVendorIndex,
    indexes.wikiTennoGenIndex,
    indexes.wikiBaroIndex,
    indexes.exportVendorIndex,
    indexes.alwaysAvailableIndex,
    indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex,
    indexes.wikiResearchIndex,
    indexes.relicStateIndex,
    indexes.wikiResourceIndex,
    indexes.wikiPageAcquisitionIndex,
    indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex,
    indexes.exportComponentIndex,
  )

  const titanPrime = getInfo('/Lotus/Types/Ship/AdvancedResourceDrone', 'Titan Extractor Prime')
  const distillingPrime = getInfo('/Lotus/Types/Ship/AdvancedUcResourceDrone', 'Distilling Extractor Prime')
  for (const [name, info] of [['Titan Extractor Prime', titanPrime], ['Distilling Extractor Prime', distillingPrime]]) {
    assert.equal(info.sources.length, 1, `${name} should have one current route row`)
    const text = info.sources.map((source) => source.text).join(' ')
    assert.equal(text, 'Vaulted: not sold in the Market. Obtainable through Prime Resurgence when it is in rotation.')
    assert.doesNotMatch(text, /Prime Access|Prime Vault|originally|formerly|previously|returned|\b(?:19|20)\d{2}\b/i)
  }

  const titan = getInfo('/Lotus/Types/Ship/BasicResourceDrone', 'Titan Extractor')
  const titanText = titan.sources.map((source) => source.text).join(' ')
  assert.match(titanText, /50,000/)
  assert.match(titanText, /reusable/i)
})
