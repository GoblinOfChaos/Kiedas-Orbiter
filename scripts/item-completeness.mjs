import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadRealHarness, canonicalPath } from './lib/real-data-harness.mjs'
const { parseInventory } = await import('../src/lib/inventoryParser.js')
const { resolveAnyImage } = await import('../src/lib/warframeUtils.js')

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const canaryFile = path.join(REPO, 'scripts/item-completeness.canaries.json')
const canaries = JSON.parse(fs.readFileSync(canaryFile, 'utf8'))

export function selectCanaries(harness, previousIndex = []) {
  const previous = new Set(previousIndex.map((entry) => entry.uniqueName || entry))
  const named = new Set(canaries.map((entry) => entry.uniqueName))
  const current = []
  for (const table of ['ExportWarframes', 'ExportWeapons', 'ExportSentinels', 'ExportResources', 'ExportGear']) {
    for (const [uniqueName, entry] of Object.entries(harness.exportsBundle[table] || {})) {
      if (entry?.name && uniqueName && !named.has(uniqueName) && !previous.has(uniqueName)) current.push({ name: entry.name, uniqueName })
    }
  }
  return [...canaries, ...current.sort((a, b) => a.uniqueName.localeCompare(b.uniqueName)).slice(0, 5)]
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

export async function run({ dataDir, repo = REPO, harness, acquisition, deCacheDir = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export', previousIndex = [], includeDiscovered = true } = {}) {
  const loaded = harness || await loadRealHarness({ dataDir, repo })
  const bundledAcquisition = acquisition || loadAcquisitionFixture(path.join(repo, 'src-tauri/data/assets/data/completeness-acquisition.json')) || loadBundledAcquisition(repo)
  const deRecipes = await loadDeRecipes(deCacheDir)
  const selected = includeDiscovered ? selectCanaries(loaded, previousIndex) : canaries
  return selected.map((canary) => checkItem({ harness: loaded, canary, acquisition: bundledAcquisition, deRecipes }))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dataArg = process.argv.indexOf('--data-dir')
  const cacheArg = process.argv.indexOf('--de-cache-dir')
  const dataDir = dataArg >= 0 ? process.argv[dataArg + 1] : process.env.PREVIEW_DATA_DIR
  const deCacheDir = cacheArg >= 0 ? process.argv[cacheArg + 1] : undefined
  const results = await run({ dataDir, deCacheDir })
  console.log('| Item | Inventory | Image | Foundry/recipe | Components | Acquisition | Result |')
  console.log('| --- | --- | --- | --- | --- | --- | --- |')
  for (const result of results) {
    const components = result.recipe.presentInDE ? `${result.recipe.components.filter((component) => component.image).length}/${result.recipe.components.length}` : 'N/A (no DE recipe)'
    const acquisition = result.acquisition.pass ? 'PASS' : `FAIL (${result.acquisition.reason})`
    console.log(`| ${result.name} | ${result.inventory.pass ? 'PASS' : 'FAIL'} | ${result.inventory.image ? 'PASS' : 'FAIL'} | ${result.recipe.presentInDE ? (result.recipe.foundry ? 'PASS' : 'FAIL') : 'N/A'} | ${components} | ${acquisition} | ${result.pass ? 'PASS' : 'FAIL'} |`)
    console.log(JSON.stringify(result, null, 2))
  }
  process.exitCode = results.every((result) => result.pass) ? 0 : 1
}

export { canaries }
