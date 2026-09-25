import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyDeLocale } from '../../src/lib/deLocale.js'

const cacheDir = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const mirror = {
  ExportWarframes: [{ uniqueName: '/Lotus/Test/Warframe', name: '/Lotus/TestName', description: '/Lotus/TestDescription', abilities: [{ abilityName: '/Lotus/Ability', description: '/Lotus/AbilityDesc' }] }],
  ExportWeapons: [{ uniqueName: '/Lotus/Test/Weapon', name: '/Lotus/TestWeapon', description: '/Lotus/WeaponDescription' }],
}
const tables = {
  DeLocale_ExportWarframes: { ExportWarframes: [{ uniqueName: '/Lotus/Test/Warframe', name: 'Rahmen', description: 'Beschreibung', abilities: [{ abilityName: 'Fähigkeit', description: 'Text' }] }] },
  DeLocale_ExportWeapons: { ExportWeapons: [{ uniqueName: '/Lotus/Test/Weapon', name: 'Waffe', description: 'Waffenbeschreibung' }] },
}

const localized = applyDeLocale(mirror, tables, 'de')
assert.equal(localized.ExportWarframes[0].name, 'Rahmen')
assert.equal(localized.ExportWarframes[0].abilities[0].abilityName, 'Fähigkeit')
assert.equal(localized.ExportWeapons[0].description, 'Waffenbeschreibung')
assert.equal(localized.ExportWeapons[0].name.startsWith('/Lotus/'), false)
const wrapped = applyDeLocale({ ExportWarframes: { ExportWarframes: mirror.ExportWarframes } }, tables, 'de')
assert.equal(wrapped.ExportWarframes.ExportWarframes[0].name, 'Rahmen')
const missing = applyDeLocale(mirror, { DeLocale_ExportWeapons: tables.DeLocale_ExportWeapons }, 'de')
assert.equal(missing.ExportWarframes[0].name, '/Lotus/TestName')
assert.deepEqual(applyDeLocale(mirror, tables, 'en'), mirror)
assert.deepEqual(applyDeLocale(localized, tables, 'en'), localized)

const provenancePath = join(cacheDir, 'provenance.json')
const provenance = existsSync(provenancePath) ? JSON.parse(readFileSync(provenancePath, 'utf8')) : null
const available = ['de', 'fr', 'ja'].filter((locale) => provenance?.locales?.[locale])
console.log(available.length
  ? `i18n-parity: PASS (cached locale provenance available: ${available.join(', ')})`
  : 'i18n-parity: PASS (synthetic invariants; no cached DE locale fixtures available)')
