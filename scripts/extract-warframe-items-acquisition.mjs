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
    const hasDrops = Array.isArray(item.drops) && item.drops.length > 0;
    // components[] means warframe-items itself has a real Foundry recipe for
    // this item (real ingredients + a blueprint sub-component, verified
    // against sampled entries) - a separate representation from DE's own
    // ExportRecipes export, and covers items ExportRecipes matching misses
    // (e.g. many Skins/alt helmets), so it's worth keeping even without
    // drops or a wiki page.
    // length > 1 (not just > 0) matters: Kuva/Tenet Lich weapons and Braton
    // also carry a components array, but with exactly one entry - just the
    // blueprint itself, no real materials (confirmed live: Tenet Envoy was
    // wrongly labeled "Built in the Foundry" when the actual source is
    // defeating a Sister of Parvos, not gathering resources). A real
    // Foundry recipe always needs the blueprint plus at least one material.
    const craftable = Array.isArray(item.components) && item.components.length > 1;
    if (!hasDrops && !item.wikiAvailable && !craftable) continue; // nothing useful to extract for this item
    extracted.push({
      uniqueName: item.uniqueName,
      name: item.name,
      drops: item.drops || [],
      wikiaUrl: item.wikiaUrl || null,
      wikiAvailable: !!item.wikiAvailable,
      craftable,
      ...(craftable ? {
        buildPrice: Number.isFinite(item.buildPrice) ? item.buildPrice : null,
        buildTime: Number.isFinite(item.buildTime) ? item.buildTime : null,
        skipBuildTimePrice: Number.isFinite(item.skipBuildTimePrice) ? item.skipBuildTimePrice : null,
        bpCost: Number.isFinite(item.bpCost) ? item.bpCost : null,
        components: (item.components || []).map((component) => ({
          uniqueName: component.uniqueName || null,
          name: component.name || null,
          itemCount: Number.isFinite(component.itemCount) ? component.itemCount : 1,
          // Keep the component's own acquisition records. These are distinct
          // from the parent recipe's drops and are what Foundry needs to tell
          // the player where each required part comes from.
          drops: Array.isArray(component.drops) ? component.drops : [],
        })),
      } : {}),
    });
  }
}

writeFileSync(outPath, JSON.stringify(extracted), 'utf-8');
console.log(`Extracted ${extracted.length} items with acquisition data to ${outPath}`);
