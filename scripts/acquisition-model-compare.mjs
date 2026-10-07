import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRealHarness, canonicalPath } from './lib/real-data-harness.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(ROOT, 'docs/agent-context/reports')
const jsonOutput = path.join(outputDir, 'acquisition-model-diff.json')
const markdownOutput = path.join(outputDir, 'acquisition-model-diff.md')
const foundryText = (value) => /\b(?:built|crafted|craftable|made) (?:in |at )?(?:the )?foundry\b|\bfoundry from a blueprint\b/i.test(String(value || ''))
const sourceText = (source) => source?.text || source?.nodeName || source?.location || source?.name || source?.relicName || source?.relicManifest || ''
let discoverSubjects
let buildItemAcquisition
let buildAllAcquisitionIndexes
let getAcquisitionInfo
let loadAcquisitionData
let getItemDrops
let buildDropIndex
let buildBlueprintAcquisitionRows
let buildIngredientSourceRows
let buildRelicRarityIndex
let buildRelicTooltipRows
let normalizeRelicName

function oldAcquisition(uniqueName, name, ctx) {
  return getAcquisitionInfo(
    uniqueName, name, ctx.dropIndex, ctx.overridesData,
    ctx.recipeResultIndex, ctx.marketIndex, ctx.bundleIndex, ctx.syndicateIndex, ctx.wikiSigilIndex, ctx.wikiVendorIndex,
    ctx.wikiTennoGenIndex, ctx.wikiBaroIndex, ctx.exportVendorIndex, ctx.alwaysAvailableIndex, ctx.glyphSupplementIndex,
    ctx.wikiBlueprintIndex, ctx.wikiResearchIndex, ctx.relicStateIndex, ctx.wikiResourceIndex, ctx.wikiPageAcquisitionIndex,
    ctx.wikiAcquisitionStatusIndex, ctx.exaltedWeaponIndex, ctx.exportComponentIndex,
  )
}

function oldRows(uniqueName, name, ctx) {
  const info = oldAcquisition(uniqueName, name, ctx)
  const recipe = info.recipe || ctx.recipeResultIndex.get(canonicalPath(uniqueName))
  const fallback = getItemDrops(uniqueName) || []
  const blueprint = recipe?.blueprintUniqueName
    ? buildBlueprintAcquisitionRows(name, recipe, ctx.dropIndex, getItemDrops(recipe.blueprintUniqueName) || fallback, ctx.rarityIndex)
    : []
  const ingredients = (recipe?.ingredients || []).flatMap((ingredient) => buildIngredientSourceRows({
    itemType: canonicalPath(ingredient.ItemType || ingredient.itemType), name: canonicalPath(ingredient.ItemType || ingredient.itemType).split('/').pop(),
  }, ctx.dropIndex, getItemDrops(ingredient.ItemType || ingredient.itemType) || [], ctx.rarityIndex))
  // This is the exact compact-tooltip builder used by the drawers; adding it
  // ensures a relic collapsed from a main row is still counted for comparison.
  const tooltip = buildRelicTooltipRows(info.sources || [], { rarityIndex: ctx.rarityIndex, itemType: uniqueName }).map(({ source }) => source)
  return { info, sources: [...(info.sources || []), ...blueprint, ...ingredients, ...tooltip] }
}

function relicMap(rows) {
  const map = new Map()
  for (const row of rows || []) {
    if (row?.type !== 'relic') continue
    const relic = normalizeRelicName(row.relicName || row.relicManifest)
    if (!relic) continue
    const tiers = map.get(relic) || new Set()
    if (row.rarity) tiers.add(String(row.rarity).toUpperCase())
    map.set(relic, tiers)
  }
  return map
}

function routeSet(rows) {
  return new Set((rows || []).filter((row) => row?.type !== 'relic' && row?.type !== 'unresearched' && row?.type !== 'status')
    .map(sourceText).filter(Boolean))
}

function routeOnlyInOldSubclass(oldResult, model) {
  const modelRoutes = new Set(model.routes.map((row) => row.text))
  const oldOnly = (oldResult.info.sources || []).filter((source) => source?.type !== 'relic' && source?.type !== 'unresearched' && source?.type !== 'status')
    .filter((source) => {
      const text = sourceText(source)
      return text && !modelRoutes.has(text)
    })
  if (oldOnly.length === 0) return null
  if (oldOnly.every((source) => foundryText(sourceText(source)) || /^\s*(?:build cost|rush|components)\s*:/i.test(sourceText(source)))) return 'foundry-build-sentence'
  if (oldOnly.every((source) => /\b(?:sold by|purchase|market|credits|platinum|ducats|standing)\b/i.test(sourceText(source)))) return 'vendor-price'
  if (oldOnly.every((source) => /drop.?tables?|DropsAll/i.test(String(source.source || '')) || ['mission', 'relic', 'bounty', 'rotation'].includes(source.type))) return 'drop-table-route'
  return 'other'
}

function wikiAuditStatus() {
  const dir = '/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/wiki_store'
  const scratch = '/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchwiki'
  return fs.existsSync(dir) || fs.existsSync(scratch)
    ? { compared: false, reason: 'wiki audit store exists but has no stable machine-readable relic-set schema selected by this comparison' }
    : { compared: false, reason: 'wiki_store/ and scratchwiki/ are unavailable in this worktree context' }
}

