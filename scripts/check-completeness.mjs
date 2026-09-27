#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from './de-export/apply-merges.mjs'
import { CATEGORY_RULES, checkMatrixItem, discoverNewDeSubjects, discoverSubjects, run } from './item-completeness.mjs'
import { loadRealHarness } from './lib/real-data-harness.mjs'

const dataDir = process.env.PREVIEW_DATA_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data'
const cacheDir = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const repo = path.resolve(new URL('..', import.meta.url).pathname)
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kiedas-completeness-'))
const full = process.argv.includes('--full') || process.env.KIEDAS_COMPLETENESS_FULL === '1'
const reportFile = full ? 'docs/agent-reports/matrix-full.md' : 'docs/agent-reports/matrix.md'

function printResults(label, results) {
  console.log(`\n${label}`)
  console.log('| Item | Category | Inventory | Image | Foundry | Acquisition | Screens | Result |')
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const result of results) {
    const checks = result.checks || reportChecks(result)
    const screens = reportScreens(result)
    console.log(`| ${result.name} | ${result.category} | ${checks.U1_catalog ? 'PASS' : 'FAIL'} | ${checks.U3_image ? 'PASS' : 'FAIL'} | ${checks.recipe ? 'PASS' : 'FAIL'} | ${result.acquisition.pass ? 'PASS' : result.acquisition.cannot ? 'CANNOT' : 'FAIL'} | ${Object.entries(screens).map(([screen, pass]) => `${screen}:${pass ? 'PASS' : 'FAIL'}`).join(', ')} | ${result.status} |`)
  }
  const summary = new Map()
  for (const result of results) {
    const counts = summary.get(result.category) || { PASS: 0, FAIL: 0, CANNOT: 0 }
    counts[result.status]++
    summary.set(result.category, counts)
  }
  console.log('\nPer-category summary')
  for (const [category, counts] of summary) console.log(`- ${category}: PASS ${counts.PASS}, FAIL ${counts.FAIL}, CANNOT ${counts.CANNOT}`)
  const failing = results.filter((result) => result.status !== 'PASS')
  if (failing.length) {
    console.log('\nFailing rows and rules')
    for (const result of failing) {
      const rules = result.failedChecks || Object.entries(result.checks || {}).filter(([, pass]) => !pass).map(([rule]) => rule)
      const screens = Array.isArray(result.screens) ? result.screens : Object.entries(result.screens || {}).filter(([, pass]) => !pass).map(([screen]) => screen)
      console.log(`- ${result.status}: ${result.name} [${result.category}] rules=${rules.join(',') || 'acquisition'} screens=${screens.join(',') || 'Drawer'}${result.blockingCannot ? ` reason=${result.blockingCannot}` : ''}`)
    }
  }
  return results
}

// Full mode can contain more than twenty thousand subjects. Keep only the
// fields needed by the report after each check, rather than retaining every
// acquisition result, catalog object, and source row until Promise.all ends.
function compactResult(result) {
  return {
    name: result.name,
    uniqueName: result.uniqueName,
    category: result.category,
    status: result.status,
    failedChecks: Object.entries(result.checks).filter(([, pass]) => !pass).map(([id]) => id),
    screens: Object.entries(result.screens).filter(([, pass]) => !pass).map(([screen]) => screen),
    screenNames: Object.keys(result.screens),
    acquisition: {
      pass: result.acquisition.pass,
      cannot: result.acquisition.cannot,
      honestEmpty: result.acquisition.honestEmpty,
    },
    cannot: [...result.cannot, result.ownedState.cannot].filter(Boolean),
    blockingCannot: result.blockingCannot,
  }
}

function reportChecks(result) {
  const failed = new Set(result.failedChecks || [])
  return { U1_catalog: !failed.has('U1_catalog'), U3_image: !failed.has('U3_image'), recipe: !failed.has('recipe') }
}

function reportScreens(result) {
  const failed = new Set(Array.isArray(result.screens)
    ? result.screens
    : Object.entries(result.screens || {}).filter(([, pass]) => !pass).map(([screen]) => screen))
  const screenNames = result.screenNames || CATEGORY_RULES[result.category]?.screens || []
  return Object.fromEntries(screenNames.map((screen) => [screen, !failed.has(screen)]))
}

async function runFullStream(harness) {
  // Keep this dynamic: real-data-harness.mjs installs the extensionless .js
  // resolver before inventoryParser.js and its source imports are loaded.
  const { parseInventory } = await import('../src/lib/inventoryParser.js')
  const subjects = discoverSubjects(harness)
  const parsed = parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)
  const results = []
  for (const subject of subjects) {
    const result = await checkMatrixItem({ harness, subject, parsed, syntheticOwned: false })
    results.push(compactResult(result))
    if (results.length % 1000 === 0) console.log(`Full-mode progress: ${results.length}/${subjects.length}`)
  }
  return results
}

