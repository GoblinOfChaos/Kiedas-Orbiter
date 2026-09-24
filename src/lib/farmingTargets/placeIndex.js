/**
 * Pure item/source/place index.
 *
 * Parsed DE sections map as follows: *ByAvatar sections are enemy sources;
 * missionRewards/relicRewards/keyRewards are mission or relic sources;
 * transientRewards/sortieRewards are mission sources; Cetus/Solaris/Deimos/
 * Zariman/Entrati Lab/Hex rewards are bounty sources. The three *ByDrop
 * sections are the reverse view of enemy sources, never vendors. Vendor
 * sections are not present in this parser's known section set, so no vendor
 * place is manufactured from a by-item table. `byItem` is keyed by lower-cased
 * display name because DE drop tables expose display names only; distinct
 * items sharing a display name can merge. The audit records detectable
 * by-drop redundancy and display-name collision counts when metadata exists.
 */
import { placeAliases, placeNameCandidates } from './placeAliases.js';
import { realDropRows } from '../deDropTables/parse.js';
import { normalizeRotation } from '../chanceSort.js';

const SOURCE_CATEGORIES = {
  modByAvatar: 'enemy', blueprintByAvatar: 'enemy', resourceByAvatar: 'enemy',
  sigilByAvatar: 'enemy', additionalItemByAvatar: 'enemy', relicByAvatar: 'enemy',
  missionRewards: 'mission', relicRewards: 'relic', keyRewards: 'relic',
  transientRewards: 'transient', sortieRewards: 'sortie', cetusRewards: 'bounty',
  solarisRewards: 'bounty', deimosRewards: 'bounty', zarimanRewards: 'bounty',
  entratiLabRewards: 'bounty', hexRewards: 'bounty', modByDrop: 'enemy',
  blueprintByDrop: 'enemy', resourceByDrop: 'enemy',
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
  return /\(Conclave\)/i.test(String(value)) || String(value).trim() === 'Weekly Conclave Challenge Reward' || /conclave/i.test(section);
}

function findWiki(map, name) {
  return map.get(lower(name));
}

function placeType(category, wikiMission, isConclave) {
  if (isConclave) return 'conclave';
  if (category === 'enemy') return 'enemy';
  if (category === 'bounty') return 'bounty';
  if (category === 'relic') return 'relic';
  if (category === 'vendor') return 'vendor';
  if (category === 'mission' || category === 'transient' || category === 'sortie' || wikiMission) return 'mission';
  return 'mission';
}

