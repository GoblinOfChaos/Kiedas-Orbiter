import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { useUi } from '../contexts/UiContext'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { PageLayout } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'

const CATEGORIES = [
  // Series
  { type: 'series', key: '/Lotus/Objects/Orokin/Props/CollectibleSeriesOne', label: 'Kuria', icon: 'IconOrokitty.png', color: '#d4a843' },
  { type: 'series', key: '/Lotus/Types/Lore/Fragments/DuviriFragments/DuviriCollectibleDeco', label: 'Lost Islands of Duviri', icon: 'DuviriFragment.png', color: '#7ec8e3' },
  { type: 'series', key: '/Lotus/Types/Lore/Fragments/DuviriMITWFragments/DuviriMITWCollectibleDeco', label: 'Isleweaver Fragments', icon: 'IsleweaverFragment.png', color: '#c084fc' },

  // Open World
  { type: 'marker', key: 'EidolonPlainsDiscoverable', label: 'Plains of Eidolon Caves', icon: 'IconPlainsOfEidolon.png', color: '#4ade80' },
  { type: 'marker', key: 'OrbVallisCaveDiscoverable', label: 'Orb Vallis Caves', icon: 'VallisLandscape.png', color: '#60a5fa' },
  { type: 'marker', key: 'FortunaMarker', label: 'Fortuna', icon: 'FortunaTown.png', color: '#fbbf24' },
  { type: 'marker', key: 'NecraliskMarker', label: 'Necralisk', icon: 'IconNecralisk.png', color: '#c084fc' },

  // Lore Fragments - totals are computed live from ExportCodex.json (DE's own
  // authoritative catalog), not hardcoded. See qa-findings.md 2026-08-19: three
  // different hand-entered/wiki-derived totals for this section (Somachord,
  // Frame Fighter, Leverian) all turned out wrong compared to the real catalog.
  { type: 'fragment', label: 'Somachord Tunes', codexSection: 'songs', icon: 'IconSomachord.png', color: '#f472b6', match: (type) => type.includes('/MusicFragments/') },
  { type: 'fragment', label: 'Frame Fighter Fragments', codexSection: 'fighterFrames', icon: 'IconFrameFighter.png', color: '#fb923c', match: (type) => type.includes('/FrameFighterFragments/') },
  { type: 'fragment', label: 'Cephalon Fragments', icon: 'IconCephalonFragment.png', color: '#60a5fa', match: (type) => type.startsWith('/Lotus/Types/Lore/Fragments/') && !type.includes('/Eidolon') && !type.includes('/Music') && !type.includes('/FrameFighter') && !type.includes('/LoreCard') && !type.includes('/Solaris') && !type.includes('/GrineerGhoul') && !type.includes('/Albrect') && !type.includes('/Revenant') && !type.includes('/CorpusRelief') && !type.includes('/GasCity') && !type.includes('/GlassFragments') },
  { type: 'fragment', label: 'Leverian Prex Cards', icon: 'IconTarotCards.png', color: '#a78bfa', match: (type) => type.includes('/LoreCardFragments/') },
  { type: 'fragment', label: 'Thousand-Year Fish', icon: 'GlassFish.png', color: '#34d399', match: (type) => type.includes('/EidolonFragments/') },
  { type: 'fragment', label: 'Encrypted Journal Fragments', icon: 'GhoulDataFragment.png', color: '#a3e635', match: (type) => type.includes('/GrineerGhoulFragments/') },
  { type: 'fragment', label: 'Glass Shard Fragments', icon: 'GlassFragment.png', color: '#6ee7b7', match: (type) => type.includes('/GlassFragments/') },
  { type: 'fragment', label: 'Fortuna Fragments', icon: 'DebtTokenD.png', color: '#facc15', match: (type) => type.includes('/SolarisFragments/') },
  { type: 'fragment', label: "Albrecht's Notes", icon: 'Grimoire.png', color: '#818cf8', match: (type) => type.includes('/AlbrectFragments/') },
  { type: 'fragment', label: 'Nakak Memory Fragments', icon: 'RevenantQuestKeyChain.png', color: '#c084fc', match: (type) => type.includes('/RevenantFragments/') },
  { type: 'fragment', label: 'The Tenets', icon: 'IconCorpusRelief.png', color: '#67e8f9', match: (type) => type.includes('/CorpusReliefFragments/') },
  { type: 'fragment', label: 'Partnership Fragments', icon: 'IconGasCityLoreFragment.png', color: '#22d3ee', match: (type) => type.includes('/GasCityFragments/') },
]

