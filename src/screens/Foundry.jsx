import { useMemo, useState } from 'react'
import { Check, Hammer, Search, Star } from 'lucide-react'
import { PageLayout, Card, Input, Tabs, MonitorState } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { resolveAnyImage } from '../lib/warframeUtils'

const CATEGORIES = [
  { id: 'all', label: 'All', keys: null },
  { id: 'warframes', label: 'Warframe', keys: ['warframes'] },
  { id: 'primary', label: 'Primary', keys: ['primary'] },
  { id: 'secondary', label: 'Secondary', keys: ['secondary'] },
  { id: 'melee', label: 'Melee', keys: ['melee'] },
  { id: 'modular', label: 'Modular', keys: ['kitguns', 'zaws', 'amps'] },
  { id: 'arch', label: 'Arch', keys: ['archwings', 'archweapons', 'necramechs'] },
  { id: 'companion', label: 'Companion', keys: ['companions', 'companion_weapons', 'sentinels', 'moas', 'hounds', 'beasts', 'robotics'] },
]

const ALL_KEYS = CATEGORIES.find((c) => c.id === 'all')
  ? ['warframes', 'primary', 'secondary', 'melee', 'kitguns', 'zaws', 'amps', 'companions', 'companion_weapons', 'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'archwings', 'archweapons', 'necramechs', 'kdrives']
  : []

const canonicalPath = (value) => value?.replace('/StoreItems/', '/') || value
const canonicalName = (value) => String(value || '')
  .replace(/\s+Blueprint$/i, '')
  .replace(/[^a-z0-9]/gi, '')
  .toLowerCase()

function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function formatCount(value) {
  const count = Number(value) || 0
  const absolute = Math.abs(count)
  if (absolute < 1000) return String(Math.round(count))
  const units = [[1e9, 'b'], [1e6, 'm'], [1e3, 'k']]
  const [unit, suffix] = units.find(([threshold]) => absolute >= threshold)
  const scaled = count / unit
  const digits = Math.abs(scaled) >= 10 ? 0 : 1
  return `${Number(scaled.toFixed(digits))}${suffix}`
}

function ItemCard({ item, recipe, selected, onClick }) {
  const owned = !!item.owned
  const ready = !!recipe?.allIngredientsMet && (recipe.bpCount ?? 0) > 0
  const formas = Math.min(item.formas ?? 0, 10)
  const components = recipe?.ingredients?.slice(0, 6) || []
  return <button onClick={onClick} className={`relative text-left rounded-xl border overflow-hidden transition-all ${selected ? 'border-kronos-accent ring-1 ring-kronos-accent/50' : owned ? 'border-emerald-500/70' : 'border-white/10'} ${owned ? 'bg-emerald-950/80' : 'bg-[#202a40]'} hover:border-kronos-accent/70`}>
    <div className="px-2 pt-1.5 flex items-center justify-center gap-1 min-w-0 h-8">
      <Star size={15} className="text-white/80 shrink-0" />
      <p className="text-[15px] font-medium truncate">{item.name}</p>
      {item.mastered && <Star size={12} className="text-emerald-300 shrink-0" fill="currentColor" />}
      {recipe?.bpCount > 0 && <span className="text-[8px] text-kronos-dim">BP</span>}
    </div>
    <div className="relative h-[112px] flex items-center px-2">
      <div className={`relative w-[45%] h-full flex items-end justify-center ${owned ? '' : 'grayscale opacity-70'}`}>
        {item.image ? <img src={item.image} alt="" className="max-w-full max-h-full object-contain object-bottom" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <div className="w-full h-full bg-white/5 rounded-lg" />}
        <span className={`absolute bottom-1 left-1 text-[8px] font-black rounded-full px-1.5 py-0.5 ${owned ? 'bg-emerald-400 text-black' : 'bg-black/60 text-kronos-dim'}`}>{owned ? 'OWNED' : 'MISSING'}</span>
      </div>
      <div className="w-[55%] flex flex-wrap items-center justify-center gap-1 px-1">
        {components.map((component) => {
          const complete = component.have >= component.need
          return <span key={component.itemType || component.name} className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center ${complete ? 'border-emerald-400' : 'border-white/15 bg-black/15'}`} title={`${component.name}: ${formatCount(component.have)}/${formatCount(component.need)}`}>
            {component.image ? <img src={component.image} alt="" className="w-6 h-6 sm:w-7 sm:h-7 object-contain rounded-full" /> : <span className="w-5 h-5 rounded-full bg-white/10" />}
            <span className={`absolute -bottom-1 -right-1 text-[7px] rounded-full px-0.5 leading-3 min-w-5 text-center font-black ${complete ? 'bg-emerald-400 text-black' : 'bg-black text-white/70'}`}>{formatCount(component.have)}/{formatCount(component.need)}</span>
          </span>
        })}
      </div>
      <div className="absolute bottom-1 right-1 flex gap-0.5">
        {ready && <span className="p-1 rounded-full bg-emerald-400/80 text-black" title="Ready to craft"><Check size={10} /></span>}
        {formas > 0 && <span className="text-[8px] text-kronos-accent">{'●'.repeat(formas)}</span>}
      </div>
    </div>
  </button>
}

function RecipeDrawer({ item, recipe, onClose }) {
  if (!item) return null
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-kronos-bg border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
      <div className="max-w-6xl mx-auto px-6 py-4 max-h-[52vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {item.image && <img src={item.image} alt="" className="w-12 h-12 object-contain rounded-lg bg-black/20" />}
            <div className="min-w-0"><h2 className="font-black uppercase truncate">{item.name}</h2><p className="text-[10px] text-kronos-dim uppercase">{item.category || 'Equipment'}</p></div>
          </div>
          <button onClick={onClose} className="text-kronos-dim hover:text-white text-xs font-bold uppercase">Close</button>
        </div>
        {!recipe ? <p className="text-xs text-kronos-dim italic">No recipe data is available for this item.</p> : <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-black/20 p-2"><p className="text-[9px] text-kronos-dim uppercase">Blueprint</p><p className="font-black">{formatCount(recipe.bpCount)}</p></div>
            <div className="rounded-lg bg-black/20 p-2"><p className="text-[9px] text-kronos-dim uppercase">Built</p><p className="font-black">{formatCount(recipe.ownedCount)}</p></div>
            <div className="rounded-lg bg-black/20 p-2"><p className="text-[9px] text-kronos-dim uppercase">Time</p><p className="font-black">{formatDuration(recipe.buildTime)}</p></div>
          </div>
          <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase"><Hammer size={14} className="text-kronos-accent" /> Recipe requirements</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(recipe.ingredients || []).map((ingredient) => {
              const complete = ingredient.have >= ingredient.need
              return <div key={ingredient.itemType || ingredient.name} className="flex items-center gap-2 rounded-lg bg-black/20 p-2">
                {ingredient.image && <img src={ingredient.image} alt="" className="w-8 h-8 object-contain" />}
                <span className="text-[11px] flex-1 truncate">{ingredient.name}</span>
                <span className={`text-[10px] font-black ${complete ? 'text-emerald-400' : 'text-red-400'}`}>{formatCount(ingredient.have)}/{formatCount(ingredient.need)}</span>
              </div>
            })}
          </div>
          <div className={`mt-4 rounded-lg p-3 text-[10px] font-black uppercase ${recipe.allIngredientsMet ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-kronos-dim'}`}>
            {recipe.allIngredientsMet ? 'Ready to craft' : 'Missing ingredients'}
          </div>
        </>}
      </div>
    </div>
  )
}

export default function Foundry() {
  const { inventoryData, isInventoryLoading, EI, nameToImage, uniqueNameToName } = useMonitoring()
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [readyOnly, setReadyOnly] = useState(false)
  const [selectedName, setSelectedName] = useState(null)

  const recipeByResult = useMemo(() => {
    const map = new Map()
    for (const recipe of inventoryData?.craftable || []) {
      if (recipe.resultType) map.set(`path:${canonicalPath(recipe.resultType)}`, recipe)
      for (const name of [recipe.bpName, recipe.baseName]) {
        const key = canonicalName(name)
        if (key) map.set(`name:${key}`, recipe)
      }
    }
    return map
  }, [inventoryData])
  const items = useMemo(() => {
    if (!inventoryData) return []
    const category = CATEGORIES.find((c) => c.id === activeCat)
    const list = []
    const seen = new Set()
    for (const key of category?.keys ?? ALL_KEYS) for (const item of inventoryData[key] || []) {
      if (!item.unique_name || seen.has(item.unique_name) || item.category === 'prime_parts') continue
      seen.add(item.unique_name)
      const recipe = recipeByResult.get(`path:${canonicalPath(item.unique_name)}`)
        || recipeByResult.get(`name:${canonicalName(item.name)}`)
      const image = resolveAnyImage(item, EI, nameToImage, uniqueNameToName) || item.image
      const recipeWithImages = recipe ? {
        ...recipe,
        ingredients: (recipe.ingredients || []).map((component) => ({
          ...component,
          image: component.image || resolveAnyImage({ uniqueName: component.itemType, name: component.name }, EI, nameToImage, uniqueNameToName),
        })),
      } : null
      list.push({ ...item, image, recipe: recipeWithImages })
    }
    return list
  }, [inventoryData, activeCat, recipeByResult, EI, nameToImage, uniqueNameToName])
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => (!q || item.name?.toLowerCase().includes(q)) && (!ownedOnly || item.owned) && (!readyOnly || item.recipe?.allIngredientsMet)).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [items, search, ownedOnly, readyOnly])
  const selected = filteredItems.find((item) => item.unique_name === selectedName) || null
  const ownedCount = items.filter((item) => item.owned).length

  if (isInventoryLoading) return <PageLayout title="Foundry"><MonitorState isLoading className="py-20" /></PageLayout>
  if (!inventoryData) return <PageLayout title="Foundry"><MonitorState className="py-20" /></PageLayout>

  return <PageLayout title="Foundry" subtitle={`${ownedCount} / ${items.length} owned`}>
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <Tabs tabs={CATEGORIES} activeTab={activeCat} onChange={(id) => { setActiveCat(id); setSelectedName(null) }} />
        <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
          <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} /><Input placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" /></div>
          <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
            {[['Owned', ownedOnly, setOwnedOnly], ['Ready', readyOnly, setReadyOnly]].map(([label, active, setActive]) => (
              <button key={label} type="button" onClick={() => setActive(!active)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${active ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`} aria-pressed={active}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
    <div className="space-y-4">
      {filteredItems.length === 0 ? <Card className="p-8 text-center text-kronos-dim text-sm">No items match.</Card> : <div className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-2 content-start">{filteredItems.map((item) => <ItemCard key={item.unique_name} item={item} recipe={item.recipe} selected={item.unique_name === selectedName} onClick={() => setSelectedName(item.unique_name)} />)}</div>}
      {selected && <RecipeDrawer item={selected} recipe={selected.recipe} onClose={() => setSelectedName(null)} />}
    </div>
  </PageLayout>
}
