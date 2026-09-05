/**
 * Logic for mapping Relic unique names (from logs) to game data and inventory context.
 */
import { BLUEPRINT_SUFFIX } from './warframeUtils';
import { BARO_RELIC_NAMES } from './baroRelics';
import { REQUIEM_MOD_ALIASES } from './requiemModAliases';

const allRelicRewardsCache = new WeakMap();
const relicCatalogCache = new WeakMap();
const exportMapCache = new WeakMap();
const recipeIndexCache = new WeakMap();

function getRecipeIndexes(exportData, locale = "en") {
  if (!exportData || !exportData.ExportRecipes) {
    return { bpLookup: {}, ingredientIndex: new Map() };
  }
  if (recipeIndexCache.has(exportData)) return recipeIndexCache.get(exportData);

  const bpLookup = {};
  const ingredientIndex = new Map();
  const clean = (s) => s ? s.replace("/StoreItems/", "/").toLowerCase() : "";

  for (const [bpUniqueName, bpRecipe] of Object.entries(exportData.ExportRecipes)) {
    if (bpRecipe.resultType) {
      bpLookup[bpRecipe.resultType] = bpUniqueName;
      bpLookup[clean(bpRecipe.resultType)] = bpUniqueName;
    }
    for (const ing of (bpRecipe.ingredients || [])) {
      if (ing.ItemType) {
        ingredientIndex.set(clean(ing.ItemType), {
          bpRecipe,
          bpUniqueName,
          itemCount: ing.ItemCount ?? 1
        });
      }
    }
  }

  const indexes = { bpLookup, ingredientIndex };
  recipeIndexCache.set(exportData, indexes);
  return indexes;
}


function getExportMaps(exportData) {
  if (!exportData) return { relics: {}, rewards: {} };
  if (exportMapCache.has(exportData)) return exportMapCache.get(exportData);

  const toMap = (data) => {
    if (!data) return {};
    if (!Array.isArray(data)) return data;
    const map = {};
    for (const item of data) {
      const k = item.uniqueName || item.ItemType || item.name || item.rewardManifest;
      if (k) map[k] = item;
    }
    return map;
  };

  const maps = {
    relics: toMap(exportData.ExportRelics),
    rewards: toMap(exportData.ExportRewards)
  };
  exportMapCache.set(exportData, maps);
  return maps;
}




