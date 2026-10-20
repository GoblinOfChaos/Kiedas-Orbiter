import test from 'node:test'
import assert from 'node:assert/strict'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

let splitterPromise
async function splitAcquisitionRouteText(...args) {
  await (splitterPromise ||= loadRealHarness({ locale: 'en' }))
  const { splitAcquisitionRouteText: split } = await import('../../src/lib/acquisitionInfo.js')
  return split(...args)
}

test('splitter keeps comma-formatted prices in one route', async () => {
  assert.deepEqual(
    await splitAcquisitionRouteText('Market for 35,000 Credits or Simaris'),
    ['Market for 35,000 Credits', 'Simaris'],
  )
  assert.deepEqual(
    await splitAcquisitionRouteText('Syndicate: Cavia (Rank 4 Scholar), 50,000 Standing'),
    ['Syndicate: Cavia (Rank 4 Scholar), 50,000 Standing'],
  )
  assert.deepEqual(
    await splitAcquisitionRouteText('Blueprints and components are a potential reward from Invasions. All components can be traded, although players must have a Mastery Rank of at least 7 to acquire the blueprint.'),
    [
      'Blueprints and components are a potential reward from Invasions.',
      'All components can be traded, although players must have a Mastery Rank of at least 7 to acquire the blueprint.',
    ],
  )
})

test('splitter handles or and semicolon route separators', async () => {
  assert.deepEqual(await splitAcquisitionRouteText('Market; Simaris or Conclave'), ['Market', 'Simaris', 'Conclave'])
})

test('splitter removes label-only and connective fragments', async () => {
  assert.deepEqual(
    await splitAcquisitionRouteText('Blueprint: or Purchased from Bird 3 (Rank 4+) for 50,000 Standing.'),
    ['Purchased from Bird 3 (Rank 4+) for 50,000 Standing.'],
  )
  assert.deepEqual(
    await splitAcquisitionRouteText('Blueprint: or as a drop from: Recall: Prime Vanguard (5.71%).'),
    ['as a drop from: Recall: Prime Vanguard (5.71%).'],
  )
})

test('a parenthetical after a full stop stays with the sentence before it', async () => {
  assert.deepEqual(
    await splitAcquisitionRouteText("Blueprint drops from certain Relics. (1x from Common and 2x from Uncommon) Purchased blueprint from Acrithis's shop for 10 Pathos Clamp. Blueprint received as a Daily Tribute."),
    [
      'Blueprint drops from certain Relics (1x from Common and 2x from Uncommon).',
      "Purchased blueprint from Acrithis's shop for 10 Pathos Clamp.",
      'Blueprint received as a Daily Tribute.',
    ],
  )
})
