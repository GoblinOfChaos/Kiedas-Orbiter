import { getItemDrops, getItemRecipe, getWikiLink, isCraftable, WARFRAME_ACQUISITIONS } from './acquisitionData.js';

// Keep compact Wiki maps available in the frontend as a last-resort fallback.
// The AppImage also ships these JSON files as Tauri resources, but a card can
// be opened before asynchronous resource injection reaches the context.
import bundledWikiBaroAcquisition from '../../src-tauri/data/assets/data/wiki-baro-acquisition.json';
import bundledWikiResourceAcquisition from '../../src-tauri/data/assets/data/wiki-resources-acquisition.json';
import bundledWikiResourceSources from '../../src-tauri/data/assets/data/wiki-resource-sources.json';
import bundledWarframeAcquisition from '../../src-tauri/data/assets/data/warframe-items-acquisition.json';
import bundledWikiPageAcquisition from '../../src-tauri/data/assets/data/wiki-page-acquisition.json';
import bundledWikiDescriptionAcquisition from '../../src-tauri/data/assets/data/wiki-description-acquisition.json';
import bundledPrimeRelicDrops from '../../src-tauri/data/assets/data/wiki-prime-relic-drops.json';
import bundledWikiExtractorAcquisition from '../../src-tauri/data/assets/data/wiki-extractor-acquisition.json';
import { WIKI_VERIFIED_ACQUISITIONS, WIKI_VERIFIED_DISPOSITIONS } from './wikiVerifiedAcquisitions.js';
import { normalizeRelicSources } from './relicSources.js';
import { bareAcquisitionCategoryKey, getAcquisitionTextAuditCounts, isBareAcquisitionCategory, toCurrentSourceSentences } from './acquisitionText.js';
import { debug } from './logging/logger.js';

const bundledWikiBaroIndex = new Map(Object.keys(bundledWikiBaroAcquisition).map((name) => [name.toLowerCase().trim(), true]));
// wiki-resources-acquisition.json stores each entry as a plain location
// string, but the lookup below reads `wikiResource.location` (the shape
// buildWikiResourceIndex's richer object-based source uses) - without this
// normalization every bundled string entry silently failed the `.location`
// check and fell through as if no data existed, for any resource whose
// richer index lacked a matching entry.
const bundledWikiResourceIndex = new Map(Object.entries(bundledWikiResourceAcquisition).map(([name, entry]) => [name.toLowerCase().trim(), typeof entry === 'string' ? { location: entry } : entry]));
const bundledWikiResourceSourcesIndex = new Map(Object.entries(bundledWikiResourceSources).map(([name, entry]) => [name.toLowerCase().trim(), entry]));
const bundledWikiPageIndex = new Map(Object.entries(bundledWikiPageAcquisition).map(([name, entry]) => [name.toLowerCase().trim(), entry]));
const bundledWikiExtractorIndex = new Map(Object.entries(bundledWikiExtractorAcquisition).map(([name, entry]) => [name.toLowerCase().trim(), entry]));
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
const bundledWarframeAcquisitionIndex = new Map((Array.isArray(bundledWarframeAcquisition) ? bundledWarframeAcquisition : []).map((entry) => [canonicalPath(entry?.uniqueName), entry]));

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

// The Warframe/weapon acquisition table contains concise, verified route
// fragments such as "Market (35,000 Credits) or Simaris". Keep each fragment
// as its own source row without inventing a new route description. Commas are
// never route separators: they commonly belong to prices or to the continuation
// of the same sentence ("..., although ...").
export function splitAcquisitionRouteText(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  const routes = [];
  let start = 0;
  let depth = 0;
  const text = value.trim();
  const push = (end) => {
    const route = text.slice(start, end).trim().replace(/^[,;]+|[,;]+$/g, '').trim();
    if (route) routes.push(route);
    start = end;
  };
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')' && depth > 0) depth -= 1;
    if (depth !== 0) continue;
    if (/[.!?]/.test(text[i]) && /\s/.test(text[i + 1] || '')) {
      push(i + 1);
      continue;
    }
    const rest = text.slice(i);
    const separator = rest.match(/^(?:\s+or\s+|\s*;\s*|\s*\/\s+)/i);
    if (separator) {
      push(i);
      i += separator[0].length - 1;
      start = i + 1;
      continue;
    }
  }
  push(text.length);
  return routes.map((route) => route
    .replace(/^(?:or|and)\b[:.,; ]*/i, '')
    .trim())
    .filter((route) => route && !/^[^:]{1,48}:$/.test(route));
}

function routeKey(text) {
  const normalized = normalizeDisplayName(text);
  const marketPrice = normalized.match(/\bmarket\b[\s\S]*?(\d[\d,]*)\s*(credits|platinum)\b/i)
    || normalized.match(/(\d[\d,]*)\s*(credits|platinum)\b[\s\S]*?\bmarket\b/i);
  if (marketPrice) return `market:${marketPrice[2].toLowerCase()}:${Number(marketPrice[1].replaceAll(',', ''))}`;
  if (/\bmarket\b/i.test(normalized)) return 'market';
  if (/simaris/i.test(normalized)) return 'simaris';
  if (/conclave/i.test(normalized)) return 'conclave';
  if (/dojo|clan/i.test(normalized)) {
    const lab = normalized.match(/\(([^)]+)\)/)?.[1] || '';
    return `dojo:${lab}`;
  }
  if (/quest/i.test(normalized)) return `quest:${normalized.replace(/.*?quest(?:\s+reward|\s*:)?\s*/i, '')}`;
  return normalized.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function cleanSourceRows(sources) {
  const cleaned = (sources || []).flatMap((source) => {
    if (typeof source?.text !== 'string') return [source];
    const text = toCurrentSourceSentences(source.text).join(' ');
    return text ? [{ ...source, text }] : [];
  });
  // A compact table can say only "Invasions" while the same drawer also has
  // a verified sentence naming the reward. Keep the sentence and remove the
  // redundant category row so the first route answers "how" immediately.
  const fullerCategories = new Set();
  for (const source of cleaned) {
    if (isBareAcquisitionCategory(source?.text)) continue;
    for (const category of ['invasions', 'syndicate', 'glyph', 'sigil', 'simaris']) {
      const pattern = category === 'invasions' ? /\binvasion(?:s)?\b/i : new RegExp(`\\b${category}\\b`, 'i');
      if (pattern.test(source?.text || '')) fullerCategories.add(category);
    }
  }
  return cleaned.filter((source, index) => {
    if (!isBareAcquisitionCategory(source?.text)) return true;
    const category = bareAcquisitionCategoryKey(source.text);
    return !fullerCategories.has(category);
  });
}

function getBundleInfo(bundleIndex, uniqueName) {
  const value = bundleIndex?.get(canonicalPath(uniqueName));
  if (!value) return null;
  return typeof value === 'string' ? { name: value, amount: null, currency: null, available: true } : value;
}

function formatArmorBundleOverride(rawText, bundleIndex, uniqueName, marketEntry) {
  const searchableText = typeof rawText === 'string' ? rawText.replaceAll('_', ' ') : '';
  if (!searchableText || !/\bmarket\b/i.test(searchableText) || !/\b(?:armor|armour)\b/i.test(searchableText)) return null;
  const bundle = getBundleInfo(bundleIndex, uniqueName);
  if (bundle?.available === false) return null;
  if (!bundle && !(marketEntry?.amount > 0)) return null;
  const individual = marketEntry?.amount > 0
    ? `Purchased individually from the Market for ${Number(marketEntry.amount).toLocaleString()} ${marketEntry.currency || 'Platinum'}.`
    : null;
  const bundleText = bundle?.amount > 0
    ? `Also available as the "${bundle.name}" armor bundle for ${Number(bundle.amount).toLocaleString()} ${bundle.currency || 'Platinum'}.`
    : `Also available from the Market as an armor bundle${bundle?.name ? ` ("${bundle.name}")` : ''}.`;
  return [individual, bundleText].filter(Boolean).join(' ');
}

export function getAcquisitionInfo(...args) {
  const result = getAcquisitionInfoRaw(...args);
  return { ...result, sources: cleanSourceRows(result.sources) };
}

function findRecipeByBlueprint(recipeResultIndex, blueprintUniqueName) {
  const target = canonicalPath(blueprintUniqueName);
  const direct = recipeResultIndex?.blueprintResultIndex?.get(target);
  if (direct) return direct;
  if (!target || !recipeResultIndex?.values) return null;
  for (const recipe of recipeResultIndex.values()) {
    if (canonicalPath(recipe?.blueprintUniqueName) === target && recipe?.resultType) {
      return recipe;
    }
  }
  return null;
}

