import { loadRealHarness } from '../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../src/lib/dropsParser.js'
const h = await loadRealHarness({ locale: 'en' })
const rs = await import('../src/lib/relicSources.js')
const ad = await import('../src/lib/acquisitionData.js')
const idx = rs.buildRelicRarityIndex(h.exportsBundle); const di = buildDropIndex(h.exportsBundle)
const base = '/Lotus/Types/Recipes/WarframeRecipes/AshPrime'
for (const [nm, it] of [['Blueprint', base + 'Blueprint'], ['Neuroptics', base + 'HelmetComponent'], ['Chassis', base + 'ChassisComponent'], ['Systems', base + 'SystemsComponent']]) {
  const rows = rs.buildIngredientSourceRows({ itemType: it, name: 'Ash Prime ' + nm }, di, ad.getItemDrops(it), idx)
  console.log('\n' + nm, rows.length, 'rows; first 6:', rows.slice(0, 6).map((r) => `${r.relicName || r.text}|${r.rarity || '-'}`).join(' ; '))
}
// DE truth
console.log('getItemDrops sample', JSON.stringify((ad.getItemDrops(base + 'HelmetComponent') || []).slice(0, 2)))
const rel = h.exportsBundle.ExportRelicArcane || h.exportsBundle.ExportRelics
const arr = Array.isArray(rel) ? rel : Object.values(rel?.ExportRelicArcane || rel || {})
const truth = {}
for (const r of arr) for (const rw of (r.rewards || [])) { const p = rw.rewardName || ''; if (/AshPrime/.test(p)) { const k = p.split('/').pop(); (truth[k] ||= []).push(`${r.name}:${rw.rarity}`) } }
for (const [k, v] of Object.entries(truth)) console.log('DE', k, v.slice(0, 8).join(' '))
