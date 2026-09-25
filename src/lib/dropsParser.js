import { BARO_RELIC_NAMES } from './baroRelics.js'
import { sortSourcesByChanceInRotations } from './chanceSort.js'

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
    'ExportKeys',
    'ExportMisc',
    'ExportDrones',
    'ExportRailjackWeapons',
    'ExportFusionBundles',
    'ExportRewards',
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
      const resolved = dict[locKey] || dict['/' + locKey] || locKey || ''
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

// Maps an assembled item's uniqueName (recipe.resultType) to its own
// blueprint's uniqueName (the ExportRecipes object key). A two-tier item
// (e.g. most Primes) has two distinct real game entities - the blueprint
// and the assembled item - each independently ownable/droppable. Used so a
// drops.wf reward literally named "X Blueprint" can be attributed to the
// blueprint itself instead of to the assembled item, when a separate
// blueprint genuinely exists (see addNamedSource's " Blueprint" fallback).
function buildResultTypeToBlueprintMap(exportData) {
  const map = {}
  const recipes = exportData?.ExportRecipes
  if (!recipes || typeof recipes !== 'object' || Array.isArray(recipes)) return map
  const resources = exportData?.ExportResources || {}
  const componentMetadata = {}
  const componentRewardNames = {}
  const resourceByUniqueName = (uniqueName) => resources[uniqueName]
    || resources?.ExportResources?.[uniqueName]
    || (Array.isArray(resources) ? resources.find((resource) => resource?.uniqueName === uniqueName) : null)
  const partFromResource = (resource) => {
    const match = String(resource?.description || '').match(/^([^.]*) component of the /i)
    return match ? `${match[1].trim()} Blueprint` : null
  }
  for (const [blueprintUn, recipe] of Object.entries(recipes)) {
    if (!recipe?.resultType) continue
    map[recipe.resultType] = blueprintUn
    for (const ingredient of recipe.ingredients || []) {
      const componentUn = ingredient?.ItemType || ingredient?.itemType
      const resource = resourceByUniqueName(componentUn)
      const part = partFromResource(resource)
      if (!componentUn || !part) continue
      const metadata = { parentResultType: recipe.resultType, part, componentUn }
      componentMetadata[componentUn] = metadata
      if (resource?.name) componentRewardNames[`${resource.name} blueprint`.toLowerCase()] = metadata
    }
  }
  map.componentMetadata = componentMetadata
  map.componentRewardNames = componentRewardNames
  return map
}

// A component's drop rows are filed under its PARENT (labelled with the part, for the parent's
// drawer) and ALSO under the component's own keys (its blueprint recipe key and its
// resultType), so opening the part itself (e.g. Inventory > Parts > Narin Chassis) finds its own drop table.
function addComponentSource(index, component, source, resultTypeToBlueprint) {
  const labelled = { ...source, part: component.part }
  addSource(index, component.parentResultType, labelled)
  if (component.componentUn) {
    addSource(index, component.componentUn, labelled)
    const blueprintUn = resultTypeToBlueprint?.[component.componentUn]
    if (blueprintUn && blueprintUn !== component.componentUn) addSource(index, blueprintUn, labelled)
  }
}

function addSource(index, itemUn, source) {
  if (!itemUn) return
  const norm = itemUn.replace('/StoreItems/', '/')
  if (!index[norm]) index[norm] = []
  index[norm].push(source)
}

