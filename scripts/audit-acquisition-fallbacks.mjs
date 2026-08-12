// Audit script for issue #95: which items fall through to the wiki-search
// fallback in the acquisition drawer, and why.
//
// Replicates the live chain from src/lib/acquisitionInfo.js:
//   1. warframe-items drops (bundled warframe-items-acquisition.json)
//   2. curated overrides (acquisition_overrides.json)
//   3. dropIndex (built from DE export + DropsAll via dropsParser.js)
//   4. wiki-search fallback (empty sources)
//
// Usage: node scripts/audit-acquisition-fallbacks.mjs
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const APP_DATA = process.env.HOME + '/.local/share/kiedas-orbiter/data';

// ── Load bundled warframe-items acquisition data ──────────────────────────
const acquisitionItems = JSON.parse(readFileSync(
  resolve(ROOT, 'src-tauri/data/assets/data/warframe-items-acquisition.json'), 'utf-8'));
const itemIndex = new Map(acquisitionItems.map((i) => [i.uniqueName, i]));

// ── Load overrides ────────────────────────────────────────────────────────
const overrides = JSON.parse(readFileSync(
  resolve(ROOT, 'src-tauri/data/assets/data/acquisition_overrides.json'), 'utf-8'));

// ── Load export data needed to build dropIndex ────────────────────────────
function loadExport(name) {
  try {
    return JSON.parse(readFileSync(resolve(APP_DATA, 'export', name), 'utf-8'));
  } catch {
    return null;
  }
}
const exportData = {
  ExportRegions: loadExport('ExportRegions.json'),
  ExportRewards: loadExport('ExportRewards.json'),
  ExportRelics: loadExport('ExportRelics.json'),
  dict: loadExport('dict.json'),
  DropsAll: loadExport('DropsAll.json'),
};

// ── Replicate buildDropIndex (from src/lib/dropsParser.js) ────────────────
function buildNameToUniqueNameMap(exportData, dict) {
  const map = {};
  const tables = [
    'ExportWarframes', 'ExportWeapons', 'ExportSentinels', 'ExportUpgrades',
    'ExportAvionics', 'ExportArcanes', 'ExportResources', 'ExportRelics',
    'ExportCustoms', 'ExportGear', 'ExportFlavour', 'ExportSyndicates',
    'ExportBoosterPacks',
  ];
  for (const tblName of tables) {
    const data = exportData[tblName];
    if (!data) continue;
    const items = Array.isArray(data) ? data : Object.values(data);
    for (const item of items) {
      if (!item || !item.uniqueName) continue;
      const locKey = item.name || item.displayName;
      if (!locKey) continue;
      const resolved = dict[locKey] || dict['/' + locKey] || '';
      const displayName = resolved.replace(/<[^>]*>/g, '').trim();
      if (displayName && !displayName.startsWith('/')) {
        const key = displayName.toLowerCase();
        if (!map[key]) map[key] = [];
        map[key].push(item.uniqueName);
      }
    }
  }
  const recipes = exportData.ExportRecipes;
  if (recipes && typeof recipes === 'object') {
    const recipeItems = Array.isArray(recipes) ? recipes : Object.values(recipes);
    for (const recipe of recipeItems) {
      if (!recipe || !recipe.resultType) continue;
      const locKey = recipe.name || '';
      if (locKey) {
        const resolved = dict[locKey] || dict['/' + locKey] || '';
        const displayName = resolved.replace(/<[^>]*>/g, '').trim();
        if (displayName && !displayName.startsWith('/')) {
          const key = displayName.toLowerCase();
          if (!map[key]) map[key] = [];
          map[key].push(recipe.resultType);
        }
      }
    }
  }
  // Index ExportRelics by their display name (era + category). Relic entries
  // have no name/uniqueName/displayName fields - the uniqueName is the dict
  // key - so they were never indexed before, meaning DropsAll's "Axi A21
  // Relic" mission rewards could never resolve to a relic uniqueName, and
  // relic cards fell through to the wiki fallback. Build the display name
  // from era + category (e.g. "Axi A21").
  const relics = exportData.ExportRelics;
  if (relics && typeof relics === 'object') {
    const relicEntries = Array.isArray(relics) ? relics : Object.entries(relics);
    for (const [relicUn, relic] of relicEntries) {
      if (!relic) continue;
      const era = relic.era || '';
      const category = relic.category || '';
      if (!era || !category) continue;
      const displayName = `${era} ${category}`.toLowerCase();
      if (!map[displayName]) map[displayName] = [];
      map[displayName].push(relicUn);
    }
  }
  return map;
}

