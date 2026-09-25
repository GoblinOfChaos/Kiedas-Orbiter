#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const DEFAULT_CACHE = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const DEFAULT_DATA = path.join(ROOT, 'src-tauri/data/assets/data')
const DEFAULT_APP = process.env.KIEDAS_PREVIEW_EXPORT_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'
const DE_CATEGORIES = ['ExportWarframes', 'ExportWeapons', 'ExportCustoms', 'ExportUpgrades', 'ExportRecipes', 'ExportRelicArcane', 'ExportResources', 'ExportFlavour', 'ExportGear', 'ExportSentinels']
const ACQUISITION_CATEGORIES = ['ExportWarframes', 'ExportWeapons', 'ExportUpgrades', 'ExportRelicArcane', 'ExportGear', 'ExportSentinels']
const BASELINE_FILES = { ExportRelicArcane: ['ExportRelics.json', 'ExportArcanes.json'] }
const DECORATION_PARENTS = new Set(['/Lotus/Types/Items/ShipDecos/ShipDecoItem', '/Lotus/Types/Items/ShipDecos/BaseFishTrophy', '/Lotus/Types/Items/ShipDecos/ChildDrawingBase', '/Lotus/Types/Items/ShipDecos/LotusShawzinPlayableBase', '/Lotus/Types/Items/ShipDecos/Plushies/PlushyThumper', '/Lotus/Types/Items/ShipDecos/Vignettes/Enemies/ShipDecoItem', '/Lotus/Types/Items/ShipDecos/InstrumentDecoItem', '/Lotus/Types/Items/ShipDecorationLayerItem'])
const FULL_CATALOG_RESOURCE_PARENTS = new Set(['/Lotus/Types/Items/Fish/FishItem', '/Lotus/Types/Items/Fish/FishPartItem', '/Lotus/Types/Items/MiscItems/ResourceItem', '/Lotus/Types/Items/Gems/GemItem', '/Lotus/Types/Items/MiscItems/IncarnonAdapters/BaseIncarnonUnlocker', '/Lotus/Types/Gameplay/Duviri/Resource/DuviriBaseResourceItem', '/Lotus/Types/Items/RailjackMiscItems/BaseRailjackItem', '/Lotus/Types/Items/Plants/MiscItems/PlantItem', '/Lotus/Types/Items/MiscItems/FocusLens'])
const PRIME_PART_PATH_RE = /Prime.*?(Barrel|Receiver|Stock|Blade|Handle|Link|Gauntlet|Head|Helmet|Disc|Grip|Boot|Chain|String|UpperLimb|LowerLimb|Carapace|Cerebrum|Systems|Chassis|Neuroptics|Guard|Hilt|Ornament|Stars|Holster|Pouch|Band|Blueprint)(Component)?$/i
const LANDING_CRAFT = ['DefaultShip', 'ScimitarShip', 'MantisShip', 'XiphosShip', 'ZarimanShip', 'GrineerShip', 'NoraShip']
const AYATAN = ['OroFusexA', 'OroFusexB', 'OroFusexC', 'OroFusexD', 'OroFusexE', 'OroFusexF', 'OroFusexG', 'OroFusexH', 'OroFusexI', 'OroFusexJ', 'OroFusexEntrati']
const WEAPON_BUCKETS = { LongGuns: 'primary', Pistols: 'secondary', Melee: 'melee' }
const ACCEPTED_RELIC_ERAS = new Set(['Lith', 'Meso', 'Neo', 'Axi'])
const RULES = {
  weaponBuckets: 'src/lib/inventoryParser.js:1504-1512; LongGuns/Pistols require noise or a named variant, Melee requires damagePerShot or a named variant',
  relicEra: 'src/lib/relicParser.js: relic era consumers accept Lith/Meso/Neo/Axi; unknown DE eras are not placed in normal relic filters',
  primeParts: 'src/lib/inventoryParser.js:2393; PRIME_PART_PATH_RE decides whether a recipe ingredient is a Prime component',
  fullResources: 'src/lib/inventoryParser.js:2599-2612; only FULL_CATALOG_RESOURCE_PARENTS are added to the unowned resource catalog',
  landingAyatan: 'src/lib/inventoryParser.js:2317-2338 for landing_craft_catalog and src/screens/Inventory.jsx:409-419 for the Ayatan sculpture list; unknown leaves are not classified',
  mastery: 'src/lib/inventoryParser.js:1549-1620; productCategory/path branches assign mastery arrays and exclude unknown buckets',
  codex: 'src/lib/inventoryParser.js:2042 and src/screens/Cosmetics.jsx:267; unowned excludeFromCodex/codexSecret entries are hidden',
}

