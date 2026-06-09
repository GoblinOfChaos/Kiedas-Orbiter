import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { parseInventory } from '../lib/inventoryParser'
import { parseWorldstate } from '../lib/worldstateParser'
import { getRelicRewards, getAllRelicRewards, getRewardInventoryContext, parseRelicName, fuzzyMatchReward } from '../lib/relicParser'
import { listen, emit } from '@tauri-apps/api/event'
import { getPrice, getPricesBatch } from '../lib/wfmCache'
import { resolveResource } from '@tauri-apps/api/path'
import { convertFileSrc } from '@tauri-apps/api/core'
import { resolveNode } from '../lib/warframeUtils'
import { getSetting } from '../lib/settings'
import { evaluateNotifications } from '../lib/notificationManager'
import { getCurrentWindow } from '@tauri-apps/api/window'

const ORACLE_API = 'https://oracle.browse.wf/worldState.json'

async function playNotificationSound(sound) {
  if (sound === 'none') return

  // THE KILLSWITCH: Stop executing if this instance is running inside an overlay window
  if (getCurrentWindow().label !== 'main') return

  try {
    const resourcePath = await resolveResource(`data/assets/audio/${sound}`)
    console.log('[Audio] resolved path:', resourcePath)
    const assetUrl = convertFileSrc(resourcePath)
    const audio = new Audio(assetUrl)
    audio.play()
      .then(() => console.log('[Audio] successfully played:', sound))
      .catch(err => console.error('[Audio] play blocked:', err))
  } catch (e) {
    console.error('[Audio] Could not resolve sound path:', e)
  }
}

