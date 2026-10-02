// Single place that understands both ExportRelics schemas. Every relic consumer
// must go through here; each screen used to carry its own manifest-only copy and
// the 108 newer relics (all Citrine Prime) silently fell out of some of them.
//
//   old: { era, category, quality, icon, rewardManifest }   -> pool lives in ExportRewards
//   new: { name: "Lith A13 Relic", uniqueName, relicRewards: [{ rewardName, rarity, ... }] }
//        (no era / category / quality / icon / rewardManifest)

const ERAS = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem'];
const QUALITY_BY_SUFFIX = { Bronze: 'VPQ_BRONZE', Silver: 'VPQ_SILVER', Gold: 'VPQ_GOLD', Platinum: 'VPQ_PLATINUM' };
// DE's own icon lettering: A=Silver, B=Gold, C=Platinum, D=Bronze (see ExportRelics icon fields).
const ICON_LETTER_BY_QUALITY = { VPQ_SILVER: 'A', VPQ_GOLD: 'B', VPQ_PLATINUM: 'C', VPQ_BRONZE: 'D' };
const TIER_ERA = { 1: 'Lith', 2: 'Meso', 3: 'Neo', 4: 'Axi', 5: 'Requiem' };

function leafOf(uniqueName) {
  const parts = String(uniqueName ?? '').split('/');
  return parts[parts.length - 1] || '';
}

export function relicQualityFromPath(uniqueName) {
  const leaf = leafOf(uniqueName);
  for (const [suffix, quality] of Object.entries(QUALITY_BY_SUFFIX)) {
    if (leaf.endsWith(suffix)) return quality;
  }
  return 'VPQ_BRONZE';
}

export function normalizeRelicEntry(entry, uniqueName) {
  const un = uniqueName ?? entry?.uniqueName ?? entry?.ItemType ?? '';
  const nameTokens = typeof entry?.name === 'string' ? entry.name.trim().split(/\s+/) : [];
  const nameMatch = typeof entry?.name === 'string'
    ? /^(Lith|Meso|Neo|Axi)(?:\s+|[-\s]+(?:Relikt|Relic)\s*:\s*)([A-Z]\d+)\b/i.exec(entry.name.trim())
    : null;
  const nameEra = nameMatch?.[1]
    || ERAS.find((era) => era.toLowerCase() === (nameTokens[0] ?? '').toLowerCase())
    || null;

  const tier = /^T(\d)VoidProjection/i.exec(leafOf(un))?.[1];
  const era = entry?.era || nameEra || TIER_ERA[tier] || null;
  const category = entry?.category || nameMatch?.[2] || (nameEra && nameTokens[1] ? nameTokens[1] : null);
  const quality = entry?.quality || relicQualityFromPath(un);

  let icon = entry?.icon ?? null;
  if (!icon && ['Lith', 'Meso', 'Neo', 'Axi'].includes(era)) {
    icon = `/Lotus/Interface/Icons/Relics/Relic${era}${ICON_LETTER_BY_QUALITY[quality] ?? 'D'}.png`;
  }

  const inlineRewards = Array.isArray(entry?.relicRewards)
    ? entry.relicRewards
      .map((reward) => ({ type: reward?.rewardName ?? reward?.type ?? reward?.rewardItem, rarity: reward?.rarity }))
      .filter((reward) => reward.type)
    : null;

  return { uniqueName: un, era, category, quality, icon, rewardManifest: entry?.rewardManifest ?? null, inlineRewards };
}

// Flat list of { type, rarity } for one relic regardless of schema. `rewardsTable` is ExportRewards.
export function relicRewardPool(entry, rewardsTable, uniqueName) {
  const normalized = normalizeRelicEntry(entry, uniqueName);
  if (normalized.inlineRewards) return normalized.inlineRewards;
  const pool = normalized.rewardManifest ? rewardsTable?.[normalized.rewardManifest] : null;
  if (!pool) return [];
  const list = Array.isArray(pool) ? (Array.isArray(pool[0]) ? pool[0] : pool) : [];
  return list.flat();
}
