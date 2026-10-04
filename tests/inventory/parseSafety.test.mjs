import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
let parserPromise
async function getParser() {
  parserPromise ||= import(pathToFileURL(process.env.P31_PARSER_PATH || path.join(root, 'src/lib/inventoryParser.js')).href)
  return parserPromise
}

test('malformed name and description values do not abort inventory parsing', async () => {
  const { parseInventory } = await getParser()
  const uniqueName = '/Lotus/Types/Warframes/TestFrame'
  const raw = {
    Suits: [{ ItemType: uniqueName, CustomName: 42 }],
    XPInfo: [],
  }
  const exportsBundle = {
    ExportWarframes: {
      ExportWarframes: [{
        uniqueName,
        name: { malformed: true },
        productCategory: 'Suits',
        description: ['malformed'],
      }],
    },
    dict: {},
  }

  assert.doesNotThrow(() => {
    const parsed = parseInventory(raw, exportsBundle, {}, 'en', {})
    assert.ok(parsed.all.some((item) => item.unique_name === uniqueName))
  })
})

test('inventoryParser has no unguarded exact Lotus-path startsWith calls', () => {
  const source = fs.readFileSync(path.join(root, 'src/lib/inventoryParser.js'), 'utf8')
  const helper = source.match(/export function isLotusPath\(value\) \{[\s\S]*?^\}/m)
  assert.ok(helper, 'isLotusPath helper is missing')
  const outsideHelper = source.replace(helper[0], '')
  assert.equal((outsideHelper.match(/\.startsWith\(['"]\/Lotus\/['"]\)/g) || []).length, 0)
})

test('parse failure keeps the last good inventory and clears only an empty initial state', () => {
  const source = fs.readFileSync(path.join(root, 'src/contexts/MonitoringContext.jsx'), 'utf8')
  const functionSource = source.match(/export function nextInventoryAfterParseFailure\(previous\) \{[\s\S]*?^\}/m)
  assert.ok(functionSource, 'nextInventoryAfterParseFailure helper is missing')
  const nextInventoryAfterParseFailure = new Function(
    `${functionSource[0].replace(/^export /, '')}; return nextInventoryAfterParseFailure`,
  )()
  const previous = { all: [{ unique_name: '/Lotus/Types/Test' }] }
  assert.equal(nextInventoryAfterParseFailure(previous), previous)
  assert.equal(nextInventoryAfterParseFailure(null), null)
  assert.equal(nextInventoryAfterParseFailure(undefined), null)
  assert.match(source, /setInventoryData\(prev => nextInventoryAfterParseFailure\(prev\)\)/)
})

const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json')
test('real runtime bundle parses the real inventory with the English i18n data', { skip: !fs.existsSync(inventoryFile) }, async () => {
  const { exportsBundle, dict } = await loadRealHarness()
  const { parseInventory } = await getParser()
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const probe = Object.keys(exportsBundle.ExportWarframes ?? {})[0]
  assert.ok(probe, 'DE export has no Warframe probe item')
  raw.Suits = [...(raw.Suits ?? []), { ItemType: probe, ItemCount: 1 }]
  const i18n = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/i18n/en.json'), 'utf8'))
  const parsed = parseInventory(raw, exportsBundle, dict, 'en', i18n)
  assert.ok(parsed.all.some((item) => item.unique_name === probe))
  assert.ok(Object.keys(exportsBundle).includes('WI_Supplement'))
})
