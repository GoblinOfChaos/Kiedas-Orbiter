#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_AUDIT = path.resolve(ROOT, '../wiki-audit/scripts/wiki-audit/out/audit-report.json')
const DEFAULT_PAGES = '/home/jedwards/kiedas-orbiter/wiki_store/pages.jsonl'
const DATA = path.join(ROOT, 'src-tauri/data/assets/data')
const GROUPS = ['resources', 'cosmetics', 'other']
const REQUIRED_COMPATIBILITY_ITEMS = new Set(['Lua Unairu Lens'])
const CLEAN_DETAIL_RE = /^(?:DropLocations|Acquisition\s*\||\{\{|!Image|\|)/i
const ROUTE_SIGNAL_RE = /\b(?:acquir|award|availab|bought|buy|complet|craft|drop|market|obtain|offer|purchas|reward|sold|trade|vendor|watch|standing|prime\s+(?:access|resurgence)|nightwave|operation|quest|mission|rotation|dojo|foundry|blueprint)\b/i
const HISTORY_RE = /\b(?:originally|formerly|previously|was available|was a reward|first available|introduced|returned as|has since returned|reacquired|subsequent years|update\s+\d|hotfix|\b(?:19|20)\d{2}\b)\b/i
const EXPLICIT_UNAVAILABLE_RE = /\b(?:not obtainable currently|no longer obtainable|not available anymore|no longer available|unavailable|discontinued|retired)\b/i
const UNKNOWN_TEMPLATE_RE = /\{\{[^{}]*(?:#var:|BundleCost|Price|Cost)[^{}]*\}\}/i
const TEMPLATE_RESIDUE_RE = /\{\{|\}\}|\[\[|\]\]|\|\s*[A-Za-z][^=\n]*=|\b(?:DropLocations|Rewards|Missions)\s*\|/i

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

function cleanMarkup(value) {
  let text = String(value ?? '')
  for (let round = 0; round < 4; round += 1) {
    const next = text.replace(/\{\{\s*([^|{}]+)(?:\|([^{}]*))?\}\}/g, (_, name, body = '') => {
      const parts = [name, ...body.split('|')].map((part) => part.trim()).filter((part) => part && !/^\w+\s*=/.test(part))
      return parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || ''
    })
    if (next === text) break
    text = next
  }
  return text
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\bPAGENAME\b/g, 'This item')
    .replace(/\s+/g, ' ')
    .trim()
}

function comparable(value) {
  return cleanMarkup(value).replace(/^[*#:;\s]+/, '').replace(/\s+/g, ' ').trim()
}

export function findQuote(page, fact) {
  const target = comparable(fact.evidence || fact.detail || '')
  if (!target) return null
  if (page.wikitext.includes(fact.evidence || '')) return fact.evidence
  for (const line of page.wikitext.split(/\r?\n/)) {
    const rendered = comparable(line)
    if (rendered && (rendered === target || rendered.includes(target) || target.includes(rendered))) return line
  }
  return null
}

function titleFromReport(item) {
  const evidence = item.evidence?.find((entry) => String(entry).startsWith('Wiki page: '))
  return evidence ? String(evidence).slice('Wiki page: '.length).trim() : null
}

function cleanCoreItems(items) {
  return items.filter((item) => {
    const strict = item.status === 'app_missing' && item.appSources?.unresearched === true
    const compatibility = item.status === 'app_missing' && REQUIRED_COMPATIBILITY_ITEMS.has(item.name)
    return (strict || compatibility) && item.wikiFacts?.some((fact) => isCleanFact(fact))
  })
}

function isCleanFact(fact) {
  const detail = String(fact?.detail ?? '').trim()
  if (detail.length <= 25 || CLEAN_DETAIL_RE.test(detail)) return false
  return true
}

function factPriority(fact, item) {
  const kind = String(fact?.kind || '')
  const detail = String(fact?.detail || '')
  if (EXPLICIT_UNAVAILABLE_RE.test(detail)) return 0
  if (item.category === 'recipes' && kind === 'craft' && /blueprint|crafted|dojo|foundry/i.test(detail)) return 1
  if (item.category === 'recipes' && kind === 'vendor' && /blueprints?\s+(?:can be\s+)?purchased/i.test(detail)) return 1
  if (kind === 'vendor' && /baro|varzia|purchas|sold|standing/i.test(detail)) return 2
  if (kind === 'market' && /prime\s+(?:access|resurgence)/i.test(detail)) return 2
  if (kind === 'market') return 3
  if (kind === 'quest') return 4
  if (kind === 'event' || kind === 'drop') return 5
  if (kind === 'craft') return 6
  return 9
}

function pickFact(item) {
  return item.wikiFacts
    .filter(isCleanFact)
    .filter((fact) => EXPLICIT_UNAVAILABLE_RE.test(String(fact.detail || '')) || !HISTORY_RE.test(String(fact.detail || '')))
    .filter((fact) => !/^\s*(?:Lua Lens Blueprint Mission|Listed in Module:)/i.test(String(fact.detail || '')))
    .filter((fact) => fact.kind !== 'other' || /\b(?:market|purchas|obtain|reward|acquir|sold|vendor|event|quest)\b/i.test(String(fact.detail || '')))
    .filter((fact) => !(/\bPAGENAME\b/i.test(String(fact.detail || '')) && /following\s+Nightwave\s+season/i.test(String(fact.detail || ''))))
    .filter((fact) => !/following\s+Nightwave\s+season/i.test(String(fact.detail || '')))
    .sort((left, right) => factPriority(left, item) - factPriority(right, item) || String(left.detail).localeCompare(String(right.detail)))[0] || null
}

function stripNumbers(value) {
  return value
    .replace(/\s+(?:for|costing|costs?|worth)\s+(?:\([^)]*\)\s*)?(?:\d[\d,]*(?:\.\d+)?|#var:[A-Za-z]+)(?:\s+(?:Platinum|Credits?|Aya|Standing|Regal Aya|Ducats?))?/gi, '')
    .replace(/\b(?:for|costing|costs?)\s+(?:\d[\d,]*(?:\.\d+)?|#var:[A-Za-z]+)/gi, '')
    .replace(/\b\d[\d,]*(?:\.\d+)?\b\s*(?:Platinum|Credits?|Aya|Standing|Regal Aya|Ducats?)?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim()
}

function sentence(value) {
  let text = cleanMarkup(value)
  text = stripNumbers(text)
    .replace(/^\*+\s*/, '')
    .replace(/\s*\([^)]*\b(?:UTC|ET|PT|between)\b[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  text = text.replace(/[.!?]+$/, '')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

function namedVendors(detail) {
  const names = []
  const known = [
    "Baro Ki'Teer", 'Varzia', 'Cephalon Suda', 'New Loka', 'Steel Meridian', 'The Perrin Sequence',
    'Red Veil', 'Arbiters of Hexis', 'Cephalon Melica', 'Cephalon Simaris', 'Son', 'Father', 'Ticker',
  ]
  for (const name of known) if (new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(detail)) names.push(name)
  return [...new Set(names)]
}

function routeFromFact(item, fact) {
  const detail = String(fact.detail || '')
  const lower = detail.toLocaleLowerCase()
  const vendors = namedVendors(detail)
  const unavailable = EXPLICIT_UNAVAILABLE_RE.test(detail)

  if (unavailable) {
    return { kind: 'not_obtainable', text: 'Not currently obtainable.', place: 'Unavailable' }
  }

  if (/cred offering/i.test(detail)) return { kind: 'vendor', text: 'Purchase from Nightwave Cred Offerings.', place: 'Nightwave Cred Offerings' }
  if (fact.kind === 'vendor') {
    if (vendors.length === 1 && /baro/i.test(vendors[0])) return { kind: 'vendor', text: "Sold by Baro Ki'Teer.", place: "Baro Ki'Teer" }
    if (vendors.length) return { kind: 'vendor', text: `Purchase from ${vendors.join(' or ')}.`, place: vendors.join(' / ') }
  }

  if (/prime\s+access/i.test(lower) && /prime\s+resurgence/i.test(lower)) {
    return { kind: 'market', text: 'Available through Prime Access or Prime Resurgence.', place: 'Prime Access / Prime Resurgence' }
  }
  if (/prime\s+access/i.test(lower)) return { kind: 'market', text: 'Available through Prime Access.', place: 'Prime Access' }
  if (/prime\s+resurgence/i.test(lower)) return { kind: 'market', text: 'Available through Prime Resurgence.', place: 'Prime Resurgence' }
  if (fact.kind === 'market' || /\bmarket\b/i.test(detail)) {
    const bundle = /bundle|collection|pack/i.test(detail)
    return { kind: 'market', text: bundle ? 'Purchasable from the Market or as part of a bundle.' : 'Purchasable from the Market.', place: 'Market' }
  }

  if (/rotation\s+C\s+Lua\s+Disruption/i.test(detail)) {
    return { kind: 'drop', text: 'Blueprint reward from Rotation C Lua Disruption.', place: 'Lua Disruption' }
  }
  if (/Nightwave/i.test(detail)) {
    const event = detail.match(/during\s+([^,.]+)/i)?.[1]?.trim() || detail.match(/Nightwave\s+([^,.]+)/i)?.[1]?.trim()
    return { kind: 'event', text: event ? `Reward from ${event.replace(/^during\s+/i, '')} Nightwave.` : 'Reward from Nightwave.', place: event ? `${event.replace(/^during\s+/i, '')} Nightwave` : 'Nightwave' }
  }
  if (/TennoCon/i.test(detail)) return { kind: 'event', text: 'Reward from watching TennoCon on WARFRAME Twitch.', place: 'TennoCon' }
  if (/Operation:\s*([^,.]+)/i.test(detail)) {
    const event = detail.match(/Operation:\s*([^,.]+)/i)[1].trim()
    return { kind: 'event', text: `Reward from Operation: ${event}.`, place: `Operation: ${event}` }
  }
  if (fact.kind === 'quest' || /complet(?:ing|ed)|quest reward|blueprint can be acquired/i.test(detail)) {
    const race = detail.match(/K-Drive Race\s+"([^"]+)"/i)?.[1]
    if (race) return { kind: 'quest', text: `Blueprint reward from the K-Drive Race "${race}".`, place: 'K-Drive Race' }
    const location = detail.match(/(?:on|in|from|at)\s+(?:the\s+)?([A-Z][^,.]+?)(?:\.|,|\s+Note:)/)?.[1]?.trim()
    return { kind: 'reward', text: sentence(detail).slice(0, 220), place: location || 'Quest reward' }
  }
  if (fact.kind === 'craft') {
    if (/purchased?\s+from/i.test(detail)) return { kind: 'vendor', text: sentence(detail).slice(0, 220), place: vendors.join(' / ') || 'Vendor' }
    if (/crafted?\s+from/i.test(detail)) return { kind: 'crafting', text: sentence(detail).slice(0, 220), place: 'Foundry' }
    return { kind: 'reward', text: sentence(detail).slice(0, 220), place: 'Blueprint reward' }
  }
  if (fact.kind === 'drop' && ROUTE_SIGNAL_RE.test(detail)) {
    const reward = detail.match(/(?:available|obtained|available)\s+as\s+a\s+reward\s+from\s+([^.;]+)/i)?.[1]
    return { kind: 'drop', text: reward ? `Reward from ${reward.trim()}.` : sentence(detail).slice(0, 220), place: fact.where || 'Mission reward' }
  }
  return null
}

function pageIndex(file) {
  const pages = new Map()
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const page = JSON.parse(line)
    pages.set(page.title, page)
  }
  return pages
}

function moduleRelicRoute(item, pages) {
  const base = item.name.replace(/\s+Intact$/i, '')
  const page = pages.get("Baro Ki'Teer/TennoCon Items")
  if (!page) return null
  const startMarker = "Baro's '''TennoCon Relay'''"
  const marker = `|${base} Relic`
  const start = page.wikitext.indexOf(startMarker)
  const end = page.wikitext.indexOf(marker, start)
  if (start < 0 || end < 0) return null
  const quote = page.wikitext.slice(start, end + marker.length)
  return {
    kind: 'vendor', text: "Sold by Baro Ki'Teer.", place: "Baro Ki'Teer",
    source: { archive: 'wiki_store', page: page.title, url: wikiUrl(page.title), revid: page.revid, quote },
  }
}

function wikiUrl(title) {
  return `https://wiki.warframe.com/w/${String(title).replaceAll(' ', '_')}`
}

function routeForItem(item, pages) {
  if (item.category === 'relics') return moduleRelicRoute(item, pages)
  const fact = pickFact(item)
  if (!fact) return null
  const pageTitle = titleFromReport(item)
  const page = pages.get(pageTitle)
  if (!page) return null
  const quote = findQuote(page, fact)
  if (!quote) return null
  const route = routeFromFact(item, fact)
  if (!route || !route.text || !route.place) return null
  return {
    ...route,
    source: { archive: 'wiki_store', page: page.title, url: wikiUrl(page.title), revid: page.revid, quote },
  }
}

function groupFor(item) {
  if (item.category === 'cosmetics') return 'cosmetics'
  if (item.category === 'resources') return 'resources'
  return 'other'
}

function loadGroups() {
  return Object.fromEntries(GROUPS.map((group) => [group, readJson(path.join(DATA, `verified-routes.${group}.json`))]))
}

function sortedObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
}

function writeOutputs(groups, skipped, reportFile) {
  for (const group of GROUPS) {
    fs.writeFileSync(path.join(DATA, `verified-routes.${group}.json`), `${JSON.stringify(groups[group], null, 1)}\n`)
  }
  const merged = {}
  for (const group of GROUPS) {
    for (const [key, value] of Object.entries(groups[group])) {
      if (Object.hasOwn(merged, key)) throw new Error(`duplicate key across groups: ${key}`)
      merged[key] = value
    }
  }
  fs.writeFileSync(path.join(DATA, 'verified-routes.json'), `${JSON.stringify(sortedObject(merged), null, 1)}\n`)
  fs.writeFileSync(reportFile, skipped.length
    ? `# Wiki route skips\n\n${skipped.map((entry) => `- **${entry.name}** (${entry.uniqueName}): ${entry.reason}`).join('\n')}\n`
    : '# Wiki route skips\n\nNone.\n')
}

export function generate({ auditFile = process.env.AUDIT_REPORT || DEFAULT_AUDIT, pagesFile = process.env.WIKI_PAGES || DEFAULT_PAGES, dataDir = DATA, reportFile = path.join(ROOT, 'scripts/wiki-audit/wiki-routes-skipped.md'), write = true } = {}) {
  const audit = readJson(auditFile)
  const pages = pageIndex(pagesFile)
  const groups = Object.fromEntries(GROUPS.map((group) => [group, readJson(path.join(dataDir, `verified-routes.${group}.json`))]))
  const existing = new Set(GROUPS.flatMap((group) => Object.keys(groups[group])))
  const selected = cleanCoreItems(audit.items)
  const skipped = []
  const generated = []
  for (const item of selected) {
    if (existing.has(item.uniqueName)) continue
    const route = routeForItem(item, pages)
    if (!route) {
      skipped.push({ name: item.name, uniqueName: item.uniqueName, reason: 'A clean fact was selected, but no verbatim page quote and current route could be constructed without guessing.' })
      continue
    }
    const group = groupFor(item)
    groups[group][item.uniqueName] = { name: item.name, routes: [route] }
    existing.add(item.uniqueName)
    generated.push({ ...item, group, route })
    const fact = item.category === 'relics' ? null : pickFact(item)
    if (UNKNOWN_TEMPLATE_RE.test(String(fact?.detail || '')) || /\{\{|\b\d[\d,]*\b/.test(String(fact?.detail || ''))) {
      skipped.push({ name: item.name, uniqueName: item.uniqueName, reason: 'Partial route: the source contains a number or template value; the generated sentence deliberately drops that value.' })
    }
  }
  if (write) writeOutputs(groups, skipped, reportFile)
  return { selected, generated, skipped, groups }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = generate()
  console.log(JSON.stringify({ selected: result.selected.length, generated: result.generated.length, skipped: result.skipped.length }, null, 2))
}
