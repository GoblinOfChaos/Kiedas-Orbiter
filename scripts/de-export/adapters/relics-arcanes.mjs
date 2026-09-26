const records = (value) => {
  if (Array.isArray(value)) return value
  if (value?.ExportRelicArcane) return records(value.ExportRelicArcane)
  return Object.entries(value || {}).map(([key, record]) => ({ uniqueName: record?.uniqueName || key, ...record }))
}

export function adaptRelicsArcanes(value) {
  const relics = {}
  const arcanes = {}
  const rewards = {}
  for (const record of records(value)) {
    if (!record?.uniqueName) continue
    if (record.uniqueName.includes('/CosmeticEnhancers/')) {
      arcanes[record.uniqueName] = { ...record }
      continue
    }
    const relic = { ...record }
    const nameMatch = typeof record.name === 'string' && record.name.match(/^(Lith|Meso|Neo|Axi) ([A-Z]\d+) Relic$/)
    if (nameMatch) {
      relic.era = nameMatch[1]
      relic.category = nameMatch[2]
      const qualityBySuffix = { Bronze: 'VPQ_BRONZE', Silver: 'VPQ_SILVER', Gold: 'VPQ_GOLD', Platinum: 'VPQ_PLATINUM' }
      const suffix = Object.keys(qualityBySuffix).find((value) => record.uniqueName.endsWith(value))
      if (suffix) relic.quality = qualityBySuffix[suffix]
    }
    if (Array.isArray(record.relicRewards) && record.relicRewards.length) {
      const rewardManifest = `${record.uniqueName}/DERewards`
      relic.rewardManifest = rewardManifest
      rewards[rewardManifest] = [record.relicRewards.map((reward) => ({
        type: reward.rewardName,
        itemCount: reward.itemCount ?? 1,
        rarity: reward.rarity,
      }))]
    }
    relics[record.uniqueName] = relic
  }
  return { relics, arcanes, rewards }
}

export const RELIC_MERGE_FIELDS = ['category', 'era', 'quality', 'rewardManifest', 'introducedAt', 'vaultedAt', 'codexSecret', 'icon']
export const ARCANE_MERGE_FIELDS = ['codexSecret', 'rarity', 'levelStats', 'icon']

function mergeMap(mirrorValue, deValue, allowedFields) {
  const mirror = mirrorValue || {}
  const merged = {}
  const changed = []
  const added = []
  const mirrorOnly = []
  for (const key of [...new Set([...Object.keys(mirror), ...Object.keys(deValue)])].sort()) {
    if (!mirror[key]) { merged[key] = { ...deValue[key] }; added.push(key); continue }
    if (!deValue[key]) { merged[key] = { ...mirror[key] }; mirrorOnly.push(key); continue }
    const result = { ...mirror[key] }
    const fields = allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(deValue[key], field))
    const changedFields = fields.filter((field) => JSON.stringify(result[field]) !== JSON.stringify(deValue[key][field]))
    for (const field of fields) result[field] = deValue[key][field]
    if (changedFields.length) changed.push({ uniqueName: key, fields: changedFields })
    merged[key] = result
  }
  return { merged, report: { changed, added, mirrorOnly } }
}

export function mergeRelicsArcanes(mirrorRelics, mirrorArcanes, de) {
  const relic = mergeMap(mirrorRelics, de.relics, RELIC_MERGE_FIELDS)
  const arcane = mergeMap(mirrorArcanes, de.arcanes, ARCANE_MERGE_FIELDS)
  return { relics: relic.merged, arcanes: arcane.merged, report: { relics: relic.report, arcanes: arcane.report } }
}
