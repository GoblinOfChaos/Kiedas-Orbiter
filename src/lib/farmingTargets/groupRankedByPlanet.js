const text = (value) => String(value ?? '').trim();

function rotationKey(value) {
  const rotation = text(value).replace(/^Rot\s*/i, '').toLowerCase();
  return rotation || '__base__';
}

function chanceValue(source) {
  return source?.chance == null ? Number.NEGATIVE_INFINITY : Number(source.chance);
}

function itemSources(item) {
  return Array.isArray(item?.sources) && item.sources.length > 0 ? item.sources : [item];
}

function mergeCoveredItems(members) {
  const byItem = new Map();

  for (const member of members) {
    for (const item of member.coveredItems ?? []) {
      const itemKey = text(item.itemType) || text(item.name);
      if (!itemKey) continue;
      if (!byItem.has(itemKey)) byItem.set(itemKey, { item: { ...item }, sources: new Map() });
      const merged = byItem.get(itemKey);

      for (const source of itemSources(item)) {
        const key = rotationKey(source?.rotation);
        const previous = merged.sources.get(key);
        if (!previous || chanceValue(source) > chanceValue(previous)) merged.sources.set(key, source);
      }
    }
  }

  return [...byItem.values()].map(({ item, sources }) => ({
    ...item,
    sources: [...sources.values()],
  }));
}

function placeGroupKey(row, index) {
  const planet = text(row?.place?.planet);
  if (planet) return `planet:${planet.toLowerCase()}`;
  const kind = text(row?.place?.kind) || text(row?.place?.level) || text(row?.place?.type);
  if (!kind) return `place:${index}`;
  return `kind:${kind.toLowerCase()}`;
}

export function groupRankedByPlanet(ranked = []) {
  const groups = new Map();

  ranked.forEach((row, index) => {
    const key = placeGroupKey(row, index);
    if (!groups.has(key)) groups.set(key, {
      planet: text(row?.place?.planet) || null,
      kind: text(row?.place?.planet) ? null : (text(row?.place?.kind) || text(row?.place?.level) || text(row?.place?.type) || null),
      members: [],
    });
    groups.get(key).members.push(row);
  });

  return [...groups.values()].map((group) => {
    const first = group.members[0];
    const planet = group.planet;
    const coveredItems = mergeCoveredItems(group.members);
    const place = planet
      ? { ...first.place, id: `planet:${planet.toLowerCase()}`, name: planet, planet }
      : first.place;

    return {
      ...first,
      place,
      planet,
      kind: group.kind,
      members: group.members,
      coveredItems,
      coverage: coveredItems.length,
      totalStillNeeded: coveredItems.reduce((sum, item) => sum + Number(item.stillNeeded ?? 0), 0),
      bestChance: Math.max(...coveredItems.flatMap((item) => item.sources.map((source) => source.chance ?? -1)), -1),
    };
  });
}
