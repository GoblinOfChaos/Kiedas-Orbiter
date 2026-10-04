import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';

const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'));
const STRING_OPERATION_MEASUREMENT = {
  toLowerCase: 67738,
  toLocaleLowerCase: 0,
  replace: 484696,
  replaceAll: 50023,
};
const MAX_STRING_OPERATIONS = (Object.values(STRING_OPERATION_MEASUREMENT).reduce((sum, count) => sum + count, 0)) * 3;

test('real data: place index avoids locale normalization and stays within the measured cost bound', { skip: !haveRealData }, async () => {
  const harness = await loadRealHarness();
  const { buildAllAcquisitionIndexes } = await import('../../src/lib/acquisitionInfo.js');
  const { buildDropIndex } = await import('../../src/lib/dropsParser.js');
  const { buildPreviewPlaceIndex } = await import('../../src/lib/farmingTargets/screenModel.js');
  const indexes = buildAllAcquisitionIndexes(harness.exportsBundle);
  const dropIndex = buildDropIndex(harness.exportsBundle);
  const overrides = JSON.parse(fs.readFileSync(path.join(harness.repo, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf8'));
  const methods = ['toLowerCase', 'toLocaleLowerCase', 'replace', 'replaceAll'];
  const counts = Object.fromEntries(methods.map((name) => [name, 0]));
  const originals = Object.fromEntries(methods.map((name) => [name, String.prototype[name]]));
  for (const name of methods) {
    String.prototype[name] = function (...args) {
      counts[name] += 1;
      return originals[name].apply(this, args);
    };
  }
  let index;
  const started = performance.now();
  try {
    index = buildPreviewPlaceIndex({
      dropIndex,
      wikiResourceIndex: indexes.wikiResourceIndex,
      wikiVendorIndex: indexes.wikiVendorIndex,
      exportVendorIndex: indexes.exportVendorIndex,
      marketIndex: indexes.marketIndex,
      acquisitionOverrides: overrides,
      exportData: harness.exportsBundle,
      dict: harness.dict,
      regions: harness.exportsBundle.ExportRegions,
    });
  } finally {
    for (const name of methods) String.prototype[name] = originals[name];
  }
  const durationMs = performance.now() - started;
  const totalStringOperations = Object.values(counts).reduce((sum, count) => sum + count, 0);
  assert.equal(counts.toLocaleLowerCase, 0);
  assert.ok(totalStringOperations <= MAX_STRING_OPERATIONS, `string operations ${totalStringOperations} exceeded ${MAX_STRING_OPERATIONS}`);
  assert.ok(durationMs < 2000, `place index took ${durationMs.toFixed(1)}ms`);
  assert.ok(index.stats.normalize_calls > 0);
  assert.ok(index.stats.cache_hits > 0);
  // Baseline measurement: 67738 + 0 + 484696 + 50023 = 602457; the bound is 3x.
  assert.deepEqual(STRING_OPERATION_MEASUREMENT, {
    toLowerCase: 67738,
    toLocaleLowerCase: 0,
    replace: 484696,
    replaceAll: 50023,
  });
});
