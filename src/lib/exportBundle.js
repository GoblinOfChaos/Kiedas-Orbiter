import { fillDataGaps, fillModGaps } from './wfcdGapFill.js'

const IMAGE_TABLES = [
  'ExportWeapons', 'ExportWarframes', 'ExportSentinels', 'ExportResources',
  'ExportArcanes', 'ExportUpgrades', 'ExportAvionics', 'ExportRelics',
  'ExportSyndicates', 'ExportNightwave', 'ExportBoosterPacks', 'ExportRecipes',
  'ExportCustoms', 'ExportGear', 'ExportFlavour', 'ExportBundles',
  'WI_Warframes', 'WI_Weapons', 'WI_Sentinels', 'WI_Upgrades', 'WI_Arcanes',
  'WI_Resources', 'WI_Relics', 'WI_Gear', 'WI_Customs', 'WI_Skins',
  'WI_Sigils', 'WI_Glyphs', 'WI_Fish',
]

function toBrowseWf(value, exportData) {
  if (!value) return null
  if (/^(?:https?:|asset-cache:|asset:|data:)/.test(value)) return value
  const clean = value.startsWith('/') ? value : '/' + value
  const hash = exportData.ExportImages?.[clean]?.contentHash
  return hash ? `asset-cache://content.warframe.com/PublicExport${clean}!${hash}` : `asset-cache://browse.wf${clean}`
}

export function buildImageMaps(exportData = {}) {
  const EI = {}
  const nameToImage = {}
  const uniqueNameToName = {}
  const dict = exportData.dict ?? exportData['dict.en'] ?? {}
  const indexEntry = (entry, key, table) => {
    const uniqueName = entry.uniqueName || entry.ItemType || key
    if (!uniqueName) return
    let iconPath = entry.icon ?? entry.texture
    let nameKey = entry.name ?? entry.displayName
    if (table === 'ExportRecipes' && entry.resultType) {
      nameKey = uniqueNameToName[entry.resultType] || entry.resultType
      if (!iconPath) {
        iconPath = exportData.ExportImages?.[entry.resultType] || EI[entry.resultType]
        if (typeof iconPath === 'string') iconPath = iconPath.replace('asset-cache://browse.wf', '')
      }
    }
    if (table === 'ExportBundles' && entry.components?.length && !exportData.ExportImages?.[iconPath]?.contentHash) {
      const customs = exportData.ExportCustoms || {}
      for (const component of entry.components) {
        const componentType = component.typeName || component.ItemType || ''
        const custom = customs[componentType] || customs[componentType.replace('/StoreItems/', '/')]
        const componentIcon = custom?.icon
        if (componentIcon && exportData.ExportImages?.[componentIcon]?.contentHash) {
          iconPath = componentIcon
          break
        }
      }
    }
    const url = toBrowseWf(iconPath ?? '', exportData)
    const staleWikiThumbnail = typeof url === 'string' && /^https?:\/\/(?:www\.)?wiki\.warframe\.com\//i.test(url)
    if (url && (!EI[uniqueName] || !staleWikiThumbnail)) EI[uniqueName] = url
    uniqueNameToName[uniqueName] = nameKey
    const resolved = (dict[nameKey] || dict['/' + nameKey] || nameKey || '').replace(/<[^>]*>/g, '').trim()
    if (resolved && !resolved.startsWith('/') && (!nameToImage[resolved.toLowerCase()] || !staleWikiThumbnail) && url) {
      nameToImage[resolved.toLowerCase()] = url
    }
  }
  for (const table of IMAGE_TABLES) {
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

export function mergeCosmeticCatalogAdditions(exportData, additions) {
  if (!additions || typeof additions !== 'object') return exportData
  const customs = { ...(exportData.ExportCustoms || {}) }
  for (const [uniqueName, entry] of Object.entries(additions)) {
    if (uniqueName !== '_comment' && !customs[uniqueName]) customs[uniqueName] = entry
  }
  return { ...exportData, ExportCustoms: customs }
}

export function buildRuntimeExportBundle({ exports, wiMaps = {}, wiSupplement = {}, cosmeticAdditions = null, onGapFillAudit, onModGapFillAudit } = {}) {
  if (!exports) return null
  const withCosmetics = mergeCosmeticCatalogAdditions(exports, cosmeticAdditions)
  let filledExports = withCosmetics
  try {
    const gapResult = fillDataGaps(withCosmetics)
    filledExports = gapResult.exportData
    onGapFillAudit?.(gapResult.audit)
  } catch { /* preserve the unfilled export */ }
  const enhanced = { ...filledExports, ...wiMaps }
  enhanced.uniqueNameToName = { ...(enhanced.uniqueNameToName || {}), ...(wiSupplement.uniqueNameToName || {}) }
  enhanced.nameToImage = { ...(enhanced.nameToImage || {}), ...(wiSupplement.nameToImage || {}) }
  enhanced.WI_Supplement = wiSupplement
  try {
    const modResult = fillModGaps(enhanced.WI_Upgrades, filledExports.WFCD_Mods)
    enhanced.WI_Upgrades = modResult.map
    onModGapFillAudit?.(modResult.audit)
  } catch { /* optional live supplement */ }
  return enhanced
}