// ── Pure helper: array/object → keyed map ─────────────────────────────────────
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
  const [inventoryData, setInventoryData] = useState(undefined)
  const [isInventoryLoading, setIsInventoryLoading] = useState(false)
  const [allPrices, setAllPrices] = useState(() => {
    try {
      const data = localStorage.getItem('wfm_price_cache');
      if (!data) return {};
      const cache = JSON.parse(data);
      const prices = {};
      for (const [key, val] of Object.entries(cache)) {
        if (val && typeof val.plat === 'number') prices[key] = val.plat;
      }
      return prices;
    } catch { return {} }
  })
  const [isPriceLoading, setIsPriceLoading] = useState(false)
  const [priceFetchProgress, setPriceFetchProgress] = useState(null)
  const [priceLastUpdated, setPriceLastUpdated] = useState(localStorage.getItem('wfm_price_last_updated') || null)
  const [worldState, setWorldState] = useState(null)
  const [statusText, setStatusText] = useState('Initializing…')
  const [spIncursions, setSpIncursions] = useState(null)
  const [arbys, setArbys] = useState(null)
  const [descendiaDescs, setDescendiaDescs] = useState({ penance: {}, missionType: {} })
  const [archonModifiers, setArchonModifiers] = useState(null)
  const intervalRef = useRef(null)
  const busyRef = useRef(false)
  const notifiedRef = useRef({})
  const priceFetchRef = useRef(false)
  const [cardImagesPath, setCardImagesPath] = useState('')
  const [fixProgress, setFixProgress] = useState({ checking: true })
  const cardInitStarted = useRef(false)

  // ── Derived lookup maps ──────────────────────────────────────────────────────
  const dict = useMemo(() => exportData?.['dict.en'] ?? {}, [exportData])
  const suppDict = useMemo(() => exportData?.['supp-dict-en'] ?? {}, [exportData])
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

  const { EI, nameToImage, uniqueNameToName } = useMemo(() => {
    if (!exportData || !dict) return { EI: {}, nameToImage: {}, uniqueNameToName: {} }
    const tableNames = [
      'ExportWeapons', 'ExportWarframes', 'ExportSentinels',
      'ExportResources', 'ExportArcanes', 'ExportUpgrades',
      'ExportNightwave', 'ExportBoosterPacks', 'ExportRecipes', 'ExportCustoms', 'ExportGear'
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
        // For recipes, resolve the name and icon from the result item
        nameKey = uniqueNameToName[e.resultType] || e.resultType
        if (!iconPath) {
          const resultUn = e.resultType
          iconPath = exportData.ExportImages?.[resultUn] || EI[resultUn]
          // Strip https://browse.wf/ prefix if it was already resolved
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
        const resolved = (dict[locKey] || dict['/' + locKey] || '').replace(/<[^>]*>/g, '').trim()
        if (resolved && !resolved.startsWith('/')) { if (url) nameToImage[resolved.toLowerCase()] = url }
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
    return { EI, nameToImage, uniqueNameToName }
  }, [exportData, dict])

  const globalRewardPool = useMemo(() => getAllRelicRewards(exportData), [exportData])

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

  useEffect(() => {
    const raw = getSetting('notifications', [])
    if (!Array.isArray(raw) || raw.length === 0) return
    // Wait for real worldstate data before evaluating
    if (!worldState) return
    if (!notifiedRef.current.notifMgr) notifiedRef.current.notifMgr = new Set()

    const position = getSetting('notif_position', 'top-right')

    // On first real data, mark everything as seen — no startup flood
    if (!notifInitRef.current) {
      notifInitRef.current = true
      const results = evaluateNotifications(raw, { inventoryData, worldstate: worldState, arbys, ERg, dict, ES })
      for (const r of results) {
        notifiedRef.current.notifMgr.add(`${r.notifId}::${r.title}::${r.message}`)
      }
      return
    }

    const results = evaluateNotifications(raw, { inventoryData, worldstate: worldState, arbys, ERg, dict, ES })

    // Fire each new notification individually; play sound in main window first
    for (const r of results) {
      const dedupKey = `${r.notifId}::${r.title}::${r.message}`
      if (!notifiedRef.current.notifMgr.has(dedupKey)) {
        notifiedRef.current.notifMgr.add(dedupKey)
        // Play audio in main window (never throttled) before showing notification
        const sound = getSetting('notif_sound', 'notification1.wav')
        playNotificationSound(sound)
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
    // Store notification sound for frontend audio playback
    window.__kronos_notif_sound = getSetting('notif_sound', 'notification1.wav')
    window.__checklistTasks = [
      { id: 'baro', label: "Baro Ki'Teer" },
      { id: 'sortie', label: 'Sortie' },
      { id: 'foundry', label: 'Check Foundry' },
      { id: 'syndicates', label: 'Syndicate Standing' },
      { id: 'focus', label: 'Daily Focus Cap' },
      { id: 'steel_path', label: 'Steel Path Incursions' },
      { id: 'acrithis_daily', label: 'Acrithis Daily' },
      { id: 'ticker', label: "Ticker's Railjack Crew" },
      { id: 'marie', label: "Marie's Shop" },
      { id: 'grandmother', label: "Grandmother's Tokens" },
      { id: 'yonta_daily', label: 'Yonta: Daily Voidplumes' },
      { id: 'voca', label: 'Loid: Voca' },
      { id: 'nightwave', label: 'Nightwave Missions' },
      { id: 'nightwave_spend', label: 'Nightwave Shop' },
      { id: 'ayatan', label: "Maroo's Ayatan Hunt" },
      { id: 'clem', label: 'Help Clem' },
      { id: 'narmer', label: 'Help Kahl: Break Narmer' },
      { id: 'archon', label: 'Archon Hunt' },
      { id: 'circuit', label: 'Duviri Circuit' },
      { id: 'circuit_sp', label: 'Duviri Circuit SP' },
      { id: 'pulses', label: 'Pulses: Netracell & Archimedea' },
      { id: 'calendar', label: '1999 Calendar' },
      { id: 'invigorations', label: 'Helminth Invigoration' },
      { id: 'descendia', label: 'Descendia' },
      { id: 'descendia_sp', label: 'Descendia SP' },
      { id: 'palladino', label: "Palladino's Shop" },
      { id: 'yonta_weekly', label: 'Yonta: Weekly Shop' },
      { id: 'acrithis_weekly', label: 'Acrithis Weekly' },
      { id: 'teshin', label: 'Teshin Shop' },
      { id: 'bird3', label: 'Bird 3 Shop' },
      { id: 'nightcap', label: 'Nightcap Shop' },
    ]
    return () => {
      window.__KRONOS_NOTIF_HELPERS = null
      delete window.__checklistTasks
    }
  }, [])



  const applyRaw = useCallback((raw, ts, exports = exportData) => {
    if (!raw) return
    setRawInventory(raw)
    if (!exports) return
    try {
      const parsed = parseInventory(raw, exports)
      setInventoryData(parsed || null)
    } catch (err) {
      setInventoryData(null)
    }
    const tsStr = String(ts ?? Date.now())
    setLastUpdate(tsStr)
    localStorage.setItem('lastUpdate', tsStr)
  }, [exportData])

  useEffect(() => {
    ; (async () => {
      try {
        setStatusText('Checking updates & assets…')
        await Promise.all([
          invoke('check_exports'),
          invoke('check_media_assets')
        ])

        setStatusText('Loading resources…')
        const [exports, spiText, arbText, descText] = await Promise.all([
          invoke('load_all_exports'),
          invoke('load_txt_file', { name: 'sp-incursions.txt' }),
          invoke('load_txt_file', { name: 'arbys.txt' }),
          invoke('load_txt_file', { name: 'descendia.txt' }),
        ])

        // Temporary: use patched exports with levelStats until upstream ships them
        try {
          const fixedFiles = [
            ['ExportUpgrades_fixed.json', 'ExportUpgradesFixed'],
            ['ExportAvionics_fixed.json', 'ExportAvionicsFixed'],
            ['mod-icon-map.json', 'ModIconMap'],
            ['peely-pix-map.json', 'PeelyPixMap'],
            ['peely-pix-names.json', 'PeelyPixNames'],
          ];
          for (const [fname, key] of fixedFiles) {
            const bytes = await invoke('read_file_bytes', { relative: `data/assets/data/${fname}` }).catch(() => null);
            if (bytes) {
              const text = new TextDecoder().decode(new Uint8Array(bytes));
              exports[key] = JSON.parse(text);
            }
          }
        } catch { }

        setExportData(exports)
        setSpIncursions(spiText || '')
        setArbys(arbText || '')

        // Parse Descendia descriptions
        if (descText) {
          const penance = {}
          const missionType = {}
          let currentSection = null
          descText.split('\n').forEach(line => {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) return
            if (trimmed.startsWith('# Mission')) {
              currentSection = 'missionType'
              return
            }
            const colonIdx = trimmed.indexOf(':')
            if (colonIdx > 0) {
              const key = trimmed.slice(0, colonIdx)
              const desc = trimmed.slice(colonIdx + 1).trim()
              if (currentSection === 'missionType') {
                missionType[key] = desc
              } else {
                penance[key] = desc
              }
            }
          })
          setDescendiaDescs({ penance, missionType })
        }

        setStatusText('Loading inventory…')
        const result = await invoke('load_cached_inventory')
        if (result) {
          applyRaw(result[0], result[1], exports)
          setStatusText('Loaded cached data')
        } else {
          setStatusText('No cached data – start monitoring in Settings')
          setInventoryData(null)
        }
      } catch (err) {
        setStatusText(`Startup failed: ${err}`)
        setInventoryData(null)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  const fetchWorldstate = useCallback(async () => {
    try {
      const ws = await fetch(ORACLE_API).then(r => r.ok ? r.json() : null)
      if (ws && dict) {
        const parsed = parseWorldstate(ws, { dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ExportImages })
        setWorldState(parsed)
      }
    } catch (err) { }
  }, [dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENWRawRewards, ExportImages])

  useEffect(() => {
    if (Object.keys(dict || {}).length > 0) {
      fetchWorldstate()
      const iv = setInterval(fetchWorldstate, 60000)
      return () => clearInterval(iv)
    }
  }, [fetchWorldstate, dict])

  const callApiHelper = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setIsInventoryLoading(true)
    try {
      const raw = await invoke('call_api_helper')
      if (raw) {
        applyRaw(raw, Date.now())
        setMonitorResult('success')
        setStatusText('Monitoring active')
      } else {
        setMonitorResult('error')
        setStatusText('API helper returned no data')
      }
    } catch (err) {
      setMonitorResult('error')
      setStatusText(`Error: ${err}`)
    } finally {
      busyRef.current = false
      setIsInventoryLoading(false)
    }
  }, [applyRaw])

  const startMonitoring = useCallback(async (intervalMs = 180_000) => {
    if (isMonitoring) return
    setIsMonitoring(true)
    try { await callApiHelper() } catch { }
    intervalRef.current = setInterval(() => callApiHelper().catch(() => { }), intervalMs)
  }, [isMonitoring, callApiHelper])

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsMonitoring(false)
    setMonitorResult('idle')
    setStatusText('Monitoring stopped')
  }, [])

  const manualRefresh = useCallback(() => callApiHelper(), [callApiHelper])

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

    // Include relic rewards in the same batch
    for (const r of (inventoryData.relics ?? [])) {
      for (const rew of (r.rewards ?? [])) {
        if (!seen.has(rew.uniqueName)) {
          items.push({ uniqueName: rew.uniqueName, name: rew.name })
          seen.add(rew.uniqueName)
        }
      }
    }
    if (items.length > 0) {
      setIsPriceLoading(true)
      setPriceFetchProgress({ current: 0, total: items.filter(i => i.name && !i.name.includes('Forma')).length })
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
    if (items.length > 0) {
      setIsPriceLoading(true)
      setPriceFetchProgress({ current: 0, total: items.filter(i => i.name && !i.name.includes('Forma')).length })
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
  const relicSoundPlayed = useRef(false)

  useEffect(() => {
    if (!exportData) return
    const subs = []

    subs.push(listen('scanner-relic-phase-start', (e) => {
      const { squad_size } = e.payload
      ocrActiveRef.current = true
      relicSoundPlayed.current = false // Reset for new session
      invoke('show_overlay_window', { label: 'overlay-relic' }).catch(() => { })
      invoke('relay_event', { event: 'overlay-squad-size', payload: { squad_size } }).catch(() => { })
    }))

    subs.push(listen('fissure-relic-phase', (e) => {
      const { squad_relics, squad_size } = e.payload
      const resolved = squad_relics.map(r => ({
        ...r, ...parseRelicName(r.unique_name), rewards: getRelicRewards(r.unique_name, exportData)
      }))
      fissureStateRef.current.squad_relics = resolved
      // Play relic sound once per session from main window
      if (!relicSoundPlayed.current) {
        relicSoundPlayed.current = true
        const sound = getSetting('notif_sound', 'notification1.wav')
        playNotificationSound(sound)
      }
      invoke('relay_event', { event: 'overlay-update-relics', payload: { squad_relics: resolved, squad_size } }).catch(() => { })

    }))

    subs.push(listen('fissure-reward-phase', async (e) => {
      const { local_reward, squad_size } = e.payload
      if (!local_reward) return
      const baseItem = fissureStateRef.current.squad_relics.flatMap(r => r.rewards).find(r => r.uniqueName === local_reward) || {}
      const platPrice = await getPrice(local_reward, baseItem.name, baseItem.ducats)
      const inventory = getRewardInventoryContext(local_reward, inventoryData, exportData)
      const reward = { uniqueName: local_reward, ...baseItem, platPrice, inventory }
      invoke('relay_event', { event: 'overlay-update-reward', payload: { local_reward: reward, squad_size } }).catch(() => { })
    }))

    subs.push(listen('fissure-ocr-band', async (e) => {
      const { text, slot_results, is_debug } = e.payload
      if (!ocrActiveRef.current && !is_debug) return
      if (is_debug) ocrActiveRef.current = true
      if (!slot_results) return

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
          bestMatch = fuzzyMatchReward(res.text, candidates, 0.60);
        }

        if (bestMatch) {
          const platPrice = await getPrice(bestMatch.uniqueName, bestMatch.name, bestMatch.ducats || 0);
          const inventory = getRewardInventoryContext(bestMatch.uniqueName, inventoryData, exportData);
          return { slot: res.slot, confirmed_reward: bestMatch.name, item: { ...bestMatch, icon: EI[bestMatch.uniqueName], platPrice, inventory } };
        }
        return null;
      });

      // Wait for all slots to process and emit all events together
      const results = await Promise.all(slotPromises);
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
    }))

    subs.push(listen('archon-hunt-modifiers', (e) => {
      setArchonModifiers(e.payload)
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
            playNotificationSound(sound)
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

  // Re-run card image pipeline when called (e.g. after user sets cache path in Settings)
  const retryCardImages = useCallback(async () => {
    cardInitStarted.current = true
    setFixProgress({ checking: true })

    const savedPath = getSetting('warframe_cache_path', '')
    const cachePath = savedPath || await invoke('detect_warframe_cache').catch(() => null)
    if (cachePath && inventoryData?.mods?.length) {
      setFixProgress({ phase: 'extracting', current: 0, total: 1, current_file: '' })
      const p = await invoke('ensure_card_images', { cachePath })
      setCardImagesPath(p)
    } else {
      setFixProgress({ phase: 'done', current: 1, total: 1, current_file: '' })
    }
  }, [inventoryData])

  // ── Card image pipeline (extract → fix → composite) ─────────────────
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
      if (cachePath) {
        setFixProgress({ phase: 'extracting', current: 0, total: 1, current_file: '' })
        const p = await invoke('ensure_card_images', { cachePath })
        setCardImagesPath(p)
      } else {
        setFixProgress({ phase: 'done', current: 1, total: 1, current_file: '' })
      }
    })();

    return () => { if (unlisten) unlisten() }
  }, [inventoryData?.mods?.length])

  return (
    <MonitoringContext.Provider value={{
      exportData, spIncursions, arbys, descendiaDescs, archonModifiers,
      dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, ES, ENW, ENWRawRewards, ExportImages, ExportTextIcons, arbyTiers: ARBY_TIERS,
      isMonitoring, monitorResult, autoStart, setAutoStart, lastUpdate, rawInventory, inventoryData, isInventoryLoading, worldState, setWorldState, statusText,
      masteryProgress, allPrices, isPriceLoading, priceFetchProgress, priceLastUpdated, refreshPrices,
      startMonitoring, stopMonitoring, manualRefresh, callApiHelper,
      cardImagesPath, fixProgress, retryCardImages,
    }}>
      {children}
    </MonitoringContext.Provider>
  )
}

export const useMonitoring = () => useContext(MonitoringContext)
