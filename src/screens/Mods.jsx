import { useState, useMemo, useEffect } from 'react'
import { Search, ArrowUpDown, Filter, Layers } from 'lucide-react'
import { PageLayout, Input, Button, Tabs, MonitorState } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import ModCard from '../components/ModCard'

const CARD_WIDTH = 200
const COL_GAP = 50

const SORT_OPTIONS = [
  { id: 'name', label: 'Name' },
  { id: 'rank', label: 'Rank' },
  { id: 'quantity', label: 'Count' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'value', label: 'Value (Maxed)' },
]

const CATEGORIES = [
  'All', 'Warframe', 'Primary', 'Secondary', 'Melee',
  'Sentinels', 'Beasts', 'Stance', 'Aura', 'Exilus',
  'Railjack', 'Archgun', 'Archmelee', 'Parazon',
  'Augment', 'Antique', 'Vehicles', 'Arcanes',
]

const TYPE_TO_CATEGORY = {
  Rifle: 'Primary', Shotgun: 'Primary', Primary: 'Primary', Bows: 'Primary',
  Pistol: 'Secondary', Secondary: 'Secondary',
  Melee: 'Melee', Sword: 'Melee', Glaive: 'Melee', Heavy: 'Melee', NoFire: 'Melee',
  Warframe: 'Warframe', Avatar: 'Warframe', Necramech: 'Vehicles', Necromech: 'Vehicles',
  Sentinel: 'Sentinels', Sentinels: 'Sentinels',
  Beast: 'Beasts', Beasts: 'Beasts',
  Stance: 'Stance',
  Aura: 'Aura',
  Exilus: 'Exilus',
  Railjack: 'Railjack', Avionic: 'Railjack',
  Archwing: 'Archgun', Archgun: 'Archgun',
  Archmelee: 'Archmelee',
  Parazon: 'Parazon', Hack: 'Parazon', DataSpike: 'Parazon', Nemesis: 'Parazon',
  Augment: 'Augment',
  Antique: 'Antique', Antiques: 'Antique', Immortal: 'Antique',
  KDrive: 'Vehicles', Vehicles: 'Vehicles', Hoverboard: 'Vehicles',
}

function extractModCategory(un) {
  if (!un) return null
  const m2 = un.match(/\/Mods\/(?:Sets|PvPMods)\/([^/]+)/)
  if (m2 && TYPE_TO_CATEGORY[m2[1]]) return TYPE_TO_CATEGORY[m2[1]]
  const m = un.match(/\/Mods\/([^/]+)/)
  if (!m) return null
  return TYPE_TO_CATEGORY[m[1]] || null
}

