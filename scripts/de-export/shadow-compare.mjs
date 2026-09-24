#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const CATEGORIES = [
  'ExportWarframes', 'ExportWeapons', 'ExportCustoms', 'ExportUpgrades',
  'ExportRecipes', 'ExportRelicArcane', 'ExportResources', 'ExportFlavour',
  'ExportRegions', 'ExportSentinels', 'ExportGear', 'ExportKeys',
  'ExportDrones', 'ExportFusionBundles', 'ExportSortieRewards',
  'ExportManifest',
]

function valueRecords(value, category) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value[category])) return value[category]
  const arrays = Object.values(value).filter(Array.isArray)
  return arrays.length ? arrays.flat() : Object.entries(value).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

async function loadCandidate(cacheDir) {
  const provenance = JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8'))
  const result = {}
  for (const category of CATEGORIES) {
    const suffix = provenance.categories[category].suffix.replace(/[^A-Za-z0-9._+-]/g, '_')
    result[category] = JSON.parse(await readFile(join(cacheDir, 'assets', `${suffix}.json`), 'utf8'))
  }
  return result
}

async function loadBaseline(folder, category) {
  const names = [`${category}.json`, `${category}_en.json`]
  for (const name of names) {
    try { return JSON.parse(await readFile(join(folder, name), 'utf8')) } catch { /* try next name */ }
  }
  const files = await readdir(folder)
  const match = files.find((name) => name.startsWith(`${category}.`) && name.endsWith('.json'))
  if (match) return JSON.parse(await readFile(join(folder, match), 'utf8'))
  return null
}

function keyOf(record) {
  return record?.uniqueName || record?.name || record?.id || null
}

const [cacheDir, baselineDir] = process.argv.slice(2)
if (!cacheDir || !baselineDir) {
  console.error('Usage: node scripts/de-export/shadow-compare.mjs CACHE_DIR BASELINE_EXPORT_FOLDER')
  process.exit(2)
}

const candidate = await loadCandidate(cacheDir)
const findings = []
for (const category of CATEGORIES) {
  const baselineValue = await loadBaseline(baselineDir, category)
  if (!baselineValue) {
    findings.push({ severity: 'info', category, message: 'baseline category unavailable' })
    continue
  }
  const current = new Map(valueRecords(candidate[category], category).map((record) => [keyOf(record), record]).filter(([key]) => key))
  const baseline = new Map(valueRecords(baselineValue, category).map((record) => [keyOf(record), record]).filter(([key]) => key))
  const added = [...current.keys()].filter((key) => !baseline.has(key))
  const removed = [...baseline.keys()].filter((key) => !current.has(key))
  const collapse = baseline.size > 0 && current.size < baseline.size * 0.8
  const severity = collapse ? 'critical' : (added.length || removed.length ? 'warning' : 'info')
  findings.push({ severity, category, baselineCount: baseline.size, candidateCount: current.size, added: added.length, removed: removed.length })
}

const rank = { critical: 0, warning: 1, info: 2 }
findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.category.localeCompare(b.category))
for (const finding of findings) console.log(`[${finding.severity.toUpperCase()}] ${finding.category}: ${JSON.stringify(finding)}`)
