import fs from 'node:fs'
import { buildPrimeResurgenceModel } from '../src/lib/primeResurgence.js'

const dataRoot = process.env.KIEDAS_DATA_ROOT || `${process.env.HOME}/.local/share/kiedas-orbiter/data`
const read = (relative) => JSON.parse(fs.readFileSync(`${dataRoot}/${relative}`, 'utf8'))
const exportData = {}
for (const name of ['ExportRelics', 'ExportRewards', 'ExportRecipes', 'ExportWeapons', 'ExportWarframes', 'ExportSentinels', 'ExportCustoms', 'ExportGear', 'ExportUpgrades']) {
  exportData[name] = read(`export/${name}.json`)
}
exportData.dict = read('export/dict.json')

const raw = read('user/inventory.json')
const inventoryData = { all: [] }
for (const array of Object.values(raw)) {
  if (!Array.isArray(array)) continue
  for (const item of array) {
    if (item?.ItemType) inventoryData.all.push({ unique_name: item.ItemType, quantity: item.ItemCount || 1, owned: true })
  }
}

const model = buildPrimeResurgenceModel(read('export/VaultTrader.json'), exportData, inventoryData)
const all = [...model.equipment, ...model.cosmetics, ...model.bundles]
const projectionCards = all.filter((item) => item.uniqueName.includes('/Projections/'))
const equipmentWithoutParts = model.equipment.filter((item) => item.parts.length === 0)
if (projectionCards.length || equipmentWithoutParts.length) {
  console.error(JSON.stringify({ projectionCards, equipmentWithoutParts }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ equipment: model.equipment.length, cosmetics: model.cosmetics.length, bundles: model.bundles.length, projectionCards: projectionCards.length, equipmentWithoutParts: equipmentWithoutParts.length }, null, 2))
