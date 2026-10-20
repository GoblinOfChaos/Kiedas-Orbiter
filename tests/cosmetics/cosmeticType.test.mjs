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
    ['/Lotus/Upgrades/Skins/Motorcycle/DichromeLivery', 'Vehicle'],
    ['/Lotus/Upgrades/Skins/Kahl/RhunrShoulderPlate', 'Armor'],
    ['/Lotus/Upgrades/Skins/Crowns/LianiaSigna', 'Signa'],
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
    cosmeticType('/Lotus/Upgrades/Skins/Mustache/TheGentleman', '', 'Skin', families),
    'Other',
  )
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/TextureOverrides/OxiumGloss', '', 'Skin', families),
    'Other',
  )
})

test('Sigil kind passthrough', () => {
  assert.equal(
    cosmeticType('/Lotus/Upgrades/Skins/Sigils/SomeSigil', '', 'Sigil', families),
    'Sigil',
  )
})

test('ExportCustoms cosmetics outside /Upgrades/Skins/ are included and classified', async () => {
  const { isCosmeticCustomsEntry, cosmeticType } = await import('../../src/lib/cosmeticType.js')
  const fur = '/Lotus/Types/Game/CatbrowPet/Patterns/CatbrowPetPatternA'
  const scarf = '/Lotus/Characters/Tenno/Accessory/Scarves/U17IntermScarf/U17IntermScarfItem'
  const sword = '/Lotus/Weapons/Tenno/Melee/AxeML/StavikaDualSwordSkin'
  for (const id of [fur, scarf, sword]) assert.ok(isCosmeticCustomsEntry(id), id)
  // Body types and Lotus*Customization records are base types, not items.
  assert.ok(!isCosmeticCustomsEntry('/Lotus/Types/Game/CatbrowPet/BodyTypes/CatbrowPetKittenBodyCustomization'))
  assert.ok(!isCosmeticCustomsEntry('/Lotus/Types/Game/LotusWarframeCustomization'))
  assert.equal(cosmeticType(fur, '', 'Skin', null), 'Companion')
  assert.equal(cosmeticType(scarf, '', 'Skin', null), 'Syandana')
  assert.equal(cosmeticType(sword, '', 'Skin', null), 'Melee')
})

test('a Warframe\'s base skin and helmet are not listed as cosmetics', async () => {
  const { isCosmeticCustomsEntry, BASE_APPEARANCE_ITEMS } = await import('../../src/lib/cosmeticType.js')
  assert.equal(BASE_APPEARANCE_ITEMS.size, 5)
  for (const id of BASE_APPEARANCE_ITEMS) assert.equal(isCosmeticCustomsEntry(id), false, id)
  assert.equal(isCosmeticCustomsEntry('/Lotus/Upgrades/Skins/Geode/GeodeHelmet'), true)
})
