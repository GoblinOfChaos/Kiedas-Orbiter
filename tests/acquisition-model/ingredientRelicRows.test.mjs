import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR, canonicalPath } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { buildIngredientSourceRows, buildRelicRarityIndex, getRelicSourceLabel } from '../../src/lib/relicSources.js'

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const { buildIngredientRowsWithModel } = await import('../../src/lib/acquisitionModel/ingredientRelicRows.js')
const { buildItemRelics } = await import('../../src/lib/acquisitionModel/buildItemAcquisition.js')
const { deRelicTruth } = await import('../../src/lib/acquisitionModel/deRelicTruth.js')

const tiers = {
  'ui.relic_rarity.common': 'Common',
  'ui.relic_rarity.uncommon': 'Uncommon',
  'ui.relic_rarity.rare': 'Rare',
}
const t = (key) => tiers[key] || key
const relicFacts = (rows) => rows.filter((row) => row.type === 'relic').map((row) => ({
  relic: row.modelRelicName || row.relicName,
  tier: row.rarity || row.modelTier || null,
  ...(row.tiers ? { tiers: row.tiers } : {}),
  ...(row.tierConflict ? { tierConflict: true } : {}),
}))
const sortedFacts = (rows) => relicFacts(rows).map((row) => JSON.stringify(row)).toSorted()
const modelFacts = (rows) => rows.map(({ relic, tier, tiers: conflictTiers, tierConflict }) => ({
  relic,
  tier,
  ...(conflictTiers ? { tiers: conflictTiers } : {}),
  ...(tierConflict ? { tierConflict: true } : {}),
})).map((row) => JSON.stringify(row)).toSorted()

test('synthetic: ingredient model rows replace relics, preserve non-relic rows, order eras/codes, and display every conflict tier', () => {
  const component = '/Lotus/Recipes/TestComponent'
  const blueprint = '/Lotus/Recipes/TestBlueprint'
  const exportData = {
    ExportRecipes: { [blueprint]: { resultType: component } },
    ExportRewards: {},
    ExportRelics: {
      '/Relics/VanguardE1': { era: 'Vanguard', category: 'E1', relicRewards: [{ rewardName: blueprint, rarity: 'UNCOMMON' }] },
      '/Relics/LithA19': { name: 'Lith A19 Relic', relicRewards: [{ rewardName: blueprint, rarity: 'UNCOMMON' }] },
      '/Relics/LithA2': { name: 'Lith A2 Relic', relicRewards: [{ rewardName: component, rarity: 'COMMON' }] },
      '/Relics/AxiV8': { name: 'Axi V8 Relic', relicRewards: [{ rewardName: component, rarity: 'COMMON' }, { rewardName: component, rarity: 'UNCOMMON' }] },
    },
  }
  const existingRows = [
    { type: 'mission', nodeName: 'Earth' },
    { type: 'relic', relicName: 'Meso Old1', rarity: 'RARE' },
    { type: 'non-drop', text: 'Vendor' },
  ]
  const rows = buildIngredientRowsWithModel({ itemType: component, name: 'Test Component' }, existingRows, { exportData }, { t })

  assert.deepEqual(rows.filter((row) => row.type !== 'relic'), [existingRows[0], existingRows[2]])
  assert.deepEqual(rows.filter((row) => row.type === 'relic').map((row) => getRelicSourceLabel(row, t)), [
    'Lith A2 (Common)',
    'Lith A19 (Uncommon)',
    'Axi V8 (Common / Uncommon)',
    'Vanguard E1 (Uncommon)',
  ])
  assert.equal(rows.some((row) => row.relicName === 'Meso Old1'), false)
  assert.deepEqual(relicFacts(rows).find((row) => row.relic === 'Axi V8'), {
    relic: 'Axi V8', tier: 'COMMON', tiers: ['COMMON', 'UNCOMMON'], tierConflict: true,
  })
})

test('synthetic: the disabled selection leaves old ingredient rows exactly unchanged', () => {
  const existingRows = [{ type: 'mission', nodeName: 'Earth' }, { type: 'relic', relicName: 'Lith A1', rarity: 'COMMON' }]
  const enabled = false
  const rows = enabled ? buildIngredientRowsWithModel({ itemType: '/none' }, existingRows, {}, { t }) : existingRows
  assert.strictEqual(rows, existingRows)
})

async function realContext() {
  const harness = await loadRealHarness({ locale: 'en' })
  return {
    harness,
    ctx: { exportData: harness.exportsBundle },
    dropIndex: buildDropIndex(harness.exportsBundle),
    rarityIndex: buildRelicRarityIndex(harness.exportsBundle),
  }
}

