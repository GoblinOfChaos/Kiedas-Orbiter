import { sortSourcesByChanceInRotations } from './chanceSort.js'

const sourceCacheByDropIndex = new WeakMap()

function sourceKey(source) {
  if (source.type === 'relic') return 'r:' + (source.relicName || source.relicManifest)
  if (source.type === 'enemy') return 'e:' + source.enemyName
  return 'o:' + source.type
}

export function getCachedPrimeSetPartSources(part, dropIndex, sorter = sortSourcesByChanceInRotations) {
  if (!dropIndex || typeof dropIndex !== 'object') return []
  let cache = sourceCacheByDropIndex.get(dropIndex)
  if (!cache) {
    cache = new Map()
    sourceCacheByDropIndex.set(dropIndex, cache)
  }
  const partNorm = part?.unique_name ? part.unique_name.replace('/StoreItems/', '/') : ''
  const blueprintNorm = partNorm.replace(/Component$/i, 'Blueprint')
  const displayKey = 'display:' + (part?.name || '').toLowerCase().trim()
  const key = partNorm || displayKey
  if (cache.has(key)) return cache.get(key)

  const raw = dropIndex[partNorm] || dropIndex[blueprintNorm] || dropIndex[displayKey] || []
  const seen = new Set()
  const sources = sorter(raw).filter((source) => {
    const key = sourceKey(source)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  cache.set(key, sources)
  return sources
}
