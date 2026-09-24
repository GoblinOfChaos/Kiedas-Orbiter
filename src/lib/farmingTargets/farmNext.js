/** Pure Farm-next coverage ranking.  It makes no yield or time assumptions. */

const lower = (value) => String(value ?? '').trim().toLocaleLowerCase();
const textCompare = (a, b) => String(a).localeCompare(String(b));
const tabTypes = {
  missions: new Set(['mission', 'bounty']),
  enemies: new Set(['enemy']),
  planets: new Set(['planet']),
  relics: new Set(['relic']),
  vendors: new Set(['vendor']),
  conclave: new Set(['conclave']),
};

function sourceRows(placeIndex, row) {
  const keys = [row.itemType, row.name].map(lower).filter(Boolean);
  const seen = new Set();
  const result = [];
  for (const key of keys) {
    for (const source of placeIndex.byItem?.get(key) ?? []) {
      const identity = `${source.placeId}\u0000${source.item}\u0000${source.rotation ?? ''}\u0000${source.chance}`;
      if (!seen.has(identity)) {
        seen.add(identity);
        result.push(source);
      }
    }
  }
  return result;
}

function matchesFilters(place, filters) {
  if (filters.types?.length && !filters.types.includes(place.type)) return false;
  if (filters.factions?.length && !filters.factions.includes(place.area?.faction)) return false;
  if (filters.tab && filters.tab !== 'all' && !tabTypes[filters.tab]?.has(place.type)) return false;
  return true;
}

export function rankPlaces({ ledger = [], placeIndex = { byItem: new Map(), places: new Map() }, filters = {} } = {}) {
  const tab = filters.tab ?? 'all';
  const needed = ledger.filter((row) => Number(row.stillNeeded) > 0).slice().sort((a, b) => textCompare(a.itemType, b.itemType) || textCompare(a.name, b.name));
  const neededByItem = new Map(needed.map((row) => [row.itemType, row]));
  const sourcesByItem = new Map(needed.map((row) => [row.itemType, sourceRows(placeIndex, row)]));
  const conclaveOnlyItems = needed
    .filter((row) => {
      const sources = sourcesByItem.get(row.itemType) ?? [];
      return sources.length > 0 && sources.every((source) => placeIndex.places.get(source.placeId)?.type === 'conclave');
    })
    .map((row) => row.itemType)
    .sort(textCompare);
  const conclaveOnly = new Set(conclaveOnlyItems);
  const conclavePlaces = new Set(
    conclaveOnlyItems.flatMap((itemType) => (sourcesByItem.get(itemType) ?? []).map((source) => source.placeId)),
  );
  const candidates = new Map();
  let excludedByMinChance = 0;
  const excludedByPlace = new Map();
  for (const row of needed) {
    for (const source of sourcesByItem.get(row.itemType) ?? []) {
      if (filters.minChance != null && (source.chance == null || source.chance < Number(filters.minChance))) {
        excludedByMinChance += 1;
        excludedByPlace.set(source.placeId, (excludedByPlace.get(source.placeId) ?? 0) + 1);
        continue;
      }
      const place = placeIndex.places.get(source.placeId);
      if (!place || !matchesFilters(place, filters)) continue;
      if (tab !== 'conclave' && tab !== 'all' && place.type === 'conclave') continue;
      if (tab === 'all' && place.type === 'conclave' && !conclavePlaces.has(source.placeId)) continue;
      if (!candidates.has(source.placeId)) candidates.set(source.placeId, new Map());
      const itemMap = candidates.get(source.placeId);
      const previous = itemMap.get(row.itemType);
      const candidate = { itemType: row.itemType, name: row.name, chance: source.chance, rotation: source.rotation ?? null };
      if (!previous || candidate.chance > previous.chance || (candidate.chance === previous.chance && textCompare(candidate.rotation, previous.rotation) < 0)) itemMap.set(row.itemType, candidate);
    }
  }
  const ranked = [...candidates.entries()].map(([placeId, itemMap]) => {
    const place = placeIndex.places.get(placeId);
    const coveredItems = [...itemMap.values()].sort((a, b) => textCompare(a.itemType, b.itemType));
    const reasonItem = coveredItems.find((item) => conclaveOnly.has(item.itemType));
    return {
      place,
      coverage: coveredItems.length,
      coveredItems,
      totalStillNeeded: coveredItems.reduce((sum, item) => sum + Number(neededByItem.get(item.itemType)?.stillNeeded ?? 0), 0),
      bestChance: Math.max(...coveredItems.map((item) => item.chance ?? -1)),
      ...(excludedByPlace.has(placeId) ? { excludedByMinChance: excludedByPlace.get(placeId) } : {}),
      ...(reasonItem && place.type === 'conclave' ? { reason: `Conclave-only source for ${reasonItem.name}` } : {}),
    };
  });
  ranked.sort((a, b) => b.coverage - a.coverage || b.totalStillNeeded - a.totalStillNeeded || b.bestChance - a.bestChance || textCompare(a.place.name, b.place.name) || textCompare(a.place.id, b.place.id));
  return { ranked, conclaveOnlyItems, excludedByMinChance };
}
