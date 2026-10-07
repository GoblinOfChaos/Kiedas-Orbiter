import { getAcquisitionInfo, buildAllAcquisitionIndexes } from '../acquisitionInfo.js'
import { getItemDrops } from '../acquisitionData.js'
import { buildDropIndex } from '../dropsParser.js'
import { buildBlueprintSourceRows, buildIngredientSourceRows, buildRelicRarityIndex, normalizeRelicName, normalizeRelicSources } from '../relicSources.js'
import { getRelicCatalog } from '../relicParser.js'
import { deRelicTruth } from './deRelicTruth.js'

const canonicalPath = (value) => String(value || '').replaceAll('/StoreItems/', '/')
const foundryText = (value) => /\b(?:built|crafted|craftable|made) (?:in |at )?(?:the )?foundry\b|\bfoundry from a blueprint\b|^\s*(?:build cost|rush|components)\s*:/i.test(String(value || ''))
const isUsefulSource = (source) => source && source.type !== 'unresearched' && source.type !== 'status' && !foundryText(source.text)

function sourceProvenance(source = {}) {
  const label = String(source.source || '')
  const review = source.reviewSource || {}
  const page = review.url || label.match(/https?:\/\/wiki\.warframe\.com\/[^\s)]+/i)?.[0] || null
  if (/drop.?tables?|DropsAll/i.test(label)) return { kind: 'de-droptables' }
  if (/DE (?:Export|export)|ExportRelics|ExportRewards/i.test(label)) return { kind: 'de-export' }
  if (page || /Warframe Wiki|verified/i.test(label) || source.type === 'verified-route') return { kind: 'verified-route', ...(page ? { page } : {}), ...(review.revid ? { revid: review.revid } : {}) }
  return { kind: 'bundled-fallback', ...(label ? { source: label } : {}) }
}

function relicProvenance(source, exportRelics) {
  const relic = normalizeRelicName(source?.relicName || source?.relicManifest || '')
  if (exportRelics.has(relic.toLowerCase())) return { kind: 'de-exportrelics' }
  const route = sourceProvenance(source)
  return route.kind === 'de-droptables' ? route : { kind: 'bundled-fallback', ...(route.source ? { source: route.source } : {}) }
}

function sourceLabel(source) {
  return source?.text || source?.nodeName || source?.location || source?.name || source?.relicName || source?.relicManifest || ''
}

function resolveIngredientName(itemType, ctx) {
  if (typeof ctx.resolveName === 'function') return ctx.resolveName(itemType)
  const entryTables = ['ExportWarframes', 'ExportWeapons', 'ExportSentinels', 'ExportResources', 'ExportGear', 'ExportUpgrades', 'ExportArcanes', 'ExportCustoms']
  for (const tableName of entryTables) {
    const entry = ctx.exportData?.[tableName]?.[itemType] || ctx.exportData?.[tableName]?.[canonicalPath(itemType)]
    if (entry?.name) return ctx.exportData?.dict?.[entry.name] || entry.name
  }
  return canonicalPath(itemType).split('/').pop().replace(/(?:Component|Blueprint)$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2')
}

function acquisitionFor(uniqueName, name, ctx) {
  if (typeof ctx.getAcquisitionInfo === 'function') return ctx.getAcquisitionInfo(uniqueName, name, ctx) || { sources: [], recipe: null }
  const indexes = ctx.indexes || ctx
  return getAcquisitionInfo(
    uniqueName, name, ctx.dropIndex || {}, ctx.overridesData || ctx.acquisitionOverrides || ctx.exportData?.AcquisitionItems || {},
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex, indexes.wikiSigilIndex,
    indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex, indexes.exportVendorIndex, indexes.alwaysAvailableIndex,
    indexes.glyphSupplementIndex, indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex, indexes.exaltedWeaponIndex,
    indexes.exportComponentIndex,
  )
}

function rowsToRoutes(sources) {
  const seen = new Set()
  return (sources || []).filter(isUsefulSource).filter((source) => source.type !== 'relic').flatMap((source) => {
    const text = sourceLabel(source)
    if (!text) return []
    const route = { ...source, text, provenance: sourceProvenance(source) }
    const signature = `${route.type}|${text}|${route.provenance.kind}`
    if (seen.has(signature)) return []
    seen.add(signature)
    return [route]
  })
}

function readRecipeNumber(recipe, keys) {
  for (const key of keys) if (Number.isFinite(Number(recipe?.[key]))) return Number(recipe[key])
  return 0
}

function buildSection(recipe, ctx, relicRows) {
  if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) return recipe?.blueprintUniqueName ? { credits: readRecipeNumber(recipe, ['creditsCost', 'buildCost', 'buildPrice', 'credits']), time: readRecipeNumber(recipe, ['buildTime', 'time']), rush: readRecipeNumber(recipe, ['rushCost', 'skipBuildTimePrice', 'rush']), ingredients: [] } : null
  const fallback = typeof ctx.getItemDrops === 'function' ? ctx.getItemDrops : getItemDrops
  const ingredients = recipe.ingredients.map((ingredient) => {
    const itemType = canonicalPath(ingredient.ItemType || ingredient.itemType)
    const name = ingredient.name || resolveIngredientName(itemType, ctx)
    const info = acquisitionFor(itemType, name, ctx)
    const fallbackDrops = fallback(itemType) || []
    const rows = buildIngredientSourceRows({ itemType, name }, ctx.dropIndex || {}, fallbackDrops, ctx.rarityIndex || null)
    relicRows.push(...(info.sources || []), ...rows)
    return { name, itemType, count: readRecipeNumber(ingredient, ['ItemCount', 'itemCount', 'count']) || 1, relics: collectRelics([...(info.sources || []), ...rows], ctx), routes: rowsToRoutes(info.sources) }
  })
  return { credits: readRecipeNumber(recipe, ['creditsCost', 'buildCost', 'buildPrice', 'credits']), time: readRecipeNumber(recipe, ['buildTime', 'time']), rush: readRecipeNumber(recipe, ['rushCost', 'skipBuildTimePrice', 'rush']), ingredients }
}

