import { fetch as tauriFetch } from '@tauri-apps/api/http';

const CACHE_KEY = 'wfm_price_cache';
const RATE_LIMIT_MS = 350; // ~3 requests per second
let lastFetchTime = 0;
const pendingRequests = new Map();
let cachedData = null;
let lastCacheLoad = 0;

/**
 * Flat 24-hour TTL for all items as per user preference.
 */
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

export async function getPrice(itemUniqueName, itemName, ducatValue = 0) {
  if (!itemName || itemName.includes('Forma')) return 0;

  const cache = loadCache();
  const cached = cache[itemUniqueName];
  const ttl = getTTL();

  if (cached && (Date.now() - cached.lastUpdated < ttl)) {
    return cached.plat;
  }

  // Deduplication: if already fetching this item, wait for it
  if (pendingRequests.has(itemUniqueName)) {
    return pendingRequests.get(itemUniqueName);
  }

  const fetchPromise = (async () => {
    // Throttling
    const now = Date.now();
    const timeSinceLast = now - lastFetchTime;
    if (timeSinceLast < RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLast));
    }

    const slug = toWfmSlug(itemName);
    const plat = await fetchWfmPrice(slug);

    if (plat !== null && plat > 0) {
      saveToCache(itemUniqueName, plat);
      pendingRequests.delete(itemUniqueName);
      return plat;
    }

    pendingRequests.delete(itemUniqueName);
    return (cached && cached.plat > 0) ? cached.plat : (plat || 0);
  })();

  pendingRequests.set(itemUniqueName, fetchPromise);
  return fetchPromise;
}

/**
 * Bulk fetch prices for a list of items.
 * Returns only items that were NOT already in the cache or were expired.
 */
export async function getPricesBatch(items) {
  const cache = loadCache(true); // Force fresh load for batch
  const ttl = getTTL();
  const results = {};
  
  // Filter items that actually need a network request
  const needsFetch = items.filter(item => {
    if (!item.name || item.name.includes('Forma')) return false;
    const cached = cache[item.uniqueName];
    return !cached || (Date.now() - cached.lastUpdated >= ttl);
  });

  // Fill results with current cached values first
  for (const item of items) {
    if (item.name?.includes('Forma')) {
      results[item.uniqueName] = 0;
      continue;
    }
    const cached = cache[item.uniqueName];
    if (cached) results[item.uniqueName] = cached.plat;
  }

  // If nothing needs fetching, return immediately
  if (needsFetch.length === 0) return { results, hadNetworkActivity: false };

  // Fetch only what's needed
  for (const item of needsFetch) {
    results[item.uniqueName] = await getPrice(item.uniqueName, item.name, item.ducats);
  }

  return { results, hadNetworkActivity: true };
}

const WFM_MISSPELLINGS = {
  'kompressa_prime_receiver': 'kompressa_prime_reciever', // Known WFM misspelling
};

function toWfmSlug(itemName) {
  let slug = itemName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/&/g, 'and')
    .replace(/[()]/g, '')
    .replace(/_blueprints$/, '_blueprint')
    .replace(/_blueprint_blueprint$/, '_blueprint');

  // Check for known misspellings (full slug match)
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
    .replace(/\s+/g, '_')
    .replace(/&/g, 'and')
    .replace(/[()]/g, '')
    .replace(/_blueprints$/, '_blueprint')
    .replace(/_blueprint_blueprint$/, '_blueprint');

  variants.push(base);

  // Try without "prime" suffix variations
  if (base.includes('_prime_')) {
    const withoutPrime = base.replace('_prime_', '_');
    variants.push(withoutPrime);
  }

  // Try with variations for "blueprint" vs "blueprints"
  if (base.includes('blueprint')) {
    const withoutS = base.replace('blueprint', 'blueprints');
    const withS = base.replace('blueprints', 'blueprint');
    variants.push(withoutS, withS);
  }

  return [...new Set(variants)];
}

async function fetchWfmPrice(slug) {
  lastFetchTime = Date.now();

  // Try original slug first
  let price = await tryFetchPrice(slug);
  if (price !== null && price > 0) return price;

  // If failed and slug looks like it might have issues, try variants
  const itemName = slug.replace(/_/g, ' ').replace(/market$/i, '').trim();
  const variants = generateSlugVariants(itemName);

  for (const variant of variants) {
    if (variant === slug) continue; // already tried
    price = await tryFetchPrice(variant);
    if (price !== null && price > 0) return price;
  }

  return 0;
}

async function tryFetchPrice(slug) {
  try {
    const url = `https://api.warframe.market/v2/orders/item/${slug}`;
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'Platform': 'pc',
        'Accept': 'application/json',
        'User-Agent': 'Cephalon-Kronos/0.4.2',
        'Crossplay': 'true'
      }
    });

    if (response.status < 200 || response.status >= 300) {
      if (response.status === 404) return 0;
      return null;
    }

    const data = response.data;
    console.log(`[WFM Cache] Fetched ${slug}:`, data);
    let orders = null;
    if (Array.isArray(data.data)) {
      orders = data.data;
    } else {
      orders = data.payload?.orders || data.data?.orders || data.orders;
    }

    if (!orders || !Array.isArray(orders)) {
      console.warn(`[WFM Cache] No orders found for ${slug}`);
      return null;
    }

    // Filter: "sell" orders from active users
    let sells = orders.filter(o => 
      (o.type === 'sell' || o.order_type === 'sell') && 
      (o.user.status === 'ingame' || o.user.status === 'online')
    );

    // Fallback to offline if no online users found (better than 0P)
    if (sells.length === 0) {
      sells = orders.filter(o => (o.type === 'sell' || o.order_type === 'sell'));
    }

    if (sells.length === 0) {
      console.warn(`[WFM Cache] No sell orders at all for ${slug}`);
      return 0;
    }

    sells.sort((a, b) => a.platinum - b.platinum);

    // Use median of top 3 to avoid outliers/bait orders
    const top3 = sells.slice(0, 3);
    const sum = top3.reduce((acc, o) => acc + o.platinum, 0);
    const avg = Math.round(sum / top3.length);
    console.log(`[WFM Cache] Price for ${slug}: ${avg}P`);
    return avg;

  } catch (err) {
    console.error(`[WFM Cache] Error fetching ${slug}:`, err);
    return null;
  }
}


function saveToCache(itemUniqueName, plat) {
  const cache = loadCache();
  cache[itemUniqueName] = {
    plat,
    lastUpdated: Date.now()
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
