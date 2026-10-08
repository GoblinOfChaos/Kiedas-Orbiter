import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const inventoryFile = path.join(os.homedir(), '.local/share/kiedas-orbiter-preview/data/user/inventory.json')
const reportDir = path.join(repo, 'docs/agent-context/reports')
const canon = (value) => String(value || '').replaceAll('/StoreItems/', '/')
const cap = (values, size = 8) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, size)
const pathLabel = (value) => canon(value).split('/').filter(Boolean).at(-1) || String(value || '')
const own = (item) => Boolean(item?.owned || (item?.quantity ?? 0) > 0 || (item?.crafted_quantity ?? 0) > 0)

const { loadRealHarness } = await import('../../scripts/lib/real-data-harness.mjs')
const { parseInventory } = await import('../../src/lib/inventoryParser.js')
const { getRelicCatalog } = await import('../../src/lib/relicParser.js')
const { BARO_RELIC_NAMES } = await import('../../src/lib/baroRelics.js')
const { buildDropIndex } = await import('../../src/lib/dropsParser.js')
const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')

const failures = []
const run = async (id, fn) => {
  try { return await fn() }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push({ id, message })
    return { failed: true, error: message }
  }
}

const harness = await loadRealHarness()
const raw = JSON.parse(await fs.readFile(inventoryFile, 'utf8'))
const inventory = parseInventory(raw, harness.exportsBundle, harness.dict)
const exportData = harness.exportsBundle
const allRows = [
  ...(inventory.warframes ?? []), ...(inventory.weapons ?? []), ...(inventory.primary ?? []),
  ...(inventory.secondary ?? []), ...(inventory.melee ?? []), ...(inventory.companion_weapons ?? []),
  ...(inventory.archweapons ?? []), ...(inventory.vehicles ?? []), ...(inventory.necramechs ?? []),
  ...(inventory.amps ?? []), ...(inventory.companions ?? []), ...(inventory.sentinels ?? []),
  ...(inventory.moas ?? []), ...(inventory.hounds ?? []), ...(inventory.beasts ?? []),
]
const rowsByPath = new Map()
for (const row of allRows) if (row?.unique_name && !rowsByPath.has(canon(row.unique_name))) rowsByPath.set(canon(row.unique_name), row)
const resolveName = (itemPath) => rowsByPath.get(canon(itemPath))?.name || harness.uniqueNameToName?.[canon(itemPath)] || pathLabel(itemPath)

const report = { generatedAt: new Date().toISOString(), checks: {}, failures }

report.checks.weaponTypeButtons = await run('1 weapon-type buttons', () => {
  const misses = (inventory.weapons ?? []).filter((row) => !['primary', 'secondary', 'melee'].includes(row.weapon_type))
  const groups = {}
  for (const row of misses) {
    const key = `${row.category || 'unknown'} | ${row.weapon_type || 'none'}`
    const group = groups[key] || (groups[key] = [])
    group.push(row.name)
  }
  return {
    unmatched: misses.length,
    groups: Object.fromEntries(Object.entries(groups).sort().map(([key, names]) => [key, { count: names.length, names: cap(names) }])),
  }
})

report.checks.consumedSuitsAndEvolution = await run('2 consumed suits and evolution records', () => {
  const consumed = (raw.InfestedFoundry?.ConsumedSuits ?? []).map((entry) => entry?.s).filter(Boolean)
  const warframePaths = new Set((inventory.warframes ?? []).map((row) => canon(row.unique_name)))
  const evolution = (raw.EvolutionProgress ?? []).map((entry) => entry?.ItemType).filter(Boolean)
  const equipmentPaths = new Set([
    ...(inventory.warframes ?? []), ...(inventory.weapons ?? []), ...(inventory.primary ?? []), ...(inventory.secondary ?? []), ...(inventory.melee ?? []),
  ].map((row) => canon(row.unique_name)))
  const summarize = (values, set) => {
    const unmatched = values.filter((value) => !set.has(canon(value)))
    return { total: values.length, matched: values.length - unmatched.length, unmatched: unmatched.length, unmatchedNames: cap(unmatched.map(resolveName)) }
  }
  return { consumedSuits: summarize(consumed, warframePaths), evolutionProgress: summarize(evolution, equipmentPaths) }
})

