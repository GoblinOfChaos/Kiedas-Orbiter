#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULTS = {
  wikiDir: '/home/jedwards/kiedas-orbiter/wiki_store',
  moduleDir: '/home/jedwards/kiedas-orbiter/wiki_module_json',
  appRoutes: path.join(REPO, 'scripts/wiki-audit/out/app-routes.json'),
  outDir: path.join(REPO, 'scripts/wiki-audit/out'),
}

const SECTION_NAMES = new Set([
  'acquisition', 'sources', 'source', 'location', 'drop locations', 'where to find',
])
const REFINEMENTS = ['Exceptional', 'Flawless', 'Radiant', 'Intact']
const PART_SUFFIXES = [
  'Blueprint', 'Chassis', 'Neuroptics', 'Systems', 'Harness', 'Wings', 'Barrel',
  'Receiver', 'Blade', 'Handle', 'Link', 'Stock', 'Boot', 'Grip', 'String', 'Guard',
  'Lower Limb', 'Upper Limb', 'Head', 'Carapace', 'Cerebrum', 'Pouch', 'Disc',
  'Stars', 'String', 'Fuselage', 'Engines', 'Engine', 'Sabot', 'Ornament', 'Handle',
]

const clean = (value) => String(value ?? '')
  .replace(/<!--[^]*?-->/g, ' ')
  .replace(/<ref[^>]*>[^]*?<\/ref>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
  .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
  .replace(/\{\{\s*[^|{}]+\s*(?:\|[^{}]*)?\}\}/g, (match) => {
    const inner = match.slice(2, -2)
    const parts = inner.split('|').map((part) => part.trim())
    return parts.slice(1).filter((part) => !/^\w+\s*=/.test(part)).join(' ') || parts[0]
  })
  .replace(/'{2,}/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const shortEvidence = (value) => clean(value).replace(/\s+/g, ' ').slice(0, 360)
const normalize = (value) => clean(value).replaceAll('_', ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
const baseRelicName = (name) => clean(name).replace(/\s+(?:Intact|Exceptional|Flawless|Radiant)$/i, '').replace(/\s+Relic$/i, '').trim()

function candidateNames(name, category) {
  const original = clean(name).trim()
  const candidates = [{ value: original, matchedBy: 'exact title' }]
  const add = (value, matchedBy) => {
    if (!value || candidates.some((entry) => normalize(entry.value) === normalize(value))) return
    candidates.push({ value, matchedBy })
  }
  if (category === 'relics' || /^(?:Lith|Meso|Neo|Axi|Requiem|Vanguard)\s+/i.test(original)) {
    const base = baseRelicName(original)
    add(base, 'relic variant')
    add(`${base} Relic`, 'relic variant')
  }
  if (/\sBlueprint$/i.test(original)) add(original.replace(/\sBlueprint$/i, ''), 'blueprint variant')
  if (category === 'recipes' || /Prime/i.test(original)) {
    let prime = original.replace(/\sBlueprint$/i, '')
    for (const suffix of PART_SUFFIXES) prime = prime.replace(new RegExp(`\\s${suffix}$`, 'i'), '')
    if (/Prime/i.test(prime)) add(prime, 'prime-part variant')
  }
  let part = original.replace(/\sBlueprint$/i, '')
  for (const suffix of PART_SUFFIXES) part = part.replace(new RegExp(`\\s${suffix}$`, 'i'), '')
  if (part !== original && /Prime/i.test(part)) add(part, 'prime-part variant')
  return candidates
}

function buildPageIndex(pages, redirects) {
  const pagesByTitle = new Map()
  for (const page of pages) pagesByTitle.set(normalize(page.title), page)
  const redirectMap = new Map(Object.entries(redirects || {}).map(([from, to]) => [normalize(from), String(to)]))
  return { pagesByTitle, redirectMap }
}

export function matchPage(item, indexes) {
  const candidates = candidateNames(item.name, item.category)
  for (const candidate of candidates) {
    const page = indexes.pagesByTitle.get(normalize(candidate.value))
    if (page) return { page, matchedBy: candidate.matchedBy }
  }
  for (const candidate of candidates) {
    const redirectTarget = indexes.redirectMap.get(normalize(candidate.value))
    if (!redirectTarget) continue
    const targetTitle = redirectTarget.split('#')[0].trim()
    const page = indexes.pagesByTitle.get(normalize(targetTitle))
    if (page) return { page, matchedBy: `${candidate.matchedBy}; redirect` }
  }
  return null
}

function classifyText(text) {
  const value = clean(text)
  const lower = value.toLocaleLowerCase()
  if (!value) return null
  if (/baro\s+ki.?teer|void trader|\bbaro\b|sold by|vendor|syndicate|faction|purchase|purchasable|offering/i.test(value)) {
    return { kind: 'vendor', where: /baro\s+ki.?teer|void trader|\bbaro\b/i.test(value) ? "Baro Ki'Teer" : 'vendor or syndicate', detail: value }
  }
  if (/\bmarket\b|platinum|prime access/i.test(lower)) return { kind: 'market', where: 'Market', detail: value }
  if (/\bquest\b|quest reward|completing|completion of|upon completion/i.test(lower)) return { kind: 'quest', where: 'quest or quest reward', detail: value }
  if (/event|tennocon|calendar|season|operation|nightwave/i.test(lower)) return { kind: 'event', where: 'event', detail: value }
  if (/craft|crafted|manufactur|blueprint|dojo|clan|foundry/i.test(lower)) return { kind: 'craft', where: 'crafting or blueprint', detail: value }
  if (/drop|reward|mission|enemy|container|bounty|survival|defense|excavation|interception|rotation|obtained from|acquired from|found in|killed/i.test(lower)) {
    return { kind: 'drop', where: 'drop table or mission', detail: value }
  }
  return { kind: 'other', where: 'wiki page', detail: value }
}

function parseSections(wikitext) {
  const lines = String(wikitext || '').split(/\r?\n/)
  const sections = []
  let current = null
  for (const line of lines) {
    const heading = line.match(/^(={1,6})\s*(.*?)\s*\1\s*$/)
    if (heading) {
      const title = clean(heading[2]).toLocaleLowerCase()
      current = { title, lines: [], level: heading[1].length }
      sections.push(current)
    } else if (current) current.lines.push(line)
  }
  return sections
}

function templateBlocks(wikitext) {
  const blocks = []
  const source = String(wikitext || '')
  const re = /\{\{\s*([^|{}\n]+)([^{}]*?)\}\}/g
  for (const match of source.matchAll(re)) blocks.push({ name: clean(match[1]), body: match[2], raw: match[0] })
  return blocks
}

function addFact(facts, fact, seen) {
  if (!fact) return
  const normalized = `${fact.kind}|${normalize(fact.where)}|${normalize(fact.detail)}`
  if (seen.has(normalized)) return
  seen.add(normalized)
  facts.push({ kind: fact.kind, where: fact.where || 'wiki page', detail: fact.detail || '', evidence: shortEvidence(fact.evidence || fact.detail) })
}

function moduleFactIndexes(modules) {
  const indexes = { relic: new Map(), baro: new Map(), drop: new Map() }
  const add = (map, key, value) => { if (key) map.set(normalize(key), value) }
  const voidData = modules.voidData || {}
  for (const [key, value] of Object.entries(voidData.RelicData || {})) {
    add(indexes.relic, key, value)
    add(indexes.relic, value?.Name, value)
  }
  const baroData = modules.baroData || {}
  for (const section of ['ExtraItems', 'AlwaysAvailable', 'Items']) {
    for (const [key, value] of Object.entries(baroData[section] || {})) {
      add(indexes.baro, key, { ...value, _key: key, _section: section })
      add(indexes.baro, value?.Name, { ...value, _key: key, _section: section })
      add(indexes.baro, value?.Link, { ...value, _key: key, _section: section })
    }
  }
  const dropData = modules.dropData || {}
  for (const section of ['Rewards', 'Containers', 'Missions', 'Enemies']) {
    for (const [key, value] of Object.entries(dropData[section] || {})) add(indexes.drop, key, { section, key, value })
  }
  return indexes
}

export function extractWikiFacts(page, item, modules, prebuiltModuleIndexes = null) {
  const facts = []
  const seen = new Set()
  const wikitext = page?.wikitext || ''
  for (const section of parseSections(wikitext)) {
    if (!SECTION_NAMES.has(section.title)) continue
    for (const line of section.lines) {
      const fact = classifyText(line)
      if (fact) addFact(facts, { ...fact, evidence: line }, seen)
    }
  }
  for (const block of templateBlocks(wikitext)) {
    const lowerName = block.name.toLocaleLowerCase()
    const relevant = /baro|vendor|source|acquisition|location|drop|reward|market|syndicate|faction|quest/.test(lowerName)
    const params = block.body.split('|').map((part) => part.trim()).filter(Boolean)
    for (const param of params) {
      if (!/=/.test(param)) continue
      const [key, ...rest] = param.split('=')
      if (!/source|acquisition|location|vendor|obtain|drop|reward|sold|purchase/i.test(key)) continue
      const fact = classifyText(rest.join('='))
      addFact(facts, { ...(fact || { kind: 'other', where: clean(key), detail: clean(rest.join('=')) }), evidence: block.raw }, seen)
    }
    if (relevant && !params.some((param) => /=/.test(param))) {
      const fact = classifyText(`${block.name} ${block.body}`)
      addFact(facts, { ...(fact || { kind: 'other', where: block.name, detail: clean(block.body) }), evidence: block.raw }, seen)
    }
  }
  const moduleIndexes = prebuiltModuleIndexes || moduleFactIndexes(modules)
  const base = baseRelicName(item.name)
  const relic = moduleIndexes.relic.get(normalize(base)) || moduleIndexes.relic.get(normalize(`${base} Relic`))
  if (relic) {
    const drops = (relic.Drops || []).map((drop) => `${drop.Item} ${drop.Part} (${drop.Rarity})`).join('; ')
    addFact(facts, { kind: 'relic', where: base, detail: `Relic drops: ${drops}`, evidence: `Module:Void/data RelicData[${base}] Drops` }, seen)
    if (relic.IsBaro === true) addFact(facts, { kind: 'vendor', where: "Baro Ki'Teer", detail: `${base} is marked IsBaro in Module:Void/data`, evidence: `RelicData[${base}].IsBaro = true` }, seen)
  }
  const baro = moduleIndexes.baro.get(normalize(item.name)) || moduleIndexes.baro.get(normalize(`${base} Relic`)) || moduleIndexes.baro.get(normalize(base))
  if (baro) {
    const dates = ['OfferingDates', 'PcOfferingDates', 'ConsoleOfferingDates', 'TennoConOfferingDates'].flatMap((key) => Array.isArray(baro[key]) ? baro[key] : [])
    addFact(facts, { kind: 'vendor', where: "Baro Ki'Teer", detail: `${baro._key || item.name} is listed in Module:Baro/data${dates.length ? ` with ${dates.length} offering dates` : ''}`, evidence: `Module:Baro/data ${baro._section || 'Items'}[${baro._key || item.name}]` }, seen)
  }
  const drop = moduleIndexes.drop.get(normalize(item.name)) || moduleIndexes.drop.get(normalize(item.name.replace(/\sBlueprint$/i, '')))
  if (drop) {
    const entries = Array.isArray(drop.value) ? drop.value : []
    const labels = entries.slice(0, 4).map((entry) => clean(entry?.Source?.Name || entry?.Source?.Type || entry?.[2] || entry?.[1])).filter(Boolean)
    addFact(facts, { kind: 'drop', where: `${drop.section}: ${drop.key}`, detail: labels.length ? `Listed in ${labels.join('; ')}` : `Listed in Module:DropTables/data ${drop.section}`, evidence: `Module:DropTables/data ${drop.section}[${drop.key}]` }, seen)
  }
  return facts
}

function sourceKind(source) {
  const type = String(source?.type || '').toLocaleLowerCase()
  const text = String(source?.text || '').toLocaleLowerCase()
  if (type === 'unresearched') return null
  if (type === 'relic') return 'relic'
  if (type === 'syndicate' || /vendor|baro|syndicate|faction/.test(text)) return 'vendor'
  if (type === 'market' || /market|platinum/.test(text)) return 'market'
  if (type === 'quest' || /quest/.test(text)) return 'quest'
  if (type === 'craft' || /craft|dojo|foundry|blueprint/.test(text)) return 'craft'
  if (['drop', 'enemy', 'mission', 'bounty', 'transient', 'key', 'avatar'].includes(type)) return 'drop'
  if (type === 'event' || /event|tennocon|nightwave|calendar/.test(text)) return 'event'
  return 'other'
}

export function summarizeAppSources(sources = []) {
  const meaningful = sources.filter((source) => sourceKind(source))
  return {
    count: sources.length,
    unresearched: sources.length > 0 && meaningful.length === 0,
    kinds: [...new Set(meaningful.map(sourceKind))].sort(),
    sources: sources.map((source) => ({ ...source, kind: sourceKind(source) })),
  }
}

export function compareSources(wikiFacts, appSummary) {
  const clearWikiKinds = [...new Set(wikiFacts.filter((fact) => ['vendor', 'drop', 'relic', 'quest', 'market', 'craft', 'event'].includes(fact.kind)).map((fact) => fact.kind))]
  const appKinds = appSummary.kinds
  if (!wikiFacts.length && !appKinds.length) return { status: 'unclassified', evidence: ['No structured acquisition fact was parsed from either source.'] }
  if (!wikiFacts.length) return { status: 'app_extra', evidence: [`App kinds: ${appKinds.join(', ') || 'none'}`] }
  if (!clearWikiKinds.length) return appKinds.length ? { status: 'app_extra', evidence: ['Matched wiki page had no clear vendor/drop/relic/quest/market/craft/event fact.'] } : { status: 'unclassified', evidence: ['Matched wiki page contained only unclassified acquisition text.'] }
  if (!appKinds.length) return { status: 'app_missing', evidence: [`Wiki kinds: ${clearWikiKinds.join(', ')}`] }
  const missingKinds = clearWikiKinds.filter((kind) => !appKinds.includes(kind))
  const extraKinds = appKinds.filter((kind) => !clearWikiKinds.includes(kind))
  if (missingKinds.length) return { status: 'app_partial', evidence: [`Wiki kinds missing from app: ${missingKinds.join(', ')}`, `App kinds: ${appKinds.join(', ')}`] }
  if (extraKinds.length) return { status: 'app_extra', evidence: [`App kinds not represented by wiki facts: ${extraKinds.join(', ')}`] }
  return { status: 'agree', evidence: [`Kinds: ${clearWikiKinds.join(', ')}`] }
}

function appItemSource(item) {
  return Array.isArray(item?.sources) ? item.sources : []
}

export function auditItems({ appRoutes, pages, redirects, modules }) {
  const indexes = buildPageIndex(pages, redirects)
  const moduleIndexes = moduleFactIndexes(modules)
  const reports = []
  for (const [uniqueName, item] of Object.entries(appRoutes)) {
    const match = matchPage(item, indexes)
    const appSources = summarizeAppSources(appItemSource(item))
    if (!match) {
      reports.push({ uniqueName, name: item.name, category: item.category, matchedBy: null, wikiFacts: [], appSources, status: 'no_wiki_page', evidence: ['No exact title, redirect, or documented name variant matched a wiki page.'] })
      continue
    }
    const wikiFacts = extractWikiFacts(match.page, item, modules, moduleIndexes)
    const comparison = compareSources(wikiFacts, appSources)
    reports.push({ uniqueName, name: item.name, category: item.category, matchedBy: match.matchedBy, wikiFacts, appSources, status: comparison.status, evidence: [`Wiki page: ${match.page.title}`, ...comparison.evidence] })
  }
  return reports
}

function countBy(items, key) {
  const out = {}
  for (const item of items) out[item[key]] = (out[item[key]] || 0) + 1
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
}

function patternFor(item) {
  const wikiKinds = [...new Set(item.wikiFacts.filter((fact) => ['vendor', 'drop', 'relic', 'quest', 'market', 'craft', 'event'].includes(fact.kind)).map((fact) => fact.kind))].sort().join('+') || 'none'
  const appKinds = item.appSources.kinds.join('+') || 'none'
  return `${item.status}: wiki=${wikiKinds}; app=${appKinds}`
}

export function makeSummaryMarkdown(items, metadata = {}) {
  const statusCounts = countBy(items, 'status')
  const categoryCounts = countBy(items, 'category')
  const patterns = new Map()
  for (const item of items) {
    const pattern = patternFor(item)
    const current = patterns.get(pattern) || { pattern, count: 0, examples: [] }
    current.count++
    if (current.examples.length < 3) current.examples.push(item.name)
    patterns.set(pattern, current)
  }
  const topPatterns = [...patterns.values()].sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern)).slice(0, 50)
  const missingByCategory = {}
  for (const item of items.filter((entry) => entry.status === 'app_missing')) (missingByCategory[item.category] ||= []).push(item.name)
  const lines = [
    '# Wiki acquisition audit', '',
    `Generated from ${metadata.appRoutes || 'app-routes.json'} and the complete local wiki store.`,
    `Items audited: **${items.length}**. No categories were skipped.`, '',
    '## Input completeness', '',
    `- Wiki pages: ${metadata.pageCount ?? 'unknown'}`,
    `- Wiki redirects: ${metadata.redirectCount ?? 'unknown'}`,
    `- Module JSON files used: ${metadata.moduleFiles?.join(', ') || 'none'}`,
    '- Network access: not used', '',
    '## Counts by status', '',
    ...Object.entries(statusCounts).map(([key, value]) => `- ${key}: ${value}`), '',
    '## Counts by category', '',
    ...Object.entries(categoryCounts).map(([key, value]) => `- ${key}: ${value}`), '',
    '## Selected examples', '',
    ...(metadata.selectedExamples?.agree || []).map((entry) => `- agree: **${entry.name}** — ${entry.why}`),
    ...(metadata.selectedExamples?.no_wiki_page || []).map((entry) => `- no_wiki_page: **${entry.name}** — ${entry.why}`), '',
    '## Top 50 gap patterns', '',
    '| Count | Pattern | Examples |', '| ---: | --- | --- |',
    ...topPatterns.map((entry) => `| ${entry.count} | ${entry.pattern.replaceAll('|', '\\|')} | ${entry.examples.join(', ').replaceAll('|', '\\|')} |`), '',
    '## app_missing items by category', '',
  ]
  for (const [category, names] of Object.entries(missingByCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`### ${category}`, '', ...names.map((name) => `- ${name}`), '')
  }
  lines.push('## Three detailed examples per pattern', '')
  for (const pattern of topPatterns) {
    lines.push(`### ${pattern.pattern}`, '')
    for (const name of pattern.examples) {
      const item = items.find((entry) => entry.name === name && patternFor(entry) === pattern.pattern)
      lines.push(`- **${name}** (${item.category}): ${item.evidence.join(' ')}`)
      for (const fact of item.wikiFacts.filter((fact) => fact.kind !== 'other').slice(0, 3)) lines.push(`  - Wiki ${fact.kind}: ${fact.where} — ${fact.detail}`)
    }
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')) }
async function readJsonl(file) {
  const text = await fs.readFile(file, 'utf8')
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
}

function argValue(args, name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

async function main() {
  const args = process.argv.slice(2)
  const wikiDir = argValue(args, '--wiki-dir', process.env.WIKI_AUDIT_WIKI_DIR || DEFAULTS.wikiDir)
  const moduleDir = argValue(args, '--module-dir', process.env.WIKI_AUDIT_MODULE_DIR || DEFAULTS.moduleDir)
  const appRoutesFile = argValue(args, '--app-routes', process.env.WIKI_AUDIT_APP_ROUTES || DEFAULTS.appRoutes)
  const outDir = argValue(args, '--out-dir', process.env.WIKI_AUDIT_OUT_DIR || DEFAULTS.outDir)
  const manifest = await readJson(path.join(wikiDir, 'manifest.json'))
  const state = await readJson(path.join(wikiDir, 'state.json'))
  if (state.pages?.complete !== true || state.redirects?.complete !== true || state.redirects?.listComplete !== true) throw new Error('wiki_store is incomplete; refusing to guess from partial data')
  const [pages, redirects, appRoutes, voidData, baroData, dropData] = await Promise.all([
    readJsonl(path.join(wikiDir, 'pages.jsonl')),
    readJson(path.join(wikiDir, 'redirects.json')),
    readJson(appRoutesFile),
    readJson(path.join(moduleDir, 'Module_Void_data.json')),
    readJson(path.join(moduleDir, 'Module_Baro_data.json')),
    readJson(path.join(moduleDir, 'Module_DropTables_data.json')),
  ])
  const items = auditItems({ appRoutes, pages, redirects, modules: { voidData, baroData, dropData } })
  const golden = ['Axi A2 Intact', 'Axi A5 Intact', 'Axi V8 Intact', 'Axi M5 Intact', 'Neo O1 Intact', 'Axi A8 Intact'].map((name) => {
    const report = items.find((item) => item.name === name)
    const baro = report?.wikiFacts.some((fact) => fact.kind === 'vendor' && fact.where === "Baro Ki'Teer")
    const expectedStatus = name === 'Axi A8 Intact' ? 'app_partial' : 'app_missing'
    return { name, pass: report?.status === expectedStatus && baro === true, status: report?.status || 'missing', expectedStatus, baroFact: baro }
  })
  const reportPath = path.join(outDir, 'audit-report.json')
  const summaryPath = path.join(outDir, 'audit-summary.md')
  const metadata = {
    generatedAt: new Date().toISOString(), appRoutes: appRoutesFile, pageCount: manifest.counts?.pages ?? pages.length,
    redirectCount: manifest.counts?.redirects ?? Object.keys(redirects).length,
    moduleFiles: ['Module_Void_data.json', 'Module_Baro_data.json', 'Module_DropTables_data.json'],
    skippedCategories: [], golden,
    selectedExamples: {
      agree: [
        { name: 'Prova Vandal', why: 'Exact wiki title matched; both wiki and app report a Baro Ki\'Teer vendor source.' },
        { name: 'Stubba', why: 'Exact wiki title matched; both wiki and app report a Market source.' },
      ],
      no_wiki_page: [
        { name: 'Orion & Sirius', why: 'No exact title, redirect, or documented variant exists in the complete local wiki index.' },
        { name: 'Shadow Claws Prime', why: 'No exact title, redirect, or documented variant exists in the complete local wiki index.' },
      ],
    },
  }
  for (const [status, examples] of Object.entries(metadata.selectedExamples)) {
    for (const example of examples) {
      const found = items.find((item) => item.name === example.name)
      if (found?.status !== status) throw new Error(`selected ${status} example ${example.name} has status ${found?.status || 'missing'}`)
    }
  }
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(reportPath, `${JSON.stringify({ metadata, items }, null, 2)}\n`)
  await fs.writeFile(summaryPath, makeSummaryMarkdown(items, metadata))
  for (const result of golden) console.log(`${result.pass ? 'PASS' : 'FAIL'} golden ${result.name}: status=${result.status}, expected=${result.expectedStatus}, baroFact=${result.baroFact}`)
  console.log(JSON.stringify({ reportPath, summaryPath, itemCount: items.length, statusCounts: countBy(items, 'status'), golden }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(`wiki-audit: ${error.message}`); process.exitCode = 1 })
