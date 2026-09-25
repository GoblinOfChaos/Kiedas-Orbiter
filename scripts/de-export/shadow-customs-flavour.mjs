#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { adaptCustoms, adaptFlavour, manifestIcons, mergeCustoms, mergeFlavour } from './adapters/merge-customs-flavour.mjs'

const [cacheDir = '/home/jedwards/.cache/kiedas-de-export', appDir = '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'] = process.argv.slice(2)
const provenance = JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8'))
const load = async (category) => { const suffix = provenance.categories[category].suffix.replace(/[^A-Za-z0-9._+-]/g, '_'); return JSON.parse(await readFile(join(cacheDir, 'assets', `${suffix}.json`), 'utf8')) }
const [rawCustoms, rawFlavour, manifest, appCustoms, appFlavour] = await Promise.all([
  load('ExportCustoms'), load('ExportFlavour'), load('ExportManifest'),
  readFile(join(appDir, 'ExportCustoms.json'), 'utf8').then(JSON.parse), readFile(join(appDir, 'ExportFlavour.json'), 'utf8').then(JSON.parse),
])
const customs = manifestIcons(adaptCustoms(rawCustoms), manifest)
const flavour = manifestIcons(adaptFlavour(rawFlavour), manifest)
const customMerge = mergeCustoms(appCustoms, customs)
const flavourMerge = mergeFlavour(appFlavour, flavour)
const report = {
  source: { cacheDir: resolve(cacheDir), appDir: resolve(appDir), locale: 'en', authority: 'Digital Extremes Public Export cache' },
  counts: { de: { customs: Object.keys(customs).length, flavour: Object.keys(flavour).length }, mirror: { customs: Object.keys(appCustoms).length, flavour: Object.keys(appFlavour).length } },
  onlyDe: { customs: customMerge.report.added, flavour: flavourMerge.report.added },
  mirrorOnly: { customs: customMerge.report.mirrorOnly, flavour: flavourMerge.report.mirrorOnly },
  merge: { customs: customMerge.report, flavour: flavourMerge.report },
  images: { manifestEntries: (manifest.Manifest || manifest).length, deCustomsWithIcons: Object.values(customs).filter((record) => record.icon).length, deFlavourWithIcons: Object.values(flavour).filter((record) => record.icon).length },
}
const reportPath = process.env.DE_SHADOW_REPORT || '/tmp/de-shadow/customs-flavour-report.json'
await mkdir('/tmp/de-shadow', { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Customs: DE ${report.counts.de.customs} | app ${report.counts.mirror.customs} | DE-only ${report.onlyDe.customs.length} | mirror-only ${report.mirrorOnly.customs.length}`)
console.log(`Flavour: DE ${report.counts.de.flavour} | app ${report.counts.mirror.flavour} | DE-only ${report.onlyDe.flavour.length} | mirror-only ${report.mirrorOnly.flavour.length}`)
console.log(`Manifest entries: ${report.images.manifestEntries}; DE records with icons: customs ${report.images.deCustomsWithIcons}, flavour ${report.images.deFlavourWithIcons}`)
console.log(`JSON report: ${reportPath}`)
