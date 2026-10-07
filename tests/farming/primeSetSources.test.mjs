import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { sortSourcesByChanceInRotations } from '../../src/lib/chanceSort.js'
import { buildRelicRarityIndex, buildRelicTooltipRows } from '../../src/lib/relicSources.js'
import { getCachedPrimeSetPartSources } from '../../src/lib/primeSetParts.js'
import fsSync from 'node:fs'
import pathSync from 'node:path'

async function realDropIndex() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prime-set-sources-'))
  try {
    const merged = await applyMerges({
      dataDir: process.env.PREVIEW_DATA_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data',
      out: root,
      cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export',
    })
    const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root, locale: 'en' })
    return buildDropIndex(harness.exportsBundle)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

function oldInline(part, dropIndex) {
  const partNorm = part.unique_name ? part.unique_name.replace('/StoreItems/', '/') : ''
  const raw = dropIndex?.[partNorm] || dropIndex?.['display:' + (part.name || '').toLowerCase().trim()] || []
  const seen = {}
  const key = (source) => source.type === 'relic'
    ? 'r:' + (source.relicName || source.relicManifest)
    : source.type === 'enemy' ? 'e:' + source.enemyName : 'o:' + source.type
  return sortSourcesByChanceInRotations(raw)
    .filter((source) => { const k = key(source); if (seen[k]) return false; seen[k] = true; return true })
}

test('real Prime Set part sources match the old output and cache the second lookup', async () => {
  const dropIndex = await realDropIndex()
  const { getCachedPrimeSetPartSources } = await import('../../src/lib/primeSetParts.js')
  const parts = [
    { name: 'Nyx Prime Blueprint', unique_name: '/Lotus/Types/Recipes/WarframeRecipes/NyxPrimeBlueprint' },
    { name: 'Garuda Prime Systems', unique_name: '/Lotus/Types/Recipes/WarframeRecipes/GarudaPrimeSystemsBlueprint' },
    { name: 'Akbolto Prime Barrel', unique_name: '/Lotus/Weapons/Tenno/Pistols/AkboltoPrime/AkboltoPrimeBarrel' },
  ]
  const relicPart = Object.entries(dropIndex).find(([, sources]) => sources.some((source) => source.type === 'relic'))?.[0]
  assert.ok(relicPart, 'real drop index must contain a relic source')
  parts.push({ name: 'real relic-source part', unique_name: relicPart })

  let sortCalls = 0
  const sorter = (sources) => {
    sortCalls += 1
    return sortSourcesByChanceInRotations(sources)
  }
  for (const part of parts) {
    assert.deepEqual(
      getCachedPrimeSetPartSources(part, dropIndex, sorter),
      oldInline(part, dropIndex),
      part.name,
    )
  }
  const callsAfterFirstPass = sortCalls
  for (const part of parts) getCachedPrimeSetPartSources(part, dropIndex, sorter)
  assert.equal(sortCalls, callsAfterFirstPass, 'cached lookups must not sort again')
  assert.ok(callsAfterFirstPass >= 3)
})

