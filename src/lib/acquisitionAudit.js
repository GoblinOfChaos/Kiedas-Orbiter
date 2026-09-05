/**
 * Acquisition Coverage Audit
 *
 * A one-click census of every item this app can show an acquisition drawer
 * for, counting how many currently resolve to "no verified acquisition
 * route is known for this item" (the fallback shown by AcquisitionDrawer.jsx
 * when `sources.length === 0 && !recipe && info.vaulted !== true`).
 *
 * This module deliberately does NOT reimplement any acquisition-resolution
 * logic. It only:
 *   1. Rebuilds each screen's item catalog (the same uniqueName/displayName
 *      pairs that screen iterates over, owned AND unowned), by replicating
 *      each screen's own filter/dedup logic.
 *   2. Calls the real `getAcquisitionInfo` (imported from acquisitionInfo.js)
 *      with the real indices already built once by MonitoringContext.
 *   3. Classifies each item with the exact same condition AcquisitionDrawer
 *      uses to decide whether to show the "no verified route" message.
 *
 * Async Codex fallback (AcquisitionDrawer.jsx ~150-172):
 * When a drawer opens for an item whose base `info` is "generic"
 * (isGenericAcquisition), the drawer kicks off an async fetchCodexDetail()
 * call and may replace/enrich `info` with Codex data once it resolves. This
 * audit runs entirely synchronously over the base `getAcquisitionInfo`
 * result and does NOT attempt to reproduce that async path. That's a
 * deliberate choice, not an oversight:
 *   - The Codex fallback is itself best-effort/generic data scraped at
 *     runtime, not a curated drop-table source - it's the same tier of
 *     "we don't really know" as the message this audit is counting.
 *   - Reproducing it here would mean firing a network/IPC call per missing
 *     item (there can be thousands), which is slow, order-dependent, and
 *     would silently mutate the count between runs based on live Codex
 *     availability - the opposite of the "repeatable" census requested.
 *   - Items that DO get rescued by the Codex fallback in the live UI will
 *     still show up in this report; that's acceptable and arguably correct
 *     for a coverage census - it tells you "no curated source is known",
 *     which is exactly the gap the user wants to see and fix one item at a
 *     time. The live drawer still shows the Codex-rescued info to players.
 */

import { getAcquisitionInfo } from './acquisitionInfo.js';
import { getRelicCatalog } from './relicParser.js';

const isSigil = (uniqueName) => /\/Upgrades\/Skins\/Sigils\//i.test(uniqueName || '');

/**
 * Replicates Cosmetics.jsx's `items` useMemo (skins/sigils, glyphs, ship
 * decorations, emotes - owned AND unowned), stripped of anything that only
 * affects rendering (icon resolution, `kind`/`type` labels).
 */
