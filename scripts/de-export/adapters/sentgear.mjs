const SENTINEL_FIELDS = [
  'uniqueName', 'name', 'description', 'health', 'shield', 'armor', 'stamina',
  'power', 'codexSecret', 'excludeFromCodex', 'productCategory', 'exalted',
]

const GEAR_FIELDS = [
  'uniqueName', 'name', 'description', 'parentName', 'codexSecret',
]

function recordsOf(value, category) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value[category])) return value[category]
  return Object.entries(value).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

function adapt(value, category, fields) {
  const result = {}
  for (const raw of recordsOf(value, category)
    .filter((record) => typeof record?.uniqueName === 'string' && record.uniqueName)
    .sort((a, b) => a.uniqueName.localeCompare(b.uniqueName))) {
    const record = {}
    for (const field of fields) if (raw[field] !== undefined) record[field] = Array.isArray(raw[field]) ? [...raw[field]] : raw[field]
    result[raw.uniqueName] = record
  }
  return result
}

export function adaptSentinels(value) { return adapt(value, 'ExportSentinels', SENTINEL_FIELDS) }
export function adaptGear(value) { return adapt(value, 'ExportGear', GEAR_FIELDS) }

export const SENTINEL_APP_FIELDS = Object.freeze([...SENTINEL_FIELDS])
export const GEAR_APP_FIELDS = Object.freeze([...GEAR_FIELDS])
