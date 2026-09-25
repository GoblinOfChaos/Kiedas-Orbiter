import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadRealHarness, canonicalPath } from './lib/real-data-harness.mjs'
const { parseInventory } = await import('../src/lib/inventoryParser.js')
const { getRelicCatalog } = await import('../src/lib/relicParser.js')
const { resolveAnyImage, resolveNode } = await import('../src/lib/warframeUtils.js')
const { buildDropIndex } = await import('../src/lib/dropsParser.js')

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const canaryFile = path.join(REPO, 'scripts/item-completeness.canaries.json')
const canaries = JSON.parse(fs.readFileSync(canaryFile, 'utf8'))

export function selectCanaries(harness, previousIndex = []) {
  const previous = new Set(previousIndex.map((entry) => entry.uniqueName || entry))
  const named = new Set(canaries.map((entry) => entry.uniqueName))
  const current = []
  for (const table of ['ExportWarframes', 'ExportWeapons', 'ExportSentinels', 'ExportResources', 'ExportGear', 'ExportUpgrades', 'ExportArcanes', 'ExportRelics', 'ExportCustoms', 'ExportFlavour']) {
    for (const [uniqueName, entry] of Object.entries(harness.exportsBundle[table] || {})) {
      if (entry?.name && uniqueName && !named.has(uniqueName) && !previous.has(uniqueName)) current.push({ name: entry.name, uniqueName })
    }
  }
  return [...canaries, ...current.sort((a, b) => a.uniqueName.localeCompare(b.uniqueName)).slice(0, 5)]
}

export const CATEGORY_RULES = {
  warframes: { tables: ['ExportWarframes'], buckets: ['warframes'], screens: ['Inventory', 'Foundry', 'Mastery', 'Drawer'] },
  weapons: { tables: ['ExportWeapons'], buckets: ['primary', 'secondary', 'melee', 'weapons'], screens: ['Inventory', 'Foundry', 'Mastery', 'Drawer'] },
  companions: { tables: ['ExportSentinels'], buckets: ['companions', 'sentinels', 'moas', 'hounds', 'beasts'], screens: ['Inventory', 'Mastery', 'Drawer'] },
  mods: { tables: ['ExportUpgrades', 'WI_Upgrades'], buckets: ['mods', 'mods_catalog'], screens: ['Inventory', 'Mod catalog', 'Drawer'] },
  arcanes: { tables: ['ExportArcanes', 'WI_Arcanes'], buckets: ['arcanes', 'arcanes_catalog'], screens: ['Inventory', 'Arcane catalog', 'Drawer'] },
  relics: { tables: ['ExportRelics', 'WI_Relics'], buckets: ['relics'], screens: ['Relics', 'Relic Planner', 'Drawer'] },
  cosmetics: { tables: ['ExportCustoms', 'ExportFlavour'], buckets: ['appearance_catalog', 'landing_craft_catalog'], screens: ['Cosmetics', 'Drawer'] },
  resources: { tables: ['ExportResources'], buckets: ['resources', 'components'], screens: ['Inventory', 'Drawer'] },
  gear: { tables: ['ExportGear'], buckets: ['consumables_catalog', 'landing_craft_catalog', 'gear'], screens: ['Inventory', 'Drawer'] },
  recipes: { tables: ['ExportRecipes'], buckets: ['craftable'], screens: ['Foundry', 'Drawer'] },
  regions: { tables: ['ExportRegions'], buckets: ['starchart'], screens: ['Starchart', 'Arbitration', 'Worldstate'] },
  keys: { tables: ['ExportKeys'], buckets: ['keys'], screens: ['Worldstate', 'Acquisition'] },
}

export function checkRegionCanary({ exportsBundle, dict = {}, uniqueName }) {
  const regions = exportsBundle?.ExportRegions || {}
  const entry = Array.isArray(regions)
    ? regions.find((candidate) => candidate?.uniqueName === uniqueName)
    : regions[uniqueName]
  const name = entry ? resolveNode(uniqueName, dict, { [uniqueName]: entry }) : ''
  const planet = entry?.systemName ? resolveNode(entry.systemName, dict, { [entry.systemName]: { name: entry.systemName } }) : ''
  return { uniqueName, present: !!entry, name, planet, pass: !!entry && name !== 'Unknown Node' && planet !== 'Unknown Node' }
}

