import { getDropSourcesWithFallback } from './dropsParser.js'
import { sortSourcesByChanceInRotations } from './chanceSort.js'

const REFINEMENT_SUFFIX = /\s*\((?:Intact|Exceptional|Flawless|Radiant)\)|\s+(?:Intact|Exceptional|Flawless|Radiant)$/i

function relicNameOf(source) {
  return String(source?.relicName || source?.relicManifest || '')
    .replace(REFINEMENT_SUFFIX, '')
    .replace(/\s+-\s+.*?\s+\d+(?:\.\d+)?%\s*$/i, '')
    .trim()
}

function relicKey(source, name) {
  const era = String(source?.relicEra || name.split(/\s+/, 1)[0] || '').toLowerCase()
  const code = name.toLowerCase()
  return `${era}:${code}`
}

/** Collapse refinement variants while preserving non-relic drop rows verbatim. */
export function normalizeRelicSources(sources = []) {
  const result = []
  const relics = new Map()
  for (const source of sources || []) {
    if (source?.type !== 'relic') {
      result.push(source)
      continue
    }
    const relicName = relicNameOf(source)
    const key = relicKey(source, relicName)
    const existing = relics.get(key)
    const isExportRelic = source.chance == null && source.state == null
    const isIntactMirror = /^Intact$/i.test(source.state || '')
    const candidate = { ...source, relicName }
    delete candidate.chance
    delete candidate.state
    if (!existing) {
      relics.set(key, { source: candidate, isExportRelic, isIntactMirror })
      result.push(candidate)
      continue
    }
    if (isExportRelic && !existing.isExportRelic || isIntactMirror && !existing.isExportRelic && !existing.isIntactMirror) {
      const index = result.indexOf(existing.source)
      if (index >= 0) result[index] = candidate
      relics.set(key, { source: candidate, isExportRelic, isIntactMirror })
    }
  }
  return result
}

export function buildIngredientSourceRows(ingredient, dropIndex, fallbackDrops = []) {
  const liveDrops = getDropSourcesWithFallback(ingredient.itemType, dropIndex, ingredient.name)
  const rawDrops = liveDrops.length > 0 ? liveDrops : fallbackDrops
  return normalizeRelicSources(sortSourcesByChanceInRotations(rawDrops || []))
}

export function getRelicSourceLabel(source, t = (key) => key) {
  const name = source?.relicName || source?.relicManifest || t('acquisition_drawer.relic_fallback')
  return `${name}${source?.rarity ? ` (${t(`ui.relic_rarity.${String(source.rarity).toLowerCase()}`)})` : ''}`
}
