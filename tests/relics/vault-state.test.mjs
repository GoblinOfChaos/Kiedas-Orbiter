import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getRelicCatalog } from '../../src/lib/relicParser.js';
import { BARO_RELIC_NAMES } from '../../src/lib/baroRelics.js';
import { buildRelicPlaces } from '../../src/lib/farmingTargets/relicPlaces.js';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export', 'ExportRelics.json'));
const now = Math.floor(Date.now() / 1000);

function relicBundle(relics) {
  return {
    ExportRelics: relics,
    ExportRewards: {},
    ExportItems: {},
    ExportRecipes: {},
    dict: {},
    uniqueNameToName: {},
  };
}

function relic(era, code, state = {}) {
  const tier = { Lith: 1, Meso: 2, Neo: 3, Axi: 4 }[era];
  return {
    uniqueName: `/Lotus/Types/Game/Projections/T${tier}VoidProjection${code}Bronze`,
    name: `${era} ${code} Relic`,
    relicRewards: [{ rewardName: `/Lotus/Items/${era}${code}` }],
    ...state,
  };
}

test('synthetic: past, missing, and Baro relic vault states are distinct', () => {
  const catalog = getRelicCatalog(relicBundle([
    relic('Lith', 'P1', { vaultedAt: now - 1 }),
    relic('Meso', 'U1'),
    relic('Axi', 'A2'),
  ]));
  const status = new Map(catalog.map((item) => [item.key, item.vaulted]));
  assert.equal(status.get('Lith P1'), true);
  assert.equal(status.get('Meso U1'), null);
  assert.equal(status.get('Axi A2'), false);
});

test('real data: DE vault dates and the Baro exception have the required states', { skip: !haveRealData }, async () => {
  const { exportsBundle } = await loadRealHarness({ locale: 'en' });
  const raw = new Map(Object.entries(exportsBundle.ExportRelics || {}));
  const catalog = getRelicCatalog(exportsBundle, 'en');

  for (const item of catalog) {
    const entry = raw.get(item.uniqueName);
    if (Number.isFinite(entry?.vaultedAt) && entry.vaultedAt > now) {
      assert.notEqual(item.vaulted, null, `${item.key} has a future vault date but is unknown`);
    }
    if (!Number.isFinite(entry?.vaultedAt) && !BARO_RELIC_NAMES.includes(item.key)) {
      assert.equal(item.vaulted, null, `${item.key} has no vault date but is not unknown`);
    }
  }

  for (const name of BARO_RELIC_NAMES) {
    assert.equal(catalog.find((item) => item.key === name)?.vaulted, false, `${name} must not be vaulted`);
  }
});

test('Relics filter keeps unknown relics in All only', () => {
  const relics = [
    { name: 'vaulted', vaulted: true },
    { name: 'available', vaulted: false },
    { name: 'unknown', vaulted: null },
  ];
  const filtered = (filter) => relics.filter((item) => filter === 'all'
    || (filter === 'vaulted' && item.vaulted === true)
    || (filter === 'unvaulted' && item.vaulted === false));

  assert.deepEqual(filtered('vaulted').map((item) => item.name), ['vaulted']);
  assert.deepEqual(filtered('unvaulted').map((item) => item.name), ['available']);
  assert.deepEqual(filtered('all').map((item) => item.name), ['vaulted', 'available', 'unknown']);
});

test('Farming Targets does not mark an unknown relic as obtainable', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('../farming/fixtures/relic-places.json', import.meta.url)));
  const [available] = getRelicCatalog(fixture.exportData);
  const [row] = buildRelicPlaces({ ...fixture, catalog: [{ ...available, vaulted: null }] });

  assert.equal(row.place.vaulted, false);
  assert.equal(row.place.obtainable, false);
  assert.deepEqual(row.place.howToGet, []);
});
