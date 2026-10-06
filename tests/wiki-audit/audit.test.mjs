import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { auditItems, compareSources, extractWikiFacts, findDefects, makeReviewSampleMarkdown, makeSummaryMarkdown, matchPage, summarizeAppSources } from '../../scripts/wiki-audit/audit.mjs'

const modules = {
  voidData: { RelicData: {
    'Axi A2': { Name: 'Axi A2', IsBaro: true, Drops: [{ Item: 'Lex Prime', Part: 'Receiver', Rarity: 'Common' }] },
    'Axi A5': { Name: 'Axi A5', IsBaro: true, Drops: [{ Item: 'Vasto Prime', Part: 'Barrel', Rarity: 'Common' }] },
    'Axi V8': { Name: 'Axi V8', IsBaro: true, Drops: [{ Item: 'Volt Prime', Part: 'Chassis Blueprint', Rarity: 'Uncommon' }] },
    'Axi M5': { Name: 'Axi M5', IsBaro: true, Drops: [{ Item: 'Magnus Prime', Part: 'Barrel', Rarity: 'Rare' }] },
    'Neo O1': { Name: 'Neo O1', IsBaro: true, Drops: [{ Item: 'Volt Prime', Part: 'Blueprint', Rarity: 'Common' }] },
  } },
  baroData: { Items: {
    'Axi A2 Relic': { Link: 'Axi A2', Name: 'Axi A2 Relic', OfferingDates: ['2026-01-01'] },
    'Axi A5 Relic': { Link: 'Axi A5', Name: 'Axi A5 Relic', OfferingDates: ['2026-01-01'] },
    'Axi V8 Relic': { Link: 'Axi V8', Name: 'Axi V8 Relic', OfferingDates: ['2026-01-01'] },
    'Axi M5 Relic': { Link: 'Axi M5', Name: 'Axi M5 Relic', OfferingDates: ['2026-01-01'] },
    'Neo O1 Relic': { Link: 'Neo O1', Name: 'Neo O1 Relic', OfferingDates: ['2026-01-01'] },
    'Axi A8 Relic': { Link: 'Axi A8', Name: 'Axi A8 Relic', OfferingDates: ['2026-01-01'] },
  } },
  dropData: { Rewards: { 'Test Mod': [{ Source: { Name: 'Test Mission' } }] } },
}

const pages = [
  { title: 'Axi A2', wikitext: '{{RelicPage}}' },
  { title: 'Axi A5', wikitext: '{{RelicPage}}' },
  { title: 'Axi V8', wikitext: '{{RelicPage}}' },
  { title: 'Axi M5', wikitext: '{{RelicPage}}' },
  { title: 'Neo O1', wikitext: '{{RelicPage}}' },
  { title: 'Axi A8', wikitext: '{{RelicPage}}' },
  { title: 'Test Mod', wikitext: '==Acquisition==\n* Obtained from the Test Mission.' },
  { title: 'Market Thing', wikitext: '==Sources==\n* Can be bought from the [[Market]].' },
]

test('matches relic refinements and extracts Void/Baro module facts', () => {
  const indexes = { pagesByTitle: new Map(pages.map((page) => [page.title.toLocaleLowerCase(), page])), redirectMap: new Map() }
  const match = matchPage({ name: 'Axi A2 Intact', category: 'relics' }, indexes)
  assert.equal(match.matchedBy, 'relic variant')
  const facts = extractWikiFacts(match.page, { name: 'Axi A2 Intact', category: 'relics' }, modules)
  assert.ok(facts.some((fact) => fact.kind === 'relic'))
  assert.ok(facts.some((fact) => fact.kind === 'vendor' && fact.where === "Baro Ki'Teer"))
})

test('matches documented blueprint and redirect variants', () => {
  const indexes = {
    pagesByTitle: new Map(pages.map((page) => [page.title.toLocaleLowerCase(), page])),
    redirectMap: new Map([['old thing', 'Test Mod']]),
  }
  assert.equal(matchPage({ name: 'Test Mod Blueprint', category: 'recipes' }, indexes).matchedBy, 'blueprint variant')
  assert.equal(matchPage({ name: 'Old Thing', category: 'mods' }, indexes).matchedBy, 'exact title; redirect')
})

