import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.env.I18N_DIR || path.join(import.meta.dirname, '../../src/lib/i18n'))
const locales = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']
const completeLocales = JSON.parse(fs.readFileSync(path.resolve(process.env.I18N_COMPLETE_LOCALES || path.join(import.meta.dirname, '../fixtures/i18n-complete-locales.json')), 'utf8'))
const en = JSON.parse(fs.readFileSync(path.join(root, 'en.json'), 'utf8'))
const baselinePath = path.resolve(process.env.I18N_BASELINE || path.join(import.meta.dirname, '../fixtures/i18n-identical-baseline.json'))
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))

const placeholders = (value) => [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort()

function uiKeysInSource(source) {
  const match = source.match(/"ui"\s*:\s*\{([\s\S]*?)\n\s*\},\n\s*"(?:rivenStats|nameOverrides|eras|peely|acquisitionTemplates)"/)
  if (!match) return []
  return [...match[1].matchAll(/^\s*"([^"]+)"\s*:/gm)].map((m) => m[1])
}

test('all UI locale keys and placeholders are covered', () => {
  for (const locale of completeLocales) {
    const file = path.join(root, `${locale}.json`)
    const source = fs.readFileSync(file, 'utf8')
    const data = JSON.parse(source)
    assert.ok(data.ui && typeof data.ui === 'object', `${locale}: ui object missing`)
    const duplicates = uiKeysInSource(source).filter((key, i, keys) => keys.indexOf(key) !== i)
    assert.deepEqual(duplicates, [], `${locale}: duplicate ui keys`)
    for (const [key, value] of Object.entries(en.ui)) {
      assert.ok(Object.hasOwn(data.ui, key), `${locale}: missing ${key}`)
      assert.deepEqual(placeholders(data.ui[key]), placeholders(value), `${locale}: placeholder mismatch for ${key}`)
    }
  }
})

test('all locales preserve placeholder parity for keys they provide', () => {
  for (const locale of locales) {
    const data = JSON.parse(fs.readFileSync(path.join(root, `${locale}.json`), 'utf8'))
    for (const [key, value] of Object.entries(data.ui || {})) {
      if (Object.hasOwn(en.ui, key)) assert.deepEqual(placeholders(value), placeholders(en.ui[key]), `${locale}: placeholder mismatch for ${key}`)
    }
  }
})

test('identical English UI strings are ratcheted', () => {
  for (const locale of locales) {
    const data = JSON.parse(fs.readFileSync(path.join(root, `${locale}.json`), 'utf8'))
    const identical = Object.keys(en.ui).filter((key) => /[A-Za-z]/.test(en.ui[key]) && data.ui[key] === en.ui[key]).sort()
    const allowed = baseline[locale] || []
    assert.deepEqual(identical, [...allowed].sort(), `${locale}: new English-only UI string`)
  }
})

test('German Circuit card uses its localized UI key', () => {
  const dashboard = fs.readFileSync(path.resolve(root, '../../screens/Dashboard.jsx'), 'utf8')
  assert.match(dashboard, /t\('ui\.dashboard\.circuit_title'\)/)
  // No official localized name is available in the allowed DE sources yet.
  for (const locale of ['en', ...locales]) {
    const data = JSON.parse(fs.readFileSync(path.join(root, `${locale}.json`), 'utf8'))
    assert.equal(data.ui['ui.dashboard.circuit_title'], 'The Circuit', `${locale}: Circuit must remain the English official name`)
  }
})
