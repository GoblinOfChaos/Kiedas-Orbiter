import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getAllRelicRewards, getRewardInventoryContext } from '../../src/lib/relicParser.js';
import { parseInventory } from '../../src/lib/inventoryParser.js';
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs';

const inventoryPath = `${DEFAULT_DATA_DIR}/user/inventory.json`;
const haveRealData = fs.existsSync(`${DEFAULT_DATA_DIR}/export/ExportRelics.json`) && fs.existsSync(inventoryPath);

globalThis.window ??= { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

async function contextFor(name) {
  const harness = await loadRealHarness({ locale: 'en' });
  const inventory = parseInventory(JSON.parse(fs.readFileSync(inventoryPath, 'utf8')), harness.exportsBundle, harness.dict, 'en');
  const item = getAllRelicRewards(harness.exportsBundle, 'en').find((entry) => entry.name === name);
  assert.ok(item, `${name} must be a relic reward`);
  return getRewardInventoryContext(item.uniqueName, inventory, harness.exportsBundle, 'en');
}

// 2026-10-23: the overlay's part circles never showed whether the main
// Blueprint was owned (Steflos Prime reward screen at 10:39). Counts depend
// on the live inventory, so only the structure is asserted.
test('real data: a Blueprint reward gets a highlighted main-Blueprint circle first', { skip: !haveRealData }, async () => {
  const context = await contextFor('Steflos Prime Blueprint');
  const first = context.subcomponents[0];
  assert.equal(first.name, 'Steflos Prime Blueprint');
  assert.equal(first.isMainBlueprint, true);
  assert.equal(first.isBlueprintReward, true);
  assert.equal(first.need, 1);
  assert.equal(typeof first.have, 'number');
  assert.ok(context.subcomponents.slice(1).some((part) => part.name === 'Steflos Prime Receiver'),
    'the real parts are still listed after it');
  assert.equal(context.subcomponents.some((part) => part.isDroppedReward), false,
    'the overlay highlights the parent name only when no part is the reward');
});

test('real data: a part reward gets the main-Blueprint circle without taking the highlight', { skip: !haveRealData }, async () => {
  const context = await contextFor('Paris Prime Upper Limb');
  const first = context.subcomponents[0];
  assert.equal(first.name, 'Paris Prime Blueprint');
  assert.equal(first.isMainBlueprint, true);
  assert.equal(first.isBlueprintReward, false);
  const reward = context.subcomponents.find((part) => part.isDroppedReward);
  assert.equal(reward?.name, 'Paris Prime Upper Limb');
});

test('real data: rewards without a part list get no Blueprint circle', { skip: !haveRealData }, async () => {
  const context = await contextFor('Forma Blueprint');
  assert.deepEqual(context.subcomponents, []);
});

// 2026-10-23: a card for a plain part showed the part's own count in the BP chip
// (Lex Prime Receiver read "BP: 2" with 2 receivers owned and 4 Lex Prime
// Blueprints). The BP chip must be the parent Blueprint's inventory count.
test('real data: the BP chip of a part card is the parent Blueprint count, not the part count', { skip: !haveRealData }, async () => {
  const raw = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const owned = (path) => Object.values(raw).flat().reduce((sum, entry) => (
    entry && typeof entry === 'object' && entry.ItemType === path ? sum + (entry.ItemCount ?? 1) : sum), 0);

  for (const name of ['Lex Prime Receiver', 'Paris Prime Upper Limb']) {
    const context = await contextFor(name);
    const blueprint = context.subcomponents.find((part) => part.isMainBlueprint);
    assert.ok(blueprint, name + ' has a main Blueprint circle');
    assert.equal(context.blueprintCount, owned(blueprint.uniqueName.replace('/StoreItems/', '/')), name + ': BP chip');
  }
});

test('real data: the BP chip of a Blueprint card is that Blueprint count', { skip: !haveRealData }, async () => {
  const raw = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const owned = (path) => Object.values(raw).flat().reduce((sum, entry) => (
    entry && typeof entry === 'object' && entry.ItemType === path ? sum + (entry.ItemCount ?? 1) : sum), 0);
  const context = await contextFor('Steflos Prime Blueprint');
  const blueprint = context.subcomponents.find((part) => part.isMainBlueprint);
  assert.equal(context.blueprintCount, owned(blueprint.uniqueName.replace('/StoreItems/', '/')));
});
