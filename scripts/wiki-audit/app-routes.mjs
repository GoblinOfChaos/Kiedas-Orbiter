import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const REPO=new URL('../..', import.meta.url).pathname.replace(/\/$/, '')
const { applyMerges } = await import(REPO+'/scripts/de-export/apply-merges.mjs')
const { loadRealHarness } = await import(REPO+'/scripts/lib/real-data-harness.mjs')
const { discoverSubjects } = await import(REPO+'/scripts/item-completeness.mjs')
const { buildDropIndex } = await import(REPO+'/src/lib/dropsParser.js')
const A = await import(REPO+'/src/lib/acquisitionInfo.js')
const { loadAcquisitionData } = await import(REPO+'/src/lib/acquisitionData.js')
const root = await fs.mkdtemp(path.join(os.tmpdir(),'acq-'))
const merged = await applyMerges({ dataDir: process.env.PREVIEW_DATA_DIR, out: root, cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE })
if (process.env.DE_DROPS) await fs.copyFile(process.env.DE_DROPS, path.join(merged.exportDir, 'DropsAll.json'))
const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root })
await loadAcquisitionData()
const ex = harness.exportsBundle
const dropIndex = buildDropIndex(ex)
const idx = A.buildAllAcquisitionIndexes(ex)
const recipeIndex = A.buildRecipeResultIndex(ex)
const subjects = discoverSubjects(harness)
const out = {}
const outFile = process.env.OUT
for (const s of subjects) { const nm = s.name
  try {
  const r = A.getAcquisitionInfo(s.uniqueName, nm, dropIndex, ex.AcquisitionItems || {}, recipeIndex,
    idx.marketIndex, idx.bundleIndex, idx.syndicateIndex, idx.wikiSigilIndex, idx.wikiVendorIndex, idx.wikiTennoGenIndex, idx.wikiBaroIndex,
    idx.exportVendorIndex, idx.alwaysAvailableIndex, idx.glyphSupplementIndex, idx.wikiBlueprintIndex, idx.wikiResearchIndex, idx.relicStateIndex,
    idx.wikiResourceIndex, idx.wikiPageAcquisitionIndex, idx.wikiAcquisitionStatusIndex, idx.exaltedWeaponIndex, idx.exportComponentIndex)
  out[s.uniqueName] = { name: nm, category: s.category, sources: r.sources.map(x=>({type:x.type,text:x.text,location:x.location,relic:x.relicName,chance:x.chance,rarity:x.rarity,source:x.source})) }
  } catch (e) { out[s.uniqueName] = { name: nm, error: String(e.message).slice(0,120) } }
}
await fs.writeFile(outFile, JSON.stringify(out))
await fs.rm(root,{recursive:true,force:true})
