import { resolveChallenge, resolveMissionType, resolveNode } from './warframeUtils.js'
console.log('notificationManager loaded');
const TRIGGER_DEFINITIONS = [
  {
    id: 'fissure',
    label: 'Void Fissure',
    columns: [
      {
        key: 'difficulties', label: 'Difficulty', type: 'multi-select', options: [
          { value: 'normal', label: 'Normal' },
          { value: 'steel_path', label: 'Steel Path' },
        ]
      },
      {
        key: 'tiers', label: 'Tiers', type: 'multi-select', options: [
          'Lith', 'Meso', 'Neo', 'Axi', 'Requiem', 'Omnia',
        ].map(v => ({ value: v, label: v }))
      },
      {
        key: 'missionTypes', label: 'Mission Types', type: 'multi-select', options: [
          'Exterminate', 'Capture', 'Survival', 'Defense', 'Interception',
          'Sabotage', 'Rescue', 'Spy', 'Mobile Defense', 'Disruption',
          'Void Flood', 'Void Cascade', 'Void Armageddon',
        ].map(v => ({ value: v, label: v }))
      },
    ],
    defaultConfig: { difficulties: ['normal', 'steel_path'], tiers: [], missionTypes: [] },
  },
  {
    id: 'arbitration',
    label: 'Arbitration',
    columns: [
      {
        key: 'grades', label: 'Grade', type: 'multi-select', options: [
          { value: 'S', label: 'S-Tier' },
          { value: 'A', label: 'A-Tier' },
          { value: 'B', label: 'B-Tier' },
          { value: 'C', label: 'C-Tier' },
          { value: 'D', label: 'D-Tier' },
          { value: 'F', label: 'F-Tier' },
        ]
      },
      { key: 'advance', label: 'Alert before (min)', type: 'number', default: 30 },
    ],
    defaultConfig: { grades: ['S'], advance: 30 },
  },
  {
    id: 'void_traces',
    label: 'Void Traces Capped',
    columns: [
      { key: 'cooldown', label: 'Cooldown (min)', type: 'number', default: 180 },
    ],
    defaultConfig: { cooldown: 180 },
  },
  {
    id: 'chat',
    label: 'Incoming Messages',
    columns: [
      { key: '', label: 'Will only show notifications when Warframe is not focused.' },
    ],
    defaultConfig: {},
  },
  {
    id: 'syndicate',
    label: 'Syndicate Standing Capped',
    columns: [
      { key: 'cooldown', label: 'Cooldown (min)', type: 'number', default: 180 },
    ],
    defaultConfig: { cooldown: 180 },
  },
  {
    id: 'syndicate_waste',
    label: 'Syndicate Standing Waste',
    columns: [
      { key: 'cooldown', label: 'Cooldown (min)', type: 'number', default: 180 },
    ],
    defaultConfig: { cooldown: 180 },
  },
  {
    id: 'foundry',
    label: 'Foundry Complete',
    columns: [
      { key: 'advance', label: 'Notify when remaining time is (minutes)', type: 'number', default: 5 },
    ],
    defaultConfig: { advance: 5 },
  },
  {
    id: 'mastery',
    label: 'Mastery Progress',
    columns: [
      { key: 'threshold', label: 'Threshold %', type: 'number', default: 75 },
    ],
    defaultConfig: { threshold: 75 },
  },
  {
    id: 'checklist',
    label: 'Checklist Reminder',
    columns: [
      { key: 'taskFilter', label: 'Tasks', type: 'checklist-tasks', placeholder: 'Filter tasks…' },
      { key: 'interval', label: 'Interval (min)', type: 'number', default: 60 },
    ],
    defaultConfig: { taskFilter: [], interval: 60 },
  },
  {
    id: 'sale',
    label: 'Wishlisted Item on Sale',
    columns: [
      { key: 'cooldown', label: 'Cooldown (min)', type: 'number', default: 180 },
    ],
    defaultConfig: { cooldown: 180 },
  },
  {
    id: 'bounty',
    label: 'Bounty Available',
    columns: [
      {
        key: 'syndicates', label: 'Syndicate', type: 'multi-select', options: [
          { value: 'ZarimanSyndicate', label: 'Zariman' },
          { value: 'EntratiLabSyndicate', label: 'Cavia' },
          { value: 'HexSyndicate', label: 'Hex' },
          { value: 'CetusSyndicate', label: 'Cetus' },
          { value: 'EntratiSyndicate', label: 'Deimos' },
          { value: 'SolarisSyndicate', label: 'Vallis' },
        ]
      },
      {
        key: 'missionTypes', label: 'Mission Types', type: 'multi-select', options: [
          'Exterminate', 'Capture', 'Survival', 'Defense', 'Interception',
          'Sabotage', 'Rescue', 'Spy', 'Mobile Defense', 'Disruption',
          'Void Flood', 'Void Cascade', 'Void Armageddon',
          'Assassination', 'Excavation',
        ].map(v => ({ value: v, label: v }))
      },
    ],
    defaultConfig: { syndicates: [], missionTypes: [] },
  },
]

