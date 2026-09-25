// Convert the normalized DE rows to the legacy DropsAll contract. This module
// is deliberately pure so it can run in the data worker without Node, Tauri,
// fetch, or filesystem access.

const PLACE_SECTIONS = [
  'cetusRewards', 'solarisRewards', 'deimosRewards', 'zarimanRewards',
  'entratiLabRewards', 'hexRewards',
]

// Deliberately false until scripts/de-drop-tables/parity.mjs has been run and
// every unexplained difference has been reviewed.
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

function placeRewards(rows) {
  const result = {}
  for (const [place, entries] of groupsBy(rows, 'place')) {
    const rotations = {}
    for (const [rotation, rotationRows] of groupsBy(entries, 'rotation')) {
      const key = rotation?.replace(/^Rotation\s+/i, '') || 'A'
      rotations[key] = rotationRows.map(reward)
    }
    const match = place.match(/^(.*?)(?:\s*\(([^()]*)\))?$/)
    result.DE = result.DE || {}
    result.DE[place] = { gameMode: match?.[2] || '', rewards: rotations }
  }
  return result
}

function groupedRewards(rows, keyName, itemName = 'itemName') {
  return [...groupsBy(rows, keyName)].map(([key, entries]) => ({
    [keyName]: key,
    rewards: Object.fromEntries([...groupsBy(entries, 'rotation')].map(([rotation, values]) => [
      rotation?.replace(/^Rotation\s+/i, '') || 'A', values.map((row) => ({ [itemName]: row.item, ...reward(row) })),
    ])),
  }))
}

function avatarRows(rows, itemKey, sourceKey = 'source') {
  return [...groupsBy(rows, sourceKey)].map(([source, entries]) => ({
    source,
    items: entries.map((row) => ({ item: row.item, rarity: row.rarity, chance: row.chance * 100 })),
    ...(entries[0]?.sourceChance != null ? { sourceChance: entries[0].sourceChance } : {}),
    ...(itemKey ? { itemKey } : {}),
  }))
}

export function convertDeDropTables(snapshot) {
  const sections = snapshot?.sections || {}
  const output = { __source: 'de', __normalizedStats: snapshot?.stats || {} }
  output.missionRewards = placeRewards(sections.missionRewards)
  output.relics = [...groupsBy(sections.relicRewards, 'place')].map(([place, entries]) => {
    const match = place.match(/^(\w+)\s+(.+?)\s+Relic(?:\s*\(([^()]*)\))?$/i)
    return {
      tier: match?.[1] || '',
      relicName: match?.[2] || place,
      state: match?.[3] || '',
      rewards: entries.map(reward),
    }
  })
  output.keyRewards = groupedRewards(sections.keyRewards, 'keyName')
  output.transientRewards = groupedRewards(sections.transientRewards, 'objectiveName')
  output.sortieRewards = (sections.sortieRewards || []).map(reward)
  for (const section of PLACE_SECTIONS) output[section] = groupedRewards(sections[section], 'bountyLevel')

  const modByAvatar = avatarRows(sections.modByAvatar, 'mod')
  output.modLocations = modByAvatar.flatMap((group) => group.items.map((item) => ({
    modName: item.item,
    enemies: [{ enemyName: group.source, rarity: item.rarity, chance: item.chance }],
  })))
  output.enemyModTables = (sections.modByDrop || []).map((row) => ({
    enemyName: row.source, mods: [{ modName: row.item, rarity: row.rarity, chance: row.chance * 100 }],
  }))
  output.blueprintLocations = avatarRows(sections.blueprintByAvatar, 'blueprint').map((group) => ({
    itemName: group.source,
    blueprintName: group.items[0]?.item,
    enemies: group.items.map((item) => ({ enemyName: group.source, rarity: item.rarity, chance: item.chance })),
  }))
  output.enemyBlueprintTables = (sections.blueprintByDrop || []).map((row) => ({
    enemyName: row.source, items: [{ itemName: row.item, rarity: row.rarity, chance: row.chance * 100 }],
  }))
  output.resourceByAvatar = avatarRows(sections.resourceByAvatar)
  output.sigilByAvatar = avatarRows(sections.sigilByAvatar)
  output.additionalItemByAvatar = avatarRows(sections.additionalItemByAvatar)
  return output
}

export function normalizedDropRows(snapshot) {
  return Object.entries(snapshot?.sections || {}).flatMap(([section, rows]) =>
    rows.map((row) => ({ section, item: row.item, source: row.place || row.source || '', rotation: row.rotation || null, chance: row.chance })))
}
