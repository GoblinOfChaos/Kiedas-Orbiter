/**
 * Enemy areas for the Farm next Enemies tab.
 *
 * The wiki's enemy modules list, per enemy, the planets, tilesets and missions where it appears.
 * Only entries that match Digital Extremes' own region list by exact (case-insensitive) name are
 * kept as planets and nodes; every other wiki string stays out of the index rather than being
 * guessed into a place. Enemies are joined to drop-table enemies by exact name only.
 */

export const ENEMY_DATA_MODULES = [
  'Module:Enemies/data',
  'Module:Enemies/data/anarchs',
  'Module:Enemies/data/corpus',
  'Module:Enemies/data/grineer',
  'Module:Enemies/data/infestation',
  'Module:Enemies/data/narmer',
  'Module:Enemies/data/orokin',
  'Module:Enemies/data/scaldra',
  'Module:Enemies/data/sentient',
  'Module:Enemies/data/stalker',
  'Module:Enemies/data/techrot',
  'Module:Enemies/data/themurmur',
  'Module:Enemies/data/unaffiliated',
];

const lower = (value) => String(value ?? '').trim().toLowerCase();
const list = (value) => (Array.isArray(value) ? value : typeof value === 'string' && value.trim() ? [value] : []);

function regionRows(regions) {
  if (Array.isArray(regions)) return regions;
  if (Array.isArray(regions?.ExportRegions)) return regions.ExportRegions;
  return Object.values(regions ?? {}).filter((value) => value && typeof value === 'object');
}

/**
 * @param {Array<Record<string, object>>} enemyModules parsed `Module:Enemies/data*` JSON objects
 * @param {object|Array} regions DE ExportRegions
 * @param {Record<string, string>} dict DE language dictionary (region names may be dictionary keys)
 * @returns {Map<string, {name: string, faction: string|null, planets: string[], nodes: string[]}>}
 *   keyed by lower-case wiki enemy name; enemies with no verified planet or node are left out
 */
export function buildEnemyAreaIndex(enemyModules = [], regions = [], dict = {}) {
  const text = (value) => String(dict?.[value] ?? dict?.[`/${value}`] ?? value ?? '').trim();
  const planetNames = new Map();
  const nodeNames = new Map();
  for (const region of regionRows(regions)) {
    const planet = text(region.systemName);
    const node = text(region.name);
    if (planet) planetNames.set(lower(planet), planet);
    if (node) nodeNames.set(lower(node), node);
  }
  const index = new Map();
  for (const module of enemyModules) {
    for (const [name, entry] of Object.entries(module ?? {})) {
      const general = entry?.General ?? entry ?? {};
      const planets = [...new Set(list(general.Planets).map((planet) => planetNames.get(lower(planet))).filter(Boolean))];
      const nodes = [...new Set(list(general.Missions).map((node) => nodeNames.get(lower(node))).filter(Boolean))];
      if (!planets.length && !nodes.length) continue;
      const key = lower(name);
      if (index.has(key)) continue;
      index.set(key, { name, faction: general.Faction ? String(general.Faction) : null, planets, nodes });
    }
  }
  return index;
}

/** Loads the wiki enemy modules through a wiki store client; modules missing from the store are skipped. */
export async function loadEnemyModules(wikiStore, titles = ENEMY_DATA_MODULES) {
  const loaded = await Promise.all(titles.map((title) => wikiStore.getModule(title).then((module) => module.data, () => null)));
  return loaded.filter((data) => data && typeof data === 'object');
}
