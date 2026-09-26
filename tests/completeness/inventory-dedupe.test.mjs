import test from 'node:test'
import assert from 'node:assert/strict'
import '../../scripts/lib/real-data-harness.mjs'

const { isExcludedInventoryResourceEntry, reconcileInventoryBuckets } = await import('../../src/lib/inventoryParser.js')
const { checkInventoryDuplicates } = await import('../../scripts/item-completeness.mjs')

test('inventory dedupe keeps the specific bucket and merges quantities', () => {
  const parts = [{ unique_name: '/Lotus/Part', name: 'Part', quantity: 2, blueprint_quantity: 1, owned: true }]
  const resources = [{ unique_name: '/Lotus/StoreItems/Part', name: 'Part', quantity: 3, blueprint_quantity: 4, owned: true }]
  const summary = reconcileInventoryBuckets({ parts, resources })
  assert.equal(parts.length, 1)
  assert.equal(resources.length, 0)
  assert.equal(parts[0].quantity, 5)
  assert.equal(parts[0].blueprint_quantity, 5)
  assert.equal(summary.duplicateUniqueNames, 1)
})

test('same-name DE catalog aliases merge, while distinct variants get readable suffixes', () => {
  const resources = [
    { unique_name: '/Lotus/Types/Items/MiscItems/Resource', name: 'Resource', description: 'same', image: 'same', quantity: 1 },
    { unique_name: '/Lotus/Types/Items/MiscItems/ResourceTutorial', name: 'Resource', description: 'same', image: 'same', quantity: 2 },
    { unique_name: '/Lotus/Types/Items/Fish/FishItem', name: 'Fish', description: 'same', image: 'fish' },
    { unique_name: '/Lotus/Types/Items/Fish/FishItemLarge', name: 'Fish', description: 'same', image: 'fish' },
  ]
  const summary = reconcileInventoryBuckets({ resources })
  assert.equal(resources.length, 3)
  assert.equal(resources.find((item) => item.unique_name.endsWith('Resource'))?.quantity, 3)
  assert.deepEqual(new Set(resources.filter((item) => item.name.startsWith('Fish')).map((item) => item.name)), new Set(['Fish (Fish)', 'Fish (Fish Large)']))
  assert.equal(summary.duplicateCatalogRecords, 1)
})

test('VoidProjection DE records are excluded from Resources', () => {
  assert.equal(isExcludedInventoryResourceEntry({ parentName: '/Lotus/Types/Game/VoidProjectionItem' }, '/Lotus/Types/Game/Projections/T1VoidProjectionBronze'), true)
  assert.equal(isExcludedInventoryResourceEntry({ parentName: '/Lotus/Types/Items/MiscItems/ResourceItem' }, '/Lotus/Types/Items/MiscItems/Ferrite'), false)
})

test('completeness matrix reports duplicate unique names and template markers', () => {
  const result = checkInventoryDuplicates({ parsed: { all: [
    { unique_name: '/Lotus/A', category: 'resources', name: 'A' },
    { unique_name: '/Lotus/StoreItems/A', category: 'parts', name: 'A' },
    { unique_name: '/Lotus/B', category: 'resources', name: '|ERA| |CATEGORY| Relic' },
  ] } })
  assert.equal(result.pass, false)
  assert.equal(result.duplicateUniqueNames.length, 1)
  assert.equal(result.templateMarkers.length, 1)
})
