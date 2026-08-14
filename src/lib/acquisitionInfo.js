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
 * with an EMPTY ingredients list - DE's internal plumbing for finalizing
 * them after conversion, not a real Foundry build. The two genuine
 * blueprint-only weapon recipes (Braton and Lato) are admitted explicitly.
 * Without this check those internal entries were wrongly labeled "Built in
 * the Foundry" when the actual source is defeating a Kuva Lich / Sister of
 * Parvos, confirmed live by the user on Tenet Envoy. Build once per exportData
 * change and pass into getAcquisitionInfo, mirroring how dropIndex is built
 * once in MonitoringContext rather than per-call.
 */
export function buildRecipeResultIndex(exportData) {
  const index = new Map();
  const recipes = exportData?.ExportRecipes;
  if (!recipes || typeof recipes !== 'object') return index;

  // ExportRecipes only stores ingredient uniqueNames. Resolve those through
  // the same DE export/dict data used by the Foundry screen so the drawer can
  // say "2x Bolto" instead of exposing internal paths.
  const dict = exportData?.dict || {};
  const nameByUniqueName = new Map();
  for (const tableName of [
    'ExportWeapons', 'ExportWarframes', 'ExportSentinels', 'ExportResources',
    'ExportGear', 'ExportCustoms', 'ExportFlavour', 'ExportUpgrades',
  ]) {
    const table = exportData?.[tableName];
    if (!table || typeof table !== 'object') continue;
    for (const [uniqueName, entry] of Object.entries(table)) {
      if (!entry?.name) continue;
      const resolved = dict[entry.name] || entry.name;
      if (resolved && !String(resolved).startsWith('/')) {
        nameByUniqueName.set(canonicalPath(uniqueName), String(resolved).replace(/<[^>]*>/g, '').trim());
      }
    }
  }

  for (const [blueprintName, recipe] of Object.entries(recipes)) {
    // Braton and Lato are real blueprint-only Foundry recipes in the export.
    // Other zero-ingredient entries are DE's internal Lich/Tenet/Railjack
    // finalization plumbing and must not be presented as craftable weapons.
    const blueprintOnly = /\/(?:Braton|Lato)Blueprint$/.test(blueprintName);
    if (recipe?.resultType && Array.isArray(recipe.ingredients) && (recipe.ingredients.length > 0 || blueprintOnly)) {
      const ingredients = recipe.ingredients.map((ingredient) => {
        const itemType = canonicalPath(ingredient?.ItemType || ingredient?.itemType);
        return {
          itemType,
          count: ingredient?.ItemCount ?? ingredient?.itemCount ?? 1,
          name: nameByUniqueName.get(itemType) || itemType,
        };
      }).filter((ingredient) => ingredient.itemType);
      index.set(canonicalPath(recipe.resultType), {
        blueprintCost: recipe.creditsCost,
        buildCost: recipe.buildPrice,
        buildTime: recipe.buildTime,
        rushCost: recipe.skipBuildTimePrice,
        blueprintOnly,
        ingredients,
      });
    }
  }
  return index;
}

