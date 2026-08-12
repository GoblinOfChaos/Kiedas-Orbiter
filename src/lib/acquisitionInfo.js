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
export function getAcquisitionInfo(dropIndexKey, displayName, dropIndex, overridesData) {
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
  const dropSources = dropIndex?.[norm] || dropIndex?.[dropIndexKey] ||
    (displayLower ? dropIndex?.['display:' + displayLower] : null) ||
    // Relics have no real DE uniqueName the app can key on - their
    // unique_name/name is a synthetic "<Era> <Category> Relic" string
    // (inventoryParser.js). dropsParser.js indexes relic drop sources
    // under the "<era> <category>" display key with the trailing " relic"
    // already stripped (DropsAll's own mission-reward names say "Axi A21
    // Relic", but ExportRelics' display name is just "Axi A21"), so query
    // the same stripped form here too - confirmed live 2026-08-11 that
    // without this, essentially no relics could ever match despite the
    // index actually having their data.
    (displayLower?.endsWith(' relic') ? dropIndex?.['display:' + displayLower.slice(0, -6)] : null);
  if (dropSources && dropSources.length > 0) {
    return { sources: dropSources, wikiLink: getWikiLink(dropIndexKey, displayName) };
  }

  return { sources: [], wikiLink: getWikiLink(dropIndexKey, displayName) };
}
