/**
 * Shared "how do I get this" lookup, reused across Inventory/Rivens/Mods.
 *
 * Checks the hand-curated override data first (vendor/clan-research/quest
 * items with no drop-table entry, ported from wfinfo-ng - keyed by display
 * name for mods, "Weapon|Component" for components), then falls back to
 * drop-table sources (dropIndex, built by dropsParser.js - keyed by
 * unique_name or "display:<lowercased name>"). Returns null if nothing is
 * known about the item, mirroring wfinfo-ng's "No relic source found for
 * this part" fallback.
 *
 * dropIndexKey and displayName are often the same value (an item's display
 * name) but kept separate since components use a "Weapon|Component"
 * override key distinct from either.
 */
export function getAcquisitionInfo(dropIndexKey, displayName, dropIndex, overridesData) {
  const overrideText = overridesData?.mods?.[displayName] ?? overridesData?.components?.[dropIndexKey];
  if (overrideText) {
    return { sources: [{ type: 'override', text: overrideText }] };
  }

  const norm = dropIndexKey?.replace('/StoreItems/', '/');
  const dropSources = dropIndex?.[norm] || dropIndex?.[dropIndexKey] ||
    (displayName ? dropIndex?.['display:' + displayName.toLowerCase().trim()] : null);
  if (dropSources && dropSources.length > 0) {
    return { sources: dropSources };
  }

  return null;
}
