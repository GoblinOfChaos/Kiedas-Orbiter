import test from 'node:test'
import assert from 'node:assert/strict'
import { checkItem } from '../../scripts/item-completeness.mjs'
import { goldenHarness, frame } from './fixtures.mjs'

const canary = { name: 'Test Frame', uniqueName: frame }

test('golden frame passes inventory, recipe, component, and labelled acquisition checks', () => {
  const result = checkItem({
    harness: goldenHarness(),
    canary,
    acquisition: {
      [frame]: [{ label: 'Blueprint', rewardName: 'Test Frame', location: 'Test mission' }],
      '/Lotus/Types/Recipes/WarframeRecipes/TestFrameChassisComponent': [{ part: 'Chassis', rewardName: 'Test Frame Chassis', location: 'Test mission' }],
    },
  })
  assert.equal(result.pass, true)
  assert.equal(result.inventory.bucket, 'warframes')
  assert.equal(result.recipe.components[0].name, 'Test Frame Chassis')
})

test('broken frame fails when its image and recipe family are incomplete', () => {
  const result = checkItem({ harness: goldenHarness({ broken: true }), canary, acquisition: {} })
  assert.equal(result.pass, false)
  assert.equal(result.inventory.pass, false)
  assert.equal(result.recipe.foundry, false)
})

test('component drops attributed to the parent without a part label fail', () => {
  const result = checkItem({
    harness: goldenHarness(), canary,
    acquisition: { [frame]: [{ rewardName: 'Test Frame Chassis', location: 'Test mission' }] },
  })
  assert.equal(result.acquisition.pass, false)
  assert.equal(result.acquisition.unlabelledComponentDrops.length, 1)
})

test('DE recipe presence comes from the supplied DE cache decision', () => {
  const result = checkItem({
    harness: goldenHarness(), canary,
    deRecipes: {}, acquisition: {},
  })
  assert.equal(result.recipe.presentInDE, false)
  assert.equal(result.recipe.pass, true)
})
