import { getDropSourcesWithFallback } from './dropsParser.js'
import { chanceValue, sortSourcesByChanceInRotations } from './chanceSort.js'
import { normalizeRelicEntry, relicRewardPool } from './relicEntry.js'

const REFINEMENT_SUFFIX = /\s*\((?:Intact|Exceptional|Flawless|Radiant)\)|\s+(?:Intact|Exceptional|Flawless|Radiant)$/i
const RELIC_NAME = /\b(Lith|Meso|Neo|Axi|Requiem)\s+([A-Z]\d+)\s+Relic\b/i

const canonicalPath = (value) => typeof value === 'string' ? value.replaceAll('/StoreItems/', '/') : value

function relicLikeName(source) {
  return String(source?.relicName || source?.relicManifest || source?.location || source?.name || '')
    .match(RELIC_NAME)?.[0] || ''
}

function isPlainRelicDrop(source) {
  return source?.type !== 'relic' && (!!source?.relicName || !!source?.relicManifest || !!relicLikeName(source))
}

function relicNameOf(source) {
  return String(source?.relicName || source?.relicManifest || relicLikeName(source))
    .replace(REFINEMENT_SUFFIX, '')
    .replace(/\s+-\s+.*?\s+\d+(?:\.\d+)?%\s*$/i, '')
    .trim()
}

function relicKey(source, name) {
  const era = String(source?.relicEra || name.split(/\s+/, 1)[0] || '').toLowerCase()
  const code = name.toLowerCase()
  return `${era}:${code}`
}

function rarityKey(relicName, itemType) {
  return `${relicName.toLowerCase()}|${canonicalPath(itemType || '').toLowerCase()}`
}

/** Build the DE ExportRelics/ExportRewards rarity lookup used by plain drops. */
export function buildRelicRarityIndex(exportData) {
  const index = new Map()
  const blueprintToResult = new Map()
  for (const [blueprintUniqueName, recipe] of Object.entries(exportData?.ExportRecipes || {})) {
    if (recipe?.resultType) blueprintToResult.set(canonicalPath(blueprintUniqueName), canonicalPath(recipe.resultType))
  }
  for (const [uniqueName, entry] of Object.entries(exportData?.ExportRelics || {})) {
    const normalized = normalizeRelicEntry(entry, uniqueName)
    if (!normalized.era || !normalized.category) continue
    const relicName = `${normalized.era} ${normalized.category}`
    for (const reward of relicRewardPool(entry, exportData?.ExportRewards, uniqueName)) {
      if (!reward?.type || !reward?.rarity) continue
      const rewardType = canonicalPath(reward.type)
      index.set(rarityKey(relicName, rewardType), reward.rarity)
      // Prime part drops name the part blueprint, while Foundry ingredients
      // use that blueprint's resultType (the component path). Keep both
      // identities on the DE-backed index so a drawer never falls back to
      // the unreliable bundled item-data rarity.
      const componentType = blueprintToResult.get(rewardType)
      if (componentType) index.set(rarityKey(relicName, componentType), reward.rarity)
    }
  }
  return index
}

/** Collapse refinement variants and normalize relic-shaped fallback drops. */
export function normalizeRelicSources(sources = [], { rarityIndex = null, itemType = '' } = {}) {
  const result = []
  const relics = new Map()

  for (const source of sources || []) {
    const plainRelic = isPlainRelicDrop(source)
    if (source?.type !== 'relic' && !plainRelic) {
      result.push(source)
      continue
    }
    const relicName = relicNameOf(source)
    const key = relicKey(source, relicName)
    const existing = relics.get(key)
    const sourceItemType = source?.componentType || source?.itemType || itemType
    const exportRarity = rarityIndex?.get(rarityKey(relicName, sourceItemType))
    const isExportRelic = source.type === 'relic' && source.chance == null && source.state == null
    const isIntactMirror = /^Intact$/i.test(source.state || '')
    const { rarity: _bundledRarity, ...sourceWithoutRarity } = source
    const fallbackRarity = rarityIndex ? undefined : _bundledRarity
    const candidate = {
      ...sourceWithoutRarity,
      type: 'relic',
      relicName,
      relicEra: source.relicEra || relicName.split(/\s+/, 1)[0],
      ...((exportRarity || fallbackRarity) ? { rarity: exportRarity || fallbackRarity } : {}),
    }
    delete candidate.chance
    delete candidate.state
    delete candidate.location
    delete candidate.dropType
    delete candidate.name
    if (!existing) {
      relics.set(key, { source: candidate, isExportRelic, isIntactMirror, isPlain: plainRelic })
      result.push(candidate)
      continue
    }
    if ((isExportRelic && !existing.isExportRelic)
      || (isIntactMirror && !existing.isExportRelic && !existing.isIntactMirror)
      || (existing.isPlain && !plainRelic)) {
      const index = result.indexOf(existing.source)
      if (index >= 0) result[index] = candidate
      relics.set(key, { source: candidate, isExportRelic, isIntactMirror, isPlain: plainRelic })
    }
  }
  return result
}

