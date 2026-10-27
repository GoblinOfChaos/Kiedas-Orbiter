import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { canBeSubsumed } from '../../src/lib/masteryState.js'

test('Prime Warframes and Excalibur Umbra cannot be subsumed; base frames can', () => {
  assert.equal(canBeSubsumed({ name: 'Atlas' }), true)
  assert.equal(canBeSubsumed({ name: 'Excalibur' }), true)
  assert.equal(canBeSubsumed({ name: 'Atlas Prime' }), false)
  assert.equal(canBeSubsumed({ name: 'Chroma Prime' }), false)
  assert.equal(canBeSubsumed({ name: 'Excalibur Umbra' }), false)
  assert.equal(canBeSubsumed({ name: 'Anything', is_prime: true }), false)
})

test('the Inventory subsumed filter skips frames that cannot be subsumed in both states', () => {
  const source = fs.readFileSync(path.resolve('src/screens/Inventory.jsx'), 'utf8')
  assert.match(source, /if \(f === 'subsumed' && !canBeSubsumed\(item\)\) return false;/)
  assert.match(source, /canBeSubsumed \} from '..\/lib\/masteryState'/)
})

test('the Inventory filter box wraps in Preview instead of clipping', () => {
  const source = fs.readFileSync(path.resolve('src/screens/Inventory.jsx'), 'utf8')
  assert.match(source, /data-preview-inventory-filters/)
  assert.match(source, /flex gap-1 \$\{IS_PREVIEW \? 'flex-wrap min-w-0' : ''\}/)
  assert.match(source, /IS_PREVIEW \? 'min-h-\[42px\] min-w-0 max-w-full' : 'h-\[42px\]'/)
})