function sourceRows(dropTables) {
  const rows = [];
  const redundantDropSections = new Set();
  for (const [avatar, drop] of [['resourceByAvatar', 'resourceByDrop'], ['modByAvatar', 'modByDrop'], ['blueprintByAvatar', 'blueprintByDrop']]) {
    const avatarRows = new Set(realDropRows(asArray(dropTables?.sections?.[avatar])).map((row) => `${row.source}\u0000${row.item}\u0000${row.chance}`));
    const dropRows = new Set(realDropRows(asArray(dropTables?.sections?.[drop])).map((row) => `${row.source}\u0000${row.item}\u0000${row.chance}`));
    if (avatarRows.size === dropRows.size && [...avatarRows].every((key) => dropRows.has(key))) redundantDropSections.add(drop);
  }
  for (const [section, values] of Object.entries(dropTables?.sections ?? {})) {
    const category = SOURCE_CATEGORIES[section];
    if (!category) continue;
    if (redundantDropSections.has(section)) continue;
    for (const row of realDropRows(asArray(values))) {
      if (!(Number(row.chance) > 0)) continue;
      const name = row.place ?? row.source;
      if (!name || !row.item) continue;
      rows.push({ section, category, name: String(name), item: String(row.item), chance: Number(row.chance), rarity: row.rarity ?? null, rotation: normalizeRotation(row.rotation) });
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
    missionMatched += missionsList.filter((mission) => placeNameCandidates(placeAliases.mission[mission] ?? mission).some((candidate) => regionNames.has(lower(candidate)))).length;
    if (planets.length || tilesets.length || missionsList.length) enemiesWithLocation += 1;
  }
  return { enemiesTotal: enemyEntries.length, enemiesWithLocation, planetMatched, planetTotal, missionMatched, missionTotal };
}

function resourceEntries(resources) {
  return moduleEntries(resources?.Resources ?? resources);
}

function resourcePlanets(resource, knownPlanets = new Set()) {
  const structured = [resource?.Planets, resource?.RegionResources].flatMap((value) => Array.isArray(value) ? value : Object.keys(value ?? {}));
  if (structured.length) return [...new Set(structured.map(String).map((value) => value.trim()).filter(Boolean))];
  const match = String(resource?.Description ?? '').match(/(?:^|\n)\s*Location:\s*([^\r\n.]+)/i);
  if (!match) return [];
  const values = [...new Set(match[1].split(/,\s*|\band\s+/i).map((value) => value.trim()).filter(Boolean))];
  if (knownPlanets.size) return values.filter((value) => knownPlanets.has(lower(value)));
  return match[1].includes(',') && /\band\s+/i.test(match[1]) && values.every((value) => /^[A-Za-z]+$/.test(value)) ? values : [];
}

function byDropAudit(dropTables) {
  const pairs = [['resourceByAvatar', 'resourceByDrop'], ['modByAvatar', 'modByDrop'], ['blueprintByAvatar', 'blueprintByDrop']];
  const result = {};
  for (const [avatarSection, dropSection] of pairs) {
    const avatar = new Set(realDropRows(asArray(dropTables?.sections?.[avatarSection])).map((row) => `${row.source}\u0000${row.item}\u0000${row.chance}`));
    const drop = new Set(realDropRows(asArray(dropTables?.sections?.[dropSection])).map((row) => `${row.source}\u0000${row.item}\u0000${row.chance}`));
    result[avatarSection.replace('ByAvatar', '')] = { byDropOnly: [...drop].filter((key) => !avatar.has(key)).length, byAvatarOnly: [...avatar].filter((key) => !drop.has(key)).length };
  }
  return result;
}

function displayNameCollisionCount(entries) {
  const names = new Map();
  for (const [name, value] of entries) {
    const itemType = value?.InternalName ?? value?.itemType ?? name;
    if (!names.has(lower(value?.Name ?? name))) names.set(lower(value?.Name ?? name), new Set());
    names.get(lower(value?.Name ?? name)).add(itemType);
  }
  return [...names.values()].filter((types) => types.size > 1).length;
}

function makePlace({ id, name, type, enemy, mission, conclave }) {
  const planets = asArray(enemy?.Planets);
  const tilesets = asArray(enemy?.TileSets);
  const missions = asArray(enemy?.Missions);
  let level = 'source-only';
  let area;
  if (type === 'enemy') {
    area = { faction: enemy?.Faction, planets: [...planets], tilesets: [...tilesets], missions: [...missions] };
    level = planets.length || tilesets.length || missions.length ? 'wiki-area' : 'unknown';
  } else if (type === 'mission') level = mission?.Boss ? 'fixed-boss' : 'node';
  else if (type === 'planet') level = 'planet';
  return { id, name, type, level, pvp: Boolean(conclave), ...(area ? { area } : {}), badge: type === 'planet' ? 'planet-wide resource (per wiki)' : level === 'unknown' ? 'no listed location' : level };
}

export function buildPlaceIndex({ dropTables, wiki = {}, regions = [] } = {}) {
  const enemies = mapByName(wiki.enemies);
  const missions = mapByName(wiki.missions);
  const resourceList = resourceEntries(wiki.resources);
  const resources = new Map(resourceList.map(([name, value]) => [lower(name), { name, ...value }]));
  const regionByName = new Map(asArray(regions).flatMap((region) => [region.name, region.uniqueName].filter(Boolean).flatMap((name) => placeNameCandidates(name).map((candidate) => [lower(candidate), region]))));
  const knownPlanets = new Set(asArray(regions).map((region) => lower(region.systemName)).filter(Boolean));
  const places = new Map();
  const byItem = new Map();
  for (const row of sourceRows(dropTables)) {
    const enemy = row.category === 'enemy' ? findWiki(enemies, row.name) : undefined;
    const mission = row.category === 'mission' ? (placeNameCandidates(row.name).map((candidate) => findWiki(missions, candidate) ?? regionByName.get(lower(candidate))).find(Boolean)) : undefined;
    const isConclave = conclaveName(row.name, row.section);
    const type = placeType(row.category, mission, isConclave);
    const id = `${type}:${lower(row.name)}`;
    if (!places.has(id)) places.set(id, makePlace({ id, name: row.name, type, enemy, mission, conclave: isConclave }));
    const source = { placeId: id, item: row.item, chance: row.chance, rarity: row.rarity, rotation: row.rotation, category: isConclave ? 'conclave' : row.category };
    const key = lower(row.item);
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key).push(source);
  }
  for (const [, resource] of resources) {
    const item = resource.Name ?? resource.name;
    if (!item) continue;
    for (const planet of resourcePlanets(resource, knownPlanets)) {
      const name = String(planet);
      const id = `planet:${lower(name)}`;
      if (!places.has(id)) places.set(id, makePlace({ id, name, type: 'planet' }));
      const source = { placeId: id, item: String(item), chance: null, rarity: null, rotation: null, category: 'planet' };
      const key = lower(source.item);
      if (!byItem.has(key)) byItem.set(key, []);
      byItem.get(key).push(source);
    }
  }
  for (const sources of byItem.values()) sources.sort((a, b) => a.placeId.localeCompare(b.placeId) || (a.rotation ?? '').localeCompare(b.rotation ?? '') || (b.chance ?? -1) - (a.chance ?? -1));
  return { byItem, places, audit: { ...auditWiki(wiki.enemies, wiki.missions, regions), byDrop: byDropAudit(dropTables), displayNameCollisions: displayNameCollisionCount(resourceList) } };
}
