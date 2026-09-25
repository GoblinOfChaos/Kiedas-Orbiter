/** Pure adapter for the Preview Farming Targets screen. */
import { expandTargets } from './requirements.js';
import { buildLedger } from './ledger.js';
import { rankPlaces } from './farmNext.js';
import { sortSourcesByChanceInRotations } from '../chanceSort.js';
import { buildRelicPlaces } from './relicPlaces.js';

const lower = (value) => String(value ?? '').trim().toLocaleLowerCase();

function ownedMap(inventoryData) {
  const result = {};
  for (const item of inventoryData?.all ?? []) {
    if (item?.unique_name) result[item.unique_name] = Number(item.quantity ?? (item.owned ? 1 : 0)) || 0;
  }
  return result;
}

function recipeList(inventoryData) {
  const recipes = (inventoryData?.craftable ?? []).map((recipe) => ({
    ...recipe,
    itemType: recipe.itemType ?? recipe.resultType ?? recipe.uniqueName,
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
        outputQty: 1,
        ingredients: subIngredients.map((subIngredient) => ({
          ...subIngredient,
          itemType: subIngredient.itemType ?? subIngredient.ItemType,
          need: subIngredient.need ?? subIngredient.ItemCount,
        })),
      });
    }
  }
  return [...byItemType.values()];
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
    (sourceIsProvenance ? null : source.source) ?? source.name ?? 'Unknown source';
}

function sourcePlace(source, itemName) {
  const name = sourceName(source);
  const type = sourceType(source);
  const pvp = type === 'conclave' || /conclave/i.test(name);
  const isPlanet = type === 'planet';
  return {
    id: `${type}:${lower(name)}`,
    name,
    type: pvp ? 'conclave' : type,
    pvp,
    level: source.nodeName ? 'node' : isPlanet ? 'planet' : source.relicName ? 'source-only' : 'source-only',
    badge: source.nodeName ? 'exact node' : isPlanet ? 'planet-wide resource' : source.relicName ? 'source only' : 'source only',
    missionType: source.missionType ?? null,
    faction: source.faction ?? null,
    planet: source.region ?? source.planet ?? null,
    itemName,
  };
}

export function buildPreviewPlaceIndex({ dropIndex = {}, wikiResourceIndex, wikiVendorIndex } = {}) {
  const byItem = new Map();
  const places = new Map();
  const add = (item, source) => {
    if (!item || !source) return;
    const place = sourcePlace(source, item);
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

export function buildFarmingTargetsScreenModel({ targets = [], reservations = [], inventoryData, exportData, dropIndex, wikiResourceIndex, wikiVendorIndex, filters = {}, placeIndex } = {}) {
  const owned = ownedMap(inventoryData);
  const expanded = expandTargets(targets.map((target) => ({ ...target, itemType: target.itemType ?? target.uniqueName, isAcquirable: target.isAcquirable ?? true })), {
    recipes: recipeList(inventoryData),
    owned,
  });
  const ledger = buildLedger({ leaves: expanded.leaves, owned, reservations: [
    ...reservations,
    ...targets.flatMap((target) => target.reservations ?? []),
  ] });
  const resolvedPlaceIndex = placeIndex ?? buildPreviewPlaceIndex({ dropIndex, wikiResourceIndex, wikiVendorIndex });
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
    errors: expanded.errors,
    placeCount: resolvedPlaceIndex.places.size,
  };
}
