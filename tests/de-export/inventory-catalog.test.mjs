import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'
import '../../scripts/lib/real-data-harness.mjs' // registers the extensionless .js import resolver used by src/

const { isExcludedInventoryResourceEntry, resourceFamilyForParent } = await import('../../src/lib/inventoryParser.js')

const dataDir = '/home/jedwards/.local/share/kiedas-orbiter-preview/data'
const cacheDir = '/home/jedwards/.cache/kiedas-de-export'

test('merged DE resource catalog has named, imaged samples for every family', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'inventory-catalog-'))
  try {
    await applyMerges({ dataDir, cacheDir, out: path.join(root, 'out') })
    const resources = JSON.parse(await fs.readFile(path.join(root, 'out/export/ExportResources.json'), 'utf8'))
    const families = new Map()
    for (const [uniqueName, entry] of Object.entries(resources)) {
      if (isExcludedInventoryResourceEntry(entry, uniqueName)) continue
      const family = resourceFamilyForParent(entry.parentName)
      if (!families.has(family) && entry.name && entry.icon) families.set(family, { uniqueName, entry })
    }
    assert.ok(families.size >= 8, `expected broad family coverage, got ${families.size}`)
    for (const [family, sample] of families) {
      assert.ok(sample.entry.name, `${family} sample has no name`)
      assert.ok(sample.entry.icon, `${family} sample has no image path`)
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('resource catalog excludes DE decoration and presentation parents', () => {
  assert.equal(isExcludedInventoryResourceEntry({ parentName: '/Lotus/Types/Items/ShipDecos/ShipDecoItem', productCategory: 'ShipDecorations' }), true)
  assert.equal(isExcludedInventoryResourceEntry({ parentName: '/Lotus/Types/Game/SongItem' }), true)
  assert.equal(isExcludedInventoryResourceEntry({ parentName: '/Lotus/Types/Items/Fish/FishItem', productCategory: 'MiscItems' }), false)
})
