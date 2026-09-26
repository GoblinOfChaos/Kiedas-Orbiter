const NUMERIC_FIELDS = Object.freeze([
  'baseDrain', 'fusionLimit', 'introducedAt', 'maxRank', 'masteryReq',
])

function recordsOf(value) {
  const source = value?.ExportUpgrades ?? value
  if (Array.isArray(source)) return source
  if (!source || typeof source !== 'object') return []
  return Object.entries(source).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

function roundNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  const rounded = Math.round((value - Math.sign(value) * 1e-7) * 1_000_000) / 1_000_000
  return Object.is(rounded, -0) ? 0 : rounded
}

function normalizeNumbers(value) {
  if (typeof value === 'number') return roundNumber(value)
  if (Array.isArray(value)) return value.map(normalizeNumbers)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeNumbers(child)]))
}

function adaptRecord(raw) {
  const result = { uniqueName: raw.uniqueName }
  for (const field of NUMERIC_FIELDS) {
    if (raw[field] !== undefined) result[field] = roundNumber(raw[field])
  }
  for (const field of ['name', 'description', 'polarity', 'rarity', 'codexSecret', 'compatName', 'type', 'subtype', 'isUtility', 'levelStats', 'modSet']) {
    if (raw[field] !== undefined) result[field] = normalizeNumbers(raw[field])
  }
  if (result.description === undefined && Array.isArray(result.levelStats)) {
    const firstStat = result.levelStats[0]?.stats?.[0]
    if (typeof firstStat === 'string' && firstStat) result.description = firstStat
  }
  return result
}

export function adaptUpgrades(deRaw, { locale = 'en' } = {}) {
  if (locale !== 'en') throw new Error(`Upgrades adapter only supports the cached ${locale} locale when supplied as en`)
  return Object.fromEntries(recordsOf(deRaw)
    .filter((record) => typeof record?.uniqueName === 'string' && record.uniqueName)
    .map((record) => [record.uniqueName, adaptRecord(record)])
    .sort(([a], [b]) => a.localeCompare(b)))
}

export { normalizeNumbers, roundNumber }
