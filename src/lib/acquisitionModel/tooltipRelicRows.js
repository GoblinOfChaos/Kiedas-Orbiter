import { buildItemRelics } from './buildItemAcquisition.js'
import { getRelicSourceLabel } from '../relicSources.js'
import { ACQUISITION_MODEL_RELICS, compareModelRelics, modelRelicSource } from './relicRows.js'

export const ACQUISITION_MODEL_TOOLTIP_RELICS = ACQUISITION_MODEL_RELICS

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
    .sort(compareModelRelics)
    .map((relic) => {
      const source = modelRelicSource(relic, { t, displayConflictSuffix: false })
      return { source, label: labelFor(source, t) }
    })
}
