import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { applyDeLocale } from '../../src/lib/deLocale.js'
import { buildImageMaps } from '../../src/lib/exportBundle.js'
import { parseWorldstate } from '../../src/lib/worldstateParser.js'
import { resolveNode } from '../../src/lib/warframeUtils.js'
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs'

const exportDir = path.join(DEFAULT_DATA_DIR, 'export')
const localizedRegions = {
  de: JSON.parse(fs.readFileSync(path.join(exportDir, 'de/ExportRegions_de.json'), 'utf8')),
  ja: JSON.parse(fs.readFileSync(path.join(exportDir, 'de/ExportRegions_ja.json'), 'utf8')),
  ko: JSON.parse(fs.readFileSync(path.join(exportDir, 'de/ExportRegions_ko.json'), 'utf8')),
}
const localizedResources = JSON.parse(fs.readFileSync(path.join(exportDir, 'de/ExportResources_ko.json'), 'utf8'))

function recordsOf(table, category) {
  if (Array.isArray(table)) return table
  if (Array.isArray(table?.[category])) return table[category]
  return Object.entries(table || {}).map(([uniqueName, record]) => (
    record && typeof record === 'object' ? { uniqueName: record.uniqueName || uniqueName, ...record } : null
  )).filter(Boolean)
}

function regionMap(table) {
  const map = {}
  for (const record of recordsOf(table, 'ExportRegions')) {
    if (record.uniqueName) map[record.uniqueName] = record
    if (record.name) map[record.name] = record
    if (record.regionIndex !== undefined) map[`SolNode${record.regionIndex}`] = record
  }
  return map
}

function withRegionLocale(exportsBundle, locale) {
  return applyDeLocale(exportsBundle, {
    DeLocale_ExportRegions: localizedRegions[locale],
  }, locale)
}

function dashboardFixture() {
  const rewardFor = (itemType) => ({ CountedItems: [{ ItemType: itemType, ItemCount: 3 }] })
  return {
    Invasions: [
      {
        _id: 'invasion-1', Node: 'SolNode189', Count: 0, Goal: 100, Completed: false,
        AttackerMissionInfo: { faction: 'FC_GRINEER' },
        DefenderMissionInfo: { faction: 'FC_INFESTED' },
        AttackerReward: { Items: ['/Lotus/Types/Recipes/Weapons/SnipetronVandalStockBlueprint'] },
      },
      {
        _id: 'invasion-2', Node: 'SolNode144', Count: 0, Goal: 100, Completed: false,
        AttackerMissionInfo: { faction: 'FC_CORPUS' },
        DefenderMissionInfo: { faction: 'FC_GRINEER' },
        AttackerReward: rewardFor('/Lotus/Types/Items/Research/ChemComponent'),
      },
      {
        _id: 'invasion-3', Node: 'SettlementNode14', Count: 0, Goal: 100, Completed: false,
        AttackerMissionInfo: { faction: 'FC_MURMUR' },
        DefenderMissionInfo: { faction: 'FC_CORPUS' },
        AttackerReward: rewardFor('/Lotus/Types/Items/Research/EnergyComponent'),
      },
    ],
  }
}

function parseFixture(bundle, dict, locale) {
  const { uniqueNameToName } = buildImageMaps(bundle)
  return parseWorldstate(dashboardFixture(), {
    dict,
    suppDict: {},
    ERg: regionMap(bundle.ExportRegions),
    EC: {},
    EI: {},
    nameToImage: {},
    uniqueNameToName,
    ES: {},
    ENWRawRewards: [],
    ExportImages: {},
    ExportUpgrades: {},
    ExportRecipes: bundle.ExportRecipes || {},
    ExportKeys: {},
    locale,
  })
}

