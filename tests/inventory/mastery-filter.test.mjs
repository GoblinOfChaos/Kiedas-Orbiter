import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { awardsMastery } from '../../src/lib/masteryState.js'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json')
const haveRealData = fs.existsSync(inventoryFile)

test('synthetic: listed items award mastery, a consumable and an unlisted name do not', () => {
  assert.equal(awardsMastery({ name: 'Venari' }), true)
  assert.equal(awardsMastery({ name: 'Air Support Charges' }), false)
  assert.equal(awardsMastery({ name: 'Scrap Resource' }), false)
  assert.equal(awardsMastery({}), false)
})

test('synthetic: a blueprint and a qualified name count through the listed item', () => {
  // Kubrow and Kavat companions award mastery; their weapons do not.
  assert.equal(awardsMastery({ name: 'Chesa Kubrow (Chow Chow)' }), true)
  assert.equal(awardsMastery({ name: 'Chow Chow (Chesa Kubrow)' }), true)
  assert.equal(awardsMastery({ name: 'Ash Prime Blueprint' }), true)
  assert.equal(awardsMastery({ name: 'Unlisted Thing', parent_name: 'Ash Prime' }), true)
})

test('real data: named cases from the mastery review', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const { parseInventory } = await import(path.join(root, 'src/lib/inventoryParser.js'))
  const parsed = parseInventory(raw, exportsBundle, dict, 'en', null)
  const byName = new Map()
  for (const list of Object.values(parsed)) if (Array.isArray(list)) for (const i of list) if (i?.name && !byName.has(i.name)) byName.set(i.name, i)

  for (const name of ['Venari', 'Venari Prime', 'Cantic Prism', 'Granmu Prism', 'Rahn Prism', 'Shwaak Prism', 'Bad Baby']) {
    const item = byName.get(name)
    if (item) assert.equal(awardsMastery(item), true, `${name} awards mastery`)
  }
  for (const name of ['Air Support Charges', 'Garuda Prime Talons', 'Ekwana Jai', 'Jai']) {
    const item = byName.get(name)
    if (item) assert.equal(awardsMastery(item), false, `${name} does not award mastery`)
  }
})
