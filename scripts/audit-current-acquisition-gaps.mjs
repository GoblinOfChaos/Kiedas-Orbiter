// Audit the current acquisition resolver against the real local app data.
// This intentionally loads the shipped resolver source rather than maintaining
// a second copy of its classification rules.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const EXPORT_ROOT = resolve(process.env.HOME, '.local/share/kiedas-orbiter/data/export');
const ASSET_ROOT = resolve(ROOT, 'src-tauri/data/assets/data');
const OUTPUT = resolve(ROOT, 'scripts/data-sources/current-acquisition-gaps.md');
const EVIDENCE_OUTPUT = resolve(ROOT, 'scripts/data-sources/acquisition-item-evidence.json');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const loadExport = (name) => readJson(resolve(EXPORT_ROOT, `${name}.json`));
const canonical = (value) => typeof value === 'string' ? value.replaceAll('/StoreItems/', '/') : value;

const acquisitionItems = readJson(resolve(ASSET_ROOT, 'warframe-items-acquisition.json'));
const acquisitionByPath = new Map(acquisitionItems.map((item) => [canonical(item.uniqueName), item]));
const userInventory = readJson(resolve(process.env.HOME, '.local/share/kiedas-orbiter/data/user/inventory.json'));
const ownedResourcePaths = new Set((userInventory.MiscItems || []).map((item) => canonical(item?.ItemType)).filter(Boolean));
const ownedCosmeticPaths = new Set([
  ...(userInventory.WeaponSkins || []),
  ...(userInventory.FlavourItems || []),
  ...(userInventory.MiscItems || []),
  ...(userInventory.ShipDecorations || []),
].map((item) => canonical(item?.ItemType)).filter(Boolean));
const ownedUpgradePaths = new Set([
  ...(userInventory.Upgrades || []),
  ...(userInventory.RawUpgrades || []),
].map((item) => canonical(item?.ItemType)).filter(Boolean));
const ownedKeyPaths = new Set([
  ...(userInventory.LevelKeys || []),
  ...(userInventory.QuestKeys || []),
].map((item) => canonical(item?.ItemType)).filter(Boolean));
const acquisitionArcanePaths = new Set(acquisitionItems
  .filter((item) => item?.uniqueName?.includes('/Upgrades/CosmeticEnhancers/'))
  .map((item) => canonical(item.uniqueName)));
const overrides = readJson(resolve(ASSET_ROOT, 'acquisition_overrides.json'));
const exportData = {};
for (const name of [
  'DropsAll', 'ExportArcanes', 'ExportAvionics', 'ExportBoosterPacks',
  'ExportBundles', 'ExportCustoms', 'ExportDrones', 'ExportFlavour',
  'ExportFocusUpgrades', 'ExportFusionBundles', 'ExportGear', 'ExportKeys',
  'ExportMisc', 'ExportRailjackWeapons', 'ExportRecipes', 'ExportRegions',
  'ExportRelics', 'ExportResources', 'ExportRewards', 'ExportSentinels',
  'ExportSyndicates', 'ExportUpgrades', 'ExportVendors', 'ExportWarframes', 'ExportWeapons',
  'dict',
]) {
  try { exportData[name] = loadExport(name); } catch { /* optional table */ }
}
exportData.ExportUpgradesLocalized = exportData.ExportUpgrades;

const readAsset = (name) => readJson(resolve(ASSET_ROOT, name));
let wikiCosmeticModuleByPath = new Map();
try {
  const moduleAudit = readJson(resolve(ROOT, 'scripts/data-sources/wiki-cosmetic-module-audit.json'));
  wikiCosmeticModuleByPath = new Map((moduleAudit.items || []).map((item) => [canonical(item.uniqueName), item]));
} catch { /* optional discovery audit; the resolver remains independent of it */ }
const bundledWikiBaroAcquisition = readAsset('wiki-baro-acquisition.json');
const bundledWikiResourceAcquisition = readAsset('wiki-resources-acquisition.json');
const bundledWikiPageAcquisition = readAsset('wiki-page-acquisition.json');
const bundledWikiDescriptionAcquisition = readAsset('wiki-description-acquisition.json');
const verifiedAcquisitions = await import(pathToFileURL(resolve(ROOT, 'src/lib/wikiVerifiedAcquisitions.js')).href);

