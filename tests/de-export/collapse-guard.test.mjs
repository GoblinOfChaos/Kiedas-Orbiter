import test from 'node:test'
import assert from 'node:assert/strict'
import { isCollapsed } from '../../scripts/de-export/collapse-guard.mjs'

test('a sharp drop with changed content is a collapse', () => {
  assert.equal(isCollapsed({ previousCount: 46, previousSha256: 'a', count: 17, sha256: 'b', ratio: 0.5 }), true)
})

test('the same bytes counted by a different rule are not a collapse (ExportSortieRewards 46 -> 17, 2026-10-26)', () => {
  assert.equal(isCollapsed({ previousCount: 46, previousSha256: 'e2466b27', count: 17, sha256: 'e2466b27', ratio: 0.5 }), false)
})

test('a normal count, a missing record and a missing previous hash behave as before', () => {
  assert.equal(isCollapsed({ previousCount: 46, previousSha256: 'a', count: 40, sha256: 'b', ratio: 0.5 }), false)
  assert.equal(isCollapsed({ previousCount: 0, previousSha256: 'a', count: 1, sha256: 'b', ratio: 0.5 }), false)
  assert.equal(isCollapsed({ previousCount: 46, count: 17, sha256: 'b', ratio: 0.5 }), true)
  assert.equal(isCollapsed({ previousCount: 100, previousSha256: 'a', count: 79, sha256: 'b', ratio: 0.8 }), true)
})
