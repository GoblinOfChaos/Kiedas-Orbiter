const PRIME_REWARD_RE = /Prime.*(?:Blueprint|Barrel|Receiver|Stock|Blade|Handle|Link|Gauntlet|Head|Disc|Grip|Boot|Chain|String|UpperLimb|LowerLimb|Carapace|Cerebrum|Systems|Chassis|Neuroptics|Guard|Hilt|Ornament|Stars|Holster|Pouch|Band)$/i

export function canonicalPrimePath(value) {
  return value?.replace('/StoreItems/', '/').toLowerCase() || ''
}

export function isProjectionPath(value) { return value?.includes('/Projections/') || false }
export function isPackagePath(value) { return value?.includes('/Packages/') || false }

function rewardList(rewards, relic) {
  const pool = relic?.rewardManifest ? rewards?.[relic.rewardManifest] : null
  if (Array.isArray(pool?.[0])) return pool[0]
  return Array.isArray(pool) ? pool : []
}

function recipeIndex(exportData) {
  const byIngredient = new Map()
  const byResult = new Map()
  const byBlueprint = new Map()
  const parentByComponent = new Map()
  for (const [blueprint, recipe] of Object.entries(exportData?.ExportRecipes || {})) {
    if (!recipe?.resultType) continue
    const result = canonicalPrimePath(recipe.resultType)
    byResult.set(result, { blueprint, recipe })
    byBlueprint.set(canonicalPrimePath(blueprint), { blueprint, recipe })
    for (const ingredient of recipe.ingredients || []) {
      const key = canonicalPrimePath(ingredient.ItemType)
      if (!key) continue
      if (!byIngredient.has(key)) byIngredient.set(key, [])
      byIngredient.get(key).push({ blueprint, recipe })
    }
  }
  for (const { recipe: parentRecipe } of byResult.values()) {
    for (const ingredient of parentRecipe.ingredients || []) {
      const component = byResult.get(canonicalPrimePath(ingredient.ItemType))
      if (component) parentByComponent.set(canonicalPrimePath(component.recipe.resultType), { blueprint: component.blueprint, recipe: parentRecipe })
    }
  }
  return { byIngredient, byResult, byBlueprint, parentByComponent }
}

function resolveName(uniqueName, fallback, exportData) {
  const canonical = uniqueName?.replace('/StoreItems/', '/')
  const dict = exportData?.dict || {}
  const tables = ['ExportWeapons', 'ExportWarframes', 'ExportSentinels', 'ExportCustoms', 'ExportGear', 'ExportUpgrades', 'ExportRecipes']
  for (const tableName of tables) {
    const entry = exportData?.[tableName]?.[canonical] || exportData?.[tableName]?.[uniqueName]
    const key = entry?.name || entry?.displayName
    const value = key && (dict[key] || dict[`/${key}`] || key)
    if (value && !String(value).startsWith('/')) return String(value).replace(/\s+Blueprint$/i, '').trim()
  }
  const leaf = uniqueName?.split('/').pop()?.replace(/Blueprint$/i, '') || ''
  const pathName = leaf.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').trim()
  return fallback && !String(fallback).startsWith('/') ? fallback : pathName || 'Unknown item'
}

function inventoryIndex(inventoryData) {
  const map = new Map()
  for (const array of [inventoryData?.all, inventoryData?.prime_parts, inventoryData?.resources, inventoryData?.consumables, inventoryData?.consumables_catalog]) {
    for (const item of array || []) {
      const key = canonicalPrimePath(item.unique_name)
      if (key && !map.has(key)) map.set(key, item)
    }
  }
  return map
}

function partIsPrime(uniqueName) { return PRIME_REWARD_RE.test(uniqueName?.split('/').pop() || '') }

