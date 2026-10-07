// Builds the list of items that award Mastery Rank, from the saved wiki pages.
// Source: wiki_store/pages.jsonl, "Mastery Rank Checklist" and "Hidden Mastery".
// Output: src-tauri/data/assets/data/mastery-items.json. No network access.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const STORE = path.join(process.env.WIKI_STORE ?? path.resolve(ROOT, '../../wiki_store'), 'pages.jsonl')
const OUT = path.join(ROOT, 'src-tauri/data/assets/data/mastery-items.json')

const pages = new Map()
for (const line of fs.readFileSync(STORE, 'utf8').split('\n')) {
  if (!line.trim()) continue
  const p = JSON.parse(line)
  if (!pages.has(p.title)) pages.set(p.title, p)
}

const CHECKLIST = pages.get('Mastery Rank Checklist')
const HIDDEN = pages.get('Hidden Mastery')
if (!CHECKLIST || !HIDDEN) throw new Error('required wiki pages missing from wiki_store')

const TEMPLATE = /\{\{(Weapon|WF|Companion)\|([^}|]+)/

// Checklist rows: a `data-rowid` line followed by the item template and the points.
function parseChecklist(page) {
  const out = []
  let section = null
  const lines = page.wikitext.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const heading = /^==\s*([^=]+?)\s*==$/.exec(lines[i])
    if (heading) { section = heading[1]; continue }
    const row = /data-rowid="([^"]+)"/.exec(lines[i])
    if (!row || !section) continue
    const next = lines[i + 1] || ''
    const tpl = TEMPLATE.exec(next)
    const name = tpl ? tpl[2].trim() : row[1]
    const points = /StoreTableCell\|(\d[\d,]*)\|/.exec(next)
    out.push({ name, section, points: points ? Number(points[1].replace(/,/g, '')) : null, kind: tpl ? tpl[1] : null })
  }
  return out
}

// Hidden Mastery rows: `| {{Weapon|Name}} || 3,000 || acquisition`, grouped by a section label before "Hidden items".
function parseHidden(page) {
  const out = []
  let section = null
  for (const line of page.wikitext.split('\n')) {
    const sec = /^\|-\|([A-Za-z-]+)\s*=/.exec(line) || /^'''?([A-Za-z -]+)'''?\s*$/.exec(line)
    if (sec) section = sec[1].trim()
    const m = /^\|\s*\{\{(Weapon|WF|Companion)\|([^}|]+)\}\}\s*\|\|\s*([\d,]+)/.exec(line)
    if (m) out.push({ name: m[2].trim(), section, points: Number(m[3].replace(/,/g, '')), kind: m[1] })
  }
  return out
}

const checklist = parseChecklist(CHECKLIST)
const hidden = parseHidden(HIDDEN)
const byName = new Map()
for (const e of [...checklist, ...hidden]) {
  if (!byName.has(e.name)) byName.set(e.name, { ...e, sources: [] })
  byName.get(e.name).sources.push(e.section === undefined ? 'checklist' : 'hidden-mastery')
}

const items = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
const out = {
  generatedFrom: [
    { page: 'Mastery Rank Checklist', revid: CHECKLIST.revid },
    { page: 'Hidden Mastery', revid: HIDDEN.revid },
  ],
  count: items.length,
  items,
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')
const bySection = {}
for (const i of checklist) bySection[i.section] = (bySection[i.section] || 0) + 1
console.log(JSON.stringify({ checklistRows: checklist.length, hiddenRows: hidden.length, unique: items.length, bySection }, null, 0))
