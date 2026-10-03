export function buildFarmingDrawerLookup({ perTarget, shoppingList, ledger, relicPlaces, isPreview }) {
  const map = new Map();
  for (const { target } of perTarget ?? []) {
    map.set(target.uniqueName, { uniqueName: target.uniqueName, name: target.name, image: target.image, category: target.category });
  }
  if (isPreview) {
    for (const entry of ledger ?? []) {
      if (!map.has(entry.itemType)) map.set(entry.itemType, { uniqueName: entry.itemType, name: entry.name, image: entry.image, category: null });
    }
    for (const row of relicPlaces ?? []) {
      if (!map.has(row.place.uniqueName)) map.set(row.place.uniqueName, { uniqueName: row.place.uniqueName, name: row.place.name, image: null, category: 'relics' });
    }
  }
  for (const entry of shoppingList ?? []) {
    if (!map.has(entry.itemType)) map.set(entry.itemType, { uniqueName: entry.itemType, name: entry.name, image: entry.image, category: null });
  }
  return map;
}
