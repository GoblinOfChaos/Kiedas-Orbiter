// Audit the current acquisition resolver against the real local app data.
// This intentionally loads the shipped resolver source rather than maintaining
// a second copy of its classification rules.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const EXPORT_ROOT = resolve(process.env.HOME, '.local/share/kiedas-orbiter/data/export');
const ASSET_ROOT = resolve(ROOT, 'src-tauri/data/assets/data');
const OUTPUT = resolve(ROOT, 'scripts/data-sources/current-acquisition-gaps.md');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const loadExport = (name) => readJson(resolve(EXPORT_ROOT, `${name}.json`));
const canonical = (value) => value?.replace('/StoreItems/', '/') || value;

const acquisitionItems = readJson(resolve(ASSET_ROOT, 'warframe-items-acquisition.json'));
const acquisitionByPath = new Map(acquisitionItems.map((item) => [canonical(item.uniqueName), item]));
const overrides = readJson(resolve(ASSET_ROOT, 'acquisition_overrides.json'));
const exportData = {};
for (const name of [
  'DropsAll', 'ExportArcanes', 'ExportAvionics', 'ExportBoosterPacks',
  'ExportBundles', 'ExportCustoms', 'ExportDrones', 'ExportFlavour',
  'ExportFocusUpgrades', 'ExportFusionBundles', 'ExportGear', 'ExportKeys',
  'ExportMisc', 'ExportRailjackWeapons', 'ExportRecipes', 'ExportRegions',
  'ExportRelics', 'ExportResources', 'ExportRewards', 'ExportSentinels',
  'ExportSyndicates', 'ExportUpgrades', 'ExportWarframes', 'ExportWeapons',
  'dict',
]) {
  try { exportData[name] = loadExport(name); } catch { /* optional table */ }
}
exportData.ExportUpgradesLocalized = exportData.ExportUpgrades;

const readAsset = (name) => readJson(resolve(ASSET_ROOT, name));
const bundledWikiBaroAcquisition = readAsset('wiki-baro-acquisition.json');
const bundledWikiResourceAcquisition = readAsset('wiki-resources-acquisition.json');
const bundledWikiPageAcquisition = readAsset('wiki-page-acquisition.json');

const ITEM_TABLES = new Set([
  'ExportArcanes', 'ExportAvionics', 'ExportCustoms', 'ExportFlavour',
  'ExportGear', 'ExportKeys', 'ExportMisc', 'ExportRailjackWeapons',
  'ExportRelics', 'ExportResources', 'ExportSentinels', 'ExportSyndicates',
  'ExportUpgrades', 'ExportWarframes', 'ExportWeapons',
]);

// The browser source uses Vite extensionless imports. Replace only those
// imports with the real bundled acquisition data and the already-tested
// Baro-name constant so the exported functions remain the app's functions.
const acquisitionSource = readFileSync(resolve(ROOT, 'src/lib/acquisitionInfo.js'), 'utf8')
  .replace(
    "import bundledWikiBaroAcquisition from '../../src-tauri/data/assets/data/wiki-baro-acquisition.json';",
    `const bundledWikiBaroAcquisition = ${JSON.stringify(bundledWikiBaroAcquisition)};`,
  )
  .replace(
    "import bundledWikiResourceAcquisition from '../../src-tauri/data/assets/data/wiki-resources-acquisition.json';",
    `const bundledWikiResourceAcquisition = ${JSON.stringify(bundledWikiResourceAcquisition)};`,
  )
  .replace(
    "import bundledWikiPageAcquisition from '../../src-tauri/data/assets/data/wiki-page-acquisition.json';",
    `const bundledWikiPageAcquisition = ${JSON.stringify(bundledWikiPageAcquisition)};`,
  )
  .replace(
    "import { getItemDrops, getItemRecipe, getWikiLink, isCraftable } from './acquisitionData';",
    `const acquisitionIndex = ${JSON.stringify([...acquisitionByPath.entries()])};
     const acquisitionMap = new Map(acquisitionIndex);
     const getItemDrops = (uniqueName) => {
       const item = acquisitionMap.get(uniqueName?.replace('/StoreItems/', '/') || uniqueName);
       if (!item?.drops?.length) return null;
       return [...item.drops].sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0)).map((d) => ({ type: 'drop', location: d.location, dropType: d.type, rarity: d.rarity, chance: d.chance, source: 'warframe-items' }));
     };
     const isCraftable = (uniqueName) => !!acquisitionMap.get(uniqueName?.replace('/StoreItems/', '/') || uniqueName)?.craftable;
     const getItemRecipe = (uniqueName) => {
       const item = acquisitionMap.get(uniqueName?.replace('/StoreItems/', '/') || uniqueName);
       if (!item?.craftable || !Array.isArray(item.components)) return null;
       const ingredients = item.components.filter((component) => component?.uniqueName && !/^blueprint$/i.test(component.name || '')).map((component) => ({ itemType: component.uniqueName, count: Number(component.itemCount) || 1, name: component.name || component.uniqueName }));
       return ingredients.length ? { blueprintCost: item.bpCost, buildCost: item.buildPrice, buildTime: item.buildTime, rushCost: item.skipBuildTimePrice, ingredients } : null;
     };
     const getWikiLink = (uniqueName, displayName) => ({ url: displayName || uniqueName, isDirect: false });`,
  );
