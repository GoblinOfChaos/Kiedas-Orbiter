const MISSION_TYPES = new Map([
  ['MT_ARENA', 'Arena'],
  ['MT_DEFENSE', 'Defense'],
  ['MT_EXCAVATION', 'Excavation'],
  ['MT_INTERCEPTION', 'Interception'],
  ['MT_MOBILE_DEFENSE', 'Mobile Defense'],
  ['MT_PVP', 'Conclave'],
  ['MT_RAILJACK', 'Railjack'],
  ['MT_SURVIVAL', 'Survival'],
]);

const text = (value) => typeof value === 'string' ? value.trim() : '';

function readableMissionType(value) {
  const candidate = text(value);
  if (!candidate || /^MT_|^[A-Z0-9_]+$/.test(candidate)) return MISSION_TYPES.get(candidate) || '';
  return candidate;
}

function standingText(value) {
  if (value == null || value === '') return '';
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString('en-US')} Standing` : `${value} Standing`;
}

function suffixes(source, primary, { includeRegion = true, includeRotation = true, includeRarity = true } = {}) {
  const suffix = [];
  const region = text(source?.region);
  const rotation = text(source?.rotation || source?.rotationOrTable);
  const rarity = text(source?.rarity);
  if (includeRegion && region && !primary.toLowerCase().startsWith(`${region.toLowerCase()}/`) && !primary.toLowerCase().includes(region.toLowerCase())) suffix.push(region);
  if (includeRotation && rotation) suffix.push(`Rot ${rotation}`);
  if (includeRarity && rarity && !/^\d+(?:\.\d+)?%?$/i.test(rarity)) suffix.push(rarity);
  return suffix;
}

/**
 * Return the factual place attached to a drop row. This is intentionally
 * independent of React/i18n so the resolver, Inventory tooltip, and Farming
 * Targets use exactly the same precedence and never invent a location.
 */
export function sourceLabel(source, { includeRegion = true, includeRotation = true, includeRarity = true } = {}) {
  if (!source || typeof source !== 'object') return '';

  const objective = text(source.objectiveName);
  const enemy = text(source.enemyName || source.enemy);
  const syndicate = text(source.syndicateName);
  const place = text(source.place);
  const standing = standingText(source.standing);
  const node = text(source.nodeName || source.node || source.location);
  const resourceSource = text(source.resourceSource);
  const readableResourceSource = resourceSource && !/^(?:drops|browse)\.wf(?:\b|$)/i.test(resourceSource) ? resourceSource : '';
  const sourceName = text(readableResourceSource || source.sourceName || source.vendor || source.keyName || source.bountyName || source.bountyLevel || source.place || source.dropType || source.name);
  const missionType = readableMissionType(source.missionType);
  let primary = objective || enemy || text(source.vendor);
  if (!primary && syndicate) primary = [syndicate, place].filter(Boolean).join(' - ');
  if (!source.vendor && primary && standing && syndicate && !/standing/i.test(primary)) primary = `${primary} (${standing})`;
  primary ||= node || sourceName || missionType;
  if (!primary && source.type === 'sortie') primary = 'Sortie reward';
  if (!primary && source.type === 'relic') primary = text(source.relicName || source.relicManifest);
  if (!primary) return '';
  return [primary, ...suffixes(source, primary, { includeRegion, includeRotation, includeRarity })].join(' — ');
}

export function sourceHasPlace(source) {
  return Boolean(sourceLabel(source));
}
