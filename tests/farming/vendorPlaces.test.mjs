import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';
import { buildLedger } from '../../src/lib/farmingTargets/ledger.js';
import { rankPlaces } from '../../src/lib/farmingTargets/farmNext.js';

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'));

function realLedger(names) {
  return buildLedger({
    leaves: new Map(names.map((name, index) => [name.toLocaleLowerCase(), {
      itemType: name.toLocaleLowerCase(),
      name,
      required: 1,
      contributions: [{ targetId: `vendor-target-${index}`, quantity: 1 }],
    }])),
    owned: () => 0,
  });
}

test('real data: vendor places keep distinct names from both acquisition indexes', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness();
  const { buildAllAcquisitionIndexes } = await import('../../src/lib/acquisitionInfo.js');
  const { buildPreviewPlaceIndex } = await import('../../src/lib/farmingTargets/screenModel.js');
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle);
  const placeIndex = buildPreviewPlaceIndex({
    exportData: harness.exportsBundle,
    exportVendorIndex: indexes.exportVendorIndex,
    wikiVendorIndex: indexes.wikiVendorIndex,
    wikiResourceIndex: indexes.wikiResourceIndex,
    dict: harness.dict,
    regions: harness.exportsBundle.ExportRegions,
  });

  const vendorPlaces = [...placeIndex.places.values()].filter((place) => place.type === 'vendor');
  assert.ok(vendorPlaces.length > 10, `expected many vendor places, got ${vendorPlaces.length}`);
  assert.ok(vendorPlaces.some((place) => place.name === 'Acrithis'));
  assert.ok(vendorPlaces.every((place) => place.name !== 'Vendor'));
  assert.equal(
    new Set(vendorPlaces.map((place) => place.name.trim().toLocaleLowerCase())).size,
    vendorPlaces.length,
    'vendor names must not be duplicated by spelling or case',
  );

  const pricedSource = [...placeIndex.byItem.values()].flat().find((source) => source.vendor && source.price);
  assert.ok(pricedSource, 'expected a DE vendor source carrying its listed price');
  assert.ok(pricedSource.provenance?.startsWith('DE export vendor manifest '));
});

test('real data: the vendors tab ranks wiki vendor targets under their named vendor', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness();
  const { buildAllAcquisitionIndexes } = await import('../../src/lib/acquisitionInfo.js');
  const { buildPreviewPlaceIndex } = await import('../../src/lib/farmingTargets/screenModel.js');
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle);
  const placeIndex = buildPreviewPlaceIndex({
    exportData: harness.exportsBundle,
    exportVendorIndex: indexes.exportVendorIndex,
    wikiVendorIndex: indexes.wikiVendorIndex,
    wikiResourceIndex: indexes.wikiResourceIndex,
    dict: harness.dict,
    regions: harness.exportsBundle.ExportRegions,
  });
  const targetNames = ['Orokin Reactor', 'Orokin Catalyst'];
  const result = rankPlaces({ ledger: realLedger(targetNames), placeIndex, filters: { tab: 'vendors' } });

  for (const name of targetNames) {
    const source = placeIndex.byItem.get(name.toLocaleLowerCase())?.find((entry) => {
      const place = placeIndex.places.get(entry.placeId);
      return place?.name === 'Acrithis';
    });
    assert.ok(source, `${name} should be indexed under Acrithis`);
    assert.equal(source.vendor, 'Acrithis');
    assert.ok(result.ranked.some((row) => row.place.name === 'Acrithis' && row.coveredItems.some((item) => item.name === name)));
  }
});

