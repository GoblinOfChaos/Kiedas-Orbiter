/**
 * Cached dynamic-import loader for warframe-items-data JSON files.
 *
 * Replaces the static top-level imports that caused OOM at startup by
 * deferring the JSON load until first use.  The result of
 * transformWarframeItems() is cached so repeated calls are free.
 *
 * Uses plain dynamic import() with a template literal — Vite/Rollup can
 * statically analyze this since WI_FILES is a fixed array of literal strings,
 * producing lazy-loaded chunks without the silent-failure of import.meta.glob
 * with bare package specifiers.
 */
import { transformWarframeItems, WI_FILES } from './warframeItemsTransform'

let cached = null

export async function loadWarframeItemsMaps() {
  if (cached) return cached

  const rawData = {}

  await Promise.all(WI_FILES.map(async (file) => {
    try {
      const mod = await import(`warframe-items-data/${file}.json`)
      rawData[file] = mod.default || mod
    } catch {
      // file missing — skip
    }
  }))

  cached = transformWarframeItems(rawData)
  return cached
}