function addNamedSource(index, nameMap, itemName, source, resultTypeToBlueprint) {
  if (!itemName) return
  const lc = itemName.toLowerCase().trim()
  // Skip generic credit/endo/affinity caches
  if (/^[\d,]+x?\s*(credits?|endo|affinity|focus)/i.test(lc)) return

  const tryName = (name) => {
    const uniqueNames = nameMap[name]
    if (uniqueNames && uniqueNames.length > 0) {
      for (const un of uniqueNames) {
        const component = resultTypeToBlueprint?.componentMetadata?.[un]
        if (component) addComponentSource(index, component, source, resultTypeToBlueprint)
        else addSource(index, un, source)
      }
      return true
    }
    return false
  }

  // Try the name as-is
  const componentReward = resultTypeToBlueprint?.componentRewardNames?.[lc]
  let found = false
  if (componentReward) {
    addComponentSource(index, componentReward, source, resultTypeToBlueprint)
    found = true
  } else {
    found = tryName(lc)
  }

  // Try without trailing " Blueprint". A reward literally named "X
  // Blueprint" usually means the game's own indexed name for the blueprint
  // itself doesn't match this exact string (single-tier items like Braton
  // have no separately-searchable blueprint name), so stripping the suffix
  // and matching "X" was a safe fallback there. But for a two-tier item
  // (most Primes), "X" resolves to the ASSEMBLED item's own uniqueName - a
  // real, separately-owned entity distinct from its blueprint - so matching
  // there misattributes the blueprint's drop source to the assembled item.
  // Confirmed live: "Afuris Prime Blueprint" relic-drop rewards were being
  // filed under Afuris Prime the weapon instead of Afuris Prime Blueprint.
  // Redirect to the item's own real blueprint uniqueName when one exists.
  if (!found && lc.endsWith(' blueprint')) {
    const without = lc.slice(0, -10)
    const uniqueNames = nameMap[without]
    if (uniqueNames && uniqueNames.length > 0) {
      for (const un of uniqueNames) {
        const component = resultTypeToBlueprint?.componentMetadata?.[un]
        if (component) {
          addComponentSource(index, component, source, resultTypeToBlueprint)
          continue
        }
        const blueprintUn = resultTypeToBlueprint?.[un];
        addSource(index, blueprintUn || un, source);
      }
      found = true;
    }
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

function processDropsAll(index, DropsAll, nameMap, resultTypeToBlueprint) {
  if (!DropsAll || typeof DropsAll !== 'object') return
  const provenance = DropsAll.__source || 'drops.wf'
  const addNamed = (itemName, source) => addNamedSource(index, nameMap, itemName, source, resultTypeToBlueprint)

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
          addNamed(entry.itemName, {
            type: 'mission',
            region: planet,
            node: nodeName,
            nodeName: nodeName,
            missionType: gameMode,
            rotation: rotation === 'A' ? null : rotation,
            chance: normChance(entry.chance),
            itemCount: 1,
            source: provenance,
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
        addNamed(entry.itemName, {
          type: 'relic',
          relicEra,
          relicName: relicEra ? `${relicEra} ${relicName}` : relicName,
          rarity: entry.rarity || 'COMMON',
          chance: normChance(entry.chance),
          relicManifest: relicName,
          state,
          source: provenance,
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
        addNamed(modLoc.modName, {
          type: 'enemy',
          enemyName: enemy.enemyName,
          rarity: enemy.rarity || '',
          chance: normChance(enemy.chance),
          enemyDropChance: enemy.enemyModDropChance ?? null,
          source: provenance,
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
        addNamed(mod.modName, {
          type: 'enemy',
          enemyName: enemy.enemyName,
          rarity: mod.rarity || '',
          chance: normChance(mod.chance),
          source: provenance,
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
        addNamed(itemName, {
          type: 'enemy',
          enemyName: enemy.enemyName,
          rarity: enemy.rarity || '',
          chance: normChance(enemy.chance),
          source: provenance,
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
          addNamed(item.itemName, {
            type: 'enemy',
            enemyName: enemy.enemyName,
            rarity: item.rarity || '',
            chance: normChance(item.chance),
            source: provenance,
          })
        }
      }
      if (enemy.mods) {
        for (const mod of enemy.mods) {
          addNamed(mod.modName, {
            type: 'enemy',
            enemyName: enemy.enemyName,
            rarity: mod.rarity || '',
            chance: normChance(mod.chance),
            source: provenance,
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
          addNamed(entry.itemName, {
            type: 'bounty',
            bountyLevel,
            rotation: rotation === 'A' ? null : rotation,
            stage: entry.stage || '',
            rarity: entry.rarity || '',
            chance: normChance(entry.chance),
            source: provenance,
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
      addNamed(entry.itemName, {
        type: 'sortie',
        rarity: entry.rarity || '',
        chance: normChance(entry.chance),
        source: provenance,
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
        addNamed(entry.itemName, {
          type: 'transient',
          objectiveName,
          rotation: entry.rotation || '',
          rarity: entry.rarity || '',
          chance: normChance(entry.chance),
          source: provenance,
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
          addNamed(entry.itemName, {
            type: 'key',
            keyName,
            rotation: rotation === 'A' ? null : rotation,
            rarity: entry.rarity || '',
            chance: normChance(entry.chance),
            source: provenance,
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
        addNamed(entry.item, {
          type: 'syndicate',
          syndicateName,
          place: entry.place || '',
          standing: entry.standing ?? null,
          rarity: entry.rarity || '',
          chance: normChance(entry.chance),
          source: provenance,
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
        addNamed(item.item, {
          type: 'avatar',
          sourceName,
          rarity: item.rarity || '',
          chance: normChance(item.chance),
          source: provenance,
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

// ExportUpgrades includes synthetic mod-set marker records such as
// `AmarSetMod`. They are displayed in the Mods catalog, but their actual
// member mods carry the acquisition rows. Mirror those rows onto the marker
// so clicking the set entry does not fall through to the generic Wiki text.
function processModSetSources(index, exportData) {
  const upgrades = exportData?.ExportUpgrades
  if (!upgrades || typeof upgrades !== 'object') return

  for (const [memberKey, member] of Object.entries(upgrades)) {
    const modSet = member?.modSet
    if (!modSet) continue
    const memberSources = index[memberKey.replace('/StoreItems/', '/')] || []
    if (memberSources.length === 0) continue

    const setKey = modSet.replace('/StoreItems/', '/')
    if (!index[setKey]) index[setKey] = []
    for (const source of memberSources) {
      const signature = JSON.stringify(source)
      if (!index[setKey].some((existing) => JSON.stringify(existing) === signature)) {
        index[setKey].push(source)
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
  const resultTypeToBlueprint = buildResultTypeToBlueprintMap(exportData)
  processDropsAll(index, DropsAll, nameMap, resultTypeToBlueprint)
  processBaroRelics(index)
  processModSetSources(index, exportData)

  return index
}

export function getDropSources(uniqueName, dropIndex) {
  if (!uniqueName || !dropIndex) return []
  const norm = uniqueName.replace('/StoreItems/', '/')
  return sortSourcesByChanceInRotations(dropIndex[norm] || [])
}

export function getDropSourcesWithFallback(uniqueName, dropIndex, displayName) {
  if (!uniqueName || !dropIndex) return []
  const norm = uniqueName.replace('/StoreItems/', '/')
  const sources = dropIndex[norm] || []
  const fallbackSources = displayName
    ? dropIndex['display:' + displayName.toLowerCase().trim()] || []
    : []
  return sortSourcesByChanceInRotations(sources.concat(fallbackSources))
}
