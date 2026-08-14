import { getItemDrops, getWikiLink } from './acquisitionData';

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
// label without guessing, unlike Skins/Sigils/Misc/Gear/Resources, which are
// too heterogeneous (Market purchase, syndicate rank, event reward, quest
// reward, all mixed under the same paths) to classify correctly from the
// uniqueName alone. Mislabeling those would give wrong acquisition guidance,
// so they're left showing the generic wiki fallback instead of a guess.
const NON_DROP_PATTERNS = [
  { test: (un) => un?.includes('/Upgrades/Focus/'), text: 'Unlocked via the Focus tree, not obtained from a drop.' },
  { test: (un) => /\/Types\/Keys\/.*KeyChain$/.test(un || ''), text: 'Awarded from completing this quest.' },
];

const canonicalPath = (v) => v?.replace('/StoreItems/', '/') || v;

/**
 * Maps a craftable equipment's own uniqueName (the finished Warframe/weapon)
 * to true if ExportRecipes has a blueprint whose resultType builds it - e.g.
 * most base Warframes/weapons aren't themselves "dropped", only their
 * blueprint + component parts are (which are separately tracked items with
 * their own acquisition entries). Build once per exportData change and pass
 * into getAcquisitionInfo, mirroring how dropIndex is built once in
 * MonitoringContext rather than per-call.
 */
export function buildRecipeResultIndex(exportData) {
  const index = new Set();
  const recipes = exportData?.ExportRecipes;
  if (!recipes || typeof recipes !== 'object') return index;
  for (const recipe of Object.values(recipes)) {
    if (recipe?.resultType) index.add(canonicalPath(recipe.resultType));
  }
  return index;
}

export function getAcquisitionInfo(dropIndexKey, displayName, dropIndex, overridesData, recipeResultIndex) {
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

  if (recipeResultIndex?.has(canonicalPath(dropIndexKey))) {
    return {
      sources: [{ type: 'non-drop', text: 'Built in the Foundry from a blueprint and its components - see the Foundry tab for the recipe.' }],
      wikiLink: getWikiLink(dropIndexKey, displayName),
    };
  }

  return { sources: [], wikiLink: getWikiLink(dropIndexKey, displayName) };
}