test('Prime Set cards use a memoized component with stable source lookup ownership', () => {
  const cardSource = fsSync.readFileSync(pathSync.resolve('src/components/PrimeSetCard.jsx'), 'utf8')
  const inventorySource = fsSync.readFileSync(pathSync.resolve('src/screens/Inventory.jsx'), 'utf8')
  assert.match(cardSource, /export default memo\(PrimeSetCard\)/)
  assert.match(cardSource, /buildRelicTooltipRows\(partSources/)
  assert.match(inventorySource, /import PrimeSetCard from ['"]\.\.\/components\/PrimeSetCard['"];/)
  assert.match(inventorySource, /buildRelicRarityIndex\(exportData\)/)
  assert.match(inventorySource, /ACQUISITION_MODEL_TOOLTIP_RELICS/)
  assert.match(inventorySource, /buildTooltipRelicRows\(item\.unique_name, item\.name, tooltipRelicContext, \{ t \}\)/)
  assert.match(inventorySource, /<PrimeSetCard[\s\S]+key=\{set\.setPath \|\| set\.unique_name \|\| set\.name\}/)
})

async function realPrimeSetTooltipContext() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prime-set-tooltip-'))
  try {
    const merged = await applyMerges({
      dataDir: process.env.PREVIEW_DATA_DIR || DEFAULT_DATA_DIR,
      out: root,
      cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export',
    })
    const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root, locale: 'en' })
    const { parseInventory } = await import('../../src/lib/inventoryParser.js')
    return {
      parsed: parseInventory({}, harness.exportsBundle, harness.dict, 'en', null),
      dropIndex: buildDropIndex(harness.exportsBundle),
      rarityIndex: buildRelicRarityIndex(harness.exportsBundle),
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

const i18nLabel = (data) => (key) => data.ui?.[key] ?? data[key] ?? key

test('real Prime Set tooltip rows use DE tiers and translated labels for every DE Prime part', async () => {
  const { parsed, dropIndex, rarityIndex } = await realPrimeSetTooltipContext()
  const en = JSON.parse(fsSync.readFileSync(pathSync.resolve('src/lib/i18n/en.json'), 'utf8'))
  const de = JSON.parse(fsSync.readFileSync(pathSync.resolve('src/lib/i18n/de.json'), 'utf8'))
  const canonical = (value) => value?.replaceAll('/StoreItems/', '/').toLowerCase() || ''
  const expectedTier = (row, itemType) => rarityIndex.get(`${row.source.relicName.toLowerCase()}|${canonical(itemType)}`)
  let checkedParts = 0
  let checkedRows = 0
  const snapshots = []

  for (const set of Object.values(parsed.primeSets || {})) {
    for (const part of set.parts || []) {
      checkedParts += 1
      const sources = getCachedPrimeSetPartSources(part, dropIndex)
      const rows = buildRelicTooltipRows(sources, { rarityIndex, itemType: part.unique_name, t: i18nLabel(en) })
      const germanRows = buildRelicTooltipRows(sources, { rarityIndex, itemType: part.unique_name, t: i18nLabel(de) })
      assert.equal(germanRows.length, rows.length, `${set.name} ${part.name} locale changed row count`)
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]
        const expected = expectedTier(row, part.unique_name)
        checkedRows += 1
        assert.equal(row.source.rarity, expected, `${set.name} ${part.name} ${row.source.relicName}`)
        assert.doesNotMatch(row.label, /\(\)/, `${set.name} ${part.name} has an empty tier`)
        assert.doesNotMatch(row.label, /ui\.relic_rarity\./, `${set.name} ${part.name} leaked a raw i18n key`)
        if (snapshots.length < 10) snapshots.push(`${part.name}: ${row.label}`)
        if (expected) {
          assert.equal(germanRows[i].source.rarity, expected)
          assert.doesNotMatch(germanRows[i].label, /\b(Common|Uncommon|Rare)\b/)
        }
      }
    }
  }

  assert.ok(checkedParts > 0, 'DE Prime catalog has no parts')
  assert.ok(checkedRows > 0, 'DE Prime catalog has no relic rows')
  console.log(JSON.stringify({ checkedParts, checkedRows, snapshots }))
})

test('Nidus Prime Chassis is Rare and a Nyx Prime part gets a DE-backed tooltip row', async () => {
  const { parsed, dropIndex, rarityIndex } = await realPrimeSetTooltipContext()
  const rowsFor = (setName, partPattern) => {
    const set = parsed.primeSets[setName]
    const part = set?.parts.find((entry) => partPattern.test(entry.name))
    assert.ok(part, `${setName} part is present`)
    return buildRelicTooltipRows(
      getCachedPrimeSetPartSources(part, dropIndex),
      { rarityIndex, itemType: part.unique_name, t: i18nLabel(JSON.parse(fsSync.readFileSync(pathSync.resolve('src/lib/i18n/en.json'), 'utf8'))) },
    )
  }
  const nidus = rowsFor('Nidus Prime', /Chassis/)
  const nyx = rowsFor('Nyx Prime', /Chassis|Systems|Neuroptics/)
  assert.equal(nidus.find((row) => row.source.relicName === 'Axi N12')?.source.rarity, 'RARE')
  assert.ok(nyx.length > 0, 'Nyx Prime must have at least one relic tooltip row')
  assert.ok(nyx.every((row) => row.source.rarity === undefined || ['COMMON', 'UNCOMMON', 'RARE'].includes(row.source.rarity)))
})
