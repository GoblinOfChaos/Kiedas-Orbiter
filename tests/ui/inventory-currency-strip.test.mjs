import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { PreviewInventoryLayout, renderInventoryModules } from './inventory-currency-strip-entry.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sourcePath = process.env.B9_INVENTORY_SOURCE ?? path.join(ROOT, 'src/screens/Inventory.jsx')
const layoutPath = process.env.B9_LAYOUT_SOURCE ?? path.join(ROOT, 'src/components/PreviewInventoryLayout.jsx')
const t = (key) => key
const account = {
  credits: 1, platinum: 2, forma: 3, aura_forma: 4, stance_forma: 5, umbra_forma: 6,
  orokin_reactor: 7, orokin_catalyst: 8, endo: 9, ducats: 10, aya: 11,
  void_traces: 12, void_traces_max: 13, steel_essence: 14, riven_slivers: 15,
}

test('PreviewInventoryLayout stats wrapper keeps horizontal scrolling and clips vertical overflow', () => {
  const html = renderToString(React.createElement(PreviewInventoryLayout.UiContext.Provider, { value: { t } },
    React.createElement(PreviewInventoryLayout.Component, {
      stats: React.createElement('div', null, 'stats'),
      controls: React.createElement('div', null, 'controls'),
    })))
  assert.match(html, /class="mb-3 overflow-x-auto overflow-y-hidden custom-scrollbar"/)
  assert.match(fs.readFileSync(layoutPath, 'utf8'), /overflow-x-auto overflow-y-hidden custom-scrollbar/)
})

test('Inventory Forma header uses the shared portal tooltip and has no inline top-full tooltip', () => {
  const source = fs.readFileSync(sourcePath, 'utf8')
  const headerStats = source.slice(source.indexOf('renderHeaderStats'))
  assert.match(headerStats, /<Tooltip position="bottom" content=/)
  assert.doesNotMatch(headerStats, /top-full/)
  assert.doesNotMatch(headerStats, /tooltip=/)
})

test('renderHeaderStats has no hidden absolute tooltip and Forma breakdown renders all positive rows', () => {
  const { renderHeaderStats, renderFormaTooltipContent, UiContext } = renderInventoryModules
  const stats = renderHeaderStats({ account }, '/icons', t, 'en-US')
  const statsHtml = renderToString(React.createElement(UiContext.Provider, { value: { t, locale: 'en-US' } }, stats))
  assert.doesNotMatch(statsHtml, /absolute[^>]*invisible|invisible[^>]*absolute/)

  const content = renderFormaTooltipContent(account, '/icons', t, 'en-US')
  const contentHtml = renderToString(content)
  assert.match(contentHtml, /ui\.inventory\.forma_standard/)
  assert.match(contentHtml, /ui\.inventory\.forma_aura/)
  assert.match(contentHtml, /ui\.inventory\.forma_stance/)
  assert.match(contentHtml, /ui\.inventory\.forma_umbra/)
})
