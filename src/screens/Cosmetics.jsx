import { useEffect, useMemo, useState, useRef } from 'react'
import { Search, Sparkles, ArrowUpDown } from 'lucide-react'
import { invoke } from '../lib/logging/tauri'
import { useUi } from '../contexts/UiContext'
import { PageLayout, Card, Input, Tabs } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'
import { resolveAnyImage } from '../lib/warframeUtils'
import { getAcquisitionInfo } from '../lib/acquisitionInfo'
import AcquisitionDrawer, { useAcquisitionDrawer } from '../components/AcquisitionDrawer'
import PreviewAcquisitionDrawer from '../preview/acquisition/PreviewAcquisitionDrawer'
import ItemImage from '../components/ItemImage'
import { IS_PREVIEW } from '../lib/buildProfile'
import PreviewCosmeticsLayout from '../components/PreviewCosmeticsLayout'

const normalize = (uniqueName) => typeof uniqueName === 'string' ? uniqueName.replaceAll('/StoreItems/', '/').toLowerCase() : uniqueName
const isSigil = (uniqueName) => /\/Upgrades\/Skins\/Sigils\//i.test(uniqueName || '')
const CARD_WIDTH = 220
const COL_GAP = 12
const CARD_HEIGHT = 332
const GRID_ROW_STRIDE = 344
const WINDOW_OVERSCAN_ROWS = 3

// DE mostly files a Warframe's skins under /Upgrades/Skins/<FamilyCodename>/,
// the same internal family segment that appears in that Warframe's own
// uniqueName under /Lotus/Powersuits/<FamilyCodename>/... (e.g. Lavos is
// "Alchemist", Wisp is "Wisp", Equinox is "YinYang") - but a few (Hydroid,
// Excalibur Umbra, ...) instead get a Skins/ folder matching their real
// display name ("Hydroid", "Umbra") rather than the internal codename
// ("Pirate", "Excalibur"). Combining both the codename segment and every
// non-"Prime" word of the resolved display name (via exportData.dict, same
// resolution acquisitionInfo.js/buildExaltedWeaponIndex uses) from
// ExportWarframes.json (productCategory === 'Suits', which excludes
// Archwings/Necramechs living in the same table) covers both. This stays
// correct as DE adds new Warframes, instead of needing another
// hand-maintained list patched every time a non-Warframe folder slips through.
function buildWarframeFamilies(exportData) {
  const dict = exportData?.dict || {}
  const families = new Set()
  for (const [uniqueName, entry] of Object.entries(exportData?.ExportWarframes || {})) {
    if (entry?.productCategory !== 'Suits') continue
    const match = /^\/Lotus\/Powersuits\/([^/]+)\//.exec(uniqueName)
    if (match) families.add(match[1].toLowerCase())
    const displayName = dict[entry?.name] || entry?.name || ''
    for (const word of displayName.split(/[^A-Za-z0-9]+/)) {
      if (word && word.toLowerCase() !== 'prime') families.add(word.toLowerCase())
    }
  }
  return families
}