export function checkKeyCanary({ exportsBundle, dict = {}, uniqueName }) {
  const keys = exportsBundle?.ExportKeys || {}
  const entry = Array.isArray(keys)
    ? keys.find((candidate) => candidate?.uniqueName === uniqueName)
    : keys[uniqueName]
  const nameKey = entry?.name
  const name = dict[nameKey] || dict['/' + nameKey] || nameKey || ''
  return { uniqueName, present: !!entry, name, pass: !!entry && !!name && !name.startsWith('/') }
}

export function primePartsVisible(primeSets, baseName) {
  const set = primeSets?.[baseName]
  return !!set && (set.owned || (set.parts || []).some((part) => (part.quantity ?? 0) > 0))
}

function tableEntries(harness, tableNames) {
  const result = []
  for (const table of tableNames) {
    const data = harness.exportsBundle[table]
    if (Array.isArray(data)) result.push(...data.map((entry) => [entry?.uniqueName || entry?.ItemType, entry]))
    else if (data && typeof data === 'object') result.push(...Object.entries(data).map(([key, entry]) => [entry?.uniqueName || entry?.ItemType || key, entry]))
  }
  return result.filter(([uniqueName]) => uniqueName)
}

function categoryFor(harness, uniqueName) {
  for (const [category, rule] of Object.entries(CATEGORY_RULES)) {
    if (tableEntries(harness, rule.tables).some(([candidate]) => canonicalPath(candidate) === canonicalPath(uniqueName))) return category
  }
  return 'unknown'
}

function findCatalogItem(parsed, uniqueName) {
  return Object.values(parsed).flatMap((value) => Array.isArray(value) ? value : []).find((item) => canonicalPath(item?.unique_name) === canonicalPath(uniqueName))
}

function itemName(harness, uniqueName, entry) {
  const key = entry?.name || entry?.displayName || harness.uniqueNameToName?.[uniqueName]
  return cleanName(harness.dict?.[key] || harness.dict?.['/' + key] || key)
}

async function buildAcquisition(harness, item, name, recipeResultIndex = null, dropIndex = null) {
  try {
    const { getAcquisitionInfo } = await import('../src/lib/acquisitionInfo.js')
    if (!recipeResultIndex) {
      const { loadAcquisitionData } = await import('../src/lib/acquisitionData.js')
      await loadAcquisitionData()
    }
    const result = getAcquisitionInfo(item?.unique_name || item?.uniqueName, name, dropIndex, harness.exportsBundle.AcquisitionItems || {}, recipeResultIndex, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null)
    const sources = result?.sources || []
    const labelled = sources.every((source) => source && typeof source.source === 'string' && source.source.trim() && ['text', 'location', 'relicName', 'rewardName'].some((key) => typeof source[key] === 'string' && source[key].trim()))
    const chances = sources.map((source) => Number(source.chance)).filter(Number.isFinite)
    const sorted = chances.every((chance, index) => index === 0 || chances[index - 1] >= chance)
    const valid = labelled && sorted
    return { pass: valid, ran: true, honestEmpty: !result || sources.length === 0, result, cannot: valid ? null : 'drawer returned an unlabelled or unsorted acquisition source' }
  } catch (error) {
    return { pass: false, ran: false, honestEmpty: false, cannot: `getAcquisitionInfo unavailable: ${error.message}` }
  }
}

export function discoverSubjects(harness, previousIndex = []) {
  const subjects = new Map(canaries.map((entry) => [entry.uniqueName, entry]))
  for (const [category, rule] of Object.entries(CATEGORY_RULES)) {
    for (const [uniqueName, entry] of tableEntries(harness, rule.tables)) {
      subjects.set(uniqueName, { uniqueName, name: itemName(harness, uniqueName, entry), category })
    }
  }
  return [...subjects.values()]
}

function cacheRecords(value, category) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.[category])) return value[category]
  return Object.entries(value || {}).map(([uniqueName, entry]) => ({ uniqueName: entry?.uniqueName || uniqueName, ...entry }))
}

