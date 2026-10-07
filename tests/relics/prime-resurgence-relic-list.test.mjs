import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Prime Resurgence shows relic lists as a short list with an expand control', () => {
  const src = fs.readFileSync(new URL('../../src/screens/PrimeResurgence.jsx', import.meta.url), 'utf8')
  assert.match(src, /function RelicList\(/)
  assert.doesNotMatch(src, /relics\.join\(/)
  assert.match(src, /relics\.slice\(0, limit\)/)
})