test('compares clear wiki facts conservatively', () => {
  const appMissing = summarizeAppSources([{ type: 'unresearched', text: '' }])
  assert.equal(compareSources([{ kind: 'vendor', where: "Baro Ki'Teer", detail: 'sold', evidence: 'x' }], appMissing).status, 'app_missing')
  const appPartial = summarizeAppSources([{ type: 'non-drop', text: 'Vaulted relic' }])
  assert.equal(compareSources([{ kind: 'relic', where: 'Axi A8', detail: 'drops', evidence: 'x' }, { kind: 'vendor', where: "Baro Ki'Teer", detail: 'sold', evidence: 'x' }], appPartial).status, 'app_partial')
  assert.equal(compareSources([{ kind: 'drop', where: 'Mission', detail: 'reward', evidence: 'x' }], summarizeAppSources([{ type: 'mission' }])).status, 'agree')
})

test('fixture audit prints the six required golden outcomes', () => {
  const routes = {
    a2: { name: 'Axi A2 Intact', category: 'relics', sources: [{ type: 'verified-route', text: "Sold by Baro Ki'Teer.", source: "Warframe Wiki (https://wiki.warframe.com/w/Baro_Ki'Teer/TennoCon_Items)" }] },
    a5: { name: 'Axi A5 Intact', category: 'relics', sources: [{ type: 'verified-route', text: "Sold by Baro Ki'Teer.", source: "Warframe Wiki (https://wiki.warframe.com/w/Baro_Ki'Teer/TennoCon_Items)" }] },
    v8: { name: 'Axi V8 Intact', category: 'relics', sources: [{ type: 'verified-route', text: "Sold by Baro Ki'Teer.", source: "Warframe Wiki (https://wiki.warframe.com/w/Baro_Ki'Teer/TennoCon_Items)" }] },
    m5: { name: 'Axi M5 Intact', category: 'relics', sources: [{ type: 'verified-route', text: "Sold by Baro Ki'Teer.", source: "Warframe Wiki (https://wiki.warframe.com/w/Baro_Ki'Teer/TennoCon_Items)" }] },
    o1: { name: 'Neo O1 Intact', category: 'relics', sources: [{ type: 'verified-route', text: "Sold by Baro Ki'Teer.", source: "Warframe Wiki (https://wiki.warframe.com/w/Baro_Ki'Teer/TennoCon_Items)" }] },
    a8: { name: 'Axi A8 Intact', category: 'relics', sources: [{ type: 'non-drop', text: 'Vaulted relic' }] },
  }
  const reports = auditItems({ appRoutes: routes, pages, redirects: {}, modules })
  for (const name of ['Axi A2 Intact', 'Axi A5 Intact', 'Axi V8 Intact', 'Axi M5 Intact', 'Neo O1 Intact']) {
    const item = reports.find((entry) => entry.name === name)
    assert.equal(item.status, 'agree', name)
    assert.ok(item.wikiFacts.some((fact) => fact.kind === 'vendor' && fact.where === "Baro Ki'Teer"), name)
  }
  assert.equal(reports.find((item) => item.name === 'Axi A8 Intact').status, 'app_partial')
  console.log('PASS fixture golden Axi A2 Intact')
  console.log('PASS fixture golden Axi A5 Intact')
  console.log('PASS fixture golden Axi V8 Intact')
  console.log('PASS fixture golden Axi M5 Intact')
  console.log('PASS fixture golden Neo O1 Intact')
  console.log('PASS fixture golden Axi A8 Intact')
})

test('cosmetics are excluded by default and restored by the explicit flag', () => {
  const routes = {
    mod: { name: 'Test Mod', category: 'mods', sources: [{ type: 'mission', text: 'Dropped from a mission.' }] },
    cape: { name: 'Test Cape', category: 'cosmetics', sources: [{ type: 'vendor', text: 'Sold by Father.' }] },
  }
  const args = { appRoutes: routes, pages, redirects: {}, modules }
  assert.deepEqual(auditItems(args).map((item) => item.name), ['Test Mod'])
  assert.deepEqual(auditItems({ ...args, includeCosmetics: true }).map((item) => item.name), ['Test Mod', 'Test Cape'])

  const cosmeticDefect = {
    name: 'Test Cape', category: 'cosmetics', status: 'agree', evidence: [],
    wikiFacts: [{ kind: 'market', where: 'Market', detail: 'Can be purchased from the Market for 75.', evidence: 'wiki' }],
    appSources: { sources: [{ type: 'non-drop', text: 'Sold in the Market for Platinum.' }] },
  }
  assert.equal(findDefects([cosmeticDefect]).app_text_missing_number.length, 0)
  assert.ok(findDefects([cosmeticDefect], { includeCosmetics: true }).app_text_missing_number.length > 0)
})

