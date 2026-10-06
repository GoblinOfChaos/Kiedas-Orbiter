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
  'Blueprint', 'Chassis/Systems', 'Chassis', 'Neuroptics', 'Systems', 'Harness', 'Wings', 'Barrel',
  'Receiver', 'Blade', 'Hilt', 'Handle', 'Link', 'Stock', 'Boot', 'Grip', 'String', 'Guard',
  'Lower Limb', 'Upper Limb', 'Head', 'Carapace', 'Cerebrum', 'Pouch', 'Disc',
  'Stars', 'String', 'Fuselage', 'Engines', 'Engine', 'Sabot', 'Ornament', 'Handle',
]
const ACQUISITION_KINDS = new Set(['vendor', 'drop', 'relic', 'quest', 'market', 'craft', 'event', 'vault'])
const RELIC_COMPARISON_KINDS = new Set(['vendor', 'event', 'vault'])
const COMPARISON_KIND_ALIASES = new Map([
  ['vendor-market', 'market'],
  ['vendor-prime-access', 'market'],
  ['vendor-prime-resurgence', 'market'],
  ['vendor-baro', 'vendor'],
])
const ACQUISITION_TEMPLATE_RE = /^(?:acquisition|acquisitions|source|sources|location|locations|drop|drops|drop locations|reward|rewards|vendor|market|baro|quest reward|obtain|obtained|purchase|purchasable|availability)/i
const ACQUISITION_PARAMETER_RE = /^(?:source|sources|acquisition|acquisitions|location|locations|drop|drops|drop location|drop locations|reward|rewards|vendor|vendors|obtain|obtained|purchase|purchasable|sold|availability|quest|event)$/i
const TEMPLATE_NOISE_RE = /^(?:faction|questtopnav|questnav|navbox|itemnav|weaponnnav|warframenav|category|cleanup|spoiler|clr|quote|infobox)$/i
const TEXT_COMPARISON_IGNORED_WORDS = new Set([
  'a', 'an', 'and', 'are', 'be', 'by', 'can', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'this', 'to', 'was', 'were', 'with',
  'standing', 'platinum', 'credit', 'credits',
])
const MISSING_NUMBER_RE = /\bfor\s+(?:on\s+a\b|creds?\b|credits?\b|platinum\b)|\bfor\s+\./i
const STEAM_ONLY_RE = /(?:steam\s+wallet|linked\s+(?:with\s+)?steam|steam\s+account)/i
const MARKET_PRICE_RE = /\b(?:sold\s+in\s+the\s+in-game\s+market|available\s+in\s+the\s+market|purchasable\s+from\s+market)\b[^.!?\n]*\b\d[\d,]*\s+platinum\b/i
const ROUTE_NAME_RE = /\b(?:operation\s*:\s*[^,.;!?]+|[A-Z][A-Za-z0-9'’:-]*(?:\s+[A-Z][A-Za-z0-9'’:-]*){0,5}\s+(?:Bounties|Weekend|Event|Invasions|Sorties|Tactical Alert|Market|Marketplace|Offerings|Relay|Void Trader))\b/gi
const GENERIC_ROUTE_NAMES = new Set(['event', 'market', 'marketplace', 'relay', 'offerings', 'void trader'])

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

export function comparisonTokens(value) {
  const normalized = clean(value)
    .replace(/\b(\d{1,3}(?:,\d{3})+)\b/g, (_, number) => number.replaceAll(',', ''))
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
  return new Set(normalized.split(/\s+/).filter((word) => word && !TEXT_COMPARISON_IGNORED_WORDS.has(word)))
}

export function textSimilarity(left, right) {
  const leftTokens = comparisonTokens(left)
  const rightTokens = comparisonTokens(right)
  if (!leftTokens.size || !rightTokens.size) return 0
  const leftText = [...leftTokens].join(' ')
  const rightText = [...rightTokens].join(' ')
  if (leftText.includes(rightText) || rightText.includes(leftText)) return 1
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length
  return intersection / new Set([...leftTokens, ...rightTokens]).size
}

function textValue(value) {
  return [value?.text, value?.location, value?.quest, value?.event, value?.relic].filter(Boolean).join(' ')
}

function wikiFactText(fact) {
  return fact?.detail || fact?.evidence || fact?.where || ''
}