const acquisition = await import(`data:text/javascript;base64,${Buffer.from(acquisitionSource).toString('base64')}`);

const dropsSource = readFileSync(resolve(ROOT, 'src/lib/dropsParser.js'), 'utf8')
  .replace("import { BARO_RELIC_NAMES } from './baroRelics'", 'const BARO_RELIC_NAMES = [];');
const dropsModule = await import(`data:text/javascript;base64,${Buffer.from(dropsSource).toString('base64')}`);
const dropIndex = dropsModule.buildDropIndex(exportData);

const indexes = {
  recipe: acquisition.buildRecipeResultIndex(exportData),
  market: acquisition.buildMarketIndex(exportData),
  always: acquisition.buildAlwaysAvailableIndex(exportData),
  bundle: acquisition.buildBundleIndex(exportData),
  syndicate: acquisition.buildSyndicateIndex(exportData),
  sigil: acquisition.buildWikiSigilIndex(readAsset('wiki-sigils-acquisition.json')),
  vendor: acquisition.buildWikiVendorIndex(readAsset('wiki-vendors-acquisition.json')),
  tennogen: acquisition.buildWikiTennoGenIndex(readAsset('wiki-tennogen-acquisition.json')),
  baro: acquisition.buildWikiBaroIndex(readAsset('wiki-baro-acquisition.json')),
  blueprint: acquisition.buildWikiBlueprintIndex(readAsset('wiki-blueprints-acquisition.json')),
  research: acquisition.buildWikiResearchIndex(readAsset('wiki-research-acquisition.json')),
  resource: acquisition.buildWikiResourceIndex(readAsset('wiki-resources-acquisition.json')),
  wikiPage: acquisition.buildWikiPageAcquisitionIndex(readAsset('wiki-page-acquisition.json')),
  status: acquisition.buildWikiAcquisitionStatusIndex(readAsset('wiki-acquisition-status.json')),
  relicState: acquisition.buildRelicStateIndex(exportData),
  exportVendor: acquisition.buildExportVendorIndex(exportData),
  glyph: acquisition.buildGlyphSupplementIndex(readAsset('browse-wf-glyphs.json')),
};

function displayNameFor(uniqueName, entry) {
  const dict = exportData.dict || {};
  const key = entry?.name || entry?.displayName;
  const resolved = key ? (dict[key] || dict[`/${key}`] || key) : '';
  return typeof resolved === 'string' ? resolved.replace(/<[^>]*>/g, '').trim() : '';
}

const catalog = new Map();
function addItem(uniqueName, name, category) {
  const key = canonical(uniqueName);
  if (!key || !name || name.startsWith('/Lotus/')) return;
  if (!catalog.has(key)) catalog.set(key, { uniqueName: key, name, category });
}

