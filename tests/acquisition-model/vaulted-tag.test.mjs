import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BARO_RELIC_NAMES } from '../../src/lib/baroRelics.js';
import { getRelicCatalog } from '../../src/lib/relicParser.js';
import { normalizeRelicEntry } from '../../src/lib/relicEntry.js';
import { buildDropIndex } from '../../src/lib/dropsParser.js';
import { loadRealHarness, DEFAULT_DATA_DIR } from '../../scripts/lib/real-data-harness.mjs';

const { buildAllAcquisitionIndexes, getAcquisitionInfo } = await import('../../src/lib/acquisitionInfo.js');

const now = Math.floor(Date.now() / 1000);
const haveRealData = fs.existsSync(path.join(DEFAULT_DATA_DIR, 'export'));

function relic(era, code, state = {}) {
  return {
    era,
    category: code,
    rewardManifest: `/Rewards/${era}${code}`,
    ...state,
  };
}

function infoFor(indexes, dropIndex, uniqueName, displayName = uniqueName) {
  return getAcquisitionInfo(
    uniqueName, displayName, dropIndex, {},
    indexes.recipeResultIndex, indexes.marketIndex, indexes.bundleIndex, indexes.syndicateIndex,
    indexes.wikiSigilIndex, indexes.wikiVendorIndex, indexes.wikiTennoGenIndex, indexes.wikiBaroIndex,
    indexes.exportVendorIndex, indexes.alwaysAvailableIndex, indexes.glyphSupplementIndex,
    indexes.wikiBlueprintIndex, indexes.wikiResearchIndex, indexes.relicStateIndex,
    indexes.wikiResourceIndex, indexes.wikiPageAcquisitionIndex, indexes.wikiAcquisitionStatusIndex,
    indexes.exaltedWeaponIndex, indexes.exportComponentIndex,
  );
}

function syntheticData() {
  return {
    ExportRelics: {
      '/Relics/LithV1': relic('Lith', 'V1', { vaultedAt: now - 1 }),
      '/Relics/MesoU1': relic('Meso', 'U1'),
      '/Relics/NeoA1': relic('Neo', 'A1', { vaultedAt: now + 86400 }),
      '/Relics/AxiA2': relic('Axi', 'A2'),
    },
    ExportRewards: {},
    ExportRecipes: {},
    dict: {},
  };
}

test('synthetic: only confirmed-vaulted relic sources receive the vaulted tag', () => {
  const exportData = syntheticData();
  const indexes = buildAllAcquisitionIndexes(exportData);
  const directVaulted = infoFor(indexes, {}, '/Relics/LithV1', 'Lith V1 Relic');
  const directUnknown = infoFor(indexes, {}, '/Relics/MesoU1', 'Meso U1 Relic');
  const allVaulted = infoFor(indexes, {
    '/Items/AllVaulted': [{ type: 'relic', relicName: 'Lith V1', rarity: 'COMMON' }],
  }, '/Items/AllVaulted', 'All Vaulted');
  const availableSource = infoFor(indexes, {
    '/Items/AvailableSource': [
      { type: 'relic', relicName: 'Lith V1', rarity: 'COMMON' },
      { type: 'relic', relicName: 'Neo A1', rarity: 'RARE' },
    ],
  }, '/Items/AvailableSource', 'Available Source');
  const unknownSource = infoFor(indexes, {
    '/Items/UnknownSource': [
      { type: 'relic', relicName: 'Lith V1', rarity: 'COMMON' },
      { type: 'relic', relicName: 'Meso U1', rarity: 'RARE' },
    ],
  }, '/Items/UnknownSource', 'Unknown Source');

  assert.equal(directVaulted.vaulted, true);
  assert.deepEqual(directVaulted.sources, []);
  assert.notEqual(directUnknown.vaulted, true);
  assert.equal(allVaulted.vaulted, true);
  assert.notEqual(availableSource.vaulted, true);
  assert.notEqual(unknownSource.vaulted, true);
});

test('real data: confirmed vault dates tag relics, while unknown sources and Baro relics do not', { skip: !haveRealData, timeout: 180000 }, async () => {
  const { exportsBundle } = await loadRealHarness({ locale: 'en' });
  const dropIndex = buildDropIndex(exportsBundle);
  const indexes = buildAllAcquisitionIndexes(exportsBundle);
  const catalog = getRelicCatalog(exportsBundle, 'en');
  const catalogByUniqueName = new Map(catalog.map((entry) => [entry.uniqueName, entry]));
  const rawRelics = Object.entries(exportsBundle.ExportRelics || {});
  const vaultStateByRelicName = new Map(rawRelics.map(([uniqueName, entry]) => {
    const normalized = normalizeRelicEntry(entry, uniqueName);
    return [`${normalized.era || ''} ${normalized.category || ''}`.trim().toLowerCase(), entry];
  }));
  const confirmedVaulted = rawRelics.filter(([uniqueName, entry]) => {
    const normalized = normalizeRelicEntry(entry, uniqueName);
    const relicKey = `${normalized.era || ''} ${normalized.category || ''}`.trim();
    return Number.isFinite(entry?.vaultedAt)
      && entry.vaultedAt <= now
      && !BARO_RELIC_NAMES.includes(relicKey);
  });

  for (const [uniqueName] of confirmedVaulted) {
    const info = infoFor(indexes, dropIndex, uniqueName, catalogByUniqueName.get(uniqueName)?.key || uniqueName);
    assert.equal(info.vaulted, true, `${uniqueName} has a confirmed past vault date but no tag`);
  }

  const unknownSourceTargets = Object.entries(dropIndex)
    .filter(([, sources]) => sources.some((source) => source?.type === 'relic'
      && !Number.isFinite(vaultStateByRelicName.get(String(source.relicName || '').toLowerCase())?.vaultedAt)))
    .map(([uniqueName]) => uniqueName);
  for (const uniqueName of new Set(unknownSourceTargets)) {
    const info = infoFor(indexes, dropIndex, uniqueName);
    assert.notEqual(info.vaulted, true, `${uniqueName} has an unknown-vault relic source but received the tag`);
  }

  for (const name of BARO_RELIC_NAMES) {
    const relicEntry = catalog.find((entry) => entry.key === name);
    assert.ok(relicEntry, `missing ${name} from the relic catalog`);
    assert.equal(relicEntry.vaulted, false, `${name} must not be vaulted`);
    const info = infoFor(indexes, dropIndex, relicEntry.uniqueName, `${name} Relic`);
    assert.notEqual(info.vaulted, true, `${name} must not receive the vaulted tag`);
  }

  const tagCounts = { relics: 0, items: 0, replacedSources: [] };
  for (const entry of catalog) {
    if (infoFor(indexes, dropIndex, entry.uniqueName, `${entry.key} Relic`).vaulted === true) tagCounts.relics += 1;
  }
  for (const [uniqueName, sources] of Object.entries(dropIndex)) {
    if (!sources.some((source) => source?.type === 'relic')) continue;
    const info = infoFor(indexes, dropIndex, uniqueName);
    if (info.vaulted === true) {
      tagCounts.items += 1;
      if (tagCounts.replacedSources.length < 8) tagCounts.replacedSources.push(uniqueName);
    }
  }
  console.log(`vaulted tag counts: ${JSON.stringify(tagCounts)}`);
});
