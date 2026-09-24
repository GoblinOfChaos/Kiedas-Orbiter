import { WARFRAME_APP_FIELDS } from './warframes.mjs'

// These are the fields consumed by the app and safe to replace with DE's
// factual values. Text-bearing passive/ability fields are deliberately not
// merged for records already in the mirror.
export const WARFRAME_MERGE_FIELDS = Object.freeze([
  'parentName', 'health', 'shield', 'armor', 'stamina', 'power',
  'codexSecret', 'masteryReq', 'sprintSpeed', 'exalted', 'productCategory',
])

function recordsOf(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value.ExportWarframes)) return value.ExportWarframes
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

function roundSprintSpeed(value) {
  return typeof value === 'number' ? Math.round(value * 1_000_000) / 1_000_000 : value
}

function copyDeField(field, value) {
  if (field === 'sprintSpeed') return roundSprintSpeed(value)
  if (Array.isArray(value)) return [...value]
  return value
}

function orderedRecord(record) {
  const result = {}
  for (const field of WARFRAME_APP_FIELDS) {
    if (record[field] !== undefined) result[field] = record[field]
  }
  for (const field of Object.keys(record).sort()) {
    if (result[field] === undefined && !WARFRAME_APP_FIELDS.includes(field)) result[field] = record[field]
  }
  return result
}

/** Merge DE factual Warframe fields over the export-plus mirror. */
export function mergeWarframes(mirrorExport, adaptedDe) {
  const mirror = mapRecords(mirrorExport)
  const de = mapRecords(adaptedDe)
  const merged = {}
  const report = { changed: [], added: [], mirrorOnly: [], counts: {} }
  const keys = [...new Set([...Object.keys(mirror), ...Object.keys(de)])].sort()

  for (const uniqueName of keys) {
    const mirrorRecord = mirror[uniqueName]
    const deRecord = de[uniqueName]
    if (!mirrorRecord) {
      merged[uniqueName] = orderedRecord(deRecord)
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
    for (const field of WARFRAME_MERGE_FIELDS) {
      if (deRecord[field] === undefined) continue
      const value = copyDeField(field, deRecord[field])
      if (JSON.stringify(result[field]) !== JSON.stringify(value)) fields.push(field)
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

