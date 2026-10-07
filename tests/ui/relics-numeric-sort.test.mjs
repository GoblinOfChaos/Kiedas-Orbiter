import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { compareTextNumeric } from '../../src/lib/textCompare.js'

test('relic names with numbers sort numerically: Axi A2 before Axi A19', () => {
  const names = ['Axi A19 Relic', 'Axi A2 Relic', 'Axi A1 Relic', 'Axi A10 Relic']
  assert.deepEqual([...names].sort(compareTextNumeric), ['Axi A1 Relic', 'Axi A2 Relic', 'Axi A10 Relic', 'Axi A19 Relic'])
})

test('the Relics screen name sort uses the numeric comparator', () => {
  const src = fs.readFileSync(new URL('../../src/screens/Relics.jsx', import.meta.url), 'utf8')
  assert.match(src, /res = compareTextNumeric\(a\.name, b\.name\)/)
  assert.doesNotMatch(src, /res = compareText\(a\.name/)
})
