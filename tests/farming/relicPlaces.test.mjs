import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildRelicPlaces } from '../../src/lib/farmingTargets/relicPlaces.js';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/relic-places.json', import.meta.url)));

test('ranks relic coverage, carries owned refinements, and preserves verified chances', () => {
  const rows = buildRelicPlaces(fixture);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].place.name, 'Lith A1 Relic');
  assert.deepEqual(rows[0].place.refinements, { Intact: 2, Exceptional: 1, Flawless: 0, Radiant: 1 });
  assert.equal(rows[0].coveredItems[0].chances.Intact, 0.02);
  assert.equal(rows[0].coveredItems[0].chances.Radiant, 0.1);
  assert.deepEqual(rows[0].place.sources.map((source) => source.name), ['Void Capture']);
});

test('shows vaulted coverage honestly without making it obtainable', () => {
  const row = buildRelicPlaces(fixture)[1];
  assert.equal(row.place.vaulted, true);
  assert.equal(row.place.obtainable, false);
  assert.deepEqual(row.place.howToGet, []);
});