try {
  const applied = await applyMerges({ dataDir, out: tempDir, cacheDir })
  const raw = await run({ dataDir, includeDiscovered: false })
  let merged
  if (full) {
    const mergedHarness = await loadRealHarness({ dataDir: tempDir, repo })
    merged = await runFullStream(mergedHarness)
  } else {
    merged = await run({ dataDir: tempDir, deDiscovery: discoverNewDeSubjects({ dataDir, cacheDir }) })
  }
  printResults('Raw app export', raw)
  printResults(full ? 'Full-mode app export (every catalog item)' : 'Merged app export', merged)
  console.log(`\nMerged data directory: ${tempDir}`)
  console.log(`Merge counts: ${JSON.stringify(applied.counts)}`)
  const cannot = [...new Set([...raw, ...merged].flatMap((result) => [
    ...(result.cannot || []), ...(result.acquisition?.cannot ? [result.acquisition.cannot] : []), ...(result.ownedState?.cannot ? [result.ownedState.cannot] : []),
  ]))]
  console.log('\nCannot be checked:')
  for (const entry of cannot) console.log(`- ${entry}`)
  const categoryCounts = Object.fromEntries([...new Set(merged.map((result) => result.category))].sort().map((category) => {
    const rows = merged.filter((result) => result.category === category)
    return [category, { PASS: rows.filter((row) => row.status === 'PASS').length, FAIL: rows.filter((row) => row.status === 'FAIL').length, CANNOT: rows.filter((row) => row.status === 'CANNOT').length }]
  }))
  const failing = merged.filter((result) => result.status !== 'PASS')
  const discoveryNote = full ? 'Full-mode run after applying DE merges. Discovery is every item in every CATEGORY_RULES table (no diff filtering), plus the three canaries. Owned-state (U7) is skipped for cost, since this run checks presence/name/image/recipe/acquisition, not ownership.' : 'Real-data run after applying DE merges. Discovery is the set of DE cache entries absent from the pre-merge mirror export, plus the three canaries.'
  const report = ['# Completeness matrix' + (full ? ' (full mode)' : ''), '', `Generated: ${new Date().toISOString()}`, '', discoveryNote, '', '## Per-category summary', '', '| Category | PASS | FAIL | CANNOT |', '| --- | ---: | ---: | ---: |', ...Object.entries(categoryCounts).map(([category, counts]) => `| ${category} | ${counts.PASS} | ${counts.FAIL} | ${counts.CANNOT} |`), '', '## Failing rows and rules', '', ...(failing.length ? failing.map((result) => {
    const rules = (result.failedChecks || Object.entries(result.checks || {}).filter(([, pass]) => !pass).map(([rule]) => rule)).join(', ') || 'acquisition'
    const screens = (result.screens || Object.entries(result.screens || {}).filter(([, pass]) => !pass).map(([screen]) => screen)).join(', ') || 'Drawer'
    return `- **${result.status}** ${result.name} [${result.category}] — rules: ${rules}; screens: ${screens}${result.blockingCannot ? `; reason: ${result.blockingCannot}` : ''}`
  }) : ['- None']), '', `## ${full ? 'Full-mode' : 'Merged'} app export`, '', '| Item | Category | Inventory | Image | Foundry | Acquisition | Screens | Result |', '| --- | --- | --- | --- | --- | --- | --- | --- |', ...merged.map((result) => { const checks = result.checks || reportChecks(result); const screens = result.screens && !Array.isArray(result.screens) ? result.screens : reportScreens(result); return `| ${result.name} | ${result.category} | ${checks.U1_catalog ? 'PASS' : 'FAIL'} | ${checks.U3_image ? 'PASS' : 'FAIL'} | ${checks.recipe ? 'PASS' : 'FAIL'} | ${result.acquisition.pass ? 'PASS' : result.acquisition.cannot ? 'CANNOT' : 'FAIL'} | ${Object.entries(screens).map(([screen, pass]) => `${screen}:${pass ? 'PASS' : 'FAIL'}`).join(', ')} | ${result.status} |` }), '', '## Cannot be checked', '', ...(cannot.length ? cannot.map((entry) => `- ${entry}`) : ['- None']), '']
  await fs.mkdir(path.join(repo, 'docs/agent-reports'), { recursive: true })
  await fs.writeFile(path.join(repo, reportFile), report.join('\n'))
  const strict = process.argv.includes('--strict')
  process.exitCode = [...raw, ...merged].every((result) => result.status === 'PASS' || (!strict && result.status === 'CANNOT')) ? 0 : 1
} catch (error) {
  console.error(`check:completeness: ${error.message}`)
  process.exitCode = 1
} finally {
  await fs.rm(tempDir, { recursive: true, force: true })
}
