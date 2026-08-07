import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const CACHE_KEY = 'wfm_price_cache';
const RATE_LIMIT_MS = 500;
let lastFetchTime = 0;
const pendingRequests = new Map();
let cachedData = null;
let lastCacheLoad = 0;

const WFM_ITEMS_KEY = 'wfm_item_map';
const WFM_ITEMS_TTL = 7 * 24 * 60 * 60 * 1000;
let wfmItemMap = null;

function loadWfmItemMap() {
  if (wfmItemMap) return wfmItemMap;
  try {
    const data = localStorage.getItem(WFM_ITEMS_KEY);
    if (!data) return null;
    const { entries, timestamp } = JSON.parse(data);
    if (Date.now() - timestamp > WFM_ITEMS_TTL) return null;
    wfmItemMap = new Map(entries);
    return wfmItemMap;
  } catch {
    return null;
  }
}

async function fetchWfmItems() {
  const headers = {
    'Platform': 'pc',
    'Accept': 'application/json',
    'User-Agent': 'KiedasOrbiter/0.7.0',
  };
  const response = await tauriFetch('https://api.warframe.market/v2/items', { method: 'GET', headers });
  if (!response.ok) return null;
  const body = await response.json();
  const items = body?.data || [];
  const entries = items
    .filter(item => item.gameRef)
    .map(item => [item.gameRef, { slug: item.slug, tradable: item.tradable !== false }]);
  wfmItemMap = new Map(entries);
  localStorage.setItem(WFM_ITEMS_KEY, JSON.stringify({ entries, timestamp: Date.now() }));
  return wfmItemMap;
}

async function ensureWfmItems() {
  const cached = loadWfmItemMap();
  if (cached) return cached;
  try {
    return await fetchWfmItems();
  } catch {
    return null;
  }
}

// Look up item in WFM map, with fallback path transformations
// (game export uses Component paths; WFM catalog uses Blueprint paths;
//  relic rewards have /StoreItems/ prefix that WFM catalog lacks)
function lookupWfmItem(map, gamePath) {
  if (!map) return null;
  const normalize = (p) => p.replace('/StoreItems/', '/');
  let item = map.get(normalize(gamePath));
  if (item) return item;
  if (gamePath.endsWith('Component')) {
    const alt = normalize(gamePath).slice(0, -9) + 'Blueprint';
    item = map.get(alt);
    if (item) return item;
  }
  return null;
}

function getTTL() {
  return 24 * 60 * 60 * 1000;
}

function loadCache(force = false) {
  const now = Date.now();
  if (!force && cachedData && (now - lastCacheLoad < 1000)) {
    return cachedData;
  }
  try {
    const data = localStorage.getItem(CACHE_KEY);
    cachedData = data ? JSON.parse(data) : {};
    lastCacheLoad = now;
    return cachedData;
  } catch {
    return {};
  }
}

export async function getPrice(itemUniqueName, itemName, ducatValue = 0, maxRank = null) {
  if (!itemName || itemName.includes('Forma')) return 0;

  const map = loadWfmItemMap();
  let wfmItem = null;
  if (map) {
    wfmItem = lookupWfmItem(map, itemUniqueName);
    if (!wfmItem) return 0;
    if (!wfmItem.tradable) return 0;
  }

  const cache = loadCache();
  const cached = cache[itemUniqueName];
  const ttl = getTTL();

  if (cached && (Date.now() - cached.lastUpdated < ttl)) {
    return cached.plat;
  }

  if (pendingRequests.has(itemUniqueName)) {
    return pendingRequests.get(itemUniqueName);
  }

  const fetchPromise = (async () => {
    const now = Date.now();
    const timeSinceLast = now - lastFetchTime;
    if (timeSinceLast < RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLast));
    }

    const slug = wfmItem ? wfmItem.slug : toWfmSlug(itemName);
    const plat = await fetchWfmPrice(slug, maxRank);

    if (plat !== null) {
      saveToCache(itemUniqueName, plat);
      pendingRequests.delete(itemUniqueName);
      return plat;
    }

    pendingRequests.delete(itemUniqueName);
    return cached ? cached.plat : 0;
  })();

  pendingRequests.set(itemUniqueName, fetchPromise);
  return fetchPromise;
}

