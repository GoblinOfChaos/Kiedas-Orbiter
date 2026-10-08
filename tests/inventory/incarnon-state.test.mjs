import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json')
const wikiStore = '/home/jedwards/kiedas-orbiter/wiki_store/pages.jsonl'
const haveRealData = fs.existsSync(inventoryFile) && fs.existsSync(wikiStore)

async function getStateRule() {
  return import(path.join(root, 'src/lib/incarnonState.js'))
}

function savedWikiFamilies(exportsBundle) {
  const normalizedName = (value) => String(value).toLocaleLowerCase('en-US')
  const page = fs.readFileSync(wikiStore, 'utf8').split('\n').find((line) => line.includes('"title":"Incarnon"'))
  const { wikitext } = JSON.parse(page)
  const membersByGenesisName = new Map([...wikitext.matchAll(/([A-Za-z0-9&]+)IncarnonGenesis\.png\|link=([^|]+)\|\{\{Resource\|([^}]+)\}\}<br\/>\(([^)]*)\)/g)]
    .map(([, , , resource, weapons]) => [resource, [...weapons.matchAll(/\{\{Weapon\|([^}|]+)/g)].map((match) => match[1])]))
  const membersByName = new Map()
  for (const [uniqueName, item] of Object.entries(exportsBundle.ExportWeapons ?? {})) {
    if (typeof item?.name !== 'string') continue
    const members = membersByName.get(normalizedName(item.name)) ?? []
    members.push(uniqueName)
    membersByName.set(normalizedName(item.name), members)
  }
  const familyMap = new Map()
  for (const [adapter, item] of Object.entries(exportsBundle.ExportResources ?? {})) {
    if (!adapter.includes('IncarnonUnlocker')) continue
    const names = membersByGenesisName.get(item?.name)
    if (names) familyMap.set(adapter, new Set(names.flatMap((name) => membersByName.get(normalizedName(name)) ?? [])))
  }
  return familyMap
}

test('synthetic: records and exact adapter families decide the Incarnon flag', async () => {
  const { isIncarnonWeapon } = await getStateRule()
  const families = new Map([['/Adapters/BratonIncarnonUnlocker', new Set(['/Weapons/Braton', '/Weapons/BratonPrime'])]])
  assert.equal(isIncarnonWeapon({ unique_name: '/Weapons/Laetum' }, new Set(['/Weapons/Laetum']), new Set(), families), true)
  assert.equal(isIncarnonWeapon({ unique_name: '/Weapons/BratonPrime' }, new Set(), new Set(), families), false)
  assert.equal(isIncarnonWeapon({ unique_name: '/Weapons/BratonPrime' }, new Set(), new Set(['/Adapters/BratonIncarnonUnlocker']), families), true)
  assert.equal(isIncarnonWeapon({ unique_name: '/Weapons/BurstonPrime' }, new Set(), new Set(['/Adapters/BratonIncarnonUnlocker']), families), false)
})

test('real data: every installed record is yes and every yes has a record or owned wiki family', { skip: !haveRealData }, async () => {
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en', repo: process.env.P67_REAL_DATA_REPO || root })
  const { parseInventory } = await import(path.join(root, 'src/lib/inventoryParser.js'))
  const parsed = parseInventory(raw, exportsBundle, dict, 'en', null)
  const records = new Set((raw.EvolutionProgress ?? []).map((record) => record?.ItemType).filter(Boolean))
  const adapters = new Set((raw.MiscItems ?? []).map((item) => item?.ItemType).filter((itemType) => String(itemType).includes('IncarnonUnlocker')))
  const familyMap = savedWikiFamilies(exportsBundle)
  const coveredByOwnedFamily = new Set([...adapters].flatMap((adapter) => [...(familyMap.get(adapter) ?? [])]))
  const weapons = parsed.weapons ?? []

  for (const uniqueName of records) {
    const recordWeapons = weapons.filter((weapon) => weapon.unique_name === uniqueName)
    assert.ok(recordWeapons.length > 0, `EvolutionProgress weapon is absent: ${uniqueName}`)
    assert.ok(recordWeapons.every((weapon) => weapon.is_incarnon), `EvolutionProgress weapon is not Incarnon: ${uniqueName}`)
  }
  const outsideEvidence = weapons.filter((weapon) => weapon.is_incarnon && !records.has(weapon.unique_name) && !coveredByOwnedFamily.has(weapon.unique_name))
  assert.deepEqual(outsideEvidence.map((weapon) => weapon.unique_name), [], 'Incarnon weapons need their own record or an owned exact wiki family')
})