export function buildCosmeticsCatalog(exportData) {
  if (!exportData) return [];
  const dict = exportData?.dict || {};
  const customs = exportData?.ExportCustoms;
  const skinItems = customs && typeof customs === 'object' ? Object.entries(customs).flatMap(([uniqueName, entry]) => {
    if (!/\/Upgrades\/Skins\//i.test(uniqueName)) return [];
    // Cosmetics.jsx also drops unowned items with no icon/texture (internal
    // debug/placeholder entries). This audit has no ownership data of its
    // own, so it mirrors that same "no real artwork" filter unconditionally
    // - identical to how the unowned branch behaves in the live screen,
    // which is the branch that matters for a missing-acquisition census.
    if (!entry?.icon && !entry?.texture) return [];
    const name = dict[entry?.name] || entry?.name;
    if (!name) return [];
    return [{ uniqueName, displayName: name }];
  }) : [];

  const glyphItems = Object.entries(exportData?.WI_Glyphs || {}).flatMap(([uniqueName, entry]) => {
    const name = entry?.name;
    if (!uniqueName || !name) return [];
    if (entry?.excludeFromCodex === true || entry?.codexSecret === true) return [];
    return [{ uniqueName, displayName: name }];
  });

  const decorationParents = new Set([
    '/Lotus/Types/Items/ShipDecos/ShipDecoItem',
    '/Lotus/Types/Items/ShipDecos/BaseFishTrophy',
    '/Lotus/Types/Items/ShipDecos/ChildDrawingBase',
    '/Lotus/Types/Items/ShipDecos/LotusShawzinPlayableBase',
    '/Lotus/Types/Items/ShipDecos/Plushies/PlushyThumper',
    '/Lotus/Types/Items/ShipDecos/Vignettes/Enemies/ShipDecoItem',
    '/Lotus/Types/Items/ShipDecos/InstrumentDecoItem',
    '/Lotus/Types/Items/ShipDecorationLayerItem',
  ]);
  const decorationItems = Object.entries(exportData?.ExportResources || {}).flatMap(([uniqueName, entry]) => {
    if (!decorationParents.has(entry?.parentName)) return [];
    const name = dict[entry?.name] || entry?.name;
    if (!name) return [];
    return [{ uniqueName, displayName: name }];
  });

  const emoteItems = Object.entries(exportData?.ExportFlavour || {}).flatMap(([uniqueName, entry]) => {
    if (!uniqueName.startsWith('/Lotus/Types/Items/Emotes/')) return [];
    const name = dict[entry?.name] || entry?.name;
    if (!name) return [];
    return [{ uniqueName, displayName: name }];
  });

  return [...skinItems, ...glyphItems, ...decorationItems, ...emoteItems];
}

/**
 * Replicates Mods.jsx's `mods` useMemo (owned + unowned mods catalog, minus
 * Peely Pix stickers which have their own tab and aren't real mods).
 */
export function buildModsCatalog(inventoryData) {
  const mods = inventoryData?.mods_catalog ?? inventoryData?.mods ?? [];
  return mods
    .filter((mod) => !mod?._isSticker)
    .map((mod) => ({ uniqueName: mod.unique_name, displayName: mod.name }));
}

/**
 * Replicates Relics.jsx's `relics` useMemo for the "show unowned too"
 * branch (ownershipFilter !== 'owned'), which is the branch that includes
 * every relic the game has via getRelicCatalog, merged with owned data.
 */
export function buildRelicsCatalog(exportData, inventoryData) {
  if (!exportData) return [];
  const ownedRelics = inventoryData?.relics ?? [];
  const ownedByKey = new Map(ownedRelics.map((r) => {
    const category = (r.name || '').replace(new RegExp(`^${r.era}\\s+`, 'i'), '').replace(/\s+Relic$/i, '').trim();
    return [`${r.era} ${category}`, r];
  }));
  // r.unique_name is a synthetic display key ("Meso N17") for owned relics
  // (see inventoryParser.js's relicGroups comment); real_unique_name carries
  // the genuine DE path acquisition lookups need. Mirrors the same fix in
  // Relics.jsx's openItem useMemo.
  const catalogRelics = getRelicCatalog(exportData, 'en').map((c) => {
    const key = `${c.era} ${c.name}`;
    const existing = ownedByKey.get(key);
    if (existing) {
      ownedByKey.delete(key);
      return { unique_name: existing.real_unique_name || existing.unique_name, name: existing.name };
    }
    return { unique_name: c.uniqueName, name: `${c.era} ${c.name} Relic` };
  });
  const leftoverOwned = Array.from(ownedByKey.values()).map((r) => ({ unique_name: r.real_unique_name || r.unique_name, name: r.name }));
  return [...catalogRelics, ...leftoverOwned].map((r) => ({ uniqueName: r.unique_name, displayName: r.name }));
}

/**
 * Replicates the union of Inventory.jsx's tabs that hold real, individually
 * acquirable items with a meaningful drop/vendor/recipe source.
 *
 * `inventoryData.all` alone already covers most tabs (warframes, weapons,
 * companions, archwings/kdrives via the 'vehicles' tab which is just
 * `[...archwings, ...kdrives]` - already in `all` - necramechs, amps,
 * arcanes, consumables, resources, components, rivens, prime_parts), minus
 * rivens/Arcanes which the 'all' tab itself filters out because they have
 * their own richer catalog tabs. This function reproduces that same filter
 * and adds the catalogs the 'all' tab does NOT include: arcanes_catalog,
 * consumables_catalog, landing_craft_catalog, peely_pix, and primeSets
 * (the 'prime_parts' tab's grouped-by-set view).
 *
 * Deliberately excluded, with reasons:
 *   - 'ayatan' tab: hardcoded stars/sculptures data, not real drop-table
 *     items - acquisition is "fuse it at a Fusion console", not something
 *     getAcquisitionInfo models or a gap worth auditing.
 *   - 'relics' tab: already covered by buildRelicsCatalog() above via the
 *     dedicated Relics screen, to avoid double-counting the same items.
 *   - 'mods' tab: already covered by buildModsCatalog() above.
 *
 * primeSets caveat: Inventory.jsx's prime_parts tab cards pass
 * `item.unique_name` to `toggle()`, but primeSets entries only carry a
 * `setPath` field (no `unique_name`) - so in the live UI, opening a
 * prime-set's drawer is an existing, unrelated bug (every card's `openKey`
 * is `undefined`, and `.find()` matches the first such item). This audit
 * does not reproduce that bug: it uses `setPath` as the lookup key, since
 * that's a real identifier for the set's finished item and gives a useful,
 * correct census instead of flagging every prime set as an artifact of a
 * separate click-handler bug.
 */
export function buildInventoryCatalog(inventoryData) {
  if (!inventoryData) return [];
  const all = (inventoryData.all ?? [])
    .filter((i) => i.category !== 'rivens' && i.category !== 'Arcanes')
    .map((i) => ({ uniqueName: i.unique_name, displayName: i.name }));

  const simple = (arr) => (arr ?? []).map((i) => ({ uniqueName: i.unique_name, displayName: i.name }));

  const primeSets = Object.values(inventoryData.primeSets ?? {})
    .map((s) => ({ uniqueName: s.setPath, displayName: s.name }));

  return [
    ...all,
    ...simple(inventoryData.arcanes_catalog),
    ...simple(inventoryData.consumables_catalog),
    ...simple(inventoryData.landing_craft_catalog),
    ...simple(inventoryData.peely_pix),
    ...primeSets,
  ];
}

/**
 * Same missing/no-verified-route condition AcquisitionDrawer.jsx uses:
 * `sources.length > 0 ? ... : info?.vaulted === true ? ... : recipe ? null
 * : ... : <no_verified_route>`. An item is "missing" only when it falls all
 * the way through to that last branch.
 */
export function isMissingAcquisition(info) {
  if (!info) return true;
  const sources = info.sources || [];
  if (sources.length > 0) return false;
  if (info.vaulted === true) return false;
  if (info.recipe) return false;
  return true;
}

/**
 * Runs the full census across every catalog and returns a structured
 * result: per-catalog missing-item lists plus totals.
 *
 * @param {{cosmetics: Array, mods: Array, inventory: Array, relics: Array}} catalogs
 *   Each entry is an array of `{ uniqueName, displayName }` pairs, built by
 *   the matching `build*Catalog()` helper above.
 * @param {object} indices - the same index arguments getAcquisitionInfo
 *   takes, in order, as built once by MonitoringContext.jsx.
 */
export function runAcquisitionCoverageAudit(catalogs, indices) {
  const {
    dropIndex, overridesData, recipeResultIndex, marketIndex, bundleIndex,
    syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex,
    wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex,
    wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex,
    wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex,
    exportComponentIndex,
  } = indices;

  const auditCatalog = (items) => {
    const missing = [];
    let total = 0;
    for (const item of items) {
      if (!item?.uniqueName || !item?.displayName) continue;
      total += 1;
      const info = getAcquisitionInfo(
        item.uniqueName, item.displayName, dropIndex, overridesData, recipeResultIndex,
        marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex,
        wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex,
        glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex,
        wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex,
        exaltedWeaponIndex, exportComponentIndex,
      );
      if (isMissingAcquisition(info)) {
        missing.push({ uniqueName: item.uniqueName, displayName: item.displayName });
      }
    }
    return { total, missing };
  };

  const results = {};
  for (const key of Object.keys(catalogs)) {
    results[key] = auditCatalog(catalogs[key] ?? []);
  }

  const totalItems = Object.values(results).reduce((s, r) => s + r.total, 0);
  const totalMissing = Object.values(results).reduce((s, r) => s + r.missing.length, 0);

  return { results, totalItems, totalMissing, generatedAt: new Date().toISOString() };
}

/** Renders an audit result (from runAcquisitionCoverageAudit) as a plain-text report. */
export function formatAuditReport(audit) {
  const lines = [];
  lines.push('Acquisition Coverage Report');
  lines.push(`Generated: ${audit.generatedAt}`);
  lines.push(`Total items checked: ${audit.totalItems}`);
  lines.push(`Total missing acquisition info: ${audit.totalMissing}`);
  lines.push('');
  for (const [catalogName, result] of Object.entries(audit.results)) {
    lines.push(`== ${catalogName} (${result.missing.length} missing / ${result.total} checked) ==`);
    for (const item of result.missing) {
      lines.push(`  ${item.displayName}  |  ${item.uniqueName}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
