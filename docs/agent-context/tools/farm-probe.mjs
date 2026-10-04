import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../src/lib/dropsParser.js'
const h = await loadRealHarness()
const { parseInventory } = await import('../src/lib/inventoryParser.js')
const { buildAllAcquisitionIndexes } = await import('../src/lib/acquisitionInfo.js')
const { buildFarmingTargetsScreenModel, buildPreviewPlaceIndex } = await import('../src/lib/farmingTargets/screenModel.js')
const inv = parseInventory(JSON.parse(fs.readFileSync(path.join(DEFAULT_DATA_DIR, 'user/inventory.json'), 'utf8')), h.exportsBundle, h.dict, 'en', null)
const store = JSON.parse(fs.readFileSync(path.join(DEFAULT_DATA_DIR, 'user/farming-targets.json'), 'utf8'))
const targets = store.targets
const ix = await buildAllAcquisitionIndexes(h.exportsBundle)
const dropIndex = buildDropIndex(h.exportsBundle)
console.log('targets', targets.length, targets.map((t) => `${t.name} x${t.quantity}/${t.status}`).join('; '))
const placeIndex = buildPreviewPlaceIndex({ dropIndex, wikiResourceIndex: ix.wikiResourceIndex, wikiVendorIndex: ix.wikiVendorIndex, exportVendorIndex: ix.exportVendorIndex, exportData: h.exportsBundle, dict: h.dict, regions: h.exportsBundle.ExportRegions })
const types = {}
for (const p of placeIndex.places.values()) types[p.type] = (types[p.type] || 0) + 1
console.log('place types', types)
for (const tab of ['all', 'missions', 'enemies', 'relics', 'vendors', 'conclave']) {
  const m = buildFarmingTargetsScreenModel({ targets, inventoryData: inv, exportData: h.exportsBundle, dropIndex, wikiResourceIndex: ix.wikiResourceIndex, wikiVendorIndex: ix.wikiVendorIndex, exportVendorIndex: ix.exportVendorIndex, placeIndex, filters: { tab } })
  console.log(tab, 'ranked', m.ranked.length, '| ledger needed', m.ledger.filter((r) => r.stillNeeded > 0).length, '/', m.ledger.length, m.ranked.slice(0, 3).map((r) => r.place.name))
}
const m = buildFarmingTargetsScreenModel({ targets, inventoryData: inv, exportData: h.exportsBundle, dropIndex, wikiResourceIndex: ix.wikiResourceIndex, wikiVendorIndex: ix.wikiVendorIndex, exportVendorIndex: ix.exportVendorIndex, placeIndex, filters: { tab: 'all' } })
console.log(m.ranked.map((r) => `${r.place.type}:${r.place.name}(${r.coveredItems.length})`).join(' | '))
console.log('needed:', m.ledger.filter((r) => r.stillNeeded > 0).map((r) => `${r.name} ${r.stillNeeded}`).join('; '))