// Helper: split PascalCase to spaced words
function splitPascal(str) {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

// Clean name - strip HTML tags
function cleanName(name) {
  if (!name) return '';
  return name.replace(/<[^>]*>/g, '').trim();
}

// DE's relic export normally represents vault state with a `vaultedAt`
// timestamp rather than a boolean. A future timestamp means the relic is
// still available; no timestamp means DE has not scheduled a vault for it.
function getRelicVaultedStatus(entry, relicKey) {
  // DE's export carries no vault metadata at all for Baro-exclusive relics
  // (sold directly, never in the mission drop pool) - they're always vaulted.
  if (BARO_RELIC_NAMES.includes(relicKey)) return true;
  if (typeof entry?.vaulted === 'boolean') return entry.vaulted;
  if (typeof entry?.isVaulted === 'boolean') return entry.isVaulted;
  if (Number.isFinite(entry?.vaultedAt)) {
    return entry.vaultedAt <= Math.floor(Date.now() / 1000);
  }
  return false;
}

/**
 * Resolve display name from uniqueName using exportData tables
 * Same logic as inventoryParser._resolveNameInternal
 */
function resolveDisplayName(uniqueName, exportData, locale = 'en') {
  if (!uniqueName) return '';
  // Normalize path: remove /StoreItems/ from log paths to match export data keys
  const normalizedKey = uniqueName.replace('/StoreItems/', '/');

  const dict = exportData.dict || {};
  const uniqueNameToName = exportData.uniqueNameToName || {};

  // Build lookup tables
  const tables = [
    exportData.ExportItems,
    exportData.ExportWeapons,
    exportData.ExportWarframes,
    exportData.ExportSentinels,
    exportData.ExportResources,
    exportData.ExportUpgrades,
    exportData.ExportRecipes,
  ];

  // Try uniqueNameToName first
  const nameKey = uniqueNameToName[uniqueName];
  if (nameKey) {
    const fromDict = dict[nameKey] || dict['/' + nameKey];
    if (fromDict) {
      return cleanName(fromDict);
    }
    return splitPascal(nameKey);
  }

  // Try export tables
  for (const tbl of tables) {
    if (!tbl || typeof tbl !== 'object') continue;
    const entry = tbl[normalizedKey] || tbl[uniqueName];
    if (!entry) continue;

    const locKey = entry.name ?? entry.displayName ?? '';
    if (locKey) {
      if (dict[locKey]) {
        return cleanName(dict[locKey]);
      }
      if (!locKey.startsWith('/Lotus/')) {
        return cleanName(locKey);
      }
    }

    // Try resultType
    if (entry.resultType) {
      const resultName = resolveDisplayName(entry.resultType, exportData, locale);
      const bpSuffix = BLUEPRINT_SUFFIX[locale] ?? ' Blueprint';
      if (uniqueName.toLowerCase().includes('blueprint') && !resultName.toLowerCase().includes('blueprint') && !resultName.toLowerCase().includes(bpSuffix.trim().toLowerCase())) {
        return resultName + bpSuffix;
      }
      return resultName;
    }
  }

  // Fallback to dict
  if (dict[uniqueName]) {
    return cleanName(dict[uniqueName]);
  }

  // Last resort: extract from path
  const parts = uniqueName.split('/');
  return splitPascal(parts[parts.length - 1] || uniqueName);
}

/**
 * Gets all unique items that can drop from actual RELICS.
 */
export function getAllRelicRewards(exportData, locale = 'en') {
  if (!exportData || !exportData.ExportRelics || !exportData.ExportRewards) return [];
  if (allRelicRewardsCache.has(exportData)) return allRelicRewardsCache.get(exportData);

  const relicData = Array.isArray(exportData.ExportRelics) ? exportData.ExportRelics : Object.values(exportData.ExportRelics);
  const rewardsMap = Array.isArray(exportData.ExportRewards) ? {} : exportData.ExportRewards;

  // If ExportRewards is an array, we need to convert it or use it differently. 
  // Standard Warframe data has it as a Map/Object.
  let lookupTable = rewardsMap;
  if (Array.isArray(exportData.ExportRewards)) {
    exportData.ExportRewards.forEach(r => {
      if (r.uniqueName) lookupTable[r.uniqueName] = r;
    });
  }

  const seen = new Set();
  const allItems = [];
  const bpSuffix = BLUEPRINT_SUFFIX[locale] ?? ' Blueprint';

  for (const relic of relicData) {
    const manifestPath = relic.rewardManifest;
    if (!manifestPath) continue;

    const pool = lookupTable[manifestPath];
    if (!pool) continue;

    const poolList = Array.isArray(pool) ? (Array.isArray(pool[0]) ? pool[0] : pool) : [];
    const flatPool = poolList.flat();

    for (const drop of flatPool) {
      const un = drop.type;
      if (!un || seen.has(un)) continue;
      const norm = un.replace('/StoreItems/', '/');
      if (seen.has(norm)) continue;
      seen.add(norm);
      const recipe = exportData.ExportRecipes?.[norm] || exportData.ExportRecipes?.[un];
      const itemData = exportData.ExportItems?.[norm] || exportData.ExportWeapons?.[norm] ||
        exportData.ExportWarframes?.[norm] || exportData.ExportResources?.[norm] ||
        exportData.ExportItems?.[un];

      allItems.push({
        uniqueName: norm,
        name: resolveDisplayName(un, exportData, locale),
        rarity: drop.rarity || 'COMMON',
        ducats: recipe?.primeSellingPrice || itemData?.primeSellingPrice || 0,
        isForma: norm.toLowerCase().includes('forma'),
        isPrimePart: norm.includes('Prime'),
      });
    }
  }

  // Ensure Forma is always there
  const formaUn = '/Lotus/StoreItems/Types/Items/MiscItems/FormaBlueprint';
  if (!seen.has(formaUn)) {
    allItems.push({
      uniqueName: formaUn,
      name: 'Forma' + bpSuffix,
      rarity: 'COMMON',
      ducats: 0
    });
  }

  allRelicRewardsCache.set(exportData, allItems);
  return allItems;
}

/**
 * Extracts the 6 possible rewards for a relic.
 */
export function getRelicRewards(relicUniqueName, exportData, locale = 'en') {
  const { relics, rewards } = getExportMaps(exportData);

  const relicEntry = relics[relicUniqueName];
  if (!relicEntry) return [];

  const manifestPath = relicEntry.rewardManifest;
  const pool = rewards[manifestPath];
  if (!pool) return [];

  const poolList = Array.isArray(pool) ? (Array.isArray(pool[0]) ? pool[0] : pool) : [];
  const flatPool = poolList.flat();

  return flatPool.map(item => {
    const un = item.type;
    const norm = un.replace('/StoreItems/', '/');
    const recipe = exportData.ExportRecipes?.[norm] || exportData.ExportRecipes?.[un];
    const itemData = exportData.ExportItems?.[norm] || exportData.ExportWeapons?.[norm] ||
      exportData.ExportWarframes?.[norm] || exportData.ExportResources?.[norm] ||
      exportData.ExportItems?.[un];

    return {
      uniqueName: norm,
      name: resolveDisplayName(un, exportData, locale),
      rarity: item.rarity || 'COMMON',
      ducats: recipe?.primeSellingPrice || itemData?.primeSellingPrice || 0,
      icon: exportData.EI?.[un] || exportData.EI?.[norm] || null,
      isForma: norm.toLowerCase().includes('forma'),
      isPrimePart: norm.includes('Prime'),
    };
  });
}

/**
 * Build one row per distinct relic from the complete export catalog.
 * Inventory parsing intentionally contains only relics the account owns, so
 * planner screens must use this catalog and merge owned counts separately.
 */
export function getRelicCatalog(exportData, locale = 'en') {
  if (!exportData?.ExportRelics || !exportData?.ExportRewards) return [];
  if (relicCatalogCache.has(exportData)) return relicCatalogCache.get(exportData);

  const relics = Array.isArray(exportData.ExportRelics)
    ? exportData.ExportRelics.map((entry) => [entry.uniqueName || entry.ItemType, entry])
    : Object.entries(exportData.ExportRelics);
  const seen = new Set();
  const catalog = [];

  for (const [uniqueName, entry] of relics) {
    if (!uniqueName || !entry) continue;

    const era = entry.era || parseRelicName(uniqueName).era;
    const category = entry.category || parseRelicName(uniqueName).name;
    if (!era || !category || era === 'Unknown') continue;

    // This is the Prime relic planner. ExportRelics also contains T5
    // Immortal/Omnia-style tables whose category strings are named like
    // Requiem eras (for example "Requiem IV"), but they are not Prime relics
    // and can contain adapters, stars, and other non-Prime rewards.
    if (!['Lith', 'Meso', 'Neo', 'Axi'].includes(era)) continue;

    const key = `${era} ${category}`;
    if (seen.has(key)) continue;

    const rewards = getRelicRewards(uniqueName, exportData, locale);
    if (!rewards.length) continue;

    seen.add(key);
    catalog.push({
      key,
      uniqueName,
      name: category,
      era,
      rewards,
      // Carried so unowned relics can render art too: inventory parsing only
      // ever produces owned relics, so a catalog-only entry had no image at all.
      icon: entry.icon || null,
      // DE export variants differ in whether this field is present. Keep an
      // unknown value unknown instead of labelling an unverified relic as
      // farmable.
      vaulted: getRelicVaultedStatus(entry, key),
    });
  }

  relicCatalogCache.set(exportData, catalog);
  return catalog;
}

/**
 * Gets inventory and mastery context for a specific reward item.
 */
export function getRewardInventoryContext(rewardUniqueName, inventoryData, exportData, locale = 'en') {
  const itemName = resolveDisplayName(rewardUniqueName, exportData, locale);
  let parentName = itemName;
  const bpSuffix = BLUEPRINT_SUFFIX[locale] ?? ' Blueprint';
  const suffixes = [
    bpSuffix, ' Neuroptics', ' Chassis', ' Systems',
    ' Barrel', ' Receiver', ' Stock', ' Grip', ' String',
    ' Limb', ' Blade', ' Hilt', ' Harness', ' Wings',
    ' Handle', ' Head', ' Link', ' Gauntlet', ' Pouch',
    ' Stars', ' Cerebrum', ' Carapace', ' Disc', ' Motor', ' Boot'
  ];
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const suffix of suffixes) {
      if (parentName.endsWith(suffix) || parentName.endsWith(suffix.toUpperCase())) {
        parentName = parentName.slice(0, -suffix.length);
        stripped = true;
      }
    }
  }

  if (!inventoryData) return {
    stock: 0,
    subcomponents: [],
    isForma: false,
    isResource: false,
    parentName
  };

  const ER = exportData.ExportResources || {};
  const isGenericResource = (un) => {
    return !!ER[un]
      && !un.includes('/WeaponParts/')
      && !un.includes('/WarframeRecipes/')
      && !un.includes('/ArchwingRecipes/')
      && !un.includes('Prime');
  };

  const isResource = isGenericResource(rewardUniqueName);
  const isForma = rewardUniqueName?.toLowerCase().includes('forma') ?? false;

  if (isForma) {
    const formaCount = inventoryData.account?.forma || 0;
    const craftable = inventoryData.craftable ?? [];
    const formaEntry = craftable.find(i => i.uniqueName?.toLowerCase().includes('forma'));
    const bpStock = formaEntry?.bpCount ?? 0;

    return {
      stock: bpStock,
      blueprintCount: bpStock,
      craftedCount: formaCount,
      isOwned: formaCount > 0,
      isMastered: true,
      isForma: true,
      isResource: false,
      parentName: 'Forma',
      subcomponents: [],
    };
  }

  const { bpLookup, ingredientIndex } = getRecipeIndexes(exportData, locale);
  const inventoryIndex = getPartInventoryIndex(inventoryData, exportData);

  const clean = (s) => s ? s.replace('/StoreItems/', '/').toLowerCase() : '';
  const recipe = exportData.ExportRecipes?.[rewardUniqueName]
    || exportData.ExportRecipes?.[rewardUniqueName.replace('/StoreItems/', '/')];
  let actualComponent = recipe ? recipe.resultType : rewardUniqueName;

  let parentRecipe = null;
  let parentRecipeUniqueName = null;
  let neededQuantity = 1;

  const rClean = clean(rewardUniqueName);
  const aClean = clean(actualComponent);

  const directHit = ingredientIndex.get(aClean) || ingredientIndex.get(rClean);
  if (directHit) {
    parentRecipe = directHit.bpRecipe;
    parentRecipeUniqueName = directHit.bpUniqueName;
    neededQuantity = directHit.itemCount;
    parentName = resolveDisplayName(parentRecipe.resultType, exportData, locale).replace(new RegExp(bpSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '').trim();
  }
  // A reward that IS a finished Blueprint (rewardUniqueName has its own
  // recipe) is never anyone else's ingredient, so the lookup above never
  // finds it and subcomponents silently stayed empty - the crafting
  // requirements it lists (parts + credits) are exactly what belongs here.
  // Only used to build the subcomponents list below; parentRecipeUniqueName
  // stays unset so it doesn't affect the BP/Owned/Mastery counts, which are
  // already correct for this case via the `recipe ? stock : ...` fallback.
  const ownRecipeForSubcomponents = (!directHit && recipe && recipe.ingredients?.length > 0) ? recipe : null;

  const rewardEntries = inventoryIndex.byUnique.get(rClean) || inventoryIndex.byName.get(itemName.toLowerCase()) || [];
  const rewardEntry = rewardEntries[0];
  const stock = rewardEntry?.quantity ?? 0;

  const craftedEntries = inventoryIndex.byUnique.get(aClean) || [];
  const craftedEntry = craftedEntries[0];
  const craftedCount = craftedEntry?.quantity ?? 0;
  const isMastered = craftedEntry?.mastered ?? false;

  let parentBpCount = 0;
  let parentCraftedCount = 0;
  let parentIsMastered = false;

  const parentNameLower = parentName.trim().toLowerCase();

  if (parentRecipe && parentRecipeUniqueName) {
    const pNorm = clean(parentRecipeUniqueName);
    const pBpHits = inventoryIndex.byUnique.get(pNorm) || [];
    parentBpCount = pBpHits[0]?.quantity ?? 0;

    const prNorm = clean(parentRecipe.resultType);
    const parentMatches = inventoryIndex.byUnique.get(prNorm)
      || inventoryIndex.byName.get(parentNameLower)
      || [];
    const pCrafted = parentMatches.find(item => item.mastered || item.owned || (item.quantity ?? 0) > 0) || parentMatches[0];

    parentCraftedCount = pCrafted?.quantity ?? (pCrafted?.owned ? 1 : 0);
    parentIsMastered = pCrafted?.mastered || inventoryIndex.masteredUniques.has(prNorm) || inventoryIndex.masteredNames.has(parentNameLower) || false;
  } else {
    parentBpCount = recipe ? stock : 0;
    parentCraftedCount = craftedCount;
    parentIsMastered = isMastered || inventoryIndex.masteredUniques.has(rClean) || inventoryIndex.masteredNames.has(parentNameLower) || false;
  }

  if (!parentIsMastered && parentNameLower) {
    if (inventoryIndex.masteredNames.has(parentNameLower)) {
      parentIsMastered = true;
    }
  }

  const subcomponents = (parentRecipe?.ingredients || ownRecipeForSubcomponents?.ingredients || []).map(ing => {
    const ingName = resolveDisplayName(ing.ItemType, exportData, locale);
    const ingBpUniqueName = bpLookup[ing.ItemType]
      || bpLookup[clean(ing.ItemType)];
    const compIsResource = isGenericResource(ing.ItemType);

    const ingHits = inventoryIndex.byUnique.get(clean(ing.ItemType)) || [];
    const haveCrafted = ingHits[0]?.quantity ?? 0;

    let bpCount = 0;
    if (ingBpUniqueName) {
      const bpHits = inventoryIndex.byUnique.get(clean(ingBpUniqueName)) || [];
      bpCount = bpHits[0]?.quantity ?? 0;
    }

    const isMatch = (ingUn) => {
      if (!ingUn || !rewardUniqueName) return false;
      const c1 = clean(ingUn);
      if (c1 === rClean || c1 === aClean) return true;
      const ingNameClean = ingName.toLowerCase().replace('blueprint', '').trim();
      const rewardNameClean = itemName.toLowerCase().replace('blueprint', '').trim();
      return ingNameClean === rewardNameClean;
    };

    return {
      name: ingName,
      uniqueName: ing.ItemType,
      have: haveCrafted,
      need: ing.ItemCount ?? 1,
      bpCount: compIsResource ? 0 : bpCount,
      hasBlueprint: !compIsResource && !!ingBpUniqueName,
      isResource: compIsResource,
      isDroppedReward: isMatch(ing.ItemType)
    };
  }).filter(c => c.need > 0);

  return {
    stock,
    blueprintCount: parentRecipe ? stock : parentBpCount,
    craftedCount: parentRecipe ? craftedCount : parentCraftedCount,
    isRecipeComponent: !!parentRecipe,
    need: neededQuantity,
    parentName,
    isOwned: parentCraftedCount > 0,
    isMastered: parentIsMastered,
    isForma,
    isResource,
    subcomponents,
  };
}

