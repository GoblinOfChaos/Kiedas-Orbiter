/** Pure adapter for the Preview Farming Targets screen. */
import { expandTargets } from './requirements.js';
import { buildLedger } from './ledger.js';
import { rankPlaces } from './farmNext.js';
import { sortSourcesByChanceInRotations } from '../chanceSort.js';
import { buildRelicPlaces } from './relicPlaces.js';
import { resolveAnyImage, resolveMissionType, resolveNode } from '../warframeUtils.js';
import { sourceLabel } from '../sourceLabel.js';

const CACHE_LIMIT = 8192;

function cacheSet(cache, key, value) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, value);
}

const lower = (value, normalizer) => {
  if (!normalizer) return String(value ?? '').trim().toLowerCase();
  normalizer.normalize_calls += 1;
  const raw = String(value ?? '').trim();
  if (normalizer.lowerCache.has(raw)) {
    normalizer.cache_hits += 1;
    return normalizer.lowerCache.get(raw);
  }
  const result = raw.toLowerCase();
  cacheSet(normalizer.lowerCache, raw, result);
  return result;
};

const vendorKey = (value, normalizer) => {
  if (!normalizer) return lower(value).replaceAll('’', "'").replace(/\s+/g, ' ');
  normalizer.normalize_calls += 1;
  const raw = String(value ?? '').trim();
  if (normalizer.vendorCache.has(raw)) {
    normalizer.cache_hits += 1;
    return normalizer.vendorCache.get(raw);
  }
  const result = lower(raw, normalizer).replaceAll('’', "'").replace(/\s+/g, ' ');
  cacheSet(normalizer.vendorCache, raw, result);
  return result;
};

function createNormalizer() {
  return { lowerCache: new Map(), vendorCache: new Map(), normalize_calls: 0, cache_hits: 0 };
}

const compareText = (a, b) => {
  const left = String(a ?? '');
  const right = String(b ?? '');
  return left < right ? -1 : left > right ? 1 : 0;
};

const canonicalPath = (value) => typeof value === 'string' ? value.replaceAll('/StoreItems/', '/') : value;

function resolvedExportName(value, dict) {
  const resolved = dict?.[value] ?? dict?.[`/${value}`] ?? value;
  return typeof resolved === 'string' ? resolved.trim() : '';
}

function exportItemNames(exportData, dict) {
  const names = new Map();
  for (const tableName of ['ExportResources', 'ExportMisc', 'ExportGear', 'ExportCustoms', 'ExportUpgrades', 'ExportWeapons', 'ExportWarframes', 'ExportSentinels', 'ExportFlavour']) {
    for (const [uniqueName, entry] of Object.entries(exportData?.[tableName] ?? {})) {
      const name = resolvedExportName(entry?.name, dict);
      if (name && !name.startsWith('/')) names.set(canonicalPath(uniqueName), name);
    }
  }
  return names;
}

function routeVendorName(route) {
  const match = typeof route?.text === 'string' ? route.text.match(/^Listed by (.+?)(?:\.|$)/i) : null;
  return match?.[1]?.trim() || null;
}

function routePrice(route) {
  const match = typeof route?.text === 'string'
    ? route.text.match(/\bPrice listed in the export:\s*(.+?)(?:\.|$)/i)
    : null;
  return match?.[1]?.trim() || null;
}

export function parseMarketPurchaseText(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/\b(?:bought|buy|purchas(?:e|ed|able)|sold|available)\b[\s\S]{0,100}\b(?:the\s+)?(?:in-game\s+)?Market\b[\s\S]{0,50}\bfor\s+([\d,]+)\s+(Platinum|Credits)\b/i);
  if (!match) return null;
  const amount = Number(match[1].replaceAll(',', ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, currency: match[2], label: `${amount.toLocaleString('en-US')} ${match[2]}` };
}

function canonicalVendorName(value, wikiVendors, normalizer, cache) {
  const name = String(value ?? '').trim();
  if (!name) return null;
  if (cache.has(name)) return cache.get(name);
  const nameKey = vendorKey(name, normalizer);
  const exact = wikiVendors.find((candidate) => candidate.key === nameKey);
  if (exact) {
    cacheSet(cache, name, exact.name);
    return exact.name;
  }
  const prefixAliases = wikiVendors.filter((candidate) => nameKey.startsWith(`${candidate.key} `));
  if (prefixAliases.length === 1) {
    cacheSet(cache, name, prefixAliases[0].name);
    return prefixAliases[0].name;
  }
  const aliases = wikiVendors.filter((candidate) => {
    const candidateKey = candidate.key;
    return nameKey.startsWith(`${candidateKey} in `)
      || nameKey.startsWith(`${candidateKey}'s `)
      || nameKey.startsWith(`${candidateKey} (`)
      || nameKey.startsWith(`${candidateKey} - `);
  });
  if (aliases.length === 1) {
    cacheSet(cache, name, aliases[0].name);
    return aliases[0].name;
  }
  const searchableName = ` ${nameKey.replace(/[^a-z0-9]+/g, ' ').trim()} `;
  const contained = wikiVendors.filter((candidate) => {
    return searchableName.includes(candidate.searchable);
  });
  const result = contained.length === 1 ? contained[0].name : name;
  cacheSet(cache, name, result);
  return result;
}

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

