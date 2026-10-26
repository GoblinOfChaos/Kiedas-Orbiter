import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json')
const vaultRelics = [
  ['/Lotus/Types/Game/Projections/T1VoidProjectionProteaIvaraVaultABronze', 'Lith B12 Relic'],
  ['/Lotus/Types/Game/Projections/T3VoidProjectionProteaIvaraVaultABronze', 'Neo P11 Relic'],
]
const tierEra = { 1: 'Lith', 2: 'Meso', 3: 'Neo', 4: 'Axi' }
const realHarness = loadRealHarness({ locale: 'en' })

async function modules() {
  const relicEntryPath = process.env.P60_RELIC_ENTRY_PATH || path.join(root, 'src/lib/relicEntry.js')
  const parserPath = process.env.P60_PARSER_PATH || path.join(root, 'src/lib/inventoryParser.js')
  return {
    relicEntry: await import(pathToFileURL(relicEntryPath).href),
    parser: await import(pathToFileURL(parserPath).href),
  }
}

function compactEntry(entry, uniqueName) {
  return {
    uniqueName,
    name: entry?.name,
    era: entry?.era,
    category: entry?.category,
    rewards: Array.isArray(entry?.relicRewards) ? entry.relicRewards.length : null,
  }
}

test('P60 real data: prints the two raw vault entries and their normalized identities', async () => {
  const { exportsBundle } = await realHarness
  const { relicEntry } = await modules()
  const trace = vaultRelics.map(([uniqueName]) => {
    const entry = exportsBundle.ExportRelics?.[uniqueName]
    assert.ok(entry, `missing real ExportRelics entry: ${uniqueName}`)
    const normalized = relicEntry.normalizeRelicEntry(entry, uniqueName)
    return {
      raw: compactEntry(entry, uniqueName),
      normalized: {
        era: normalized.era,
        category: normalized.category,
        quality: normalized.quality,
        rewardCount: normalized.inlineRewards?.length ?? 0,
      },
    }
  })
  console.log(`P60 relic trace ${JSON.stringify(trace)}`)
})

test('P60 real export: every standard-era relic has its DE era and letter-number code', async () => {
  const { exportsBundle } = await realHarness
  const { relicEntry } = await modules()
  const invalid = []
  const tierMismatches = []
  const identities = new Map()

  for (const [uniqueName, entry] of Object.entries(exportsBundle.ExportRelics || {})) {
    const pathEra = tierEra[/\/T([1-4])VoidProjection/i.exec(uniqueName)?.[1]]
    if (!pathEra) continue
    const normalized = relicEntry.normalizeRelicEntry(entry, uniqueName)
    if (normalized.era !== pathEra || !/^[A-Z]\d+$/.test(normalized.category || '')) {
      invalid.push(`${uniqueName}: ${normalized.era} ${normalized.category}`)
    }
    if (normalized.era !== pathEra) tierMismatches.push(`${uniqueName}: name=${normalized.era} path=${pathEra}`)
    const identity = `${normalized.era} ${normalized.category}`
    identities.set(identity, (identities.get(identity) || 0) + 1)
  }

  const duplicateFamilies = [...identities].filter(([, count]) => count > 4).map(([identity, count]) => `${identity}=${count}`)
  console.log(`P60 standard relic audit invalid=${invalid.length} tierMismatches=${tierMismatches.length} duplicateFamilies=${duplicateFamilies.length} samples=${JSON.stringify(invalid.slice(0, 5))}`)
  assert.deepEqual(invalid, [], `invalid standard relic identities: ${invalid.slice(0, 5).join('; ')}`)
  assert.deepEqual(tierMismatches, [], `path tier mismatches: ${tierMismatches.slice(0, 5).join('; ')}`)
})

