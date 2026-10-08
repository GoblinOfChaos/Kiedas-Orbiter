import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getPrimeSetVaultedStatus, matchesPrimeSetVaultFilter } from '../../src/lib/primeSets.js'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { getCachedPrimeSetPartSources } from '../../src/lib/primeSetParts.js'
import { getRelicVaultedStatus } from '../../src/lib/relicParser.js'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export', 'ExportRelics.json'))

function sourceIndex(entries) {
  return Object.fromEntries(entries.map(([part, relicName]) => [part, [{ type: 'relic', relicName }]]))
}

function relicStates(entries) {
  return new Map(entries.map(([relicName, vaulted]) => [
    `relic:${relicName.toLowerCase()}`,
    { relic: vaulted === null ? {} : { vaulted }, relicKey: relicName },
  ]))
}

function setWithParts(...uniqueNames) {
  return { name: 'Synthetic Prime', parts: uniqueNames.map((unique_name) => ({ unique_name, name: unique_name })) }
}

test('synthetic: Prime Set vault status distinguishes vaulted, unknown, available, and no relic sources', () => {
  const parts = setWithParts('/vaulted-a', '/vaulted-b', '/unknown', '/available', '/none')
  const dropIndex = sourceIndex([
    ['/vaulted-a', 'Lith V1'], ['/vaulted-b', 'Meso V2'], ['/unknown', 'Neo U1'], ['/available', 'Axi A1'],
  ])
  const relicStateIndex = relicStates([
    ['Lith V1', true], ['Meso V2', true], ['Neo U1', null], ['Axi A1', false],
  ])

  assert.equal(getPrimeSetVaultedStatus(setWithParts('/vaulted-a', '/vaulted-b'), dropIndex, relicStateIndex), true)
  assert.equal(getPrimeSetVaultedStatus(setWithParts('/vaulted-a', '/unknown'), dropIndex, relicStateIndex), null)
  assert.equal(getPrimeSetVaultedStatus(setWithParts('/vaulted-a', '/available'), dropIndex, relicStateIndex), false)
  assert.equal(getPrimeSetVaultedStatus(setWithParts('/none'), dropIndex, relicStateIndex), null)
  assert.equal(parts.parts.length, 5)
})

test('synthetic: Prime Set vault filters keep unknown in All only', () => {
  const sets = [
    { name: 'vaulted', vaulted: true },
    { name: 'available', vaulted: false },
    { name: 'unknown', vaulted: null },
  ]

  assert.deepEqual(sets.filter((set) => matchesPrimeSetVaultFilter(set.vaulted, 'yes')).map((set) => set.name), ['vaulted'])
  assert.deepEqual(sets.filter((set) => matchesPrimeSetVaultFilter(set.vaulted, 'no')).map((set) => set.name), ['available'])
  assert.deepEqual(sets.filter((set) => matchesPrimeSetVaultFilter(set.vaulted, undefined)).map((set) => set.name), ['vaulted', 'available', 'unknown'])
})

test('real data: unknown Prime Set relic sources are not vaulted and filters keep all three states distinct', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const { parseInventory } = await import('../../src/lib/inventoryParser.js')
  const { buildRelicStateIndex } = await import('../../src/lib/acquisitionInfo.js')
  const parsed = parseInventory({}, exportsBundle, dict, 'en', null)
  const dropIndex = buildDropIndex(exportsBundle)
  const relicStateIndex = buildRelicStateIndex(exportsBundle)
  const sets = Object.values(parsed.primeSets ?? {}).map((set) => ({
    ...set,
    vaulted: getPrimeSetVaultedStatus(set, dropIndex, relicStateIndex),
  }))

  assert.ok(sets.length > 0, 'real data has Prime Sets')
  for (const set of sets) {
    const hasUnknownRelic = set.parts
      .flatMap((part) => getCachedPrimeSetPartSources(part, dropIndex))
      .filter((source) => source.type === 'relic')
      .some((source) => {
        const relicName = String(source.relicName || '').replace(/\s+Relic\b/i, '').trim().toLowerCase()
        const state = relicStateIndex.get(`relic:${relicName}`)
        return getRelicVaultedStatus(state?.relic, state?.relicKey) === null
      })
    if (hasUnknownRelic) assert.notEqual(set.vaulted, true, `${set.name} has an unknown relic source`)
  }

  const vaulted = sets.filter((set) => matchesPrimeSetVaultFilter(set.vaulted, 'yes'))
  const available = sets.filter((set) => matchesPrimeSetVaultFilter(set.vaulted, 'no'))
  const all = sets.filter((set) => matchesPrimeSetVaultFilter(set.vaulted, undefined))
  assert.ok(vaulted.every((set) => set.vaulted === true), 'Vaulted filter has only vaulted sets')
  assert.ok(available.every((set) => set.vaulted === false), 'Unvaulted filter has only available sets')
  assert.deepEqual(new Set(all.map((set) => set.name)), new Set(sets.map((set) => set.name)), 'All includes every vault state')
})
