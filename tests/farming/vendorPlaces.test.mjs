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