function formatCredits(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} Credits` : null;
}

function formatBuildTime(seconds) {
  const totalMinutes = Math.round(Number(seconds) / 60);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function formatRecipeAcquisition(recipe) {
  const details = ['Built in the Foundry from a blueprint.'];
  const blueprintCost = formatCredits(recipe?.blueprintCost);
  const buildCost = formatCredits(recipe?.buildCost);
  if (blueprintCost) details.push(`Blueprint: ${blueprintCost}.`);
  if (buildCost) details.push(`Build cost: ${buildCost}.`);
  const buildTime = formatBuildTime(recipe?.buildTime);
  if (buildTime) details.push(`Build time: ${buildTime}.`);
  if (recipe?.rushCost > 0) details.push(`Rush: ${recipe.rushCost} Platinum.`);

  const ingredientCounts = new Map();
  for (const ingredient of recipe?.ingredients || []) {
    const key = ingredient.itemType || ingredient.name;
    const current = ingredientCounts.get(key);
    if (current) current.count += Number(ingredient.count) || 1;
    else ingredientCounts.set(key, { name: ingredient.name, count: Number(ingredient.count) || 1 });
  }
  const ingredients = [...ingredientCounts.values()]
    .map(({ name, count }) => `${count}x ${name}`)
    .join(', ');
  if (ingredients) details.push(`Components: ${ingredients}.`);
  return details.join(' ');
}

/**
 * Maps an item's uniqueName to its real in-game Market price, for entries the
 * DE exports confirm are directly purchasable - i.e. NOT marked
 * excludeFromMarket and with a real platinumCost or creditsCost. ExportCustoms
 * contains the bulk of cosmetic entries, while the equipment tables cover
 * weapon/Warframe/Sentinel/Gear purchases. This deliberately excludes priced
 * bundle components, which are handled by buildBundleIndex instead.
 */
export function buildMarketIndex(exportData) {
  const index = new Map();
  for (const tableName of ['ExportCustoms', 'ExportFlavour', 'ExportWeapons', 'ExportWarframes', 'ExportSentinels', 'ExportGear']) {
    const table = exportData?.[tableName];
    if (!table || typeof table !== 'object') continue;
    for (const [uniqueName, entry] of Object.entries(table)) {
      if (!entry?.excludeFromMarket && entry?.platinumCost > 0) {
        index.set(canonicalPath(uniqueName), { amount: entry.platinumCost, currency: 'Platinum' });
      } else if (!entry?.excludeFromMarket && entry?.creditsCost > 0) {
        // Starter weapons use creditsCost for direct in-game purchases. A
        // recipe's blueprint credit cost is handled by the recipe branch
        // before this index is consulted.
        index.set(canonicalPath(uniqueName), { amount: entry.creditsCost, currency: 'Credits' });
      }
    }
  }
  return index;
}

/**
 * DE marks free/default customization entries with alwaysAvailable. Keep
 * these separate from Market prices so a zero-cost entry cannot be mistaken
 * for a missing price or a priced bundle component.
 */
export function buildAlwaysAvailableIndex(exportData) {
  const index = new Set();
  for (const tableName of ['ExportCustoms', 'ExportFlavour']) {
    const table = exportData?.[tableName];
    if (!table || typeof table !== 'object') continue;
    for (const [uniqueName, entry] of Object.entries(table)) {
      if (entry?.alwaysAvailable === true) index.add(canonicalPath(uniqueName));
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

function buildDisplayNameIndex(data, transform) {
  const index = new Map();
  if (!data || typeof data !== 'object') return index;
  for (const [name, value] of Object.entries(data)) {
    if (typeof name === 'string' && name.trim()) index.set(name.toLowerCase().trim(), transform(value));
  }
  return index;
}

export function buildWikiVendorIndex(data) {
  return buildDisplayNameIndex(data, (vendors) => Array.isArray(vendors) ? vendors.filter(Boolean) : []);
}

/**
 * ExportVendors is authoritative that an item is present in an in-game vendor
 * manifest, but its manifest key is an internal identifier rather than a
 * player-facing vendor name. Keep that distinction explicit: use this only
 * for a generic vendor-source fallback, never for fabricated vendor labels.
 */
export function buildExportVendorIndex(exportData) {
  const index = new Set();
  const vendors = exportData?.ExportVendors;
  if (!vendors || typeof vendors !== 'object') return index;
  for (const vendor of Object.values(vendors)) {
    for (const item of vendor?.items || []) {
      const key = canonicalPath(item?.storeItem);
      if (key) index.add(key);
    }
  }
  return index;
}

export function buildWikiTennoGenIndex(data) {
  return buildDisplayNameIndex(data, (entry) => entry && typeof entry === 'object' ? entry : null);
}

export function buildWikiBaroIndex(data) {
  return buildDisplayNameIndex(data, () => true);
}

export function getAcquisitionInfo(dropIndexKey, displayName, dropIndex, overridesData, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex) {
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

  const recipe = recipeResultIndex?.get(canonicalPath(dropIndexKey));
  if (recipe || isCraftable(dropIndexKey)) {
    return {
      sources: [{
        type: 'non-drop',
        text: recipe
          ? formatRecipeAcquisition(recipe)
          : 'Built in the Foundry from a blueprint and its components - see the Foundry tab for the recipe.',
      }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const marketPrice = marketIndex?.get(canonicalPath(dropIndexKey));
  if (marketPrice) {
    const amount = typeof marketPrice === 'number' ? marketPrice : marketPrice.amount;
    const currency = typeof marketPrice === 'number' ? 'Platinum' : marketPrice.currency;
    return {
      sources: [{ type: 'non-drop', text: `Sold in the in-game Market for ${Number(amount).toLocaleString()} ${currency}.` }],
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

  const vendors = wikiVendorIndex?.get(displayLower);
  if (vendors?.length) {
    return {
      sources: [{ type: 'non-drop', text: `Sold by ${vendors.join(' and ')}.` }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  if (exportVendorIndex?.has(canonicalPath(dropIndexKey))) {
    return {
      sources: [{ type: 'non-drop', text: 'Available from an in-game vendor.' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  if (alwaysAvailableIndex?.has(canonicalPath(dropIndexKey))) {
    return {
      sources: [{ type: 'non-drop', text: 'Available directly in the in-game customization menu.' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const tennoGen = wikiTennoGenIndex?.get(displayLower);
  if (tennoGen) {
    const price = tennoGen.pcPrice || tennoGen.consolePrice;
    const priceText = price ? ` for ${price}` : '';
    return {
      sources: [{ type: 'non-drop', text: `TennoGen skin - purchased via Steam Workshop/console store${priceText}.` }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  if (wikiBaroIndex?.has(displayLower)) {
    return {
      sources: [{ type: 'non-drop', text: "Sold by Baro Ki'Teer." }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  return { sources: [], wikiLink: getWikiLink(dropIndexKey, displayName) };
}
