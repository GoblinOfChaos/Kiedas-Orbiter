import { useState, lazy, Suspense, useEffect, useRef } from 'react'
import { useMonitoring } from './contexts/MonitoringContext'
import { formatLastUpdate } from './lib/warframeUtils'
import { ThemeProvider } from './contexts/ThemeContext'
import { MonitoringProvider } from './contexts/MonitoringContext'
import { UpdateProvider, useUpdate } from './contexts/UpdateContext'
import { Tooltip } from './components/UI'
import { AlertTriangle, FolderOpen } from 'lucide-react'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { loadSettings, getSetting, setSetting } from './lib/settings'

// Screens (lazy-loaded, main window only)
const Dashboard = lazy(() => import('./screens/Dashboard'))
const Inventory = lazy(() => import('./screens/Inventory'))
const Mastery = lazy(() => import('./screens/Mastery'))
const Notes = lazy(() => import('./screens/Notes'))
const Maps = lazy(() => import('./screens/Maps'))
const Checklist = lazy(() => import('./screens/Checklist'))
const SettingsScreen = lazy(() => import('./screens/Settings'))
const About = lazy(() => import('./screens/About'))
const Rivens = lazy(() => import('./screens/Rivens'))
const Relics = lazy(() => import('./screens/Relics'))
const Mods = lazy(() => import('./screens/Mods'))
const Collectibles = lazy(() => import('./screens/Collectibles'))

// Overlay (separate window, no monitoring context needed)
const OverlayRouter = lazy(() => import('./components/overlays/OverlayRouter'))

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'IconDashboard.png', label: 'Dashboard' },
  { id: 'inventory', icon: 'IconInventory.png', label: 'Inventory' },
  { id: 'mods', icon: 'Mods.png', label: 'Mods' },
  { id: 'rivens', icon: 'IconRiven.png', label: 'Rivens' },
  { id: 'relics', icon: 'IconRelic.png', label: 'Relics' },
  { id: 'mastery', icon: 'IconMastery.png', label: 'Mastery' },
  { id: 'notes', icon: 'IconNotes.png', label: 'Notes' },
  { id: 'maps', icon: 'IconMap.png', label: 'Maps' },
  { id: 'collectibles', icon: 'GrimoireMarker.png', label: 'Collectibles' },
  { id: 'checklist', icon: 'IconChecklist.png', label: 'Checklist' },
  { id: 'settings', icon: 'IconSettings.png', label: 'Settings' },
  { id: 'about', icon: 'IconInfo.png', label: 'About' },
]

// ─── Overlay window ───────────────────────────────────────────────────────────
// Rendered when the window hash is #overlay.
// IMPORTANT: does NOT include MonitoringProvider - the overlay window must not
// fire Tauri startup commands (check_exports, load_all_exports, etc.).
// It only needs ThemeProvider for CSS variable access.

function OverlayApp() {
  // Transparency is set synchronously in index.html before React renders,
  // so no useEffect is needed here - eliminating the Linux first-frame black flash.
  return (
    <ThemeProvider>
      <main
        className="h-screen w-screen overflow-hidden"
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <OverlayRouter />
        </Suspense>
      </main>
    </ThemeProvider>
  )
}

// ─── First-run Setup Screen ─────────────────────────────────────────────────
// Single onboarding with optional path selectors + mandatory disclaimer.