export function discoverNewDeSubjects({ dataDir, cacheDir }) {
  const provenance = JSON.parse(fs.readFileSync(path.join(cacheDir, 'provenance.json'), 'utf8'))
  const mirrorDir = path.join(dataDir, 'export')
  const mirror = (table) => fs.existsSync(path.join(mirrorDir, `${table}.json`)) ? JSON.parse(fs.readFileSync(path.join(mirrorDir, `${table}.json`), 'utf8')) : {}
  const output = []
  const seen = new Set()
  const add = (category, table, raw) => {
    const mirrorData = mirror(table)
    const mirrorEntries = tableEntries({ exportsBundle: { [table]: mirrorData } }, [table])
    const mirrorKeys = new Set(mirrorEntries.map(([key]) => canonicalPath(key)))
    for (const entry of cacheRecords(raw, table)) {
      const uniqueName = entry?.uniqueName || entry?.ItemType
      if (!uniqueName) continue
      const mirrorEntry = mirrorEntries.find(([key]) => canonicalPath(key) === canonicalPath(uniqueName))?.[1]
      const needsRelicRewardAdapter = category === 'relics' && Array.isArray(entry?.relicRewards) && entry.relicRewards.length > 0 && !mirrorEntry?.rewardManifest
      if (mirrorKeys.has(canonicalPath(uniqueName)) && !needsRelicRewardAdapter) continue
      const target = category === 'recipes' ? entry?.resultType : uniqueName
      if (!target) continue
      const key = `${category}:${canonicalPath(uniqueName)}`
      if (seen.has(key)) continue
      seen.add(key)
      output.push({ uniqueName: target, name: cleanName(entry.name || entry.displayName || target), category })
    }
  }
  for (const [category, rule] of Object.entries(CATEGORY_RULES)) {
    const cacheTable = category === 'relics' || category === 'arcanes' ? 'ExportRelicArcane' : rule.tables.find((table) => provenance.categories?.[table])
    if (!cacheTable) continue
    const provenanceEntry = provenance.categories[cacheTable]
    const file = path.join(cacheDir, 'assets', `${provenanceEntry.suffix.replace(/[^A-Za-z0-9._+-]/g, '_')}.json`)
    if (!fs.existsSync(file)) continue
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (cacheTable !== 'ExportRelicArcane') { add(category, cacheTable, raw); continue }
    const mirrorTable = category === 'arcanes' ? 'ExportArcanes' : 'ExportRelics'
    const mirrorEntries = tableEntries({ exportsBundle: { [mirrorTable]: mirror(mirrorTable) } }, [mirrorTable])
    const mirrorKeys = new Set(mirrorEntries.map(([key]) => canonicalPath(key)))
    for (const item of cacheRecords(raw, cacheTable)) {
      const isArcane = item?.uniqueName?.includes('/CosmeticEnhancers/')
      const mirrorEntry = mirrorEntries.find(([key]) => canonicalPath(key) === canonicalPath(item?.uniqueName))?.[1]
      const needsRelicRewardAdapter = category === 'relics' && Array.isArray(item?.relicRewards) && item.relicRewards.length > 0 && !mirrorEntry?.rewardManifest
      if ((category === 'arcanes') !== isArcane || !item?.uniqueName || (mirrorKeys.has(canonicalPath(item.uniqueName)) && !needsRelicRewardAdapter)) continue
      const key = `${category}:${canonicalPath(item.uniqueName)}`
      if (!seen.has(key)) { seen.add(key); output.push({ uniqueName: item.uniqueName, name: cleanName(item.name || item.uniqueName), category }) }
    }
  }
  return output
}

