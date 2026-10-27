import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve('src/screens/Market.jsx'), 'utf8')

test('a riven stock row shows its listing note as readable text, not inside the green sell button', () => {
  const note = source.indexOf('data-market-riven-listing-note')
  assert.ok(note > 0)
  const open = source.lastIndexOf('<span', note)
  const tag = source.slice(open, source.indexOf('>', note))
  assert.doesNotMatch(tag, /text-kronos-dim/)
  assert.match(tag, /text-kronos-text/)
  // the sell button no longer carries the riven branch
  const button = source.slice(source.indexOf('handleSellStockItem(item)}'), source.indexOf('t("market.sell_on_wfm")'))
  assert.doesNotMatch(button, /riven_listing_unavailable|isRiven/)
})
