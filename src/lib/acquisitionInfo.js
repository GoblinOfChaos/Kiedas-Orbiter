import { getItemDrops, getWikiLink, isCraftable } from './acquisitionData';

/**
 * Shared "how do I get this" lookup, reused across Mods/Rivens/Inventory.
 *
 * Priority order (see docs/superpowers/specs/2026-08-09-acquisition-info-drawer-design.md):
 *   1. warframe-items' drop data (richest, auto-maintained)
 *   2. hand-curated override JSON (quest/clan-research items with no drop-table entry)
 *   3. existing dropIndex (drop-table entries not yet covered by warframe-items,
 *      e.g. this app's own relic-reward parsing)
 * Always returns a wikiLink as a final fallback - the drawer never shows
 * nothing, per the "should still have a drawer, just have the wiki link"
 * design decision.
 *
 * dropIndexKey and displayName are often the same value (an item's display
 * name) but kept separate since components use a "Weapon|Component"
 * override key distinct from either. getItemDrops/getWikiLink read from
 * acquisitionData.js's in-memory cache, so callers must have already
 * awaited loadAcquisitionData() at least once (typically in their screen's
 * mount effect) before this returns real warframe-items data.
 */
// Path patterns that definitionally aren't drop-table acquisitions - safe to
// label without guessing. Items acquired via Market purchase, syndicate
// rank, or event reward are too heterogeneous to classify from the
// uniqueName alone (mislabeling those would give wrong guidance), so most
// Skins/Sigils/Misc still fall through to the generic fallback - except
// the subset that isCraftable() below catches via a real Foundry recipe.
const NON_DROP_PATTERNS = [
  { test: (un) => un?.includes('/Upgrades/Focus/'), text: 'Unlocked via the Focus tree, not obtained from a drop.' },
  { test: (un) => /\/Types\/Keys\/.*KeyChain$/.test(un || ''), text: 'Awarded from completing this quest.' },
];

const canonicalPath = (v) => v?.replace('/StoreItems/', '/') || v;

/**
 * Maps a craftable equipment's own uniqueName (the finished Warframe/weapon)
 * to true if ExportRecipes has a blueprint whose resultType builds it AND
 * that blueprint has real ingredients - e.g. most base Warframes/weapons
 * aren't themselves "dropped", only their blueprint + component parts are
 * (which are separately tracked items with their own acquisition entries).
 * Requiring ingredients.length > 0 matters: Kuva/Tenet Lich weapons and
 * Railjack ship-feature items also have a resultType entry in ExportRecipes
 * with an EMPTY ingredients list (confirmed: 50 such entries, all either
 * Lich/Sister weapons or Railjack features) - DE's internal plumbing for
 * finalizing them after conversion, not a real Foundry build. Without this
 * check those were wrongly labeled "Built in the Foundry" when the actual
 * source is defeating a Kuva Lich / Sister of Parvos, confirmed live by the
 * user on Tenet Envoy. Build once per exportData change and pass into
 * getAcquisitionInfo, mirroring how dropIndex is built once in
 * MonitoringContext rather than per-call.
 */
export function buildRecipeResultIndex(exportData) {
  const index = new Set();
  const recipes = exportData?.ExportRecipes;
  if (!recipes || typeof recipes !== 'object') return index;
  for (const recipe of Object.values(recipes)) {
    if (recipe?.resultType && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
      index.add(canonicalPath(recipe.resultType));
    }
  }
  return index;
}

/**
 * Maps a cosmetic's uniqueName to its real Platinum price, for items
 * ExportCustoms confirms are actually sold in the in-game Market - i.e. NOT
 * marked excludeFromMarket and with a real platinumCost. excludeFromMarket
 * is only ever present as `true` in the export (never `false`); its absence
 * plus a real platinumCost is what marks an item as genuinely purchasable
 * (confirmed by checking the full export: 1,933 items have a platinumCost
 * but are excludeFromMarket:true - bundle sub-components, not directly
 * buyable - vs 1,405 with no excludeFromMarket key and a real price).
 */
export function buildMarketIndex(exportData) {
  const index = new Map();
  const customs = exportData?.ExportCustoms;
  if (!customs || typeof customs !== 'object') return index;
  for (const [uniqueName, entry] of Object.entries(customs)) {
    if (!entry?.excludeFromMarket && entry?.platinumCost > 0) {
      index.set(canonicalPath(uniqueName), entry.platinumCost);
    }
  }
  return index;
}

/**
 * Maps a cosmetic's uniqueName to the display name of a Market bundle it's
 * sold in - ExportBundles.json (already fetched for other purposes, never
 * inspected for this) lists each bundle's components[].typeName. Bundle
 * display names are dict-lookup keys, resolved via exportData.dict (same
 * pattern used by relicParser.js/dropsParser.js). Only the first bundle a
 * component appears in is kept - good enough for "here's where to get it",
 * doesn't need to be exhaustive.
 */
export function buildBundleIndex(exportData) {
  const index = new Map();
  const bundles = exportData?.ExportBundles;
  const dict = exportData?.dict || {};
  if (!bundles || typeof bundles !== 'object') return index;
  for (const bundle of Object.values(bundles)) {
    if (!Array.isArray(bundle?.components)) continue;
    const bundleName = dict[bundle.name] || bundle.name;
    if (!bundleName) continue;
    for (const component of bundle.components) {
      const key = canonicalPath(component?.typeName);
      if (key && !index.has(key)) index.set(key, bundleName);
    }
  }
  return index;
}

