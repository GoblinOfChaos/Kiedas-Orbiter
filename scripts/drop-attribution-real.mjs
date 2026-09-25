#!/usr/bin/env node
import fs from 'node:fs'
import { adaptRecipes } from './de-export/adapters/recipes.mjs'
import { adaptResources } from './de-export/adapters/resources.mjs'
import { mergeRecipes, mergeResources } from './de-export/adapters/merge-recipes.mjs'
import { buildDropIndex } from '../src/lib/dropsParser.js'

const cacheDir = process.argv[2] || '/home/jedwards/.cache/kiedas-de-export'
const appDir = process.argv[3] || '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export'
const provenance = JSON.parse(fs.readFileSync(`${cacheDir}/provenance.json`))
const loadDe = (category) => JSON.parse(fs.readFileSync(`${cacheDir}/assets/${provenance.categories[category].suffix.replace(/[^A-Za-z0-9._+-]/g, '_')}.json`))
const loadApp = (name) => JSON.parse(fs.readFileSync(`${appDir}/${name}`))
const exportData = loadApp('combined_export_cache.json')
const recipes = mergeRecipes(loadApp('ExportRecipes.json'), adaptRecipes(loadDe('ExportRecipes'))).merged
const resources = mergeResources(loadApp('ExportResources.json'), adaptResources(loadDe('ExportResources'))).merged
const index = buildDropIndex({ ...exportData, ExportRecipes: recipes, ExportResources: resources })

const narin = '/Lotus/Powersuits/Duelist/Duelist'
const narinSources = index[narin] || []
const componentParts = new Set(narinSources.filter((source) => source.part).map((source) => source.part))
if (!componentParts.has('Chassis Blueprint') || !componentParts.has('Systems Blueprint') || !componentParts.has('Neuroptics Blueprint')) {
  throw new Error(`Narin component attribution incomplete: ${JSON.stringify([...componentParts])}`)
}
if (narinSources.some((source) => source.part && !source.nodeName)) throw new Error('Narin component source lost its mission location')
const narinBlueprintSources = index['/Lotus/Types/Recipes/WarframeRecipes/NarinBlueprint'] || []
if (!narinBlueprintSources.some((source) => !source.part && source.nodeName === 'Halako Perimeter')) throw new Error('Narin main blueprint route missing')

const control = '/Lotus/Weapons/Tenno/Melee/Swords/PrimeKatana/PrimeNikana'
const controlSources = index[control] || []
if (controlSources.some((source) => source.part?.startsWith('Chassis'))) throw new Error('Prime control acquired an unrelated Chassis attribution')
console.log(JSON.stringify({
  narin: {
    totalSources: narinSources.length,
    componentParts: [...componentParts].sort(),
    examples: narinSources.filter((source) => source.part).slice(0, 3).map((source) => ({ part: source.part, node: source.nodeName, chance: source.chance })),
  },
  controlPrime: { uniqueName: control, totalSources: controlSources.length, labelledSources: controlSources.filter((source) => source.part).length },
}, null, 2))