/**
 * Whether a relic reward has ever been "obtained" - owned, crafted, or its
 * parent frame/weapon mastered. Combines getRewardInventoryContext()'s
 * parent-mastery resolution with a direct inventory-item lookup (matching
 * by uniqueName or display name against prime_parts/primeSets/all/
 * resources and checking that matched item's own owned/mastered/quantity
 * fields directly) - the direct lookup catches cases the parent-recipe
 * resolution chain misses. Single source of truth for this check so the
 * relic picker overlay and Relic Planner screen can't drift out of sync
 * with each other again (confirmed live 2026-08-10: they had, before this
 * was unified - Yareli Prime Neuroptics/Gyre Prime Systems showed correctly
 * in one and not the other).
 */
export function getPartObtainedStatus(uniqueName, displayName, inventoryData, exportData, locale = 'en') {
  const ctx = getRewardInventoryContext(uniqueName, inventoryData, exportData, locale);
  const normalize = (value) => value?.replace('/StoreItems/', '/').toLowerCase();
  const normalizeName = (value) => value?.replace(/\s+Blueprint$/i, '').trim().toLowerCase();
  const inventoryEntries = getPartInventoryIndex(inventoryData, exportData);
  const resolvedUniqueName = REQUIEM_MOD_ALIASES[normalize(uniqueName)] || uniqueName;
  const foundryEvidence = inventoryEntries.foundryUnique.has(normalize(resolvedUniqueName))
    || inventoryEntries.foundryUnique.has(normalize(uniqueName))
    || inventoryEntries.foundryNames.has(normalizeName(displayName));
  // An exact unique-name match is authoritative.  Only use the display-name
  // fallback when the account has no entry under that identity; otherwise a
  // similarly named item (Tatsu vs Tatsu Prime) can be selected as evidence.
  const exactMatches = inventoryEntries.byUnique.get(normalize(resolvedUniqueName)) || [];
  const directMatches = exactMatches.length > 0
    ? exactMatches
    : (inventoryEntries.byName.get(normalizeName(displayName)) || []);
  const direct = directMatches.find((item) => item.owned || item.mastered || (item.quantity ?? 0) > 0 || (item.crafted ?? 0) > 0)
    || directMatches[0];
  const directCrafted = direct?.crafted ?? 0;
  const currentStock = Math.max(ctx?.stock ?? 0, direct?.quantity ?? 0, directCrafted);
  const directOwned = !!direct?.owned || currentStock > 0;
  // How many of this exact part the real parent recipe needs (e.g. 2 for
  // Afuris Prime Barrel, a dual weapon). Distinct from directOwned/
  // everObtained on purpose: having 1 of 2 needed is still real evidence you
  // "ever obtained" this part (so it must not count as Never Obtained), but
  // it isn't "enough" for planning purposes - the Relic Planner's Add All
  // Missing previously used directOwned alone, so any stock > 0 counted as
  // fully covered regardless of the real requirement. Confirmed live
  // 2026-08-19: Afuris Prime Barrel needs 2, player had 1, never showed as
  // missing.
  const need = ctx?.need ?? 1;
  const hasEnough = currentStock >= need || (!!direct?.owned && need <= 1)
    // If the parent is already built (or was, and is now mastered), every
    // component's need was necessarily satisfied at build time even though
    // none remain in stock now (crafting consumes them) - without this,
    // Voruna Prime Systems (already used to build a fully-owned Voruna
    // Prime) would show as "still missing" in the Relic Planner forever,
    // the same class of bug already fixed for everObtained above.
    || (!!ctx?.isRecipeComponent && (!!ctx?.isMastered || !!ctx?.isOwned));
  // Direct component evidence is preferred. An owned parent is also valid
  // evidence for its recipe components, but only when the component resolver
  // actually found that specific parent (ctx.isRecipeComponent, matched by
  // exact recipe/unique-name above) - an unrelated parent must not suppress
  // "Never Obtained".
  const everObtained = directOwned
    || !!direct?.mastered
    // Standalone rewards can use their own crafted count. Components cannot:
    // ctx.craftedCount is the parent weapon/frame count for them.
    || (!ctx?.isRecipeComponent && (ctx?.craftedCount ?? 0) > 0)
    // Building the parent is itself proof every component was obtained at
    // least once, regardless of the parent's current rank - requiring full
    // mastery here meant a just-built, still-leveling frame (e.g. Voruna
    // Prime, built yesterday and not yet maxed) showed its own consumed
    // components as "missing" from relic reward tracking. Confirmed live
    // 2026-08-19: Voruna Prime Systems flagged missing despite being built
    // into the exact Voruna Prime frame currently being leveled.
    || (!!ctx?.isRecipeComponent && (!!ctx?.isMastered || !!ctx?.isOwned))
    // A pending Foundry recipe proves the blueprint was obtained, but does
    // not count as current stock because the Foundry is consuming it now.
    || foundryEvidence;
  return { currentStock, directOwned, everObtained, need, hasEnough };
}