/**
 * Maps an item's uniqueName to its syndicate rank offering - ExportSyndicates
 * .json (already fetched, never inspected for this) has a favours[] array
 * per syndicate with real storeItem/standingCost/requiredLevel/rankUpReward
 * fields. rankUpReward:true means auto-granted on reaching that rank (e.g.
 * the Cavia "Assistant/Scholar/Researcher" title sigils - previously
 * believed to have no available source anywhere); rankUpReward:false means
 * a standing-cost offering, some not covered by DropsAll.syndicates (e.g.
 * smaller event syndicates like RadioLegion tiers). Syndicate display names
 * are dict-lookup keys, resolved via exportData.dict.
 */
export function buildSyndicateIndex(exportData) {
  const index = new Map();
  const syndicates = exportData?.ExportSyndicates;
  const dict = exportData?.dict || {};
  if (!syndicates || typeof syndicates !== 'object') return index;
  for (const syndicate of Object.values(syndicates)) {
    if (!Array.isArray(syndicate?.favours)) continue;
    const syndicateName = dict[syndicate.name] || syndicate.name;
    if (!syndicateName) continue;
    for (const favour of syndicate.favours) {
      const key = canonicalPath(favour?.storeItem);
      if (!key || index.has(key)) continue;
      index.set(key, {
        syndicateName,
        level: favour.requiredLevel,
        rankUp: !!favour.rankUpReward,
        standingCost: favour.standingCost,
      });
    }
  }
  return index;
}

/**
 * Maps a Sigil display name to the curated category from the wiki's
 * Module:Sigils/data export. The generated asset is keyed by display name
 * because that is the key used by the source module.
 */
export function buildWikiSigilIndex(data) {
  const index = new Map();
  if (!data || typeof data !== 'object') return index;
  for (const [name, category] of Object.entries(data)) {
    if (typeof name === 'string' && typeof category === 'string' && category.trim()) {
      index.set(name.toLowerCase().trim(), category.trim());
    }
  }
  return index;
}

export function getAcquisitionInfo(dropIndexKey, displayName, dropIndex, overridesData, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex) {
  const itemDrops = getItemDrops(dropIndexKey);
  if (itemDrops) {
    return { sources: itemDrops, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const overrideText = overridesData?.mods?.[displayName] ?? overridesData?.components?.[dropIndexKey];
  if (overrideText) {
    return { sources: [{ type: 'override', text: overrideText }], wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const norm = dropIndexKey?.replace('/StoreItems/', '/');
  const displayLower = displayName?.toLowerCase().trim();
  const displayKeys = displayLower ? [
    'display:' + displayLower,
    ...(displayLower.endsWith(' relic') ? ['display:' + displayLower.slice(0, -6)] : []),
  ] : [];
  // Sources can exist under a real quality-specific DE path and under the
  // synthetic display key used by the relic cards. Merge all keys so a
  // partial exact match cannot hide mission sources in the fallback key.
  const sourceKeys = [norm, dropIndexKey, ...displayKeys].filter(Boolean);
  const dropSources = [];
  const seenSources = new Set();
  for (const key of sourceKeys) {
    for (const source of dropIndex?.[key] || []) {
      const signature = JSON.stringify(source);
      if (!seenSources.has(signature)) {
        seenSources.add(signature);
        dropSources.push(source);
      }
    }
  }
  if (dropSources && dropSources.length > 0) {
    return { sources: dropSources, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const nonDrop = NON_DROP_PATTERNS.find((p) => p.test(dropIndexKey));
  if (nonDrop) {
    return { sources: [{ type: 'non-drop', text: nonDrop.text }], wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  if (recipeResultIndex?.has(canonicalPath(dropIndexKey)) || isCraftable(dropIndexKey)) {
    return {
      sources: [{ type: 'non-drop', text: 'Built in the Foundry from a blueprint and its components - see the Foundry tab for the recipe.' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const marketPrice = marketIndex?.get(canonicalPath(dropIndexKey));
  if (marketPrice) {
    return {
      sources: [{ type: 'non-drop', text: `Sold in the in-game Market for ${marketPrice} Platinum.` }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const bundleName = bundleIndex?.get(canonicalPath(dropIndexKey));
  if (bundleName) {
    return {
      sources: [{ type: 'non-drop', text: `Sold as part of the "${bundleName}" Market bundle.` }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const favour = syndicateIndex?.get(canonicalPath(dropIndexKey));
  if (favour) {
    // rankUpReward doesn't mean "free" - 1,393 of 1,412 rankUpReward:true
    // entries still have a real standingCost (confirmed against the full
    // export), so it only means "unlocked for purchase at this rank", same
    // as rankUpReward:false. Base the wording on the actual cost instead.
    const text = favour.standingCost > 0
      ? `Sold by ${favour.syndicateName} at Rank ${favour.level}+ for ${favour.standingCost} standing.`
      : `Unlocked at Rank ${favour.level} with ${favour.syndicateName}.`;
    return { sources: [{ type: 'non-drop', text }], wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const wikiSigilCategory = wikiSigilIndex?.get(displayLower);
  if (wikiSigilCategory) {
    return {
      sources: [{ type: 'non-drop', text: `Listed under ${wikiSigilCategory} on the Warframe wiki.` }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  return { sources: [], wikiLink: getWikiLink(dropIndexKey, displayName) };
}
