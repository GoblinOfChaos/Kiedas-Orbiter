import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const { deRelicTruth } = await import('../../src/lib/acquisitionModel/deRelicTruth.js')
const { ACQUISITION_MODEL_RELICS, replaceComponentRelicRows, replaceRelicRows } = await import('../../src/lib/acquisitionModel/relicRows.js')
const { buildTooltipRelicRows } = await import('../../src/lib/acquisitionModel/tooltipRelicRows.js')
const { buildPrimeResurgenceRelics } = await import('../../src/lib/primeResurgence.js')
const { buildRelicPlaces } = await import('../../src/lib/farmingTargets/relicPlaces.js')
const { getRelicCatalog } = await import('../../src/lib/relicParser.js')

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const t = (key) => ({
  'ui.relic_rarity.common': 'Common',
  'ui.relic_rarity.uncommon': 'Uncommon',
  'ui.relic_rarity.rare': 'Rare',
}[key] || key)
const canonical = (value) => String(value || '').replaceAll('/StoreItems/', '/')
const facts = (rows) => rows.filter((row) => row?.type === 'relic').map((row) => ({
  relic: row.modelRelicName || row.relicName,
  tier: row.modelTier || row.rarity || null,
  ...(row.tiers ? { tiers: row.tiers } : {}),
})).map(JSON.stringify).toSorted()
const truthFacts = (rows) => rows.map(({ relic, tier, tiers }) => ({ relic, tier, ...(tiers ? { tiers } : {}) })).map(JSON.stringify).toSorted()

async function context() {
  const harness = await loadRealHarness({ locale: 'en' })
  const { discoverSubjects } = await import('../../scripts/item-completeness.mjs')
  const subjects = discoverSubjects(harness).filter((subject) => /\bPrime\b/i.test(subject.name || '') && subject.category !== 'recipes')
  return { harness, subjects, ctx: { exportData: harness.exportsBundle } }
}

test('P63 switch makes all existing acquisition-model adapters opt in together', () => {
  assert.equal(ACQUISITION_MODEL_RELICS, true)
  const root = path.resolve('.')
  for (const file of [
    'src/components/AcquisitionDrawer.jsx',
    'src/preview/acquisition/PreviewAcquisitionDrawer.jsx',
    'src/components/BlueprintAcquisitionBox.jsx',
    'src/components/PrimeSetCard.jsx',
    'src/lib/primeResurgence.js',
    'src/lib/farmingTargets/relicPlaces.js',
  ]) assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /acquisitionModel|ACQUISITION_MODEL_RELICS|buildPrimeResurgenceRelics|deRelicTruth/, file)
})

test('real data: every Prime target has the same rows and DE tiers in all item-to-relic adapters', { skip: !haveRealData, timeout: 180000 }, async () => {
  const { harness, subjects, ctx } = await context()
  const mismatches = []
  for (const subject of subjects) {
    const expected = truthFacts(deRelicTruth(subject.uniqueName, harness.exportsBundle))
    const drawer = facts(replaceRelicRows(subject.uniqueName, [{ type: 'mission', nodeName: 'Void' }, { type: 'relic', relicName: 'wrong', rarity: 'RARE' }], ctx, { t }))
    const tooltip = facts(buildTooltipRelicRows(subject.uniqueName, subject.name, ctx, { t }).map(({ source }) => source))
    const resurgence = buildPrimeResurgenceRelics(subject.uniqueName, harness.exportsBundle).toSorted()
    const places = buildRelicPlaces({
      ledger: [{ itemType: subject.uniqueName, name: subject.name, stillNeeded: 1 }], inventoryData: { relics: [] }, exportData: harness.exportsBundle,
    }).map((row) => row.place.name.replace(/ Relic$/, '')).toSorted()
    const expectedRelics = deRelicTruth(subject.uniqueName, harness.exportsBundle).map((row) => row.relic).toSorted()
    const failed = [
      ['drawer', drawer, expected], ['tooltip', tooltip, expected], ['resurgence', resurgence, expectedRelics], ['farming', places, expectedRelics],
    ].filter(([, actual, wanted]) => JSON.stringify(actual) !== JSON.stringify(wanted)).map(([surface]) => surface)
    if (failed.length) mismatches.push(`${subject.name} (${failed.join(',')})`)
  }
  console.log(`P63 item-to-relic DE parity: targets=${subjects.length}, mismatches=${mismatches.length}${mismatches.length ? `, first=${mismatches.slice(0, 5).join(', ')}` : ''}`)
  assert.ok(subjects.length > 0)
  assert.deepEqual(mismatches, [])
})

