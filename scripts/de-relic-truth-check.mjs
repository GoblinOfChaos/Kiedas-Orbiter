import fs from 'node:fs'
const R = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const { loadRealHarness } = await import(R + '/scripts/lib/real-data-harness.mjs')
const { exportsBundle: E } = await loadRealHarness({ locale: 'en' })
const { normalizeRelicEntry, relicRewardPool } = await import(R + '/src/lib/relicEntry.js')
const diff = JSON.parse(fs.readFileSync('/home/jedwards/kiedas-orbiter/.preview-work/wt/acq-model/docs/agent-context/reports/acquisition-model-diff.json', 'utf8')).differences
const canon = (s) => String(s || '').replace('/StoreItems/', '/')

// DE truth: relic -> Map(reward type -> Set(rarity)), straight from ExportRelics + ExportRewards
const relicRewards = new Map()
for (const r of Object.values(E.ExportRelics)) {
  const n = normalizeRelicEntry(r)
  if (!n.era || !n.category) continue
  const key = n.era + ' ' + n.category
  if (!relicRewards.has(key)) relicRewards.set(key, new Map())
  for (const e of relicRewardPool(r, E.ExportRewards)) {
    const t = canon(e.type)
    const m = relicRewards.get(key)
    if (!m.has(t)) m.set(t, new Set())
    m.get(t).add(String(e.rarity || '').toUpperCase())
  }
}
const byResult = new Map()
for (const [k, r] of Object.entries(E.ExportRecipes)) if (r.resultType) byResult.set(canon(r.resultType), { k, r })
function parts(un) {
  const s = new Set([canon(un)])
  const rec = byResult.get(canon(un))
  if (rec) {
    s.add(canon(rec.k))
    for (const i of rec.r.ingredients || []) {
      s.add(canon(i.ItemType))
      const sub = byResult.get(canon(i.ItemType))
      if (sub) s.add(canon(sub.k))
    }
  }
  return s
}
const eq = (a, b) => a.size === b.size && [...a].every((v) => b.has(v))
let n = 0, modelEq = 0, oldEq = 0
const rows = []
for (const x of diff.filter((d) => d.classes.includes('relic-missing-in-old'))) {
  const ps = parts(x.uniqueName)
  const truth = new Set()
  for (const [k, m] of relicRewards) for (const t of m.keys()) if (ps.has(t)) truth.add(k)
  const o = new Set(x.oldRelics.map((r) => r.relic))
  const m = new Set(x.modelRelics.map((r) => r.relic))
  n++
  if (eq(m, truth)) modelEq++
  if (eq(o, truth)) oldEq++
  if (!eq(m, truth)) console.log('MISMATCH', x.name, 'model-not-DE', [...m].filter((v) => !truth.has(v)).slice(0, 5).join(','), 'DE-not-model', [...truth].filter((v) => !m.has(v)).slice(0, 5).join(','))
  if (rows.length < 0) rows.push(`${x.name}: DE ${truth.size} model ${m.size} old ${o.size} | model-not-DE ${[...m].filter((v) => !truth.has(v)).length} DE-not-model ${[...truth].filter((v) => !m.has(v)).length}`)
}
console.log('records', n, 'model==DE', modelEq, 'old==DE', oldEq)
console.log(rows.join('\n'))
for (const x of diff.filter((d) => d.classes.includes('tier-differs'))) {
  const ps = parts(x.uniqueName)
  const out = []
  for (const mr of x.modelRelics) {
    const t = new Set()
    const m = relicRewards.get(mr.relic)
    if (m) for (const [ty, rs] of m) if (ps.has(ty)) rs.forEach((v) => t.add(v))
    const orl = x.oldRelics.find((r) => r.relic === mr.relic)
    const ot = (orl?.tiers || []).join('/')
    const mt = (mr.tiers || [mr.tier]).join('/')
    if (ot !== mt) out.push(`${mr.relic}: DE ${[...t].sort().join('/')} model ${mt} old ${ot}`)
  }
  console.log(x.name, '=>', out.join('; ') || '(none per relic)')
}
