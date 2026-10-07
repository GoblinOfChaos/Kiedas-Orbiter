import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))

const { buildTooltipRelicRows } = await import('../../src/lib/acquisitionModel/tooltipRelicRows.js')
const { deRelicTruth } = await import('../../src/lib/acquisitionModel/deRelicTruth.js')
const { buildRelicTooltipRows } = await import('../../src/lib/relicSources.js')

const translatedTiers = {
  'ui.relic_rarity.common': 'Common',
  'ui.relic_rarity.uncommon': 'Uncommon',
  'ui.relic_rarity.rare': 'Rare',
}
const t = (key) => translatedTiers[key] || key
const rowFacts = (rows) => rows.map((row) => ({
  relic: row.source.relicName,
  tier: row.source.rarity,
  ...(row.source.tiers ? { tiers: row.source.tiers } : {}),
  ...(row.source.tierConflict ? { tierConflict: row.source.tierConflict } : {}),
}))
const truthFacts = (rows) => rows.map(({ relic, tier, tiers, tierConflict }) => ({
  relic,
  tier,
  ...(tiers ? { tiers } : {}),
  ...(tierConflict ? { tierConflict } : {}),
}))
const canonicalRelicFacts = (rows) => rows.map((row) => JSON.stringify(row)).toSorted()

test('synthetic: tooltip relic rows use translated DE tiers, preserve conflicts, and sort era/code numerically', () => {
  const item = '/Lotus/Items/TooltipTarget'
  const exportData = {
    ExportRecipes: {},
    ExportRewards: {},
    ExportRelics: {
      '/Relics/LithA19': { name: 'Lith A19 Relic', relicRewards: [{ rewardName: item, rarity: 'UNCOMMON' }] },
      '/Relics/LithA2': { name: 'Lith A2 Relic', relicRewards: [{ rewardName: item, rarity: 'COMMON' }] },
      '/Relics/MesoA1': { name: 'Meso A1 Relic', relicRewards: [{ rewardName: item, rarity: 'RARE' }] },
      '/Relics/AxiV8': { name: 'Axi V8 Relic', relicRewards: [{ rewardName: item, rarity: 'COMMON' }, { rewardName: item, rarity: 'UNCOMMON' }] },
      '/Relics/VanguardE1': { era: 'Vanguard', category: 'E1', relicRewards: [{ rewardName: item, rarity: 'UNCOMMON' }] },
    },
  }

  const rows = buildTooltipRelicRows(item, 'Tooltip Target', { exportData }, { t })

  assert.deepEqual(rows.map((row) => row.label), [
    'Lith A2 (Common)',
    'Lith A19 (Uncommon)',
    'Meso A1 (Rare)',
    'Axi V8 (Common / Uncommon)',
    'Vanguard E1 (Uncommon)',
  ])
  assert.deepEqual(rowFacts(rows).find((row) => row.relic === 'Axi V8'), {
    relic: 'Axi V8', tier: 'COMMON', tiers: ['COMMON', 'UNCOMMON'], tierConflict: true,
  })
})

test('legacy builder fixture remains the exact capped fallback when the flag is false', () => {
  const sources = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((code) => ({ type: 'relic', relicName: `Lith ${code}`, rarity: 'COMMON' }))
  const oldRows = buildRelicTooltipRows(sources, { t }).slice(0, 5)

  assert.deepEqual(oldRows.map((row) => row.label), [
    'Lith A1 (Common)', 'Lith A2 (Common)', 'Lith A3 (Common)', 'Lith A4 (Common)', 'Lith A5 (Common)',
  ])
})

async function realTooltipContext() {
  const harness = await loadRealHarness({ locale: 'en' })
  const { discoverSubjects } = await import('../../scripts/item-completeness.mjs')
  return { harness, subjects: discoverSubjects(harness), ctx: { exportData: harness.exportsBundle } }
}

test('real data: Volt Prime and Ash Prime Neuroptics tooltip rows equal DE truth', { skip: !haveRealData }, async () => {
  const { harness, subjects, ctx } = await realTooltipContext()
  for (const name of ['Volt Prime', 'Ash Prime Neuroptics']) {
    const subject = subjects.find((entry) => entry.name === name && entry.category !== 'recipes')
    assert.ok(subject, `missing ${name}`)
    const rows = buildTooltipRelicRows(subject.uniqueName, subject.name, ctx, { t })
    const expected = deRelicTruth(subject.uniqueName, harness.exportsBundle)
    assert.deepEqual(canonicalRelicFacts(rowFacts(rows)), canonicalRelicFacts(truthFacts(expected)), name)
  }
})

test('real data: Odonata Prime retains the translated DE tier-conflict row', { skip: !haveRealData }, async () => {
  const { harness, subjects, ctx } = await realTooltipContext()
  const subject = subjects.find((entry) => entry.name === 'Odonata Prime' && entry.category !== 'recipes')
  assert.ok(subject, 'missing Odonata Prime')
  const rows = buildTooltipRelicRows(subject.uniqueName, subject.name, ctx, { t })
  const expected = deRelicTruth(subject.uniqueName, harness.exportsBundle)

  assert.deepEqual(canonicalRelicFacts(rowFacts(rows)), canonicalRelicFacts(truthFacts(expected)))
  assert.equal(rows.find((row) => row.source.relicName === 'Axi V8')?.label, 'Axi V8 (Common / Uncommon)')
})

test('real data: every tooltip relic set and tier equals DE truth', { skip: !haveRealData, timeout: 180000 }, async () => {
  const { harness, subjects, ctx } = await realTooltipContext()
  const mismatches = []
  for (const subject of subjects) {
    const actual = rowFacts(buildTooltipRelicRows(subject.uniqueName, subject.name, ctx, { t }))
    const expected = truthFacts(deRelicTruth(subject.uniqueName, harness.exportsBundle))
    if (JSON.stringify(canonicalRelicFacts(actual)) !== JSON.stringify(canonicalRelicFacts(expected))) mismatches.push(subject.name)
  }
  assert.deepEqual(mismatches, [], `DE tooltip relic mismatches: ${JSON.stringify(mismatches.slice(0, 5))}`)
})
