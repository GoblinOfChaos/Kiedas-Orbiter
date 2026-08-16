// Loads the pre-extracted warframe-items data (scripts/extract-warframe-items-acquisition.mjs)
// via the same bundled-JSON pattern this app already uses elsewhere
// (invoke('read_file_bytes', ...)). This is the primary acquisition data
// source per docs/superpowers/specs/2026-08-09-acquisition-info-drawer-design.md.
import { invoke } from '@tauri-apps/api/core';

let itemIndex = null;
let componentIndex = null;
let loadPromise = null;
const canonicalPath = (value) => typeof value === 'string' ? value.replaceAll('/StoreItems/', '/') : value;

export function loadAcquisitionData() {
  if (itemIndex) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = invoke('read_file_bytes', { relative: 'data/assets/data/warframe-items-acquisition.json' })
    .then((bytes) => {
    const arr = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
    itemIndex = new Map(arr.map((item) => [item.uniqueName, item]));
    componentIndex = new Map();
    for (const item of arr) {
      for (const component of item.components || []) {
        if (component?.uniqueName && Array.isArray(component.drops) && component.drops.length > 0 && !componentIndex.has(component.uniqueName)) {
          componentIndex.set(component.uniqueName, component);
        }
      }
    }
  })
    .catch(() => { itemIndex = new Map(); componentIndex = new Map(); });
  return loadPromise;
}

/**
 * Returns this item's drop sources (enemy/mission/relic), ranked by chance
 * descending, or null if nothing is loaded yet or warframe-items has no
 * drops for it. Synchronous - call loadAcquisitionData() first and await it.
 */
export function getItemDrops(uniqueName) {
  const candidates = [
    itemIndex?.get(uniqueName),
    itemIndex?.get(canonicalPath(uniqueName)),
    componentIndex?.get(uniqueName),
    componentIndex?.get(canonicalPath(uniqueName)),
  ];
  // A component can also exist as a top-level catalog entry with no drops;
  // keep looking so its recipe-embedded component record is not shadowed.
  const item = candidates.find((candidate) => Array.isArray(candidate?.drops) && candidate.drops.length > 0);
  if (!item || !Array.isArray(item.drops) || item.drops.length === 0) return null;

  return [...item.drops]
    .sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0))
    .map((d) => ({
      type: 'drop',
      location: d.location,
      dropType: d.type,
      rarity: d.rarity,
      chance: d.chance,
    }));
}

/**
 * True if warframe-items has a real Foundry recipe (ingredients + a
 * blueprint sub-component) embedded on this item - a separate
 * representation from DE's own ExportRecipes export, covering items an
 * ExportRecipes.resultType match misses (many Skins/alt helmets in
 * particular). Not itself a drop source, but a fact worth surfacing instead
 * of the generic "no source known" fallback.
 */
export function isCraftable(uniqueName) {
  return !!(itemIndex?.get(uniqueName) || itemIndex?.get(canonicalPath(uniqueName)))?.craftable;
}

/**
 * Returns the complete fallback recipe retained from warframe-items when the
 * DE ExportRecipes resultType index has no matching entry. This is especially
 * useful for cosmetic and alternate-helmet recipes that are present in the
 * item catalog but absent from the local ExportRecipes mapping.
 */
export function getItemRecipe(uniqueName) {
  const item = itemIndex?.get(uniqueName) || itemIndex?.get(canonicalPath(uniqueName));
  if (!item?.craftable || !Array.isArray(item.components)) return null;

  const ingredients = item.components
    .filter((component) => component && component.uniqueName && !/^blueprint$/i.test(component.name || ''))
    .map((component) => ({
      itemType: component.uniqueName,
      count: Number(component.itemCount) || 1,
      name: component.name || component.uniqueName,
    }));
  if (ingredients.length === 0) return null;

  return {
    blueprintCost: item.bpCost,
    buildCost: item.buildPrice,
    buildTime: item.buildTime,
    rushCost: item.skipBuildTimePrice,
    ingredients,
  };
}

/**
 * Returns a wiki link for this item - direct if warframe-items marks it as
 * available, otherwise a search link (never a dead end, per design decision
 * to prefer search's lower maintenance burden over occasional broken direct
 * links - though here we get a direct link for free when it's vetted).
 */
export function getWikiLink(uniqueName, displayName) {
  const item = itemIndex?.get(uniqueName) || itemIndex?.get(canonicalPath(uniqueName));
  if (item?.wikiAvailable && item.wikiaUrl) {
    return { url: item.wikiaUrl, isDirect: true };
  }
  const query = encodeURIComponent(displayName || item?.name || '');
  return { url: `https://wiki.warframe.com/index.php?search=${query}`, isDirect: false };
}