const ITEM_TABLES = new Set([
  'ExportArcanes', 'ExportAvionics', 'ExportCustoms', 'ExportFlavour',
  'ExportGear', 'ExportKeys', 'ExportMisc', 'ExportRailjackWeapons',
  'ExportRelics', 'ExportResources', 'ExportSentinels', 'ExportSyndicates',
  'ExportUpgrades', 'ExportWarframes', 'ExportWeapons',
]);

// Exact-name pages found in the checked Wiki-repo snapshot. These are
// identity records only: the snapshot pages were inspected for drops,
// components, vendors, bundles, market fields, and acquisition prose. None
// of these pages supplied a route for the matching unresolved object.
const WIKI_REPO_EXACT_PAGES = new Map([
  ['Amalgam Glyph', 'cosmetics/glyphs/amalgam-glyph.md'],
  ['Chat Moderator Glyph', 'cosmetics/glyphs/chat-moderator-glyph.md'],
  ['Cookie Boot Glyph', 'cosmetics/glyphs/cookie-boot-glyph.md'],
  ['Digital Extremes Glyph', 'cosmetics/glyphs/digital-extremes-glyph.md'],
  ['Gcx 2024 Glyph', 'cosmetics/glyphs/gcx-2024-glyph.md'],
  ['Guides Of The Lotus Glyph', 'cosmetics/glyphs/guides-of-the-lotus-glyph.md'],
  ['Infestation Glyph', 'cosmetics/glyphs/infestation-glyph.md'],
  ['Infested Deimos Glyph', 'cosmetics/glyphs/infested-deimos-glyph.md'],
  ['Legendary Quasars Glyph', 'cosmetics/glyphs/legendary-quasars-glyph.md'],
  ['Lotus Symbol Glyph', 'cosmetics/glyphs/lotus-symbol-glyph.md'],
  ['Mglblaze Glyph', 'cosmetics/glyphs/mglblaze-glyph.md'],
  ['Orokin Glyph', 'cosmetics/glyphs/orokin-glyph.md'],
  ['Save Popcorn Glyph', 'cosmetics/glyphs/save-popcorn-glyph.md'],
  ['Snowlit Glyph', 'cosmetics/glyphs/snowlit-glyph.md'],
  ['Tenno Translator Glyph', 'cosmetics/glyphs/tenno-translator-glyph.md'],
  ['Top Hat & Monocle Glyph', 'cosmetics/glyphs/top-hat-monocle-glyph.md'],
  ['Warframe Creator Glyph', 'cosmetics/glyphs/warframe-creator-glyph.md'],
  ['Warframe Partner Glyph', 'cosmetics/glyphs/warframe-partner-glyph.md'],
  ['Warframe Partner Mug Glyph', 'cosmetics/glyphs/warframe-partner-mug-glyph.md'],
  ['Warframefanchannel Glyph', 'cosmetics/glyphs/warframefanchannel-glyph.md'],
  ['Flickering Sigil', 'cosmetics/sigils/flickering-sigil.md'],
  ['Rhino Rubedo Plated Helmet', 'cosmetics/skins/rhino-rubedo-plated-helmet.md'],
  ['Solaris Emblem', 'cosmetics/skins/solaris-emblem.md'],
  ['Voidrig Necramech Helmet', 'cosmetics/skins/voidrig-necramech-helmet.md'],
  ['Vox Solaris Mask', 'cosmetics/skins/vox-solaris-mask.md'],
  ['Beckonsnare', 'gear/beckonsnare.md'],
  ['Scorpion Specter', 'gear/scorpion-specter.md'],
]);
const WIKI_REPO_URL = 'https://github.com/rhinos0608/Warframe-Wiki-Repo/blob/main/warframe-wiki/';

