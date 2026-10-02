import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeRelicEntry, relicRewardPool } from '../../src/lib/relicEntry.js';
import { getAllRelicRewards, getRelicCatalog } from '../../src/lib/relicParser.js';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';

const newSchema = {
  name: 'Lith A13 Relic',
  uniqueName: '/Lotus/Types/Game/Projections/T1VoidProjectionCitrinePrimeAGold',
  relicRewards: [
    { rewardName: '/Lotus/StoreItems/Types/Recipes/Weapons/AlternoxPrimeBlueprint', rarity: 'RARE', itemCount: 1 },
    { rewardName: '/Lotus/StoreItems/Types/Recipes/WarframeRecipes/GyrePrimeChassisBlueprint', rarity: 'UNCOMMON', itemCount: 1 },
  ],
};

test('new-schema relic yields era, code, quality, icon and rewards from name/path/relicRewards', () => {
  const n = normalizeRelicEntry(newSchema, newSchema.uniqueName);
  assert.equal(n.era, 'Lith');
  assert.equal(n.category, 'A13');
  assert.equal(n.quality, 'VPQ_GOLD');
  assert.equal(n.icon, '/Lotus/Interface/Icons/Relics/RelicLithB.png');
  assert.deepEqual(relicRewardPool(newSchema, {}).map((r) => r.type), newSchema.relicRewards.map((r) => r.rewardName));
});

test('English and German relic names resolve canonical era codes', () => {
  const relics = [
    ['Lith', 'C15'],
    ['Meso', 'V17'],
    ['Neo', 'C10'],
    ['Axi', 'C12'],
  ];
  const makeBundle = (localized) => ({
    ExportRelics: relics.map(([era, code]) => ({
      uniqueName: `/Lotus/Types/Game/Projections/T${{ Lith: 1, Meso: 2, Neo: 3, Axi: 4 }[era]}VoidProjectionCitrinePrimeDBronze`,
      name: localized ? `${era}-Relikt: ${code} Relikt` : `${era} ${code} Relic`,
      relicRewards: [{ rewardName: `/Lotus/Items/${era}${code}` }],
    })),
    ExportRewards: {},
    dict: {},
  });

  for (const [localized, expected] of [
    [false, ['Lith C15', 'Meso V17', 'Neo C10', 'Axi C12']],
    [true, ['Lith C15', 'Meso V17', 'Neo C10', 'Axi C12']],
  ]) {
    const catalog = getRelicCatalog(makeBundle(localized), localized ? 'de' : 'en');
    assert.deepEqual(catalog.map((relic) => relic.key), expected);
    assert.ok(catalog.every((relic) => !/CitrinePrime[A-Z]$/.test(relic.key)));
  }
});

test('old-schema relic still reads era/category/icon/manifest as before', () => {
  const old = { era: 'Axi', category: 'S1', quality: 'VPQ_BRONZE', icon: '/x/RelicAxiD.png', rewardManifest: '/m' };
  const n = normalizeRelicEntry(old, '/Lotus/Types/Game/Projections/T4VoidProjectionS1Bronze');
  assert.deepEqual([n.era, n.category, n.quality, n.icon], ['Axi', 'S1', 'VPQ_BRONZE', '/x/RelicAxiD.png']);
  assert.deepEqual(relicRewardPool(old, { '/m': [[{ type: '/a', rarity: 'COMMON' }]] }), [{ type: '/a', rarity: 'COMMON' }]);
});

test('relic caches keep locale-sensitive results separate', () => {
  const exportsBundle = {
    ExportRelics: [{
      uniqueName: '/Lotus/Types/Game/Projections/T1VoidProjectionA1Bronze',
      name: 'Lith A1',
      relicRewards: [{ rewardName: '/Lotus/StoreItems/Types/Items/MiscItems/Foo' }],
    }],
    ExportRewards: {},
    ExportItems: {},
    ExportRecipes: {},
    dict: {},
    uniqueNameToName: {},
  };

  const englishRewards = getAllRelicRewards(exportsBundle, 'en');
  const frenchRewards = getAllRelicRewards(exportsBundle, 'fr');
  assert.notStrictEqual(englishRewards, frenchRewards);
  const formaPath = '/Lotus/StoreItems/Types/Items/MiscItems/FormaBlueprint';
  assert.equal(englishRewards.find((item) => item.uniqueName === formaPath)?.name, 'Forma Blueprint');
  assert.equal(frenchRewards.find((item) => item.uniqueName === formaPath)?.name, 'Forma Plan');

  const englishCatalog = getRelicCatalog(exportsBundle, 'en');
  const frenchCatalog = getRelicCatalog(exportsBundle, 'fr');
  assert.notStrictEqual(englishCatalog, frenchCatalog);
});

const haveRealData = fs.existsSync(`${DEFAULT_DATA_DIR}/export/ExportRelics.json`);

test('real export: every relic resolves era, category, icon and rewards; Citrine reaches the catalog', { skip: !haveRealData }, async () => {
  const { exportsBundle } = await loadRealHarness();
  const relics = Object.entries(exportsBundle.ExportRelics);
  const bad = [];
  for (const [un, entry] of relics) {
    const n = normalizeRelicEntry(entry, un);
    const rewards = relicRewardPool(entry, exportsBundle.ExportRewards, un);
    if (!n.era || !n.category || !rewards.length) bad.push(`${un} era=${n.era} cat=${n.category} rewards=${rewards.length}`);
    if (['Lith', 'Meso', 'Neo', 'Axi'].includes(n.era) && !n.icon) bad.push(`${un} no icon`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} relics failed to normalize`);

  const { getRelicCatalog } = await import('../../src/lib/relicParser.js');
  const catalog = getRelicCatalog(exportsBundle);
  const citrine = catalog.filter((relic) => relic.rewards.some((reward) => /Citrine/.test(reward.name)));
  assert.ok(citrine.length > 0, 'no catalog relic contains a Citrine Prime reward');
  assert.ok(catalog.every((relic) => relic.era !== 'Unknown' && relic.name));
});
