import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseInventory } from '../../src/lib/inventoryParser.js';
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs';

const inventoryPath = `${DEFAULT_DATA_DIR}/user/inventory.json`;
const haveRealData = fs.existsSync(`${DEFAULT_DATA_DIR}/export/ExportRelics.json`) && fs.existsSync(inventoryPath);

globalThis.window ??= { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

// 2026-10-23: searching an Exalted weapon (Artemis Bow, Glory, ...) on the
// Inventory "All" tab found nothing. The 10-19 change listed them in the
// Weapons tab only; `all` is built from the primary/secondary/melee lists and
// the Exalted weapons have no weapon slot, so All never saw them (37 records:
// 36 Exalted weapons and the story Grimoire).
test('real data: every record listed in the Weapons tab is also in All', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' });
  const inventory = parseInventory(JSON.parse(fs.readFileSync(inventoryPath, 'utf8')), harness.exportsBundle, harness.dict, 'en');

  const inAll = new Set(inventory.all.map((item) => item.unique_name));
  const missing = inventory.weapons.filter((item) => !inAll.has(item.unique_name)).map((item) => item.name);
  assert.deepEqual(missing, [], `Weapons-tab records missing from All: ${missing.slice(0, 8).join(', ')}`);

  const exalted = inventory.all.filter((item) => item.exalted_weapon === true);
  assert.ok(exalted.length >= 30, `expected the Exalted weapons in All, found ${exalted.length}`);
  for (const name of ['Artemis Bow', 'Glory', 'Noctua']) {
    assert.ok(inventory.all.some((item) => item.name === name), `${name} must be searchable in All`);
  }
});

test('real data: All lists no record twice', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness({ locale: 'en' });
  const inventory = parseInventory(JSON.parse(fs.readFileSync(inventoryPath, 'utf8')), harness.exportsBundle, harness.dict, 'en');
  const seen = new Set();
  const duplicates = [];
  for (const item of inventory.all) {
    if (seen.has(item.unique_name)) duplicates.push(item.name);
    seen.add(item.unique_name);
  }
  assert.deepEqual(duplicates, []);
});

test('real data: no record that can never earn mastery counts toward mastery or would read "Unmastered"', { skip: !haveRealData }, async () => {
  const { awardsMastery, neverAwardsMastery } = await import('../../src/lib/masteryState.js');
  const harness = await loadRealHarness({ locale: 'en' });
  const inventory = parseInventory(JSON.parse(fs.readFileSync(inventoryPath, 'utf8')), harness.exportsBundle, harness.dict, 'en');

  const exalted = inventory.all.filter((item) => item.exalted_weapon === true);
  assert.ok(exalted.length >= 30);
  for (const item of exalted) {
    assert.equal(neverAwardsMastery(item), true, item.name + ' must be treated as never earning mastery');
    assert.equal(awardsMastery(item), false, item.name + ' must not count toward mastery');
  }
  // 2026-10-23: Dex Pixia (a non-mastery Exalted weapon) read "Unmastered" on its card.
  const dexPixia = inventory.all.find((item) => item.name === 'Dex Pixia');
  assert.ok(dexPixia, 'Dex Pixia must be listed');
  assert.equal(neverAwardsMastery(dexPixia), true);
  // A normal masterable weapon is unaffected.
  const burston = inventory.all.find((item) => item.name === 'Burston');
  assert.equal(neverAwardsMastery(burston), false);
});
