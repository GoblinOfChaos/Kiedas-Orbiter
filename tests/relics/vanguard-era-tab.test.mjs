import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('the Relics era filter lists Vanguard, in the same order as the catalog eras', () => {
  const src = fs.readFileSync(new URL('../../src/screens/Relics.jsx', import.meta.url), 'utf8')
  const order = /const ERA_ORDER = (\[[^\]]*\])/.exec(src)?.[1]
  assert.ok(order, 'ERA_ORDER is declared')
  const eras = JSON.parse(order.replace(/'/g, '"'))
  assert.ok(eras.includes('Vanguard'), 'Vanguard is in ERA_ORDER')
  assert.ok(eras.indexOf('Vanguard') > eras.indexOf('Axi'), 'Vanguard follows Axi')
})
