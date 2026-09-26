import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { buildDropIndex } from '../../src/lib/dropsParser.js'
import { buildFarmingTargetsScreenModel } from '../../src/lib/farmingTargets/screenModel.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

export function readInventoryReadOnly(file = process.env.KIEDAS_PREVIEW_INVENTORY) {
  if (!file || !fs.existsSync(file)) return { all: [], craftable: [] }
  return readJson(file)
}

export async function realUiModel() {
  const harness = await loadRealHarness()
  const inventoryData = readInventoryReadOnly()
  const all = inventoryData.all ?? []
  const parts = all.filter((item) => /^Narin (?:Neuroptics|Chassis|Systems)$/.test(item.name ?? ''))
  const targets = parts.length === 3 ? parts.map((item, index) => ({ id: `narin-${index}`, uniqueName: item.unique_name, name: item.name, image: item.image, quantity: 1 })) : [
    { id: 'narin-neuroptics', uniqueName: '/Lotus/Types/Recipes/WarframeRecipes/DuelistNeuropticsComponent', name: 'Narin Neuroptics', quantity: 1 },
    { id: 'narin-chassis', uniqueName: '/Lotus/Types/Recipes/WarframeRecipes/DuelistChassisComponent', name: 'Narin Chassis', quantity: 1 },
    { id: 'narin-systems', uniqueName: '/Lotus/Types/Recipes/WarframeRecipes/DuelistSystemsComponent', name: 'Narin Systems', quantity: 1 },
  ]
  const dropIndex = buildDropIndex(harness.exportsBundle)
  return { harness, inventoryData, targets, model: buildFarmingTargetsScreenModel({ targets, inventoryData, exportData: harness.exportsBundle, dropIndex }) }
}

export function fixtureUiModel() {
  const targets = [
    { id: 'narin-neuroptics', uniqueName: 'NARIN_NEUROPTICS', name: 'Narin Neuroptics', quantity: 1 },
    { id: 'narin-chassis', uniqueName: 'NARIN_CHASSIS', name: 'Narin Chassis', quantity: 1 },
    { id: 'narin-systems', uniqueName: 'NARIN_SYSTEMS', name: 'Narin Systems', quantity: 1 },
  ]
  const inventoryData = { all: [], craftable: targets.map((target) => ({ resultType: target.uniqueName, uniqueName: `${target.uniqueName}_BLUEPRINT`, bpName: `${target.name} Blueprint`, ingredients: [{ itemType: `${target.uniqueName}_RAW`, name: 'Argon Crystal', need: 1 }] })) }
  const places = ['Tuvul Commons', 'Everview Arc', 'Oro Works']
  const dropIndex = Object.fromEntries(targets.flatMap((target, index) => [[`${target.uniqueName}_BLUEPRINT`, [{ type: 'mission', nodeName: places[index], missionType: ['MT_VOID_FLOOD', 'MT_MOBILE_DEFENSE', 'MT_EXTERMINATE'][index], chance: 0.5 }]], [`${target.uniqueName}_RAW`, [{ type: 'mission', nodeName: places[index], missionType: 'MT_EXTERMINATE', chance: 0.2 }]]]))
  return { targets, inventoryData, model: buildFarmingTargetsScreenModel({ targets, inventoryData, dropIndex }) }
}

export { ROOT }
