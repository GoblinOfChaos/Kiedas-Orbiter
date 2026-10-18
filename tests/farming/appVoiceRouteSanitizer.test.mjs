import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isCurrentAppVoiceRoute,
  isHistoricalClause,
  toCurrentSourceSentences,
} from '../../src/lib/acquisitionText.js'

test('app-voice Nightwave / Operation / TennoCon places are kept', () => {
  const cases = [
    'Nightwave Series 2 rank 30 reward (Emissary Operator Collection).',
    'Purchase from the Operation: Atramentum offerings for 40 Nightmare Tatters.',
    'Included in the TennoCon 2025 Digital Pack.',
    'Purchase from the Operation: Atramentum offerings for 60 Nightmare Tatters.',
  ]
  for (const text of cases) {
    assert.equal(isCurrentAppVoiceRoute(text), true, text)
    assert.equal(isHistoricalClause(text), false, text)
    assert.deepEqual(toCurrentSourceSentences(text), [text])
  }
})

test('true historical wiki prose is still dropped', () => {
  const historical = 'This weapon was originally awarded during Operation: Cryotic Front in 2014.'
  assert.equal(isCurrentAppVoiceRoute(historical), false)
  assert.equal(isHistoricalClause(historical), true)
  assert.deepEqual(toCurrentSourceSentences(historical), [])
})