// These export definitions are hidden/unreleased/removed placeholders, not
// obtainable unowned catalog objects. The Mods screen applies the same
// exclusion while preserving owned copies.
const UNOBTAINABLE_UNOWNED_MODS = new Set([
  '/Lotus/Powersuits/Banshee/SonarPvPAugmentCard',
  '/Lotus/Upgrades/Mods/Sentinel/Kubrow/ChargerFinisherMod',
  '/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponCritChanceModExpert',
  '/Lotus/Upgrades/Mods/Rifle/Expert/SniperReloadDamageModExpert',
  '/Lotus/Upgrades/Mods/Archwing/Rifle/Expert/ArchwingWeaponElectricityDamageModExpert',
  '/Lotus/Upgrades/Mods/Warframe/Expert/AvatarShieldRechargeRateModExpert',
  '/Lotus/Upgrades/Mods/Syndicate/BallisticaMod',
]);
for (const tableName of ['ExportUpgrades', 'ExportAvionics']) {
  for (const [key, entry] of Object.entries(exportData[tableName] || {})) {
    if (entry?.name === '/Lotus/Language/Items/EmptyArtifact' && entry?.excludeFromCodex === true) {
      UNOBTAINABLE_UNOWNED_MODS.add(canonical(key));
    }
  }
}

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
    "import bundledWikiDescriptionAcquisition from '../../src-tauri/data/assets/data/wiki-description-acquisition.json';",
    `const bundledWikiDescriptionAcquisition = ${JSON.stringify(bundledWikiDescriptionAcquisition)};`,
  )
  .replace(
    "import { WIKI_VERIFIED_ACQUISITIONS, WIKI_VERIFIED_DISPOSITIONS } from './wikiVerifiedAcquisitions';",
    `const WIKI_VERIFIED_ACQUISITIONS = new Map(${JSON.stringify([...verifiedAcquisitions.WIKI_VERIFIED_ACQUISITIONS.entries()])});
     const WIKI_VERIFIED_DISPOSITIONS = new Map(${JSON.stringify([...verifiedAcquisitions.WIKI_VERIFIED_DISPOSITIONS.entries()])});`,
  )
  .replace(
    "import { getItemDrops, getItemRecipe, getWikiLink, isCraftable } from './acquisitionData';",
    `const acquisitionIndex = ${JSON.stringify([...acquisitionByPath.entries()])};
     const acquisitionMap = new Map(acquisitionIndex);
     const getItemDrops = (uniqueName) => {
       const item = acquisitionMap.get(typeof uniqueName === 'string' ? uniqueName.replaceAll('/StoreItems/', '/') : uniqueName);
       if (!item?.drops?.length) return null;
       return [...item.drops].sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0)).map((d) => ({ type: 'drop', location: d.location, dropType: d.type, rarity: d.rarity, chance: d.chance, source: 'warframe-items' }));
     };
     const isCraftable = (uniqueName) => !!acquisitionMap.get(typeof uniqueName === 'string' ? uniqueName.replaceAll('/StoreItems/', '/') : uniqueName)?.craftable;
     const getItemRecipe = (uniqueName) => {
       const item = acquisitionMap.get(typeof uniqueName === 'string' ? uniqueName.replaceAll('/StoreItems/', '/') : uniqueName);
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
  exalted: acquisition.buildExaltedWeaponIndex(exportData),
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
  component: acquisition.buildExportComponentIndex(exportData),
};

function displayNameFor(uniqueName, entry) {
  const dict = exportData.dict || {};
  const key = entry?.name || entry?.displayName;
  const resolved = key ? (dict[key] || dict[`/${key}`] || key) : '';
  return typeof resolved === 'string' ? resolved.replace(/<[^>]*>/g, '').trim() : '';
}

const catalog = new Map();
const wfcdGlyphByPath = new Map();
function addItem(uniqueName, name, category) {
  const key = canonical(uniqueName);
  if (!key || !name || name.startsWith('/Lotus/')) return;
  const existing = catalog.get(key);
  if (existing) {
    existing.sourcedCategories = [...new Set([...(existing.sourcedCategories || []), category])];
    return;
  }
  catalog.set(key, {
    uniqueName: key,
    name,
    category,
    unavailablePlaceholder: UNOBTAINABLE_UNOWNED_MODS.has(key),
    sourcedCategories: [category],
  });
}

for (const item of acquisitionItems) {
  const key = canonical(item.uniqueName);
  if (exportData.ExportResources?.[key] && !ownedResourcePaths.has(key)) continue;
  addItem(key, item.name, item.category || item.type || 'warframe-items');
}
for (const [tableName, table] of Object.entries(exportData)) {
  if (!ITEM_TABLES.has(tableName) || !table || typeof table !== 'object') continue;
  for (const [key, entry] of Object.entries(table)) {
    if (!entry || typeof entry !== 'object') continue;
    // Inventory.jsx renders resources from the current save's MiscItems, not
    // every resource definition in ExportResources. Keep the audit aligned
    // with that real catalog rather than auditing thousands of unrendered
    // decorations, internal tokens, and future-only definitions.
    if (tableName === 'ExportResources' && !ownedResourcePaths.has(canonical(key))) continue;
    // ExportKeys contains quest-chain definitions that are not rendered as
    // Inventory cards when DE marks them hidden from the Codex. Keep an owned
    // key auditable, but do not treat an unowned internal quest recipe as a
    // player-facing catalog object.
    if (tableName === 'ExportKeys' && entry.excludeFromCodex === true && !ownedKeyPaths.has(canonical(key))) continue;
    // Inventory.jsx applies the maintained acquisition allowlist to the
    // Arcanes catalog and excludes retired/internal export definitions unless
    // an owned copy is present. Mirror that exact catalog boundary here.
    if (tableName === 'ExportArcanes') {
      const arcanePath = canonical(key);
      const arcaneName = displayNameFor(arcanePath, entry).toLowerCase();
      const retained = acquisitionArcanePaths.has(arcanePath)
        || ['secondary cryogenic', 'pax soar'].includes(arcaneName)
        || ownedUpgradePaths.has(arcanePath);
      if (!retained) continue;
      if (!entry.levelStats?.length && !ownedUpgradePaths.has(arcanePath)) continue;
    }
    // Mods.jsx mirrors inventoryParser: DE definitions explicitly excluded
    // from the Codex are not unowned catalog cards. They remain auditable only
    // when present in the user's owned upgrade inventory.
    if (tableName === 'ExportUpgrades' && entry.excludeFromCodex === true && !ownedUpgradePaths.has(canonical(key))) continue;
    // Cosmetics.jsx renders skins/sigils from ExportCustoms and glyphs from
    // WFCD. Other ExportCustoms/ExportFlavour entries are not catalog cards.
    if (tableName === 'ExportCustoms' && !/\/Upgrades\/Skins\//i.test(key)) continue;
    if (tableName === 'ExportFlavour') continue;
    if (tableName === 'ExportSyndicates') continue;
    const uniqueName = entry.uniqueName || entry.ItemType || key;
    addItem(uniqueName, displayNameFor(uniqueName, entry), tableName);
  }
}
for (const [uniqueName, relic] of Object.entries(exportData.ExportRelics || {})) {
  if (relic?.era && relic?.category) addItem(uniqueName, `${relic.era} ${relic.category}`, 'Relics');
}
try {
  const combined = readJson(resolve(ROOT, 'src-tauri/data/assets/wfcd/wfcd-combined.json'));
  for (const item of combined.Glyphs || []) {
    const key = canonical(item.uniqueName);
    if (key) wfcdGlyphByPath.set(key, {
      dataset: 'WFCD wfcd-combined Glyphs',
      uniqueName: item.uniqueName,
      name: item.name ?? null,
      type: item.type ?? null,
      category: item.category ?? null,
    });
    if ((item.excludeFromCodex === true || item.codexSecret === true) && !ownedCosmeticPaths.has(key)) continue;
    addItem(item.uniqueName, item.name, 'Glyphs');
  }
} catch { /* Glyphs are optional for older bundles */ }

// Cosmetics.jsx renders every ExportCustoms skin/sigil plus every WFCD Glyph.
for (const [uniqueName, entry] of Object.entries(exportData.ExportCustoms || {})) {
  if (!/\/Upgrades\/Skins\//i.test(uniqueName)) continue;
  addItem(uniqueName, displayNameFor(uniqueName, entry), 'Cosmetics');
}

// Add exact export-state evidence to the in-memory status index before the
// resolver runs. This keeps one audit invocation self-contained; it must not
// require a second run merely because the status asset was refreshed at the
// end of the previous invocation.
for (const item of catalog.values()) {
  const status = indexes.status?.get(item.uniqueName);
  if (!status) continue;
  const hidden = [...(item.sourcedCategories || [])].flatMap((tableName) => {
    const entry = exportData[tableName]?.[item.uniqueName];
    return entry ? [entry] : [];
  }).some((entry) =>
    (entry.codexSecret === true || entry.excludeFromCodex === true)
    && (entry.showInInventory === false || entry.excludeFromMarket === true),
  );
  if (hidden) indexes.status.set(item.uniqueName, {
    ...status,
    exportDisposition: 'The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded.',
  });
}

function screensFor(item) {
  const categories = item.sourcedCategories || [];
  const screens = new Set();
  if (categories.includes('Cosmetics')) screens.add('Cosmetics');
  if (categories.includes('Glyphs')) screens.add('Cosmetics');
  if (categories.includes('Relics')) screens.add('Relics');
  if (categories.includes('ExportUpgrades') || categories.includes('ExportAvionics')) screens.add('Mods');
  if (!screens.size || categories.some((category) => category === 'warframe-items' || /^Export(Weapons|Warframes|Sentinels|Gear|Resources|Misc|RailjackWeapons|Drones|Keys|Customs)$/.test(category))) {
    screens.add('Inventory');
  }
  const recipe = indexes.recipe?.get(item.uniqueName);
  if (recipe || acquisitionByPath.get(item.uniqueName)?.craftable) screens.add('Foundry');
  return [...screens].sort();
}

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
    indexes.exalted,
    indexes.component,
  );
  const texts = (info.sources || []).map((source) => source.text || '').filter(Boolean);
  const genericFoundry = texts.some((text) => text === 'Built in the Foundry from a blueprint and its components - see the Foundry tab for the recipe.');
  return { info, texts, genericFoundry };
}

const genericWiki = [];
const genericFoundry = [];
const unavailablePlaceholders = [];
const verifiedUnavailable = [];
const unverifiedStatus = [];
const manualUnverified = [];
const recipeOnly = [];
const resolvedCounts = {};
const evidence = [];
const exportStatus = new Map();
for (const item of [...catalog.values()].sort((a, b) => a.name.localeCompare(b.name) || a.uniqueName.localeCompare(b.uniqueName))) {
  const result = resolveItem(item);
  if (result.genericFoundry) genericFoundry.push({ ...item, text: result.texts.find((text) => text.startsWith('Built in the Foundry')) });
  if (item.unavailablePlaceholder) unavailablePlaceholders.push({ ...item, reason: 'DE export placeholder is hidden from unowned Mods catalog; owned copies remain visible.' });
  const sourceRecords = result.info.sources || [];
  const statusRecord = sourceRecords.find((source) => source.type === 'status');
  const dispositionRecord = statusRecord && (
    ['DE export status', 'Warframe Wiki disposition'].includes(statusRecord.source)
    || statusRecord.source?.includes('exact')
  )
    ? statusRecord
    : null;
  const weakSourceRecord = sourceRecords.find((source) =>
    source.text?.startsWith('Listed under ') ||
    source.source === 'DE export path rule' ||
    source.source === 'DE export variant identity' ||
    source.text === 'Available from an in-game vendor.'
  );
  const manualRecord = sourceRecords.find((source) => source.type === 'override');
  if (!sourceRecords.length) {
    if (!item.unavailablePlaceholder) genericWiki.push({ ...item, wiki: result.info.wikiLink?.url || '', reason: 'sources=[]; drawer displays generic wiki/no-info fallback' });
  } else if (dispositionRecord && !item.unavailablePlaceholder) {
    verifiedUnavailable.push({ ...item, text: dispositionRecord.text, wiki: result.info.wikiLink?.url || '' });
  } else if ((statusRecord || weakSourceRecord) && !item.unavailablePlaceholder) {
    const record = statusRecord || weakSourceRecord;
    unverifiedStatus.push({ ...item, text: record.text, wiki: result.info.wikiLink?.url || '' });
  } else if (manualRecord && !item.unavailablePlaceholder) {
    manualUnverified.push({ ...item, text: manualRecord.text, wiki: result.info.wikiLink?.url || '' });
  } else if (!item.unavailablePlaceholder
    && result.info.recipe
    && sourceRecords.length === 1
    && sourceRecords[0].source === 'DE export'
    && sourceRecords[0].type === 'non-drop'
    && sourceRecords[0].text?.startsWith('Built in the Foundry')) {
    recipeOnly.push({
      ...item,
      text: sourceRecords[0].text,
      wiki: result.info.wikiLink?.url || '',
      reason: 'The current source contains Foundry build details, but no verified blueprint/vendor/drop acquisition route was resolved for this exact object.',
    });
  } else {
    resolvedCounts[sourceRecords[0].type || 'unknown'] = (resolvedCounts[sourceRecords[0].type || 'unknown'] || 0) + 1;
  }

  const exportEvidence = [];
  for (const tableName of ITEM_TABLES) {
    const table = exportData[tableName];
    const entry = table?.[item.uniqueName];
    if (!entry || typeof entry !== 'object') continue;
    exportEvidence.push({ table: tableName, key: item.uniqueName, fields: {
      name: entry.name ?? null,
      resultType: entry.resultType ?? null,
      type: entry.type ?? null,
      category: entry.category ?? null,
      craftable: entry.craftable ?? null,
      marketCost: entry.marketCost ?? null,
      buildPrice: entry.buildPrice ?? null,
      buildTime: entry.buildTime ?? null,
      codexSecret: entry.codexSecret ?? null,
      excludeFromCodex: entry.excludeFromCodex ?? null,
      showInInventory: entry.showInInventory ?? null,
      excludeFromMarket: entry.excludeFromMarket ?? null,
      introducedAt: entry.introducedAt ?? null,
    } });
  }
  const internalExportObject = exportEvidence.some(({ fields }) =>
    (fields.codexSecret === true || fields.excludeFromCodex === true)
    && (fields.showInInventory === false || fields.excludeFromMarket === true),
  );
  if (internalExportObject && statusRecord) {
    exportStatus.set(item.uniqueName, 'The local export marks this exact object as hidden from the Codex and unavailable from the Market; no player-facing acquisition route is recorded.');
  }
  const acquisitionRecord = acquisitionByPath.get(item.uniqueName);
  const wikiRepoPath = WIKI_REPO_EXACT_PAGES.get(item.name) || null;
  const wikiRepoEvidence = wikiRepoPath ? {
    dataset: 'rhinos0608/Warframe-Wiki-Repo',
    path: wikiRepoPath,
    url: `${WIKI_REPO_URL}${wikiRepoPath}`,
    exactName: true,
    acquisitionFieldsPresent: false,
  } : null;
  const identityEvidence = exportEvidence.length
    ? { type: 'DE export', records: exportEvidence.map(({ table, key }) => ({ table, key })) }
    : wfcdGlyphByPath.get(item.uniqueName)
      ? wfcdGlyphByPath.get(item.uniqueName)
      : acquisitionRecord
        ? {
          dataset: 'warframe-items-acquisition',
          uniqueName: acquisitionRecord.uniqueName,
          category: acquisitionRecord.category ?? null,
          name: acquisitionRecord.name ?? null,
        }
        : null;
  const mismatches = [];
  if (!exportEvidence.length && identityEvidence) {
    mismatches.push({
      type: 'de-export-identity-missing',
      detail: `No exact DE export table record was present; identity is verified against ${identityEvidence.dataset || identityEvidence.type}.`,
    });
  }
  if (acquisitionRecord && canonical(acquisitionRecord.uniqueName) !== item.uniqueName) {
    mismatches.push({ type: 'acquisition-identity', detail: `warframe-items uniqueName ${acquisitionRecord.uniqueName} does not equal catalog path ${item.uniqueName}` });
  }
  if (result.info.recipe && acquisitionRecord && !acquisitionRecord.craftable) {
    mismatches.push({ type: 'recipe-craftable-flag', detail: 'resolver has an export recipe but warframe-items marks the item non-craftable' });
  }
  if (sourceRecords.some((source) => source.type === 'drop') && !(acquisitionRecord?.drops?.length)) {
    mismatches.push({ type: 'drop-source-coverage', detail: 'resolver has a drop source that is not represented in this item record\'s warframe-items drops' });
  }
  if (wikiRepoEvidence && !sourceRecords.some((source) => source.type === 'drop' || source.type === 'override' || source.type === 'wiki')) {
    mismatches.push({ type: 'wiki-repo-no-acquisition-fields', detail: `Exact Wiki-repo page ${wikiRepoPath} exists, but its structured record has no acquisition fields or route.` });
  }
  evidence.push({
    uniqueName: item.uniqueName,
    displayName: item.name,
    screens: screensFor(item),
    sourcedCategories: item.sourcedCategories,
    unavailablePlaceholder: !!item.unavailablePlaceholder,
    exportEvidence,
    identityEvidence,
    acquisitionEvidence: acquisitionRecord ? {
      uniqueName: acquisitionRecord.uniqueName,
      category: acquisitionRecord.category ?? null,
      craftable: !!acquisitionRecord.craftable,
      drops: (acquisitionRecord.drops ?? []).map((drop) => ({
        location: drop.location ?? null,
        type: drop.type ?? null,
        chance: drop.chance ?? null,
        rarity: drop.rarity ?? null,
      })),
      components: (acquisitionRecord.components ?? []).map((component) => ({
        uniqueName: component.uniqueName ?? null,
        name: component.name ?? null,
        itemCount: component.itemCount ?? null,
      })),
    } : null,
    resolved: {
      sourceRecords,
      wikiLink: result.info.wikiLink || null,
      recipe: result.info.recipe || null,
    },
    exportRelationships: {
      exaltedWith: indexes.exalted?.get(item.uniqueName) || [],
    },
    wikiModuleEvidence: wikiCosmeticModuleByPath.get(item.uniqueName) || null,
    wikiRepoEvidence,
    mismatches,
    auditStatus: item.unavailablePlaceholder ? 'unobtainable-placeholder' : (dispositionRecord ? 'verified-unavailable' : ((statusRecord || weakSourceRecord) ? 'wiki-status-no-acquisition-evidence' : (manualRecord ? 'manual-assertion-needs-source' : (recipeOnly.some((entry) => entry.uniqueName === item.uniqueName) ? 'recipe-only-no-acquisition-route' : (sourceRecords.length ? 'verified-source-record' : 'unresolved'))))),
  });
}

const lines = [
  '# Current acquisition gaps',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'This report runs the current `getAcquisitionInfo()` implementation against the real local export, bundled warframe-items acquisition data, curated wiki assets, and browse.wf Glyph data.',
  '',
  `Catalog items audited: **${catalog.size}**`,
  `Items with concrete acquisition records: **${catalog.size - genericWiki.length - unavailablePlaceholders.length - unverifiedStatus.length - manualUnverified.length - recipeOnly.length - verifiedUnavailable.length}**`,
  `Generic wiki / no-info items: **${genericWiki.length}**`,
  `Generic Foundry sentence items: **${genericFoundry.length}**`,
  `Unobtainable export placeholders: **${unavailablePlaceholders.length}**`,
  `Records without a DE export identity (verified against a supplemental structured source instead): **${evidence.filter((item) => !item.exportEvidence.length && item.identityEvidence).length}**`,
  `Records without concrete acquisition evidence: **${unverifiedStatus.length}**`,
  `Manual assertions still requiring source verification: **${manualUnverified.length}**`,
  `Records with Foundry details but no verified acquisition route: **${recipeOnly.length}**`,
  `Records with verified unavailable/disposition evidence: **${verifiedUnavailable.length}**`,
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
  '## Foundry details without a verified acquisition route',
  '',
  '| Name | Unique name | Category | Current Foundry text | Review reason | Wiki |',
  '|---|---|---|---|---|---|',
  ...(recipeOnly.length ? recipeOnly.map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | ${item.text.replaceAll('|', '\\|')} | ${item.reason} | ${item.wiki} |`) : ['| None |  |  |  |  |  |']),
  '',
  '## Records without concrete acquisition evidence',
  '',
  '| Name | Unique name | Category | Current status text | Wiki | Wiki-repo exact record |',
  '|---|---|---|---|---|---|',
  ...(unverifiedStatus.length ? unverifiedStatus.map((item) => {
    const repoPath = WIKI_REPO_EXACT_PAGES.get(item.name);
    const repo = repoPath ? `[exact identity; no acquisition fields](${WIKI_REPO_URL}${repoPath})` : 'None found';
    return `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | ${item.text.replaceAll('|', '\\|')} | ${item.wiki} | ${repo} |`;
  }) : ['| None |  |  |  |  |  |']),
  '',
  '## Manual acquisition assertions requiring source verification',
  '',
  '| Name | Unique name | Category | Current assertion | Wiki |',
  '|---|---|---|---|---|',
  ...(manualUnverified.length ? manualUnverified.map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | ${item.text.replaceAll('|', '\\|')} | ${item.wiki} |`) : ['| None |  |  |  |  |']),
  '',
  '## Verified unavailable / disposition records',
  '',
  '| Name | Unique name | Category | Evidence | Wiki |',
  '|---|---|---|---|---|',
  ...(verifiedUnavailable.length ? verifiedUnavailable.map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | ${item.text.replaceAll('|', '\\|')} | ${item.wiki} |`) : ['| None |  |  |  |  |']),
  '',
  '## Unobtainable export placeholders',
  '',
  '| Name | Unique name | Category | Treatment |',
  '|---|---|---|---|',
  ...(unavailablePlaceholders.length ? unavailablePlaceholders.map((item) => `| ${item.name.replaceAll('|', '\\|')} | \`${item.uniqueName}\` | ${item.category} | ${item.reason} |`) : ['| None |  |  |  |']),
  '',
  '## Resolved source-stage counts',
  '',
  ...Object.entries(resolvedCounts).sort(([a], [b]) => a.localeCompare(b)).map(([stage, count]) => `- ${stage}: ${count}`),
  '',
];

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${lines.join('\n')}\n`);
// Keep the machine-readable ledger compact; jq/any JSON viewer can format it
// for inspection without inflating the checked-in artifact.
writeFileSync(EVIDENCE_OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), itemCount: evidence.length, items: evidence })}\n`);
const statusAssetPath = resolve(ASSET_ROOT, 'wiki-acquisition-status.json');
const statusAsset = readAsset('wiki-acquisition-status.json');
for (const [uniqueName, exportDisposition] of exportStatus) {
  if (statusAsset[uniqueName]) statusAsset[uniqueName] = { ...statusAsset[uniqueName], exportDisposition };
}
writeFileSync(statusAssetPath, `${JSON.stringify(statusAsset, null, 2)}\n`);
console.log(`Audited ${catalog.size} exact export/WFCD objects: ${catalog.size - genericWiki.length - unverifiedStatus.length - manualUnverified.length - recipeOnly.length - verifiedUnavailable.length - unavailablePlaceholders.length} source-verified, ${manualUnverified.length} manual assertions needing source verification, ${genericWiki.length} generic/no-info, ${unverifiedStatus.length} status-only, ${recipeOnly.length} recipe-only, ${verifiedUnavailable.length} verified unavailable, ${genericFoundry.length} generic Foundry, ${unavailablePlaceholders.length} unavailable placeholders.`);
console.log(`Wrote ${OUTPUT}`);
console.log(`Wrote ${EVIDENCE_OUTPUT}`);
