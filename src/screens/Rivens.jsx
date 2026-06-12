/**
 * Rivens.jsx
 *
 * Displays the user's Riven Mods with live stat calculation.
 *
 * DATA FLOW
 * ─────────────────────────────────────────
 * 1. MonitoringContext provides the parsed riven list (from inventoryParser.js).
 * 2. This file filters the list based on Mod Type (Rifle, Pistol, etc.) and
 *    Unveiled state.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Stat scaling: Riven stats are displayed as they would appear at Max Rank.
 * - Stat names are resolved from internal game codes to human-readable strings.
 */
import { useState, useRef, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { PageLayout, Input, Card, Tabs, MonitorState } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import BackToTop from '../components/BackToTop'
import RivenCard from '../components/RivenCard'

const TYPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'rifle', label: 'Rifle' },
  { id: 'pistol', label: 'Pistol' },
  { id: 'melee', label: 'Melee' },
  { id: 'shotgun', label: 'Shotgun' },
  { id: 'sniper', label: 'Sniper' },
  { id: 'kitgun', label: 'Kitgun' },
  { id: 'zaw', label: 'Zaw' },
  { id: 'archgun', label: 'Archgun' },
]

const STATE_TABS = [
  { id: 'all', label: 'All States' },
  { id: 'unveiled', label: 'Unveiled' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'veiled', label: 'Veiled' },
]

export default function Rivens() {
  const { inventoryData, isInventoryLoading } = useMonitoring()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeState, setActiveState] = useState('all')
  const [iconsPath, setIconsPath] = useState('')
  const [framesPath, setFramesPath] = useState('')

  useEffect(() => {
    invoke('get_icons_path').then(p => setIconsPath(p)).catch(() => { })
    invoke('get_mod_frames_path').then(p => setFramesPath(p)).catch(() => { })
  }, [])

  const allRivens = inventoryData?.rivens ?? []

  const filtered = allRivens.filter(r => {
    const matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchType = activeType === 'all' || (r.weapon_type && r.weapon_type.toLowerCase() === activeType.toLowerCase())

    let matchState = true
    if (activeState === 'unveiled') matchState = !r.veiled && !r.challenge
    if (activeState === 'challenge') matchState = !!r.challenge
    if (activeState === 'veiled') matchState = !!r.veiled

    return matchSearch && matchType && matchState
  })

  const unveiledCount = allRivens.filter(r => !r.veiled && !r.challenge).length
  const challengeCount = allRivens.filter(r => r.challenge).length
  const veiledCount = allRivens.filter(r => r.veiled).length
  const capacity = inventoryData?.account?.riven_capacity ?? 0

  const renderHeaderPanel = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input 
            placeholder="Search rivens…" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-12 bg-black/20 border-white/5 h-[42px]" 
          />
        </div>

        {/* State Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
          <Filter size={14} className="text-kronos-dim mx-1" />
          <div className="flex gap-1">
            {STATE_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveState(t.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeState === t.id ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-3">
        <Tabs tabs={TYPE_TABS.map(t => {
          const iconMap = { rifle: 'Primary', pistol: 'Secondary' }
          const iconName = iconMap[t.id] || t.label
          return { ...t, icon: iconsPath ? convertFileSrc(`${iconsPath}/Categories/${iconName}.png`) : null }
        })} activeTab={activeType} onChange={setActiveType} className="flex-1" />
      </div>
    </div>
  )

  return (
    <PageLayout
      title="Riven Mods"
      subtitle={`${unveiledCount} unveiled · ${challengeCount} challenge · ${veiledCount} veiled · ${unveiledCount + challengeCount}/${capacity} capacity`}
      headerPanel={renderHeaderPanel()}
    >
      <div className="space-y-4 pt-2">
        {isInventoryLoading ? (
          <MonitorState isLoading className="py-20" />
        ) : !inventoryData ? (
          <MonitorState className="py-20" />
        ) : !framesPath ? (
          <MonitorState isLoading className="py-20" />
        ) : filtered.length === 0 ? (
          <Card glow>
            <div className="text-center py-12">
              <p className="text-kronos-dim">No rivens match your filters</p>
            </div>
          </Card>
        ) : (
          <div className="grid pb-4" style={{
            gridTemplateColumns: 'repeat(auto-fill, 200px)',
            gap: '50px',
            justifyContent: 'center',
          }}>
            {filtered.map((riven, idx) => (
              <RivenCard key={idx} riven={riven} framesPath={framesPath} iconsPath={iconsPath} width={200} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
