#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { adaptRelicsArcanes, mergeRelicsArcanes } from './adapters/relics-arcanes.mjs'

const [cacheDir = '/home/jedwards/.cache/kiedas-de-export', appDir = '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'] = process.argv.slice(2)
const reportPath = process.env.DE_SHADOW_REPORT || '/tmp/de-shadow/relics-arcanes-report.json'
const provenance = JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8'))
const suffix = provenance.categories.ExportRelicArcane.suffix.replace(/[^A-Za-z0-9._+-]/g, '_')
const raw = JSON.parse(await readFile(join(cacheDir, 'assets', `${suffix}.json`), 'utf8'))
const de = adaptRelicsArcanes(raw)
const mirrorRelics = JSON.parse(await readFile(join(appDir, 'ExportRelics.json'), 'utf8'))
const mirrorArcanes = JSON.parse(await readFile(join(appDir, 'ExportArcanes.json'), 'utf8'))
const result = mergeRelicsArcanes(mirrorRelics, mirrorArcanes, de)
const onlyDe = (source, mirror) => Object.keys(source).filter((key) => !mirror[key]).sort().map((uniqueName) => ({ uniqueName, name: source[uniqueName].name || null }))
const report = {
  source: { cacheDir: resolve(cacheDir), appDir: resolve(appDir), locale: 'en', authority: 'Digital Extremes Public Export cache' },
  counts: { de: { total: Object.keys(raw.ExportRelicArcane || raw).length, relics: Object.keys(de.relics).length, arcanes: Object.keys(de.arcanes).length }, mirror: { relics: Object.keys(mirrorRelics).length, arcanes: Object.keys(mirrorArcanes).length } },
  onlyDe: { relics: onlyDe(de.relics, mirrorRelics), arcanes: onlyDe(de.arcanes, mirrorArcanes) },
  mirrorOnly: { relics: result.report.relics.mirrorOnly, arcanes: result.report.arcanes.mirrorOnly },
  merge: result.report,
  rewards: { deRelicRecordsWithRelicRewards: Object.values(de.relics).filter((record) => Array.isArray(record.relicRewards)).length, exportRewardsDeCounterpart: false },
}
await mkdir('/tmp/de-shadow', { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Relics: DE ${report.counts.de.relics} | app ${report.counts.mirror.relics} | DE-only ${report.onlyDe.relics.length} | mirror-only ${report.mirrorOnly.relics.length}`)
console.log(`Arcanes: DE ${report.counts.de.arcanes} | app ${report.counts.mirror.arcanes} | DE-only ${report.onlyDe.arcanes.length} | mirror-only ${report.mirrorOnly.arcanes.length}`)
console.log(`DE relic records with relicRewards: ${report.rewards.deRelicRecordsWithRelicRewards}; ExportRewards DE counterpart: no`)
console.log(`JSON report: ${reportPath}`)
