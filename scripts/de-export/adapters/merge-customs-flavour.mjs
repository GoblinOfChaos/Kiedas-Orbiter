import { CUSTOMS_APP_FIELDS, FLAVOUR_APP_FIELDS, adaptCustoms, adaptFlavour } from './customs.mjs'

function mapRecords(value) {
  if (Array.isArray(value)) return Object.fromEntries(value.filter((r) => r?.uniqueName).map((r) => [r.uniqueName, r]))
  return Object.fromEntries(Object.entries(value || {}).map(([key, record]) => [record?.uniqueName || key, { uniqueName: record?.uniqueName || key, ...record }]))
}

function orderedRecord(record, fields) {
  const result = {}
  for (const field of fields) if (record[field] !== undefined) result[field] = record[field]
  for (const field of Object.keys(record).sort()) if (result[field] === undefined && !fields.includes(field)) result[field] = record[field]
  return result
}

function mergeTable(mirrorExport, adaptedDe, fields) {
  const mirror = mapRecords(mirrorExport)
  const de = mapRecords(adaptedDe)
  const merged = {}
  const report = { changed: [], added: [], mirrorOnly: [], counts: {} }
  for (const uniqueName of [...new Set([...Object.keys(mirror), ...Object.keys(de)])].sort()) {
    const mirrorRecord = mirror[uniqueName]
    const deRecord = de[uniqueName]
    if (!mirrorRecord) {
      merged[uniqueName] = orderedRecord(deRecord, fields)
      report.added.push({ uniqueName, fields: Object.keys(merged[uniqueName]) })
      continue
    }
    if (!deRecord) {
      merged[uniqueName] = orderedRecord(mirrorRecord, fields)
      report.mirrorOnly.push(uniqueName)
      continue
    }
    const result = { ...mirrorRecord }
    const changed = []
    for (const field of fields) {
      if (deRecord[field] === undefined) continue
      if (JSON.stringify(result[field]) !== JSON.stringify(deRecord[field])) changed.push(field)
      result[field] = Array.isArray(deRecord[field]) ? [...deRecord[field]] : deRecord[field]
    }
    merged[uniqueName] = orderedRecord(result, fields)
    if (changed.length) report.changed.push({ uniqueName, fields: changed })
  }
  report.counts = { mirror: Object.keys(mirror).length, de: Object.keys(de).length, merged: Object.keys(merged).length, changed: report.changed.length, added: report.added.length, mirrorOnly: report.mirrorOnly.length }
  return { merged, report }
}

export const CUSTOMS_MERGE_FIELDS = Object.freeze(['codexSecret', 'excludeFromCodex', 'icon'])
export const FLAVOUR_MERGE_FIELDS = Object.freeze(['codexSecret', 'excludeFromCodex', 'icon'])

export function mergeCustoms(mirrorExport, adaptedDe) {
  return mergeTable(mirrorExport, adaptedDe, CUSTOMS_MERGE_FIELDS)
}

export function mergeFlavour(mirrorExport, adaptedDe) {
  return mergeTable(mirrorExport, adaptedDe, FLAVOUR_MERGE_FIELDS)
}

export function manifestIcons(records, manifestExport) {
  const icons = new Map()
  for (const entry of manifestExport?.Manifest || manifestExport || []) {
    const texture = entry?.textureLocation
    const separator = typeof texture === 'string' ? texture.lastIndexOf('!') : -1
    if (entry?.uniqueName && separator > 0 && separator < texture.length - 1) icons.set(entry.uniqueName, texture.slice(0, separator))
  }
  return Object.fromEntries(Object.entries(records || {}).map(([uniqueName, record]) => [
    uniqueName, icons.has(uniqueName) && !record.icon ? { ...record, icon: icons.get(uniqueName) } : record,
  ]))
}

export { adaptCustoms, adaptFlavour }
