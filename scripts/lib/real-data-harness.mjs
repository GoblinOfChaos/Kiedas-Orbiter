import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerHooks } from 'node:module'
import { buildImageMaps, buildRuntimeExportBundle } from '../../src/lib/exportBundle.js'

registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx) } catch { return next(spec + '.js', ctx) }
  },
})

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_DATA_DIR = path.join(os.homedir(), '.local/share/kiedas-orbiter-preview/data')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const canonicalPath = (value) => value?.replaceAll('/StoreItems/', '/') || value

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
  const additionsFile = path.join(resolvedAssetData, 'cosmetic-catalog-additions.json')
  const runtimeExports = buildRuntimeExportBundle({
    exports: exportsBundle,
    wiMaps: maps,
    wiSupplement: supplement,
    cosmeticAdditions: fs.existsSync(additionsFile) ? readJson(additionsFile) : null,
  })
  return makeHarness(runtimeExports, { dataDir, repo })
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
