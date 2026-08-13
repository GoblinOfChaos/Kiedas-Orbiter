import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

let cachedSettings = null
let listeners = new Set()

// Refresh cache whenever any window saves settings to disk
listen('settings-changed', async () => {
  try {
    cachedSettings = await invoke('load_settings')
    listeners.forEach(fn => fn(cachedSettings))
  } catch {}
})

export function onSettingsChanged(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Load all settings from the Rust backend.
 * Falls back to localStorage if the file doesn't exist yet (migration).
 */
export async function loadSettings() {
  try {
    const settings = await invoke('load_settings') || {}

    // Migration logic: if settings are empty, try to pull from localStorage
    if (Object.keys(settings).length === 0) {
      const legacy = {}
      const keys = [
        'disclaimer-accepted',
        'kronos-theme',
        'notif_position',
        'notif_sound',
        'autoStartMonitoring',
        'notif_arbitration_enabled',
        'notif_arbitration_hours',
        'notif_arbitration_remind',
        'notif_foundry_enabled',
        'notif_foundry_minutes',
        'notif_syndicate_enabled',
        'notif_syndicate_waste_enabled',
        'notif_mastery_enabled',
        'notif_mastery_percent',
        'notif_checklist_minutes'
      ]
      keys.forEach(k => {
        const val = localStorage.getItem(k)
        if (val !== null) legacy[k] = val
      })
      
      if (Object.keys(legacy).length > 0) {
        await saveSettings(legacy)
        cachedSettings = legacy
        return legacy
      }
    }

    cachedSettings = settings
    return settings
  } catch (err) {
    console.error('Failed to load settings:', err)
    return cachedSettings || {}
  }
}

/**
 * Update a specific setting and persist it.
 *
 * Always re-reads from disk first instead of trusting this window's
 * in-memory cache: multiple windows (main, sidebar overlay, relic overlay)
 * each keep their own cachedSettings, and writing a stale snapshot back
 * silently erases whatever keys another window saved in the meantime
 * (confirmed live: warframe_cache_path and a first-run flag were lost this
 * way after a rebuild - one window's stale cache clobbered another's write).
 */
export async function setSetting(key, value) {
  const fresh = await invoke('load_settings').catch(() => cachedSettings || {}) || {}
  cachedSettings = { ...fresh, [key]: value }
  await saveSettings(cachedSettings)
}

/**
 * Save the entire settings object.
 */
export async function saveSettings(settings) {
  try {
    await invoke('save_settings', { settings })
    cachedSettings = settings
  } catch (err) {
    console.error('Failed to save settings:', err)
  }
}

/**
 * Synchronous getter for cached settings.
 */
export function getSetting(key, defaultValue = null) {
  if (!cachedSettings) return defaultValue
  return cachedSettings[key] ?? defaultValue
}
