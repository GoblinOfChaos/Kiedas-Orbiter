// A Prime Set is owned only when its finished equipment exists in the
// inventory. Blueprint and component quantities describe crafting progress.
export function isPrimeSetOwned(parent = {}, _set = {}) {
  return Boolean(parent.owned || (parent.quantity ?? 0) > 0 || (parent.crafted_quantity ?? 0) > 0)
}
