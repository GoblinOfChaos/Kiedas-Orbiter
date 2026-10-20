import test from 'node:test'
import assert from 'node:assert/strict'
import { INITIAL_WIKI_NAVIGATION, wikiNavigationReducer } from '../../src/lib/wikiNavigation.js'

const url = 'https://wiki.warframe.com/w/Acceltra_Prime'

test('opening the wiki from an item remembers the screen and item; Back restores them once', () => {
  let state = wikiNavigationReducer(INITIAL_WIKI_NAVIGATION, {
    type: 'open', target: url, currentScreen: 'inventory', sequence: 1,
    origin: { label: 'Acceltra Prime', itemKey: '/Lotus/Weapons/Tenno/Rifle/PrimeAcceltra' },
  })
  assert.equal(state.pendingTarget.url, url)
  assert.deepEqual(state.returnTo, { screen: 'inventory', label: 'Acceltra Prime', itemKey: '/Lotus/Weapons/Tenno/Rifle/PrimeAcceltra' })

  state = wikiNavigationReducer(state, { type: 'back' })
  assert.equal(state.returnTo, null)
  assert.deepEqual(state.pendingRestore, { screen: 'inventory', itemKey: '/Lotus/Weapons/Tenno/Rifle/PrimeAcceltra' })

  state = wikiNavigationReducer(state, { type: 'consumeRestore' })
  assert.equal(state.pendingRestore, null)
})

test('opening a wiki link from a screen without an item still allows Back, with nothing to reopen', () => {
  let state = wikiNavigationReducer(INITIAL_WIKI_NAVIGATION, { type: 'open', target: url, currentScreen: 'dashboard', sequence: 1 })
  assert.deepEqual(state.returnTo, { screen: 'dashboard', label: null, itemKey: null })
  state = wikiNavigationReducer(state, { type: 'back' })
  assert.equal(state.pendingRestore, null)
})

test('clicking a link while already on the wiki keeps the original way back; other sites are ignored', () => {
  const opened = wikiNavigationReducer(INITIAL_WIKI_NAVIGATION, {
    type: 'open', target: url, currentScreen: 'mods', sequence: 1, origin: { label: 'Serration', itemKey: '/Lotus/Upgrades/Mods/Rifle/Serration' },
  })
  const again = wikiNavigationReducer(opened, { type: 'open', target: url + '2', currentScreen: 'wiki', sequence: 2 })
  assert.equal(again.returnTo.screen, 'mods')
  assert.equal(again.returnTo.itemKey, '/Lotus/Upgrades/Mods/Rifle/Serration')
  const blocked = wikiNavigationReducer(opened, { type: 'open', target: 'https://example.com/x', currentScreen: 'mods', sequence: 3 })
  assert.equal(blocked, opened)
})
