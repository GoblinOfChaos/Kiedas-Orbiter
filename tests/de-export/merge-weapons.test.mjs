import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeWeapons } from '../../scripts/de-export/adapters/merge-weapons.mjs'

const key = '/Lotus/Weapons/Test/Test'

test('keeps mirror localization and presentation while taking DE stats', () => {
  const { merged, report } = mergeWeapons({ [key]: {
    uniqueName: key, name: '/Lotus/Language/TestName', description: '/Lotus/Language/TestDesc',
    icon: '/mirror.png', totalDamage: 10, fireRate: 1,
  } }, { [key]: {
    uniqueName: key, name: 'Test', description: 'English', totalDamage: 20, fireRate: 1.23456789,
  } })
  assert.equal(merged[key].name, '/Lotus/Language/TestName')
  assert.equal(merged[key].description, '/Lotus/Language/TestDesc')
  assert.equal(merged[key].icon, '/mirror.png')
  assert.equal(merged[key].totalDamage, 20)
  assert.equal(merged[key].fireRate, 1.234568)
  assert.deepEqual(report.changed[0].fields, ['totalDamage', 'fireRate'])
})

test('rounds scalar and array float noise before comparison and merge', () => {
  const { merged, report } = mergeWeapons({ [key]: {
    uniqueName: key,
    omegaAttenuation: 0.6,
    damagePerShot: [7.5, 14],
    masteryReq: 8,
  } }, { [key]: {
    uniqueName: key,
    omegaAttenuation: 0.60000002,
    damagePerShot: [7.5000005, 14],
    masteryReq: 8,
  } })
  assert.equal(merged[key].omegaAttenuation, 0.6)
  assert.deepEqual(merged[key].damagePerShot, [7.5, 14])
  assert.deepEqual(report.changed, [])
})

test('retains a real integer change after rounding', () => {
  const { merged, report } = mergeWeapons({ [key]: { uniqueName: key, masteryReq: 8 } }, {
    [key]: { uniqueName: key, masteryReq: 14 },
  })
  assert.equal(merged[key].masteryReq, 14)
  assert.deepEqual(report.changed[0].fields, ['masteryReq'])
})

test('adds DE-only English records and retains mirror-only records', () => {
  const { merged, report } = mergeWeapons({ '/mirror': { uniqueName: '/mirror', name: 'key' } }, {
    '/de': { uniqueName: '/de', name: 'English', description: 'Text', totalDamage: 3 },
  })
  assert.equal(merged['/de'].name, 'English')
  assert.equal(merged['/mirror'].name, 'key')
  assert.equal(report.added.length, 1)
  assert.deepEqual(report.mirrorOnly, ['/mirror'])
})

test('missing DE fields do not erase mirror values', () => {
  const { merged } = mergeWeapons({ [key]: { uniqueName: key, totalDamage: 10, icon: '/x' } }, { [key]: { uniqueName: key, fireRate: 2 } })
  assert.equal(merged[key].totalDamage, 10)
  assert.equal(merged[key].icon, '/x')
})
