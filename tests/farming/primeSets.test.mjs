import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { applyMerges } from '../../scripts/de-export/apply-merges.mjs'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

async function realParsed(raw = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prime-sets-real-'))
  try {
    const merged = await applyMerges({
      dataDir: process.env.PREVIEW_DATA_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data',
      out: root,
      cacheDir: process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export',
    })
    const harness = await loadRealHarness({ exportDir: merged.exportDir, dataDir: root, locale: 'en' })
    const { parseInventory } = await import('../../src/lib/inventoryParser.js')
    return parseInventory(raw, harness.exportsBundle, harness.dict, 'en', null)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

test('prime set ownership is finished-item ownership, not blueprint or part ownership', async () => {
  const { isPrimeSetOwned } = await import('../../src/lib/primeSets.js')
  assert.equal(isPrimeSetOwned({ owned: false }, { parts: [{ isBlueprint: true, quantity: 1 }] }), false)
  assert.equal(isPrimeSetOwned({ owned: false }, { parts: [{ quantity: 1 }] }), false)
  assert.equal(isPrimeSetOwned({ owned: true }, { parts: [] }), true)
  assert.equal(isPrimeSetOwned({ owned: false, quantity: 1 }, { parts: [] }), true)
})

test('real parse keeps a blueprint-held Nyx Prime set unowned while showing the blueprint', async () => {
  const { isPrimeSetOwned } = await import('../../src/lib/primeSets.js')
  const parsed = await realParsed({
    Recipes: [{ ItemType: '/Lotus/Types/Recipes/WarframeRecipes/NyxPrimeBlueprint', ItemCount: 1 }],
  })
  const set = parsed.primeSets['Nyx Prime']
  assert.ok(set, 'Nyx Prime set must exist')
  assert.equal(set.parts.find((part) => part.isBlueprint)?.quantity, 1)
  assert.equal(set.parts.find((part) => part.isBlueprint)?.owned, true)
  const parent = [
    ...(parsed.warframes || []), ...(parsed.primary || []), ...(parsed.secondary || []),
    ...(parsed.melee || []), ...(parsed.sentinels || []), ...(parsed.beasts || []),
  ].find((item) => item.name === set.name) || {}
  assert.equal(isPrimeSetOwned(parent, set), false)
})

test('real Prime dual-weapon recipes include both base weapons with need 2 and no resources', async () => {
  const parsed = await realParsed()
  const expected = {
    'Aklex Prime': 'Lex Prime',
    'Akvasto Prime': 'Vasto Prime',
    'Akbronco Prime': 'Bronco Prime',
    'Akmagnus Prime': 'Magnus Prime',
  }
  for (const [setName, weaponName] of Object.entries(expected)) {
    const set = parsed.primeSets[setName]
    assert.ok(set, `${setName} set must exist`)
    const base = set.parts.find((part) => part.name === weaponName)
    assert.ok(base, `${setName} must list ${weaponName}`)
    assert.equal(base.need, 2)
    assert.equal(base.quantity, 0)
    assert.equal(set.parts.some((part) => /Orokin Cell/i.test(part.name)), false)
  }
  for (const setName of ['Akbolto Prime', 'Akjagara Prime']) {
    const set = parsed.primeSets[setName]
    assert.ok(set)
    assert.equal(set.parts.some((part) => /Prime Lex|Prime Vasto|Prime Magnus|Prime Bronco/.test(part.name)), false)
  }
})

test('real dual-weapon part ownership uses the held base weapon quantity', async () => {
  const parsed = await realParsed({
    Pistols: [{ ItemType: '/Lotus/Weapons/Tenno/Pistols/PrimeLex/PrimeLex', ItemCount: 1 }],
  })
  const part = parsed.primeSets['Aklex Prime']?.parts.find((item) => item.name === 'Lex Prime')
  assert.ok(part)
  assert.equal(part.need, 2)
  assert.equal(part.quantity, 1)
  assert.equal(part.owned, true)
})

test('real Prime Set bundle images survive with dual-weapon image resolution', async () => {
  const parsed = await realParsed()
  for (const setName of ['Titan Extractor Prime', 'Distilling Extractor Prime']) {
    assert.ok(parsed.primeSets[setName]?.image, `${setName} set must have an image`)
    const blueprint = parsed.primeSets[setName]?.parts.find((part) => part.name === `${setName} Blueprint`)
    assert.ok(blueprint?.image, `${setName} Blueprint must have an image`)
  }
  const lex = parsed.primeSets['Aklex Prime']?.parts.find((part) => part.name === 'Lex Prime')
  assert.ok(lex?.image, 'Aklex Prime must list Lex Prime with an image')
})
