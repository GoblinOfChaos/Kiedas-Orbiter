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

test('folder-specific kinds classify from their Skins/ folder', () => {
  const cases = [
    ['/Lotus/Upgrades/Skins/Effects/ArchonShardEphemera', 'Ephemera'],
    ['/Lotus/Upgrades/Skins/RailJack/DefaultEngines', 'Railjack'],
    ['/Lotus/Upgrades/Skins/Horse/GynfasKaithe', 'Kaithe'],
    ['/Lotus/Upgrades/Skins/Necramech/EschatosNecramechHelmet', 'Necramech'],
    ['/Lotus/Upgrades/Skins/Hoverboard/SomeKDriveScrawl', 'Vehicle'],
    ['/Lotus/Upgrades/Skins/KDrive/VelocipodSkin', 'Vehicle'],
    ['/Lotus/Upgrades/Skins/Kubrows/TaichenKubrowCollar', 'Companion'],
    ['/Lotus/Upgrades/Skins/Catbrows/FurPattern', 'Companion'],
    ['/Lotus/Upgrades/Skins/MoaPet/KiTeerMoaSkin', 'Companion'],
    ['/Lotus/Upgrades/Skins/HolsterCustomizations/DaggerLowerBack', 'Holster'],
    ['/Lotus/Upgrades/Skins/MeleeDangles/AtomicycleKeychainMeleeDangle', 'Melee'],
  ]
  for (const [uniqueName, expected] of cases) {
    assert.equal(cosmeticType(uniqueName, '', 'Skin', families), expected, uniqueName)
  }
})

test('Kubrow and Catbrow armor classify as Companion, not Armor', () => {
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Catbrows/Armor/CatbrowArmorA', '', 'Skin', families),
    'Companion',
  )
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Kubrows/Armor/KubrowArmorA', '', 'Skin', families),
    'Companion',
  )
})

test('unmapped Skins folders stay Other', () => {
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Motorcycle/DichromeLivery', '', 'Skin', families),
    'Other',
  )
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Crowns/LianiaSigna', '', 'Skin', families),
    'Other',
  )
})

test('Sigil kind passthrough', () => {
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Sigils/SomeSigil', '', 'Sigil', families),
    'Sigil',
  )
})
