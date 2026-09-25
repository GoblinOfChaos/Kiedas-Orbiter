#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { adaptWarframes } from './adapters/warframes.mjs'
import { adaptWeapons } from './adapters/weapons.mjs'
import { adaptRecipes } from './adapters/recipes.mjs'
import { adaptResources } from './adapters/resources.mjs'
import { addManifestIcons, mergeImages, mergeRecipes, mergeResources } from './adapters/merge-recipes.mjs'
import { mergeWarframes } from './adapters/merge-warframes.mjs'
import { mergeWeapons } from './adapters/merge-weapons.mjs'
import { adaptRelicsArcanes, mergeRelicsArcanes } from './adapters/relics-arcanes.mjs'
import { adaptUpgrades, addManifestIcons as addUpgradeManifestIcons, mergeImages as mergeUpgradeImages, mergeUpgrades } from './adapters/merge-upgrades.mjs'
import { adaptCustoms, adaptFlavour, manifestIcons, mergeCustoms, mergeFlavour } from './adapters/merge-customs-flavour.mjs'
import { adaptGear, adaptSentinels } from './adapters/sentgear.mjs'
import { mergeGear, mergeSentinels } from './adapters/merge-sentgear.mjs'
import { adaptFusionBundles, adaptKeys, adaptRegions, mergeFusionBundles, mergeKeys, mergeRegions } from './adapters/regions-keys-bundles.mjs'

const DEFAULT_CACHE = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const DEFAULT_DATA = process.env.KIEDAS_PREVIEW_DATA_DIR || path.join(os.homedir(), '.local/share/kiedas-orbiter-preview/data')

