import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fuzzyMatchReward, getAllRelicRewards } from '../../src/lib/relicParser.js';
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs';

const haveRealData = fs.existsSync(`${DEFAULT_DATA_DIR}/export/ExportRelics.json`);

test('real relic rewards match the repaired Sevagoth Prime OCR phrase', { skip: !haveRealData }, async () => {
  const { exportsBundle } = await loadRealHarness();
  const candidates = getAllRelicRewards(exportsBundle);
  const match = fuzzyMatchReward('Sevagoth prime NeuropticsBlueprint', candidates);

  assert.ok(match, 'the complete OCR phrase should match a real relic reward');
  assert.equal(match.name, 'Sevagoth Prime Neuroptics Blueprint');
});

test('a Neuroptics-only OCR fragment remains unmatched', { skip: !haveRealData }, async () => {
  const { exportsBundle } = await loadRealHarness();
  const candidates = getAllRelicRewards(exportsBundle);

  assert.equal(fuzzyMatchReward('NeuropticsBlueprint', candidates), null);
});
