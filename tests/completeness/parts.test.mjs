import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { goldenHarness } from './fixtures.mjs'

test('synthetic recipe parts are separate owned/unowned inventory items', async () => {
  const { parseInventory } = await import('../../src/lib/inventoryParser.js')
  const harness = goldenHarness()
  const parsed = parseInventory({
    Recipes: [{ ItemType: '/Lotus/Types/Recipes/WarframeRecipes/TestFrameChassisBlueprint', ItemCount: 2 }],
    MiscItems: [{ ItemType: '/Lotus/Types/Recipes/WarframeRecipes/TestFrameChassisComponent', ItemCount: 1 }],
  }, harness.exportsBundle, harness.dict, 'en', null)
  const part = parsed.parts.find((item) => item.name === 'Test Frame Chassis')
  const blueprint = parsed.parts.find((item) => item.name === 'Test Frame Blueprint')
  assert.ok(part)
  assert.equal(part.quantity, 1)
  assert.equal(part.blueprint_quantity, 2)
  assert.equal(part.owned, true)
  assert.ok(blueprint?.image)
  assert.equal(parsed.parts.filter((item) => item.unique_name === part.unique_name).length, 1)
})

test('real merged exports contain Narin parts and do not duplicate Volt Prime parts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'partsinv-real-'))
  try {
    const merged = await applyMerges({
      dataDir: '/home/jedwards/.local/share/kiedas-orbiter-preview/data',
      out: root,
      cacheDir: '/home/jedwards/.cache/kiedas-de-export',
    })
    const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root })
    const { parseInventory } = await import('../../src/lib/inventoryParser.js')
    const parsed = parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)
    const narin = parsed.parts.filter((item) => item.parent_name === 'Narin')
    assert.deepEqual(narin.map((item) => item.name).sort(), ['Narin Blueprint', 'Narin Chassis', 'Narin Neuroptics', 'Narin Systems'].sort())
    assert.ok(narin.every((item) => item.image))
    assert.equal(parsed.parts.some((item) => /Volt Prime/i.test(item.parent_name || '')), false)
    const existingBuckets = ['warframes', 'primary', 'secondary', 'melee', 'companions', 'resources', 'components', 'prime_parts']
    const countsBeforeParts = Object.fromEntries(existingBuckets.map((bucket) => [bucket, parsed[bucket]?.length ?? 0]))
    const countsAfterParts = Object.fromEntries(existingBuckets.map((bucket) => [bucket, parsed[bucket]?.length ?? 0]))
    assert.deepEqual(countsAfterParts, countsBeforeParts)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
