import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { goldenHarness } from './fixtures.mjs'

test('synthetic recipe parts preserve blueprint and crafted quantities', async () => {
  const { parseInventory } = await import('../../src/lib/inventoryParser.js')
  const harness = goldenHarness()
  const parsed = parseInventory({
    Recipes: [{ ItemType: '/Lotus/Types/Recipes/WarframeRecipes/TestFrameChassisBlueprint', ItemCount: 2 }],
    MiscItems: [{ ItemType: '/Lotus/Types/Recipes/WarframeRecipes/TestFrameChassisComponent', ItemCount: 1 }],
  }, harness.exportsBundle, harness.dict, 'en', null)
  const part = parsed.parts.find((item) => item.parent_name === 'Test Frame Chassis')
  const blueprint = parsed.parts.find((item) => item.name === 'Test Frame Blueprint')
  assert.ok(part)
  assert.equal(part.quantity, 2)
  assert.equal(part.blueprint_quantity, 2)
  assert.equal(part.crafted_quantity, 1)
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
    assert.equal(parsed.resources.some((item) => /Narin/i.test(item.name || '') || /Narin/i.test(item.unique_name || '')), false)
    assert.equal(parsed.parts.some((item) => /Volt Prime/i.test(item.parent_name || '')), false)
    const allNames = parsed.all.map((item) => item.unique_name?.replaceAll('/StoreItems/', '/')).filter(Boolean)
    assert.equal(new Set(allNames).size, allNames.length)
    assert.equal(parsed.resources.some((item) => /\|ERA\||\|CATEGORY\|/.test(item.name || '')), false)
    assert.equal(parsed.warframes.length, 118)
    assert.equal(parsed.primary.length, 196)
    assert.equal(parsed.secondary.length, 147) // 148 before the Doppelganger Grimoire (category/slot mismatch) was excluded
    assert.equal(parsed.melee.length, 224)
    assert.equal(parsed.beasts.some((item) => /Adarza Kavat|Sahasa Kubrow/.test(item.name || '')), true)
    assert.equal(parsed.parts.some((item) => /Adarza Kavat|Sahasa Kubrow/.test(item.name || '')), false)
    // Every Narin part opens its OWN drop table: DE lists Chassis/Neuroptics/Systems Blueprint drops separately,
    // and the drawer looks parts up by their blueprint key (real_unique_name).
    const { buildDropIndex } = await import('../../src/lib/dropsParser.js')
    const dropIndex = buildDropIndex(harness.exportsBundle)
    for (const part of narin.filter((item) => /Chassis|Neuroptics|Systems/.test(item.name))) {
      assert.ok((dropIndex[part.real_unique_name] || []).length > 0, `${part.name} has no drop rows under its own key`)
      assert.ok((dropIndex[part.real_unique_name] || []).every((source) => source.part), `${part.name} drops must carry the part label`)
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
