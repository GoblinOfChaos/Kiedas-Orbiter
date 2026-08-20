import { useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Tooltip } from '../UI'
import MirroredMonitoringProvider from '../../contexts/MirroredMonitoringProvider'
import { useUi } from '../../contexts/UiContext'
import { useMonitoring } from '../../contexts/MonitoringContext'
import { formatLastUpdate } from '../../lib/warframeUtils'
import { loadSettings, getSetting, setSetting } from '../../lib/settings'

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'IconDashboard.png', label: 'Dashboard' },
  { id: 'inventory', icon: 'IconInventory.png', label: 'Inventory' },
  { id: 'mods', icon: 'Mods.png', label: 'Mods' },
  { id: 'rivens', icon: 'IconRiven.png', label: 'Rivens' },
  { id: 'relics', icon: 'IconRelic.png', label: 'Relics' },
  { id: 'relic-planner', icon: 'VoidSymbol.png', label: 'Relic Planner' },
  { id: 'mastery', icon: 'IconMastery.png', label: 'Mastery' },
  { id: 'notes', icon: 'IconNotes.png', label: 'Notes' },
  { id: 'maps', icon: 'IconMap.png', label: 'Maps' },
  { id: 'collectibles', icon: 'GrimoireMarker.png', label: 'Collectibles' },
  { id: 'cosmetics', icon: 'Appearance.png', label: 'Cosmetics' },
  { id: 'checklist', icon: 'IconChecklist.png', label: 'Checklist' },
  { id: 'adversaries', icon: 'Adversaries.png', label: 'Adversaries' },
  { id: 'wiki', icon: 'Wiki.png', label: 'Wiki' },
  { id: 'settings', icon: 'IconSettings.png', label: 'Settings' },
  { id: 'about', icon: 'IconInfo.png', label: 'About' },
]

const ICON_NAMES = [...NAV_ITEMS.map(i => i.icon), 'IconKieda.png']

const Dashboard = lazy(() => import('../../screens/Dashboard'))
const Inventory = lazy(() => import('../../screens/Inventory'))
const Mastery = lazy(() => import('../../screens/Mastery'))
const Notes = lazy(() => import('../../screens/Notes'))
const Maps = lazy(() => import('../../screens/Maps'))
const Checklist = lazy(() => import('../../screens/Checklist'))
const SettingsScreen = lazy(() => import('../../screens/Settings'))
const About = lazy(() => import('../../screens/About'))
const Rivens = lazy(() => import('../../screens/Rivens'))
const Relics = lazy(() => import('../../screens/Relics'))
const RelicPlanner = lazy(() => import('../../screens/RelicPlanner'))
const Mods = lazy(() => import('../../screens/Mods'))
const Collectibles = lazy(() => import('../../screens/Collectibles'))
const Cosmetics = lazy(() => import('../../screens/Cosmetics'))
const Wiki = lazy(() => import('../../screens/Wiki'))
const Adversaries = lazy(() => import('../../screens/Adversaries'))

function useUIIcons(iconNames) {
  const [iconCache, setIconCache] = useState({})
  useEffect(() => {
    if (!iconNames || iconNames.length === 0) return
    let cancelled = false
    Promise.all(iconNames.map(async (name) => {
      try {
        const bytes = await invoke('read_file_bytes', { relative: `data/assets/ui/${name}` })
        const blob = new Blob([new Uint8Array(bytes)])
        return [name, await new Promise(r => {
          const f = new FileReader()
          f.onload = () => r(f.result)
          f.onerror = () => r(null)
          f.readAsDataURL(blob)
        })]
      } catch { return [name, null] }
    })).then(entries => {
      if (cancelled) return
      const map = {}
      for (const [name, url] of entries) if (url) map[name] = url
      setIconCache(map)
    })
    return () => { cancelled = true }
  }, [iconNames])
  return useCallback((name) => iconCache[name] || '', [iconCache])
}

const WIDTH_PRESETS = [380, 480, 640, 800]

function SidebarContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { lastUpdate, monitorResult } = useMonitoring()
  const [scannerStatus, setScannerStatus] = useState('idle')
  const [sidebarSide, setSidebarSide] = useState('left')
  const [sidebarWidth, setSidebarWidth] = useState(480)

  const uiIcon = useUIIcons(ICON_NAMES)
  const { t } = useUi()

  useEffect(() => {
    loadSettings().then(() => {
      const s = getSetting('sidebar_side', 'left')
      const w = parseInt(getSetting('sidebar_width', 480)) || 480
      setSidebarSide(s)
      setSidebarWidth(w)
    })
  }, [])

  useEffect(() => {
    const unsub = listen('sidebar-side-changed', (e) => {
      if (e.payload?.side) setSidebarSide(e.payload.side)
      if (e.payload?.width) setSidebarWidth(e.payload.width)
    })
    return () => { unsub.then(f => f()) }
  }, [])

  useEffect(() => {
    const check = () => {
      invoke('get_scanner_status').then(setScannerStatus).catch(() => setScannerStatus('idle'))
    }
    check()
    const iv = setInterval(check, 5000)
    return () => clearInterval(iv)
  }, [])

  const handlePointerEnter = useCallback(() => {
    invoke('sidebar_ungrab').catch(() => {})
  }, [])

  const handleSetWidth = useCallback((newWidth) => {
    setSidebarWidth(newWidth)
    setSetting('sidebar_width', newWidth).catch(() => {})
    invoke('set_sidebar_width', { width: newWidth, side: sidebarSide, persist: true }).catch(() => {})
  }, [sidebarSide])

  const handleCycleWidth = useCallback(() => {
    const currentW = parseInt(getSetting('sidebar_width', sidebarWidth)) || sidebarWidth
    const idx = WIDTH_PRESETS.findIndex((w) => w >= currentW)
    const nextW = WIDTH_PRESETS[(idx + 1) % WIDTH_PRESETS.length]
    handleSetWidth(nextW)
  }, [handleSetWidth, sidebarWidth])

  const screens = {
    dashboard: <Dashboard />,
    inventory: <Inventory />,
    rivens: <Rivens />,
    relics: <Relics />,
    'relic-planner': <RelicPlanner />,
    mods: <Mods />,
    mastery: <Mastery />,
    notes: <Notes />,
    maps: <Maps />,
    collectibles: <Collectibles />,
    cosmetics: <Cosmetics />,
    checklist: <Checklist />,
    adversaries: <Adversaries />,
    wiki: <Wiki />,
    settings: <SettingsScreen />,
    about: <About />,
  }

  const isRight = sidebarSide === 'right'

  return (
    <div
      onPointerEnter={handlePointerEnter}
      className={`relative flex h-screen w-full bg-kronos-bg overflow-hidden ${isRight ? 'flex-row-reverse' : ''}`}
    >
      <nav className={`glass-panel w-20 flex flex-col items-center py-6 gap-4 z-40 relative flex-shrink-0 ${isRight ? 'border-l' : 'border-r'} border-white/5`}>
        <div className="mb-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
            <img src={uiIcon('IconKieda.png')} alt="" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="flex-1 w-full overflow-y-auto py-2 custom-scrollbar">
          <div className="flex flex-col gap-6 items-center min-h-min pb-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <div key={item.id} className="relative">
                  <Tooltip content={t(`nav.${item.id}`)}>
                    <button
                      data-nav={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 ${
                        isActive
                          ? 'bg-kronos-accent/10 text-kronos-accent shadow-[0_0_15px_rgba(85,144,171,0.2)]'
                          : 'text-kronos-dim hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div
                        className="w-7 h-7 flex-shrink-0 transition-colors duration-200"
                        style={{
                          backgroundColor: isActive ? '#5590ab' : 'currentColor',
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
        <div className="mt-auto flex-shrink-0 flex flex-col items-center gap-3 pt-4 border-t border-white/5 w-full">
          {/* Quick width preset selector */}
          <div className="flex flex-col items-center gap-1.5 w-full px-2">
            <div className="grid grid-cols-2 gap-1 w-full max-w-[56px]">
              {[
                { label: 'S', width: 380 },
                { label: 'M', width: 480 },
                { label: 'L', width: 640 },
                { label: 'XL', width: 800 },
              ].map((preset) => (
                <Tooltip key={preset.label} content={`${preset.label}: ${preset.width}px (Click to set)`}>
                  <button
                    onClick={() => handleSetWidth(preset.width)}
                    className={`h-5 text-[9px] font-bold rounded font-mono transition-all flex items-center justify-center border ${
                      sidebarWidth === preset.width
                        ? 'bg-kronos-accent/20 border-kronos-accent text-kronos-accent shadow-[0_0_8px_rgba(85,144,171,0.3)]'
                        : 'bg-white/5 border-white/5 text-kronos-dim hover:bg-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {preset.label}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="text-xs text-kronos-dim text-center whitespace-nowrap">
            {t('last_update')}<br />{formatLastUpdate(lastUpdate)}
          </div>
          <div className={`w-3 h-3 rounded-full transition-all duration-300 relative group ${
            monitorResult === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
              : monitorResult === 'cached' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
              : monitorResult === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
              : 'bg-gray-600'
          }`}>
            <div className={`absolute top-1/2 -translate-y-1/2 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] shadow-2xl bg-kronos-bg border border-white/10 font-black uppercase text-[10px] tracking-widest text-kronos-accent ${isRight ? 'right-full mr-3' : 'left-full ml-3'}`}>
              {monitorResult === 'success' ? t('sync.success') : monitorResult === 'cached' ? t('sync.cached') : monitorResult === 'error' ? t('sync.error') : t('sync.offline')}
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full transition-all duration-300 relative group ${
            scannerStatus === 'active' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
              : scannerStatus === 'waiting' ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse'
              : scannerStatus === 'stale_offset' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
              : 'bg-gray-700'
          }`}>
            <div className={`absolute top-1/2 -translate-y-1/2 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] shadow-2xl bg-kronos-bg border border-white/10 font-black uppercase text-[10px] tracking-widest text-kronos-accent ${isRight ? 'right-full mr-3' : 'left-full ml-3'}`}>
              {scannerStatus === 'active' ? t('scanner.active')
                : scannerStatus === 'waiting' ? t('scanner.waiting')
                : scannerStatus === 'stale_offset' ? t('scanner.stale')
                : t('scanner.idle')}
            </div>
          </div>
        </div>
      </nav>

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

export default function SidebarOverlay() {
  return (
    <MirroredMonitoringProvider>
      <SidebarContent />
    </MirroredMonitoringProvider>
  )
}