test('syndicate sources are vendors, not missions, and strict Market purchases are indexed', async () => {
  const { buildPreviewPlaceIndex, parseMarketPurchaseText, sourceType } = await import('../../src/lib/farmingTargets/screenModel.js');
  assert.equal(sourceType({ type: 'syndicate' }), 'vendor');
  assert.equal(sourceType({ type: 'mission' }), 'mission');
  assert.deepEqual(parseMarketPurchaseText('Blueprint purchasable from Market for 225 Platinum.'), { amount: 225, currency: 'Platinum', label: '225 Platinum' });
  assert.equal(parseMarketPurchaseText('Purchased from the Market without a listed price.'), null);
  const placeIndex = buildPreviewPlaceIndex({
    dropIndex: {
      Rahn: [{ type: 'syndicate', syndicateName: 'The Quills', place: 'The Quills, Instrument', standing: 2500, source: 'drops.wf' }],
      Ambassador: [{ type: 'mission', nodeName: 'Railjack Survival', chance: 0.1 }],
    },
    exportData: { ExportWeapons: { Ambassador: { name: 'Ambassador' } } },
    marketIndex: new Map([['Ambassador', { amount: 225, currency: 'Platinum' }]]),
    acquisitionOverrides: { components: {}, mods: {} },
  });
  const rahn = placeIndex.byItem.get('rahn')?.[0];
  assert.equal(placeIndex.places.get(rahn.placeId).type, 'vendor');
  assert.equal(placeIndex.places.get(rahn.placeId).name, 'The Quills');
  assert.equal(rahn.price, '2,500 Standing');
  assert.notEqual(rahn.source, 'drops.wf');
  assert.equal(placeIndex.places.get(placeIndex.byItem.get('ambassador')?.find((row) => row.price).placeId).name, 'Market');
});

test('real data: the seven current targets place syndicate and Market acquisitions under Vendors only', { skip: !haveRealData }, async () => {
  const { exportsBundle, dict, repo } = await loadRealHarness();
  const { parseInventory } = await import(path.join(repo, 'src/lib/inventoryParser.js'));
  const { buildDropIndex } = await import(path.join(repo, 'src/lib/dropsParser.js'));
  const { buildAllAcquisitionIndexes } = await import(path.join(repo, 'src/lib/acquisitionInfo.js'));
  const { buildFarmingTargetsScreenModel, buildPreviewPlaceIndex } = await import(path.join(repo, 'src/lib/farmingTargets/screenModel.js'));
  const store = JSON.parse(fs.readFileSync(path.join(DEFAULT_DATA_DIR, 'user/farming-targets.json'), 'utf8'));
  const inventoryData = parseInventory(JSON.parse(fs.readFileSync(path.join(DEFAULT_DATA_DIR, 'user/inventory.json'), 'utf8')), exportsBundle, dict, 'en', null);
  const indexes = buildAllAcquisitionIndexes(exportsBundle);
  const overrides = JSON.parse(fs.readFileSync(path.join(repo, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'));
  const dropIndex = buildDropIndex(exportsBundle);
  const placeIndex = buildPreviewPlaceIndex({
    dropIndex,
    wikiResourceIndex: indexes.wikiResourceIndex,
    wikiVendorIndex: indexes.wikiVendorIndex,
    exportVendorIndex: indexes.exportVendorIndex,
    marketIndex: indexes.marketIndex,
    acquisitionOverrides: overrides,
    exportData: exportsBundle,
    dict,
    regions: exportsBundle.ExportRegions,
  });
  const modelFor = (tab) => buildFarmingTargetsScreenModel({
    targets: store.targets,
    reservations: store.reservations,
    inventoryData,
    exportData: exportsBundle,
    dropIndex,
    wikiResourceIndex: indexes.wikiResourceIndex,
    wikiVendorIndex: indexes.wikiVendorIndex,
    exportVendorIndex: indexes.exportVendorIndex,
    marketIndex: indexes.marketIndex,
    acquisitionOverrides: overrides,
    placeIndex,
    filters: { tab },
  });
  const vendors = modelFor('vendors').ranked;
  const missions = modelFor('missions').ranked;
  for (const [item, vendor] of [['Rahn Prism', 'The Quills'], ['Klamora Prism', 'Vox Solaris'], ['Ambassador', 'Market']]) {
    const row = vendors.find((candidate) => candidate.place.name === vendor && candidate.coveredItems.some((covered) => covered.name === item));
    assert.ok(row, `${item} should be under ${vendor} in Vendors`);
  }
  assert.ok(!missions.some((row) => ['The Quills', 'Vox Solaris', 'Market'].includes(row.place.name)), 'syndicate/Market rows must not remain under Missions');
  assert.ok(vendors.some((row) => row.place.name === 'The Quills') && vendors.some((row) => row.place.name === 'Vox Solaris') && vendors.some((row) => row.place.name === 'Market'));
});