function appTextCandidates(sources = []) {
  const texts = sources.map(textValue).filter(Boolean)
  return [...new Set([...texts, texts.join(' ')].filter(Boolean))]
}

function factTextCovered(fact, appTexts) {
  const wikiText = wikiFactText(fact)
  if (!wikiText || !appTexts.length) return { covered: false, similarity: 0, appText: null, reason: null }
  for (const appText of appTexts) {
    const similarity = textSimilarity(wikiText, appText)
    if (similarity >= 0.6) return { covered: true, similarity, appText, reason: `text similarity ${similarity.toFixed(3)}` }
  }
  const namedEntities = factEntities(fact).map((entity) => normalize(entity)).filter(Boolean)
  if (namedEntities.length) {
    const joinedApp = normalize(appTexts.join(' '))
    if (namedEntities.every((entity) => joinedApp.includes(entity))) return { covered: true, similarity: 0, appText: appTexts.join(' '), reason: 'all named entities present' }
  }
  return { covered: false, similarity: 0, appText: null, reason: null }
}

export function extractRouteEntities(text) {
  const routes = new Set()
  for (const match of clean(text).matchAll(ROUTE_NAME_RE)) {
    const route = normalize(match[0]).replace(/\s+/g, ' ').trim()
    if (route && !GENERIC_ROUTE_NAMES.has(route)) routes.add(route)
  }
  if (/\b(?:sold|purchasable|purchased|available)\s+(?:in|from)\s+(?:the\s+)?market\b/i.test(clean(text))) routes.add('market')
  if (/\bpurchasable\s+from\s+market\b/i.test(clean(text))) routes.add('market')
  if (/\breward\s+from\s+invasions?\b/i.test(clean(text))) routes.add('invasions')
  return [...routes]
}

function partParentName(name) {
  const original = clean(name).trim()
  if (!original || /\sBlueprint$/i.test(original)) return null
  const suffix = PART_SUFFIXES.filter((value) => value !== 'Blueprint')
    .sort((a, b) => b.length - a.length)
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const parent = original.replace(new RegExp(`\\s+(?:${suffix})$`, 'i'), '').trim()
  return parent && parent !== original ? parent : null
}