function addSource(index, itemUn, source) {
  if (!itemUn) return;
  const norm = itemUn.replace('/StoreItems/', '/');
  if (!index[norm]) index[norm] = [];
  index[norm].push(source);
}

function addNamedSource(index, nameMap, itemName, source) {
  if (!itemName) return;
  const lc = itemName.toLowerCase().trim();
  if (/^[\d,]+x?\s*(credits?|endo|affinity|focus)/i.test(lc)) return;
  const tryName = (name) => {
    const uniqueNames = nameMap[name];
    if (uniqueNames && uniqueNames.length > 0) {
      for (const un of uniqueNames) addSource(index, un, source);
      return true;
    }
    return false;
  };
  let found = tryName(lc);
  if (!found && lc.endsWith(' blueprint')) {
    const without = lc.slice(0, -10);
    found = tryName(without);
    if (!found) {
      const fallbackKey = 'display:' + without;
      if (!index[fallbackKey]) index[fallbackKey] = [];
      index[fallbackKey].push(source);
    }
  }
  if (!found && !lc.endsWith(' blueprint')) {
    const withBp = lc + ' blueprint';
    found = tryName(withBp);
    if (!found) {
      const fallbackKey = 'display:' + withBp;
      if (!index[fallbackKey]) index[fallbackKey] = [];
      index[fallbackKey].push(source);
    }
  }
  // Try without trailing " Relic" (DropsAll names relics "Axi A21 Relic",
  // but ExportRelics display names are "Axi A21" - era + category)
  if (!found && lc.endsWith(' relic')) {
    const without = lc.slice(0, -6);
    found = tryName(without);
    if (!found) {
      const fallbackKey = 'display:' + without;
      if (!index[fallbackKey]) index[fallbackKey] = [];
      index[fallbackKey].push(source);
    }
  }
  if (!found) {
    const fallbackKey = 'display:' + lc;
    if (!index[fallbackKey]) index[fallbackKey] = [];
    index[fallbackKey].push(source);
  }
}

const normChance = (c) => c != null ? c / 100 : null;

