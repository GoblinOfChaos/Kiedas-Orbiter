#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const inputPages = path.join(ROOT, 'scratchwiki/wiki-resource-pages.json')
const inputSections = path.join(ROOT, 'scratchwiki/wiki-resource-sections.json')
const outputFile = path.join(ROOT, 'src-tauri/data/assets/data/wiki-resource-sources.json')

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (full, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    return named[entity.toLowerCase()] ?? full
  })
}

function stripWikiMarkup(value) {
  let text = String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref\b[^>]*\/>/gi, '')

  for (let i = 0; i < 8 && /{{[\s\S]*?}}/.test(text); i++) {
    text = text.replace(/{{([^{}]*)}}/g, (_, body) => {
      const parts = body.split('|')
      const template = parts[0].trim().toLowerCase()
      if (!parts[1] || /^(?:quote|in-game description|resourceinfobox|guide|navigation|buildrequire|customcollapsible|pagename)/i.test(template)) return ''
      if (/^(?:resource|spoilertext|pc|ver)$/i.test(template)) return parts[1]
      return ''
    })
  }
  text = text
    .replace(/\[\[([^\]|]+)#([^\]|]+)\|([^\]]+)\]\]/g, '$3')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/[^\]]+\]/g, '')
    .replace(/'''?/g, '')
    .replace(/''/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/^\s*[|!].*$/gm, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]+/g, ' ')
  return decodeEntities(text).trim()
}

function plainHtml(value) {
  return stripWikiMarkup(String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/tr>/gi, '\n'))
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function sentences(value) {
  return String(value || '').match(/[^.!?]+(?:[.!?]+|$)/g)?.map((part) => part.trim()).filter(Boolean) || []
}

function foundTextFromIntro(wikitext) {
  const intro = String(wikitext || '').split(/\n(?=={2,6}\s)/)[0]
  const paragraph = intro.split(/\n\s*\n/).find((part) =>
    /\b(?:found|obtained|acquired|harvested|dropped|rewarded|purchased|retrieved|collected|earned|mined|gathered)\b/i.test(part),
  ) || intro
  const plain = stripWikiMarkup(paragraph)
  const found = sentences(plain).filter((sentence) =>
    /\b(?:found|obtained|acquired|harvested|dropped|rewarded|purchased|retrieved|collected|earned|mined|gathered)\b/i.test(sentence),
  )
  return found.join(' ')
}

function headerText(section) {
  const match = String(section || '').match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
  return match ? plainHtml(match[1]) : ''
}

function sectionBody(section) {
  const match = String(section || '').match(/<h[23][^>]*>[\s\S]*?<\/h[23]>/i)
  return match ? plainHtml(String(section).slice(match[0].length)) : plainHtml(section)
}

function cells(row, tag) {
  return [...String(row).matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map((match) => match[1])
}

function parseNumber(value) {
  const match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function parseChance(value) {
  const match = String(value || '').match(/-?\d+(?:\.\d+)?\s*%/)
  return match ? Number((Number(match[0].replace('%', '')) / 100).toFixed(6)) : null
}

function parseQuantity(value) {
  const text = plainHtml(value)
  if (!text) return null
  return /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : text
}

function parseNodes(value) {
  const listItems = [...String(value || '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => plainHtml(match[1]))
    .filter(Boolean)
  if (listItems.length) return listItems
  const text = plainHtml(value)
  return text ? [text] : []
}

function parseMissionDrops(section) {
  const tables = [...String(section || '').matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((match) => match[0])
  const drops = []
  for (const table of tables) {
    const rows = [...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map((match) => match[0])
    const headers = rows.length ? cells(rows.shift(), 'th').map(plainHtml).map((header) => header.toLowerCase()) : []
    const missionIndex = headers.findIndex((header) => header === 'mission type')
    const sourceIndex = headers.findIndex((header) => header === 'source')
    const rotationIndex = headers.findIndex((header) => /rotation|drop table/.test(header))
    const chanceIndex = headers.findIndex((header) => /^chance/.test(header))
    const quantityIndex = headers.findIndex((header) => /^quantity/.test(header))
    const nodesIndex = headers.findIndex((header) => /star chart|nodes/.test(header))
    if (missionIndex < 0 || sourceIndex < 0 || chanceIndex < 0) continue
    for (const row of rows) {
      const values = cells(row, 'td')
      if (values.length <= Math.max(missionIndex, sourceIndex, chanceIndex)) continue
      const missionType = plainHtml(values[missionIndex])
      const source = plainHtml(values[sourceIndex])
      if (!missionType || !source || /no (?:mission|enemy) drop tables/i.test(source)) continue
      drops.push({
        missionType,
        source,
        rotationOrTable: rotationIndex >= 0 ? plainHtml(values[rotationIndex]) : null,
        chance: parseChance(values[chanceIndex]),
        quantity: quantityIndex >= 0 ? parseQuantity(values[quantityIndex]) : null,
        nodes: nodesIndex >= 0 ? parseNodes(values[nodesIndex]) : [],
      })
    }
  }
  return drops
}

function sourceLikeHeading(heading) {
  return /enemy|bount|vendor|market|acqui|drop|source|reward|shop|purchase/i.test(heading)
}

function parseWikitextSections(wikitext) {
  return [...String(wikitext || '').matchAll(/^(={2,3})\s*([^=]+?)\s*\1\s*\n([\s\S]*?)(?=^={2,3}\s*[^=].*?\s*\1\s*$|$)/gmi)]
    .map((match) => ({ heading: stripWikiMarkup(match[2]), text: stripWikiMarkup(match[3]) }))
    .filter((section) => section.heading && section.text && sourceLikeHeading(section.heading))
}

function collectOtherSections(page, renderedSections) {
  const sections = []
  const seen = new Set()
  for (const rendered of renderedSections || []) {
    const heading = headerText(rendered)
    if (!heading || /mission drop tables/i.test(heading) || !sourceLikeHeading(heading)) continue
    const text = sectionBody(rendered)
    if (!text) continue
    const key = `${heading}\n${text}`
    if (!seen.has(key)) {
      seen.add(key)
      sections.push({ heading, text })
    }
  }
  for (const section of parseWikitextSections(page.wikitext)) {
    const key = `${section.heading}\n${section.text}`
    if (!seen.has(key)) {
      seen.add(key)
      sections.push(section)
    }
  }
  return sections
}

function makeEntry(name, page, rendered, fetched) {
  const drops = (rendered || []).filter((section) => /mission drop tables/i.test(headerText(section))).flatMap(parseMissionDrops)
  const otherSections = collectOtherSections(page, rendered)
  const foundText = foundTextFromIntro(page.wikitext)
  if (!foundText && drops.length === 0 && otherSections.length === 0) return null
  return {
    name,
    url: page.url || rendered?.url || `https://wiki.warframe.com/w/${encodeURIComponent(name.replaceAll(' ', '_'))}`,
    revid: page.revid ?? rendered?.revid ?? null,
    fetched: page.fetched || fetched || null,
    ...(foundText ? { foundText } : {}),
    drops,
    otherSections,
  }
}

function writeCompactObject(entries) {
  const lines = ['{']
  const names = Object.keys(entries).sort((a, b) => a.localeCompare(b))
  names.forEach((key, index) => {
    const comma = index === names.length - 1 ? '' : ','
    lines.push(`${JSON.stringify(key)}:${JSON.stringify(entries[key])}${comma}`)
  })
  lines.push('}\n')
  return lines.join('\n')
}

export function buildWikiResourceSources(pagesData, sectionsData = { pages: {} }) {
  const entries = {}
  for (const name of Object.keys(pagesData.pages || {}).sort((a, b) => a.localeCompare(b))) {
    const page = pagesData.pages[name]
    const entry = makeEntry(name, page, sectionsData.pages?.[name]?.sections_html, pagesData.fetched)
    if (entry) entries[name.toLowerCase()] = entry
  }
  return writeCompactObject(entries)
}

const pagesData = JSON.parse(fs.readFileSync(inputPages, 'utf8'))
const sectionsData = fs.existsSync(inputSections) ? JSON.parse(fs.readFileSync(inputSections, 'utf8')) : { pages: {} }
const output = buildWikiResourceSources(pagesData, sectionsData)
fs.writeFileSync(outputFile, output)
console.log(`wrote ${output.split('\n').length - 3} wiki resource entries to ${path.relative(ROOT, outputFile)}`)
