import test from 'node:test'
import assert from 'node:assert/strict'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

let modulePromise
async function acquisition() {
  await (modulePromise ||= loadRealHarness({ locale: 'en' }))
  return import('../../src/lib/acquisitionInfo.js')
}

test('a wiki node requirement stays on its row instead of becoming a fragment row', async () => {
  const { formatWikiResourceDrop, splitAcquisitionRouteText } = await acquisition()
  const text = formatWikiResourceDrop({
    source: 'Fortuna Bounty Lvl 40-60 Stage 1',
    rotationOrTable: 'B',
    quantity: 1,
    nodes: ['Orb Vallis/Fortuna, Venus; talk to Eudico'],
  })
  assert.equal(text, 'Fortuna Bounty Lvl 40-60 Stage 1, B, 1x — Orb Vallis/Fortuna, Venus (talk to Eudico)')
  assert.deepEqual(splitAcquisitionRouteText(text), [text])
})

test('several requirements on one node stay together; separate nodes still split', async () => {
  const { formatWikiResourceDrop, splitAcquisitionRouteText } = await acquisition()
  const text = formatWikiResourceDrop({
    source: 'Bounty',
    nodes: ['Cetus, Earth; talk to Konzu; must complete the quest', 'Fortuna, Venus'],
  })
  const routes = splitAcquisitionRouteText(text)
  assert.equal(routes.length, 2)
  assert.ok(routes[0].includes('(talk to Konzu; must complete the quest)'))
})