// Planner and overlay can ask about hundreds of parts during one render. Keep
// the normalized inventory indexes per parsed inventory identity so ownership
// checks remain O(1) lookups instead of rebuilding and scanning four arrays for
// every part.
const partInventoryIndexes = new WeakMap();
function getPartInventoryIndex(inventoryData, exportData) {
  if (!inventoryData || typeof inventoryData !== 'object') return { byUnique: new Map(), byName: new Map(), foundryUnique: new Set(), foundryNames: new Set(), masteredUniques: new Set(), masteredNames: new Set() };
  const cached = partInventoryIndexes.get(inventoryData);
  if (cached) return cached;
  const normalize = (value) => value?.replace('/StoreItems/', '/').toLowerCase();
  const normalizeName = (value) => value?.replace(/\s+Blueprint$/i, '').trim().toLowerCase();
  const byUnique = new Map();
  const byName = new Map();
  const foundryUnique = new Set();
  const foundryNames = new Set();
  const masteredUniques = new Set();
  const masteredNames = new Set();

  const entries = [
    ...(inventoryData.prime_parts || []),
    ...Object.values(inventoryData.primeSets || {}).flatMap((set) => set.parts || []),
    ...(inventoryData.all || []),
    ...(inventoryData.resources || []),
    ...(inventoryData.consumables_catalog || []),
    ...(inventoryData.consumables || []),
    ...(inventoryData.mods || []),
    ...(inventoryData.warframes || []),
    ...(inventoryData.primary || []),
    ...(inventoryData.secondary || []),
    ...(inventoryData.melee || []),
    ...(inventoryData.sentinels || []),
    ...(inventoryData.archwing || []),
  ];

  for (const item of entries) {
    const unique = normalize(item.unique_name);
    const name = normalizeName(item.name);
    if (unique) byUnique.set(unique, [...(byUnique.get(unique) || []), item]);
    if (name) byName.set(name, [...(byName.get(name) || []), item]);

    if (item.mastered) {
      if (unique) masteredUniques.add(unique);
      if (name) masteredNames.add(name);
    }
  }

  for (const pending of inventoryData.foundry || []) {
    const uniqueNames = [pending.unique_name, pending.result_type].filter(Boolean);
    for (const uniqueName of uniqueNames) foundryUnique.add(normalize(uniqueName));
    const name = normalizeName(pending.name);
    const parentName = normalizeName(pending.parentName);
    if (name) foundryNames.add(name);
    if (parentName) foundryNames.add(parentName);

    const recipeEntries = exportData?.ExportRecipes || {};
    const recipe = recipeEntries[pending.unique_name]
      || recipeEntries[pending.result_type]
      || Object.entries(recipeEntries).find(([key]) => normalize(key) === normalize(pending.unique_name))?.[1]
      || Object.entries(recipeEntries).find(([key]) => normalize(key) === normalize(pending.result_type))?.[1];
    for (const ingredient of pending.recipeIngredients || recipe?.ingredients || []) {
      if (!ingredient?.ItemType) continue;
      const ingredientUnique = normalize(ingredient.ItemType);
      foundryUnique.add(ingredientUnique);
      if (/component$/i.test(ingredientUnique)) {
        foundryUnique.add(ingredientUnique.replace(/component$/i, 'blueprint'));
      }
    }
  }
  const index = { byUnique, byName, foundryUnique, foundryNames, masteredUniques, masteredNames };
  partInventoryIndexes.set(inventoryData, index);
  return index;
}