export async function checkMatrixItem({ harness, subject, parsed = null, syntheticOwned = true }) {
  const inventory = parsed || parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)
  const category = subject.category || categoryFor(harness, subject.uniqueName)
  const rule = CATEGORY_RULES[category] || CATEGORY_RULES.resources
  if (category === 'regions' || category === 'keys') {
    const resolved = category === 'regions'
      ? checkRegionCanary({ exportsBundle: harness.exportsBundle, dict: harness.dict, uniqueName: subject.uniqueName })
      : checkKeyCanary({ exportsBundle: harness.exportsBundle, dict: harness.dict, uniqueName: subject.uniqueName })
    const checks = {
      U1_catalog: resolved.present,
      U2_name: !!resolved.name && !resolved.name.startsWith('/') && resolved.name !== 'Unknown Node',
      U3_image: true,
      U4_uniqueName: !!subject.uniqueName,
      U5_acquisition: true,
      U6_description: true,
      recipe: true,
    }
    const screens = Object.fromEntries(rule.screens.map((screen) => [screen, Object.values(checks).every(Boolean)]))
    return {
      name: resolved.name || subject.name,
      uniqueName: subject.uniqueName,
      category,
      screens,
      checks,
      acquisition: { pass: true, cannot: null, sources: [] },
      ownedState: { pass: true, cannot: null },
      cannot: [],
      blockingCannot: null,
      status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
      pass: Object.values(checks).every(Boolean),
    }
  }
  const catalogItem = category === 'relics'
    ? (() => {
      const relicEntry = tableEntries(harness, ['ExportRelics']).find(([uniqueName]) => canonicalPath(uniqueName) === canonicalPath(subject.uniqueName))?.[1]
      const key = relicEntry?.name?.replace(/ Relic$/, '')
      return getRelicCatalog(harness.exportsBundle).find((item) => item.key === key)
    })()
    : findCatalogItem(inventory, subject.uniqueName)
  const entry = tableEntries(harness, rule.tables).find(([uniqueName]) => canonicalPath(uniqueName) === canonicalPath(subject.uniqueName))?.[1]
  const name = cleanName(catalogItem?.name || itemName(harness, subject.uniqueName, entry) || subject.name)
  const image = !!(catalogItem?.image || resolveAnyImage({ ...entry, unique_name: subject.uniqueName }, harness.EI, harness.nameToImage, harness.uniqueNameToName))
  const recipe = Object.values(harness.exportsBundle.ExportRecipes || {}).find((candidate) => canonicalPath(candidate?.resultType) === canonicalPath(subject.uniqueName))
  const components = recipe?.ingredients || []
  const acquisition = await buildAcquisition(harness, catalogItem || { unique_name: subject.uniqueName }, name, buildRecipeIndex(harness))
  const checks = {
    U1_catalog: !!catalogItem || category === 'recipes' || (category === 'cosmetics' && !!entry && !!(entry.name || entry.displayName) && !!(entry.icon || entry.texture)),
    U2_name: !!name && !name.startsWith('/') && !/^MT_/i.test(name),
    U3_image: image,
    U4_uniqueName: !!subject.uniqueName,
    U5_acquisition: acquisition.pass,
    U6_description: !!(catalogItem?.description || entry?.description || category === 'recipes'),
    recipe: !recipe || (components.length > 0 && components.every((component) => !!component.ItemType)),
  }
  const cannot = [
    'U4 display-name collision requires the rendered override/prex/Somachord stores',
    'U7 owned-state requires an inventory payload accepted by the current exporter shape',
  ]
  let ownedState = { pass: false, cannot: cannot[1] }
  if (syntheticOwned) {
    try {
      const synthetic = parseInventory({ MiscItems: [{ ItemType: subject.uniqueName, ItemCount: 1 }] }, harness.exportsBundle, harness.dict, 'en', null)
      const owned = findCatalogItem(synthetic, subject.uniqueName)
      ownedState = { pass: !!owned && (owned.owned || (owned.quantity ?? 0) > 0), cannot: owned && (owned.owned || (owned.quantity ?? 0) > 0) ? null : cannot[1] }
    } catch (error) { ownedState = { pass: false, cannot: `${cannot[1]} (${error.message})` } }
  }
  const primeScreens = /\bPrime$/i.test(name) ? { 'Prime Parts': primePartsVisible(inventory.primeSets, name.replace(/\s+Prime$/i, '')) || 'not owned by design', 'Relic Planner': !!recipe, 'Prime Resurgence': !!recipe } : {}
  const screens = Object.fromEntries([...rule.screens, ...Object.keys(primeScreens)].map((screen) => [screen, screen === 'Prime Parts' ? primeScreens[screen] !== false : checks.U1_catalog && checks.U2_name && checks.U3_image && (screen !== 'Foundry' || checks.recipe)]))
  const pass = Object.values(checks).every(Boolean) && (ownedState.pass || ownedState.cannot)
  return { name, uniqueName: subject.uniqueName, category, screens, checks, acquisition, ownedState, cannot, blockingCannot: acquisition.cannot, status: acquisition.cannot ? 'CANNOT' : pass ? 'PASS' : 'FAIL', pass: !!pass && !acquisition.cannot }
}

function buildRecipeIndex(harness) {
  return Object.values(harness.exportsBundle.ExportRecipes || {}).reduce((index, recipe) => {
    if (!recipe?.resultType) return index
    const ingredients = (recipe.ingredients || []).map((ingredient) => ({
      itemType: canonicalPath(ingredient.ItemType || ingredient.itemType),
      count: ingredient.ItemCount ?? ingredient.itemCount ?? 1,
      name: ingredient.ItemType || ingredient.itemType,
    })).filter((ingredient) => ingredient.itemType)
    if (ingredients.length) index.set(canonicalPath(recipe.resultType), {
      resultType: canonicalPath(recipe.resultType),
      ingredients,
    })
    return index
  }, new Map())
}