const TRIGGER_MAP = Object.fromEntries(TRIGGER_DEFINITIONS.map(t => [t.id, t]))

export function getTriggerDef(id) {
  return TRIGGER_MAP[id] || null
}

export function getAllTriggerDefs() {
  return TRIGGER_DEFINITIONS
}

export function getDefaultNotification(triggerId) {
  const def = getTriggerDef(triggerId)
  if (!def) return null
  return {
    id: crypto.randomUUID(),
    trigger: triggerId,
    enabled: true,
    config: { ...def.defaultConfig },
  }
}

export function evaluateNotifications(notifications, state) {
  const { inventoryData, worldstate, arbys, ERg, dict, ES, bountyCycle } = state
  if (!inventoryData) return []

  const results = []

  for (const notif of notifications) {
    if (!notif.enabled) continue

    switch (notif.trigger) {
      case 'fissure':
        evaluateFissure(notif, worldstate, results)
        break
      case 'arbitration':
        evaluateArbitration(notif, arbys, ERg, dict, results)
        break
      case 'void_traces':
        evaluateVoidTraces(notif, inventoryData, results)
        break
      case 'syndicate':
        evaluateSyndicate(notif, inventoryData, results)
        break
      case 'syndicate_waste':
        evaluateSyndicateWaste(notif, inventoryData, ES, results)
        break
      case 'foundry':
        evaluateFoundry(notif, inventoryData, results)
        break
      case 'mastery':
        evaluateMastery(notif, inventoryData, results)
        break
      case 'checklist':
        evaluateChecklist(notif, inventoryData, results)
        break
      case 'sale':
        evaluateSale(notif, inventoryData, worldstate, results)
        break
      case 'bounty':
        evaluateBounty(notif, state, results)
    }
  }

  return results
}

function evaluateFissure(notif, worldstate, results) {
  const fissures = worldstate?.fissures || []
  const config = notif.config || {}
  const difficulties = config.difficulties || []
  const tiers = config.tiers || []
  const missionTypes = config.missionTypes || []

  for (const f of fissures) {
    if (difficulties.length > 0) {
      const isSteelPath = f.isHard
      const matchesDifficulty = difficulties.some(d =>
        (d === 'normal' && !isSteelPath) || (d === 'steel_path' && isSteelPath)
      )
      if (!matchesDifficulty) continue
    }
    if (tiers.length > 0 && !tiers.includes(f.tier)) continue
    if (missionTypes.length > 0 && !missionTypes.some(mt => f.missionType?.toLowerCase().includes(mt.toLowerCase()))) continue

    results.push({
      notifId: notif.id,
      title: `${f.tier} Fissure`,
      message: `${f.missionType} on ${f.node}${f.isHard ? ' ( Steel Path )' : ''}`,
      image: 'IconRelic.png',
    })
  }
}