test('real data: named P63 cases retain literal relic names and DE tiers', { skip: !haveRealData }, async () => {
  const { harness, subjects, ctx } = await context()
  const subject = (name) => {
    const found = subjects.find((entry) => entry.name === name)
    assert.ok(found, `missing ${name}`)
    return found
  }
  const rows = (name) => JSON.parse(`[${facts(replaceRelicRows(subject(name).uniqueName, [], ctx, { t })).join(',')}]`)
  const ash = (harness.exportsBundle.AcquisitionItems || []).find((entry) => entry.name === 'Ash Prime')
  const ashBlueprint = ash?.components?.find((entry) => entry.name === 'Blueprint')
  assert.ok(ashBlueprint?.uniqueName, 'Ash Prime Blueprint present')
  assert.ok(facts(replaceRelicRows(ashBlueprint.uniqueName, [], ctx, { t })).map(JSON.parse).some((row) => row.relic === 'Vanguard E1'), 'Ash Prime Blueprint: Vanguard E1')
  for (const [name, relic, tier] of [
    ['Ash Prime Neuroptics', 'Vanguard P1', 'COMMON'], ['Ash Prime Chassis', 'Vanguard M1', 'COMMON'], ['Ash Prime Systems', 'Vanguard C1', 'UNCOMMON'],
    ['Odonata Prime', 'Axi V8', 'COMMON'], ['Citrine Prime', 'Neo C11', 'COMMON'],
  ]) assert.ok(rows(name).some((row) => row.relic === relic && row.tier === tier), `${name}: ${relic} ${tier}`)
  assert.equal(deRelicTruth(subject('Volt Prime').uniqueName, harness.exportsBundle).length, 16, 'Volt Prime relic count')
  const forma = (harness.exportsBundle.AcquisitionItems || []).find((entry) => entry.name === 'Forma')
  assert.ok(forma?.uniqueName, 'Forma present')
  assert.ok(facts(replaceRelicRows(forma.uniqueName, [], ctx, { t })).map(JSON.parse).some((row) => row.relic === 'Axi A10' && row.tier === 'COMMON'), 'Forma Axi A10 Common')
})

test('real data: every Prime drawer component row set and tier equals DE truth', { skip: !haveRealData, timeout: 180000 }, async () => {
  const { harness, ctx } = await context()
  const mismatches = []
  let components = 0
  for (const [, recipe] of Object.entries(harness.exportsBundle.ExportRecipes || {})) {
    if (!/Prime/i.test(recipe?.resultType || '')) continue
    for (const ingredient of recipe.ingredients || []) {
      const itemType = canonical(ingredient.ItemType || ingredient.itemType)
      if (!itemType) continue
      components += 1
      const rows = replaceComponentRelicRows([{ type: 'relic', part: ingredient.name || itemType, itemType, relicName: 'wrong', rarity: 'RARE' }], { ingredients: [{ name: ingredient.name || itemType, itemType }] }, ctx, { t })
      if (JSON.stringify(facts(rows)) !== JSON.stringify(truthFacts(deRelicTruth(itemType, harness.exportsBundle)))) mismatches.push(itemType)
    }
  }
  console.log(`P63 component drawer DE parity: components=${components}, mismatches=${mismatches.length}${mismatches.length ? `, first=${mismatches.slice(0, 5).join(', ')}` : ''}`)
  assert.ok(components > 0)
  assert.deepEqual(mismatches, [])
})

test('real data: relic catalog and Relic Planner reward direction agree with DE reward truth', { skip: !haveRealData, timeout: 180000 }, async () => {
  const { harness } = await context()
  const mismatches = []
  for (const relic of getRelicCatalog(harness.exportsBundle)) {
    const relicName = relic.key
    for (const reward of relic.rewards || []) {
      const truth = deRelicTruth(canonical(reward.uniqueName), harness.exportsBundle) || []
      const fact = truth.find((row) => row.relic === relicName)
      if (!fact || ![fact.tier, ...(fact.tiers || [])].includes(String(reward.rarity || '').toUpperCase())) mismatches.push(`${relicName}: ${reward.name || reward.uniqueName}`)
    }
  }
  console.log(`P63 relic reward DE agreement: mismatches=${mismatches.length}${mismatches.length ? `, first=${mismatches.slice(0, 5).join(', ')}` : ''}`)
  assert.deepEqual(mismatches, [])
})

test('P63 guard: no presentation adds a new drop-index relic-row builder outside the explicit legacy adapter allowlist', () => {
  const allowed = new Set(['src/lib/relicSources.js', 'src/lib/acquisitionInfo.js', 'src/lib/acquisitionModel/buildItemAcquisition.js'])
  const offenders = []
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(full)
      else if (/\.(?:js|jsx)$/.test(entry.name)) {
        const relative = path.relative('.', full)
        if (!allowed.has(relative) && /dropIndex[\s\S]{0,220}type\s*===\s*['"]relic['"]/.test(fs.readFileSync(full, 'utf8'))) offenders.push(relative)
      }
    }
  }
  visit('src')
  assert.deepEqual(offenders, [])
})
