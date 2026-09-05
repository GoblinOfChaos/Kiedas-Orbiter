import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// v3: keyed by WFM item id (not display name / game unique_name) and stores
// an explicit status ('ready' | 'no_orders' | 'error') instead of a bare
// plat number. A guessed-slug lookup has no verified id to key by, and a
// bare number can't distinguish "confirmed no sell orders" from "the
// request failed" - both of which caused permanent fake 0p prices in
// earlier versions of this cache. Callers must resolve a real catalog
// entry (via lookupWfmItem) before calling getPriceState; there is no
// guess-based fallback anymore.
const CACHE_KEY = 'wfm_price_cache_v3';
const RATE_LIMIT_MS = 500;
let lastFetchTime = 0;
// Market.jsx fires getPriceState() for a whole chunk of items concurrently
// (Promise.all), and a naive rate-limit check (read-then-wait) done
// independently by each call would let a burst of ~8 requests go out
// near-simultaneously instead of 500ms apart, which WFM's API rate-limits.
// rateLimitGate() chains every actual network call through a single queue
// so they're genuinely serialized regardless of caller concurrency.
let rateLimitQueue = Promise.resolve();
function rateLimitGate() {
  const gate = rateLimitQueue.then(async () => {
    const wait = RATE_LIMIT_MS - (Date.now() - lastFetchTime);
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    lastFetchTime = Date.now();
  });
  rateLimitQueue = gate.catch(() => {});
  return gate;
}
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
  const entries = [];
  for (const item of items) {
    if (item.gameRef) {
      const info = { id: item.id, slug: item.slug, tradable: item.tradable !== false };
      entries.push([item.gameRef, info]);
      // Also index by leaf name for loose matching
      const leaf = item.gameRef.split('/').pop();
      if (leaf) entries.push([leaf, info]);
    }
    if (item.slug) {
      const info = { id: item.id, slug: item.slug, tradable: item.tradable !== false };
      entries.push([item.slug, info]);
    }
  }
  wfmItemMap = new Map(entries);
  localStorage.setItem(WFM_ITEMS_KEY, JSON.stringify({ entries, timestamp: Date.now() }));
  return wfmItemMap;
}

export async function ensureWfmItems() {
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
export function lookupWfmItem(map, gamePath) {
  if (!map || typeof map.get !== 'function' || !gamePath) return null;
  const normalize = (p) => typeof p === 'string' ? p.replace('/StoreItems/', '/') : '';
  const cleanPath = normalize(gamePath);
  let item = map.get(cleanPath);
  if (item) return item;

  if (typeof gamePath === 'string' && gamePath.endsWith('Component')) {
    const alt = cleanPath.slice(0, -9) + 'Blueprint';
    item = map.get(alt);
    if (item) return item;
  }

  // Suffix / leaf matching fallback
  if (typeof gamePath === 'string') {
    const leaf = gamePath.split('/').pop();
    if (leaf) {
      item = map.get(leaf);
      if (item) return item;
      if (leaf.endsWith('Component')) {
        const bareLeaf = leaf.slice(0, -9);
        // Weapon parts (barrel/receiver/stock/chassis/systems/etc) are
        // indexed under their bare name with no suffix at all - only the
        // full recipe item uses "Blueprint".
        item = map.get(bareLeaf);
        if (item) return item;
        item = map.get(bareLeaf + 'Blueprint');
        if (item) return item;
      }
    }
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

function saveCacheEntry(wfmItemId, entry) {
  const cache = loadCache();
  cache[wfmItemId] = entry;
  cachedData = cache;
  lastCacheLoad = Date.now();
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function medianPrice(sells) {
  sells.sort((a, b) => a.platinum - b.platinum);
  const count = Math.min(5, sells.length);
  const top = sells.slice(0, count);
  const sum = top.reduce((acc, o) => acc + o.platinum, 0);
  return Math.round(sum / count);
}

// Returns: null = request failed (rate-limited/timeout/network error, retry
// later), 0 = confirmed no current sell orders, >0 = median sell price.
async function tryFetchPrice(slug, maxRank = null) {
  const headers = {
    'Platform': 'pc',
    'Accept': 'application/json',
    'User-Agent': 'KiedasOrbiter/0.7.0',
    'Crossplay': 'true'
  };

  await rateLimitGate();

  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, 15000);

  try {
    const url = `https://api.warframe.market/v2/orders/item/${slug}/top`;

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

    return medianPrice(sells);
  } catch (err) {
    clearTimeout(timer);
    return null;
  }
}

// Fetch (or serve from cache) an explicit price state for a WFM catalog
// item. `wfmItemId` and `slug` must come from a verified catalog match
// (lookupWfmItem) - there is no name-guessing fallback, so an unresolved
// item should never reach this function.
export async function getPriceState(wfmItemId, slug, maxRank = null) {
  if (!wfmItemId || !slug) return { status: 'error' };

  const cache = loadCache();
  const cached = cache[wfmItemId];
  const ttl = getTTL();
  if (cached && (Date.now() - cached.timestamp < ttl)) {
    return cached;
  }

  if (pendingRequests.has(wfmItemId)) {
    return pendingRequests.get(wfmItemId);
  }

  const fetchPromise = (async () => {
    const plat = await tryFetchPrice(slug, maxRank);
    let result;
    if (plat === null) {
      // A real failure must not be cached as a confirmed result - it should
      // be retried on the next load rather than permanently reported as
      // "no orders" or a stale/wrong price.
      result = { status: 'error', timestamp: Date.now() };
    } else if (plat === 0) {
      result = { status: 'no_orders', timestamp: Date.now() };
      saveCacheEntry(wfmItemId, result);
    } else {
      result = { status: 'ready', price: plat, timestamp: Date.now() };
      saveCacheEntry(wfmItemId, result);
    }
    pendingRequests.delete(wfmItemId);
    return result;
  })();

  pendingRequests.set(wfmItemId, fetchPromise);
  return fetchPromise;
}
