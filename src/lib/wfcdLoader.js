/**
 * Cached loader for warframe-items-data JSON files.
 *
 * Reads from data/user/wfcd/ (populated by the Rust check_wfcd_data command)
 * instead of importing from the npm package, avoiding the 67MB static bundle
 * that caused OOM at startup.  The result of transformWarframeItems() is
 * cached so repeated calls are free.
 */
import { invoke } from '@tauri-apps/api/core'
import { transformWarframeItems, WI_FILES } from './warframeItemsTransform'

let cached = null

export async function loadWarframeItemsMaps() {
  if (cached) return cached

  const rawData = {}

  await Promise.all(WI_FILES.map(async (file) => {
    try {
      const bytes = await invoke('read_file_bytes', {
        relative: `data/user/wfcd/${file}.json`,
      })
      if (bytes) {
        const jsonStr = new TextDecoder().decode(new Uint8Array(bytes))
        rawData[file] = JSON.parse(jsonStr)
      }
    } catch {
      // file missing — skip
    }
  }))

  cached = transformWarframeItems(rawData)
  return cached
}