function cosmeticType(uniqueName, icon, kind, warframeFamilies) {
  if (kind !== 'Skin') return kind
  const value = `${uniqueName || ''} ${icon || ''}`.toLowerCase()
  // The previous check here (`/upgrades/skins/weapons/(pistols|dspistols|
  // longguns|rifle)/`) only matched a weapon skin's uniqueName, and only the
  // narrow slice of weapon skins (58 of them) that happen to be filed under
  // the literal /Upgrades/Skins/Weapons/ folder. The other ~450+ real weapon
  // skins are filed under a per-weapon-family folder instead (the same
  // convention Warframe skins use, e.g. /Upgrades/Skins/Koumei/... for a
  // Warfan skin) and never matched, silently falling through to the
  // Warframe-family check below and landing on "Warframe" whenever that
  // folder name happened to also be a real Warframe's codename (confirmed
  // live: Koumei is both a Warframe and this weapon-family folder). The
  // reliable signal DE actually uses everywhere is the ICON path's
  // StoreIcons/Weapons/{Primary,Secondary,Melee}Weapons/ segment - verified
  // against the current export: 569 items carry this segment, 534
  // unambiguously (the other 35 are Exalted/Archgun/Arrow skins that
  // legitimately have no ground-weapon-slot kind and correctly fall through
  // to the existing Warframe/Other logic below instead).
  if (/storeicons\/weapons\/secondaryweapons\//.test(value)) return 'Secondary'
  if (/storeicons\/weapons\/primaryweapons\//.test(value)) return 'Primary'
  if (/storeicons\/weapons\/meleeweapons\//.test(value)) return 'Melee'
  if (/\/upgrades\/skins\/weapons\/(pistols|dspistols)\//.test(value)) return 'Secondary'
  if (/\/upgrades\/skins\/weapons\/(longguns|rifle)\//.test(value)) return 'Primary'
  if (/\/upgrades\/skins\/weapons\//.test(value)) return 'Melee'
  if (/archwing/.test(value)) return 'Archwing'
  if (/sentinel/.test(value)) return 'Sentinel'
  if (/syandana|\/upgrades\/skins\/scarves\//.test(value)) return 'Syandana'
  if (/armor/.test(value)) return 'Armor'
  if (/animationsets/.test(value)) return 'Animation'
  // A Warframe skin only resolves to "Warframe" when its /Upgrades/Skins/
  // folder matches a real Warframe family name pulled from ExportWarframes.json
  // (see buildWarframeFamilies above). Every other folder under Skins/ -
  // Operator/Drifter, Clan, Railjack, Hoverboard, but also companion cosmetics
  // (Kubrows, Catbrows, MoaPet), Necramechs, Duviri Kaithe ("Horse"), Kahl,
  // seasonal Promo badges, KDrive, and dozens more - falls through to "Other".
  // This replaces a catch-all regex that matched ANY non-weapon folder under
  // Skins/ and mis-bucketed all of the above as "Warframe".
  const folderMatch = /\/upgrades\/skins\/([a-z0-9]+)\//.exec(value)
  if (folderMatch && warframeFamilies?.has(folderMatch[1])) return 'Warframe'
  return 'Other'
}

// A handful of Warframe Animation Set folders use a legacy internal codename
// that matches neither the Warframe's current Powersuits folder nor its
// display name (the same class of mismatch buildWarframeFamilies already
// handles for regular skins, just one level deeper here). Verified directly
// against the export data + dict (not guessed from the name): Anima ->
// Equinox, Asp -> Saryn, Decree -> Banshee. The other 62 of 66 Animation Set
// folders match the Warframe's real current codename/display-name words
// with no override needed.
const ANIMATION_FOLDER_FAMILY_OVERRIDES = { anima: 'equinox', asp: 'saryn', decree: 'banshee' }

// Per wiki.warframe.com/w/Animation_Set: "Each Warframe has two of their own
// animation sets unlocked by default, Agile and Noble" - free with the frame,
// no separate purchase. DE's export data confirms this: every Animation Set
// entry carries `alwaysAvailable: true` plus a paired `requirement` token
// that never appears anywhere in the raw inventory (see acquisitionInfo.js's
// buildAlwaysAvailableIndex comment - this is NOT the same as the emote case,
// where alwaysAvailable alone means free-for-everyone). Since a purchased
// cross-Warframe animation license already shows up correctly via the normal
// owned-items scan (DE files it under productCategory "WeaponSkins", the
// same bucket a regular skin purchase uses), the only real gap is this
// default-per-frame case: true whenever the player owns a Warframe in the
// matching family, independent of anything in the raw inventory buckets.
function buildOwnedWarframeFamilies(rawInventory, exportData) {
  const dict = exportData?.dict || {}
  const warframesByUniqueName = exportData?.ExportWarframes || {}
  const ownedFolders = new Set()
  for (const suit of rawInventory?.Suits || []) {
    const match = /^\/Lotus\/Powersuits\/([^/]+)\//.exec(suit?.ItemType || '')
    if (match) ownedFolders.add(match[1].toLowerCase())
  }
  const families = new Set()
  for (const [uniqueName, entry] of Object.entries(warframesByUniqueName)) {
    if (entry?.productCategory !== 'Suits') continue
    const match = /^\/Lotus\/Powersuits\/([^/]+)\//.exec(uniqueName)
    if (!match || !ownedFolders.has(match[1].toLowerCase())) continue
    families.add(match[1].toLowerCase())
    const displayName = dict[entry?.name] || entry?.name || ''
    for (const word of displayName.split(/[^A-Za-z0-9]+/)) {
      if (word && word.toLowerCase() !== 'prime') families.add(word.toLowerCase())
    }
  }
  return families
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
  // Hand-curated catalog additions (see cosmetic-catalog-additions.json) use a
  // direct, verified CDN URL instead of a DE-internal path when the item is
  // missing from the primary export entirely - no DE PublicExport hash exists
  // to build an asset-cache:// URL from.
  if (typeof icon === 'string' && icon.startsWith('http')) return icon
  return resolveAnyImage(uniqueName, EI, nameToImage)
}

function CosmeticCard({ item, onAcquire }) {
  const { t } = useUi()
  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-colors hover:border-kronos-accent/40 ${item.owned ? 'border-emerald-500/60' : 'border-white/10'}`}
      onClick={() => onAcquire(item.uniqueName)}
      data-preview-cosmetic-card={IS_PREVIEW ? '' : undefined}
    >
      <div className="relative h-48 flex items-center justify-center bg-black/20">
        <ItemImage src={item.icon} alt={item.name} className="max-h-44 max-w-[90%] object-contain" placeholderClassName="w-full h-full bg-white/5" />
        <span className={`absolute bottom-2 left-2 rounded-full px-2 py-1 text-[9px] font-black ${item.owned ? 'bg-emerald-400 text-black' : 'bg-black/70 text-kronos-dim'}`}>
          {item.owned ? t('cosmetics.owned_badge') : t('cosmetics.missing_badge')}
        </span>
        <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black text-kronos-accent">{item.kind}</span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-black" title={item.name}>{item.name}</p>
        <button type="button" onClick={(e) => { e.stopPropagation(); onAcquire(item.uniqueName); }} className="mt-3 w-full rounded-lg border border-kronos-accent/30 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-kronos-accent hover:bg-kronos-accent/10">
          {t('cosmetics.acquisition_button')}
        </button>
      </div>
    </Card>
  )
}

export default function Cosmetics() {
  const { t } = useUi()
  const SORT_OPTIONS = [
    { id: 'name', label: t('mods.sort_name') },
  ]
  const { exportData, rawInventory, EI, nameToImage, dropIndex, recipeResultIndex, exaltedWeaponIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, wikiBlueprintIndex, wikiResearchIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exportVendorIndex, glyphSupplementIndex, exportComponentIndex } = useMonitoring()
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const [animationTierFilter, setAnimationTierFilter] = useState('all')
  const [sortCriteria, setSortCriteria] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const pageScrollRef = useRef(null)
  const [virtualRoot, setVirtualRoot] = useState(null)
  const [windowMetrics, setWindowMetrics] = useState({ scrollTop: 0, viewportHeight: 0, columns: 1 })
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
    const warframeFamilies = buildWarframeFamilies(exportData)
    const ownedWarframeFamilies = buildOwnedWarframeFamilies(rawInventory, exportData)
    const skinItems = customs && typeof customs === 'object' ? Object.entries(customs).flatMap(([uniqueName, entry]) => {
      if (!/\/Upgrades\/Skins\//i.test(uniqueName)) return []
      const type = cosmeticType(uniqueName, entry?.icon, isSigil(uniqueName) ? 'Sigil' : 'Skin', warframeFamilies)
      // A purchased-for-every-Warframe animation license shows up in the raw
      // owned-items scan (DE files it as a normal WeaponSkins purchase); the
      // family-match fallback only ever catches the free default set, which
      // is usable on that one Warframe alone - so which path set `isOwned`
      // is itself the signal for "universal" vs "frame_only".
      // Default-granted skins (e.g. Amesha's default Archwing skin) carry
      // DE's own `alwaysAvailable: true` flag and never appear in the raw
      // owned-items scan - same bug class already fixed for Emotes below.
      let isOwned = owned.has(normalize(uniqueName)) || entry?.alwaysAvailable === true
      let ownershipTier = isOwned ? 'universal' : 'unowned'
      if (!isOwned && type === 'Animation') {
        const folderMatch = /\/upgrades\/skins\/([a-z0-9]+)\//i.exec(uniqueName)
        const folder = folderMatch ? folderMatch[1].toLowerCase() : null
        const familyKey = folder ? (ANIMATION_FOLDER_FAMILY_OVERRIDES[folder] || folder) : null
        if (familyKey && ownedWarframeFamilies.has(familyKey)) {
          isOwned = true
          ownershipTier = 'frame_only'
        }
      }
      // Filter unowned internal engine debug/placeholder items with no real
      // artwork to show. `codexSecret`/`excludeFromCodex` alone is NOT a
      // reliable signal for this - DE sets it on the vast majority of normal,
      // real, obtainable cosmetics (Prime armor pieces, holster stances,
      // sigils, Baro/TennoCon armor, Operator heads/hoods, every per-Warframe
      // Agile/Noble Animation Set...) simply to hide them from the in-game
      // Codex until first encountered/unlocked, not because they're internal
      // debug items. Verified against the current export: every one of the
      // ~1,315 unowned items that had a real icon/texture was ALSO flagged
      // codexSecret/excludeFromCodex, while every item genuinely lacking
      // icon+texture was flagged too - so the icon/texture check alone
      // reproduces the intended "no real artwork" filter with zero loss,
      // without also hiding ~1,315 legitimate real cosmetics.
      if (!isOwned && !entry?.icon && !entry?.texture) return []
      const kind = isSigil(uniqueName) ? 'Sigil' : 'Skin'
      const name = dict[entry?.name] || entry?.name
      if (!name) return []
      return [{ uniqueName, name, kind, type, owned: isOwned, ownershipTier, icon: cosmeticImage(entry, uniqueName, exportData, EI, nameToImage) }]
    }) : []
    const glyphItems = Object.entries(exportData?.WI_Glyphs || {}).flatMap(([uniqueName, entry]) => {
      const name = entry?.name
      if (!uniqueName || !name) return []
      // WFCD mirrors DE's Codex disposition for legacy/internal glyphs. They
      // remain useful when present in a player's inventory, but must not be
      // presented as obtainable missing cosmetics.
      const isOwned = owned.has(normalize(uniqueName))
      if (!isOwned && (entry?.excludeFromCodex === true || entry?.codexSecret === true)) return []
      return [{ uniqueName, name, kind: 'Glyph', type: 'Glyph', owned: isOwned, ownershipTier: isOwned ? 'universal' : 'unowned', icon: entry.icon || resolveAnyImage(uniqueName, EI, nameToImage) }]
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
      return [{ uniqueName, name, kind: 'Decoration', type: 'Decoration', owned: isOwned, ownershipTier: isOwned ? 'universal' : 'unowned', icon: cosmeticImage(entry, uniqueName, exportData, EI, nameToImage) }]
    })
    // Emotes are a separate export table entirely (ExportFlavour.json),
    // matching the raw ownership bucket they're granted into (FlavourItems).
    // 30 of the 143 emotes (Agree, Wave, Dance, etc.) carry DE's own
    // `alwaysAvailable: true` flag - these are granted to every account by
    // default and never appear in FlavourItems at all, so the raw-inventory
    // check alone would wrongly show them as missing.
    const emoteItems = Object.entries(exportData?.ExportFlavour || {}).flatMap(([uniqueName, entry]) => {
      if (!uniqueName.startsWith('/Lotus/Types/Items/Emotes/')) return []
      const isOwned = owned.has(normalize(uniqueName)) || entry?.alwaysAvailable === true
      const name = dict[entry?.name] || entry?.name
      if (!name) return []
      return [{ uniqueName, name, kind: 'Emote', type: 'Emote', owned: isOwned, ownershipTier: isOwned ? 'universal' : 'unowned', icon: cosmeticImage(entry, uniqueName, exportData, EI, nameToImage) }]
    })
    return [...skinItems, ...glyphItems, ...decorationItems, ...emoteItems]
  }, [exportData, owned, EI, nameToImage, rawInventory])

  const handleSortChange = (id) => {
    if (id === sortCriteria) {
      setSortDirection((d) => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortCriteria(id)
      setSortDirection('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const dir = sortDirection === 'desc' ? -1 : 1
    return items
      .filter((item) => (!q || item.name.toLowerCase().includes(q)) && (kindFilter === 'all' || item.type.toLowerCase() === kindFilter) && (ownershipFilter === 'all' || (ownershipFilter === 'owned' ? item.owned : !item.owned)) && (kindFilter !== 'animation' || animationTierFilter === 'all' || item.ownershipTier === animationTierFilter))
      .sort((a, b) => a.name.localeCompare(b.name) * dir)
  }, [items, search, kindFilter, ownershipFilter, animationTierFilter, sortCriteria, sortDirection])

  // The page scroll area is shared with the header controls, so measure the
  // virtual content's position inside that owner rather than adding a nested
  // scrolling region. Cards have fixed geometry, which makes a native row
  // window sufficient without a virtualizer dependency.
  useEffect(() => {
    const container = pageScrollRef.current
    if (!container || !virtualRoot) return

    const measure = () => {
      const rootRect = virtualRoot.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const columns = Math.max(1, Math.floor((virtualRoot.clientWidth + COL_GAP) / (CARD_WIDTH + COL_GAP)))
      const scrollTop = Math.max(0, containerRect.top - rootRect.top)
      setWindowMetrics((previous) => {
        const next = { scrollTop, viewportHeight: container.clientHeight, columns }
        return previous.scrollTop === next.scrollTop && previous.viewportHeight === next.viewportHeight && previous.columns === next.columns ? previous : next
      })
    }

    measure()
    let resizeTimer = null
    const scheduleMeasure = () => {
      if (resizeTimer !== null) return
      resizeTimer = setTimeout(() => {
        resizeTimer = null
        measure()
      }, 50)
    }
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(container)
    observer.observe(virtualRoot)
    container.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      if (resizeTimer !== null) clearTimeout(resizeTimer)
      container.removeEventListener('scroll', measure)
    }
  }, [virtualRoot])

  useEffect(() => {
    pageScrollRef.current?.scrollTo({ top: 0 })
  }, [search, kindFilter, ownershipFilter, animationTierFilter, sortCriteria, sortDirection])

  useEffect(() => {
    if (kindFilter !== 'animation') setAnimationTierFilter('all')
  }, [kindFilter])

  const rowCount = Math.ceil(filtered.length / windowMetrics.columns)
  const firstRow = Math.max(0, Math.floor(windowMetrics.scrollTop / GRID_ROW_STRIDE) - WINDOW_OVERSCAN_ROWS)
  const lastRow = Math.min(rowCount, Math.ceil((windowMetrics.scrollTop + windowMetrics.viewportHeight) / GRID_ROW_STRIDE) + WINDOW_OVERSCAN_ROWS)
  const windowedCosmetics = filtered.slice(firstRow * windowMetrics.columns, lastRow * windowMetrics.columns)

  const openItem = useMemo(() => {
    if (!openKey || !overrides) return null
    const item = items.find((candidate) => candidate.uniqueName === openKey)
    if (!item) return null
    return {
      uniqueName: item.uniqueName,
      displayName: item.name,
      image: item.icon,
      category: item.kind || item.type,
      owned: item.owned,
      info: getAcquisitionInfo(item.uniqueName, item.name, dropIndex, overrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, undefined, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex),
    }
  }, [openKey, overrides, items, dropIndex, recipeResultIndex, exaltedWeaponIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, wikiBlueprintIndex, wikiResearchIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exportVendorIndex, glyphSupplementIndex, exportComponentIndex])

  const kindFilterKeys = {
    all: 'foundry.cat_all',
    warframe: 'foundry.cat_warframe',
    primary: 'foundry.cat_primary',
    secondary: 'foundry.cat_secondary',
    melee: 'foundry.cat_melee',
    archwing: 'mastery.cat_archwing',
    sentinel: 'mastery.cat_sentinel',
    syandana: 'cosmetics.kind_syandana',
    armor: 'cosmetics.kind_armor',
    animation: 'cosmetics.kind_animation',
    glyph: 'cosmetics.kind_glyph',
    sigil: 'cosmetics.kind_sigil',
    decoration: 'cosmetics.kind_decoration',
    emote: 'cosmetics.kind_emote',
    other: 'ui.inventory.other',
  }
  const ownershipFilterKeys = {
    all: 'ui.inventory.tab_all',
    owned: 'ui.inventory.filter_owned',
    unowned: 'ui.inventory.unowned',
  }
  // "frame_only" / "universal" only meaningfully distinguish Animation Sets
  // (a default per-Warframe unlock vs. a purchased-for-every-Warframe
  // license - see buildOwnedWarframeFamilies above); every other cosmetic
  // kind is inherently unrestricted once owned, so this filter only appears
  // when the Animation kind tab is active, rather than replacing the normal
  // All/Owned/Unowned filter for every category.
  const animationTierFilterKeys = {
    all: 'ui.inventory.tab_all',
    frame_only: 'cosmetics.filter_frame_only',
    universal: 'cosmetics.filter_universal',
  }

  const KIND_VALUES = ['all', 'warframe', 'primary', 'secondary', 'melee', 'archwing', 'sentinel', 'syandana', 'armor', 'animation', 'glyph', 'sigil', 'decoration', 'emote', 'other']

  // Preview-only persistent category sidebar (wide widths), replacing the
  // kind Tabs strip as the primary selector there (it remains, wrapping
  // normally rather than forced into a hidden horizontal rail, as the
  // compact/narrow-width selector).
  const renderCategoryNavigator = () => (
    <nav className="hidden lg:flex flex-col gap-1 w-48 flex-shrink-0 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }} aria-label={t('cosmetics.page_title')}>
      {KIND_VALUES.map((value) => {
        const isActive = kindFilter === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setKindFilter(value)}
            aria-current={isActive ? 'page' : undefined}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-tight text-left transition-all whitespace-nowrap ${isActive ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
          >
            {t(kindFilterKeys[value])}
          </button>
        )
      })}
    </nav>
  )

  if (!exportData) return <PageLayout title={t('cosmetics.page_title')}><Card className="p-8 text-center text-kronos-dim">{t('cosmetics.loading')}</Card></PageLayout>

  // Rendered via PageLayout's `headerPanel` prop (see UI.jsx), which wraps it
  // in `sticky top-0` inside the scroll container - matching the pattern
  // Mods.jsx/Relics.jsx already use. Previously this toolbar was inlined into
  // mainContent instead, which put it in normal document flow inside the
  // scrollable area, so it scrolled away with the grid instead of staying on
  // screen.
  const renderHeaderPanel = () => (
    <div className="flex flex-col gap-3" data-preview-cosmetics-controls={IS_PREVIEW ? '' : undefined}>
      <div className="flex items-center gap-3 flex-wrap" data-preview-cosmetics-toolbar={IS_PREVIEW ? '' : undefined}>
        <div className="relative max-w-sm flex-1 min-w-[200px]" data-preview-cosmetics-search={IS_PREVIEW ? '' : undefined}><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} /><Input placeholder={t('cosmetics.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9 text-xs" /></div>
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-9 px-2" data-preview-cosmetics-sort={IS_PREVIEW ? '' : undefined}>
          <ArrowUpDown size={12} className="text-kronos-accent mx-1" />
          <div className="flex gap-1">
            {SORT_OPTIONS.map((c) => {
              const isActive = sortCriteria === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSortChange(c.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${isActive ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
                >
                  {c.label}
                  {isActive && <ArrowUpDown size={10} className={sortDirection === 'desc' ? 'rotate-180' : ''} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <Tabs
        tabs={KIND_VALUES.map((value) => ({ id: value, label: t(kindFilterKeys[value]) }))}
        activeTab={kindFilter}
        onChange={setKindFilter}
        className={IS_PREVIEW ? 'lg:hidden' : undefined}
      />
      <Tabs
        tabs={['all', 'owned', 'unowned'].map((value) => ({ id: value, label: t(ownershipFilterKeys[value]) }))}
        activeTab={ownershipFilter}
        onChange={setOwnershipFilter}
      />
      {kindFilter === 'animation' &&
        <Tabs
          tabs={['all', 'frame_only', 'universal'].map((value) => ({ id: value, label: t(animationTierFilterKeys[value]) }))}
          activeTab={animationTierFilter}
          onChange={setAnimationTierFilter}
        />
      }
    </div>
  )

  const mainContent = (
    filtered.length === 0 ? (
      <Card className="p-8 text-center text-kronos-dim">
        <Sparkles className="mx-auto mb-2" size={20} />
        {t('cosmetics.no_match')}
      </Card>
    ) : (
      <div
        ref={setVirtualRoot}
        className="relative pb-4"
        data-preview-cosmetics-grid={IS_PREVIEW ? '' : undefined}
        style={{ height: `${rowCount * GRID_ROW_STRIDE}px` }}
      >
        <div
          className="absolute inset-x-0 grid"
          style={{
            top: `${firstRow * GRID_ROW_STRIDE}px`,
            gridTemplateColumns: `repeat(${windowMetrics.columns}, ${CARD_WIDTH}px)`,
            gap: `${COL_GAP}px`,
            justifyContent: 'center',
          }}
        >
          {windowedCosmetics.map((item) => (
            <CosmeticCard key={item.uniqueName} item={item} onAcquire={toggle} />
          ))}
        </div>
      </div>
    )
  )

  const pageLayoutProps = {
    title: t('cosmetics.page_title'),
    subtitle: t('cosmetics.subtitle', { owned: items.filter((item) => item.owned).length, total: items.length }),
    headerPanel: renderHeaderPanel(),
    contentRef: pageScrollRef,
  }

  // The acquisition panel is rendered as a sibling OUTSIDE PageLayout's
  // internal scroll container (same as Mods.jsx/Relics.jsx), not inside
  // mainContent. Its `panel` variant uses `absolute inset-y-0 right-0`,
  // anchored to the nearest *positioned* ancestor - when it was nested
  // inside the scrollable area, that ancestor scrolled with the page, so the
  // panel scrolled away instead of staying pinned to the viewport.
  if (IS_PREVIEW) {
    return (
      <>
        <div className="flex gap-4 flex-1 min-h-0 h-full">
          {renderCategoryNavigator()}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <PreviewCosmeticsLayout enabled={IS_PREVIEW}>
              <PageLayout {...pageLayoutProps}>{mainContent}</PageLayout>
            </PreviewCosmeticsLayout>
          </div>
        </div>
        {openItem && <PreviewAcquisitionDrawer item={openItem} onClose={close} />}
      </>
    )
  }

  return (
    <>
      <PreviewCosmeticsLayout enabled={IS_PREVIEW}>
        <PageLayout {...pageLayoutProps}>{mainContent}</PageLayout>
      </PreviewCosmeticsLayout>
      {openItem && <AcquisitionDrawer item={openItem} onClose={close} />}
    </>
  )
}
