import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adaptWeapons, WEAPON_APP_FIELDS } from '../../scripts/de-export/adapters/weapons.mjs'

const key = '/Lotus/Weapons/Test/Test'

test('adapts the DE wrapper and keeps app-readable weapon fields', () => {
  const [record] = Object.values(adaptWeapons({ ExportWeapons: [{ uniqueName: key, name: 'Test', description: 'English', damagePerShot: [1], fireRate: 2, future: true }] }))
  assert.deepEqual(record, { uniqueName: key, name: 'Test', description: 'English', damagePerShot: [1], fireRate: 2 })
})

test('accepts a keyed mirror-shaped input and omits absent fields', () => {
  assert.deepEqual(adaptWeapons({ [key]: { name: 'Test', productCategory: 'Melee' } })[key], { uniqueName: key, name: 'Test', productCategory: 'Melee' })
})

test('sorts records and exposes a stable allow-list', () => {
  const result = adaptWeapons([{ uniqueName: '/b', name: 'B' }, { uniqueName: '/a', name: 'A' }])
  assert.deepEqual(Object.keys(result), ['/a', '/b'])
  assert.ok(WEAPON_APP_FIELDS.includes('damagePerShot'))
  assert.ok(!WEAPON_APP_FIELDS.includes('behaviours'))
})
