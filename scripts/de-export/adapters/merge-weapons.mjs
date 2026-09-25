import { WEAPON_APP_FIELDS } from './weapons.mjs'

// DE is authoritative for fields the parser reads from ExportWeapons. The
// mirror remains authoritative for localization, images, commerce metadata,
// behaviours, and other presentation/enrichment fields.
export const WEAPON_MERGE_FIELDS = Object.freeze(WEAPON_APP_FIELDS.filter((field) => !['uniqueName', 'name', 'description'].includes(field)))

function recordsOf(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value.ExportWeapons)) return value.ExportWeapons
  return Object.entries(value).map(([uniqueName, record]) => ({
    uniqueName: record?.uniqueName || uniqueName,
    ...record,
  }))
}

function mapRecords(value) {
  const result = {}
  for (const record of recordsOf(value)) {
    if (typeof record?.uniqueName === 'string' && record.uniqueName) result[record.uniqueName] = record
  }
  return result
}

function roundNumber(value) {
  if (typeof value !== 'number') return value
  const adjusted = value - Math.sign(value) * 1e-7
  return Math.round(adjusted * 1_000_000) / 1_000_000
}

function normalizeNumbers(value) {
  if (typeof value === 'number') return roundNumber(value)
  if (Array.isArray(value)) return value.map(normalizeNumbers)
  return value
}

function copyDeField(value) {
  return normalizeNumbers(value)
}

function normalizedDeRecord(record) {
  const result = { ...record }
  for (const field of WEAPON_MERGE_FIELDS) {
    if (result[field] !== undefined) result[field] = copyDeField(result[field])
  }
  return result
}

function orderedRecord(record) {
  const result = {}
  for (const field of WEAPON_APP_FIELDS) {
    if (record[field] !== undefined) result[field] = record[field]
  }
  for (const field of Object.keys(record).sort()) {
    if (result[field] === undefined && !WEAPON_APP_FIELDS.includes(field)) result[field] = record[field]
  }
  return result
}

/** Merge DE factual weapon fields over the export-plus mirror. */
export function mergeWeapons(mirrorExport, adaptedDe) {
  const mirror = mapRecords(mirrorExport)
  const de = mapRecords(adaptedDe)
  const merged = {}
  const report = { changed: [], added: [], mirrorOnly: [], counts: {} }
  const keys = [...new Set([...Object.keys(mirror), ...Object.keys(de)])].sort()

  for (const uniqueName of keys) {
    const mirrorRecord = mirror[uniqueName]
    const deRecord = de[uniqueName]
    if (!mirrorRecord) {
      merged[uniqueName] = orderedRecord(normalizedDeRecord(deRecord))
      report.added.push({ uniqueName, fields: Object.keys(merged[uniqueName]) })
      continue
    }
    if (!deRecord) {
      merged[uniqueName] = orderedRecord(mirrorRecord)
      report.mirrorOnly.push(uniqueName)
      continue
    }

    const result = { ...mirrorRecord }
    const fields = []
    for (const field of WEAPON_MERGE_FIELDS) {
      if (deRecord[field] === undefined) continue
      const value = copyDeField(deRecord[field])
      if (JSON.stringify(normalizeNumbers(result[field])) !== JSON.stringify(value)) fields.push(field)
      result[field] = value
    }
    merged[uniqueName] = orderedRecord(result)
    if (fields.length) report.changed.push({ uniqueName, fields })
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
