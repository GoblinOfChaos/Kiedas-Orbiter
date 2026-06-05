/**
 * Inventory.jsx
 *
 * Displays the user's full collection of items, including equipment, mods,
 * arcanes and resources.  Provides categorised tabs and multi-column
 * filtering (e.g., "Owned + Unmastered").
 */
import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, ArrowUpDown, Check, Box, Zap, Gem, X } from 'lucide-react'
import { PageLayout, Card, Input, Button, Tabs, MonitorState, Tooltip } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri'

const INVENTORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'warframes', label: 'Warframes' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'companions', label: 'Companions' },
  { id: 'companion_weapons', label: 'Companion Weapons' },
  { id: 'archweapons', label: 'Archweapons' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'necramechs', label: 'Necramechs' },
  { id: 'amps', label: 'Amps' },
  { id: 'resources', label: 'Resources' },
  { id: 'prime_parts', label: 'Prime Sets' },
]

const FILTER_CONFIG = {
  all: ['owned', 'mastered', 'unmastered'],
  warframes: ['owned', 'mastered', 'subsumed'],
  weapons: ['owned', 'mastered', 'primary', 'secondary', 'melee', 'incarnon'],
  companions: ['owned', 'mastered'],
  companion_weapons: ['owned', 'mastered'],
  archweapons: ['owned', 'mastered'],
  vehicles: ['owned', 'mastered', 'archwing', 'kdrive'],
  necramechs: ['owned', 'mastered'],
  amps: ['owned', 'mastered'],
  mods: ['owned'],
  prime_parts: ['owned', 'mastered'],
  resources: ['owned'],
}

const SORT_CONFIG = {
  all: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  warframes: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  weapons: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  companions: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  companion_weapons: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  archweapons: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  vehicles: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  necramechs: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  amps: [{ id: 'name', label: 'Name' }, { id: 'xp', label: 'XP' }],
  mods: [{ id: 'name', label: 'Name' }, { id: 'quantity', label: 'Count' }, { id: 'rank', label: 'Rank' }],
  prime_parts: [{ id: 'name', label: 'Name' }, { id: 'completion', label: 'Completion' }, { id: 'value', label: 'Value' }],
  resources: [{ id: 'name', label: 'Name' }, { id: 'quantity', label: 'Count' }],
}

const ITEMS_PER_PAGE = 48