function classify(subject, oldResult, model) {
  const classes = []
  const oldRelics = relicMap(oldResult.sources)
  const modelRelics = new Map(model.relics.map((row) => [row.relic, new Set(row.tiers || (row.tier ? [row.tier] : []))]))
  for (const relic of modelRelics.keys()) if (!oldRelics.has(relic)) classes.push('relic-missing-in-old')
  for (const relic of oldRelics.keys()) if (!modelRelics.has(relic)) classes.push('relic-missing-in-model')
  for (const relic of oldRelics.keys()) {
    if (!modelRelics.has(relic)) continue
    if ([...oldRelics.get(relic)].sort().join('|') !== [...modelRelics.get(relic)].sort().join('|')) classes.push('tier-differs')
  }
  const oldRoutes = routeSet(oldResult.info.sources)
  const modelRoutes = new Set(model.routes.map((row) => row.text))
  if (foundryText(sourceText(oldResult.info.sources?.[0]))) classes.push('foundry-text-leads-old')
  if ([...oldRoutes].some((route) => !modelRoutes.has(route))) classes.push('route-only-in-old')
  if ([...modelRoutes].some((route) => !oldRoutes.has(route))) classes.push('route-only-in-model')
  if (oldRoutes.size === 0 && modelRoutes.size === 0 && oldRelics.size === 0 && modelRelics.size === 0) classes.push('no-acquisition-in-both')
  const routeOnlyInOld = classes.includes('route-only-in-old') ? routeOnlyInOldSubclass(oldResult, model) : null
  return { uniqueName: subject.uniqueName, name: subject.name, category: subject.category, classes: [...new Set(classes)], ...(routeOnlyInOld ? { routeOnlyInOld } : {}), oldRelics: [...oldRelics].map(([relic, tiers]) => ({ relic, tiers: [...tiers].sort() })), modelRelics: model.relics.map((row) => ({ relic: row.relic, tier: row.tier, tiers: row.tiers || null })), oldRoutes: [...oldRoutes], modelRoutes: [...modelRoutes] }
}

const harness = await loadRealHarness({ locale: 'en' })
// The real-data harness installs Node's JSON/Tauri hooks at evaluation time.
// Load browser-oriented acquisition modules only after that has happened.
;({ discoverSubjects } = await import('./item-completeness.mjs'))
;({ buildItemAcquisition } = await import('../src/lib/acquisitionModel/buildItemAcquisition.js'))
;({ buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../src/lib/acquisitionInfo.js'))
;({ loadAcquisitionData, getItemDrops } = await import('../src/lib/acquisitionData.js'))
;({ buildDropIndex } = await import('../src/lib/dropsParser.js'))
;({ buildBlueprintAcquisitionRows, buildIngredientSourceRows, buildRelicRarityIndex, buildRelicTooltipRows, normalizeRelicName } = await import('../src/lib/relicSources.js'))
await loadAcquisitionData()
const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
const ctx = {
  ...indexes,
  dropIndex: buildDropIndex(harness.exportsBundle),
  rarityIndex: buildRelicRarityIndex(harness.exportsBundle),
  overridesData: harness.exportsBundle.AcquisitionItems || {},
  exportData: harness.exportsBundle,
  getItemDrops,
}
const differences = []
for (const subject of discoverSubjects(harness)) {
  const oldResult = oldRows(subject.uniqueName, subject.name, ctx)
  const model = buildItemAcquisition(subject.uniqueName, subject.name, ctx)
  const entry = classify(subject, oldResult, model)
  if (entry.classes.length) differences.push(entry)
}
const counts = {}
for (const entry of differences) for (const type of entry.classes) counts[type] = (counts[type] || 0) + 1
const noAcquisitionInBothCategories = {}
for (const entry of differences.filter((entry) => entry.classes.includes('no-acquisition-in-both'))) {
  noAcquisitionInBothCategories[entry.category] = (noAcquisitionInBothCategories[entry.category] || 0) + 1
}
const routeOnlyInOld = {}
for (const entry of differences.filter((entry) => entry.classes.includes('route-only-in-old'))) {
  const subclass = entry.routeOnlyInOld || 'other'
  const summary = routeOnlyInOld[subclass] || { count: 0, names: [] }
  summary.count++
  if (summary.names.length < 5) summary.names.push(entry.name)
  routeOnlyInOld[subclass] = summary
}
const classifications = { noAcquisitionInBoth: { categoryCounts: noAcquisitionInBothCategories }, routeOnlyInOld }
const report = { generatedAt: new Date().toISOString(), subjects: discoverSubjects(harness).length, wikiAudit: wikiAuditStatus(), counts, classifications, differences }
fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`)
const lines = ['# Acquisition model comparison', '', `Subjects: ${report.subjects}`, '', '## Counts', '']
for (const [type, count] of Object.entries(counts).sort()) {
  const examples = differences.filter((entry) => entry.classes.includes(type)).slice(0, 5).map((entry) => entry.name).join(', ')
  lines.push(`- ${type}: ${count}${examples ? ` (${examples})` : ''}`)
}
lines.push('', '## No acquisition in both: categories', '')
for (const [category, count] of Object.entries(noAcquisitionInBothCategories).sort()) lines.push(`- ${category}: ${count}`)
lines.push('', '## Route only in old: subclasses', '')
for (const [subclass, summary] of Object.entries(routeOnlyInOld).sort()) lines.push(`- ${subclass}: ${summary.count}${summary.names.length ? ` (${summary.names.join(', ')})` : ''}`)
lines.push('', '## Wiki audit', '', `${report.wikiAudit.compared ? 'Compared' : 'Skipped'}: ${report.wikiAudit.reason}`, '')
fs.writeFileSync(markdownOutput, lines.join('\n'))
console.log(`acquisition-model comparison: ${report.subjects} subjects, ${differences.length} differences; report written to ${path.relative(ROOT, jsonOutput)}`)
