import test from 'node:test'
import assert from 'node:assert/strict'
import { buildImageMaps, buildRuntimeExportBundle } from '../../src/lib/exportBundle.js'
import { HARNESS_SUPPLEMENT_FILES, makeHarness } from '../../scripts/lib/real-data-harness.mjs'
import { checkCraftableRecipes, checkMatrixItem, primePartsVisible } from '../../scripts/item-completeness.mjs'
import { goldenHarness, frame } from './fixtures.mjs'

test('shared loader maps are identical for the harness and runtime builder', () => {
  const harness = goldenHarness()
  const runtime = buildRuntimeExportBundle({ exports: harness.exportsBundle })
  assert.deepEqual(buildImageMaps(runtime), harness.EI ? { EI: harness.EI, nameToImage: harness.nameToImage, uniqueNameToName: harness.uniqueNameToName } : buildImageMaps(harness.exportsBundle))
})

// Regression guard for the loader-parity bug: MonitoringContext.jsx and
// MirroredMonitoringProvider.jsx each read these exact exportData keys to
// build their acquisition indexes (see buildAllAcquisitionIndexes), but the
// headless completeness harness previously loaded only 7 of them - the
// other 9 wiki-sourced keys were silently undefined, so a completeness run
// never exercised the acquisition routes real screens use. If this list
// drops one of these keys again, this test must fail, not the harness
// silently going quiet on that data again.
test('the headless harness loads every acquisition supplement key the runtime providers read', () => {
  const loadedKeys = new Set(HARNESS_SUPPLEMENT_FILES.map(([, key]) => key));
  for (const key of [
    'WikiSigilAcquisition', 'WikiVendorAcquisition', 'WikiTennoGenAcquisition', 'WikiBaroAcquisition',
    'WikiBlueprintAcquisition', 'WikiResearchAcquisition', 'WikiResourceAcquisition',
    'WikiPageAcquisition', 'WikiAcquisitionStatus',
  ]) {
    assert.ok(loadedKeys.has(key), `harness must load a supplement file into exportData.${key}`);
  }
  assert.ok(loadedKeys.has('AcquisitionOverrides'), 'harness must load acquisition overrides for drawer parity');
})

// P4-style self-test: prove buildAllAcquisitionIndexes actually reflects
// harness-loaded supplement data end to end, not just that the key exists.
// Real screens (Mods.jsx, Relics.jsx, etc.) trust wikiBaroIndex to carry
// whatever the harness put on exportData.WikiBaroAcquisition; if that stops
// flowing through, this must go red exactly like removing the file would.
test('buildAllAcquisitionIndexes reflects harness-loaded wiki supplement data', async () => {
  // Dynamic import, not static: acquisitionInfo.js statically imports a few
  // JSON files, and real-data-harness.mjs's custom JSON-loader hook only
  // applies to modules loaded after it registers - a static top-level import
  // here would pull acquisitionInfo.js into the same load-phase graph as
  // real-data-harness.mjs (imported above via item-completeness.mjs) before
  // the hook exists, breaking those JSON imports outside a Vite bundle.
  const { buildAllAcquisitionIndexes } = await import('../../src/lib/acquisitionInfo.js')
  const withData = buildAllAcquisitionIndexes({ WikiBaroAcquisition: { 'Test Baro Item': { location: 'Baro Ki\'Teer' } } });
  assert.equal(withData.wikiBaroIndex?.has('test baro item'), true);

  const withoutData = buildAllAcquisitionIndexes({});
  assert.equal(withoutData.wikiBaroIndex?.has('test baro item') ?? false, false);
})

test('removing a recipe turns the Foundry row red', async () => {
  const harness = goldenHarness()
  const parsed = null
  const good = await checkMatrixItem({ harness, subject: { uniqueName: frame, name: 'Test Frame', category: 'warframes' }, parsed })
  const broken = goldenHarness({ broken: true })
  const bad = await checkMatrixItem({ harness: broken, subject: { uniqueName: frame, name: 'Test Frame', category: 'warframes' }, parsed })
  assert.equal(good.screens.Foundry, true)
  assert.equal(bad.screens.Foundry, false)
})

