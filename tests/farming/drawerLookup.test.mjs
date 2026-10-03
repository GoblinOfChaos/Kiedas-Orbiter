import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildFarmingDrawerLookup } from '../../src/lib/farmingTargets/drawerLookup.js'

test('Preview drawer prefers the ledger image over an earlier shopping-list gap', () => {
  const lookup = buildFarmingDrawerLookup({
    perTarget: [],
    shoppingList: [{ itemType: 'ARGON', name: 'Argon Crystal', image: null }],
    ledger: [{ itemType: 'ARGON', name: 'Argon Crystal', image: 'asset-cache://argon' }],
    relicPlaces: [], isPreview: true,
  })
  assert.equal(lookup.get('ARGON')?.image, 'asset-cache://argon')
})

test('FarmingTargets gives Preview ledger images precedence in drawer construction', () => {
  const source = fs.readFileSync(new URL('../../src/screens/FarmingTargets.jsx', import.meta.url), 'utf8')
  const ledgerIndex = source.indexOf('screenModel.ledger')
  const shoppingIndex = source.indexOf('view.shoppingList')
  assert.ok(ledgerIndex >= 0 && shoppingIndex >= 0 && ledgerIndex < shoppingIndex)
  assert.doesNotMatch(source, /image: null, category: null/)
})