for (const item of acquisitionItems) addItem(item.uniqueName, item.name, item.category || item.type || 'warframe-items');
for (const [tableName, table] of Object.entries(exportData)) {
  if (!ITEM_TABLES.has(tableName) || !table || typeof table !== 'object') continue;
  for (const [key, entry] of Object.entries(table)) {
    if (!entry || typeof entry !== 'object') continue;
    const uniqueName = entry.uniqueName || entry.ItemType || key;
    addItem(uniqueName, displayNameFor(uniqueName, entry), tableName);
  }
}
for (const [uniqueName, relic] of Object.entries(exportData.ExportRelics || {})) {
  if (relic?.era && relic?.category) addItem(uniqueName, `${relic.era} ${relic.category}`, 'Relics');
}
try {
  const combined = readJson(resolve(ROOT, 'src-tauri/data/assets/wfcd/wfcd-combined.json'));
  for (const item of combined.Glyphs || []) addItem(item.uniqueName, item.name, 'Glyphs');
} catch { /* Glyphs are optional for older bundles */ }

function resolveItem(item) {
  const info = acquisition.getAcquisitionInfo(
    item.uniqueName,
    item.name,
    dropIndex,
    overrides,
    indexes.recipe,
    indexes.market,
    indexes.bundle,
    indexes.syndicate,
    indexes.sigil,
    indexes.vendor,
    indexes.tennogen,
    indexes.baro,
    indexes.exportVendor,
    indexes.always,
    indexes.glyph,
    indexes.blueprint,
    indexes.research,
    indexes.relicState,
    indexes.resource,
    indexes.wikiPage,
    indexes.status,
  );
  const texts = (info.sources || []).map((source) => source.text || '').filter(Boolean);
  const genericFoundry = texts.some((text) => text === 'Built in the Foundry from a blueprint and its components - see the Foundry tab for the recipe.');
  return { info, texts, genericFoundry };
}

const genericWiki = [];
const genericFoundry = [];
const resolvedCounts = {};
for (const item of [...catalog.values()].sort((a, b) => a.name.localeCompare(b.name) || a.uniqueName.localeCompare(b.uniqueName))) {
  const result = resolveItem(item);
  if (result.genericFoundry) genericFoundry.push({ ...item, text: result.texts.find((text) => text.startsWith('Built in the Foundry')) });
  if (!result.info.sources?.length) genericWiki.push({ ...item, wiki: result.info.wikiLink?.url || '', reason: 'sources=[]; drawer displays generic wiki/no-info fallback' });
  else resolvedCounts[result.info.sources[0].type || 'unknown'] = (resolvedCounts[result.info.sources[0].type || 'unknown'] || 0) + 1;
}

const lines = [
  '# Current acquisition gaps',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'This report runs the current `getAcquisitionInfo()` implementation against the real local export, bundled warframe-items acquisition data, curated wiki assets, and browse.wf Glyph data.',
  '',
  `Catalog items audited: **${catalog.size}**`,
  `Resolved items: **${catalog.size - genericWiki.length}**`,
  `Generic wiki / no-info items: **${genericWiki.length}**`,
  `Generic Foundry sentence items: **${genericFoundry.length}**`,
  '',
  'The app represents both “generic wiki” and “no info” as `sources: []`; those items are listed together below with their unique path and resolver reason.',
  '',
  '## Generic Foundry sentence',
  '',
  '| Name | Unique name | Category | Current text |',
  '|---|---|---|---|',
  ...(genericFoundry.length ? genericFoundry.map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | ${item.text} |`) : ['| None |  |  |  |']),
  '',
  '## Generic wiki / no info',
  '',
  '| Name | Unique name | Category | Fallback reason |',
  '|---|---|---|---|',
  ...(genericWiki.length ? genericWiki.map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | ${item.reason} |`) : ['| None |  |  |  |']),
  '',
  '## Resolved source-stage counts',
  '',
  ...Object.entries(resolvedCounts).sort(([a], [b]) => a.localeCompare(b)).map(([stage, count]) => `- ${stage}: ${count}`),
  '',
];

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${lines.join('\n')}\n`);
console.log(`Audited ${catalog.size} catalog items: ${genericWiki.length} generic/no-info, ${genericFoundry.length} generic Foundry.`);
console.log(`Wrote ${OUTPUT}`);
