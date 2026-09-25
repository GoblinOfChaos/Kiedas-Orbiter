import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIssueBody, classify } from '../../scripts/data-watch/report.mjs'

test('report classification emits updates and only emits unreachable at three failures', () => {
  const base = { id: 'source', previous: 'abcdefghijklmnop', fingerprint: 'qrstuvwxyz123456', detail: { moduleCount: 4 }, status: 'changed' }
  assert.deepEqual(classify([{ ...base, status: 'first-seen' }], { source: 'Source' }), [])
  assert.equal(classify([{ ...base }], { source: 'Source' })[0].title, '[Data update] Source')
  assert.deepEqual(classify([{ ...base, status: 'error', consecutiveFailures: 2 }]), [])
  assert.equal(classify([{ ...base, status: 'error', consecutiveFailures: 3 }])[0].kind, 'source-unreachable')
  assert.match(buildIssueBody([base], { generatedAt: 'now' }), /abcdefghijkl/)
})

test('reports sanitize mentions, inline upstream values, and cap error text/body', () => {
  const body = buildIssueBody([{ id: 'x@octocat', status: 'error', error: `${'e'.repeat(400)} @octocat` }], { title: 'Title @octocat' })
  assert.match(body, /@\u200b octocat|@\u200boctocat/)
  assert.match(body, /Error: `e+/)
  assert.ok(body.length <= 60_000)
})

test('upstream-format is reserved but supported by report bodies', () => {
  const body = buildIssueBody([{ id: 'x', status: 'error', error: 'invalid shape' }], { title: 'Format problem' })
  assert.match(body, /invalid shape/)
})
