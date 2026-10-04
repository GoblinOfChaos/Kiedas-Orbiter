import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json')
const haveRealData = fs.existsSync(inventoryFile)
const FOLLIE_ROOT = '/Lotus/Types/Recipes/WarframeRecipes/'
const FOLLIE = {
  blueprint: `${FOLLIE_ROOT}FollieBlueprint`,
  chassis: `${FOLLIE_ROOT}FollieChassisComponent`,
  chassisBlueprint: `${FOLLIE_ROOT}FollieChassisBlueprint`,
  helmet: `${FOLLIE_ROOT}FollieHelmetComponent`,
  helmetBlueprint: `${FOLLIE_ROOT}FollieHelmetBlueprint`,
  systems: `${FOLLIE_ROOT}FollieSystemsComponent`,
  systemsBlueprint: `${FOLLIE_ROOT}FollieSystemsBlueprint`,
}

const canonical = (value) => value?.replaceAll('/StoreItems/', '/') || value

function replaceItem(array, itemType, itemCount) {
  const filtered = (array ?? []).filter((entry) => entry?.ItemType !== itemType)
  filtered.push({ ItemType: itemType, ItemCount: itemCount })
  return filtered
}

// The live inventory changes as the player finishes Foundry jobs. Keep the
// real export/inventory context, but make the Follie rows exactly match the
// reported screenshot so this proof never depends on today's ownership state.
export function buildFollieFixture(liveInventory) {
  const fixture = structuredClone(liveInventory)
  fixture.MiscItems = (fixture.MiscItems ?? []).filter((entry) => !/^\/Lotus\/Types\/Recipes\/WarframeRecipes\/Follie/i.test(entry?.ItemType ?? ''))
  fixture.MiscItems.push({ ItemType: FOLLIE.chassis, ItemCount: 1 })
  fixture.Recipes = (fixture.Recipes ?? []).filter((entry) => !/^\/Lotus\/Types\/Recipes\/WarframeRecipes\/Follie/i.test(entry?.ItemType ?? ''))
  fixture.Recipes = replaceItem(fixture.Recipes, FOLLIE.blueprint, 2)
  fixture.Recipes = replaceItem(fixture.Recipes, FOLLIE.chassisBlueprint, 1)
  fixture.Recipes = replaceItem(fixture.Recipes, FOLLIE.helmetBlueprint, 1)
  fixture.Recipes = replaceItem(fixture.Recipes, FOLLIE.systemsBlueprint, 1)
  fixture.PendingRecipes = (fixture.PendingRecipes ?? []).filter((entry) => !/^\/Lotus\/Types\/Recipes\/WarframeRecipes\/Follie/i.test(entry?.ItemType ?? ''))
  for (const itemType of [FOLLIE.helmetBlueprint, FOLLIE.systemsBlueprint]) {
    fixture.PendingRecipes.push({
      ItemType: itemType,
      ItemId: { $oid: '6ac1e98bd0e8201f170bb72a' },
      CompletionDate: { $date: { $numberLong: '1791136331000' } },
    })
  }
  return fixture
}

async function loadParserContext() {
  const harness = await loadRealHarness()
  const parserPath = process.env.P29_INVENTORY_PARSER || path.join(harness.repo, 'src/lib/inventoryParser.js')
  const { parseInventory } = await import(pathToFileURL(parserPath).href)
  return { ...harness, parseInventory }
}

function findFollieRecipe(parsed) {
  return (parsed.craftable ?? []).find((recipe) => canonical(recipe.uniqueName) === FOLLIE.blueprint)
}

function countInventory(array, itemType) {
  return (array ?? [])
    .filter((entry) => canonical(entry?.ItemType) === canonical(itemType))
    .reduce((sum, entry) => sum + (entry.ItemCount ?? 1), 0)
}

function recipeResultTypes(exportsBundle) {
  const equipment = new Set([
    ...Object.keys(exportsBundle.ExportWarframes ?? {}),
    ...Object.keys(exportsBundle.ExportWeapons ?? {}),
  ].map(canonical))
  return Object.entries(exportsBundle.ExportRecipes ?? {})
    .filter(([, recipe]) => recipe?.resultType && equipment.has(canonical(recipe.resultType)))
}

