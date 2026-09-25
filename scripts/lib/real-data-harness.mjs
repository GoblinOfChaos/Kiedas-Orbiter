import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerHooks } from 'node:module'

registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx) } catch { return next(spec + '.js', ctx) }
  },
})

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.local/share/kiedas-orbiter-preview/data')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const canonicalPath = (value) => value?.replaceAll('/StoreItems/', '/') || value

export function buildImageMaps(exportData) {
  const tableNames = [
    'ExportWeapons', 'ExportWarframes', 'ExportSentinels', 'ExportResources',
    'ExportArcanes', 'ExportUpgrades', 'ExportAvionics', 'ExportRelics',
    'ExportSyndicates', 'ExportNightwave', 'ExportBoosterPacks', 'ExportRecipes',
    'ExportCustoms', 'ExportGear', 'ExportFlavour', 'ExportBundles',
    'WI_Warframes', 'WI_Weapons', 'WI_Sentinels', 'WI_Upgrades', 'WI_Arcanes',
    'WI_Resources', 'WI_Relics', 'WI_Gear', 'WI_Customs', 'WI_Skins',
    'WI_Sigils', 'WI_Glyphs', 'WI_Fish',
  ]
  const EI = {}
  const nameToImage = {}
  const uniqueNameToName = {}
  const dict = exportData.dict ?? exportData['dict.en'] ?? {}
  const toBrowseWf = (value) => {
    if (!value) return null
    if (/^(?:https?:|asset-cache:|asset:|data:)/.test(value)) return value
    const clean = value.startsWith('/') ? value : '/' + value
    const hash = exportData.ExportImages?.[clean]?.contentHash
    return hash ? `asset-cache://content.warframe.com/PublicExport${clean}!${hash}` : `asset-cache://browse.wf${clean}`
  }
  const indexEntry = (entry, key, table) => {
    const un = entry.uniqueName || entry.ItemType || key
    if (!un) return
    let iconPath = entry.icon ?? entry.texture
    let nameKey = entry.name ?? entry.displayName
    if (table === 'ExportRecipes' && entry.resultType) {
      nameKey = uniqueNameToName[entry.resultType] || entry.resultType
      if (!iconPath) {
        iconPath = exportData.ExportImages?.[entry.resultType] || EI[entry.resultType]
        if (typeof iconPath === 'string') iconPath = iconPath.replace('asset-cache://browse.wf', '')
      }
    }
    const url = toBrowseWf(iconPath ?? '')
    const stale = typeof url === 'string' && /^https?:\/\/(?:www\.)?wiki\.warframe\.com\//i.test(url)
    if (url && (!EI[un] || !stale)) EI[un] = url
    uniqueNameToName[un] = nameKey
    const resolved = (dict[nameKey] || dict['/' + nameKey] || '').replace(/<[^>]*>/g, '').trim()
    if (resolved && !resolved.startsWith('/') && (!nameToImage[resolved.toLowerCase()] || !stale)) nameToImage[resolved.toLowerCase()] = url
  }
  for (const table of tableNames) {
    const data = exportData[table]
    if (!data) continue
    if (Array.isArray(data)) data.forEach((entry) => indexEntry(entry, null, table))
    else if (typeof data === 'object') {
      const nested = data[table] ?? (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object' ? Object.values(data)[0] : null)
      if (Array.isArray(nested)) nested.forEach((entry) => indexEntry(entry, null, table))
      else Object.entries(data).forEach(([key, entry]) => indexEntry(entry, key, table))
    }
  }
  for (const [key, value] of Object.entries(exportData.WI_Supplement?.nameToImage || {})) {
    if (nameToImage[key] === undefined) nameToImage[key] = value
  }
  return { EI, nameToImage, uniqueNameToName }
}

export async function loadExports({ dataDir = DEFAULT_DATA_DIR, repo = REPO, exportDir, assetData, wfcd } = {}) {
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
  for (const [file, key] of [
    ['ExportAvionics_fixed.json', 'ExportAvionicsFixed'], ['mod-icon-map.json', 'ModIconMap'],
    ['card-overlay-map.json', 'CardOverlayMap'], ['peely-pix-map.json', 'PeelyPixMap'],
    ['peely-pix-names.json', 'PeelyPixNames'], ['warframe-items-acquisition.json', 'AcquisitionItems'],
    ['browse-wf-glyphs.json', 'BrowseWfGlyphs'],
  ]) {
    const candidate = path.join(resolvedAssetData, file)
    if (fs.existsSync(candidate)) exportsBundle[key] = readJson(candidate)
  }
  const { transformWarframeItems } = await import(path.join(repo, 'src/lib/warframeItemsTransform.js'))
  const { maps, supplement } = transformWarframeItems(readJson(resolvedWfcd))
  Object.assign(exportsBundle, maps)
  exportsBundle.WI_Supplement = supplement
  exportsBundle.uniqueNameToName = { ...supplement.uniqueNameToName }
  exportsBundle.nameToImage = { ...supplement.nameToImage }
  return makeHarness(exportsBundle, { dataDir, repo })
}

export function makeHarness(exportsBundle, { dataDir = null, repo = REPO } = {}) {
  const dict = exportsBundle.dict ?? exportsBundle['dict.en'] ?? {}
  const maps = buildImageMaps(exportsBundle)
  return { exportsBundle, dict, ...maps, dataDir, repo }
}

export async function loadRealHarness(options = {}) {
  return loadExports(options)
}

export { DEFAULT_DATA_DIR, REPO, canonicalPath }