test('summary and review sample exclude cosmetics by default', () => {
  const items = [
    { name: 'Test Mod', category: 'mods', status: 'agree', evidence: ['mod evidence'], wikiFacts: [], appSources: { kinds: [], sources: [] } },
    { name: 'Test Cape', category: 'cosmetics', status: 'agree', evidence: ['cosmetic evidence'], wikiFacts: [], appSources: { kinds: [], sources: [] } },
  ]
  const metadata = { excludedByDecision: { cosmetics: 1 }, defects: {} }
  const summary = makeSummaryMarkdown(items, metadata)
  const review = makeReviewSampleMarkdown(items, 7311, {})
  assert.match(summary, /^excluded by decision: cosmetics 1 items$/m)
  assert.doesNotMatch(summary, /Test Cape/)
  assert.doesNotMatch(review, /Test Cape/)
  assert.match(review, /Test Mod/)
})

test('real report golden cases pass when the generated report is present', { skip: !fs.existsSync(path.resolve('scripts/wiki-audit/out/audit-report.json')) }, () => {
  const report = JSON.parse(fs.readFileSync(path.resolve('scripts/wiki-audit/out/audit-report.json'), 'utf8'))
  for (const name of ['Axi A2 Intact', 'Axi A5 Intact', 'Axi V8 Intact', 'Axi M5 Intact', 'Neo O1 Intact']) {
    const item = report.items.find((entry) => entry.name === name)
    assert.equal(item.status, 'agree', name)
    assert.ok(item.wikiFacts.some((fact) => fact.kind === 'vendor' && fact.where === "Baro Ki'Teer"), name)
    console.log(`PASS real golden ${name}`)
  }
  const a8 = report.items.find((entry) => entry.name === 'Axi A8 Intact')
  assert.equal(a8.status, 'app_partial', 'Axi A8 Intact')
  assert.ok(a8.wikiFacts.some((fact) => fact.kind === 'vendor' && fact.where === "Baro Ki'Teer"), 'Axi A8 Intact Baro')
  console.log('PASS real golden Axi A8 Intact')
})

test('compares vendor and market entities instead of coarse kinds', () => {
  const fatherWiki = [{ kind: 'vendor', where: 'vendor or syndicate', detail: 'Bhisaj-Bal can be purchased for 20,000 from Father.', evidence: 'x' }]
  const fatherApp = summarizeAppSources([{ type: 'non-drop', text: 'Sold by Father.' }])
  assert.equal(compareSources(fatherWiki, fatherApp).status, 'agree')

  const marketWiki = [{ kind: 'market', where: 'Market', detail: 'Purchaseable from the Market for 105.', evidence: 'x' }]
  const marketApp = summarizeAppSources([{ type: 'market', text: 'Available in the Market.' }])
  assert.equal(compareSources(marketWiki, marketApp).status, 'agree')

  const questWiki = [{ kind: 'quest', where: 'quest or quest reward', detail: 'Awarded during The Teacher Quest.', evidence: 'x' }]
  const missionApp = summarizeAppSources([{ type: 'mission', text: 'Dropped from a mission.' }])
  assert.equal(compareSources(questWiki, missionApp).status, 'app_partial')
})

