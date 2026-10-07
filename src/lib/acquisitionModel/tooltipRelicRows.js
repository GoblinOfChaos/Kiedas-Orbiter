import { buildItemRelics } from './buildItemAcquisition.js'
import { getRelicSourceLabel } from '../relicSources.js'
import { compareTextNumeric } from '../textCompare.js'

export const ACQUISITION_MODEL_TOOLTIP_RELICS = true

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

function sourceFor(relic) {
  return {
    type: 'relic',
    relicName: relic.relic,
    rarity: relic.tier,
    ...(relic.tiers ? { tiers: relic.tiers } : {}),
    ...(relic.tierConflict ? { tierConflict: true } : {}),
  }
}

function labelFor(source, t) {
  if (!source.tierConflict) return getRelicSourceLabel(source, t)
  const relicLabel = getRelicSourceLabel({ relicName: source.relicName }, t)
  const tiers = source.tiers || [source.rarity]
  return `${relicLabel} (${tiers.map((tier) => t(`ui.relic_rarity.${String(tier).toLowerCase()}`)).join(' / ')})`
}

/** Convert the acquisition model's exact DE relic facts into tooltip rows. */
export function buildTooltipRelicRows(itemUniqueName, itemName, ctx = {}, { t = (key) => key } = {}) {
  // The model's DE index is cached by exportData in deRelicTruth; itemName is
  // accepted to keep this adapter's call shape aligned with buildItemAcquisition.
  void itemName
  return buildItemRelics(itemUniqueName, ctx)
    .slice()
    .sort(compareRelics)
    .map((relic) => {
      const source = sourceFor(relic)
      return { source, label: labelFor(source, t) }
    })
}