/**
 * Drop probabilities for each refinement level.
 * Common: 3 items, Uncommon: 2 items, Rare: 1 item.
 * [Common_Individual, Uncommon_Individual, Rare_Individual]
 */
const DROP_CHANCES = {
  'Intact': [0.2533, 0.11, 0.02],
  'Exceptional': [0.2333, 0.13, 0.04],
  'Flawless': [0.20, 0.17, 0.06],
  'Radiant': [0.1667, 0.20, 0.10]
};

/**
 * Calculates the Expected Value (EV) of picking the best reward in a squad.
 * @param {Array} rewards - List of 6 reward items with 'plat' or 'ducats' values.
 * @param {string} refinement - 'Intact', 'Exceptional', 'Flawless', or 'Radiant'.
 * @param {number} squadSize - Number of identical relics (1-4).
 * @param {string} valueKey - 'plat' or 'ducats'.
 */
export function getRelicEV(rewards, refinement, squadSize = 1, valueKey = 'plat') {
  if (!rewards || rewards.length === 0) return 0;
  const chances = DROP_CHANCES[refinement] || DROP_CHANCES['Intact'];

  // Map rewards to their values and individual probabilities
  const items = rewards.map(r => {
    let p = 0;
    if (r.rarity === 'COMMON') p = chances[0];
    else if (r.rarity === 'UNCOMMON') p = chances[1];
    else if (r.rarity === 'RARE') p = chances[2];
    return { val: r[valueKey] || 0, p };
  });

  // Requiem relics have a flat drop table - each of the 8 mods has equal probability (12.5%)
  if (rewards.length >= 7) {
    const isRequiem = rewards.every(r => r.rarity === 'COMMON');
    if (isRequiem) {
      const flatP = 1 / rewards.length;
      const itemsFlat = items.map(i => ({ ...i, p: flatP }));
      // Re-sort by value descending (should already be sorted)
      itemsFlat.sort((a, b) => b.val - a.val);
      let ev = 0;
      let cum = 0;
      for (let i = 0; i < itemsFlat.length; i++) {
        const item = itemsFlat[i];
        const nextCum = 1 - Math.pow(1 - (cum + item.p), squadSize);
        const probBest = nextCum - (1 - Math.pow(1 - cum, squadSize));
        ev += item.val * probBest;
        cum += item.p;
      }
      return ev;
    }
  }

  // Sort by value descending to calculate "probability this is the best item available"
  items.sort((a, b) => b.val - a.val);

  let expectedValue = 0;
  let cumulativeProb = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // Probability that AT LEAST ONE of the top i+1 items drops:
    // 1 - (1 - sum(p_0...p_i))^N
    const nextCumulativeProb = 1 - Math.pow(1 - (cumulativeProb + item.p), squadSize);

    // Probability that item i is the BEST item in the result set:
    // P(at least one of 0...i) - P(at least one of 0...i-1)
    const probThisIsBest = nextCumulativeProb - (1 - Math.pow(1 - cumulativeProb, squadSize));

    expectedValue += item.val * probThisIsBest;
    cumulativeProb += item.p;
  }

  return expectedValue;
}

