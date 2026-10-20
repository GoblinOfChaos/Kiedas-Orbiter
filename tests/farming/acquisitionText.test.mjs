import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import '../../scripts/lib/real-data-harness.mjs'
import { expandWikiTemplates, isHistoricalClause, toCurrentSourceSentences } from '../../src/lib/acquisitionText.js'

const forbiddenAcquisitionText = /\{\{|\}\}|\[\[|\bfor\s*[.,]|Beginning in|originally|Originally|first available|formerly|previously|\b(?:19|20)\d{2}\b|\bUpdate\s+\d+/i

function stringValues(value, path = [], result = []) {
  if (typeof value === 'string') result.push([path.join('.'), value])
  else if (Array.isArray(value)) value.forEach((child, index) => stringValues(child, [...path, index], result))
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, child]) => stringValues(child, [...path, key], result))
  return result
}

test('wiki templates expand to plain acquisition words or fail as one sentence', () => {
  assert.equal(expandWikiTemplates('{{pc|30}} for 1500 [[Alloy Plate]].'), '30 Platinum for 1500 [[Alloy Plate]].')
  assert.equal(expandWikiTemplates('{{Nc|20}}'), '20 creds')
  assert.equal(expandWikiTemplates('{{Nc|20}} creds'), '20 creds')
  assert.equal(expandWikiTemplates('{{dc|410}}'), '410 Ducats')
  assert.equal(expandWikiTemplates('{{Resource|Pathos Clamp|Pathos Clamps}}'), 'Pathos Clamps')
  assert.equal(expandWikiTemplates('{{D|Electricity}} {{WF|Ash}} {{M|Mod name}} {{Companion|Kubrow}}'), 'Electricity Ash Mod name Kubrow')
  assert.equal(expandWikiTemplates('{{unknown-template|value}}'), null)
})

test('historical clauses are excluded from current route text', () => {
  assert.equal(isHistoricalClause('It was first available in 2015.'), true)
  assert.equal(isHistoricalClause('Beginning in Update 9, it was sold for Platinum.'), true)
  assert.equal(isHistoricalClause('Can be bought from the Market for 30 Platinum.'), false)
  assert.deepEqual(
    toCurrentSourceSentences('It was first available in 2015. Can be bought from the Market for {{pc|30}}.'),
    ['Can be bought from the Market for 30 Platinum.'],
  )
})

test('wiki residue is removed without dropping a clean neighboring route', () => {
  assert.deepEqual(
    toCurrentSourceSentences('Blueprints and components are a potential reward from Invasions. All components can be traded, although players must have a Mastery Rank of at least 7 to acquire the blueprint. type=Weapon'),
    [
      'Blueprints and components are a potential reward from Invasions.',
      'All components can be traded, although players must have a Mastery Rank of at least 7 to acquire the blueprint.',
    ],
  )
  assert.deepEqual(
    toCurrentSourceSentences('The blueprint is available. {| class="wikitable" |- | Blueprint || Market |} type=Weapon'),
    ['The blueprint is available.'],
  )
})

test('real wiki strings produce current Alloy Plate and Forma routes', () => {
  const alloyText = 'Beginning in {{ver|9}} materials could be purchased directly from the market for {{Resource|Platinum}}. {{pc|30}} for 1500 [[Alloy Plate]].'
  const alloyRoutes = toCurrentSourceSentences(alloyText)
  assert.deepEqual(alloyRoutes, ['30 Platinum for 1500 Alloy Plate.'])

  const pages = JSON.parse(fs.readFileSync(new URL('../../scratchwiki/wiki-resource-pages.json', import.meta.url)))
  const formaRoutes = toCurrentSourceSentences(pages.pages.Forma.wikitext.split('\n==Crafting==')[0].split('\n==Acquisition==')[1])
  assert.ok(formaRoutes.some((text) => /Acrithis.*10 Pathos Clamps/i.test(text)))
  assert.ok(formaRoutes.some((text) => /Market for 20 Platinum/i.test(text)))
  assert.ok(formaRoutes.some((text) => /three-Forma bundle for 35 Platinum/i.test(text)))
  assert.ok(formaRoutes.every((text) => !forbiddenAcquisitionText.test(text)))
})

test('all generated and handwritten acquisition text is clean', async () => {
  const wikiResources = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/wiki-resource-sources.json', import.meta.url)))
  const extractors = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/wiki-extractor-acquisition.json', import.meta.url)))
  const acquisitionData = await import('../../src/lib/acquisitionData.js')
  const checked = []
  for (const [name, entry] of Object.entries(wikiResources)) {
    if (entry.foundText) checked.push([`wiki-resource-sources.${name}.foundText`, entry.foundText])
    for (const [index, section] of (entry.otherSections || []).entries()) checked.push([`wiki-resource-sources.${name}.otherSections.${index}.text`, section.text])
  }
  for (const [name, entry] of Object.entries(extractors)) {
    for (const [index, text] of (entry.sources || []).entries()) checked.push([`wiki-extractor-acquisition.${name}.sources.${index}`, text])
  }
  for (const tableName of ['WARFRAME_ACQUISITIONS', 'RESOURCE_LOCATIONS']) {
    for (const [path, text] of stringValues(acquisitionData[tableName], [tableName])) checked.push([path, text])
  }
  assert.ok(checked.length > 4000, `expected the complete text audit, checked ${checked.length}`)
  const violations = checked.filter(([, text]) => forbiddenAcquisitionText.test(text))
  assert.deepEqual(violations, [])
})

test('a parenthetical after a full stop is not its own acquisition sentence', async () => {
  const { toCurrentSourceSentences } = await import('../../src/lib/acquisitionText.js')
  const text = "Blueprint drops from certain Relics. (1x from Common and 2x from Uncommon) Purchased blueprint from Acrithis's shop for 10 Pathos Clamps."
  const out = toCurrentSourceSentences(text)
  assert.ok(out.some((sentence) => /certain Relics \(1x from Common and 2x from Uncommon\)/.test(sentence)), JSON.stringify(out))
  assert.ok(!out.some((sentence) => /^\(/.test(sentence)), JSON.stringify(out))
})
