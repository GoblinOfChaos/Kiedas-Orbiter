import { ACQUISITION_MODEL_RELICS, replaceRelicRows } from './relicRows.js'

export const ACQUISITION_MODEL_INGREDIENT_RELICS = ACQUISITION_MODEL_RELICS

/**
 * Replace just an ingredient's display relic sources with its exact DE model
 * relics. Non-relic rows retain both their objects and relative ordering.
 */
export function buildIngredientRowsWithModel(ingredient, existingRows = [], ctx = {}, { t = (key) => key } = {}) {
  return replaceRelicRows(ingredient?.itemType, existingRows, ctx, { t })
}
