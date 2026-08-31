import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { PageLayout, Card, Input } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { resolveAnyImage } from '../lib/warframeUtils'
import { getAcquisitionInfo } from '../lib/acquisitionInfo'
import AcquisitionDrawer, { useAcquisitionDrawer } from '../components/AcquisitionDrawer'
import ItemImage from '../components/ItemImage'

const normalize = (uniqueName) => typeof uniqueName === 'string' ? uniqueName.replaceAll('/StoreItems/', '/').toLowerCase() : uniqueName
const isSigil = (uniqueName) => /\/Upgrades\/Skins\/Sigils\//i.test(uniqueName || '')
const COSMETICS_PAGE_SIZE = 120

function cosmeticType(uniqueName, icon, kind) {
  if (kind !== 'Skin') return kind
  const value = `${uniqueName || ''} ${icon || ''}`.toLowerCase()
  // Real weapon-skin paths are /Upgrades/Skins/Weapons/<Class>/... - DE never
  // uses the literal substrings "primaryweapons"/"secondaryweapons"/
  // "meleeweapons" anywhere in the export, so those checks never matched a
  // single real item (verified against ExportCustoms.json: 58 weapon skins,
  // zero containing those strings). Pistols/dual-pistols are Secondary,
  // rifles are Primary; every other weapon-skin class (swords, daggers,
  // glaives, staves, claws, etc.) is Melee.
  if (/\/upgrades\/skins\/weapons\/(pistols|dspistols)\//.test(value)) return 'Secondary'
  if (/\/upgrades\/skins\/weapons\/(longguns|rifle)\//.test(value)) return 'Primary'
  if (/\/upgrades\/skins\/weapons\//.test(value)) return 'Melee'
  if (/archwing/.test(value)) return 'Archwing'
  if (/sentinel/.test(value)) return 'Sentinel'
  if (/syandana|\/upgrades\/skins\/scarves\//.test(value)) return 'Syandana'
  if (/armor/.test(value)) return 'Armor'
  if (/animationsets/.test(value)) return 'Animation'
  // These folders sit under /Upgrades/Skins/ just like real Warframe skins,
  // so the old catch-all (anything under Skins/ that wasn't a weapon) wrongly
  // bucketed all of them as "Warframe" - Operator/Drifter cosmetics alone
  // outnumber every other single category (739 of ~2700 real Skin entries).
  if (/\/upgrades\/skins\/(operator|clan|railjack|hoverboard)\//.test(value)) return 'Other'
  if (/warframe|\/upgrades\/skins\/(?:[a-z]+)\//.test(value) && !/weapons/.test(value)) return 'Warframe'
  return 'Other'
}

function ownedUniqueNames(rawInventory) {
  const owned = new Set()
  for (const bucket of ['WeaponSkins', 'FlavourItems', 'MiscItems', 'ShipDecorations']) {
    for (const entry of rawInventory?.[bucket] || []) {
      const key = normalize(entry?.ItemType)
      if (key) owned.add(key)
    }
  }
  return owned
}

function cosmeticImage(entry, uniqueName, exportData, EI, nameToImage) {
  const icon = entry?.icon
  if (typeof icon === 'string' && icon.startsWith('/')) {
    const hash = exportData?.ExportImages?.[icon]?.contentHash
    if (hash) return `asset-cache://content.warframe.com/PublicExport${icon}!${hash}`
    return `asset-cache://browse.wf${icon}`
  }
  return resolveAnyImage(uniqueName, EI, nameToImage)
}

function CosmeticCard({ item, onAcquire }) {
  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-colors hover:border-kronos-accent/40 ${item.owned ? 'border-emerald-500/60' : 'border-white/10'}`}
      onClick={() => onAcquire(item.uniqueName)}
    >
      <div className="relative h-48 flex items-center justify-center bg-black/20">
        <ItemImage src={item.icon} alt={item.name} className="max-h-44 max-w-[90%] object-contain" placeholderClassName="w-full h-full bg-white/5" />
        <span className={`absolute bottom-2 left-2 rounded-full px-2 py-1 text-[9px] font-black ${item.owned ? 'bg-emerald-400 text-black' : 'bg-black/70 text-kronos-dim'}`}>
          {item.owned ? 'OWNED' : 'MISSING'}
        </span>
        <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black text-kronos-accent">{item.kind}</span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-black" title={item.name}>{item.name}</p>
        <button type="button" onClick={(e) => { e.stopPropagation(); onAcquire(item.uniqueName); }} className="mt-3 w-full rounded-lg border border-kronos-accent/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-kronos-accent hover:bg-kronos-accent/10">
          Acquisition
        </button>
      </div>
    </Card>
  )
}

export default function Cosmetics() {
  const { exportData, rawInventory, EI, nameToImage, dropIndex, recipeResultIndex, exaltedWeaponIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, wikiBlueprintIndex, wikiResearchIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exportVendorIndex, glyphSupplementIndex, exportComponentIndex } = useMonitoring()
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(COSMETICS_PAGE_SIZE)
  const [overrides, setOverrides] = useState(null)
  const { openKey, toggle, close } = useAcquisitionDrawer()

  useEffect(() => {
    invoke('read_file_bytes', { relative: 'data/assets/data/acquisition_overrides.json' })
      .then((bytes) => setOverrides(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
      .catch(() => setOverrides({ components: {}, mods: {} }))
  }, [])

  const owned = useMemo(() => ownedUniqueNames(rawInventory), [rawInventory])
  const items = useMemo(() => {
    const customs = exportData?.ExportCustoms
    const dict = exportData?.dict || {}
    const skinItems = customs && typeof customs === 'object' ? Object.entries(customs).flatMap(([uniqueName, entry]) => {
      if (!/\/Upgrades\/Skins\//i.test(uniqueName)) return []
      const isOwned = owned.has(normalize(uniqueName))
      // Filter unowned internal engine debug/placeholder animation sets with no icon
      if (!isOwned && (entry?.excludeFromCodex === true || entry?.codexSecret === true || (!entry?.icon && !entry?.texture))) return []
      const kind = isSigil(uniqueName) ? 'Sigil' : 'Skin'
      const name = dict[entry?.name] || entry?.name
      if (!name) return []
      return [{ uniqueName, name, kind, type: cosmeticType(uniqueName, entry?.icon, kind), owned: isOwned, icon: cosmeticImage(entry, uniqueName, exportData, EI, nameToImage) }]
    }) : []
    const glyphItems = Object.entries(exportData?.WI_Glyphs || {}).flatMap(([uniqueName, entry]) => {
      const name = entry?.name
      if (!uniqueName || !name) return []
      // WFCD mirrors DE's Codex disposition for legacy/internal glyphs. They
      // remain useful when present in a player's inventory, but must not be
      // presented as obtainable missing cosmetics.
      const isOwned = owned.has(normalize(uniqueName))
      if (!isOwned && (entry?.excludeFromCodex === true || entry?.codexSecret === true)) return []
      return [{ uniqueName, name, kind: 'Glyph', type: 'Glyph', owned: isOwned, icon: entry.icon || resolveAnyImage(uniqueName, EI, nameToImage) }]
    })
    // Ship decorations (Orbiter furnishings, trophies, plushies, drawings,
    // Shawzin-playable pieces) live under a handful of ShipDecos-family
    // parentName values in ExportResources.json, not in ExportCustoms at
    // all - they were previously nowhere in the app (owned or not).
    const decorationParents = new Set([
      '/Lotus/Types/Items/ShipDecos/ShipDecoItem',
      '/Lotus/Types/Items/ShipDecos/BaseFishTrophy',
      '/Lotus/Types/Items/ShipDecos/ChildDrawingBase',
      '/Lotus/Types/Items/ShipDecos/LotusShawzinPlayableBase',
      '/Lotus/Types/Items/ShipDecos/Plushies/PlushyThumper',
      '/Lotus/Types/Items/ShipDecos/Vignettes/Enemies/ShipDecoItem',
      '/Lotus/Types/Items/ShipDecos/InstrumentDecoItem',
      '/Lotus/Types/Items/ShipDecorationLayerItem',
    ])
    const decorationItems = Object.entries(exportData?.ExportResources || {}).flatMap(([uniqueName, entry]) => {
      if (!decorationParents.has(entry?.parentName)) return []
      const isOwned = owned.has(normalize(uniqueName))
      const name = dict[entry?.name] || entry?.name
      if (!name) return []
      return [{ uniqueName, name, kind: 'Decoration', type: 'Decoration', owned: isOwned, icon: cosmeticImage(entry, uniqueName, exportData, EI, nameToImage) }]
    })
    // Emotes are a separate export table entirely (ExportFlavour.json),
    // matching the raw ownership bucket they're granted into (FlavourItems).
    const emoteItems = Object.entries(exportData?.ExportFlavour || {}).flatMap(([uniqueName, entry]) => {
      if (!uniqueName.startsWith('/Lotus/Types/Items/Emotes/')) return []
      const isOwned = owned.has(normalize(uniqueName))
      const name = dict[entry?.name] || entry?.name
      if (!name) return []
      return [{ uniqueName, name, kind: 'Emote', type: 'Emote', owned: isOwned, icon: cosmeticImage(entry, uniqueName, exportData, EI, nameToImage) }]
    })
    return [...skinItems, ...glyphItems, ...decorationItems, ...emoteItems]
  }, [exportData, owned, EI, nameToImage])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => (!q || item.name.toLowerCase().includes(q)) && (kindFilter === 'all' || item.type.toLowerCase() === kindFilter) && (ownershipFilter === 'all' || (ownershipFilter === 'owned' ? item.owned : !item.owned))).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
  }, [items, search, kindFilter, ownershipFilter])

  useEffect(() => {
    setVisibleCount(COSMETICS_PAGE_SIZE)
  }, [search, kindFilter, ownershipFilter])

  const visibleItems = filtered.slice(0, visibleCount)

  const openItem = useMemo(() => {
    if (!openKey || !overrides) return null
    const item = items.find((candidate) => candidate.uniqueName === openKey)
    if (!item) return null
    return { uniqueName: item.uniqueName, displayName: item.name, info: getAcquisitionInfo(item.uniqueName, item.name, dropIndex, overrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, undefined, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex) }
  }, [openKey, overrides, items, dropIndex, recipeResultIndex, exaltedWeaponIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, wikiBlueprintIndex, wikiResearchIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exportVendorIndex, glyphSupplementIndex, exportComponentIndex])

  if (!exportData) return <PageLayout title="Cosmetics, Decorations, Emotes"><Card className="p-8 text-center text-kronos-dim">Loading cosmetics...</Card></PageLayout>

  return (
    <PageLayout title="Cosmetics, Decorations, Emotes" subtitle={`${items.filter((item) => item.owned).length} / ${items.length} owned - skins, sigils, glyphs, ship decorations, and emotes`}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} /><Input placeholder="Search cosmetics..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9 text-xs" /></div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/5 bg-black/20 p-1 self-start">
          {['all', 'warframe', 'primary', 'secondary', 'melee', 'archwing', 'sentinel', 'syandana', 'armor', 'animation', 'glyph', 'sigil', 'decoration', 'emote', 'other'].map((value) => <button key={value} type="button" onClick={() => setKindFilter(value)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${kindFilter === value ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:bg-white/5'}`}>{value === 'all' ? 'All' : value}</button>)}
          <span className="mx-1 border-l border-white/10" />
          {['all', 'owned', 'unowned'].map((value) => <button key={value} type="button" onClick={() => setOwnershipFilter(value)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${ownershipFilter === value ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:bg-white/5'}`}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </div>
      </div>
      {filtered.length === 0 ? <Card className="p-8 text-center text-kronos-dim"><Sparkles className="mx-auto mb-2" size={20} />No cosmetics match.</Card> : <>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 pb-4">{visibleItems.map((item) => <CosmeticCard key={item.uniqueName} item={item} onAcquire={toggle} />)}</div>
        {visibleCount < filtered.length && <button type="button" onClick={() => setVisibleCount((count) => Math.min(count + COSMETICS_PAGE_SIZE, filtered.length))} className="mx-auto mb-4 rounded-lg border border-kronos-accent/40 px-5 py-2 text-xs font-black uppercase tracking-wider text-kronos-accent hover:bg-kronos-accent/10">Load more ({filtered.length - visibleCount} remaining)</button>}
      </>}
      {openItem && <AcquisitionDrawer item={openItem} onClose={close} />}
    </PageLayout>
  )
}
