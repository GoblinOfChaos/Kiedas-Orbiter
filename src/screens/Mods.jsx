import { useState, useMemo, useEffect } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'
import { PageLayout, Input, Button, Tabs } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri'
import ModCard from '../components/ModCard'

const CARD_WIDTH = 200
const COL_GAP = 50

const SORT_OPTIONS = [
  { id: 'name', label: 'Name' },
  { id: 'rank', label: 'Rank' },
  { id: 'quantity', label: 'Count' },
  { id: 'rarity', label: 'Rarity' },
]

const SORT_ARROW = { asc: ' ▲', desc: ' ▼' }

const CATEGORIES = [
  'All', 'Warframe', 'Primary', 'Secondary', 'Melee',
  'Sentinels', 'Beasts', 'Stance', 'Aura', 'Exilus',
  'Railjack', 'Archgun', 'Archmelee', 'Parazon',
  'Augment', 'Antique', 'Vehicles',
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
  const { inventoryData, isInventoryLoading, ExportTextIcons } = useMonitoring()
  const [framesPath, setFramesPath] = useState('')
  const [iconsPath, setIconsPath] = useState('')
  const [cardImagesPath, setCardImagesPath] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortCriteria, setSortCriteria] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [maxRankOnly, setMaxRankOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(60)

  useEffect(() => { invoke('get_mod_frames_path').then(p => setFramesPath(p)).catch(() => { }) }, [])
  useEffect(() => { invoke('get_icons_path').then(p => setIconsPath(p)).catch(() => { }) }, [])
  useEffect(() => { invoke('get_card_images_path').then(p => setCardImagesPath(p)).catch(() => { }) }, [])
  useEffect(() => { setVisibleCount(60) }, [searchQuery, selectedCategory, maxRankOnly])



  const mods = inventoryData?.mods ?? []

  const typeOptions = useMemo(() => CATEGORIES, [])

  const filtered = useMemo(() => {
    let items = mods

    if (searchQuery) {
      const q = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0)
      items = items.filter(m => q.every(w => (m.name ?? '').toLowerCase().includes(w)))
    }
    if (selectedCategory !== 'All') {
      items = items.filter(m => m.category === selectedCategory)
    }
    if (maxRankOnly) {
      items = items.filter(m => m.rank >= m.max_rank)
    }

    const sorted = [...items].sort((a, b) => {
      let av, bv
      if (sortCriteria === 'rarity') {
        const order = ['common', 'uncommon', 'rare', 'legendary']
        av = order.indexOf((a.rarity ?? '').toLowerCase())
        bv = order.indexOf((b.rarity ?? '').toLowerCase())
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

        <Tabs tabs={SORT_OPTIONS.map(o => ({ ...o, label: o.label + (sortCriteria === o.id ? SORT_ARROW[sortDirection] : '') }))} activeTab={sortCriteria} onChange={handleSortChange} className="h-[42px]" />

        <Tabs tabs={[{ id: 'max', label: 'Max Rank' }]} activeTab={maxRankOnly ? 'max' : ''} onChange={() => setMaxRankOnly(v => !v)} className="h-[42px]" />
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1 flex-shrink-0">Category:</span>
        <div className="flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
          {typeOptions.map(t => {
            const iconUrl = t === 'All'
              ? (iconsPath ? convertFileSrc(`${iconsPath}/Categories/All.png`) : null)
              : (iconsPath ? convertFileSrc(`${iconsPath}/Categories/${t}.png`) : null)
            return (
              <button
                key={t}
                onClick={() => setSelectedCategory(t)}
                className={`px-4 py-1.5 rounded-lg text-[11px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap font-sans flex items-center gap-1.5 ${selectedCategory === t
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
      {/* Mod grid */}
      {isInventoryLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
        </div>
      ) : inventoryData === null ? (
        <div className="text-center py-20 text-kronos-dim">No inventory data available.</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-kronos-dim italic">No mods match your filters.</div>
      ) : (
        <>
          <div
            className="grid pb-4"
            style={{
              gridTemplateColumns: `repeat(auto-fill, ${CARD_WIDTH}px)`,
              gap: `${COL_GAP}px`,
              justifyContent: 'center',
            }}
          >
            {visible.map((mod, i) => (
              <ModCard key={mod.unique_name + i} mod={mod} framesPath={framesPath} iconsPath={iconsPath} cardImagesPath={cardImagesPath} width={CARD_WIDTH} exportTextIcons={ExportTextIcons} />
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