function isMainBlueprintUniqueName(uniqueName) {
  return /^\/Lotus\/Types\/Recipes\/(?:WarframeRecipes|Weapons|Drones)\/[^/]+Blueprint$/.test(canonicalPath(uniqueName) || '')
    && !/(?:Chassis|Neuroptics|Systems|Helmet|Harness|Wings)Blueprint$/i.test(uniqueName || '');
}

function isWarframeOrWeaponUniqueName(uniqueName) {
  return /\/Powersuits\/|\/Weapons\//.test(canonicalPath(uniqueName) || '');
}

function isExtractorUniqueName(uniqueName) {
  return /^\/Lotus\/Types\/Ship\/(?:AdvancedResourceDrone|AdvancedUcResourceDrone)$/.test(canonicalPath(uniqueName) || '');
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

// Maps a component's uniqueName leaf suffix (e.g. "ChassisComponent",
// "Barrel") to the exact key wiki-prime-relic-drops.json uses for that part
// under a Prime item's `Parts`. Warframe components use a "*Component" DE
// naming convention the wiki data doesn't; everything else (weapon parts)
// already matches 1:1.
const PRIME_PART_KEY_ALIASES = {
  chassiscomponent: 'Chassis Blueprint',
  systemscomponent: 'Systems Blueprint',
  neuropticscomponent: 'Neuroptics Blueprint',
  harnesscomponent: 'Harness Blueprint',
  wingscomponent: 'Wings Blueprint',
  kubrowcollarblueprint: 'Kubrow Collar Blueprint',
  blueprintcomponent: 'Blueprint',
};

// warframe-items-acquisition.json (the app's primary drop-source dataset)
// doesn't cover most Prime weapon/Warframe *component* blueprints - so those
// fell through to a hand-written override that said "Void Relics opened
// during Void Fissure missions" for every one of them, without ever naming
// which relic. wiki-prime-relic-drops.json (pulled from the Warframe Wiki's
// own Module:Void/data) has the real answer: exact relics and their
// rarity tier per part, for every Prime item. Build a lookup keyed by
// "<item name leaf, lowercased><part key, lowercased>" so a DE uniqueName
// like ".../WeaponParts/AcceltraPrimeBarrel" or
// ".../WarframeRecipes/TrinityPrimeChassisComponent" can resolve directly.
function buildPrimeRelicDropIndex() {
  const index = new Map();
  for (const [primeName, entry] of Object.entries(bundledPrimeRelicDrops)) {
    const leaf = primeName.replace(/\s+Prime$/i, '').replace(/\s+/g, '').toLowerCase();
    for (const [partKey, partData] of Object.entries(entry.Parts || {})) {
      if (!partKey) continue;
      const normalizedPart = partKey.replace(/\s+/g, '').toLowerCase();
      const drops = Object.entries(partData.Drops || {}).map(([relicName, rarity]) => ({ relicName, rarity }));
      if (drops.length === 0) continue;
      index.set(`${leaf}|${normalizedPart}`, { drops, ducatValue: partData.DucatValue, vaulted: entry.IsVaulted, primeName });
    }
  }
  return index;
}

const primeRelicDropIndex = buildPrimeRelicDropIndex();

// Parses a DE component uniqueName leaf into { itemLeaf, partKey } for
// lookup in primeRelicDropIndex. Returns null for anything that isn't a
// recognizable "<Item>Prime<Part>" component path.
function parsePrimeComponentLeaf(dropIndexKey) {
  if (typeof dropIndexKey !== 'string') return null;
  if (!/\/(WeaponParts|WarframeRecipes)\//.test(dropIndexKey)) return null;
  const leaf = dropIndexKey.split('/').pop() || '';
  const primeIdx = leaf.indexOf('Prime');
  if (primeIdx <= 0) return null;
  const itemLeaf = leaf.slice(0, primeIdx).toLowerCase();
  let partSuffix = leaf.slice(primeIdx + 5); // past "Prime"
  const normalizedSuffix = partSuffix.replace(/\s+/g, '').toLowerCase();
  const partKey = PRIME_PART_KEY_ALIASES[normalizedSuffix] || partSuffix;
  return { itemLeaf, partKey: partKey.replace(/\s+/g, '').toLowerCase() };
}

export function buildRecipeResultIndex(exportData) {
  const index = new Map();
  const blueprintIndex = new Map();
  const resultRecipes = new Map();
  index.blueprintResultIndex = blueprintIndex;
  index.resultRecipes = resultRecipes;
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
    // Keep a reverse identity for every DE Warframe/weapon recipe, including
    // zero-ingredient conversion/finalization recipes that are intentionally
    // excluded from the craftable result map below. Their blueprint parts
    // still need to inherit a verified Market/vendor route from the result.
    if (recipe?.resultType && /^\/Lotus\/Types\/Recipes\/(?:WarframeRecipes|Weapons)\//.test(blueprintName)) {
      blueprintIndex.set(canonicalPath(blueprintName), {
        resultType: canonicalPath(recipe.resultType),
        blueprintUniqueName: canonicalPath(blueprintName),
        blueprintCost: recipe.excludeFromMarket ? null : recipe.creditsCost,
        blueprintPlatinumCost: recipe.excludeFromMarket ? null : recipe.platinumCost,
        blueprintMarketEligible: recipe.excludeFromMarket !== true,
        excludeFromMarket: recipe.excludeFromMarket === true,
        buildCost: recipe.buildPrice,
        buildTime: recipe.buildTime,
        rushCost: recipe.skipBuildTimePrice,
        blueprintOnly: false,
        ingredients: [],
      });
    }
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
      const indexedRecipe = {
        resultType: canonicalPath(recipe.resultType),
        blueprintUniqueName: canonicalPath(blueprintName),
        blueprintCost: recipe.excludeFromMarket ? null : recipe.creditsCost,
        blueprintPlatinumCost: recipe.excludeFromMarket ? null : recipe.platinumCost,
        blueprintMarketEligible: recipe.excludeFromMarket !== true,
        excludeFromMarket: recipe.excludeFromMarket === true,
        buildCost: recipe.buildPrice,
        buildTime: recipe.buildTime,
        rushCost: recipe.skipBuildTimePrice,
        blueprintOnly,
        ingredients,
      };
      index.set(canonicalPath(recipe.resultType), indexedRecipe);
      blueprintIndex.set(canonicalPath(blueprintName), indexedRecipe);
      const candidates = resultRecipes.get(canonicalPath(recipe.resultType)) || [];
      candidates.push(indexedRecipe);
      resultRecipes.set(canonicalPath(recipe.resultType), candidates);
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
  const blueprintCost = recipe?.blueprintMarketEligible === false ? null : formatCredits(recipe?.blueprintCost);
  const blueprintPlatinumCost = recipe?.blueprintMarketEligible === false ? null : recipe?.blueprintPlatinumCost;
  const buildCost = formatCredits(recipe?.buildCost);
  if (blueprintCost) details.push(`Blueprint: ${blueprintCost}.`);
  if (blueprintPlatinumCost > 0) details.push(`Blueprint: ${Number(blueprintPlatinumCost).toLocaleString()} Platinum.`);
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
// A Map, not a Set: `alwaysAvailable: true` does not mean "no acquisition
// needed" by itself. 151 real ExportCustoms/ExportFlavour entries (mostly
// Warframe Agile/Noble Animation Sets) also carry a `requirement` field - a
// separate item (usually an "Unlock..." token) that must be obtained first
// before this one becomes selectable in the customization menu. The value
// stored here is that requirement uniqueName, or null when there truly is
// none - the consumer in getAcquisitionInfo uses this to tell "genuinely
// always available" apart from "available once you've unlocked it".
export function buildAlwaysAvailableIndex(exportData) {
  const index = new Map();
  for (const tableName of ['ExportCustoms', 'ExportFlavour']) {
    const table = exportData?.[tableName];
    if (!table || typeof table !== 'object') continue;
    for (const [uniqueName, entry] of Object.entries(table)) {
      if (entry?.alwaysAvailable === true) index.set(canonicalPath(uniqueName), entry.requirement || null);
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
    const bundleInfo = {
      name: bundleName,
      amount: Number(bundle.platinumCost) > 0 ? Number(bundle.platinumCost) : null,
      currency: Number(bundle.platinumCost) > 0 ? 'Platinum' : null,
      available: bundle.excludeFromMarket !== true,
    };
    for (const component of bundle.components) {
      const key = canonicalPath(component?.typeName);
      if (!key) continue;
      const existing = index.get(key);
      if (!existing || (!existing.amount && bundleInfo.amount) || (!existing.available && bundleInfo.available)) {
        index.set(key, bundleInfo);
      }
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
    const rules = [
      // Deimos / Necralisk
      [/\/Deimos\/ConservationRewardsManifest$/, 'Conservation vendors (The Business, Master Teasonai, Son) in Deimos'],
      [/\/Deimos\/EntratiFragmentVendorProductsManifest$/, 'Entrati Fragment vendor in the Necralisk'],
      [/\/Deimos\/(FishmongerVendorManifest|HivemindCommisionsManifestFishmonger)$/, 'Daughter (Fishmonger) in the Necralisk'],
      [/\/Deimos\/HivemindCommisionsManifestNecromech$/, "Father (Necramech shop) in the Necralisk"],
      [/\/Deimos\/(PetVendorManifest|HivemindCommisionsManifestPetVendor)$/, 'Son (Predasite/Vulpaphyla) in the Necralisk'],
      [/\/Deimos\/(ProspectorVendorManifest|HivemindCommisionsManifestProspector)$/, 'Grandmother (Prospector) in the Necralisk'],
      [/\/Deimos\/(HivemindTokenVendorManifest|HivemindCommisionsManifestTokenVendor)$/, 'Loid in the Necralisk'],
      [/\/Deimos\/HivemindCommisionsManifestWeaponsmith$/, 'Mother (Weaponsmith) in the Necralisk'],
      [/\/Deimos\/OtakLastWishManifest$/, "Otak's Last Wish offerings in the Necralisk"],
      // Duviri
      [/\/Duviri\/AcrithisEnigmaGyrumShopManifest$/, "Acrithis's Enigma shop in Duviri"],
      [/\/Duviri\/AcrithisKullervoShopManifest$/, "Acrithis's Kullervo shop in Duviri"],
      [/\/Duviri\/AcrithisVendorManifest$/, 'Acrithis in Duviri'],
      [/\/Duviri\/DrifterWeaponsVendorManifest$/, 'Drifter Weapons vendor in Duviri'],
      // Entrati Labs (Cavia)
      [/\/EntratiLabs\/EntratiLabsArcaneShopManifest$/, 'Cavia Arcane shop in the Entrati Labs'],
      [/\/EntratiLabs\/EntratiLabsCommisionsManifest$/, 'Cavia Commissions vendor in the Entrati Labs'],
      [/\/EntratiLabs\/EntratiLabsDisruptionVendorManifest$/, 'Cavia Disruption vendor in the Entrati Labs'],
      [/\/EntratiLabs\/EntratiLabVendorManifest$/, 'Cavia vendor in the Entrati Labs'],
      // Events
      [/\/Events\/AmbulasEventVendorManifest$/, 'Ambulas Reborn event vendor'],
      [/\/Events\/DeimosHalloweenVendorManifest$/, 'Naberus event vendor in the Necralisk'],
      [/\/Events\/DuviriMurmurInvasionVendorManifest$/, 'Duviri Murmur Invasion event vendor'],
      [/\/Events\/DuviriMurmurPostEventVendorManifest$/, 'Duviri Murmur post-event vendor'],
      [/\/Events\/EntratiEventVendorManifest$/, 'Entrati event vendor'],
      [/\/Events\/FortunaValentinesVendorManifest$/, "Fortuna Valentine's event vendor"],
      [/\/Events\/JadeShadowsEventClanManifest$/, 'Jade Shadows event Clan vendor'],
      [/\/Events\/JadeShadowsEventVendorManifest$/, 'Jade Shadows event vendor'],
      [/\/Events\/MechSurvivalVendorManifest$/, 'Mech Survival event vendor'],
      [/\/Events\/RadioLegionIntermission\d+VendorManifest$/, 'Nora Nightwave Cred offerings'],
      [/\/Events\/RadioLegionDummyManifest$/, 'Nora Nightwave Cred offerings'],
      [/\/Events\/ScarletSpearManifest$/, 'Scarlet Spear operation vendor'],
      [/\/Events\/ShadowgrapherEventVendorManifest$/, 'Shadowgrapher event vendor'],
      [/\/Events\/WaterFightVendorManifest$/, 'Water Fight event vendor'],
      // Focus schools
      [/\/FocusSchools\/MaduraiVendorManifest$/, 'Madurai Focus vendor'],
      [/\/FocusSchools\/NaramonVendorManifest$/, 'Naramon Focus vendor'],
      [/\/FocusSchools\/UnairuVendorManifest$/, 'Unairu Focus vendor'],
      [/\/FocusSchools\/VazarinVendorManifest$/, 'Vazarin Focus vendor'],
      [/\/FocusSchools\/ZenurikVendorManifest$/, 'Zenurik Focus vendor'],
      // Game modes / Hubs
      [/\/GameModes\/AscensionVendorManifest$/, 'Conclave Ascension vendor'],
      [/\/Hubs\/AspirantZorbaVendorManifest$/, 'Zorba in Fortuna'],
      [/\/Hubs\/EliteAlertVendorManifest$/, 'Arbitration Honors vendor (Rude Zuud, Void Relay)'],
      [/\/Hubs\/GuildAdvertisementVendorManifest$/, 'Clan recruitment advertisement vendor'],
      [/\/Hubs\/HunhowVendorManifest$/, 'Hunhow vendor'],
      [/\/Hubs\/IronwakeDondaVendorManifest$/, 'Donda in Iron Wake'],
      [/\/Hubs\/IronwakeFlawedModVendorManifest$/, 'Flawed Mod vendor in Iron Wake'],
      [/\/Hubs\/PerrinSequenceWeaponVendorManifest$/, 'Perrin Sequence weapon vendor'],
      [/\/Hubs\/RailjackCrewMemberVendorManifest$/, 'Railjack Crew Member vendor'],
      [/\/Hubs\/RailjackResourcesCorpusVendorManifest$/, 'Railjack Corpus resource vendor'],
      [/\/Hubs\/RailjackResourcesGrineerVendorManifest$/, 'Railjack Grineer resource vendor'],
      [/\/Hubs\/TeshinHardModeVendorManifest$/, 'Teshin (Steel Path)'],
      // Kahl
      [/\/Kahl\/ChipperVendorManifest$/, "Chipper in Kahl's Garrison"],
      // Ostron (Cetus)
      [/\/Ostron\/ConservationRewardsManifest$/, 'Conservation vendors (The Business, Master Teasonai, Son) in Cetus'],
      [/\/Ostron\/FishmongerVendorManifest$/, 'Fisher Hai-Luk in Cetus'],
      [/\/Ostron\/FiveFatesVendorManifest$/, 'Five Fates offerings'],
      [/\/Ostron\/MaskSalesmanManifest$/, 'Mask Salesman in Cetus'],
      [/\/Ostron\/PetVendorManifest$/, 'Incubator Segment vendor (Kubrow/Kavat)'],
      [/\/Ostron\/ProspectorVendorManifest$/, 'Prospector in Cetus'],
      // Solaris (Fortuna)
      [/\/Solaris\/ConservationRewardsManifest$/, 'Conservation vendors in Orb Vallis'],
      [/\/Solaris\/DebtTokenVendorRepossessionsManifest$/, 'Debt-Bond Repossessions vendor in Fortuna'],
      [/\/Solaris\/DebtTokenVendorManifest$/, 'Debt-Bond vendor in Fortuna'],
      [/\/Solaris\/FishmongerVendorManifest$/, 'Fishmonger in Fortuna'],
      [/\/Solaris\/NightcapCosmeticVendorManifest$/, 'Nightcap cosmetic shop in Fortuna'],
      [/\/Solaris\/NightcapVendorManifest$/, 'Nightcap in Fortuna'],
      [/\/Solaris\/ProspectorVendorManifest$/, 'Prospector in Fortuna'],
      [/\/Solaris\/SentientInvasionManifest$/, 'Sentient invasion event vendor'],
      // Tau / 1999 prequel
      [/\/Tau\/Prequel\/RoatheHonoriaVendorManifest$/, 'Roathe Honoria vendor'],
      [/\/Tau\/Prequel\/TriadAntiqueVendorManifest$/, 'Triad Antique vendor'],
      [/\/Tau\/Prequel\/TriadDecorationsVendorManifest$/, 'Triad Decorations vendor'],
      [/\/Tau\/Prequel\/TriadEventVendorManifest$/, 'Triad event vendor'],
      [/\/Tau\/Prequel\/TriadExchangeVendorManifest$/, 'Triad Exchange vendor'],
      [/\/Tau\/Prequel\/TriadPityVendorManifest$/, 'Triad Pity vendor'],
      // The Hex / 1999 Höllvania
      [/\/TheHex\/HexFurnitureVendorManifest$/, "The Hex furniture vendor in Höllvania"],
      [/\/TheHex\/HexScaldranWeaponsVendorManifest$/, "The Hex Scaldra weapons vendor in Höllvania"],
      [/\/TheHex\/InfestedLichWeaponVendorManifest$/, 'Infested Lich weapon vendor'],
      [/\/TheHex\/Nova1999ConquestShopManifest$/, '1999 Conquest shop'],
      [/\/TheHex\/Temple1999VendorManifest$/, "Temple vendor in Höllvania"],
      // Zariman
      [/\/Zariman\/ArchimedeanVendorManifest$/, 'Archimedean Yonta in the Zariman'],
      [/\/Zariman\/ArchimedeanVoidEclipseManifest$/, 'Archimedean Void Eclipse vendor'],
      [/\/Zariman\/ZarimanCommisionsManifestArchimedean$/, 'Zariman Archimedean Commissions vendor'],
      [/\/Zariman\/ZarimanWeaponsmithIncarnonShopManifest$/, "Cavalero's Incarnon Weaponsmith shop in the Zariman"],
    ];
    for (const [pattern, label] of rules) {
      if (pattern.test(manifestName)) return label;
    }
    return null;
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
  for (const [manifestName, vendor] of Object.entries(vendors)) {
    const label = vendorLabel(manifestName);
    // An unidentified vendor manifest is worse than no route at all: "Listed
    // by an in-game vendor" told the player nothing and blocked the resolver
    // from ever reaching a real wiki/recipe answer further down. Skip it so
    // this item falls through to a source that can actually name the vendor.
    if (!label) continue;
    for (const item of vendor?.items || []) {
      const key = canonicalPath(item?.storeItem);
      if (!key) continue;
      const route = {
        text: `Listed by ${label}.${priceText(item)}`,
        source: `DE export vendor manifest ${manifestName}`,
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

function isResourceItem(uniqueName, displayName, wikiResourceIndex, exportComponentIndex) {
  const key = normalizeDisplayName(displayName);
  if (bundledWikiResourceSourcesIndex.has(key) || wikiResourceIndex?.has(key) || bundledWikiResourceIndex.has(key)) return true;
  if (exportComponentIndex?.resourceCatalog?.has(canonicalPath(uniqueName))) return true;
  return /^\/Lotus\/Types\/(?:Items\/(?:MiscItems|Research|Gems|Fish|Resources)|Gameplay\/.*\/Resources|Game\/.*\/Resources)\//i.test(canonicalPath(uniqueName) || '');
}

function wikiDropMatchesDeRow(wikiDrop, deRow) {
  const wikiNodes = (wikiDrop.nodes || []).map((node) => normalizeDisplayName(String(node).split(',')[0])).filter(Boolean);
  const deLocation = normalizeDisplayName(deRow.location || '');
  const sameChance = wikiDrop.chance == null || deRow.chance == null || Math.abs(wikiDrop.chance - deRow.chance) < 0.000001;
  const deLocationName = deLocation.replace(/^.*\//, '').replace(/, rotation [a-d]$/i, '').trim();
  const sameNamedSource = wikiDrop.source && deLocationName === normalizeDisplayName(wikiDrop.source);
  const sameNode = wikiNodes.some((node) => deLocation.includes(node));
  return sameChance && (sameNamedSource || sameNode);
}

function formatWikiResourceDrop(wikiDrop) {
  const nodes = (wikiDrop.nodes || []).length ? ` — ${(wikiDrop.nodes || []).join('; ')}` : '';
  const rotation = wikiDrop.rotationOrTable ? `, ${wikiDrop.rotationOrTable}` : '';
  const quantity = wikiDrop.quantity != null ? `, ${wikiDrop.quantity}x` : '';
  return `${wikiDrop.source || wikiDrop.missionType}${rotation}${quantity}${nodes}`;
}

function normalizeResourceMissionRow(row) {
  const normalized = { ...row }
  const location = String(normalized.location || normalized.nodeName || '')
  const match = location.match(/^([^/]+)\/(.+?)(?:,\s*Rotation\s*([A-D]))?$/i)
  if (match) {
    normalized.region = normalized.region || match[1]
    normalized.nodeName = match[2]
    normalized.node = normalized.node || match[2]
    normalized.rotation = normalized.rotation || match[3] || null
  }
  return normalized
}

function buildResourceSources(displayName, wikiResource, deSources, supplementalSources = []) {
  const sources = [];
  if (wikiResource?.foundText) {
    sources.push({ type: 'non-drop', text: wikiResource.foundText, source: `Warframe Wiki (${wikiResource.url})`, resourceWiki: true });
  }

  const deRows = Array.isArray(deSources) ? deSources.map((source) => normalizeResourceMissionRow({ ...source })) : [];
  const wikiDrops = Array.isArray(wikiResource?.drops) ? wikiResource.drops : [];
  for (const deRow of deRows) {
    deRow.type = 'mission';
    deRow.nodeName = deRow.nodeName || deRow.location;
    deRow.source = deRow.source || 'warframe-items';
    const wikiDrop = wikiDrops.find((candidate) => wikiDropMatchesDeRow(candidate, deRow));
    if (!wikiDrop) continue;
    deRow.nodes = wikiDrop.nodes || [];
    deRow.missionType = wikiDrop.missionType || deRow.missionType;
    deRow.rotationOrTable = wikiDrop.rotationOrTable || deRow.rotationOrTable;
    deRow.resourceSource = wikiDrop.source || deRow.resourceSource;
  }
  sources.push(...normalizeRelicSources(deRows));

  const unmatchedWikiDrops = wikiDrops.filter((wikiDrop) => !deRows.some((deRow) => wikiDropMatchesDeRow(wikiDrop, deRow)));
  for (const wikiDrop of unmatchedWikiDrops) {
    sources.push({
      type: 'non-drop',
      text: formatWikiResourceDrop(wikiDrop),
      chance: wikiDrop.chance,
      quantity: wikiDrop.quantity,
      nodes: wikiDrop.nodes || [],
      missionType: wikiDrop.missionType,
      resourceSource: wikiDrop.source,
      source: `Warframe Wiki (${wikiResource.url})`,
      resourceWiki: true,
    });
  }
  for (const section of wikiResource?.otherSections || []) {
    sources.push({
      type: 'non-drop',
      text: section.text,
      section: section.heading,
      source: `Warframe Wiki (${wikiResource.url})`,
      resourceWiki: true,
    });
  }
  for (const supplemental of supplementalSources) {
    if (!sources.some((source) => source.text === supplemental.text && source.source === supplemental.source)) sources.push(supplemental);
  }
  return sources;
}

function getBundledResourceDrops(uniqueName) {
  const item = bundledWarframeAcquisitionIndex.get(canonicalPath(uniqueName));
  if (!Array.isArray(item?.drops)) return null;
  return item.drops.map((drop) => ({
    type: 'drop',
    location: drop.location,
    dropType: drop.type,
    rarity: drop.rarity,
    chance: drop.chance,
  }));
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
  const resourceCatalog = new Set();
  const excludedProducts = new Set(['ShipDecorations', 'Glyphs', 'Emotes', 'Flavour', 'ShipFeatures']);
  const primePart = /Prime.*?(Barrel|Receiver|Stock|Blade|Handle|Link|Gauntlet|Head|Helmet|Disc|Grip|Boot|Chain|String|UpperLimb|LowerLimb|Carapace|Cerebrum|Systems|Chassis|Neuroptics|Guard|Hilt|Ornament|Stars|Holster|Pouch|Band|Blueprint)(Component)?$/i;
  for (const [uniqueName, entry] of Object.entries(exportData?.ExportResources || {})) {
    if (!entry || excludedProducts.has(entry.productCategory)) continue;
    if (/\/ShipDecos\/|\/Glyphs\/|\/GlyphBoxes\/|\/Emotes\/|VoidProjection|\/SongItem|\/PhotoboothTile|\/ShipFeatureItems\/|\/NavigationFeatureItem\//i.test(`${entry.parentName || ''}${uniqueName}`)) continue;
    if (primePart.test(uniqueName.split('/').pop() || '')) continue;
    resourceCatalog.add(canonicalPath(uniqueName));
  }
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
  index.resourceCatalog = resourceCatalog;
  return index;
}

// MonitoringContext.jsx and MirroredMonitoringProvider.jsx each built these
// same 18 indexes independently (one `useMemo` per index, same builder, same
// exportData field), which is exactly the "loader parity" drift risk: any
// runtime consumer that skips one - the item-completeness harness did,
// passing 17 hardcoded nulls into getAcquisitionInfo instead - never
// exercises the real acquisition logic. Both providers and any headless
// consumer (the completeness harness) should call this instead of
// duplicating the useMemo list.
export function buildAllAcquisitionIndexes(exportData) {
  const textAudit = getAcquisitionTextAuditCounts();
  // The real frontend has the Tauri logging transport; headless real-data
  // tests intentionally run without that transport.
  if (typeof window !== 'undefined') debug('state.parse.acquisition_audit', textAudit, { phase: 'complete', source: 'frontend' });
  return {
    recipeResultIndex: buildRecipeResultIndex(exportData),
    exaltedWeaponIndex: buildExaltedWeaponIndex(exportData),
    marketIndex: buildMarketIndex(exportData),
    alwaysAvailableIndex: buildAlwaysAvailableIndex(exportData),
    bundleIndex: buildBundleIndex(exportData),
    syndicateIndex: buildSyndicateIndex(exportData),
    wikiSigilIndex: buildWikiSigilIndex(exportData?.WikiSigilAcquisition),
    wikiVendorIndex: buildWikiVendorIndex(exportData?.WikiVendorAcquisition),
    wikiTennoGenIndex: buildWikiTennoGenIndex(exportData?.WikiTennoGenAcquisition),
    wikiBaroIndex: buildWikiBaroIndex(exportData?.WikiBaroAcquisition),
    wikiBlueprintIndex: buildWikiBlueprintIndex(exportData?.WikiBlueprintAcquisition),
    wikiResearchIndex: buildWikiResearchIndex(exportData?.WikiResearchAcquisition),
    wikiResourceIndex: buildWikiResourceIndex(exportData?.WikiResourceAcquisition),
    wikiPageAcquisitionIndex: buildWikiPageAcquisitionIndex(exportData?.WikiPageAcquisition),
    wikiAcquisitionStatusIndex: buildWikiAcquisitionStatusIndex(exportData?.WikiAcquisitionStatus),
    relicStateIndex: buildRelicStateIndex(exportData),
    exportVendorIndex: buildExportVendorIndex(exportData),
    glyphSupplementIndex: buildGlyphSupplementIndex(exportData?.BrowseWfGlyphs),
    exportComponentIndex: buildExportComponentIndex(exportData),
  };
}

function getAcquisitionInfoRaw(dropIndexKey, displayName, dropIndex, overridesData, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex) {
  const recipe = recipeResultIndex?.get(canonicalPath(dropIndexKey)) || getItemRecipe(dropIndexKey);
  const resourceRoute = isResourceItem(dropIndexKey, displayName, wikiResourceIndex, exportComponentIndex);
  // The bare-displayName key is unsafe on its own: it's shared across every
  // item that happens to have this exact display name (e.g. a Warframe and
  // an unrelated Prex Card can both be "Follie"), so a more specific,
  // type-scoped key must win when one exists. Confirmed live: without this
  // ordering, ~34 items showed a bundle/promo blurb meant for a cosmetic
  // variant instead of their own correct `${displayName}|Blueprint` entry
  // sitting right next to it in the same file.
  const rawOverrideText = resourceRoute ? null : overridesData?.mods?.[displayName]
    ?? overridesData?.components?.[dropIndexKey]
    ?? overridesData?.components?.[`${displayName}|Blueprint`]
    ?? overridesData?.components?.[displayName];
  const cleanedOverrideText = typeof rawOverrideText === 'string'
    ? toCurrentSourceSentences(rawOverrideText).join(' ')
    : null;
  const marketArmorOverride = typeof rawOverrideText === 'string'
    && /\bmarket\b/i.test(rawOverrideText)
    && /\b(?:armor|armour)\b/i.test(rawOverrideText)
    && /\bfor\s*[.,]/i.test(rawOverrideText);
  const overrideHasMoreSources = typeof rawOverrideText === 'string' && /\+\d+ more sources?/i.test(rawOverrideText);
  const liveSourceKeys = [canonicalPath(dropIndexKey), dropIndexKey, `display:${normalizeDisplayName(displayName)}`].filter(Boolean);
  const hasLiveDropSources = liveSourceKeys.some((key) => (dropIndex?.[key] || []).length > 0);
  const isSalvageResource = canonicalPath(dropIndexKey) === '/Lotus/Types/Items/MiscItems/Salvage';
  // A hand-written summary is allowed when it is the only route, but its
  // truncated count must never hide live rows that the drawer can render.
  const overrideText = (overrideHasMoreSources && hasLiveDropSources) || (isSalvageResource && hasLiveDropSources)
    ? null
    : cleanedOverrideText || (marketArmorOverride ? rawOverrideText : null);
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
  // Some TennoGen overrides are a raw, unformatted dump of wiki infobox
  // fields (author/round/batch/price run together with no punctuation) -
  // e.g. "Designed by X and Y Round 22 [Batch 1] $2.99 (PC) Platinum 35
  // (Console)". The structured TennoGen index has the same information
  // (pcPrice/consolePrice) cleanly, so prefer it over the raw override text
  // exactly like the Baro/vendor/research structured-route checks above.
  const structuredTennoGenForOverride = wikiTennoGenIndex?.get(displayLowerForOverride);
  const tennoGenOverrideHasStructuredRoute = !!structuredTennoGenForOverride;
  const structuredVendorsForOverride = wikiVendorIndex?.get(displayLowerForOverride);
  const vendorOverrideHasStructuredRoute = Array.isArray(structuredVendorsForOverride)
    && structuredVendorsForOverride.length > 0;
  const marketMentioned = typeof overrideText === 'string'
    && /market purchase|market bundle|complete .*market/i.test(overrideText);
  // Broader than `marketMentioned` above (which only matches specific
  // phrasings used elsewhere in this function) - this just checks whether
  // the override text mentions a Market route in any form at all. Used to
  // stop the baro/tennoGen/vendor structured-route branches below from
  // fully replacing an override that ALSO has a real Market route the
  // structured indices don't know about (GitHub issue #109: confirmed on
  // Mag, whose override "Blueprint purchasable from Market for 75 Platinum
  // or Purchased from Conclave..." was being truncated to just "Sold by
  // Conclave." because `vendorOverrideHasStructuredRoute` fired and fully
  // replaced the text instead of merging with it).
  const overrideMentionsMarketRoute = typeof overrideText === 'string'
    && /\bmarket\b/i.test(overrideText);
  const overrideForbidsBlueprint = typeof overrideText === 'string'
    && /fully built|no blueprint/i.test(overrideText);
  const marketAmount = marketEntry ? Number(marketEntry.amount) : 0;
  const marketCurrency = marketEntry?.currency || 'Platinum';
  const marketRouteCanBeRendered = marketMentioned && marketAmount > 0
    && (!recipe || (recipe.blueprintMarketEligible !== false && Number(recipe.blueprintCost) > 0) || !/blueprint/i.test(overrideText));

  // A blueprint part is a separate inventory item, but its verified
  // acquisition routes belong to the Warframe/weapon result that the recipe
  // builds. Reverse-link only the main blueprint paths; chassis, neuroptics,
  // systems and other component blueprints retain their existing behavior.
  const reverseBlueprintRecipe = isMainBlueprintUniqueName(dropIndexKey)
    ? findRecipeByBlueprint(recipeResultIndex, dropIndexKey)
    : null;
  const resultRecipeCandidates = recipeResultIndex?.resultRecipes?.get(canonicalPath(dropIndexKey)) || [];
  const routeRecipe = reverseBlueprintRecipe
    || resultRecipeCandidates.find((candidate) => candidate?.blueprintMarketEligible !== false && Number(candidate?.blueprintCost) > 0)
    || recipe;
  const routeParentUniqueName = reverseBlueprintRecipe?.resultType || canonicalPath(dropIndexKey);
  const routeParentName = reverseBlueprintRecipe
    ? String(displayName || '').replace(/\s+Blueprint$/i, '').trim()
    : displayName;
  const routeIsWeaponRecipe = /\/Lotus\/Types\/Recipes\/Weapons\//.test(routeRecipe?.blueprintUniqueName || dropIndexKey || '');
  const routeIsExtractorRecipe = /\/Lotus\/Types\/Recipes\/Drones\/Advanced(?:Uc)?ResourceDroneBlueprint$/.test(routeRecipe?.blueprintUniqueName || dropIndexKey || '');
  const routePathEligible = isWarframeOrWeaponUniqueName(routeParentUniqueName)
    || routeIsWeaponRecipe
    || routeIsExtractorRecipe
    || isExtractorUniqueName(routeParentUniqueName);
  const routeTable = routePathEligible ? WARFRAME_ACQUISITIONS[normalizeDisplayName(routeParentName)] : null;
  const routeTarget = routePathEligible
    && (routeRecipe || routeTable)
    && (!/\bPrime\b/i.test(routeParentName || '') || isExtractorUniqueName(routeParentUniqueName));
  const tableRouteText = routeTable?.blueprint || routeTable?.general;
  const tableRoutes = splitAcquisitionRouteText(tableRouteText);

  if (routeTarget) {
    const routeSources = [];
    const addRoute = (source) => {
      if (!source?.text) return;
      const key = routeKey(source.text);
      if (!key) return;
      // A priced Market row is more precise than a bare "Market" fragment.
      if (key === 'market' && routeSources.some((row) => routeKey(row.text).startsWith('market:'))) return;
      if (key.startsWith('market:')) {
        for (let i = routeSources.length - 1; i >= 0; i -= 1) {
          if (routeKey(routeSources[i].text) === 'market') routeSources.splice(i, 1);
        }
      }
      if (!routeSources.some((row) => routeKey(row.text) === key)) routeSources.push(source);
    };

    if (marketEntry && marketAmount > 0) {
      const text = marketCurrency === 'Credits'
        ? `Sold in the in-game Market for ${marketAmount.toLocaleString()} Credits.`
        : `Blueprint purchasable from Market for ${marketAmount.toLocaleString()} ${marketCurrency}.`;
      addRoute({ type: 'non-drop', text, source: 'DE export Market price' });
    }
    if (routeRecipe?.blueprintMarketEligible !== false && Number(routeRecipe?.blueprintCost) > 0) {
      addRoute({
        type: 'non-drop',
        text: `Blueprint purchasable from Market for ${Number(routeRecipe.blueprintCost).toLocaleString()} Credits.`,
        source: 'DE ExportRecipes blueprint creditsCost',
      });
    }
    for (const text of tableRoutes) {
      addRoute({ type: 'override', text, source: 'warframe/weapon acquisition table' });
    }

    // Preserve verified routes already attached to the result item. This is
    // needed for routes such as Conclave or a quest that are more detailed in
    // the existing override than in the compact blueprint table.
    if (reverseBlueprintRecipe) {
      const parentInfo = getAcquisitionInfo(
        routeParentUniqueName,
        routeParentName,
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
      for (const source of parentInfo.sources || []) {
        if (!source.part && source.type !== 'status') addRoute(source);
      }
    } else if (typeof overrideText === 'string' && !/^UNKNOWN\b/i.test(overrideText.trim())) {
      const overrideRoutes = splitAcquisitionRouteText(overrideText);
      for (const text of overrideRoutes) addRoute({ type: 'override', text, source: 'manual override' });
    }

    // Keep any direct DE/drop rows that are already attached to this exact
    // result or blueprint key; adding the new blueprint routes must not hide a
    // separate verified mission or relic acquisition.
    for (const key of new Set([routeParentUniqueName, canonicalPath(dropIndexKey)])) {
      for (const source of dropIndex?.[key] || []) {
        if (!source.part) addRoute(source);
      }
    }
    if (routeSources.length > 0) {
      return { sources: routeSources, recipe: recipe || null, wikiLink: getWikiLink(dropIndexKey, displayName) };
    }
  }

  // An exact, source-backed acquisition record outranks an older manual
  // override for the same DE object. Keep the path match strict: this is not
  // a name/category rule and cannot bleed into similarly named variants.
  const verifiedAggregateWiki = WIKI_VERIFIED_ACQUISITIONS.get(canonicalPath(dropIndexKey));
  const extractorAcquisition = bundledWikiExtractorIndex.get(normalizeDisplayName(displayName));
  if (extractorAcquisition?.sources?.length) {
    return {
      sources: extractorAcquisition.sources.map((text) => ({ type: 'non-drop', text, source: `Warframe Wiki (${extractorAcquisition.url})` })),
      recipe: recipe || null,
      wikiLink: { url: extractorAcquisition.url, isDirect: true },
    };
  }
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
    const armorBundleText = formatArmorBundleOverride(rawOverrideText, bundleIndex, dropIndexKey, marketEntry);
    if (armorBundleText) {
      return {
        sources: [{ type: 'non-drop', text: armorBundleText, source: 'DE ExportBundles + DE export Market price' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
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
    if (baroOverrideHasStructuredRoute && !overrideMentionsMarketRoute) {
      return {
        sources: [{ type: 'non-drop', text: "Sold by Baro Ki'Teer.", source: 'Warframe Wiki Baro acquisition index' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
    if (tennoGenOverrideHasStructuredRoute && !overrideMentionsMarketRoute) {
      const price = structuredTennoGenForOverride.pcPrice || structuredTennoGenForOverride.consolePrice;
      const priceText = price ? ` for ${price}` : '';
      return {
        sources: [{ type: 'non-drop', text: `TennoGen skin - purchased via Steam Workshop/console store${priceText}.`, source: 'Warframe Wiki' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
    if (vendorOverrideHasStructuredRoute && !overrideMentionsMarketRoute) {
      return {
        sources: [{ type: 'non-drop', text: `Sold by ${structuredVendorsForOverride.join(' and ')}.`, source: 'Warframe Wiki vendor acquisition index' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
    const overrideRoutes = splitAcquisitionRouteText(overrideText);
    return {
      sources: overrideRoutes.map((text) => ({ type: 'override', text, source: 'manual override' })),
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const exaltedFrames = exaltedWeaponIndex?.get(canonicalPath(dropIndexKey));
  if (exaltedFrames?.length) {
    return {
      sources: [{ type: 'non-drop', text: `Granted with ${exaltedFrames.join(' or ')}.`, source: 'DE export' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  // drops.wf (DropsAll.json, official warframestat.us mirror) is checked
  // before the bundled warframe-items package below, but only after a
  // manual override/exalted-weapon grant has had its chance above: a
  // hand-verified override can correctly combine multiple valid routes
  // (e.g. Mag: "Market for 75 Platinum OR Conclave for standing") which
  // drops.wf's single-route-per-item data cannot express on its own -
  // checking drops.wf before the override silently drops whichever route
  // the override captured that drops.wf doesn't also have (confirmed
  // 2026-09-14: reordering drops.wf ahead of overrides made Mag's drawer
  // show only "Conclave" and lose the Market route entirely). warframe-items
  // conflates guaranteed Syndicate/vendor standing purchases with real
  // mission/enemy drops (both show as chance:1/100% entries with no type
  // distinction), which caused ~78% of merged mod overrides to be silently
  // shadowed by wrong vendor-as-drop entries (found 2026-09-10, e.g.
  // "Abating Link" showing a drop table instead of "Sold by New Loka and
  // The Perrin Sequence") - drops.wf tags syndicate offerings with their own
  // `type: 'syndicate'` distinct from real drops, so for anything with no
  // override, prefer it over warframe-items whenever it has data.
  const norm = canonicalPath(dropIndexKey);
  const displayLower = normalizeDisplayName(displayName);
  // A refined relic (Exceptional/Flawless/Radiant) is never dropped directly
  // - only the base (Intact) relic drops from missions, and refinement to a
  // higher quality happens afterward with Void Traces. Strip the quality
  // suffix so these resolve to the same drop sources as the base relic
  // instead of coming back with no data of their own.
  const REFINEMENT_SUFFIX = /\s+(Exceptional|Flawless|Radiant)$/i;
  const refinementMatch = displayLower?.match(REFINEMENT_SUFFIX);
  const baseRelicDisplay = refinementMatch ? displayLower.slice(0, -refinementMatch[0].length) : null;
  const displayKeys = displayLower ? [
    'display:' + displayLower,
    ...(displayLower.endsWith(' relic') ? ['display:' + displayLower.slice(0, -6)] : []),
    ...(baseRelicDisplay ? ['display:' + baseRelicDisplay] : []),
  ] : [];
  // Sources can exist under a real quality-specific DE path and under the
  // synthetic display key used by the relic cards. Merge all keys so a
  // partial exact match cannot hide mission sources in the fallback key.
  // A Foundry result and its blueprint are distinct DE uniqueNames, while
  // inventory/catalog callers may ask for either one. The drop parser stores
  // structured component sources on the recipe resultType, so include both
  // recipe identities here without collapsing their `part` metadata.
  const sourceKeys = [norm, dropIndexKey, recipe?.resultType, recipe?.blueprintUniqueName, recipe?.uniqueName, ...displayKeys].filter(Boolean);
  const wikiPageAcquisition = wikiPageAcquisitionIndex?.get(displayLower) || bundledWikiPageIndex.get(displayLower);
  const wikiPageSupplementSources = Array.isArray(wikiPageAcquisition?.sources)
    ? wikiPageAcquisition.sources.map((source) => ({ type: 'non-drop', text: source.text, source: source.source || 'Warframe Wiki' }))
    : [];
  const dropSources = [];
  const seenSources = new Set();
  for (const key of sourceKeys) {
    for (const source of dropIndex?.[key] || []) {
      if (source?.type === 'relic') { dropSources.push(source); continue; }
      const signature = JSON.stringify(source);
      if (!seenSources.has(signature)) {
        seenSources.add(signature);
        dropSources.push(source);
      }
    }
  }
  const itemDrops = getItemDrops(dropIndexKey) || getBundledResourceDrops(dropIndexKey);
  const bundledResource = bundledWikiResourceSourcesIndex.get(displayLower)
    || (() => {
      const legacy = wikiResourceIndex?.get(displayLower) || bundledWikiResourceIndex.get(displayLower);
      return legacy?.location ? { foundText: `Found at ${legacy.location}.`, drops: [], otherSections: [], url: getWikiLink(dropIndexKey, displayName)?.url } : null;
    })();
  if (resourceRoute
    && (dropSources.length > 0 || itemDrops?.length > 0 || bundledResource)) {
    const deSources = itemDrops?.length > 0 ? itemDrops : dropSources;
    return {
      sources: buildResourceSources(displayName, bundledResource, deSources, wikiPageSupplementSources),
      recipe: recipe || null,
      wikiLink: bundledResource?.url
        ? { url: bundledResource.url, isDirect: true }
        : getWikiLink(dropIndexKey, displayName),
    };
  }
  if (dropSources && dropSources.length > 0) {
    const sourcesWithoutInternalFields = normalizeRelicSources(dropSources).map(({ __relicSignature, state, chance, ...source }) => source);
    const usedBaseRelicFallback = baseRelicDisplay && !dropIndex?.['display:' + displayLower]?.length;
    const sources = usedBaseRelicFallback
      ? [{ type: 'status', text: `Refined from ${baseRelicDisplay.replace(/\b\w/g, (c) => c.toUpperCase())} using Void Traces - not obtained directly at this quality.`, source: 'Relic refinement mechanic' }, ...sourcesWithoutInternalFields]
      : sourcesWithoutInternalFields;
    // recipe must travel with drop sources: both drawers hide the whole Crafting
    // Requirements section (a Warframe's Neuroptics/Chassis/Systems parts) when it is missing.
    return { sources: [...sources, ...wikiPageSupplementSources], recipe: recipe || null, wikiLink: wikiPageAcquisition?.url
      ? { url: wikiPageAcquisition.url, isDirect: true }
      : getWikiLink(dropIndexKey, displayName) };
  }

  if (itemDrops) {
    return { sources: itemDrops.map((source) => source.source ? source : { ...source, source: 'warframe-items' }), recipe: recipe || null, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  // Prime weapon/Warframe component blueprints (Barrel, Chassis Blueprint,
  // etc.) aren't in warframe-items-acquisition.json, so dropSources above is
  // empty for them. Resolve the real per-relic drop list from the Wiki's own
  // Void data before falling back to any generic recipe/status text.
  const primeComponentKey = parsePrimeComponentLeaf(dropIndexKey);
  if (primeComponentKey) {
    const primeEntry = primeRelicDropIndex.get(`${primeComponentKey.itemLeaf}|${primeComponentKey.partKey}`);
    if (primeEntry) {
      return {
        sources: primeEntry.drops.map((d) => ({ type: 'relic', relicName: d.relicName, rarity: d.rarity, source: 'Warframe Wiki Void relic data' })),
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
  }

  const verifiedDisposition = WIKI_VERIFIED_DISPOSITIONS.get(canonicalPath(dropIndexKey));
  if (verifiedDisposition) {
    return {
      sources: [{ type: 'status', text: verifiedDisposition.text, source: verifiedDisposition.source || 'Verified disposition' }],
      recipe: recipe || null,
      wikiLink: { url: verifiedDisposition.url, isDirect: true },
    };
  }

  if (verifiedAggregateWiki) {
    return {
      sources: [{ type: 'non-drop', text: verifiedAggregateWiki.text, source: verifiedAggregateWiki.source }],
      recipe: recipe || null,
      wikiLink: { url: verifiedAggregateWiki.url, isDirect: true },
    };
  }

  // Explicit Wiki acquisition prose is more useful than a generic recipe
  // summary because it can explain how the blueprint is obtained or unlocked.
  if (wikiPageSupplementSources.length) {
    return {
      sources: wikiPageSupplementSources,
      recipe: recipe || null,
      wikiLink: wikiPageAcquisition.url
        ? { url: wikiPageAcquisition.url, isDirect: true }
        : getWikiLink(dropIndexKey, displayName),
    };
  }
  if (wikiPageAcquisition?.text) {
    if (['Disposition', 'Verification status'].includes(wikiPageAcquisition.section)) {
      return {
        sources: [{ type: 'status', text: wikiPageAcquisition.text, source: wikiPageAcquisition.section === 'Disposition' ? 'Warframe Wiki disposition' : 'Warframe Wiki verification status' }],
        recipe: recipe || null,
        wikiLink: wikiPageAcquisition.url
          ? { url: wikiPageAcquisition.url, isDirect: true }
          : getWikiLink(dropIndexKey, displayName),
      };
    }
    return {
      sources: [{ type: 'non-drop', text: wikiPageAcquisition.text, source: wikiPageAcquisition.source || 'Warframe Wiki' }],
      recipe: recipe || null,
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
      recipe: recipe || null,
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
    return { sources: [{ type: 'non-drop', text: nonDrop.text, source: 'DE export path rule' }], recipe: recipe || null, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const marketPrice = marketIndex?.get(canonicalPath(dropIndexKey));
  if (INCARNON_GENESIS_PATTERN.test(canonicalPath(dropIndexKey) || '')) {
    return {
      sources: [{
        type: 'non-drop',
        text: "Earn this Incarnon Genesis from the rotating Steel Path Circuit reward choices after unlocking The Duviri Paradox, Angels of the Zariman, and Steel Path. Alternatively, purchase it from Cavalero in the Chrysalith for 120 Platinum, once per adapter.",
        source: 'Warframe Wiki Incarnon Genesis acquisition rules',
      }],
      recipe: recipe || null,
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
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const bundleInfo = getBundleInfo(bundleIndex, dropIndexKey);
  if (bundleInfo?.name && bundleInfo.available !== false && !wikiResearchIndex?.has(displayLower)) {
    return {
      sources: [{ type: 'non-drop', text: bundleInfo.amount > 0
        ? `Sold as part of the "${bundleInfo.name}" Market bundle for ${Number(bundleInfo.amount).toLocaleString()} ${bundleInfo.currency || 'Platinum'}.`
        : `Sold as part of the "${bundleInfo.name}" Market bundle.`, source: 'DE export' }],
      recipe: recipe || null,
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
    return { sources: [{ type: 'non-drop', text, source: 'DE export' }], recipe: recipe || null, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  const baroRelicKey = displayLower?.endsWith(' relic') ? displayLower : `${displayLower} relic`;
  if (wikiBaroIndex?.has(displayLower) || wikiBaroIndex?.has(baroRelicKey)
    || bundledWikiBaroIndex.has(displayLower) || bundledWikiBaroIndex.has(baroRelicKey)
    || BARO_LOGIN_MUSIC_PATTERN.test(canonicalPath(dropIndexKey) || '')) {
    return {
      sources: [{ type: 'non-drop', text: "Sold by Baro Ki'Teer.", source: 'Warframe Wiki' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiSigilCategory = wikiSigilIndex?.get(displayLower);
  if (wikiSigilCategory) {
    return {
      sources: [{ type: 'non-drop', text: `Listed under ${wikiSigilCategory} on the Warframe wiki.`, source: 'Warframe Wiki' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const variantAcquisition = VARIANT_ACQUISITION_PATTERNS.find((p) => p.test(dropIndexKey, displayName));
  if (variantAcquisition) {
    return {
      sources: [{ type: 'non-drop', text: variantAcquisition.text, source: 'DE export variant identity' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  // Agile/Noble Animation Sets are a uniform, wiki-verified mechanic
  // (https://wiki.warframe.com/w/Animation_Set): innately unlocked for free
  // on the Warframe they belong to, and purchasable from the Market for 50
  // Platinum (35 for Equinox's sets specifically - the wiki's one stated
  // numeric exception) to use on other Warframes. Excalibur Umbra's sets are
  // a separate special case, unlocked for every Warframe on completing The
  // Sacrifice quest. This is a real, confirmed, general game mechanic - not
  // a per-item guess - so it's safe to apply to all matching entries at
  // once, unlike the individual acquisition_overrides.json text fixes
  // elsewhere in this file which are verified one item at a time. Checked
  // ahead of the alwaysAvailableIndex block below because these entries
  // (mostly) have a `requirement` gate that would otherwise just fall
  // through to an honest-but-empty "no data" state - confirmed live 2026-09-02
  // that state covers 97% of these 150 real entries, which is correct but
  // useless; this replaces "no data" with the real mechanic instead.
  const animSetMatch = displayName?.match(/^(.+?) (Agile|Noble) Animation Set$/);
  if (animSetMatch && /(AgileAnims|NobleAnims)$/.test(canonicalPath(dropIndexKey))) {
    const warframeName = animSetMatch[1];
    let text;
    if (warframeName === 'Excalibur Umbra') {
      text = 'Innately unlocked for every Warframe after completing The Sacrifice quest.';
    } else {
      const price = warframeName.startsWith('Equinox') ? 35 : 50;
      text = `Innate for ${warframeName}; purchasable from the Market for ${price} Platinum to use on other Warframes.`;
    }
    return {
      sources: [{ type: 'non-drop', text, source: 'Warframe Wiki' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  if (alwaysAvailableIndex?.has(canonicalPath(dropIndexKey))) {
    const requirementUniqueName = alwaysAvailableIndex.get(canonicalPath(dropIndexKey));
    // `alwaysAvailable: true` only means "no acquisition needed" when there's
    // no `requirement` gate. 151 real entries (mostly per-Warframe Agile/Noble
    // Animation Sets, now handled above) also need a separate "Unlock..."
    // item first - and that requirement item is itself absent from the
    // primary export for most of them (confirmed: not a real ExportCustoms
    // key, only referenced by this field), so there's no concrete route to
    // describe here. Don't claim direct availability in that case; fall
    // through to the rest of this function's checks (and its honest
    // empty-state fallback) instead of asserting something false.
    // A second, distinct false-positive shape: 18 real entries under
    // /Armor/WarframeDefaults/ (e.g. "Lavos Prime Shoulder Guard", "Voruna
    // Armor") also have alwaysAvailable:true and no requirement, but are
    // NOT actually selectable/purchasable on their own - they're each
    // Warframe's own built-in default armor piece, only usable at all once
    // you own that specific Warframe (confirmed uniform excludeFromMarket:
    // true + platinumCost:1000 shape, and the audit caught this exact case
    // live: "Lavos Prime Shoulder Guard... that wording is not credible for
    // a Prime-exclusive item"). The Warframe's real name is derived from
    // displayName itself (already dict-resolved, so no internal-codename
    // risk - confirmed one WarframeDefaults entry's path segment uses the
    // codename "Werewolf" for Voruna, which is why this doesn't parse the
    // path) by stripping the item's own known trailing suffix word.
    const warframeDefaultMatch = !requirementUniqueName
      && /\/Armor\/WarframeDefaults\//i.test(canonicalPath(dropIndexKey))
      && displayName?.match(/^(.+?) (Armor|Shoulder Guard)$/);
    if (warframeDefaultMatch) {
      return {
        sources: [{ type: 'non-drop', text: `Included with owning ${warframeDefaultMatch[1]}.`, source: 'DE export' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
    if (!requirementUniqueName) {
      return {
        sources: [{ type: 'non-drop', text: 'Available directly in the in-game customization menu.', source: 'DE export' }],
        recipe: recipe || null,
        wikiLink: getWikiLink(dropIndexKey, displayName),
      };
    }
  }

  const tennoGen = wikiTennoGenIndex?.get(displayLower);
  if (tennoGen) {
    const price = tennoGen.pcPrice || tennoGen.consolePrice;
    const priceText = price ? ` for ${price}` : '';
    return {
      sources: [{ type: 'non-drop', text: `TennoGen skin - purchased via Steam Workshop/console store${priceText}.`, source: 'Warframe Wiki' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const relicState = relicStateIndex?.get(canonicalPath(dropIndexKey));
  if (relicState?.vaultedAt || relicState?.vaulted === true) {
    return {
      sources: [{ type: 'non-drop', text: 'Vaulted relic; no active drop source is listed in the current export.', source: 'DE export' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiResearch = wikiResearchIndex?.get(displayLower);
  if (wikiResearch) {
    return {
      sources: [{ type: 'non-drop', text: formatWikiResearch(wikiResearch), source: 'Warframe Wiki' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiResource = wikiResourceIndex?.get(displayLower) || bundledWikiResourceIndex.get(displayLower);
  if (wikiResource?.location) {
    const kind = [wikiResource.rarity, wikiResource.type].filter(Boolean).join(' ');
    return {
      sources: [{ type: 'non-drop', text: `Found at ${wikiResource.location}${kind ? ` (${kind}).` : '.'}`, source: 'Warframe Wiki' }],
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const wikiBlueprint = wikiBlueprintIndex?.get(displayLower);
  if (wikiBlueprint) {
    return {
      sources: [{ type: 'non-drop', text: formatWikiBlueprint(wikiBlueprint), source: 'Warframe Wiki' }],
      recipe: recipe || null,
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
      recipe: recipe || null,
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  const glyph = glyphSupplementIndex?.get(canonicalPath(dropIndexKey));
  if (glyph) {
    const details = [];
    // A promo code is a universal, freely-redeemable route (per the wiki's
    // own "Creator Glyphs" section) - when one exists it fully supersedes
    // the raw markdown, which is just the creator's own promotional blurb
    // for personal-distribution glyphs and previously got dumped alongside
    // the code as unrendered bullet syntax regardless (GitHub issue #109).
    if (glyph.promo_code) {
      details.push(`Redeem promo code ${glyph.promo_code} in the in-game Market, or via warframe.com/promocode?code=${glyph.promo_code}.`);
    } else if (glyph.markdown) {
      // No documented universal code - this is genuinely personal-creator
      // distribution, not a fixable data gap. Strip markdown syntax (list
      // bullets, link brackets, strikethrough) instead of rendering it as
      // literal asterisks/tildes, and frame it honestly as a personal perk.
      const cleaned = glyph.markdown
        .replace(/~~/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)(\{:[^}]*\})?/g, '$1')
        .split('\n')
        .map((line) => line.replace(/^\s*[*-]\s*/, '').trim())
        .filter(Boolean)
        .join('; ');
      if (cleaned) details.push(`No universal promo code documented; distributed personally by the creator (${cleaned}).`);
    }
    if (glyph.twitch) details.push(`Twitch: ${glyph.twitch}`);
    if (glyph.youtube) details.push(`YouTube: ${glyph.youtube}`);
    if (glyph.twitter) details.push(`Twitter: ${glyph.twitter}`);
    if (glyph.discord) details.push(`Discord: ${glyph.discord}`);
    if (glyph['other-site']) details.push(`More information: ${glyph['other-site']}`);
    return {
      sources: [{ type: 'non-drop', text: details.length ? `Creator Glyph. ${details.join(' ')}` : 'Creator Glyph. See the linked creator source for availability.', source: 'browse.wf' }],
      recipe: recipe || null,
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
        recipe: recipe || null,
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

  // Only a real, specific export disposition is worth showing. Generic
  // "a wiki page exists but nothing structured was found" prose is banned:
  // it tells the player nothing and used to win over legitimate empty state.
  const wikiStatus = wikiAcquisitionStatusIndex?.get(canonicalPath(dropIndexKey));
  if (wikiStatus?.exportDisposition) {
    return {
      sources: [{ type: 'status', text: wikiStatus.exportDisposition, source: 'DE export status' }],
      recipe: recipe || null,
      wikiLink: wikiStatus.url
        ? { url: wikiStatus.url, isDirect: true }
        : getWikiLink(dropIndexKey, displayName),
    };
  }
  if (wikiStatus?.url) {
    return { sources: [], recipe: recipe || null, wikiLink: { url: wikiStatus.url, isDirect: true } };
  }

  return { sources: [], recipe: recipe || null, wikiLink: getWikiLink(dropIndexKey, displayName) };
}