export function parseRelicName(uniqueName) {
  const parts = uniqueName.split('/');
  const rawName = parts[parts.length - 1];

  let era = "Unknown";
  if (rawName.includes("T1")) era = "Lith";
  else if (rawName.includes("T2")) era = "Meso";
  else if (rawName.includes("T3")) era = "Neo";
  else if (rawName.includes("T4")) era = "Axi";
  else if (rawName.includes("T5")) era = "Requiem";

  let refinement = "Intact";
  if (rawName.endsWith("Silver")) refinement = "Exceptional";
  else if (rawName.endsWith("Gold")) refinement = "Flawless";
  else if (rawName.endsWith("Platinum")) refinement = "Radiant";

  let name = rawName
    .replace(/^T\dVoidProjection/, '')
    .replace(/(Bronze|Silver|Gold|Platinum)$/, '');

  return { era, refinement, name };
}

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a, b) {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) { tmp[i] = [i]; }
  for (let j = 0; j <= b.length; j++) { tmp[0][j] = j; }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Performs a fuzzy match of an OCR string against a list of candidate items.
 * Returns the best matching item if the similarity is above the threshold.
 */
export function fuzzyMatchReward(ocrText, candidates, threshold = 0.65) {
  if (!ocrText || !candidates || candidates.length === 0) return null;

  const clean = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const ocrClean = clean(splitPascal(ocrText));

  if (ocrClean.length < 3) return null;

  const ocrWords = ocrClean.split(' ');
  const ocrRoot = ocrWords[0];
  let bestMatch = null;
  let bestScore = -1;

  for (const item of candidates) {
    if (!item || !item.name) continue;

    const itemClean = clean(item.name);
    if (!itemClean) continue;
    const itemWords = itemClean.split(' ');
    const itemRoot = itemWords[0];

    // 1. Exact match
    if (ocrClean === itemClean) {
      return item;
    }

    // 2. Root word validation: Root word must match well to avoid cross-item matching
    const rootDist = levenshteinDistance(ocrRoot, itemRoot);
    const rootMaxL = Math.max(ocrRoot.length, itemRoot.length);
    const rootSim = 1.0 - (rootDist / (rootMaxL || 1));
    if (rootSim < 0.60 && !ocrClean.includes(itemClean) && !itemClean.includes(ocrClean)) {
      continue; // Discard mismatching roots (e.g. Afentis vs Paris)
    }

    // 3. Word-by-word similarity
    let totalSim = 0;
    let totalWeight = 0;

    for (let i = 0; i < itemWords.length; i++) {
      const iw = itemWords[i];
      let bestWordSim = 0;
      for (const ow of ocrWords) {
        if (ow.includes(iw) || iw.includes(ow)) {
          bestWordSim = Math.max(bestWordSim, 0.9);
        }
        const d = levenshteinDistance(ow, iw);
        const maxL = Math.max(ow.length, iw.length);
        const s = 1.0 - (d / maxL);
        if (s > bestWordSim) bestWordSim = s;
      }

      const weight = i === 0 ? 3.0 : 1.0; // Heavily weight root word
      totalSim += (bestWordSim * weight);
      totalWeight += weight;
    }

    // Penalize a candidate for OCR words it has no counterpart for. Without
    // this, only itemWords were ever iterated above, so a general/parent
    // name that's a strict word-subset of a more specific name (e.g.
    // "Yareli Prime Blueprint" vs OCR "Yareli Prime Chassis Blueprint")
    // scored an identical perfect match to the correct, longer candidate -
    // the extra OCR word was never penalized either way, so ties were
    // broken by candidate array order (DE drop-table manifest position)
    // rather than by which name actually fits the OCR text better.
    // Confirmed live: this produced a wrong "Yareli Prime Blueprint" result
    // when the real reward was "Yareli Prime Chassis Blueprint". Each
    // unaccounted OCR word counts as zero similarity at the same weight as
    // any other non-root word.
    const extraOcrWords = Math.max(0, ocrWords.length - itemWords.length);
    totalWeight += extraOcrWords;

    const finalScore = totalSim / totalWeight;

    if (finalScore > bestScore && finalScore >= threshold) {
      bestScore = finalScore;
      bestMatch = item;
    }
  }

  return bestMatch;
}
