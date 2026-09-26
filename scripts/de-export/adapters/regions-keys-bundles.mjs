const REGION_FIELDS = Object.freeze([
  'uniqueName', 'name', 'systemIndex', 'systemName', 'nodeType', 'masteryReq',
  'missionIndex', 'factionIndex', 'minEnemyLevel', 'maxEnemyLevel',
])

const KEY_FIELDS = Object.freeze([
  'uniqueName', 'name', 'description', 'parentName', 'codexSecret', 'excludeFromCodex',
])

const FUSION_BUNDLE_FIELDS = Object.freeze([
  'uniqueName', 'name', 'description', 'codexSecret', 'fusionPoints',
])

function recordsOf(value, category) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value[category])) return value[category]
  const arrays = Object.values(value).filter(Array.isArray)
  if (arrays.length) return arrays.flat()
  return Object.entries(value).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

function adapt(value, category, fields) {
  const result = {}
  for (const raw of recordsOf(value, category)) {
    if (!raw || typeof raw.uniqueName !== 'string' || !raw.uniqueName) continue
    const record = {}
    for (const field of fields) if (raw[field] !== undefined) record[field] = raw[field]
    result[raw.uniqueName] = record
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)))
}

export function adaptRegions(value) { return adapt(value, 'ExportRegions', REGION_FIELDS) }
export function adaptKeys(value) { return adapt(value, 'ExportKeys', KEY_FIELDS) }
export function adaptFusionBundles(value) { return adapt(value, 'ExportFusionBundles', FUSION_BUNDLE_FIELDS) }

export const REGIONS_APP_FIELDS = REGION_FIELDS
export const KEYS_APP_FIELDS = KEY_FIELDS
export const FUSION_BUNDLE_APP_FIELDS = FUSION_BUNDLE_FIELDS

function mapRecords(value) {
  return Object.fromEntries(recordsOf(value).filter((record) => record?.uniqueName).map((record) => [record.uniqueName, record]))
}

function orderedRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))
}

function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b) }

function mergeTable(mirrorExport, adaptedDe, overlayFields) {
  const mirror = mapRecords(mirrorExport)
  const de = mapRecords(adaptedDe)
  const merged = {}
  const report = { changed: [], added: [], mirrorOnly: [], fieldDiffs: {}, counts: {} }
  const keys = [...new Set([...Object.keys(mirror), ...Object.keys(de)])].sort()

  for (const uniqueName of keys) {
    const mirrorRecord = mirror[uniqueName]
    const deRecord = de[uniqueName]
    if (!mirrorRecord) {
      merged[uniqueName] = orderedRecord(deRecord)
      report.added.push({ uniqueName, fields: Object.keys(deRecord).sort() })
      continue
    }
    if (!deRecord) {
      merged[uniqueName] = orderedRecord(mirrorRecord)
      report.mirrorOnly.push(uniqueName)
      continue
    }

    const result = { ...mirrorRecord }
    const fields = []
    for (const [field, value] of Object.entries(deRecord)) {
      if (value === undefined) continue
      const shouldOverlay = overlayFields.includes(field)
      const shouldFill = result[field] === undefined
      if (!shouldOverlay && !shouldFill) continue
      if (!equal(result[field], value)) {
        fields.push(field)
        const finding = report.fieldDiffs[field] || { count: 0, examples: [] }
        finding.count += 1
        if (finding.examples.length < 10) finding.examples.push({ uniqueName, de: value ?? null, mirror: result[field] ?? null })
        report.fieldDiffs[field] = finding
      }
      result[field] = Array.isArray(value) ? [...value] : value
    }
    merged[uniqueName] = orderedRecord(result)
    if (fields.length) report.changed.push({ uniqueName, fields: fields.sort() })
  }
  report.counts = {
    mirror: Object.keys(mirror).length,
    de: Object.keys(de).length,
    merged: Object.keys(merged).length,
    changed: report.changed.length,
    added: report.added.length,
    mirrorOnly: report.mirrorOnly.length,
  }
  return { merged, report }
}

// Existing mirror records retain localized names and graph/quest semantics.
// DE scalar identity fields replace conflicting mirror values only where the
// consumer reads them directly; absent fields are always filled non-destructively.
export function mergeRegions(mirrorExport, adaptedDe) {
  return mergeTable(mirrorExport, adaptedDe, ['systemIndex', 'nodeType', 'masteryReq', 'missionIndex', 'factionIndex', 'minEnemyLevel', 'maxEnemyLevel'])
}

export function mergeKeys(mirrorExport, adaptedDe) {
  return mergeTable(mirrorExport, adaptedDe, ['codexSecret', 'excludeFromCodex'])
}

// Fusion bundles are a separate namespace. The mirror argument is deliberately
// an ExportFusionBundles map, never ExportBundles.
export function mergeFusionBundles(mirrorExport, adaptedDe) {
  return mergeTable(mirrorExport, adaptedDe, ['codexSecret', 'fusionPoints'])
}
