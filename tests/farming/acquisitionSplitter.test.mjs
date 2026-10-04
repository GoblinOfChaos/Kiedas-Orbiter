import test from 'node:test'
import assert from 'node:assert/strict'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

let splitterPromise
async function splitAcquisitionRouteText(...args) {
  await (splitterPromise ||= loadRealHarness())
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
