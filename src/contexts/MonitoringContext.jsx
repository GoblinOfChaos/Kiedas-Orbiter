import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { parseInventory } from '../lib/inventoryParser'
import { loadLocale } from '../lib/i18n'
import { buildDropIndex } from '../lib/dropsParser'
import { loadAcquisitionData } from '../lib/acquisitionData'
import { buildRecipeResultIndex, buildExaltedWeaponIndex, buildMarketIndex, buildAlwaysAvailableIndex, buildBundleIndex, buildSyndicateIndex, buildWikiSigilIndex, buildWikiVendorIndex, buildWikiTennoGenIndex, buildWikiBaroIndex, buildWikiBlueprintIndex, buildWikiResearchIndex, buildWikiResourceIndex, buildWikiPageAcquisitionIndex, buildWikiAcquisitionStatusIndex, buildRelicStateIndex, buildExportVendorIndex, buildGlyphSupplementIndex, buildExportComponentIndex } from '../lib/acquisitionInfo'
import { parseWorldstate, buildArchimedeaMap } from '../lib/worldstateParser'
import { getRelicRewards, getAllRelicRewards, getRewardInventoryContext, getPartObtainedStatus, parseRelicName, fuzzyMatchReward, getRelicEV } from '../lib/relicParser'
import { listen } from '@tauri-apps/api/event'
import { getPrice, getPricesBatch } from '../lib/marketEngine'
import { resolveNode, resolveMissionType, resolveChallenge, resolveAnyImage } from '../lib/warframeUtils'
import { evaluateNotifications } from '../lib/notificationManager'
import { loadWarframeItemsMaps } from '../lib/wfcdLoader'
import { fillDataGaps, logGapFillAudit } from '../lib/wfcdGapFill'
import { loadSettings, getSetting, setSetting } from '../lib/settings'
import { useUi } from './UiContext'


const OFFICIAL_API = 'https://api.warframe.com/cdn/worldState.php'
const ORACLE_API = 'https://api.warframe.com/cdn/worldState.php'
// Removed rogue third-party wrapper NIGHTWAVE_LIVE_API
function toMap(data, key) {
  if (!data) return {}
  let arr = data
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (key && data[key]) arr = data[key]
    else {
      const keys = Object.keys(data)
      if (keys.length === 1) arr = data[keys[0]]
    }
  }
  if (Array.isArray(arr)) {
    const map = {}
    for (const item of arr) {
      const k = item.uniqueName || item.ItemType || item.name || item.regionIndex
      if (k !== undefined) map[k] = item
    }
    return map
  }
  return arr || {}
}

const ARBY_TIERS = {
  SolNode450: "S",
  SolNode106: "S",
  SolNode25: "S",
  SolNode719: "S",
  SolNode64: "S",
  SolNode147: "A",
  SolNode23: "A",
  SolNode172: "A",
  SolNode167: "B",
  ClanNode24: "B",
  SolNode149: "B",
  ClanNode22: "B",
  ClanNode18: "B",
  SolNode164: "B",
  SolNode707: "B",
  SolNode211: "B",
  SolNode42: "B",
  SolNode195: "B",
  SolNode408: "B",
  SolNode402: "B",
  SolNode412: "C",
  ClanNode2: "C",
  SolNode46: "C",
  ClanNode8: "C",
  SolNode212: "C",
  SolNode22: "C",
  SolNode224: "C",
  SolNode26: "C",
  ClanNode6: "C",
  SolNode122: "C",
  SolNode72: "C",
  SolNode130: "D",
  ClanNode15: "D",
  SolNode85: "D",
  SolNode18: "D",
  SolNode305: "D",
  ClanNode4: "D",
  SolNode125: "D",
}

// ── arbys.txt helpers ──────────────────────────────────────────────────────────
function parseArbyLine(line, ERg, dict) {
  const parts = line.split(',')
  if (parts.length < 2) return null
  const tsSec = parseInt(parts[0], 10)
  const nodeKey = parts[1].trim()
  const entry = ERg[nodeKey]

  return {
    ts: tsSec * 1000,
    node: nodeKey,
    type: entry?.missionName || entry?.missionType || 'Unknown Mission'
  }
}

function getCurrentArby(arbys, ERg, dict) {
  if (!arbys) return null
  const now = Date.now()
  const lines = arbys.split('\n').map(l => l.trim()).filter(Boolean)
  let best = null
  for (const line of lines) {
    const entry = parseArbyLine(line, ERg, dict)
    if (!entry || isNaN(entry.ts)) continue
    const GRACE_PERIOD = 300000 // 5 minutes
    if (entry.ts <= (now + GRACE_PERIOD)) best = entry
    else break
  }
  return best
}

function getUpcomingArbies(arbys, ERg, dict, arbyTiers, count = 10) {
  if (!arbys) return []
  const now = Date.now()
  const lines = arbys.split('\n').map(l => l.trim()).filter(Boolean)
  const results = []
  for (const line of lines) {
    const entry = parseArbyLine(line, ERg, dict)
    if (entry && !isNaN(entry.ts) && entry.ts > now) {
      entry.grade = arbyTiers?.[entry.node] || 'F'
      results.push(entry)
      if (results.length >= count) break
    }
  }
  return results
}

const MonitoringContext = createContext(null)

