import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageLayout, Card, Input } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { resolveAnyImage } from '../lib/warframeUtils'
import { buildPrimeResurgenceModel } from '../lib/primeResurgence'
import ItemImage from '../components/ItemImage'

function CardImage({ uniqueName, name, EI, nameToImage, uniqueNameToName, className = '' }) {
  const src = resolveAnyImage({ uniqueName, name }, EI, nameToImage, uniqueNameToName)
  return <ItemImage src={src} className={`object-contain ${className}`} placeholderClassName="h-full w-full rounded-lg bg-white/5" />
}

function PartRow({ part, imageProps, item }) {
  const isMainBlueprint = part.uniqueName === item.blueprint
  const displayName = (!part.name || part.name.toLowerCase() === 'blueprint') && isMainBlueprint ? item.name : part.name
  const displayUniqueName = isMainBlueprint ? item.uniqueName : part.uniqueName

  return <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-2 py-1.5">
    <CardImage {...imageProps} uniqueName={displayUniqueName} name={displayName} className="h-8 w-8" />
    <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{displayName}</p><p className={`text-[9px] uppercase tracking-wider ${part.owned ? 'text-emerald-300' : 'text-kronos-dim'}`}>{part.need > 1 ? `${part.have}/${part.need}${part.owned ? ' · Owned' : ''}` : (part.owned ? 'Owned' : 'Missing')}{part.isBlueprint ? ' · Blueprint' : ''}</p></div>
    {part.relics.length > 0 && <span className="text-[9px] text-kronos-dim">{part.relics.join(', ')}</span>}
  </div>
}

function EquipmentCard({ item, imageProps }) {
  const missing = item.parts.filter((part) => !part.owned).length
  return <Card className="overflow-hidden p-0">
    <div className="flex min-h-[150px] items-center gap-3 border-b border-white/10 p-3">
      <CardImage {...imageProps} uniqueName={item.uniqueName} name={item.name} className="h-28 w-28 shrink-0" />
      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-black">{item.name}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.owned ? 'bg-emerald-400 text-black' : 'bg-white/10 text-kronos-dim'}`}>{item.owned ? 'Owned' : `${missing} missing`}</span></div><p className="mt-2 text-[10px] text-kronos-dim">Prime Resurgence relic rewards</p><p className="mt-1 text-[10px] text-kronos-accent">{item.relics.join(' · ')}</p></div>
    </div>
    <div className="space-y-1.5 p-3"><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-kronos-dim">Available pieces</p>{item.parts.map((part) => <PartRow key={part.uniqueName} part={part} imageProps={imageProps} item={item} />)}</div>
  </Card>
}

function SimpleCard({ item, imageProps }) {
  return <Card className="flex min-h-[170px] flex-col items-center justify-between p-3 text-center"><CardImage {...imageProps} uniqueName={item.uniqueName} name={item.name} className="h-28 w-28" /><div><p className="text-xs font-bold">{item.name}</p><p className={`mt-1 text-[9px] font-black uppercase ${item.owned ? 'text-emerald-300' : 'text-kronos-dim'}`}>{item.owned ? 'Owned' : 'Not owned'}{item.ducats != null ? ` · ${item.ducats} Ducats` : ''}</p></div></Card>
}

export default function PrimeResurgence() {
  const { inventoryData, exportData, isInventoryLoading, EI, nameToImage, uniqueNameToName } = useMonitoring()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const trader = exportData?.VaultTrader
  const model = useMemo(() => buildPrimeResurgenceModel(trader, exportData, inventoryData), [trader, exportData, inventoryData])
  const allItems = useMemo(() => [...model.equipment, ...model.cosmetics, ...model.bundles], [model])
  const visible = useMemo(() => { const query = search.trim().toLowerCase(); return allItems.filter((item) => { if (filter === 'missing' && item.owned) return false; if (filter === 'owned' && !item.owned) return false; if (filter === 'equipment' && item.type !== 'equipment') return false; if (filter === 'cosmetics' && item.type !== 'cosmetic') return false; return !query || item.name.toLowerCase().includes(query) }) }, [allItems, filter, search])
  const imageProps = { EI, nameToImage, uniqueNameToName }
  const expiry = trader?.expiry ? new Date(trader.expiry) : null
  const visibleEquipment = visible.filter((item) => item.type === 'equipment')
  const visibleCosmetics = visible.filter((item) => item.type === 'cosmetic')
  const visibleBundles = visible.filter((item) => item.type === 'bundle')

  if (isInventoryLoading) return <PageLayout title="Prime Resurgence"><Card className="p-8 text-center text-sm text-kronos-dim">Loading account data...</Card></PageLayout>
  if (!trader) return <PageLayout title="Prime Resurgence"><Card className="p-8 text-center text-sm text-kronos-dim">Rotation data is not available yet.</Card></PageLayout>
  return <PageLayout title="Prime Resurgence" subtitle={`${model.equipment.filter((item) => item.owned).length} / ${model.equipment.length} Prime sets owned${expiry ? ` · rotation ends ${expiry.toLocaleDateString()}` : ''}`}>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} /><Input placeholder="Search Prime Resurgence..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9 text-xs" /></div><div className="flex flex-wrap gap-1 rounded-xl border border-white/5 bg-black/20 p-1 sm:ml-auto">{[['all', 'All'], ['equipment', 'Prime sets'], ['cosmetics', 'Cosmetics'], ['owned', 'Owned'], ['missing', 'Missing']].map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${filter === id ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:bg-white/5 hover:text-white'}`}>{label}</button>)}</div></div>
    {visibleEquipment.length > 0 && <section className="mb-6"><h2 className="mb-3 text-xs font-black uppercase tracking-widest text-kronos-dim">Prime equipment</h2><div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{visibleEquipment.map((item) => <EquipmentCard key={item.uniqueName} item={item} imageProps={imageProps} />)}</div></section>}
    {visibleCosmetics.length > 0 && <section className="mb-6"><h2 className="mb-3 text-xs font-black uppercase tracking-widest text-kronos-dim">Cosmetics and decorations</h2><div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">{visibleCosmetics.map((item) => <SimpleCard key={item.uniqueName} item={item} imageProps={imageProps} />)}</div></section>}
    {visibleBundles.length > 0 && <section className="mb-6"><h2 className="mb-3 text-xs font-black uppercase tracking-widest text-kronos-dim">Bundles</h2><div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">{visibleBundles.map((item) => <SimpleCard key={item.uniqueName} item={item} imageProps={imageProps} />)}</div></section>}
    {visible.length === 0 && <Card className="p-8 text-center text-sm text-kronos-dim">No rotation items match.</Card>}
  </PageLayout>
}
