import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs'

const overrides = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../../src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'))
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'))
const FLAWED = /\/Upgrades\/Mods\/(?:[^/]+\/)*Beginner\//
const AMMO_DRUM = '/Lotus/Upgrades/Mods/Rifle/Beginner/WeaponAmmoMaxModBeginner'

test('real data: every export Beginner mod is its own Flawed catalog row sold at Cressa Tal in Iron Wake, not a normal-mod drop', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { parseInventory } = await import('../../src/lib/inventoryParser.js')
  const { buildDropIndex } = await import('../../src/lib/dropsParser.js')
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const upgrades = harness.exportsBundle.ExportUpgrades
  const exportPaths = Object.keys(upgrades).filter((un) => FLAWED.test(un))
  assert.ok(exportPaths.length > 0)

  const catalog = parseInventory({}, harness.exportsBundle, harness.dict, 'en', null).mods_catalog
  const byPath = new Map(catalog.map((mod) => [mod.unique_name, mod]))
  const indexes = await buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  for (const un of exportPaths) {
    const mod = byPath.get(un)
    assert.ok(mod, `${un} missing from the mods catalog`)
    assert.match(mod.name, /^Flawed /, un)
    const normal = catalog.find((other) => other.name === mod.name.replace(/^Flawed /, ''))
    if (normal) assert.notEqual(normal.unique_name, un)
    const info = getAcquisitionInfo(
      un, mod.name, dropIndex, overrides,
      indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
      indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
      indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
      indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
      indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
      indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
    )
    assert.ok(info.sources.every((source) => source.type === 'non-drop'), `${un} has drop-table sources`)
    const text = info.sources.map((source) => source.text).join(' ')
    if (un === AMMO_DRUM) {
      assert.match(text, /April Fools/)
    } else {
      assert.equal(info.sources.length, 1, un)
      assert.match(text, /^Mod storage box near Cressa Tal, Iron Wake, [\d,]+ credits$/, un)
      assert.doesNotMatch(text, /Listed by|export/i, un)
    }
  }
})