const readJson = (file) => fs.readFile(file, 'utf8').then(JSON.parse)
const canonical = (value) => String(value || '').replaceAll('/StoreItems/', '/')
const asRecords = (value, category) => {
  if (Array.isArray(value)) return value.map((record) => [record.uniqueName || record.ItemType, record]).filter(([key]) => key)
  if (value?.[category]) return asRecords(value[category], category)
  return Object.entries(value || {}).map(([key, record]) => [record?.uniqueName || record?.ItemType || key, record]).filter(([key]) => key)
}
const display = (record, key) => record?.name || record?.Name || key
const names = (entries) => entries.map(([key, record]) => `${key} (${display(record, key)})`).sort()
const recordMap = (entries) => new Map(entries.map(([key, record]) => [canonical(key), record]))
const flatten = (data, categories = DE_CATEGORIES) => categories.flatMap((category) => asRecords(data[category], category))
const jsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function supplementSet(data, keyMap = (key) => key) {
  return new Set(Object.entries(data || {}).filter(([key]) => key !== '_comment').map(([key, value]) => canonical(keyMap(key, value))))
}

function subjectsFor(deEntries, baselineEntries, all, fields = null) {
  const baseline = recordMap(baselineEntries)
  return deEntries.filter(([key, record]) => all || !baseline.has(canonical(key)) || (fields && fields.some((field) => !jsonEqual(record?.[field], baseline.get(canonical(key))?.[field]))))
}

function ruleEntries(entries, reason) {
  return entries.map(([key, record]) => `${key} (${display(record, key)}; ${reason(record, key)})`).sort()
}

