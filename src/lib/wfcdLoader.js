/**
 * Cached loader for warframe-items-data JSON files.
 *
 * Uses resolve_asset_path + convertFileSrc + fetch to load the combined JSON
 * through Tauri's asset protocol (byte stream, no JSON-array-of-numbers bloat).
 *
 * The combined file (wfcd-combined.json) is built by scripts/sync-wfcd.js
 * from the warframe-items npm package at build time and bundled as a Tauri
 * resource.  The result of transformWarframeItems() is cached.
 */
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { transformWarframeItems } from './warframeItemsTransform'

let cached = null
let loading = null

export async function loadWarframeItemsMaps() {
  if (cached) return cached
  if (loading) return loading

  loading = (async () => {
    try {
      const absolutePath = await invoke('resolve_asset_path', {
        relative: 'data/assets/wfcd/wfcd-combined.json',
      })
      const url = convertFileSrc(absolutePath)
      const combined = await fetch(url).then(r => r.json())
      cached = transformWarframeItems(combined)
    } catch {
      cached = { maps: {}, supplement: { uniqueNameToName: {}, nameToImage: {} } }
    }
    return cached
  })()

  return loading
}