report.checks.incarnonFlag = await run('3 Incarnon flag', () => {
  const evolutionPaths = new Set((raw.EvolutionProgress ?? []).map((entry) => canon(entry?.ItemType)).filter(Boolean))
  const groups = {}
  for (const row of (inventory.weapons ?? []).filter((item) => item.is_incarnon)) {
    const category = row.category || 'unknown'
    const group = groups[category] || (groups[category] = { withEvolutionProgress: 0, withoutEvolutionProgress: 0, withoutNames: [] })
    if (evolutionPaths.has(canon(row.unique_name))) group.withEvolutionProgress += 1
    else { group.withoutEvolutionProgress += 1; group.withoutNames.push(row.name) }
  }
  for (const group of Object.values(groups)) group.withoutNames = cap(group.withoutNames)
  return { flagged: Object.values(groups).reduce((sum, group) => sum + group.withEvolutionProgress + group.withoutEvolutionProgress, 0), byCategory: groups }
})

report.checks.incarnonAdapters = await run('4 adapters', () => {
  const adapters = (raw.MiscItems ?? []).filter((item) => String(item?.ItemType || '').includes('IncarnonUnlocker'))
  return {
    records: adapters.length,
    quantity: adapters.reduce((sum, item) => sum + Number(item.ItemCount ?? 1), 0),
    familyNames: cap(adapters.map((item) => resolveName(item.ItemType))),
  }
})

report.checks.relicVaultState = await run('5 relic vault state', () => {
  const relicEntries = exportData.ExportRelics ?? {}
  const classes = {
    vaultDatePast: { count: 0, visibleVaulted: { true: 0, false: 0 }, names: [] },
    vaultDateFuture: { count: 0, visibleVaulted: { true: 0, false: 0 }, names: [] },
    noVaultDate: { count: 0, visibleVaulted: { true: 0, false: 0 }, names: [] },
    baroException: { count: 0, visibleVaulted: { true: 0, false: 0 }, names: [] },
  }
  const now = Math.floor(Date.now() / 1000)
  for (const relic of getRelicCatalog(exportData)) {
    const entry = relicEntries[relic.uniqueName] ?? relicEntries[canon(relic.uniqueName)] ?? {}
    let key = 'noVaultDate'
    if (BARO_RELIC_NAMES.includes(relic.key)) key = 'baroException'
    else if (Number.isFinite(entry?.vaultedAt)) key = entry.vaultedAt <= now ? 'vaultDatePast' : 'vaultDateFuture'
    const group = classes[key]
    group.count += 1
    group.visibleVaulted[String(Boolean(relic.vaulted))] += 1
    group.names.push(relic.key)
  }
  for (const group of Object.values(classes)) group.names = cap(group.names)
  return classes
})

report.checks.primeSetsOwnership = await run('6 Prime Sets ownership', () => {
  const equipment = new Map()
  for (const list of [inventory.warframes, inventory.primary, inventory.secondary, inventory.melee, inventory.sentinels, inventory.beasts, inventory.moas, inventory.hounds, inventory.archwings, inventory.necramechs, inventory.amps]) {
    for (const row of list ?? []) equipment.set(row.name, row)
  }
  const finishedOwnedPartMissing = []
  const partOwnedFinishedMissing = []
  for (const set of Object.values(inventory.primeSets ?? {})) {
    const finished = equipment.get(set.name) ?? equipment.get(`${set.name} Prime`)
    const finishedOwned = own(finished)
    const anyPartOwned = (set.parts ?? []).some(own)
    const anyPartMissing = (set.parts ?? []).some((part) => !own(part))
    if (finishedOwned && anyPartMissing) finishedOwnedPartMissing.push(set.name)
    if (!finishedOwned && anyPartOwned) partOwnedFinishedMissing.push(set.name)
  }
  return {
    finishedOwnedPartMissing: { count: finishedOwnedPartMissing.length, names: cap(finishedOwnedPartMissing) },
    partOwnedFinishedMissing: { count: partOwnedFinishedMissing.length, names: cap(partOwnedFinishedMissing) },
  }
})

report.checks.foundryOwnership = await run('7 Foundry ownership', () => {
  const allByName = new Map()
  for (const row of inventory.all ?? []) if (!allByName.has(row.name)) allByName.set(row.name, row)
  let plainName = 0
  let primeFallback = 0
  for (const recipe of [...(inventory.craftable ?? []), ...(inventory.craftable_extra ?? [])]) {
    if (!recipe.fullItemOwned) continue
    const direct = allByName.get(recipe.baseName)
    if (own(direct)) plainName += 1
    else if (own(allByName.get(`${recipe.baseName} Prime`))) primeFallback += 1
  }
  return { fullItemOwnedByPlainName: plainName, fullItemOwnedOnlyByPrimeFallback: primeFallback }
})

