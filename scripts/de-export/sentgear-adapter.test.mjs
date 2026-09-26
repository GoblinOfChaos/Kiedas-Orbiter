import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adaptGear, adaptSentinels } from './adapters/sentgear.mjs'
import { mergeGear, mergeSentinels } from './adapters/merge-sentgear.mjs'

const sentinel = '/Lotus/Powersuits/Test/Test'
const gear = '/Lotus/Types/Restoratives/Test'

test('adapts DE Sentinel and Gear arrays to keyed app records', () => {
  assert.deepEqual(adaptSentinels({ ExportSentinels: [{ uniqueName: sentinel, name: 'Test Sentinel', health: 100, ignored: true }] }), { [sentinel]: { uniqueName: sentinel, name: 'Test Sentinel', health: 100 } })
  assert.deepEqual(adaptGear([{ uniqueName: gear, name: 'Test Gear', parentName: '/parent', ignored: true }]), { [gear]: { uniqueName: gear, name: 'Test Gear', parentName: '/parent' } })
})

test('preserves mirror presentation and keeps mirror-only records', () => {
  const result = mergeSentinels({ [sentinel]: { uniqueName: sentinel, name: '/Name', description: '/Desc', icon: '/mirror.png', health: 1 }, '/mirror-only': { uniqueName: '/mirror-only', name: 'Old' } }, { [sentinel]: { uniqueName: sentinel, name: 'English', description: 'Text', health: 200, armor: 50 }, '/de-only': { uniqueName: '/de-only', name: 'New', description: 'New text' } })
  assert.equal(result.merged[sentinel].name, '/Name')
  assert.equal(result.merged[sentinel].health, 200)
  assert.equal(result.merged[sentinel].icon, '/mirror.png')
  assert.equal(result.merged['/mirror-only'].name, 'Old')
  assert.equal(result.merged['/de-only'].name, 'New')
  assert.deepEqual(result.report.mirrorOnly, ['/mirror-only'])
})

test('rounds numeric values without treating float noise as a change', () => {
  const result = mergeGear({ [gear]: { uniqueName: gear, parentName: '/parent', custom: [0.6] } }, { [gear]: { uniqueName: gear, parentName: '/parent' } })
  assert.deepEqual(result.report.changed, [])
  const added = mergeGear({}, { [gear]: { uniqueName: gear, name: 'Gear', description: 'Text', parentName: '/parent', codexSecret: false } })
  assert.equal(added.merged[gear].codexSecret, false)
})
