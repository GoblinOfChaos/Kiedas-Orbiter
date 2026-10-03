import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fuzzyMatchReward, getAllRelicRewards } from '../../src/lib/relicParser.js';
import { DEFAULT_DATA_DIR, loadRealHarness } from '../../scripts/lib/real-data-harness.mjs';

const haveRealData = fs.existsSync(`${DEFAULT_DATA_DIR}/export/ExportRelics.json`);
const candidate = (name) => ({ name });

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

test('mixed-case Pascal OCR still matches Akbronco', () => {
  const match = fuzzyMatchReward(
    'AkbrOnco Prime Blueprint',
    [candidate('Akbronco Prime Blueprint')]
  );

  assert.equal(match?.name, 'Akbronco Prime Blueprint');
});

test('correctly cased Akbronco OCR still matches', () => {
  const match = fuzzyMatchReward(
    'Akbronco Prime Blueprint',
    [candidate('Akbronco Prime Blueprint')]
  );

  assert.equal(match?.name, 'Akbronco Prime Blueprint');
});

test('case and missing spaces do not prevent an exact reward match', () => {
  const match = fuzzyMatchReward(
    'AKBRONCOPRIMEBLUEPRINT',
    [candidate('Akbronco Prime Blueprint')]
  );

  assert.equal(match?.name, 'Akbronco Prime Blueprint');
});

test('different root words remain separated', () => {
  assert.equal(
    fuzzyMatchReward('Afentis Prime Blueprint', [candidate('Paris Prime Blueprint')]),
    null
  );
});

test('extra OCR words prefer the specific chassis reward', () => {
  const match = fuzzyMatchReward(
    'Yareli Prime Chassis Blueprint',
    [
      candidate('Yareli Prime Blueprint'),
      candidate('Yareli Prime Chassis Blueprint')
    ]
  );

  assert.equal(match?.name, 'Yareli Prime Chassis Blueprint');
});

test('a unique trailing OCR fragment matches its candidate', () => {
  const match = fuzzyMatchReward(
    'Chassis Blueprint',
    [candidate('Yareli Prime Chassis Blueprint')]
  );

  assert.equal(match?.name, 'Yareli Prime Chassis Blueprint');
});

test('an ambiguous trailing OCR fragment remains unmatched', () => {
  assert.equal(
    fuzzyMatchReward(
      'Chassis Blueprint',
      [
        candidate('Yareli Prime Chassis Blueprint'),
        candidate('Voruna Prime Chassis Blueprint')
      ]
    ),
    null
  );
});

test('a one-word OCR fragment remains unmatched', () => {
  assert.equal(
    fuzzyMatchReward('Blueprint', [candidate('Yareli Prime Chassis Blueprint')]),
    null
  );
});