report.checks.ownedOnlyTabs = await run('8 owned-only tab completeness', () => {
  const catalogs = {
    arcanes: inventory.arcanes_catalog ?? [],
    mods: inventory.mods_catalog ?? [],
    consumables: inventory.consumables_catalog ?? [],
    peely_pix: inventory.peely_pix ?? [],
    landing_craft: inventory.landing_craft_catalog ?? [],
  }
  return Object.fromEntries(Object.entries(catalogs).map(([category, rows]) => [category, { owned: rows.filter(own).length, catalog: rows.length }]))
})

const acquisition = await run('9 no-acquisition list', () => {
  const indexes = buildAllAcquisitionIndexes(exportData)
  const dropIndex = buildDropIndex(exportData)
  const catalogs = {
    all: (inventory.all ?? []).filter((item) => item.category !== 'rivens' && item.category !== 'Arcanes'),
    arcanes: inventory.arcanes_catalog ?? [],
    peely_pix: inventory.peely_pix ?? [],
    consumables: inventory.consumables_catalog ?? [],
    landing_craft: inventory.landing_craft_catalog ?? [],
    parts: [...(inventory.parts ?? []), ...(inventory.prime_parts ?? [])],
    prime_sets: Object.values(inventory.primeSets ?? {}).map((set) => ({ unique_name: set.setPath, name: set.name })),
    resources: inventory.resources ?? [],
    relics: getRelicCatalog(exportData).map((relic) => ({ unique_name: relic.uniqueName, name: `${relic.era} ${relic.name} Relic` })),
  }
  const missing = {}
  for (const [category, items] of Object.entries(catalogs)) {
    const seen = new Set()
    for (const item of items) {
      const uniqueName = item?.real_unique_name || item?.unique_name || item?.uniqueName
      if (!uniqueName || !item?.name || seen.has(canon(uniqueName))) continue
      seen.add(canon(uniqueName))
      const info = getAcquisitionInfo(
        uniqueName, item.name, dropIndex, exportData.AcquisitionItems ?? {}, indexes.recipeResultIndex, indexes.marketIndex,
        indexes.bundleIndex, indexes.syndicateIndex, indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex,
        indexes.wikiBaroIndex, indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
        indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex, indexes.wikiResourceIndex,
        indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex, indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
      )
      if (info.unresearched === true) (missing[category] ??= []).push({ name: item.name, uniqueName: canon(uniqueName) })
    }
  }
  for (const list of Object.values(missing)) list.sort((a, b) => a.name.localeCompare(b.name))
  return missing
})

const shortList = (names) => names?.length ? `; names: ${names.join(', ')}` : ''
const lines = ['Filter Audit (P65)', `Generated: ${report.generatedAt}`, '']
const c = report.checks
if (c.weaponTypeButtons?.failed) lines.push(`1. FAILED: ${c.weaponTypeButtons.error}`)
else {
  lines.push(`1. Weapon-type buttons: ${c.weaponTypeButtons.unmatched} unmatched.`)
  for (const [group, value] of Object.entries(c.weaponTypeButtons.groups)) lines.push(`   ${group}: ${value.count}${shortList(value.names)}`)
}
if (c.consumedSuitsAndEvolution?.failed) lines.push(`2. FAILED: ${c.consumedSuitsAndEvolution.error}`)
else {
  const v = c.consumedSuitsAndEvolution
  lines.push(`2. Consumed suits: ${v.consumedSuits.matched}/${v.consumedSuits.total} matched; ${v.consumedSuits.unmatched} unmatched${shortList(v.consumedSuits.unmatchedNames)}.`)
  lines.push(`   EvolutionProgress: ${v.evolutionProgress.matched}/${v.evolutionProgress.total} matched; ${v.evolutionProgress.unmatched} unmatched${shortList(v.evolutionProgress.unmatchedNames)}.`)
}
if (c.incarnonFlag?.failed) lines.push(`3. FAILED: ${c.incarnonFlag.error}`)
else { lines.push(`3. Incarnon flags: ${c.incarnonFlag.flagged} flagged.`); for (const [k, v] of Object.entries(c.incarnonFlag.byCategory)) lines.push(`   ${k}: ${v.withEvolutionProgress} with EvolutionProgress, ${v.withoutEvolutionProgress} without${shortList(v.withoutNames)}.`) }
if (c.incarnonAdapters?.failed) lines.push(`4. FAILED: ${c.incarnonAdapters.error}`)
else lines.push(`4. IncarnonUnlocker adapters: ${c.incarnonAdapters.records} records, quantity ${c.incarnonAdapters.quantity}${shortList(c.incarnonAdapters.familyNames)}.`)
if (c.relicVaultState?.failed) lines.push(`5. FAILED: ${c.relicVaultState.error}`)
else { lines.push('5. Relic vault state:'); for (const [k, v] of Object.entries(c.relicVaultState)) lines.push(`   ${k}: ${v.count}; visible vaulted true=${v.visibleVaulted.true}, false=${v.visibleVaulted.false}${shortList(v.names)}.`) }
if (c.primeSetsOwnership?.failed) lines.push(`6. FAILED: ${c.primeSetsOwnership.error}`)
else lines.push(`6. Prime Sets: finished owned/part missing ${c.primeSetsOwnership.finishedOwnedPartMissing.count}${shortList(c.primeSetsOwnership.finishedOwnedPartMissing.names)}; part owned/finished missing ${c.primeSetsOwnership.partOwnedFinishedMissing.count}${shortList(c.primeSetsOwnership.partOwnedFinishedMissing.names)}.`)
if (c.foundryOwnership?.failed) lines.push(`7. FAILED: ${c.foundryOwnership.error}`)
else lines.push(`7. Foundry fullItemOwned: plain-name ${c.foundryOwnership.fullItemOwnedByPlainName}; Prime fallback only ${c.foundryOwnership.fullItemOwnedOnlyByPrimeFallback}.`)
if (c.ownedOnlyTabs?.failed) lines.push(`8. FAILED: ${c.ownedOnlyTabs.error}`)
else { lines.push('8. Owned-only tabs (owned/catalog):'); for (const [k, v] of Object.entries(c.ownedOnlyTabs)) lines.push(`   ${k}: ${v.owned}/${v.catalog}.`) }
if (failures.length) { lines.push('', 'Failed checks:'); for (const failure of failures) lines.push(`- ${failure.id}: ${failure.message}`) }

