/** Pure adapter for the Preview Farming Targets screen. */
import { expandTargets } from './requirements.js';
import { buildLedger } from './ledger.js';
import { rankPlaces } from './farmNext.js';
import { sortSourcesByChanceInRotations } from '../chanceSort.js';
import { buildRelicPlaces } from './relicPlaces.js';
import { resolveAnyImage, resolveMissionType, resolveNode } from '../warframeUtils.js';

const lower = (value) => String(value ?? '').trim().toLocaleLowerCase();

function ownedMap(inventoryData) {
  const result = {};
  for (const item of inventoryData?.all ?? []) {
    if (!item?.unique_name) continue;
    const itemKey = item.unique_name.replace('/StoreItems/', '/');
    result[itemKey] = Math.max(result[itemKey] ?? 0, Number(item.quantity ?? (item.owned ? 1 : 0)) || 0);
    if (item.blueprint_unique_name) {
      const blueprintKey = item.blueprint_unique_name.replace('/StoreItems/', '/');
      result[blueprintKey] = Math.max(result[blueprintKey] ?? 0, Number(item.blueprint_quantity ?? 0) || 0);
    }
  }
  return result;
}

function recipeList(inventoryData, exportData, imageMaps) {
  const { EI = {}, nameToImage = {}, uniqueNameToName = {} } = imageMaps ?? {};
  const imageFor = (uniqueName, name, fallback = null) =>
    (!imageMaps ? fallback : EI[uniqueName] || resolveAnyImage({ uniqueName, name }, EI, nameToImage, uniqueNameToName) || fallback);
  const recipes = (inventoryData?.craftable ?? []).map((recipe) => ({
    ...recipe,
    itemType: recipe.itemType ?? recipe.resultType ?? recipe.uniqueName,
    blueprintKey: recipe.blueprintKey ?? recipe.uniqueName,
    blueprintName: recipe.blueprintName ?? recipe.bpName,
    image: recipe.image ?? imageFor(
      recipe.blueprintKey ?? recipe.uniqueName,
      recipe.blueprintName ?? recipe.bpName,
      imageFor(recipe.resultType ?? recipe.itemType, recipe.name),
    ),
    ingredients: recipe.ingredients ?? [],
  })).filter((recipe) => recipe.itemType);
  const byItemType = new Map(recipes.map((recipe) => [recipe.itemType, recipe]));
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const subIngredients = ingredient.subIngredients ?? [];
      if (!ingredient.itemType || !subIngredients.length || byItemType.has(ingredient.itemType)) continue;
      byItemType.set(ingredient.itemType, {
        itemType: ingredient.itemType,
        name: ingredient.name ?? ingredient.itemType,
        // A component (Neuroptics/Chassis/Systems...) is built from its own blueprint, which the player must
        // acquire first; by the parser's convention it is the same path with Component -> Blueprint.
        blueprintKey: ingredient.blueprintKey ?? String(ingredient.itemType).replace('Component', 'Blueprint'),
        blueprintName: `${ingredient.name ?? ingredient.itemType} Blueprint`,
        image: imageFor(
          ingredient.blueprintKey ?? String(ingredient.itemType).replace('Component', 'Blueprint'),
          `${ingredient.name ?? ingredient.itemType} Blueprint`,
          imageFor(ingredient.itemType, ingredient.name),
        ),
        outputQty: 1,
        ingredients: subIngredients.map((subIngredient) => ({
          ...subIngredient,
          itemType: subIngredient.itemType ?? subIngredient.ItemType,
          need: subIngredient.need ?? subIngredient.ItemCount,
        })),
      });
    }
  }
  const dict = exportData?.dict ?? {};
  for (const [key, recipe] of Object.entries(exportData?.ExportRecipes ?? {})) {
    if (!recipe?.resultType || byItemType.has(recipe.resultType)) continue;
    byItemType.set(recipe.resultType, {
      ...recipe,
      itemType: recipe.resultType,
      blueprintKey: key,
      blueprintName: dict[recipe.name] ?? dict[`/${recipe.name}`] ?? recipe.name,
      image: recipe.image ?? imageFor(key, dict[recipe.name] ?? dict[`/${recipe.name}`] ?? recipe.name),
      outputQty: recipe.outputQty ?? recipe.num ?? 1,
      ingredients: (recipe.ingredients ?? []).map((ingredient) => ({
        ...ingredient,
        itemType: ingredient.itemType ?? ingredient.ItemType,
        need: ingredient.need ?? ingredient.ItemCount,
      })),
    });
  }
  // A farmable raw material (Orokin Cell, Argon Crystal...) is a plain leaf even when DE also ships a Foundry
  // recipe for it (Orokin Cell has a 100 Platinum blueprint): expanding it would demand the blueprint plus
  // hundreds of thousands of Alloy Plate/Nano Spores/Salvage instead of the drops every player actually farms.
  // `...Component` results (Archwing/companion parts) are also in ExportResources but are genuinely crafted.
  const resources = exportData?.ExportResources ?? {};
  return [...byItemType.values()].filter((recipe) => !(resources[recipe.itemType] && !/Component$/.test(recipe.itemType)));
}