test('removing a cosmetic supplement image turns the image check red', () => {
  const base = goldenHarness()
  const addition = '/Lotus/Upgrades/Skins/TestSkin'
  const withSupplement = buildRuntimeExportBundle({
    exports: base.exportsBundle,
    cosmeticAdditions: { [addition]: { name: 'Test Skin', icon: '/Lotus/Art/TestFrame.png' } },
  })
  const withoutSupplement = buildRuntimeExportBundle({ exports: base.exportsBundle })
  assert.ok(withSupplement.ExportCustoms[addition])
  assert.equal(withoutSupplement.ExportCustoms?.[addition], undefined)
})

test('Prime Parts lists every Prime set, owned or not', () => {
  assert.equal(primePartsVisible({}, 'Citrine'), false)
  assert.equal(primePartsVisible({ Citrine: { parts: [{ quantity: 0 }] } }, 'Citrine'), true)
  assert.equal(primePartsVisible({ Citrine: { parts: [{ quantity: 1 }] } }, 'Citrine'), true)
})

test('a synthetic item with drops and a recipe keeps drawer crafting requirements', async () => {
  // Dynamic import: the harness (imported above) registers the extensionless .js resolver;
  // a static import here would be resolved before that hook runs.
  const { buildRecipeResultIndex, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const harness = goldenHarness()
  const result = getAcquisitionInfo(
    frame,
    'Test Frame',
    { [frame]: [{ type: 'drop', location: 'Test mission', chance: 1, source: 'synthetic' }] },
    {},
    buildRecipeResultIndex(harness.exportsBundle),
    ...Array(18).fill(null),
  )
  assert.deepEqual(result.recipe.ingredients.map(({ itemType, count }) => [itemType, count]), [[frame.replace('Powersuits/TestFrame/TestFrame', 'Types/Recipes/WarframeRecipes/TestFrameChassisComponent'), 1]])
  assert.equal(result.sources[0].location, 'Test mission')
})

test('an override-only item resolves through the matrix acquisition path', async () => {
  const uniqueName = '/Lotus/Weapons/Tenno/Bows/DuelistBow/DuelistBow'
  const harness = buildRuntimeExportBundle({
    exports: {
      dict: {},
      ExportImages: { '/Lotus/Art/Nunchasa.png': { contentHash: 'nunchasa' } },
      ExportWeapons: { [uniqueName]: { name: 'Nunchasa', icon: '/Lotus/Art/Nunchasa.png' } },
      ExportRecipes: {},
      AcquisitionOverrides: { components: { [uniqueName]: 'Purchased from Cephalon Melica.' } },
      AcquisitionItems: [],
    },
  })
  const result = await checkMatrixItem({
    harness: makeHarness(harness),
    subject: { uniqueName, name: 'Nunchasa', category: 'weapons' },
  })
  assert.equal(result.acquisition.result.sources[0].type, 'override')
  assert.equal(result.acquisition.honestEmpty, false)
})

test('all parsed craftable recipes retain matching drawer ingredients', async () => {
  const result = await checkCraftableRecipes({ harness: goldenHarness() })
  assert.equal(result.failed.length, 0)
  assert.ok(result.total > 0)
})

// Regression guard: the harness once injected verified-routes.json itself while the
// real app never loaded it (a build-time `typeof import.meta.glob` check was false at
// runtime), so every test passed while 430+ researched routes were missing in the UI.
// Every file the harness injects must be loaded by the app through a path the
// app really takes: a plain import in src/, or a read_file_bytes call in the providers.
test('every data file the harness injects is really loaded by the app', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
  const sources = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(js|jsx)$/.test(entry.name)) sources.push(fs.readFileSync(full, 'utf8'))
    }
  }
  walk(path.join(root, 'src'))
  const all = sources.join('\n')
  for (const [file] of HARNESS_SUPPLEMENT_FILES) {
    const viaImport = new RegExp("^import [^\\n]*from '[^']*" + file.replace(/[.*+?^$()|[\]\\]/g, '\\$&') + "'", 'm').test(all)
    const viaRead = all.includes("relative: 'data/assets/data/" + file + "'")
    assert.ok(viaImport || viaRead, 'the harness injects ' + file + ' but the app never loads it (no plain import, no read_file_bytes)')
  }
})