function sourceGroup(type, sources, extra = {}) {
  return { type, sources, ...extra }
}

function dedupeMissionSources(sources) {
  const seen = new Set()
  return sources.filter((source) => {
    const node = source.node || source.nodeName || source.location || ''
    if (!node) return true
    const rotation = source.rotation || source.rotationOrTable || ''
    const chance = source.chance ?? ''
    const key = `${node}|${rotation}|${chance}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function tierSummary(sources) {
  const counts = new Map()
  for (const source of sources) {
    if (!source.rarity) continue
    counts.set(source.rarity, (counts.get(source.rarity) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([rarity]) => rarity)
}

/**
 * Convert the complete acquisition result into rows suitable for a drawer.
 * Relic rows are normalized before grouping, mission rows are deduplicated
 * and ranked, and every collapsed group retains its full child list.
 */
export function prepareAcquisitionSources(sources = [], {
  rarityIndex = null,
  itemType = '',
  maxMissionRows = 15,
  maxRelicRows = 30,
  maxTopLevelRows = 40,
} = {}) {
  const normalized = normalizeRelicSources(sources, { rarityIndex, itemType })
  const missionRows = dedupeMissionSources(normalized.filter((source) => source?.type === 'mission'))
  const nonMissionRows = normalized.filter((source) => source?.type !== 'mission')
  const rows = [...nonMissionRows]

  if (missionRows.length > maxMissionRows) {
    const ranked = [...missionRows].sort((a, b) => (chanceValue(b.chance) ?? -1) - (chanceValue(a.chance) ?? -1))
    rows.push(...ranked.slice(0, maxMissionRows))
    rows.push(sourceGroup('mission-group', ranked.slice(maxMissionRows), { count: ranked.length - maxMissionRows }))
  } else {
    rows.push(...missionRows)
  }

  const relicRows = rows.filter((source) => source?.type === 'relic')
  if (relicRows.length > maxRelicRows) {
    const firstRelic = rows.indexOf(relicRows[0])
    const withoutRelics = rows.filter((source) => source?.type !== 'relic')
    const group = sourceGroup('relic-group', relicRows, {
      relicCount: relicRows.length,
      raritySummary: tierSummary(relicRows),
    })
    withoutRelics.splice(Math.min(firstRelic, withoutRelics.length), 0, group)
    rows.length = 0
    rows.push(...withoutRelics)
  }

  if (rows.length > maxTopLevelRows) {
    const visible = rows.slice(0, maxTopLevelRows - 1)
    const overflow = rows.slice(maxTopLevelRows - 1).flatMap((source) => source?.type?.endsWith('-group') ? source.sources : [source])
    visible.push(sourceGroup('source-group', overflow, { count: overflow.length }))
    return visible
  }
  return rows
}

export function buildIngredientSourceRows(ingredient, dropIndex, fallbackDrops = [], rarityIndex = null) {
  const liveDrops = getDropSourcesWithFallback(ingredient.itemType, dropIndex, ingredient.name)
  const rawDrops = liveDrops.length > 0 ? liveDrops : fallbackDrops
  return normalizeRelicSources(sortSourcesByChanceInRotations(rawDrops || []), {
    rarityIndex,
    itemType: ingredient.itemType,
  })
}

export function buildBlueprintSourceRows(displayName, recipe, dropIndex, fallbackDrops = [], rarityIndex = null) {
  if (!recipe?.blueprintUniqueName) return []
  return buildIngredientSourceRows(
    { itemType: recipe.blueprintUniqueName, name: `${displayName} Blueprint` },
    dropIndex,
    fallbackDrops,
    rarityIndex,
  )
}

export function getRelicSourceLabel(source, t = (key) => key) {
  const name = source?.relicName || source?.relicManifest || t('acquisition_drawer.relic_fallback')
  return `${name}${source?.rarity ? ` (${t(`ui.relic_rarity.${String(source.rarity).toLowerCase()}`)})` : ''}`
}

/** Build translated, DE-tiered relic rows for compact tooltip consumers. */
export function buildRelicTooltipRows(sources = [], { rarityIndex = null, itemType = '', t = (key) => key } = {}) {
  return normalizeRelicSources(sources, { rarityIndex, itemType })
    .filter((source) => source?.type === 'relic')
    .map((source) => ({ source, label: getRelicSourceLabel(source, t) }))
}
