import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptUpgrades } from '../../scripts/de-export/adapters/upgrades.mjs'
import { addManifestIcons, mergeImages, mergeUpgrades } from '../../scripts/de-export/adapters/merge-upgrades.mjs'

const shared = '/Lotus/Powersuits/Test/SharedAugmentCard'
const deOnly = '/Lotus/Powersuits/Test/NewAugmentCard'

test('adapts only ExportUpgrades and rounds nested numeric values', () => {
  const result = adaptUpgrades({ ExportUpgrades: [{ uniqueName: deOnly, name: 'New Mod', baseDrain: 6.12345678, levelStats: [{ stats: ['+1.50000002%'] }] }], ExportModSet: [{ uniqueName: '/ignored' }] })
  assert.deepEqual(result[deOnly], { uniqueName: deOnly, baseDrain: 6.123457, levelStats: [{ stats: ['+1.50000002%'] }], name: 'New Mod', description: '+1.50000002%' })
  assert.equal(result['/ignored'], undefined)
})

test('keeps mirror-only records and overlays DE numeric and levelStats fields', () => {
  const { merged, report } = mergeUpgrades({
    [shared]: { uniqueName: shared, name: '/mirror/name', baseDrain: 1, rarity: 'COMMON', custom: true },
    '/mirror-only': { uniqueName: '/mirror-only' },
  }, {
    [shared]: { uniqueName: shared, name: 'English', baseDrain: 6, levelStats: [{ stats: ['new'] }] },
    [deOnly]: { uniqueName: deOnly, name: 'New Mod', levelStats: [{ stats: ['new'] }] },
  })
  assert.equal(merged[shared].name, '/mirror/name')
  assert.equal(merged[shared].baseDrain, 6)
  assert.deepEqual(merged[shared].levelStats, [{ stats: ['new'] }])
  assert.equal(merged['/mirror-only'].uniqueName, '/mirror-only')
  assert.equal(merged[deOnly].name, 'New Mod')
  assert.deepEqual(report.mirrorOnly, ['/mirror-only'])
})

test('manifest textureLocation supplies icons and hashed image entries', () => {
  const manifest = { Manifest: [{ uniqueName: deOnly, textureLocation: '/Lotus/Card.jpg!hash' }] }
  const records = addManifestIcons({ [deOnly]: { uniqueName: deOnly, name: 'New Mod' } }, manifest)
  assert.equal(records[deOnly].icon, '/Lotus/Card.jpg')
  assert.deepEqual(mergeImages({}, manifest).merged, { '/Lotus/Card.jpg': { contentHash: 'hash' } })
})