function countBits(n) {
  let c = 0
  while (n) { c += n & 1; n >>>= 1 }
  return c
}

function getSeriesTrackingBits(cs) {
  if (!cs || !cs.Tracking || typeof cs.Tracking !== 'string') return null
  const total = cs.ReqScans || 0
  const t = cs.Tracking
  if (t.length < total) return null
  if (total === 90) return t

  const expectedCount = cs.Count ?? t.split('').filter(c => c === '1').length
  for (let start = 0; start <= t.length - total; start++) {
    const window = t.slice(start, start + total)
    const count = window.split('').filter(c => c === '1').length
    if (count === expectedCount) {
      return window
    }
  }
  return t.slice(t.length - total)
}

function Subpanel({ cat, items, onClose }) {
  const panelRef = useRef(null)
  const handleOpenLink = async (url) => {
    try { await invoke('open_url', { url }) } catch { /* ignore */ }
  }

  useEffect(() => {
    if (cat) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [cat])

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${cat ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        className={`relative w-full max-w-lg bg-[var(--color-panel)] border-l border-white/10 h-full overflow-y-auto custom-scrollbar transition-transform duration-300 ${cat ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {cat && (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-4 px-5 py-4 bg-[var(--color-panel)] border-b border-white/10">
              {cat.icon && <img src={cat.icon} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white truncate">{cat.label}</p>
                <p className="text-sm" style={{ color: cat.color }}>{cat.count} / {cat.total}</p>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {cat.guide && (
              <div className="px-5 py-3 bg-white/[0.03] border-b border-white/10">
                <p className="text-xs text-kronos-dim leading-relaxed">{cat.guide}</p>
                <div className="flex gap-3">
                  {cat.guideSource && (
                    <button onClick={() => handleOpenLink(cat.guideSource)} className="mt-1.5 text-xs font-bold text-kronos-accent hover:underline cursor-pointer">
                      Open full wiki guide ↗
                    </button>
                  )}
                  {cat.videoGuide && (
                    <button onClick={() => handleOpenLink(cat.videoGuide)} className="mt-1.5 text-xs font-bold text-kronos-accent hover:underline cursor-pointer">
                      Video guide ↗
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="divide-y divide-white/5">
              {items.map((item, i) => (
                <div key={item.key ?? i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.found === true ? 'bg-emerald-400' : item.found === null ? 'bg-amber-300/60' : 'bg-white/10'}`} title={item.found === null ? 'Individual scan status unavailable' : undefined} />
                  {item.icon && <img src={item.icon} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm text-white/80 truncate">{item.name}</span>
                    {item.location && <span className="block text-xs text-kronos-dim truncate">{item.location}</span>}
                  </div>
                  {item.found && (
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ProgressCard({ icon, label, subtitle, count, total, color, onClick }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div
      className={`glass-panel rounded-[18px] overflow-hidden flex h-32 ${onClick ? 'cursor-pointer hover:brightness-110' : ''}`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-32 h-full overflow-hidden">
        {icon ? (
          <img src={icon} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
            <span style={{ color, fontWeight: 'bold', fontSize: '28px' }}>{label?.[0] || '?'}</span>
          </div>
        )}
      </div>
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, var(--color-panel) 40px)` }} />
        <div className="relative z-10 h-full flex flex-col justify-center px-3 py-2 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{label}</p>
          {subtitle && <p className="text-[10px] text-kronos-dim leading-tight">{subtitle}</p>}
          {total > 0 ? (
            <>
              <p className="text-xs font-bold mt-1" style={{ color }}>{count} / {total}</p>
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 4px ${color}66` }} />
              </div>
            </>
          ) : count > 0 && (
            <p className="text-xs font-bold mt-1" style={{ color }}>{count} found (total unverified)</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Collectibles() {
  const { t } = useUi()
  const { inventoryData, dict, exportData } = useMonitoring()
  const [uiPath, setUiPath] = useState('')
  const [selectedCat, setSelectedCat] = useState(null)
  const [subpanelItems, setSubpanelItems] = useState([])
  const [collectibleLocations, setCollectibleLocations] = useState({})
  useEffect(() => {
    invoke('get_ui_path').then(setUiPath).catch(() => { })
    invoke('read_file_bytes', { relative: 'data/assets/data/collectible-locations.json' })
      .then((bytes) => setCollectibleLocations(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
      .catch(() => setCollectibleLocations({}))
  }, [])

  const collectibleSeries = inventoryData?.collectibleSeries ?? []
  const discoveredMarkers = inventoryData?.discoveredMarkers ?? []
  const loreFragmentScans = inventoryData?.loreFragmentScans ?? []

  const fragName = useCallback((type, codexEntry) => {
    const leaf = type.split('/').pop()
    return (codexEntry?.name && dict[codexEntry.name])
      || dict['/Lotus/Language/Fragments/' + leaf + 'Name']
      || dict['/Lotus/Language/Fragments/' + leaf]
      || leaf.replace(/(Fragment|Name)$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  }, [dict])

  const openSubpanel = useCallback((cardCat, buildItems) => {
    setSelectedCat(cardCat)
    setSubpanelItems(buildItems())
  }, [])

  const closeSubpanel = useCallback(() => {
    setSelectedCat(null)
    setSubpanelItems([])
  }, [])

  const seriesCards = useMemo(() => CATEGORIES.filter(c => c.type === 'series').map((cat) => {
    const cs = collectibleSeries.find(s => s.CollectibleType === cat.key)
    const trackingBits = getSeriesTrackingBits(cs)
    const card = {
      key: cat.key,
      icon: cat.icon && uiPath ? convertFileSrc(`${uiPath}/${cat.icon}`) : null,
      label: cat.label,
      color: cat.color,
      count: cs?.Count ?? 0,
      total: cs?.ReqScans ?? 0,
      guide: collectibleLocations.seriesMeta?.[cat.key]?.note || collectibleLocations.fragmentGuides?.[cat.label]?.note,
      guideSource: collectibleLocations.seriesMeta?.[cat.key]?.source || collectibleLocations.fragmentGuides?.[cat.label]?.source,
    }
    return {
      ...card,
      onClick: () => openSubpanel(card, () => {
        const groupSize = collectibleLocations.seriesMeta?.[cat.key]?.groupSize ?? 4
        return Array.from({ length: card.total }, (_, i) => {
          const itemKey = `${Math.floor(i / groupSize) + 1}-${(i % groupSize) + 1}`
          const data = collectibleLocations.series?.[cat.key]?.[itemKey]
          const isFound = trackingBits ? trackingBits[i] === '1' : null
          return {
            key: itemKey,
            name: `${data?.name || cat.label} (${itemKey})`,
            location: data?.location,
            found: isFound,
          }
        }).sort((a, b) => (a.found === b.found ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.found ? 1 : -1))
      }),
    }
  }), [collectibleSeries, collectibleLocations, uiPath, openSubpanel])

  const markerCards = useMemo(() => CATEGORIES.filter(c => c.type === 'marker').map((cat) => {
    const m = discoveredMarkers.find(m => m.tag === cat.key)
    const markerMeta = collectibleLocations.markers?.[cat.key]
    const definedTotal = markerMeta?.total ?? (m ? (m.discoveryState || []).length * 32 : 0)
    
    let foundCount = 0
    if (m?.discoveryState) {
      m.discoveryState.forEach((bits, areaIdx) => {
        for (let bit = 0; bit < 32; bit++) {
          const globalIdx = areaIdx * 32 + bit
          if (globalIdx < definedTotal && (bits & (1 << bit))) {
            foundCount++
          }
        }
      })
    }

    const card = {
      key: cat.key,
      icon: cat.icon && uiPath ? convertFileSrc(`${uiPath}/${cat.icon}`) : null,
      label: cat.label,
      subtitle: cat.key.includes('Cave') ? 'caves explored' : 'areas discovered',
      color: cat.color,
      count: foundCount,
      total: definedTotal,
      guide: markerMeta?.note,
      guideSource: markerMeta?.source,
    }
    return {
      ...card,
      onClick: () => openSubpanel(card, () => {
        if (!m || !m.discoveryState) return [{ key: 'placeholder', name: `Not yet loaded from inventory`, found: false }]
        const items = (markerMeta?.items || []).map((info, idx) => {
          const areaIdx = Math.floor(idx / 32)
          const bit = idx % 32
          const bits = m.discoveryState[areaIdx] ?? 0
          const isFound = (bits & (1 << bit)) !== 0
          return {
            key: `${cat.key}_${idx}`,
            name: info.name || `Cave ${idx + 1}`,
            location: info.location,
            found: isFound,
          }
        })
        return items.length
          ? items.sort((a, b) => (a.found === b.found ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.found ? 1 : -1))
          : [{ key: 'placeholder', name: `None discovered`, found: false }]
      }),
    }
  }), [discoveredMarkers, collectibleLocations, uiPath, openSubpanel])

  // Real, authoritative per-category item catalog from DE's own ExportCodex.json
  // (loreFragments/songs/fighterFrames sections) - not a hand-maintained count.
  // This is what actually exists in the game, whether the player has found it yet
  // or not, so the subpanel can list every item (not just what's been scanned).
  const codexCatalog = useMemo(() => {
    const codex = exportData?.ExportCodex
    if (!codex) return {}
    const out = {}
    for (const cat of CATEGORIES) {
      if (cat.type !== 'fragment') continue
      const section = codex[cat.codexSection ?? 'loreFragments'] ?? {}
      out[cat.label] = Object.entries(section)
        .filter(([itemType]) => cat.match(itemType))
        .map(([itemType, entry]) => ({ itemType, leaf: itemType.split('/').pop(), entry }))
    }
    return out
  }, [exportData])

  const foundSet = useMemo(() => {
    const s = new Set()
    for (const f of loreFragmentScans) {
      if (f.Progress > 0) s.add(f.ItemType)
    }
    return s
  }, [loreFragmentScans])

  const fragmentCards = useMemo(() => {
    return CATEGORIES.filter(c => c.type === 'fragment').map((cat) => {
      const catalog = codexCatalog[cat.label] ?? []
      const foundCount = catalog.filter((it) => foundSet.has(it.itemType)).length
      const card = {
        key: cat.label,
        icon: cat.icon && uiPath ? convertFileSrc(`${uiPath}/${cat.icon}`) : null,
        label: cat.label,
        color: cat.color,
        count: foundCount,
        total: catalog.length,
        guide: collectibleLocations.fragmentGuides?.[cat.label]?.note,
        guideSource: collectibleLocations.fragmentGuides?.[cat.label]?.source,
        videoGuide: collectibleLocations.fragmentGuides?.[cat.label]?.video_guide,
      }
      return {
        ...card,
        onClick: () => openSubpanel(card, () => {
          if (!catalog.length) return [{ key: 'placeholder', name: `Catalog not loaded yet`, found: false }]
          return catalog
            .map((it) => {
              const locData = collectibleLocations.fragmentItems?.[cat.label]?.[it.leaf]
              return {
                key: it.itemType,
                name: fragName(it.itemType, it.entry),
                location: locData?.location,
                found: foundSet.has(it.itemType),
              }
            })
            .sort((a, b) => (a.found === b.found ? a.name.localeCompare(b.name) : a.found ? 1 : -1))
        }),
      }
    })
  }, [codexCatalog, foundSet, uiPath, openSubpanel, collectibleLocations, fragName])

  return (
    <PageLayout titleKey="screen.collectibles">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-4">
        {seriesCards.map(({ key, ...card }) => <ProgressCard key={key} {...card} />)}
        {markerCards.map(({ key, ...card }) => <ProgressCard key={key} {...card} />)}
        {fragmentCards.map(({ key, ...card }) => <ProgressCard key={key} {...card} />)}
      </div>
      <Subpanel cat={selectedCat} items={subpanelItems} onClose={closeSubpanel} />
    </PageLayout>
  )
}
