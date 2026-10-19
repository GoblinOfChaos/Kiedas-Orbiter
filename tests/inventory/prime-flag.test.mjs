import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

const inventoryFile = path.join(
  process.env.HOME,
  '.local/share/kiedas-orbiter-preview/data/user/inventory.json',
)
const haveRealData = fs.existsSync(inventoryFile)

// Issue #93: these Prime weapons have VT_NORMAL or no variantType and a path
// that does not end in "Prime", so the Non-Prime filter used to keep them.
test('real data: every weapon and Warframe named "... Prime" is flagged Prime', { skip: !haveRealData, timeout: 180000 }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { parseInventory } = await import('../../src/lib/inventoryParser.js')
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const inventory = parseInventory(raw, harness.exportsBundle, harness.dict, 'en')
  const rows = [...(inventory.weapons || []), ...(inventory.warframes || [])]

  for (const name of ['Corufell Prime', 'Sagek Prime', 'Galariak Prime', 'Steflos Prime']) {
    const row = rows.find((item) => item.name === name)
    assert.ok(row, `missing ${name}`)
    assert.equal(row.is_prime, true, name)
  }
  const missed = [...new Set(rows.filter((item) => /\bPrime\b/.test(item.name || '') && !item.is_prime).map((item) => item.name))]
  assert.deepEqual(missed, [])
  const extra = [...new Set(rows.filter((item) => item.is_prime && !/\bPrime\b/.test(item.name || '')).map((item) => item.name))]
  assert.deepEqual(extra, [])
})
