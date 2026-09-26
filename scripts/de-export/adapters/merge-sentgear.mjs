import { GEAR_APP_FIELDS, SENTINEL_APP_FIELDS } from './sentgear.mjs'

export const SENTINEL_MERGE_FIELDS = Object.freeze(SENTINEL_APP_FIELDS.filter((field) => !['uniqueName', 'name', 'description'].includes(field)))
export const GEAR_MERGE_FIELDS = Object.freeze(GEAR_APP_FIELDS.filter((field) => !['uniqueName', 'name', 'description'].includes(field)))

function mapRecords(value) {
  return Object.fromEntries(Object.entries(value || {}).map(([key, record]) => [record?.uniqueName || key, { uniqueName: record?.uniqueName || key, ...record }]))
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

function orderedRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))
}

function mergeOne(mirrorExport, adaptedDe, mergeFields, appFields) {
  const mirror = mapRecords(mirrorExport)
  const de = mapRecords(adaptedDe)
  const merged = {}
  const report = { changed: [], added: [], mirrorOnly: [], counts: {} }
  const keys = [...new Set([...Object.keys(mirror), ...Object.keys(de)])].sort()
  for (const uniqueName of keys) {
    const mirrorRecord = mirror[uniqueName]
    const deRecord = de[uniqueName]
    if (!mirrorRecord) {
      merged[uniqueName] = orderedRecord(normalizeNumbers(deRecord))
      report.added.push({ uniqueName, fields: appFields.filter((field) => merged[uniqueName][field] !== undefined) })
      continue
    }
    if (!deRecord) {
      merged[uniqueName] = orderedRecord(mirrorRecord)
      report.mirrorOnly.push(uniqueName)
      continue
    }
    const result = { ...mirrorRecord }
    const fields = []
    for (const field of mergeFields) {
      if (deRecord[field] === undefined) continue
      const value = normalizeNumbers(deRecord[field])
      if (JSON.stringify(normalizeNumbers(result[field])) !== JSON.stringify(value)) fields.push(field)
      result[field] = value
    }
    merged[uniqueName] = orderedRecord(result)
    if (fields.length) report.changed.push({ uniqueName, fields })
  }
  report.counts = { mirror: Object.keys(mirror).length, de: Object.keys(de).length, merged: Object.keys(merged).length, changed: report.changed.length, added: report.added.length, mirrorOnly: report.mirrorOnly.length }
  return { merged, report }
}

export function mergeSentinels(mirrorExport, adaptedDe) { return mergeOne(mirrorExport, adaptedDe, SENTINEL_MERGE_FIELDS, SENTINEL_APP_FIELDS) }
export function mergeGear(mirrorExport, adaptedDe) { return mergeOne(mirrorExport, adaptedDe, GEAR_MERGE_FIELDS, GEAR_APP_FIELDS) }