function exportRelicNames(ctx) {
  const catalog = ctx.relicCatalog || (ctx.exportData ? getRelicCatalog(ctx.exportData) : [])
  return new Set((catalog || []).map((entry) => normalizeRelicName(entry.key || entry.name || `${entry.era || ''} ${entry.category || ''}`)).filter(Boolean).map((name) => name.toLowerCase()))
}

function collectRelics(sources, ctx) {
  const rows = new Map()
  const exportRelics = exportRelicNames(ctx)
  for (const source of sources || []) {
    // Normalize one source at a time: a single relic can truthfully have more
    // than one DE tier, and aggregate normalization intentionally collapses it.
    const normalized = normalizeRelicSources([source], { rarityIndex: ctx.rarityIndex || null, itemType: source?.itemType || source?.componentType || '' })
    for (const relicSource of normalized) {
      if (relicSource.type !== 'relic') continue
      const relic = normalizeRelicName(relicSource.relicName || relicSource.relicManifest)
      if (!relic) continue
      const current = rows.get(relic) || { relic, tiers: new Set(), provenance: [] }
      // A provided DE-tier index wins, but fixtures and an as-yet-unmapped
      // identity still retain their explicit source tier for audit visibility.
      if (relicSource.rarity || source?.rarity) current.tiers.add(String(relicSource.rarity || source.rarity).toUpperCase())
      const provenance = relicProvenance(relicSource, exportRelics)
      if (!current.provenance.some((entry) => JSON.stringify(entry) === JSON.stringify(provenance))) current.provenance.push(provenance)
      rows.set(relic, current)
    }
  }
  return [...rows.values()].sort((a, b) => a.relic.localeCompare(b.relic)).map((row) => {
    const tiers = [...row.tiers].sort()
    return { relic: row.relic, tier: tiers[0] || null, ...(tiers.length > 1 ? { tiers, tierConflict: true } : {}), source: row.provenance[0]?.kind || 'bundled-fallback', provenance: row.provenance }
  })
}

/** Build only the model's relic facts, without constructing display routes. */
export function buildItemRelics(itemUniqueName, ctx = {}, fallbackSources = []) {
  const uniqueName = canonicalPath(itemUniqueName)
  return deRelicTruth(uniqueName, ctx.exportData) ?? collectRelics(fallbackSources, ctx)
}

/**
 * Build a display-independent acquisition record. The caller provides the
 * existing indexes; this module never mutates them or performs I/O.
 */
export function buildItemAcquisition(itemUniqueName, name, ctx = {}) {
  const uniqueName = canonicalPath(itemUniqueName)
  const indexes = ctx.indexes || ctx
  const itemInfo = acquisitionFor(uniqueName, name, ctx)
  const indexedRecipe = indexes.recipeResultIndex?.get(uniqueName) || null
  // getAcquisitionInfo may carry the raw ExportRecipes record (whose key is
  // its blueprint path); the shared index decorates it with blueprintUniqueName.
  const recipe = itemInfo.recipe?.blueprintUniqueName ? itemInfo.recipe : indexedRecipe || itemInfo.recipe || null
  const relicRows = [...(itemInfo.sources || [])]
  if (recipe?.blueprintUniqueName) {
    const blueprintName = `${name} Blueprint`
    const blueprintInfo = acquisitionFor(recipe.blueprintUniqueName, blueprintName, ctx)
    const fallback = typeof ctx.getItemDrops === 'function' ? ctx.getItemDrops : getItemDrops
    relicRows.push(...(blueprintInfo.sources || []), ...buildBlueprintSourceRows(name, recipe, ctx.dropIndex || {}, fallback(recipe.blueprintUniqueName) || [], ctx.rarityIndex || null))
  }
  const build = buildSection(recipe, ctx, relicRows)
  // DE reward identities are authoritative for the model-level relic set and
  // tier.  Acquisition source lists can contain generic ingredients or a
  // display-name match, neither of which proves that the reward belongs to
  // this item's own recipe tree.
  const relics = buildItemRelics(uniqueName, ctx, relicRows)
  const routes = rowsToRoutes(itemInfo.sources)
  return {
    uniqueName,
    name,
    routes,
    relics,
    build,
    origin: itemInfo.wikiLink || null,
    provenance: { routes: routes.map((route) => route.provenance), relics: relics.map(({ relic, provenance }) => ({ relic, sources: provenance })) },
  }
}

// Re-export the existing builders to make the intended context assembly
// explicit for headless users of this new model without copying their logic.
export { buildAllAcquisitionIndexes, buildDropIndex, buildRelicRarityIndex, getRelicCatalog }
