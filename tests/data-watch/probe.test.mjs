import test from 'node:test'
import assert from 'node:assert/strict'
import { runProbes } from '../../scripts/data-watch/probe.mjs'

const source = { id: 'fixture', host: 'fixture.example', probe: async ({ value }) => ({ ok: true, fingerprint: value, detail: { value } }) }
const errorSource = { id: 'error', host: 'error.example', probe: async () => ({ ok: false, error: 'offline' }) }
const now = () => Date.parse('2026-09-24T00:00:00Z')

test('probe state transitions first-seen, unchanged, and changed', async () => {
  const first = await runProbes({ sources: [source], state: { formatVersion: 1, sources: {} }, context: { value: 'a' }, now })
  assert.equal(first.results[0].status, 'first-seen')
  const unchanged = await runProbes({ sources: [source], state: first.nextState, context: { value: 'a' }, now })
  assert.equal(unchanged.results[0].status, 'unchanged')
  const changed = await runProbes({ sources: [source], state: unchanged.nextState, context: { value: 'b' }, now })
  assert.equal(changed.results[0].status, 'changed')
  assert.equal(changed.nextState.sources.fixture.fingerprint, 'b')
})

test('probe failures increment without replacing the last good fingerprint', async () => {
  const state = { formatVersion: 1, sources: { error: { fingerprint: 'old', consecutiveFailures: 2 } } }
  const result = await runProbes({ sources: [errorSource], state, now })
  assert.equal(result.results[0].consecutiveFailures, 3)
  assert.equal(result.nextState.sources.error.fingerprint, 'old')
})