function evaluateArbitration(notif, arbys, ERg, dict, results) {
  if (!arbys || !ERg || Object.keys(ERg).length === 0) return

  const { getCurrentArby, getUpcomingArbies, ARBY_TIERS, resolveNode } = window.__KRONOS_NOTIF_HELPERS || {}
  if (!getCurrentArby || !getUpcomingArbies || !ARBY_TIERS || !resolveNode) return

  const grades = (notif.config?.grades || []).length > 0 ? notif.config.grades : ['S']
  const advance = (notif.config?.advance ?? 30) * 60 * 1000

  // Current S-tier arbitration
  const current = getCurrentArby(arbys, ERg, dict)
  if (current) {
    const grade = ARBY_TIERS[current.node] || 'F'
    if (grades.includes(grade)) {
      const remaining = current.ts + 3600000 - Date.now()
      const remainingMin = Math.max(0, Math.floor(remaining / 60000))
      results.push({
        notifId: notif.id,
        title: `${grade}-Tier Arbitration Active`,
        message: `${resolveNode(current.type, dict, ERg)} on ${resolveNode(current.node, dict, ERg)} (${remainingMin}m remaining)`,
        image: 'IconDashboard.png',
      })
    }
  }

  // Upcoming arbitration - fire if starting within the advance window
  const upcoming = getUpcomingArbies(arbys, ERg, dict, ARBY_TIERS, 10)
  const now = Date.now()
  for (const slot of upcoming) {
    if (!grades.includes(slot.grade)) continue
    const timeUntil = slot.ts - now
    if (timeUntil > 0 && timeUntil <= advance) {
      const startTime = new Date(slot.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      results.push({
        notifId: notif.id,
        title: `${slot.grade}-Tier Arbitration Soon`,
        message: `${resolveNode(slot.type, dict, ERg)} on ${resolveNode(slot.node, dict, ERg)} starting at ${startTime}`,
        image: 'IconDashboard.png',
      })
    }
  }
}

function evaluateVoidTraces(notif, inventoryData, results) {
  const { void_traces, void_traces_max } = inventoryData.account || {}
  if (void_traces && void_traces_max && void_traces >= void_traces_max) {
    results.push({
      notifId: notif.id,
      title: 'Void Traces Capped',
      message: `You have reached the maximum capacity of ${void_traces_max} Void Traces.`,
      image: 'IconRelic.png',
    })
  }
}

function evaluateSyndicate(notif, inventoryData, results) {
  const RANK_CAPS = {
    5: 132000, 4: 99000, 3: 70000, 2: 44000, 1: 22000, 0: 5000,
    [-1]: -22000, [-2]: -44000,
  }
  const getCumulativePreviousCaps = (rank) => {
    if (rank <= 0) return 0
    if (rank >= 5) return 5000 + 22000 + 44000 + 70000 + 99000
    if (rank === 4) return 5000 + 22000 + 44000 + 70000
    if (rank === 3) return 5000 + 22000 + 44000
    if (rank === 2) return 5000 + 22000
    if (rank === 1) return 5000
    return 0
  }

  const MAIN_SYNDICATE_TAGS = new Set([
    'SteelMeridianSyndicate', 'PerrinSyndicate', 'ArbitersSyndicate',
    'CephalonSudaSyndicate', 'RedVeilSyndicate', 'NewLokaSyndicate',
  ])
  const MAX_SYNDICATE_RANK = 5
  const affiliations = inventoryData.Affiliations || []

  for (const aff of affiliations) {
    if (!MAIN_SYNDICATE_TAGS.has(aff.Tag)) continue
    const rank = aff.Title ?? 0
    const total = aff.Standing ?? 0
    const cap = RANK_CAPS[rank] ?? 22000
    const previousCaps = getCumulativePreviousCaps(rank)
    const earned = Math.max(0, total - previousCaps)
    if (rank === MAX_SYNDICATE_RANK && earned >= cap && cap > 0) {
      results.push({
        notifId: notif.id,
        title: 'Syndicate Capped',
        message: `You have reached the maximum standing for ${aff.Tag.replace('Syndicate', '')}.`,
        image: 'IconMastery.png',
      })
    }
  }
}

function evaluateSyndicateWaste(notif, inventoryData, ES, results) {
  const AFFILIATION_TAGS = {
    steel: 'SteelMeridianSyndicate', perrin: 'PerrinSyndicate',
    arbiters: 'ArbitersSyndicate', suda: 'CephalonSudaSyndicate',
    veil: 'RedVeilSyndicate', newloka: 'NewLokaSyndicate',
  }
  const pledgedTag = inventoryData.SupportedSyndicate
  const pledgedShortTag = Object.entries(AFFILIATION_TAGS).find(([, v]) => v === pledgedTag)?.[0]
  if (!pledgedShortTag || !ES) return

  const pledgedExportData = ES[pledgedTag]
  if (!pledgedExportData) return

  const exportKeyToShort = Object.fromEntries(Object.entries(AFFILIATION_TAGS).map(([k, v]) => [v, k]))
  const enemyShortTags = pledgedExportData.alignments
    ? Object.entries(pledgedExportData.alignments)
      .filter(([, v]) => v < 0)
      .map(([k]) => exportKeyToShort[k])
      .filter(Boolean)
    : []

  const affiliations = inventoryData.Affiliations || []
  const enemiesWithStanding = enemyShortTags
    .map(tag => {
      const affTag = AFFILIATION_TAGS[tag]
      const aff = affiliations.find(a => a.Tag === affTag)
      return aff && (aff.Standing ?? 0) > 0 ? tag : null
    })
    .filter(Boolean)

  if (enemiesWithStanding.length > 0) {
    const names = enemiesWithStanding.join(', ')
    results.push({
      notifId: notif.id,
      title: 'Syndicate Standing at Risk',
      message: `Opposing syndicate${enemiesWithStanding.length > 1 ? 's' : ''} (${names}) have standing - spend it before it hits 0`,
      image: 'IconMastery.png',
    })
  }
}

function evaluateFoundry(notif, inventoryData, results) {
  const recipes = inventoryData.foundry || []
  const advance = (notif.config?.advance ?? 5) * 60 // min → seconds
  const now = Date.now() / 1000
  for (const item of recipes) {
    if (!item.finishTime || item.finishTime <= now) continue
    const remaining = item.finishTime - now
    if (remaining > 0 && remaining <= advance) {
      results.push({
        notifId: notif.id,
        title: 'Foundry Complete',
        message: `${item.name} is ready to claim!`,
        image: item.image || 'IconFoundry.png',
      })
    }
  }
}

function evaluateMastery(notif, inventoryData, results) {
  const currentRank = inventoryData.account?.mastery_rank
  if (currentRank == null) return
  const threshold = notif.config?.threshold ?? 75
  const xpPercent = inventoryData.account?.mastery_next_percent ?? 0
  if (xpPercent >= threshold) {
    results.push({
      notifId: notif.id,
      title: 'Mastery Progress',
      message: `You are ${Math.round(xpPercent)}% of the way to Mastery Rank ${currentRank + 1}.`,
      image: 'IconMastery.png',
    })
  }
}

function evaluateSale(notif, inventoryData, worldstate, results) {
  const wishlist = inventoryData.wishlist ?? []
  if (wishlist.length === 0) return
  const wishlistNames = new Set(wishlist.map(w => w.name?.toLowerCase()).filter(Boolean))

  const checkItem = (item, price, original, discount) => {
    if (!item) return
    const name = item.toLowerCase()
    for (const wlName of wishlistNames) {
      if (name.includes(wlName) || wlName.includes(name)) {
        results.push({
          notifId: notif.id,
          title: 'Wishlisted Item on Sale',
          message: `${item} — ${price} platinum (was ${original})`,
        })
        break
      }
    }
  }

  // Daily Deals (Darvo)
  for (const deal of worldstate?.dailyDeals ?? []) {
    checkItem(deal.item, deal.salePrice, deal.originalPrice, deal.discount)
  }

  // Market Flash Sales
  for (const sale of worldstate?.flashSales ?? []) {
    checkItem(sale.item, sale.salePrice, sale.originalPrice, sale.discount)
  }
}

function evaluateChecklist(notif, inventoryData, results) {
  const tasks = window.__checklistTasks || []
  if (tasks.length === 0) return

  const selectedIds = notif.config?.taskFilter || []
  const filtered = selectedIds.length > 0
    ? tasks.filter(t => selectedIds.includes(t.id))
    : tasks

  const interval = (notif.config?.interval || 60) * 60 * 1000
  const now = Date.now()

  for (const task of filtered) {
    const timeUntilReset = task.nextResetTime - now
    if (timeUntilReset > 0 && timeUntilReset <= interval) {
      results.push({
        notifId: notif.id,
        title: 'Checklist Task Due',
        message: `${task.label} resets soon!`,
        image: 'IconChecklist.png',
      })
    }
  }
}
const SYNDICATE_LABELS = {
  ZarimanSyndicate: 'Zariman',
  EntratiLabSyndicate: 'Cavia',
  HexSyndicate: 'Hex',
  CetusSyndicate: 'Cetus',
  EntratiSyndicate: 'Deimos',
  SolarisSyndicate: 'Vallis',
}
const BUNTY_MISSION_EXTRACTORS = [
  { re: /\/(Vania|Hex|1999)([A-Z][a-z]+)/, idx: 2 },
  { re: /\/(Cetus|Solaris|Deimos)([A-Z][a-z]+)/, idx: 2 },
  { re: /\/(Zariman|EntratiLab)([A-Z][a-z]+)/, idx: 2 },
]

function extractBountyMissionType(challenge) {
  if (!challenge) return ''
  for (const { re, idx } of BUNTY_MISSION_EXTRACTORS) {
    const m = challenge.match(re)
    if (m) return m[idx]
  }
  return ''
}

function evaluateBounty(notif, state, results) {
  const { bountyCycle, locationBounties, ERg, dict, EC } = state

  const config = notif.config || {}
  const syndicates = config.syndicates || []
  const missionTypes = config.missionTypes || []

  // ── Check bounty-cycle data (Zariman, Cavia, Hex) ────────────────────────
  if (bountyCycle?.bounties) {
    for (const [key, bounties] of Object.entries(bountyCycle.bounties)) {
      if (syndicates.length > 0 && !syndicates.includes(key)) continue
      const synLabel = SYNDICATE_LABELS[key] || key

      for (const b of bounties) {
        const name = b.challenge ? resolveChallenge(b.challenge, dict, EC) : 'Bounty'

        let mType = ''
        if (b.node && ERg?.[b.node]) {
          const entry = ERg[b.node]
          mType = resolveMissionType(entry.missionName || entry.missionType || '', dict, ERg)
        }
        if (!mType) {
          mType = resolveMissionType(extractBountyMissionType(b.challenge), dict, ERg)
        }
        if (missionTypes.length > 0 && !missionTypes.some(mt => mType?.toLowerCase().includes(mt.toLowerCase()))) continue

        const node = b.node ? resolveNode(b.node, dict, ERg) || '' : ''
        results.push({
          notifId: notif.id,
          title: `${synLabel} Bounty`,
          message: `${name}${mType ? ` (${mType})` : ''}${node ? ` on ${node}` : ''}`,
          image: 'IconMission.png',
        })
      }
    }
  }

  // ── Check location-bounties data (Cetus, Deimos, Vallis) ─────────────────
  if (!locationBounties) return
  const LOCATION_SYNDICATES = { CetusSyndicate: 'CetusSyndicate', EntratiSyndicate: 'EntratiSyndicate', SolarisSyndicate: 'SolarisSyndicate' }

  for (const [key, tiers] of Object.entries(locationBounties)) {
    if (!LOCATION_SYNDICATES[key]) continue
    if (syndicates.length > 0 && !syndicates.includes(key)) continue
    const synLabel = SYNDICATE_LABELS[key] || key

    for (const [_tier, challenges] of Object.entries(tiers)) {
      if (!Array.isArray(challenges)) continue
      for (const ch of challenges) {
        const name = resolveChallenge(ch, dict, EC) || 'Bounty'
        let mType = resolveMissionType(extractBountyMissionType(ch), dict, ERg)
        if (!mType) {
          const spaced = name.replace(/([A-Z])/g, ' $1').trim()
          const words = spaced.split(/\s+/)
          if (words.length > 0) mType = words[0]
        }
        if (missionTypes.length > 0 && !missionTypes.some(mt => mType?.toLowerCase().includes(mt.toLowerCase()))) continue

        results.push({
          notifId: notif.id,
          title: `${synLabel} Bounty`,
          message: `${name}${mType ? ` (${mType})` : ''}`,
          image: 'IconMission.png',
        })
      }
    }
  }
}
