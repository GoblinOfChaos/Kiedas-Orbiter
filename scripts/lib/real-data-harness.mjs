/*
 * Rule: real-data tests may read the user's files but must never assert numbers or states that depend on them.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerHooks } from 'node:module'
import { buildImageMaps, buildRuntimeExportBundle } from '../../src/lib/exportBundle.js'

registerHooks({
  resolve(spec, ctx, next) {
    if (spec === './logging/tauri' && ctx.parentURL?.endsWith('/src/lib/acquisitionData.js')) return { url: 'data:text/javascript,export const invoke=async(command)=>command==="read_file_bytes"?new TextEncoder().encode("[]"):null;', shortCircuit: true }
    if (spec === '@tauri-apps/api/core') return { url: 'data:text/javascript,export const invoke=async(command)=>command==="read_file_bytes"?new TextEncoder().encode("[]"):null;export const convertFileSrc=(value)=>value;', shortCircuit: true }
    try { return next(spec, ctx) } catch { return next(spec + '.js', ctx) }
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      const file = fileURLToPath(url)
      const source = fs.readFileSync(file, 'utf8')
      return { format: 'module', source: `export default ${source}\n`, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.local/share/kiedas-orbiter-preview/data')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const canonicalPath = (value) => value?.replaceAll('/StoreItems/', '/') || value

const DICT_LOCALE_PROBES = [
  ['/Lotus/Language/Locations/Mars', 'Mars'],
  ['/Lotus/Language/Locations/Earth', 'Earth'],
  ['/Lotus/Language/Items/BlueprintAndItem', '|ITEM| Blueprint'],
  ['/Lotus/Language/Game/Faction_GrineerUC', 'Grineer'],
  ['/Lotus/Language/Game/Faction_CorpusUC', 'Corpus'],
  ['/Lotus/Language/Menu/ItemInventory_SlotsSuit', 'Warframe Slot'],
]

export function detectDictLocale(dict = {}) {
  const evidence = DICT_LOCALE_PROBES.map(([key, expected]) => {
    const actual = dict?.[key]
    return { key, actual, expected, match: typeof actual === 'string' && actual === expected }
  })
  const present = evidence.filter((probe) => typeof probe.actual === 'string')
  const locale = present.length >= 3 && present.every((probe) => probe.match) ? 'en' : 'other'
  return { locale, evidence }
}

function recordsIn(value) {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.filter((entry) => entry && typeof entry === 'object')
  return Object.values(value).flatMap((child) => Array.isArray(child) ? child.filter((entry) => entry && typeof entry === 'object') : [])
}

function exportEntries(table) {
  if (Array.isArray(table)) return table.map((entry) => [entry?.uniqueName || entry?.ItemType, entry]).filter(([key]) => key)
  return Object.entries(table ?? {})
}

function loadEnglishRecords(exportDir) {
  const directories = [exportDir, path.join(exportDir, 'de')]
  const records = new Map()
  for (const directory of directories) {
    if (!fs.existsSync(directory)) continue
    for (const file of fs.readdirSync(directory).filter((name) => /_en\.json$/.test(name))) {
      const value = readJson(path.join(directory, file))
      for (const record of recordsIn(value)) {
        const uniqueName = canonicalPath(record.uniqueName || record.ItemType)
        if (uniqueName && !records.has(uniqueName)) records.set(uniqueName, record)
      }
    }
  }
  return records
}

function mapEnglishFields(source, english, dict) {
  if (!source || !english || typeof source !== 'object' || typeof english !== 'object') return
  for (const [key, value] of Object.entries(source)) {
    const englishValue = english[key]
    if (typeof value === 'string' && value.startsWith('/Lotus/Language/') && typeof englishValue === 'string' && !englishValue.startsWith('/Lotus/')) {
      dict[value] = englishValue
    }
  }
}

function englishBundle(exportsBundle, exportDir) {
  const englishRecords = loadEnglishRecords(exportDir)
  const liveDict = exportsBundle.dict ?? exportsBundle['dict.en'] ?? {}
  const liveLocale = detectDictLocale(liveDict).locale
  const englishDict = {
    ...(exportsBundle['supp-dict'] ?? {}),
    ...(liveLocale === 'en' ? liveDict : {}),
  }
  const overlay = { ...exportsBundle, dict: englishDict }

  for (const [tableName, table] of Object.entries(exportsBundle)) {
    if (!tableName.startsWith('Export')) continue
    const entries = exportEntries(table)
    if (!entries.length) continue
    const cloned = Array.isArray(table) ? [...table] : { ...table }
    for (const [key, entry] of entries) {
      if (!entry || typeof entry !== 'object') continue
      const english = englishRecords.get(canonicalPath(entry.uniqueName || entry.ItemType || key))
      if (!english) continue
      mapEnglishFields(entry, english, englishDict)
      const englishName = typeof english.name === 'string' && !english.name.startsWith('/Lotus/') ? english.name : null
      const replacement = englishName && (entry.name == null || (typeof entry.name === 'string' && entry.name.startsWith('/Lotus/')))
        ? { ...entry, name: englishName }
        : { ...entry }
      if (Array.isArray(table)) cloned[table.indexOf(entry)] = replacement
      else cloned[key] = replacement
    }
    overlay[tableName] = cloned
  }

  return overlay
}

// Every asset-data supplement file MonitoringContext.jsx/
// MirroredMonitoringProvider.jsx read via `invoke('read_file_bytes', ...)`
// and fold into `exportData`, keyed exactly as `buildAllAcquisitionIndexes`
// (src/lib/acquisitionInfo.js) expects on exportData. Exported so a test can
// assert this list doesn't silently drop a key the runtime providers rely
// on - a completeness run must see the same acquisition data the real UI
// does, not a subset.
export const HARNESS_SUPPLEMENT_FILES = [
  ['ExportAvionics_fixed.json', 'ExportAvionicsFixed'], ['mod-icon-map.json', 'ModIconMap'],
  ['card-overlay-map.json', 'CardOverlayMap'], ['peely-pix-map.json', 'PeelyPixMap'],
  ['peely-pix-names.json', 'PeelyPixNames'], ['warframe-items-acquisition.json', 'AcquisitionItems'],
  ['browse-wf-glyphs.json', 'BrowseWfGlyphs'],
  ['wiki-sigils-acquisition.json', 'WikiSigilAcquisition'],
  ['wiki-vendors-acquisition.json', 'WikiVendorAcquisition'],
  ['wiki-tennogen-acquisition.json', 'WikiTennoGenAcquisition'],
  ['wiki-baro-acquisition.json', 'WikiBaroAcquisition'],
  ['wiki-blueprints-acquisition.json', 'WikiBlueprintAcquisition'],
  ['wiki-research-acquisition.json', 'WikiResearchAcquisition'],
  ['wiki-resources-acquisition.json', 'WikiResourceAcquisition'],
  ['wiki-page-acquisition.json', 'WikiPageAcquisition'],
  ['wiki-acquisition-status.json', 'WikiAcquisitionStatus'],
]

export async function loadExports({ dataDir = DEFAULT_DATA_DIR, repo = REPO, exportDir, assetData, wfcd, locale } = {}) {
  const resolvedExportDir = exportDir || path.join(dataDir, 'export')
  const resolvedAssetData = assetData || path.join(repo, 'src-tauri/data/assets/data')
  const resolvedWfcd = wfcd || path.join(repo, 'src-tauri/data/assets/wfcd/wfcd-combined.json')
  if (!fs.existsSync(resolvedExportDir)) throw new Error(`Export directory not found: ${resolvedExportDir}`)
  const exportsBundle = {}
  for (const file of fs.readdirSync(resolvedExportDir)) {
    if (!file.endsWith('.json')) continue
    const stem = file.replace(/\.json$/, '')
    if (stem === 'ExportUpgrades_en') exportsBundle.ExportUpgradesLocalized = readJson(path.join(resolvedExportDir, file))
    else if (!/^ExportUpgrades_/.test(stem)) exportsBundle[stem] = readJson(path.join(resolvedExportDir, file))
  }
  const deManifest = path.join(resolvedExportDir, 'de/ExportManifest.json')
  if (fs.existsSync(deManifest)) exportsBundle.ExportManifest = readJson(deManifest)
  for (const [file, key] of HARNESS_SUPPLEMENT_FILES) {
    const candidate = path.join(resolvedAssetData, file)
    if (fs.existsSync(candidate)) exportsBundle[key] = readJson(candidate)
  }
  const harnessExports = locale === 'en' ? englishBundle(exportsBundle, resolvedExportDir) : exportsBundle
  const { transformWarframeItems } = await import(path.join(repo, 'src/lib/warframeItemsTransform.js'))
  const { maps, supplement } = transformWarframeItems(readJson(resolvedWfcd))
  const additionsFile = path.join(resolvedAssetData, 'cosmetic-catalog-additions.json')
  const runtimeExports = buildRuntimeExportBundle({
    exports: harnessExports,
    wiMaps: maps,
    wiSupplement: supplement,
    cosmeticAdditions: fs.existsSync(additionsFile) ? readJson(additionsFile) : null,
  })
  return makeHarness(runtimeExports, { dataDir, repo, sourceDictLocale: detectDictLocale(exportsBundle.dict ?? exportsBundle['dict.en'] ?? {}).locale })
}

export function makeHarness(exportsBundle, { dataDir = null, repo = REPO, sourceDictLocale } = {}) {
  const dict = exportsBundle.dict ?? exportsBundle['dict.en'] ?? {}
  const maps = buildImageMaps(exportsBundle)
  const dictLocale = detectDictLocale(dict)
  return { exportsBundle, dict, ...maps, dictLocale, sourceDictLocale: sourceDictLocale ?? dictLocale.locale, isEnglishDict: dictLocale.locale === 'en', dataDir, repo }
}

export async function loadRealHarness(options = {}) {
  return loadExports(options)
}

export { DEFAULT_DATA_DIR, REPO, canonicalPath }
