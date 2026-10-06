import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { generate } from '../../scripts/wiki-audit/make-verified-routes.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const dataDir = path.join(root, 'src-tauri/data/assets/data')
const groups = ['resources', 'cosmetics', 'other']
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

function groupData() {
  return Object.fromEntries(groups.map((group) => [group, readJson(path.join(dataDir, `verified-routes.${group}.json`))]))
}

test('wiki-store generated routes have verbatim, revision-pinned source quotes and no duplicate keys', () => {
  const all = new Map()
  const generated = []
  for (const group of groups) {
    for (const [uniqueName, entry] of Object.entries(groupData()[group])) {
      assert.equal(all.has(uniqueName), false, `duplicate uniqueName across groups: ${uniqueName}`)
      all.set(uniqueName, group)
      assert.ok(entry.name, uniqueName)
      assert.ok(Array.isArray(entry.routes) && entry.routes.length > 0, uniqueName)
      for (const route of entry.routes) {
        assert.ok(['drop', 'vendor', 'market', 'quest', 'event', 'crafting', 'reward', 'not_obtainable'].includes(route.kind), `${uniqueName}: ${route.kind}`)
        assert.ok(route.text && route.text.length <= 240, uniqueName)
        assert.ok(route.place, uniqueName)
        assert.ok(route.source?.archive && route.source?.page && route.source?.url && route.source?.quote, uniqueName)
        if (route.source.archive === 'wiki_store') generated.push({ uniqueName, route })
      }
    }
  }

  const pages = new Map()
  for (const line of fs.readFileSync('/home/jedwards/kiedas-orbiter/wiki_store/pages.jsonl', 'utf8').split('\n')) {
    if (!line) continue
    const page = JSON.parse(line)
    pages.set(`${page.title}\0${page.revid}`, page)
  }
  assert.ok(generated.length > 0)
  assert.equal(Object.values(groupData().cosmetics).flatMap((entry) => entry.routes || []).filter((route) => route.source.archive === 'wiki_store').length, 0)
  for (const { uniqueName, route } of generated) {
    const page = pages.get(`${route.source.page}\0${route.source.revid}`)
    assert.ok(page, `${uniqueName}: source revision is not in pages.jsonl`)
    assert.ok(page.wikitext.includes(route.source.quote), `${uniqueName}: quote is not verbatim at pinned revision`)
    assert.equal(route.source.url, `https://wiki.warframe.com/w/${route.source.page.replaceAll(' ', '_')}`, uniqueName)
  }
})

test('the route generator excludes cosmetic categories', async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wiki-routes-'))
  try {
    const auditFile = path.join(tempDir, 'audit-report.json')
    const pagesFile = path.join(tempDir, 'pages.jsonl')
    const fact = 'This item can be purchased from Father for credits.'
    await fs.promises.writeFile(auditFile, JSON.stringify({ items: [
      { uniqueName: '/Test/Cosmetic', name: 'Test Cosmetic', category: 'cosmetics', status: 'app_missing', appSources: { unresearched: true }, wikiFacts: [{ kind: 'vendor', detail: fact, evidence: fact }] },
      { uniqueName: '/Test/Resource', name: 'Test Resource', category: 'resources', status: 'app_missing', appSources: { unresearched: true }, evidence: ['Wiki page: Test Resource'], wikiFacts: [{ kind: 'vendor', detail: fact, evidence: fact }] },
    ] }))
    await fs.promises.writeFile(pagesFile, `${JSON.stringify({ title: 'Test Resource', revid: 1, wikitext: `==Acquisition==\n* ${fact}` })}\n`)
    const result = generate({ auditFile, pagesFile, write: false })
    assert.deepEqual(result.selected.map((item) => item.name), ['Test Resource'])
    assert.deepEqual(result.generated.map((item) => item.name), ['Test Resource'])
    assert.equal(result.generated.some((item) => item.category === 'cosmetics'), false)
    assert.ok(result.groups.resources['/Test/Resource'])
    assert.equal(result.groups.cosmetics['/Test/Cosmetic'], undefined)
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  }
})

