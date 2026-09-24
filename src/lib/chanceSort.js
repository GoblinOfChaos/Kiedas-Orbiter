/**
 * Stable descending sort for lists whose entries may have a drop chance.
 * Numeric chances are already fractions in the live drop index; percent
 * strings are converted to fractions so either representation is comparable.
 */
export function chanceValue(chance) {
  // Plain numeric values are fractions; percent-scale numbers are not supported.
  if (typeof chance === 'number') return Number.isFinite(chance) ? chance : null;
  if (typeof chance === 'string') {
    const match = chance.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+))%$/);
    if (match) {
      const value = Number(match[1]) / 100;
      return Number.isFinite(value) ? value : null;
    }
  }
  return null;
}

function rotationGroupKey(rotation) {
  if (rotation == null || rotation === '' || String(rotation).toUpperCase() === 'A') return 'base';
  const normalized = String(rotation).toUpperCase();
  if (normalized === 'B' || normalized === 'C' || normalized === 'D') return normalized;
  return `other:${String(rotation)}`;
}

export function sortByChanceDesc(items, getChance = (item) => item?.chance) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => ({ item, index, chance: chanceValue(getChance(item)) }))
    .sort((a, b) => {
      const aHasChance = a.chance != null;
      const bHasChance = b.chance != null;
      if (aHasChance && bHasChance) return b.chance - a.chance || a.index - b.index;
      if (aHasChance) return -1;
      if (bHasChance) return 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function sortSourcesByChanceInRotations(items, getChance = (item) => item?.chance) {
  if (!Array.isArray(items)) return [];
  const groups = new Map();
  const otherKeys = [];
  for (const item of items) {
    const key = rotationGroupKey(item?.rotation);
    if (!groups.has(key)) {
      groups.set(key, []);
      if (key.startsWith('other:')) otherKeys.push(key);
    }
    groups.get(key).push(item);
  }
  return ['base', 'B', 'C', 'D', ...otherKeys]
    .filter((key) => groups.has(key))
    .flatMap((key) => sortByChanceDesc(groups.get(key), getChance));
}
