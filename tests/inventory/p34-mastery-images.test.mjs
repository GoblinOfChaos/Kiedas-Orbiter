import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const inventoryFile = path.join(DEFAULT_DATA_DIR, 'user/inventory.json')
const haveRealData = fs.existsSync(inventoryFile) && fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))

let parserPromise
async function getParser() {
  if (!parserPromise) {
    const parserPath = process.env.P34_PARSER_PATH || path.join(root, 'src/lib/inventoryParser.js')
    parserPromise = import(pathToFileURL(parserPath).href)
  }
  return parserPromise
}

function allPartLikeItems(inventory) {
  return [
    ...(inventory.parts ?? []),
    ...(inventory.prime_parts ?? []),
    ...(inventory.components ?? []),
  ]
}

function manifestEntries(exportsBundle) {
  return exportsBundle.ExportManifest?.Manifest || exportsBundle.ExportManifest || []
}

test('real data: recipe-linked part mastery mirrors its finished item', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const { parseInventory } = await getParser()
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const parsed = parseInventory(raw, exportsBundle, dict, 'en', null)
  const byUniqueName = new Map((parsed.all ?? []).map((item) => [item.unique_name, item]))
  const mismatches = allPartLikeItems(parsed)
    .map((part) => ({ part, parent: byUniqueName.get(part.parent_unique_name) }))
    .filter(({ part, parent }) => parent && part.mastered !== parent.mastered)
    .map(({ part, parent }) => `${part.name}=${part.mastered}, parent ${parent.name}=${parent.mastered}`)

  assert.deepEqual(mismatches, [], `recipe-linked part mastery mismatches: ${mismatches.join('; ')}`)
})

test('fixture: injected Atlas mastery removes its unmastered + unowned parts', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const { parseInventory } = await getParser()
  const live = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const baseline = parseInventory(live, exportsBundle, dict, 'en', null)
  const atlas = (baseline.warframes ?? []).find((item) => item.name === 'Atlas')
  assert.ok(atlas, 'real export must contain the Atlas Warframe definition')
  const atlasParts = (baseline.parts ?? []).filter((part) => part.parent_unique_name === atlas.unique_name)
  assert.ok(atlasParts.some((part) => /Blueprint|Neuropt|Chassis/i.test(part.name)), 'Atlas must have recipe-linked parts')

  const fixture = structuredClone(live)
  fixture.XPInfo = (fixture.XPInfo ?? []).filter((entry) => entry.ItemType !== atlas.unique_name)
  fixture.XPInfo.push({ ItemType: atlas.unique_name, XP: 900000 })
  const parsed = parseInventory(fixture, exportsBundle, dict, 'en', null)
  const parts = (parsed.parts ?? []).filter((part) => part.parent_unique_name === atlas.unique_name)
  assert.ok(parts.length > 0, 'fixture must retain Atlas parts')
  assert.ok(parts.every((part) => part.mastered === true), 'Atlas parts should inherit injected parent mastery')

  // This is the exact Inventory All tab condition for the two negative filters
  // in Inventory.jsx (~650-672), applied to the fixture rather than live state.
  const unmasteredUnowned = parts.filter((part) => !part.owned && !part.mastered)
  assert.deepEqual(unmasteredUnowned, [], 'mastered Atlas parts must not match Unmastered + Unowned')
})

test('real data: every parsed inventory entry has a resolved image', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const { parseInventory } = await getParser()
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const parsed = parseInventory(raw, exportsBundle, dict, 'en', null)
  const allowlist = new Map([
    // Keep this explicit and reasoned. It should remain empty after the
    // verified DE manifest and browse.wf fallbacks resolve the current gaps.
  ])
  const unresolved = (parsed.all ?? []).filter((item) => {
    if (allowlist.has(item.name)) return false
    return !item.image || item.image.startsWith('/Lotus/')
  }).map((item) => item.name)

  assert.deepEqual(unresolved, [], `inventory entries without resolved images: ${unresolved.join(', ')}`)
})

test('real data: known new Warframe and veiled Riven images use verified sources', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const { parseInventory } = await getParser()
  const raw = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'))
  const entries = manifestEntries(exportsBundle)
  const manifestByUniqueName = new Map(entries.map((entry) => [entry.uniqueName, entry.textureLocation]))
  const veiledUniqueNames = [
    '/Lotus/Upgrades/Mods/Randomized/RawRifleRandomMod',
    '/Lotus/Upgrades/Mods/Randomized/RawMeleeRandomMod',
    '/Lotus/Upgrades/Mods/Randomized/RawPistolRandomMod',
    '/Lotus/Upgrades/Mods/Randomized/RawShotgunRandomMod',
    '/Lotus/Upgrades/Mods/Randomized/RawModularMeleeRandomMod',
    '/Lotus/Upgrades/Mods/Randomized/RawModularPistolRandomMod',
  ]
  const fixture = structuredClone(raw)
  fixture.RawUpgrades = [
    ...(fixture.RawUpgrades ?? []),
    ...veiledUniqueNames.map((ItemType) => ({ ItemType, ItemCount: 1 })),
  ]
  const parsed = parseInventory(fixture, exportsBundle, dict, 'en', null)
  const checkedNames = ['Cyte-09', 'Jade', 'Cyte-09 Blueprint', 'Jade Blueprint']
  for (const name of checkedNames) {
    const item = parsed.all.find((candidate) => candidate.name === name)
    assert.ok(item, `catalog must contain ${name}`)
    const texture = manifestByUniqueName.get(item.unique_name)
    if (texture) {
      const separator = texture.lastIndexOf('!')
      assert.equal(item.image, `asset-cache://content.warframe.com/PublicExport${texture.slice(0, separator)}!${texture.slice(separator + 1)}`)
    } else {
      assert.match(item.image ?? '', /^asset-cache:\/\/browse\.wf\/Lotus\//)
    }
  }
  const veiled = parsed.rivens.filter((item) => item.veiled && veiledUniqueNames.includes(item.unique_name))
  assert.deepEqual(
    new Set(veiled.map((item) => item.unique_name)),
    new Set(veiledUniqueNames),
    'the injected DE veiled-Riven identities must be represented',
  )
  for (const item of veiled) {
    const texture = manifestByUniqueName.get(item.unique_name)
    assert.ok(texture, `DE manifest must provide the veiled Riven image: ${item.unique_name}`)
    const separator = texture.lastIndexOf('!')
    assert.equal(item.image, `asset-cache://content.warframe.com/PublicExport${texture.slice(0, separator)}!${texture.slice(separator + 1)}`)
  }
})
