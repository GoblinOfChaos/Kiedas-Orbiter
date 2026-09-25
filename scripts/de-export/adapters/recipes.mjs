const RECIPE_FIELDS = Object.freeze([
  'uniqueName', 'resultType', 'buildPrice', 'buildTime', 'skipBuildTimePrice',
  'consumeOnUse', 'num', 'codexSecret', 'excludeFromCodex', 'ingredients',
  'secretIngredients',
])

function recordsOf(value, category) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value[category])) return value[category]
  return Object.entries(value).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

function adaptIngredient(raw) {
  if (!raw || typeof raw !== 'object') return raw
  return { ...raw }
}

function adaptRecord(raw) {
  const result = { ...raw }
  for (const field of RECIPE_FIELDS) {
    if (raw?.[field] === undefined) continue
    if (field === 'ingredients' || field === 'secretIngredients') {
      result[field] = Array.isArray(raw[field]) ? raw[field].map(adaptIngredient) : raw[field]
    } else {
      result[field] = raw[field]
    }
  }
  return result
}

export function adaptRecipes(deRaw, { locale = 'en' } = {}) {
  if (locale !== 'en') throw new Error(`Recipes adapter only supports the cached ${locale} locale when supplied as en`)
  const result = {}
  const records = recordsOf(deRaw, 'ExportRecipes')
    .filter((record) => typeof record?.uniqueName === 'string' && record.uniqueName)
    .sort((a, b) => a.uniqueName.localeCompare(b.uniqueName))
  for (const raw of records) result[raw.uniqueName] = adaptRecord(raw)
  return result
}

export const RECIPE_APP_FIELDS = RECIPE_FIELDS
