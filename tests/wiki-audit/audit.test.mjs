import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { auditItems, compareSources, extractWikiFacts, matchPage, summarizeAppSources } from '../../scripts/wiki-audit/audit.mjs'

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

test('fixture audit prints the two required golden outcomes', () => {
  const routes = {
    a2: { name: 'Axi A2 Intact', category: 'relics', sources: [{ type: 'unresearched', text: '' }] },
    a5: { name: 'Axi A5 Intact', category: 'relics', sources: [{ type: 'unresearched', text: '' }] },
    v8: { name: 'Axi V8 Intact', category: 'relics', sources: [{ type: 'unresearched', text: '' }] },
    m5: { name: 'Axi M5 Intact', category: 'relics', sources: [{ type: 'unresearched', text: '' }] },
    o1: { name: 'Neo O1 Intact', category: 'relics', sources: [{ type: 'unresearched', text: '' }] },
    a8: { name: 'Axi A8 Intact', category: 'relics', sources: [{ type: 'non-drop', text: 'Vaulted relic' }] },
  }
  const reports = auditItems({ appRoutes: routes, pages, redirects: {}, modules })
  for (const name of ['Axi A2 Intact', 'Axi A5 Intact', 'Axi V8 Intact', 'Axi M5 Intact', 'Neo O1 Intact']) {
    const item = reports.find((entry) => entry.name === name)
    assert.equal(item.status, 'app_missing', name)
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

test('real report golden cases pass when the generated report is present', { skip: !fs.existsSync(path.resolve('scripts/wiki-audit/out/audit-report.json')) }, () => {
  const report = JSON.parse(fs.readFileSync(path.resolve('scripts/wiki-audit/out/audit-report.json'), 'utf8'))
  for (const name of ['Axi A2 Intact', 'Axi A5 Intact', 'Axi V8 Intact', 'Axi M5 Intact', 'Neo O1 Intact']) {
    const item = report.items.find((entry) => entry.name === name)
    assert.equal(item.status, 'app_missing', name)
    assert.ok(item.wikiFacts.some((fact) => fact.kind === 'vendor' && fact.where === "Baro Ki'Teer"), name)
    console.log(`PASS real golden ${name}`)
  }
  const a8 = report.items.find((entry) => entry.name === 'Axi A8 Intact')
  assert.equal(a8.status, 'app_partial', 'Axi A8 Intact')
  assert.ok(a8.wikiFacts.some((fact) => fact.kind === 'vendor' && fact.where === "Baro Ki'Teer"), 'Axi A8 Intact Baro')
  console.log('PASS real golden Axi A8 Intact')
})
