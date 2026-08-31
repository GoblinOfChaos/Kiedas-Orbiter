import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Update, check } from '@tauri-apps/plugin-updater'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getSetting } from '../lib/settings'

const UpdateContext = createContext()

export function UpdateProvider({ children }) {
  const [updateState, setUpdateState] = useState({ status: 'idle', manifest: null, error: null })
  const checkedRef = useRef(false)
  const latestUpdateRef = useRef(null)
  const installingRef = useRef(false)
  const [platformInfo, setPlatformInfo] = useState(null)

  useEffect(() => {
    invoke('get_platform_info').then(setPlatformInfo).catch(() => {})
  }, [])

  const runInstall = useCallback(async (url) => {
    // Guards against a rapid double-click firing two concurrent installs -
    // setUpdateState's 'installing' status alone isn't enough since a second
    // click can land before the resulting re-render disables the button.
    if (installingRef.current) return
    installingRef.current = true
    try {
      if (!latestUpdateRef.current) {
        setUpdateState({ status: 'error', manifest: null, error: 'No update available to install' })
        return
      }
      // Only the AppImage path needs an explicit download URL (it bypasses the
      // plugin's own downloadAndInstall to handle the self-replace manually).
      // Windows/macOS's downloadAndInstall() resolves its own asset URL
      // internally - requiring `url` unconditionally silently blocked
      // auto-install on those platforms, since it's only ever populated from
      // the linux-x86_64 manifest entry.
      if (platformInfo?.is_appimage && !url) {
        setUpdateState({ status: 'error', manifest: null, error: 'No download URL available' })
        return
      }
      setUpdateState(prev => ({ ...prev, status: 'installing' }))
      if (platformInfo?.is_appimage) {
        try {
          await invoke('download_appimage_update', { url })
          const win = getCurrentWindow()
          await win.close()
        } catch (err) {
          // Keep the manifest: the "Download manually" fallback link is driven
          // by manifest.downloadUrl, so nulling it here removes the fallback in
          // exactly the case it exists for - a failed install.
          setUpdateState(prev => ({ ...prev, status: 'error', error: err?.message ?? String(err) }))
        }
      } else {
        try {
          await latestUpdateRef.current.downloadAndInstall()
        } catch (err) {
          // Keep the manifest: the "Download manually" fallback link is driven
          // by manifest.downloadUrl, so nulling it here removes the fallback in
          // exactly the case it exists for - a failed install.
          setUpdateState(prev => ({ ...prev, status: 'error', error: err?.message ?? String(err) }))
        }
      }
    } finally {
      installingRef.current = false
    }
  }, [platformInfo])

  const checkForUpdates = useCallback(async () => {
    setUpdateState({ status: 'checking', manifest: null, error: null })
    try {
      const result = await check()
      if (result) {
        latestUpdateRef.current = result
        const raw = result.rawJson || {}
        const platforms = raw.platforms || {}
        const linuxUrl = platforms['linux-x86_64']?.url || null
        setUpdateState({
          status: 'available',
          manifest: {
            version: result.version,
            body: result.body,
            date: result.date,
            currentVersion: result.currentVersion,
            rawJson: raw,
            downloadUrl: linuxUrl,
          },
          error: null
        })
      } else {
        latestUpdateRef.current = null
        setUpdateState({ status: 'up-to-date', manifest: null, error: null })
      }
    } catch (err) {
      setUpdateState({ status: 'error', manifest: null, error: err?.message ?? String(err) })
    }
  }, [])

  const installLatestUpdate = useCallback(() => runInstall(updateState.manifest?.downloadUrl), [runInstall, updateState.manifest?.downloadUrl])

  // Checks for updates on startup, but never auto-installs: only reports
  // availability. Installing is always an explicit user click (see
  // installLatestUpdate), even when auto-check-on-startup is on.
  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    const autoCheck = getSetting('update_on_startup', true)
    if (autoCheck) {
      checkForUpdates()
    }
  }, [checkForUpdates])

  return (
    <UpdateContext.Provider value={{ updateState, checkForUpdates, installLatestUpdate, platformInfo }}>
      {children}
    </UpdateContext.Provider>
  )
}

export function useUpdate() {
  const context = useContext(UpdateContext)
  if (!context) {
    throw new Error('useUpdate must be used within UpdateProvider')
  }
  return context
}
