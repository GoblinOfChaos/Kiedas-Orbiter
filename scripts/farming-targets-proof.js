#!/usr/bin/env node
/** Read-only plain-Node proof for the Farming Targets calculation engine. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandTargets } from '../src/lib/farmingTargets/requirements.js';
import { buildLedger } from '../src/lib/farmingTargets/ledger.js';
import { buildPlaceIndex } from '../src/lib/farmingTargets/placeIndex.js';
import { rankPlaces } from '../src/lib/farmingTargets/farmNext.js';

function args(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    if (key === 'explain' || key === 'verbose-inputs') result[key] = true;
    else result[key] = argv[++i];
  }
  return result;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read JSON ${file}: ${error.message}`);
  }
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeCraftable(value) {
  const list = Array.isArray(value) ? value : Object.entries(value ?? {}).map(([itemType, recipe]) => ({ itemType, ...recipe }));
  return list.map((recipe) => ({
    ...recipe,
    itemType: recipe.itemType ?? recipe.resultType ?? recipe.uniqueName,
    outputQty: recipe.outputQty ?? recipe.num ?? recipe.outputQuantity ?? 1,
    ingredients: (recipe.ingredients ?? recipe.Ingredients ?? []).map((ingredient) => ({
      ...ingredient,
      itemType: ingredient.itemType ?? ingredient.ItemType,
      need: ingredient.need ?? ingredient.ItemCount,
    })),
    craftable: recipe.craftable ?? !/^\/Lotus\/Types\/Items\//.test(recipe.itemType ?? recipe.resultType ?? recipe.uniqueName ?? ''),
  })).filter((recipe) => recipe.itemType);
}

function ownedMap(inventory) {
  if (inventory.owned && typeof inventory.owned === 'object') return inventory.owned;
  const owned = {};
  for (const value of Object.values(inventory)) {
    for (const entry of Array.isArray(value) ? value : []) {
      if (entry?.ItemType && Number(entry.ItemCount) > 0) owned[entry.ItemType] = (owned[entry.ItemType] ?? 0) + Number(entry.ItemCount);
    }
  }
  return owned;
}

function wikiData(directory) {
  const data = { enemies: {}, missions: {}, resources: {} };
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.json'));
  for (const file of files) {
    if (file === 'index.json') continue;
    if (/pre[-_]u36/i.test(file)) continue;
    const value = readJson(path.join(directory, file));
    if (/enemies?/i.test(file)) Object.assign(data.enemies, value);
    else if (/mission/i.test(file)) Object.assign(data.missions, value);
    else if (/resource/i.test(file)) Object.assign(data.resources, value);
  }
  return data;
}

function regionRows(value) {
  if (Array.isArray(value)) return value;
  const arrays = Object.values(value ?? {}).filter(Array.isArray);
  return arrays.length === 1 ? arrays[0] : arrays.flat();
}

function printRanking(result) {
  console.log('Farm-next ranking (top 15)');
  if (!result.ranked.length) console.log('(no verified source rows matched still-needed items)');
  for (const [index, row] of result.ranked.slice(0, 15).entries()) {
    const items = row.coveredItems.map((item) => `${item.name} ${(item.chance * 100).toFixed(2)}%${item.rotation ? ` ${item.rotation}` : ''}`).join('; ');
    const pvp = row.place.pvp ? ' [PvP]' : '';
    console.log(`${index + 1}. ${row.place.name} [${row.place.type}]${pvp} covers ${row.coverage}: ${items}${row.reason ? ` (${row.reason})` : ''}`);
  }
  console.log(`Conclave-only items: ${result.conclaveOnlyItems.join(', ') || 'none'}`);
  if (result.conclaveRanking?.ranked.length) {
    console.log('Conclave ranking:');
    for (const [index, row] of result.conclaveRanking.ranked.slice(0, 15).entries()) {
      const items = row.coveredItems.map((item) => `${item.name} ${(item.chance * 100).toFixed(2)}%`).join('; ');
      console.log(`${index + 1}. ${row.place.name} [${row.place.type}] [PvP] covers ${row.coverage}: ${items}${row.reason ? ` (${row.reason})` : ''}`);
    }
  }
}

function main(options) {
  const required = ['inventory', 'targets', 'drop-tables', 'wiki-dir', 'regions', 'craftable'];
  for (const key of required) if (!options[key]) throw new Error(`missing --${key}`);
  const files = [options.inventory, options.targets, options['drop-tables'], options.regions, options.craftable];
  for (const file of files) if (!fs.existsSync(file)) throw new Error(`missing file ${file}`);
  if (!fs.existsSync(options['wiki-dir']) || !fs.statSync(options['wiki-dir']).isDirectory()) throw new Error(`missing wiki directory ${options['wiki-dir']}`);
  const inventory = readJson(options.inventory);
  const targets = readJson(options.targets);
  if (!Array.isArray(targets)) throw new Error('targets JSON must be an array');
  const recipeInput = readJson(options.craftable);
  const craftable = normalizeCraftable(Array.isArray(recipeInput) ? recipeInput : recipeInput.craftable ?? recipeInput.Craftable ?? recipeInput);
  if (!craftable.length) throw new Error('no craftable recipes supplied; pass --craftable when using raw inventory.json');
  const dropTables = readJson(options['drop-tables']);
  const wiki = wikiData(options['wiki-dir']);
  const regions = regionRows(readJson(options.regions));
  const expanded = expandTargets(targets, { recipes: craftable, owned: ownedMap(inventory) });
  if (expanded.errors.length) {
    const cycles = expanded.errors.filter((error) => error.kind === 'cycle');
    if (cycles.length) throw Object.assign(new Error(cycles.map((error) => `cycle: ${error.path.join(' -> ')}`).join('; ')), { exitCode: 2 });
    throw new Error(`requirement expansion failed: ${JSON.stringify(expanded.errors)}`);
  }
  if (expanded.unresolved.length) throw new Error(`unresolved identity: ${JSON.stringify(expanded.unresolved)}`);
  const ledger = buildLedger({ leaves: expanded.leaves, owned: ownedMap(inventory) });
  const placeIndex = buildPlaceIndex({ dropTables, wiki, regions });
  const ranking = rankPlaces({ ledger, placeIndex, filters: options['min-chance'] == null ? {} : { minChance: Number(options['min-chance']) } });
  const conclaveRanking = rankPlaces({ ledger, placeIndex, filters: { tab: 'conclave' } });
  const wikiFiles = fs.readdirSync(options['wiki-dir']).filter((name) => name.endsWith('.json')).sort();
  const wikiHashes = wikiFiles.map((name) => `${name}:${sha256(path.join(options['wiki-dir'], name))}`);
  const wikiCombinedHash = sha256Text(wikiHashes.join('\n'));
  const wikiIndexPath = path.join(options['wiki-dir'], 'index.json');
  const wikiMetadata = fs.existsSync(wikiIndexPath) ? readJson(wikiIndexPath) : (fs.existsSync(path.join(options['wiki-dir'], 'Module_DatastoreManifest.json')) ? readJson(path.join(options['wiki-dir'], 'Module_DatastoreManifest.json')) : {});
  const snapshot = wikiMetadata.snapshotDate ?? wikiMetadata._attribution?.converted_at ?? dropTables.snapshotDate ?? 'unknown';
  console.log('Farming Targets proof');
  console.log(`Input inventory ${options.inventory} sha256=${sha256(options.inventory)}`);
  console.log(`Input targets ${options.targets} sha256=${sha256(options.targets)}`);
  console.log(`Input drop tables parsed ${options['drop-tables']} sha256=${sha256(options['drop-tables'])}`);
  console.log(`Input ExportRegions ${options.regions} sha256=${sha256(options.regions)}`);
  console.log(`Input recipes ${options.craftable} sha256=${sha256(options.craftable)}`);
  console.log(`Input wiki JSON directory ${wikiFiles.length} files combined-sha256=${wikiCombinedHash}`);
  if (options['verbose-inputs']) for (const line of wikiHashes) console.log(`Input wiki/${line.replace(':', ' sha256=')}`);
  const snapshotSource = wikiMetadata.snapshotDate ? `${path.basename(wikiIndexPath)}.snapshotDate` : wikiMetadata._attribution?.converted_at ? 'Module_DatastoreManifest.json._attribution.converted_at' : dropTables.snapshotDate ? `${path.basename(options['drop-tables'])}.snapshotDate` : 'unknown';
  console.log(`Snapshot: ${snapshot} (source: ${snapshotSource})`);
  console.log('Targets:');
  for (const target of targets) console.log(`- ${target.id ?? target.itemType}: ${target.name ?? target.itemType} (${target.itemType})`);
  if (options.explain) {
    console.log('Requirement trees:');
    for (const row of ledger) console.log(`- ${row.name}: required ${row.required}`);
    console.log('Recipe edges:');
    const recipesByItem = new Map(craftable.map((recipe) => [recipe.itemType, recipe]));
    for (const target of targets) {
      const recipe = recipesByItem.get(target.itemType);
      for (const ingredient of recipe?.ingredients ?? []) console.log(`- ${target.name ?? target.itemType} -> ${ingredient.name ?? ingredient.itemType} x ${ingredient.need}`);
    }
  }
  console.log('Still needed | Item | Required | Owned | Reserved');
  const targetNames = new Map(targets.map((target) => [String(target.id ?? target.itemType), target.name ?? target.itemType]));
  for (const row of ledger) {
    console.log(`${row.stillNeeded} | ${row.name} | ${row.required} | ${row.owned} | ${row.reserved}`);
    if (row.usedBy.length) console.log(`Used by ${row.usedBy.map((entry) => `${targetNames.get(String(entry.targetId)) ?? entry.targetId} ${entry.quantity}`).join('; ')}`);
  }
  printRanking({ ...ranking, conclaveRanking });
  console.log(`Audit: enemies ${placeIndex.audit.enemiesWithLocation}/${placeIndex.audit.enemiesTotal} with location; planets ${placeIndex.audit.planetMatched}/${placeIndex.audit.planetTotal} matched; missions ${placeIndex.audit.missionMatched}/${placeIndex.audit.missionTotal} matched`);
}

export { main };

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    main(args(process.argv.slice(2)));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = error.exitCode ?? 1;
  }
}
