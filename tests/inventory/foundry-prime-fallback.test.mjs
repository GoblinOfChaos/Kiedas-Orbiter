import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json')
const haveRealData = fs.existsSync(inventoryFile) && fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const parserPath = process.env.P66_PARSER_PATH || path.join(root, 'src/lib/inventoryParser.js')
const beforeParserPath = process.env.P66_BEFORE_PARSER_PATH || parserPath

const FOO = '/Lotus/Powersuits/Foo/Foo'
const FOO_PRIME = '/Lotus/Powersuits/FooPrime/FooPrime'
const OTHER = '/Lotus/Powersuits/Other/Other'
const FOO_BLUEPRINT = '/Lotus/Types/Recipes/WarframeRecipes/FooBlueprint'
const FOO_PRIME_BLUEPRINT = '/Lotus/Types/Recipes/WarframeRecipes/FooPrimeBlueprint'

async function loadParser(file) {
  return import(pathToFileURL(file).href)
}

function fooExports() {
  return {
    ExportWarframes: {
      [FOO_PRIME]: { name: 'Foo Prime', icon: '/Lotus/Art/FooPrime.png', productCategory: 'Suits', category: 'Warframes' },
      [OTHER]: { name: 'Other', icon: '/Lotus/Art/Other.png', productCategory: 'Suits', category: 'Warframes' },
    },
    ExportRecipes: {
      [FOO]: { name: 'Foo' },
      [FOO_BLUEPRINT]: { resultType: FOO, ingredients: [] },
      [FOO_PRIME_BLUEPRINT]: { resultType: FOO_PRIME, ingredients: [] },
    },
  }
}

function findFooRecipe(parsed) {
  const recipe = [...(parsed.craftable ?? []), ...(parsed.craftable_extra ?? [])]
    .find((entry) => entry.resultType === FOO)
  assert.ok(recipe, 'Foo recipe must be present in the Foundry catalog')
  return recipe
}

function recipeCount(parsed) {
  return (parsed.craftable?.length ?? 0) + (parsed.craftable_extra?.length ?? 0)
}

test('synthetic: owning Foo Prime does not mark Foo recipe as owned', async () => {
  const { parseInventory } = await loadParser(parserPath)
  const parsed = parseInventory({ Suits: [{ ItemType: FOO_PRIME, ItemCount: 1 }] }, fooExports(), {}, 'en', null)
  const recipe = findFooRecipe(parsed)
  assert.equal(recipe.fullItemOwned, false)
  assert.equal(recipe.ownedCount, 0)
})

test('synthetic: owning Foo marks Foo recipe as owned', async () => {
  const { parseInventory } = await loadParser(parserPath)
  const parsed = parseInventory({ MiscItems: [{ ItemType: FOO, ItemCount: 1 }] }, fooExports(), {}, 'en', null)
  const recipe = findFooRecipe(parsed)
  assert.equal(recipe.fullItemOwned, true)
  assert.equal(recipe.ownedCount, 1)
})

test('real data: recipe ownership count is unchanged by exact-name lookup', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const { parseInventory: parseBefore } = await loadParser(beforeParserPath)
  const { parseInventory: parseAfter } = await loadParser(parserPath)
  const beforeCount = recipeCount(parseBefore(raw, exportsBundle, dict, 'en', null))
  const afterCount = recipeCount(parseAfter(raw, exportsBundle, dict, 'en', null))
  console.log(`P66 real-data recipe counts: before=${beforeCount} after=${afterCount}`)
  assert.equal(afterCount, beforeCount, 'exact-name ownership lookup must not change the current real-data recipe count')
})