test('text-first comparison covers exact app sentences even when source kinds are other', () => {
  const routes = {
    ballistic: {
      name: 'Ballistic Bullseye', category: 'mods', sources: [
        { type: 'override', text: 'Can be acquired by attaining the rank of General under Steel Meridian' },
        { type: 'override', text: 'The rank of Exalted under Red Veil, and spending 25,000 Standing to purchase.' },
      ],
    },
    noctrul: {
      name: 'Noctrul', category: 'resources', sources: [
        { type: 'non-drop', text: 'Mined from blue mineral veins in Orb Vallis with the Sunpoint Plasma Drill.' },
        { type: 'non-drop', text: 'Dropped from storage containers found in Orb Vallis, yielding varying units.' },
      ],
    },
    cipher: {
      name: 'Orokin Cipher', category: 'resources', sources: [
        { type: 'non-drop', text: 'One Orokin Cipher (along with a random Corrupted Mod) is obtained by opening an Orokin Vault in an Orokin Derelict tileset mission on Deimos.' },
      ],
    },
  }
  const reports = auditItems({
    appRoutes: routes,
    pages: [
      { title: 'Ballistic Bullseye', wikitext: '==Acquisition==\n*Can be acquired by attaining the rank of General under Steel Meridian, or the rank of Exalted under Red Veil, and spending 25,000 to purchase.' },
      { title: 'Noctrul', wikitext: '==Acquisition==\n*Mined from blue mineral veins in Orb Vallis with the Sunpoint Plasma Drill.\n*Dropped from storage containers found in Orb Vallis, yielding varying units.' },
      { title: 'Orokin Cipher', wikitext: '==Acquisition==\n*One Orokin Cipher (along with a random Corrupted Mod) is obtained by opening an Orokin Vault in an Orokin Derelict tileset mission on Deimos.' },
    ],
    redirects: {},
    modules: { voidData: {}, baroData: {}, dropData: {} },
  })
  assert.deepEqual(Object.fromEntries(reports.map((report) => [report.name, report.status])), {
    'Ballistic Bullseye': 'agree',
    Noctrul: 'agree',
    'Orokin Cipher': 'agree',
  })
})

test('detects all three status-independent defect families with exact evidence', () => {
  const items = [
    {
      name: 'Holster Amp', category: 'mods', status: 'agree', evidence: [], wikiFacts: [{ kind: 'vendor', where: 'vendor', detail: 'Available for 20 creds from the Nightwave Cred Offerings store.', evidence: 'wiki' }],
      appSources: { sources: [{ type: 'non-drop', text: 'Found at Available for creds from the Nightwave Cred Offerings store..' }] },
    },
    {
      name: 'Harrow Suffragan Helmet', category: 'cosmetics', status: 'agree', evidence: [], wikiFacts: [{ kind: 'market', where: 'Market', detail: 'Can be purchased directly from the in-game Market for 75.', evidence: 'wiki' }],
      appSources: { sources: [{ type: 'non-drop', text: 'Its blueprint can be acquired as a Nightwave Cred Offering for on a rotational basis.' }, { type: 'non-drop', text: '.' }] },
    },
    {
      name: 'Mag Corpra Skin', category: 'cosmetics', status: 'app_partial', evidence: [], wikiFacts: [{ kind: 'vendor', where: 'vendor', detail: 'This item is available only to players whose Warframe accounts are linked with Steam, and will need to be purchased with Steam Wallet credit.', evidence: 'wiki' }],
      appSources: { sources: [{ type: 'non-drop', text: 'Sold in the in-game Market for 165 Platinum.' }] },
    },
    {
      name: 'Korumm', category: 'weapons', status: 'app_partial', evidence: [], wikiFacts: [{ kind: 'quest', where: 'quest', detail: "Korumm's blueprint is acquired from Narmer Bounties after completion of The New War.", evidence: 'wiki' }],
      appSources: { sources: [{ type: 'non-drop', text: 'Blueprint purchasable from Market for 180 Platinum.' }] },
    },
  ]
  const defects = findDefects(items, { includeCosmetics: true })
  assert.ok(defects.app_text_missing_number.some((entry) => entry.name === 'Holster Amp'))
  assert.ok(defects.app_text_missing_number.some((entry) => entry.name === 'Harrow Suffragan Helmet'))
  assert.ok(defects.app_conflict_steam_vs_market.some((entry) => entry.name === 'Mag Corpra Skin'))
  assert.ok(defects.app_conflict_route.some((entry) => entry.name === 'Korumm'))
  const korumm = defects.app_conflict_route.find((entry) => entry.name === 'Korumm')
  assert.match(JSON.stringify(korumm), /Narmer Bounties/)
  assert.match(JSON.stringify(korumm), /Market/)
})

test('classifies Stubba Market text before the generic vendor rule', () => {
  const wikiFacts = [{ kind: 'market', where: 'Market', detail: 'Blueprint purchasable from Market for 190 Platinum.', evidence: 'x' }]
  const appSummary = summarizeAppSources([{ type: 'non-drop', text: 'Blueprint purchasable from Market for 190 Platinum.' }])
  assert.equal(appSummary.sources[0].kind, 'vendor-market')
  assert.equal(compareSources(wikiFacts, appSummary).status, 'agree')
})

