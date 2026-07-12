import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { parseInventory } from '../lib/inventoryParser'
import { buildDropIndex } from '../lib/dropsParser'
import { parseWorldstate, buildArchimedeaMap } from '../lib/worldstateParser'
import { getAllRelicRewards } from '../lib/relicParser'
import { listen } from '@tauri-apps/api/event'
import { MonitoringContext } from './MonitoringContext'

const ORACLE_API = 'https://oracle.browse.wf/worldState.json'

function toMap(data, key) {
  if (!data) return {}
  const arr = data[key]
  if (!Array.isArray(arr)) return {}
  const map = {}
  for (const item of arr) {
    if (item && item.uniqueName) map[item.uniqueName] = item
  }
  return map
}

const ARBY_TIERS = {
  'SolNode840': 'S', 'SolNode841': 'A', 'SolNode842': 'B', 'SolNode843': 'C',
  'SolNode844': 'D', 'ClanNode15': 'S', 'ClanNode16': 'A', 'ClanNode17': 'B',
  'ClanNode18': 'C', 'ClanNode19': 'D', 'SolNode932': 'S', 'SolNode933': 'A',
  'SolNode934': 'B', 'SolNode935': 'C', 'SolNode936': 'D',
}

export default function MirroredMonitoringProvider({ children }) {
  const [exportData, setExportData] = useState(null)
  const [isMonitoring] = useState(false)
  const [monitorResult, setMonitorResult] = useState('idle')
  const [autoStart] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(() => localStorage.getItem('lastUpdate') || null)
  const [rawInventory, setRawInventory] = useState(null)
  const [inventoryData, setInventoryData] = useState(undefined)
  const [isInventoryLoading, setIsInventoryLoading] = useState(true)
  const [allPrices] = useState({})
  const [isPriceLoading] = useState(false)
  const [priceFetchProgress] = useState(null)
  const [priceLastUpdated] = useState(null)
  const [worldState, setWorldState] = useState(null)
  const [statusText, setStatusText] = useState('Initializing…')
  const [spIncursions, setSpIncursions] = useState(null)
  const [arbys, setArbys] = useState(null)
  const [archonModifiers, setArchonModifiers] = useState(null)
  const [cardImagesPath, setCardImagesPath] = useState('')
  const [fixProgress] = useState({ phase: 'done', checking: false })
  const loadedRef = useRef(false)

  // ── Initial snapshot from backend ──
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    // Lightweight path queries — these return static paths, no file I/O
    invoke('get_card_images_path').then(setCardImagesPath).catch(() => {})

    invoke('sidebar_load_data')
      .then(result => {
        if (result.exports) {
          setExportData(result.exports)
        }
        if (result.inventory) {
          setRawInventory(result.inventory)
        }
        if (result.inventoryTimestamp) {
          setLastUpdate(String(result.inventoryTimestamp))
          localStorage.setItem('lastUpdate', String(result.inventoryTimestamp))
        }
        setStatusText('Ready')
        setIsInventoryLoading(false)
      })
      .catch(() => {
        setStatusText('Failed to load data')
        setIsInventoryLoading(false)
      })
  }, [])

  // ── Parse inventory when both exportData and rawInventory change ──
  useEffect(() => {
    if (!exportData || !rawInventory) return
    try {
      const parsed = parseInventory(rawInventory, exportData)
      setInventoryData(parsed)
    } catch {
      console.error('[MirroredMonitoring] parseInventory failed')
      setInventoryData(null)
    }
  }, [exportData, rawInventory])

  // ── Subscribe to main window's data-updated event ──
  // Uses the lightweight sidebar_load_inventory (no exports) to avoid
  // re-reading all ~30 export JSON files every monitoring cycle.
  useEffect(() => {
    const unsub = listen('sidebar-data-updated', () => {
      invoke('sidebar_load_inventory')
        .then(result => {
          if (result.inventory) {
            setRawInventory(result.inventory)
          }
          if (result.inventoryTimestamp) {
            setLastUpdate(String(result.inventoryTimestamp))
            localStorage.setItem('lastUpdate', String(result.inventoryTimestamp))
          }
        })
        .catch(() => {})
    })
    return () => { unsub.then(f => f()) }
  }, [])

  // ── Subscribe to scanner-latched for monitoring status ──
  useEffect(() => {
    const unsub = listen('scanner-latched', () => {
      setMonitorResult('success')
    })
    return () => { unsub.then(f => f()) }
  }, [])

  // ── Worldstate polling ──
  const fetchWorldstate = useCallback(async () => {
    try {
      const resp = await fetch(ORACLE_API)
      if (!resp.ok) return
      const ws = await resp.json()
      if (!ws || !exportData) return
      const dict = exportData['dict.en'] ?? {}
      const suppDict = exportData['supp-dict-en'] ?? {}
      const ERg = buildERg(exportData)
      const EC = toMap(exportData?.ExportChallenges, 'ExportChallenges')
      const eiB = buildEI(exportData, dict)
      const EI = eiB?.EI ?? {}
      const nameToImage = eiB?.nameToImage ?? {}
      const uniqueNameToName = eiB?.uniqueNameToName ?? {}
      const ES = exportData?.ExportSyndicates ?? {}
      const ENWRawRewards = exportData?.ExportNightwave?.rewards || []
      const ExportImages = exportData?.ExportImages ?? {}
      const archimedeaMap = buildArchimedeaMap(dict, suppDict)
      const parsed = parseWorldstate(ws, {
        dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName,
        ES, ENWRawRewards, ExportImages, archimedeaMap,
      })
      setWorldState(parsed)
    } catch {}
  }, [exportData])

  useEffect(() => {
    if (exportData) {
      fetchWorldstate()
      const iv = setInterval(fetchWorldstate, 60000)
      return () => clearInterval(iv)
    }
  }, [exportData, fetchWorldstate])

  // ── Archon hunt modifiers ──
  useEffect(() => {
    const unsub = listen('archon-hunt-modifiers', (e) => {
      setArchonModifiers(e.payload)
    })
    return () => { unsub.then(f => f()) }
  }, [])

  // ── Derivation helpers (same as MonitoringContext) ──
  function buildERg(ed) {
    const data = ed?.ExportRegions
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
  }

  function buildEI(ed, d) {
    if (!ed || !d) return { EI: {}, nameToImage: {}, uniqueNameToName: {} }
    const tableNames = [
      'ExportWeapons', 'ExportWarframes', 'ExportSentinels',
      'ExportResources', 'ExportArcanes', 'ExportUpgrades',
      'ExportNightwave', 'ExportBoosterPacks', 'ExportRecipes', 'ExportCustoms', 'ExportGear',
    ]
    const EI = {}
    const nameToImage = {}
    const uniqueNameToName = {}
    const toBrowseWf = (p) => p ? `https://browse.wf${p.startsWith('/') ? '' : '/'}${p}` : null
    const indexEntry = (e, k, t) => {
      const un = e.uniqueName || e.ItemType || k
      if (!un) return
      let iconPath = e.icon ?? e.texture
      let nameKey = e.name ?? e.displayName
      if (t === 'ExportRecipes' && e.resultType) {
        nameKey = uniqueNameToName[e.resultType] || e.resultType
        if (!iconPath) {
          const resultUn = e.resultType
          iconPath = ed.ExportImages?.[resultUn] || EI[resultUn]
          if (typeof iconPath === 'string' && iconPath.startsWith('https://browse.wf')) {
            iconPath = iconPath.replace('https://browse.wf', '')
          }
        }
      }
      const url = toBrowseWf(iconPath ?? '')
      if (url) EI[un] = url
      uniqueNameToName[un] = nameKey
      const locKey = uniqueNameToName[un]
      if (locKey) {
        const resolved = (d[locKey] || d['/' + locKey] || '').replace(/<[^>]*>/g, '').trim()
        if (resolved && !resolved.startsWith('/')) { if (url) nameToImage[resolved.toLowerCase()] = url }
      }
    }
    tableNames.forEach(tbl => {
      const data = ed[tbl]
      if (!data) return
      if (Array.isArray(data)) data.forEach(e => indexEntry(e, null, tbl))
      else if (typeof data === 'object') {
        const nested = data[tbl] ?? (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object' ? Object.values(data)[0] : null)
        if (Array.isArray(nested)) nested.forEach(e => indexEntry(e, null, tbl))
        else Object.entries(data).forEach(([k, v]) => indexEntry(v, k, tbl))
      }
    })
    return { EI, nameToImage, uniqueNameToName }
  }

  // ── Memoized fields (mirrors MonitoringContext) ──
  const dict = useMemo(() => exportData?.['dict.en'] ?? {}, [exportData])
  const suppDict = useMemo(() => exportData?.['supp-dict-en'] ?? {}, [exportData])
  const archimedeaMap = useMemo(() => buildArchimedeaMap(dict, suppDict), [dict, suppDict])
  const EC = useMemo(() => toMap(exportData?.ExportChallenges, 'ExportChallenges'), [exportData])
  const ERg = useMemo(() => buildERg(exportData), [exportData])
  const ES = useMemo(() => exportData?.ExportSyndicates ?? {}, [exportData])
  const ENW = useMemo(() => toMap(exportData?.ExportNightwave, 'rewards'), [exportData])
  const ENWRawRewards = useMemo(() => exportData?.ExportNightwave?.rewards || [], [exportData])
  const ExportImages = useMemo(() => exportData?.ExportImages ?? {}, [exportData])
  const ExportTextIcons = useMemo(() => exportData?.ExportTextIcons ?? {}, [exportData])

  const masteryProgress = useMemo(() => {
    if (!inventoryData) return 0
    const currentRank = inventoryData.account?.mastery_rank
    if (currentRank == null) return 0
    const getXPForRank = (r) => r <= 0 ? 0 : r <= 30 ? r * r * 2500 : 2250000 + (r - 30) * 147500
    const getXPNeededFor = (r) => r <= 30 ? (2 * r - 1) * 2500 : 147500
    const itemCats = ['warframes', 'primary', 'secondary', 'melee', 'kitgunChambers', 'zawStrikes', 'amps',
      'sentinels', 'companion_weapons', 'moaHeads', 'houndHeads', 'beasts',
      'archwings', 'archweapons', 'necramechs', 'plexus', 'kdrives']
    const itemXP = itemCats.reduce((sum, cat) =>
      sum + (inventoryData[cat] ?? []).reduce((s, i) => s + (i.mastery_xp || 0), 0), 0)
    const intrinsicXP = (inventoryData.intrinsics ?? []).reduce((s, i) => s + (i.mastery_xp || 0), 0)
    const sc = inventoryData.starchart ?? {}
    const totalXP = itemXP + intrinsicXP + (sc.origin_xp ?? 0) + (sc.steel_path_xp ?? 0)
    const xpAtCurrent = getXPForRank(currentRank)
    const xpNeeded = getXPNeededFor(currentRank + 1)
    const xpIntoRank = Math.max(0, totalXP - xpAtCurrent)
    return xpNeeded > 0 ? Math.min(100, (xpIntoRank / xpNeeded) * 100) : 100
  }, [inventoryData])

  const eiResult = useMemo(() => buildEI(exportData, dict), [exportData, dict])
  const EI = eiResult.EI
  const nameToImage = eiResult.nameToImage
  const uniqueNameToName = eiResult.uniqueNameToName

  const globalRewardPool = useMemo(() => getAllRelicRewards(exportData), [exportData])
  const dropIndex = useMemo(() => buildDropIndex(exportData), [exportData])

  const startMonitoringFn = useCallback(async () => {
    setMonitorResult('idle')
    try {
      await invoke('call_api_helper')
    } catch {}
  }, [])

  const callApiHelperFn = useCallback(async () => {
    try { await invoke('call_api_helper') } catch {}
  }, [])

  const value = useMemo(() => ({
    exportData, isMonitoring, monitorResult, autoStart, lastUpdate,
    rawInventory, inventoryData, isInventoryLoading,
    allPrices, isPriceLoading, priceFetchProgress, priceLastUpdated,
    worldState, statusText, spIncursions, arbys, archonModifiers,
    cardImagesPath, fixProgress,
    dict, suppDict, archimedeaMap, EC, ERg, ES, ENW, ENWRawRewards,
    ExportImages, ExportTextIcons, masteryProgress,
    EI, nameToImage, uniqueNameToName, globalRewardPool, dropIndex,
    arbyTiers: ARBY_TIERS,
    setAutoStart: () => {}, startMonitoring: startMonitoringFn,
    stopMonitoring: () => {}, manualRefresh: callApiHelperFn,
    callApiHelper: callApiHelperFn, refreshPrices: () => Promise.resolve(),
    retryCardImages: () => Promise.resolve(), setWorldState,
  }), [exportData, isMonitoring, monitorResult, lastUpdate, rawInventory,
      inventoryData, isInventoryLoading, worldState, statusText,
      spIncursions, arbys, archonModifiers,
      dict, suppDict, archimedeaMap, EC, ERg, ES, ENW, ENWRawRewards,
      ExportImages, ExportTextIcons, masteryProgress,
      EI, nameToImage, uniqueNameToName, globalRewardPool, dropIndex])

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  )
}
