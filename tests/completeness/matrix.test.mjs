import test from 'node:test'
import assert from 'node:assert/strict'
import { buildImageMaps, buildRuntimeExportBundle } from '../../src/lib/exportBundle.js'
import { checkMatrixItem, primePartsVisible } from '../../scripts/item-completeness.mjs'
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
