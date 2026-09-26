import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptFusionBundles, adaptKeys, adaptRegions, mergeFusionBundles, mergeKeys, mergeRegions } from '../../scripts/de-export/adapters/regions-keys-bundles.mjs'
import { fusionBundlesDe, keysDe, keysMirror, regionsDe, regionsMirror } from './fixtures/regions-keys-bundles.mjs'

test('regions add DE-only identity fields without dropping mirror graph fields', () => {
  const { merged, report } = mergeRegions(regionsMirror, adaptRegions(regionsDe))
  assert.equal(merged.SolNodeShadow.missionType, 'MT_EXTERMINATE')
  assert.deepEqual(merged.SolNodeShadow.nextNodes, ['SolNodeOther'])
  assert.equal(merged.SolNodeShadow.missionIndex, 12)
  assert.equal(merged.SolNodeShadow.name, '/Lotus/Language/Locations/ShadowStation')
  assert.ok(merged.SolNodeMirrorOnly.rewardManifests)
  assert.deepEqual(report.counts, { mirror: 2, de: 1, merged: 2, changed: 1, added: 0, mirrorOnly: 1 })
  assert.equal(report.fieldDiffs.missionIndex.count, 1)
})

test('DE-only region records retain literal name and planet for resolveNode fallback', () => {
  const { merged, report } = mergeRegions({}, adaptRegions(regionsDe))
  assert.equal(merged.SolNodeShadow.name, 'Shadow Station')
  assert.equal(merged.SolNodeShadow.systemName, 'Tau')
  assert.equal(report.counts.added, 1)
})

test('keys preserve mirror quest stages and add DE-only Tau keys', () => {
  const { merged, report } = mergeKeys(keysMirror, adaptKeys(keysDe))
  assert.deepEqual(merged['/Lotus/Types/Keys/Existing/ExistingKeyChain'].chainStages, [{ key: 'stage' }])
  assert.equal(merged[keysDe[0].uniqueName].name, 'Tau Prologue A')
  assert.equal(report.counts.added, 1)
  assert.equal(report.counts.mirrorOnly, 1)
})

test('fusion bundles remain a separate Endo namespace', () => {
  const { merged, report } = mergeFusionBundles({}, adaptFusionBundles(fusionBundlesDe))
  assert.equal(Object.keys(merged).length, 1)
  assert.equal(merged[fusionBundlesDe[0].uniqueName].fusionPoints, 123)
  assert.equal(report.counts.added, 1)
})