function processDropsAll(index, DropsAll, nameMap) {
  if (!DropsAll || typeof DropsAll !== 'object') return;
  const missionRewards = DropsAll.missionRewards;
  if (missionRewards && typeof missionRewards === 'object') {
    for (const [planet, nodes] of Object.entries(missionRewards)) {
      if (!nodes || typeof nodes !== 'object') continue;
      for (const [nodeName, nodeData] of Object.entries(nodes)) {
        if (!nodeData || !nodeData.rewards) continue;
        const gameMode = nodeData.gameMode || '';
        const rewards = nodeData.rewards;
        const addEntry = (entry, rotation) => {
          if (!entry || !entry.itemName) return;
          addNamedSource(index, nameMap, entry.itemName, {
            type: 'mission', node: nodeName, nodeName, missionType: gameMode,
            rotation: rotation === 'A' ? null : rotation,
            chance: normChance(entry.chance), itemCount: 1, source: 'drops.wf',
          });
        };
        if (Array.isArray(rewards)) {
          for (const entry of rewards) addEntry(entry, null);
        } else if (typeof rewards === 'object') {
          for (const rotation of ['A', 'B', 'C', 'D']) {
            const entries = rewards[rotation];
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) addEntry(entry, rotation);
          }
        }
      }
    }
  }
  const relics = DropsAll.relics;
  if (Array.isArray(relics)) {
    for (const relic of relics) {
      if (!relic || !relic.rewards) continue;
      const relicEra = relic.tier || '';
      const relicName = relic.relicName || '';
      const state = relic.state || '';
      for (const entry of relic.rewards) {
        addNamedSource(index, nameMap, entry.itemName, {
          type: 'relic', relicEra,
          relicName: relicEra ? `${relicEra} ${relicName}` : relicName,
          rarity: entry.rarity || 'COMMON', chance: normChance(entry.chance),
          relicManifest: relicName, state, source: 'drops.wf',
        });
      }
    }
  }
  const modLocations = DropsAll.modLocations;
  if (Array.isArray(modLocations)) {
    for (const modLoc of modLocations) {
      if (!modLoc || !modLoc.modName || !modLoc.enemies) continue;
      for (const enemy of modLoc.enemies) {
        addNamedSource(index, nameMap, modLoc.modName, {
          type: 'enemy', enemyName: enemy.enemyName, rarity: enemy.rarity || '',
          chance: normChance(enemy.chance),
          enemyDropChance: enemy.enemyModDropChance ?? null, source: 'drops.wf',
        });
      }
    }
  }
  const enemyModTables = DropsAll.enemyModTables;
  if (Array.isArray(enemyModTables)) {
    for (const enemy of enemyModTables) {
      if (!enemy || !enemy.enemyName || !enemy.mods) continue;
      for (const mod of enemy.mods) {
        addNamedSource(index, nameMap, mod.modName, {
          type: 'enemy', enemyName: enemy.enemyName, rarity: mod.rarity || '',
          chance: normChance(mod.chance), source: 'drops.wf',
        });
      }
    }
  }
  const blueprintLocations = DropsAll.blueprintLocations;
  if (Array.isArray(blueprintLocations)) {
    for (const bpLoc of blueprintLocations) {
      if (!bpLoc || !bpLoc.itemName || !bpLoc.enemies) continue;
      const itemName = bpLoc.blueprintName || bpLoc.itemName;
      for (const enemy of bpLoc.enemies) {
        addNamedSource(index, nameMap, itemName, {
          type: 'enemy', enemyName: enemy.enemyName, rarity: enemy.rarity || '',
          chance: normChance(enemy.chance), source: 'drops.wf',
        });
      }
    }
  }
  const enemyBpTables = DropsAll.enemyBlueprintTables;
  if (Array.isArray(enemyBpTables)) {
    for (const enemy of enemyBpTables) {
      if (!enemy || !enemy.enemyName) continue;
      if (enemy.items) {
        for (const item of enemy.items) {
          addNamedSource(index, nameMap, item.itemName, {
            type: 'enemy', enemyName: enemy.enemyName, rarity: item.rarity || '',
            chance: normChance(item.chance), source: 'drops.wf',
          });
        }
      }
      if (enemy.mods) {
        for (const mod of enemy.mods) {
          addNamedSource(index, nameMap, mod.modName, {
            type: 'enemy', enemyName: enemy.enemyName, rarity: mod.rarity || '',
            chance: normChance(mod.chance), source: 'drops.wf',
          });
        }
      }
    }
  }
  const bountyCategories = [
    'cetusBountyRewards', 'solarisBountyRewards', 'deimosRewards',
    'zarimanRewards', 'entratiLabRewards', 'hexRewards',
  ];
  for (const cat of bountyCategories) {
    const bountyData = DropsAll[cat];
    if (!Array.isArray(bountyData)) continue;
    for (const bounty of bountyData) {
      if (!bounty || !bounty.rewards) continue;
      const bountyLevel = bounty.bountyLevel || '';
      const rewards = bounty.rewards;
      for (const rotation of ['A', 'B', 'C']) {
        const entries = rewards[rotation];
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
          addNamedSource(index, nameMap, entry.itemName, {
            type: 'bounty', bountyLevel, rotation: rotation === 'A' ? null : rotation,
            stage: entry.stage || '', rarity: entry.rarity || '',
            chance: normChance(entry.chance), source: 'drops.wf',
          });
        }
      }
    }
  }
  const sortieRewards = DropsAll.sortieRewards;
  if (Array.isArray(sortieRewards)) {
    for (const entry of sortieRewards) {
      if (!entry) continue;
      addNamedSource(index, nameMap, entry.itemName, {
        type: 'sortie', rarity: entry.rarity || '', chance: normChance(entry.chance),
        source: 'drops.wf',
      });
    }
  }
  const transientRewards = DropsAll.transientRewards;
  if (Array.isArray(transientRewards)) {
    for (const group of transientRewards) {
      if (!group || !group.rewards) continue;
      const objectiveName = group.objectiveName || '';
      for (const entry of group.rewards) {
        addNamedSource(index, nameMap, entry.itemName, {
          type: 'transient', objectiveName, rotation: entry.rotation || '',
          rarity: entry.rarity || '', chance: normChance(entry.chance),
          source: 'drops.wf',
        });
      }
    }
  }
  const keyRewards = DropsAll.keyRewards;
  if (Array.isArray(keyRewards)) {
    for (const key of keyRewards) {
      if (!key || !key.rewards) continue;
      const keyName = key.keyName || '';
      const rewards = key.rewards;
      for (const rotation of ['A', 'B', 'C']) {
        const entries = rewards[rotation];
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
          addNamedSource(index, nameMap, entry.itemName, {
            type: 'key', keyName, rotation: rotation === 'A' ? null : rotation,
            rarity: entry.rarity || '', chance: normChance(entry.chance),
            source: 'drops.wf',
          });
        }
      }
    }
  }
  const syndicates = DropsAll.syndicates;
  if (syndicates && typeof syndicates === 'object') {
    for (const [syndicateName, offerings] of Object.entries(syndicates)) {
      if (!Array.isArray(offerings)) continue;
      for (const entry of offerings) {
        if (!entry) continue;
        addNamedSource(index, nameMap, entry.item, {
          type: 'syndicate', syndicateName, place: entry.place || '',
          standing: entry.standing ?? null, rarity: entry.rarity || '',
          chance: normChance(entry.chance), source: 'drops.wf',
        });
      }
    }
  }
  const avatarCategories = ['resourceByAvatar', 'sigilByAvatar', 'additionalItemByAvatar'];
  for (const cat of avatarCategories) {
    const data = DropsAll[cat];
    if (!Array.isArray(data)) continue;
    for (const entry of data) {
      if (!entry || !entry.source || !entry.items) continue;
      const sourceName = entry.source;
      for (const item of entry.items) {
        if (!item || !item.item) continue;
        addNamedSource(index, nameMap, item.item, {
          type: 'avatar', sourceName, rarity: item.rarity || '',
          chance: normChance(item.chance), source: 'drops.wf',
        });
      }
    }
  }
}

