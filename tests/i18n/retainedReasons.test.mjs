import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const fixtureDir = path.resolve(import.meta.dirname, '../fixtures')
const baseline = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'i18n-identical-baseline.json'), 'utf8'))
const reasons = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'i18n-identical-reasons.json'), 'utf8'))
const auditedLocales = ['ja', 'ko', 'zh', 'tc', 'th']

test('every retained English-identical entry in the audited locales has a reason', () => {
  for (const locale of auditedLocales) {
    assert.ok(reasons[locale], `${locale}: missing reasons object`)
    for (const key of baseline[locale] || []) {
      assert.equal(typeof reasons[locale][key], 'string', `${locale}.${key}: missing reason`)
      assert.ok(reasons[locale][key].trim(), `${locale}.${key}: empty reason`)
    }
  }
})
