#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { adaptUpgrades } from './adapters/upgrades.mjs'
import { addManifestIcons, manifestImageMap, mergeImages, mergeUpgrades } from './adapters/merge-upgrades.mjs'

const [cacheDir = '/home/jedwards/.cache/kiedas-de-export', appDir = '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'] = process.argv.slice(2)
const reportPath = process.env.DE_SHADOW_REPORT || '/tmp/de-shadow/upgrades-report.json'
const provenance = JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8'))
const loadDe = async (category) => JSON.parse(await readFile(join(cacheDir, 'assets', `${provenance.categories[category].suffix.replace(/[^A-Za-z0-9._+-]/g, '_')}.json`), 'utf8'))
const loadApp = async (name) => JSON.parse(await readFile(join(appDir, name), 'utf8'))

const [raw, manifest, mirror, mirrorImages] = await Promise.all([loadDe('ExportUpgrades'), loadDe('ExportManifest'), loadApp('ExportUpgrades.json'), loadApp('ExportImages.json')])
const de = adaptUpgrades(raw)
const result = mergeUpgrades(mirror, de)
const withIcons = addManifestIcons(result.merged, manifest)
const images = mergeImages(mirrorImages, manifest)
const onlyDe = result.report.added.map(({ uniqueName }) => ({ uniqueName, name: de[uniqueName]?.name || null, icon: withIcons[uniqueName]?.icon || null }))
const targetNames = ["Brood's Oversurge", 'Cold Front', 'Gastroparesis', 'Infernum']
const targets = targetNames.map((name) => {
  const entry = Object.entries(withIcons).find(([, record]) => record.name === name)
  const image = entry && manifestImageMap(manifest).get(entry[0])
  return { name, uniqueName: entry?.[0] || null, description: entry?.[1]?.levelStats?.[0]?.stats?.[0] || null, icon: entry?.[1]?.icon || null, image: image ? `asset-cache://content.warframe.com/PublicExport${image.path}!${image.contentHash}` : null }
})
const report = {
  source: { cacheDir: resolve(cacheDir), appDir: resolve(appDir), locale: 'en', authority: 'Digital Extremes Public Export cache' },
  counts: { de: Object.keys(de).length, mirror: Object.keys(mirror).length, merged: Object.keys(withIcons).length, deOnly: result.report.added.length, mirrorOnly: result.report.mirrorOnly.length, images: Object.keys(images.merged).length },
  deOnly: onlyDe,
  targets,
  merge: result.report,
}
await mkdir('/tmp/de-shadow', { recursive: true })
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Upgrades: DE ${report.counts.de} | app ${report.counts.mirror} | merged ${report.counts.merged} | DE-only ${report.counts.deOnly} | mirror-only ${report.counts.mirrorOnly}`)
for (const target of targets) console.log(`  ${target.name}: ${target.uniqueName ? 'catalog' : 'MISSING'} | ${target.description ? 'description' : 'MISSING DESCRIPTION'} | ${target.image ? 'hashed image' : 'MISSING IMAGE'}`)
console.log(`JSON report: ${reportPath}`)
