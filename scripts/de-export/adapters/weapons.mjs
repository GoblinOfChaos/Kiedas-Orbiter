const RECORD_FIELDS = [
  'uniqueName', 'name', 'description', 'codexSecret', 'damagePerShot', 'totalDamage',
  'criticalChance', 'criticalMultiplier', 'procChance', 'fireRate', 'masteryReq',
  'productCategory', 'slot', 'accuracy', 'omegaAttenuation', 'primeOmegaAttenuation',
  'noise', 'trigger', 'magazineSize', 'reloadTime', 'multishot', 'blockingAngle',
  'comboDuration', 'followThrough', 'heavyAttackDamage', 'heavySlamAttack',
  'heavySlamRadialDamage', 'heavySlamRadius', 'range', 'sentinel', 'slamAttack',
  'slamRadialDamage', 'slamRadius', 'slideAttack', 'windUp', 'excludeFromCodex',
  'maxLevelCap',
]

function recordsOf(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value.ExportWeapons)) return value.ExportWeapons
  return Object.entries(value).map(([uniqueName, record]) => ({ uniqueName, ...record }))
}

function adaptRecord(raw) {
  const result = {}
  for (const field of RECORD_FIELDS) {
    if (raw?.[field] !== undefined) result[field] = Array.isArray(raw[field]) ? [...raw[field]] : raw[field]
  }
  return result
}

/** Convert DE ExportWeapons data to the app's consumed weapon record shape. */
export function adaptWeapons(deRaw, { locale = 'en' } = {}) {
  if (locale !== 'en') throw new Error(`Weapons adapter only supports the cached ${locale} locale when supplied as en`)
  const result = {}
  const records = recordsOf(deRaw)
    .filter((record) => typeof record?.uniqueName === 'string' && record.uniqueName)
    .sort((a, b) => a.uniqueName.localeCompare(b.uniqueName))
  for (const raw of records) result[raw.uniqueName] = adaptRecord(raw)
  return result
}

export const WEAPON_APP_FIELDS = Object.freeze([...RECORD_FIELDS])