function sourceType(source) {
  if (source?.type === 'relic') return 'relic';
  if (source?.type === 'enemy') return 'enemy';
  if (source?.type === 'bounty') return 'bounty';
  if (source?.type === 'vendor') return 'vendor';
  if (source?.type === 'conclave') return 'conclave';
  return 'mission';
}

function sourceName(source) {
  const provenance = lower(source.source);
  const sourceIsProvenance = provenance === 'drops.wf' || provenance === 'browse.wf' || provenance.endsWith('.wf');
  return source.nodeName ?? source.node ?? source.relicName ?? source.enemyName ?? source.bountyName ??
    source.objectiveName ?? source.syndicateName ?? source.sourceName ?? source.place ?? source.keyName ??
    (sourceIsProvenance ? null : source.source) ?? source.name ?? null;
}

function regionEntries(regions) {
  if (Array.isArray(regions)) return regions;
  if (regions?.ExportRegions && Array.isArray(regions.ExportRegions)) return regions.ExportRegions;
  return Object.entries(regions ?? {}).flatMap(([key, value]) => value && typeof value === 'object' ? [{ ...value, uniqueName: value.uniqueName ?? key }] : []);
}

// One lookup Map built once per `regions` object instead of one full
// `.find()` scan over every region PER drop-index row (35k+ mission rows x
// 350+ regions on real data = ~12.6M comparisons, measured at ~5.6s -
// same performance-bug class relicSourceIndex below already fixed once for
// relics; this sibling lookup never got the same treatment). First region
// to claim a given lowercased candidate string wins, matching the original
// `.find()`'s first-match semantics.
const regionLookupCache = new WeakMap();
function regionLookup(regions, dict) {
  const cached = regionLookupCache.get(regions);
  if (cached) return cached;
  const map = new Map();
  for (const region of regionEntries(regions)) {
    for (const value of [region.uniqueName, region.name, dict[region.name], dict[`/${region.name}`]]) {
      if (!value) continue;
      const key = lower(value);
      if (!map.has(key)) map.set(key, region);
    }
  }
  regionLookupCache.set(regions, map);
  return map;
}

function regionForSource(source, regions, dict) {
  if (source?.type !== 'mission') return null;
  const lookup = regionLookup(regions, dict);
  for (const candidate of [source.node, source.nodeName, source.name]) {
    if (!candidate) continue;
    const region = lookup.get(lower(candidate));
    if (region) return region;
  }
  return null;
}

function sourcePlace(source, itemName, { dict = {}, regions = {} } = {}) {
  const name = sourceName(source);
  if (!name) return null;
  const type = sourceType(source);
  const isPlanet = type === 'planet';
  const rawMissionType = source.type === 'cache' || source.type === 'container' ? null : source.missionType;
  const missionType = rawMissionType ? resolveMissionType(rawMissionType, dict, regions) : null;
  const pvp = type === 'conclave' || /conclave/i.test(name) || /^(conclave|pvp)$/i.test(String(missionType ?? rawMissionType ?? ''));
  // regionForSource caches its lookup Map by `regions`' own object identity
  // (regionLookupCache), so this must be the stable object, not a freshly
  // built array per call - otherwise every call misses the cache.
  const region = regionForSource(source, regions, dict);
  const faction = region?.faction ? resolveNode(region.faction, dict, regions) : null;
  return {
    id: `${type}:${lower(name)}`,
    name,
    type: pvp ? 'conclave' : type,
    pvp,
    level: source.nodeName ? 'node' : isPlanet ? 'planet' : source.relicName ? 'source-only' : 'source-only',
    badge: source.nodeName ? 'exact node' : isPlanet ? 'planet-wide resource' : source.relicName ? 'source only' : 'source only',
    missionType: missionType || null,
    ...(faction ? { faction } : {}),
    planet: source.region ?? source.planet ?? null,
    itemName,
  };
}

