import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { adaptWarframes } from '../../scripts/de-export/adapters/warframes.mjs'

const realExcerpts = JSON.parse(await readFile(new URL('./fixtures/warframes-real-excerpts.json', import.meta.url)))

const narin = {
  uniqueName: '/Lotus/Powersuits/Duelist/Duelist', name: 'Narin', health: 270,
  shield: 550, armor: 165, power: 200, sprintSpeed: 1.1, productCategory: 'Suits',
  abilities: [{ abilityUniqueName: '/Lotus/Powersuits/Duelist/Abilities/DuelistThrustAbility', abilityName: 'Neote', description: 'Lunge.' }],
  ignoredByAdapter: 'ignored',
}
const excalibur = {
  uniqueName: '/Lotus/Powersuits/Excalibur/Excalibur', name: 'Excalibur', description: 'Warrior.',
  parentName: '/Lotus/Powersuits/Excalibur/ExcaliburBaseSuit', health: 270, shield: 270,
  armor: 240, stamina: 3, power: 100, codexSecret: false, masteryReq: 0, sprintSpeed: 1,
  passiveDescription: 'Passive.', exalted: ['/Lotus/Powersuits/Excalibur/DoomSword'], productCategory: 'Suits',
  abilities: [{ abilityUniqueName: '/a', abilityName: 'Slash Dash', description: 'Slash.' }],
}

test('maps direct fields and normalizes nested DE ability names', () => {
  const result = adaptWarframes([narin, excalibur])
  assert.equal(result[narin.uniqueName].name, 'Narin')
  assert.deepEqual(result[narin.uniqueName].abilities[0], { uniqueName: '/Lotus/Powersuits/Duelist/Abilities/DuelistThrustAbility', name: 'Neote', description: 'Lunge.' })
  assert.equal(result[narin.uniqueName].ignoredByAdapter, undefined)
})

test('adapts copied DE excerpts for Narin, Excalibur, and Volt Prime', () => {
  const result = adaptWarframes(realExcerpts)
  assert.equal(result['/Lotus/Powersuits/Duelist/Duelist'].name, 'Narin')
  assert.equal(result['/Lotus/Powersuits/Excalibur/Excalibur'].exalted[0], '/Lotus/Powersuits/Excalibur/DoomSword')
  assert.equal(result['/Lotus/Powersuits/Volt/VoltPrime'].abilities[0].uniqueName, '/Lotus/Powersuits/Volt/Abilities/ShockAbility')
})

test('omits absent optional fields rather than inventing them', () => {
  const [record] = Object.values(adaptWarframes([{ uniqueName: '/x', name: 'X', productCategory: 'Suits' }]))
  assert.deepEqual(record, { uniqueName: '/x', name: 'X', productCategory: 'Suits' })
})

test('preserves unknown extra DE fields nowhere in the output', () => {
  const record = adaptWarframes([{ ...narin, newFutureField: { value: 1 } }])[narin.uniqueName]
  assert.equal(record.newFutureField, undefined)
})

test('sorts records and emits deterministic key order', () => {
  const result = adaptWarframes([excalibur, narin])
  assert.deepEqual(Object.keys(result), [narin.uniqueName, excalibur.uniqueName].sort())
  assert.deepEqual(Object.keys(result[excalibur.uniqueName]), [
    'uniqueName', 'name', 'parentName', 'description', 'health', 'shield', 'armor',
    'stamina', 'power', 'codexSecret', 'masteryReq', 'sprintSpeed', 'passiveDescription',
    'exalted', 'abilities', 'productCategory',
  ])
})