function candidateNames(name, category) {
  const original = clean(name).trim()
  const candidates = []
  const add = (value, matchedBy) => {
    if (!value || candidates.some((entry) => normalize(entry.value) === normalize(value))) return
    candidates.push({ value, matchedBy })
  }
  const parent = partParentName(original)
  if (parent) add(parent, `part of ${parent}`)
  add(original, 'exact title')
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

function isSharedCatalogPage(title) {
  return /syandana|glyph|skin|armor|armour|sigil|ephemera|color palette|colour palette|prime access|cosmetic|customization|customisation/i.test(String(title || ''))
}

function sharedPageIndex(pages, items) {
  const names = new Map((items || []).map((item) => [normalize(item.name), item.name]))
  const shared = new Map()
  for (const page of pages) {
    if (!isSharedCatalogPage(page.title)) continue
    let section = page.title
    for (const line of String(page.wikitext || '').split(/\r?\n/)) {
      const heading = line.match(/^(={1,6})\s*(.*?)\s*\1\s*$/)
      if (heading) section = clean(heading[2]) || page.title
      if (!/[|*#]/.test(line)) continue
      const candidates = []
      for (const match of line.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g)) candidates.push(match[2] || match[1])
      for (const cell of line.split(/\|{1,2}/)) candidates.push(clean(cell))
      for (const block of templateBlocks(line)) {
        for (const param of block.body.split('|')) {
          if (param.includes('=')) candidates.push(param.slice(param.indexOf('=') + 1))
        }
      }
      for (const candidate of candidates) {
        const original = names.get(normalize(candidate))
        if (!original || shared.has(normalize(original))) continue
        shared.set(normalize(original), {
          page,
          evidence: `${section}: ${shortEvidence(line)}`,
        })
      }
    }
  }
  return shared
}

function buildPageIndex(pages, redirects, items = []) {
  const pagesByTitle = new Map()
  for (const page of pages) pagesByTitle.set(normalize(page.title), page)
  const redirectMap = new Map(Object.entries(redirects || {}).map(([from, to]) => [normalize(from), String(to)]))
  return { pagesByTitle, redirectMap, sharedByName: sharedPageIndex(pages, items) }
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
  const shared = indexes.sharedByName?.get(normalize(item.name))
  if (shared) return { page: shared.page, matchedBy: `listed on ${shared.page.title}`, sharedEvidence: shared.evidence }
  return null
}

function classifyText(text) {
  const value = clean(text)
  const lower = value.toLocaleLowerCase()
  if (!value) return null
  if (/\b(?:vaulted|unvaulted)\b/i.test(value)) return { kind: 'vault', where: 'Vault status', detail: value }
  if (/\bmarket\b|platinum|prime access|prime resurgence/i.test(lower)) return { kind: 'market', where: 'Market', detail: value }
  if (/baro\s+ki.?teer|void trader|\bbaro\b|sold by|vendor|syndicate|\bfaction\b|purchase|purchasable|offering/i.test(value)) {
    return { kind: 'vendor', where: /baro\s+ki.?teer|void trader|\bbaro\b/i.test(value) ? "Baro Ki'Teer" : 'vendor or syndicate', detail: value }
  }
  if (/\bquest\b|quest reward|completing|completion of|upon completion/i.test(lower)) return { kind: 'quest', where: 'quest or quest reward', detail: value }
  if (/event|tennocon|calendar|season|operation|nightwave/i.test(lower)) return { kind: 'event', where: 'event', detail: value }
  if (/craft|crafted|manufactur|blueprint|dojo|clan|foundry/i.test(lower)) return { kind: 'craft', where: 'crafting or blueprint', detail: value }
  if (/drop|reward|mission|enemy|container|bounty|survival|defense|excavation|interception|rotation|obtained from|acquired from|found in|killed/i.test(lower)) {
    return { kind: 'drop', where: 'drop table or mission', detail: value }
  }
  return { kind: 'other', where: 'wiki page', detail: value }
}

function usefulAcquisitionLine(line) {
  const value = clean(line)
  if (!value) return false
  if (TEMPLATE_NOISE_RE.test(value.replace(/^[*#:;\s]+/, '').split(/[|]/, 1)[0].trim())) return false
  if (/^(?:drop locations?|questtopnav|faction|navbox)\b/i.test(value.replace(/^[*#:;\s]+/, ''))) return false
  if (/^\{\{/.test(line.trim()) && !ACQUISITION_TEMPLATE_RE.test(String(line).replace(/^\{\{\s*/, '').split(/[|}]/, 1)[0].trim())) return false
  const listItem = /^[*#:;\s]*\S/.test(line)
  const sentence = /[.!?]/.test(value)
  const routeWord = /baro|vendor|market|purchase|sold|obtain|acquire|drop|reward|mission|quest|event|craft|blueprint|foundry|dojo|enemy|container|bounty|rotation|vaulted|unvaulted/i.test(value)
  return (listItem || sentence) && (sentence || routeWord)
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
  const entities = [...new Set(fact.entities || extractEntities(`${fact.where || ''} ${fact.detail || ''}`, fact.kind))]
  const normalized = `${fact.kind}|${normalize(fact.where)}|${normalize(fact.detail)}`
  if (seen.has(normalized)) return
  seen.add(normalized)
  facts.push({ kind: fact.kind, where: fact.where || 'wiki page', detail: fact.detail || '', entities, evidence: shortEvidence(fact.evidence || fact.detail) })
}

function extractEntities(text, kind = '') {
  const value = clean(text)
  const lower = value.toLocaleLowerCase()
  const entities = new Set()
  const add = (entity) => {
    const normalized = normalize(entity).replace(/\s+(?:quest|event|operation)$/i, '').trim()
    if (normalized && !/^(?:a|an|the|from|to|by|via|reaching|completing|completion|mission|drop|reward|blueprint|foundry|dojo|enemy|container|rotation)$/i.test(normalized)) entities.add(normalized)
  }
  if (kind === 'market' || /\bmarket\b/i.test(value)) add('Market')
  if (/prime\s+access/i.test(value)) add('Prime Access')
  if (/prime\s+resurgence/i.test(value)) add('Prime Resurgence')
  if (/baro\s+ki.?teer|void trader|\bbaro\b/i.test(value)) add("Baro Ki'Teer")
  for (const match of value.matchAll(/\b(?:sold|purchased|purchaseable|purchasable|bought|obtained|acquired)\s+(?:[^.!?;]*?\s+)?(?:from|by|via)\s+(?:the\s+)?([^.!?;,]+)/gi)) {
    const candidate = match[1].split(/\s+(?:for|using|with|in|at|on|and)\b/i, 1)[0].trim()
    if (candidate && !/^(?:a|an|the|reaching|completing|completion|a blueprint|the market)$/i.test(candidate)) add(candidate)
  }
  for (const match of value.matchAll(/\b((?:the\s+)?[A-Z][A-Za-z0-9'’:-]*(?:\s+[A-Z][A-Za-z0-9'’:-]*){0,7})\s+Quest\b/g)) add(`quest:${match[1]}`)
  for (const match of value.matchAll(/\b((?:Operation|Event|Nightwave)\s+[A-Z][A-Za-z0-9'’:-]*(?:\s+[A-Z][A-Za-z0-9'’:-]*){0,7})\b/g)) add(`event:${match[1]}`)
  for (const match of value.matchAll(/\b(?:Lith|Meso|Neo|Axi|Requiem|Vanguard)\s+[A-Z0-9]+\b/gi)) add(`relic:${baseRelicName(match[0])}`)
  if (kind === 'quest' && ![...entities].some((entity) => entity.startsWith('quest:'))) {
    const quest = value.match(/\b(?:quest reward|quest)\b/i)
    if (quest) add('quest')
  }
  if (kind === 'event' && ![...entities].some((entity) => entity.startsWith('event:'))) add('event')
  if (kind === 'vault') add('vault')
  return [...entities]
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
      if (!usefulAcquisitionLine(line)) continue
      const fact = classifyText(line)
      if (fact) addFact(facts, { ...fact, evidence: line }, seen)
    }
  }
  for (const block of templateBlocks(wikitext)) {
    const lowerName = block.name.toLocaleLowerCase()
    if (TEMPLATE_NOISE_RE.test(lowerName) || !ACQUISITION_TEMPLATE_RE.test(lowerName)) continue
    const params = block.body.split('|').map((part) => part.trim()).filter(Boolean)
    for (const param of params) {
      if (!/=/.test(param)) continue
      const [key, ...rest] = param.split('=')
      if (!ACQUISITION_PARAMETER_RE.test(key.trim())) continue
      const fact = classifyText(rest.join('='))
      addFact(facts, { ...(fact || { kind: 'other', where: clean(key), detail: clean(rest.join('=')) }), evidence: block.raw }, seen)
    }
    if (!params.some((param) => /=/.test(param))) {
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
    if (drop.section === 'Enemies') {
      addFact(facts, { kind: 'not_an_item_source', where: `Module:DropTables/data ${drop.section}`, detail: `${drop.key} is an enemy/NPC drop-table page; its listed drops are not an acquisition source for ${item.name}.`, evidence: `Module:DropTables/data ${drop.section}[${drop.key}]` }, seen)
    } else {
      const entries = Array.isArray(drop.value) ? drop.value : []
      const labels = entries.slice(0, 4).map((entry) => clean(entry?.Source?.Name || entry?.Source?.Type || entry?.[2] || entry?.[1])).filter(Boolean)
      addFact(facts, { kind: 'drop', where: `${drop.section}: ${drop.key}`, detail: labels.length ? `Listed in ${labels.join('; ')}` : `Listed in Module:DropTables/data ${drop.section}`, evidence: `Module:DropTables/data ${drop.section}[${drop.key}]` }, seen)
    }
  }
  return facts
}

function sourceKind(source) {
  const type = String(source?.type || '').toLocaleLowerCase()
  const text = [source?.text, source?.location, source?.quest, source?.event, source?.relic].filter(Boolean).join(' ').toLocaleLowerCase()
  if (type === 'unresearched') return null
  if (/\b(?:vaulted|unvaulted)\b/.test(text)) return 'vault'
  if (type === 'relic') return 'relic'
  if (/prime\s+access/.test(text)) return 'vendor-prime-access'
  if (/prime\s+resurgence/.test(text)) return 'vendor-prime-resurgence'
  if (/baro\s+ki.?teer|void trader|\bbaro\b/.test(text)) return 'vendor-baro'
  if (type === 'market' || /market|platinum/.test(text)) return 'vendor-market'
  if (type === 'syndicate' || /vendor|baro|syndicate|faction|sold by|purchased from|purchaseable from|purchasable from/.test(text)) return 'vendor'
  if (type === 'quest' || /quest/.test(text)) return 'quest'
  if (type === 'craft' || /craft|dojo|foundry|blueprint/.test(text)) return 'craft'
  if (['drop', 'enemy', 'mission', 'bounty', 'transient', 'key', 'avatar'].includes(type)) return 'drop'
  if (type === 'event' || /event|tennocon|nightwave|calendar/.test(text)) return 'event'
  return 'other'
}

function comparisonKind(kind) {
  return COMPARISON_KIND_ALIASES.get(kind) || kind
}

export function summarizeAppSources(sources = []) {
  const meaningful = sources.filter((source) => sourceKind(source))
  return {
    count: sources.length,
    unresearched: sources.length > 0 && meaningful.length === 0,
    kinds: [...new Set(meaningful.map(sourceKind))].sort(),
    sources: sources.map((source) => ({ ...source, kind: sourceKind(source), entities: extractEntities(textValue(source), sourceKind(source) || '') })),
  }
}

function factEntities(fact) {
  return fact.entities?.length ? fact.entities : extractEntities(`${fact.where || ''} ${fact.detail || ''}`, fact.kind)
}

function appSourceMatchesFact(source, fact) {
  if (!source || comparisonKind(source.kind) !== comparisonKind(fact.kind)) return false
  const wikiEntities = factEntities(fact)
  const appEntities = source.entities?.length ? source.entities : extractEntities(textValue(source), source.kind)
  if (!wikiEntities.length || !appEntities.length) return true
  return wikiEntities.some((entity) => appEntities.includes(entity))
}

export function compareSources(wikiFacts, appSummary, options = {}) {
  const relevantKinds = options.category === 'relics' ? RELIC_COMPARISON_KINDS : ACQUISITION_KINDS
  const clearWikiFacts = wikiFacts.filter((fact) => relevantKinds.has(comparisonKind(fact.kind)))
  const appTexts = appTextCandidates(appSummary.sources)
  const textCoverage = new Map(clearWikiFacts.map((fact) => [fact, factTextCovered(fact, appTexts)]))
  const textCoveredFacts = clearWikiFacts.filter((fact) => textCoverage.get(fact)?.covered)
  const clearWikiKinds = [...new Set(clearWikiFacts.map((fact) => comparisonKind(fact.kind)))]
  const appSources = appSummary.sources.filter((source) => source.kind && relevantKinds.has(comparisonKind(source.kind)))
  const appKinds = [...new Set(appSources.map((source) => comparisonKind(source.kind)))]
  if (!wikiFacts.length && !appKinds.length) return { status: 'unclassified', evidence: ['No structured acquisition fact was parsed from either source.'] }
  if (!wikiFacts.length) return { status: 'app_extra', evidence: [`App kinds: ${appKinds.join(', ') || 'none'}`] }
  if (!clearWikiFacts.length) {
    if (options.category === 'relics' && wikiFacts.some((fact) => fact.kind === 'relic') && !appKinds.length) return { status: 'agree', evidence: ['Relic reward contents and refinement route are not acquisition sources.'] }
    return appKinds.length ? { status: 'app_extra', evidence: ['Matched wiki page had no clear acquisition fact for this item category.'] } : { status: 'unclassified', evidence: ['Matched wiki page contained only unclassified acquisition text.'] }
  }
  if (textCoveredFacts.length === clearWikiFacts.length) return { status: 'agree', evidence: [`Text-covered wiki facts: ${textCoveredFacts.length}/${clearWikiFacts.length}`] }
  if (!appKinds.length) return { status: 'app_missing', evidence: [`Wiki kinds: ${clearWikiKinds.join(', ')}`] }
  const unmatchedFacts = clearWikiFacts.filter((fact) => !textCoverage.get(fact)?.covered && !appSources.some((source) => appSourceMatchesFact(source, fact)))
  const missingKinds = [...new Set(unmatchedFacts.map((fact) => comparisonKind(fact.kind)))]
  const extraKinds = appKinds.filter((kind) => !clearWikiKinds.includes(kind))
  if (unmatchedFacts.length) {
    const missingEntities = [...new Set(unmatchedFacts.flatMap(factEntities))].filter(Boolean)
    return { status: 'app_partial', evidence: [`Wiki entities/routes missing from app: ${missingEntities.join(', ') || missingKinds.join(', ')}`, `App kinds: ${appKinds.join(', ')}`] }
  }
  if (extraKinds.length) return { status: 'app_extra', evidence: [`App kinds not represented by wiki facts: ${extraKinds.join(', ')}`] }
  return { status: 'agree', evidence: [`Entities/routes: ${clearWikiKinds.join(', ')}`] }
}

function appItemSource(item) {
  return Array.isArray(item?.sources) ? item.sources : []
}

function textSelfCheck(items) {
  const failures = []
  for (const item of items) {
    if (!['app_missing', 'app_partial'].includes(item.status)) continue
    const appTexts = appTextCandidates(item.appSources.sources)
    for (const fact of item.wikiFacts.filter((entry) => ACQUISITION_KINDS.has(comparisonKind(entry.kind)))) {
      const coverage = factTextCovered(fact, appTexts)
      const similarity = Math.max(0, ...appTexts.map((appText) => textSimilarity(wikiFactText(fact), appText)))
      if (similarity >= 0.6 && !coverage.covered) failures.push({ name: item.name, fact: wikiFactText(fact), similarity })
    }
  }
  return failures
}

export function auditItems({ appRoutes, pages, redirects, modules }) {
  const indexes = buildPageIndex(pages, redirects, Object.values(appRoutes))
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
    if (match.sharedEvidence) wikiFacts.push({ kind: 'other', where: `listed on ${match.page.title}`, detail: match.sharedEvidence, entities: [], evidence: match.sharedEvidence })
    const notAnItemSource = wikiFacts.find((fact) => fact.kind === 'not_an_item_source')
    const comparison = notAnItemSource
      ? { status: 'not_an_item_source', evidence: [notAnItemSource.detail] }
      : compareSources(wikiFacts, appSources, { category: item.category })
    reports.push({ uniqueName, name: item.name, category: item.category, matchedBy: match.matchedBy, wikiFacts, appSources, status: comparison.status, evidence: [`Wiki page: ${match.page.title}`, ...comparison.evidence] })
  }
  return reports
}

function sourceEvidence(source) {
  return { text: textValue(source), type: source.type || null, source: source.source || null }
}

function factEvidence(fact) {
  return { kind: fact.kind, where: fact.where, text: wikiFactText(fact), evidence: fact.evidence }
}

export function findDefects(items) {
  const appTextMissingNumber = []
  const appConflictSteamVsMarket = []
  const appConflictRoute = []
  for (const item of items) {
    const appSources = item.appSources.sources
    const missingNumberSources = appSources.filter((source) => MISSING_NUMBER_RE.test(textValue(source)))
    const numberedWikiFacts = item.wikiFacts.filter((fact) => /\b\d[\d,]*(?:\.\d+)?\b/.test(wikiFactText(fact)))
    if (missingNumberSources.length && numberedWikiFacts.length) {
      appTextMissingNumber.push({
        name: item.name,
        category: item.category,
        appSources: missingNumberSources.map(sourceEvidence),
        wikiFacts: numberedWikiFacts.map(factEvidence),
      })
    }
    const steamFacts = item.wikiFacts.filter((fact) => STEAM_ONLY_RE.test(wikiFactText(fact)))
    const marketSources = appSources.filter((source) => MARKET_PRICE_RE.test(textValue(source)))
    if (steamFacts.length && marketSources.length) {
      appConflictSteamVsMarket.push({
        name: item.name,
        category: item.category,
        wikiFacts: steamFacts.map(factEvidence),
        appSources: marketSources.map(sourceEvidence),
      })
    }
    const routeFacts = item.wikiFacts.map((fact) => ({ fact, routes: extractRouteEntities(wikiFactText(fact)) })).filter((entry) => entry.routes.length)
    const routeSources = appSources.map((source) => ({ source, routes: extractRouteEntities(textValue(source)) })).filter((entry) => entry.routes.length)
    const routeConflicts = []
    for (const wikiEntry of routeFacts) {
      for (const appEntry of routeSources) {
        if (wikiEntry.routes.some((route) => appEntry.routes.includes(route))) continue
        routeConflicts.push({ wiki: factEvidence(wikiEntry.fact), wikiRoutes: wikiEntry.routes, app: sourceEvidence(appEntry.source), appRoutes: appEntry.routes })
      }
    }
    if (routeConflicts.length) appConflictRoute.push({ name: item.name, category: item.category, conflicts: routeConflicts })
  }
  return { app_text_missing_number: appTextMissingNumber, app_conflict_steam_vs_market: appConflictSteamVsMarket, app_conflict_route: appConflictRoute }
}

function countBy(items, key) {
  const out = {}
  for (const item of items) out[item[key]] = (out[item[key]] || 0) + 1
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
}

function countByCategoryStatus(items) {
  const out = {}
  for (const item of items) {
    out[item.category] ||= {}
    out[item.category][item.status] = (out[item.category][item.status] || 0) + 1
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])))
}

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function seededSample(items, status, random, limit = 25) {
  const pool = items.filter((item) => typeof status === 'function' ? status(item) : item.status === status).slice()
  for (let index = pool.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1))
    ;[pool[index], pool[swap]] = [pool[swap], pool[index]]
  }
  return pool.slice(0, limit)
}

export function makeReviewSampleMarkdown(items, seed = 7311, defects = findDefects(items)) {
  const statuses = ['app_missing', 'app_partial', 'app_extra', 'no_wiki_page', 'agree']
  const random = seededRandom(seed)
  const lines = ['# Wiki acquisition audit review sample', '', `Seeded random sample seed: **${seed}**.`, 'Each section contains up to 25 items for human grading.', '']
  const addItem = (item, extra = '') => {
    const wikiText = item.wikiFacts.map((fact) => `${fact.kind}: ${fact.detail || fact.evidence}`).join(' | ') || '(none)'
    const appText = item.appSources.sources.map((source) => textValue(source) || source.type || '(empty)').join(' | ') || '(none)'
    lines.push(`### ${item.name}`, '', `- Category: ${item.category}`, `- Wiki fact text: ${wikiText}`, `- App source texts: ${appText}`, `- Verdict reason: ${item.evidence.join(' ')}${extra ? ` ${extra}` : ''}`, '')
  }
  for (const status of statuses) {
    const sample = seededSample(items, status, random)
    lines.push(`## ${status} (${sample.length})`, '')
    for (const item of sample) addItem(item)
  }
  for (const [key, entries] of Object.entries(defects)) {
    const names = new Set(entries.map((entry) => entry.name))
    const sample = seededSample(items, (item) => names.has(item.name), random)
    lines.push(`## ${key} (${sample.length})`, '')
    for (const item of sample) {
      const defect = entries.find((entry) => entry.name === item.name)
      addItem(item, `Defect evidence: ${JSON.stringify(defect)}`)
    }
  }
  return `${lines.join('\n')}\n`
}

function patternFor(item) {
  const wikiKinds = [...new Set(item.wikiFacts.filter((fact) => ACQUISITION_KINDS.has(fact.kind)).map((fact) => fact.kind))].sort().join('+') || 'none'
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
  const categoryStatusCounts = countByCategoryStatus(items)
  const statuses = [...new Set(items.map((item) => item.status))].sort()
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
    '## Counts by category and status after P49e', '',
    `| Category | ${statuses.join(' | ')} |`, `| --- | ${statuses.map(() => '---:').join(' | ')} |`,
    ...Object.entries(categoryStatusCounts).map(([category, counts]) => `| ${category} | ${statuses.map((status) => counts[status] || 0).join(' | ')} |`), '',
    '## Selected examples', '',
    ...(metadata.selectedExamples?.agree || []).map((entry) => `- agree: **${entry.name}** — ${entry.why}`),
    ...(metadata.selectedExamples?.no_wiki_page || []).map((entry) => `- no_wiki_page: **${entry.name}** — ${entry.why}`), '',
    '## Status-independent defect lists', '',
  ]
  for (const [key, entries] of Object.entries(metadata.defects || {})) {
    lines.push(`### ${key}`, '', ...entries.map((entry) => `- ${entry.name}`), '')
  }
  if (metadata.beforeP49d?.categoryStatusCounts) {
    const beforeStatuses = [...new Set(Object.values(metadata.beforeP49d.categoryStatusCounts).flatMap((counts) => Object.keys(counts)))].sort()
    lines.push('## Counts by category and status before P49e (P49d)', '', `Source: ${metadata.beforeP49d.source}.`, '', `| Category | ${beforeStatuses.join(' | ')} |`, `| --- | ${beforeStatuses.map(() => '---:').join(' | ')} |`)
    for (const [category, counts] of Object.entries(metadata.beforeP49d.categoryStatusCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`| ${category} | ${beforeStatuses.map((status) => counts[status] || 0).join(' | ')} |`)
    }
    lines.push('', 'P49d overall status counts:', '', ...Object.entries(metadata.beforeP49d.statusCounts || {}).map(([key, value]) => `- ${key}: ${value}`), '')
  }
  lines.push(
    '## Top 50 gap patterns', '',
    '| Count | Pattern | Examples |', '| ---: | --- | --- |',
    ...topPatterns.map((entry) => `| ${entry.count} | ${entry.pattern.replaceAll('|', '\\|')} | ${entry.examples.join(', ').replaceAll('|', '\\|')} |`), '',
    '## app_missing items by category', '',
  )
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
  const textSelfCheckFailures = textSelfCheck(items)
  console.log(`TEXT SELF-CHECK: ${textSelfCheckFailures.length} unmatched high-similarity facts`)
  if (textSelfCheckFailures.length) throw new Error(`text self-check failed: ${JSON.stringify(textSelfCheckFailures.slice(0, 5))}`)
  const defects = findDefects(items)
  const previousReport = await readJson(path.join(outDir, 'audit-report.json')).catch(() => null)
  const p49dBaseline = previousReport?.metadata?.reviewSampleSeed === 4903
    ? previousReport.metadata
    : previousReport?.metadata?.beforeP49d
  const golden = ['Axi A2 Intact', 'Axi A5 Intact', 'Axi V8 Intact', 'Axi M5 Intact', 'Neo O1 Intact', 'Axi A8 Intact'].map((name) => {
    const report = items.find((item) => item.name === name)
    const baro = report?.wikiFacts.some((fact) => fact.kind === 'vendor' && fact.where === "Baro Ki'Teer")
    const expectedStatus = name === 'Axi A8 Intact' ? 'app_partial' : 'app_missing'
    return { name, pass: report?.status === expectedStatus && baro === true, status: report?.status || 'missing', expectedStatus, baroFact: baro }
  })
  const reportPath = path.join(outDir, 'audit-report.json')
  const summaryPath = path.join(outDir, 'audit-summary.md')
  const reviewPath = path.join(outDir, 'review-sample.md')
  const categoryStatusCounts = countByCategoryStatus(items)
  const metadata = {
    generatedAt: new Date().toISOString(), appRoutes: appRoutesFile, pageCount: manifest.counts?.pages ?? pages.length,
    redirectCount: manifest.counts?.redirects ?? Object.keys(redirects).length,
    moduleFiles: ['Module_Void_data.json', 'Module_Baro_data.json', 'Module_DropTables_data.json'],
    statusCounts: countBy(items, 'status'), categoryStatusCounts, reviewSampleSeed: 7311,
    textSelfCheck: { unmatchedHighSimilarityFacts: textSelfCheckFailures.length },
    beforeP49d: p49dBaseline?.categoryStatusCounts ? {
      statusCounts: p49dBaseline.statusCounts,
      categoryStatusCounts: p49dBaseline.categoryStatusCounts,
      source: 'existing P49d audit-report.json',
    } : null,
    defects,
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
  await fs.writeFile(reportPath, `${JSON.stringify({ metadata, defects, items }, null, 2)}\n`)
  await fs.writeFile(summaryPath, makeSummaryMarkdown(items, metadata))
  await fs.writeFile(reviewPath, makeReviewSampleMarkdown(items, metadata.reviewSampleSeed))
  for (const result of golden) console.log(`${result.pass ? 'PASS' : 'FAIL'} golden ${result.name}: status=${result.status}, expected=${result.expectedStatus}, baroFact=${result.baroFact}`)
  console.log(JSON.stringify({ reportPath, summaryPath, reviewPath, itemCount: items.length, statusCounts: countBy(items, 'status'), categoryStatusCounts, golden }, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(`wiki-audit: ${error.message}`); process.exitCode = 1 })