function SetupScreen() {
  const [show, setShow] = useState(false)
  const [checked, setChecked] = useState(false)
  const [ready, setReady] = useState(false)
  const [cachePath, setCachePath] = useState('')
  const [logPath, setLogPath] = useState('')
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current) return
    loadSettings().then(async () => {
      if (hasStartedRef.current) return
      hasStartedRef.current = true

      if (!getSetting('disclaimer-accepted')) {
        setShow(true)
        setCachePath(getSetting('warframe_cache_path', ''))
        setLogPath(getSetting('ee_log_path', ''))
      }

      const savedHotkeys = getSetting('hotkeys', [])
      for (const hk of savedHotkeys) {
        if (hk.shortcut && hk.action) {
          invoke('register_hotkey', { shortcut: hk.shortcut, action: hk.action })
            .catch(err => console.error(`Failed to register startup hotkey ${hk.shortcut}:`, err))
        }
      }

      const fissureEnabled = getSetting('fissure_overlay_enabled')
      const savedLogPath = getSetting('ee_log_path')
      if (fissureEnabled && savedLogPath) {
        invoke('start_log_scanner', { path: savedLogPath }).catch(console.error)
      }
      setReady(true)
    })
  }, [])

  const handleBrowseLog = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Game Log', extensions: ['log'] }]
      })
      if (selected) {
        setLogPath(selected)
        await setSetting('ee_log_path', selected)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleBrowseCache = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false })
      if (selected) {
        setCachePath(selected)
        await setSetting('warframe_cache_path', selected)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const finish = async () => {
    if (!checked) return
    await setSetting('disclaimer-accepted', 'true')
    setShow(false)
  }

  if (!ready || !show) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-kronos-bg border border-kronos-accent/20 rounded-2xl p-8 max-w-xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-black uppercase tracking-tight text-kronos-accent mb-2">Welcome to Cephalon Kronos</h2>
        <p className="text-xs text-kronos-dim mb-6">Let's get you set up. These paths are optional; you can configure them later in Settings.</p>

        {/* Cache path */}
        <div className="mb-4">
          <p className="text-sm font-black uppercase tracking-widest text-kronos-text/80 mb-2">Game Assets<span className="text-kronos-dim font-normal normal-case tracking-normal">(optional)</span></p>
          <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
            <div className="flex gap-2">
              <input type="text" value={cachePath} readOnly placeholder="Select Cache.Windows folder..."
                className="flex-1 glass-panel rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:glow-border" />
              <button onClick={handleBrowseCache}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all bg-kronos-accent/10 text-kronos-accent hover:bg-kronos-accent/20 border border-kronos-accent/20 shrink-0">
                <FolderOpen size={14} /> Browse
              </button>
            </div>
            <p className="mt-2 text-[10px] text-kronos-dim leading-relaxed">Point to your Warframe Cache.Windows folder to use game assets. Skipping this uses a fallback.</p>
          </div>
        </div>

        {/* Log path */}
        <div className="mb-4">
          <p className="text-sm font-black uppercase tracking-widest text-kronos-text/80 mb-2">EE.log Path <span className="text-kronos-dim font-normal normal-case tracking-normal">(optional)</span></p>
          <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
            <div className="flex gap-2">
              <input type="text" value={logPath} readOnly placeholder="Select your Warframe EE.log file..."
                className="flex-1 glass-panel rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:glow-border" />
              <button onClick={handleBrowseLog}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all bg-kronos-accent/10 text-kronos-accent hover:bg-kronos-accent/20 border border-kronos-accent/20 shrink-0">
                <FolderOpen size={14} /> Browse
              </button>
            </div>
            <p className="mt-2 text-[10px] text-kronos-dim leading-relaxed">Required for fissure overlays and the in-game scanner. Pick the EE.log file from your Warframe installation.</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-red-400">Disclaimer</p>
              <p className="text-xs text-kronos-text/70 mt-1">This app uses warframe-api-helper to read session tokens from game memory. Digital Extremes has not approved this application.</p>
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <div onClick={() => setChecked(v => !v)}
              className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all mt-0.5 ${checked ? 'bg-kronos-accent border-kronos-accent' : 'border-white/20 hover:border-white/40'}`}>
              {checked && <span className="text-kronos-bg text-xs font-black">✓</span>}
            </div>
            <span className="text-xs text-kronos-text/90">I understand and accept the risks described above.</span>
          </label>
        </div>

        <button onClick={finish} disabled={!checked}
          className={`w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${checked ? 'bg-kronos-accent text-kronos-bg hover:brightness-110' : 'bg-white/5 text-kronos-dim cursor-not-allowed'}`}>
          Continue
        </button>
      </div>
    </div>
  )
}

// ─── Main app window ──────────────────────────────────────────────────────────

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uiPath, setUiPath] = useState('')
  const [iconCache, setIconCache] = useState({})
  const { lastUpdate, monitorResult, isMonitoring } = useMonitoring()
  const { updateState } = useUpdate()
  const [scannerStatus, setScannerStatus] = useState('idle') // 'idle' | 'waiting' | 'active'

  useEffect(() => {
    invoke('get_ui_path').then(setUiPath).catch(() => { })
  }, [])

  useEffect(() => {
    if (!uiPath) return
    const names = [...NAV_ITEMS.map(i => i.icon), 'IconKronos.png']
    Promise.all(names.map(async (name) => {
      try {
        const bytes = await invoke('read_file_bytes', { relative: `data/assets/ui/${name}` })
        const blob = new Blob([new Uint8Array(bytes)])
        return [name, await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.onerror = () => r(null); f.readAsDataURL(blob) })]
      } catch { return [name, null] }
    })).then(entries => {
      const map = {}
      for (const [name, url] of entries) if (url) map[name] = url
      setIconCache(map)
    })
  }, [uiPath])

  useEffect(() => {
    // Poll scanner status every 2s so sidebar dot stays in sync
    const checkScanner = () => {
      invoke('get_scanner_status').then(setScannerStatus).catch(() => setScannerStatus('idle'))
    }
    checkScanner()
    const iv = setInterval(checkScanner, 2000)
    return () => clearInterval(iv)
  }, [])

  const uiIcon = (name) => iconCache[name] || (uiPath ? convertFileSrc(`${uiPath}/${name}`) : '')

  const screens = {
    dashboard: <Dashboard />,
    inventory: <Inventory />,
    rivens: <Rivens />,
    relics: <Relics />,
    mods: <Mods />,
    mastery: <Mastery />,
    notes: <Notes />,
    maps: <Maps />,
    collectibles: <Collectibles />,
    checklist: <Checklist />,
    settings: <SettingsScreen />,
    about: <About />,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <nav className="glass-panel w-20 border-r flex flex-col items-center py-6 gap-4 z-40 relative flex-shrink-0">
        {/* Logo */}
        <div className="mb-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
            <img src={uiIcon('IconKronos.png')} alt="Cephalon Kronos" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 w-full overflow-y-auto py-2 custom-scrollbar">
          <div className="flex flex-col gap-6 items-center min-h-min pb-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <div key={item.id} className="relative">
                  {item.id === 'settings' && updateState.status === 'available' && (
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full z-10 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                  )}
                  <Tooltip content={item.label}>
                    <button
                      id={item.id === 'settings' ? 'nav-settings' : undefined}
                      onClick={() => setActiveTab(item.id)}
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-lg
                        transition-all duration-200 flex-shrink-0
                        ${isActive
                          ? 'bg-kronos-accent/10 text-kronos-accent shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.2)]'
                          : 'text-kronos-dim hover:bg-white/5 hover:text-white'}
                      `}
                    >
                      <div
                        className="w-7 h-7 flex-shrink-0 transition-colors duration-200"
                        style={{
                          backgroundColor: isActive ? 'var(--color-accent, #5590ab)' : 'currentColor',
                          maskImage: `url(${uiIcon(item.icon)})`,
                          WebkitMaskImage: `url(${uiIcon(item.icon)})`,
                          maskSize: 'contain',
                          WebkitMaskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          WebkitMaskRepeat: 'no-repeat',
                          maskPosition: 'center',
                          WebkitMaskPosition: 'center',
                          opacity: isActive ? 1 : 0.6,
                        }}
                      />
                    </button>
                  </Tooltip>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status dots */}
        <div className="mt-auto flex-shrink-0 flex flex-col items-center gap-3 pt-4 border-t border-white/5 w-full">
          <div className="text-xs text-kronos-dim text-center whitespace-nowrap">
            Last update:<br />
            {formatLastUpdate(lastUpdate)}
          </div>
          {/* API monitoring dot */}
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 relative group
              ${monitorResult === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                : monitorResult === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  : 'bg-gray-600'}
            `}
          >
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] shadow-2xl bg-kronos-bg border border-white/10 font-black uppercase text-[10px] tracking-widest text-kronos-accent">
              {monitorResult === 'success' ? 'API Active' : monitorResult === 'error' ? 'API Error' : 'API Offline'}
            </div>
          </div>
          {/* Scanner dot */}
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 relative group
              ${scannerStatus === 'active' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' :
                scannerStatus === 'waiting' ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse' :
                  'bg-gray-700'
              }
            `}
          >
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] shadow-2xl bg-kronos-bg border border-white/10 font-black uppercase text-[10px] tracking-widest text-kronos-accent">
              {scannerStatus === 'active' ? 'Scanner Active' :
                scannerStatus === 'waiting' ? 'Waiting for Warframe...' :
                  'Scanner Idle'}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-kronos-bg">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
          </div>
        }>
          {screens[activeTab]}
        </Suspense>
      </main>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const isOverlay = params.get('overlay') === 'true'

  if (isOverlay) {
    return (
      <ThemeProvider>
        <OverlayApp />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <MonitoringProvider>
        <UpdateProvider>
          <SetupScreen />
          <AppContent />
        </UpdateProvider>
      </MonitoringProvider>
    </ThemeProvider>
  )
}


