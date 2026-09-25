#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { adaptGear, adaptSentinels } from './adapters/sentgear.mjs'
import { mergeGear, mergeSentinels } from './adapters/merge-sentgear.mjs'

const [cacheDir = '/home/jedwards/.cache/kiedas-de-export', appDir = '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'] = process.argv.slice(2)
const reportPath = process.env.DE_SHADOW_REPORT || '/tmp/de-shadow/sentgear-report.json'
const provenance = JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8'))
const loadDe = async (category) => {
  const suffix = provenance.categories[category].suffix.replace(/[^A-Za-z0-9._+-]/g, '_')
  return JSON.parse(await readFile(join(cacheDir, 'assets', `${suffix}.json`), 'utf8'))
}
const [sentinelsRaw, gearRaw, mirrorSentinels, mirrorGear] = await Promise.all([
  loadDe('ExportSentinels'), loadDe('ExportGear'),
  readFile(join(appDir, 'ExportSentinels.json'), 'utf8').then(JSON.parse),
  readFile(join(appDir, 'ExportGear.json'), 'utf8').then(JSON.parse),
])
const deSentinels = adaptSentinels(sentinelsRaw)
const deGear = adaptGear(gearRaw)
const sentinels = mergeSentinels(mirrorSentinels, deSentinels)
const gear = mergeGear(mirrorGear, deGear)
const report = {
  source: { cacheDir: resolve(cacheDir), appDir: resolve(appDir), locale: 'en', authority: 'Digital Extremes Public Export cache' },
  counts: { de: { sentinels: Object.keys(deSentinels).length, gear: Object.keys(deGear).length }, mirror: { sentinels: Object.keys(mirrorSentinels).length, gear: Object.keys(mirrorGear).length } },
  merge: { sentinels: sentinels.report, gear: gear.report },
  deOnly: { sentinels: sentinels.report.added, gear: gear.report.added },
  mirrorOnly: { sentinels: sentinels.report.mirrorOnly, gear: gear.report.mirrorOnly },
}
await mkdir('/tmp/de-shadow', { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
for (const [label, item] of Object.entries(report.merge)) console.log(`${label}: DE ${item.counts.de} | mirror ${item.counts.mirror} | changed ${item.counts.changed} | DE-only ${item.counts.added} | mirror-only ${item.counts.mirrorOnly}`)
console.log(`JSON report: ${reportPath}`)