export function MonitoringProvider({ children }) {
  const { t } = useUi()
  const [exportData, setExportData] = useState(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState('idle') // 'idle' | 'success' | 'error'
  const [autoStart, setAutoStartState] = useState(localStorage.getItem('autoStartMonitoring') === 'true')
  const autoStartRef = useRef(autoStart)

  const setAutoStart = useCallback((val) => {
    const v = !!val
    setAutoStartState(v)
    autoStartRef.current = v
    localStorage.setItem('autoStartMonitoring', String(v))
  }, [])

  const [lastUpdate, setLastUpdate] = useState(localStorage.getItem('lastUpdate') || null)
  const [rawInventory, setRawInventory] = useState(null)
  const rawInventoryRef = useRef(null)
  const exportDataRef = useRef(null)
  const [inventoryData, setInventoryData] = useState(undefined)
  const [isInventoryLoading, setIsInventoryLoading] = useState(false)

  // Load inventory history from disk (lazy - only when the History screen accesses it)
  const loadInventoryHistory = useCallback(async (opts = {}) => {
    try {
      const range = opts.range || 'all'
      const filter = opts.filter || 'all'
      const search = opts.search || ''
      const result = await invoke('load_inventory_history', { range, filter, search })
      return result || []
    } catch (e) {
      console.error('Failed to load inventory history:', e)
      return []
    }
  }, [])
  const allPricesRef = useRef({})
  const [allPrices, setAllPrices] = useState(() => {
    try {
      const data = localStorage.getItem('wfm_price_cache');
      if (data) {
        const cache = JSON.parse(data);
        const prices = {};
        for (const [key, val] of Object.entries(cache)) {
          if (val && typeof val.plat === 'number') prices[key] = val.plat;
        }
        if (Object.keys(prices).length > 0) return prices;
      }
      const engineRaw = localStorage.getItem('market_engine_prices');
      if (engineRaw) {
        const { data: entries } = JSON.parse(engineRaw);
        if (entries && entries.length > 0) return Object.fromEntries(entries);
      }
    } catch { /* ignore */ }
    return {};
  })
  useEffect(() => { allPricesRef.current = allPrices }, [allPrices])
  const [isPriceLoading, setIsPriceLoading] = useState(false)
  const [priceFetchProgress, setPriceFetchProgress] = useState(null)
  const [priceLastUpdated, setPriceLastUpdated] = useState(localStorage.getItem('wfm_price_last_updated') || null)
  const [worldState, setWorldState] = useState(null)
  const [bountyCycle, setBountyCycle] = useState(null)
  const [statusText, setStatusText] = useState('Initializing…')
  const [spIncursions, setSpIncursions] = useState(null)
  const [arbys, setArbys] = useState(null)
  const [descendiaDesc, setDescendiaDesc] = useState({})

  const [archonModifiers, setArchonModifiers] = useState(null)
  const [arbitrationModifiers, setArbitrationModifiers] = useState(null)
  const intervalRef = useRef(null)
  const busyRef = useRef(false)
  const notifiedRef = useRef({})
  const priceFetchRef = useRef(false)
  const processingRef = useRef(false)
  const isMonitoringRef = useRef(false)
  const hasCachedDataRef = useRef(false)
  const hasLoadedOnceRef = useRef(false)
  const [cardImagesPath, setCardImagesPath] = useState('')
  const [fixProgress, setFixProgress] = useState({ checking: true })
  const cardInitStarted = useRef(false)
  const startedRef = useRef(false)
  const localeRef = useRef('en')
  const i18nRef = useRef(null)

  // ── Derived lookup maps ──────────────────────────────────────────────────────
  const dict = useMemo(() => exportData?.dict ?? exportData?.['dict.en'] ?? {}, [exportData])
  const suppDict = useMemo(() => exportData?.['supp-dict'] ?? exportData?.['supp-dict-en'] ?? {}, [exportData])
  const archimedeaMap = useMemo(() => buildArchimedeaMap(dict, suppDict), [dict, suppDict])
  const EC = useMemo(() => toMap(exportData?.ExportChallenges, 'ExportChallenges'), [exportData])
  const ERg = useMemo(() => {
    const data = exportData?.ExportRegions
    if (!data) return {}
    const map = {}
    const process = (r) => {
      if (!r || typeof r !== 'object') return
      if (r.uniqueName) map[r.uniqueName] = r
      if (r.name) map[r.name] = r
      if (r.regionIndex !== undefined) map[`SolNode${r.regionIndex}`] = r
    }
    if (Array.isArray(data)) {
      data.forEach(process)
    } else if (typeof data === 'object') {
      if (Array.isArray(data.ExportRegions)) {
        data.ExportRegions.forEach(process)
      } else {
        Object.entries(data).forEach(([k, v]) => {
          if (k !== 'ExportRegions') map[k] = v
          process(v)
        })
      }
    }
    return map
  }, [exportData])
  const ES = useMemo(() => exportData?.ExportSyndicates ?? {}, [exportData])
  const ENW = useMemo(() => toMap(exportData?.ExportNightwave, 'rewards'), [exportData])
  const ENWRawRewards = useMemo(() => exportData?.ExportNightwave?.rewards || [], [exportData])
  const ExportImages = useMemo(() => exportData?.ExportImages ?? {}, [exportData])
  const ExportTextIcons = useMemo(() => exportData?.ExportTextIcons ?? {}, [exportData])

  // Mastery progress (0-100) computed once and shared between the notification
  // logic and Mastery.jsx so neither has to recalculate independently.
  const masteryProgress = useMemo(() => {
    if (!inventoryData) return 0
    const currentRank = inventoryData.account?.mastery_rank
    if (currentRank == null) return 0
    const getXPForRank = (r) => r <= 0 ? 0 : r <= 30 ? r * r * 2500 : 2250000 + (r - 30) * 147500
    const getXPNeededFor = (r) => r <= 30 ? (2 * r - 1) * 2500 : 147500
    const itemCats = ['warframes', 'primary', 'secondary', 'melee', 'kitgunChambers', 'zawStrikes', 'amps',
      'sentinels', 'companion_weapons', 'moaHeads', 'houndHeads', 'beasts',
      'archwings', 'archweapons', 'necramechs', 'plexus', 'kdrives']
    // Real export/inventory data can legitimately produce two array entries
    // that resolve to the "same" mastery item by display name (e.g. the
    // Grimoire family) - Mastery.jsx's own getStats() collapses these before
    // summing so its total doesn't double-count them; this computation never
    // did, so the progress bar (driven by this value) could disagree with
    // the "X mastery | Y left" label right next to it, which reads the
    // deduped total from Mastery.jsx.
    const modularCats = new Set(['kitgunChambers', 'zawStrikes', 'amps', 'moaHeads', 'houndHeads', 'beasts', 'kdrives'])
    const dedupedXP = (cat) => {
      const items = inventoryData[cat] ?? []
      const best = new Map()
      for (const item of items) {
        const key = modularCats.has(cat) ? item.unique_name : (item.name || '').trim().toLowerCase()
        const prev = best.get(key)
        if (!prev || (item.mastery_xp || 0) > (prev.mastery_xp || 0)) best.set(key, item)
      }
      return [...best.values()].reduce((s, i) => s + (i.mastery_xp || 0), 0)
    }
    const itemXP = itemCats.reduce((sum, cat) => sum + dedupedXP(cat), 0)
    const intrinsicXP = (inventoryData.intrinsics ?? []).reduce((s, i) => s + (i.mastery_xp || 0), 0)
    const sc = inventoryData.starchart ?? {}
    const totalXP = itemXP + intrinsicXP + (sc.origin_xp ?? 0) + (sc.steel_path_xp ?? 0)
    const xpAtCurrent = getXPForRank(currentRank)
    const xpNeeded = getXPNeededFor(currentRank + 1)
    const xpIntoRank = Math.max(0, totalXP - xpAtCurrent)
    return xpNeeded > 0 ? Math.min(100, (xpIntoRank / xpNeeded) * 100) : 100
  }, [inventoryData])

  const { EI, nameToImage, uniqueNameToName } = useMemo(() => {
    if (!exportData || !dict) return { EI: {}, nameToImage: {}, uniqueNameToName: {} }
    const tableNames = [
      'ExportWeapons', 'ExportWarframes', 'ExportSentinels',
      'ExportResources', 'ExportArcanes', 'ExportUpgrades',
      'ExportAvionics', 'ExportRelics', 'ExportSyndicates',
      'ExportNightwave', 'ExportBoosterPacks', 'ExportRecipes', 'ExportCustoms', 'ExportGear', 'ExportFlavour', 'ExportBundles',
      // warframe-items pre-resolved maps
      'WI_Warframes', 'WI_Weapons', 'WI_Sentinels',
      'WI_Upgrades', 'WI_Arcanes', 'WI_Resources',
      'WI_Relics', 'WI_Gear', 'WI_Customs',
      'WI_Skins', 'WI_Sigils', 'WI_Glyphs', 'WI_Fish',
    ]
    const EI = {}
    const nameToImage = {}
    const uniqueNameToName = {}
    const toBrowseWf = (p) => {
      if (!p) return null
      if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('asset-cache://') || p.startsWith('asset://') || p.startsWith('data:')) return p
      const clean = p.startsWith('/') ? p : '/' + p
      const hash = exportData.ExportImages?.[clean]?.contentHash
      return hash ? `asset-cache://content.warframe.com/PublicExport${clean}!${hash}` : `asset-cache://browse.wf${clean}`
    }

    const indexEntry = (e, k, t) => {
      const un = e.uniqueName || e.ItemType || k
      if (!un) return

      let iconPath = e.icon ?? e.texture
      let nameKey = e.name ?? e.displayName

      if (t === 'ExportRecipes' && e.resultType) {
        // For recipes, resolve the name and icon from the result item
        nameKey = uniqueNameToName[e.resultType] || e.resultType
        if (!iconPath) {
          const resultUn = e.resultType
          iconPath = exportData.ExportImages?.[resultUn] || EI[resultUn]
          // Strip asset-cache://browse.wf/ prefix if it was already resolved
          if (typeof iconPath === 'string' && iconPath.startsWith('asset-cache://browse.wf')) {
            iconPath = iconPath.replace('asset-cache://browse.wf', '')
          }
        }
      }

      if (t === 'ExportBundles' && e.components?.length && !exportData.ExportImages?.[iconPath]?.contentHash) {
        // Bundle icons sometimes lack a contentHash (newer bundles aren't
        // mirrored); fall back to the first component whose icon resolves.
        const customs = exportData.ExportCustoms || {}
        for (const c of e.components) {
          const cType = c.typeName || c.ItemType || ''
          const entry = customs[cType] || customs[cType.replace('/StoreItems/', '/')]
          const cIcon = entry?.icon
          if (cIcon && exportData.ExportImages?.[cIcon]?.contentHash) { iconPath = cIcon; break }
        }
      }

      const url = toBrowseWf(iconPath ?? '')
      // warframe-items supplies wiki.warframe.com thumbnails, but several
      // recently added items still point at stale thumbnail names (notably
      // Cyte-09 and Jade). Keep the hashed DE export image indexed earlier
      // instead of allowing the later WI table to replace it with a 404 URL.
      const isStaleWikiThumbnail = typeof url === 'string' &&
        /^https?:\/\/(?:www\.)?wiki\.warframe\.com\//i.test(url)
      if (url && (!EI[un] || !isStaleWikiThumbnail)) EI[un] = url

      uniqueNameToName[un] = nameKey
      const locKey = uniqueNameToName[un]
      if (locKey) {
        const resolved = (dict[locKey] || dict['/' + locKey] || '').replace(/<[^>]*>/g, '').trim()
        if (resolved && !resolved.startsWith('/') && (!nameToImage[resolved.toLowerCase()] || !isStaleWikiThumbnail)) {
          if (url) nameToImage[resolved.toLowerCase()] = url
        }
      }
    }

    tableNames.forEach(tbl => {
      const data = exportData[tbl]
      if (!data) return
      if (Array.isArray(data)) data.forEach(e => indexEntry(e, null, tbl))
      else if (typeof data === 'object') {
        const nested = data[tbl] ?? (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object' ? Object.values(data)[0] : null)
        if (Array.isArray(nested)) nested.forEach(e => indexEntry(e, null, tbl))
        else Object.entries(data).forEach(([k, v]) => indexEntry(v, k, tbl))
      }
    })

    // wfcd supplement fallback: English display-name → image keys, so items
    // whose localized dict key is missing (e.g. FR Dual Toxocyst/Dual Ichor
    // base names) still resolve. Localized keys above take priority.
    const wiSupp = exportData?.WI_Supplement?.nameToImage
    if (wiSupp) {
      for (const [k, v] of Object.entries(wiSupp)) {
        if (nameToImage[k] === undefined) nameToImage[k] = v
      }
    }
    return { EI, nameToImage, uniqueNameToName }
  }, [exportData, dict])

  const globalRewardPool = useMemo(() => getAllRelicRewards(exportData, localeRef.current), [exportData, localeRef.current])

  const dropIndex = useMemo(() => buildDropIndex(exportData), [exportData])

  const recipeResultIndex = useMemo(() => buildRecipeResultIndex(exportData), [exportData])
  const exaltedWeaponIndex = useMemo(() => buildExaltedWeaponIndex(exportData), [exportData])

  const marketIndex = useMemo(() => buildMarketIndex(exportData), [exportData])
  const alwaysAvailableIndex = useMemo(() => buildAlwaysAvailableIndex(exportData), [exportData])

  const bundleIndex = useMemo(() => buildBundleIndex(exportData), [exportData])

  const syndicateIndex = useMemo(() => buildSyndicateIndex(exportData), [exportData])

  const wikiSigilIndex = useMemo(() => buildWikiSigilIndex(exportData?.WikiSigilAcquisition), [exportData])

  const wikiVendorIndex = useMemo(() => buildWikiVendorIndex(exportData?.WikiVendorAcquisition), [exportData])
  const wikiTennoGenIndex = useMemo(() => buildWikiTennoGenIndex(exportData?.WikiTennoGenAcquisition), [exportData])
  const wikiBaroIndex = useMemo(() => buildWikiBaroIndex(exportData?.WikiBaroAcquisition), [exportData])
  const wikiBlueprintIndex = useMemo(() => buildWikiBlueprintIndex(exportData?.WikiBlueprintAcquisition), [exportData])
  const wikiResearchIndex = useMemo(() => buildWikiResearchIndex(exportData?.WikiResearchAcquisition), [exportData])
  const wikiResourceIndex = useMemo(() => buildWikiResourceIndex(exportData?.WikiResourceAcquisition), [exportData])
  const wikiPageAcquisitionIndex = useMemo(() => buildWikiPageAcquisitionIndex(exportData?.WikiPageAcquisition), [exportData])
  const wikiAcquisitionStatusIndex = useMemo(() => buildWikiAcquisitionStatusIndex(exportData?.WikiAcquisitionStatus), [exportData])
  const relicStateIndex = useMemo(() => buildRelicStateIndex(exportData), [exportData])
  const exportVendorIndex = useMemo(() => buildExportVendorIndex(exportData), [exportData])
  const glyphSupplementIndex = useMemo(() => buildGlyphSupplementIndex(exportData?.BrowseWfGlyphs), [exportData])
  const exportComponentIndex = useMemo(() => buildExportComponentIndex(exportData), [exportData])

  // Audio unlock (bypass autoplay policy)
  useEffect(() => {
    const unlockAudio = () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctx.suspend().then(() => console.log('[Audio] Unlocked')).catch(e => console.warn('[Audio] unlock failed', e))
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
    window.addEventListener('click', unlockAudio)
    window.addEventListener('keydown', unlockAudio)
    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [])

  // ── Notification Manager evaluator ──────────────────────────────────────────
  const notifInitRef = useRef(false)

  const [notificationHistory, setNotificationHistory] = useState([])

  useEffect(() => {
    const raw = getSetting('notifications', [])
    if (!Array.isArray(raw) || raw.length === 0) return
    // Wait for real worldstate data before evaluating
    if (!worldState) return
    if (!notifiedRef.current.notifMgr) notifiedRef.current.notifMgr = new Set()

    const position = getSetting('notif_position', 'top-right')
    const lastFired = getSetting('notification_last_fired', {})
    let updatedLastFired = false

    // On first real data, mark everything as seen - no startup flood
    if (!notifInitRef.current) {
      const results = evaluateNotifications(raw, { inventoryData, worldstate: worldState, arbys, ERg, dict, ES, EC, bountyCycle, t })
      for (const r of results) {
        notifiedRef.current.notifMgr.add(`${r.notifId}::${r.title}::${r.message}`)
      }
      // Was never set, so every subsequent run of this effect re-took this
      // same "first run" branch forever - the actual firing logic below was
      // unreachable and no notification-manager rule (fissure, arbitration,
      // void trace, syndicate, foundry, mastery, checklist, sale, bounty)
      // could ever fire.
      notifInitRef.current = true
      return
    }
    const results = evaluateNotifications(raw, { inventoryData, worldstate: worldState, arbys, ERg, dict, ES, EC, bountyCycle, t })

    // Fire each new notification individually; play sound in main window first
    for (const r of results) {
      const dedupKey = `${r.notifId}::${r.title}::${r.message}`
      const notifConfig = raw.find(n => n.id === r.notifId)
      const cooldownMin = notifConfig?.config?.cooldown
      const cooldownMs = (typeof cooldownMin === 'number' ? cooldownMin : 0) * 60 * 1000
      
      const lastTime = lastFired[dedupKey] || 0
      const now = Date.now()

      if (!notifiedRef.current.notifMgr.has(dedupKey) || (cooldownMs > 0 && now - lastTime >= cooldownMs)) {
        notifiedRef.current.notifMgr.add(dedupKey)
        
        if (cooldownMs > 0) {
          lastFired[dedupKey] = now
          updatedLastFired = true
        }

        setNotificationHistory(prev => [{ ...r, timestamp: now }, ...prev])

        // Play audio via Rust backend (no WebKit/GStreamer dependency)
        const sound = getSetting('notif_sound', 'notification1.wav')
        invoke('play_notification_sound', { sound }).catch(console.error)
        invoke('show_notification', {
          title: r.title,
          message: r.message,
          image: r.image || '',
          position,
          no_focus: true,
          silent: true, // Sound already played from main window
        }).catch(console.error)
      }
    }

    if (updatedLastFired) {
      setSetting('notification_last_fired', lastFired)
    }

    // Reset dedup for notifications that no longer match
    const activeKeys = new Set(results.map(r => `${r.notifId}::${r.title}::${r.message}`))
    for (const key of notifiedRef.current.notifMgr) {
      if (!activeKeys.has(key)) {
        notifiedRef.current.notifMgr.delete(key)
      }
    }
  }, [inventoryData, worldState, arbys, ERg, dict, ES])

  // Wire up helpers for notificationManager.js and populate checklist tasks
  // (minimal id/label so the dropdown works even before visiting Checklist page)
  useEffect(() => {
    window.__KRONOS_NOTIF_HELPERS = { getCurrentArby, getUpcomingArbies, ARBY_TIERS, resolveNode }
    window.__checklistTasks = [
      { id: 'baro', label: "Baro Ki'Teer", labelKey: 'ui.dashboard.baro_kiteer' },
      { id: 'sortie', label: 'Sortie', labelKey: 'ui.dashboard.sortie' },
      { id: 'foundry', label: 'Check Foundry', labelKey: 'checklist.task_foundry' },
      { id: 'syndicates', label: 'Syndicate Standing', labelKey: 'checklist.task_syndicates' },
      { id: 'focus', label: 'Daily Focus Cap', labelKey: 'checklist.task_focus' },
      { id: 'steel_path', label: 'Steel Path Incursions', labelKey: 'ui.dashboard.sp_incursions' },
      { id: 'acrithis_daily', label: 'Acrithis Daily', labelKey: 'checklist.task_acrithis_daily' },
      { id: 'ticker', label: "Ticker's Railjack Crew", labelKey: 'checklist.task_ticker' },
      { id: 'marie', label: "Marie's Shop", labelKey: 'checklist.task_marie' },
      { id: 'grandmother', label: "Grandmother's Tokens", labelKey: 'checklist.task_grandmother' },
      { id: 'yonta_daily', label: 'Yonta: Daily Voidplumes', labelKey: 'checklist.task_yonta_daily' },
      { id: 'voca', label: 'Loid: Voca', labelKey: 'checklist.task_voca' },
      { id: 'nightwave', label: 'Nightwave Missions', labelKey: 'checklist.task_nightwave' },
      { id: 'nightwave_spend', label: 'Nightwave Shop', labelKey: 'checklist.task_nightwave_spend' },
      { id: 'ayatan', label: "Maroo's Ayatan Hunt", labelKey: 'checklist.task_ayatan' },
      { id: 'clem', label: 'Help Clem', labelKey: 'checklist.task_clem' },
      { id: 'narmer', label: 'Help Kahl: Break Narmer', labelKey: 'checklist.task_narmer' },
      { id: 'archon', label: 'Archon Hunt', labelKey: 'ui.dashboard.archon_hunt' },
      { id: 'circuit', label: 'Duviri Circuit', labelKey: 'checklist.task_circuit' },
      { id: 'circuit_sp', label: 'Duviri Circuit SP', labelKey: 'checklist.task_circuit_sp' },
      { id: 'pulses', label: 'Pulses: Netracell & Archimedea', labelKey: 'checklist.task_pulses' },
      { id: 'calendar', label: '1999 Calendar', labelKey: 'checklist.task_calendar' },
      { id: 'invigorations', label: 'Helminth Invigoration', labelKey: 'checklist.task_invigorations' },
      { id: 'descendia', label: 'Descendia', labelKey: 'checklist.task_descendia' },
      { id: 'descendia_sp', label: 'Descendia SP', labelKey: 'checklist.task_descendia_sp' },
      { id: 'palladino', label: "Palladino's Shop", labelKey: 'checklist.task_palladino' },
      { id: 'yonta_weekly', label: 'Yonta: Weekly Shop', labelKey: 'checklist.task_yonta_weekly' },
      { id: 'acrithis_weekly', label: 'Acrithis Weekly', labelKey: 'checklist.task_acrithis_weekly' },
      { id: 'teshin', label: 'Teshin Shop', labelKey: 'checklist.task_teshin' },
      { id: 'bird3', label: 'Bird 3 Shop', labelKey: 'checklist.task_bird3' },
      { id: 'nightcap', label: 'Nightcap Shop', labelKey: 'checklist.task_nightcap' },
    ]
    return () => {
      window.__KRONOS_NOTIF_HELPERS = null
      delete window.__checklistTasks
    }
  }, [])



  const applyRaw = useCallback((raw, ts, exports) => {
    if (!raw) return
    setRawInventory(raw)
    rawInventoryRef.current = raw
    const ed = exports || exportDataRef.current || exportData
    if (!ed) return
    // Yield frame before heavy parseInventory to prevent UI freeze
    setTimeout(() => {
      try {
        const parsed = parseInventory(raw, ed, dict, localeRef.current, i18nRef.current)
        setInventoryData(parsed || null)
      } catch (err) {
        setInventoryData(null)
      }
      const tsStr = String(ts ?? Date.now())
      setLastUpdate(tsStr)
      localStorage.setItem('lastUpdate', tsStr)
      invoke('relay_event', { event: 'sidebar-data-updated', payload: { ts: tsStr } }).catch(() => {})
    }, 0)
  }, [exportData, dict])
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    ; (async () => {
      await loadSettings()
      localeRef.current = getSetting('gameLocale', 'en')
      i18nRef.current = await loadLocale(localeRef.current)
      setStatusText('Checking updates & assets…')
      // Populates the item/recipe/wiki-acquisition indices that
      // getAcquisitionInfo() reads from (itemIndex, componentIndex,
      // wikiAcquisitionIndex). Every acquisition-drawer screen imports
      // loadAcquisitionData but none of them ever called it, so those
      // indices stayed null for the whole session and every lookup that
      // depended on them (getItemDrops, getItemRecipe, isCraftable) always
      // came back empty. Fire it here once, in parallel, so it's ready by
      // the time any drawer opens.
      loadAcquisitionData().catch((err) => console.error('loadAcquisitionData failed', err))
      const [updatesRes, exportsRes, mediaRes, pricerRes, spiRes, arbRes, descRes] = await Promise.allSettled([
        invoke('check_exports', { locale: localeRef.current, force: false }),
        invoke('load_all_exports', { locale: localeRef.current }),
        invoke('check_media_assets'),
        invoke('check_pricer_models'),
        invoke('load_txt_file', { name: 'sp-incursions.txt' }),
        invoke('load_txt_file', { name: 'arbys.txt' }),
        invoke('load_txt_file', { name: 'descendia.txt' }),
      ])

      const exports = exportsRes.status === 'fulfilled' ? exportsRes.value : null
      const spiText = spiRes.status === 'fulfilled' ? spiRes.value : null
      const arbText = arbRes.status === 'fulfilled' ? arbRes.value : null
      // Retired in v0.8: ExportUpgrades_fixed.json patched file — the DE
      // manifest now ships levelStats for every locale including English
      // (downloaded as ExportUpgrades_{locale}.json by check_exports).
      if (exports) {
        try {
          for (const [fname, key] of [
            ['ExportAvionics_fixed.json', 'ExportAvionicsFixed'],
            ['mod-icon-map.json', 'ModIconMap'],
            ['card-overlay-map.json', 'CardOverlayMap'],
            ['peely-pix-map.json', 'PeelyPixMap'],
            ['peely-pix-names.json', 'PeelyPixNames'],
          ]) {
            const bytes = await invoke('read_file_bytes', { relative: `data/assets/data/${fname}` }).catch(() => null)
            if (bytes) {
              exports[key] = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))
            }
          }
          const acquisitionBytes = await invoke('read_file_bytes', { relative: 'data/assets/data/warframe-items-acquisition.json' }).catch(() => null)
          if (acquisitionBytes) {
            exports.AcquisitionItems = JSON.parse(new TextDecoder().decode(new Uint8Array(acquisitionBytes)))
          }
          const wikiSigilBytes = await invoke('read_file_bytes', { relative: 'data/assets/data/wiki-sigils-acquisition.json' }).catch(() => null)
          if (wikiSigilBytes) {
            exports.WikiSigilAcquisition = JSON.parse(new TextDecoder().decode(new Uint8Array(wikiSigilBytes)))
          }
          const glyphBytes = await invoke('read_file_bytes', { relative: 'data/assets/data/browse-wf-glyphs.json' }).catch(() => null)
          if (glyphBytes) {
            exports.BrowseWfGlyphs = JSON.parse(new TextDecoder().decode(new Uint8Array(glyphBytes)))
          }
          const resourceBytes = await invoke('read_file_bytes', { relative: 'data/assets/data/wiki-resources-acquisition.json' }).catch(() => null)
          if (resourceBytes) {
            exports.WikiResourceAcquisition = JSON.parse(new TextDecoder().decode(new Uint8Array(resourceBytes)))
          }
          const pageAcquisitionBytes = await invoke('read_file_bytes', { relative: 'data/assets/data/wiki-page-acquisition.json' }).catch(() => null)
          if (pageAcquisitionBytes) {
            exports.WikiPageAcquisition = JSON.parse(new TextDecoder().decode(new Uint8Array(pageAcquisitionBytes)))
          }
          const statusBytes = await invoke('read_file_bytes', { relative: 'data/assets/data/wiki-acquisition-status.json' }).catch(() => null)
          if (statusBytes) {
            exports.WikiAcquisitionStatus = JSON.parse(new TextDecoder().decode(new Uint8Array(statusBytes)))
          }
          for (const [file, key] of [['wiki-vendors-acquisition.json', 'WikiVendorAcquisition'], ['wiki-tennogen-acquisition.json', 'WikiTennoGenAcquisition'], ['wiki-baro-acquisition.json', 'WikiBaroAcquisition'], ['wiki-blueprints-acquisition.json', 'WikiBlueprintAcquisition'], ['wiki-research-acquisition.json', 'WikiResearchAcquisition']]) {
            const bytes = await invoke('read_file_bytes', { relative: `data/assets/data/${file}` }).catch(() => null)
            if (bytes) exports[key] = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))
          }
          // Hand-reviewed additions for real cosmetics missing from
          // export-plus (e.g. Mesa's entire Heirloom set) - see
          // cosmetic-catalog-additions.json's own comment. Unlike
          // wfcdGapFill.js's audit pipeline, every entry here was
          // individually verified, so this merges unconditionally.
          const cosmeticAdditionsBytes = await invoke('read_file_bytes', { relative: 'data/assets/data/cosmetic-catalog-additions.json' }).catch(() => null)
          if (cosmeticAdditionsBytes) {
            const additions = JSON.parse(new TextDecoder().decode(new Uint8Array(cosmeticAdditionsBytes)))
            delete additions._comment
            // Only fill in keys export-plus genuinely lacks - if it catches
            // up on its own later, its real entry must win, not this static
            // stand-in.
            const customs = { ...(exports.ExportCustoms || {}) }
            for (const [un, entry] of Object.entries(additions)) {
              if (!customs[un]) customs[un] = entry
            }
            exports.ExportCustoms = customs
          }
        } catch { }
      }

      // Fill gaps in the main export data (which can be ~a month behind the
      // live game) using WFCD's live-fetched data, before anything ever
      // reads exports.ExportWeapons/ExportCustoms. See wfcdGapFill.js for
      // the exact-match-only safety rules - this never overrides or
      // duplicates anything that already exists, only adds what's
      // genuinely missing. Wrapped defensively: if this throws for any
      // reason, exports itself is untouched and we proceed exactly as
      // before this feature existed.
      let filledExports = exports
      if (exports) {
        try {
          const { exportData: filled, audit } = fillDataGaps(exports)
          filledExports = filled
          logGapFillAudit(audit)
        } catch (err) {
          console.error('WFCD gap-fill failed, continuing without it:', err)
        }
      }

      // Set exports immediately (no wfcd blocking) — defer the wfcd load to
      // the background so the shell UI renders without a 15s hitch.
      setExportData(filledExports)
      exportDataRef.current = filledExports

      if (filledExports) {
        loadWarframeItemsMaps().then(({ maps: wiMaps, supplement: wiSupplement }) => {
          // Spread from filledExports, not exports - otherwise this silently
          // reverts ExportWeapons/ExportCustoms back to their pre-gap-fill
          // state the moment the wfcd name/image supplement lands.
          const enhanced = { ...filledExports, ...wiMaps }
          enhanced.uniqueNameToName = { ...enhanced.uniqueNameToName, ...wiSupplement.uniqueNameToName }
          enhanced.nameToImage = { ...enhanced.nameToImage, ...wiSupplement.nameToImage }
          enhanced.WI_Supplement = wiSupplement
          setExportData(enhanced)
          exportDataRef.current = enhanced
          // wfcd English names (WI_Weapons) attach in the background after
          // the initial parse, so riven weapon_name_en fell back to code
          // paths ("CrpHeavyRifle") which never match the price model.
          // Re-parse with the enhanced exports once wfcd has landed.
          if (rawInventoryRef.current) {
            applyRaw(rawInventoryRef.current, undefined, enhanced)
          }
        })
      }
      setSpIncursions(spiText || '')
      setArbys(arbText || '')
      // Parse descendia descriptions
      const descText = descRes.status === 'fulfilled' ? descRes.value : null
      if (descText) {
        const descMap = {}
        for (const line of descText.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const sepIdx = trimmed.indexOf(': ')
          if (sepIdx > 0) {
            descMap[trimmed.slice(0, sepIdx)] = trimmed.slice(sepIdx + 2)
          }
        }
        setDescendiaDesc(descMap)
      }

      // Sync monitoring state with other windows
      invoke('get_monitoring_active').then((active) => {
        if (active) setIsMonitoring(true)
      }).catch(() => {})

      setStatusText('Loading inventory…')
      const invRes = await Promise.allSettled([invoke('load_cached_inventory')])

      if (invRes[0].status === 'fulfilled' && invRes[0].value) {
        const result = invRes[0].value
        applyRaw(result[0], result[1])
        hasCachedDataRef.current = true
        setStatusText('Loaded cached data')
      } else {
        hasCachedDataRef.current = false
        setStatusText('No cached data – start syncing in Settings')
        setInventoryData(null)
      }

      if (autoStartRef.current) {
        startMonitoring().catch(() => {})
      }

      // Log scanner autostart: the Settings screen's toggle only starts/stops
      // the scanner on user interaction and unmounts when navigating away, so
      // the saved "on" state was never actually resumed on app launch. Mirror
      // inventory-sync autostart above, at the app root, so it happens exactly
      // once regardless of which screen is active. Settings are already
      // loaded by this point (awaited above), so getSetting is safe to read.
      if (getSetting('fissure_overlay_enabled')) {
        invoke('start_log_scanner').catch(() => {})
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  const fetchWorldstate = useCallback(async () => {
    const locale = localeRef.current
    // Piggybacks on this existing 60s poll rather than a new timer -
    // refresh_vault_trader() is a cheap local-file check (only downloads
    // anything when Varzia's rotation has actually expired, roughly every
    // two weeks). Without this, a session left running continuously
    // through a rotation changeover would never notice: check_exports'
    // own expiry check only ever runs once, at app startup.
    invoke('refresh_vault_trader').then(async (updated) => {
      if (!updated) return
      try {
        const bytes = await invoke('read_file_bytes', { relative: 'data/export/VaultTrader.json' })
        const vaultTrader = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))
        setExportData((prev) => prev ? { ...prev, VaultTrader: vaultTrader } : prev)
        if (exportDataRef.current) exportDataRef.current = { ...exportDataRef.current, VaultTrader: vaultTrader }
      } catch (err) {
        console.error('Failed to reload refreshed VaultTrader.json:', err)
      }
    }).catch(() => {})
    try {
      const wsStr = await invoke('fetch_url', { url: OFFICIAL_API }).catch(() => null)
      const ws = wsStr ? JSON.parse(wsStr) : null
      if (ws && dict) {
        const challengeProgress = new Map()
        if (Array.isArray(rawInventoryRef.current?.ChallengeProgress)) {
          rawInventoryRef.current.ChallengeProgress.forEach((cp) => {
            if (cp.Name && typeof cp.Progress === 'number') challengeProgress.set(cp.Name, cp.Progress)
          })
        }
        const parsed = parseWorldstate(ws, { dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ExportImages, ExportUpgrades: exportData?.ExportUpgrades, ExportRecipes: exportData?.ExportRecipes, ExportKeys: exportData?.ExportKeys, archimedeaMap, descendiaDesc, challengeProgress, locale })
        setWorldState(parsed)
      }
    } catch (err) {
      console.error('fetchWorldstate: failed to parse worldstate', err)
    }
  }, [dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ExportImages, archimedeaMap, descendiaDesc])

  useEffect(() => {
    if (Object.keys(dict || {}).length > 0) {
      fetchWorldstate()
      const iv = setInterval(fetchWorldstate, 60000)
      return () => clearInterval(iv)
    }
  }, [fetchWorldstate, dict])