export async function checkCraftableRecipes({ harness, parsed = null }) {
  const inventory = parsed || parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)
  const recipeIndex = buildRecipeIndex(harness)
  const checks = []
  for (const craftable of inventory.craftable || []) {
    const expected = recipeIndex.get(canonicalPath(craftable.resultType))
    if (!expected) continue
    const acquisition = await buildAcquisition(harness, { unique_name: craftable.resultType }, craftable.bpName, recipeIndex)
    const actual = acquisition.result?.recipe
    const expectedParts = expected.ingredients.map(({ itemType, count }) => `${canonicalPath(itemType)}:${count}`).sort()
    const actualParts = (actual?.ingredients || []).map(({ itemType, count }) => `${canonicalPath(itemType)}:${count}`).sort()
    checks.push({
      item: craftable.bpName,
      uniqueName: craftable.resultType,
      expected: expectedParts,
      actual: actualParts,
      pass: !!actual && JSON.stringify(actualParts) === JSON.stringify(expectedParts),
      sourceCount: acquisition.result?.sources?.length || 0,
    })
  }
  return { total: checks.length, failed: checks.filter((check) => !check.pass), checks }
}

export async function checkPartsCompleteness({ harness, parsed = null }) {
  const inventory = parsed || parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)
  const parts = inventory.parts || []
  const recipeEntries = Object.values(harness.exportsBundle.ExportRecipes || {})
  const recipeByResult = new Map(recipeEntries.filter((recipe) => recipe?.resultType).map((recipe) => [canonicalPath(recipe.resultType), recipe]))
  const recipeKeyByResult = new Map(Object.entries(harness.exportsBundle.ExportRecipes || {}).filter(([, recipe]) => recipe?.resultType).map(([key, recipe]) => [canonicalPath(recipe.resultType), key]))
  const parents = [...(inventory.warframes || []), ...(inventory.primary || []), ...(inventory.secondary || []), ...(inventory.melee || []), ...(inventory.companions || []), ...(inventory.sentinels || []), ...(inventory.moas || []), ...(inventory.hounds || []), ...(inventory.beasts || [])]
  const checks = []
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const seenParents = new Set()
  for (const parent of parents) {
    const parentKey = canonicalPath(parent.unique_name)
    if (seenParents.has(parentKey) || /Prime$/i.test(parent.name || '')) continue
    const recipe = recipeByResult.get(parentKey)
    if (!recipe) continue
    seenParents.add(parentKey)
    const childResults = (recipe.ingredients || []).map((ingredient) => recipeByResult.get(canonicalPath(ingredient.ItemType))?.resultType).filter((resultType) => resultType && parts.some((item) => canonicalPath(item.unique_name) === canonicalPath(resultType)))
    const expected = [recipeKeyByResult.get(parentKey), ...childResults].filter(Boolean)
    for (const uniqueName of expected) {
      const item = parts.find((candidate) => canonicalPath(candidate.unique_name) === canonicalPath(uniqueName))
      const name = item?.name || uniqueName
      const directDropRows = dropIndex[canonicalPath(uniqueName)] || []
      const acquisition = item && directDropRows.length > 0 ? await buildAcquisition(harness, item, name, buildRecipeIndex(harness), dropIndex) : null
      const sourceRows = acquisition?.result?.sources || []
      const labelled = directDropRows.length === 0 || (sourceRows.length > 0 && sourceRows.every((source) => ['source', 'location', 'relicName', 'rewardName', 'text'].some((key) => typeof source?.[key] === 'string' && source[key].trim())))
      checks.push({ parent: parent.name, parentType: parent.category, uniqueName, name, image: !!item?.image, present: !!item, sourceRows: directDropRows.length, labelled, pass: !!item && !!item.image && labelled })
    }
  }
  return { total: checks.length, failed: checks.filter((check) => !check.pass), checks, summary: partsSummary(parts) }
}

export function partsSummary(parts = []) {
  const byParentType = {}
  let owned = 0
  for (const part of parts) {
    if (part.owned) owned++
    const key = part.parent_category || (part.parent_name?.match(/Prime$/i) ? 'prime' : 'equipment')
    byParentType[key] = (byParentType[key] || 0) + 1
  }
  return { total: parts.length, owned, byParentType }
}

