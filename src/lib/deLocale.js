// Digital Extremes publishes literal localized fields in per-locale export
// records. Keep this adapter in memory: the mirror export remains untouched so
// switching the UI locale cannot leave stale localized text behind.

export const DE_LOCALE_KEYING = Object.freeze({
  ExportWarframes: ['ExportWarframes'],
  ExportWeapons: ['ExportWeapons'],
  ExportUpgrades: ['ExportUpgrades'],
  ExportCustoms: ['ExportCustoms'],
  ExportFlavour: ['ExportFlavour'],
  ExportResources: ['ExportResources'],
  ExportRelicArcane: ['ExportRelics', 'ExportArcanes'],
  ExportGear: ['ExportGear'],
  ExportRegions: ['ExportRegions'],
  ExportSentinels: ['ExportSentinels'],
  ExportKeys: ['ExportKeys'],
  ExportDrones: ['ExportDrones'],
  ExportFusionBundles: ['ExportBundles'],
  ExportSortieRewards: ['ExportRewards'],
})

const TEXT_FIELDS = ['name', 'description', 'passiveDescription']

function recordsOf(table, category) {
  if (Array.isArray(table)) return table
  if (!table || typeof table !== 'object') return []
  if (Array.isArray(table[category])) return table[category]
  const nested = Object.values(table).find(Array.isArray)
  if (nested) return nested
  return Object.entries(table).map(([uniqueName, entry]) => {
    if (entry && typeof entry === 'object') {
      return entry.uniqueName ? entry : { uniqueName, ...entry }
    }
    return entry
  }).filter(Boolean)
}

function recordMap(table, category) {
  const map = new Map()
  for (const record of recordsOf(table, category)) {
    if (record?.uniqueName) map.set(record.uniqueName, record)
  }
  return map
}

function hasLiteral(value) {
  if (typeof value === 'string') return value.trim() !== '' && !value.trim().startsWith('/')
  if (Array.isArray(value)) return value.some(hasLiteral)
  return false
}

function copyLocalizedFields(target, source) {
  const merged = { ...target }
  for (const field of TEXT_FIELDS) {
    if (hasLiteral(source[field])) merged[field] = source[field]
  }
  if (Array.isArray(source.abilities) && Array.isArray(target.abilities)) {
    merged.abilities = target.abilities.map((ability, index) => {
      const localized = source.abilities[index]
      if (!localized || typeof localized !== 'object') return ability
      const next = { ...ability }
      for (const field of ['name', 'abilityName', 'description']) {
        if (hasLiteral(localized[field])) next[field] = localized[field]
      }
      return next
    })
  }
  if (Array.isArray(source.levelStats) && Array.isArray(target.levelStats) && source.levelStats.length) {
    merged.levelStats = target.levelStats.map((level, index) => source.levelStats[index] || level)
  }
  return merged
}

function mapTable(table, applyRecord, localized, parentKey = null) {
  if (Array.isArray(table)) return table.map((record) => applyRecord(record, null))
  if (!table || typeof table !== 'object') return table
  if (table.uniqueName || (parentKey && localized.has(parentKey))) return applyRecord(table, parentKey)
  return Object.fromEntries(Object.entries(table).map(([key, value]) => [
    key,
    Array.isArray(value) || (value && typeof value === 'object') ? mapTable(value, applyRecord, localized, key) : value,
  ]))
}

export function applyDeLocale(exportsBundle, deLocaleTables, locale) {
  if (!exportsBundle || locale === 'en' || !deLocaleTables) return exportsBundle
  let result = exportsBundle
  for (const [deCategory, targetCategories] of Object.entries(DE_LOCALE_KEYING)) {
    const localizedTable = deLocaleTables[`DeLocale_${deCategory}`] ?? deLocaleTables[deCategory]
    if (!localizedTable) continue
    for (const targetCategory of targetCategories) {
      const targetTable = exportsBundle[targetCategory]
      if (!targetTable) continue
      const localized = recordMap(localizedTable, deCategory)
      if (!localized.size) continue
      const applyRecord = (record, key) => {
        const un = record?.uniqueName || key
        const translated = localized.get(un)
        return translated ? copyLocalizedFields(record, translated) : record
      }
      const nextTable = mapTable(targetTable, applyRecord, localized)
      if (result === exportsBundle) result = { ...exportsBundle }
      result[targetCategory] = nextTable
    }
  }
  return result
}
