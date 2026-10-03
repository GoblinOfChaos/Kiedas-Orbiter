import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const fixtureDir = path.resolve(import.meta.dirname, '../fixtures')
const baseline = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'i18n-identical-baseline.json'), 'utf8'))
const reasons = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'i18n-identical-reasons.json'), 'utf8'))

test('every retained English-identical entry has exactly one audit reason', () => {
  for (const [locale, keys] of Object.entries(baseline)) {
    if (!Object.hasOwn(reasons, locale)) continue
    const localeReasons = reasons[locale]
    assert.deepEqual(Object.keys(localeReasons).sort(), [...keys].sort(), `${locale}: reasons must match the retained baseline keys`)
    for (const key of keys) {
      assert.equal(typeof localeReasons[key], 'string', `${locale}.${key}: missing reason`)
      assert.ok(localeReasons[key].trim(), `${locale}.${key}: empty reason`)
    }
  }
})
