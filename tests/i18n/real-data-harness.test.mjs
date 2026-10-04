import test from 'node:test'
import assert from 'node:assert/strict'
import { detectDictLocale, makeHarness } from '../../scripts/lib/real-data-harness.mjs'

const english = {
  '/Lotus/Language/Locations/Mars': 'Mars',
  '/Lotus/Language/Locations/Earth': 'Earth',
  '/Lotus/Language/Items/BlueprintAndItem': '|ITEM| Blueprint',
  '/Lotus/Language/Game/Faction_GrineerUC': 'Grineer',
  '/Lotus/Language/Game/Faction_CorpusUC': 'Corpus',
  '/Lotus/Language/Menu/ItemInventory_SlotsSuit': 'Warframe Slot',
}

test('real-data harness reports English dictionary evidence without using settings', () => {
  const result = detectDictLocale(english)
  assert.equal(result.locale, 'en')
  assert.ok(result.evidence.every((probe) => probe.match))
  const harness = makeHarness({ dict: english })
  assert.equal(harness.isEnglishDict, true)
  assert.equal(harness.sourceDictLocale, 'en')
})

test('real-data harness reports a translated dictionary as other', () => {
  const result = detectDictLocale({ ...english, '/Lotus/Language/Items/BlueprintAndItem': '|ITEM| Bauplan' })
  assert.equal(result.locale, 'other')
  assert.equal(result.evidence.find((probe) => probe.key.endsWith('BlueprintAndItem')).match, false)
})
