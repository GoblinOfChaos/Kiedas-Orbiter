import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { makeHarness } from '../../scripts/lib/real-data-harness.mjs';

const { getWeaponBucket, parseInventory } = await import('../../src/lib/inventoryParser.js');

const weaponFixtures = [
  { uniqueName: '/Lotus/Weapons/Tenno/LongGuns/TestRifle', productCategory: 'LongGuns', masteryReq: 8 },
  { uniqueName: '/Lotus/Weapons/Tenno/Pistol/TestPistol', productCategory: 'Pistols', masteryReq: 0, noise: true },
  { uniqueName: '/Lotus/Weapons/Tenno/Melee/TestBlade', productCategory: 'Melee', masteryReq: 5 },
  { uniqueName: '/Lotus/Types/Friendly/Pets/MoaPets/MoaPetParts/TestPayload', productCategory: 'Pistols', masteryReq: 0, damagePerShot: [1] },
  { uniqueName: '/Lotus/Powersuits/Fairy/FlightSword', productCategory: 'SpecialItems', slot: 5, masteryReq: 0, damagePerShot: [1] },
  { uniqueName: '/Lotus/Weapons/Tenno/Bayonet/TnBayonetMeleeWeapon', productCategory: 'Melee', masteryReq: 14 },
];

test('DE weapon bucket uses productCategory/slot without admitting internal weapon definitions', () => {
  assert.deepEqual(weaponFixtures.map((entry) => getWeaponBucket(entry, entry.uniqueName)), ['primary', 'secondary', 'melee', null, null, null]);
  assert.equal(getWeaponBucket({ productCategory: 'Melee', damagePerShot: [1], masteryReq: 4 }, '/Lotus/Weapons/Tenno/Melee/TestBlade'), 'melee');
  // Doppelganger Grimoire: Pistols but slot 5 -> not a player weapon; the real Grimoire (slot 0) stays.
  assert.equal(getWeaponBucket({ productCategory: 'Pistols', slot: 5, masteryReq: 10, noise: 'ALARMING' }, '/Lotus/Weapons/Tenno/Grimoire/TnDoppelgangerGrimoire'), null);
  assert.equal(getWeaponBucket({ productCategory: 'Pistols', slot: 0, masteryReq: 10 }, '/Lotus/Weapons/Tenno/Grimoire/TnGrimoire'), 'secondary');
  // Vinquibus: a real masterable rifle that lives under /Bayonet/; attachment definitions (masteryReq 0) stay excluded.
  assert.equal(getWeaponBucket({ productCategory: 'LongGuns', masteryReq: 14, codexSecret: false, noise: 'ALARMING' }, '/Lotus/Weapons/Tenno/Bayonet/TnBayonetRifleWeapon'), 'primary');
  assert.equal(getWeaponBucket({ productCategory: 'LongGuns', masteryReq: 0, noise: 'ALARMING' }, '/Lotus/Weapons/Tenno/Bayonet/TnBayonetAttachment'), null);
  assert.equal(getWeaponBucket({ slot: 0, masteryReq: 4 }, '/Lotus/Weapons/Tenno/Pistol/TestPistol'), 'secondary');
});

test('inventoryParser craftable projection carries outputQty from ExportRecipes.num', async () => {
  const parserPath = fileURLToPath(new URL('../../src/lib/inventoryParser.js', import.meta.url));
  const source = await readFile(parserPath, 'utf8');
  const craftableStart = source.indexOf('craftable: (() => {');
  const craftableEnd = source.indexOf('    })(),', craftableStart);

  assert.ok(craftableStart >= 0, 'craftable builder must exist');
  assert.ok(craftableEnd > craftableStart, 'craftable builder must have an end');
  const craftableSource = source.slice(craftableStart, craftableEnd);
  assert.match(craftableSource, /outputQty:\s+recipe\.num\s+===\s+undefined\s+\?\s+1\s+:\s+recipe\.num/);
});

test('craftable_extra carries every recipe the equipment catalog excludes, grouped by foundryGroup', () => {
  const harness = makeHarness({
    dict: {
      '/Lotus/Language/HelminthAbility': 'Helminth Ability',
      '/Lotus/Language/SomeQuestKey': 'Quest Key',
      '/Lotus/Language/TestSkin': 'Test Skin',
      '/Lotus/Language/TestBait': 'Test Bait',
    },
    ExportImages: {},
    ExportWarframes: {},
    ExportWeapons: {},
    ExportResources: [
      { uniqueName: '/Lotus/Types/Restoratives/TestBait', name: '/Lotus/Language/TestBait', parentName: '/Lotus/Types/Restoratives/FishBait/' },
    ],
    ExportCustoms: [
      { uniqueName: '/Lotus/Upgrades/Skins/TestSkin', name: '/Lotus/Language/TestSkin', productCategory: 'WeaponSkins' },
    ],
    ExportRecipes: {
      '/Lotus/Types/Recipes/AbilityOverrides/HelminthAbilityBlueprint': {
        resultType: '/Lotus/Powersuits/Abilities/HelminthAbility',
        ingredients: [],
      },
      '/Lotus/Types/Recipes/Quests/SomeQuestKeyBlueprint': {
        resultType: '/Lotus/Language/SomeQuestKey',
        ingredients: [],
      },
      '/Lotus/Types/Recipes/WarframeRecipes/GhostChassisBlueprint': {
        resultType: '/Lotus/Powersuits/Ghost/GhostChassis',
        ingredients: [],
      },
      '/Lotus/Types/Recipes/Skins/TestSkinBlueprint': {
        resultType: '/Lotus/Upgrades/Skins/TestSkin',
        ingredients: [],
      },
      '/Lotus/Types/Recipes/Restoratives/TestBaitBlueprint': {
        resultType: '/Lotus/Types/Restoratives/TestBait',
        ingredients: [],
      },
    },
    WI_Warframes: {},
    WI_Resources: {},
    AcquisitionItems: [],
  });
  const parsed = parseInventory({}, harness.exportsBundle, harness.dict, 'en', null);

  const byBpKey = new Map(parsed.craftable_extra.map((entry) => [entry.uniqueName, entry]));
  assert.equal(byBpKey.get('/Lotus/Types/Recipes/AbilityOverrides/HelminthAbilityBlueprint')?.foundryGroup, 'helminth');
  assert.equal(byBpKey.get('/Lotus/Types/Recipes/Quests/SomeQuestKeyBlueprint')?.foundryGroup, 'quest');
  assert.equal(byBpKey.get('/Lotus/Types/Recipes/WarframeRecipes/GhostChassisBlueprint')?.foundryGroup, 'component_blueprints');
  assert.equal(byBpKey.get('/Lotus/Types/Recipes/Skins/TestSkinBlueprint')?.foundryGroup, 'skins');
  assert.equal(byBpKey.get('/Lotus/Types/Recipes/Restoratives/TestBaitBlueprint')?.foundryGroup, 'consumables');

  // None of the above should also appear in the main equipment-driven catalog.
  const craftableBpKeys = new Set(parsed.craftable.map((entry) => entry.uniqueName));
  for (const bpKey of byBpKey.keys()) assert.ok(!craftableBpKeys.has(bpKey), `${bpKey} must not be in both craftable and craftable_extra`);
});
