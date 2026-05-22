import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { checkUpdate } from '@tauri-apps/api/updater'
import { getSetting } from '../lib/settings'

const UpdateContext = createContext()

export function UpdateProvider({ children }) {
  const [updateState, setUpdateState] = useState({ status: 'idle', manifest: null, error: null })
  const checkedRef = useRef(false)

  const checkForUpdates = useCallback(async () => {
    setUpdateState({ status: 'checking', manifest: null, error: null })
    try {
      const result = await checkUpdate()
      if (result.shouldUpdate && result.manifest) {
        setUpdateState({ status: 'available', manifest: result.manifest, error: null })
      } else {
        setUpdateState({ status: 'up-to-date', manifest: null, error: null })
      }
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
    <UpdateContext.Provider value={{ updateState, checkForUpdates }}>
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
