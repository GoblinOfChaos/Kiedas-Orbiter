import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze } from '../../scripts/supplement-freshness.mjs'

const base = {
  ExportWarframes: { '/Lotus/Powersuits/Test/Test': { name: 'Test' } },
  ExportWeapons: { '/Lotus/Weapons/TestPrime': { name: 'Test Prime', productCategory: 'LongGuns', noise: true } },
  ExportCustoms: { '/Lotus/Upgrades/Skins/Test/TestSkin': { name: 'Test Skin', icon: '/x' } },
  ExportUpgrades: {},
  ExportRecipes: { '/Lotus/Recipes/Test': { ingredients: [{ ItemType: '/Lotus/Weapons/TestPrime/WeaponParts/TestPrimeBarrel' }] } },
  ExportRelicArcane: {}, ExportResources: {}, ExportFlavour: {}, ExportGear: {}, ExportSentinels: {},
}

const baseline = {
  ExportWarframes: { '/Lotus/Powersuits/Existing/Existing': { name: 'Existing' } },
  ExportWeapons: {}, ExportCustoms: {}, ExportUpgrades: {}, ExportRecipes: {},
  ExportRelicArcane: {}, ExportResources: {}, ExportFlavour: {}, ExportGear: {}, ExportSentinels: {},
}

test('reports DE-only records and rule mismatches without mutating input', () => {
  const curated = {
    acquisition: [], relics: {}, cosmetics: {}, modIcons: {}, authoritativeIcons: {}, songVendors: new Set(),
  }
  const before = JSON.stringify(base)
  const { result } = analyze({ de: base, baseline, curated })
  assert.ok(result['warframe-items-acquisition.json'].some((item) => item.includes('/Lotus/Powersuits/Test/Test')))
  assert.ok(result['cosmetic-catalog-additions.json'].some((item) => item.includes('TestSkin')))
  assert.deepEqual(result.PRIME_PART_PATH_RE, [])
  assert.equal(JSON.stringify(base), before)
})

test('accepts canonical StoreItems paths in curated records', () => {
  const de = { ...base, ExportWeapons: {} }
  const curated = {
    acquisition: [{ uniqueName: '/Lotus/Weapons/Test' }], relics: {}, cosmetics: {}, modIcons: {}, authoritativeIcons: {}, songVendors: new Set(),
  }
  const { result } = analyze({ de, baseline, curated })
  assert.equal(result['warframe-items-acquisition.json'].length, 1)
})

test('uses supplement keys instead of object indexes or incomplete-file membership', () => {
  const de = {
    ...base,
    ExportWarframes: {},
    ExportCustoms: { '/Lotus/Upgrades/Skins/Test/TestSkin': { name: 'Test Skin', icon: '/x' } },
  }
  const curated = {
    acquisition: [{ uniqueName: '/Lotus/StoreItems/Weapons/TestPrime' }],
    relics: { 'Test Prime': { Parts: { Barrel: { Drops: { 'Axi A1': 'Rare' } } } } },
    cosmetics: { '/Lotus/StoreItems/Upgrades/Skins/Test/TestSkin': { name: 'Test Skin' } },
    modIcons: {},
  }
  const { result } = analyze({ de, baseline, curated })
  assert.equal(result['warframe-items-acquisition.json'].length, 0)
  assert.equal(result['cosmetic-catalog-additions.json'].length, 0)
  assert.equal(result['wiki-prime-relic-drops.json'].length, 0)
})
