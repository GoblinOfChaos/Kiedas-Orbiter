import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'

const overrides = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url)))
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))

const ALLOWED_VIOLATIONS = new Map()

function catalogEntries(exportsBundle) {
  const all = []
  for (const key of Object.keys(exportsBundle)) {
    if (!/^Export(Warframes|Weapons|Recipes|Resources|Sentinels|Gear|Misc|Customs|Upgrades)$/.test(key)) continue
    const table = exportsBundle[key]
    const entries = Array.isArray(table) ? table.map((entry) => [entry.uniqueName, entry]) : Object.entries(table || {})
    for (const [uniqueName, entry] of entries) {
      if (uniqueName && entry) all.push({ uniqueName, name: entry.name || entry.displayName || '' })
    }
  }
  return all
}

function violationKind(text) {
  if (/^\d{1,3}$/.test(text) || /^000\s+(?:Credits|Standing|Platinum)\b/i.test(text)) return 'digitFragment'
  if (/^[^.]{0,30}:$/.test(text)) return 'danglingColon'
  if (/\bfor\s*[.,]|\bfor\s*$/.test(text)) return 'missingPrice'
  if (/\{\{|\}\}|\[\[|\]\]/.test(text)) return 'markup'
  if (/[A-Za-z]_[A-Za-z]/.test(text)) return 'underscoreName'
  if (/^Mission$/.test(text)) return 'bareMission'
  if (/\b(?:Update|Hotfix|Version)\s*\d+/i.test(text)) return 'history'
  if (/\b(?:19|20)\d{2}\b/.test(text)) return 'history'
  if (/\b(?:originally|formerly|first\s+available|previously|returned|was|beginning\s+(?:with|in))\b/i.test(text)) return 'history'
  return null
}

test('real data: every catalog acquisition source row is current and renderable', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness()
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const violations = []

  for (const entry of catalogEntries(harness.exportsBundle)) {
    const displayName = harness.dict[entry.name] || entry.name
    const result = getAcquisitionInfo(
      entry.uniqueName, displayName, dropIndex, overrides,
      indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
      indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
      indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
      indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
      indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
      indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
    )
    for (const source of result.sources || []) {
      const text = typeof source.text === 'string' ? source.text.trim() : ''
      if (!text) continue
      const kind = violationKind(text)
      if (!kind) continue
      const allowlistKey = `${entry.uniqueName}|${text}`
      if (!ALLOWED_VIOLATIONS.has(allowlistKey)) violations.push({ kind, name: displayName, uniqueName: entry.uniqueName, text })
    }
  }

  assert.deepEqual(violations, [], `catalog acquisition violations: ${JSON.stringify(violations.slice(0, 30), null, 2)}`)
})

test('real data: Grimoire routes keep their labels and formatted Standing amount', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness()
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const acquire = (uniqueName, name) => getAcquisitionInfo(
    uniqueName, name, dropIndex, overrides,
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  )
  const grimoire = acquire('/Lotus/Weapons/Tenno/Grimoire/TnGrimoire', 'Grimoire')
  const blueprint = acquire('/Lotus/Types/Recipes/Weapons/TnGrimoireBlueprint', 'Grimoire Blueprint')
  assert.ok(grimoire.sources.some((source) => /Purchased from Bird 3.*50,000 Standing/i.test(source.text)))
  assert.ok(grimoire.sources.every((source) => !/^Blueprint:$|^or$/i.test(source.text)))
  assert.ok(blueprint.sources.some((source) => /Sold by Bird 3/i.test(source.text)))
})
