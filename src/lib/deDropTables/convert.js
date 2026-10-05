// Convert normalized DE rows to the legacy DropsAll contract. This module is
// deliberately pure so it can run in the data worker without Node, Tauri,
// fetch, or filesystem access.

const BOUNTY_OUTPUTS = {
  cetusRewards: 'cetusBountyRewards',
  solarisRewards: 'solarisBountyRewards',
  deimosRewards: 'deimosRewards',
  zarimanRewards: 'zarimanRewards',
  entratiLabRewards: 'entratiLabRewards',
  hexRewards: 'hexRewards',
}

// Deliberately false until the coordinator reviews parity and flips it.
export const DE_DROP_TABLES_ENABLED = false

function groupsBy(rows, key) {
  const groups = new Map()
  for (const row of rows || []) {
    const value = row?.[key] || ''
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(row)
  }
  return groups
}

function reward(row) {
  return {
    itemName: row.item,
    rarity: row.rarity,
    chance: row.chance * 100,
    ...(row.underReview ? { underReview: true } : {}),
  }
}

const letter = (rotation) => rotation?.replace(/^Rotation\s+/i, '') || 'A'

// DE prints mission places as "[Event: ]Planet/Node (Mode)[ Extra]". The
// legacy feed split that into planet, node, and gameMode and marked events.
export function parseDePlace(place) {
  let text = String(place || '').trim()
  const isEvent = /^Event:\s*/i.test(text)
  text = text.replace(/^Event:\s*/i, '')
  const slash = text.indexOf('/')
  if (slash < 0) return { planet: 'Events', node: text, gameMode: '', isEvent }

  const planet = text.slice(0, slash)
  let rest = text.slice(slash + 1)
  const extra = /\s+Extra$/i.test(rest)
  rest = rest.replace(/\s+Extra$/i, '')
  const modeMatch = rest.match(/^(.*?)\s*\(([^()]*)\)$/)
  let node = modeMatch ? modeMatch[1] : rest
  const gameMode = modeMatch ? modeMatch[2] : ''
  node = node.replace(/^\(Variant\)\s*/i, 'Variant ')
  if (extra) node += ' (Extra)'
  else if (gameMode === 'Caches') node += ' (Caches)'
  else if (gameMode === 'Hard') node += ' (Hard)'
  return { planet, node, gameMode, isEvent }
}

function placeRewards(rows) {
  const result = {}
  for (const [place, entries] of groupsBy(rows, 'place')) {
    const { planet, node, gameMode, isEvent } = parseDePlace(place)
    result[planet] ||= {}
    const nodeData = result[planet][node] ||= { gameMode, isEvent, rewards: {} }
    for (const [rotation, rotationRows] of groupsBy(entries, 'rotation')) {
      const key = letter(rotation)
      nodeData.rewards[key] = [...(nodeData.rewards[key] || []), ...rotationRows.map(reward)]
    }
  }
  return result
}

// Legacy bounty tables have one object per bounty level, rewards keyed by
// rotation letter, and a stage on every reward. Fresh parser rows carry both
// fields. For old normalized snapshots that predate the parser fix, rotation
// contains only the stage; keep all rows under A rather than inventing a
// missing outer rotation.
function bountyRewards(rows) {
  return [...groupsBy(rows, 'place')].map(([bountyLevel, entries]) => {
    const hasOuterRotation = entries.some((row) => row.stage || row.outerRotation || /^Rotation\s+[ABC]$/i.test(row.rotation || ''))
    const grouped = new Map()
    for (const row of entries) {
      const rotation = hasOuterRotation ? (row.outerRotation || row.rotation) : 'A'
      const key = letter(rotation)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push({
        itemName: row.item,
        ...reward(row),
        ...(row.stage || !hasOuterRotation ? { stage: row.stage || row.rotation } : {}),
      })
    }
    return { bountyLevel, rewards: Object.fromEntries(grouped) }
  })
}

function groupedRewards(rows, keyName, itemName = 'itemName') {
  return [...groupsBy(rows, 'place')].map(([key, entries]) => ({
    [keyName]: key,
    rewards: Object.fromEntries([...groupsBy(entries, 'rotation')].map(([rotation, values]) => [
      letter(rotation), values.map((row) => ({ [itemName]: row.item, ...reward(row) })),
    ])),
  }))
}

