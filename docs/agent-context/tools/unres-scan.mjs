import fs from 'node:fs'
import { loadRealHarness } from '../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../src/lib/dropsParser.js'

const overrides = JSON.parse(fs.readFileSync(new URL('../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url)))
const h = await loadRealHarness()
const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../src/lib/acquisitionInfo.js')
const ix = await buildAllAcquisitionIndexes(h.exportsBundle)
const di = buildDropIndex(h.exportsBundle)
const ex = h.exportsBundle
const all = []
for (const k of Object.keys(ex)) {
  if (!/^Export(Warframes|Weapons|Recipes|Resources|Sentinels|Gear|Misc|Customs|Upgrades)$/.test(k)) continue
  const v = ex[k]
  const entries = Array.isArray(v) ? v.map((e) => [e.uniqueName, e]) : Object.entries(v)
  for (const [u, e] of entries) if (u && e) all.push({ uniqueName: u, name: e.name || e.displayName || '', table: k })
}
const inv = JSON.parse(fs.readFileSync(`${process.env.HOME}/.local/share/kiedas-orbiter-preview/data/user/inventory.json`, 'utf8'))



const zeroByCat = {}; let zero = 0; const zeroNames = []
const rarityLabel = { items: 0, rows: 0 }; const rarityEx = []
const wall = { items: 0, rows: 0 }; const wallEx = []
const tableRes = { items: 0 }; const tEx = []
const catOf = (u) => u.split('/')[2] || 'x'
const counts = {}; const exm = {}

const invRaw = JSON.parse(fs.readFileSync(`${process.env.HOME}/.local/share/kiedas-orbiter-preview/data/user/inventory.json`, 'utf8'))
const labelless = (x) => x.type === 'mission' && !(x.nodeName || x.node || x.location || x.resourceSource || x.dropType)
for (const e of all) {
  const disp = h.dict[e.name] || e.name
  let r
  try { r = getAcquisitionInfo(e.uniqueName, disp, di, overrides, ix.recipeResultIndex, ix.marketIndex, ix.bundleIndex, ix.syndicateIndex,
    ix.wikiSigilIndex, ix.wikiVendorIndex, ix.wikiTennoGenIndex, ix.wikiBaroIndex, ix.exportVendorIndex, ix.alwaysAvailableIndex,
    ix.glyphSupplementIndex, ix.wikiBlueprintIndex, ix.wikiResearchIndex, ix.relicStateIndex, ix.wikiResourceIndex,
    ix.wikiPageAcquisitionIndex, ix.wikiAcquisitionStatusIndex, ix.exaltedWeaponIndex, ix.exportComponentIndex) } catch { continue }
  const src = r.sources || []
  const table = e.table
  if (src.length === 0 || src.some((x) => x.type === 'unresearched')) { zero++; zeroByCat[table] = (zeroByCat[table] || 0) + 1; zeroNames.push({ table, name: disp, uniqueName: e.uniqueName }) }
  const bad = src.filter(labelless)
  if (bad.length) { rarityLabel.items++; rarityLabel.rows += bad.length; if (rarityEx.length < 8) rarityEx.push(`${disp}: ${JSON.stringify(bad[0]).slice(0, 140)}`) }
  const big = src.filter((x) => typeof x.text === 'string' && x.text.length > 450)
  if (big.length) { wall.items++; wall.rows += big.length; if (wallEx.length < 8) wallEx.push(`${disp} (${big[0].text.length} chars)`) }
  const tr = src.filter((x) => typeof x.text === 'string' && /(\d+(\.\d+)?%\s+\d+\s*[-–]\s*\d+|±\s*\d)/.test(x.text))
  if (tr.length) { tableRes.items++; if (tEx.length < 8) tEx.push(disp) }
}
console.log('items scanned total, zero-source items:', zero, JSON.stringify(zeroByCat))
fs.writeFileSync('scratch/unresearched-now.json', JSON.stringify(zeroNames))
console.log('mission rows with no place label (would render as rarity/rotation):', JSON.stringify(rarityLabel), rarityEx.join(' || '))
console.log('rows over 450 chars (walls of text):', JSON.stringify(wall), wallEx.join(' | '))
console.log('rows with flattened drop-table numbers:', tableRes.items, tEx.join(' | '))