export function sourceType(source) {
  if (source?.type === 'relic') return 'relic';
  if (source?.type === 'enemy') return 'enemy';
  if (source?.type === 'bounty') return 'bounty';
  if (source?.type === 'syndicate') return 'vendor';
  if (source?.type === 'vendor') return 'vendor';
  if (source?.type === 'conclave') return 'conclave';
  return 'mission';
}

function sourceName(source, normalizer) {
  return sourceLabel(source, { includeRegion: false, includeRotation: false, includeRarity: false }) || null;
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
function regionLookup(regions, dict, normalizer) {
  const cached = regionLookupCache.get(regions);
  if (cached) return cached;
  const map = new Map();
  for (const region of regionEntries(regions)) {
    for (const value of [region.uniqueName, region.name, dict[region.name], dict[`/${region.name}`]]) {
      if (!value) continue;
      const key = lower(value, normalizer);
      if (!map.has(key)) map.set(key, region);
    }
  }
  regionLookupCache.set(regions, map);
  return map;
}

function regionForSource(source, regions, dict, normalizer) {
  if (source?.type !== 'mission') return null;
  const lookup = regionLookup(regions, dict, normalizer);
  for (const candidate of [source.node, source.nodeName, source.name]) {
    if (!candidate) continue;
    const region = lookup.get(lower(candidate, normalizer));
    if (region) return region;
  }
  return null;
}

function resolvedNodeLiteral(value, dict, regions) {
  if (!value) return null;
  const resolved = resolveNode(String(value), dict, regions);
  if (resolved && resolved !== 'Unknown Node' && !String(resolved).startsWith('/')) return resolved;
  const literal = String(value).trim();
  return literal && !literal.startsWith('/') ? literal : null;
}

function sourceKind(source, type, name, isNode) {
  if (isNode) return 'node';
  if (type === 'enemy') return 'enemy';
  if (type === 'relic') return 'relic';
  if (type === 'vendor') return 'vendor';
  if (/cache/i.test(`${name} ${source?.missionType ?? ''}`)) return 'cache';
  if (source?.type === 'avatar') return 'boss';
  if (type === 'mission') return 'event';
  return 'source-only';
}

export function sourcePlace(source, itemName, { dict = {}, regions = {}, normalizer, enemyAreas } = {}) {
  const name = sourceName(source, normalizer);
  if (!name) return null;
  const type = sourceType(source);
  const isPlanet = type === 'planet';
  const rawMissionType = source.type === 'cache' || source.type === 'container' ? null : source.missionType;
  const missionType = rawMissionType ? resolveMissionType(rawMissionType, dict, regions) : null;
  const pvp = type === 'conclave' || /conclave/i.test(name) || /^(conclave|pvp)$/i.test(String(missionType ?? rawMissionType ?? ''));
  // regionForSource caches its lookup Map by `regions`' own object identity
  // (regionLookupCache), so this must be the stable object, not a freshly
  // built array per call - otherwise every call misses the cache.
  const region = regionForSource(source, regions, dict, normalizer);
  const isNode = type === 'mission' && Boolean(source.nodeName || source.node || region);
  const kind = sourceKind(source, type, name, isNode);
  const faction = region?.faction ? resolveNode(region.faction, dict, regions) : null;
  const planet = isNode
    ? resolvedNodeLiteral(source.region ?? source.planet ?? region?.systemName, dict, regions)
    : null;
  // Enemy sources carry no location in the drop tables; the wiki area is attached only when the
  // enemy's name matches exactly and at least one of its planets or nodes is a DE region.
  const enemyArea = type === 'enemy' && enemyAreas instanceof Map ? enemyAreas.get(lower(name, normalizer)) : null;
  return {
    id: `${type}:${type === 'vendor' ? vendorKey(name, normalizer) : lower(name, normalizer)}`,
    name,
    type: pvp ? 'conclave' : type,
    pvp,
    level: isNode ? 'node' : isPlanet ? 'planet' : enemyArea ? 'wiki-area' : kind,
    kind,
    badge: isNode ? 'exact node' : isPlanet ? 'planet-wide resource' : enemyArea ? 'wiki-listed area' : kind,
    missionType: missionType || null,
    ...(faction ? { faction } : {}),
    ...(enemyArea ? { area: { faction: enemyArea.faction, planets: enemyArea.planets, nodes: enemyArea.nodes } } : {}),
    planet,
    itemName,
  };
}

export function buildPreviewPlaceIndex({ dropIndex = {}, wikiResourceIndex, wikiVendorIndex, exportVendorIndex, marketIndex, acquisitionOverrides, exportData, dict = {}, regions, enemyAreas } = {}) {
  const byItem = new Map();
  const places = new Map();
  const normalizer = createNormalizer();
  const exportNames = exportItemNames(exportData, dict);
  const wikiVendorNames = [...new Set(
    wikiVendorIndex instanceof Map
      ? [...wikiVendorIndex.values()].flatMap((entries) => Array.isArray(entries) ? entries : [entries]).filter((entry) => typeof entry === 'string')
      : [],
  )];
  const wikiVendors = wikiVendorNames.map((name) => {
    const key = vendorKey(name, normalizer);
    return { name, key, searchable: ` ${key.replace(/[^a-z0-9]+/g, ' ').trim()} ` };
  });
  const vendorNameCache = new Map();
  const exportNamesByKey = new Map();
  const nameKey = (value) => vendorKey(value, normalizer).replace(/\s*(?:\|\s*)?blueprint$/i, '');
  for (const name of exportNames.values()) {
    const key = nameKey(name);
    if (!exportNamesByKey.has(key)) exportNamesByKey.set(key, name);
  }
  const itemNameForKey = (value) => {
    const canonical = canonicalPath(value);
    if (exportNames.has(canonical)) return exportNames.get(canonical);
    const key = nameKey(value);
    return exportNamesByKey.get(key) || null;
  };
  const normalizeVendorSource = (source) => {
    if (source?.type !== 'syndicate') return source;
    const vendor = canonicalVendorName(source.syndicateName, wikiVendors, normalizer, vendorNameCache);
    return {
      ...source,
      type: 'vendor',
      source: vendor,
      vendor,
      price: source.price || (source.standing != null ? `${Number(source.standing).toLocaleString('en-US')} Standing` : undefined),
    };
  };
  const add = (item, source) => {
    if (!item || !source) return;
    const normalizedSource = normalizeVendorSource(source);
    const canonicalItem = itemNameForKey(item) || item;
    const place = sourcePlace(normalizedSource, canonicalItem, { dict, regions, normalizer, enemyAreas });
    if (!place) return;
    if (!places.has(place.id)) places.set(place.id, place);
    const key = lower(canonicalItem, normalizer);
    if (!byItem.has(key)) byItem.set(key, []);
    const row = {
      placeId: place.id,
      item: canonicalItem,
      chance: normalizedSource.chance == null ? null : Number(normalizedSource.chance),
      rotation: normalizedSource.rotation ?? null,
      missionType: normalizedSource.missionType ?? null,
      source: sourceName(normalizedSource, normalizer),
      ...(normalizedSource.vendor ? { vendor: normalizedSource.vendor } : {}),
      ...(normalizedSource.price ? { price: normalizedSource.price } : {}),
      ...(normalizedSource.text ? { text: normalizedSource.text } : {}),
      ...(normalizedSource.provenance ? { provenance: normalizedSource.provenance } : {}),
    };
    const existing = normalizedSource.type === 'vendor'
      ? byItem.get(key).find((entry) => entry.placeId === row.placeId && entry.item === row.item)
      : null;
    if (!existing) byItem.get(key).push(row);
    else {
      if (!existing.vendor && row.vendor) existing.vendor = row.vendor;
      if (!existing.price && row.price) existing.price = row.price;
      if (!existing.text && row.text) existing.text = row.text;
      if (!existing.provenance && row.provenance) existing.provenance = row.provenance;
    }
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
    for (const vendor of Array.isArray(entries) ? entries : [entries]) {
      if (typeof vendor !== 'string' || !vendor.trim()) continue;
      const name = canonicalVendorName(vendor, wikiVendors, normalizer, vendorNameCache);
      add(item, { type: 'vendor', source: name, vendor: name });
    }
  }
  for (const [itemType, routes] of exportVendorIndex instanceof Map ? exportVendorIndex : []) {
    const item = exportNames.get(canonicalPath(itemType));
    if (!item) continue;
    for (const route of Array.isArray(routes) ? routes : [routes]) {
      const rawVendor = routeVendorName(route);
      if (!rawVendor) continue;
      const vendor = canonicalVendorName(rawVendor, wikiVendors, normalizer, vendorNameCache);
      add(item, {
        type: 'vendor',
        source: vendor,
        vendor,
        price: routePrice(route),
        text: route.text,
        provenance: route.source,
      });
    }
  }
  for (const [itemType, market] of marketIndex instanceof Map ? marketIndex : []) {
    const item = itemNameForKey(itemType);
    const amount = Number(market?.amount);
    const currency = market?.currency || 'Platinum';
    if (!item || !Number.isFinite(amount) || amount <= 0 || !/^(?:Platinum|Credits)$/i.test(currency)) continue;
    add(item, {
      type: 'vendor',
      source: 'Market',
      vendor: 'Market',
      price: `${amount.toLocaleString('en-US')} ${currency}`,
      text: `Purchased from the Market for ${amount.toLocaleString('en-US')} ${currency}.`,
      provenance: 'DE export Market index',
    });
  }
  const overrideGroups = [acquisitionOverrides?.components, acquisitionOverrides?.mods];
  for (const group of overrideGroups) {
    for (const [key, text] of Object.entries(group ?? {})) {
      const item = itemNameForKey(key);
      const price = parseMarketPurchaseText(text);
      if (!item || !price) continue;
      add(item, {
        type: 'vendor',
        source: 'Market',
        vendor: 'Market',
        price: price.label,
        text,
        provenance: 'verified acquisition override',
      });
    }
  }
  for (const sources of byItem.values()) sources.sort((a, b) => compareText(a.placeId, b.placeId));
  const result = { byItem, places };
  Object.defineProperty(result, 'stats', { value: { normalize_calls: normalizer.normalize_calls, cache_hits: normalizer.cache_hits }, enumerable: false });
  return result;
}

function sourceRowsFor(placeIndex, coveredItems) {
  return coveredItems.map((item) => ({
    ...item,
    sources: sortSourcesByChanceInRotations(
      [...new Set([
        item.itemType,
        item.name,
        item.name && /blueprint$/i.test(String(item.itemType ?? '')) ? `${item.name} Blueprint` : null,
      ].map((value) => lower(value)).filter(Boolean))]
        .flatMap((key) => placeIndex.byItem.get(key) ?? [])
        .filter((source) => source.placeId === item.placeId),
    ),
  }));
}

export function buildFarmingTargetsScreenModel({ targets = [], reservations = [], inventoryData, exportData, dropIndex, wikiResourceIndex, wikiVendorIndex, exportVendorIndex, marketIndex, acquisitionOverrides, filters = {}, placeIndex, imageMaps } = {}) {
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
  const resolvedPlaceIndex = placeIndex ?? buildPreviewPlaceIndex({ dropIndex, wikiResourceIndex, wikiVendorIndex, exportVendorIndex, marketIndex, acquisitionOverrides, exportData, dict: exportData?.dict ?? {}, regions: exportData?.ExportRegions });
  const rankingResult = rankPlaces({ ledger, placeIndex: resolvedPlaceIndex, filters });
  const relicPlaces = buildRelicPlaces({ ledger, inventoryData, exportData, dropIndex });
  const tabResultCounts = {
    all: rankPlaces({ ledger, placeIndex: resolvedPlaceIndex, filters: { ...filters, tab: 'all' } }).ranked.length,
    missions: rankPlaces({ ledger, placeIndex: resolvedPlaceIndex, filters: { ...filters, tab: 'missions' } }).ranked.length,
    enemies: rankPlaces({ ledger, placeIndex: resolvedPlaceIndex, filters: { ...filters, tab: 'enemies' } }).ranked.length,
    planets: rankPlaces({ ledger, placeIndex: resolvedPlaceIndex, filters: { ...filters, tab: 'planets' } }).ranked.length,
    relics: relicPlaces.length,
    vendors: rankPlaces({ ledger, placeIndex: resolvedPlaceIndex, filters: { ...filters, tab: 'vendors' } }).ranked.length,
    conclave: rankPlaces({ ledger, placeIndex: resolvedPlaceIndex, filters: { ...filters, tab: 'conclave' } }).ranked.length,
  };
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
    tabResultCounts,
    placeIndex: resolvedPlaceIndex,
  };
}

export function availableSourceTabs(tabResultCounts = {}, activeTab) {
  return ['missions', 'enemies', 'planets', 'relics', 'vendors', 'conclave']
    .filter((tab) => tab !== activeTab && Number(tabResultCounts[tab]) > 0)
    .map((tab) => ({ tab, count: Number(tabResultCounts[tab]) }));
}
