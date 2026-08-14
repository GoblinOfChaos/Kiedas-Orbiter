// Loads the pre-extracted warframe-items data (scripts/extract-warframe-items-acquisition.mjs)
// via the same bundled-JSON pattern this app already uses elsewhere
// (invoke('read_file_bytes', ...)). This is the primary acquisition data
// source per docs/superpowers/specs/2026-08-09-acquisition-info-drawer-design.md.
import { invoke } from '@tauri-apps/api/core';

let itemIndex = null;
let loadPromise = null;

export function loadAcquisitionData() {
  if (itemIndex) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = invoke('read_file_bytes', { relative: 'data/assets/data/warframe-items-acquisition.json' })
    .then((bytes) => {
      const arr = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
      itemIndex = new Map(arr.map((item) => [item.uniqueName, item]));
    })
    .catch(() => { itemIndex = new Map(); });
  return loadPromise;
}

/**
 * Returns this item's drop sources (enemy/mission/relic), ranked by chance
 * descending, or null if nothing is loaded yet or warframe-items has no
 * drops for it. Synchronous - call loadAcquisitionData() first and await it.
 */
export function getItemDrops(uniqueName) {
  const item = itemIndex?.get(uniqueName);
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
  return !!itemIndex?.get(uniqueName)?.craftable;
}

/**
 * Returns a wiki link for this item - direct if warframe-items marks it as
 * available, otherwise a search link (never a dead end, per design decision
 * to prefer search's lower maintenance burden over occasional broken direct
 * links - though here we get a direct link for free when it's vetted).
 */
export function getWikiLink(uniqueName, displayName) {
  const item = itemIndex?.get(uniqueName);
  if (item?.wikiAvailable && item.wikiaUrl) {
    return { url: item.wikiaUrl, isDirect: true };
  }
  const query = encodeURIComponent(displayName || item?.name || '');
  return { url: `https://wiki.warframe.com/index.php?search=${query}`, isDirect: false };
}
