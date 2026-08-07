import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'

const BUNDLE_TYPE = 'kronos-map-markers'
const BUNDLE_VERSION = 1

/**
 * Export configs for one or all maps as a JSON bundle via the save dialog.
 *
 * @param {{ configs: Record<string, Array>, mapId?: string, mapName?: string }} opts
 *   configs – allConfigs keyed by tab index; mapId/mapName for single-map export.
 * @returns {boolean} true if exported, false if cancelled
 */
export async function exportBundle({ configs, mapId, mapName }) {
  const payload = {
    type: BUNDLE_TYPE,
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    configs,
    ...(mapId != null && { mapId, mapName }),
  }

  const defaultName = mapName
    ? `kronos-markers-${mapName.replace(/\s+/g, '-').toLowerCase()}.json`
    : 'kronos-markers-all.json'

  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: 'Kieda Markers', extensions: ['json'] }],
  })
  if (!path) return false

  await invoke('write_file', { path, data: new TextEncoder().encode(JSON.stringify(payload, null, 2)) })
  return true
}

/**
 * Open and parse a share bundle via the open dialog.
 *
 * @returns {{ configs: Record<string, Array>, mapId?: string, mapName?: string } | null}
 *   null if cancelled or invalid.
 */
export async function importBundle() {
  const path = await open({
    filters: [{ name: 'Kieda Markers', extensions: ['json'] }],
    multiple: false,
    directory: false,
  })
  if (!path) return null

  let raw
  try {
    const bytes = await invoke('read_file', { path })
    raw = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }

  if (raw?.type !== BUNDLE_TYPE || raw?.version !== BUNDLE_VERSION) return null
  if (!raw.configs || typeof raw.configs !== 'object') return null

  return { configs: raw.configs, mapId: raw.mapId, mapName: raw.mapName }
}
