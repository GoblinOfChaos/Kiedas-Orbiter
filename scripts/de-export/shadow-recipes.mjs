#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { adaptRecipes } from './adapters/recipes.mjs'
import { adaptResources } from './adapters/resources.mjs'
import { addManifestIcons, manifestImageMap, mergeImages, mergeRecipes, mergeResources } from './adapters/merge-recipes.mjs'

const DEFAULT_CACHE = process.env.KIEDAS_DE_EXPORT_CACHE || '/home/jedwards/.cache/kiedas-de-export'
const DEFAULT_APP = process.env.KIEDAS_PREVIEW_EXPORT_DIR || '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'
const REPORT_PATH = process.env.DE_SHADOW_REPORT || '/tmp/de-shadow/recipes-report.json'
const [cacheDir = DEFAULT_CACHE, appDir = DEFAULT_APP] = process.argv.slice(2)

const provenance = JSON.parse(await readFile(join(cacheDir, 'provenance.json'), 'utf8'))
const loadDe = async (category) => JSON.parse(await readFile(join(cacheDir, 'assets', `${provenance.categories[category].suffix.replace(/[^A-Za-z0-9._+-]/g, '_')}.json`)))
const loadApp = async (name) => JSON.parse(await readFile(join(appDir, name), 'utf8'))
const records = (value, category) => Array.isArray(value) ? value : value?.[category] || value || {}
const names = (value, category) => Object.fromEntries(Object.entries(records(value, category)).map(([key, record]) => [record?.uniqueName || key, record]))

const [deRecipesRaw, deResourcesRaw, deManifest, appRecipes, appResources, appImages, appWarframes] = await Promise.all([
  loadDe('ExportRecipes'), loadDe('ExportResources'), loadDe('ExportManifest'),
  loadApp('ExportRecipes.json'), loadApp('ExportResources.json'), loadApp('ExportImages.json'), loadApp('ExportWarframes.json'),
])
const deRecipes = adaptRecipes(deRecipesRaw)
const deResources = addManifestIcons(adaptResources(deResourcesRaw), deManifest)
const { merged: recipes, report: recipeReport } = mergeRecipes(appRecipes, deRecipes)
const { merged: resources, report: resourceReport } = mergeResources(appResources, deResources)
const { merged: images, added: imageAdded, counts: imageCounts } = mergeImages(appImages, deManifest)
const warframes = addManifestIcons(names(appWarframes, 'ExportWarframes'), deManifest)

const narinKey = '/Lotus/Powersuits/Duelist/Duelist'
const narinRecipe = deRecipes['/Lotus/Types/Recipes/WarframeRecipes/NarinBlueprint']
const componentTypes = (narinRecipe?.ingredients || []).map((ingredient) => ingredient.ItemType).filter((type) => type?.includes('Component'))
const dependencyKeys = [narinKey, ...componentTypes]
const imageByUniqueName = manifestImageMap(deManifest)
const resourcesByName = names(resources, 'ExportResources')
const recipesByName = names(recipes, 'ExportRecipes')
const warframesByName = names(warframes, 'ExportWarframes')
const resolved = dependencyKeys.map((uniqueName) => {
  const record = warframesByName[uniqueName] || resourcesByName[uniqueName] || recipesByName[uniqueName]
  const image = imageByUniqueName.get(uniqueName)
  return { uniqueName, name: record?.name || record?.resultType || null, image: image ? `asset-cache://content.warframe.com/PublicExport${image.path}!${image.contentHash}` : null, resolvedName: Boolean(record?.name || record?.resultType), resolvedImage: Boolean(image) }
})

const report = {
  source: { cacheDir: resolve(cacheDir), appDir: resolve(appDir), locale: 'en', authority: 'Digital Extremes Public Export cache' },
  counts: {
    recipes: { de: Object.keys(deRecipes).length, app: Object.keys(names(appRecipes, 'ExportRecipes')).length, ...recipeReport.counts },
    resources: { de: Object.keys(deResources).length, app: Object.keys(names(appResources, 'ExportResources')).length, ...resourceReport.counts },
    images: imageCounts,
  },
  deOnly: { recipes: recipeReport.added, resources: resourceReport.added, images: imageAdded },
  narin: { recipe: narinRecipe || null, componentTypes, resolved, allDependenciesResolved: resolved.every((item) => item.resolvedName && item.resolvedImage) },
  mirrorOnly: { recipes: recipeReport.mirrorOnly, resources: resourceReport.mirrorOnly },
}

await mkdir(dirname(REPORT_PATH), { recursive: true })
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Recipes: DE ${report.counts.recipes.de} | app ${report.counts.recipes.app} | DE-only ${recipeReport.added.length} | mirror-only ${recipeReport.mirrorOnly.length}`)
console.log(`Resources: DE ${report.counts.resources.de} | app ${report.counts.resources.app} | DE-only ${resourceReport.added.length} | mirror-only ${resourceReport.mirrorOnly.length}`)
console.log(`Images: manifest ${imageCounts.manifest} | DE-only paths added ${imageAdded.length}`)
console.log(`Narin recipe present: ${Boolean(narinRecipe)} | dependencies resolved: ${report.narin.allDependenciesResolved}`)
for (const item of resolved) console.log(`  ${item.uniqueName}: ${item.name || 'MISSING NAME'} | ${item.resolvedImage ? 'image' : 'MISSING IMAGE'}`)
console.log(`JSON report: ${REPORT_PATH}`)
