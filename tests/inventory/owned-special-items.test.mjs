import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { cloneWithoutInventoryKeys } from '../helpers/real-data-fixtures.mjs'

const inventoryFile = path.join(
  process.env.HOME,
  '.local/share/kiedas-orbiter-preview/data/user/inventory.json',
)
const haveRealData = fs.existsSync(inventoryFile)
const RAILJACK_PREFIX = '/Lotus/Upgrades/Skins/RailJack/'

function exportNameExists(entry, dict) {
  const token = entry?.name ?? entry?.displayName
  if (typeof token !== 'string' || !token) return false
  if (!token.startsWith('/Lotus/')) return true
  const localized = dict[token] ?? dict[`/${token.replace(/^\/+/, '')}`]
  return typeof localized === 'string' && localized.length > 0 && !localized.startsWith('/Lotus/')
}

function expectedRailjackItems(inventory, exportsBundle, dict) {
  const quantities = new Map()
  for (const list of [inventory.CrewShipRawSalvage, inventory.CrewShipWeaponSkins]) {
    for (const entry of list ?? []) {
      if (!entry?.ItemType?.startsWith(RAILJACK_PREFIX)) continue
      quantities.set(entry.ItemType, (quantities.get(entry.ItemType) ?? 0) + (entry.ItemCount ?? 1))
    }
  }

  return new Map(Object.entries(exportsBundle.ExportCustoms ?? {})
    .filter(([uniqueName, entry]) => uniqueName.startsWith(RAILJACK_PREFIX) && exportNameExists(entry, dict))
    .map(([uniqueName]) => [uniqueName, quantities.get(uniqueName) ?? 0]))
}

test('real inventory lists the named Railjack catalog and aggregates ownership', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness()
  const { parseInventory } = await import(process.env.P23_PARSER_PATH || path.join(repo, 'src/lib/inventoryParser.js'))
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const expected = expectedRailjackItems(inventory, exportsBundle, dict)
  assert.ok(expected.size > 0, 'DE Railjack catalog has no named entries')

  const parsed = parseInventory(inventory, exportsBundle, dict, 'en', null)
  const railjack = parsed.parts.filter((item) => item.unique_name?.startsWith(RAILJACK_PREFIX))
  assert.equal(railjack.length, expected.size)
  assert.deepEqual(new Set(railjack.map((item) => item.unique_name)), new Set(expected.keys()))

  const byUniqueName = new Map(railjack.map((item) => [item.unique_name, item]))
  for (const [uniqueName, quantity] of expected) {
    const item = byUniqueName.get(uniqueName)
    assert.ok(item, `missing Railjack item ${uniqueName}`)
    assert.equal(item.quantity, quantity, `${uniqueName} quantity`)
    assert.equal(item.owned, quantity > 0, `${uniqueName} ownership`)
    assert.ok(item.name && !item.name.startsWith('/Lotus/'), `${uniqueName} must have a DE-export name`)
    assert.match(item.image, /^asset-cache:\/\/content\.warframe\.com\/PublicExport/)
  }

  const parsedUniqueNames = new Set(parsed.all.map((item) => item.unique_name))
  for (const entry of inventory.CrewShipRawSalvage ?? []) {
    if (!entry.ItemType.startsWith(RAILJACK_PREFIX)) assert.equal(parsedUniqueNames.has(entry.ItemType), false, `omitted Railjack weapon leaked into Inventory: ${entry.ItemType}`)
  }
})

test('real inventory lists each live Drifter melee weapon with a DE name and image', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness()
  const { parseInventory } = await import(process.env.P23_PARSER_PATH || path.join(repo, 'src/lib/inventoryParser.js'))
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const expected = (inventory.DrifterMelee ?? []).map((entry) => entry.ItemType)

  const parsed = parseInventory(inventory, exportsBundle, dict, 'en', null)
  const byUniqueName = new Map(parsed.melee.map((item) => [item.unique_name, item]))
  for (const uniqueName of expected) {
    const item = byUniqueName.get(uniqueName)
    assert.ok(item, `missing Drifter melee weapon ${uniqueName}`)
    assert.equal(item.owned, true)
    assert.ok(item.quantity > 0)
    assert.ok(item.name && !item.name.startsWith('/Lotus/'))
    assert.match(item.image, /^asset-cache:\/\/content\.warframe\.com\/PublicExport/)
  }
})

test('P23 leaves every unrelated real-inventory category count unchanged', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness()
  const { parseInventory } = await import(process.env.P23_PARSER_PATH || path.join(repo, 'src/lib/inventoryParser.js'))
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const parsed = parseInventory(inventory, exportsBundle, dict, 'en', null)
  const baselineInventory = cloneWithoutInventoryKeys(inventory, ['CrewShipRawSalvage', 'CrewShipWeaponSkins', 'DrifterMelee'])
  const baseline = parseInventory(baselineInventory, exportsBundle, dict, 'en', null)
  const expectedRailjack = expectedRailjackItems(inventory, exportsBundle, dict)
  const expectedDrifter = new Set((inventory.DrifterMelee ?? []).map((entry) => entry?.ItemType).filter(Boolean))

  for (const [category, baselineEntries] of Object.entries(baseline)) {
    if (!Array.isArray(baselineEntries) || category === 'melee' || category === 'parts' || category === 'allOwnedItemTypes') continue
    assert.equal(parsed[category]?.length, baselineEntries.length, `${category} changed unexpectedly`)
  }
  assert.deepEqual(
    new Set(parsed.parts.map((item) => item.unique_name).filter((uniqueName) => expectedRailjack.has(uniqueName))),
    new Set(expectedRailjack.keys()),
  )
  const parsedMelee = new Map(parsed.melee.map((item) => [item.unique_name, item]))
  for (const uniqueName of expectedDrifter) {
    assert.ok(parsedMelee.get(uniqueName), `missing Drifter melee weapon ${uniqueName}`)
  }
})
