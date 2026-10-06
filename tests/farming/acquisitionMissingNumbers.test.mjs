import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const MISSING_PRICE_RE = /\b(?:for|costs?|price of|of)\s+(?:(?:creds?|credits?|platinum|standing|ducats?|endo|aya)\b|(?:from|on|in|at|the|a|an|each|per)\b|\.|$)/gi
const DOUBLE_SPACE_UNIT_RE = /\b(?:for|costs?|price of)\s{2,}(?:creds?|credits?|platinum|standing|ducats?|endo|aya)\b/i
const DOUBLE_PERIOD_RE = /\.\./

const P52_MODS = new Set([
  'Corrosive Projection', 'Shield Disruption', 'Infested Impedance', 'Enemy Radar',
  "Dreamer's Bond", 'Energy Siphon', 'Physique', 'Rejuvenation', 'Holster Amp',
  'Loot Detector', 'Steel Charge', 'Pistol Scavenger', 'Rifle Scavenger', 'Rifle Amp',
  'Shotgun Scavenger', 'Sniper Scavenger', 'Dead Eye', 'Sprint Boost',
])

const P52B_MODS = new Set([
  'Dizzying Rounds', 'Photon Overcharge', 'Deadly Maneuvers', 'Leaded Gas',
  'Biotic Rounds', 'Clip Delegation', 'Critical Mutation', 'Wild Frenzy',
  'Precision Strike', 'Exposing Harpoon', 'Meticulous Aim', 'Bursting Mass',
  'Range Advantage', 'Sentient Barrage', 'Metamorphic Magazine', 'Volatile Variant',
  'Critical Precision', 'Combat Reload', 'Eximus Advantage', 'Napalm Grenades',
  'Efficient Beams',
])

const P52_UNNUMBERED_RESOURCES = new Set([
  'Sporulate Sac', 'Cranial Foremount', 'Charc Electroplax', 'Goopolla Spleen',
  'Sharrac Teeth', 'Karkina Antenna', 'Mawfish Bones', 'Khut-Khut Venom Sac',
  'Yogwun Stomach', 'Tralok Eyes', 'Mortus Horn',
])

// These are reviewed whole-catalog findings whose saved Wiki text gives no
// numeric price. Keep the item, quote, and reason together so a new finding
// cannot become silently accepted by adding only a name.
const REVIEWED_ALLOWLIST = new Map([
  ['Moa', { quote: 'for Standing', reason: 'wiki gives no number' }],
  ['Ferment Bladder', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Pustulent Cognitive Nodule', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Dendrite Blastoma', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Saturated Muscle Mass', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Sporulate Sac', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Ocular Stem-Root', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Parasitic Tethermaw', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Biotic Filter', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Cranial Foremount', { quote: 'in exchange for Platinum', reason: 'wiki gives no number' }],
  ['Charc Electroplax', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Goopolla Spleen', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Sharrac Teeth', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Mawfish Bones', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Karkina Antenna', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Khut-Khut Venom Sac', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Yogwun Stomach', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Tralok Eyes', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Mortus Horn', { quote: 'bought for Platinum', reason: 'wiki gives no number' }],
  ['Orokin Ducats', { quote: 'purchased for Aya', reason: 'wiki gives no number' }],
  ['Festive Interior Decorations', { quote: 'for Credits', reason: 'wiki gives no number' }],
  ['Passionate Void Offering', { quote: 'could be purchased for from the Market', reason: 'wiki gives no number' }],
  ['Faithful Void Offering', { quote: 'could be purchased for from the Market', reason: 'wiki gives no number' }],
  ['Humble Void Offering', { quote: 'could be purchased for from the Market', reason: 'wiki gives no number' }],
])

function sourceRows(sources) {
  return (sources || []).flatMap((source) => source?.sources ? sourceRows(source.sources) : [source])
}

function isMissingPrice(text) {
  for (const match of text.matchAll(MISSING_PRICE_RE)) {
    const prefix = text.slice(0, match.index)
    const clauseStart = Math.max(prefix.lastIndexOf('.'), prefix.lastIndexOf(';'), prefix.lastIndexOf(':')) + 1
    const clause = prefix.slice(clauseStart)
    const bareOf = /^of\b/i.test(match[0].trim())
    if (bareOf && !/\b(?:price|cost)\b/i.test(clause)) continue
    if (/\b(?:available|purchase|purchas|buy|bought|sold|offer|market|cost|price)\b/i.test(clause)) return true
  }
  return false
}

test('real data: non-cosmetic acquisition text has no unreviewed missing prices or double periods', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { discoverSubjects } = await import('../../scripts/item-completeness.mjs')
  const { buildDropIndex } = await import('../../src/lib/dropsParser.js')
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const findings = []
  const subjects = discoverSubjects(harness).filter((subject) => subject.category !== 'cosmetics')

  for (const subject of subjects) {
    const result = getAcquisitionInfo(
      subject.uniqueName, subject.name, dropIndex, harness.exportsBundle.AcquisitionItems || {},
      indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
      indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
      indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
      indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
      indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
      indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
    )
    for (const source of sourceRows(result.sources)) {
      const text = String(source?.text || '').trim()
      if (!text) continue
      const missingPrice = isMissingPrice(text)
      const doubleSpaceUnit = DOUBLE_SPACE_UNIT_RE.test(text)
      const doublePeriod = DOUBLE_PERIOD_RE.test(text)
      if (missingPrice || doubleSpaceUnit || doublePeriod) {
        findings.push({ name: subject.name, category: subject.category, text, kinds: [
          ...(missingPrice ? ['missing-price'] : []),
          ...(doubleSpaceUnit ? ['double-space-unit'] : []),
          ...(doublePeriod ? ['double-period'] : []),
        ] })
      }
    }
  }

  const unreviewed = findings.filter(({ name, text }) => {
    const reviewed = REVIEWED_ALLOWLIST.get(name)
    return !reviewed || reviewed.reason !== 'wiki gives no number' || !text.includes(reviewed.quote)
  })
  console.log(`real catalog: ${subjects.length} non-cosmetic subjects; ${findings.length} reviewed missing-price/spacing/period findings; ${new Set(findings.map(({ name }) => name)).size} affected subjects`)
  assert.deepEqual(unreviewed, [], `new acquisition text defects:\n${unreviewed.map((row) => `${row.name}: ${row.text}`).join('\n')}`)

  const fixedModFindings = findings.filter(({ name }) => P52_MODS.has(name) || P52B_MODS.has(name))
  assert.deepEqual(fixedModFindings, [], `P52/P52b mod rows still have a missing number or double period:\n${fixedModFindings.map((row) => `${row.name}: ${row.text}`).join('\n')}`)

  const remainingResources = new Set(findings.filter(({ name }) => P52_UNNUMBERED_RESOURCES.has(name)).map(({ name }) => name))
  assert.deepEqual(remainingResources, P52_UNNUMBERED_RESOURCES, 'P52 resource rows changed without a numeric price in the saved Wiki text')
})
