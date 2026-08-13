import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageLayout, Card, Input } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { resolveAnyImage } from '../lib/warframeUtils'

// Bundle packages (e.g. "MegaPrimeVault/MPVRevenantPrimeSinglePack") aren't
// individually-owned inventory items - only the direct StoreItems entries
// (Warframes, weapons, cosmetics) they contain are trackable.
function isBundlePackage(uniqueName) {
  return uniqueName?.startsWith('/Lotus/Types/StoreItems/Packages/')
}

function normalize(uniqueName) {
  return uniqueName?.replace('/StoreItems/', '/').toLowerCase()
}

function ItemCard({ item }) {
  const owned = !!item.owned
  return (
    <div className={`relative rounded-xl border overflow-hidden transition-all ${owned ? 'border-emerald-500/70 bg-emerald-950/80' : 'border-white/10 bg-[#202a40]'}`}>
      <div className="px-2 pt-1.5 h-8 flex items-center justify-center">
        <p className="text-[13px] font-medium truncate">{item.name}</p>
      </div>
      <div className={`relative h-[100px] flex items-center justify-center px-2 ${owned ? '' : 'grayscale opacity-70'}`}>
        {item.icon ?
          <img src={item.icon} alt="" className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display = 'none' }} />
        :
          <div className="w-full h-full bg-white/5 rounded-lg" />
        }
        <span className={`absolute bottom-1 left-1 text-[8px] font-black rounded-full px-1.5 py-0.5 ${owned ? 'bg-emerald-400 text-black' : 'bg-black/60 text-kronos-dim'}`}>{owned ? 'OWNED' : 'MISSING'}</span>
        {typeof item.ducats === 'number' &&
          <span className="absolute bottom-1 right-1 text-[8px] font-black rounded-full px-1.5 py-0.5 bg-black/60 text-amber-300">{item.ducats}d</span>
        }
      </div>
    </div>
  )
}

export default function PrimeResurgence() {
  const { inventoryData, exportData, isInventoryLoading, EI, nameToImage } = useMonitoring()
  const [search, setSearch] = useState('')
  const [missingOnly, setMissingOnly] = useState(false)

  const trader = exportData?.VaultTrader

  const ownedByUnique = useMemo(() => {
    const map = new Map()
    for (const item of inventoryData?.all || []) {
      if (item.unique_name) map.set(normalize(item.unique_name), item)
    }
    return map
  }, [inventoryData])

  const items = useMemo(() => {
    if (!trader?.inventory) return []
    return trader.inventory
      .filter((entry) => !isBundlePackage(entry.uniqueName))
      .map((entry) => {
        const owned = ownedByUnique.get(normalize(entry.uniqueName))
        return {
          uniqueName: entry.uniqueName,
          name: entry.item,
          ducats: entry.ducats,
          owned: !!owned?.owned,
          icon: resolveAnyImage(entry.uniqueName.replace('/StoreItems/', '/'), EI, nameToImage),
        }
      })
  }, [trader, ownedByUnique, EI, nameToImage])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items
    if (missingOnly) list = list.filter((i) => !i.owned)
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [items, search, missingOnly])

  const ownedCount = items.filter((i) => i.owned).length
  const expiry = trader?.expiry ? new Date(trader.expiry) : null

  if (isInventoryLoading) return <PageLayout title="Prime Resurgence"><Card className="p-8 text-center text-kronos-dim text-sm">Loading...</Card></PageLayout>

  if (!trader) {
    return (
      <PageLayout title="Prime Resurgence" subtitle="Varzia's current rotation, owned vs. missing">
        <Card className="p-8 text-center text-kronos-dim text-sm">
          Rotation data not available yet - it downloads automatically alongside other game data.
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Prime Resurgence"
      subtitle={expiry ? `${ownedCount} / ${items.length} owned - through ${expiry.toLocaleDateString()}` : `${ownedCount} / ${items.length} owned`}
    >
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} />
            <Input placeholder="Search rotation..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
          <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl border border-white/5 sm:ml-auto self-start sm:self-auto">
            <button type="button" onClick={() => setMissingOnly(!missingOnly)} aria-pressed={missingOnly} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${missingOnly ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>
              Missing only
            </button>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ?
        <Card className="p-8 text-center text-kronos-dim text-sm">No items match.</Card>
      :
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 content-start pb-4">
          {filteredItems.map((item) => <ItemCard key={item.uniqueName} item={item} />)}
        </div>
      }
    </PageLayout>
  )
}