test('ignores relic reward contents for relic acquisition comparison', () => {
  const wikiFacts = [{ kind: 'relic', where: 'Axi A2', detail: 'Relic drops: Lex Prime Receiver', evidence: 'x' }]
  const refined = summarizeAppSources([{ type: 'relic', relic: 'Axi A2', text: 'Refined from Axi A2 using Void Traces.' }])
  assert.equal(compareSources(wikiFacts, refined, { category: 'relics' }).status, 'agree')
})

test('filters template and infobox noise while retaining acquisition sentences', () => {
  const page = { title: 'Noise Test', wikitext: '==Acquisition==\n{{Faction|Orokin}}\n* QuestTopNav\n* Awarded by completing the Teacher Quest.' }
  const facts = extractWikiFacts(page, { name: 'Noise Test', category: 'mods' }, { voidData: {}, baroData: {}, dropData: {} })
  assert.ok(facts.some((fact) => /Teacher Quest/.test(fact.detail)))
  assert.ok(!facts.some((fact) => /Orokin|QuestTopNav/.test(`${fact.where} ${fact.detail} ${fact.evidence}`)))
})

test('drops historical acquisition sentences but keeps current routes and current unavailability', () => {
  const page = {
    title: 'History Noise',
    wikitext: [
      '==Acquisition==',
      '* Available for 20 creds from the Nightwave Cred Offerings store on a rotational basis.',
      '* Beginning with Nightwave Nora\'s Mix, it was added to the Nightwave Cred Offerings.',
      '* The item was added to the Cred Offerings.',
      '* The items were added to the Cred Offerings.',
      '* The item was removed from the Cred Offerings.',
      '* The item was previously awarded by Nightwave.',
      '* The item was originally awarded by Nightwave.',
      '* The item used to be awarded by Nightwave.',
      '* The item is no longer awarded by Nightwave.',
      '* The item was available prior to Update 30.',
      '* The item was available before Update 30.',
      '* The item was added as of Update 30.',
      '* This item is no longer obtainable.',
      '==History==',
      '* Rewarded from a mission.',
      '==Patch History==',
      '* 43.5 Rewarded from a mission.',
      '* Rewarded from a mission.',
    ].join('\n'),
  }
  const facts = extractWikiFacts(page, { name: 'History Noise', category: 'mods' }, { voidData: {}, baroData: {}, dropData: {} })
  assert.deepEqual(facts.map((fact) => [fact.kind, fact.detail]), [
    ['vendor', '* Available for 20 creds from the Nightwave Cred Offerings store on a rotational basis.'],
    ['not_obtainable', '* This item is no longer obtainable.'],
  ])

  const report = auditItems({
    appRoutes: { mod: { name: 'Nightwave Mod', category: 'mods', sources: [{ type: 'non-drop', text: 'Available for 20 creds from the Nightwave Cred Offerings store on a rotational basis.' }] } },
    pages: [{ title: 'Nightwave Mod', wikitext: '==Acquisition==\n* Available for 20 creds from the Nightwave Cred Offerings store on a rotational basis.\n* Beginning with Nightwave Nora\'s Mix, it was added to the Nightwave Cred Offerings.' }],
    redirects: {},
    modules: { voidData: {}, baroData: {}, dropData: {} },
  })
  assert.equal(report[0].status, 'agree')
  assert.equal(findDefects(report).app_conflict_route.length, 0)
})

