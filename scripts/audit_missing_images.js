// scripts/audit_missing_images.js
//
// Inventories every catalog item the app displays that currently has NO
// resolvable image URL — i.e. no map in the app's data pipeline yields a URL
// for it at all (failure mode (a)). It CANNOT detect a URL that is known but
// 404s at load time (failure mode (b)); that only shows up at runtime.
//
// It loads exactly the same on-disk data the running app loads:
//   * DE public-export JSON     ~/.local/share/kiedas-orbiter/data/export/*.json
//     (downloaded/refreshed at runtime by main.rs check_exports; keyed by file
//     stem, matching main.rs load_all_exports)
//   * repo-bundled supplements  src-tauri/data/assets/data/*.json
//   * warframe-items combined   src-tauri/data/assets/wfcd/wfcd-combined.json
//
// then reuses the real application modules (src/lib/inventoryParser.js,
// src/lib/warframeItemsTransform.js, src/lib/warframeUtils.js) rather than
// reimplementing their logic, and replicates only the small per-screen image
// selection wrappers (Cosmetics.jsx cosmeticImage, Inventory.jsx
// withImageFallback, MonitoringContext.jsx EI/nameToImage construction).
//
// Usage:  node scripts/audit_missing_images.js [--json]
// Writes: docs/missing-images.md

import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { registerHooks } from 'node:module'

// The app's source uses extensionless relative imports (Vite resolves them).
// Teach Node to retry with a .js suffix so the real modules load unmodified.
registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx) } catch { return next(spec + '.js', ctx) }
  },
})

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXPORT_DIR = path.join(os.homedir(), '.local/share/kiedas-orbiter/data/export')
const ASSET_DATA = path.join(REPO, 'src-tauri/data/assets/data')
const WFCD = path.join(REPO, 'src-tauri/data/assets/wfcd/wfcd-combined.json')
const OUT = path.join(REPO, 'docs/missing-images.md')

const { parseInventory } = await import(path.join(REPO, 'src/lib/inventoryParser.js'))
const { transformWarframeItems } = await import(path.join(REPO, 'src/lib/warframeItemsTransform.js'))
const { resolveAnyImage } = await import(path.join(REPO, 'src/lib/warframeUtils.js'))

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

// ── 1. Load the export bundle exactly as main.rs load_all_exports does ──────
if (!fs.existsSync(EXPORT_DIR)) {
  console.error(`Export directory not found: ${EXPORT_DIR}
The DE public-export JSON is downloaded at runtime by the app; run the app once
so it populates that directory, then re-run this audit.`)
  process.exit(1)
}

const exportsBundle = {}
for (const f of fs.readdirSync(EXPORT_DIR)) {
  if (!f.endsWith('.json')) continue
  const stem = f.replace(/\.json$/, '')
  // Locale-specific ExportUpgrades is keyed as ExportUpgradesLocalized (en here).
  if (stem === 'ExportUpgrades_en') {
    exportsBundle.ExportUpgradesLocalized = readJson(path.join(EXPORT_DIR, f))
    continue
  }
  if (/^ExportUpgrades_/.test(stem)) continue
  exportsBundle[stem] = readJson(path.join(EXPORT_DIR, f))
}

// Repo-bundled supplements read by MonitoringContext via read_file_bytes.
for (const [fname, key] of [
  ['ExportAvionics_fixed.json', 'ExportAvionicsFixed'],
  ['mod-icon-map.json', 'ModIconMap'],
  ['card-overlay-map.json', 'CardOverlayMap'],
  ['peely-pix-map.json', 'PeelyPixMap'],
  ['peely-pix-names.json', 'PeelyPixNames'],
  ['warframe-items-acquisition.json', 'AcquisitionItems'],
  ['browse-wf-glyphs.json', 'BrowseWfGlyphs'],
]) {
  const p = path.join(ASSET_DATA, fname)
  if (fs.existsSync(p)) exportsBundle[key] = readJson(p)
}

