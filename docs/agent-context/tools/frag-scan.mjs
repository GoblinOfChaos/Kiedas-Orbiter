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
  for (const [u, e] of entries) if (u && e) all.push({ uniqueName: u, name: e.name || e.displayName || '' })
}
const inv = JSON.parse(fs.readFileSync(`${process.env.HOME}/.local/share/kiedas-orbiter-preview/data/user/inventory.json`, 'utf8'))


const pats = {
  digitFragment: (t) => /^\d{1,3}$/.test(t) || /^\d{3}\b/.test(t),
  danglingColon: (t) => /^[^.]{0,30}:$/.test(t),
  missingPrice: (t) => /\b(for|costs?|at)\s*[.,]/.test(t) || /\bfor\s*$/.test(t),
  underscoreName: (t) => /[A-Za-z]+_[A-Za-z]+/.test(t),
  history: (t) => /\b(Update \d+|Hotfix|originally|formerly|was first|previously|Beginning (with|in))\b/i.test(t),
  strayConnective: (t) => /^(or|and)\b[:.,; ]*$/i.test(t) || /:\s*or\s/i.test(t),
}
const counts = {}; const exm = {}
for (const e of all) {
  const disp = h.dict[e.name] || e.name
  let r
  try { r = getAcquisitionInfo(e.uniqueName, disp, di, overrides, ix.recipeResultIndex, ix.marketIndex, ix.bundleIndex, ix.syndicateIndex,
    ix.wikiSigilIndex, ix.wikiVendorIndex, ix.wikiTennoGenIndex, ix.wikiBaroIndex, ix.exportVendorIndex, ix.alwaysAvailableIndex,
    ix.glyphSupplementIndex, ix.wikiBlueprintIndex, ix.wikiResearchIndex, ix.relicStateIndex, ix.wikiResourceIndex,
    ix.wikiPageAcquisitionIndex, ix.wikiAcquisitionStatusIndex, ix.exaltedWeaponIndex, ix.exportComponentIndex) } catch { continue }
  const hit = new Set()
  for (const s of r.sources || []) {
    const t = typeof s.text === 'string' ? s.text.trim() : ''
    if (!t) continue
    for (const [k, f] of Object.entries(pats)) if (f(t)) { hit.add(k); (exm[k] ||= []).length < 4 && exm[k].push(`${disp}: ${t.slice(0, 120)}`) }
  }
  for (const k of hit) counts[k] = (counts[k] || 0) + 1
}
console.log(counts); for (const k of Object.keys(exm)) { console.log("--", k); exm[k].forEach((x) => console.log('   ', x)) }
