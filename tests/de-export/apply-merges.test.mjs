import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'

const frame = '/Lotus/Powersuits/Test/Test'
const weapon = '/Lotus/Weapons/Test/Test'
const recipe = '/Lotus/Types/Recipes/WarframeRecipes/TestBlueprint'
const resource = '/Lotus/Types/Items/Resources/Test'
const custom = '/Lotus/Upgrades/Skins/Test/TestSkin'
const emote = '/Lotus/Types/Items/Emotes/TestEmote'

test('apply-merges matches the hand-made Rust-shape fixture', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'apply-merges-test-'))
  const dataDir = path.join(root, 'data')
  const out = path.join(root, 'out')
  const cacheDir = path.join(root, 'cache')
  const exportDir = path.join(dataDir, 'export')
  await fs.mkdir(exportDir, { recursive: true })
  await fs.mkdir(path.join(cacheDir, 'assets'), { recursive: true })
  const suffixes = { ExportWarframes: 'warframes', ExportWeapons: 'weapons', ExportRecipes: 'recipes', ExportResources: 'resources', ExportRelicArcane: 'relic-arcane', ExportUpgrades: 'upgrades', ExportCustoms: 'customs', ExportFlavour: 'flavour', ExportManifest: 'manifest' }
  await fs.writeFile(path.join(cacheDir, 'provenance.json'), JSON.stringify({ categories: Object.fromEntries(Object.entries(suffixes).map(([category, suffix]) => [category, { suffix }])) }))
  const app = {
    ExportWarframes: { [frame]: { uniqueName: frame, name: '/mirror/name', health: 10 } },
    ExportWeapons: { [weapon]: { uniqueName: weapon, name: '/mirror/weapon', totalDamage: 10 } },
    ExportRecipes: {}, ExportResources: {}, ExportRelics: {}, ExportArcanes: {}, ExportUpgrades: {}, ExportCustoms: {}, ExportFlavour: {}, ExportImages: {},
  }
  for (const [name, value] of Object.entries(app)) await fs.writeFile(path.join(exportDir, `${name}.json`), JSON.stringify(value))
  const manifest = { Manifest: [{ uniqueName: frame, textureLocation: '/Lotus/Test.png!hash' }, { uniqueName: resource, textureLocation: '/Lotus/Resource.png!resource-hash' }, { uniqueName: custom, textureLocation: '/Lotus/Custom.png!custom-hash' }] }
  const de = {
    ExportWarframes: [{ uniqueName: frame, name: 'Test', health: 20 }],
    ExportWeapons: [{ uniqueName: weapon, name: 'Weapon', totalDamage: 20 }],
    ExportRecipes: [{ uniqueName: recipe, resultType: frame, ingredients: [] }],
    ExportResources: [{ uniqueName: resource, name: 'Resource' }],
    ExportRelicArcane: [{ uniqueName: '/Lotus/Types/Game/Relics/TestRelic', category: 'Lith' }, { uniqueName: '/Lotus/Types/Items/ArcaneEnhancements/TestArcane', rarity: 'Rare' }],
    ExportUpgrades: [{ uniqueName: '/Lotus/Powersuits/Test/NewAugmentCard', name: 'New Mod', levelStats: [{ stats: ['new'] }] }],
    ExportCustoms: [{ uniqueName: custom, name: 'Test Skin' }], ExportFlavour: [{ uniqueName: emote, name: 'Test Emote' }],
    ExportManifest: manifest,
    ExportRelics: {}, ExportArcanes: {},
  }
  for (const [category, suffix] of Object.entries(suffixes)) {
    const value = category === 'ExportManifest' ? de[category] : de[category]
    await fs.writeFile(path.join(cacheDir, 'assets', `${suffix}.json`), JSON.stringify(value))
  }
  try {
    await applyMerges({ dataDir, out, cacheDir })
    const read = async (name) => JSON.parse(await fs.readFile(path.join(out, 'export', name), 'utf8'))
    assert.deepEqual(await read('ExportWarframes.json'), {
      [frame]: { health: 20, name: '/mirror/name', uniqueName: frame, icon: '/Lotus/Test.png' },
    })
    assert.deepEqual(await read('ExportWeapons.json'), {
      [weapon]: { name: '/mirror/weapon', totalDamage: 20, uniqueName: weapon },
    })
    assert.deepEqual(await read('ExportRecipes.json'), {
      [recipe]: { ingredients: [], resultType: frame, uniqueName: recipe },
    })
    assert.deepEqual(await read('ExportResources.json'), {
      [resource]: { icon: '/Lotus/Resource.png', name: 'Resource', uniqueName: resource },
    })
    assert.deepEqual(await read('ExportImages.json'), {
      '/Lotus/Custom.png': { contentHash: 'custom-hash' },
      '/Lotus/Resource.png': { contentHash: 'resource-hash' },
      '/Lotus/Test.png': { contentHash: 'hash' },
    })
    const upgrades = await read('ExportUpgrades.json')
    assert.equal(upgrades['/Lotus/Powersuits/Test/NewAugmentCard'].name, 'New Mod')
    assert.deepEqual(upgrades['/Lotus/Powersuits/Test/NewAugmentCard'].levelStats, [{ stats: ['new'] }])
    assert.equal((await read('ExportCustoms.json'))[custom].icon, '/Lotus/Custom.png')
    assert.equal((await read('ExportFlavour.json'))[emote].icon, undefined)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