// warframe-items maps (wfcdLoader.js → transformWarframeItems).
const { maps: wiMaps, supplement: wiSupplement } = transformWarframeItems(readJson(WFCD))
Object.assign(exportsBundle, wiMaps)
exportsBundle.WI_Supplement = wiSupplement
exportsBundle.uniqueNameToName = { ...wiSupplement.uniqueNameToName }
exportsBundle.nameToImage = { ...wiSupplement.nameToImage }

const dict = exportsBundle.dict ?? exportsBundle['dict.en'] ?? {}

// ── 2. Build EI / nameToImage / uniqueNameToName ────────────────────────────
// Verbatim port of MonitoringContext.jsx's useMemo (src/contexts/
// MonitoringContext.jsx:275-371). Kept in sync manually; it is JSX-bound and
// cannot be imported here.
function buildImageMaps(exportData) {
  const tableNames = [
    'ExportWeapons', 'ExportWarframes', 'ExportSentinels',
    'ExportResources', 'ExportArcanes', 'ExportUpgrades',
    'ExportAvionics', 'ExportRelics', 'ExportSyndicates',
    'ExportNightwave', 'ExportBoosterPacks', 'ExportRecipes', 'ExportCustoms',
    'ExportGear', 'ExportFlavour', 'ExportBundles',
    'WI_Warframes', 'WI_Weapons', 'WI_Sentinels',
    'WI_Upgrades', 'WI_Arcanes', 'WI_Resources',
    'WI_Relics', 'WI_Gear', 'WI_Customs',
    'WI_Skins', 'WI_Sigils', 'WI_Glyphs', 'WI_Fish',
  ]
  const EI = {}
  const nameToImage = {}
  const uniqueNameToName = {}
  const toBrowseWf = (p) => {
    if (!p) return null
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('asset-cache://') || p.startsWith('asset://') || p.startsWith('data:')) return p
    const clean = p.startsWith('/') ? p : '/' + p
    const hash = exportData.ExportImages?.[clean]?.contentHash
    return hash ? `asset-cache://content.warframe.com/PublicExport${clean}!${hash}` : `asset-cache://browse.wf${clean}`
  }
  const indexEntry = (e, k, t) => {
    const un = e.uniqueName || e.ItemType || k
    if (!un) return
    let iconPath = e.icon ?? e.texture
    let nameKey = e.name ?? e.displayName
    if (t === 'ExportRecipes' && e.resultType) {
      nameKey = uniqueNameToName[e.resultType] || e.resultType
      if (!iconPath) {
        const resultUn = e.resultType
        iconPath = exportData.ExportImages?.[resultUn] || EI[resultUn]
        if (typeof iconPath === 'string' && iconPath.startsWith('asset-cache://browse.wf')) {
          iconPath = iconPath.replace('asset-cache://browse.wf', '')
        }
      }
    }
    if (t === 'ExportBundles' && e.components?.length && !exportData.ExportImages?.[iconPath]?.contentHash) {
      const customs = exportData.ExportCustoms || {}
      for (const c of e.components) {
        const cType = c.typeName || c.ItemType || ''
        const entry = customs[cType] || customs[cType.replace('/StoreItems/', '/')]
        const cIcon = entry?.icon
        if (cIcon && exportData.ExportImages?.[cIcon]?.contentHash) { iconPath = cIcon; break }
      }
    }
    const url = toBrowseWf(iconPath ?? '')
    const isStaleWikiThumbnail = typeof url === 'string' &&
      /^https?:\/\/(?:www\.)?wiki\.warframe\.com\//i.test(url)
    if (url && (!EI[un] || !isStaleWikiThumbnail)) EI[un] = url
    uniqueNameToName[un] = nameKey
    const locKey = uniqueNameToName[un]
    if (locKey) {
      const resolved = (dict[locKey] || dict['/' + locKey] || '').replace(/<[^>]*>/g, '').trim()
      if (resolved && !resolved.startsWith('/') && (!nameToImage[resolved.toLowerCase()] || !isStaleWikiThumbnail)) {
        if (url) nameToImage[resolved.toLowerCase()] = url
      }
    }
  }
  for (const tbl of tableNames) {
    const data = exportData[tbl]
    if (!data) continue
    if (Array.isArray(data)) data.forEach(e => indexEntry(e, null, tbl))
    else if (typeof data === 'object') {
      const nested = data[tbl] ?? (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object' ? Object.values(data)[0] : null)
      if (Array.isArray(nested)) nested.forEach(e => indexEntry(e, null, tbl))
      else Object.entries(data).forEach(([k, v]) => indexEntry(v, k, tbl))
    }
  }
  const wiSupp = exportData?.WI_Supplement?.nameToImage
  if (wiSupp) {
    for (const [k, v] of Object.entries(wiSupp)) {
      if (nameToImage[k] === undefined) nameToImage[k] = v
    }
  }
  return { EI, nameToImage, uniqueNameToName }
}

