import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import '../../scripts/lib/real-data-harness.mjs';

const { getWeaponBucket } = await import('../../src/lib/inventoryParser.js');

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
