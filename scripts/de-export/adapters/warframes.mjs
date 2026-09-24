const RECORD_FIELDS = [
  'uniqueName', 'name', 'parentName', 'description', 'health', 'shield', 'armor',
  'stamina', 'power', 'codexSecret', 'masteryReq', 'sprintSpeed',
  'passiveDescription', 'exalted', 'abilities', 'productCategory',
]

function recordsOf(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value.ExportWarframes)) return value.ExportWarframes
  const arrays = Object.values(value).filter(Array.isArray)
  if (arrays.length) return arrays.flat()
  return Object.entries(value).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

function adaptAbility(ability) {
  if (!ability || typeof ability !== 'object') return ability
  const result = {}
  if (ability.abilityUniqueName !== undefined) result.uniqueName = ability.abilityUniqueName
  if (ability.abilityName !== undefined) result.name = ability.abilityName
  if (ability.description !== undefined) result.description = ability.description
  return result
}

function adaptRecord(raw) {
  const result = {}
  for (const field of RECORD_FIELDS) {
    if (raw?.[field] === undefined) continue
    if (field === 'abilities') {
      result.abilities = Array.isArray(raw.abilities) ? raw.abilities.map(adaptAbility) : raw.abilities
    } else if (field === 'exalted') {
      result.exalted = Array.isArray(raw.exalted) ? [...raw.exalted] : raw.exalted
    } else {
      result[field] = raw[field]
    }
  }
  return result
}

/** Convert DE ExportWarframes data to the app's consumed Warframe record shape. */
export function adaptWarframes(deRaw, { locale = 'en' } = {}) {
  if (locale !== 'en') throw new Error(`Warframes adapter only supports the cached ${locale} locale when supplied as en`)
  const result = {}
  const records = recordsOf(deRaw)
    .filter((record) => typeof record?.uniqueName === 'string' && record.uniqueName)
    .sort((a, b) => a.uniqueName.localeCompare(b.uniqueName))
  for (const raw of records) result[raw.uniqueName] = adaptRecord(raw)
  return result
}

export const WARFRAME_APP_FIELDS = Object.freeze([...RECORD_FIELDS])