const [nextRetryAt, setNextRetryAt] = useState(0)

const hasCachedData = useCallback(async () => {
  if (hasCachedDataRef.current) return true
  try {
    const result = await invoke('sidebar_load_inventory')
    return !!result?.inventory
  } catch { return false }
}, [])
  const callApiHelper = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    // Only show the loading skeleton for the very first load - periodic
    // background refreshes (every startMonitoring interval) update data
    // silently. Toggling this on every refresh was swapping every screen's
    // whole content tree in and out, which reset scroll position on every
    // periodic sync.
    if (!hasLoadedOnceRef.current) setIsInventoryLoading(true)
    try {
      const raw = await invoke('call_api_helper')
      if (raw && typeof raw === 'object' && raw.Suits) {
        applyRaw(raw, Date.now())
        setMonitorResult('success')
        setStatusText('Syncing active')
        return 'success'
      }
      setMonitorResult('error')
      setStatusText('Inventory fetch returned no data')
      return 'error'
    } catch {
      if (await hasCachedData()) {
        hasCachedDataRef.current = true
        setMonitorResult('cached')
        setStatusText('Game not running, using cached data')
        return 'cached'
      }
      setMonitorResult('error')
      setStatusText('Could not connect to Warframe')
      return 'error'
    } finally {
      busyRef.current = false
      hasLoadedOnceRef.current = true
      setIsInventoryLoading(false)
    }
  }, [applyRaw, hasCachedData])

  const startMonitoring = useCallback(async (intervalMs = 180_000) => {
    if (isMonitoring) return
    setIsMonitoring(true)
    const result = await callApiHelper()
    const msg = result === 'success' ? 'Syncing active' : result === 'cached' ? 'Game not running, using cached data' : result
    setNextRetryAt(Date.now() + intervalMs)
    invoke('set_monitoring_active', { active: true, result, statusText: msg }).catch(() => {})
    intervalRef.current = setInterval(async () => {
      setNextRetryAt(Date.now() + intervalMs)
      const r = await callApiHelper()
      const msg2 = r === 'success' ? 'Syncing active' : r === 'cached' ? 'Game not running, using cached data' : r
      invoke('set_monitoring_active', { active: true, result: r, statusText: msg2 }).catch(() => {})
    }, intervalMs)
  }, [isMonitoring, callApiHelper])

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsMonitoring(false)
    setNextRetryAt(0)
    setMonitorResult('idle')
    setStatusText('Syncing stopped')
    invoke('set_monitoring_active', { active: false, result: 'idle', statusText: 'Syncing stopped' }).catch(() => {})
  }, [])

  const manualRefresh = useCallback(async () => {
    const wasMonitoring = intervalRef.current !== null
    const result = await callApiHelper()
    if (!wasMonitoring) {
      setMonitorResult('idle')
      setStatusText('Not syncing')
    }
    return result
  }, [callApiHelper])

  // ── Pre-fetch prices after inventory loads ─────────────────────
  useEffect(() => {
    if (!inventoryData) return
    if (priceFetchRef.current) return
    priceFetchRef.current = true
    const items = []
    const seen = new Set()

    for (const m of (inventoryData.mods ?? [])) {
      if (!seen.has(m.unique_name)) {
        items.push({ uniqueName: m.unique_name, name: m.name, maxRank: m.max_rank ?? null })
        seen.add(m.unique_name)
      }
    }
    for (const a of (inventoryData.arcanes ?? [])) {
      if (!seen.has(a.unique_name)) {
        items.push({ uniqueName: a.unique_name, name: a.name })
        seen.add(a.unique_name)
      }
    }
    for (const set of Object.values(inventoryData.primeSets ?? {})) {
      for (const part of (set.parts ?? [])) {
        if (!seen.has(part.unique_name)) {
          items.push({ uniqueName: part.unique_name, name: part.name })
          seen.add(part.unique_name)
        }
      }
      if (set.setPath && !seen.has(set.setPath)) {
        items.push({ uniqueName: set.setPath, name: `${set.name} Set` })
        seen.add(set.setPath)
      }
    }

    // Include relics and their rewards in the same batch
    for (const r of (inventoryData.relics ?? [])) {
      if (r.unique_name && !seen.has(r.unique_name)) {
        items.push({ uniqueName: r.unique_name, name: r.name })
        seen.add(r.unique_name)
      }
      for (const rew of (r.rewards ?? [])) {
        if (!seen.has(rew.uniqueName)) {
          items.push({ uniqueName: rew.uniqueName, name: rew.name })
          seen.add(rew.uniqueName)
        }
      }
    }
    if (items.length > 0) {
      setIsPriceLoading(true)
      setPriceFetchProgress({ current: 0, total: items.filter(i => i.name && !/\bForma\b/.test(i.name)).length })
      const onProgress = (p) => setPriceFetchProgress(p)
      getPricesBatch(items, onProgress).then(({ results, hadNetworkActivity }) => {
        setAllPrices(results)
        setIsPriceLoading(false)
        setPriceFetchProgress(null)
        priceFetchRef.current = false
        const now = Date.now()
        setPriceLastUpdated(now)
        localStorage.setItem('wfm_price_last_updated', String(now))
      }).catch(() => { setAllPrices({}); setIsPriceLoading(false); setPriceFetchProgress(null); priceFetchRef.current = false })
    } else {
      priceFetchRef.current = false
    }
  }, [inventoryData])

  const refreshPrices = useCallback(() => {
    if (priceFetchRef.current) return
    priceFetchRef.current = true
    localStorage.removeItem('wfm_price_cache')
    if (!inventoryData) { priceFetchRef.current = false; return }
    const items = []
    const seen = new Set()
    for (const m of (inventoryData.mods ?? [])) {
      if (!seen.has(m.unique_name)) {
        items.push({ uniqueName: m.unique_name, name: m.name, maxRank: m.max_rank ?? null })
        seen.add(m.unique_name)
      }
    }
    for (const a of (inventoryData.arcanes ?? [])) {
      if (!seen.has(a.unique_name)) {
        items.push({ uniqueName: a.unique_name, name: a.name })
        seen.add(a.unique_name)
      }
    }
    for (const set of Object.values(inventoryData.primeSets ?? {})) {
      for (const part of (set.parts ?? [])) {
        if (!seen.has(part.unique_name)) {
          console.log(`[WFM] Adding part for fetch: "${part.name}" → unique_name="${part.unique_name}"`)
          items.push({ uniqueName: part.unique_name, name: part.name })
          seen.add(part.unique_name)
        }
      }
      if (set.setPath && !seen.has(set.setPath)) {
        console.log(`[WFM] Adding set for fetch: "${set.name} Set" → unique_name="${set.setPath}"`)
        items.push({ uniqueName: set.setPath, name: `${set.name} Set` })
        seen.add(set.setPath)
      }
    }
    for (const r of (inventoryData.relics ?? [])) {
      if (r.unique_name && !seen.has(r.unique_name)) {
        items.push({ uniqueName: r.unique_name, name: r.name })
        seen.add(r.unique_name)
      }
      for (const rew of (r.rewards ?? [])) {
        if (!seen.has(rew.uniqueName)) {
          items.push({ uniqueName: rew.uniqueName, name: rew.name })
          seen.add(rew.uniqueName)
        }
      }
    }
    if (items.length > 0) {
      setIsPriceLoading(true)
      setPriceFetchProgress({ current: 0, total: items.filter(i => i.name && !/\bForma\b/.test(i.name)).length })
      const onProgress = (p) => setPriceFetchProgress(p)
      getPricesBatch(items, onProgress).then(({ results }) => {
        setAllPrices(results)
        setIsPriceLoading(false)
        setPriceFetchProgress(null)
        priceFetchRef.current = false
        const now = Date.now()
        setPriceLastUpdated(now)
        localStorage.setItem('wfm_price_last_updated', String(now))
      }).catch(() => { setAllPrices({}); setIsPriceLoading(false); setPriceFetchProgress(null); priceFetchRef.current = false })
    } else {
      priceFetchRef.current = false
    }
  }, [inventoryData])

  const fissureStateRef = useRef({ squad_relics: [] })
  const ocrActiveRef = useRef(false)
  // Bumped on every relic-session boundary (start and close). OCR matching is
  // async (price + inventory lookups), so a batch can finish resolving after a
  // new session has already begun; the emit is dropped in that case so a stale
  // reward can never land in the new session's slot on the overlay.
  const ocrSessionRef = useRef(0)
  const relicSoundPlayed = useRef(false)

  useEffect(() => {
    if (!exportData) return
    const subs = []

    subs.push(listen('scanner-relic-phase-start', (e) => {
      const { squad_size } = e.payload
      ocrActiveRef.current = true
      ocrSessionRef.current += 1
      relicSoundPlayed.current = false // Reset for new session
      fissureStateRef.current.squad_relics = [] // Drop stale candidates from the previous round
      invoke('show_overlay_window', { label: 'overlay-relic' }).catch(() => { })
      invoke('relay_event', { event: 'overlay-squad-size', payload: { squad_size } }).catch(() => { })
    }))

    subs.push(listen('fissure-relic-phase', (e) => {
      const { squad_relics, squad_size } = e.payload
      const resolved = squad_relics.map(r => ({
        ...r, ...parseRelicName(r.unique_name), rewards: getRelicRewards(r.unique_name, exportData, localeRef.current)
      }))
      fissureStateRef.current.squad_relics = resolved
      // Play relic sound once per session via Rust backend
      if (!relicSoundPlayed.current) {
        relicSoundPlayed.current = true
        const sound = getSetting('notif_sound', 'notification1.wav')
        invoke('play_notification_sound', { sound }).catch(console.error)
      }
      invoke('relay_event', { event: 'overlay-update-relics', payload: { squad_relics: resolved, squad_size } }).catch(() => { })

    }))

    subs.push(listen('fissure-reward-phase', async (e) => {
      const { local_reward, squad_size } = e.payload
      if (!local_reward) return
      const baseItem = fissureStateRef.current.squad_relics.flatMap(r => r.rewards).find(r => r.uniqueName === local_reward) || {}
      const platPrice = await getPrice(local_reward, baseItem.name, baseItem.ducats)
      const inventory = getRewardInventoryContext(local_reward, inventoryData, exportData, localeRef.current)
      inventory.subcomponents = (inventory.subcomponents || []).map((c) => ({ ...c, image: resolveAnyImage(c.uniqueName, EI, nameToImage) }))
      const reward = { uniqueName: local_reward, ...baseItem, icon: EI[local_reward], platPrice, inventory }
      invoke('relay_event', { event: 'overlay-update-reward', payload: { local_reward: reward, squad_size } }).catch(() => { })
    }))

    subs.push(listen('fissure-ocr-band', async (e) => {
      const { text, slot_results, is_debug } = e.payload
      if (!ocrActiveRef.current && !is_debug) return
      if (is_debug) ocrActiveRef.current = true
      if (!slot_results) return
      const batchSession = ocrSessionRef.current

      // Process all slots - keep matching sequential, emit events in parallel at end
      const slotPromises = slot_results.map(async (res) => {
        if (!res.text || res.text.length < 3) return null;

        // Build candidate pool (squad relics if available, else global)
        let candidates = [];
        const currentRelics = fissureStateRef.current.squad_relics || [];
        if (currentRelics.length > 0) {
          const seen = new Set();
          for (const r of currentRelics) {
            if (r.rewards) r.rewards.forEach(rew => {
              if (!seen.has(rew.uniqueName)) {
                candidates.push(rew);
                seen.add(rew.uniqueName);
              }
            });
            // Add Requiem candidates if a T5 relic is in play
            if (r.tier === 'Requiem') {
              ['Fass', 'Jahu', 'Khra', 'Lohk', 'Netra', 'Ris', 'Vome', 'Xata'].forEach(name => {
                const reqName = `Requiem ${name}`;
                if (!seen.has(reqName)) {
                  candidates.push({ uniqueName: reqName, name: reqName, ducats: 0 });
                  seen.add(reqName);
                }
              });
            }
          }
        } else {
          // Only keep items that can actually appear in relic reward UI
          candidates = (globalRewardPool || []).filter(item => {
            if (!item || !item.name) return false;
            const n = item.name.toUpperCase();
            return n.includes('PRIME') || n.includes('BLUEPRINT') || n === 'FORMA BLUEPRINT' ||
              n.includes('SLIVER') || n.includes('FRAGMENT') || n.includes('AYATAN') ||
              n.includes('STAR') || n.includes('REQUIEM') || n.includes('ADAPTER');
          });
        }

        const isRequiem = res.text.startsWith('Requiem ');
        let bestMatch = null;

        if (isRequiem) {
          const modName = res.text.replace('Requiem ', '');
          bestMatch = { uniqueName: modName, name: modName, ducats: 0, isRequiem: true };
        } else {
          bestMatch = fuzzyMatchReward(res.text, candidates, 0.65);
          // The squad-scoped candidate pool is built from each relic's own
          // resolved reward list, which can be incomplete (an unresolved
          // relic, a stale/incorrect reward manifest, etc.) even though the
          // OCR text itself is a real, valid item. Before giving up and
          // fabricating a fake uniqueName (which can never resolve an icon
          // or owned/mastered inventory status), retry against the full
          // drop-table catalog so a real item still gets full data.
          if (!bestMatch && candidates !== globalRewardPool) {
            bestMatch = fuzzyMatchReward(res.text, globalRewardPool || [], 0.65);
          }
          // No further fallback below the fuzzy-match threshold: fabricating
          // a synthetic item here (invented uniqueName, guessed ducat value)
          // violates the project's zero-fallback-text rule and produces a
          // plausible-looking but fake reward card with no real icon or
          // ownership data behind it. Falling through to `return null` below
          // means this slot's OCR result is simply not emitted - the caller
          // already filters out null results - rather than showing invented
          // data as if it were real.
        }

        if (bestMatch) {
          const platPrice = await getPrice(bestMatch.uniqueName, bestMatch.name, bestMatch.ducats || 0);
          const inventory = getRewardInventoryContext(bestMatch.uniqueName, inventoryData, exportData);
          inventory.subcomponents = (inventory.subcomponents || []).map((c) => ({ ...c, image: resolveAnyImage(c.uniqueName, EI, nameToImage) }))
          return { slot: res.slot, confirmed_reward: bestMatch.name, item: { ...bestMatch, icon: EI[bestMatch.uniqueName], platPrice, inventory } };
        }
        return null;
      });

      // Wait for all slots to process and emit all events together
      const results = await Promise.all(slotPromises);
      // A session boundary crossed while this batch was resolving means these
      // results belong to the previous round - drop them rather than writing
      // them into the new session's slots.
      if (ocrSessionRef.current !== batchSession) return;
      for (const result of results) {
        if (result) {
          invoke('relay_event', {
            event: 'overlay-update-ocr',
            payload: result
          }).catch(() => { });
        }
      }

    }))

    subs.push(listen('fissure-reward-closed', () => {
      ocrActiveRef.current = false
      ocrSessionRef.current += 1
      fissureStateRef.current.squad_relics = [] // Prevent a stale pool bleeding into the next round's OCR matching
    }))

    // Builds the relic picker overlay payload. "Need"/"missing" zeroes out
    // rewards the player already owns or has crafted, so a relic's value
    // reflects only what's still missing - mirrors wfinfo-ng's
    // relic_recommend_watcher.py ev_need concept.
    const RELIC_ERA_ORDER = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem']
    // "Missing Prime Parts" must not count universally-farmable filler that
    // every relic pool carries (Kuva, Riven Fragments, Ayatan Stars, Forma) -
    // an isPrimePart-only allowlist was tried and rejected: Requiem/Immortal
    // relics don't reward anything literally named "Prime", so that allowlist
    // made the Requiem row permanently empty regardless of what's missing.
    // Also excludes the Weapon Exilus Adapter (WeaponUtilityUnlockerBlueprint)
    // specifically: once consumed installing it on a weapon it leaves no
    // reliable trace in save data (unlike Prime components, which leave
    // evidence via parent-frame mastery or pending Foundry recipes), so
    // getPartObtainedStatus can never confirm past ownership for it and it
    // would always read as "missing" even when it was obtained long ago.
    const isUncountableFillerReward = (uniqueName) => {
      const un = uniqueName || ''
      return /\/MiscItems\/Kuva$/i.test(un)
        || /\/MiscItems\/RivenFragment$/i.test(un)
        || /\/FusionTreasures\//i.test(un)
        || /\/Components\/FormaBlueprint$/i.test(un)
        || /\/MiscItems\/Forma$/i.test(un)
        || /WeaponUtilityUnlockerBlueprint$/i.test(un)
    }
    const buildRelicPickerPayload = (voidTier) => {
      const knownSingleEra = voidTier && voidTier !== 'Omnia'
      let relics = inventoryData.relics
      if (knownSingleEra) {
        relics = relics.filter(r => r.era === voidTier)
      }
      const ed = exportDataRef.current
      const enriched = relics.map(r => {
        const sortedRewards = (r.rewards || []).map(rw => ({
          ...rw,
          plat: allPricesRef.current[rw.uniqueName] ?? 0,
        }))
        const evPlat = getRelicEV(sortedRewards, 'Intact', 1, 'plat')
        const evDucats = getRelicEV(sortedRewards, 'Intact', 1, 'ducats')

        let missingCount = 0
        const neededRewards = sortedRewards.map(rw => {
          // Shared with the Relic Planner screen's "Never Obtained" check
          // (getPartObtainedStatus) so the two can't drift out of sync with
          // each other again - confirmed live 2026-08-10 that they had.
          const { everObtained } = getPartObtainedStatus(rw.uniqueName, rw.name, inventoryData, ed, localeRef.current)
          if (!everObtained && !isUncountableFillerReward(rw.uniqueName)) missingCount++
          return everObtained ? { ...rw, plat: 0, ducats: 0 } : rw
        })
        const evPlatNeed = getRelicEV(neededRewards, 'Intact', 1, 'plat')
        const evDucatsNeed = getRelicEV(neededRewards, 'Intact', 1, 'ducats')

        const ownedCount = Object.values(r.refinements || {}).reduce((sum, c) => sum + (c || 0), 0)

        return {
          name: r.name, era: r.era,
          evPlat: Math.round(evPlat), evDucats: Math.round(evDucats),
          evPlatNeed: Math.round(evPlatNeed), evDucatsNeed: Math.round(evDucatsNeed),
          missingCount, ownedCount,
        }
      })

      if (knownSingleEra) {
        const ducatTop = [...enriched].sort((a, b) => b.evDucats - a.evDucats).slice(0, 5)
        const platTop = [...enriched].sort((a, b) => b.evPlat - a.evPlat).slice(0, 5)
        const needTop = [...enriched].sort((a, b) => b.evDucatsNeed - a.evDucatsNeed).slice(0, 5)
        return { ducat_top: ducatTop, plat_top: platTop, need_top: needTop, era: voidTier }
      }

      // Era unknown (or Omnia) pre-mission: one compact row per era instead
      // of a flat top-5 mixing every era together - the era genuinely can't
      // be detected before the mission starts (confirmed live 2026-08-10,
      // matches wfinfo-ng's own documented limitation), so group by era
      // instead of trying to filter to one.
      const byEra = RELIC_ERA_ORDER
        .map(era => {
          // Only relics you actually own at least one copy of are eligible
          // to be recommended - you can't bring one you don't have.
          const eraRelics = enriched.filter(r => r.era === era && r.ownedCount > 0)
          if (eraRelics.length === 0) return null
          const bestDucat = [...eraRelics].sort((a, b) => b.evDucats - a.evDucats)[0]
          const bestPlat = [...eraRelics].sort((a, b) => b.evPlat - a.evPlat)[0]
          const bestMissing = [...eraRelics]
            .filter(r => r.missingCount > 0)
            .sort((a, b) => (b.missingCount - a.missingCount) || (b.evDucatsNeed - a.evDucatsNeed))[0]
          return {
            era,
            ducat: bestDucat && bestDucat.evDucats > 0 ? { name: bestDucat.name, value: bestDucat.evDucats } : null,
            plat: bestPlat && bestPlat.evPlat > 0 ? { name: bestPlat.name, value: bestPlat.evPlat } : null,
            missing: bestMissing ? { name: bestMissing.name, count: bestMissing.missingCount } : null,
          }
        })
        .filter(Boolean)
      return { by_era: byEra, era: voidTier }
    }

    subs.push(listen('relic-picker-opened', (e) => {
      if (!inventoryData?.relics) return
      const payload = buildRelicPickerPayload(e.payload?.void_tier)
      invoke('show_overlay_window', { label: 'overlay-relic-picker' }).catch(() => {})
      invoke('relay_event', { event: 'relic-picker-data', payload }).catch(() => {})
    }))

    subs.push(listen('relic-picker-tier', (e) => {
      const voidTier = e.payload?.tier
      if (!voidTier || !inventoryData?.relics) return
      const payload = buildRelicPickerPayload(voidTier)
      invoke('relay_event', { event: 'relic-picker-data', payload }).catch(() => {})
    }))

    subs.push(listen('archon-hunt-modifiers', (e) => {
      setArchonModifiers(e.payload)
    }))
    subs.push(listen('arbitration-modifiers', (e) => {
      setArbitrationModifiers(e.payload)
    }))

    subs.push(listen('chat-incoming-message', async (e) => {
      const channel = e.payload?.channel || 'Unknown'
      try {
        const raw = getSetting('notifications', [])
        const chatNotif = raw.find(n => n.trigger === 'chat' && n.enabled)
        if (chatNotif) {
          const isFocused = await invoke('is_warframe_focused')
          if (!isFocused) {
            const position = getSetting('notif_position', 'top-right')
            const sound = getSetting('notif_sound', 'notification1.wav')
            invoke('play_notification_sound', { sound }).catch(console.error)
            invoke('show_notification', {
              title: 'New Chat Message',
              message: `New message from ${channel}`,
              image: '',
              position,
              no_focus: true,
              silent: true,
            }).catch(console.error)
          }
        }
      } catch (err) {
        console.error('Failed to check focus:', err)
      }
    }))

    return () => { subs.forEach(p => p.then(f => f())) }
  }, [exportData, inventoryData, globalRewardPool, EI])

  // Monitoring-active listener in its own effect so it's registered ASAP.
  useEffect(() => {
    const unsub = listen('monitoring-active-changed', async (e) => {
      if (processingRef.current) return
      const p = e.payload || {}
      if (p.active === false) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
        setIsMonitoring(false)
        setMonitorResult(p.result || 'idle')
        setStatusText(p.statusText || 'Syncing stopped')
      } else if (p.active === true && !intervalRef.current) {
        setMonitorResult(p.result || 'success')
        setStatusText(p.statusText || 'Syncing active')
        setIsMonitoring(true)
        processingRef.current = true
        try {
          setNextRetryAt(Date.now() + 180_000)
          await callApiHelper()
          intervalRef.current = setInterval(async () => {
            setNextRetryAt(Date.now() + 180_000)
            const r = await callApiHelper()
            invoke('set_monitoring_active', { active: true, result: r, statusText: r === 'success' ? 'Syncing active' : r === 'cached' ? 'Game not running, using cached data' : r }).catch(() => {})
          }, 180_000)
        } finally {
          processingRef.current = false
        }
      }
    })
    return () => { unsub.then(f => f()) }
  }, [callApiHelper])

  // Re-run mod image pipeline when called (e.g. after user sets cache path in Settings)
  const retryCardImages = useCallback(async () => {
    cardInitStarted.current = true
    setFixProgress({ checking: true })

    const savedPath = getSetting('warframe_cache_path', '')
    const cachePath = savedPath || await invoke('detect_warframe_cache').catch(() => null)
    if (cachePath && inventoryData?.mods?.length) {
      setFixProgress({ phase: 'extracting', current: 0, total: 1, current_file: '' })
      try {
        const p = await invoke('ensure_card_images', { cachePath })
        localStorage.setItem('kronos_card_images_path', p)
        localStorage.setItem('kronos_card_images_ready', '1')
        setCardImagesPath(p)
      } catch (err) {
        // Extraction failure (e.g. stale cache path) must not leave the UI
        // stuck on "extracting" forever — fall back to regular card images.
        console.error('retryCardImages: ensure_card_images failed:', err)
        setFixProgress({ phase: 'done', current: 1, total: 1, current_file: '' })
      }
    } else {
      setFixProgress({ phase: 'done', current: 1, total: 1, current_file: '' })
    }
  }, [inventoryData])

  // ── Mod image pipeline (extract → fix → composite) ─────────────────
  // Single consolidated Tauri command with unified progress events.
  useEffect(() => {
    if (cardInitStarted.current) return
    if (!inventoryData?.mods?.length) {
      setFixProgress({ phase: 'done', current: 1, total: 1, current_file: '' })
      return
    }
    cardInitStarted.current = true

    let unlisten;
    (async () => {
      unlisten = await listen('card-progress', (e) => {
        setFixProgress(e.payload);
      });

      const savedPath = getSetting('warframe_cache_path', '')
      const cachePath = savedPath || await invoke('detect_warframe_cache').catch(() => null)
      // Already extracted+fixed in a previous session? Skip the pipeline —
      // locale switches remount this effect and used to re-run the full
      // extraction, hanging on "extracting" when the cache path went stale.
      const knownRoot = localStorage.getItem('kronos_card_images_path') || ''
      if (knownRoot && localStorage.getItem('kronos_card_images_ready') === '1') {
        setCardImagesPath(knownRoot)
        setFixProgress({ phase: 'done', current: 1, total: 1, current_file: '' })
      } else if (cachePath) {
        setFixProgress({ phase: 'extracting', current: 0, total: 1, current_file: '' })
        try {
          const p = await invoke('ensure_card_images', { cachePath })
          localStorage.setItem('kronos_card_images_path', p)
          localStorage.setItem('kronos_card_images_ready', '1')
          setCardImagesPath(p)
        } catch (err) {
          console.error('card images init: ensure_card_images failed:', err)
          setFixProgress({ phase: 'done', current: 1, total: 1, current_file: '' })
        }
      } else {
        setFixProgress({ phase: 'done', current: 1, total: 1, current_file: '' })
      }
    })();

    return () => { if (unlisten) unlisten() }
  }, [inventoryData?.mods?.length])

  return (
    <MonitoringContext.Provider value={{
      exportData, spIncursions, arbys, archonModifiers, arbitrationModifiers,
      dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENW, ENWRawRewards, ExportImages, ExportTextIcons, arbyTiers: ARBY_TIERS, dropIndex, recipeResultIndex, exaltedWeaponIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, wikiBlueprintIndex, wikiResearchIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, relicStateIndex, exportVendorIndex, glyphSupplementIndex, exportComponentIndex,
      isMonitoring, monitorResult, autoStart, setAutoStart, lastUpdate, nextRetryAt, rawInventory, inventoryData, isInventoryLoading, worldState, setWorldState, statusText,
      masteryProgress, allPrices, isPriceLoading, priceFetchProgress, priceLastUpdated, refreshPrices,
      startMonitoring, stopMonitoring, manualRefresh, callApiHelper,
      cardImagesPath, fixProgress, retryCardImages, notificationHistory,
      loadInventoryHistory,
    }}>
      {children}
    </MonitoringContext.Provider>
  )
}

export const useMonitoring = () => useContext(MonitoringContext)
export { MonitoringContext }
