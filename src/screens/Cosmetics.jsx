import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { PageLayout, Card, Input } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { resolveAnyImage } from '../lib/warframeUtils'
import { getAcquisitionInfo } from '../lib/acquisitionInfo'
import AcquisitionDrawer, { useAcquisitionDrawer } from '../components/AcquisitionDrawer'
import ItemImage from '../components/ItemImage'

const normalize = (uniqueName) => uniqueName?.replace('/StoreItems/', '/').toLowerCase()
const isSigil = (uniqueName) => /\/Upgrades\/Skins\/Sigils\//i.test(uniqueName || '')

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
  const { exportData, rawInventory, EI, nameToImage, dropIndex, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex } = useMonitoring()
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [ownershipFilter, setOwnershipFilter] = useState('all')
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
    if (!customs || typeof customs !== 'object') return []
    return Object.entries(customs).flatMap(([uniqueName, entry]) => {
      if (!/\/Upgrades\/Skins\//i.test(uniqueName)) return []
      const kind = isSigil(uniqueName) ? 'Sigil' : 'Skin'
      const name = dict[entry?.name] || entry?.name
      if (!name) return []
      return [{ uniqueName, name, kind, owned: owned.has(normalize(uniqueName)), icon: resolveAnyImage(uniqueName, EI, nameToImage) }]
    })
  }, [exportData, owned, EI, nameToImage])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => (!q || item.name.toLowerCase().includes(q)) && (kindFilter === 'all' || item.kind.toLowerCase() === kindFilter) && (ownershipFilter === 'all' || (ownershipFilter === 'owned' ? item.owned : !item.owned))).sort((a, b) => a.name.localeCompare(b.name))
  }, [items, search, kindFilter, ownershipFilter])

  const openItem = useMemo(() => {
    if (!openKey || !overrides) return null
    const item = items.find((candidate) => candidate.uniqueName === openKey)
    if (!item) return null
    return { displayName: item.name, info: getAcquisitionInfo(item.uniqueName, item.name, dropIndex, overrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex) }
  }, [openKey, overrides, items, dropIndex, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex])

  if (!exportData) return <PageLayout title="Cosmetics"><Card className="p-8 text-center text-kronos-dim">Loading cosmetics...</Card></PageLayout>

  return (
    <PageLayout title="Cosmetics" subtitle={`${items.filter((item) => item.owned).length} / ${items.length} owned - skins and sigils`}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} /><Input placeholder="Search cosmetics..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9 text-xs" /></div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/5 bg-black/20 p-1 self-start">
          {['all', 'skin', 'sigil'].map((value) => <button key={value} type="button" onClick={() => setKindFilter(value)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${kindFilter === value ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:bg-white/5'}`}>{value === 'all' ? 'All' : `${value}s`}</button>)}
          <span className="mx-1 border-l border-white/10" />
          {['all', 'owned', 'missing'].map((value) => <button key={value} type="button" onClick={() => setOwnershipFilter(value)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${ownershipFilter === value ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:bg-white/5'}`}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </div>
      </div>
      {filtered.length === 0 ? <Card className="p-8 text-center text-kronos-dim"><Sparkles className="mx-auto mb-2" size={20} />No cosmetics match.</Card> : <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 pb-4">{filtered.map((item) => <CosmeticCard key={item.uniqueName} item={item} onAcquire={toggle} />)}</div>}
      {openItem && <AcquisitionDrawer item={openItem} onClose={close} />}
    </PageLayout>
  )
}
