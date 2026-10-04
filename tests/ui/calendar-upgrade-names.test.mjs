import assert from 'node:assert/strict'
import test from 'node:test'
import calendarLanguage from '../../src-tauri/data/assets/data/calendar-language.json' with { type: 'json' }
import { loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'
import { parseWorldstate } from '../../src/lib/worldstateParser.js'
import {
  getCalendarLanguageText,
  cleanGameText,
} from '../../src/lib/calendarFormatting.js'
import {
  resolveCalendarUpgradeDescription,
  resolveCalendarUpgradeName,
  resolveCalendarUpgradeTypeLabel,
} from '../../src/lib/warframeUtils.js'
import rawCalendar from '../fixtures/calendar-worldstate.json' with { type: 'json' }

const LEAVES = [
  'Armor',
  'BlastEveryXShots',
  'CompanionsRadiationChance',
  'ElectricStatusDamageAndChance',
  'EnergyRestoration',
  'GasChanceToPrimaryAndSecondary',
  'MeleeAttackSpeed',
  'RadialJavelinOnHeavy',
  'AbilityStrength',
]

const pathFor = (leaf) => `/Lotus/Upgrades/Calendar/${leaf}`
const nameKey = (leaf) => `/Lotus/Language/1999/${leaf}Name`
const descKey = (leaf) => `/Lotus/Language/1999/${leaf}Desc`

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

test('cleanGameText cleans the real German and English strings for every verified leaf', () => {
  for (const locale of ['de', 'en']) {
    for (const leaf of LEAVES) {
      const raw = calendarLanguage.locales[locale][descKey(leaf)]
      const cleaned = cleanGameText(raw)
      assert.equal(cleaned, resolveCalendarUpgradeDescription(pathFor(leaf), locale))
      assert.ok(!cleaned.includes('<'))
      assert.ok(!cleaned.includes('|'))
      assert.ok(!cleaned.includes('\u00a0'))
    }
  }

  assert.equal(
    cleanGameText(calendarLanguage.locales.de[descKey('ElectricStatusDamageAndChance')]),
    'Gewährt allen Waffen 25 % Statusschaden und Elektrizität-Statuschance.',
  )
})

test('real calendar language gives the required German and English names', () => {
  assert.equal(resolveCalendarUpgradeName(pathFor('ElectricStatusDamageAndChance'), {}, {}, 'de'), 'Abgefüllter Blitz')
  assert.equal(resolveCalendarUpgradeName(pathFor('Armor'), {}, {}, 'de'), 'Dicke Haut')
  assert.equal(resolveCalendarUpgradeName(pathFor('ElectricStatusDamageAndChance'), {}, {}, 'en'), 'Bottled Lightning')
  assert.equal(resolveCalendarUpgradeName(pathFor('Armor'), {}, {}, 'en'), 'Thick Skin')
})

test('all 15 locales have a game Name for every verified leaf', () => {
  for (const locale of Object.keys(calendarLanguage.locales)) {
    for (const leaf of LEAVES) {
      const expected = calendarLanguage.locales[locale][nameKey(leaf)]
      assert.equal(typeof expected, 'string', `${locale} is missing ${leaf}`)
      assert.equal(resolveCalendarUpgradeName(pathFor(leaf), {}, {}, locale), cleanGameText(expected))
    }
  }
})

test('calendar language fallback is locale, then English, then cleaned path leaf', () => {
  const path = pathFor('SyntheticUpgrade')
  const source = {
    locales: {
      de: { '/Lotus/Language/1999/SyntheticUpgradeName': '<UP_MINOR> Deutsche Bezeichnung' },
      en: { '/Lotus/Language/1999/SyntheticUpgradeName': 'English Name' },
    },
  }
  assert.equal(getCalendarLanguageText(path, 'Name', 'de', source), 'Deutsche Bezeichnung')
  assert.equal(getCalendarLanguageText(path, 'Name', 'fr', source), 'English Name')
  assert.equal(getCalendarLanguageText(pathFor('MissingUpgrade'), 'Name', 'de', source), '')
  assert.equal(resolveCalendarUpgradeName(pathFor('MissingUpgrade'), {}, {}, 'de'), 'Missing Upgrade')
})

test('calendar upgrade type uses the game minor label when the event has no discriminator', () => {
  assert.equal(resolveCalendarUpgradeTypeLabel('de'), 'Hex-Boost Modifikator')
  assert.equal(resolveCalendarUpgradeTypeLabel('en'), 'Hex Boost Override')
})

for (const locale of ['de', 'en']) {
  test(`real worldstate calendar fixture resolves every upgrade name in ${locale}`, async () => {
    const harness = await loadRealHarness({ locale: 'en' })
    const parsed = parseWorldstate(rawCalendar, parserOptions(harness, locale))
    const events = parsed.calendar1999[0].days.flatMap((day) => day.events)

    assert.ok(events.length > 0)
    for (const event of events) {
      const leaf = event.raw.upgrade.split('/').at(-1)
      assert.equal(event.name, cleanGameText(calendarLanguage.locales[locale][nameKey(leaf)]))
      assert.ok(!event.name.includes('/Lotus/'))
      assert.notEqual(event.name, leaf)
      assert.ok(event.description)
      assert.equal(event.typeLabel, resolveCalendarUpgradeTypeLabel(locale))
    }
  })
}