const { EI, nameToImage, uniqueNameToName } = buildImageMaps(exportsBundle)

// ── 3. Parse the ownership-independent catalogs ─────────────────────────────
// An empty raw inventory yields exactly the catalogs the app builds from the
// export tables alone (unowned cards), which is what can be audited statically.
const parsed = parseInventory({}, exportsBundle, dict, 'en', null)

// Inventory.jsx:254-272 — every tab passes its list through this fallback.
const canonicalItemPath = (value) => value?.replace('/StoreItems/', '/') || value
const imageByUniqueName = new Map()
const imageByName = new Map()
for (const item of parsed.all ?? []) {
  if (item?.image && item.unique_name) {
    const key = canonicalItemPath(item.unique_name)
    if (!imageByUniqueName.has(key)) imageByUniqueName.set(key, item.image)
  }
  if (item?.image && item.name) {
    const key = item.name.trim().toLowerCase()
    if (!imageByName.has(key)) imageByName.set(key, item.image)
  }
}
const withImageFallback = (item) => item?.image
  || imageByUniqueName.get(canonicalItemPath(item?.unique_name))
  || imageByName.get(item?.name?.trim().toLowerCase())
  || null

// ── 4. Catalog definitions ──────────────────────────────────────────────────
const results = []          // { category, screen, total, missing: [{name, uniqueName, altUrl}] }
const seenGlobally = new Set()

function auditParsedCatalog(category, screen, key, { dedupe = true } = {}) {
  const list = parsed[key] ?? []
  const missing = []
  for (const item of list) {
    const un = item?.unique_name ?? ''
    if (dedupe) {
      if (seenGlobally.has(un)) continue
      seenGlobally.add(un)
    }
    if (!withImageFallback(item)) {
      // Second opinion: resolveAnyImage() consults EI/nameToImage, which the
      // Inventory path does not. A hit here means a URL for the item IS known
      // to the app — the screen's own resolver just never reaches it.
      const altUrl = resolveAnyImage(item, EI, nameToImage, uniqueNameToName)
      missing.push({ name: item?.name ?? '(no name)', uniqueName: un || '(no uniqueName)', altUrl })
    }
  }
  results.push({ category, screen, total: list.length, missing })
}

