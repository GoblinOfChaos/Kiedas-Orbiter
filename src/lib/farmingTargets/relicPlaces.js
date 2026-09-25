/** Pure relic-place ranking for the Preview Farm-next screen. */
import {
  getRelicCatalog,
  getRelicRewardChance,
} from '../relicParser.js';

export const RELIC_REFINEMENTS = ['Intact', 'Exceptional', 'Flawless', 'Radiant'];

const lower = (value) => String(value ?? '').trim().toLocaleLowerCase();
const textCompare = (a, b) => String(a ?? '').localeCompare(String(b ?? ''));
const canonical = (value) => lower(value).replace('/storeitems/', '/');

function ownedByKey(inventoryData) {
  const result = new Map();
  for (const relic of inventoryData?.relics ?? []) {
    const key = `${relic.era ?? ''} ${relic.code ?? relic.name ?? ''}`.trim();
    if (!key) continue;
    result.set(lower(key), {
      uniqueName: relic.real_unique_name ?? relic.unique_name,
      refinements: RELIC_REFINEMENTS.reduce((counts, refinement) => {
        counts[refinement] = Number(relic.refinements?.[refinement] ?? 0) || 0;
        return counts;
      }, {}),
    });
  }
  return result;
}

function rewardMatches(reward, row) {
  const rewardKey = canonical(reward.uniqueName);
  const itemKey = canonical(row.itemType);
  return rewardKey === itemKey || lower(reward.name) === lower(row.name);
}

function relicSources(relic, dropIndex) {
  const names = new Set([relic.key, `${relic.era} ${relic.name} Relic`, relic.name].map(lower));
  const sources = [];
  for (const [itemKey, entries] of Object.entries(dropIndex ?? {})) {
    if (!Array.isArray(entries)) continue;
    for (const source of entries) {
      const sourceItem = source.itemName ?? source.item ?? source.displayName ?? source.relicName;
      if (!names.has(lower(itemKey)) && !names.has(lower(sourceItem))) continue;
      const name = source.nodeName ?? source.node ?? source.source ?? source.name;
      if (!name || lower(name) === 'drops.wf' || lower(name) === 'browse.wf') continue;
      sources.push({
        name,
        type: source.type ?? 'mission',
        chance: source.chance == null ? null : Number(source.chance),
        rotation: source.rotation ?? null,
      });
    }
  }
  return sources.sort((a, b) => textCompare(a.name, b.name) || textCompare(a.rotation, b.rotation));
}

function catalogName(relic) {
  return `${relic.era} ${relic.name} Relic`;
}

/**
 * Build relic places from the DE-derived catalog, grouped owned inventory, and
 * the existing ledger. No relic chance is calculated here: the parser owns
 * the verified Intact/Exceptional/Flawless/Radiant probabilities.
 */
export function buildRelicPlaces({ ledger = [], inventoryData, exportData, dropIndex = {}, catalog } = {}) {
  const needed = ledger.filter((row) => Number(row.stillNeeded) > 0);
  const owned = ownedByKey(inventoryData);
  const relicCatalog = catalog ?? getRelicCatalog(exportData);

  return relicCatalog.map((relic) => {
    const ownedEntry = owned.get(lower(relic.key));
    const refinements = ownedEntry?.refinements ?? RELIC_REFINEMENTS.reduce((counts, refinement) => {
      counts[refinement] = 0;
      return counts;
    }, {});
    const coveredItems = needed.flatMap((row) => {
      const reward = relic.rewards.find((candidate) => rewardMatches(candidate, row));
      if (!reward) return [];
      const chances = RELIC_REFINEMENTS.reduce((values, refinement) => {
        values[refinement] = getRelicRewardChance(reward, refinement, relic.rewards);
        return values;
      }, {});
      return [{
        itemType: row.itemType,
        name: row.name,
        stillNeeded: row.stillNeeded,
        reward: reward.uniqueName,
        chances,
        bestChance: Math.max(...Object.values(chances).filter((chance) => chance != null)),
      }];
    });
    const sources = relicSources(relic, dropIndex);
    const place = {
      id: `relic:${lower(relic.key)}`,
      name: catalogName(relic),
      type: 'relic',
      level: 'source-only',
      badge: relic.vaulted ? 'vaulted' : 'source only',
      vaulted: relic.vaulted === true,
      obtainable: relic.vaulted !== true,
      uniqueName: relic.uniqueName,
      era: relic.era,
      code: relic.name,
      ownedCount: Object.values(refinements).reduce((sum, count) => sum + count, 0),
      refinements,
      sources,
      howToGet: !relic.vaulted && sources.length ? sources : [],
    };
    return {
      place,
      relic: place,
      coverage: coveredItems.length,
      coveredItems,
      totalStillNeeded: coveredItems.reduce((sum, item) => sum + Number(item.stillNeeded || 0), 0),
      bestChance: Math.max(...coveredItems.map((item) => item.bestChance), -1),
    };
  }).filter((row) => row.coverage > 0).sort((a, b) =>
    Number(b.place.obtainable) - Number(a.place.obtainable) ||
    b.coverage - a.coverage ||
    b.totalStillNeeded - a.totalStillNeeded ||
    b.bestChance - a.bestChance ||
    textCompare(a.place.name, b.place.name) ||
    textCompare(a.place.id, b.place.id)
  );
}
