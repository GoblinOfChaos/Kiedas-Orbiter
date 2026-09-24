/**
 * Verified name aliases only.  The initial table is intentionally empty:
 * unmatched wiki and DE names remain unmatched until a primary-source join
 * proves an alias.
 */
export const placeAliases = {
  planet: Object.freeze({}),
  mission: Object.freeze({}),
  tileset: Object.freeze({}),
};

export function normalizePlaceName(value) {
  return String(value ?? '').replace(/ \(Caches\)$/i, '').trim();
}

export function placeNameCandidates(value) {
  const normalized = normalizePlaceName(value).replace(/^Event:\s*/i, '');
  const slash = normalized.lastIndexOf('/');
  return [...new Set([normalized, slash >= 0 ? normalized.slice(slash + 1) : normalized].filter(Boolean))];
}