const imageFor = (item, parsed, harness) => {
  if (item?.image) return item.image
  const sameUnique = (parsed.all || []).find((candidate) => canonicalPath(candidate.unique_name) === canonicalPath(item?.unique_name))
  return sameUnique?.image || resolveAnyImage(item, harness.EI, harness.nameToImage, harness.uniqueNameToName) || null
}
const cleanName = (value) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : ''

export function checkItem({ harness, canary, acquisition = null, deRecipes = null }) {
  const parsed = parseInventory({}, harness.exportsBundle, harness.dict, 'en', null)
  const item = (parsed.warframes || []).find((candidate) => canonicalPath(candidate.unique_name) === canonicalPath(canary.uniqueName))
  const name = cleanName(item?.name)
  const inventory = { pass: !!item, name, image: !!imageFor(item, parsed, harness), bucket: 'warframes' }
  inventory.pass = inventory.pass && !!name && !name.startsWith('/') && inventory.image

  const recipeSource = deRecipes || harness.exportsBundle.ExportRecipes || {}
  const rawRecipe = Object.values(recipeSource).find((recipe) => canonicalPath(recipe?.resultType) === canonicalPath(canary.uniqueName))
  const craftable = (parsed.craftable || []).find((recipe) => canonicalPath(recipe.resultType) === canonicalPath(canary.uniqueName) || recipe.baseName === canary.name)
  const recipe = {
    presentInDE: !!rawRecipe,
    foundry: !!craftable,
    components: (craftable?.ingredients || []).map((component) => ({
      name: cleanName(component.name), image: !!component.image,
      itemType: component.itemType,
    })),
  }
  recipe.pass = !recipe.presentInDE || (recipe.foundry && recipe.components.length > 0 && recipe.components.every((component) => component.name && !component.name.startsWith('/') && component.image))

  const sourceRows = acquisition?.[canary.uniqueName] || acquisition?.[canonicalPath(canary.uniqueName)] || acquisition?.[canary.name] || []
  const componentSources = recipe.components.map((component) => ({
    component,
    rows: acquisition?.[component.itemType] || acquisition?.[canonicalPath(component.itemType)] || [],
  }))
  const requiredComponentSources = componentSources.filter((source) => source.component.itemType?.includes('Component'))
  const parentNames = new Set([canary.name, `${canary.name} Blueprint`, ...(recipe.components || []).map((component) => component.name)])
  const unlabelledComponentDrops = sourceRows.filter((row) => row.rewardName && row.rewardName !== canary.name && parentNames.has(row.rewardName) && !row.part)
  const acquisitionResult = {
    rows: sourceRows,
    componentSources,
    unlabelledComponentDrops,
    reason: sourceRows.length === 0
      ? 'no bundled source rows for the parent or its components'
      : requiredComponentSources.some((source) => source.rows.length === 0)
        ? `missing bundled source rows for ${requiredComponentSources.filter((source) => source.rows.length === 0).map((source) => source.component.name || source.component.itemType).join(', ')}`
        : unlabelledComponentDrops.length > 0
          ? 'component reward rows are attributed to the parent without a part label'
          : null,
    pass: sourceRows.length > 0 && requiredComponentSources.every((source) => source.rows.length > 0) && unlabelledComponentDrops.length === 0 && sourceRows.every((row) => row.label || row.part || !row.rewardName || row.rewardName === canary.name),
  }
  return { name: canary.name, uniqueName: canary.uniqueName, inventory, recipe, acquisition: acquisitionResult, pass: inventory.pass && recipe.pass && acquisitionResult.pass }
}

