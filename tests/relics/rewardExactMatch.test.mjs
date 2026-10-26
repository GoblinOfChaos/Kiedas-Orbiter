import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { exactMatchReward, fuzzyMatchReward, getAllRelicRewards, matchRewardText } from '../../src/lib/relicParser.js';
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs';

const haveRealData = fs.existsSync(`${DEFAULT_DATA_DIR}/export/ExportRelics.json`);
const candidate = (name) => ({ name });

test('exactMatchReward ignores case, punctuation and spacing but never accepts a near-miss', () => {
  const pool = [candidate('Braton Prime Barrel'), candidate('Braton Prime Stock')];
  assert.equal(exactMatchReward('Braton Prime Stock', pool)?.name, 'Braton Prime Stock');
  assert.equal(exactMatchReward('BRATON  PRIME  STOCK.', pool)?.name, 'Braton Prime Stock');
  assert.equal(exactMatchReward('Braton Prime Receiver', pool), null);
  assert.equal(exactMatchReward('', pool), null);
  assert.equal(exactMatchReward('Braton Prime Stock', []), null);
});

// 2026-10-23 17:58 and 18:13: the scanner read the name correctly, but the
// squad pool did not hold the real item, so the fuzzy match returned the
// closest other part of the same weapon.
test('a squad pool missing the real part no longer produces a near-miss part', () => {
  const squadPool = [candidate('Braton Prime Barrel'), candidate('Braton Prime Blueprint')];
  const catalog = [...squadPool, candidate('Braton Prime Stock')];

  const oldResult = fuzzyMatchReward('Braton Prime Stock', squadPool);
  assert.notEqual(oldResult?.name, 'Braton Prime Stock',
    'the squad-pool fuzzy match alone returns a different part: this is what the exact match guards against');
  assert.equal(matchRewardText('Braton Prime Stock', squadPool, catalog)?.name, 'Braton Prime Stock');
});

test('the squad pool still wins when it holds the exact name', () => {
  const squadPool = [{ name: 'Cedo Prime Barrel', ducats: 45, from: 'squad' }];
  const catalog = [{ name: 'Cedo Prime Barrel', ducats: 45, from: 'catalog' }];
  assert.equal(matchRewardText('Cedo Prime Barrel', squadPool, catalog)?.from, 'squad');
});

test('fuzzy matching still handles OCR that is not an exact name', () => {
  const squadPool = [candidate('Styanax Prime Systems Blueprint'), candidate('Styanax Prime Blueprint')];
  assert.equal(matchRewardText('Styanax Prime Systems lueint', squadPool, squadPool)?.name,
    'Styanax Prime Systems Blueprint');
});

test('real data: the three wrong cards from 2026-10-23 resolve to the printed item', { skip: !haveRealData }, async () => {
  const { exportsBundle } = await loadRealHarness({ locale: 'en' });
  const catalog = getAllRelicRewards(exportsBundle);
  const emptySquadPool = [];

  for (const printed of ['Braton Prime Stock', 'Cedo Prime Barrel', 'Styanax Prime Systems Blueprint']) {
    assert.equal(matchRewardText(printed, emptySquadPool, catalog)?.name, printed);
  }
  // The scanner text after the apostrophe fix keeps the word "Systems". With
  // no squad pool the overlay fuzzy-matches against the catalog itself.
  for (const read of ['Styanax Prime Systems lent', 'Styanax Prime Systems lueint', 'Styanax Prime Systems lueprintw']) {
    assert.equal(matchRewardText(read, catalog, catalog)?.name, 'Styanax Prime Systems Blueprint', read);
  }
});
