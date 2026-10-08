import { getRelicVaultedStatus } from '../relicParser.js'

function relicSourceKey(source) {
  return String(source?.relicName || '').replace(/\s+Relic\b/i, '').trim().toLowerCase()
}

export function getRelicSourceVaultedStatus(source, relicStateIndex) {
  if (source?.type !== 'relic') return null
  const state = relicStateIndex?.get(`relic:${relicSourceKey(source)}`)
  return getRelicVaultedStatus(state?.relic, state?.relicKey)
}

export function hasOnlyConfirmedVaultedRelicSources(sources, relicStateIndex) {
  if (!sources.length || sources.some((source) => source?.type !== 'relic')) return false
  return sources.every((source) => getRelicSourceVaultedStatus(source, relicStateIndex) === true)
}