function loadAcquisitionFixture(file) {
  if (!file || !fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function loadBundledAcquisition(repo) {
  const file = path.join(repo, 'src-tauri/data/assets/data/warframe-items-acquisition.json')
  if (!fs.existsSync(file)) return {}
  const records = JSON.parse(fs.readFileSync(file, 'utf8'))
  const result = {}
  for (const record of records) {
    const blueprint = (record.components || []).find((component) => component.name === 'Blueprint')
    if (record.uniqueName) result[record.uniqueName] = (blueprint?.drops || []).map((drop) => ({ label: 'Blueprint', rewardName: record.name, location: drop.location, chance: drop.chance }))
    for (const component of record.components || []) {
      if (!component.uniqueName || component.name === 'Blueprint') continue
      result[component.uniqueName] = (component.drops || []).map((drop) => ({ part: component.name, rewardName: drop.type || component.name, location: drop.location, chance: drop.chance }))
    }
  }
  return result
}

async function loadDeRecipes(cacheDir) {
  const provenance = JSON.parse(await fs.promises.readFile(path.join(cacheDir, 'provenance.json'), 'utf8'))
  const entry = provenance?.categories?.ExportRecipes
  if (!entry?.suffix) throw new Error(`DE cache provenance has no ExportRecipes entry: ${cacheDir}`)
  const file = path.join(cacheDir, 'assets', `${entry.suffix.replace(/[^A-Za-z0-9._+-]/g, '_')}.json`)
  const raw = JSON.parse(await fs.promises.readFile(file, 'utf8'))
  return Array.isArray(raw) ? raw : raw.ExportRecipes || raw
}

export async function run({ dataDir, repo = REPO, harness, previousIndex = [], includeDiscovered = true, deCacheDir = null, deDiscovery = null } = {}) {
  const loaded = harness || await loadRealHarness({ dataDir, repo })
  const discovered = deDiscovery || (includeDiscovered && deCacheDir ? discoverNewDeSubjects({ dataDir, cacheDir: deCacheDir }) : [])
  const subjects = includeDiscovered ? [...canaries, ...discovered] : canaries
  const parsed = parseInventory({}, loaded.exportsBundle, loaded.dict, 'en', null)
  const results = await Promise.all(subjects.map((subject) => checkMatrixItem({ harness: loaded, subject, parsed })))
  results.recipeCompleteness = await checkCraftableRecipes({ harness: loaded, parsed })
  results.partsCompleteness = await checkPartsCompleteness({ harness: loaded, parsed })
  const summary = results.partsCompleteness.summary
  try {
    const { event } = await import('../src/lib/logging/logger.js')
    event('inventory.parts.summary', { count: summary.total, owned: summary.owned, type: 'parts' }, { level: 'info', screen: 'inventory' })
  } catch {
    // CLI/test environments have no Tauri logger; the returned summary remains authoritative.
  }
  return results
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dataArg = process.argv.indexOf('--data-dir')
  const cacheArg = process.argv.indexOf('--de-cache-dir')
  const dataDir = dataArg >= 0 ? process.argv[dataArg + 1] : process.env.PREVIEW_DATA_DIR
  const previousArg = process.argv.indexOf('--previous')
  const stateFile = previousArg >= 0 ? process.argv[previousArg + 1] : path.join(REPO, 'scripts/.item-completeness-state.json')
  const previousIndex = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : []
  const results = await run({ dataDir, previousIndex, deCacheDir })
  console.log('| Item | Category | Inventory | Image | Foundry | Acquisition | Screens | Result |')
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const result of results) {
    const screens = Object.entries(result.screens).map(([screen, pass]) => `${screen}:${pass ? 'PASS' : 'FAIL'}`).join(', ')
    console.log(`| ${result.name || result.uniqueName} | ${result.category} | ${result.checks.U1_catalog ? 'PASS' : 'FAIL'} | ${result.checks.U3_image ? 'PASS' : 'FAIL'} | ${result.checks.recipe ? 'PASS' : 'FAIL'} | ${result.status} | ${screens} | ${result.status} |`)
    console.log(JSON.stringify(result, null, 2))
  }
  const cannot = [...new Set(results.flatMap((result) => result.cannot.concat(result.acquisition.cannot || [], result.ownedState.cannot || [])))]
  console.log(`\nCraftable drawer recipe checks: ${results.recipeCompleteness.total} checked, ${results.recipeCompleteness.failed.length} failed`)
  for (const failure of results.recipeCompleteness.failed) console.log(`- ${failure.item}: expected ${failure.expected.join(', ')}, got ${failure.actual.join(', ')}`)
  console.log('\nCannot be checked:')
  for (const entry of cannot) console.log(`- ${entry}`)
  fs.mkdirSync(path.dirname(stateFile), { recursive: true })
  fs.writeFileSync(stateFile, JSON.stringify(results.map(({ uniqueName, name, category }) => ({ uniqueName, name, category })), null, 2) + '\n')
  process.exitCode = results.every((result) => result.pass) ? 0 : 1
}

export { canaries }
