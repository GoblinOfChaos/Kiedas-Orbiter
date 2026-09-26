import test from 'node:test'
import assert from 'node:assert/strict'
import { checkKeyCanary, checkRegionCanary } from '../../scripts/item-completeness.mjs'

const region = '/Lotus/Types/SpaceNodes/ShadowStation'
const key = '/Lotus/Types/Keys/TauPrologue/TauPrologueKeyChainA'

test('region canary resolves a DE-only node name and planet', () => {
  const result = checkRegionCanary({
    exportsBundle: { ExportRegions: { [region]: { uniqueName: region, name: 'Shadow Station', systemName: 'Tau' } } },
    uniqueName: region,
  })
  assert.deepEqual(result, { uniqueName: region, present: true, name: 'Shadow Station', planet: 'Tau', pass: true })
})

test('key canary resolves a DE-only literal quest name', () => {
  const result = checkKeyCanary({
    exportsBundle: { ExportKeys: { [key]: { uniqueName: key, name: 'Tau Prologue A' } } },
    uniqueName: key,
  })
  assert.equal(result.pass, true)
  assert.equal(result.name, 'Tau Prologue A')
})