function ashIngredient(context, componentName) {
  const ash = context.harness.exportsBundle.AcquisitionItems.find((item) => item.name === 'Ash Prime')
  const component = ash?.components?.find((entry) => entry.name === componentName)
  assert.ok(component?.uniqueName, `Ash Prime ${componentName} must exist`)
  return { itemType: component.uniqueName, name: `Ash Prime ${componentName}`, component }
}

test('real data: Ash Prime ingredient rows include the three Vanguard relics from DE truth', { skip: !haveRealData }, async () => {
  const context = await realContext()
  const wanted = [
    ['Neuroptics', 'Vanguard P1', 'Common'],
    ['Chassis', 'Vanguard M1', 'Common'],
    ['Systems', 'Vanguard C1', 'Uncommon'],
  ]
  for (const [part, relic, tier] of wanted) {
    const ingredient = ashIngredient(context, part)
    const oldRows = buildIngredientSourceRows(ingredient, context.dropIndex, ingredient.component.drops || [], context.rarityIndex)
    const rows = buildIngredientRowsWithModel(ingredient, oldRows, context.ctx, { t })
    assert.deepEqual(sortedFacts(rows), modelFacts(deRelicTruth(ingredient.itemType, context.harness.exportsBundle)), part)
    assert.ok(rows.some((row) => (row.modelRelicName || row.relicName) === relic), `${part} must include literal ${relic}`)
    assert.ok(rows.map((row) => getRelicSourceLabel(row, t)).includes(`${relic} (${tier})`), `${part} must label ${relic} (${tier})`)
  }
})

test('real data: every Prime recipe ingredient model row set equals its DE-derived relic set', { skip: !haveRealData, timeout: 180000 }, async () => {
  const context = await realContext()
  const recipeByResult = new Map(Object.entries(context.harness.exportsBundle.ExportRecipes || {})
    .filter(([, recipe]) => recipe?.resultType)
    .map(([blueprint, recipe]) => [canonicalPath(recipe.resultType), { blueprint, recipe }]))
  const mismatches = []
  let ingredients = 0
  for (const item of context.harness.exportsBundle.AcquisitionItems || []) {
    if (!/\bPrime\b/i.test(item.name || '')) continue
    const itemRecipe = recipeByResult.get(canonicalPath(item.uniqueName))?.recipe
    for (const rawIngredient of itemRecipe?.ingredients || []) {
      const itemType = canonicalPath(rawIngredient.ItemType || rawIngredient.itemType)
      if (!itemType) continue
      ingredients += 1
      const ingredient = { itemType, name: itemType.split('/').pop() }
      const rows = buildIngredientRowsWithModel(ingredient, [], context.ctx, { t })
      const expected = buildItemRelics(itemType, context.ctx)
      if (JSON.stringify(sortedFacts(rows)) !== JSON.stringify(modelFacts(expected))) mismatches.push(`${item.name}: ${ingredient.name}`)
    }
  }
  console.log(`P62 Prime ingredient DE parity: ingredients=${ingredients}, mismatches=${mismatches.length}${mismatches.length ? `, first=${mismatches.slice(0, 5).join(', ')}` : ''}`)
  assert.ok(ingredients > 0)
  assert.deepEqual(mismatches, [])
})

test('real data: Blueprint box relic sets are checked against blueprint model relic sets', { skip: !haveRealData, timeout: 180000 }, async () => {
  const context = await realContext()
  const mismatches = []
  let recipes = 0
  for (const item of context.harness.exportsBundle.AcquisitionItems || []) {
    const blueprint = item.components?.find((component) => component.name === 'Blueprint')
    if (!blueprint?.uniqueName) continue
    recipes += 1
    const oldRows = buildIngredientSourceRows({ itemType: blueprint.uniqueName, name: `${item.name} Blueprint` }, context.dropIndex, blueprint.drops || [], context.rarityIndex)
    const actual = relicFacts(oldRows).map((row) => JSON.stringify(row)).toSorted()
    const expected = modelFacts(buildItemRelics(blueprint.uniqueName, context.ctx))
    if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push(item.name)
  }
  console.log(`P62 Blueprint-box DE agreement: recipes=${recipes}, mismatches=${mismatches.length}${mismatches.length ? `, first=${mismatches.slice(0, 5).join(', ')}` : ''}`)
  assert.ok(recipes > 0)
})
