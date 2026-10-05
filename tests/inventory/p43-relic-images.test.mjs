import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const inventoryFile = `${DEFAULT_DATA_DIR}/user/inventory.json`
const haveRealData = fs.existsSync(inventoryFile) && fs.existsSync(`${DEFAULT_DATA_DIR}/export`)

test('real data: P43 relic overlay payloads use cached images for all affected weapon parts', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const parser = await import(pathToFileURL(process.env.P43_PARSER_PATH || path.join(root, 'src/lib/inventoryParser.js')).href)
  const imageBundle = await import(pathToFileURL(process.env.P43_IMAGE_MAP_PATH || path.join(root, 'src/lib/exportBundle.js')).href)
  const overlayData = await import(pathToFileURL(process.env.P43_OVERLAY_DATA_PATH || path.join(root, 'src/lib/relicOverlayData.js')).href)
  const parsed = parser.parseInventory(raw, exportsBundle, dict, 'en', null)
  const imageMaps = imageBundle.buildImageMaps(exportsBundle)
  const prefixes = ['Corufell Prime', 'Steflos Prime', 'Nunchasa', 'Aksondol']
  const parts = (parsed.all ?? []).filter((item) => prefixes.some((prefix) => item.name === prefix || item.name.startsWith(`${prefix} `)))
  assert.ok(parts.length > 0, 'real catalog must contain the affected weapon parts')

  const receivedByOverlay = overlayData.attachRelicRewardImages(parts.map((part) => ({
    uniqueName: part.unique_name,
    name: part.name,
    icon: part.image,
  })), imageMaps)
  const failures = receivedByOverlay
    .filter((item) => !/^asset-cache:\/\/(?:content\.warframe\.com|browse\.wf)/.test(item.icon || ''))
    .map((item) => `${item.name}: ${item.icon || '(empty)'}`)

  assert.equal(
    failures.length,
    0,
    `affected overlay images must be cached: count=${failures.length}; first25=${failures.slice(0, 25).join('; ')}`,
  )
})
