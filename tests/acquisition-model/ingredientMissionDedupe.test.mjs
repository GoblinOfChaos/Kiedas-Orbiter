import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIngredientSourceRows } from '../../src/lib/relicSources.js'

test('ingredient rows dedupe matching mission drops and keep the more descriptive copy', () => {
  const itemType = 'X'
  const nonMission = { type: 'syndicate', syndicateName: 'Test Syndicate' }
  const dropIndex = {
    [itemType]: [
      {
        type: 'mission',
        region: 'Mars',
        node: 'Tyana Pass',
        nodeName: 'Tyana Pass',
        missionType: 'Defense',
        rotation: 'C',
        chance: 0.09300000000000001,
        itemCount: 1,
        source: 'drops.wf',
      },
      {
        type: 'mission',
        node: 'SolNode450',
        nodeName: 'Tyana Pass',
        missionType: 'MT_DEFENSE',
        rotation: 'C',
        chance: 0.093,
        itemCount: 1,
      },
      {
        type: 'mission',
        node: 'SolNode450',
        nodeName: 'Tyana Pass',
        missionType: 'MT_DEFENSE',
        rotation: 'B',
        chance: 0.093,
        itemCount: 1,
      },
      nonMission,
    ],
  }

  const rows = buildIngredientSourceRows({ itemType, name: 'X' }, dropIndex, [], null)
  const tyanaRotationC = rows.filter((row) => row.type === 'mission'
    && row.nodeName === 'Tyana Pass'
    && row.rotation === 'C')

  assert.equal(tyanaRotationC.length, 1)
  assert.equal(tyanaRotationC[0].region, 'Mars')
  assert.ok(rows.some((row) => row.type === 'mission' && row.nodeName === 'Tyana Pass' && row.rotation === 'B'))
  assert.ok(rows.includes(nonMission))
})
