import { buildItemRelics } from './buildItemAcquisition.js'
import { compareTextNumeric } from '../textCompare.js'

// One opt-out switch for every item-to-relic presentation.  The older P58/P62
// names re-export this value so a rollout can still disable the whole model
// without leaving one surface on a different source of truth.
export const ACQUISITION_MODEL_RELICS = true

const ERA_ORDER = ['Lith', 'Meso', 'Neo', 'Axi', 'Vanguard']
const eraRank = new Map(ERA_ORDER.map((era, index) => [era, index]))

function relicParts(relic) {
  const [era = '', ...code] = String(relic || '').split(/\s+/)
  return { era, code: code.join(' ') }
}

export function compareModelRelics(left, right) {
  const leftParts = relicParts(left.relic)
  const rightParts = relicParts(right.relic)
  const leftRank = eraRank.get(leftParts.era) ?? ERA_ORDER.length
  const rightRank = eraRank.get(rightParts.era) ?? ERA_ORDER.length
  if (leftRank !== rightRank) return leftRank - rightRank
  const eraComparison = compareTextNumeric(leftParts.era, rightParts.era)
  if (eraComparison !== 0) return eraComparison
  return compareTextNumeric(leftParts.code, rightParts.code) || compareTextNumeric(left.relic, right.relic)
}

function translatedTiers(relic, t) {
  return (relic.tiers || [relic.tier])
    .filter(Boolean)
    .map((tier) => t(`ui.relic_rarity.${String(tier).toLowerCase()}`))
    .join(' / ')
}

export function modelRelicSource(relic, { t = (key) => key, displayConflictSuffix = false } = {}) {
  if (relic.tierConflict) {
    if (!displayConflictSuffix) {
      return {
        type: 'relic',
        relicName: relic.relic,
        rarity: relic.tier,
        tiers: relic.tiers,
        tierConflict: true,
      }
    }
    return {
      type: 'relic',
      relicName: `${relic.relic} (${translatedTiers(relic, t)})`,
      modelRelicName: relic.relic,
      modelTier: relic.tier,
      tiers: relic.tiers,
      tierConflict: true,
    }
  }
  return { type: 'relic', relicName: relic.relic, rarity: relic.tier }
}

/** Replace only relic rows; non-relic presentation rows retain their order. */
export function replaceRelicRows(itemUniqueName, existingRows = [], ctx = {}, options = {}) {
  const modelRows = buildItemRelics(itemUniqueName, ctx)
    .slice()
    .sort(compareModelRelics)
    .map((relic) => modelRelicSource(relic, { displayConflictSuffix: true, ...options }))
  const rows = []
  let insertedRelics = false
  for (const row of existingRows || []) {
    if (row?.type !== 'relic') {
      rows.push(row)
      continue
    }
    if (!insertedRelics) {
      rows.push(...modelRows)
      insertedRelics = true
    }
  }
  if (!insertedRelics) rows.push(...modelRows)
  return rows
}

/** Replace a drawer's component rows using each component's exact item path. */
export function replaceComponentRelicRows(existingRows = [], recipe = null, ctx = {}, options = {}) {
  const itemTypeByPart = new Map((recipe?.ingredients || []).map((ingredient) => [String(ingredient.name || '').toLowerCase(), ingredient.itemType]))
  const replacedParts = new Set()
  const rows = []
  for (const row of existingRows || []) {
    if (row?.type !== 'relic') {
      rows.push(row)
      continue
    }
    const part = String(row.part || '').toLowerCase()
    const itemType = row.itemType || row.componentType || itemTypeByPart.get(part)
    if (!itemType) {
      // A source without a component identity cannot safely be attributed to
      // another item. Retain it for audit visibility rather than guessing.
      rows.push(row)
      continue
    }
    const key = `${part}|${itemType}`
    if (replacedParts.has(key)) continue
    replacedParts.add(key)
    rows.push(...replaceRelicRows(itemType, [row], ctx, options))
  }
  return rows
}
