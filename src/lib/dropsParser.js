import { BARO_RELIC_NAMES } from './baroRelics'

function buildNameToUniqueNameMap(exportData, dict) {
  const map = {}
  const tables = [
    'ExportWarframes',
    'ExportWeapons',
    'ExportSentinels',
    'ExportUpgrades',
    'ExportAvionics',
    'ExportArcanes',
    'ExportResources',
    'ExportFocusUpgrades',
    'ExportModSet',
    'ExportUpgradesLocalized',
    'ExportRelics',
    'ExportCustoms',
    'ExportGear',
    'ExportFlavour',
    'ExportSyndicates',
    'ExportBoosterPacks',
  ]
  // Index items with direct uniqueName + name fields
  for (const tblName of tables) {
    const rawData = exportData[tblName]
    const data = rawData?.[tblName] ?? rawData
    if (!data) continue
    const items = Array.isArray(data)
      ? data.map((item) => [null, item])
      : Object.entries(data)
    for (const [entryKey, item] of items) {
      if (!item) continue
      // Several DE export tables (notably ExportUpgrades and some resource
      // tables) use the unique name as the object key and omit an inner
      // uniqueName field. DropsAll names still need to resolve to that key.
      const itemUniqueName = item.uniqueName || item.ItemType || entryKey
      if (!itemUniqueName) continue
      const locKey = item.name || item.displayName
      if (!locKey) continue
      const resolved = dict[locKey] || dict['/' + locKey] || ''
      const displayName = resolved.replace(/<[^>]*>/g, '').trim()
      if (displayName && !displayName.startsWith('/')) {
        const key = displayName.toLowerCase()
        if (!map[key]) map[key] = []
        map[key].push(itemUniqueName)
      }
    }
  }
  // Index ExportRecipes: recipe.resultType acts as the item's uniqueName
  const recipes = exportData.ExportRecipes
  if (recipes && typeof recipes === 'object') {
    const recipeItems = Array.isArray(recipes) ? recipes : Object.values(recipes)
    for (const recipe of recipeItems) {
      if (!recipe || !recipe.resultType) continue
      const locKey = recipe.name || ''
      if (locKey) {
        const resolved = dict[locKey] || dict['/' + locKey] || ''
        const displayName = resolved.replace(/<[^>]*>/g, '').trim()
        if (displayName && !displayName.startsWith('/')) {
          const key = displayName.toLowerCase()
          if (!map[key]) map[key] = []
          map[key].push(recipe.resultType)
        }
      }
    }
  }
  // Index ExportRelics by their display name (era + category). Relic entries
  // have no name/uniqueName/displayName fields - the uniqueName is the dict
  // key - so they were never indexed before, meaning DropsAll's "Axi A21
  // Relic" mission rewards could never resolve to a relic uniqueName, and
  // relic cards fell through to the wiki fallback. Build the display name
  // from era + category (e.g. "Axi A21").
  const relics = exportData.ExportRelics
  if (relics && typeof relics === 'object') {
    const relicEntries = Array.isArray(relics) ? relics : Object.entries(relics)
    for (const [relicUn, relic] of relicEntries) {
      if (!relic) continue
      const era = relic.era || ''
      const category = relic.category || ''
      if (!era || !category) continue
      const displayName = `${era} ${category}`.toLowerCase()
      if (!map[displayName]) map[displayName] = []
      map[displayName].push(relicUn)
    }
  }
  return map
}

function addSource(index, itemUn, source) {
  if (!itemUn) return
  const norm = itemUn.replace('/StoreItems/', '/')
  if (!index[norm]) index[norm] = []
  index[norm].push(source)
}

