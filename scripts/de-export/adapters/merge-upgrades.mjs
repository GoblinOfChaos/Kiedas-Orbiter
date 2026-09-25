import { adaptUpgrades, normalizeNumbers } from './upgrades.mjs'

const NUMERIC_FIELDS = new Set(['baseDrain', 'fusionLimit', 'introducedAt', 'maxRank', 'masteryReq'])

function mapRecords(value) {
  const source = value?.ExportUpgrades ?? value
  if (Array.isArray(source)) return Object.fromEntries(source.filter((record) => record?.uniqueName).map((record) => [record.uniqueName, record]))
  return Object.fromEntries(Object.entries(source || {}).map(([uniqueName, record]) => [record?.uniqueName || uniqueName, { uniqueName: record?.uniqueName || uniqueName, ...record }]))
}

function orderedRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))
}

function deOverlayFields(record) {
  return Object.fromEntries(Object.entries(record).filter(([field, value]) =>
    NUMERIC_FIELDS.has(field) || field === 'levelStats' || typeof value === 'number'
  ).map(([field, value]) => [field, normalizeNumbers(value)]))
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

export function mergeUpgrades(mirrorExport, adaptedDe) {
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
    const changed = []
    for (const [field, value] of Object.entries(deOverlayFields(deRecord))) {
      if (JSON.stringify(result[field]) !== JSON.stringify(value)) changed.push(field)
      result[field] = value
    }
    merged[uniqueName] = orderedRecord(result)
    if (changed.length) report.changed.push({ uniqueName, fields: changed })
  }
  report.counts = { mirror: Object.keys(mirror).length, de: Object.keys(de).length, merged: Object.keys(merged).length, changed: report.changed.length, added: report.added.length, mirrorOnly: report.mirrorOnly.length }
  return { merged, report }
}

export function addManifestIcons(records, manifestExport) {
  const images = manifestImageMap(manifestExport)
  return Object.fromEntries(Object.entries(records || {}).map(([uniqueName, record]) => {
    const image = images.get(uniqueName)
    return [uniqueName, image && !record.icon ? { ...record, icon: image.path } : record]
  }))
}

export function mergeImages(mirrorExport, manifestExport) {
  const merged = { ...(mirrorExport || {}) }
  const added = []
  const entries = manifestExport?.Manifest || manifestExport || []
  for (const entry of entries) {
    const texture = entry?.textureLocation
    const separator = typeof texture === 'string' ? texture.lastIndexOf('!') : -1
    if (!entry?.uniqueName || separator <= 0 || separator === texture.length - 1) continue
    const path = texture.slice(0, separator)
    const contentHash = texture.slice(separator + 1)
    if (!merged[path]) {
      merged[path] = { contentHash }
      added.push({ uniqueName: entry.uniqueName, path, contentHash })
    }
  }
  return { merged: Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b))), added }
}

export { adaptUpgrades }
