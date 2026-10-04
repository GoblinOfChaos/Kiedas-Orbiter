import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

async function realParsed() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prime-set-labels-'))
  try {
    const merged = await applyMerges({
      dataDir: process.env.PREVIEW_DATA_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data',
      out: root,
      cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export',
    })
    const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root, locale: 'en' })
    const { parseInventory } = await import('../../src/lib/inventoryParser.js')
    return parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

function labelFor(set, part) {
  const prefix = set.name?.trim()
  return prefix && part.name?.startsWith(`${prefix} `)
    ? part.name.slice(prefix.length).trim()
    : part.name
}

test('all real Prime Set part labels are distinct and retain meaningful names', async () => {
  const parsed = await realParsed()
  const sets = Object.values(parsed.primeSets || {})
  assert.ok(sets.length >= 160, `expected the real Prime Set catalog, got ${sets.length}`)
  for (const set of sets) {
    const labels = (set.parts || []).map((part) => labelFor(set, part))
    assert.equal(new Set(labels).size, labels.length, `${set.name} has duplicate labels: ${labels.join(', ')}`)
    assert.equal(labels.some((label) => /^(Prime|Limb)$/i.test(label)), false, `${set.name} has a shortened label: ${labels.join(', ')}`)
  }
})