// Inventory.jsx tabs map 1:1 onto these parser keys (Inventory.jsx:86-101, 397).
// Ordered so the specific tabs claim their items before the catch-all "all".
auditParsedCatalog('Warframes', 'Inventory → Warframes', 'warframes')
auditParsedCatalog('Weapons', 'Inventory → Weapons', 'weapons')
auditParsedCatalog('Companions', 'Inventory → Companions', 'companions')
auditParsedCatalog('Companion Weapons', 'Inventory → Companion Weapons', 'companion_weapons')
auditParsedCatalog('Archwing Weapons', 'Inventory → Archweapons', 'archweapons')
auditParsedCatalog('Vehicles', 'Inventory → Vehicles', 'vehicles')
auditParsedCatalog('Amps', 'Inventory → Amps', 'amps')
auditParsedCatalog('Arcanes', 'Inventory → Arcanes', 'arcanes_catalog')
auditParsedCatalog('Peely Pix', 'Inventory → Peely Pix', 'peely_pix')
auditParsedCatalog('Consumables', 'Inventory → Consumables', 'consumables_catalog')
auditParsedCatalog('Landing Craft', 'Inventory → Landing Craft', 'landing_craft_catalog')
auditParsedCatalog('Resources', 'Inventory → Resources', 'resources')
auditParsedCatalog('Mods', 'Mods screen (mods_catalog)', 'mods_catalog')
// Remaining mastery equipment that only surfaces through the "All" tab /
// Mastery / Foundry lists (archwings, necramechs, kdrives, zaws, modular parts…).
auditParsedCatalog('Other equipment (All tab)', 'Inventory → All, Mastery, Foundry', 'all')

// ── 5. Cosmetics screen (Cosmetics.jsx:102-156) ─────────────────────────────
// Replica of the screen's own enumeration + cosmeticImage(). Ownership only
// affects which iconless entries are hidden, so this runs the "owns nothing"
// baseline: every item below is shown to a player who does not own it.
const normalize = (uniqueName) => typeof uniqueName === 'string' ? uniqueName.replaceAll('/StoreItems/', '/').toLowerCase() : uniqueName
const isSigil = (un) => /\/Upgrades\/Skins\/Sigils\//i.test(un || '')
const cosmeticImage = (entry, uniqueName) => {
  const icon = entry?.icon
  if (typeof icon === 'string' && icon.startsWith('/')) {
    const hash = exportsBundle?.ExportImages?.[icon]?.contentHash
    if (hash) return `asset-cache://content.warframe.com/PublicExport${icon}!${hash}`
    return `asset-cache://browse.wf${icon}`
  }
  return resolveAnyImage(uniqueName, EI, nameToImage)
}

const cosmeticGroups = { 'Cosmetics — Skins & Sigils': [], 'Cosmetics — Glyphs': [], 'Cosmetics — Decorations': [], 'Cosmetics — Emotes': [] }
const cosmeticTotals = { 'Cosmetics — Skins & Sigils': 0, 'Cosmetics — Glyphs': 0, 'Cosmetics — Decorations': 0, 'Cosmetics — Emotes': 0 }

