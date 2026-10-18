import test from 'node:test'
import assert from 'node:assert/strict'
import { cosmeticType, SKIN_FOLDER_FAMILY_OVERRIDES } from '../../src/lib/cosmeticType.js'

const families = new Set(['lavos', 'excalibur', 'ivara', 'equinox', 'saryn', 'banshee', 'hydroid', 'umbra'])

test('Operator skins classify as Operator', () => {
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Operator/Hoods/HoodAdultInfested', '', 'Skin', families),
    'Operator',
  )
})

test('Clan badge/emblem skins classify as Emblem', () => {
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Clan/ShadowgrapherEventBadgeItem', '', 'Skin', families),
    'Emblem',
  )
})

test('legacy Warframe skin folders remap to Warframe', () => {
  for (const folder of Object.keys(SKIN_FOLDER_FAMILY_OVERRIDES)) {
    assert.equal(
      cosmeticType(`/Lotus/Upgrades/Skins/${folder[0].toUpperCase()}${folder.slice(1)}/SomeSkin`, '', 'Skin', families),
      'Warframe',
      folder,
    )
  }
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Archer/IvaraDeluxeSuit', '', 'Skin', families),
    'Warframe',
  )
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Hydroid/HydroidDeluxeSuit', '', 'Skin', families),
    'Warframe',
  )
})

test('unrelated Skins folders stay Other', () => {
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Effects/ArchonShardEphemera', '', 'Skin', families),
    'Other',
  )
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/RailJack/DefaultEngines', '', 'Skin', families),
    'Other',
  )
})

test('Sigil kind passthrough', () => {
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Sigils/SomeSigil', '', 'Sigil', families),
    'Sigil',
  )
})