test('real DE region overlays resolve every node id to a name in English, German, Japanese and Korean', async () => {
  const { exportsBundle, dict, sourceDictLocale } = await loadRealHarness({ locale: 'en' })
  for (const [locale, bundle] of Object.entries({
    en: exportsBundle,
    de: withRegionLocale(exportsBundle, 'de'),
    ja: withRegionLocale(exportsBundle, 'ja'),
    ko: withRegionLocale(exportsBundle, 'ko'),
  })) {
    const regions = recordsOf(bundle.ExportRegions, 'ExportRegions')
    assert.ok(regions.length > 0, `${locale}: no ExportRegions records`)
    const ERg = regionMap(bundle.ExportRegions)
    for (const record of regions) {
      const id = record.uniqueName
      const result = resolveNode(id, dict, ERg)
      if (result === id && sourceDictLocale !== 'en') {
        console.log(`skip: dictionary is ${sourceDictLocale}; English export cache has no name for ${locale} ${id}`)
        continue
      }
      assert.doesNotMatch(result, /^(?:SolNode|ClanNode|SettlementNode|HubNode|[A-Za-z]+Node)\d+$/, `${locale} ${id} -> ${result}`)
    }
  }
})

test('factions use dictionary keys when available and English fallback when absent', () => {
  const localized = {
    '/Lotus/Language/Game/Faction_CorpusUC': 'DICT_CORPUS',
    '/Lotus/Language/Game/Faction_GrineerUC': 'DICT_GRINEER',
    '/Lotus/Language/Game/Faction_InfestationUC': 'DICT_INFESTED',
    '/Lotus/Language/Game/Faction_MITW': 'DICT_MURMUR',
  }
  assert.equal(resolveNode('FC_CORPUS', localized, {}), 'DICT_CORPUS')
  assert.equal(resolveNode('FC_GRINEER', localized, {}), 'DICT_GRINEER')
  assert.equal(resolveNode('FC_INFESTED', localized, {}), 'DICT_INFESTED')
  assert.equal(resolveNode('FC_MURMUR', localized, {}), 'DICT_MURMUR')
  assert.equal(resolveNode('FC_CORPUS', {}, {}), 'Corpus')
})

test('real Korean DE item exports localize invasion rewards and dictionary blueprint templates', async () => {
  const { exportsBundle, dict } = await loadRealHarness({ locale: 'en' })
  const koBundle = applyDeLocale(
    exportsBundle,
    { DeLocale_ExportRegions: localizedRegions.ko, DeLocale_ExportResources: localizedResources },
    'ko',
  )
  const koDict = {
    ...dict,
    '/Lotus/Language/Items/BlueprintAndItem': '|ITEM| 설계도',
    '/Lotus/Language/Game/Faction_CorpusUC': 'DICT_CORPUS',
    '/Lotus/Language/Game/Faction_GrineerUC': 'DICT_GRINEER',
    '/Lotus/Language/Game/Faction_InfestationUC': 'DICT_INFESTED',
    '/Lotus/Language/Game/Faction_MITW': 'DICT_MURMUR',
  }
  const ko = parseFixture(koBundle, koDict, 'ko')
  const koRewards = ko.invasions.flatMap((row) => [row.attacker.rewardText, row.defender.rewardText]).filter(Boolean).join(' | ')
  assert.match(koRewards, /Snipetron Vandal Stock 설계도/)
  assert.match(koRewards, /데토나이트 인젝터/)
  assert.match(koRewards, /필드론/)
  assert.deepEqual(ko.invasions.map((row) => row.node), ['Naga', 'Exta', 'Shklovsky'])
  assert.deepEqual(ko.invasions.map((row) => row.attacker.faction), ['DICT_GRINEER', 'DICT_CORPUS', 'DICT_MURMUR'])

  const en = parseFixture(exportsBundle, { ...dict, '/Lotus/Language/Items/BlueprintAndItem': '|ITEM| Blueprint' }, 'en')
  assert.match(en.invasions[0].attacker.rewardText, /^Snipetron Vandal Stock Blueprint$/)
  assert.match(en.invasions[1].attacker.rewardText, /3× Detonite Injector/)
  assert.match(en.invasions[2].attacker.rewardText, /3× Fieldron/)
})