// Legacy transientRewards keep a flat list with the rotation on each entry.
function transientRewards(rows) {
  return [...groupsBy(rows, 'place')].map(([objectiveName, entries]) => ({
    objectiveName,
    rewards: entries.map((row) => ({
      ...reward(row),
      ...(row.rotation ? { rotation: letter(row.rotation) } : {}),
    })),
  }))
}

function avatarRows(rows) {
  return [...groupsBy(rows, 'source')].map(([source, entries]) => ({
    source,
    items: entries.map((row) => ({ item: row.item, rarity: row.rarity, chance: row.chance * 100 })),
    ...(entries[0]?.sourceChance != null ? { sourceChance: entries[0].sourceChance } : {}),
  }))
}

const percent = (value) => value == null ? undefined : value * 100

// DE's drop page has no syndicate section (standing purchases are not drops). Without
// those rows ~590 mods/cosmetics/arcanes/gear that are Syndicate or Simaris purchases fall
// back to warframe-items, which shows them as 100% "drops" (verified over every item,
// 2026-10-05). So callers pass the previous DropsAll as `legacy` and its syndicates ride along.
export function convertDeDropTables(snapshot, legacy = null) {
  const sections = snapshot?.sections || {}
  const output = { __source: 'de', __normalizedStats: snapshot?.stats || {} }
  output.missionRewards = placeRewards(sections.missionRewards)
  output.relics = [...groupsBy(sections.relicRewards, 'place')].map(([place, entries]) => {
    const match = place.match(/^(\w+)\s+(.+?)\s+Relic(?:\s*\(([^()]*)\))?$/i)
    return {
      tier: match?.[1] || '',
      relicName: (match?.[1] || '') === 'Requiem'
        ? (match?.[2] || place).replace(/^(?:I{1,3}|Iv)$/i, (value) => value.toUpperCase())
        : match?.[2] || place,
      state: match?.[3] || '',
      rewards: entries.map(reward),
    }
  })
  output.keyRewards = groupedRewards(sections.keyRewards, 'keyName')
  output.transientRewards = transientRewards(sections.transientRewards)
  output.sortieRewards = (sections.sortieRewards || []).map(reward)
  for (const [input, outputName] of Object.entries(BOUNTY_OUTPUTS)) output[outputName] = bountyRewards(sections[input])

  const modByAvatar = avatarRows(sections.modByAvatar)
  const modChance = new Map((sections.modByAvatar || []).map((row) => [row.source, row.sourceChance]))
  output.modLocations = [...groupsBy(sections.modByDrop, 'item')].map(([modName, entries]) => ({
    modName,
    enemies: entries.map((row) => ({
      enemyName: row.source,
      enemyModDropChance: percent(modChance.get(row.source)),
      rarity: row.rarity,
      chance: row.chance * 100,
    })),
  }))
  output.enemyModTables = modByAvatar.map((group) => ({
    enemyName: group.source,
    enemyModDropChance: percent(group.sourceChance),
    mods: group.items.map((item) => ({ modName: item.item, rarity: item.rarity, chance: item.chance })),
  }))

  const blueprintByAvatar = avatarRows(sections.blueprintByAvatar)
  const blueprintChance = new Map((sections.blueprintByAvatar || []).map((row) => [row.source, row.sourceChance]))
  output.blueprintLocations = [...groupsBy(sections.blueprintByDrop, 'item')].map(([itemName, entries]) => ({
    itemName,
    blueprintName: itemName,
    enemies: entries.map((row) => ({
      enemyName: row.source,
      enemyBlueprintDropChance: percent(blueprintChance.get(row.source)),
      rarity: row.rarity,
      chance: row.chance * 100,
    })),
  }))
  output.enemyBlueprintTables = blueprintByAvatar.map((group) => ({
    enemyName: group.source,
    items: group.items.map((item) => ({ itemName: item.item, rarity: item.rarity, chance: item.chance })),
  }))
  output.resourceByAvatar = avatarRows(sections.resourceByAvatar)
  output.sigilByAvatar = avatarRows(sections.sigilByAvatar)
  output.additionalItemByAvatar = avatarRows(sections.additionalItemByAvatar)
  // Syndicate offerings are not DE drop-table rows. The acquisition consumer
  // supplies them from ExportSyndicates via buildSyndicateIndex.
  if (legacy?.syndicates) output.syndicates = legacy.syndicates
  return output
}

export function normalizedDropRows(snapshot) {
  return Object.entries(snapshot?.sections || {}).flatMap(([section, rows]) =>
    rows.map((row) => ({ section, item: row.item, source: row.place || row.source || '', rotation: row.rotation || null, chance: row.chance })))
}