for (const [uniqueName, entry] of Object.entries(exportsBundle.ExportCustoms || {})) {
  if (!/\/Upgrades\/Skins\//i.test(uniqueName)) continue
  // unowned baseline: iconless / codex-excluded entries are filtered out
  if (entry?.excludeFromCodex === true || entry?.codexSecret === true || (!entry?.icon && !entry?.texture)) continue
  const name = dict[entry?.name] || entry?.name
  if (!name) continue
  const key = 'Cosmetics — Skins & Sigils'
  cosmeticTotals[key]++
  if (!cosmeticImage(entry, uniqueName)) cosmeticGroups[key].push({ name, uniqueName, kind: isSigil(uniqueName) ? 'Sigil' : 'Skin' })
}
for (const [uniqueName, entry] of Object.entries(exportsBundle.WI_Glyphs || {})) {
  const name = entry?.name
  if (!uniqueName || !name) continue
  if (entry?.excludeFromCodex === true || entry?.codexSecret === true) continue
  const key = 'Cosmetics — Glyphs'
  cosmeticTotals[key]++
  if (!(entry.icon || resolveAnyImage(uniqueName, EI, nameToImage))) cosmeticGroups[key].push({ name, uniqueName })
}
const decorationParents = new Set([
  '/Lotus/Types/Items/ShipDecos/ShipDecoItem',
  '/Lotus/Types/Items/ShipDecos/BaseFishTrophy',
  '/Lotus/Types/Items/ShipDecos/ChildDrawingBase',
  '/Lotus/Types/Items/ShipDecos/LotusShawzinPlayableBase',
  '/Lotus/Types/Items/ShipDecos/Plushies/PlushyThumper',
  '/Lotus/Types/Items/ShipDecos/Vignettes/Enemies/ShipDecoItem',
  '/Lotus/Types/Items/ShipDecos/InstrumentDecoItem',
  '/Lotus/Types/Items/ShipDecorationLayerItem',
])
for (const [uniqueName, entry] of Object.entries(exportsBundle.ExportResources || {})) {
  if (!decorationParents.has(entry?.parentName)) continue
  const name = dict[entry?.name] || entry?.name
  if (!name) continue
  const key = 'Cosmetics — Decorations'
  cosmeticTotals[key]++
  if (!cosmeticImage(entry, uniqueName)) cosmeticGroups[key].push({ name, uniqueName })
}
for (const [uniqueName, entry] of Object.entries(exportsBundle.ExportFlavour || {})) {
  if (!uniqueName.startsWith('/Lotus/Types/Items/Emotes/')) continue
  const name = dict[entry?.name] || entry?.name
  if (!name) continue
  const key = 'Cosmetics — Emotes'
  cosmeticTotals[key]++
  if (!cosmeticImage(entry, uniqueName)) cosmeticGroups[key].push({ name, uniqueName })
}
for (const [key, missing] of Object.entries(cosmeticGroups)) {
  results.push({ category: key, screen: 'Cosmetics', total: cosmeticTotals[key], missing })
}

// ── 6. Report ───────────────────────────────────────────────────────────────
const totalMissing = results.reduce((s, r) => s + r.missing.length, 0)
const totalItems = results.reduce((s, r) => s + r.total, 0)

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(results, null, 2))
} else {
  for (const r of results) console.log(`${String(r.missing.length).padStart(5)} / ${String(r.total).padEnd(6)} ${r.category}`)
  console.log(`\nTOTAL MISSING: ${totalMissing} of ${totalItems} audited catalog items`)
}