function addNamedSource(index, nameMap, itemName, source) {
  if (!itemName) return
  const lc = itemName.toLowerCase().trim()
  // Skip generic credit/endo/affinity caches
  if (/^[\d,]+x?\s*(credits?|endo|affinity|focus)/i.test(lc)) return

  const tryName = (name) => {
    const uniqueNames = nameMap[name]
    if (uniqueNames && uniqueNames.length > 0) {
      for (const un of uniqueNames) {
        addSource(index, un, source)
      }
      return true
    }
    return false
  }

  // Try the name as-is
  let found = tryName(lc)

  // Try without trailing " Blueprint"
  if (!found && lc.endsWith(' blueprint')) {
    const without = lc.slice(0, -10)
    found = tryName(without)
    if (!found) {
      const fallbackKey = 'display:' + without
      if (!index[fallbackKey]) index[fallbackKey] = []
      index[fallbackKey].push(source)
    }
  }

  // Try with " Blueprint" appended
  if (!found && !lc.endsWith(' blueprint')) {
    const withBp = lc + ' blueprint'
    found = tryName(withBp)
    if (!found) {
      const fallbackKey = 'display:' + withBp
      if (!index[fallbackKey]) index[fallbackKey] = []
      index[fallbackKey].push(source)
    }
  }

  // Try without trailing " Relic" (DropsAll names relics "Axi A21 Relic",
  // but ExportRelics display names are "Axi A21" - era + category). A
  // relic has 4 real per-quality DE uniqueNames (Bronze/Silver/Gold/
  // Platinum) but the app's own relic objects only carry a synthetic
  // "<Era> <Category> Relic" id with no way to know which quality-specific
  // path to look up - so always ALSO file this source under a "display:"
  // key for the era+category, not just under the real per-quality
  // uniqueNames tryName() resolves. Without this, a successful tryName()
  // match short-circuited the display: fallback entirely, so the app's
  // relic screens could never find data that genuinely existed in the
  // index. Confirmed live 2026-08-11: dropIndex had 86-145 real sources
  // filed correctly per quality-variant uniqueName, completely unreachable
  // by the app's actual relic query.
  if (lc.endsWith(' relic')) {
    const without = lc.slice(0, -6)
    found = tryName(without) || found
    const fallbackKey = 'display:' + without
    if (!index[fallbackKey]) index[fallbackKey] = []
    index[fallbackKey].push(source)
  }

  // If nothing matched, store under the original name
  if (!found) {
    const fallbackKey = 'display:' + lc
    if (!index[fallbackKey]) index[fallbackKey] = []
    index[fallbackKey].push(source)
  }
}

const normChance = (c) => c != null ? c / 100 : null

