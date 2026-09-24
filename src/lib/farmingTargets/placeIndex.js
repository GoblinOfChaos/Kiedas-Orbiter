/**
 * Pure item/source/place index.
 *
 * Conclave is identified only by the verified DE names/markers observed in
 * the cached drop tables: a place containing "(Conclave)", the exact label
 * "Weekly Conclave Challenge Reward", or an explicit Conclave section/label.
 * Under-review zero-chance rows are excluded through realDropRows semantics.
 */
import { placeAliases, placeNameCandidates } from './placeAliases.js';

const SOURCE_CATEGORIES = {
  modByAvatar: 'enemy', blueprintByAvatar: 'enemy', resourceByAvatar: 'enemy',
  sigilByAvatar: 'enemy', additionalItemByAvatar: 'enemy', relicByAvatar: 'enemy',
  missionRewards: 'mission', relicRewards: 'relic', keyRewards: 'relic',
  transientRewards: 'transient', sortieRewards: 'sortie', cetusRewards: 'bounty',
  solarisRewards: 'bounty', deimosRewards: 'bounty', zarimanRewards: 'bounty',
  entratiLabRewards: 'bounty', hexRewards: 'bounty', modByDrop: 'vendor',
  blueprintByDrop: 'vendor', resourceByDrop: 'vendor',
};

const lower = (value) => String(value ?? '').trim().toLocaleLowerCase();
const asArray = (value) => Array.isArray(value) ? value : [];
const moduleEntries = (module) => Object.entries(module ?? {}).flatMap(([name, value]) => {
  if (value?.General && typeof value.General === 'object') return [[name, value.General]];
  if (value && typeof value === 'object') return [[name, value]];
  return [];
});

function mapByName(module) {
  return new Map(moduleEntries(module).map(([name, value]) => [lower(name), { name, ...value }]));
}

function conclaveName(value, section = '') {
  return /\(Conclave\)/i.test(String(value)) ||
    String(value).trim() === 'Weekly Conclave Challenge Reward' || /conclave/i.test(section);
}

function findWiki(map, name) {
  return map.get(lower(name));
}

function placeType(category, name, wikiEnemy, wikiMission, isConclave) {
  if (isConclave) return 'conclave';
  if (wikiEnemy || category === 'enemy') return 'enemy';
  if (category === 'bounty') return 'bounty';
  if (category === 'relic') return 'relic';
  if (category === 'vendor') return 'vendor';
  if (wikiMission || category === 'mission' || category === 'transient' || category === 'sortie') return 'mission';
  if (wikiEnemy) return 'enemy';
  return 'mission';
}

function sourceRows(dropTables) {
  const rows = [];
  for (const [section, values] of Object.entries(dropTables?.sections ?? {})) {
    const category = SOURCE_CATEGORIES[section];
    if (!category) continue;
    for (const row of asArray(values)) {
      if (!row || row.underReview || !(Number(row.chance) > 0)) continue;
      const name = row.place ?? row.source;
      if (!name || !row.item) continue;
      rows.push({ section, category, name: String(name), item: String(row.item), chance: Number(row.chance), rarity: row.rarity ?? null, rotation: row.rotation ?? null });
    }
  }
  return rows;
}

function auditWiki(enemies, missions, regions) {
  const enemyEntries = moduleEntries(enemies);
  let enemiesWithLocation = 0;
  let planetTotal = 0;
  let planetMatched = 0;
  let missionTotal = 0;
  let missionMatched = 0;
  const regionPlanets = new Set(asArray(regions).map((row) => lower(row.systemName)).filter(Boolean));
  const regionNames = new Set(asArray(regions).flatMap((row) => [row.name, row.uniqueName].flatMap(placeNameCandidates)).map(lower).filter(Boolean));
  for (const [, enemy] of enemyEntries) {
    const planets = asArray(enemy.Planets);
    const tilesets = asArray(enemy.TileSets);
    const missionsList = asArray(enemy.Missions);
    planetTotal += planets.length;
    planetMatched += planets.filter((planet) => regionPlanets.has(lower(placeAliases.planet[planet] ?? planet))).length;
    missionTotal += missionsList.length;
    missionMatched += missionsList.filter((mission) => placeNameCandidates(placeAliases.planet[mission] ?? mission).some((candidate) => regionNames.has(lower(candidate)))).length;
    if (planets.length || tilesets.length || missionsList.length) enemiesWithLocation += 1;
  }
  return { enemiesTotal: enemyEntries.length, enemiesWithLocation, planetMatched, planetTotal, missionMatched, missionTotal };
}

function makePlace({ id, name, type, enemy, mission, category, conclave }) {
  const planets = asArray(enemy?.Planets);
  const tilesets = asArray(enemy?.TileSets);
  const missions = asArray(enemy?.Missions);
  let level = 'source-only';
  let area;
  if (type === 'enemy') {
    area = { faction: enemy?.Faction, planets: [...planets], tilesets: [...tilesets], missions: [...missions] };
    level = planets.length || tilesets.length || missions.length ? 'wiki-area' : 'unknown';
  } else if (type === 'mission') {
    level = mission?.Boss ? 'fixed-boss' : 'node';
  } else if (type === 'conclave') {
    level = 'source-only';
  }
  return {
    id, name, type, level, pvp: Boolean(conclave),
    ...(area ? { area } : {}),
    badge: level === 'unknown' ? 'no listed location' : level,
  };
}

export function buildPlaceIndex({ dropTables, wiki = {}, regions = [] } = {}) {
  const enemies = mapByName(wiki.enemies);
  const missions = mapByName(wiki.missions);
  const resources = mapByName(wiki.resources);
  const regionByName = new Map(asArray(regions).flatMap((region) => [region.name, region.uniqueName].filter(Boolean).flatMap((name) => placeNameCandidates(name).map((candidate) => [lower(candidate), region]))));
  const places = new Map();
  const byItem = new Map();
  for (const row of sourceRows(dropTables)) {
    const enemy = findWiki(enemies, row.name);
    const mission = row.category === 'mission' ? (placeNameCandidates(row.name).map((candidate) => findWiki(missions, candidate) ?? regionByName.get(lower(candidate))).find(Boolean)) : undefined;
    const isConclave = conclaveName(row.name, row.section);
    const type = placeType(row.category, row.name, enemy, mission, isConclave);
    const id = `${type}:${lower(row.name)}`;
    if (!places.has(id)) places.set(id, makePlace({ id, name: row.name, type, enemy, mission, category: row.category, conclave: isConclave }));
    const source = { placeId: id, item: row.item, chance: row.chance, rarity: row.rarity, rotation: row.rotation, category: isConclave ? 'conclave' : row.category };
    const key = lower(row.item);
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key).push(source);
  }
  for (const sources of byItem.values()) sources.sort((a, b) => a.placeId.localeCompare(b.placeId) || (a.rotation ?? '').localeCompare(b.rotation ?? '') || b.chance - a.chance);
  void resources;
  return { byItem, places, audit: auditWiki(wiki.enemies, wiki.missions, regions) };
}
