const FIELDS = Object.freeze([
  'uniqueName', 'name', 'description', 'codexSecret', 'excludeFromCodex',
])

function recordsOf(value, category) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value[category])) return value[category]
  return Object.entries(value).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

function adapt(value, category) {
  const result = {}
  for (const raw of recordsOf(value, category)
    .filter((record) => typeof record?.uniqueName === 'string' && record.uniqueName)
    .sort((a, b) => a.uniqueName.localeCompare(b.uniqueName))) {
    const record = {}
    for (const field of FIELDS) if (raw[field] !== undefined) record[field] = raw[field]
    result[raw.uniqueName] = record
  }
  return result
}

export function adaptCustoms(value, { locale = 'en' } = {}) {
  if (locale !== 'en') throw new Error(`Customs adapter only supports the cached ${locale} locale when supplied as en`)
  return adapt(value, 'ExportCustoms')
}

export function adaptFlavour(value, { locale = 'en' } = {}) {
  if (locale !== 'en') throw new Error(`Flavour adapter only supports the cached ${locale} locale when supplied as en`)
  return adapt(value, 'ExportFlavour')
}

export const CUSTOMS_APP_FIELDS = FIELDS
export const FLAVOUR_APP_FIELDS = FIELDS
