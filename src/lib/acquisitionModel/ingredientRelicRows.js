import { buildItemRelics } from './buildItemAcquisition.js'
import { compareTextNumeric } from '../textCompare.js'

export const ACQUISITION_MODEL_INGREDIENT_RELICS = true

const ERA_ORDER = ['Lith', 'Meso', 'Neo', 'Axi', 'Vanguard']
const eraRank = new Map(ERA_ORDER.map((era, index) => [era, index]))

function relicParts(relic) {
  const [era = '', ...code] = String(relic || '').split(/\s+/)
  return { era, code: code.join(' ') }
}

function compareRelics(left, right) {
  const leftParts = relicParts(left.relic)
  const rightParts = relicParts(right.relic)
  const leftRank = eraRank.get(leftParts.era) ?? ERA_ORDER.length
  const rightRank = eraRank.get(rightParts.era) ?? ERA_ORDER.length
  if (leftRank !== rightRank) return leftRank - rightRank
  const eraComparison = compareTextNumeric(leftParts.era, rightParts.era)
  if (eraComparison !== 0) return eraComparison
  const codeComparison = compareTextNumeric(leftParts.code, rightParts.code)
  return codeComparison || compareTextNumeric(left.relic, right.relic)
}

function translatedTiers(relic, t) {
  return (relic.tiers || [relic.tier])
    .filter(Boolean)
    .map((tier) => t(`ui.relic_rarity.${String(tier).toLowerCase()}`))
    .join(' / ')
}

function sourceFor(relic, t) {
  if (relic.tierConflict) {
    // Existing drawers delegate relic labels to getRelicSourceLabel(), which
    // only knows one rarity. Put the translated multi-tier suffix in the
    // displayed relic identity while retaining the exact DE identity/facts for
    // audits and any future renderer that understands tierConflict directly.
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

/**
 * Replace just an ingredient's display relic sources with its exact DE model
 * relics. Non-relic rows retain both their objects and relative ordering.
 */
export function buildIngredientRowsWithModel(ingredient, existingRows = [], ctx = {}, { t = (key) => key } = {}) {
  const modelRows = buildItemRelics(ingredient?.itemType, ctx)
    .slice()
    .sort(compareRelics)
    .map((relic) => sourceFor(relic, t))
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
