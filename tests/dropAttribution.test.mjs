import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDropIndex } from '../src/lib/dropsParser.js'

const frame = '/Lotus/Powersuits/Test/Test'
const blueprint = '/Lotus/Types/Recipes/WarframeRecipes/TestBlueprint'
const chassis = '/Lotus/Types/Recipes/WarframeRecipes/TestChassisComponent'

function fixture() {
  return {
    ExportWarframes: { [frame]: { uniqueName: frame, name: 'Test Frame' } },
    ExportResources: {
      [chassis]: {
        uniqueName: chassis,
        name: 'Test Frame Chassis',
        description: 'Chassis component of the Test Frame.',
      },
    },
    ExportRecipes: {
      [blueprint]: { uniqueName: blueprint, resultType: frame, ingredients: [{ ItemType: chassis, ItemCount: 1 }] },
    },
    DropsAll: {
      missionRewards: {
        TestPlanet: {
          TestNode: {
            gameMode: 'Exterminate',
            rewards: [
              { itemName: 'Test Frame Blueprint', chance: 5 },
              { itemName: 'Test Frame Chassis Blueprint', chance: 4 },
            ],
          },
        },
      },
    },
  }
}

test('component reward is attributed to the parent with a DE-derived part label', () => {
  const index = buildDropIndex(fixture())
  const parentSources = index[frame]
  assert.equal(parentSources.filter((source) => source.part === 'Chassis Blueprint').length, 1)
  assert.equal(parentSources.find((source) => source.part)?.chance, 0.04)
  assert.equal(index[blueprint].some((source) => source.part), false)
})

test('main blueprint remains a separate unlabelled blueprint route', () => {
  const index = buildDropIndex(fixture())
  const ownSources = index[blueprint]
  assert.equal(ownSources.length, 1)
  assert.equal(ownSources[0].part, undefined)
  assert.equal(ownSources[0].chance, 0.05)
})
