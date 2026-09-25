#!/usr/bin/env node
/** Read-only proof against the Preview export cache and DropsAll snapshot. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDropIndex } from '../src/lib/dropsParser.js';
import { buildFarmingTargetsScreenModel } from '../src/lib/farmingTargets/screenModel.js';

const defaultExport = '/home/jedwards/.local/share/kiedas-orbiter-preview/data/export';

function normalizeRecipes(value) {
  return Object.entries(value ?? {}).map(([itemType, recipe]) => ({
    ...recipe,
    itemType: recipe.resultType ?? itemType,
    outputQty: recipe.num ?? 1,
    ingredients: (recipe.ingredients ?? []).map((ingredient) => ({
      itemType: ingredient.ItemType,
      name: ingredient.ItemType,
      need: ingredient.ItemCount,
    })),
  }));
}

export function runRealProof(exportDirectory = defaultExport) {
  const cache = JSON.parse(fs.readFileSync(path.join(exportDirectory, 'combined_export_cache.json'), 'utf8'));
  const dropIndex = buildDropIndex(cache);
  const inventoryData = { all: [], craftable: normalizeRecipes(cache.ExportRecipes) };
  const targets = [
    { id: 'narin', uniqueName: '/Lotus/Powersuits/Duelist/Duelist', name: 'Narin', quantity: 1 },
    { id: 'mod', uniqueName: '/Lotus/Upgrades/Mods/Warframe/AvatarHealthMaxMod', name: 'Vitality', quantity: 1 },
  ];
  const model = buildFarmingTargetsScreenModel({ targets, inventoryData, dropIndex });
  const placeNames = model.ranked.map((row) => row.place.name);
  const planetNames = model.ranked.map((row) => row.place.planet).filter(Boolean);
  if (!model.ledger.length) throw new Error('real-data proof produced no ledger rows');
  if (!model.ranked.length) throw new Error('real-data proof produced no ranked places');
  if (placeNames.some((name) => name === 'drops.wf')) throw new Error('real-data proof collapsed a source to drops.wf');
  if (!planetNames.length) throw new Error('real-data proof produced no planets');
  if (!model.ledger.some((row) => row.usedBy.some((entry) => entry.targetId === 'narin'))) throw new Error('Narin has no ledger contribution');
  if (!model.ledger.some((row) => row.usedBy.some((entry) => entry.targetId === 'mod'))) throw new Error('Vitality has no ledger contribution');
  return { ledger: model.ledger, places: placeNames, planets: [...new Set(planetNames)] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const result = runRealProof(process.argv[2] ?? defaultExport);
    console.log(`Real-data proof: ledger=${result.ledger.length} places=${result.places.length} planets=${result.planets.join(', ')}`);
    console.log(`Places: ${result.places.slice(0, 12).join(', ')}`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
