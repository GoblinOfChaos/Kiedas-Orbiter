import test from 'node:test'
import assert from 'node:assert/strict'
import '../../scripts/lib/real-data-harness.mjs'
import { splitAcquisitionRouteText } from '../../src/lib/acquisitionInfo.js'

test('splitter keeps comma-formatted prices in one route', () => {
  assert.deepEqual(
    splitAcquisitionRouteText('Market for 35,000 Credits or Simaris'),
    ['Market for 35,000 Credits', 'Simaris'],
  )
  assert.deepEqual(
    splitAcquisitionRouteText('Syndicate: Cavia (Rank 4 Scholar), 50,000 Standing'),
    ['Syndicate: Cavia (Rank 4 Scholar), 50,000 Standing'],
  )
})

test('splitter handles or and semicolon route separators', () => {
  assert.deepEqual(splitAcquisitionRouteText('Market; Simaris or Conclave'), ['Market', 'Simaris', 'Conclave'])
})

test('splitter removes label-only and connective fragments', () => {
  assert.deepEqual(
    splitAcquisitionRouteText('Blueprint: or Purchased from Bird 3 (Rank 4+) for 50,000 Standing.'),
    ['Purchased from Bird 3 (Rank 4+) for 50,000 Standing.'],
  )
  assert.deepEqual(
    splitAcquisitionRouteText('Blueprint: or as a drop from: Recall: Prime Vanguard (5.71%).'),
    ['as a drop from: Recall: Prime Vanguard (5.71%).'],
  )
})
