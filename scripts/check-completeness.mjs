#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from './de-export/apply-merges.mjs'
import { run } from './item-completeness.mjs'

const dataDir = process.env.PREVIEW_DATA_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data'
const cacheDir = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const repo = path.resolve(new URL('..', import.meta.url).pathname)
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kiedas-completeness-'))

function printResults(label, results) {
  console.log(`\n${label}`)
  console.log('| Item | Category | Inventory | Image | Foundry | Acquisition | Screens | Result |')
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const result of results) {
    const screens = Object.entries(result.screens).map(([screen, pass]) => `${screen}:${pass ? 'PASS' : 'FAIL'}`).join(', ')
    console.log(`| ${result.name} | ${result.category} | ${result.checks.U1_catalog ? 'PASS' : 'FAIL'} | ${result.checks.U3_image ? 'PASS' : 'FAIL'} | ${result.checks.recipe ? 'PASS' : 'FAIL'} | ${result.acquisition.pass ? 'PASS' : 'CANNOT'} | ${screens} | ${result.pass ? 'PASS' : 'FAIL'} |`)
  }
  return results
}

try {
  const applied = await applyMerges({ dataDir, out: tempDir, cacheDir })
  const raw = await run({ dataDir, includeDiscovered: false })
  const merged = await run({ dataDir: tempDir, includeDiscovered: false })
  printResults('Raw app export', raw)
  printResults('Merged app export', merged)
  console.log(`\nMerged data directory: ${tempDir}`)
  console.log(`Merge counts: ${JSON.stringify(applied.counts)}`)
  const cannot = [...new Set([...raw, ...merged].flatMap((result) => result.cannot.concat(result.acquisition.cannot || [], result.ownedState.cannot || [])))]
  console.log('\nCannot be checked:')
  for (const entry of cannot) console.log(`- ${entry}`)
  const report = ['# Completeness matrix', '', `Generated: ${new Date().toISOString()}`, '', 'The command output below is the real-data run after applying DE merges.', '', '## Merged app export', '', '| Item | Category | Inventory | Image | Foundry | Acquisition | Screens | Result |', '| --- | --- | --- | --- | --- | --- | --- | --- |', ...merged.map((result) => `| ${result.name} | ${result.category} | ${result.checks.U1_catalog ? 'PASS' : 'FAIL'} | ${result.checks.U3_image ? 'PASS' : 'FAIL'} | ${result.checks.recipe ? 'PASS' : 'FAIL'} | ${result.acquisition.pass ? 'PASS' : 'CANNOT'} | ${Object.entries(result.screens).map(([screen, pass]) => `${screen}:${pass ? 'PASS' : 'FAIL'}`).join(', ')} | ${result.pass ? 'PASS' : 'FAIL'} |`), '', '## Cannot be checked', '', ...cannot.map((entry) => `- ${entry}`), '']
  await fs.mkdir(path.join(repo, 'docs/agent-reports'), { recursive: true })
  await fs.writeFile(path.join(repo, 'docs/agent-reports/matrix.md'), report.join('\n'))
  process.exitCode = [...raw, ...merged].every((result) => result.pass) ? 0 : 1
} catch (error) {
  console.error(`check:completeness: ${error.message}`)
  process.exitCode = 1
} finally {
  await fs.rm(tempDir, { recursive: true, force: true })
}
