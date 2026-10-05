import { getDropSourcesWithFallback } from './dropsParser.js'
import { chanceValue, sortSourcesByChanceInRotations } from './chanceSort.js'
import { normalizeRelicEntry, relicRewardPool } from './relicEntry.js'
import { compareText } from './textCompare.js'

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
  return normalizeRelicName(String(source?.relicName || source?.relicManifest || relicLikeName(source)))
}

/** Normalize every DE/user-facing relic spelling to `Era Code`. */
export function normalizeRelicName(value) {
  return String(value || '')
    .replace(REFINEMENT_SUFFIX, '')
    .replace(/\s+-\s+.*?\s+\d+(?:\.\d+)?%\s*$/i, '')
    .replace(/\s+Relic\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function relicKey(source, name) {
  const era = String(source?.relicEra || name.split(/\s+/, 1)[0] || '').toLowerCase()
  const code = name.toLowerCase()
  return `${era}:${code}`
}

function rarityKey(relicName, itemType) {
  return `${normalizeRelicName(relicName).toLowerCase()}|${canonicalPath(itemType || '').toLowerCase()}`
}

function normalizedIdentity(value) {
  return String(value || '').replaceAll('/StoreItems/', '/').replace(/\s+/g, ' ').trim().toLowerCase()
}

function resolvedExportName(value, dict = {}) {
  if (typeof value !== 'string') return ''
  const resolved = dict[value] || dict[`/${value}`] || value
  return String(resolved).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function addRelatedIdentity(related, left, right) {
  const a = canonicalPath(left)
  const b = canonicalPath(right)
  if (!a || !b) return
  const leftSet = related.get(a) || new Set([a])
  const rightSet = related.get(b) || new Set([b])
  const merged = new Set([...leftSet, ...rightSet])
  for (const identity of merged) related.set(identity, merged)
}

function addIdentityVariants(related, value) {
  const identity = canonicalPath(value)
  if (!identity) return
  if (!related.has(identity)) related.set(identity, new Set([identity]))
  if (/Component$/i.test(identity)) addRelatedIdentity(related, identity, identity.replace(/Component$/i, 'Blueprint'))
  if (/Blueprint$/i.test(identity)) addRelatedIdentity(related, identity, identity.replace(/Blueprint$/i, 'Component'))
}

function buildIdentityMaps(exportData) {
  const related = new Map()
  const displayToIdentities = new Map()
  const addDisplay = (displayName, identity) => {
    const name = normalizedIdentity(displayName)
    const path = canonicalPath(identity)
    if (!name || !path || name === 'blueprint') return
    addIdentityVariants(related, path)
    const identities = displayToIdentities.get(name) || new Set()
    identities.add(path)
    displayToIdentities.set(name, identities)
  }

  for (const [blueprintUniqueName, recipe] of Object.entries(exportData?.ExportRecipes || {})) {
    if (!recipe?.resultType) continue
    addRelatedIdentity(related, blueprintUniqueName, recipe.resultType)
  }

  const tables = ['ExportWarframes', 'ExportWeapons', 'ExportSentinels', 'ExportGear', 'ExportCustoms', 'ExportResources', 'ExportUpgrades']
  for (const tableName of tables) {
    const table = exportData?.[tableName]
    if (!table || typeof table !== 'object') continue
    for (const [key, entry] of Object.entries(table)) {
      const identity = entry?.uniqueName || entry?.ItemType || key
      addDisplay(resolvedExportName(entry?.name || entry?.displayName, exportData?.dict || {}), identity)
    }
  }

  for (const item of exportData?.AcquisitionItems || []) {
    if (!item) continue
    if (item.uniqueName) addDisplay(item.name, item.uniqueName)
    for (const component of item.components || []) {
      if (!component?.uniqueName) continue
      addDisplay(component.name === 'Blueprint' ? `${item.name} Blueprint` : `${item.name} ${component.name}`, component.uniqueName)
      if (component.name !== 'Blueprint') addDisplay(`${item.name} ${component.name} Blueprint`, component.uniqueName)
    }
  }

  for (const identity of related.keys()) addIdentityVariants(related, identity)
  return { related, displayToIdentities }
}

function identityAliases(identity, maps) {
  const aliases = new Set()
  const add = (value) => {
    const path = canonicalPath(value)
    if (!path) return
    const group = maps.related.get(path) || new Set([path])
    for (const member of group) aliases.add(member)
  }
  add(identity)
  for (const path of maps.displayToIdentities.get(normalizedIdentity(identity)) || []) add(path)
  return aliases
}

/** Build the DE ExportRelics/ExportRewards rarity lookup used by plain drops. */
export function buildRelicRarityIndex(exportData) {
  const index = new Map()
  const maps = buildIdentityMaps(exportData)
  for (const [uniqueName, entry] of Object.entries(exportData?.ExportRelics || {})) {
    const normalized = normalizeRelicEntry(entry, uniqueName)
    if (!normalized.era || !normalized.category) continue
    const relicName = `${normalized.era} ${normalized.category}`
    for (const reward of relicRewardPool(entry, exportData?.ExportRewards, uniqueName)) {
      if (!reward?.type || !reward?.rarity) continue
      for (const identity of identityAliases(reward.type, maps)) index.set(rarityKey(relicName, identity), reward.rarity)
    }
  }
  Object.defineProperty(index, 'identityMaps', { value: maps })
  return index
}

/** Resolve a DE tier through the same path/blueprint/display-name identity map used by drawers. */
export function resolveRelicRarity(rarityIndex, relicName, itemType) {
  if (!rarityIndex) return undefined
  const direct = rarityIndex.get(rarityKey(relicName, itemType))
  if (direct) return direct
  for (const identity of identityAliases(itemType, rarityIndex.identityMaps || { related: new Map(), displayToIdentities: new Map() })) {
    const rarity = rarityIndex.get(rarityKey(relicName, identity))
    if (rarity) return rarity
  }
  return undefined
}

/** Count unique fallback relic rows that have no matching DE ExportRelics tier. */
export function countRelicRowsWithoutDeTier(exportData, rarityIndex) {
  const missing = new Set()
  for (const item of exportData?.AcquisitionItems || []) {
    for (const component of item?.components || []) {
      if (!component?.uniqueName || !Array.isArray(component.drops)) continue
      for (const drop of component.drops) {
        const match = String(drop?.location || '').match(/\b(?:Lith|Meso|Neo|Axi|Requiem)\s+[A-Z]\d+/i)
        if (!match) continue
        const relicName = normalizeRelicName(match[0])
        if (!resolveRelicRarity(rarityIndex, relicName, component.uniqueName)) {
          missing.add(`${canonicalPath(component.uniqueName)}|${relicName.toLowerCase()}`)
        }
      }
    }
  }
  return missing.size
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
    // A malformed DE reward row has no relic identity at all. It cannot be
    // paired with ExportRelics, so do not render a misleading bare "Relic"
    // label or attach a tier from a different item.
    if (!relicName) continue
    const key = relicKey(source, relicName)
    const existing = relics.get(key)
    const sourceItemType = source?.componentType || source?.itemType || itemType
    const exportRarity = resolveRelicRarity(rarityIndex, relicName, sourceItemType)
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
    .sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))
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
  const name = normalizeRelicName(source?.relicName || source?.relicManifest) || t('acquisition_drawer.relic_fallback')
  return `${name}${source?.rarity ? ` (${t(`ui.relic_rarity.${String(source.rarity).toLowerCase()}`)})` : ''}`
}

/** Build translated, DE-tiered relic rows for compact tooltip consumers. */
export function buildRelicTooltipRows(sources = [], { rarityIndex = null, itemType = '', t = (key) => key } = {}) {
  return normalizeRelicSources(sources, { rarityIndex, itemType })
    .filter((source) => source?.type === 'relic')
    .map((source) => ({ source, label: getRelicSourceLabel(source, t) }))
}
