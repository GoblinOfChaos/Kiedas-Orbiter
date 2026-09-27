#!/usr/bin/env node
/**
 * Acquisition-text quality audit (backlog item DATA-ACQ-003: "312 use
 * generic fallback wording"). That number is from the 2026-09-03 audit and
 * predates several later fixes that removed this class of bug entirely
 * (see GitHub issue #109) - this gets a real current count instead of
 * trusting a stale one.
 *
 * Reuses the item-completeness matrix's own U5 acquisition check
 * (checkMatrixItem) rather than inventing new "what counts as generic"
 * heuristics - that check already distinguishes a real labelled source,
 * an honest empty result (no source found, no source claimed - the
 * correct behavior per the "ban generic fallback text" policy), and
 * `cannot` (an unlabelled/unsorted source - the actual bug class this
 * item was about).
 *
 * Passes `syntheticOwned: false` deliberately: the owned-state check
 * calls the full parseInventory() per item (~300ms, since each item's
 * synthetic-ownership result genuinely differs) - irrelevant to an
 * acquisition-text-quality question, so skipping it is correct here, not
 * a shortcut. Without it, or without reusing one parsed inventory across
 * every call, a 7,524-item audit doesn't finish in a reasonable time.
 *
 * Usage: PREVIEW_DATA_DIR=... KIEDAS_DE_EXPORT_CACHE=... node scripts/audit-acquisition-quality.mjs [category]
 * category defaults to "cosmetics"; pass any CATEGORY_RULES key from
 * scripts/item-completeness.mjs (warframes, weapons, mods, arcanes,
 * relics, resources, gear, recipes, regions, keys, companions).
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyMerges } from './de-export/apply-merges.mjs'
import { loadRealHarness } from './lib/real-data-harness.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const category = process.argv[2] || 'cosmetics'

async function main() {
  const { discoverSubjects, checkMatrixItem } = await import('./item-completeness.mjs')
  const { parseInventory } = await import(path.join(REPO, 'src/lib/inventoryParser.js'))

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'acq-audit-'))
  try {
    const merged = await applyMerges({ dataDir: process.env.PREVIEW_DATA_DIR, out: root, cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE })
    const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root })
    const parsed = parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)

    const subjects = discoverSubjects(harness).filter((s) => s.category === category)
    console.log(`${category} subjects found: ${subjects.length}`)
    if (subjects.length === 0) {
      console.log(`No subjects for category "${category}" - check it's a real CATEGORY_RULES key.`)
      return
    }

    let honestEmpty = 0, labelled = 0, cannot = 0, errored = 0
    const cannotSamples = []
    for (const subject of subjects) {
      try {
        const result = await checkMatrixItem({ harness, subject, parsed, syntheticOwned: false })
        if (result.acquisition?.cannot) {
          cannot++
          if (cannotSamples.length < 20) cannotSamples.push({ name: subject.name, uniqueName: subject.uniqueName, reason: result.acquisition.cannot })
        } else if (result.acquisition?.honestEmpty) honestEmpty++
        else labelled++
      } catch (error) {
        errored++
      }
    }

    console.log(JSON.stringify({ total: subjects.length, labelled, honestEmpty, cannot, errored }, null, 2))
    if (cannotSamples.length > 0) {
      console.log('\nSample items with an unlabelled/unsorted acquisition source (the real bug class):')
      for (const sample of cannotSamples) console.log(`  ${sample.name} (${sample.uniqueName}): ${sample.reason}`)
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

main()
