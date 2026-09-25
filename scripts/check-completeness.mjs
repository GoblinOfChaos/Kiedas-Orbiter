#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from './de-export/apply-merges.mjs'
import { run } from './item-completeness.mjs'

const dataDir = process.env.PREVIEW_DATA_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data'
const cacheDir = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kiedas-completeness-'))

function printResults(label, results) {
  console.log(`\n${label}`)
  console.log('| Item | Inventory | Image | Foundry/recipe | Components | Acquisition | Result |')
  console.log('| --- | --- | --- | --- | --- | --- | --- |')
  for (const result of results) {
    const components = result.recipe.presentInDE ? `${result.recipe.components.filter((component) => component.image).length}/${result.recipe.components.length}` : 'N/A'
    const acquisition = result.acquisition.pass ? 'PASS' : `FAIL (${result.acquisition.reason})`
    console.log(`| ${result.name} | ${result.inventory.pass ? 'PASS' : 'FAIL'} | ${result.inventory.image ? 'PASS' : 'FAIL'} | ${result.recipe.presentInDE ? (result.recipe.foundry ? 'PASS' : 'FAIL') : 'N/A'} | ${components} | ${acquisition} | ${result.pass ? 'PASS' : 'FAIL'} |`)
  }
  return results
}

try {
  const raw = await run({ dataDir, deCacheDir: cacheDir, includeDiscovered: false })
  const applied = await applyMerges({ dataDir, out: tempDir, cacheDir })
  const merged = await run({ dataDir: tempDir, deCacheDir: cacheDir, includeDiscovered: false })
  printResults('Raw app export', raw)
  printResults('Merged app export', merged)
  console.log(`\nMerged data directory: ${tempDir}`)
  console.log(`Merge counts: ${JSON.stringify(applied.counts)}`)
  process.exitCode = [...raw, ...merged].every((result) => result.pass) ? 0 : 1
} catch (error) {
  console.error(`check:completeness: ${error.message}`)
  process.exitCode = 1
} finally {
  await fs.rm(tempDir, { recursive: true, force: true })
}
