import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

const inventoryFile = path.join(
  process.env.HOME,
  '.local/share/kiedas-orbiter-preview/data/user/inventory.json',
)
const haveRealData = fs.existsSync(inventoryFile)
const RAILJACK_PREFIX = '/Lotus/Upgrades/Skins/RailJack/'

const BASELINE_COUNTS = {
  warframes: 118,
  primary: 196,
  secondary: 147,
  melee: 224,
  kitguns: 6,
  zaws: 37,
  sentinels: 16,
  moas: 0,
  hounds: 0,
  beasts: 17,
  archwings: 5,
  kdrives: 5,
  archweapons: 28,
  necramechs: 2,
  amps: 9,
  mods: 1164,
  arcanes: 154,
  consumables: 112,
  landing_craft: 3,
  resources: 1119,
  components: 57,
  rivens: 52,
}

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
  assert.equal(expected.size, 56, 'DE Railjack catalog size should be measured and remain below the truncation threshold')

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

test('real inventory lists all six Drifter melee weapons with DE names and images', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness()
  const { parseInventory } = await import(process.env.P23_PARSER_PATH || path.join(repo, 'src/lib/inventoryParser.js'))
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const expected = (inventory.DrifterMelee ?? []).map((entry) => entry.ItemType)
  assert.equal(expected.length, 6)

  const parsed = parseInventory(inventory, exportsBundle, dict, 'en', null)
  const byUniqueName = new Map(parsed.melee.map((item) => [item.unique_name, item]))
  for (const uniqueName of expected) {
    const item = byUniqueName.get(uniqueName)
    assert.ok(item, `missing Drifter melee weapon ${uniqueName}`)
    assert.equal(item.owned, true)
    assert.equal(item.quantity, 1)
    assert.ok(item.name && !item.name.startsWith('/Lotus/'))
    assert.match(item.image, /^asset-cache:\/\/content\.warframe\.com\/PublicExport/)
  }
})

test('P23 leaves every unrelated real-inventory category count unchanged', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness()
  const { parseInventory } = await import(process.env.P23_PARSER_PATH || path.join(repo, 'src/lib/inventoryParser.js'))
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const parsed = parseInventory(inventory, exportsBundle, dict, 'en', null)

  for (const [category, count] of Object.entries(BASELINE_COUNTS)) {
    if (category === 'melee') continue
    assert.equal(parsed[category]?.length, count, `${category} changed unexpectedly`)
  }
  assert.equal(parsed.melee.length, BASELINE_COUNTS.melee + 6)
  assert.equal(parsed.parts.length, 825 + 56)
})
