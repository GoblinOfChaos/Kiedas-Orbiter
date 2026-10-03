import assert from 'node:assert/strict'
import test from 'node:test'
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { parseWorldstate } from '../../src/lib/worldstateParser.js'
import { resolveCalendarUpgradeName } from '../../src/lib/warframeUtils.js'

const UPGRADE_PATHS = [
  '/Lotus/Upgrades/Calendar/ElectricStatusDamageAndChance',
  '/Lotus/Upgrades/Calendar/GasChanceToPrimaryAndSecondary',
  '/Lotus/Upgrades/Calendar/Armor',
  '/Lotus/Upgrades/Calendar/AbilityStrength',
  '/Lotus/Upgrades/Calendar/RadialJavelinOnHeavy',
]

const EXPECTED_NAMES = [
  'Electric Status Damage And Chance',
  'Gas Chance To Primary And Secondary',
  'Armor',
  'Ability Strength',
  'Radial Javelin On Heavy',
]

const rawCalendar = {
  KnownCalendarSeasons: [{
    Season: 'CST_SPRING',
    YearIteration: 23,
    Days: [{
      day: 1,
      Events: UPGRADE_PATHS.map((upgrade) => ({ Type: 'CET_UPGRADE', Upgrade: upgrade })),
    }],
  }],
}

test('calendar upgrade fallback resolves the path leaf without a path fragment', () => {
  assert.deepEqual(
    UPGRADE_PATHS.map((path) => resolveCalendarUpgradeName(path, {}, {})),
    EXPECTED_NAMES,
  )
})

function parserOptions(harness, locale) {
  const e = harness.exportsBundle
  return {
    dict: harness.dict,
    suppDict: e['supp-dict'],
    ERg: e.ExportRegions || {},
    EC: e.ExportChallenges || {},
    EI: harness.EI,
    nameToImage: harness.nameToImage,
    uniqueNameToName: harness.uniqueNameToName,
    ExportImages: e.ExportImages || {},
    ExportUpgrades: e.ExportUpgrades || {},
    ExportRecipes: e.ExportRecipes || {},
    ExportKeys: e.ExportKeys || {},
    locale,
  }
}

for (const locale of ['en', 'de']) {
  test(`real export calendar upgrade names stay clean in ${locale}`, async () => {
    const harness = await loadRealHarness()
    const parsed = parseWorldstate(rawCalendar, parserOptions(harness, locale))
    const events = parsed.calendar1999[0].days[0].events

    assert.deepEqual(events.map((event) => event.name), EXPECTED_NAMES)
    for (const event of events) {
      assert.ok(event.name)
      assert.ok(!event.name.includes('/Lotus/'))
      assert.notEqual(event.name, 'undefined')
    }
  })
}