export function buildPrimeResurgenceModel(trader, exportData, inventoryData) {
  if (!trader?.inventory || !exportData) return { equipment: [], cosmetics: [], bundles: [] }
  const relics = exportData.ExportRelics || {}
  const rewards = exportData.ExportRewards || {}
  const recipes = recipeIndex(exportData)
  const owned = inventoryIndex(inventoryData)
  const rewardToRelics = new Map()
  const rewardTypes = new Map()

  for (const projection of trader.inventory.filter((entry) => isProjectionPath(entry.uniqueName))) {
    const key = projection.uniqueName.replace('/StoreItems/', '/')
    const relic = relics[projection.uniqueName] || relics[key]
    const label = relic?.era && relic?.category ? `${relic.era} ${relic.category}` : projection.item
    for (const reward of rewardList(rewards, relic)) {
      const type = reward.type || reward.rewardItem
      const normalized = canonicalPrimePath(type)
      if (!normalized || !partIsPrime(type)) continue
      rewardTypes.set(normalized, type)
      if (!rewardToRelics.has(normalized)) rewardToRelics.set(normalized, new Set())
      rewardToRelics.get(normalized).add(label)
    }
  }

  const equipment = new Map()
  for (const [rewardKey, rewardType] of rewardTypes) {
    const directMatch = recipes.byBlueprint.get(rewardKey) || recipes.byResult.get(rewardKey)
    const componentMatch = directMatch && recipes.parentByComponent.get(canonicalPrimePath(directMatch.recipe.resultType))
    const match = componentMatch || directMatch || recipes.byIngredient.get(rewardKey)?.[0]
    if (!match?.recipe?.resultType) continue
    const parentKey = canonicalPrimePath(match.recipe.resultType)
    const parentName = resolveName(match.recipe.resultType, rewardType, exportData)
    // The path is authoritative. Some Prime Warframe export display names
    // resolve to the base frame name even though the resultType is explicitly
    // the Prime variant.
    if (!/Prime/i.test(parentName) && !/Prime/i.test(match.recipe.resultType)) continue
    const resolvedParentNameRaw = /Prime/i.test(parentName) ? parentName : resolveName(match.recipe.resultType, `${parentName} Prime`, exportData)
    const resolvedParentName = /Prime/i.test(match.recipe.resultType) && !/Prime/i.test(resolvedParentNameRaw)
      ? `${resolvedParentNameRaw} Prime`
      : resolvedParentNameRaw
    if (!equipment.has(parentKey)) {
      const parentRecipe = recipes.byResult.get(parentKey)
      equipment.set(parentKey, { uniqueName: match.recipe.resultType, name: resolvedParentName, blueprint: parentRecipe?.blueprint || null, recipe: parentRecipe?.recipe || match.recipe, rewardKeys: new Set(), relics: new Set() })
    }
    const item = equipment.get(parentKey)
    item.rewardKeys.add(rewardKey)
    for (const relic of rewardToRelics.get(rewardKey) || []) item.relics.add(relic)
  }

  const equipmentCards = [...equipment.values()].map((item) => {
    const required = []
    if (item.blueprint && item.rewardKeys.has(canonicalPrimePath(item.blueprint))) required.push(item.blueprint)
    for (const ingredient of item.recipe?.ingredients || []) {
      if (!/Prime/i.test(ingredient.ItemType) || !ingredient.ItemType.includes('/Recipes/')) continue
      const componentRecipe = recipes.byResult.get(canonicalPrimePath(ingredient.ItemType))
      const componentBlueprint = componentRecipe?.blueprint
      if (item.rewardKeys.has(canonicalPrimePath(ingredient.ItemType))) required.push(ingredient.ItemType)
      else if (componentBlueprint && item.rewardKeys.has(canonicalPrimePath(componentBlueprint))) required.push(componentBlueprint)
    }
    const parts = [...new Set(required)].map((uniqueName) => {
      const entry = owned.get(canonicalPrimePath(uniqueName))
      return { uniqueName, name: resolveName(uniqueName, uniqueName, exportData), owned: !!entry && (!!entry.owned || !!entry.mastered || (entry.quantity || 0) > 0), isBlueprint: /Blueprint$/i.test(uniqueName), relics: [...(rewardToRelics.get(canonicalPrimePath(uniqueName)) || [])] }
    })
    const parent = owned.get(canonicalPrimePath(item.uniqueName))
    return { type: 'equipment', uniqueName: item.uniqueName, name: item.name, owned: !!parent && (!!parent.owned || !!parent.mastered || (parent.quantity || 0) > 0), mastered: !!parent?.mastered, parts, relics: [...item.relics].sort() }
  })

  const equipmentKeys = new Set(equipmentCards.map((item) => canonicalPrimePath(item.uniqueName)))
  const direct = trader.inventory.filter((entry) => !isProjectionPath(entry.uniqueName) && !isPackagePath(entry.uniqueName))
  const cosmetics = direct.filter((entry) => !equipmentKeys.has(canonicalPrimePath(entry.uniqueName))).map((entry) => {
    const ownedEntry = owned.get(canonicalPrimePath(entry.uniqueName))
    return { type: 'cosmetic', uniqueName: entry.uniqueName, name: resolveName(entry.uniqueName, entry.item, exportData), owned: !!ownedEntry && (!!ownedEntry.owned || !!ownedEntry.mastered || (ownedEntry.quantity || 0) > 0), ducats: entry.ducats, relics: [] }
  })
  const bundles = trader.inventory.filter((entry) => isPackagePath(entry.uniqueName)).map((entry) => ({ type: 'bundle', uniqueName: entry.uniqueName, name: resolveName(entry.uniqueName, entry.item, exportData), owned: false, ducats: entry.ducats }))
  return { equipment: equipmentCards.sort((a, b) => a.name.localeCompare(b.name)), cosmetics: cosmetics.sort((a, b) => a.name.localeCompare(b.name)), bundles: bundles.sort((a, b) => a.name.localeCompare(b.name)) }
}
