import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adaptRecipes } from '../../scripts/de-export/adapters/recipes.mjs'
import { adaptResources } from '../../scripts/de-export/adapters/resources.mjs'
import { addManifestIcons, mergeImages, mergeRecipes, mergeResources } from '../../scripts/de-export/adapters/merge-recipes.mjs'

const blueprint = '/Lotus/Types/Recipes/WarframeRecipes/NarinBlueprint'
const result = '/Lotus/Powersuits/Duelist/Duelist'
const component = '/Lotus/Types/Recipes/WarframeRecipes/NarinHelmetComponent'

test('adapts DE recipes and resources without inventing absent fields', () => {
  const recipes = adaptRecipes({ ExportRecipes: [{ uniqueName: blueprint, resultType: result, buildPrice: 25000, buildTime: 86400, ingredients: [{ ItemType: component, ItemCount: 1 }], future: true }] })
  const resources = adaptResources({ ExportResources: [{ uniqueName: component, name: 'Narin Neuroptics', description: 'DE text' }] })
  assert.equal(recipes[blueprint].future, true)
  assert.deepEqual(recipes[blueprint].ingredients, [{ ItemType: component, ItemCount: 1 }])
  assert.deepEqual(resources[component], { uniqueName: component, name: 'Narin Neuroptics', description: 'DE text' })
})

test('recipe merge takes only app-consumed DE fields and preserves both sides', () => {
  const { merged, report } = mergeRecipes({ [blueprint]: { uniqueName: blueprint, resultType: '/old', buildPrice: 1, buildTime: 2, name: 'mirror-only' }, '/mirror': { uniqueName: '/mirror' } }, { [blueprint]: { uniqueName: blueprint, resultType: result, buildPrice: 3, buildTime: 4, ingredients: [{ ItemType: component, ItemCount: 1 }], name: 'must-not-copy' }, '/de': { uniqueName: '/de', resultType: '/result' } })
  assert.equal(merged[blueprint].resultType, result)
  assert.equal(merged[blueprint].name, 'mirror-only')
  assert.equal(merged['/de'].resultType, '/result')
  assert.equal(merged['/mirror'].uniqueName, '/mirror')
  assert.deepEqual(report.mirrorOnly, ['/mirror'])
})

test('manifest images become hashed export image entries and item icons', () => {
  const manifest = { Manifest: [{ uniqueName: component, textureLocation: '/Lotus/Icon.png!00_hash' }] }
  const { merged, added } = mergeImages({}, manifest)
  assert.deepEqual(merged, { '/Lotus/Icon.png': { contentHash: '00_hash' } })
  assert.equal(added[0].uniqueName, component)
  const records = addManifestIcons(adaptResources([{ uniqueName: component, name: 'Narin Neuroptics' }]), manifest)
  assert.equal(records[component].icon, '/Lotus/Icon.png')
})

test('resource merge never drops mirror-only records', () => {
  const { merged, report } = mergeResources({ '/mirror': { uniqueName: '/mirror', name: 'Mirror' } }, { '/de': { uniqueName: '/de', name: 'DE' } })
  assert.equal(merged['/mirror'].name, 'Mirror')
  assert.equal(merged['/de'].name, 'DE')
  assert.deepEqual(report.mirrorOnly, ['/mirror'])
})
