import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeWarframes } from '../../scripts/de-export/adapters/merge-warframes.mjs'

const key = '/Lotus/Powersuits/Test/Test'

test('both-present keeps localized keys and takes DE factual fields', () => {
  const { merged, report } = mergeWarframes({ [key]: {
    uniqueName: key, name: '/Lotus/Language/TestName', description: '/Lotus/Language/TestDesc',
    health: 100, shield: 100, armor: 100, sprintSpeed: 0.9, abilities: [{ name: 'mirror' }],
  } }, { [key]: {
    uniqueName: key, name: 'Test', description: 'English', health: 200, shield: 300,
    armor: 400, sprintSpeed: 0.89999998, abilities: [{ name: 'DE text' }],
  } })
  assert.equal(merged[key].name, '/Lotus/Language/TestName')
  assert.equal(merged[key].description, '/Lotus/Language/TestDesc')
  assert.equal(merged[key].health, 200)
  assert.equal(merged[key].sprintSpeed, 0.9)
  assert.deepEqual(merged[key].abilities, [{ name: 'mirror' }])
  assert.deepEqual(report.changed[0].fields, ['health', 'shield', 'armor'])
})

test('DE-only records are added with literal English text', () => {
  const deKey = '/Lotus/Powersuits/Duelist/Duelist'
  const { merged, report } = mergeWarframes({}, { [deKey]: { uniqueName: deKey, name: 'Narin', description: 'English', health: 270 } })
  assert.equal(merged[deKey].name, 'Narin')
  assert.equal(report.added[0].uniqueName, deKey)
})

test('mirror-only records are never dropped', () => {
  const { merged, report } = mergeWarframes({ [key]: { uniqueName: key, name: 'key' } }, {})
  assert.deepEqual(merged[key], { uniqueName: key, name: 'key' })
  assert.deepEqual(report.mirrorOnly, [key])
})

test('missing DE fields do not erase mirror values and float noise is rounded', () => {
  const { merged } = mergeWarframes({ [key]: { uniqueName: key, health: 100, armor: 50, sprintSpeed: 1 } }, {
    [key]: { uniqueName: key, health: 200, sprintSpeed: 0.89999998 },
  })
  assert.equal(merged[key].health, 200)
  assert.equal(merged[key].armor, 50)
  assert.equal(merged[key].sprintSpeed, 0.9)
})

test('DE text never replaces mirror text for an existing record', () => {
  const { merged } = mergeWarframes({ [key]: { uniqueName: key, name: '/key', description: '/desc' } }, {
    [key]: { uniqueName: key, name: 'Invented', description: 'Invented' },
  })
  assert.equal(merged[key].name, '/key')
  assert.equal(merged[key].description, '/desc')
})

