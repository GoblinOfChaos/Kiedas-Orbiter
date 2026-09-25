const records = (value) => {
  if (Array.isArray(value)) return value
  if (value?.ExportRelicArcane) return records(value.ExportRelicArcane)
  return Object.entries(value || {}).map(([key, record]) => ({ uniqueName: record?.uniqueName || key, ...record }))
}

export function adaptRelicsArcanes(value) {
  const relics = {}
  const arcanes = {}
  for (const record of records(value)) {
    if (!record?.uniqueName) continue
    if (record.uniqueName.includes('/CosmeticEnhancers/')) arcanes[record.uniqueName] = { ...record }
    else relics[record.uniqueName] = { ...record }
  }
  return { relics, arcanes }
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