test('P60 real export: the merged inventory reader preserves every standard relic code', async () => {
  const { exportsBundle, dict } = await realHarness
  const { relicEntry, parser } = await modules()
  const entries = Object.entries(exportsBundle.ExportRelics || {})
    .filter(([uniqueName]) => tierEra[/\/T([1-4])VoidProjection/i.exec(uniqueName)?.[1]])
  const genericMerged = entries.filter(([uniqueName, entry]) => entry?.category == null && exportsBundle.WI_Relics?.[uniqueName]?.category === 'Relics')
  const expectedNames = new Set(entries.map(([uniqueName, entry]) => {
    const normalized = relicEntry.normalizeRelicEntry(entry, uniqueName)
    return `${normalized.era} ${normalized.category} Relic`
  }))
  const parsed = parser.parseInventory({
    MiscItems: entries.map(([ItemType]) => ({ ItemType, ItemCount: 1 })),
  }, exportsBundle, dict, 'en', null)
  const actualNames = new Set((parsed.relics || []).map((item) => item.name))
  const missing = [...expectedNames].filter((name) => !actualNames.has(name))
  const invalid = (parsed.relics || [])
    .filter((item) => tierEra[/\/T([1-4])VoidProjection/i.exec(item.real_unique_name || '')?.[1]])
    .filter((item) => !/^[A-Z]\d+$/.test(item.code || ''))
    .map((item) => `${item.real_unique_name}: ${item.name} (${item.code})`)
  console.log(`P60 merged relic audit expected=${expectedNames.size} actual=${actualNames.size} genericMergedEntries=${genericMerged.length} genericMergedFamilies=${new Set(genericMerged.map(([uniqueName, entry]) => { const normalized = relicEntry.normalizeRelicEntry(entry, uniqueName); return `${normalized.era} ${normalized.category}` })).size} missing=${missing.length} invalid=${invalid.length} samples=${JSON.stringify([...missing, ...invalid].slice(0, 5))}`)
  assert.deepEqual(missing, [], `merged relic names missing from the catalog: ${missing.slice(0, 5).join('; ')}`)
  assert.deepEqual(invalid, [], `merged relic codes are invalid: ${invalid.slice(0, 5).join('; ')}`)
})

test('P60 real inventory: Protea-Ivara vault relics retain their DE names in recommendations', { skip: !fs.existsSync(inventoryFile) }, async () => {
  const { exportsBundle, dict } = await realHarness
  const { parser } = await modules()
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  // Which of these relics the real inventory holds changes as the player uses
  // them (Neo P11 was last held on 2026-10-17, Lith B12 returned on
  // 2026-10-23). Keep the user data as the basis of the test and add whichever
  // targets are missing so both DE entries exercise the identical
  // inventory-parser path whatever the live inventory holds.
  const inventoryForTargets = structuredClone(raw)
  inventoryForTargets.MiscItems = [...(inventoryForTargets.MiscItems || [])]
  for (const [targetUniqueName] of vaultRelics) {
    if (!inventoryForTargets.MiscItems.some((item) => item?.ItemType === targetUniqueName)) {
      inventoryForTargets.MiscItems.push({ ItemType: targetUniqueName, ItemCount: 1 })
    }
  }
  const parsed = parser.parseInventory(inventoryForTargets, exportsBundle, dict, 'en', null)
  const rawVaultItems = Object.values(raw).flatMap((value) => Array.isArray(value) ? value : [])
    .filter((item) => /ProteaIvaraVaultA/i.test(item?.ItemType || ''))
    .map((item) => ({ itemType: item.ItemType, itemCount: item.ItemCount }))
  const parsedVaultItems = parsed.relics.filter((item) => /(?:ProteaIvaraVaultA|Relics|B12|P11)/i.test(`${item.real_unique_name} ${item.name}`))
    .map((item) => ({ realUniqueName: item.real_unique_name, name: item.name, era: item.era, code: item.code }))
  console.log(`P60 inventory trace ${JSON.stringify({ rawVaultItems, parsedVaultItems })}`)

  for (const [uniqueName, expectedName] of vaultRelics) {
    const relic = parsed.relics.find((item) => item.real_unique_name === uniqueName)
      || parsed.relics.find((item) => item.name === expectedName)
    assert.ok(relic, `owned inventory is missing ${expectedName}`)
    assert.equal(relic.name, expectedName)
    assert.match(relic.code || '', /^[A-Z]\d+$/)
  }
})