function buildDropIndex(exportData) {
  if (!exportData) return {};
  const ERg = exportData.ExportRegions;
  const ERw = exportData.ExportRewards;
  const ERel = exportData.ExportRelics;
  const dict = exportData.dict || {};
  const index = {};
  const nameMap = buildNameToUniqueNameMap(exportData, dict);
  const addSource_ = (itemUn, source) => addSource(index, itemUn, source);
  if (ERg && ERw && typeof ERg === 'object' && typeof ERw === 'object') {
    const rotations = ['A', 'B', 'C', 'D'];
    for (const [nodeKey, region] of Object.entries(ERg)) {
      const manifests = region.rewardManifests;
      if (!manifests || !Array.isArray(manifests)) continue;
      const nodeNameKey = region.name;
      const nodeName = (dict[nodeNameKey] || dict['/' + nodeNameKey] || nodeNameKey || nodeKey).replace(/<[^>]*>/g, '').trim();
      const missionType = region.missionType || '';
      for (const manifestPath of manifests) {
        const rewardTable = ERw[manifestPath];
        if (!rewardTable || !Array.isArray(rewardTable)) continue;
        for (let tierIdx = 0; tierIdx < rewardTable.length; tierIdx++) {
          const tier = rewardTable[tierIdx];
          if (!Array.isArray(tier)) continue;
          const rotation = rotations[tierIdx] || `Tier ${tierIdx + 1}`;
          for (const entry of tier) {
            if (!entry || !entry.type) continue;
            addSource_(entry.type, {
              type: 'mission', node: nodeKey, nodeName, missionType,
              rotation: tierIdx > 0 ? rotation : null,
              chance: entry.probability ?? null, itemCount: entry.itemCount ?? 1,
            });
          }
        }
      }
    }
  }
  if (ERel && ERw) {
    const relics = Array.isArray(ERel) ? ERel : Object.values(ERel);
    for (const relic of relics) {
      if (!relic || !relic.rewardManifest) continue;
      const rewardTable = ERw[relic.rewardManifest];
      if (!rewardTable || !Array.isArray(rewardTable)) continue;
      const pool = Array.isArray(rewardTable[0]) ? rewardTable[0] : rewardTable;
      const relicEra = relic.era || '';
      const relicCat = relic.category || '';
      for (const entry of pool) {
        if (!entry || !entry.type) continue;
        addSource_(entry.type, {
          type: 'relic', relicEra,
          relicName: relicCat ? `${relicEra} ${relicCat}` : null,
          rarity: entry.rarity || 'COMMON', relicManifest: relic.rewardManifest,
        });
      }
    }
  }
  const DropsAll = exportData.DropsAll;
  processDropsAll(index, DropsAll, nameMap);
  return index;
}

console.log('Building dropIndex...');
const dropIndex = buildDropIndex(exportData);
console.log(`dropIndex has ${Object.keys(dropIndex).length} keys`);

// ── Replicate getAcquisitionInfo ──────────────────────────────────────────
function getItemDrops(uniqueName) {
  const item = itemIndex.get(uniqueName);
  if (!item || !Array.isArray(item.drops) || item.drops.length === 0) return null;
  return item.drops;
}

