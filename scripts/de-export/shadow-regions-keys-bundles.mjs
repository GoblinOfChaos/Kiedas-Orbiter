#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { adaptFusionBundles, adaptKeys, adaptRegions, mergeFusionBundles, mergeKeys, mergeRegions } from './adapters/regions-keys-bundles.mjs'

const DEFAULT_CACHE = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const DEFAULT_APP = process.env.KIEDAS_PREVIEW_EXPORT_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'
const DEFAULT_REPORT = '/tmp/de-shadow/regions-keys-bundles-report.json'
const [cacheDir = DEFAULT_CACHE, appDir = DEFAULT_APP, reportPath = DEFAULT_REPORT] = process.argv.slice(2)

const provenance = JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8'))
const loadDe = async (category) => {
  const suffix = provenance.categories[category].suffix.replace(/[^A-Za-z0-9._+-]/g, '_')
  return JSON.parse(await readFile(join(cacheDir, 'assets', `${suffix}.json`), 'utf8'))
}
const loadApp = async (name) => {
  try { return JSON.parse(await readFile(join(appDir, name), 'utf8')) } catch { return {} }
}
const keys = (value) => Object.keys(value || {}).sort()
const compare = (de, app, merge) => ({
  counts: { de: merge.report.counts.de, app: merge.report.counts.mirror, comparable: keys(de).filter((key) => app[key]).length, onlyDe: merge.report.counts.added, onlyApp: merge.report.counts.mirrorOnly },
  onlyDe: merge.report.added.map(({ uniqueName, fields }) => ({ uniqueName, fields })),
  onlyApp: merge.report.mirrorOnly,
  changed: merge.report.changed,
  fieldDiffs: merge.report.fieldDiffs,
})

const [regionsRaw, keysRaw, fusionRaw, regionsApp, keysApp, fusionApp] = await Promise.all([
  loadDe('ExportRegions'), loadDe('ExportKeys'), loadDe('ExportFusionBundles'),
  loadApp('ExportRegions.json'), loadApp('ExportKeys.json'), loadApp('ExportFusionBundles.json'),
])
const regionsDe = adaptRegions(regionsRaw)
const keysDe = adaptKeys(keysRaw)
const fusionDe = adaptFusionBundles(fusionRaw)
const regions = mergeRegions(regionsApp, regionsDe)
const questKeys = mergeKeys(keysApp, keysDe)
const fusionBundles = mergeFusionBundles(fusionApp, fusionDe)
const report = {
  source: { cacheDir: resolve(cacheDir), appDir: resolve(appDir), authority: 'Digital Extremes Public Export cache', namespaceNote: 'ExportFusionBundles is reported separately and is never merged into ExportBundles.' },
  regions: compare(regionsDe, regionsApp, regions),
  keys: compare(keysDe, keysApp, questKeys),
  fusionBundles: compare(fusionDe, fusionApp, fusionBundles),
}
await mkdir(resolve(reportPath, '..'), { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
for (const [category, finding] of Object.entries(report).filter(([key]) => ['regions', 'keys', 'fusionBundles'].includes(key))) {
  console.log(`${category}: DE ${finding.counts.de} | app ${finding.counts.app} | comparable ${finding.counts.comparable} | added ${finding.counts.onlyDe} | changed ${finding.changed.length} | mirror-only kept ${finding.counts.onlyApp}`)
  console.log(`  changed fields: ${Object.keys(finding.fieldDiffs).sort().join(', ') || 'none'}`)
}
console.log(`JSON report: ${reportPath}`)
