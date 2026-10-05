import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'
import { discoverSubjects, checkMatrixItem } from '../../scripts/item-completeness.mjs'
import { parseInventory } from '../../src/lib/inventoryParser.js'

// Rule: a Prime part's relic rows must carry the tier DE's relic rewards give
// for THAT relic. DE's drop-table page (and its mirrors) label relic rewards by
// chance bracket - e.g. "Uncommon (25.33%)" for a part whose real tier is Common -
// so the drop table must never be the source of a relic row's rarity.
const canon = (value) => String(value || '').replaceAll('/StoreItems/', '/')

test('every relic row of every Prime part has the DE ExportRelics tier for that relic', async (t) => {
  const dataDir = process.env.PREVIEW_DATA_DIR || DEFAULT_DATA_DIR
  let en
  try {
    en = JSON.parse(await fs.readFile(path.join(dataDir, 'export/de/ExportRelicArcane_en.json'), 'utf8')).ExportRelicArcane
  } catch {
    t.skip('no DE relic export on this machine')
    return
  }

  const truth = new Map()
  const rewardItems = new Set()
  for (const relic of en) {
    if (!relic.relicRewards || !relic.name?.endsWith(' Relic')) continue
    const relicName = relic.name.slice(0, -' Relic'.length)
    for (const reward of relic.relicRewards) {
      const key = `${relicName}|${canon(reward.rewardName)}`
      if (!truth.has(key)) truth.set(key, reward.rarity)
      rewardItems.add(canon(reward.rewardName))
    }
  }

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'relic-rarity-'))
  try {
    const merged = await applyMerges({ dataDir, out: root, cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE })
    const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root })
    const parsed = parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)
    const subjects = discoverSubjects(harness).filter((subject) => rewardItems.has(canon(subject.uniqueName)))
    assert.ok(subjects.length > 0, 'expected relic reward items in the harness')

    const wrong = []
    for (const subject of subjects) {
      const result = await checkMatrixItem({ harness, subject, parsed, syntheticOwned: false })
      for (const row of result.acquisition?.result?.sources || []) {
        if (row.type !== 'relic') continue
        const relicName = String(row.relicName || '').replace(/\s+Relic.*$/, '').replace(/\s*\(.*\)$/, '').trim()
        const expected = truth.get(`${relicName}|${canon(subject.uniqueName)}`)
        if (expected && String(row.rarity || '').toUpperCase() !== expected) {
          wrong.push(`${subject.name} in ${relicName}: shows ${row.rarity || 'nothing'}, DE says ${expected}`)
        }
      }
    }
    assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} relic rows disagree with DE`)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
