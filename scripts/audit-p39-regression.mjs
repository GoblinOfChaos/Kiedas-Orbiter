import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const currentRoot = process.env.P39_CURRENT_ROOT || repoRoot
const preRoot = process.env.P39_PRE_ROOT || '/tmp/pre-p36'
const outputPath = path.join(repoRoot, 'scratch/regression-entries.json')

const importFrom = (root, relative) => import(pathToFileURL(path.join(root, relative)).href)

function isPlaceholder(uniqueName, name) {
  return /Lotus\*Customization/i.test(`${uniqueName} ${name}`)
    || /^<[^>]+>$/.test(String(name).trim())
    || /<[^>]+>/.test(String(name))
}

function catalogEntries(exportsBundle) {
  const entries = []
  for (const key of Object.keys(exportsBundle)) {
    if (!/^Export(Warframes|Weapons|Recipes|Resources|Sentinels|Gear|Misc|Customs|Upgrades)$/.test(key)) continue
    const table = exportsBundle[key]
    const rows = Array.isArray(table)
      ? table.map((entry) => [entry?.uniqueName, entry])
      : Object.entries(table || {})
    for (const [uniqueName, entry] of rows) {
      const name = entry?.name || entry?.displayName || ''
      if (uniqueName && entry && !isPlaceholder(uniqueName, name)) entries.push({ uniqueName, name })
    }
  }
  return entries
}

function rowsOf(sources) {
  return (sources || []).flatMap((source) => source?.sources
    ? rowsOf(source.sources)
    : source ? [source] : [])
}

function rowText(row) {
  return typeof row?.text === 'string' ? row.text.trim() : ''
}

function isJunk(text) {
  if (!text) return true
  return /^[^.]{0,48}:$/.test(text)
    || /^Mission$/i.test(text)
    || /^\d{1,3}\.?$/.test(text)
    || /\b(?:Update|Hotfix|Version)\s*\d+/i.test(text)
    || /\b(?:19|20)\d{2}\b/.test(text)
    || /\b(?:originally|formerly|first\s+available|previously|returned|was\s+(?:available|awarded|offered|rewarded|introduced|given|received|obtained|sold|included)|beginning\s+(?:with|in))\b/i.test(text)
    || /\b(?:no longer|not obtainable|event is over|season has ended|seasons have ended|currently unavailable|operation is currently unavailable|no longer an active acquisition route|posters are decorations)\b/i.test(text)
    || /\{\{|\}\}|\[\[|\]\]|\{\||\|\}/.test(text)
    || /^\s*(?:no acquisition known|no verified acquisition route|no known source)\s*$/i.test(text)
}

function routeRows(result) {
  return rowsOf(result?.sources).filter((row) => !isJunk(rowText(row)))
    .map((row) => ({ type: row.type, text: rowText(row), placeLabel: row.placeLabel || '' }))
}

function argsFor(item, harness, indexes, dropIndex, overrides) {
  const displayName = harness.dict[item.name] || item.name
  return [
    item.uniqueName, displayName, dropIndex, overrides,
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  ]
}

function causeFor(item, before, after) {
  const beforeText = before.map((row) => row.text).join(' ')
  if (/\bDrops from:\s*/i.test(beforeText)) return 'Drops from lead-in treated as label-only or discarded'
  if (before.some((row) => /^[A-Z][^.!?]*\b(?:or|and)\b/i.test(row.text) && !row.placeLabel)) return 'capitalized/conjunction route rule'
  if (before.some((row) => row.text.length > 300)) return 'length cap / flattened-table removal'
  if (before.some((row) => row.type === 'override')) return 'type: override row removed'
  if (before.some((row) => !row.placeLabel)) return 'row without place label removed'
  if (after.length === 1 && after[0]?.type === 'unresearched') return 'normalizer dropped all source rows'
  return 'other normalizer rule'
}

async function loadSide(root, loadHarness) {
  const harness = await loadHarness({ locale: 'en' })
  const info = await importFrom(root, 'src/lib/acquisitionInfo.js')
  const drops = await importFrom(root, 'src/lib/dropsParser.js')
  const indexes = info.buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = drops.buildDropIndex(harness.exportsBundle)
  const overrides = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'))
  return { harness, info, indexes, dropIndex, overrides }
}

const currentHarnessModule = await importFrom(currentRoot, 'scripts/lib/real-data-harness.mjs')
const current = await loadSide(currentRoot, currentHarnessModule.loadRealHarness)
const preHarnessModule = await importFrom(preRoot, 'scripts/lib/real-data-harness.mjs')
const before = await loadSide(preRoot, preHarnessModule.loadRealHarness)
const entries = catalogEntries(current.harness.exportsBundle)
const lost = []
const baselineNames = []
const causeExamples = new Map()

for (const item of entries) {
  const beforeResult = before.info.getAcquisitionInfo(...argsFor(item, before.harness, before.indexes, before.dropIndex, before.overrides))
  const afterResult = current.info.getAcquisitionInfo(...argsFor(item, current.harness, current.indexes, current.dropIndex, current.overrides))
  const beforeRows = routeRows(beforeResult)
  const afterRows = routeRows(afterResult)
  if (beforeRows.length) baselineNames.push(item.uniqueName)
  if (!beforeRows.length || !(afterResult.sources || []).some((row) => row?.type === 'unresearched')) continue
  const cause = causeFor(item, beforeRows, afterRows)
  const entry = {
    uniqueName: item.uniqueName,
    name: current.harness.dict[item.name] || item.name,
    cause,
    before: beforeRows,
    after: afterResult.sources || [],
  }
  lost.push(entry)
  if (!causeExamples.has(cause)) causeExamples.set(cause, [])
  if (causeExamples.get(cause).length < 3) causeExamples.get(cause).push(entry)
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify({
  generatedBy: 'scripts/audit-p39-regression.mjs',
  preRoot,
  count: lost.length,
  baselineCount: baselineNames.length,
  baselineUniqueNames: [...new Set(baselineNames)].sort(),
  entries: lost,
  causeExamples: Object.fromEntries(causeExamples),
}, null, 2) + '\n')

console.log(`P39 differential: ${lost.length} entries lost real routes`)
for (const [cause, examples] of causeExamples) {
  console.log(`CAUSE ${cause}: ${examples.length} examples`)
  for (const example of examples) console.log(`- ${example.name}: ${example.before.map((row) => row.text).join(' | ').slice(0, 220)}`)
}
console.log(`Full list: ${outputPath}`)
