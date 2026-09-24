#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { adaptWarframes, WARFRAME_APP_FIELDS } from './adapters/warframes.mjs'
import { mergeWarframes } from './adapters/merge-warframes.mjs'

const DEFAULT_CACHE = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const DEFAULT_APP = process.env.KIEDAS_PREVIEW_EXPORT_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'
const REPORT_PATH = '/tmp/de-shadow/warframes-report.json'

const [cacheDir = DEFAULT_CACHE, appDir = DEFAULT_APP] = process.argv.slice(2)

function mapRecords(value) {
  if (Array.isArray(value)) return Object.fromEntries(value.filter((r) => r?.uniqueName).map((r) => [r.uniqueName, r]))
  if (value?.ExportWarframes) return mapRecords(value.ExportWarframes)
  return Object.fromEntries(Object.entries(value || {}).map(([key, value]) => [value?.uniqueName || key, { uniqueName: value?.uniqueName || key, ...value }]))
}

function equal(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

const provenance = JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8'))
const suffix = provenance.categories.ExportWarframes.suffix.replace(/[^A-Za-z0-9._+-]/g, '_')
const deRaw = JSON.parse(await readFile(join(cacheDir, 'assets', `${suffix}.json`), 'utf8'))
const appRaw = JSON.parse(await readFile(join(appDir, 'ExportWarframes.json'), 'utf8'))
const de = adaptWarframes(deRaw)
const app = mapRecords(appRaw)
const { report: mergeReport } = mergeWarframes(app, de)
const deKeys = Object.keys(de).sort()
const appKeys = Object.keys(app).sort()
const both = deKeys.filter((key) => app[key])
const onlyDe = deKeys.filter((key) => !app[key])
const onlyApp = appKeys.filter((key) => !de[key])
const mismatches = {}
for (const field of WARFRAME_APP_FIELDS) {
  const examples = []
  for (const key of both) {
    if (!equal(de[key][field], app[key][field])) {
      if (examples.length < 10) examples.push({ uniqueName: key, de: de[key][field] ?? null, app: app[key][field] ?? null })
    }
  }
  const count = both.reduce((total, key) => total + (equal(de[key][field], app[key][field]) ? 0 : 1), 0)
  if (count) mismatches[field] = { count, examples }
}
const sprintSpeedsUnchangedAfterRounding = both.filter((key) => {
  const deSpeed = de[key].sprintSpeed
  const appSpeed = app[key].sprintSpeed
  return typeof deSpeed === 'number' && typeof appSpeed === 'number' &&
    deSpeed !== appSpeed && Math.round(deSpeed * 1_000_000) / 1_000_000 === appSpeed
}).length

const report = {
  source: { cacheDir: resolve(cacheDir), appDir: resolve(appDir), locale: 'en' },
  counts: { de: deKeys.length, app: appKeys.length, comparable: both.length, onlyDe: onlyDe.length, onlyApp: onlyApp.length },
  onlyDe: onlyDe.map((uniqueName) => ({ uniqueName, name: de[uniqueName].name })),
  onlyApp: onlyApp.map((uniqueName) => ({ uniqueName, name: app[uniqueName].name, explanation: 'Present only in the export-plus baseline; no DE adapter record.' })),
  mismatches,
  sprintSpeedsUnchangedAfterRounding,
  mergeReport,
}

await mkdir('/tmp/de-shadow', { recursive: true })
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Warframes shadow comparison (DE adapter -> export-plus baseline)`)
console.log(`DE: ${report.counts.de} | app: ${report.counts.app} | comparable: ${report.counts.comparable}`)
console.log(`Only in DE: ${report.onlyDe.map((x) => `${x.name} (${x.uniqueName})`).join(', ') || 'none'}`)
console.log(`Only in app: ${report.onlyApp.map((x) => x.uniqueName).join(', ') || 'none'}`)
console.log('Mismatching fields:')
for (const [field, finding] of Object.entries(mismatches)) console.log(`  ${field}: ${finding.count} (${finding.examples.slice(0, 3).map((x) => x.uniqueName).join(', ')})`)
console.log(`Merge: ${mergeReport.counts.changed} changed, ${mergeReport.counts.added} DE-only added, ${mergeReport.counts.mirrorOnly} mirror-only retained`)
console.log(`Changed fields: ${[...new Set(mergeReport.changed.flatMap((entry) => entry.fields))].sort().join(', ') || 'none'}`)
console.log(`Sprint speeds unchanged after six-decimal rounding: ${sprintSpeedsUnchangedAfterRounding}`)
console.log(`JSON report: ${REPORT_PATH}`)