const readJson = (file) => fs.readFile(file, 'utf8').then(JSON.parse)
const writeJson = (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`)

function argValue(args, name, fallback = null) {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

function records(value, category) {
  if (Array.isArray(value)) return value
  if (value?.[category]) return value[category]
  return Object.entries(value || {}).map(([uniqueName, record]) => ({ uniqueName: record?.uniqueName || uniqueName, ...record }))
}

async function loadDe(cacheDir, provenance, category) {
  const entry = provenance?.categories?.[category]
  if (!entry?.suffix) throw new Error(`DE cache provenance has no ${category} entry`)
  const file = path.join(cacheDir, 'assets', `${entry.suffix.replace(/[^A-Za-z0-9._+-]/g, '_')}.json`)
  return readJson(file)
}

async function loadDeOptional(cacheDir, provenance, category) {
  if (!provenance?.categories?.[category]?.suffix) return {}
  return loadDe(cacheDir, provenance, category)
}

export async function applyMerges({ dataDir = DEFAULT_DATA, out, cacheDir = DEFAULT_CACHE, rkbShadow = false } = {}) {
  if (!out) throw new Error('apply-merges requires --out DIR')
  const sourceExport = path.join(dataDir, 'export')
  const outExport = path.join(out, 'export')
  await fs.cp(sourceExport, outExport, { recursive: true })
  const provenance = await readJson(path.join(cacheDir, 'provenance.json'))
  const [deWarframesRaw, deWeaponsRaw, deRecipesRaw, deResourcesRaw, deRelicArcaneRaw, deUpgradesRaw, deCustomsRaw, deFlavourRaw, deSentinelsRaw, deGearRaw, deManifest, deRegionsRaw, deKeysRaw, deFusionBundlesRaw] = await Promise.all([
    loadDe(cacheDir, provenance, 'ExportWarframes'),
    loadDe(cacheDir, provenance, 'ExportWeapons'),
    loadDe(cacheDir, provenance, 'ExportRecipes'),
    loadDe(cacheDir, provenance, 'ExportResources'),
    loadDe(cacheDir, provenance, 'ExportRelicArcane'),
    loadDe(cacheDir, provenance, 'ExportUpgrades'),
    loadDeOptional(cacheDir, provenance, 'ExportCustoms'),
    loadDeOptional(cacheDir, provenance, 'ExportFlavour'),
    loadDeOptional(cacheDir, provenance, 'ExportSentinels'),
    loadDeOptional(cacheDir, provenance, 'ExportGear'),
    loadDe(cacheDir, provenance, 'ExportManifest'),
    rkbShadow ? loadDe(cacheDir, provenance, 'ExportRegions') : Promise.resolve(null),
    rkbShadow ? loadDe(cacheDir, provenance, 'ExportKeys') : Promise.resolve(null),
    rkbShadow ? loadDe(cacheDir, provenance, 'ExportFusionBundles') : Promise.resolve(null),
  ])
  const readApp = (name) => readJson(path.join(sourceExport, name)).catch(() => ({}))
  const [appWarframes, appWeapons, appRecipes, appResources, appRelics, appArcanes, appUpgrades, appCustoms, appFlavour, appSentinels, appGear, appImages, appRewards, appRegions, appKeys, appFusionBundles] = await Promise.all([
    readApp('ExportWarframes.json'), readApp('ExportWeapons.json'), readApp('ExportRecipes.json'),
    readApp('ExportResources.json'), readApp('ExportRelics.json'), readApp('ExportArcanes.json'), readApp('ExportUpgrades.json'),
    readApp('ExportCustoms.json'), readApp('ExportFlavour.json'), readApp('ExportSentinels.json'), readApp('ExportGear.json'), readApp('ExportImages.json'), readApp('ExportRewards.json'),
    rkbShadow ? readApp('ExportRegions.json') : Promise.resolve({}),
    rkbShadow ? readApp('ExportKeys.json') : Promise.resolve({}),
    rkbShadow ? readApp('ExportFusionBundles.json') : Promise.resolve({}),
  ])

  const { merged: warframesBase } = mergeWarframes(appWarframes, adaptWarframes(deWarframesRaw))
  const warframes = addManifestIcons(warframesBase, deManifest)
  const { merged: weapons } = mergeWeapons(appWeapons, adaptWeapons(deWeaponsRaw))
  const { merged: recipes } = mergeRecipes(appRecipes, adaptRecipes(deRecipesRaw))
  const deResources = addManifestIcons(adaptResources(deResourcesRaw), deManifest)
  const { merged: resources } = mergeResources(appResources, deResources)
  const { merged: images } = mergeImages(appImages, deManifest)
  const adaptedRelicsArcanes = adaptRelicsArcanes(deRelicArcaneRaw)
  const { relics: mergedRelics, arcanes } = mergeRelicsArcanes(appRelics, appArcanes, adaptedRelicsArcanes)
  const relics = addManifestIcons(mergedRelics, deManifest)
  const rewards = { ...appRewards, ...adaptedRelicsArcanes.rewards }
  const { merged: customs } = mergeCustoms(appCustoms, manifestIcons(adaptCustoms(deCustomsRaw), deManifest))
  const { merged: flavour } = mergeFlavour(appFlavour, manifestIcons(adaptFlavour(deFlavourRaw), deManifest))
  const { merged: sentinels } = mergeSentinels(appSentinels, adaptSentinels(deSentinelsRaw))
  const { merged: gear } = mergeGear(appGear, adaptGear(deGearRaw))
  const { merged: upgradesBase } = mergeUpgrades(appUpgrades, adaptUpgrades(deUpgradesRaw))
  const upgrades = addUpgradeManifestIcons(upgradesBase, deManifest)
  const { merged: upgradeImages } = mergeUpgradeImages(images, deManifest)

  let rkb = null
  if (rkbShadow) {
    const regions = mergeRegions(appRegions, adaptRegions(deRegionsRaw))
    const keys = mergeKeys(appKeys, adaptKeys(deKeysRaw))
    const fusionBundles = mergeFusionBundles(appFusionBundles, adaptFusionBundles(deFusionBundlesRaw))
    rkb = { regions, keys, fusionBundles }
  }

  await Promise.all([
    writeJson(path.join(outExport, 'ExportWarframes.json'), warframes),
    writeJson(path.join(outExport, 'ExportWeapons.json'), weapons),
    writeJson(path.join(outExport, 'ExportRecipes.json'), recipes),
    writeJson(path.join(outExport, 'ExportResources.json'), resources),
    writeJson(path.join(outExport, 'ExportRelics.json'), relics),
    writeJson(path.join(outExport, 'ExportArcanes.json'), arcanes),
    writeJson(path.join(outExport, 'ExportUpgrades.json'), upgrades),
    writeJson(path.join(outExport, 'ExportCustoms.json'), customs),
    writeJson(path.join(outExport, 'ExportFlavour.json'), flavour),
    writeJson(path.join(outExport, 'ExportSentinels.json'), sentinels),
    writeJson(path.join(outExport, 'ExportGear.json'), gear),
    writeJson(path.join(outExport, 'ExportRewards.json'), rewards),
    writeJson(path.join(outExport, 'ExportImages.json'), upgradeImages),
    ...(rkb ? [
      writeJson(path.join(outExport, 'ExportRegions.json'), rkb.regions.merged),
      writeJson(path.join(outExport, 'ExportKeys.json'), rkb.keys.merged),
      writeJson(path.join(outExport, 'ExportFusionBundles.json'), rkb.fusionBundles.merged),
    ] : []),
  ])
  await fs.mkdir(path.join(outExport, 'de'), { recursive: true })
  await Promise.all([
    writeJson(path.join(outExport, 'de', 'ExportWarframes_en.json'), deWarframesRaw),
    writeJson(path.join(outExport, 'de', 'ExportWeapons_en.json'), deWeaponsRaw),
    writeJson(path.join(outExport, 'de', 'ExportRecipes_en.json'), deRecipesRaw),
    writeJson(path.join(outExport, 'de', 'ExportResources_en.json'), deResourcesRaw),
    writeJson(path.join(outExport, 'de', 'ExportRelicArcane_en.json'), deRelicArcaneRaw),
    writeJson(path.join(outExport, 'de', 'ExportUpgrades_en.json'), deUpgradesRaw),
    writeJson(path.join(outExport, 'de', 'ExportCustoms_en.json'), deCustomsRaw),
    writeJson(path.join(outExport, 'de', 'ExportFlavour_en.json'), deFlavourRaw),
    writeJson(path.join(outExport, 'de', 'ExportSentinels_en.json'), deSentinelsRaw),
    writeJson(path.join(outExport, 'de', 'ExportGear_en.json'), deGearRaw),
    writeJson(path.join(outExport, 'de', 'ExportManifest.json'), deManifest),
    ...(rkb ? [
      writeJson(path.join(outExport, 'de', 'ExportRegions_en.json'), deRegionsRaw),
      writeJson(path.join(outExport, 'de', 'ExportKeys_en.json'), deKeysRaw),
      writeJson(path.join(outExport, 'de', 'ExportFusionBundles_en.json'), deFusionBundlesRaw),
    ] : []),
  ])
  return { out, exportDir: outExport, counts: {
    warframes: Object.keys(warframes).length, weapons: Object.keys(weapons).length,
    recipes: Object.keys(recipes).length, resources: Object.keys(resources).length,
    relics: Object.keys(relics).length, arcanes: Object.keys(arcanes).length,
    upgrades: Object.keys(upgrades).length, images: Object.keys(upgradeImages).length,
    customs: Object.keys(customs).length, flavour: Object.keys(flavour).length,
    sentinels: Object.keys(sentinels).length, gear: Object.keys(gear).length,
    rewards: Object.keys(rewards).length,
    ...(rkb ? {
      regions: rkb.regions.report.counts.merged,
      keys: rkb.keys.report.counts.merged,
      fusionBundles: rkb.fusionBundles.report.counts.merged,
      rkbReports: { regions: rkb.regions.report, keys: rkb.keys.report, fusionBundles: rkb.fusionBundles.report },
    } : {}),
  } }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || !args.includes('--out')) {
    console.log('Usage: node scripts/de-export/apply-merges.mjs --data-dir DIR --out DIR [--cache-dir DIR] [--with-rkb-shadow]')
    process.exit(args.includes('--help') ? 0 : 2)
  }
  try {
    console.log(JSON.stringify(await applyMerges({
      dataDir: argValue(args, '--data-dir', DEFAULT_DATA),
      out: path.resolve(argValue(args, '--out')),
      cacheDir: argValue(args, '--cache-dir', DEFAULT_CACHE),
      rkbShadow: args.includes('--with-rkb-shadow'),
    }), null, 2))
  } catch (error) {
    console.error(`apply-merges: ${error.message}`)
    process.exitCode = 1
  }
}
