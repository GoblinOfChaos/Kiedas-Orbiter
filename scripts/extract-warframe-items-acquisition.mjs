// One-time (re-runnable) extraction of the fields this app needs from the
// warframe-items npm package into a lean static JSON file, since
// warframe-items itself uses Node's fs/path directly and can't be imported
// into the Vite-bundled frontend. Re-run this script (`node
// scripts/extract-warframe-items-acquisition.mjs`) whenever warframe-items
// is updated to a newer version, to refresh the bundled data.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDataDir = resolve(__dirname, '../node_modules/warframe-items/data/json');
const outPath = resolve(__dirname, '../src-tauri/data/assets/data/warframe-items-acquisition.json');

// Categories covering the screens this feature wires up (Mods, Rivens,
// Inventory equipment, Relics, Resources, etc.). Rivens has no per-weapon
// data in warframe-items (confirmed during #80), so no Riven-specific
// category is needed here.
//
// Categories with real drop data in warframe-items are included so the
// acquisition drawer can show structured sources instead of falling through
// to the wiki-search fallback (issue #95). Categories without meaningful
// drops (Glyphs, Enemy, Node) are excluded to keep the bundle lean.
const CATEGORIES = [
  'Mods', 'Arcanes', 'Warframes', 'Primary', 'Secondary', 'Melee',
  'Archwing', 'Arch-Gun', 'Arch-Melee', 'Sentinels', 'SentinelWeapons',
  'Relics', 'Gear', 'Resources', 'Fish', 'Sigils', 'Skins', 'Misc',
  'Railjack', 'Pets', 'Quests',
];

const extracted = [];
for (const category of CATEGORIES) {
  const items = JSON.parse(readFileSync(resolve(pkgDataDir, `${category}.json`), 'utf-8'));
  for (const item of items) {
    if (!item.uniqueName) continue;
    if (!Array.isArray(item.drops) || item.drops.length === 0) {
      if (!item.wikiAvailable) continue; // nothing useful to extract for this item
    }
    extracted.push({
      uniqueName: item.uniqueName,
      name: item.name,
      drops: item.drops || [],
      wikiaUrl: item.wikiaUrl || null,
      wikiAvailable: !!item.wikiAvailable,
    });
  }
}

writeFileSync(outPath, JSON.stringify(extracted), 'utf-8');
console.log(`Extracted ${extracted.length} items with acquisition data to ${outPath}`);