function FoundryPanel({ isOpen, onClose, inventoryData, foundryFilters, setFoundryFilters }) {
  const { isInventoryLoading } = useMonitoring()
  const [width, setWidth] = useState(600)
  const [isResizing, setIsResizing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(24)
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // Small delay to ensure DOM is ready for entry animation
      requestAnimationFrame(() => setIsAnimating(true))
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e) => {
      window.requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX
        // Limit to window width minus sidebar (80px)
        if (newWidth > 320 && newWidth < window.innerWidth - 80) setWidth(newWidth)
      })
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const craftingItems = useMemo(() => {
    return inventoryData?.foundry ?? []
  }, [inventoryData])

  const craftableItems = useMemo(() => {
    return inventoryData?.craftable ?? []
  }, [inventoryData])

  useEffect(() => { setVisibleCount(24) }, [searchQuery, foundryFilters])

  const formatFoundryTime = (seconds) => {
    if (seconds <= 0) return 'READY'
    const d = Math.floor(seconds / (24 * 3600))
    const h = Math.floor((seconds % (24 * 3600)) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (d > 0) return `${d}d ${h}h`
    return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m ${s}s` : `${s}s`)
  }

  const filteredCrafting = useMemo(() => {
    let items = craftingItems
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(i => (i.name ?? '').toLowerCase().includes(q) || (i.parentName ?? '').toLowerCase().includes(q))
    }
    return items
  }, [craftingItems, searchQuery])

  const filteredCraftable = useMemo(() => {
    let items = craftableItems

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      // Search everything - owned BPs and component-based warframe BPs
      items = items.filter(i =>
        i.bpName.toLowerCase().includes(q) ||
        i.baseName.toLowerCase().includes(q) ||
        i.ingredients.some(ing => ing.name.toLowerCase().includes(q))
      )
    } else {
      // Without search, show BPs player owns OR component-based ones they have parts for
      items = items.filter(i => i.bpCount > 0 || i.componentBased)
    }

    // Apply other filters
    if (foundryFilters.unmastered) {
      items = items.filter(i => i.hasMastery && !i.isMastered)
    }
    if (foundryFilters.owned) {
      items = items.filter(i => !i.fullItemOwned)
    }
    if (foundryFilters.ready) {
      items = items.filter(i => i.allIngredientsMet)
    }

    return items
  }, [craftableItems, searchQuery, foundryFilters])

  if (!shouldRender) return null

  const hasData = !!inventoryData
  const isLarge = width > 850
  const isMedium = width > 500

  return (
    <div className={`fixed inset-0 z-[100] flex justify-end transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative h-full bg-kronos-bg border-l border-white/5 shadow-2xl flex flex-col transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
        style={{
          width: `${width}px`,
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: isResizing ? 'none' : 'width 500ms cubic-bezier(0.16, 1, 0.3, 1), transform 500ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div
          className={`absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-kronos-accent/30 transition-colors z-50 flex items-center justify-center ${isResizing ? 'bg-kronos-accent/20' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        >
          <div className={`w-[1px] h-12 rounded-full transition-colors ${isResizing ? 'bg-kronos-accent shadow-[0_0_8px_rgba(var(--kronos-accent-rgb),0.8)]' : 'bg-white/10'}`} />
        </div>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div><h3 className="text-2xl font-bold uppercase tracking-tight">Foundry</h3></div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={22} /></button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={16} />
            <Input placeholder="Search blueprints..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 py-3 text-sm" />
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-white/5 flex gap-3">
          <button
            onClick={() => setFoundryFilters(prev => ({ ...prev, crafting: !prev.crafting }))}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${foundryFilters.crafting ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}
          >
            Crafting
          </button>
          <button
            onClick={() => setFoundryFilters(prev => ({ ...prev, ready: !prev.ready }))}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${foundryFilters.ready ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}
          >
            Ready
          </button>
          <button
            onClick={() => setFoundryFilters(prev => ({ ...prev, owned: !prev.owned }))}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${foundryFilters.owned ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}
          >
            Unowned
          </button>
          <button
            onClick={() => setFoundryFilters(prev => ({ ...prev, unmastered: !prev.unmastered }))}
            className={`flex-1 flex items-center justify-center py-3 rounded-xl border text-[11px] font-black uppercase transition-all ${foundryFilters.unmastered ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-kronos-panel/20 border-white/5 text-kronos-dim'}`}
          >
            Unmastered
          </button>

        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {isInventoryLoading ? (
            <MonitorState isLoading className="h-full" />
          ) : inventoryData === null ? (
            <MonitorState className="h-full" />
          ) : (
            <>
              {/* Currently Crafting */}
              {foundryFilters.crafting && (
                <>
                  {filteredCrafting.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Currently Crafting</h4>
                      <div className={`grid gap-3 ${isMedium ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {filteredCrafting.map((item, idx) => {
                          const duration = item.startTime ? (item.finishTime - item.startTime) : (item.buildTime || 12 * 3600);
                          const now = Date.now() / 1000;
                          const elapsed = item.startTime ? (now - item.startTime) : (now - (item.finishTime - (item.buildTime || 12 * 3600)));
                          const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
                          const timeLeft = Math.max(0, item.finishTime - now);
                          return (
                            <div key={item.unique_name + idx} className="flex gap-4 items-center bg-kronos-panel/30 p-3 rounded-lg border border-orange-500/20">
                              <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                                {item.image && <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-bold text-kronos-text">{item.name}</span>
                                  {item.ready ? (
                                    <span className="text-[11px] font-black text-green-500 uppercase flex items-center gap-1"><Check size={14} /> READY</span>
                                  ) : (
                                    <span className="text-[11px] font-mono text-orange-400">{formatFoundryTime(timeLeft)}</span>
                                  )}
                                </div>
                                {!item.ready && (
                                  <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Craftable Blueprints - show when Crafting is OFF */}
              {!foundryFilters.crafting && (
                <>
                  {filteredCraftable.length === 0 ? (
                    <div className="text-center py-12 text-kronos-dim text-sm italic">No blueprints match your filters.</div>
                  ) : (
                    <>
                      <div className="grid gap-4 grid-cols-1">
                        {filteredCraftable.slice(0, visibleCount).map((item, idx) => (
                          <div key={item.uniqueName + idx} className={`rounded-xl border border-white/5 overflow-hidden flex flex-col bg-kronos-panel/20`}>
                            {/* Header: BP image + name + badges */}
                            <div className={`flex items-center gap-4 px-4 py-5 border-b border-white/5 relative ${item.bpCount > 0 ? 'bg-green-500/5' : ''}`}>
                              <div className="w-28 h-28 flex items-center justify-center flex-shrink-0">
                                {item.image
                                  ? <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />
                                  : <div className="w-14 h-14 rounded bg-white/5" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xl font-black text-kronos-text uppercase whitespace-normal leading-tight">{item.baseName}</p>
                                    {(item.buildTime > 0 || item.buildPrice > 0) && (
                                      <div className="flex gap-3 mt-1">
                                        {item.buildPrice > 0 && <span className="text-[10px] font-black text-yellow-500/80 uppercase">Credit cost: {item.buildPrice.toLocaleString()}</span>}
                                        {item.buildTime > 0 && <span className="text-[10px] font-black text-kronos-dim uppercase">Build time: {formatFoundryTime(item.buildTime)}</span>}
                                      </div>
                                    )}
                                  </div>
                                  {item.allIngredientsMet && item.bpCount > 0 && (
                                    <div className="px-2 py-1 bg-green-500 text-black text-[10px] font-black uppercase rounded flex items-center gap-1 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                      <Check size={12} /> Ready
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4">
                                  {/* Blueprint Status */}
                                  <div className={`flex items-center px-3 py-1.5 rounded-lg border transition-colors ${item.bpCount > 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                    <div className={`${item.bpCount > 0 ? 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Blueprint: {item.bpCount}</span>
                                  </div>

                                  {/* Crafted Status */}
                                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${item.fullItemOwned ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-wider">Crafted: {item.ownedCount || 0}</span>
                                  </div>

                                  {/* Mastery Status */}
                                  {item.hasMastery && (
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${item.isMastered ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                                      <span className="text-[10px] font-black uppercase tracking-wider">{item.isMastered ? 'Mastered' : 'Unmastered'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Ingredients grid */}
                            {item.ingredients.length > 0 && (
                              <div
                                className={`grid gap-px flex-1 border-t border-white/5`}
                                style={{
                                  gridTemplateColumns: `repeat(${isMedium ? Math.min(item.ingredients.length, 4) : 2}, 1fr)`
                                }}
                              >
                                {item.ingredients.map((ing, i) => {
                                  const met = ing.have >= ing.need
                                  const hasSubIngredients = ing.isComponent && ing.bpOwned > 0 && ing.subIngredients && ing.subIngredients.length > 0;

                                  const ingredientContent = (
                                    <div
                                      className={`flex flex-col items-center justify-center gap-1.5 p-3 h-full ${met ? 'bg-green-500/5' : 'bg-black/20'} relative group ${hasSubIngredients ? 'cursor-help' : ''}`}
                                    >
                                      <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 relative">
                                        {ing.image
                                          ? <img src={ing.image} alt="" className="max-w-full max-h-full object-contain" />
                                          : <div className="w-7 h-7 rounded bg-white/5" />
                                        }
                                        {ing.isComponent && ing.bpOwned > 0 && (
                                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${ing.bpReady ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {ing.bpReady ? <Check size={10} className="text-black" /> : <X size={10} className="text-white" />}
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-[14px] font-medium text-kronos-dim text-center leading-tight w-full px-1">{ing.name}</p>
                                      <span className={`text-[12px] font-black font-mono ${met ? 'text-green-400' : 'text-red-400'}`}>
                                        {ing.have}/{ing.need}{ing.isComponent && ing.bpOwned > 0 && ` (${ing.bpOwned} BP${ing.bpOwned > 1 ? 's' : ''})`}
                                      </span>
                                    </div>
                                  );

                                  if (hasSubIngredients) {
                                    return (
                                      <Tooltip
                                        key={i}
                                        position="top"
                                        content={
                                          <div className="min-w-[200px]">
                                            <p className="text-[10px] font-black text-kronos-accent uppercase mb-2">Requires:</p>
                                            <div className="space-y-1">
                                              {ing.subIngredients.map((sub, si) => {
                                                const subMet = sub.have >= sub.need;
                                                return (
                                                  <div key={si} className="flex items-center gap-2 text-[10px]">
                                                    <div className="w-6 h-6 flex-shrink-0">
                                                      {sub.image ? <img src={sub.image} alt="" className="max-w-full max-h-full object-contain" /> : <div className="w-4 h-4 bg-white/10 rounded" />}
                                                    </div>
                                                    <span className={`flex-1 ${subMet ? 'text-green-400' : 'text-red-400'}`}>{sub.name}</span>
                                                    <span className="font-mono">{sub.have}/{sub.need}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        }
                                      >
                                        {ingredientContent}
                                      </Tooltip>
                                    );
                                  }

                                  return <div key={i} className="h-full">{ingredientContent}</div>;
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {visibleCount < filteredCraftable.length && (
                        <div className="flex justify-center pt-8 pb-12">
                          <Button
                            variant="secondary"
                            onClick={() => setVisibleCount(prev => prev + 24)}
                            className="w-full py-4 text-[11px] font-black uppercase tracking-[0.2em] border border-white/5 bg-kronos-panel/10 hover:bg-kronos-panel/30 transition-all text-kronos-accent"
                          >
                            Load More Blueprints ({filteredCraftable.length - visibleCount} remaining)
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
export default function Inventory() {
  const { inventoryData, isInventoryLoading, allPrices, isPriceLoading } = useMonitoring()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterSortPanel, setShowFilterSortPanel] = useState(false)
  const [currentFilters, setCurrentFilters] = useState({})
  const [sortCriteria, setSortCriteria] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [showFoundry, setShowFoundry] = useState(false)
  const [foundryFilters, setFoundryFilters] = useState({ crafting: true, ready: false, owned: false, unmastered: false })
  const [framesPath, setFramesPath] = useState('')
  const [uiPath, setUiPath] = useState('')
  useEffect(() => { invoke('get_mod_frames_path').then(p => setFramesPath(p)).catch(() => { }) }, [])
  useEffect(() => { invoke('get_ui_path').then(p => setUiPath(p)).catch(() => { }) }, [])

  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE) }, [activeTab, searchQuery, currentFilters])

  const primePrices = activeTab === 'prime_parts' ? allPrices : null

  const tabItems = useMemo(() => {
    if (!inventoryData) return []
    if (activeTab === 'prime_parts') {
      const searchArrays = [
        inventoryData.warframes, inventoryData.primary, inventoryData.secondary,
        inventoryData.melee, inventoryData.sentinels, inventoryData.beasts,
        inventoryData.moas, inventoryData.hounds, inventoryData.archwings,
        inventoryData.necramechs, inventoryData.amps
      ]
      return Object.values(inventoryData.primeSets ?? {}).filter(set =>
        set.parts.some(p => p.quantity > 0)
      ).map(set => {
        const parent = searchArrays.flat().find(i =>
          i.name === set.name || i.name === set.name + ' Prime'
        ) ?? {}
        return { ...set, owned: parent.owned ?? false, mastered: parent.mastered ?? false }
      })
    }
    return inventoryData[activeTab] ?? []
  }, [inventoryData, activeTab])

  const filteredItems = useMemo(() => {
    let items = tabItems
    if (searchQuery) {
      const q = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      items = items.filter(item => {
        const itemName = (item.name ?? '').toLowerCase();
        const components = (item.components ?? []).map(c => c.toLowerCase());

        // Match if ALL search words exist somewhere in either the name OR components
        return q.every(word =>
          itemName.includes(word) || components.some(c => c.includes(word))
        );
      });
    }
    const filters = FILTER_CONFIG[activeTab] ?? []
    const activeF = filters.filter(f => currentFilters[f])
    if (activeF.length > 0) {
      items = items.filter(item => {
        for (const f of activeF) {
          if (f === 'owned' && !item.owned) return false
          if (f === 'unowned' && item.owned) return false
          if (f === 'mastered' && !item.mastered) return false
          if (f === 'unmastered' && item.mastered) return false
          if (f === 'subsumed' && !item.subsumed) return false
          if (f === 'incarnon' && !item.is_incarnon) return false
          if (f === 'primary' && item.weapon_type !== 'primary') return false
          if (f === 'secondary' && item.weapon_type !== 'secondary') return false
          if (f === 'melee' && item.weapon_type !== 'melee') return false
          if (f === 'archwing' && item.vehicle_type !== 'archwing') return false
          if (f === 'kdrive' && item.vehicle_type !== 'kdrive') return false
        }
        return true
      })
    }
    items = [...items].sort((a, b) => {
      // Special handling for prime_parts completion sort
      if (activeTab === 'prime_parts' && sortCriteria === 'completion') {
        const aComplete = (a.ownedCount ?? 0) / (a.totalCount ?? 1)
        const bComplete = (b.ownedCount ?? 0) / (b.totalCount ?? 1)
        return sortDirection === 'asc' ? aComplete - bComplete : bComplete - aComplete
      }
      if (activeTab === 'prime_parts' && sortCriteria === 'value') {
        const aVal = (a.parts ?? []).reduce((s, p) => s + (primePrices?.[p.unique_name] ?? 0), 0)
        const bVal = (b.parts ?? []).reduce((s, p) => s + (primePrices?.[p.unique_name] ?? 0), 0)
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      let av = a[sortCriteria] ?? ''; let bv = b[sortCriteria] ?? ''
      if (typeof av === 'boolean') av = av ? 1 : 0
      if (typeof bv === 'boolean') bv = bv ? 1 : 0
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      return sortDirection === 'asc' ? (av < bv ? -1 : (av > bv ? 1 : 0)) : (av < bv ? 1 : (av > bv ? -1 : 0))
    })
    return items
  }, [tabItems, searchQuery, currentFilters, activeTab, sortCriteria, sortDirection])

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount])

  const modBgMap = {
    'Normal Common': 'BronzeBackground.png',
    'Normal Uncommon': 'SilverBackground.png',
    'Normal Rare': 'GoldBackground.png',
    'Normal Legendary': 'LegendaryBackground.png',
    'Galvanized': 'GalvanizedBackground.png',
    'Riven': 'SilverBackground.png',
    'Amalgam': 'AmalgamBackground.png',
    'Peculiar': 'LegendaryBackground.png',
    'Plexus Common': 'BronzeBackground.png',
    'Plexus Uncommon': 'SilverBackground.png',
    'Plexus Rare': 'GoldBackground.png',
    'Archon': 'Background.png',
    'Requiem': 'Background.png',
    'Antivirus': 'Background.png',
    'Potency': 'Background.png',
    'Tome': 'Background.png',
  }
  const modFrameTopMap = {
    'Normal Common': 'BronzeFrameTop.png',
    'Normal Uncommon': 'SilverFrameTop.png',
    'Normal Rare': 'GoldFrameTop.png',
    'Normal Legendary': 'LegendaryFrameTop.png',
    'Galvanized': 'GalvanizedFrameTop.png',
    'Riven': 'RivenFrameTop.png',
    'Amalgam': 'AmalgamFrameTop.png',
    'Peculiar': 'PeculiarFrameTop.png',
    'Plexus Common': 'AvionicModsFrameTopBronze.png',
    'Plexus Uncommon': 'AvionicModsFrameTopSilver.png',
    'Plexus Rare': 'AvionicModsFrameTopGold.png',
    'Archon': null,
    'Requiem': null,
    'Antivirus': null,
    'Potency': null,
    'Tektolyst': null,
    'Tome': null,
  }
  const modFrameBotMap = {
    'Normal Common': 'BronzeFrameBottom.png',
    'Normal Uncommon': 'SilverFrameBottom.png',
    'Normal Rare': 'GoldFrameBottom.png',
    'Normal Legendary': 'LegendaryFrameBottom.png',
    'Galvanized': 'GalvanizedFrameBottom.png',
    'Riven': 'RivenFrameBottom.png',
    'Amalgam': 'AmalgamFrameBottom.png',
    'Peculiar': 'PeculiarFrameBottom.png',
    'Plexus Common': 'AvionicModsFrameBottomBronze.png',
    'Plexus Uncommon': 'AvionicModsFrameBottomSilver.png',
    'Plexus Rare': 'AvionicModsFrameBottomGold.png',
    'Archon': null,
    'Requiem': null,
    'Antivirus': null,
    'Potency': null,
    'Tektolyst': null,
    'Tome': null,
  }
  const modBg = (mf, item) => {
    if (!framesPath) return ''
    if (mf === 'Tektolyst') {
      const modName = item?.name
      if (modName) {
        const src = convertFileSrc(`${framesPath}/${mf}/${modName.replace(/\s+/g, '')}.png`)
        return src
      }
      return ''
    }
    return framesPath && modBgMap[mf] ? convertFileSrc(`${framesPath}/${mf}/${modBgMap[mf]}`) : ''
  }
  const modFrameTop = (mf) => framesPath && modFrameTopMap[mf] ? convertFileSrc(`${framesPath}/${mf}/${modFrameTopMap[mf]}`) : ''
  const modFrameBot = (mf) => framesPath && modFrameBotMap[mf] ? convertFileSrc(`${framesPath}/${mf}/${modFrameBotMap[mf]}`) : ''
  const isModFrame = (item) => item.category === 'mods' && framesPath && (modBgMap[item.modFrame] || item.modFrame === 'Tektolyst')

  const tabLabel = INVENTORY_TABS.find(t => t.id === activeTab)?.label ?? activeTab

  const renderHeaderPanel = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input
            placeholder={`Search ${tabLabel}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-12 bg-black/20 border-white/5 focus:bg-black/40 h-[42px]"
          />
        </div>

        {/* Filter Tags In-line */}
        {(FILTER_CONFIG[activeTab] ?? []).length > 0 && (
          <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
            <Filter size={14} className="text-kronos-dim mx-1" />
            <div className="flex gap-1">
              {(FILTER_CONFIG[activeTab] ?? []).map(f => (
                <button
                  key={f}
                  onClick={() => setCurrentFilters(prev => ({ ...prev, [f]: !prev[f] }))}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${currentFilters[f] ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
                >
                  {f.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort Controls In-line */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
          <span className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">Sort:</span>
          <div className="flex gap-1">
            {(SORT_CONFIG[activeTab] ?? []).map(c => {
              const isActive = sortCriteria === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (isActive) {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortCriteria(c.id);
                      setSortDirection('asc');
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${isActive ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
                >
                  {c.label}
                  {isActive && <ArrowUpDown size={10} className={sortDirection === 'desc' ? 'rotate-180' : ''} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Foundry Button */}
        <Button
          variant="secondary"
          onClick={() => setShowFoundry(true)}
          className="relative flex items-center gap-2 h-[42px] px-4 border-white/5 bg-black/20 hover:bg-black/40"
        >
          <img src={uiPath ? convertFileSrc(`${uiPath}/IconFoundry.png`) : ''} alt="Foundry" className="w-5 h-5 object-contain" />
          <span className="text-[11px] font-black uppercase tracking-widest">Foundry</span>
          {inventoryData?.foundry?.some(i => i.ready) && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-kronos-bg"></span>
            </span>
          )}
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs tabs={INVENTORY_TABS} activeTab={activeTab} onChange={(id) => { setActiveTab(id); setCurrentFilters({}); setSortCriteria('name'); setSortDirection('asc') }} />
    </div>
  )

  return (
    <PageLayout
      title="Inventory"
      subtitle={`Displaying ${visibleItems.length} / ${filteredItems.length} items`}
      extra={renderHeaderStats(inventoryData)}
      headerPanel={renderHeaderPanel()}
    >
      <div className="space-y-6">
        {inventoryData === undefined ? (
          <MonitorState isLoading className="py-20" />
        ) : inventoryData === null ? (
          <MonitorState className="py-20" />
        ) : (
          filteredItems.length === 0 ? (
            <div className="text-center py-20 text-kronos-dim">No items found in {tabLabel.toLowerCase()}.</div>
          ) : activeTab === 'prime_parts' ? (
            <>
              {primePrices === null && (
                <div className="flex items-center gap-2 pb-2 px-1">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-kronos-accent">Fetching prices...</span>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
              {visibleItems.map((set, idx) => {
                const isParentOwned = set.owned
                const isParentMastered = set.mastered

                // Count unique components owned (presence, not quantity)
                const uniqueOwned = set.parts.filter(p => p.quantity > 0).length
                const uniqueTotal = set.parts.length
                const completion = Math.min(100, uniqueOwned / uniqueTotal * 100)
                const isComplete = uniqueOwned >= uniqueTotal
                const bpPart = set.parts.find(p => p.name.includes('Blueprint'))
                const bpCount = bpPart?.quantity ?? 0
                const setsPossible = bpCount > 0 && uniqueOwned >= uniqueTotal ? bpCount : 0
                const setValue = set.parts.reduce((sum, p) => sum + (primePrices?.[p.unique_name] ?? 0), 0)

                return (
                  <div key={set.name + idx} className={`relative rounded-xl border border-white/5 overflow-hidden flex flex-col bg-kronos-panel/20 ${isComplete ? 'border-green-500/30' : ''}`}>
                    {primePrices === null ? (
                      <span className="absolute top-4 right-4 z-10 inline-block w-6 h-3 bg-white/20 rounded animate-pulse" />
                    ) : setValue > 0 && (
                      <span className="absolute top-4 right-4 z-10 text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-400/15 border border-zinc-400/40 text-zinc-300">{setValue}p</span>
                    )}
                    {/* Header: image + name + badges */}
                    <div className={`flex items-center gap-4 px-4 py-5 border-b border-white/5 relative ${isComplete ? 'bg-green-500/5' : ''}`}>
                      <div className="w-28 h-28 flex items-center justify-center flex-shrink-0">
                        {set.image
                          ? <img src={set.image} alt="" className="max-w-full max-h-full object-contain" />
                          : <div className="w-14 h-14 rounded bg-white/5" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-xl font-black text-kronos-text uppercase whitespace-normal leading-tight">{set.name} Set</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded inline-block ${isComplete ? 'bg-green-500/20 text-green-400' : 'bg-kronos-accent/20 text-kronos-accent'}`}>
                                {setsPossible > 0 ? `${setsPossible} Set${setsPossible > 1 ? 's' : ''}` : `${uniqueOwned}/${uniqueTotal} (${Math.round(completion)}%)`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          {/* Owned Status */}
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isParentOwned ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider">{isParentOwned ? 'Owned' : 'Unowned'}</span>
                          </div>

                          {/* Mastery Status */}
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isParentMastered ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider">{isParentMastered ? 'Mastered' : 'Unmastered'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Parts grid */}
                    {(() => {
                      const ownedParts = set.parts.filter(p => p.quantity > 0)
                      return (
                        <div className="grid gap-px border-t border-white/5" style={{ gridTemplateColumns: `repeat(${Math.min(set.parts.length, 6)}, 1fr)` }}>
                          {set.parts.map((part, pi) => {
                            const met = part.quantity > 0
                            const isBlueprint = part.name.includes('Blueprint')
                            const partPrice = primePrices?.[part.unique_name] ?? 0
                            return (
                              <div key={pi} className={`flex flex-col items-center justify-center gap-1.5 p-3 h-full ${met ? 'bg-green-500/5' : 'bg-black/20'} relative`}>
                                {primePrices === null ? (
                                  <span className="absolute top-2 right-2 animate-pulse bg-white/10 rounded px-1 py-0.5 inline-block w-4 h-2" />
                                ) : partPrice > 0 && (
                                  <span className="absolute top-2 right-2 text-[9px] font-bold px-1 py-0.5 rounded bg-zinc-400/15 border border-zinc-400/40 text-zinc-300">{partPrice}p</span>
                                )}
                                <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 relative">
                                  {part.image
                                    ? <img src={part.image} alt="" className="max-w-full max-h-full object-contain" />
                                    : <div className="w-7 h-7 rounded bg-white/5" />
                                  }
                                  {isBlueprint && <img src={uiPath ? convertFileSrc(`${uiPath}/BlueprintOverlay.png`) : ''} alt="" className="absolute inset-0 w-full h-full object-contain" />}
                                </div>
                                <p className="text-[12px] font-medium text-kronos-dim text-center leading-tight w-full px-1 truncate">{part.name.split(' ').slice(-1)[0]}</p>
                                {part.quantity > 0 && <span className={`text-[10px] font-black ${part.owned ? 'text-green-400' : 'text-kronos-dim'}`}>×{part.quantity}</span>}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-4">
              {visibleItems.map((item, idx) => {
                const isUnowned = !item.owned
                const isPrimePart = item.category === 'prime_parts'
                const isModOrResource = ['mods', 'resources', 'arcanes'].includes(item.category)
                return (
                  <Card key={item.unique_name + idx} glow={!isUnowned} className={`relative p-0 overflow-hidden flex h-40 group transition-all duration-300 ${isUnowned ? 'bg-kronos-panel/10 border-2 border-dashed border-kronos-accent' : 'border-kronos-panel/40'}`}>

                    {/* Image column */}
                    <div className={`w-32 flex-shrink-0 relative overflow-hidden border-r border-white/5 flex items-center justify-center ${isModFrame(item) ? '' : 'bg-kronos-panel/30 p-3'}`}>
                      {isModFrame(item) ? (
                        <>
                          <div className="absolute inset-0" style={{ backgroundImage: `url(${modBg(item.modFrame, item)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                          {modFrameTop(item.modFrame) && <img src={modFrameTop(item.modFrame)} className="absolute top-0 left-0 w-full pointer-events-none" alt="" style={{ objectFit: 'cover', objectPosition: 'top' }} />}
                          {modFrameBot(item.modFrame) && <img src={modFrameBot(item.modFrame)} className="absolute bottom-0 left-0 w-full pointer-events-none" alt="" style={{ objectFit: 'cover', objectPosition: 'bottom' }} />}
                          <div className={`relative z-10 flex flex-col items-center justify-center w-full h-full ${isUnowned ? 'grayscale opacity-40' : ''}`}>
                            {item.image && <img src={item.image} className="max-w-[60%] max-h-[60%] object-contain" alt="" loading="lazy" />}
                            {item.rank > 0 && item.max_rank > 0 && (
                              <span className="text-[8px] font-black text-white mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">R{item.rank}</span>
                            )}
                          </div>
                          {item.quantity > 1 && (
                            <div className="absolute top-1 right-1 z-20 text-[9px] font-black text-kronos-accent bg-black/60 px-1 rounded shadow">×{item.quantity}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <Box className="text-kronos-panel absolute w-20 h-20 opacity-10" />
                          {item.image && <img src={item.image} alt="" className={`max-w-full max-h-full object-contain relative z-10 transition-all duration-500 group-hover:scale-110 ${isUnowned ? 'grayscale opacity-40' : ''}`} loading="lazy" />}

                          {!isUnowned && item.formas > 0 && (
                            <div className="absolute top-2 left-2 z-20 flex items-center gap-0.5 bg-kronos-accent text-kronos-bg px-2 py-0.5 rounded shadow-lg border border-white/20 backdrop-blur-sm">
                              <span className="text-[11px] font-black">{item.formas}</span>
                              <span className="text-[9px]">★</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Info column */}
                    <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0 overflow-hidden">

                      {/* Top: category label + name */}
                      <div className="min-w-0">
                        <span className="text-[9px] font-black text-kronos-accent uppercase tracking-widest block truncate leading-none mb-1">
                          {item.category === 'mods' ? (item.rarity || 'Mod') : (item.weapon_type || item.vehicle_type || (isPrimePart ? 'Prime Part' : item.category?.replace(/_/g, ' ')))}
                        </span>
                        <h4 className="font-bold text-sm uppercase truncate text-kronos-text leading-tight mt-0.5" title={item.name}>
                          {item.name}
                        </h4>
                      </div>

                      {/* Middle: Sub-components (centered and larger) */}
                      <div className="flex-1 flex flex-col justify-center py-1">
                        {item.components && item.components.length > 0 && (
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {item.components.map((comp, ci) => (
                              <span key={ci} className="text-[11px] font-bold text-kronos-dim uppercase tracking-tight leading-none bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{comp}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom: status row */}
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-white/5">

                        {/* Rank -- shown for equipment and mods */}
                        {!isUnowned && item.rank !== undefined && item.max_rank !== undefined && item.max_rank > 0 && (
                          <span className={`text-[10px] font-black uppercase ${item.rank === item.max_rank ? 'text-blue-400' : 'text-kronos-dim'}`}>
                            R{item.rank}/{item.max_rank}
                          </span>
                        )}

                        {/* Mastery (equipment) */}
                        {!isModOrResource && (
                          item.mastered
                            ? <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1"><Gem size={10} className="fill-current/20" />Mastered</span>
                            : <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isUnowned ? 'text-kronos-dim/30' : 'text-kronos-dim'}`}><Gem size={10} />{item.owned ? 'Unmastered' : 'Unowned'}</span>
                        )}

                        {/* Subsumed (warframes) */}
                        {item.subsumed && (
                          <span className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1">
                            <span className="text-xs">⚗</span>Subsumed
                          </span>
                        )}

                        {/* Stock count (mods, resources, arcanes, prime parts, veiled rivens) */}
                        {(isModOrResource || isPrimePart || item.veiled) && item.quantity !== undefined && (
                          <span className={`text-[10px] font-black uppercase ${item.quantity > 0 ? 'text-kronos-accent' : 'text-kronos-dim/30'}`}>
                            {item.quantity > 0 ? `×${item.quantity}` : 'Unowned'}
                          </span>
                        )}

                        {/* Incarnon badge */}
                        {item.is_incarnon && (
                          <span className="text-[10px] font-black uppercase text-orange-400 flex items-center gap-1">
                            <Zap size={10} className="fill-current" />Incarnon
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>)
        )}
        {visibleCount < filteredItems.length && <div className="flex justify-center py-8"><Button onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}>Load More Items</Button></div>}
      </div>
      <FoundryPanel isOpen={showFoundry} onClose={() => setShowFoundry(false)} inventoryData={inventoryData} foundryFilters={foundryFilters} setFoundryFilters={setFoundryFilters} />
    </PageLayout>
  )
}

function renderHeaderStats(inventoryData) {
  if (!inventoryData?.account) return null
  const { credits, platinum, forma, aura_forma, stance_forma, umbra_forma, orokin_reactor, orokin_catalyst } = inventoryData.account
  return (
    <div className="flex items-center gap-6 ml-auto pr-3">
      <div className="flex flex-col items-end min-w-[80px]"><span className="text-[10px] text-kronos-dim uppercase font-black tracking-widest leading-none mb-1">Credits</span><span className="text-sm font-bold text-kronos-text leading-none">{credits.toLocaleString()}</span></div>
      <div className="flex flex-col items-end min-w-[80px]"><span className="text-[10px] text-kronos-accent uppercase font-black tracking-widest leading-none mb-1">Platinum</span><span className="text-sm font-bold text-kronos-text leading-none">{platinum.toLocaleString()}</span></div>
      <div className="h-8 w-px bg-white/10" />
      <div className="flex flex-col items-end group relative cursor-help min-w-[60px]">
        <span className="text-[10px] text-kronos-accent uppercase font-black tracking-widest leading-none mb-1">Forma</span><span className="text-sm font-bold text-kronos-text leading-none">{forma + aura_forma + stance_forma + umbra_forma}</span>
        <div className="absolute top-full right-0 mt-2 p-3 bg-kronos-bg border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110] min-w-[140px] glass-panel">
          <div className="space-y-2">
            <div className="flex justify-between gap-4"><span className="text-[10px] text-kronos-dim uppercase font-bold">Standard</span><span className="text-xs font-bold text-kronos-text">{forma}</span></div>
            {aura_forma > 0 && <div className="flex justify-between gap-4"><span className="text-[10px] text-blue-300 uppercase font-bold">Aura</span><span className="text-xs font-bold text-kronos-text">{aura_forma}</span></div>}
            {stance_forma > 0 && <div className="flex justify-between gap-4"><span className="text-[10px] text-green-300 uppercase font-bold">Stance</span><span className="text-xs font-bold text-kronos-text">{stance_forma}</span></div>}
            {umbra_forma > 0 && <div className="flex justify-between gap-4"><span className="text-[10px] text-purple-400 uppercase font-bold">Umbra</span><span className="text-xs font-bold text-kronos-text">{umbra_forma}</span></div>}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end min-w-[70px]"><span className="text-[10px] text-yellow-500 uppercase font-black tracking-widest leading-none mb-1">Reactors</span><span className="text-sm font-bold text-kronos-text leading-none">{orokin_reactor}</span></div>
      <div className="flex flex-col items-end min-w-[70px]"><span className="text-[10px] text-blue-400 uppercase font-black tracking-widest leading-none mb-1">Catalysts</span><span className="text-sm font-bold text-kronos-text leading-none">{orokin_catalyst}</span></div>
    </div>
  )
}