export function buildPreviewPlaceIndex({ dropIndex = {}, wikiResourceIndex, wikiVendorIndex, dict = {}, regions } = {}) {
  const byItem = new Map();
  const places = new Map();
  const add = (item, source) => {
    if (!item || !source) return;
    const place = sourcePlace(source, item, { dict, regions });
    if (!place) return;
    if (!places.has(place.id)) places.set(place.id, place);
    const key = lower(item);
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key).push({
      placeId: place.id,
      item,
      chance: source.chance == null ? null : Number(source.chance),
      rotation: source.rotation ?? null,
      missionType: source.missionType ?? null,
      source: sourceName(source),
    });
  };
  for (const [itemType, sources] of Object.entries(dropIndex ?? {})) {
    if (itemType.startsWith('display:') || !Array.isArray(sources)) continue;
    for (const source of sources) add(source.itemName ?? source.item ?? source.displayName ?? itemType, source);
  }
  for (const [item, entry] of wikiResourceIndex instanceof Map ? wikiResourceIndex : []) {
    const planets = entry?.Planets ?? entry?.planets ?? [];
    for (const planet of Array.isArray(planets) ? planets : []) add(entry.Name ?? item, { type: 'planet', source: planet, name: planet });
  }
  for (const [item, entries] of wikiVendorIndex instanceof Map ? wikiVendorIndex : []) {
    for (const entry of Array.isArray(entries) ? entries : [entries]) add(entry.itemName ?? item, { type: 'vendor', source: entry.vendor ?? entry.name ?? 'Vendor' });
  }
  for (const sources of byItem.values()) sources.sort((a, b) => a.placeId.localeCompare(b.placeId));
  return { byItem, places };
}

function sourceRowsFor(placeIndex, coveredItems) {
  return coveredItems.map((item) => ({
    ...item,
    sources: sortSourcesByChanceInRotations(
      [...new Set([item.itemType, item.name].map(lower).filter(Boolean))]
        .flatMap((key) => placeIndex.byItem.get(key) ?? [])
        .filter((source) => source.placeId === item.placeId),
    ),
  }));
}

export function buildFarmingTargetsScreenModel({ targets = [], reservations = [], inventoryData, exportData, dropIndex, wikiResourceIndex, wikiVendorIndex, filters = {}, placeIndex, imageMaps } = {}) {
  const activeTargetIds = new Set(targets.filter((target) => target?.status !== 'archived' && target?.status !== 'complete').map((target) => target.id));
  const owned = ownedMap(inventoryData);
  const recipes = recipeList(inventoryData, exportData, imageMaps);
  const expanded = expandTargets(targets.map((target) => ({ ...target, itemType: target.itemType ?? target.uniqueName, isAcquirable: target.isAcquirable ?? true })), {
    recipes,
    owned,
  });
  const recipesByBlueprint = new Map(recipes.filter((recipe) => recipe.blueprintKey).map((recipe) => [recipe.blueprintKey.replace('/StoreItems/', '/'), recipe]));
  const { EI: leafEI = {}, nameToImage: leafNameToImage = {}, uniqueNameToName: leafUniqueNameToName = {} } = imageMaps ?? {};
  for (const [itemType, leaf] of expanded.leaves) {
    if (!leaf.image) leaf.image = recipesByBlueprint.get(itemType)?.image ?? null;
    // Raw ingredients of recipes built from ExportRecipes (every unowned blueprint) arrive with no image at all;
    // resolve them the same way recipes and blueprints are resolved above.
    if (!leaf.image && imageMaps) {
      leaf.image = leafEI[itemType]
        || resolveAnyImage({ uniqueName: itemType, name: leaf.name }, leafEI, leafNameToImage, leafUniqueNameToName)
        || null;
    }
  }
  const ledger = buildLedger({ leaves: expanded.leaves, owned, reservations: [
    ...(reservations ?? []).filter((reservation) => activeTargetIds.has(reservation?.targetId)),
    ...targets.filter((target) => activeTargetIds.has(target.id)).flatMap((target) => target.reservations ?? []),
  ] });
  const resolvedPlaceIndex = placeIndex ?? buildPreviewPlaceIndex({ dropIndex, wikiResourceIndex, wikiVendorIndex, dict: exportData?.dict ?? {}, regions: exportData?.ExportRegions });
  const rankingResult = rankPlaces({ ledger, placeIndex: resolvedPlaceIndex, filters });
  const relicPlaces = buildRelicPlaces({ ledger, inventoryData, exportData, dropIndex });
  const ranked = filters.tab === 'relics' ? relicPlaces : rankingResult.ranked;
  const rankedRows = ranked.map((row) => ({
    ...row,
    coveredItems: row.coveredItems.map((item) => ({ ...item, placeId: row.place.id })),
  })).map((row) => ({ ...row, coveredItems: sourceRowsFor(resolvedPlaceIndex, row.coveredItems) }));
  const relicRows = relicPlaces.map((row) => ({
    ...row,
    coveredItems: row.coveredItems.map((item) => ({ ...item, placeId: row.place.id })),
  }));
  return {
    ledger,
    ranked: filters.tab === 'relics' ? relicRows : rankedRows,
    relicPlaces: relicRows,
    conclaveOnlyItems: rankingResult.conclaveOnlyItems,
    excludedByMinChance: rankingResult.excludedByMinChance,
    unresolved: expanded.unresolved,
    targetUnresolved: expanded.unresolved.filter((entry) => targets.some((target) => String(target.id) === String(entry.targetId))),
    errors: expanded.errors,
    placeCount: resolvedPlaceIndex.places.size,
    placeIndex: resolvedPlaceIndex,
  };
}