const esc = (s) => String(s).replace(/\|/g, '\\|')
const lines = []
lines.push('# Items with no resolvable image')
lines.push('')
lines.push(`Generated by \`scripts/audit_missing_images.js\` on ${new Date().toISOString().slice(0, 10)}.`)
lines.push('')
lines.push(`**Total items with no resolvable image: ${totalMissing}** (out of ${totalItems} audited catalog items).`)
lines.push('')
const recoverable = results.reduce((s, r) => s + r.missing.filter(m => m.altUrl).length, 0)
lines.push(`Of those, **${recoverable}** do have a URL known elsewhere in the app's own maps`)
lines.push(`(\`resolveAnyImage()\` finds one, the screen's resolver does not) and **${totalMissing - recoverable}**`)
lines.push('have no URL known anywhere in the pipeline.')
lines.push('')
lines.push('## What this does and does not cover')
lines.push('')
lines.push('There are two distinct ways an item can end up with no picture on screen:')
lines.push('')
lines.push('- **(a) No URL is known for the item at all.** Every map in the pipeline')
lines.push('  (`EI`, `nameToImage`, the export tables\' own `icon`/`texture` fields, the')
lines.push('  warframe-items thumbnails) comes back empty, so the resolver returns `null`')
lines.push('  and the card renders with no `<img>` at all. **This is the only failure mode')
lines.push('  inventoried below** — it is a data gap that is visible statically.')
lines.push('- **(b) A URL is known but 404s when loaded.** The resolver returns a URL, the')
lines.push('  card renders an `<img>`, and the fetch fails at runtime (stale wiki thumbnail')
lines.push('  name, asset never mirrored, cache miss). **This audit cannot see those** — it')
lines.push('  never performs a network request. An item absent from this report may still')
lines.push('  show a broken image in the app.')
lines.push('')
lines.push('The "URL known elsewhere?" column in each table separates two sub-cases of (a):')
lines.push('a `yes` means `resolveAnyImage()` (which consults `EI`/`nameToImage`) does find a')
lines.push('URL for the item and only the screen\'s own resolution path misses it — a code')
lines.push('gap, not a missing asset. A `no` means nothing in the pipeline knows a URL.')
lines.push('')
lines.push('## Data sources used')
lines.push('')
lines.push('The DE public-export JSON is **not** in the repo — `main.rs check_exports` downloads')
lines.push('and refreshes it at runtime into `~/.local/share/kiedas-orbiter/data/export/`, and')
lines.push('that directory is what both the app and this audit read. The audit therefore')
lines.push('reflects the export snapshot currently on this machine; a newer DE export could')
lines.push('change the result. The repo-bundled inputs (`src-tauri/data/assets/data/*.json`,')
lines.push('`src-tauri/data/assets/wfcd/wfcd-combined.json`) are read from the working tree.')
lines.push('')
lines.push('## Scope')
lines.push('')
lines.push('Audited: the catalogs the app builds from export data alone, i.e. the ones every')
lines.push('user sees regardless of what they own — the Inventory screen tabs, the Mods')
lines.push('screen catalog, and the four Cosmetics screen catalogs. `parseInventory()` is')
lines.push('invoked with an empty raw inventory so only those ownership-independent catalogs')
lines.push('are produced, and each list is checked with the exact resolver its screen uses.')
lines.push('')
lines.push('**Not audited, and why:**')
lines.push('')
lines.push('- **Owned-item cards.** Items only present because an account owns them cannot be')
lines.push('  enumerated without that account\'s inventory. Their images come from the same')
lines.push('  export tables, so gaps there are unlikely but not proven absent.')
lines.push('- **Relic catalog (Relics screen).** `Relics.jsx` builds unowned relic cards with')
lines.push('  `image: null` deliberately (Relics.jsx:80) and renders them without an `<img>`.')
lines.push('  That is intended behaviour, not a data gap, so listing every relic here would')
lines.push('  be noise.')
lines.push('- **Worldstate-driven cards** (Dashboard fissures, invasions, Baro/Darvo/Nightwave')
lines.push('  rewards, sorties). Their item lists come from the live worldstate feed, so the')
lines.push('  set of items shown changes hourly and cannot be enumerated statically.')
lines.push('- **Collectibles screen** (fragments, series, markers) and Riven cards, which draw')
lines.push('  from bundled UI art and per-riven weapon lookups rather than these item maps.')
lines.push('')
lines.push('## Per-category counts')
lines.push('')
lines.push('| Category | Screen | Missing | Audited |')
lines.push('| --- | --- | ---: | ---: |')
for (const r of results) lines.push(`| ${esc(r.category)} | ${esc(r.screen)} | ${r.missing.length} | ${r.total} |`)
lines.push(`| **Total** | | **${totalMissing}** | **${totalItems}** |`)
lines.push('')
for (const r of results) {
  lines.push(`## ${r.category} — ${r.missing.length} missing`)
  lines.push('')
  lines.push(`Source: ${r.screen}. Audited ${r.total} items.`)
  lines.push('')
  if (!r.missing.length) { lines.push('_No items missing an image._'); lines.push(''); continue }
  lines.push('| Display name | uniqueName / internal path | URL known elsewhere? |')
  lines.push('| --- | --- | --- |')
  for (const m of r.missing.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
    const alt = m.altUrl ? `yes — \`${esc(m.altUrl)}\`` : 'no'
    lines.push(`| ${esc(m.name)} | \`${esc(m.uniqueName)}\` | ${alt} |`)
  }
  lines.push('')
}
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, lines.join('\n'))
console.log(`\nWrote ${OUT}`)