test('the requested named routes and A8 Baro coverage are present', () => {
  const entries = Object.values(groupData()).flatMap((data) => Object.values(data))
  const names = new Set(entries.map((entry) => entry.name))
  for (const name of ["Brood's Oversurge", 'Augmented Sonar', 'Prototype Shock Coils', 'Lua Unairu Lens', 'Moonflesh']) {
    assert.equal(names.has(name), true, name)
  }
})

test('real data: Baro relics and selected generated routes render through getAcquisitionInfo', { skip: !fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export')) }, async () => {
  const harness = await loadRealHarness({ locale: 'en' })
  const { buildDropIndex } = await import('../../src/lib/dropsParser.js')
  const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const acquire = (uniqueName, name) => getAcquisitionInfo(
    uniqueName, name, dropIndex, harness.exportsBundle.AcquisitionItems || {}, indexes.recipeResultIndex,
    indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex, indexes.wikiSigilIndex,
    indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex, indexes.exportVendorIndex,
    indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex, indexes.wikiBlueprintIndex,
    indexes.wikiResearchIndex, indexes.relicStateIndex, indexes.wikiResourceIndex,
    indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex, indexes.exaltedWeaponIndex,
    indexes.exportComponentIndex,
  )

  const baroRelics = [
    ['/Lotus/Types/Game/Projections/T4VoidProjectionPBronze', 'Axi A2 Intact'],
    ['/Lotus/Types/Game/Projections/T4VoidProjectionMagNovaVaultBBronze', 'Axi A5 Intact'],
    ['/Lotus/Types/Game/Projections/T4VoidProjectionVoltOdonataPrimeBronze', 'Axi V8 Intact'],
    ['/Lotus/Types/Game/Projections/T4VoidProjectionBaroAkmagnusPrimeBronze', 'Axi M5 Intact'],
    ['/Lotus/Types/Game/Projections/T3VoidProjectionVoltOdonataPrimeBronze', 'Neo O1 Intact'],
    ['/test/AxiA8', 'Axi A8 Relic'],
  ]
  for (const [uniqueName, name] of baroRelics) {
    const result = acquire(uniqueName, name)
    assert.ok(result.sources.some((source) => /Baro Ki'Teer/i.test(`${source.text || ''} ${source.place || ''} ${source.syndicateName || ''}`)), `${name}: ${JSON.stringify(result.sources)}`)
  }
  const selected = [
    ["/Lotus/Powersuits/Oraxia/BroodAugmentCard", "Brood's Oversurge"],
    ['/Lotus/Upgrades/Focus/WardLensLua', 'Lua Unairu Lens'],
    ['/Lotus/Powersuits/Banshee/SonarPvPAugmentCard', 'Augmented Sonar'],
    ['/Lotus/Upgrades/Mods/Pistol/Event/Nightwave/NightwaveLasGooPistolAugmentMod', 'Prototype Shock Coils'],
    ['/Lotus/Types/Gameplay/Events/RoadToTauEvent/RoadToTauEventResource', 'Moonflesh'],
  ]
  for (const [uniqueName, name] of selected) {
    const result = acquire(uniqueName, name)
    assert.ok(result.sources.some((source) => source.type === 'verified-route' || /Prime Resurgence|Prime Access|Market|Lua Disruption|Cephalon Suda|Baro/i.test(source.text)), `${name}: ${JSON.stringify(result.sources)}`)
  }
  for (const [uniqueName, name] of [
    ['/Lotus/Upgrades/Skins/Scarves/PrimeCitrineSyandana', 'Sphatika Prime Syandana'],
    ['/Lotus/Upgrades/Skins/MeleeDangles/FireMeleeDangleRefresh', 'Pyra Opula Sugatra'],
  ]) {
    const result = acquire(uniqueName, name)
    assert.equal(result.sources.some((source) => source.reviewSource?.archive === 'wiki_store'), false, `${name}: ${JSON.stringify(result.sources)}`)
  }
})
