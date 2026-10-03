import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { buildWikiResourceSources } from '../../scripts/build-wiki-resource-sources.mjs'

const overrides = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url)))
const wikiSources = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/wiki-resource-sources.json', import.meta.url)))
let harnessPromise
let indexesPromise
let dropIndex

async function acquisition(uniqueName, displayName) {
  const harness = await (harnessPromise ||= loadRealHarness())
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = await (indexesPromise ||= buildAllAcquisitionIndexes(harness.exportsBundle))
  dropIndex ||= buildDropIndex(harness.exportsBundle)
  return getAcquisitionInfo(
    uniqueName, displayName, dropIndex, overrides,
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  )
}

test('real data: Alloy Plate keeps all ten DE rows and adds the wiki found-on row', async () => {
  const result = await acquisition('/Lotus/Types/Items/MiscItems/AlloyPlate', 'Alloy Plate')
  const deRows = result.sources.filter((source) => source.type === 'mission' && source.source === 'warframe-items')
  assert.equal(deRows.length, 10)
  assert.equal(new Set(deRows.map((source) => source.location)).size, 10)
  assert.ok(result.sources.some((source) => /found on Venus, Jupiter, Sedna, Ceres, Phobos, Pluto, and the Zariman Ten Zero/i.test(source.text || '')))
  assert.ok(deRows.some((source) => source.nodes?.includes('Ishtar, Venus')))
  assert.ok(result.sources.every((source) => !/vast selection of decorations/i.test(source.text || '')))
})

test('wiki resource source data is complete and has a stable provenance record', () => {
  for (const [name, entry] of Object.entries(wikiSources)) {
    assert.ok(entry.url, `${name} is missing url`)
    assert.ok(entry.revid, `${name} is missing revid`)
    const rowCount = (entry.foundText ? 1 : 0) + entry.drops.length + entry.otherSections.length
    assert.ok(rowCount > 0, `${name} has no usable source text`)
    if (rowCount < 2) assert.ok(entry.foundText || entry.otherSections.length > 0, `${name} lacks a documented single-source reason`)
    assert.doesNotMatch(JSON.stringify(entry), /vast selection of decorations/i)
  }
})

const haveWikiSnapshots = fs.existsSync(new URL('../../scratchwiki/wiki-resource-pages.json', import.meta.url))
test('wiki resource source generator is deterministic', { skip: !haveWikiSnapshots && 'wiki snapshots (scratchwiki/) are not committed' }, () => {
  const pages = JSON.parse(fs.readFileSync(new URL('../../scratchwiki/wiki-resource-pages.json', import.meta.url)))
  const sections = JSON.parse(fs.readFileSync(new URL('../../scratchwiki/wiki-resource-sections.json', import.meta.url)))
  const first = buildWikiResourceSources(pages, sections)
  const second = buildWikiResourceSources(pages, sections)
  assert.equal(first, second)
  assert.equal(first, fs.readFileSync(new URL('../../src-tauri/data/assets/data/wiki-resource-sources.json', import.meta.url), 'utf8'))
})
