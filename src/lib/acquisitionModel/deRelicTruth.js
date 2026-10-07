import { normalizeRelicEntry, relicRewardPool } from '../relicEntry.js'
import { normalizeRelicName } from '../relicSources.js'

const canonicalPath = (value) => String(value || '').replaceAll('/StoreItems/', '/')
const indexesByExport = new WeakMap()

function indexesFor(exportData) {
  const cached = indexesByExport.get(exportData)
  if (cached) return cached
  const recipeByResult = new Map()
  for (const [blueprintUniqueName, recipe] of Object.entries(exportData.ExportRecipes || {})) {
    if (recipe?.resultType) recipeByResult.set(canonicalPath(recipe.resultType), { blueprintUniqueName: canonicalPath(blueprintUniqueName), recipe })
  }
  const rewardsByTarget = new Map()
  for (const [relicUniqueName, entry] of Object.entries(exportData.ExportRelics || {})) {
    const normalized = normalizeRelicEntry(entry, relicUniqueName)
    if (!normalized.era || !normalized.category) continue
    const relic = normalizeRelicName(`${normalized.era} ${normalized.category}`)
    for (const reward of relicRewardPool(entry, exportData.ExportRewards, relicUniqueName)) {
      const target = canonicalPath(reward?.type)
      if (!target || !reward?.rarity) continue
      const targetRewards = rewardsByTarget.get(target) || new Map()
      const tiers = targetRewards.get(relic) || new Set()
      tiers.add(String(reward.rarity).toUpperCase())
      targetRewards.set(relic, tiers)
      rewardsByTarget.set(target, targetRewards)
    }
  }
  const indexes = { recipeByResult, rewardsByTarget }
  indexesByExport.set(exportData, indexes)
  return indexes
}

/**
 * Return the exact DE relic reward rows belonging to an item, its blueprint,
 * and the item's direct recipe ingredients/their blueprints.  This deliberately
 * does not consult display names or generic acquisition sources: those can
 * describe a different item which happens to share a name.
 */
export function deRelicTruth(itemUniqueName, exportData = {}) {
  if (!exportData?.ExportRelics) return null

  const { recipeByResult, rewardsByTarget } = indexesFor(exportData)

  const targets = new Set([canonicalPath(itemUniqueName)])
  const itemRecipe = recipeByResult.get(canonicalPath(itemUniqueName))
  if (itemRecipe) {
    targets.add(itemRecipe.blueprintUniqueName)
    for (const ingredient of itemRecipe.recipe.ingredients || []) {
      const ingredientType = canonicalPath(ingredient.ItemType || ingredient.itemType)
      if (!ingredientType) continue
      targets.add(ingredientType)
      const ingredientRecipe = recipeByResult.get(ingredientType)
      if (ingredientRecipe) targets.add(ingredientRecipe.blueprintUniqueName)
    }
  }

  const relics = new Map()
  for (const target of targets) for (const [relic, tiers] of rewardsByTarget.get(target) || []) {
    const combined = relics.get(relic) || new Set()
    for (const tier of tiers) combined.add(tier)
    relics.set(relic, combined)
  }

  return [...relics].sort(([left], [right]) => left.localeCompare(right)).map(([relic, tierSet]) => {
    const tiers = [...tierSet].sort()
    return {
      relic,
      tier: tiers[0] || null,
      ...(tiers.length > 1 ? { tiers, tierConflict: true } : {}),
      source: 'de-exportrelics',
      provenance: [{ kind: 'de-exportrelics' }],
    }
  })
}
