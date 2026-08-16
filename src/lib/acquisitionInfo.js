import { getItemDrops, getItemRecipe, getWikiLink, isCraftable } from './acquisitionData';

// Keep compact Wiki maps available in the frontend as a last-resort fallback.
// The AppImage also ships these JSON files as Tauri resources, but a card can
// be opened before asynchronous resource injection reaches the context.
import bundledWikiBaroAcquisition from '../../src-tauri/data/assets/data/wiki-baro-acquisition.json';
import bundledWikiResourceAcquisition from '../../src-tauri/data/assets/data/wiki-resources-acquisition.json';
import bundledWikiPageAcquisition from '../../src-tauri/data/assets/data/wiki-page-acquisition.json';
import bundledWikiDescriptionAcquisition from '../../src-tauri/data/assets/data/wiki-description-acquisition.json';
import { WIKI_VERIFIED_ACQUISITIONS, WIKI_VERIFIED_DISPOSITIONS } from './wikiVerifiedAcquisitions';

const bundledWikiBaroIndex = new Map(Object.keys(bundledWikiBaroAcquisition).map((name) => [name.toLowerCase().trim(), true]));
const bundledWikiResourceIndex = new Map(Object.entries(bundledWikiResourceAcquisition).map(([name, entry]) => [name.toLowerCase().trim(), entry]));
const bundledWikiPageIndex = new Map(Object.entries(bundledWikiPageAcquisition).map(([name, entry]) => [name.toLowerCase().trim(), entry]));
const bundledWikiDescriptionIndex = new Map(Object.entries(bundledWikiDescriptionAcquisition).map(([uniqueName, text]) => [uniqueName.replaceAll('/StoreItems/', '/'), text]));

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

// Stable variant families with a known acquisition route. These are shared
// path/name rules, not item-specific overrides. More specific curated vendor
// and Baro sources are checked first below.
const VARIANT_ACQUISITION_PATTERNS = [
  {
    test: (un, name) => /\/KuvaLich\//.test(un || '') || /^Kuva\s/i.test(name || ''),
    text: 'Acquired by defeating a Kuva Lich carrying this weapon.',
  },
  {
    test: (un, name) => /\/BoardExec\//.test(un || '') || /^Tenet\s/i.test(name || ''),
    text: 'Acquired by defeating a Sister of Parvos carrying this weapon.',
  },
  {
    test: (un, name) => /\/InfestedLich\//.test(un || '') || /^(?:Dual\s+)?Coda\s/i.test(name || ''),
    text: 'Acquired by defeating an Infested Lich carrying this weapon.',
  },
];

// Login music is a non-drop collectible family. The Wiki Baro module supplies
// the item-by-item list, but keep the stable DE path as a runtime fallback so
// a packaged app that has not finished loading supplemental Wiki assets does
// not regress to the misleading generic source message.
const BARO_LOGIN_MUSIC_PATTERN = /\/Types\/Items\/SongItems\/[^/]*LoginSongItem$/i;

// Incarnon Genesis adapters are exported as misc store items rather than
// ordinary drops. Their Market bundle relationship is not the acquisition
// route: the adapter is offered on the rotating Steel Path Circuit reward
// track and can also be purchased from Cavalero for 120 Platinum. Keep this
// keyed to DE's exact adapter path so it covers every adapter without making
// a name-based guess about unrelated items.
const INCARNON_GENESIS_PATTERN = /\/Types\/Items\/MiscItems\/IncarnonAdapters\//i;

// DE uses both /Lotus/StoreItems/... and /Lotus/Types/StoreItems/... forms.
// Some bundle component identities contain the segment twice; normalize all
// occurrences so those exact components match the corresponding catalog
// identity instead of silently falling through to the Wiki fallback.
const canonicalPath = (v) => typeof v === 'string' ? v.replaceAll('/StoreItems/', '/') : v;

function cleanResolvedName(value) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';
}

