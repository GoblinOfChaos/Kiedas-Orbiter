#!/usr/bin/env node
/** Read-only proof for one Prime reward against explicit DE export/inventory inputs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRelicCatalog } from '../src/lib/relicParser.js';
import { buildRelicPlaces } from '../src/lib/farmingTargets/relicPlaces.js';

export function runRelicProof(exportPath, inventoryPath, dropIndexPath = null) {
  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const catalog = getRelicCatalog(exportData);
  const reward = catalog.flatMap((relic) => relic.rewards.map((item) => ({ ...item, relic })))
    .find((item) => item.isPrimePart || /Prime/i.test(item.name));
  if (!reward) throw new Error('No Prime relic reward was found in the supplied DE export');
  const dropIndex = dropIndexPath ? JSON.parse(fs.readFileSync(dropIndexPath, 'utf8')) : {};
  const rows = buildRelicPlaces({ exportData, inventoryData, dropIndex, catalog, ledger: [{ itemType: reward.uniqueName, name: reward.name, stillNeeded: 1 }] });
  if (!rows.length) throw new Error(`No relic covers Prime target ${reward.name}`);
  return { target: reward.name, rows };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const [exportPath, inventoryPath, dropIndexPath] = process.argv.slice(2);
  if (!exportPath || !inventoryPath) {
    console.error('Usage: node scripts/farming-targets-relic-real-proof.js EXPORT.json INVENTORY.json [DROP_INDEX.json]');
    process.exitCode = 2;
  } else {
    try {
      const result = runRelicProof(exportPath, inventoryPath, dropIndexPath);
      console.log(`Prime target: ${result.target}`);
      for (const row of result.rows) console.log(`${row.place.name} | coverage=${row.coverage} | owned=${row.place.ownedCount} | vaulted=${row.place.vaulted} | ${JSON.stringify(row.coveredItems[0].chances)}`);
    } catch (error) {
      console.error(`ERROR: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
