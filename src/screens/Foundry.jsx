import { useEffect, useMemo, useState } from 'react'
import { event as logEvent } from '../lib/logging/logger'
import { Check, Hammer, Search, Star } from 'lucide-react'
import { PageLayout, Card, Input, Tabs, MonitorState } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { resolveAnyImage } from '../lib/warframeUtils'
import ItemImage from '../components/ItemImage'
import { useUi } from '../contexts/UiContext'
import { IS_PREVIEW } from '../lib/buildProfile'
import { categoryDisplayLabel } from '../lib/categoryLabels'
import FarmingTargetAction from '../components/FarmingTargetAction'

const CATEGORIES = [
  { id: 'all', labelKey: 'foundry.cat_all', keys: null },
  { id: 'warframes', labelKey: 'foundry.cat_warframe', keys: ['warframes'] },
  { id: 'primary', labelKey: 'foundry.cat_primary', keys: ['primary'] },
  { id: 'secondary', labelKey: 'foundry.cat_secondary', keys: ['secondary'] },
  { id: 'melee', labelKey: 'foundry.cat_melee', keys: ['melee'] },
  { id: 'modular', labelKey: 'foundry.cat_modular', keys: ['kitguns', 'zaws', 'amps', 'components'] },
  { id: 'arch', labelKey: 'foundry.cat_arch', keys: ['archwings', 'archweapons', 'necramechs'] },
  // 'companions' is a compatibility/fallback array - it also contains the
  // raw, un-corrected records for every item that the more specific
  // sentinels/moas/hounds/beasts arrays already cover (custom pet name
  // ordering, Deimos gilding overrides, etc. are only applied to the
  // specific arrays). Listed LAST so the dedup below (`seen`, first
  // occurrence wins) picks up the corrected entry first - previously,
  // listing it first meant a custom-named companion's uncorrected
  // "CustomName (BaseName)" record silently won over the corrected
  // "BaseName (CustomName)" one (see GitHub issue #109). Kept in the list
  // at all (not removed) since some companions fall through every specific
  // branch and only ever appear in this fallback array.
  { id: 'companion', labelKey: 'foundry.cat_companion', keys: ['companion_weapons', 'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'companions'] },
  // 'consumables_catalog' is the full Gear-wheel catalog (Ciphers, Restores,
  // Specters, Mining Lasers, etc.) already built in inventoryParser.js but
  // never surfaced as its own Foundry tab (GitHub issue #109: "missing 8 of
  // 16 real in-game categories"). Mining tools live under the same
  // /Lotus/Types/Restoratives/Consumable/ path as the rest of Gear (verified
  // against ExportRecipes.json), so they're folded into this tab rather than
  // split into their own - DE's client shows Mining as a distinct submenu,
  // but the underlying item pool is identical.
  { id: 'gear', labelKey: 'foundry.cat_gear', keys: ['consumables_catalog'] },
  { id: 'landing_craft', labelKey: 'foundry.cat_landing_craft', keys: ['landing_craft_catalog'] },
  // Craftable armor sets/attachments and sentinel masks under /Upgrades/Skins/
  // - the recipe-gating check below (`if (!recipe) continue`) already
  // excludes every default/alwaysAvailable skin that has no build recipe,
  // so appearance_catalog can safely include the full raw export.
  { id: 'appearance', labelKey: 'foundry.cat_appearance', keys: ['appearance_catalog'] },
  // Computed states, not data buckets - filters `items` from every category
  // (keys: null falls back to ALL_KEYS) down to what's actually ready to
  // build right now. Kept separate from the existing "Ready" toggle button
  // (which is a filter layered on top of whichever tab is active) since the
  // real in-game Foundry treats this as its own top-level category.
  { id: 'ready_to_build', labelKey: 'foundry.cat_ready_to_build', keys: null, predicate: (item) => isReadyToCraft(item.recipe) },
  // Pulls from `inventoryData.foundry` (raw.PendingRecipes, built in
  // inventoryParser.js) instead of the normal catalog buckets - these are
  // items actively being crafted right now, not something to evaluate as
  // "owned/missing"/"ready to build" like every other tab. Rendered via its
  // own list (see `renderInProgress` below), not the shared ItemCard grid -
  // ItemCard's owned/missing badge and component-completion UI don't apply
  // to something already mid-build (GitHub issue #109: this was the one
  // real remaining gap in Foundry's category coverage).
  { id: 'in_progress', labelKey: 'foundry.cat_in_progress', keys: [] },
]

const ALL_KEYS = ['warframes', 'primary', 'secondary', 'melee', 'kitguns', 'zaws', 'amps', 'components', 'companions', 'companion_weapons', 'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'archwings', 'archweapons', 'necramechs', 'kdrives', 'consumables_catalog', 'landing_craft_catalog', 'appearance_catalog']

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

function isReadyToCraft(recipe) {
  return !!recipe?.readyToCraft || (!!recipe?.allIngredientsMet && (recipe?.bpCount ?? 0) > 0)
}

// A recipe can be missing more than one of: the Blueprint itself, crafted
// Component sub-blueprints (Systems/Chassis/Neuroptics etc., flagged
// `isComponent` in inventoryParser.js), and plain Resources (everything
// else in `ingredients`) - all at once. The status line used to only ever
// report the first one it checked (blueprint, else ingredients), silently
// hiding any other missing category when more than one applied.
function craftStatusLabel(recipe, t) {
  if (isReadyToCraft(recipe)) return t('foundry.ready_to_craft')
  const missing = []
  if ((recipe?.bpCount ?? 0) < 1) missing.push(t('foundry.stat_blueprint'))
  if ((recipe?.ingredients ?? []).some((ing) => ing.isComponent && ing.have < ing.need)) missing.push(t('foundry.label_components'))
  if ((recipe?.ingredients ?? []).some((ing) => !ing.isComponent && ing.have < ing.need)) missing.push(t('foundry.label_resources'))
  if (missing.length === 0) return t('foundry.missing_ingredients')
  return t('foundry.missing_summary', { items: missing.join(', ') })
}

// item.owned alone misses cases where the built item is only visible through
// the recipe's own name-matched inventory lookup (recipe.ownedCount), so both
// are checked. Owning an unbuilt blueprint (recipe.bpCount) does NOT count as
// owning the item - that's what the separate "BP" tag and Ready filter are for.
function hasFoundryOwnership(item, recipe) {
  return !!item?.owned || (recipe?.ownedCount ?? 0) > 0
}

function ItemCard({ item, recipe, selected, onClick, t }) {
  const owned = hasFoundryOwnership(item, recipe)
  const ready = isReadyToCraft(recipe)
  const formas = Math.min(item.formas ?? 0, 10)
  const allComponents = []
  if (recipe && recipe.bpCount !== undefined) {
    allComponents.push({
      itemType: recipe.uniqueName || `${item.unique_name}_bp`,
      name: recipe.bpName || `${item.name} Blueprint`,
      have: recipe.bpCount ?? 0,
      need: 1,
      image: recipe.bpImage || item.image,
      isBlueprint: true,
    })
  }
  if (recipe?.ingredients) {
    allComponents.push(...recipe.ingredients)
  }
  const components = allComponents.slice(0, 6)
  // The unowned-card background was a raw hardcoded hex (`bg-[#202a40]`) -
  // the only place in this file with a literal color instead of a relative
  // black-overlay tone (`bg-black/20`, used everywhere else here and in
  // Cosmetics.jsx/Mods.jsx). The owned-state `emerald-*` colors are left
  // as-is - that's the same semantic "owned/good" green used app-wide
  // (Cosmetics.jsx's owned badge/border use identical emerald shades), not
  // a Foundry-specific theme bug.
  return <button onClick={onClick} className={`relative text-left rounded-xl border overflow-hidden transition-all ${selected ? 'border-kronos-accent ring-1 ring-kronos-accent/50' : owned ? 'border-emerald-500/70' : 'border-white/10'} ${owned ? 'bg-emerald-950/80' : 'bg-black/20'} hover:border-kronos-accent/70`}>
    <div className="px-2 pt-1.5 flex items-center justify-center gap-1 min-w-0 h-8">
      <Star size={15} className="text-white/80 shrink-0" />
      <p className="text-[15px] font-medium truncate">{item.name}</p>
      {item.mastered && <Star size={12} className="text-emerald-300 shrink-0" fill="currentColor" />}
    </div>
    <div className="relative h-[112px] flex items-center px-2">
      <div className={`relative w-[45%] h-full flex items-end justify-center ${owned ? '' : 'grayscale opacity-70'}`}>
        <ItemImage src={item.image} className="max-w-full max-h-full object-contain object-bottom" placeholderClassName="w-full h-full bg-white/5 rounded-lg" />
        <span className={`absolute bottom-1 left-1 text-[8px] font-black rounded-full px-1.5 py-0.5 ${owned ? 'bg-emerald-400 text-black' : 'bg-black/60 text-kronos-dim'}`}>{owned ? t('foundry.owned_badge') : t('foundry.missing_badge')}</span>
        {(recipe?.bpCount ?? 0) > 0 && <span className="absolute top-1 right-1 text-[8px] font-black rounded-full px-1.5 py-0.5 bg-amber-400 text-black" title="Blueprints owned">{recipe.bpCount > 1 ? `${recipe.bpCount} BP` : 'BP'}</span>}
      </div>
      <div className="w-[55%] flex flex-wrap items-center justify-center gap-1 px-1">
        {components.map((component) => {
          const complete = component.have >= component.need
          return <span key={component.itemType || component.name} className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center ${complete ? 'border-emerald-400' : 'border-white/15 bg-black/15'}`} title={`${component.name}: ${formatCount(component.have)}/${formatCount(component.need)}`}>
            <ItemImage src={component.image} className="w-6 h-6 sm:w-7 sm:h-7 object-contain rounded-full" placeholderClassName="w-5 h-5 rounded-full bg-white/10" />
            {component.isBlueprint && (
              <span className={`absolute -top-1 -left-1 text-[6.5px] font-black rounded-full px-1 leading-tight shadow ${complete ? 'bg-amber-400 text-black' : 'bg-black/90 text-amber-300 border border-amber-400/40'}`} title="Blueprint">
                BP
              </span>
            )}
            {component.isComponent && component.have < component.need && component.bpOwned > 0 && (
              <span className="absolute -top-1 -right-1 text-[6.5px] font-black rounded-full px-1 leading-tight shadow bg-amber-400 text-black" title={t('foundry.blueprints_owned', { count: component.bpOwned })}>
                {t('foundry.blueprints_owned', { count: formatCount(component.bpOwned) })}
              </span>
            )}
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

function timeRemainingLabel(finishTime, ready, t) {
  if (ready) return t('foundry.in_progress_ready')
  const seconds = finishTime - (Date.now() / 1000)
  return t('foundry.in_progress_remaining', { time: formatDuration(seconds) })
}

function InProgressCard({ pending, t }) {
  const ready = pending.ready
  return <div className={`relative text-left rounded-xl border overflow-hidden ${ready ? 'border-emerald-500/70 bg-emerald-950/80' : 'border-white/10 bg-black/20'}`}>
    <div className="px-2 pt-1.5 flex items-center justify-center gap-1 min-w-0 h-8">
      <Hammer size={13} className="text-white/80 shrink-0" />
      <p className="text-[15px] font-medium truncate">{pending.name}</p>
    </div>
    <div className="relative h-[112px] flex items-center justify-center px-2">
      <ItemImage src={pending.image} className="max-w-full max-h-full object-contain object-bottom" placeholderClassName="w-full h-full bg-white/5 rounded-lg" />
      <span className={`absolute bottom-1 left-1 text-[8px] font-black rounded-full px-1.5 py-0.5 ${ready ? 'bg-emerald-400 text-black' : 'bg-black/60 text-kronos-dim'}`}>
        {timeRemainingLabel(pending.finishTime, ready, t)}
      </span>
      {ready && <span className="absolute bottom-1 right-1 p-1 rounded-full bg-emerald-400/80 text-black" title="Ready to collect"><Check size={10} /></span>}
    </div>
  </div>
}

// `panel` (Preview only) renders as a right-side inspector instead of a
// bottom bar, matching AcquisitionDrawer's pattern (Mods/Cosmetics/Relics/
// Rivens). `absolute`, not `fixed` - anchors to the nearest positioned
// ancestor (the route viewport) rather than the whole browser viewport, so
// it doesn't start under the app's own header. Rendered as a sibling
// OUTSIDE PageLayout's scrollable content area (see the return below) for
// the same reason as AcquisitionDrawer: nested inside the scroll container,
// its anchor point would scroll away with the page instead of staying
// pinned to the viewport.
function RecipeDrawer({ item, recipe, onClose, t, variant = 'drawer' }) {
  if (!item) return null
  const isPanel = variant === 'panel'
  const rootClassName = isPanel
    ? 'absolute inset-y-0 right-0 z-40 w-full lg:max-w-sm bg-kronos-bg border-l border-white/10 shadow-[-8px_0_24px_rgba(0,0,0,0.4)] overflow-y-auto'
    : 'fixed bottom-0 left-0 right-0 z-40 bg-kronos-bg border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]'
  const innerClassName = isPanel ? 'px-5 py-5' : 'max-w-6xl mx-auto px-6 py-4 max-h-[52vh] overflow-y-auto'
  return (
    <div className={rootClassName}>
      <div className={innerClassName}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <ItemImage src={item.image} className="w-12 h-12 object-contain rounded-lg bg-black/20" placeholderClassName="w-12 h-12 rounded-lg bg-black/20" />
            <div className="min-w-0"><h2 className="font-black uppercase truncate">{item.name}</h2><p className="text-[10px] text-kronos-dim uppercase">{item.category ? categoryDisplayLabel(item.category, t) : t('foundry.category_equipment')}</p>{IS_PREVIEW && <FarmingTargetAction item={item} className="mt-1" />}</div>
          </div>
          <button onClick={onClose} className="text-kronos-dim hover:text-white text-xs font-bold uppercase">{t('foundry.close')}</button>
        </div>
        {!recipe ? <p className="text-xs text-kronos-dim italic">No recipe data is available for this item.</p> : <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-black/20 p-2"><p className="text-[9px] text-kronos-dim uppercase">{t('foundry.stat_blueprint')}</p><p className="font-black">{formatCount(recipe.bpCount)}</p></div>
            <div className="rounded-lg bg-black/20 p-2"><p className="text-[9px] text-kronos-dim uppercase">{t('foundry.stat_built')}</p><p className="font-black">{formatCount(recipe.ownedCount)}</p></div>
            <div className="rounded-lg bg-black/20 p-2"><p className="text-[9px] text-kronos-dim uppercase">{t('foundry.stat_time')}</p><p className="font-black">{formatDuration(recipe.buildTime)}</p></div>
          </div>
          <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase"><Hammer size={14} className="text-kronos-accent" /> {t('foundry.recipe_requirements')}</div>
          <div className={isPanel ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'}>
            {recipe.bpCount !== undefined && (
              <div className={`flex items-center gap-2 rounded-lg bg-black/20 p-2 border ${recipe.bpCount >= 1 ? 'border-emerald-500/30' : 'border-white/5'}`}>
                <div className="relative">
                  <ItemImage src={recipe.bpImage || item.image} className="w-8 h-8 object-contain" placeholderClassName="w-8 h-8" />
                  <span className="absolute -top-1 -left-1 text-[6px] font-black bg-amber-400 text-black px-1 rounded-full">BP</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] whitespace-normal break-words font-medium">{recipe.bpName || `${item.name} Blueprint`}</span>
                  <span className="text-[9px] text-kronos-dim block uppercase font-mono">{t('foundry.main_blueprint')}</span>
                </div>
                <span className={`text-[10px] font-black shrink-0 ${recipe.bpCount >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCount(recipe.bpCount)}/1</span>
              </div>
            )}
            {(recipe.ingredients || []).map((ingredient) => {
              const complete = ingredient.have >= ingredient.need
              return <div key={ingredient.itemType || ingredient.name} className="flex items-center gap-2 rounded-lg bg-black/20 p-2">
                <ItemImage src={ingredient.image} className="w-8 h-8 object-contain" placeholderClassName="w-8 h-8" />
                <span className="text-[11px] flex-1 whitespace-normal break-words">{ingredient.name}</span>
                <span className="flex flex-col items-end shrink-0">
                  <span className={`text-[10px] font-black ${complete ? 'text-emerald-400' : 'text-red-400'}`}>{formatCount(ingredient.have)}/{formatCount(ingredient.need)}</span>
                  {ingredient.isComponent && ingredient.have < ingredient.need && ingredient.bpOwned > 0 && <span className="text-[9px] font-black text-amber-300">{t('foundry.blueprints_owned', { count: formatCount(ingredient.bpOwned) })}</span>}
                </span>
              </div>
            })}
          </div>
          <div className={`mt-4 rounded-lg p-3 text-[10px] font-black uppercase ${isReadyToCraft(recipe) ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-kronos-dim'}`}>
            {craftStatusLabel(recipe, t)}
          </div>
        </>}
      </div>
    </div>
  )
}

export default function Foundry() {
  const { t } = useUi()
  const { inventoryData, isInventoryLoading, EI, nameToImage, uniqueNameToName } = useMonitoring()
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const [readyOnly, setReadyOnly] = useState(false)
  const [masteryFilter, setMasteryFilter] = useState('all')
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
      // Weapons/gear with no crafting recipe at all (Baro purchases like
      // Zylok/Lex, Lich kill-rewards with no build step like Coda weapons,
      // Ergo Glast Holokey vendor weapons, Syndicate/Prisma/Wraith/Vandal/
      // Dex/MK1-series pre-built weapons, default-granted gear like Artax)
      // don't belong in a screen about building things - they'd only ever
      // show a blank "No recipe data is available" message. This uses the
      // same path-then-name `recipeByResult` lookup Foundry already trusts
      // for everything else, not a separate/cruder check - an earlier
      // version of this fix matched only by exact resultType-to-uniqueName
      // string equality and wrongly flagged real craftable weapons (e.g.
      // Strun) whose recipe's `resultType` uses a different internal alias
      // path than the weapon's own uniqueName; the name-based fallback here
      // is exactly what already resolves that case correctly elsewhere in
      // this file.
      if (!recipe) continue
      const image = resolveAnyImage(item, EI, nameToImage, uniqueNameToName) || item.image
      const bpImage = recipe ? (
        resolveAnyImage({ uniqueName: recipe.uniqueName, name: recipe.bpName }, EI, nameToImage, uniqueNameToName)
        || image
      ) : null
      
      const recipeWithImages = recipe ? {
        ...recipe,
        bpImage,
        ingredients: (recipe.ingredients || []).map((component) => ({
          ...component,
          image: component.image || resolveAnyImage({ uniqueName: component.itemType, name: component.name }, EI, nameToImage, uniqueNameToName),
        })),
      } : null
      const finalItem = { ...item, image, recipe: recipeWithImages }
      if (category?.predicate && !category.predicate(finalItem)) continue
      list.push(finalItem)
    }
    return list
  }, [inventoryData, activeCat, recipeByResult, EI, nameToImage, uniqueNameToName])
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => (
      (!q || item.name?.toLowerCase().includes(q)) &&
      (ownershipFilter === 'all' || (ownershipFilter === 'owned' ? hasFoundryOwnership(item, item.recipe) : !hasFoundryOwnership(item, item.recipe))) &&
      (!readyOnly || isReadyToCraft(item.recipe)) &&
      // Items with no mastery state of their own (e.g. non-Head Zanuka Hound
      // body/legs/tail parts) belong in every ownership view but never in a
      // mastery-based filter - they can't be "mastered" or "unmastered".
      (masteryFilter === 'all' || (item.masterable === false ? false : (masteryFilter === 'mastered' ? item.mastered : !item.mastered)))
    )).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [items, search, ownershipFilter, readyOnly, masteryFilter])
  // Diagnostic (2026-09-24, Narin parts missing report).
  useEffect(() => {
    const narin = (inventoryData?.warframes || []).find((i) => i.unique_name === '/Lotus/Powersuits/Duelist/Duelist');
    logEvent('foundry.items.summary', {
      category: activeCat,
      items: items.length,
      shown: filteredItems.length,
      recipes_indexed: recipeByResult.size,
      narin_in_inventory: !!narin,
      narin_recipe: !!(recipeByResult.get('path:/Lotus/Powersuits/Duelist/Duelist') || recipeByResult.get('name:narin')),
      narin_in_items: items.some((i) => i.unique_name === '/Lotus/Powersuits/Duelist/Duelist'),
    }, { level: 'info', screen: 'foundry' });
  }, [activeCat, items, filteredItems, recipeByResult, inventoryData]);
  const selected = filteredItems.find((item) => item.unique_name === selectedName) || null
  const ownedCount = items.filter((item) => hasFoundryOwnership(item, item.recipe)).length
  const categoriesWithLabels = CATEGORIES.map((c) => ({ ...c, label: t(c.labelKey) }))
  const pendingItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (inventoryData?.foundry || [])
      .filter((p) => !q || p.name?.toLowerCase().includes(q))
      .sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0))
  }, [inventoryData, search])

  if (isInventoryLoading) return <PageLayout title={t('nav.foundry')}><MonitorState isLoading className="py-20" /></PageLayout>
  if (!inventoryData) return <PageLayout title={t('nav.foundry')}><MonitorState className="py-20" /></PageLayout>

  // Rendered via PageLayout's `headerPanel` prop (see UI.jsx), which wraps it
  // in `sticky top-0` inside the scroll container - matching Mods.jsx/
  // Cosmetics.jsx. Previously this toolbar was inlined into the scrollable
  // content instead, so it scrolled away with the item grid.
  const renderHeaderPanel = () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} /><Input placeholder={t('foundry.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" /></div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
            {[
              { id: 'all', label: t('foundry.cat_all') },
              { id: 'owned', label: t('foundry.owned') },
              { id: 'unowned', label: t('ui.inventory.unowned') },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setOwnershipFilter(opt.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${ownershipFilter === opt.id ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>
                {opt.label}
              </button>
            ))}
            <button type="button" onClick={() => setReadyOnly(!readyOnly)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${readyOnly ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`} aria-pressed={readyOnly}>
                {t('ui.inventory.ready')}
              </button>
          </div>
          <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl border border-white/5" aria-label="Mastery filter">
            {[[t('foundry.cat_all'), 'all'], [t('ui.comp.mastered'), 'mastered'], [t('ui.inventory.unmastered'), 'unmastered']].map(([label, value]) => (
              <button key={value} type="button" onClick={() => setMasteryFilter(value)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${masteryFilter === value ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`} aria-pressed={masteryFilter === value}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Tabs tabs={categoriesWithLabels} activeTab={activeCat} onChange={(id) => { setActiveCat(id); setSelectedName(null) }} />
    </div>
  )

  return <>
  <PageLayout title={t('nav.foundry')} subtitle={t('foundry.subtitle_owned', { owned: ownedCount, total: items.length })} headerPanel={renderHeaderPanel()}>
    <div className="space-y-4">
      {activeCat === 'in_progress' ? (
        pendingItems.length === 0 ? <Card className="p-8 text-center text-kronos-dim text-sm">{t('foundry.no_match')}</Card> : <div className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-2 content-start">{pendingItems.map((pending) => <InProgressCard key={pending.unique_name} pending={pending} t={t} />)}</div>
      ) : (
        filteredItems.length === 0 ? <Card className="p-8 text-center text-kronos-dim text-sm">{t('foundry.no_match')}</Card> : <div className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-2 content-start">{filteredItems.map((item) => <ItemCard key={item.unique_name} item={item} recipe={item.recipe} selected={item.unique_name === selectedName} onClick={() => setSelectedName(item.unique_name)} t={t} />)}</div>
      )}
    </div>
  </PageLayout>
  {selected && <RecipeDrawer key={selected.unique_name} item={selected} recipe={selected.recipe} onClose={() => setSelectedName(null)} t={t} variant={IS_PREVIEW ? 'panel' : 'drawer'} />}
  </>
}
