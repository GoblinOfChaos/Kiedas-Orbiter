import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const MISSING_PRICE_RE = /\b(for|costs?|price of)\s+(creds?|credits?|platinum|standing|ducats?|endo|aya|\.|on\b|from\b)/i
const DOUBLE_PERIOD_RE = /\.\./

const P52_MODS = new Set([
  'Corrosive Projection', 'Shield Disruption', 'Infested Impedance', 'Enemy Radar',
  "Dreamer's Bond", 'Energy Siphon', 'Physique', 'Rejuvenation', 'Holster Amp',
  'Loot Detector', 'Steel Charge', 'Pistol Scavenger', 'Rifle Scavenger', 'Rifle Amp',
  'Shotgun Scavenger', 'Sniper Scavenger', 'Dead Eye', 'Sprint Boost',
])

const P52_UNNUMBERED_RESOURCES = new Set([
  'Sporulate Sac', 'Cranial Foremount', 'Charc Electroplax', 'Goopolla Spleen',
  'Sharrac Teeth', 'Karkina Antenna', 'Mawfish Bones', 'Khut-Khut Venom Sac',
  'Yogwun Stomach', 'Tralok Eyes', 'Mortus Horn',
])

// These are existing whole-catalog findings outside P52's 29-item audit scope.
// Keep the names explicit so a newly introduced missing-price/double-period row
// fails this ratchet instead of becoming silently accepted.
const PREEXISTING_OUT_OF_SCOPE = new Set([
  'Moa', 'Dizzying Rounds', 'Photon Overcharge', 'Deadly Maneuvers', 'Leaded Gas',
  'Biotic Rounds', 'Clip Delegation', 'Critical Mutation', 'Wild Frenzy',
  'Precision Strike', 'Exposing Harpoon', 'Meticulous Aim', 'Bursting Mass',
  'Range Advantage', 'Sentient Barrage', 'Metamorphic Magazine', 'Volatile Variant',
  'Critical Precision', 'Combat Reload', 'Eximus Advantage', 'Napalm Grenades',
  'Efficient Beams', 'Ferment Bladder', 'Pustulent Cognitive Nodule',
  'Dendrite Blastoma', 'Saturated Muscle Mass', 'Ocular Stem-Root',
  'Parasitic Tethermaw', 'Biotic Filter', 'Orokin Ducats', 'Festive Interior Decorations',
  'Passionate Void Offering', 'Faithful Void Offering', 'Humble Void Offering',
])

function sourceRows(sources) {
  return (sources || []).flatMap((source) => source?.sources ? sourceRows(source.sources) : [source])
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
      if (MISSING_PRICE_RE.test(text) || DOUBLE_PERIOD_RE.test(text)) {
        findings.push({ name: subject.name, category: subject.category, text })
      }
    }
  }

  const unexpected = findings.filter(({ name }) => !P52_UNNUMBERED_RESOURCES.has(name) && !PREEXISTING_OUT_OF_SCOPE.has(name))
  assert.deepEqual(unexpected, [], `new acquisition text defects:\n${unexpected.map((row) => `${row.name}: ${row.text}`).join('\n')}`)

  const fixedModFindings = findings.filter(({ name }) => P52_MODS.has(name))
  assert.deepEqual(fixedModFindings, [], `P52 mod rows still have a missing number or double period:\n${fixedModFindings.map((row) => `${row.name}: ${row.text}`).join('\n')}`)

  const remainingResources = new Set(findings.filter(({ name }) => P52_UNNUMBERED_RESOURCES.has(name)).map(({ name }) => name))
  assert.deepEqual(remainingResources, P52_UNNUMBERED_RESOURCES, 'P52 resource rows changed without a numeric price in the saved Wiki text')
})
