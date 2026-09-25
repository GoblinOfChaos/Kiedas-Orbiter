const RESOURCE_FIELDS = Object.freeze([
  'uniqueName', 'name', 'description', 'codexSecret', 'parentName', 'excludeFromCodex',
  'longDescription', 'type', 'productCategory', 'icon', 'texture',
])

function recordsOf(value, category) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value[category])) return value[category]
  return Object.entries(value).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

export function adaptResources(deRaw, { locale = 'en' } = {}) {
  if (locale !== 'en') throw new Error(`Resources adapter only supports the cached ${locale} locale when supplied as en`)
  const result = {}
  const records = recordsOf(deRaw, 'ExportResources')
    .filter((record) => typeof record?.uniqueName === 'string' && record.uniqueName)
    .sort((a, b) => a.uniqueName.localeCompare(b.uniqueName))
  for (const raw of records) {
    const record = { ...raw }
    for (const field of RESOURCE_FIELDS) {
      if (raw[field] !== undefined) record[field] = raw[field]
    }
    result[raw.uniqueName] = record
  }
  return result
}

export const RESOURCE_APP_FIELDS = RESOURCE_FIELDS
