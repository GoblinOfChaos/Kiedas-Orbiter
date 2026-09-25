import { RECIPE_APP_FIELDS, adaptRecipes } from './recipes.mjs'
import { RESOURCE_APP_FIELDS, adaptResources } from './resources.mjs'

export const RECIPE_MERGE_FIELDS = Object.freeze([
  'resultType', 'buildPrice', 'buildTime', 'num', 'ingredients',
])

function mapRecords(value, category) {
  if (Array.isArray(value)) return Object.fromEntries(value.filter((r) => r?.uniqueName).map((r) => [r.uniqueName, r]))
  if (value?.[category]) return mapRecords(value[category], category)
  return Object.fromEntries(Object.entries(value || {}).map(([key, record]) => [record?.uniqueName || key, { uniqueName: record?.uniqueName || key, ...record }]))
}

function orderedRecord(record, fields) {
  const result = {}
  for (const field of fields) if (record[field] !== undefined) result[field] = record[field]
  for (const field of Object.keys(record).sort()) if (result[field] === undefined && !fields.includes(field)) result[field] = record[field]
  return result
}

function mergeRecords(mirrorExport, deExport, category, fields) {
  const mirror = mapRecords(mirrorExport, category)
  const de = mapRecords(deExport, category)
  const merged = {}
  const report = { changed: [], added: [], mirrorOnly: [], counts: {} }
  const keys = [...new Set([...Object.keys(mirror), ...Object.keys(de)])].sort()
  for (const uniqueName of keys) {
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

export function mergeRecipes(mirrorExport, adaptedDe) {
  return mergeRecords(mirrorExport, adaptedDe, 'ExportRecipes', RECIPE_MERGE_FIELDS)
}

export function mergeResources(mirrorExport, adaptedDe) {
  return mergeRecords(mirrorExport, adaptedDe, 'ExportResources', [])
}

export function manifestImageMap(manifestExport) {
  const result = new Map()
  for (const entry of manifestExport?.Manifest || manifestExport || []) {
    const texture = entry?.textureLocation
    const separator = typeof texture === 'string' ? texture.lastIndexOf('!') : -1
    if (entry?.uniqueName && separator > 0 && separator < texture.length - 1) {
      result.set(entry.uniqueName, { path: texture.slice(0, separator), contentHash: texture.slice(separator + 1) })
    }
  }
  return result
}

export function addManifestIcons(records, manifestExport) {
  const images = manifestImageMap(manifestExport)
  return Object.fromEntries(Object.entries(records || {}).map(([uniqueName, record]) => {
    const image = images.get(uniqueName)
    return [uniqueName, image && !record.icon ? { ...record, icon: image.path } : record]
  }))
}

export function mergeImages(mirrorExport, manifestExport) {
  const mirror = { ...(mirrorExport || {}) }
  const entries = manifestExport?.Manifest || manifestExport || []
  const added = []
  for (const entry of entries) {
    const texture = entry?.textureLocation
    if (!entry?.uniqueName || typeof texture !== 'string') continue
    const separator = texture.lastIndexOf('!')
    if (separator <= 0 || separator === texture.length - 1) continue
    const path = texture.slice(0, separator)
    const contentHash = texture.slice(separator + 1)
    if (mirror[path]) continue
    mirror[path] = { contentHash }
    added.push({ uniqueName: entry.uniqueName, path, contentHash })
  }
  return { merged: Object.fromEntries(Object.entries(mirror).sort(([a], [b]) => a.localeCompare(b))), added, counts: { mirror: Object.keys(mirrorExport || {}).length, manifest: entries.length, merged: Object.keys(mirror).length, added: added.length } }
}

export { RECIPE_APP_FIELDS, RESOURCE_APP_FIELDS, adaptRecipes, adaptResources }
