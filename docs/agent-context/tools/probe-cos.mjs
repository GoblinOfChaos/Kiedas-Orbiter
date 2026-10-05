import fs from 'node:fs'
import { loadRealHarness } from '../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../src/lib/dropsParser.js'
const overrides = JSON.parse(fs.readFileSync(new URL('../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url)))
const h = await loadRealHarness({ locale: 'en' })
const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../src/lib/acquisitionInfo.js')
const ix = await buildAllAcquisitionIndexes(h.exportsBundle); const di = buildDropIndex(h.exportsBundle)
const rowsOf = (s) => (s || []).flatMap((x) => x?.sources ? rowsOf(x.sources) : x ? [x] : [])
const names = process.argv.slice(2)
for (const tn of ['ExportCustoms', 'ExportResources', 'ExportUpgrades']) {
  const t = h.exportsBundle[tn] || {}
  for (const n of names) for (const [u, v] of Object.entries(t)) if ((h.dict[v.name] || v.name) === n) {
    const r = getAcquisitionInfo(u, n, di, overrides, ix.recipeResultIndex, ix.marketIndex, ix.bundleIndex, ix.syndicateIndex, ix.wikiSigilIndex, ix.wikiVendorIndex, ix.wikiTennoGenIndex, ix.wikiBaroIndex, ix.exportVendorIndex, ix.alwaysAvailableIndex, ix.glyphSupplementIndex, ix.wikiBlueprintIndex, ix.wikiResearchIndex, ix.relicStateIndex, ix.wikiResourceIndex, ix.wikiPageAcquisitionIndex, ix.wikiAcquisitionStatusIndex, ix.exaltedWeaponIndex, ix.exportComponentIndex)
    console.log(`\n## ${n} (${tn})`)
    for (const x of rowsOf(r.sources).slice(0, 5)) console.log('  -', x.type, '| place:', x.placeLabel || '', '| text:', String(x.text || '').slice(0, 170))
  }
}