const acquisitionLines = ['No-acquisition Inventory items (P65)', `Generated: ${report.generatedAt}`, '']
if (acquisition?.failed) acquisitionLines.push(`Check failed: ${acquisition.error}`)
else {
  for (const category of Object.keys(acquisition).sort()) {
    acquisitionLines.push(`## ${category} (${acquisition[category].length})`, '')
    for (const item of acquisition[category]) acquisitionLines.push(`- ${item.name} | ${item.uniqueName}`)
    acquisitionLines.push('')
  }
  if (!Object.keys(acquisition).length) acquisitionLines.push('No items returned no acquisition source.')
}

await fs.mkdir(reportDir, { recursive: true })
await Promise.all([
  fs.writeFile(path.join(reportDir, 'filter-audit.md'), `${lines.join('\n')}\n`),
  fs.writeFile(path.join(reportDir, 'filter-audit.json'), `${JSON.stringify(report, null, 2)}\n`),
  fs.writeFile(path.join(reportDir, 'no-acquisition.md'), `${acquisitionLines.join('\n')}\n`),
])

console.log(`check1 unmatched=${c.weaponTypeButtons?.unmatched ?? 'failed'}`)
console.log(`check2 consumed=${c.consumedSuitsAndEvolution?.consumedSuits?.matched ?? 'failed'}/${c.consumedSuitsAndEvolution?.consumedSuits?.total ?? 'failed'} evolution=${c.consumedSuitsAndEvolution?.evolutionProgress?.matched ?? 'failed'}/${c.consumedSuitsAndEvolution?.evolutionProgress?.total ?? 'failed'}`)
console.log(`check3 flagged=${c.incarnonFlag?.flagged ?? 'failed'}`)
console.log(`check4 adapters=${c.incarnonAdapters?.quantity ?? 'failed'}`)
console.log(`check5 relics=${c.relicVaultState ? Object.values(c.relicVaultState).reduce((sum, value) => sum + value.count, 0) : 'failed'}`)
console.log(`check6 finished-owned-part-missing=${c.primeSetsOwnership?.finishedOwnedPartMissing?.count ?? 'failed'} part-owned-finished-missing=${c.primeSetsOwnership?.partOwnedFinishedMissing?.count ?? 'failed'}`)
console.log(`check7 plain=${c.foundryOwnership?.fullItemOwnedByPlainName ?? 'failed'} prime-fallback=${c.foundryOwnership?.fullItemOwnedOnlyByPrimeFallback ?? 'failed'}`)
console.log(`check8 tabs=${c.ownedOnlyTabs ? Object.keys(c.ownedOnlyTabs).length : 'failed'}`)
console.log(`check9 categories=${acquisition?.failed ? 'failed' : Object.keys(acquisition).length}`)
console.log(`failed-checks=${failures.length}`)