export function analyze({ de, baseline = {}, curated, all = false }) {
  const allDe = flatten(de)
  const allBaseline = flatten(baseline)
  const result = {}
  const meta = {}
  const add = (group, entries, consequence, rule) => { result[group] = entries; meta[group] = { consequence, rule } }
  const acqSet = supplementSet(curated.acquisition, (key, value) => value?.uniqueName || key)
  const acquisition = subjectsFor(flatten(de, ACQUISITION_CATEGORIES), flatten(baseline, ACQUISITION_CATEGORIES), all)
  add('warframe-items-acquisition.json', names(acquisition.filter(([key]) => !acqSet.has(canonical(key)))), 'The acquisition drawer has no curated drop/source record for these DE items.', 'src/lib/inventoryParser.js:1986-1990; AcquisitionItems is looked up by uniqueName.')

  const relicRecords = asRecords(de.ExportRelicArcane, 'ExportRelicArcane').filter(([key]) => !/\/CosmeticEnhancers\//.test(key))
  const relicSubjects = subjectsFor(relicRecords, asRecords(baseline.ExportRelicArcane, 'ExportRelicArcane'), all)
  const wikiParts = new Set(Object.values(curated.relics || {}).flatMap((value) => Object.keys(value?.Parts || {})).map((part) => part.toLowerCase().replaceAll(' ', '')))
  const primeParts = []
  for (const [, recipe] of subjectsFor(asRecords(de.ExportRecipes, 'ExportRecipes'), asRecords(baseline.ExportRecipes, 'ExportRecipes'), all)) for (const component of recipe?.ingredients || []) {
    const itemType = component?.ItemType || component?.type || component?.uniqueName
    const leaf = itemType?.split('/').pop() || ''
    if (!/Prime/i.test(leaf) || !PRIME_PART_PATH_RE.test(leaf)) continue
    const part = leaf.slice(leaf.indexOf('Prime') + 5).replace(/Component$/i, ' Blueprint').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replaceAll(' ', '')
    if (!wikiParts.has(part)) primeParts.push([itemType, { name: leaf }])
  }
  add('wiki-prime-relic-drops.json', names([...new Map(primeParts.map(([key, value]) => [key, value]))]), 'Prime component acquisition falls back to a generic relic message because no matching Wiki Parts key is present.', 'src/lib/acquisitionInfo.js:153-168; the index is keyed by normalized item name plus the exact Parts key.')

  const customs = subjectsFor(asRecords(de.ExportCustoms, 'ExportCustoms'), asRecords(baseline.ExportCustoms, 'ExportCustoms'), all)
  const resources = subjectsFor(asRecords(de.ExportResources, 'ExportResources'), asRecords(baseline.ExportResources, 'ExportResources'), all)
  const flavours = subjectsFor(asRecords(de.ExportFlavour, 'ExportFlavour'), asRecords(baseline.ExportFlavour, 'ExportFlavour'), all)
  const cosmeticDe = [
    ...customs.filter(([key, record]) => /\/Upgrades\/Skins\//i.test(key) && (record?.icon || record?.texture)),
    ...resources.filter(([, record]) => DECORATION_PARENTS.has(record?.parentName)),
    ...flavours.filter(([key]) => key.startsWith('/Lotus/Types/Items/Emotes/')),
  ]
  add('cosmetic-catalog-additions.json', names(cosmeticDe.filter(([key]) => !supplementSet(curated.cosmetics).has(canonical(key)))), 'Cosmetics.jsx cannot show the DE cosmetic as a catalog item unless the curated addition supplies it.', 'src/contexts/MonitoringContext.jsx:704-707 and src/screens/Cosmetics.jsx:156-267; additions are keyed by uniqueName.')

  const mods = subjectsFor(asRecords(de.ExportUpgrades, 'ExportUpgrades'), asRecords(baseline.ExportUpgrades, 'ExportUpgrades'), all).filter(([key, record]) => record?.upgradeEntries || record?.fusionLimit !== undefined || /Mod/i.test(record?.parentName || '') || /\/Mods\//i.test(key))
  add('mod-icon-map.json', names(mods.filter(([key]) => !supplementSet(curated.modIcons).has(canonical(key)))), 'The mod card has no curated icon-map entry and may render without its intended artwork.', 'src/lib/inventoryParser.js:1109-1119; ModIconMap is keyed by canonical uniqueName.')

  const arcaneNames = supplementSet(curated.acquisition, (key, value) => value?.name)
  const arcanes = subjectsFor(asRecords(de.ExportRelicArcane, 'ExportRelicArcane'), asRecords(baseline.ExportRelicArcane, 'ExportRelicArcane'), all).filter(([key]) => /\/CosmeticEnhancers\//.test(key)).filter(([, record]) => !arcaneNames.has(String(record?.name || '').trim().toLowerCase())).map(([key, record]) => `${key} (${display(record, key)})`)
  add('AcquisitionItems arcane name allowlist', arcanes, 'The unowned arcane is hidden because its display name is absent from the AcquisitionItems allowlist.', 'src/lib/inventoryParser.js:2129-2153; arcanes are admitted by lower-cased AcquisitionItems.name.')

  const weapons = asRecords(de.ExportWeapons, 'ExportWeapons')
  const weaponSubjects = subjectsFor(weapons, asRecords(baseline.ExportWeapons, 'ExportWeapons'), all, ['productCategory', 'noise', 'damagePerShot'])
  const isNonMasteryDefinition = (key) => /\/PetParts\/|\/OperatorAmplifiers\/|\/HoverboardParts\/|\/InfKitGun\/|\/SUModular|\/ModularMelee/.test(key)
  add('weapons primary/secondary/melee bucket rule', ruleEntries(weaponSubjects.filter(([key, record]) => !isNonMasteryDefinition(key) && WEAPON_BUCKETS[record?.productCategory] && !record?.noise && !/vandal|wraith|prisma|prime/i.test(record?.name || '') && !(record?.damagePerShot && record?.productCategory === 'Melee')), () => 'fails the inclusion predicate'), 'The weapon is omitted from the primary, secondary, or melee mastery bucket.', RULES.weaponBuckets)
  add('relic era filter', names(relicSubjects.filter(([, record]) => record?.era && !ACCEPTED_RELIC_ERAS.has(record.era))), 'The relic is not assigned to a normal Lith/Meso/Neo/Axi filter.', RULES.relicEra)
  add('excludeFromCodex/codexSecret', names(subjectsFor(allDe, allBaseline, all, ['excludeFromCodex', 'codexSecret']).filter(([, record]) => record?.excludeFromCodex === true || record?.codexSecret === true)), 'The unowned item is hidden by the screen rule; owned exceptions are intentionally not reported as missing.', RULES.codex)

  const badPrime = []
  for (const [, recipe] of subjectsFor(asRecords(de.ExportRecipes, 'ExportRecipes'), asRecords(baseline.ExportRecipes, 'ExportRecipes'), all)) for (const component of recipe?.ingredients || []) {
    const itemType = component?.ItemType || component?.type || component?.uniqueName
    const leaf = itemType?.split('/').pop() || ''
    if (/Prime/i.test(leaf) && !PRIME_PART_PATH_RE.test(leaf)) badPrime.push([itemType, { name: leaf }])
  }
  add('PRIME_PART_PATH_RE', names([...new Map(badPrime.map(([key, value]) => [key, value]))]), 'The Prime ingredient is treated as an ordinary resource instead of a prime component.', RULES.primeParts)
  const catalogSubjects = subjectsFor(allDe, allBaseline, all)
  add('landing craft hard-coded list', names(catalogSubjects.filter(([key]) => (/\/Ships\//i.test(key) || /Ship$/i.test(key)) && !LANDING_CRAFT.some((leaf) => key.includes(leaf)))), 'The landing craft is not assigned to the landing-craft catalog because its DE leaf is not in the hard-coded list.', RULES.landingAyatan)
  add('Ayatan hard-coded list', names(catalogSubjects.filter(([key]) => /OroFusex(?!Ornament)/i.test(key) && !AYATAN.some((leaf) => key.includes(leaf)))), 'The Ayatan sculpture is not assigned to the known Ayatan family.', RULES.landingAyatan)
  add('FULL_CATALOG_RESOURCE_PARENTS', resources.filter(([, record]) => record?.parentName && !FULL_CATALOG_RESOURCE_PARENTS.has(record.parentName)).map(([key, record]) => `${key} (${display(record, key)}; parent ${record.parentName})`), 'The unowned resource is not added to the full catalog because its parent is not allowlisted.', RULES.fullResources)
  add('Mastery category rule', names(weaponSubjects.filter(([key, record]) => record?.productCategory && !WEAPON_BUCKETS[record.productCategory] && !/\/Sentinels\//.test(key) && !/SpaceGuns|SpaceMelee|SentinelWeapons|MechSuits|SpaceSuits/.test(record.productCategory))), 'The weapon has a productCategory not covered by the mastery category branches and may be omitted or mis-bucketed.', RULES.mastery)
  return { result, meta }
}

async function loadCurated(dataDir) {
  const file = async (name) => readJson(path.join(dataDir, name))
  const [acquisition, relics, cosmetics, modIcons] = await Promise.all([file('warframe-items-acquisition.json'), file('wiki-prime-relic-drops.json'), file('cosmetic-catalog-additions.json'), file('mod-icon-map.json')])
  return { acquisition, relics, cosmetics, modIcons }
}
async function loadDe(cacheDir) {
  const provenance = await readJson(path.join(cacheDir, 'provenance.json'))
  const de = {}
  for (const category of DE_CATEGORIES) { const suffix = provenance.categories?.[category]?.suffix; if (suffix) de[category] = await readJson(path.join(cacheDir, 'assets', `${suffix}.json`)) }
  return de
}
async function loadBaseline(appDir) {
  const baseline = {}
  for (const category of DE_CATEGORIES) {
    if (category === 'ExportRelicArcane') {
      const values = []
      for (const name of ['ExportRelics.json', 'ExportArcanes.json']) { try { values.push(await readJson(path.join(appDir, name))) } catch { /* optional paired export-plus file */ } }
      baseline[category] = values.flatMap((value) => {
        const records = value?.[category] || value
        if (Array.isArray(records)) return records
        return Object.entries(records || {}).map(([key, record]) => ({ uniqueName: record?.uniqueName || key, ...record }))
      })
      continue
    }
    for (const name of (BASELINE_FILES[category] || [`${category}.json`, `${category}_en.json`])) { try { baseline[category] = await readJson(path.join(appDir, name)); break } catch { /* try next export-plus name */ } }
  }
  return baseline
}
function markdown({ result, meta }, source) {
  const lines = ['# Supplement freshness report', '', `Generated from the cached Digital Extremes Public Export (${source.de}) against the Preview export-plus baseline (${source.baseline}). Default mode reports DE-only records; \`--all\` includes all DE records. Each group is limited to a supplement the app actually consumes or a rule that can hide/mis-bucket the subject.`, '']
  for (const [group, entries] of Object.entries(result)) { lines.push(`## ${group} — ${entries.length}`, `- Consequence: ${meta[group].consequence}`, `- Rule/key: ${meta[group].rule}`, entries.length ? entries.join(', ') : 'None', '') }
  return `${lines.join('\n')}\n`
}
export async function main({ cacheDir = DEFAULT_CACHE, dataDir = DEFAULT_DATA, appDir = DEFAULT_APP, report = path.join(ROOT, 'docs/agent-reports/supplement-freshness.md'), all = false } = {}) {
  const analyzed = analyze({ de: await loadDe(cacheDir), baseline: await loadBaseline(appDir), curated: await loadCurated(dataDir), all })
  await fs.mkdir(path.dirname(report), { recursive: true }); await fs.writeFile(report, markdown(analyzed, { de: cacheDir, baseline: appDir }))
  for (const [group, entries] of Object.entries(analyzed.result)) console.log(`${group}: ${entries.length}`)
  return analyzed.result
}
if (import.meta.url === `file://${process.argv[1]}`) main({ cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE || DEFAULT_CACHE, dataDir: process.env.KIEDAS_SUPPLEMENT_DATA_DIR || DEFAULT_DATA, appDir: process.env.KIEDAS_PREVIEW_EXPORT_DIR || DEFAULT_APP, all: process.argv.includes('--all') }).catch((error) => { console.error(`supplement-freshness: ${error.message}`); process.exitCode = 1 })
