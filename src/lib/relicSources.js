import { getDropSourcesWithFallback } from './dropsParser.js'
import { sortSourcesByChanceInRotations } from './chanceSort.js'
import { normalizeRelicEntry, relicRewardPool } from './relicEntry.js'

const REFINEMENT_SUFFIX = /\s*\((?:Intact|Exceptional|Flawless|Radiant)\)|\s+(?:Intact|Exceptional|Flawless|Radiant)$/i
const RELIC_NAME = /\b(Lith|Meso|Neo|Axi|Requiem)\s+([A-Z]\d+)\s+Relic\b/i

const canonicalPath = (value) => typeof value === 'string' ? value.replaceAll('/StoreItems/', '/') : value

function relicLikeName(source) {
  return String(source?.relicName || source?.relicManifest || source?.location || source?.name || '')
    .match(RELIC_NAME)?.[0] || ''
}

function isPlainRelicDrop(source) {
  return source?.type !== 'relic' && !!relicLikeName(source)
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
  for (const [uniqueName, entry] of Object.entries(exportData?.ExportRelics || {})) {
    const normalized = normalizeRelicEntry(entry, uniqueName)
    if (!normalized.era || !normalized.category) continue
    const relicName = `${normalized.era} ${normalized.category}`
    for (const reward of relicRewardPool(entry, exportData?.ExportRewards, uniqueName)) {
      if (!reward?.type || !reward?.rarity) continue
      index.set(rarityKey(relicName, reward.type), reward.rarity)
    }
  }
  return index
}

/** Collapse refinement variants and normalize relic-shaped fallback drops. */
export function normalizeRelicSources(sources = [], { rarityIndex = null, itemType = '' } = {}) {
  const result = []
  const relics = new Map()
  const knownRarities = new Map()
  for (const source of sources || []) {
    if (source?.type !== 'relic') continue
    const name = relicNameOf(source)
    if (!name || !source.rarity) continue
    const key = relicKey(source, name)
    if (!knownRarities.has(key) || (source.chance == null && source.state == null)) {
      knownRarities.set(key, source.rarity)
    }
  }

  for (const source of sources || []) {
    const plainRelic = isPlainRelicDrop(source)
    if (source?.type !== 'relic' && !plainRelic) {
      result.push(source)
      continue
    }
    const relicName = relicNameOf(source)
    const key = relicKey(source, relicName)
    const existing = relics.get(key)
    const exportRarity = rarityIndex?.get(rarityKey(relicName, itemType))
      || knownRarities.get(key)
      || source.rarity
    const isExportRelic = source.type === 'relic' && source.chance == null && source.state == null
    const isIntactMirror = /^Intact$/i.test(source.state || '')
    const candidate = {
      ...source,
      type: 'relic',
      relicName,
      relicEra: source.relicEra || relicName.split(/\s+/, 1)[0],
      ...(exportRarity ? { rarity: exportRarity } : {}),
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