function processDropsAll(index, DropsAll, nameMap) {
  if (!DropsAll || typeof DropsAll !== 'object') return

  // ── missionRewards: planet -> node -> rotation -> rewards ──────────────
  // Two shapes exist in the drops.wf feed:
  //   1. dict:  { A: [...], B: [...], C: [...], D: [...] }
  //   2. list:  [...flat entries...] (e.g. Assassination/Raid nodes)
  // The flat-list shape was silently ignored before, dropping a large
  // portion of mission drop sources from the index.
  const missionRewards = DropsAll.missionRewards
  if (missionRewards && typeof missionRewards === 'object') {
    for (const [planet, nodes] of Object.entries(missionRewards)) {
      if (!nodes || typeof nodes !== 'object') continue
      for (const [nodeName, nodeData] of Object.entries(nodes)) {
        if (!nodeData || !nodeData.rewards) continue
        const gameMode = nodeData.gameMode || ''
        const rewards = nodeData.rewards
        const addEntry = (entry, rotation) => {
          if (!entry || !entry.itemName) return
          addNamedSource(index, nameMap, entry.itemName, {
            type: 'mission',
            node: nodeName,
            nodeName: nodeName,
            missionType: gameMode,
            rotation: rotation === 'A' ? null : rotation,
            chance: normChance(entry.chance),
            itemCount: 1,
            source: 'drops.wf',
          })
        }
        if (Array.isArray(rewards)) {
          for (const entry of rewards) addEntry(entry, null)
        } else if (typeof rewards === 'object') {
          for (const rotation of ['A', 'B', 'C', 'D']) {
            const entries = rewards[rotation]
            if (!Array.isArray(entries)) continue
            for (const entry of entries) addEntry(entry, rotation)
          }
        }
      }
    }
  }

  // ── relics: per relic + state entries ──────────────────────────────────
  const relics = DropsAll.relics
  if (Array.isArray(relics)) {
    for (const relic of relics) {
      if (!relic || !relic.rewards) continue
      const relicEra = relic.tier || ''
      const relicName = relic.relicName || ''
      const state = relic.state || ''
      for (const entry of relic.rewards) {
        addNamedSource(index, nameMap, entry.itemName, {
          type: 'relic',
          relicEra,
          relicName: relicEra ? `${relicEra} ${relicName}` : relicName,
          rarity: entry.rarity || 'COMMON',
          chance: normChance(entry.chance),
          relicManifest: relicName,
          state,
          source: 'drops.wf',
        })
      }
    }
  }

  // ── modLocations: modName -> enemies ──────────────────────────────────
  const modLocations = DropsAll.modLocations
  if (Array.isArray(modLocations)) {
    for (const modLoc of modLocations) {
      if (!modLoc || !modLoc.modName || !modLoc.enemies) continue
      for (const enemy of modLoc.enemies) {
        addNamedSource(index, nameMap, modLoc.modName, {
          type: 'enemy',
          enemyName: enemy.enemyName,
          rarity: enemy.rarity || '',
          chance: normChance(enemy.chance),
          enemyDropChance: enemy.enemyModDropChance ?? null,
          source: 'drops.wf',
        })
      }
    }
  }

  // ── enemyModTables: enemyName -> mods ──────────────────────────────────
  const enemyModTables = DropsAll.enemyModTables
  if (Array.isArray(enemyModTables)) {
    for (const enemy of enemyModTables) {
      if (!enemy || !enemy.enemyName || !enemy.mods) continue
      for (const mod of enemy.mods) {
        addNamedSource(index, nameMap, mod.modName, {
          type: 'enemy',
          enemyName: enemy.enemyName,
          rarity: mod.rarity || '',
          chance: normChance(mod.chance),
          source: 'drops.wf',
        })
      }
    }
  }

  // ── blueprintLocations: itemName -> enemies ────────────────────────────
  const blueprintLocations = DropsAll.blueprintLocations
  if (Array.isArray(blueprintLocations)) {
    for (const bpLoc of blueprintLocations) {
      if (!bpLoc || !bpLoc.itemName || !bpLoc.enemies) continue
      const itemName = bpLoc.blueprintName || bpLoc.itemName
      for (const enemy of bpLoc.enemies) {
        addNamedSource(index, nameMap, itemName, {
          type: 'enemy',
          enemyName: enemy.enemyName,
          rarity: enemy.rarity || '',
          chance: normChance(enemy.chance),
          source: 'drops.wf',
        })
      }
    }
  }

  // ── enemyBlueprintTables: enemyName -> items + mods ────────────────────
  const enemyBpTables = DropsAll.enemyBlueprintTables
  if (Array.isArray(enemyBpTables)) {
    for (const enemy of enemyBpTables) {
      if (!enemy || !enemy.enemyName) continue
      if (enemy.items) {
        for (const item of enemy.items) {
          addNamedSource(index, nameMap, item.itemName, {
            type: 'enemy',
            enemyName: enemy.enemyName,
            rarity: item.rarity || '',
            chance: normChance(item.chance),
            source: 'drops.wf',
          })
        }
      }
      if (enemy.mods) {
        for (const mod of enemy.mods) {
          addNamedSource(index, nameMap, mod.modName, {
            type: 'enemy',
            enemyName: enemy.enemyName,
            rarity: mod.rarity || '',
            chance: normChance(mod.chance),
            source: 'drops.wf',
          })
        }
      }
    }
  }

  // ── bounty rewards ─────────────────────────────────────────────────────
  const bountyCategories = [
    'cetusBountyRewards',
    'solarisBountyRewards',
    'deimosRewards',
    'zarimanRewards',
    'entratiLabRewards',
    'hexRewards',
  ]
  for (const cat of bountyCategories) {
    const bountyData = DropsAll[cat]
    if (!Array.isArray(bountyData)) continue
    for (const bounty of bountyData) {
      if (!bounty || !bounty.rewards) continue
      const bountyLevel = bounty.bountyLevel || ''
      const rewards = bounty.rewards
      for (const rotation of ['A', 'B', 'C']) {
        const entries = rewards[rotation]
        if (!Array.isArray(entries)) continue
        for (const entry of entries) {
          addNamedSource(index, nameMap, entry.itemName, {
            type: 'bounty',
            bountyLevel,
            rotation: rotation === 'A' ? null : rotation,
            stage: entry.stage || '',
            rarity: entry.rarity || '',
            chance: normChance(entry.chance),
            source: 'drops.wf',
          })
        }
      }
    }
  }

  // ── sortieRewards ──────────────────────────────────────────────────────
  const sortieRewards = DropsAll.sortieRewards
  if (Array.isArray(sortieRewards)) {
    for (const entry of sortieRewards) {
      if (!entry) continue
      addNamedSource(index, nameMap, entry.itemName, {
        type: 'sortie',
        rarity: entry.rarity || '',
        chance: normChance(entry.chance),
        source: 'drops.wf',
      })
    }
  }

  // ── transientRewards (Arbitrations etc.) ────────────────────────────────
  const transientRewards = DropsAll.transientRewards
  if (Array.isArray(transientRewards)) {
    for (const group of transientRewards) {
      if (!group || !group.rewards) continue
      const objectiveName = group.objectiveName || ''
      for (const entry of group.rewards) {
        addNamedSource(index, nameMap, entry.itemName, {
          type: 'transient',
          objectiveName,
          rotation: entry.rotation || '',
          rarity: entry.rarity || '',
          chance: normChance(entry.chance),
          source: 'drops.wf',
        })
      }
    }
  }

  // ── keyRewards (Dragon Key / Derelict) ─────────────────────────────────
  const keyRewards = DropsAll.keyRewards
  if (Array.isArray(keyRewards)) {
    for (const key of keyRewards) {
      if (!key || !key.rewards) continue
      const keyName = key.keyName || ''
      const rewards = key.rewards
      for (const rotation of ['A', 'B', 'C']) {
        const entries = rewards[rotation]
        if (!Array.isArray(entries)) continue
        for (const entry of entries) {
          addNamedSource(index, nameMap, entry.itemName, {
            type: 'key',
            keyName,
            rotation: rotation === 'A' ? null : rotation,
            rarity: entry.rarity || '',
            chance: normChance(entry.chance),
            source: 'drops.wf',
          })
        }
      }
    }
  }

  // ── syndicates ─────────────────────────────────────────────────────────
  const syndicates = DropsAll.syndicates
  if (syndicates && typeof syndicates === 'object') {
    for (const [syndicateName, offerings] of Object.entries(syndicates)) {
      if (!Array.isArray(offerings)) continue
      for (const entry of offerings) {
        if (!entry) continue
        addNamedSource(index, nameMap, entry.item, {
          type: 'syndicate',
          syndicateName,
          place: entry.place || '',
          standing: entry.standing ?? null,
          rarity: entry.rarity || '',
          chance: normChance(entry.chance),
          source: 'drops.wf',
        })
      }
    }
  }

  // ── resourceByAvatar / sigilByAvatar / additionalItemByAvatar ───────────
  const avatarCategories = ['resourceByAvatar', 'sigilByAvatar', 'additionalItemByAvatar']
  for (const cat of avatarCategories) {
    const data = DropsAll[cat]
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry || !entry.source || !entry.items) continue
      const sourceName = entry.source
      for (const item of entry.items) {
        if (!item || !item.item) continue
        addNamedSource(index, nameMap, item.item, {
          type: 'avatar',
          sourceName,
          rarity: item.rarity || '',
          chance: normChance(item.chance),
          source: 'drops.wf',
        })
      }
    }
  }
}

