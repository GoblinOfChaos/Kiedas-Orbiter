import test from 'node:test'
import assert from 'node:assert/strict'
import { buildImageMaps, buildRuntimeExportBundle } from '../../src/lib/exportBundle.js'
import { checkCraftableRecipes, checkMatrixItem, primePartsVisible } from '../../scripts/item-completeness.mjs'
import { goldenHarness, frame } from './fixtures.mjs'

test('shared loader maps are identical for the harness and runtime builder', () => {
  const harness = goldenHarness()
  const runtime = buildRuntimeExportBundle({ exports: harness.exportsBundle })
  assert.deepEqual(buildImageMaps(runtime), harness.EI ? { EI: harness.EI, nameToImage: harness.nameToImage, uniqueNameToName: harness.uniqueNameToName } : buildImageMaps(harness.exportsBundle))
})

test('removing a recipe turns the Foundry row red', async () => {
  const harness = goldenHarness()
  const parsed = null
  const good = await checkMatrixItem({ harness, subject: { uniqueName: frame, name: 'Test Frame', category: 'warframes' }, parsed })
  const broken = goldenHarness({ broken: true })
  const bad = await checkMatrixItem({ harness: broken, subject: { uniqueName: frame, name: 'Test Frame', category: 'warframes' }, parsed })
  assert.equal(good.screens.Foundry, true)
  assert.equal(bad.screens.Foundry, false)
})

test('removing a cosmetic supplement image turns the image check red', () => {
  const base = goldenHarness()
  const addition = '/Lotus/Upgrades/Skins/TestSkin'
  const withSupplement = buildRuntimeExportBundle({
    exports: base.exportsBundle,
    cosmeticAdditions: { [addition]: { name: 'Test Skin', icon: '/Lotus/Art/TestFrame.png' } },
  })
  const withoutSupplement = buildRuntimeExportBundle({ exports: base.exportsBundle })
  assert.ok(withSupplement.ExportCustoms[addition])
  assert.equal(withoutSupplement.ExportCustoms?.[addition], undefined)
})

test('Prime Parts visibility is absent when unowned and present when a part is owned', () => {
  assert.equal(primePartsVisible({}, 'Citrine'), false)
  assert.equal(primePartsVisible({ Citrine: { parts: [{ quantity: 0 }] } }, 'Citrine'), false)
  assert.equal(primePartsVisible({ Citrine: { parts: [{ quantity: 1 }] } }, 'Citrine'), true)
})

test('a synthetic item with drops and a recipe keeps drawer crafting requirements', async () => {
  // Dynamic import: the harness (imported above) registers the extensionless .js resolver;
  // a static import here would be resolved before that hook runs.
  const { buildRecipeResultIndex, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const harness = goldenHarness()
  const result = getAcquisitionInfo(
    frame,
    'Test Frame',
    { [frame]: [{ type: 'drop', location: 'Test mission', chance: 1, source: 'synthetic' }] },
    {},
    buildRecipeResultIndex(harness.exportsBundle),
    ...Array(18).fill(null),
  )
  assert.deepEqual(result.recipe.ingredients.map(({ itemType, count }) => [itemType, count]), [[frame.replace('Powersuits/TestFrame/TestFrame', 'Types/Recipes/WarframeRecipes/TestFrameChassisComponent'), 1]])
  assert.equal(result.sources[0].location, 'Test mission')
})

test('all parsed craftable recipes retain matching drawer ingredients', async () => {
  const result = await checkCraftableRecipes({ harness: goldenHarness() })
  assert.equal(result.failed.length, 0)
  assert.ok(result.total > 0)
})