test('real drawer proof: non-Prime blueprint drop rows exist and the drawers now render them through the shared Blueprint box', { skip: !fs.existsSync(path.join(process.env.HOME || '', '.local/share/kiedas-orbiter-preview/data/export')) }, async () => {
  const { loadRealHarness } = await import('../../scripts/lib/real-data-harness.mjs')
  const { buildDropIndex } = await import('../../src/lib/dropsParser.js')
  const { buildBlueprintSourceRows, buildRelicRarityIndex } = await import('../../src/lib/relicSources.js')
  const harness = await loadRealHarness({ locale: 'en' })
  const { buildAllAcquisitionIndexes } = await import('../../src/lib/acquisitionInfo.js')
  const indexes = await buildAllAcquisitionIndexes(harness.exportsBundle)
  const dropIndex = buildDropIndex(harness.exportsBundle)
  const rarityIndex = buildRelicRarityIndex(harness.exportsBundle)
  const names = ['Korumm', 'Nepheri', 'Verdilac', 'Quartakk', 'Stubba']
  const expectedCounts = { Korumm: 4, Nepheri: 4, Verdilac: 4, Quartakk: 6, Stubba: 6 }
  const entries = new Map()
  for (const table of ['ExportWeapons', 'ExportWarframes', 'ExportSentinels']) {
    for (const [key, entry] of Object.entries(harness.exportsBundle[table] || {})) {
      const displayName = harness.dict?.[entry.name] || harness.dict?.[`/${entry.name}`] || entry.name
      if (names.includes(displayName)) entries.set(displayName, { ...entry, uniqueName: entry.uniqueName || key })
    }
  }
  for (const name of names) {
    const entry = entries.get(name)
    assert.ok(entry, name)
    const recipe = indexes.recipeResultIndex.get(entry.uniqueName)
    const rows = buildBlueprintSourceRows(name, recipe, dropIndex, [], rarityIndex)
    assert.equal(rows.length, expectedCounts[name], name)
    assert.ok(rows.every((row) => row.source === 'drops.wf'), name)
    assert.ok(rows.some((row) => row.type === 'bounty'), name)
    assert.equal(/\bPrime\b/i.test(name), false, name)
  }
  const acquisitionDrawer = fs.readFileSync(path.resolve('src/components/AcquisitionDrawer.jsx'), 'utf8')
  const previewDrawer = fs.readFileSync(path.resolve('src/preview/acquisition/PreviewAcquisitionDrawer.jsx'), 'utf8')
  // P55 (2026-10-06) removed the Prime-only gate: both drawers render the Blueprint box through the shared
  // component for every item with a recipe, so these non-Prime rows are now shown (see tests/ui/p55-blueprint-box.test.mjs).
  assert.doesNotMatch(acquisitionDrawer, /const blueprintSources = recipe && isPrimeItem/)
  assert.doesNotMatch(previewDrawer, /const blueprintSources = recipe && isPrimeItem/)
  assert.match(acquisitionDrawer, /BlueprintAcquisitionBox/)
  assert.match(previewDrawer, /BlueprintAcquisitionBox/)
})

test('classifies enemy drop-table pages as not an item source', () => {
  const reports = auditItems({
    appRoutes: { moa: { name: 'Moa', category: 'companions', sources: [{ type: 'craft', text: 'Configured at Legs.' }] } },
    pages: [{ title: 'Moa', wikitext: 'Moa is an enemy.' }],
    redirects: {},
    modules: { voidData: {}, baroData: {}, dropData: { Enemies: { MOA: [{ Source: { Name: 'Moa' } }] } } },
  })
  assert.equal(reports[0].status, 'not_an_item_source')
  assert.match(reports[0].evidence.join(' '), /enemy|drop/i)
})

test('matches weapon and resource parts to their parent page', () => {
  const partNames = ['Aksondol Receiver', 'Koumei Chassis/Systems', 'Vesper 77 Receiver', 'Nikana Prime Hilt', 'Morgha Stock', 'Vinquibus Barrel', 'Grandmother Token Ornament']
  const parentPages = partNames.map((name) => {
    const parent = name
      .replace(/\s+(?:Chassis\/Systems|Receiver|Hilt|Stock|Barrel|Ornament)$/i, '')
      .trim()
    return { title: parent, wikitext: '==Acquisition==\n* Obtained from a mission.' }
  })
  const routes = Object.fromEntries(partNames.map((name, index) => [String(index), { name, category: 'weapons', sources: [{ type: 'mission', text: 'Dropped from a mission.' }] }]))
  const reports = auditItems({ appRoutes: routes, pages: parentPages, redirects: {}, modules: { voidData: {}, baroData: {}, dropData: {} } })
  for (const report of reports) assert.match(report.matchedBy, /^part of /, report.name)
})

test('matches cosmetics listed on shared catalog pages', () => {
  const reports = auditItems({
    appRoutes: { cape: { name: 'Test Cape', category: 'cosmetics', sources: [{ type: 'vendor', text: 'Sold by Father.' }] } },
    pages: [{ title: 'Syandana', wikitext: '==List==\n{| class="wikitable"\n| [[Test Cape]] || Sold by Father\n|}' }],
    redirects: {},
    modules: { voidData: {}, baroData: {}, dropData: {} },
    includeCosmetics: true,
  })
  assert.equal(reports[0].matchedBy, 'listed on Syandana')
  assert.notEqual(reports[0].status, 'no_wiki_page')
})