// Wiki module keys and DE display names occasionally differ only in Unicode
// punctuation (for example, curly versus straight apostrophes). Normalize
// those identity-only differences while retaining the actual item wording.
function normalizeDisplayName(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC')
      .replace(/[’‘]/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    : '';
}

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
  const dict = exportData?.dict || exportData?.['dict.en'] || {};
  const entriesByUniqueName = new Map();
  for (const tableName of [
    'ExportWeapons', 'ExportWarframes', 'ExportSentinels', 'ExportResources',
    'ExportGear', 'ExportCustoms', 'ExportFlavour', 'ExportUpgrades',
    'ExportArcanes', 'ExportKeys', 'ExportMisc', 'ExportRailjackWeapons',
  ]) {
    const table = exportData?.[tableName];
    if (!table || typeof table !== 'object') continue;
    for (const [uniqueName, entry] of Object.entries(table)) {
      if (entry && typeof entry === 'object') entriesByUniqueName.set(canonicalPath(uniqueName), entry);
    }
  }

  const nameCache = new Map();
  const resolveName = (uniqueName, depth = 0) => {
    const key = canonicalPath(uniqueName);
    if (!key || depth > 5) return '';
    if (nameCache.has(key)) return nameCache.get(key);
    const entry = entriesByUniqueName.get(key);
    const locKey = entry?.name || entry?.displayName;
    const resolved = cleanResolvedName(locKey ? (dict[locKey] || dict[`/${locKey}`] || locKey) : '');
    if (resolved && !resolved.startsWith('/')) {
      nameCache.set(key, resolved);
      return resolved;
    }
    if (entry?.resultType) {
      const resultName = resolveName(entry.resultType, depth + 1);
      if (resultName) {
        nameCache.set(key, resultName);
        return resultName;
      }
    }
    nameCache.set(key, '');
    return '';
  };

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
          name: resolveName(itemType) || itemType,
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

// ExportWarframes lists each ability weapon in `exalted`. This is direct DE
// relationship data: these weapons are granted as part of the owning frame,
// not independently acquired Foundry items or drop-table rewards.
export function buildExaltedWeaponIndex(exportData) {
  const index = new Map();
  const dict = exportData?.dict || {};
  const resolveName = (entry) => {
    const key = entry?.name || entry?.displayName;
    const value = key ? (dict[key] || dict[`/${key}`] || key) : '';
    return typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';
  };
  for (const frame of Object.values(exportData?.ExportWarframes || {})) {
    const frameName = resolveName(frame);
    if (!frameName || !Array.isArray(frame?.exalted)) continue;
    for (const weapon of frame.exalted) {
      const key = canonicalPath(weapon);
      if (!key) continue;
      const names = index.get(key) || [];
      if (!names.includes(frameName)) names.push(frameName);
      index.set(key, names);
    }
  }
  // Sentinel weapons are defined by the same DE export relationship: a
  // sentinel's defaultWeapon is granted with that sentinel (for example,
  // Artax with Taxon and Deconstructor with Helios). Preserve this exact
  // relationship instead of presenting a misleading generic Wiki fallback.
  for (const sentinel of Object.values(exportData?.ExportSentinels || {})) {
    const sentinelName = resolveName(sentinel);
    const key = canonicalPath(sentinel?.defaultWeapon);
    if (!sentinelName || !key) continue;
    const names = index.get(key) || [];
    if (!names.includes(sentinelName)) names.push(sentinelName);
    index.set(key, names);
  }
  // Some export entries are alternate modes of one weapon rather than
  // separately acquired equipment. The DE bayonet relationship identifies
  // Vinquibus (Melee) as the alternate of Vinquibus exactly.
  for (const weapon of Object.values(exportData?.ExportWeapons || {})) {
    const primaryName = resolveName(weapon);
    const key = canonicalPath(weapon?.bayonetOtherWeaponType);
    if (!primaryName || !key) continue;
    const names = index.get(key) || [];
    if (!names.includes(primaryName)) names.push(primaryName);
    index.set(key, names);
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
    const key = normalizeDisplayName(name);
    if (key && typeof category === 'string' && category.trim()) {
      index.set(key, category.trim());
    }
  }
  return index;
}

function buildDisplayNameIndex(data, transform) {
  const index = new Map();
  if (!data || typeof data !== 'object') return index;
  for (const [name, value] of Object.entries(data)) {
    const key = normalizeDisplayName(name);
    if (key) index.set(key, transform(value));
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
  const index = new Map();
  const vendors = exportData?.ExportVendors;
  if (!vendors || typeof vendors !== 'object') return index;
  const dict = exportData?.dict || exportData?.['dict.en'] || {};
  const exportedNames = new Map();
  for (const tableName of ['ExportResources', 'ExportMisc', 'ExportGear', 'ExportCustoms', 'ExportUpgrades']) {
    for (const [uniqueName, entry] of Object.entries(exportData?.[tableName] || {})) {
      const name = cleanResolvedName(entry?.name ? (dict[entry.name] || dict[`/${entry.name}`] || entry.name) : '');
      if (name) exportedNames.set(canonicalPath(uniqueName), name);
    }
  }
  const display = (value) => {
    const canonical = canonicalPath(value);
    return exportedNames.get(canonical) || cleanResolvedName(value ? (dict[value] || dict[`/${value}`] || value) : '');
  };
  const vendorLabel = (manifestName) => {
    if (/\/Duviri\/AcrithisVendorManifest$/.test(manifestName)) return 'Acrithis in Duviri';
    if (/\/DeimosHalloweenVendorManifest$/.test(manifestName)) return 'Naberus event vendor in the Necralisk';
    if (/\/RadioLegionIntermission\d+VendorManifest$/.test(manifestName)) return 'Nora Nightwave Cred offerings';
    if (/\/FocusSchools\/MaduraiVendorManifest$/.test(manifestName)) return 'Madurai Focus vendor';
    if (/\/FocusSchools\/NaramonVendorManifest$/.test(manifestName)) return 'Naramon Focus vendor';
    if (/\/FocusSchools\/UnairuVendorManifest$/.test(manifestName)) return 'Unairu Focus vendor';
    if (/\/FocusSchools\/VazarinVendorManifest$/.test(manifestName)) return 'Vazarin Focus vendor';
    if (/\/FocusSchools\/ZenurikVendorManifest$/.test(manifestName)) return 'Zenurik Focus vendor';
    if (/\/IronwakeDondaVendorManifest$/.test(manifestName)) return 'Donda in Iron Wake';
    if (/\/Ostron\/MaskSalesmanManifest$/.test(manifestName)) return 'Mask Salesman in Cetus';
    if (/\/TriadDecorationsVendorManifest$/.test(manifestName)) return 'Triad Decorations vendor';
    if (/\/TriadEventVendorManifest$/.test(manifestName)) return 'Triad event vendor';
    return 'an in-game vendor';
  };
  const priceText = (item) => {
    const prices = (item?.itemPrices || []).map((price) => {
      const currency = display(price.ItemType) || price.ItemType;
      return `${price.ItemCount}x ${currency}`;
    });
    if (item?.focusXpCost?.cost) prices.push(`${item.focusXpCost.cost.toLocaleString()} Focus XP`);
    if (item?.numRandomItemPrices) prices.push('a vendor-selected resource cost');
    return prices.length ? ` Price listed in the export: ${prices.join(' and ')}.` : '';
  };
  for (const vendor of Object.values(vendors)) {
    for (const item of vendor?.items || []) {
      const key = canonicalPath(item?.storeItem);
      if (!key) continue;
      const manifestName = Object.entries(vendors).find(([, candidate]) => candidate === vendor)?.[0] || '';
      const route = {
        text: `Listed by ${vendorLabel(manifestName)}.${priceText(item)}`,
        source: `DE export vendor manifest ${manifestName || 'record'}`,
      };
      const routes = index.get(key) || [];
      if (!routes.some((candidate) => candidate.text === route.text)) routes.push(route);
      index.set(key, routes);
    }
  }
  return index;
}

export function buildWikiTennoGenIndex(data) {
  const index = buildDisplayNameIndex(data, (entry) => entry && typeof entry === 'object' ? entry : null);
  // The wiki module commonly stores one TennoGen record for the purchasable
  // skin while DE exports the matching helmet as a separate cosmetic item.
  // Alias only the exact paired "Skin" -> "Helmet" form; do not fuzzy-match
  // arbitrary cosmetic names.
  for (const [name, value] of [...index.entries()]) {
    if (name.endsWith(' skin')) {
      const helmet = `${name.slice(0, -5)} helmet`;
      if (!index.has(helmet)) index.set(helmet, value);
    }
  }
  return index;
}

export function buildWikiBaroIndex(data) {
  return buildDisplayNameIndex(data, () => true);
}

export function buildWikiBlueprintIndex(data) {
  return buildDisplayNameIndex(data, (entry) => entry && typeof entry === 'object' ? entry : null);
}

export function buildWikiResearchIndex(data) {
  return buildDisplayNameIndex(data, (entry) => entry && typeof entry === 'object' ? entry : null);
}

export function buildWikiResourceIndex(data) {
  return buildDisplayNameIndex(data, (entry) => entry && typeof entry === 'object' ? entry : null);
}

export function buildWikiPageAcquisitionIndex(data) {
  return buildDisplayNameIndex(data, (entry) => entry && typeof entry === 'object' ? entry : null);
}

export function buildWikiAcquisitionStatusIndex(data) {
  const index = new Map();
  if (!data || typeof data !== 'object') return index;
  for (const [uniqueName, entry] of Object.entries(data)) {
    const key = canonicalPath(uniqueName);
    if (key && entry && typeof entry === 'object') index.set(key, entry);
  }
  return index;
}

export function buildRelicStateIndex(exportData) {
  const index = new Map();
  for (const [uniqueName, relic] of Object.entries(exportData?.ExportRelics || {})) {
    if (relic && typeof relic === 'object') index.set(canonicalPath(uniqueName), relic);
  }
  return index;
}

function formatWikiBlueprint(entry) {
  const details = ['Blueprint listed by the Warframe Wiki.'];
  if (entry?.blueprintCost > 0) details.push(`Blueprint: ${Number(entry.blueprintCost).toLocaleString()} Credits.`);
  if (entry?.buildCost > 0) details.push(`Build cost: ${Number(entry.buildCost).toLocaleString()} Credits.`);
  const buildTime = formatBuildTime(entry?.buildTime);
  if (buildTime) details.push(`Build time: ${buildTime}.`);
  if (entry?.rushCost > 0) details.push(`Rush: ${entry.rushCost} Platinum.`);
  const parts = (entry?.parts || []).map((part) => `${part.count}x ${part.name}`).join(', ');
  if (parts) details.push(`Components: ${parts}.`);
  return details.join(' ');
}

function formatWikiResearch(entry) {
  const details = [`Research the blueprint in ${entry?.lab || 'a Clan Dojo lab'}, then build it in the Foundry.`];
  if (entry?.credits > 0) details.push(`Research cost: ${Number(entry.credits).toLocaleString()} Credits.`);
  const time = formatBuildTime(entry?.time);
  if (time) details.push(`Research time: ${time}.`);
  const resources = (entry?.resources || []).map((resource) => `${resource.count}x ${resource.name}`).join(', ');
  if (resources) details.push(`Research resources: ${resources}.`);
  if (entry?.prereq) details.push(`Prerequisite research: ${entry.prereq}.`);
  return details.join(' ');
}

/**
 * Supplemental browse.wf Glyph data is keyed by DE uniqueName and contains
 * human-maintained promo codes, creator links, and acquisition notes.
 */
export function buildGlyphSupplementIndex(data) {
  const index = new Map();
  if (!data || typeof data !== 'object') return index;
  for (const [uniqueName, entry] of Object.entries(data)) {
    const key = canonicalPath(uniqueName);
    if (key && entry && typeof entry === 'object') index.set(key, entry);
  }
  return index;
}

// ExportCustoms records the relationship between a market/Prime/TennoGen
// parent customization and its separately rendered child objects (helmets,
// armor pieces, operator counterparts, etc.) in `additionalItems`. Keep this
// relationship keyed by exact DE uniqueName so a child can inherit only its
// own parent's already-resolved acquisition route.
export function buildExportComponentIndex(exportData) {
  const index = new Map();
  const dict = exportData?.dict || exportData?.['dict.en'] || {};
  const cleanName = (value) => cleanResolvedName(value ? (dict[value] || dict[`/${value}`] || value) : '');
  for (const tableName of ['ExportCustoms', 'ExportGear', 'ExportResources', 'ExportUpgrades']) {
    for (const [parentUniqueName, entry] of Object.entries(exportData?.[tableName] || {})) {
      if (!Array.isArray(entry?.additionalItems)) continue;
      const parent = canonicalPath(parentUniqueName);
      const parentDisplayName = cleanName(entry.name);
      if (!parent || !parentDisplayName) continue;
      for (const childUniqueName of entry.additionalItems) {
        const child = canonicalPath(childUniqueName);
        // A child can be shared by multiple Gemini skins. Do not select an
        // arbitrary parent in that case; ambiguity is not acquisition proof.
        if (child && !index.has(child)) index.set(child, { parentUniqueName: parent, parentDisplayName });
        else if (child) index.set(child, null);
      }
    }
  }
  for (const [key, value] of index) if (!value) index.delete(key);
  return index;
}

export function getAcquisitionInfo(dropIndexKey, displayName, dropIndex, overridesData, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex) {
  const itemDrops = getItemDrops(dropIndexKey);
  if (itemDrops) {
    return { sources: itemDrops.map((source) => source.source ? source : { ...source, source: 'warframe-items' }), wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const recipe = recipeResultIndex?.get(canonicalPath(dropIndexKey)) || getItemRecipe(dropIndexKey);
  const overrideText = overridesData?.mods?.[displayName]
    ?? overridesData?.components?.[dropIndexKey]
    ?? overridesData?.components?.[displayName]
    ?? overridesData?.components?.[`${displayName}|Blueprint`];
  // Component overrides written for an item's old recipe summary sometimes
  // say "Market purchase" even when the component itself is a resource. If
  // the exact resource has a structured Wiki acquisition record, let that
  // record describe the resource instead of inheriting the parent weapon's
  // Market route.
  const displayLowerForOverride = normalizeDisplayName(displayName);
  const hasStructuredResourceRoute = wikiResourceIndex?.has(displayLowerForOverride);
  const resourceOverrideIsMarketOnly = hasStructuredResourceRoute
    && typeof overrideText === 'string'
    && /market purchase/i.test(overrideText);
  // Clan-research overrides predate the structured research table and can
  // omit the exact lab, cost, prerequisite, and research time. Prefer the
  // exact display-name research record whenever one exists.
  const researchOverrideHasStructuredRoute = wikiResearchIndex?.has(displayLowerForOverride)
    && typeof overrideText === 'string'
    && /^(?:clan research|dojo research)\b/i.test(overrideText.trim());
  const marketOverrideMatch = typeof overrideText === 'string'
    ? overrideText.match(/^Purchase the blueprint from the Market for ([\d,]+) Credits, or buy the complete .*? for ([\d,]+) Platinum\b/i)
    : null;
  const marketEntry = marketIndex?.get(canonicalPath(dropIndexKey));
  const marketOverrideIsExportVerified = marketOverrideMatch
    && recipe?.blueprintCost === Number(marketOverrideMatch[1].replaceAll(',', ''))
    && marketEntry
    && Number(marketEntry.amount) === Number(marketOverrideMatch[2].replaceAll(',', ''))
    && (marketEntry.currency || 'Platinum') === 'Platinum';
  const baroOverrideHasStructuredRoute = typeof overrideText === 'string'
    && /^Baro\b/i.test(overrideText.trim())
    && (wikiBaroIndex?.has(displayLowerForOverride)
      || wikiBaroIndex?.has(`${displayLowerForOverride} relic`)
      || bundledWikiBaroIndex.has(displayLowerForOverride)
      || bundledWikiBaroIndex.has(`${displayLowerForOverride} relic`));
  const structuredVendorsForOverride = wikiVendorIndex?.get(displayLowerForOverride);
  const vendorOverrideHasStructuredRoute = Array.isArray(structuredVendorsForOverride)
    && structuredVendorsForOverride.length > 0;
  const marketMentioned = typeof overrideText === 'string'
    && /market purchase|market bundle|complete .*market/i.test(overrideText);
  const overrideForbidsBlueprint = typeof overrideText === 'string'
    && /fully built|no blueprint/i.test(overrideText);
  const marketAmount = marketEntry ? Number(marketEntry.amount) : 0;
  const marketCurrency = marketEntry?.currency || 'Platinum';
  const marketRouteCanBeRendered = marketMentioned && marketAmount > 0
    && (!recipe || Number(recipe.blueprintCost) > 0 || !/blueprint/i.test(overrideText));
  // An exact, source-backed acquisition record outranks an older manual
  // override for the same DE object. Keep the path match strict: this is not
  // a name/category rule and cannot bleed into similarly named variants.
  const verifiedAggregateWiki = WIKI_VERIFIED_ACQUISITIONS.get(canonicalPath(dropIndexKey));
  if (verifiedAggregateWiki && overrideText && !resourceOverrideIsMarketOnly && !researchOverrideHasStructuredRoute) {
    return {
      sources: [{ type: 'non-drop', text: verifiedAggregateWiki.text, source: verifiedAggregateWiki.source }],
      recipe: recipe || null,
      wikiLink: { url: verifiedAggregateWiki.url, isDirect: true },
    };
  }
  // Some historical overrides intentionally record an unresolved lookup as
  // `UNKNOWN (...)`. That is audit evidence, not an acquisition route, and
  // must not be rendered as if it tells the player how to obtain the item.
  if (overrideText && !resourceOverrideIsMarketOnly && !researchOverrideHasStructuredRoute && !/^UNKNOWN\b/i.test(overrideText.trim())) {
    if (marketOverrideIsExportVerified) {
      return {
        sources: [{ type: 'non-drop', text: overrideText, source: 'DE ExportRecipes exact blueprint cost + DE Market price' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
    if (marketRouteCanBeRendered) {
      const marketText = recipe?.blueprintCost > 0 && !overrideForbidsBlueprint
        ? `Purchase the blueprint from the Market for ${Number(recipe.blueprintCost).toLocaleString()} Credits, or buy the complete item for ${marketAmount.toLocaleString()} ${marketCurrency}.`
        : `Purchase the complete item from the in-game Market for ${marketAmount.toLocaleString()} ${marketCurrency}.`;
      return {
        sources: [{ type: 'non-drop', text: marketText, source: 'DE ExportRecipes exact blueprint cost + DE Market price' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
    if (baroOverrideHasStructuredRoute) {
      return {
        sources: [{ type: 'non-drop', text: "Sold by Baro Ki'Teer.", source: 'Warframe Wiki Baro acquisition index' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
    if (vendorOverrideHasStructuredRoute) {
      return {
        sources: [{ type: 'non-drop', text: `Sold by ${structuredVendorsForOverride.join(' and ')}.`, source: 'Warframe Wiki vendor acquisition index' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
    return { sources: [{ type: 'override', text: overrideText, source: 'manual override' }], recipe: recipe || null, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const exaltedFrames = exaltedWeaponIndex?.get(canonicalPath(dropIndexKey));
  if (exaltedFrames?.length) {
    return {
      sources: [{ type: 'non-drop', text: `Granted with ${exaltedFrames.join(' or ')}.`, source: 'DE export' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const norm = canonicalPath(dropIndexKey);
  const displayLower = normalizeDisplayName(displayName);
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

  const verifiedDisposition = WIKI_VERIFIED_DISPOSITIONS.get(canonicalPath(dropIndexKey));
  if (verifiedDisposition) {
    return {
      sources: [{ type: 'status', text: verifiedDisposition.text, source: verifiedDisposition.source || 'Verified disposition' }],
      wikiLink: { url: verifiedDisposition.url, isDirect: true },
    };
  }

  if (verifiedAggregateWiki) {
    return {
      sources: [{ type: 'non-drop', text: verifiedAggregateWiki.text, source: verifiedAggregateWiki.source }],
      wikiLink: { url: verifiedAggregateWiki.url, isDirect: true },
    };
  }

  // Explicit Wiki acquisition prose is more useful than a generic recipe
  // summary because it can explain how the blueprint is obtained or unlocked.
  const wikiPageAcquisition = wikiPageAcquisitionIndex?.get(displayLower) || bundledWikiPageIndex.get(displayLower);
  if (wikiPageAcquisition?.text) {
    if (['Disposition', 'Verification status'].includes(wikiPageAcquisition.section)) {
      return {
        sources: [{ type: 'status', text: wikiPageAcquisition.text, source: wikiPageAcquisition.section === 'Disposition' ? 'Warframe Wiki disposition' : 'Warframe Wiki verification status' }],
        wikiLink: wikiPageAcquisition.url
          ? { url: wikiPageAcquisition.url, isDirect: true }
          : getWikiLink(dropIndexKey, displayName),
      };
    }
    return {
      sources: [{ type: 'non-drop', text: wikiPageAcquisition.text, source: wikiPageAcquisition.source || 'Warframe Wiki' }],
      wikiLink: wikiPageAcquisition.url
        ? { url: wikiPageAcquisition.url, isDirect: true }
        : getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiDescriptionAcquisition = bundledWikiDescriptionIndex.get(canonicalPath(dropIndexKey));
  const wikiDescriptionText = typeof wikiDescriptionAcquisition === 'string' ? wikiDescriptionAcquisition : wikiDescriptionAcquisition?.text;
  if (wikiDescriptionText) {
    return {
      sources: [{ type: 'non-drop', text: wikiDescriptionText, source: wikiDescriptionAcquisition?.source || 'Warframe Wiki Repo (WFCD exact uniqueName description)' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  // Some craftable resources are represented in the Wiki vendor data by the
  // blueprint's inventory name (for example "Adramal Alloy X20 Blueprint"),
  // so check those concrete acquisition records before falling back to the
  // generic recipe description.
  const vendorKeys = [
    displayLower,
    `${displayLower} blueprint`,
    `${displayLower} x20 blueprint`,
  ];
  const vendorKey = vendorKeys.find((key) => wikiVendorIndex?.has(key));
  const vendors = vendorKey ? wikiVendorIndex.get(vendorKey) : null;
  if (vendors?.length) {
    return {
      sources: [{ type: 'non-drop', text: vendorKey === displayLower ? `Sold by ${vendors.join(' and ')}.` : `Blueprint sold by ${vendors.join(' and ')}.`, source: 'Warframe Wiki' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  // Apply only after concrete Wiki/vendor evidence has had a chance to win.
  // For example, Focus lens paths have a stable DE classification, but a
  // specific vendor record is more useful than the broad Focus-tree label.
  const nonDrop = NON_DROP_PATTERNS.find((p) => p.test(dropIndexKey));
  if (nonDrop) {
    return { sources: [{ type: 'non-drop', text: nonDrop.text, source: 'DE export path rule' }], wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const marketPrice = marketIndex?.get(canonicalPath(dropIndexKey));
  if (INCARNON_GENESIS_PATTERN.test(canonicalPath(dropIndexKey) || '')) {
    return {
      sources: [{
        type: 'non-drop',
        text: "Earn this Incarnon Genesis from the rotating Steel Path Circuit reward choices after unlocking The Duviri Paradox, Angels of the Zariman, and Steel Path. Alternatively, purchase it from Cavalero in the Chrysalith for 120 Platinum, once per adapter.",
        source: 'Warframe Wiki Incarnon Genesis acquisition rules',
      }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }
  // A direct Market price is not the most useful route when the same exact
  // object has a structured Clan-research record; let that record render the
  // lab, prerequisites, costs, and research materials below.
  if (marketPrice && !wikiResearchIndex?.has(displayLower)) {
    const amount = typeof marketPrice === 'number' ? marketPrice : marketPrice.amount;
    const currency = typeof marketPrice === 'number' ? 'Platinum' : marketPrice.currency;
    return {
      sources: [{ type: 'non-drop', text: `Sold in the in-game Market for ${Number(amount).toLocaleString()} ${currency}.`, source: 'DE export' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const bundleName = bundleIndex?.get(canonicalPath(dropIndexKey));
  if (bundleName && !wikiResearchIndex?.has(displayLower)) {
    return {
      sources: [{ type: 'non-drop', text: `Sold as part of the "${bundleName}" Market bundle.`, source: 'DE export' }],
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
    return { sources: [{ type: 'non-drop', text, source: 'DE export' }], wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const baroRelicKey = displayLower?.endsWith(' relic') ? displayLower : `${displayLower} relic`;
  if (wikiBaroIndex?.has(displayLower) || wikiBaroIndex?.has(baroRelicKey)
    || bundledWikiBaroIndex.has(displayLower) || bundledWikiBaroIndex.has(baroRelicKey)
    || BARO_LOGIN_MUSIC_PATTERN.test(canonicalPath(dropIndexKey) || '')) {
    return {
      sources: [{ type: 'non-drop', text: "Sold by Baro Ki'Teer.", source: 'Warframe Wiki' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiSigilCategory = wikiSigilIndex?.get(displayLower);
  if (wikiSigilCategory) {
    return {
      sources: [{ type: 'non-drop', text: `Listed under ${wikiSigilCategory} on the Warframe wiki.`, source: 'Warframe Wiki' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const variantAcquisition = VARIANT_ACQUISITION_PATTERNS.find((p) => p.test(dropIndexKey, displayName));
  if (variantAcquisition) {
    return {
      sources: [{ type: 'non-drop', text: variantAcquisition.text, source: 'DE export variant identity' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  if (alwaysAvailableIndex?.has(canonicalPath(dropIndexKey))) {
    return {
      sources: [{ type: 'non-drop', text: 'Available directly in the in-game customization menu.', source: 'DE export' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const tennoGen = wikiTennoGenIndex?.get(displayLower);
  if (tennoGen) {
    const price = tennoGen.pcPrice || tennoGen.consolePrice;
    const priceText = price ? ` for ${price}` : '';
    return {
      sources: [{ type: 'non-drop', text: `TennoGen skin - purchased via Steam Workshop/console store${priceText}.`, source: 'Warframe Wiki' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const relicState = relicStateIndex?.get(canonicalPath(dropIndexKey));
  if (relicState?.vaultedAt || relicState?.vaulted === true) {
    return {
      sources: [{ type: 'non-drop', text: 'Vaulted relic; no active drop source is listed in the current export.', source: 'DE export' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiResearch = wikiResearchIndex?.get(displayLower);
  if (wikiResearch) {
    return {
      sources: [{ type: 'non-drop', text: formatWikiResearch(wikiResearch), source: 'Warframe Wiki' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiResource = wikiResourceIndex?.get(displayLower) || bundledWikiResourceIndex.get(displayLower);
  if (wikiResource?.location) {
    const kind = [wikiResource.rarity, wikiResource.type].filter(Boolean).join(' ');
    return {
      sources: [{ type: 'non-drop', text: `Found at ${wikiResource.location}${kind ? ` (${kind}).` : '.'}`, source: 'Warframe Wiki' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiBlueprint = wikiBlueprintIndex?.get(displayLower);
  if (wikiBlueprint) {
    return {
      sources: [{ type: 'non-drop', text: formatWikiBlueprint(wikiBlueprint), source: 'Warframe Wiki' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  // This is a verified DE vendor relationship, but it is intentionally later
  // than the more specific resource/blueprint records above so adding the
  // vendor export cannot replace a concrete location already known for an
  // item such as Ignia or Maphica.
  const exportVendorRoutes = exportVendorIndex?.get(canonicalPath(dropIndexKey));
  if (exportVendorRoutes?.length) {
    return {
      sources: exportVendorRoutes.map((route) => ({ type: 'non-drop', ...route })),
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const glyph = glyphSupplementIndex?.get(canonicalPath(dropIndexKey));
  if (glyph) {
    const details = [];
    if (glyph.promo_code) details.push(`Promo code: ${glyph.promo_code}.`);
    if (glyph.markdown) details.push(glyph.markdown);
    if (glyph.twitch) details.push(`Twitch: ${glyph.twitch}`);
    if (glyph.youtube) details.push(`YouTube: ${glyph.youtube}`);
    if (glyph.twitter) details.push(`Twitter: ${glyph.twitter}`);
    if (glyph.discord) details.push(`Discord: ${glyph.discord}`);
    if (glyph['other-site']) details.push(`More information: ${glyph['other-site']}`);
    return {
      sources: [{ type: 'non-drop', text: details.length ? `Creator Glyph. ${details.join(' ')}` : 'Creator Glyph. See the linked creator source for availability.', source: 'browse.wf' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  // A direct export component relationship is concrete evidence only when
  // the parent itself resolves to a concrete acquisition route. Resolve the
  // parent with component propagation disabled to avoid circular inheritance.
  const component = exportComponentIndex?.get(canonicalPath(dropIndexKey));
  if (component) {
    const parentInfo = getAcquisitionInfo(
      component.parentUniqueName,
      component.parentDisplayName,
      dropIndex,
      overridesData,
      recipeResultIndex,
      marketIndex,
      bundleIndex,
      syndicateIndex,
      wikiSigilIndex,
      wikiVendorIndex,
      wikiTennoGenIndex,
      wikiBaroIndex,
      exportVendorIndex,
      alwaysAvailableIndex,
      glyphSupplementIndex,
      wikiBlueprintIndex,
      wikiResearchIndex,
      relicStateIndex,
      wikiResourceIndex,
      wikiPageAcquisitionIndex,
      wikiAcquisitionStatusIndex,
      exaltedWeaponIndex,
      undefined,
    );
    const parentSource = parentInfo.sources?.find((source) => source?.text && source.type !== 'status');
    if (parentSource) {
      return {
        sources: [{
          type: 'non-drop',
          text: `Included with ${component.parentDisplayName}. ${parentSource.text}`,
          source: `DE export additionalItems relationship + ${parentSource.source || 'parent acquisition record'}`,
        }],
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
  }

  // Recipe/build details are a fallback when no concrete blueprint, vendor,
  // Market, bundle, drop, or component-parent route is available. Keep the
  // recipe on the result so the drawer can show costs, but do not let those
  // costs replace the actual acquisition route when one is known.
  if (recipe || isCraftable(dropIndexKey)) {
    return {
      sources: [{
        type: 'non-drop',
        source: 'DE export',
        text: recipe
          ? formatRecipeAcquisition(recipe)
          : 'Craftable in the Foundry; detailed recipe data is unavailable in the current export.',
      }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiStatus = wikiAcquisitionStatusIndex?.get(canonicalPath(dropIndexKey));
  if (wikiStatus) {
    const text = wikiStatus.exportDisposition || (wikiStatus.pageFound
      ? 'A Warframe Wiki page exists, but its current page audit found no explicit structured acquisition section.'
      : 'No matching Warframe Wiki page was found, and no independent acquisition route is identified in the available export data.');
    return {
      sources: [{ type: 'status', text, source: wikiStatus.exportDisposition ? 'DE export status' : 'Acquisition audit' }],
      wikiLink: wikiStatus.url
        ? { url: wikiStatus.url, isDirect: true }
        : getWikiLink(dropIndexKey, displayName),
    };
  }

  return { sources: [], wikiLink: getWikiLink(dropIndexKey, displayName) };
}
