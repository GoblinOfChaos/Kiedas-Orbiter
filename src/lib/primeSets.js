import { getCachedPrimeSetPartSources } from './primeSetParts.js'
import { getRelicSourceVaultedStatus, hasOnlyConfirmedVaultedRelicSources } from './acquisitionModel/relicVaultState.js'

// A Prime Set is owned only when its finished equipment exists in the
// inventory. Blueprint and component quantities describe crafting progress.
export function isPrimeSetOwned(parent = {}, _set = {}) {
  return Boolean(parent.owned || (parent.quantity ?? 0) > 0 || (parent.crafted_quantity ?? 0) > 0)
}

export function getPrimeSetVaultedStatus(set = {}, dropIndex, relicStateIndex) {
  const relicSources = (set.parts ?? [])
    .flatMap((part) => getCachedPrimeSetPartSources(part, dropIndex))
    .filter((source) => source.type === 'relic')
  if (!relicSources.length) return null
  if (hasOnlyConfirmedVaultedRelicSources(relicSources, relicStateIndex)) return true
  if (relicSources.some((source) => getRelicSourceVaultedStatus(source, relicStateIndex) === false)) return false
  return null
}

export function matchesPrimeSetVaultFilter(vaulted, state) {
  if (state === undefined) return true
  if (state === 'yes') return vaulted === true
  if (state === 'no') return vaulted === false
  return true
}
