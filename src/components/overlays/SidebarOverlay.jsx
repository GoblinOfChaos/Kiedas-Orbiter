import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Loader2 } from 'lucide-react'
import { parseInventory } from '../../lib/inventoryParser'
import { MonitoringContext } from '../../contexts/MonitoringContext'

const Mods = lazy(() => import('../../screens/Mods'))
const Rivens = lazy(() => import('../../screens/Rivens'))
const Inventory = lazy(() => import('../../screens/Inventory'))

const FIXED_FILES = [
  ['ExportUpgrades_fixed.json', 'ExportUpgradesFixed'],
  ['ExportAvionics_fixed.json', 'ExportAvionicsFixed'],
  ['mod-icon-map.json', 'ModIconMap'],
  ['peely-pix-map.json', 'PeelyPixMap'],
  ['peely-pix-names.json', 'PeelyPixNames'],
]

const NOOP = () => {}

const NAV_ITEMS = [
  { id: 'mods', icon: 'Mods.png', label: 'Mods' },
  { id: 'rivens', icon: 'IconRiven.png', label: 'Rivens' },
  { id: 'inventory', icon: 'IconInventory.png', label: 'Inventory' },
]

export default function SidebarOverlay() {
  const [visible, setVisible] = useState(false)
  const [side, setSide] = useState('left')
  const [activeTab, setActiveTab] = useState('mods')
  const [inventory, setInventory] = useState(undefined)
  const [exportData, setExportData] = useState(null)
  const [cardImagesPath, setCardImagesPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [uiPath, setUiPath] = useState('')
  const [iconCache, setIconCache] = useState({})
  const loadDataRef = useRef(null)

  const loadData = useCallback(async () => {
    try {
      const result = await invoke('sidebar_load_data')
      const exports = result.exports || {}
      for (const [fname, key] of FIXED_FILES) {
        const bytes = await invoke('read_file_bytes', { relative: `data/assets/data/${fname}` }).catch(() => null)
        if (bytes) {
          const text = new TextDecoder().decode(new Uint8Array(bytes))
          exports[key] = JSON.parse(text)
        }
      }
      setExportData(exports)
      if (result.inventory && exports) {
        setInventory(parseInventory(result.inventory, exports))
      } else {
        setInventory(null)
      }
      if (result.inventoryTimestamp) setLastUpdate(String(result.inventoryTimestamp))
    } catch (err) {
      console.error('[Sidebar] load error:', err)
    }
  }, [])

  loadDataRef.current = loadData

  useEffect(() => {
    invoke('get_card_images_path').then(setCardImagesPath).catch(() => {})
    invoke('get_ui_path').then(setUiPath).catch(() => {})
    loadData().finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => {
    const unsubs = []
    listen('sidebar-data-updated', () => {
      loadDataRef.current()
    }).then(f => unsubs.push(f))
    listen('sidebar-animate-in', (e) => {
      setSide(e.payload || 'left')
      setVisible(true)
    }).then(f => unsubs.push(f))
    listen('sidebar-animate-out', () => {
      setVisible(false)
    }).then(f => unsubs.push(f))
    const appWindow = getCurrentWebviewWindow()
    let resizeTimer
    const unlistenResize = appWindow.onResized(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        invoke('save_sidebar_width', { width: window.innerWidth })
      }, 500)
    })
    unlistenResize.then(f => unsubs.push(f))

    return () => { unsubs.forEach(f => f()) }
  }, [])

  useEffect(() => {
    if (!uiPath) return
    const names = NAV_ITEMS.map(i => i.icon)
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

  const uiIcon = (name) => iconCache[name] || ''

  const allPrices = useMemo(() => {
    try {
      const data = localStorage.getItem('wfm_price_cache')
      if (!data) return {}
      const cache = JSON.parse(data)
      const prices = {}
      for (const [key, val] of Object.entries(cache)) {
        if (val && typeof val.plat === 'number') prices[key] = val.plat
      }
      return prices
    } catch { return {} }
  }, [lastUpdate])

  const ExportTextIcons = useMemo(() => exportData?.ExportTextIcons ?? {}, [exportData])

  const contextValue = useMemo(() => ({
    exportData: exportData || {},
    inventoryData: inventory,
    isInventoryLoading: loading,
    ExportTextIcons,
    cardImagesPath,
    fixProgress: { phase: 'done', current: 1, total: 1, current_file: '' },
    allPrices,
    isPriceLoading: false,
    priceFetchProgress: null,
    priceLastUpdated: null,
    lastUpdate,
    worldState: null,
    setWorldState: NOOP,
    statusText: '',
    isMonitoring: false,
    monitorResult: 'idle',
    autoStart: false,
    setAutoStart: NOOP,
    rawInventory: null,
    startMonitoring: NOOP,
    stopMonitoring: NOOP,
    manualRefresh: NOOP,
    callApiHelper: NOOP,
    retryCardImages: NOOP,
    refreshPrices: NOOP,
    masteryProgress: null,
    spIncursions: null,
    arbys: null,
    archonModifiers: null,
    dict: exportData?.ExportDictionary ?? {},
    suppDict: exportData?.ExportSupplementDictionary ?? {},
    EC: exportData?.ExportCategories ?? {},
    ERg: exportData?.ExportRegions ?? {},
    EI: exportData?.ExportIcons ?? {},
    ES: exportData?.ExportSorting ?? {},
    ENW: exportData?.ExportNodeWater ?? {},
    ENWRawRewards: exportData?.ExportNodeWaterRewards ?? {},
    ExportImages: exportData?.ExportImages ?? {},
  }), [inventory, exportData, loading, ExportTextIcons, cardImagesPath, allPrices, lastUpdate])

  const slideX = side === 'left'
    ? (visible ? 'translate-x-0' : '-translate-x-full')
    : (visible ? 'translate-x-0' : 'translate-x-full')

  const isLeft = side === 'left'

  return (
    <div className="h-screen w-screen overflow-hidden flex items-start" style={{ backgroundColor: 'transparent' }}>
      <div className={`relative flex h-[calc(100vh-24px)] transition-transform duration-200 ease-out ${slideX} w-full ${isLeft ? 'ml-3' : 'mr-3'} mt-3`}>
        <div
          data-tauri-drag-resize={isLeft ? 'east' : 'west'}
          className={`absolute top-0 bottom-0 w-1.5 cursor-col-resize z-50 ${isLeft ? '-right-0.5' : '-left-0.5'}`}
        />

        <MonitoringContext.Provider value={contextValue}>
          <div className="flex flex-1 overflow-hidden rounded-2xl border border-white/[0.06]" style={{ backgroundColor: 'var(--color-bg)' }}>
            <nav className="glass-panel w-14 border-r flex flex-col items-center py-4 gap-2 z-40 relative flex-shrink-0">
              <div className="mb-2 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-kronos-accent/10">
                  <span className="text-[9px] font-black text-kronos-accent tracking-tight">CK</span>
                </div>
              </div>

              <div className="flex-1 w-full overflow-y-auto py-1 custom-scrollbar">
                <div className="flex flex-col gap-3 items-center min-h-min pb-2">
                  {NAV_ITEMS.map((item) => {
                    const isActive = activeTab === item.id
                    const iconUrl = uiIcon(item.icon)
                    return (
                      <div key={item.id} className="relative group">
                        <button
                          onClick={() => setActiveTab(item.id)}
                          className={`
                            w-9 h-9 flex items-center justify-center rounded-lg
                            transition-all duration-200 flex-shrink-0
                            ${isActive
                              ? 'bg-kronos-accent/10 shadow-[0_0_12px_rgba(var(--kronos-accent-rgb),0.15)]'
                              : 'text-kronos-dim hover:bg-white/5'}
                          `}
                        >
                          {iconUrl ? (
                            <div
                              className="w-5 h-5 transition-colors duration-200"
                              style={{
                                backgroundColor: isActive ? 'var(--color-accent, #5590ab)' : 'currentColor',
                                maskImage: `url(${iconUrl})`,
                                WebkitMaskImage: `url(${iconUrl})`,
                                maskSize: 'contain',
                                WebkitMaskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                WebkitMaskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                WebkitMaskPosition: 'center',
                                opacity: isActive ? 1 : 0.6,
                              }}
                            />
                          ) : (
                            <span className="text-xs font-bold uppercase tracking-tight">{item.label[0]}</span>
                          )}
                        </button>
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] bg-kronos-bg border border-white/10 text-[10px] font-black uppercase tracking-widest text-kronos-accent shadow-xl">
                          {item.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </nav>

            <main className="flex-1 overflow-hidden">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-kronos-dim" />
                </div>
              ) : !inventory ? (
                <div className="h-full flex items-center justify-center px-6">
                  <p className="text-xs text-kronos-dim text-center leading-relaxed">
                    No inventory data loaded.<br />
                    Start monitoring in the main app first.
                  </p>
                </div>
              ) : (
                <Suspense fallback={
                  <div className="h-full flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-kronos-dim" />
                  </div>
                }>
                  {activeTab === 'mods' && <Mods />}
                  {activeTab === 'rivens' && <Rivens />}
                  {activeTab === 'inventory' && <Inventory />}
                </Suspense>
              )}
            </main>
          </div>
        </MonitoringContext.Provider>
      </div>
    </div>
  )
}
