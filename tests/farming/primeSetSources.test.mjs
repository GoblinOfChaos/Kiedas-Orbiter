import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { sortSourcesByChanceInRotations } from '../../src/lib/chanceSort.js'
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
    const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root })
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
  assert.match(inventorySource, /import PrimeSetCard from ['"]\.\.\/components\/PrimeSetCard['"];/)
  assert.match(inventorySource, /<PrimeSetCard[\s\S]+key=\{set\.setPath \|\| set\.unique_name \|\| set\.name\}/)
})
