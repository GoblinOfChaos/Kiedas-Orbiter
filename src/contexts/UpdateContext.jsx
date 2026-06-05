import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Update, check } from '@tauri-apps/plugin-updater'
import { getSetting } from '../lib/settings'

const UpdateContext = createContext()

export function UpdateProvider({ children }) {
  const [updateState, setUpdateState] = useState({ status: 'idle', manifest: null, error: null })
  const checkedRef = useRef(false)
  const latestUpdateRef = useRef(null)

  const checkForUpdates = useCallback(async () => {
    setUpdateState({ status: 'checking', manifest: null, error: null })
    try {
      const result = await check()
      if (result) {
        latestUpdateRef.current = result
        setUpdateState({
          status: 'available',
          manifest: {
            version: result.version,
            body: result.body,
            date: result.date,
            currentVersion: result.currentVersion,
            rawJson: result.rawJson,
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

  const installLatestUpdate = useCallback(async () => {
    if (!latestUpdateRef.current) {
      setUpdateState({ status: 'error', manifest: null, error: 'No update available to install' })
      return
    }
    setUpdateState(prev => ({ ...prev, status: 'installing' }))
    try {
      await latestUpdateRef.current.downloadAndInstall()
    } catch (err) {
      setUpdateState({ status: 'error', manifest: null, error: err?.message ?? String(err) })
    }
  }, [])

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    const autoCheck = getSetting('update_on_startup', true)
    if (autoCheck) {
      checkForUpdates()
    }
  }, [checkForUpdates])

  return (
    <UpdateContext.Provider value={{ updateState, checkForUpdates, installLatestUpdate }}>
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
