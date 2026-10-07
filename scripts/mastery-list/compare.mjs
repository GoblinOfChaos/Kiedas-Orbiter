// Read-only comparison: Inventory items against the wiki Mastery list.
// Writes docs/agent-context/reports/mastery-compare.{json,md}. Prints counts only.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRealHarness, DEFAULT_DATA_DIR } from '../lib/real-data-harness.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const LIST = JSON.parse(fs.readFileSync(path.join(ROOT, 'src-tauri/data/assets/data/mastery-items.json'), 'utf8'))
const OUT_DIR = path.join(ROOT, 'docs/agent-context/reports')

const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
const raw = JSON.parse(fs.readFileSync(path.join(DEFAULT_DATA_DIR, 'user/inventory.json'), 'utf8'))
const { parseInventory } = await import(path.join(ROOT, 'src/lib/inventoryParser.js'))
const parsed = parseInventory(raw, exportsBundle, dict, 'en', null)

// Relevant to Mastered / Unmastered: everything that is not a resource, mod, consumable, cosmetic or rivens/arcanes.
const SKIP = new Set(['resources', 'consumables', 'mods', 'mods_catalog', 'arcanes', 'Arcanes', 'consumables_catalog', 'rivens', 'landing_craft', 'peely_pix', 'cosmetics', 'keys', 'regions', 'ayatan', 'relics', 'components'])
const MASTERY_TABS = new Set(['all', 'warframes', 'weapons', 'primary', 'secondary', 'melee', 'kitguns', 'zaws', 'sentinels', 'beasts', 'moas', 'hounds', 'robotic', 'companions', 'companion_weapons', 'archwings', 'archweapons', 'necramechs', 'kdrives', 'amps', 'vehicles', 'prime_parts', 'parts'])
const seen = new Set()
const appItems = []
for (const [bucket, list] of Object.entries(parsed)) {
  if (!Array.isArray(list) || SKIP.has(bucket) || !MASTERY_TABS.has(bucket)) continue
  for (const i of list) {
    if (!i?.name) continue
    const key = i.unique_name ?? i.name
    const entry = { bucket, name: i.name, unique: i.unique_name, category: i.category, masterable: i.masterable, mastered: i.mastered, masteryReq: null, flags: {} }
    if (seen.has(key)) {
      const prior = appItems.find((a) => (a.unique ?? a.name) === key)
      prior.flags[bucket] = i.masterable
      continue
    }
    seen.add(key)
    entry.flags[bucket] = i.masterable
    appItems.push(entry)
  }
}

// DE masteryReq for weapons and warframes, by canonical unique name.
const canon = (s) => String(s || '').replace('/StoreItems/', '/')
const reqByUnique = new Map()
for (const t of ['ExportWeapons', 'ExportWarframes']) {
  const tbl = exportsBundle[t] || {}
  for (const [k, v] of Object.entries(tbl)) if (v && 'masteryReq' in v) reqByUnique.set(canon(k), v.masteryReq)
}
for (const a of appItems) a.masteryReq = reqByUnique.has(canon(a.unique)) ? reqByUnique.get(canon(a.unique)) : null

// Name matching: exact, then with a trailing parenthesised qualifier removed (e.g. "Needlenose (K-DRIVE)").
const wikiByName = new Map(LIST.items.map((i) => [i.name.toLowerCase(), i]))
const stripQualifier = (n) => n.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
const match = (name) => wikiByName.get(name.toLowerCase()) ?? wikiByName.get(stripQualifier(name)) ?? null

const rows = appItems.map((a) => ({ ...a, wiki: match(a.name) }))
const onWiki = rows.filter((r) => r.wiki)
const notOnWiki = rows.filter((r) => !r.wiki)
const appNames = new Set(rows.map((r) => r.name.toLowerCase()))
const wikiNotInApp = LIST.items.filter((i) => !appNames.has(i.name.toLowerCase()) && !appNames.has(stripQualifier(i.name)))

const conflictReqNoWiki = notOnWiki.filter((r) => r.masteryReq != null)
const conflictWikiButMasterableFalse = onWiki.filter((r) => Object.values(r.flags).includes(false))
const flagDisagreement = rows.filter((r) => new Set(Object.values(r.flags)).size > 1).map((r) => ({ name: r.name, flags: r.flags, onWiki: !!r.wiki }))
const conflictWikiButReqNull = onWiki.filter((r) => r.masteryReq == null && r.masterable !== false)

const countBy = (arr, key) => arr.reduce((m, r) => ((m[key(r)] = (m[key(r)] || 0) + 1), m), {})
const summary = {
  appItemsCompared: rows.length,
  onWikiList: onWiki.length,
  notOnWikiList: notOnWiki.length,
  notOnWikiByBucket: countBy(notOnWiki, (r) => r.bucket),
  notOnWikiByCategory: countBy(notOnWiki, (r) => r.category),
  notOnWikiWithMasteryReq: conflictReqNoWiki.length,
  wikiListNotInApp: wikiNotInApp.length,
  wikiItemsFlaggedNotMasterableByApp: conflictWikiButMasterableFalse.length,
  wikiItemsWithNoMasteryReqInDE: conflictWikiButReqNull.length,
  itemsWhoseMasterableDiffersBetweenTabs: flagDisagreement.length,
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const detail = {
  summary,
  notOnWikiSample: notOnWiki.slice(0, 400).map((r) => ({ name: r.name, bucket: r.bucket, category: r.category, masteryReq: r.masteryReq, masterable: r.masterable })),
  notOnWikiWithMasteryReq: conflictReqNoWiki.map((r) => ({ name: r.name, bucket: r.bucket, masteryReq: r.masteryReq, masterable: r.masterable })),
  wikiItemsFlaggedNotMasterableByApp: conflictWikiButMasterableFalse.map((r) => ({ name: r.name, wikiSection: r.wiki.section, wikiPoints: r.wiki.points })),
  flagDisagreement,
  wikiListNotInApp: wikiNotInApp.slice(0, 400).map((i) => ({ name: i.name, section: i.section, points: i.points })),
}
fs.writeFileSync(path.join(OUT_DIR, 'mastery-compare.json'), JSON.stringify(detail, null, 1) + '\n')
const md = [
  '# Mastery list comparison (read-only)',
  '',
  `Compared ${summary.appItemsCompared} Inventory items with ${LIST.count} wiki entries (revids ${LIST.generatedFrom.map((g) => g.revid).join(', ')}).`,
  '',
  `- On the wiki list: ${summary.onWikiList}`,
  `- Not on the wiki list: ${summary.notOnWikiList}, by bucket ${JSON.stringify(summary.notOnWikiByBucket)}`,
  `- Not on the wiki list but with a DE masteryReq: ${summary.notOnWikiWithMasteryReq}`,
  `- Wiki entries the app does not show: ${summary.wikiListNotInApp}`,
  `- Wiki entries the app flags masterable:false: ${summary.wikiItemsFlaggedNotMasterableByApp}`,
  `- Wiki entries with no DE masteryReq: ${summary.wikiItemsWithNoMasteryReqInDE}`,
  '',
  'Full lists: mastery-compare.json (same folder).',
  '',
]
fs.writeFileSync(path.join(OUT_DIR, 'mastery-compare.md'), md.join('\n'))
console.log(JSON.stringify(summary))