export async function getPricesBatch(items, onProgress) {
  const map = await ensureWfmItems();
  const cache = loadCache(true);
  const ttl = getTTL();
  const results = {};

  for (const item of items) {
    if (item.name?.includes('Forma')) {
      results[item.uniqueName] = 0;
      continue;
    }
    if (map) {
      const wfmItem = lookupWfmItem(map, item.uniqueName);
      if (!wfmItem || !wfmItem.tradable) {
        results[item.uniqueName] = 0;
        continue;
      }
    }
    const cached = cache[item.uniqueName];
    if (cached) results[item.uniqueName] = cached.plat;
  }

  const needsFetch = items.filter(item => {
    if (!item.name || item.name.includes('Forma')) return false;
    if (map) {
      const wfmItem = lookupWfmItem(map, item.uniqueName);
      if (!wfmItem || !wfmItem.tradable) return false;
    }
    const cached = cache[item.uniqueName];
    return !cached || (Date.now() - cached.lastUpdated >= ttl);
  });

  if (needsFetch.length === 0) {
    return { results, hadNetworkActivity: false };
  }

  for (let i = 0; i < needsFetch.length; i++) {
    const item = needsFetch[i];
    const price = await getPrice(item.uniqueName, item.name, item.ducats, item.maxRank);
    results[item.uniqueName] = price;
    if (onProgress) onProgress({ current: i + 1, total: needsFetch.length, label: item.name });
  }

  return { results, hadNetworkActivity: true };
}

const WFM_MISSPELLINGS = {
  'kompressa_prime_receiver': 'kompressa_prime_reciever',
};

function toWfmSlug(itemName) {
  let slug = itemName
    .toLowerCase()
    .trim()
    .replace(/'/g, '')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/&/g, 'and')
    .replace(/[()]/g, '')
    .replace(/_blueprints$/, '_blueprint')
    .replace(/_blueprint_blueprint$/, '_blueprint');

  if (WFM_MISSPELLINGS[slug]) {
    slug = WFM_MISSPELLINGS[slug];
  }

  return slug;
}

function generateSlugVariants(itemName) {
  const variants = [];
  const base = itemName
    .toLowerCase()
    .trim()
    .replace(/'/g, '')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/&/g, 'and')
    .replace(/[()]/g, '')
    .replace(/_blueprints$/, '_blueprint')
    .replace(/_blueprint_blueprint$/, '_blueprint');

  variants.push(base);

  if (base.includes('_prime_')) {
    const withoutPrime = base.replace('_prime_', '_');
    variants.push(withoutPrime);
  }

  if (base.includes('blueprint')) {
    const withoutS = base.replace('blueprint', 'blueprints');
    const withS = base.replace('blueprints', 'blueprint');
    variants.push(withoutS, withS);
  }

  return [...new Set(variants)];
}

function medianPrice(sells) {
  sells.sort((a, b) => a.platinum - b.platinum);
  const count = Math.min(5, sells.length);
  const top = sells.slice(0, count);
  const sum = top.reduce((acc, o) => acc + o.platinum, 0);
  return Math.round(sum / count);
}

async function tryFetchPrice(slug, maxRank = null) {
  const headers = {
    'Platform': 'pc',
    'Accept': 'application/json',
    'User-Agent': 'KiedasOrbiter/0.7.0',
    'Crossplay': 'true'
  };

  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, 15000);

  try {
    let url = `https://api.warframe.market/v2/orders/item/${slug}/top`;

    const response = await tauriFetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timer);

    if (response.status < 200 || response.status >= 300) {
      if (response.status === 404) return 0;
      return null;
    }

    const body = await response.json();

    let sells = body?.data?.sell;

    if (!sells || sells.length === 0) return 0;

    if (maxRank != null) {
      const ranked = sells.filter(o => o.rank === maxRank || o.mod_rank === maxRank);
      if (ranked.length > 0) sells = ranked;
    }

    const price = medianPrice(sells);
    return price;

  } catch (err) {
    clearTimeout(timer);
    return null;
  }
}

async function fetchWfmPrice(slug, maxRank = null) {
  lastFetchTime = Date.now();

  let price = await tryFetchPrice(slug, maxRank);
  if (price !== null && price > 0) {
    return price;
  }

  const itemName = slug.replace(/_/g, ' ').replace(/market$/i, '').trim();
  const variants = generateSlugVariants(itemName);

  for (const variant of variants) {
    if (variant === slug) continue;
    price = await tryFetchPrice(variant);
    if (price !== null && price > 0) {
      return price;
    }
  }

  return 0;
}

function saveToCache(itemUniqueName, plat) {
  const cache = loadCache();
  cache[itemUniqueName] = { plat, lastUpdated: Date.now() };
  cachedData = cache;
  lastCacheLoad = Date.now();
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