// Baro-only relics have no active mission drop table in DropsAll (they're
// sold directly by Baro, not dropped) - give their relic cards a truthful
// source instead of falling through to the generic "no specific source" text.
function processBaroRelics(index) {
  const source = {
    type: 'syndicate',
    syndicateName: "Baro Ki'Teer",
    place: 'Void Trader (Baro relic)',
    source: 'baro',
  }
  for (const relicName of BARO_RELIC_NAMES) {
    for (const key of [`display:${relicName.toLowerCase()}`, `display:${relicName.toLowerCase()} relic`]) {
      if (!index[key]) index[key] = []
      if (!index[key].some((existing) => JSON.stringify(existing) === JSON.stringify(source))) {
        index[key].push(source)
      }
    }
  }
}

export function buildDropIndex(exportData) {
  if (!exportData) return {}

  const ERg = exportData.ExportRegions
  const ERw = exportData.ExportRewards
  const ERel = exportData.ExportRelics
  const dict = exportData.dict || {}

  const index = {}
  const nameMap = buildNameToUniqueNameMap(exportData, dict)

  const addSource_ = (itemUn, source) => addSource(index, itemUn, source)

  // ── Existing: ExportRegions + ExportRewards ────────────────────────────
  if (ERg && ERw && typeof ERg === 'object' && typeof ERw === 'object') {
    const rotations = ['A', 'B', 'C', 'D']
    for (const [nodeKey, region] of Object.entries(ERg)) {
      const manifests = region.rewardManifests
      if (!manifests || !Array.isArray(manifests)) continue

      const nodeNameKey = region.name
      const nodeName = (dict[nodeNameKey] || dict['/' + nodeNameKey] || nodeNameKey || nodeKey).replace(/<[^>]*>/g, '').trim()
      const missionType = region.missionType || ''

      for (const manifestPath of manifests) {
        const rewardTable = ERw[manifestPath]
        if (!rewardTable || !Array.isArray(rewardTable)) continue

        for (let tierIdx = 0; tierIdx < rewardTable.length; tierIdx++) {
          const tier = rewardTable[tierIdx]
          if (!Array.isArray(tier)) continue

          const rotation = rotations[tierIdx] || `Tier ${tierIdx + 1}`

          for (const entry of tier) {
            if (!entry || !entry.type) continue
            addSource_(entry.type, {
              type: 'mission',
              node: nodeKey,
              nodeName,
              missionType,
              rotation: tierIdx > 0 ? rotation : null,
              chance: entry.probability ?? null,
              itemCount: entry.itemCount ?? 1,
            })
          }
        }
      }
    }
  }

  // ── Existing: ExportRelics + ExportRewards ─────────────────────────────
  if (ERel && ERw) {
    const relics = Array.isArray(ERel) ? ERel : Object.values(ERel)
    for (const relic of relics) {
      if (!relic || !relic.rewardManifest) continue
      const rewardTable = ERw[relic.rewardManifest]
      if (!rewardTable || !Array.isArray(rewardTable)) continue

      const pool = Array.isArray(rewardTable[0]) ? rewardTable[0] : rewardTable
      const relicEra = relic.era || ''
      const relicCat = relic.category || ''

      for (const entry of pool) {
        if (!entry || !entry.type) continue
        addSource_(entry.type, {
          type: 'relic',
          relicEra,
          relicName: relicCat ? `${relicEra} ${relicCat}` : null,
          rarity: entry.rarity || 'COMMON',
          relicManifest: relic.rewardManifest,
        })
      }
    }
  }

  // ── New: warframe-drop-data ────────────────────────────────────────────
  const DropsAll = exportData.DropsAll
  processDropsAll(index, DropsAll, nameMap)
  processBaroRelics(index)

  return index
}

export function getDropSources(uniqueName, dropIndex) {
  if (!uniqueName || !dropIndex) return []
  const norm = uniqueName.replace('/StoreItems/', '/')
  return dropIndex[norm] || []
}

export function getDropSourcesWithFallback(uniqueName, dropIndex, displayName) {
  if (!uniqueName || !dropIndex) return []
  const norm = uniqueName.replace('/StoreItems/', '/')
  const sources = dropIndex[norm] || []
  if (displayName) {
    const fallback = dropIndex['display:' + displayName.toLowerCase().trim()]
    if (fallback) return sources.concat(fallback)
  }
  return sources
}