export default function Mods() {
  const { inventoryData, isInventoryLoading, ExportTextIcons, cardImagesPath, fixProgress, allPrices, isPriceLoading, priceFetchProgress } = useMonitoring()
  const [framesPath, setFramesPath] = useState('')
  const [iconsPath, setIconsPath] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [sortCriteria, setSortCriteria] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [maxRankOnly, setMaxRankOnly] = useState(false)
  const [hideConclave, setHideConclave] = useState(false)
  const [visibleCount, setVisibleCount] = useState(60)
  const mods = [...(inventoryData?.mods ?? []), ...(inventoryData?.arcanes ?? [])]
  const modPrices = allPrices
  const loadingPrices = isPriceLoading

  useEffect(() => {
    invoke('get_mod_frames_path').then(p => setFramesPath(p)).catch(() => { })
  }, [])

  useEffect(() => {
    invoke('get_icons_path').then(p => setIconsPath(p)).catch(() => { })
  }, [])

  useEffect(() => {
    setVisibleCount(60)
  }, [searchQuery, selectedCategory, maxRankOnly, hideConclave])

  const filtered = useMemo(() => {
    let items = mods

    if (searchQuery) {
      const q = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0)
      items = items.filter(m => {
        const descText = (m.description ?? '') + ' ' + (m.levelStats?.flatMap(ls => ls.stats).join(' ') ?? '') + ' ' + (m.arcaneType ?? '')
        return q.every(w => (m.name ?? '').toLowerCase().includes(w) || descText.toLowerCase().includes(w))
      })
    }
    if (selectedCategory !== 'All') {
      items = items.filter(m => m.category === selectedCategory)
    }
    if (maxRankOnly) {
      items = items.filter(m => m.rank >= m.max_rank)
    }
    if (hideConclave) {
      items = items.filter(m => !m.unique_name?.includes('/PvPMods/'))
    }

    const sorted = [...items].sort((a, b) => {
      let av, bv
      if (sortCriteria === 'rarity') {
        const order = ['common', 'uncommon', 'rare', 'legendary']
        av = order.indexOf((a.rarity ?? '').toLowerCase())
        bv = order.indexOf((b.rarity ?? '').toLowerCase())
      } else if (sortCriteria === 'value') {
        av = modPrices?.[a.unique_name] ?? 0
        bv = modPrices?.[b.unique_name] ?? 0
      } else {
        av = (a[sortCriteria] ?? '')
        bv = (b[sortCriteria] ?? '')
        if (typeof av === 'string') av = av.toLowerCase()
        if (typeof bv === 'string') bv = bv.toLowerCase()
      }
      return sortDirection === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0)
    })
    return sorted
  }, [mods, searchQuery, selectedCategory, maxRankOnly, sortCriteria, sortDirection])

  const visible = filtered.slice(0, visibleCount)
  const uniqueMods = new Set(filtered.map(m => m.name)).size
  const dupCount = filtered.filter(m => m.quantity > 1).length

  const handleSortChange = (id) => {
    if (id === sortCriteria) {
      setSortDirection(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortCriteria(id)
      setSortDirection('asc')
    }
  }

  const renderHeaderPanel = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input placeholder="Search mods..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 bg-black/20 border-white/5 h-[42px]" />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
          <ArrowUpDown size={12} className="text-kronos-accent mx-1" />
          <div className="flex gap-1">
            {SORT_OPTIONS.map(c => {
              const isActive = sortCriteria === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSortChange(c.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${isActive ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
                >
                  {c.label}
                  {isActive && <ArrowUpDown size={10} className={sortDirection === 'desc' ? 'rotate-180' : ''} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters (Max Rank + Hide Conclave) */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
          <Filter size={14} className="text-kronos-dim mx-1" />
          <div className="flex gap-1">
            <button
              onClick={() => setMaxRankOnly(v => !v)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${maxRankOnly ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
            >
              Max Rank
            </button>
            <button
              onClick={() => setHideConclave(v => !v)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${hideConclave ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
            >
              Hide Conclave
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
          {CATEGORIES.map(t => {
            const iconUrl = iconsPath
              ? convertFileSrc(`${iconsPath}/Categories/${t}.png`)
              : null
            return (
              <button
                key={t}
                onClick={() => setSelectedCategory(t)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap font-sans flex items-center gap-1.5 ${selectedCategory === t
                  ? 'bg-kronos-accent text-kronos-bg font-black shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.4)] scale-[1.02]'
                  : 'text-kronos-dim hover:text-white hover:bg-white/5'
                  }`}
              >
                {iconUrl && <img src={iconUrl} className="w-4 h-4 object-contain" alt="" />}
                {t}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <PageLayout
      title="Mods"
      subtitle={`${filtered.length} total · ${uniqueMods} unique · ${dupCount} duplicate`}
      headerPanel={renderHeaderPanel()}
    >
      {inventoryData && (fixProgress.checking || (fixProgress.phase && fixProgress.phase !== 'done')) ? (
        fixProgress.phase ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Layers className="w-12 h-12 text-kronos-accent animate-pulse" />
            <div className="w-full max-w-md">
              <div className="flex justify-between text-xs text-kronos-dim mb-1">
                <span>
                  {fixProgress.phase === 'extracting' ? 'Extracting mod images…' :
                    fixProgress.phase === 'fixing' ? 'Processing mod images…' :
                      fixProgress.phase === 'compositing' ? 'Compositing mod images…' :
                        'Preparing mod images…'}
                </span>
                <span>{fixProgress.current} / {fixProgress.total}</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-kronos-accent rounded-full transition-all duration-300"
                  style={{ width: `${(fixProgress.current / fixProgress.total) * 100}%` }}
                />
              </div>
              {fixProgress.current_file && (
                <p className="text-[10px] text-kronos-dim/50 mt-1 truncate max-w-md">{fixProgress.current_file}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
          </div>
        )
      ) : isInventoryLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
        </div>
      ) : !inventoryData ? (
        <MonitorState className="py-20" />
      ) : !framesPath ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-kronos-dim italic">No mods match your filters.</div>
      ) : (
        <>
          {priceFetchProgress && (
            <div className="flex items-center gap-2 pb-2 px-1">
              <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[10px] font-black uppercase text-kronos-accent">Fetching plat values {priceFetchProgress.current} of {priceFetchProgress.total}...</span>
            </div>
          )}
          {loadingPrices && !priceFetchProgress && (
            <div className="flex items-center gap-2 pb-2 px-1">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] font-black uppercase text-kronos-accent">Fetching prices...</span>
            </div>
          )}
          <div
            className="grid pb-4"
            style={{
              gridTemplateColumns: `repeat(auto-fill, ${CARD_WIDTH}px)`,
              gap: `${COL_GAP}px`,
              justifyContent: 'center',
            }}
          >
            {visible.map((mod, i) => (
              <ModCard
                key={`${mod.unique_name}_${mod.rank}_${i}`}
                mod={mod}
                framesPath={framesPath}
                iconsPath={iconsPath}
                cardImagesPath={cardImagesPath}
                width={CARD_WIDTH}
                exportTextIcons={ExportTextIcons}
                platValue={modPrices?.[mod.unique_name] ?? 0}
                pricesLoading={loadingPrices}
              />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <div className="flex justify-center py-8">
              <Button onClick={() => setVisibleCount(prev => prev + 60)} className="text-[10px] font-black uppercase tracking-widest">
                Load More ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </PageLayout>
  )
}