function findParsedRecipe(parsed, blueprintKey) {
  return [...(parsed.craftable ?? []), ...(parsed.craftable_extra ?? [])]
    .find((recipe) => canonical(recipe.uniqueName) === canonical(blueprintKey))
}

test('real fixture: Follie component counts separate built parts from in-progress builds', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, parseInventory } = await loadParserContext()
  const fixture = buildFollieFixture(JSON.parse(fs.readFileSync(inventoryFile, 'utf8')))
  const parsed = parseInventory(fixture, exportsBundle, dict, 'en', null)
  const recipe = findFollieRecipe(parsed)
  assert.ok(recipe, 'Follie main recipe should be present')
  assert.equal(recipe.bpCount, 2)

  const ingredients = new Map(recipe.ingredients.map((ingredient) => [canonical(ingredient.itemType), ingredient]))
  assert.deepEqual(
    [ingredients.get(FOLLIE.chassis), ingredients.get(FOLLIE.helmet), ingredients.get(FOLLIE.systems)].map((ingredient) => ({
      have: ingredient.have,
      need: ingredient.need,
      bpOwned: ingredient.bpOwned,
      building: ingredient.building,
    })),
    [
      { have: 1, need: 1, bpOwned: 1, building: 0 },
      { have: 0, need: 1, bpOwned: 1, building: 1 },
      { have: 0, need: 1, bpOwned: 1, building: 1 },
    ],
  )
})

test('real inventory audit: every Warframe and weapon recipe respects built and in-progress components', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, parseInventory } = await loadParserContext()
  const live = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const fixture = buildFollieFixture(live)
  const parsed = parseInventory(fixture, exportsBundle, dict, 'en', null)
  const componentResults = new Set()
  let auditedRecipes = 0
  let auditedComponents = 0
  for (const [blueprintKey, recipe] of recipeResultTypes(exportsBundle)) {
    const parsedRecipe = findParsedRecipe(parsed, blueprintKey)
    assert.ok(parsedRecipe, `parser omitted equipment recipe ${blueprintKey}`)
    auditedRecipes += 1
    for (const ingredient of recipe.ingredients ?? []) {
      if (!ingredient.ItemType?.includes('Component')) continue
      auditedComponents += 1
      const itemType = canonical(ingredient.ItemType)
      componentResults.add(itemType)
      const parsedIngredient = parsedRecipe.ingredients.find((entry) => canonical(entry.itemType) === itemType)
      assert.ok(parsedIngredient, `${blueprintKey} omitted component ${ingredient.ItemType}`)
      const built = countInventory(fixture.MiscItems, itemType)
      const pending = (fixture.PendingRecipes ?? []).filter((entry) => {
        const pendingRecipe = exportsBundle.ExportRecipes?.[entry.ItemType] ?? exportsBundle.ExportRecipes?.[canonical(entry.ItemType)]
        return canonical(pendingRecipe?.resultType) === itemType
      }).length
      if (built > 0) assert.ok(parsedIngredient.have >= built, `${blueprintKey}: ${itemType} has ${parsedIngredient.have}, built inventory has ${built}`)
      if (built === 0 && pending > 0) {
        assert.equal(parsedIngredient.have, 0, `${blueprintKey}: in-progress ${itemType} counted as built`)
        assert.equal(parsedIngredient.building, pending, `${blueprintKey}: expected ${pending} in-progress ${itemType}`)
      }
    }
  }
  assert.ok(auditedRecipes > 0, 'no Warframe or weapon recipes were audited')
  assert.ok(auditedComponents > 0, 'no component ingredients were audited')
  for (const itemType of componentResults) {
    const pending = (fixture.PendingRecipes ?? []).some((entry) => {
      const pendingRecipe = exportsBundle.ExportRecipes?.[entry.ItemType] ?? exportsBundle.ExportRecipes?.[canonical(entry.ItemType)]
      return canonical(pendingRecipe?.resultType) === itemType
    })
    if (!pending) continue
    const part = (parsed.parts ?? []).find((entry) => canonical(entry.unique_name) === itemType)
    if (part) assert.equal(part.owned, false, `in-progress component is marked owned: ${itemType}`)
  }
})
