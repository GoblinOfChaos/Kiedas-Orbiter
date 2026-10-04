import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'

const overrides = JSON.parse(fs.readFileSync(new URL('../../src-tauri/data/assets/data/acquisition_overrides.json', import.meta.url)))
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))

const ALLOWED_VIOLATIONS = new Map()

// Every entry here is a complete, reviewed route phrase whose lower-case
// opening is part of the source wording, not a sentence fragment produced by
// a splitter. Keep this explicit: a new lower-case row must fail the audit.
const REVIEWED_LOWERCASE_PHRASES = new Map()

const REVIEWED_CONJUNCTION_PHRASES = new Map([
  ['However, the Bondi K-Drive does not appear in the Arsenal, thus it cannot be altered.', 'Complete current route sentence from the saved wiki text; However introduces a contrast, not a splitter fragment.'],
  ['Which specific tone this is (default vs Refacia-locked) not determined from the page text alone.', 'Explicitly recorded limitation from the saved wiki source; it is a complete note and not a fragment created by splitting.'],
  ['However, only the squad host requires a Locator, allowing them to invite other players to participate in the mission, and the component reward will be granted to all players upon completion.', 'Complete current route sentence from the saved wiki text; the conjunction is grammatical prose.'],
  ['However, Voidrig component blueprints and the main blueprint cannot be traded.', 'Complete current tradeability sentence from the saved wiki text.'],
  ['However, Bonewidow component blueprints and the main blueprint cannot be traded.', 'Complete current tradeability sentence from the saved wiki text.'],
  ["Then the Machete's blueprint can be bought from Cephalon Simaris offerings for 100,000 Standing.", 'Complete current route sentence from the saved wiki text; Then introduces a second current route.'],
  ['While the actual Grip itself cannot usually be acquired outside of events, it can still appear as part of a complete Zaw in Hok\'s Daily Specials.', 'Complete current route sentence from the saved wiki text; While introduces a condition, not a splitter fragment.'],
  ['While the actual Strike itself cannot usually be acquired outside of events, it can still appear as part of a complete Zaw in Hok\'s Daily Specials.', 'Complete current route sentence from the saved wiki text; While introduces a condition, not a splitter fragment.'],
  ['While some are only given out by the creators personally, many are implemented with universal Promo Codes which can be freely redeemed by any player.', 'Complete current acquisition sentence from the saved wiki text; While introduces a condition, not a splitter fragment.'],
])

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
  if (/\b[A-Za-z][\w/-]*\s*=|\{\||\|\}|\|\s*[^.]*\||\{\{|\}\}|\[\[|\]\]|<[^>]*>/.test(text)) return 'templateResidue'
  const reviewedConjunction = REVIEWED_CONJUNCTION_PHRASES.has(text) || REVIEWED_CONJUNCTION_PHRASES.has(`${text}.`)
  if (/^(?:although|but|and|which|while|however|though|so|or|then|except)\b/i.test(text) && !reviewedConjunction) return 'conjunctionStart'
  if (/^[a-z]/.test(text) && !REVIEWED_LOWERCASE_PHRASES.has(text)) return 'lowercaseStart'
  if (/^[A-Z][A-Za-z']+s?$/.test(text) && text.length < 14) return 'oneWordRow'
  return null
}

test('real data: every catalog acquisition source row is current and renderable', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
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
  const harness = await loadRealHarness({ locale: 'en' })
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
