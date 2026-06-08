import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

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

export async function getPrice(itemUniqueName, itemName, ducatValue = 0, maxRank = null) {
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
    const plat = await fetchWfmPrice(slug, maxRank);

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
  
  // Fill results with current cached values first
  for (const item of items) {
    if (item.name?.includes('Forma')) {
      results[item.uniqueName] = 0;
      continue;
    }
    const cached = cache[item.uniqueName];
    if (cached) results[item.uniqueName] = cached.plat;
  }

  // Filter items that actually need a network request
  const needsFetch = items.filter(item => {
    if (!item.name || item.name.includes('Forma')) return false;
    const cached = cache[item.uniqueName];
    return !cached || (Date.now() - cached.lastUpdated >= ttl);
  });

  // If nothing needs fetching, return immediately
  if (needsFetch.length === 0) return { results, hadNetworkActivity: false };

  // Fetch in parallel batches to finish faster while respecting rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < needsFetch.length; i += BATCH_SIZE) {
    const batch = needsFetch.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(item =>
      getPrice(item.uniqueName, item.name, item.ducats, item.maxRank)
        .then(price => { results[item.uniqueName] = price; })
    ));
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

  // WFM v2 expects prime component slugs to end with _blueprint
  // (e.g. ash_prime_chassis_blueprint), but the readable name is
  // "Ash Prime Chassis" (no "Blueprint" in it), so add the suffix.
  if (!base.includes('blueprint')) {
    variants.push(base + '_blueprint');
  }

  return [...new Set(variants)];
}

async function fetchWfmPrice(slug, maxRank = null) {
  lastFetchTime = Date.now();

  // Try original slug first
  let price = await tryFetchPrice(slug, maxRank);
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

async function tryFetchPrice(slug, maxRank = null) {
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
    if (!data) {
      console.warn(`[WFM Cache] Empty response for ${slug}`);
      return null;
    }
    let orders = null;
    if (Array.isArray(data.data)) {
      orders = data.data;
    } else if (data.payload?.orders) {
      orders = data.payload.orders;
    } else if (data.orders) {
      orders = data.orders;
    }

    if (!orders || !Array.isArray(orders)) {
      console.warn(`[WFM Cache] No orders found for ${slug}`);
      return null;
    }

    // Start with all sell orders
    let sells = orders.filter(o => (o.type === 'sell' || o.order_type === 'sell'));

    if (sells.length === 0) {
      console.warn(`[WFM Cache] No sell orders at all for ${slug}`);
      return 0;
    }

    // Filter by max rank (only for ranked items like mods)
    if (maxRank != null) {
      const ranked = sells.filter(o => o.rank === maxRank);
      if (ranked.length > 0) sells = ranked;
    }

    sells.sort((a, b) => a.platinum - b.platinum);

    // Use median of top 5 cheapest to smooth outliers
    const count = Math.min(5, sells.length);
    const top = sells.slice(0, count);
    const sum = top.reduce((acc, o) => acc + o.platinum, 0);
    const avg = Math.round(sum / count);
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