function getAcquisitionInfo(dropIndexKey, displayName) {
  const itemDrops = getItemDrops(dropIndexKey);
  if (itemDrops) return { stage: 'warframe-items', sources: itemDrops };
  const overrideText = overrides?.mods?.[displayName] ?? overrides?.components?.[dropIndexKey];
  if (overrideText) return { stage: 'override', sources: [{ type: 'override', text: overrideText }] };
  const norm = dropIndexKey?.replace('/StoreItems/', '/');
  const dropSources = dropIndex?.[norm] || dropIndex?.[dropIndexKey] ||
    (displayName ? dropIndex?.['display:' + displayName.toLowerCase().trim()] : null);
  if (dropSources && dropSources.length > 0) return { stage: 'dropIndex', sources: dropSources };
  return { stage: 'wiki-fallback', sources: [] };
}

// ── Gather the items each screen would show ───────────────────────────────
// Mods screen: inventoryData.mods_catalog ?? inventoryData.mods
// Relics screen: getRelicCatalog(exportData) merged with owned
// Inventory screen: various catalogs

// For the audit, we use the full warframe-items data as a proxy for what
// the screens can show (mods, relics, weapons, etc.), since we don't have
// a live inventory. This over-approximates but is useful for coverage.

// Load warframe-items categories to audit
const wiBase = resolve(ROOT, 'node_modules/warframe-items/data/json');
const auditCategories = [
  'Mods', 'Arcanes', 'Warframes', 'Primary', 'Secondary', 'Melee',
  'Archwing', 'Arch-Gun', 'Arch-Melee', 'Sentinels', 'SentinelWeapons',
  'Relics', 'Gear', 'Resources', 'Fish', 'Sigils', 'Skins', 'Misc',
  'Railjack', 'Pets', 'Quests',
];

const results = { 'warframe-items': [], override: [], dropIndex: [], 'wiki-fallback': [] };
const fallbackDetails = [];

for (const cat of auditCategories) {
  let items;
  try {
    items = JSON.parse(readFileSync(resolve(wiBase, `${cat}.json`), 'utf-8'));
  } catch {
    continue;
  }
  for (const item of items) {
    if (!item.uniqueName) continue;
    const name = item.name || item.uniqueName.split('/').pop();
    const res = getAcquisitionInfo(item.uniqueName, name);
    results[res.stage].push({ cat, uniqueName: item.uniqueName, name });
    if (res.stage === 'wiki-fallback') {
      // Determine why
      const inExtraction = itemIndex.has(item.uniqueName);
      const hasWIDrops = inExtraction && itemIndex.get(item.uniqueName).drops?.length > 0;
      const norm = item.uniqueName.replace('/StoreItems/', '/');
      const inDropIndex = dropIndex[norm] || dropIndex[item.uniqueName] ||
        (name ? dropIndex['display:' + name.toLowerCase().trim()] : null);
      let reason;
      if (!inExtraction) reason = 'not in warframe-items extraction (category not extracted)';
      else if (!hasWIDrops) reason = 'warframe-items has no drops for it';
      else reason = 'warframe-items has drops but lookup failed (key mismatch)';
      if (inDropIndex) reason += ' [NOTE: dropIndex HAS a match but chain reached wiki?]';
      fallbackDetails.push({ cat, uniqueName: item.uniqueName, name, reason, inExtraction, hasWIDrops, inDropIndex: !!inDropIndex });
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────
console.log('\n=== ACQUISITION AUDIT RESULTS ===');
console.log(`Total items audited: ${Object.values(results).reduce((s, a) => s + a.length, 0)}`);
for (const [stage, items] of Object.entries(results)) {
  console.log(`\n${stage}: ${items.length}`);
  // Show category breakdown
  const byCat = {};
  for (const i of items) byCat[i.cat] = (byCat[i.cat] || 0) + 1;
  console.log('  by category:', JSON.stringify(byCat));
}

console.log('\n=== WIKI-FALLBACK ITEMS (sample, first 50) ===');
for (const d of fallbackDetails.slice(0, 50)) {
  console.log(`  [${d.cat}] ${d.name} (${d.uniqueName})`);
  console.log(`    reason: ${d.reason}`);
}

// Summary of fallback reasons
console.log('\n=== FALLBACK REASON BREAKDOWN ===');
const reasonCounts = {};
for (const d of fallbackDetails) {
  const key = d.reason.split(' [NOTE')[0];
  reasonCounts[key] = (reasonCounts[key] || 0) + 1;
}
for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count}: ${reason}`);
}

// Write full report to file
const outPath = resolve(ROOT, 'scripts/data-sources/acquisition-audit-report.json');
const report = {
  generated: new Date().toISOString(),
  totals: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.length])),
  fallbackDetails,
};
const { writeFileSync } = await import('node:fs');
writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
console.log(`\nFull report written to ${outPath}`);
