import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sourceRoot = process.env.P70_SOURCE_ROOT || root
const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json')
const haveRealData = fs.existsSync(inventoryFile)
const typeButtons = ['primary', 'secondary', 'melee', 'zaw', 'kitgun']

function matchesTypeButton(item, type) {
  if (type === 'primary') return item.weapon_type === 'primary'
  if (type === 'secondary') return item.weapon_type === 'secondary'
  if (type === 'melee') return item.weapon_type === 'melee'
  if (type === 'zaw') return item.category === 'zaws'
  if (type === 'kitgun') return item.category === 'kitguns'
  throw new Error(`unknown weapon type button: ${type}`)
}

function matchingButtons(item) {
  return typeButtons.filter((type) => matchesTypeButton(item, type))
}

test('synthetic: each weapon type button matches only its exact bucket', () => {
  assert.deepEqual(matchingButtons({ category: 'zaws' }), ['zaw'])
  assert.deepEqual(matchingButtons({ category: 'kitguns' }), ['kitgun'])
  assert.deepEqual(matchingButtons({ weapon_type: 'primary', category: 'primary' }), ['primary'])
  assert.deepEqual(matchingButtons({ category: 'archwings' }), [])
})

test('Inventory wires all five buttons to their exact parser markers', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'src/screens/Inventory.jsx'), 'utf8')
  assert.match(source, /weapons:\s*\[[^\]]*'primary'[^\]]*'secondary'[^\]]*'melee'[^\]]*'zaw'[^\]]*'kitgun'/s)
  assert.match(source, /FILTER_GROUPS\s*=\s*\{[^}]*primary:\s*'weapon_type'[^}]*secondary:\s*'weapon_type'[^}]*melee:\s*'weapon_type'[^}]*zaw:\s*'weapon_type'[^}]*kitgun:\s*'weapon_type'/s)
  assert.match(source, /if \(f === 'primary' && item\.weapon_type !== 'primary'\) return false;/)
  assert.match(source, /if \(f === 'secondary' && item\.weapon_type !== 'secondary'\) return false;/)
  assert.match(source, /if \(f === 'melee' && item\.weapon_type !== 'melee'\) return false;/)
  assert.match(source, /if \(f === 'zaw' && item\.category !== 'zaws'\) return false;/)
  assert.match(source, /if \(f === 'kitgun' && item\.category !== 'kitguns'\) return false;/)
})

test('real data: every parser bucket lands in exactly its matching weapon type button', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const parserPath = process.env.P70_PARSER_PATH || path.join(root, 'src/lib/inventoryParser.js')
  const { parseInventory } = await import(parserPath)
  const parsed = parseInventory(raw, exportsBundle, dict, 'en', null)
  const weapons = parsed.weapons ?? []
  const zaws = weapons.filter((item) => item.category === 'zaws')
  const kitguns = weapons.filter((item) => item.category === 'kitguns')
  const otherEquipment = weapons.filter((item) => !['primary', 'secondary', 'melee', 'zaws', 'kitguns'].includes(item.category))

  assert.ok(zaws.length > 0, 'real inventory contains parsed Zaws')
  assert.ok(kitguns.length > 0, 'real inventory contains parsed Kitguns')
  for (const item of zaws) assert.deepEqual(matchingButtons(item), ['zaw'], `${item.name} is Zaw only`)
  for (const item of kitguns) assert.deepEqual(matchingButtons(item), ['kitgun'], `${item.name} is Kitgun only`)
  for (const item of otherEquipment) assert.deepEqual(matchingButtons(item), [], `${item.name} remains All-only`)
})
