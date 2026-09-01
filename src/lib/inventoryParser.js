/**
 * inventoryParser.js
 *
 * Turns the raw API response from Warframe into structured data for
 * every screen in the app.  Nothing in here touches the network or the disk;
 * all that is handled by main.rs before this file even runs.
 *
 * DATA PIPELINE (how raw bytes become UI)
 * ─────────────────────────────────────────
 * 1. main.rs:check_exports()        – downloads / refreshes JSON export files
 * 2. main.rs:load_all_exports()     – reads them from disk into one big object
 * 3. main.rs:call_api_helper()      – scans game memory for auth token, fetches inventory
 * 4. main.rs:load_cached_inventory() – reads inventory.json from disk
 * 5. MonitoringContext.jsx          – calls (2) and (3)/(4) on startup / each scan
 * 6. parseInventory(raw, exports)   – <-- YOU ARE HERE
 *    Takes the raw inventory object and the exports bundle, returns a flat
 *    structured object consumed by Inventory.jsx, Mastery.jsx, Relics.jsx, etc.
 *
 * EXPORTS FROM THIS FILE
 * ─────────────────────────────────────────
 * parseInventory(raw, exports) → structured inventory object
 *   All other functions are internal helpers.
 */
import { BLUEPRINT_SUFFIX } from './warframeUtils'

// ─── Riven Tag Data ───────────────────────────────────────────────────────────
//
// Per-riven-type stat bases, affix syllables, and localized label keys are
// derived at parse time from ExportUpgrades' /Lotus/Upgrades/Mods/Randomized/
// entries (see buildRivenTagInfo in parseInventory) — DE's own data, verified
// byte-identical to the riven_tags.json tables this replaces. The export's
// upgradeValues[0].value, prefixTag/suffixTag, and locTag drive the stat
// formula, the constructed riven name, and the dict-resolved localized label.
// ─── Riven Display Helpers ────────────────────────────────────────────────────
//
// RIVEN_STAT_MAP  : internal tag name → English stat label, used as the English
//                   statKey for the price model (matches English keys only) and
//                   as a last-resort display fallback. The localized display
//                   name is resolved from the game dict via the export's stat
//                   locTag (see buildRivenTagInfo below), which replaces the
//                   old per-locale hand-translated rivenStats tables.

export const RIVEN_STAT_MAP = {
  'WeaponMeleeDamageMod': 'Melee Damage',
  'WeaponCritChanceMod': 'Critical Chance',
  'WeaponCritDamageMod': 'Critical Damage',
  'WeaponSpeedMod': 'Attack Speed',
  'WeaponFireRateMod': 'Attack Speed',
  'WeaponStatusChanceMod': 'Status Chance',
  'WeaponStunChanceMod': 'Status Chance',
  'WeaponRangeMod': 'Range',
  'WeaponMeleeRangeIncMod': 'Range',
  'WeaponDamageAmountMod': 'Damage',
  'WeaponPunctureDamageMod': 'Puncture',
  'WeaponSlashDamageMod': 'Slash',
  'WeaponImpactDamageMod': 'Impact',
  'WeaponElectricityDamageMod': 'Electricity',
  'WeaponFireDamageMod': 'Heat',
  'WeaponFreezeDamageMod': 'Cold',
  'WeaponToxinDamageMod': 'Toxin',
  'WeaponRecoilReductionMod': 'Recoil',
  'WeaponReloadSpeedMod': 'Reload Speed',
  'WeaponClipMaxMod': 'Magazine Capacity',
  'WeaponAmmoMaxMod': 'Ammo Maximum',
  'WeaponCritFireRateBonusMod': 'Fire Rate',
  'WeaponChannelingDamageMod': 'Initial Combo',
  'WeaponMeleeComboDurationMod': 'Combo Duration',
  'WeaponMeleeComboChanceFromDot': 'Combo Count Chance',
  'WeaponMeleeFinisherDamageMod': 'Finisher Damage',
  'WeaponProjectileSpeedMod': 'Projectile Speed',
  'WeaponBeamDistanceMod': 'Beam Length',
  'WeaponMultishotMod': 'Multishot',
  'WeaponPunchThroughMod': 'Punch Through',
  'WeaponZoomFovMod': 'Zoom',
  'WeaponExplosionRadiusMod': 'Blast Radius',
  'InnateElectricityDamage': 'Electricity',
  'InnateFireDamage': 'Heat',
  'InnateFreezeDamage': 'Cold',
  'InnateToxinDamage': 'Toxin',
  'WeaponFireIterationsMod': 'Multishot',
  'WeaponArmorPiercingDamageMod': 'Puncture',
  'WeaponProcTimeMod': 'Status Duration',
  'WeaponPunctureDepthMod': 'Punch Through',
  'WeaponFactionDamageCorpus': 'Damage to Corpus',
  'WeaponFactionDamageGrineer': 'Damage to Grineer',
  'WeaponFactionDamageInfested': 'Damage to Infested',
  'WeaponMeleeFactionDamageCorpus': 'Damage to Corpus',
  'WeaponMeleeFactionDamageGrineer': 'Damage to Grineer',
  'WeaponMeleeFactionDamageInfested': 'Damage to Infested',
  'ComboDurationMod': 'Combo Duration',
  'SlideAttackCritChanceMod': 'Slide Crit Chance',
  'WeaponMeleeComboEfficiencyMod': 'Combo Efficiency',
  'WeaponMeleeComboInitialBonusMod': 'Initial Combo',
  'WeaponMeleeComboPointsOnHitMod': 'Combo Count',
  'WeaponMeleeComboBonusOnHitMod': 'Combo Count',
};

/** Clean a dict stat label for display: drop value tokens (%|val|, |STAT1|),
 *  HTML color tags, and the seconds glue DE appends (|val|sn). */
function cleanStatLabel(raw) {
  if (!raw || typeof raw !== 'string' || raw.startsWith('/Lotus/')) return '';
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/%?\|(?:val|STAT\d+)\|(?:sn|s)?\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Rank / XP Helpers ───────────────────────────────────────────────────────

/** Return the maximum possible rank for an item (30 for most things, 40 for
 *  special cases like Necramechs, Kuva/Tenet weapons, and Paracesis). 
 *  For mods and arcanes, looks up fusionLimit or levelStats in export data. */
function getRankLimit(un, category, EM = {}, EA = {}, EW = {}) {
  if (category === 'mods') {
    return EM[un]?.fusionLimit ?? 0;
  }
  if (category === 'arcanes') {
    return EA[un]?.levelStats?.length ? EA[un].levelStats.length - 1 : 5;
  }
  if (category === 'necramechs') return 40;
  if (un?.includes('Paracesis')) return 40;
  if (un?.includes('Kuva') || un?.includes('Tenet') || un?.includes('Coda')) return 40;
  // Check export for maxLevelCap
  const exportEntry = EW[un];
  if (exportEntry?.maxLevelCap === 40) return 40;
  return 30;
}

/**
 * Calculate the current rank of an item from its cumulative affinity (XP).
 * Warframe uses: XP to reach rank R = R² × baseXPPerRank
 *   Heavy items (Warframes, companions, vehicles): baseXPPerRank = 1000
 *   Weapons and everything else:                  baseXPPerRank = 500
 * We scan upward from rank 1 until the required XP exceeds what the item has.
 *
 * @param {number} xp        Cumulative affinity earned by this item.
 * @param {string} category  Item category string (e.g. 'warframes', 'primary').
 * @param {string} un        Unique name - used only for the Paracesis/Kuva/Tenet special case.
 * @param {number} limit     Maximum rank ceiling (30 or 40).
 * @returns {number}         Correct rank (0–40).
 */
function calculateRank(xp, category, un, limit = 30) {
  if (!xp || xp <= 0) return 0;

  // Determine the XP multiplier based on item type
  const heavyCategories = [
    'warframes', 'companions', 'necramechs', 'archwings',
    'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'plexus', 'kdrives'
  ];
  const isHeavy = heavyCategories.includes(category);

  // The XP required for a given rank is: rank² * baseXPPerRank²
  // For heavy: 1000 per rank, for weapons: 500 per rank.
  const baseXPPerRank = isHeavy ? 1000 : 500;

  // Find the highest rank where cumulative required XP is <= the item's XP
  let rank = 0;
  for (let r = 1; r <= limit; r++) {
    // Cumulative XP needed to reach this rank from unranked
    const requiredXP = r * r * baseXPPerRank;
    if (xp >= requiredXP) {
      rank = r;
    } else {
      break;
    }
  }

  return rank;
}

// ─── String / Path Helpers ────────────────────────────────────────────────────

/** Strip HTML tags and trim whitespace from a display name.  Returns '' for
 *  any value that looks like an internal path (/Lotus/...). */
function cleanName(name) {
  if (!name) return '';
  if (typeof name === 'string' && name.startsWith('/Lotus/')) return '';
  return name.replace(/<[^>]*>/g, '').trim();
}

/** Split a PascalCase string into space-separated words. */
function splitPascal(str) {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

const FOLDER_OVERRIDES = {
  Harlequin: 'Mirage', Pirate: 'Hydroid', Tengu: 'Zephyr',
  Paladin: 'Oberon', Berserker: 'Valkyr', Priest: 'Trinity',
  Sandman: 'Equinox', Ranger: 'Ivara', AntiMatter: 'Limbo',
  Pacifist: 'Baruuk', Magician: 'Nyx', YinYang: 'Equinox',
  Trapper: 'Khora', Necro: 'Nekros', Dragon: 'Chroma',
  Brawler: 'Atlas', Cowgirl: 'Cyte-09',
  BrokenFrame: 'Broken Warframe',
  ConcreteFrame: 'Kullervo',
  Alchemist: 'Citrine', PaxDuviricus: 'Voruna',
  Infestation: 'Nidus', Geode: 'Gauss',
  IronFrame: 'Styanax', Frumentarius: 'Grendel',
  Devourer: 'Lavos', Choir: 'Octavia',
  Bard: 'Octavia', Odalisk: 'Caliban',
  Pagemaster: 'Xaku', Werewolf: 'Voruna',
  Glass: 'Gara', Temple: 'Whisper',
  Fairy: 'Wisp', Jade: 'Nyx',
};


// ─── Name / Image Resolution ─────────────────────────────────────────────────

/**
 * Derive a human-readable display name from an internal asset path.
 * Used as the last-resort fallback when no export table has a localisation key.
 * Strips common suffix tokens (Suit, Blueprint, etc.) and converts PascalCase
 * to spaced words.  Also handles skin folder overrides.
 */
const BOOSTER_NAME_MAP = {
  'ResourceAmount3Day': '3 Day Resource Booster',
  'ResourceDropChance3Day': '3 Day Resource Drop Chance Booster',
  'Affinity3Day': '3 Day Affinity Booster',
  'Credit3Day': '3 Day Credit Booster',
  'ModDropChance3Day': '3 Day Mod Drop Chance Booster',
  'ResourceAmount7Day': '7 Day Resource Booster',
  'ResourceDropChance7Day': '7 Day Resource Drop Chance Booster',
  'Affinity7Day': '7 Day Affinity Booster',
  'Credit7Day': '7 Day Credit Booster',
  'ModDropChance7Day': '7 Day Mod Drop Chance Booster',
  'ResourceAmount30Day': '30 Day Resource Booster',
  'ResourceDropChance30Day': '30 Day Resource Drop Chance Booster',
  'Affinity30Day': '30 Day Affinity Booster',
  'Credit30Day': '30 Day Credit Booster',
  'ModDropChance30Day': '30 Day Mod Drop Chance Booster',
  'ResourceAmount': 'Resource Booster',
  'ResourceDropChance': 'Resource Drop Chance Booster',
  'Affinity': 'Affinity Booster',
  'Credit': 'Credit Booster',
  'ModDropChance': 'Mod Drop Chance Booster',
}

// Prime part paths end with the weapon name + part word (always English even in
// localized builds), e.g. .../WeaponParts/AfurisPrimeBarrel.  Used to separate
// prime parts from resources and to build prime-set component lists — matching
// the localized display name instead (e.g. "Afuris Prime: Lauf") would miss them.
const PRIME_PART_PATH_RE = /Prime.*?(Barrel|Receiver|Stock|Blade|Handle|Link|Gauntlet|Head|Helmet|Disc|Grip|Boot|Chain|String|UpperLimb|LowerLimb|Carapace|Cerebrum|Systems|Chassis|Neuroptics|Guard|Hilt|Ornament|Stars|Holster|Pouch|Band|Blueprint)(Component)?$/i;

function nameFromPath(path = '') {
  const parts = path.split('/').filter(Boolean);
  const leaf = parts.at(-1) ?? path;
  const folder = parts.at(-2) ?? '';


  if (FOLDER_OVERRIDES[folder]) {
    const suffix = leaf.match(/(Prime|Vandal|Wraith|Prisma|Kuva|Tenet|Umbra)$/i)?.[0] ?? '';
    return FOLDER_OVERRIDES[folder] + (suffix ? ' ' + suffix : '');
  }

  const stripped = leaf
    .replace(/(BaseSuit|PowerSuit|PrimeName|OperatorAmp|HoverboardSuit|MotorcyclePowerSuit|KubrowPet|KavatPet|SentientPet|Pet|Suit|Blueprint)$/g, '');
  return splitPascal(stripped).trim() || leaf;
}

/**
 * Public entry point for name resolution.  Wraps the recursive internal helper
 * with a depth of 0 to prevent runaway recursion on circular references.
 * Called by: createItem, relic reward mapping, riven parsing, and most of parseInventory.
 */
function resolveName(un, dict, locale = 'en', ...tables) {
  return _resolveNameInternal(un, dict, locale, 0, ...tables);
}

/**
 * Internal recursive resolver.  Tries each export table in order:
 *  1. Direct key match (exact uniqueName or with /StoreItems/ stripped)
 *  2. Dict localisation key lookup
 *  3. Recipe resultType follow (recurse, max depth 5)
 *  4. Dictionary direct lookup on the raw path
 *  5. /Recipes/ path leaf match
 *  6. nameFromPath() fallback
 */
function _resolveNameInternal(un, dict, locale = 'en', depth, ...tables) {
  if (!un || depth > 5) return '';
  if (un.includes('DrifterPistol')) return 'Sirocco';

  // Try direct match or normalized path (stripping /StoreItems/)
  const normalized = un.replace('/StoreItems/', '/');
  for (const tbl of tables) {
    const entry = tbl?.[un] || tbl?.[normalized];
    if (!entry) continue;
    const locKey = entry.name ?? entry.displayName ?? '';
    if (locKey) {
      if (dict[locKey]) {
        const resolved = cleanName(dict[locKey]);
        if (resolved) return resolved;
      }
      if (!locKey.startsWith('/Lotus/')) {
        const cleaned = cleanName(locKey);
        if (cleaned) return cleaned;
      }
    } else if (entry.resultType) {
      // If recipe has no name, try to resolve its resultType
      let name = _resolveNameInternal(entry.resultType, dict, locale, depth + 1, ...tables);
      const bpSuffix = BLUEPRINT_SUFFIX[locale] ?? ' Blueprint';
      if (un.toLowerCase().endsWith('blueprint') && !name.toLowerCase().includes('blueprint') && !name.toLowerCase().includes(bpSuffix.trim().toLowerCase())) {
        name += bpSuffix;
      }
      return name;
    }
  }

  // Fallback: Check if the path itself is a key in the dictionary
  if (dict[un]) {
    const resolved = cleanName(dict[un]);
    if (resolved) return resolved;
  }

  // Handle Recipe paths (e.g. /Lotus/Types/Recipes/Helmets/BrawlerAltHelmetBlueprint)
  if (un.includes('/Recipes/')) {
    const leaf = un.split('/').pop().replace('Blueprint', '');
    if (FOLDER_OVERRIDES[leaf]) return FOLDER_OVERRIDES[leaf];
    // Try to find the associated item name by checking without "Blueprint"
    for (const tbl of tables) {
      if (!tbl) continue;
      const match = getSuffixIndex(tbl).get(leaf);
      if (match && tbl[match].name) return cleanName(tbl[match].name);
    }
  }

  // Check for lore/fragment names in dict (e.g. /Lotus/Language/Fragments/{leaf}[Name])
  if (un.includes('/Fragments/')) {
    const leaf = un.split('/').pop();
    const fragName = dict['/Lotus/Language/Fragments/' + leaf + 'Name']
      || dict['/Lotus/Language/Fragments/' + leaf];
    if (fragName) return cleanName(fragName);
  }

  // Fallback for known booster patterns (StoreItem paths use "3Day" but human names use "3 Day")
  const leaf = un.split('/').pop().replace(/StoreItem$/i, '');
  if (BOOSTER_NAME_MAP[leaf]) return BOOSTER_NAME_MAP[leaf];
  for (const [key, name] of Object.entries(BOOSTER_NAME_MAP)) {
    if (leaf.startsWith(key)) return name;
  }

  return cleanName(nameFromPath(un));
}

/**
 * Find an icon/thumbnail URL for an item by scanning export tables in order.
 * Returns a full browse.wf URL, or null if no image is found.
 * Falls back to a leaf-match search for recipe paths.
 */

const suffixIndexCache = new WeakMap()

function getSuffixIndex(tbl) {
  if (!suffixIndexCache.has(tbl)) {
    const index = new Map()
    for (const key of Object.keys(tbl)) {
      index.set(key.split('/').pop(), key)
    }
    suffixIndexCache.set(tbl, index)
  }
  return suffixIndexCache.get(tbl)
}

let activeExportImages = null;
let activeLeafImageMap = null;

function updateActiveExportImages(images) {
  activeExportImages = images;
  if (images) {
    activeLeafImageMap = new Map();
    for (const [k, v] of Object.entries(images)) {
      const leaf = k.split("/").pop();
      if (!activeLeafImageMap.has(leaf) || k.includes("StoreIcons")) {
        activeLeafImageMap.set(leaf, { path: k, hash: v?.contentHash });
      }
    }
  } else {
    activeLeafImageMap = null;
  }
}

// warframe-items currently carries stale wiki thumbnail filenames for these
// two newer Warframes. Keep the identity-to-icon correction at the shared
// resolver boundary so inventory cards, category tabs, and any other caller
// cannot reintroduce the 404 thumbnails.
const AUTHORITATIVE_ITEM_ICONS = {
  '/Lotus/Powersuits/Frumentarius/Frumentarius': '/Lotus/Interface/Icons/StoreIcons/Warframes/Frumentarius.png',
  '/Lotus/Powersuits/Choir/Choir': '/Lotus/Interface/Icons/StoreIcons/Warframes/Jade.png',
};

function resolveImage(un, ...tables) {
  const imageMap = activeExportImages;

  const imageUrl = (icon, uniqueName = un) => {
    const authoritativeIcon = AUTHORITATIVE_ITEM_ICONS[uniqueName];
    if (authoritativeIcon) icon = authoritativeIcon;
    if (!icon) return null;
    if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('asset-cache://') || icon.startsWith('asset://') || icon.startsWith('data:')) {
      return icon;
    }
    const path = icon.startsWith('/') ? icon : `/${icon}`;
    let hash = imageMap?.[path]?.contentHash;
    let finalPath = path;

    if (!hash && activeLeafImageMap) {
      const leaf = path.split("/").pop();
      const match = activeLeafImageMap.get(leaf);
      if (match && match.hash) {
        finalPath = match.path;
        hash = match.hash;
      }
    }

    return hash
      ? `asset-cache://content.warframe.com/PublicExport${finalPath}!${hash}`
      : `asset-cache://browse.wf${path}`;
  };

  // Check exact match first
  for (const tbl of tables) {
    if (!tbl) continue;
    const entry = tbl?.[un];
    if (entry && (entry.icon || entry.thumbnail)) {
      const icon = entry.icon ?? entry.thumbnail;
      // Do not allow stale wiki.warframe.com thumbnails from supplemental
      // datasets to terminate the search before DE's export icon is used.
      if (/^https?:\/\/(?:www\.)?wiki\.warframe\.com\//i.test(icon) && !AUTHORITATIVE_ITEM_ICONS[un]) continue;
      return imageUrl(icon, un);
    }
  }

  // If it's a recipe, try the leaf match
  if (un && un.includes('/Recipes/')) {
    const leaf = un.split('/').pop().replace('Blueprint', '');
    for (const tbl of tables) {
      if (!tbl) continue;
      const suffixIndex = getSuffixIndex(tbl)
      const matchKey = suffixIndex.get(leaf)
      if (matchKey && (tbl[matchKey]?.icon || tbl[matchKey]?.thumbnail)) {
        const icon = tbl[matchKey].icon ?? tbl[matchKey].thumbnail;
        if (/^https?:\/\/(?:www\.)?wiki\.warframe\.com\//i.test(icon)) continue;
        return imageUrl(icon, matchKey);
      }
    }
  }
  return null;
}

// ─── Modular Item Helpers ─────────────────────────────────────────────────────

/** Parse a JSON UpgradeFingerprint string safely; returns {} on failure. */
function parseFP(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/**
 * Map a riven's internal ItemType path to a broad weapon category string
 * ('melee', 'pistol', 'rifle', 'shotgun', 'archgun', 'zaw', 'kitgun', 'unknown').
 * Used to bucket rivens into sub-tabs in the Rivens screen.
 */
function rivenWeaponType(itemType = '') {
  const t = (itemType || '').toLowerCase();
  if (t.includes('modularmelee') || t.includes('zaw')) return 'zaw';
  if (t.includes('modularpistol') || t.includes('kitgun')) return 'kitgun';
  if (t.includes('melee')) return 'melee';
  if (t.includes('sniper')) return 'sniper';
  if (t.includes('shotgun')) return 'shotgun';
  if (t.includes('pistol') || t.includes('sidearm')) return 'pistol';
  if (t.includes('rifle') || t.includes('bow') || t.includes('launcher') || t.includes('speargun')) return 'rifle';
  if (t.includes('archgun')) return 'archgun';
  return 'unknown';
}

/**
 * Extract the modular component names for an Operator Amp or Zaw.
 * Some amps store components in ModularParts; others encode them in UpgradeFingerprint.
 */
function resolveAmpComponents(sourceItem, dict, EW, ER) {
  const modParts = sourceItem?.ModularParts ?? [];
  if (modParts.length > 0) {
    return modParts.map(c => resolveName(c, dict, EW, ER)).filter(Boolean);
  }
  if (!sourceItem?.UpgradeFingerprint) return [];
  const fp = parseFP(sourceItem.UpgradeFingerprint);
  const compPaths = Array.isArray(fp.components) && fp.components.length > 0
    ? fp.components
    : Array.isArray(fp.ModularParts) && fp.ModularParts.length > 0
      ? fp.ModularParts
      : [];
  return compPaths.map(c => resolveName(c, dict, EW, ER)).filter(Boolean);
}

/** Extract component display names for a K-Drive from its ModularParts list. */
function resolveHoverboardComponents(sourceItem, dict, EW) {
  const modParts = sourceItem?.ModularParts ?? [];
  return modParts.map(c => resolveName(c, dict, EW)).filter(Boolean);
}

// ─── Relic Reward Resolution ──────────────────────────────────────────────────

/**
 * Main export.  Receives the raw inventory JSON (from call_api_helper via
 * main.rs) and the full exports bundle (from load_all_exports via main.rs).
 * Returns a single structured object with named arrays for every item category
 * plus account-level stats.  Consumed by Inventory.jsx, Mastery.jsx,
 * Relics.jsx, Rivens.jsx, and Dashboard.jsx.
 */
function detectModFrame(un, rarity, modName) {
  if (!un) return 'Normal Common';
  const r = (rarity ?? '').toLowerCase();
  const u = (un ?? '').toLowerCase();
  const n = (modName ?? '').toLowerCase();
  const check = (str) => u.includes(str.toLowerCase()) || n.includes(str.toLowerCase())
  if (u.includes('/fusers/')) return 'Fuser';
  // Path-based family markers (locale-independent): localized names would
  // otherwise miss the English name checks below. Verified zero collisions:
  // Galvanized = *SPMod paths, Amalgam = /DualSource/, Archon = /Kahl/,
  // Grimoire/Tome = /Grimoire/.
  if (/SPMod$/i.test(u)) return 'Galvanized';
  if (u.includes('/DualSource/')) return 'Amalgam';
  if (u.includes('/Kahl/')) return 'Archon';
  if (u.includes('/Grimoire/')) return 'Tome';
  if (check('Galvanized')) return 'Galvanized';
  if (check('Amalgam')) return 'Amalgam';
  if (check('Peculiar')) return 'Peculiar';
  if (u.includes('/immortal/antivirus')) return 'Antivirus';
  // Requiem: path contains /Immortal/ but NOT Antivirus
  if (u.includes('/immortal/') && !u.includes('/immortal/antivirus')) return 'Requiem';
  if (check('Archon')) return 'Archon';
  if (check('Grimoire')) return 'Tome';
  if (check('Tome')) return 'Tome';
  if (u.includes('/railjack/')) {
    if (r === 'uncommon') return 'Plexus Uncommon';
    if (r === 'rare') return 'Plexus Rare';
    return 'Plexus Common';
  }
  if (u.includes('/dataspike/potency/') || check('Potency')) return 'Potency';
  if (u.toLowerCase().includes('/antiques/') || u.toLowerCase().includes('/antique/') || check('Tektolyst')) return 'Tektolyst';
  if (r === 'uncommon') return 'Normal Uncommon';
  if (r === 'rare') return 'Normal Rare';
  if (r === 'legendary') return 'Normal Legendary';
  return 'Normal Common';
}

const TYPE_TO_EXPORT_CATEGORY = {
  WARFRAME: 'Warframe', PRIMARY: 'Primary', SECONDARY: 'Secondary',
  MELEE: 'Melee', STANCE: 'Stance', AURA: 'Aura', PARAZON: 'Parazon',
  SENTINEL: 'Sentinels', KAVAT: 'Beasts', KUBROW: 'Beasts', 'HELMINTH CHARGER': 'Beasts',
  'ARCH-GUN': 'Archgun', 'ARCH-MELEE': 'Archmelee', ARCHWING: 'Archgun',
}

const TYPE_TO_CATEGORY = {
  Rifle: 'Primary', Shotgun: 'Primary', Primary: 'Primary', Bows: 'Primary',
  Pistol: 'Secondary', Secondary: 'Secondary',
  Melee: 'Melee', Sword: 'Melee', Glaive: 'Melee', Heavy: 'Melee', NoFire: 'Melee',
  Warframe: 'Warframe', Avatar: 'Warframe', Necramech: 'Vehicles', Necromech: 'Vehicles',
  Sentinel: 'Sentinels', Sentinels: 'Sentinels',
  Kubrow: 'Beasts', Kavat: 'Beasts',
  Beast: 'Beasts', Beasts: 'Beasts',
  Stance: 'Stance',
  Aura: 'Aura',
  Exilus: 'Exilus',
  Railjack: 'Railjack', Avionic: 'Railjack',
  Archwing: 'Archgun', Archgun: 'Archgun',
  Archmelee: 'Archmelee',
  Parazon: 'Parazon', Hack: 'Parazon', DataSpike: 'Parazon', Nemesis: 'Parazon',
  Augment: 'Augment',
  Antique: 'Antique', Antiques: 'Antique', Immortal: 'Antique',
  KDrive: 'Vehicles', Vehicles: 'Vehicles', Hoverboard: 'Vehicles',
  // warframe-items (the WI_* background enrichment data) uses its own
  // human-readable `type` strings like "Companion Mod"/"Warframe Mod"
  // instead of DE's raw enum, and wins the merge in mergeWithOrig() since
  // it's non-null - TYPE_TO_EXPORT_CATEGORY's DE-enum keys never match once
  // that data has loaded, so items with no /Mods/ path segment (e.g. Sentinel
  // precepts under /Types/Sentinels/SentinelPrecepts/) fall all the way
  // through to the 'mods' fallback. Companion covers Sentinel/MOA/Hound
  // precepts here; Beast-specific ones are already caught earlier by the
  // /Kubrow//Kavat/ path check before this table is ever consulted.
  Companion: 'Sentinels',
  'Arch-Gun': 'Archgun', 'Arch-Melee': 'Archmelee',
}

function extractModCategory(exportType, un, entry) {
  // Try path-based detection first for more specific categories
  if (un) {
    // Check for Kubrow/Kavat deeper in path (these have SENTINEL export type).
    // Precept mods for these live under their own folder names, which don't
    // contain a literal "/Kubrow/" or "/Kavat/" segment - e.g.
    // /Types/Friendly/Pets/KubrowPetPrecepts/..., .../CatbrowPetPrecepts/...
    // (Kavat precepts are named "Catbrow" internally), and
    // .../CreaturePets/CreaturePrecepts/... (Vulpaphyla/Predasite). Without
    // these, they fall through to the type-string fallback below, where
    // warframe-items' generic "Companion Mod" bucket (once that background
    // enrichment loads) can't tell them apart from real Sentinel precepts.
    if (un.includes('/Kubrow/') || un.includes('/Kavat/') ||
        un.includes('KubrowPetPrecepts') || un.includes('CatbrowPetPrecepts') ||
        un.includes('CreaturePrecepts')) return 'Beasts'
    // MOA/Hound (Zanuka) precept mods - their own category, not lumped into
    // the generic Sentinels bucket they'd otherwise fall through to.
    if (un.includes('/MoaPets/') || un.includes('/ZanukaPets/')) return 'Robotic'
    // Requiem mods live under /Grimoire/, not /Mods/ at all, so none of the
    // path-based checks below (which all require "/Mods/") ever match them -
    // they'd otherwise fall through to whatever generic check catches them
    // next (AP_TACTIC -> Exilus for some, export-type fallback -> Secondary
    // for others), scattering one mod set across unrelated categories.
    if (un.includes('/Grimoire/')) return 'Tome'
    // All mods under /Immortal/ are Parazon mods (Requiem + Antivirus)
    if (un.includes('/Immortal/')) return 'Parazon'
    // Archwing melee needs explicit check before /Mods/Archwing/ matches Archwing→Archgun
    if (un.includes('/Archwing/Melee/')) return 'Archmelee'
    // Augment mods/cards
    if (un.includes('AugmentCard') || un.includes('AugmentMod')) return 'Augment'
    // Killswitch mods
    if (un.includes('Killswitch')) return 'Peculiar'
    // Beast stance mods - path-based before STANCE fallback
    if (un.includes('/Pets/BeastWeapons/')) return 'Beasts'
    const m2 = un.match(/\/Mods\/(?:Sets|PvPMods)\/([^/]+)/)
    if (m2 && TYPE_TO_CATEGORY[m2[1]]) return TYPE_TO_CATEGORY[m2[1]]
    const m = un.match(/\/Mods\/([^/]+)/)
    if (m && TYPE_TO_CATEGORY[m[1]]) return TYPE_TO_CATEGORY[m[1]]
  }
  // Check compatName for beast-vs-sentinel distinction
  if (entry?.compatName === 'BEAST') return 'Beasts'
  // Fall back to export type mapping
  if (exportType && exportType !== '---') {
    if (TYPE_TO_EXPORT_CATEGORY[exportType]) return TYPE_TO_EXPORT_CATEGORY[exportType]
    // warframe-items' own type strings ("Companion Mod", "Warframe Mod", ...)
    // instead of DE's raw enum - see TYPE_TO_CATEGORY's Companion/Arch-Gun/
    // Arch-Melee entries for why this table is checked too.
    const wfcdType = exportType.replace(/\s*Mod$/i, '').trim()
    if (TYPE_TO_CATEGORY[wfcdType]) return TYPE_TO_CATEGORY[wfcdType]
  }
  return null
}

// Exilus-slot compatibility is a trait that cuts across mod families (a
// Tome mod, a Warframe mod, a Primary mod, etc. can all be Exilus-slotted),
// not a family of its own - so this is tracked separately from
// extractModCategory's result instead of overriding it. A mod like Fass
// Canticle needs to show as both Tome AND Exilus, not one or the other.
function isModExilus(un, entry) {
  return !!un && (un.includes('ExilusMod') || entry?.polarity === 'AP_TACTIC')
}

function resolveArcaneDesc(levelStats, dict) {
  if (!levelStats || !Array.isArray(levelStats) || !levelStats.length) return ''
  const rankEntry = levelStats[levelStats.length - 1]
  if (!Array.isArray(rankEntry)) return ''
  const parts = rankEntry.map(statObj => {
    if (!statObj?.tag || !dict) return ''
    const tmpl = dict[statObj.tag] || dict['/' + statObj.tag] || ''
    if (!tmpl) return ''
    return tmpl.replace(/\|([^|]+)\|/g, (_, key) => {
      const val = statObj.sub?.[key]
      if (!val) return `|${key}|`
      if (typeof val === 'string') return dict[val] || dict['/' + val] || val
      if (val?.tag) {
        const vt = dict[val.tag] || dict['/' + val.tag] || ''
        if (vt) return vt.replace(/\|([^|]+)\|/g, (__, k) => val.sub?.[k] || `|${k}|`)
      }
      return String(val)
    })
  }).filter(Boolean)
  return parts.join('; ').replace(/<[^>]*>/g, '').trim()
}

const ARCANE_CATEGORY_FOLDER = {
  Antiques: 'Antique',
  OperatorAmps: 'Amp',
  OperatorArmour: 'Operator',
  Operator: 'Operator',
  Melee: 'Melee',
  Defensive: 'Warframe',
  Support: 'Warframe',
}

const ARCANE_DISPLAY_NAME_CATEGORY = {
  'akimbo slip shot': 'Secondary',
  'arcane acceleration': 'Warframe',
  'arcane aegis': 'Warframe',
  'arcane agility': 'Warframe',
  'arcane arachne': 'Warframe',
  'arcane avenger': 'Warframe',
  'arcane awakening': 'Warframe',
  'arcane barrier': 'Warframe',
  'arcane battery': 'Warframe',
  'arcane bellicose': 'Warframe',
  'arcane blade charger': 'Warframe',
  'arcane blessing': 'Warframe',
  'arcane bodyguard': 'Warframe',
  'arcane camisado': 'Warframe',
  'arcane circumvent': 'Warframe',
  'arcane concentration': 'Warframe',
  'arcane consequence': 'Warframe',
  'arcane crepuscular': 'Warframe',
  'arcane deflection': 'Warframe',
  'arcane double back': 'Warframe',
  'arcane energize': 'Warframe',
  'arcane eruption': 'Warframe',
  'arcane escapist': 'Warframe',
  'arcane expertise': 'Warframe',
  'arcane fury': 'Warframe',
  'arcane grace': 'Warframe',
  'arcane guardian': 'Warframe',
  'arcane healing': 'Warframe',
  'arcane hot shot': 'Warframe',
  'arcane ice': 'Warframe',
  'arcane ice storm': 'Warframe',
  'arcane impetus': 'Warframe',
  'arcane intention': 'Warframe',
  'arcane momentum': 'Warframe',
  'arcane nullifier': 'Warframe',
  'arcane persistence': 'Warframe',
  'arcane phantasm': 'Warframe',
  'arcane pistoleer': 'Warframe',
  'arcane power ramp': 'Warframe',
  'arcane precision': 'Warframe',
  'arcane primary charger': 'Warframe',
  'arcane pulse': 'Warframe',
  'arcane rage': 'Warframe',
  'arcane reaper': 'Warframe',
  'arcane resistance': 'Warframe',
  'arcane rise': 'Warframe',
  'arcane steadfast': 'Warframe',
  'arcane strike': 'Warframe',
  'arcane tanker': 'Warframe',
  'arcane tempo': 'Warframe',
  'arcane trickery': 'Warframe',
  'arcane truculence': 'Warframe',
  'arcane ultimatum': 'Warframe',
  'arcane universal fallout': 'Warframe',
  'arcane velocity': 'Warframe',
  'arcane victory': 'Warframe',
  'arcane warmth': 'Warframe',
  'cascadia accuracy': 'Secondary',
  'cascadia empowered': 'Secondary',
  'cascadia flare': 'Secondary',
  'cascadia overcharge': 'Secondary',
  'conjunction voltage': 'Secondary',
  'emergence dissipate': 'Operator',
  'emergence renewed': 'Operator',
  'emergence savior': 'Operator',
  'eternal eradicate': 'Amp',
  'eternal logistics': 'Amp',
  'eternal onslaught': 'Amp',
  'exodia brave': 'Zaw',
  'exodia contagion': 'Zaw',
  'exodia epidemic': 'Zaw',
  'exodia force': 'Zaw',
  'exodia hunt': 'Zaw',
  'exodia might': 'Zaw',
  'exodia triumph': 'Zaw',
  'exodia valor': 'Zaw',
  'fractalized reset': 'Primary',
  'longbow sharpshot': 'Primary',
  'magus accelerant': 'Operator',
  'magus aggress': 'Operator',
  'magus anomaly': 'Operator',
  'magus cadence': 'Operator',
  'magus cloud': 'Operator',
  'magus destruct': 'Operator',
  'magus drive': 'Operator',
  'magus elevate': 'Operator',
  'magus firewall': 'Operator',
  'magus glitch': 'Operator',
  'magus husk': 'Operator',
  'magus lockdown': 'Operator',
  'magus melt': 'Operator',
  'magus nourish': 'Operator',
  'magus overload': 'Operator',
  'magus repair': 'Operator',
  'magus replenish': 'Operator',
  'magus revert': 'Operator',
  'magus vigor': 'Operator',
  'melee afflictions': 'Melee',
  'melee animosity': 'Melee',
  'melee careen': 'Melee',
  'melee crescendo': 'Melee',
  'melee doughty': 'Melee',
  'melee duplicate': 'Melee',
  'melee exposure': 'Melee',
  'melee fortification': 'Melee',
  'melee influence': 'Melee',
  'melee retaliation': 'Melee',
  'melee vortex': 'Melee',
  'molt augmented': 'Warframe',
  'molt efficiency': 'Warframe',
  'molt reconstruct': 'Warframe',
  'molt vigor': 'Warframe',
  'pax bolt': 'Kitgun',
  'pax charge': 'Kitgun',
  'pax seeker': 'Kitgun',
  'pax soar': 'Kitgun',
  'primary blight': 'Primary',
  'primary bulwark': 'Primary',
  'primary crux': 'Primary',
  'primary deadhead': 'Primary',
  'primary debilitate': 'Primary',
  'primary dexterity': 'Primary',
  'primary exhilarate': 'Primary',
  'primary frostbite': 'Primary',
  'primary merciless': 'Primary',
  'primary obstruct': 'Primary',
  'primary overcharge': 'Primary',
  'primary plated round': 'Primary',
  'residual boils': 'Kitgun',
  'residual malodor': 'Kitgun',
  'residual shock': 'Kitgun',
  'residual viremia': 'Kitgun',
  'secondary deadhead': 'Secondary',
  'secondary dexterity': 'Secondary',
  'secondary encumber': 'Secondary',
  'secondary enervate': 'Secondary',
  'secondary fortifier': 'Secondary',
  'secondary irradiate': 'Secondary',
  'secondary kinship': 'Secondary',
  'secondary merciless': 'Secondary',
  'secondary outburst': 'Secondary',
  'secondary shiver': 'Secondary',
  'secondary surge': 'Secondary',
  'shotgun vendetta': 'Primary',
  'theorem contagion': 'Warframe',
  'theorem demulcent': 'Warframe',
  'theorem infection': 'Warframe',
  'virtuos forge': 'Amp',
  'virtuos fury': 'Amp',
  'virtuos ghost': 'Amp',
  'virtuos null': 'Amp',
  'virtuos shadow': 'Amp',
  'virtuos spike': 'Amp',
  'virtuos strike': 'Amp',
  'virtuos surge': 'Amp',
  'virtuos tempo': 'Amp',
  'virtuos trojan': 'Amp',
  'zid-an asheir': 'Antique',
  'zid-an haras': 'Antique',
  'zid-an osbok': 'Antique',
  'zid-an sek-eel': 'Antique',
  'zid-an uskos': 'Antique',
}

function detectArcaneCategory(un, name) {
  if (!un) return 'Arcanes'
  const normalizedName = (name ?? '').toLowerCase()
  if (ARCANE_DISPLAY_NAME_CATEGORY[normalizedName]) return ARCANE_DISPLAY_NAME_CATEGORY[normalizedName]
  const m = un.match(/\/CosmeticEnhancers\/([^/]+)/)
  if (!m) return 'Arcanes'
  const folder = m[1]
  if (ARCANE_CATEGORY_FOLDER[folder]) return ARCANE_CATEGORY_FOLDER[folder]
  if (normalizedName.startsWith('primary ')) return 'Primary'
  if (normalizedName.startsWith('secondary ')) return 'Secondary'
  if (normalizedName.startsWith('melee ')) return 'Melee'
  if (normalizedName.startsWith('pax ') || normalizedName.startsWith('residual ')) return 'Kitgun'
  if (normalizedName.startsWith('exodia ')) return 'Zaw'
  if (normalizedName.startsWith('magus ') || normalizedName.startsWith('emergence ')) return 'Operator'
  if (normalizedName.startsWith('virtuos ') || normalizedName.startsWith('eternal ')) return 'Amp'
  if (normalizedName.startsWith('zid-an ') || normalizedName.startsWith('arcane ') || normalizedName.startsWith('molt ') || normalizedName.startsWith('theorem ')) return 'Warframe'
  return folder
}

export function parseInventory(raw, exports, dict, locale = 'en', i18nData = null) {
  updateActiveExportImages(exports?.ExportImages ?? null);
  if (!raw || typeof raw !== 'object' || !exports) return { all: [] };
  dict = (dict && Object.keys(dict).length > 0) ? dict : (exports?.['dict.en'] || exports?.dict || {})

  const toMap = (data, wrapperKey) => {
    if (!data) return {};
    let arr = data;
    if (typeof data === 'object' && !Array.isArray(data)) {
      if (wrapperKey && data[wrapperKey]) arr = data[wrapperKey];
      else {
        const keys = Object.keys(data);
        if (keys.length === 1) arr = data[keys[0]];
      }
    }
    if (Array.isArray(arr)) {
      const map = {};
      for (const item of arr) {
        const key = item.uniqueName || item.ItemType || item.name;
        if (key) map[key] = item;
      }
      return map;
    }
    return arr || {};
  };

  // ── Riven tag info (export-derived) ──
  // Per-riven-type stat bases, affix syllables, and dict lockeys, rebuilt from
  // ExportUpgrades' /Lotus/Upgrades/Mods/Randomized/<type> entries on every
  // parse (cheap: ~10ms). The old hardcoded riven_tags.json blob and
  // per-locale rivenStats tables are gone — DE's own data and dict strings
  // now drive the riven stat formula, constructed name, and labels.
  const buildRivenTagInfo = () => {
    const info = {};
    const upMap = toMap(exports.ExportUpgrades, 'ExportUpgrades');
    for (const [un, entry] of Object.entries(upMap)) {
      if (!un.includes('/Randomized/')) continue;
      const typeName = un.split('/').pop();
      const byTag = info[typeName] = info[typeName] || {};
      for (const ue of entry.upgradeEntries || []) {
        const uv = ue.upgradeValues && ue.upgradeValues[0];
        const syllable = (k) => {
          if (!k) return '';
          const v = dict[k] || dict[k.replace(/^\//, '')] || '';
          return v && !v.startsWith('/Lotus/') ? v.replace(/<[^>]*>/g, '').trim() : '';
        };
        byTag[ue.tag] = {
          value: uv?.value ?? 0.01,
          prefix: syllable(ue.prefixTag),
          suffix: syllable(ue.suffixTag),
          canBeBuff: !!ue.canBeBuff,
          canBeCurse: !!ue.canBeCurse,
          locTag: uv?.locTag || null,
        };
      }
    }
    return info;
  };
  const rivenTagInfo = buildRivenTagInfo();

  // ── warframe-items data (pre-resolved names, descriptions, images) ──
  // When WI maps are available (injected by MonitoringContext), they serve as
  // the primary lookup source.  Entries missing from WI are supplemented from
  // the original public-export-plus data.
  const useWI = !!exports.WI_Warframes;

  const mergeWithOrig = (wiMap, origKey) => {
    const map = wiMap ? { ...wiMap } : {};
    if (origKey && exports[origKey]) {
      const origMap = toMap(exports[origKey], origKey);
      for (const [un, origEntry] of Object.entries(origMap)) {
        if (map[un]) {
          // Copy the entry before mutating — map is a shallow spread of the WI
          // map, so entries are shared references; writing into them in place
          // would poison exports.WI_* with loctags for later readers (riven
          // weapon_name_en must stay English for the price model).
          map[un] = { ...map[un] };
          // Supplement WI entry with original fields it doesn't have.
          // Names: WI entries pre-resolve names to English literals, which
          // would defeat dict-based localization. When the original export
          // entry carries a dict loctag that resolves in the active locale
          // dict, prefer it so resolveName() localizes the name.
          const origName = origEntry?.name;
          const locValue = (typeof origName === 'string' && origName.startsWith('/Lotus/')) ? dict[origName] : null;
          if (locValue && !locValue.startsWith('/Lotus/')) {
            map[un].name = origName;
          }
          // Same as names: WI descriptions are pre-resolved to English literals
          // by warframe-items; when the original export carries a dict loctag that
          // resolves in the active locale dict, prefer the lockey so the desc
          // localizes (e.g. Adarza Kavat's English flavor text → Turkish).
          const origDesc = origEntry?.description;
          const descLocValue = (typeof origDesc === 'string' && origDesc.startsWith('/Lotus/')) ? dict[origDesc] : null;
          if (descLocValue && !descLocValue.startsWith('/Lotus/')) {
            map[un].description = origDesc;
          }
          for (const [k, v] of Object.entries(origEntry)) {
            if ((map[un][k] === undefined || map[un][k] === null) && v != null) {
              map[un][k] = v;
            }
          }
          // Icons: prefer the original export's INTERNAL card path
          // (/Lotus/Interface/Cards/Images/...) over warframe-items' remote
          // wikiaThumbnail. Internal paths join onto the locally-exported
          // cardImagesPath (convertFileSrc(cardImagesPath + iconPath)); the
          // remote URL only gets mangled into `card-imageshttps://...` 404s.
          const origIcon = origEntry?.icon;
          if (
            typeof origIcon === 'string' &&
            origIcon.startsWith('/Lotus/') &&
            typeof map[un].icon === 'string' &&
            /^https?:\/\//.test(map[un].icon)
          ) {
            map[un].icon = origIcon;
          }
          // Relic category/era: warframe-items' relic data doesn't reliably
          // track DE's newer Requiem/Immortal relic categorization (I/II/
          // III/IV/Eterna instead of the classic era-lettered categories) -
          // it can carry a stale/generic category for these keys, which the
          // generic "only fill in undefined fields" merge above would never
          // override since the field isn't actually undefined. DE's own
          // export is authoritative for these short categorical labels
          // (unlike names/descriptions, which need dict-loctag handling),
          // so always prefer it here. Confirmed live 2026-08-10: without
          // this, all four Requiem I-IV relics collapsed into one garbled
          // "Requiem Relics Relic" group instead of four separate ones.
          if (origKey === 'ExportRelics') {
            if (origEntry?.category != null) map[un].category = origEntry.category;
            if (origEntry?.era != null) map[un].era = origEntry.era;
          }
          // Mod type/compatName: warframe-items uses its own human-readable
          // type strings ("Companion Mod", "Warframe Mod", ...) instead of
          // DE's raw enum (SENTINEL, KAVAT, KUBROW, ...), and since the field
          // isn't undefined the generic merge above never overrides it.
          // extractModCategory's fallback table only knows DE's enum, so once
          // this data loads, any mod without a "/Mods/" path segment (Kavat/
          // Kubrow/Sentinel precepts, which live under /Types/.../Precepts/)
          // gets misclassified or dumped in a generic fallback bucket. DE's
          // own export is authoritative for these two fields - always prefer
          // it, the same way relic category/era is forced above.
          if (origKey === 'ExportUpgrades') {
            // type: only override when DE actually defines one, so items DE
            // leaves untyped can still fall back to WI's guess for
            // classification purposes (type is never shown to the user
            // directly, only used to pick a category).
            if (origEntry?.type != null) map[un].type = origEntry.type;
            // compatName: unconditional, exact match to DE's value (including
            // clearing it to null when DE has none) - this is displayed
            // directly to the user as a per-companion/weapon filter label, so
            // it must never silently keep a WI guess DE doesn't corroborate.
            map[un].compatName = origEntry?.compatName ?? null;
          }
        } else {
          // Entry only in original data
          map[un] = origEntry;
        }
      }
    }
    return map;
  };

  const EWf = useWI
    ? mergeWithOrig(exports.WI_Warframes, 'ExportWarframes')
    : toMap(exports.ExportWarframes, 'ExportWarframes');
  const EW = useWI
    ? mergeWithOrig(exports.WI_Weapons, 'ExportWeapons')
    : toMap(exports.ExportWeapons, 'ExportWeapons');
  const ES = useWI
    ? mergeWithOrig(exports.WI_Sentinels, 'ExportSentinels')
    : toMap(exports.ExportSentinels, 'ExportSentinels');
  const EM = useWI
    ? mergeWithOrig(exports.WI_Upgrades, 'ExportUpgrades')
    : toMap(exports.ExportUpgrades, 'ExportUpgrades');
  // Merge Railjack avionics into EM
  if (exports.ExportAvionics) {
    const avMap = toMap(exports.ExportAvionics, 'ExportAvionics');
    for (const [un, entry] of Object.entries(avMap)) {
      if (!EM[un]) EM[un] = entry;
    }
  }
  // If a patched ExportUpgrades file is available (with levelStats, modSet), merge its entries
  if (exports.ExportUpgradesFixed) {
    const fixedMap = toMap(exports.ExportUpgradesFixed, 'ExportUpgradesFixed');
    for (const [un, entry] of Object.entries(fixedMap)) {
      if (EM[un]) {
        if (entry.levelStats && !EM[un].levelStats) EM[un].levelStats = entry.levelStats;
        if (entry.modSet && !EM[un].modSet) EM[un].modSet = entry.modSet;
      }
    }
  }
  // Merge locale-specific ExportUpgrades from DE public manifest (localized levelStats)
  // These override the English _fixed.json stats with proper translations.
  if (exports.ExportUpgradesLocalized) {
    const locArr = exports.ExportUpgradesLocalized.ExportUpgrades || exports.ExportUpgradesLocalized;
    const locMap = toMap(locArr, 'ExportUpgrades');
    for (const [un, entry] of Object.entries(locMap)) {
      if (!EM[un]) continue;
      if (entry.levelStats) EM[un].levelStats = entry.levelStats;
      // Locale manifests (e.g. TR) ship mod/augment names as literal
      // translations. The dict only resolves these to English, so prefer the
      // manifest's literal name (non-loctag) whenever one exists.
      if (typeof entry.name === 'string' && entry.name && !entry.name.startsWith('/Lotus/')) {
        EM[un].name = entry.name;
      }
    }
  }
  // Same for patched ExportAvionics
  if (exports.ExportAvionicsFixed) {
    for (const [un, entry] of Object.entries(exports.ExportAvionicsFixed)) {
      if (EM[un]) {
        if (entry.levelStats && !EM[un].levelStats) {
          EM[un].levelStats = entry.levelStats;
        }
        if (entry.icon) {
          EM[un].icon = entry.icon;
        }
      }
    }
  }
  // Manual icon overrides for mods whose export data lacks an icon field
  // (e.g. Railjack avionics, some Antivirus/Immortal variants). An internal
  // /Lotus/... card path beats a remote wikiaThumbnail so the local export is
  // used instead of a mangled card-imageshttps://... remote URL.
  if (exports.ModIconMap) {
    for (const [un, iconPath] of Object.entries(exports.ModIconMap)) {
      if (EM[un] && (!EM[un].icon || /^https?:\/\//.test(EM[un].icon))) {
        EM[un].icon = iconPath;
      }
    }
  }
  // Several Railjack tactical mods (e.g. Death Blossom) share one generic
  // placeholder card image in ModIconMap (RailjackModGenericNN.png) - the
  // real per-ability icon only exists in this separate overlay table. Apply
  // it after ModIconMap so those mods don't render the generic placeholder.
  if (exports.CardOverlayMap) {
    for (const entry of Object.values(EM)) {
      if (!entry?.icon) continue;
      const key = entry.icon.replace(/^\//, '');
      const overlay = exports.CardOverlayMap[key];
      if (overlay) entry.icon = `/${overlay}`;
    }
  }
  const EA = useWI
    ? mergeWithOrig(exports.WI_Arcanes, 'ExportArcanes')
    : toMap(exports.ExportArcanes, 'ExportArcanes');
  // Keep the DE export maps available as authoritative identity/name sources.
  // The optional warframe-items maps can contain generic or stale display names
  // for some Arcanes and Gear entries, even when their unique names match.
  const EAOrig = toMap(exports.ExportArcanes, 'ExportArcanes');
  const ER = useWI
    ? mergeWithOrig(exports.WI_Resources, 'ExportResources')
    : toMap(exports.ExportResources, 'ExportResources');
  const ERel = useWI
    ? mergeWithOrig(exports.WI_Relics, 'ExportRelics')
    : toMap(exports.ExportRelics, 'ExportRelics');
  const ERew = toMap(exports.ExportRewards, 'ExportRewards');
  const ERecipe = toMap(exports.ExportRecipes, 'ExportRecipes');
  const ECust = useWI
    ? mergeWithOrig(exports.WI_Customs, 'ExportCustoms')
    : toMap(exports.ExportCustoms, 'ExportCustoms');
  const EGear = useWI
    ? mergeWithOrig(exports.WI_Gear, 'ExportGear')
    : toMap(exports.ExportGear, 'ExportGear');
  const EGearOrig = toMap(exports.ExportGear, 'ExportGear');
  const EB = toMap(exports.ExportBundles, 'ExportBundles');

  // ── XP lookup ──
  // inventory.XPInfo contains per-item affinity totals, referenced by ItemType.
  // We build a quick map here so createItem can look it up in O(1).
  const xpMap = {};
  (raw.XPInfo ?? []).forEach(i => {
    if (i.ItemType) xpMap[i.ItemType] = i.XP ?? 0;
  });

  // ── Owned-item index ──
  // We first group all owned instances by their ItemType (unique name) so that
  // later per-category processors can quickly check "does the player own this?"
  // without iterating the whole inventory each time.
  const ownedItems = {};
  const processList = (list) => {
    for (const item of (list ?? [])) {
      const un = item.ItemType;
      if (!un) continue;
      if (!ownedItems[un]) ownedItems[un] = [];
      ownedItems[un].push(item);
    }
  };

  [
    raw.Suits, raw.LongGuns, raw.Pistols, raw.Melee,
    raw.Sentinels, raw.KubrowPets, raw.MoaPets, raw.ZanukaPets, raw.SentinelWeapons,
    raw.SpaceMelee, raw.SpaceGuns, raw.MechSuits, raw.OperatorAmps,
    raw.SpaceSuits, raw.Hoverboards
  ].forEach(processList);

  const subsumedSet = new Set((raw.InfestedFoundry?.ConsumedSuits ?? []).map(s => s.s).filter(Boolean));
  const evoList = raw.EvolutionProgress ?? [];
  const incarnonTypes = new Set(evoList.map(e => e.ItemType).filter(Boolean));
  const incarnonItemIds = new Set(evoList.map(e => String(e.ItemId?.$oid || e.ItemId || e.id || '')).filter(Boolean));
  const incarnonLeaves = new Set(evoList.map(e => (e.ItemType || '').split('/').pop()?.toLowerCase()).filter(Boolean));
  const evolutionLevels = new Map(evoList.filter(e => e.ItemType).map(e => [e.ItemType, e.EvolutionLevel]));

  // ── createItem ──
  // Central factory used by every category processor.
  // Resolves name, image, rank, mastery XP, and metadata for one item instance.
  const createItem = (un, category, nameTbls, imgTbls, sourceItem = null) => {
    // For un-polarized overlevelable weapons, use capped XP from xpMap
    // XPInfo caps XP at 30² × 500 = 450000 for un-polarized weapons
    const isOverlevelable = getRankLimit(un, category, EM, EA, EW) === 40;
    const hasPolarization = (sourceItem?.Polarized ?? 0) > 0;
    const useCappedXP = isOverlevelable && !hasPolarization;

    const xp = useCappedXP ? (xpMap[un] ?? 0) : (sourceItem?.XP ?? xpMap[un] ?? 0);
    const limit = getRankLimit(un, category, EM, EA, EW);

    // For mods, prioritize rank from Fingerprint or Item data over XP calculation
    const fp = sourceItem?.UpgradeFingerprint ? parseFP(sourceItem.UpgradeFingerprint) : null;
    let rank = parseInt(fp?.lvl ?? sourceItem?.UpgradeLevel ?? -1, 10);

    if (rank === -1) {
      // Cap rank at the actual achievable max for this weapon's forma count.
      // XPInfo accumulates XP across forma resets, so raw xpMap values can
      // exceed rank-40 thresholds even for a 1-forma weapon - without this
      // cap, any polarized weapon with enough accumulated XP shows as rank 40.
      const formaCount = sourceItem?.Polarized ?? 0;
      const effectiveMaxRank = isOverlevelable
        ? (hasPolarization ? 30 + Math.min(formaCount * 2, 10) : 30)
        : limit;
      rank = calculateRank(xp, category, un, effectiveMaxRank);
    }

    // Mastery XP: rank * (100 for weapons, 200 for heavy)
    // For overlevelable weapons, polarization affects mastery calculation
    const heavyCategories = [
      'warframes', 'companions', 'necramechs', 'archwings',
      'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'plexus', 'kdrives'
    ];
    const baseMasteryPerRank = heavyCategories.includes(category) ? 200 : 100;

    // Modular items (MOAs, Hounds, Zaws, Kitguns, Amps) only grant mastery when Gilded
    const modularCategories = ['moas', 'hounds', 'zaws', 'kitguns', 'amps'];
    const isModular = modularCategories.includes(category);

    // Gilding is indicated by: Features bit 0 set, or has CustomName, or Polarized > 0
    const isGilded = (sourceItem?.Features & 1) ||
      (sourceItem?.Polarized > 0) ||
      (!!sourceItem?.CustomName && !sourceItem.CustomName.startsWith('/Lotus/'));
    const grantsMastery = !isModular || isGilded;

    // Get polarization count from sourceItem
    const polarizeCount = sourceItem?.Polarized ?? 0;

    let mastery_xp, max_mastery_xp, mastered;
    const baseMasteryAtMax = limit * baseMasteryPerRank;

    if (isOverlevelable && hasPolarization) {
      // Polarized overlevelable: base is 30 * baseMasteryPerRank
      const baseXP = 30 * baseMasteryPerRank;
      if (rank <= 30) {
        // If still at or below 30, mastery is locked at base value
        mastery_xp = baseXP;
      } else {
        // Beyond 30: base + extra per rank beyond 30 (still 100 per rank)
        mastery_xp = baseXP + (rank - 30) * baseMasteryPerRank;
      }
      // Max rank depends on polarization (2 extra per forma, max 10 extra = 40)
      const effectiveMaxRank = 30 + Math.min(polarizeCount * 2, 10);
      max_mastery_xp = baseXP + Math.max(0, effectiveMaxRank - 30) * baseMasteryPerRank;
      mastered = rank >= effectiveMaxRank;
    } else if (hasPolarization) {
      // Polarized: once maxed, permanently grants max mastery
      // Forma resets rank but keeps the mastered status
      mastery_xp = baseMasteryAtMax;
      max_mastery_xp = baseMasteryAtMax;
      mastered = true;
    } else {
      // Normal weapons or un-polarized overlevelable
      // For companion types:
      // - Kubrows and Kavats: always give mastery at max rank (no gilding)
      // - MOAs, Predasites, Vulpaphylas, Hounds: need gilding to give mastery
      const isKubrow = un.includes('/KubrowPets/') || un.toLowerCase().includes('kubrow');
      const isKavat = un.includes('/Kavat/') || un.toLowerCase().includes('kavat');
      const isBeast = category === 'beasts';

      // Gilding is indicated by having a non-empty Name in Details
      const hasName = sourceItem?.Details?.Name && sourceItem.Details.Name.length > 0;
      const isGilded = hasName;

      const beastRankRaw = sourceItem?.UpgradeLevel;
      const beastRank = beastRankRaw ? parseInt(beastRankRaw, 10) : rank;
      const effectiveRank = (isBeast && beastRank > 0) ? beastRank : rank;

      if (isBeast) {
        const needsGilding = !isKubrow && !isKavat;

        if (!needsGilding || isGilded) {
          // Kubrows/Kavats always give mastery, or others if they have a name (gilded)
          mastery_xp = effectiveRank * baseMasteryPerRank;
          mastered = effectiveRank >= limit;
        } else {
          // Predasite/Vulpaphyla/Hound not gilded - no mastery
          mastery_xp = 0;
          mastered = false;
        }
      } else {
        mastery_xp = grantsMastery ? (effectiveRank * baseMasteryPerRank) : 0;

        // Correct threshold: Affinity XP needed for max rank = limit² * baseXPPerRank
        const isHeavy = heavyCategories.includes(category);
        const baseXPPerRank = isHeavy ? 1000 : 500;
        const affinityThreshold = limit * limit * baseXPPerRank;
        const lifetimeMastered = xp >= affinityThreshold;

        mastered = grantsMastery && ((sourceItem?.mastered ?? false) || lifetimeMastered);
      }
      max_mastery_xp = limit * baseMasteryPerRank;
    }

    let baseName = resolveName(un, dict, locale, ...nameTbls);
    if (un.includes('/BoardSuit')) baseName = 'Merulina';

    let name = baseName;
    let image = resolveImage(un, ...imgTbls);

    const customName = sourceItem?.ItemName || sourceItem?.CustomName || sourceItem?.Details?.Name;
    if (customName && !customName.startsWith('/Lotus/') && customName !== name) {
      name = `${customName} (${baseName})`;
    }

    // Reuse fp from rank calculation
    let components = [];

    if (category === 'amps') {
      components = resolveAmpComponents(sourceItem, dict, EW, ER);
      const prismPart = sourceItem?.ModularParts?.[0] || parseFP(sourceItem.UpgradeFingerprint)?.ModularParts?.[0];
      if (prismPart) image = resolveImage(prismPart, EW, ER);
      if (un.includes('DrifterPistol')) name = 'Sirocco';
      else name = (customName && !customName.startsWith('/Lotus/')) ? customName : 'Operator Amp';
    } else {
      components = fp?.components?.map(c => resolveName(c, dict, locale, EW, ES, ER, EA)) ?? [];
    }

    if (!image && fp?.components?.length > 0) {
      for (const compUn of fp.components) {
        image = resolveImage(compUn, EW, ES, ER, EWf, EA);
        if (image) break;
      }
    }

    const entry = nameTbls[0]?.[un];
    const descLoctag = entry?.description ?? '';
    const rawDesc = descLoctag
      ? (descLoctag.startsWith('/Lotus/')
          ? (dict[descLoctag] || dict['/' + descLoctag] || '')
          : descLoctag)
      : '';
    const description = rawDesc ? rawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';

    return {
      unique_name: un,
      name,
      image,
      category,
      description,
      xp,
      rank,
      max_rank: isOverlevelable
        ? (hasPolarization ? 30 + Math.min((sourceItem?.Polarized ?? 0) * 2, 10) : 30)
        : limit,
      mastery_xp,
      max_mastery_xp,
      // Warframe keeps lifetime affinity XP for a weapon even after it's sold
      // or dissolved (mastery fodder) - xpMap having an entry means "was
      // ranked up at some point", not "currently in inventory". `owned` must
      // reflect current possession only; `mastered` above already carries
      // the lifetime-XP signal correctly.
      owned: !!sourceItem,
      mastered,
      // wfcd's own curated data marks some items (e.g. non-Head Zanuka Hound
      // body/legs/tail parts) masterable:false - they're real, ownable crafting
      // components but have no in-game mastery state of their own. Default to
      // true since DE's raw export never carries this field.
      masterable: entry?.masterable !== false,
      subsumed: subsumedSet.has(un),
      is_prime: entry?.variantType === 'VT_PRIME' || /Prime$/i.test(un.split('/').filter(Boolean).at(-1) ?? ''),
      is_incarnon: (() => {
        if (sourceItem?.SkillTree != null) return true;
        if (((sourceItem?.Features ?? 0) & 2) !== 0) return true;
        if (incarnonTypes.has(un)) return true;
        const sId = String(sourceItem?.ItemId?.$oid || sourceItem?.ItemId || sourceItem?.Id?.$oid || sourceItem?.Id || '');
        if (sId && incarnonItemIds.has(sId)) return true;
        const unLeaf = un.split('/').pop()?.toLowerCase() || '';
        const nameLeaf = (entry?.name || '').split('/').pop()?.toLowerCase() || '';
        if (incarnonLeaves.has(unLeaf) || incarnonLeaves.has(nameLeaf)) return true;
        if ((sourceItem?.Upgrades || []).some(u => typeof u === 'string' && u.includes('Incarnon'))) return true;
        return false;
      })(),
      incarnon_evolution_level: evolutionLevels.get(un) ?? (evolutionLevels.get(un.split('/').pop()) ?? -1),
      quantity: sourceItem?.ItemCount ?? (sourceItem ? 1 : 0),
      formas: sourceItem?.Polarized ?? 0,
      components,
      ...sourceItem
    };
  };

  const FOUNDER_ITEMS = new Set([
    '/Lotus/Powersuits/Excalibur/ExcaliburPrime',
    '/Lotus/Weapons/Tenno/Pistol/LatoPrime',
    '/Lotus/Weapons/Tenno/Melee/LongSword/SkanaPrime'
  ]);

  const processCategory = (map, category, nameTbls, imgTbls, filterFn = null) => {
    const results = [];
    for (const [un, entry] of Object.entries(map)) {
      if (filterFn && !filterFn(entry, un)) continue;
      const instances = ownedItems[un];
      if (!instances && FOUNDER_ITEMS.has(un)) continue;
      (instances ?? [null]).forEach(inst => results.push(createItem(un, category, nameTbls, imgTbls, inst)));
    }
    return results;
  };

  const warframes = processCategory(EWf, 'warframes', [EWf], [EWf],
    (e, un) => e.productCategory === 'Suits' && !un.includes('SpaceSuits') && !un.includes('MechSuits'));

  const weaponsRaw = processCategory(EW, 'weapons', [EW], [EW], (e) => {
    if (e.sentinel) return false;
    if (['SpaceGuns', 'SpaceMelee', 'SentinelWeapons'].includes(e.productCategory)) return false;
    // Include hidden weapons if they are known special variants
    const name = (e.name || "").toLowerCase();
    const isSpecial = name.includes('vandal') || name.includes('wraith') || name.includes('prisma') || name.includes('prime');
    if (e.excludeFromCodex && !isSpecial) return false;
    return true;
  });

  const primary = [], secondary = [], melee = [], kitguns = [], zaws = [];
  weaponsRaw.forEach(i => {
    const e = EW[i.unique_name];
    if (!e) return;
    const name = (e.name || "").toLowerCase();
    const un = i.unique_name;
    const isKitgun = (un.includes('ModularPistol') || un.includes('ModularPrimary')) && !un.includes('Vandal') && !un.includes('Wraith') && !un.includes('Prisma');
    const isZaw = un.includes('ModularMelee') && !un.includes('Vandal') && !un.includes('Wraith') && !un.includes('Prisma');

    if (isKitgun) {
      // Only include finished assemblies or Chambers (mastery-providing parts)
      if (!un.endsWith('Part') || un.includes('/Barrel/') || un.includes('/Barrels/')) {
        i.category = 'kitguns';
        kitguns.push(i);
      }
    } else if (isZaw) {
      // Only include finished assemblies or Strikes (mastery-providing parts)
      if (!un.endsWith('Part') || un.includes('/Tip/') || un.includes('/Tips/')) {
        i.category = 'zaws';
        zaws.push(i);
      }
    } else if (e.productCategory === 'LongGuns' && (e.noise || name.includes('vandal') || name.includes('wraith') || name.includes('prisma') || name.includes('prime'))) {
      i.category = 'primary';
      i.weapon_type = 'primary';
      primary.push(i);
    } else if (e.productCategory === 'Pistols' && (e.noise || name.includes('vandal') || name.includes('wraith') || name.includes('prisma') || name.includes('prime'))) {
      i.category = 'secondary';
      i.weapon_type = 'secondary';
      secondary.push(i);
    } else if (e.productCategory === 'Melee' && (e.damagePerShot || name.includes('vandal') || name.includes('wraith') || name.includes('prisma') || name.includes('prime'))) {
      i.category = 'melee';
      i.weapon_type = 'melee';
      melee.push(i);
    }
  });

  // EW is a fallback image table only: the Deimos Predasite/Vulpaphyla Antigen
  // and Mutagen parts live in ES with no icon/thumbnail, but DE's weapons export
  // carries their real StoreIcons art. resolveImage walks tables in order, so ES
  // still wins for every companion that already resolves from it.
  const companionsRaw = processCategory(ES, 'companions', [ES], [ES, EW]);
  const sentinels = [], moas = [], hounds = [], beasts = [], robotics = [];

  companionsRaw.forEach(i => {
    const un = i.unique_name;
    const entry = ES[un];

    // Note: Venari and Venari Prime have productCategory 'SpecialItems' in ES
    // but the game DOES count them toward Kavat mastery. They are explicitly
    // added to beasts via the uniqueName check below (lines 750-751).

    if (entry?.productCategory === 'Sentinels') {
      const item = { ...i, category: 'sentinels' };
      sentinels.push(item);
      robotics.push(item);
    } else if (un.includes('/Sentinels/MoaPets/')) {
      const item = { ...i, category: 'moas' };
      moas.push(item);
      robotics.push(item);
    } else if (un.includes('/Sentinels/ZanukaPets/')) {
      const item = { ...i, category: 'hounds' };
      hounds.push(item);
      robotics.push(item);
    } else if (entry?.productCategory === 'KubrowPets' || [
      '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit',
      '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit'
    ].includes(un)) {
      const beast = { ...i, category: 'beasts' };
      // Fix name order: createItem produces "CustomName (BaseName)", we want "BaseName (CustomName)"
      const parenIdx = beast.name.indexOf(' (');
      if (parenIdx > 0 && beast.name.endsWith(')')) {
        const custom = beast.name.slice(0, parenIdx);
        const base = beast.name.slice(parenIdx + 2, -1);
        beast.name = `${base} (${custom})`;
        beast.ownedCustomName = custom;
      }
      // Deimos companions (Predasites + Vulpaphylas) require gilding through Son
      // before mastery is granted - identical rule to Kitguns/Zaws.
      if (un.includes('/Friendly/Pets/CreaturePets/')) {
        const rawInst = (ownedItems[un] ?? [])[0];
        // Gilding is indicated by having a non-empty Name in Details
        const hasName = rawInst?.Details?.Name && rawInst.Details.Name.length > 0;
        if (!hasName) {
          beast.mastery_xp = 0;
          beast.mastered = false;
        }
      }
      beasts.push(beast);
    }
  });

  const companion_weapons = processCategory(EW, 'companion_weapons', [EW], [EW], (e) => e.productCategory === 'SentinelWeapons');

  const archweapons = processCategory(EW, 'archweapons', [EW], [EW], (e) => ['SpaceGuns', 'SpaceMelee'].includes(e.productCategory))
    .map(i => { i.weapon_type = EW[i.unique_name].productCategory === 'SpaceGuns' ? 'archgun' : 'archmelee'; return i; });

  const necramechs = processCategory(EWf, 'necramechs', [EWf], [EWf], (e) => e.productCategory === 'MechSuits');

  const archwings = [], kdrives = [];
  Object.entries(EWf).filter(([, e]) => e.productCategory === 'SpaceSuits').forEach(([un]) => {
    (ownedItems[un] ?? [null]).forEach(inst => archwings.push({ ...createItem(un, 'archwings', [EWf], [EWf], inst), vehicle_type: 'archwing' }));
  });
  if (raw.Hoverboards) {
    raw.Hoverboards.forEach(h => {
      const components = resolveHoverboardComponents(h, dict, EW);
      // The deck/board is the mastery-granting part - find it by path, not position,
      // since ModularParts order varies and index 0 may be an engine (e.g. Hothead).
      const deckPart = (h.ModularParts ?? []).find(p => p.includes('Deck')) ?? h.ModularParts?.[0];
      const baseName = deckPart ? resolveName(deckPart, dict, locale, EW) : 'K-Drive';
      const image = deckPart ? resolveImage(deckPart, EW) : null;
      const customName = h.ItemName || h.CustomName || h.Details?.Name;
      const ownedCustomName = (customName && !customName.startsWith('/Lotus/') && customName !== baseName) ? customName : '';
      const displayName = ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName;
      const item = createItem(deckPart || h.ItemType, 'kdrives', [EW], [EW], h);
      kdrives.push({ ...item, name: displayName, ownedCustomName, image: image || item.image, components, vehicle_type: 'kdrive' });
    });
  }

  // Supplement with unowned k-drive board types from EW
  const ownedDeckPaths = new Set(kdrives.map(k => k.unique_name));
  Object.keys(EW)
    .filter(k => k.includes('/Hoverboard/') && k.includes('Deck'))
    .forEach(deckPath => {
      if (ownedDeckPaths.has(deckPath)) return;
      const xp = xpMap[deckPath] ?? 0;
      const rank = calculateRank(xp, 'kdrives', deckPath);
      const mastery_xp = rank * 200;
      kdrives.push({
        unique_name: deckPath,
        name: resolveName(deckPath, dict, locale, EW),
        image: resolveImage(deckPath, EW),
        category: 'kdrives',
        xp, rank, mastery_xp,
        owned: xp > 0,
        mastered: mastery_xp >= 6000,
        vehicle_type: 'kdrive',
        components: [],
        ownedCustomName: '',
      });
    });

  const plexus = (raw.XPInfo ?? [])
    .filter(i => i.ItemType?.includes('/RailJack/DefaultHarness'))
    .map(i => ({ ...createItem(i.ItemType, 'plexus', [EW], [EW], i), name: 'Railjack Plexus' }));

  const landingCraftIcons = {
    DefaultShip: 'Liset',
    NoraShip: 'Nightwave',
    ZarimanShip: 'ZarimanShip',
  };
  const landing_craft = (raw.Ships ?? []).map((ship) => {
    const leaf = ship.ItemType?.split('/').pop() ?? '';
    const iconLeaf = landingCraftIcons[leaf] ?? leaf;
    const iconPath = `/Lotus/Interface/Icons/StoreIcons/PlayerShip/Ships/${iconLeaf}.png`;
    const hash = exports.ExportImages?.[iconPath]?.contentHash;
    return {
      unique_name: ship.ItemType,
      name: leaf === 'DefaultShip' ? 'Liset' : leaf === 'NoraShip' ? 'Nightwave' : leaf === 'ZarimanShip' ? 'Parallax' : nameFromPath(ship.ItemType),
      image: hash ? `asset-cache://content.warframe.com/PublicExport${iconPath}!${hash}` : `asset-cache://browse.wf${iconPath}`,
      category: 'landing_craft',
      quantity: ship.ItemCount ?? 1,
      owned: true,
    };
  });

  const intrinsics = [];
  if (raw.PlayerSkills) {
    const rjKeys = ['LPS_TACTICAL', 'LPS_PILOTING', 'LPS_ENGINEERING', 'LPS_GUNNERY', 'LPS_COMMAND'];
    const driftKeys = ['LPS_DRIFT_RIDING', 'LPS_DRIFT_COMBAT', 'LPS_DRIFT_OPPORTUNITY', 'LPS_DRIFT_ENDURANCE'];

    rjKeys.forEach(k => {
      const rank = raw.PlayerSkills[k] ?? 0;
      intrinsics.push({
        name: `Railjack ${k.replace('LPS_', '').charAt(0) + k.replace('LPS_', '').slice(1).toLowerCase()}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      });
    });

    driftKeys.forEach(k => {
      const rank = raw.PlayerSkills[k] ?? 0;
      intrinsics.push({
        name: `Drifter ${k.replace('LPS_DRIFT_', '').charAt(0) + k.replace('LPS_DRIFT_', '').slice(1).toLowerCase()}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      });
    });
  } else {
    const parseIntrinsicSet = (data, prefix) => {
      if (!data || typeof data !== 'object') return [];
      return Object.entries(data).map(([key, rank]) => ({
        name: `${prefix} ${key}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      }));
    };
    intrinsics.push(...parseIntrinsicSet(raw.PlayerIntrinsics, 'Railjack'));
    intrinsics.push(...parseIntrinsicSet(raw.ParadoxIntrinsics, 'Drifter'));
  }

  const ERegs = exports.ExportRegions ?? {};
  const missionTags = new Set((raw.Missions ?? []).map(m => m.Tag));
  const spTags = new Set((raw.Missions ?? []).filter(m => m.Tier === 1).map(m => m.Tag));

  // nodeType 0 = mission nodes, nodeType 7 = junctions (1000 XP each)
  // masteryExp field on nodeType 0 is the direct mastery XP value for that node (0 means no mastery)
  const starchartNodes = Object.entries(ERegs)
    .filter(([, v]) => v.nodeType === 0)
    .map(([tag, v]) => ({
      tag,
      name: dict[v.name] || v.name?.split('/').pop() || tag,
      system: dict[v.systemName] || v.systemName?.split('/').pop() || '',
      mastery_xp: v.masteryExp ?? 0,   // direct mastery XP for this node (0 = not a mastery node)
      played: missionTags.has(tag),
      sp_played: spTags.has(tag),
    }));

  // Junction nodes (nodeType 7) each grant 1000 mastery XP once completed
  const junctionNodes = Object.entries(ERegs)
    .filter(([, v]) => v.nodeType === 7)
    .map(([tag, v]) => ({
      tag,
      name: dict[v.name] || v.name?.split('/').pop() || tag,
      system: dict[v.systemName] || v.systemName?.split('/').pop() || '',
      mastery_xp: 1000,
      played: missionTags.has(tag),
      sp_played: spTags.has(tag),
      isJunction: true,
    }));

  // Only count mastery-eligible nodes (masteryExp > 0 for missions, always for junctions)
  const masteryMissionNodes = starchartNodes.filter(n => n.mastery_xp > 0);
  const allMasteryNodes = [...masteryMissionNodes, ...junctionNodes];

  const starchart = {
    nodes: [...starchartNodes, ...junctionNodes],  // all for display purposes
    masteryNodes: allMasteryNodes,                         // only mastery-eligible
    total: allMasteryNodes.length,
    origin: allMasteryNodes.filter(n => n.played).length,
    steel_path: allMasteryNodes.filter(n => n.sp_played).length,
    origin_xp: allMasteryNodes.filter(n => n.played).reduce((s, n) => s + n.mastery_xp, 0),
    steel_path_xp: allMasteryNodes.filter(n => n.sp_played).reduce((s, n) => s + n.mastery_xp, 0),
  };

  const ampMasteryItems = {};
  // Pass 1: build prismPath → highest-XP amp custom name map
  const prismCustomNameMap = {};
  (raw.OperatorAmps ?? []).forEach(a => {
    if (a.ItemType?.includes('DrifterPistol')) return;
    const parts = a.ModularParts ?? [];
    const barrel = parts.find(p => p.toLowerCase().includes('barrel')) ?? parts[2] ?? parts[0];
    if (!barrel) return;
    const existing = prismCustomNameMap[barrel];
    const xp = a.XP ?? 0;
    if (!existing || xp > existing.xp) {
      prismCustomNameMap[barrel] = { xp, name: a.ItemName || a.CustomName || '' };
    }
  });

  (raw.OperatorAmps ?? []).forEach(a => {
    const un = a.ItemType;
    let mKey = '';
    let mName = '';
    let prismPath = '';

    if (un?.includes('DrifterPistol')) {
      mKey = un;
      mName = 'Sirocco';
      prismPath = un;
    } else {
      const parts = a.ModularParts ?? (a.UpgradeFingerprint ? (parseFP(a.UpgradeFingerprint)?.ModularParts ?? []) : []);
      // Prism (barrel) is the part whose path contains 'barrel' (case-insensitive)
      prismPath = parts.find(p => p.toLowerCase().includes('barrel')) ?? parts[2] ?? parts[0];

      if (prismPath) {
        mKey = prismPath;
        mName = resolveName(prismPath, dict, locale, EW);
        // Training amp barrel resolves to its internal name; normalise to "Mote Amp"
        if (un?.includes('TrainingAmp')) mName = 'Mote Amp';
      } else if (un?.includes('TrainingAmp')) {
        mKey = 'mote_amp';
        mName = 'Mote Amp';
        prismPath = 'mote_amp';
      }
    }

    if (!mKey) return;

    // Prefer XPInfo (per-prism mastery XP) over the individual amp's XP
    const xp = xpMap[prismPath] ?? a.XP ?? 0;
    const rank = calculateRank(xp, 'weapons', prismPath);
    // XPInfo is DE's per-prism lifetime mastery ledger: every other item the
    // app credits with mastery has an entry there. A prism with no XPInfo
    // entry has earned no mastery, so the `?? a.XP` fallback above (the
    // assembled amp's own affinity) must not be turned into mastery points.
    // The Mote Amp is the only case in practice - it is handed out pre-built,
    // accumulates affinity on the amp instance, and never appears in XPInfo -
    // and crediting it was inflating the Mastery total by exactly 3,000.
    const mastery_xp = xpMap[prismPath] != null ? rank * 100 : 0;
    const owned = xp > 0;
    const mastered = mastery_xp >= 3000;
    const image = resolveImage(prismPath, EW) || resolveImage(un, EW, ER);
    const ownedCustomName = prismCustomNameMap[prismPath]?.name ?? '';

    if (!ampMasteryItems[mKey] || xp > (ampMasteryItems[mKey].xp ?? 0)) {
      ampMasteryItems[mKey] = {
        unique_name: mKey,
        name: ownedCustomName ? `${mName} (${ownedCustomName})` : mName,
        image, category: 'amps',
        xp, rank, mastery_xp, owned, mastered,
        ownedCustomName,
        components: resolveAmpComponents(a, dict, EW, ER),
      };
    }
  });

  // Supplement with any prisms from EW not yet seen in raw.OperatorAmps
  const siroccoPath = Object.keys(EW).find(k => k.toLowerCase().includes('drifterpistol'));
  [
    ...Object.keys(EW).filter(k => k.includes('OperatorAmplif') && k.toLowerCase().includes('barrel')),
    siroccoPath,
  ].filter(Boolean).forEach(prismPath => {
    if (ampMasteryItems[prismPath]) return; // already tracked from owned amps
    let mName = resolveName(prismPath, dict, locale, EW);
    if (prismPath.includes('SentAmpTraining')) mName = 'Mote Amp';
    if (prismPath.toLowerCase().includes('drifterpistol')) mName = 'Sirocco';
    const xp = xpMap[prismPath] ?? 0;
    const rank = calculateRank(xp, 'weapons', prismPath);
    const mastery_xp = rank * 100;
    ampMasteryItems[prismPath] = {
      unique_name: prismPath,
      name: mName,
      image: resolveImage(prismPath, EW),
      category: 'amps',
      xp, rank, mastery_xp,
      owned: xp > 0,
      mastered: mastery_xp >= 3000,
      ownedCustomName: '',
      components: [],
    };
  });

  const amps = Object.values(ampMasteryItems);

  const arcanes = [], mods = [];
  const rawUpgrades = raw.RawUpgrades ?? [];
  const upgrades = raw.Upgrades ?? [];
  // RawUpgrades is the stack-summary view (ItemCount), while Upgrades is the
  // per-instance view (ItemId/UpgradeFingerprint). When both contain an item
  // type, the raw summary is the aggregate duplicate of the detailed entries.
  // Keep raw-only types so stackable mods that have no individual records are
  // still shown.
  const detailedTypes = new Set(upgrades.map(u => u.ItemType).filter(Boolean));
  const modRecords = [
    ...upgrades,
    ...rawUpgrades.filter(u => !detailedTypes.has(u.ItemType)),
  ];
  modRecords.forEach(u => {
    const un = u.ItemType;
    if (!un || un.includes('Randomized') || un.includes('RandomMod')) return;
    // ExportModSet definitions (for example SpiderSetMod) describe a set's
    // aggregate bonuses; they are not collectible mods and have no card art.
    if (/\/Sets\/[^/]+\/[^/]+SetMod$/i.test(un)) return;

    // Skip mods that were removed from the game but still sit in inventories
    const REMOVED_MOD = new Set([
      'Swift Deth', 'Tn Cross Attack', 'Boom Stick', 'Warrior',
    ]);
    if (REMOVED_MOD.has(resolveName(un, dict, locale, EA, EM) || nameFromPath(un))) return;
    const isArcane = (un.includes('CosmeticEnhancers') && !un.includes('CosmeticEnhancers/Peculiars')) || un.includes('/Arcane/') || un.toLowerCase().includes('arcane');
    if (isArcane) {
      const arcEntry = EA[un]
      const arcFP = u.UpgradeFingerprint ? parseFP(u.UpgradeFingerprint) : null
      const arcRank = arcFP?.lvl ?? 0
      const arcRankLimit = arcEntry?.levelStats?.length ? arcEntry.levelStats.length - 1 : 5
      const arcDesc = resolveArcaneDesc(arcEntry?.levelStats, dict)
      const arcCat = detectArcaneCategory(un, resolveName(un, dict, locale, EA, EM) || nameFromPath(un))
      arcanes.push({
        unique_name: un,
        name: resolveName(un, dict, locale, EA, EM) || nameFromPath(un),
        image: resolveImage(un, EA, EM),
        category: 'Arcanes',
        arcaneType: arcCat,
        quantity: u.ItemCount ?? 1,
        rank: arcRank,
        max_rank: arcRankLimit,
        owned: true,
        rarity: (arcEntry?.rarity || '').toLowerCase(),
        icon: arcEntry?.icon ?? null,
        modFrame: 'Arcanes',
        description: arcDesc,
        levelStats: arcEntry?.levelStats ?? null,
      });
    } else {
      const mod = createItem(un, 'mods', [EM], [EM], u);
      const entry = EM[un];
      mod.rarity = entry?.rarity ?? '';
      mod.polarity = entry?.polarity ?? null;
      mod.compatName = entry?.compatName ?? null;
      mod.modFrame = detectModFrame(un, mod.rarity, mod.name);
      if (un.toLowerCase().includes('/fusers/')) mod.name = 'Legendary Fusion Core';
      const descLoctag = entry?.description ?? '';
      const rawDesc = descLoctag
        ? (descLoctag.startsWith('/Lotus/')
            ? (dict[descLoctag] || dict['/' + descLoctag] || '')
            : descLoctag)
        : '';
      mod.description = rawDesc ? rawDesc.replace(/\|[^|]+\|/g, '').replace(/\\n/g, '\n').trim() : '';
      mod.levelStats = entry?.levelStats ?? null;
      mod.category = extractModCategory(entry?.type, un, entry);
      mod.isExilus = isModExilus(un, entry);
      mod.baseDrain = entry?.baseDrain ?? null;
      mod.icon = entry?.icon ?? null;
      if (!mod.icon && exports.PeelyPixMap?.[un]) {
        mod.icon = exports.PeelyPixMap[un];
      }
      if (exports.PeelyPixNames?.[un]) {
        const ppn = exports.PeelyPixNames[un];
        const stickerPath = exports.PeelyPixMap?.[un];
        const stickerHash = stickerPath && exports.ExportImages?.[stickerPath]?.contentHash;
        mod.name = ppn.name;
        mod.description = ppn.description;
        mod.image = stickerPath
          ? stickerHash
            ? `asset-cache://content.warframe.com/PublicExport${stickerPath}!${stickerHash}`
            : `asset-cache://browse.wf${stickerPath}`
          : mod.image;
        mod._isSticker = true;
      }
      let modSet = entry?.modSet;
      if (!modSet && exports.ExportUpgradesFixed) {
        const fe = exports.ExportUpgradesFixed[un];
        if (fe?.modSet) modSet = fe.modSet;
      }
      if (!modSet) {
        const m = un.match(/\/Lotus\/Upgrades\/Mods\/Sets\/([^/]+)\//);
        if (m) modSet = `/Lotus/Upgrades/Mods/Sets/${m[1]}/${m[1]}SetMod`;
      }
      mod.modSet = modSet ?? null;
      if (!mod.description && (mod.name === 'Scan Aquatic Lifeforms' || un.includes('/LocateCreaturesMod'))) {
        mod.description = 'Reveals hotspots within 100m and applies Luminous Dye to fish within 40m.';
      }
      mods.push(mod);
    }
  });

  const canonicalUniqueName = (un) => un?.replace('/StoreItems/', '/') ?? un;

  // Build the complete Mods catalog from the export, then overlay the richer
  // owned records parsed above. This keeps unowned cards searchable while
  // preserving owned rank, quantity, forma, and fingerprint data.
  const acquisitionModsByKey = new Map();
  for (const item of exports.AcquisitionItems ?? []) {
    const un = item?.uniqueName;
    if (!un || (!un.includes('/Upgrades/Mods/') && !un.includes('AugmentCard'))) continue;
    if (!item.wikiAvailable && !(item.drops?.length > 0)) continue;
    acquisitionModsByKey.set(canonicalUniqueName(un), item);
  }
  const ownedModsByKey = new Map();
  for (const mod of mods) {
    const key = canonicalUniqueName(mod.unique_name);
    const previous = ownedModsByKey.get(key);
    if (!previous || (mod.quantity ?? 0) > (previous.quantity ?? 0) || (mod.rank ?? 0) > (previous.rank ?? 0)) {
      ownedModsByKey.set(key, mod);
    }
  }
  const modsByName = new Map();
  for (const [un, entry] of Object.entries(EM)) {
    if (!un || un.includes('Randomized') || un.includes('RandomMod')) continue;
    if (/\/Sets\/[^/]+\/[^/]+SetMod$/i.test(un)) continue;
    // Stickers are catalogued separately as Peely Pix. Do not duplicate them
    // in the Mods catalog where they render with a mod frame.
    if (exports.PeelyPixNames?.[un]) continue;
    const isArcane = (un.includes('CosmeticEnhancers') && !un.includes('CosmeticEnhancers/Peculiars')) || un.includes('/Arcane/') || un.toLowerCase().includes('arcane');
    if (isArcane) continue;
    const owned = ownedModsByKey.get(canonicalUniqueName(un));
    // DE's export retains hidden, unreleased, and removed mod definitions so
    // old clients can decode them. They are not obtainable catalog items and
    // must not appear as unowned cards with a fake Wiki fallback. Keep owned
    // copies visible so inventory data is never silently discarded.
    const UNOBTAINABLE_UNOWNED_MODS = new Set([
      '/Lotus/Powersuits/Banshee/SonarPvPAugmentCard',
      '/Lotus/Upgrades/Mods/Sentinel/Kubrow/ChargerFinisherMod',
      '/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponCritChanceModExpert',
      '/Lotus/Upgrades/Mods/Rifle/Expert/SniperReloadDamageModExpert',
      '/Lotus/Upgrades/Mods/Archwing/Rifle/Expert/ArchwingWeaponElectricityDamageModExpert',
      '/Lotus/Upgrades/Mods/Warframe/Expert/AvatarShieldRechargeRateModExpert',
      '/Lotus/Upgrades/Mods/Syndicate/BallisticaMod',
    ]);
    const isEmptyArtifactPlaceholder = entry?.name === '/Lotus/Language/Items/EmptyArtifact' && entry?.excludeFromCodex === true;
    // DE keeps legacy Conclave/K-Drive definitions in the export so old
    // inventory records can still be decoded, but explicitly marks them as
    // outside the Codex. Do not manufacture unowned catalog cards for any
    // such definition; preserve a card only when the player actually owns it.
    if (!owned && (entry?.excludeFromCodex === true || UNOBTAINABLE_UNOWNED_MODS.has(canonicalUniqueName(un)) || isEmptyArtifactPlaceholder)) continue;
    // The acquisition dataset is for enrichment (how-to-get info) below)
    // only - it must never gate whether a mod appears in the browsable
    // catalog at all. Its coverage is thin for whole categories (Stance,
    // Exilus, etc.), and gating on it silently dropped every unowned mod
    // in those categories from the list entirely.
    const acquisition = acquisitionModsByKey.get(canonicalUniqueName(un));
    const mod = owned ? { ...owned } : createItem(un, 'mods', [EM], [EM]);
    const name = mod.name || nameFromPath(un);
    if (!name || name.startsWith('/Lotus/')) {
      if (!owned) continue;
    }
    mod.rarity = entry?.rarity ?? mod.rarity ?? '';
    mod.polarity = entry?.polarity ?? mod.polarity ?? null;
    mod.compatName = entry?.compatName ?? mod.compatName ?? null;
    mod.modFrame = mod.modFrame || detectModFrame(un, mod.rarity, name);
    if (un.toLowerCase().includes('/fusers/')) mod.name = 'Legendary Fusion Core';
    const descLoctag = entry?.description ?? '';
    const rawDesc = descLoctag
      ? (descLoctag.startsWith('/Lotus/')
          ? (dict[descLoctag] || dict['/' + descLoctag] || '')
          : descLoctag)
      : '';
    if (!mod.description) mod.description = rawDesc ? rawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').replace(/\\n/g, '\n').trim() : '';
    mod.levelStats = entry?.levelStats ?? mod.levelStats ?? null;
    mod.category = extractModCategory(entry?.type, un, entry) || mod.category || 'mods';
    mod.isExilus = isModExilus(un, entry) || mod.isExilus || false;
    mod.baseDrain = entry?.baseDrain ?? mod.baseDrain ?? null;
    mod.icon = entry?.icon ?? mod.icon ?? null;
    if (!mod.image) mod.image = resolveImage(un, EM);
    mod.owned = !!owned;
    mod.quantity = owned?.quantity ?? 0;
    mod.unique_name = un;
    if (exports.PeelyPixNames?.[un]) {
      const ppn = exports.PeelyPixNames[un];
      const stickerPath = exports.PeelyPixMap?.[un];
      const stickerHash = stickerPath && exports.ExportImages?.[stickerPath]?.contentHash;
      mod.name = ppn.name;
      mod.description = ppn.description;
      mod.image = stickerPath
        ? stickerHash
          ? `asset-cache://content.warframe.com/PublicExport${stickerPath}!${stickerHash}`
          : `asset-cache://browse.wf${stickerPath}`
        : mod.image;
      mod._isSticker = true;
    }
    mod._acquisitionWikiAvailable = acquisition?.wikiAvailable === true;
    const nameKey = mod.name?.trim().toLowerCase();
    if (!nameKey) {
      if (owned) modsByName.set(canonicalUniqueName(un), mod);
      continue;
    }
    const existing = modsByName.get(nameKey);
    const shouldReplace = !existing ||
      (!existing.owned && mod.owned) ||
      (!existing.image && mod.image) ||
      (!existing._acquisitionWikiAvailable && mod._acquisitionWikiAvailable);
    if (shouldReplace) modsByName.set(nameKey, mod);
  }
  for (const [key, mod] of ownedModsByKey) {
    const nameKey = mod.name?.trim().toLowerCase();
    if (!nameKey) continue;
    const existing = modsByName.get(nameKey);
    if (!existing || !existing.owned || (!existing.image && mod.image)) {
      modsByName.set(nameKey, { ...mod, owned: true });
    }
  }
  const mods_catalog = Array.from(modsByName.values());

  const ownedArcaneMap = new Map();
  const ownedArcaneNameMap = new Map();
  for (const arcane of arcanes) {
    const key = canonicalUniqueName(arcane.unique_name);
    const current = ownedArcaneMap.get(key) ?? { quantity: 0, rank: 0 };
    current.quantity += arcane.quantity ?? 1;
    current.rank = Math.max(current.rank, arcane.rank ?? 0);
    ownedArcaneMap.set(key, current);
    const nameKey = arcane.name?.toLowerCase();
    if (nameKey) {
      const named = ownedArcaneNameMap.get(nameKey) ?? { quantity: 0, rank: 0 };
      named.quantity += arcane.quantity ?? 1;
      named.rank = Math.max(named.rank, arcane.rank ?? 0);
      ownedArcaneNameMap.set(nameKey, named);
    }
  }
  const acquisitionArcaneNames = new Set(
    (exports.AcquisitionItems ?? [])
      .filter(item => item?.uniqueName?.includes('/Upgrades/CosmeticEnhancers/'))
      .map(item => item.name?.trim().toLowerCase())
      .filter(Boolean)
  );
  // The checked-in acquisition catalog can lag the live DE export. These
  // current Arcanes are present in ExportArcanes but absent from that older
  // catalog, so retain them without reopening the known phantom entries.
  for (const name of ['secondary cryogenic', 'pax soar']) {
    acquisitionArcaneNames.add(name);
  }
  const arcanesByName = new Map();
  for (const [un, entry] of Object.entries(EAOrig)) {
    const name = resolveName(un, dict, locale, EAOrig, EA, EM) || nameFromPath(un);
    const nameKey = name.toLowerCase();
    const owned = ownedArcaneMap.get(canonicalUniqueName(un))
      ?? ownedArcaneNameMap.get(nameKey)
      ?? { quantity: 0, rank: 0 };
    // ExportArcanes includes internal/retired entries. The acquisition catalog
    // is the maintained in-game allowlist; preserve an owned item even if it
    // is not present there so ownership is never silently lost.
    if (acquisitionArcaneNames.size && !acquisitionArcaneNames.has(nameKey) && !owned.quantity) continue;
    // Listener/helper entries such as Steadfast's four ability listeners have
    // no level data and are not standalone Arcanes.
    if (!entry?.levelStats?.length && !owned.quantity) continue;
    const candidate = {
      unique_name: un,
      name,
      image: resolveImage(un, EAOrig, EA, EM),
      category: 'Arcanes',
      arcaneType: detectArcaneCategory(un, name),
      quantity: owned.quantity,
      rank: owned.rank,
      max_rank: entry?.levelStats?.length ? entry.levelStats.length - 1 : 5,
      owned: owned.quantity > 0,
      rarity: (entry?.rarity || '').toLowerCase(),
      icon: entry?.icon ?? null,
      modFrame: 'Arcanes',
      description: resolveArcaneDesc(entry?.levelStats, dict),
      levelStats: entry?.levelStats ?? null,
    };
    const existing = arcanesByName.get(nameKey);
    if (!existing || (!existing.owned && candidate.owned) || (!existing.description && candidate.description)) {
      arcanesByName.set(nameKey, candidate);
    }
  }
  const arcanes_catalog = Array.from(arcanesByName.values());

  const ownedPeelyMap = new Map(mods.filter(m => m._isSticker).map(m => [m.unique_name, m]));
  const peely_pix = Object.entries(exports.PeelyPixNames ?? {}).map(([un, data]) => {
    const owned = ownedPeelyMap.get(un);
    const stickerPath = exports.PeelyPixMap?.[un];
    const stickerHash = stickerPath && exports.ExportImages?.[stickerPath]?.contentHash;
    return {
      unique_name: un,
      name: data.name,
      description: data.description,
      image: stickerPath
        ? stickerHash
          ? `asset-cache://content.warframe.com/PublicExport${stickerPath}!${stickerHash}`
          : `asset-cache://browse.wf${stickerPath}`
        : owned?.image ?? null,
      category: 'peely_pix',
      quantity: owned?.quantity ?? 0,
      owned: !!owned,
      _isSticker: true,
    };
  });

  const canonicalConsumableName = (un) => canonicalUniqueName(un
    ?.replace('GuildGlyphConsumableNoCharges', 'GlyphConsumable')
    ?.replace('GlyphConsumableNoCharges', 'GlyphConsumable'));
  const consumables = (raw.Consumables ?? []).map(c => {
    const cUn = c.ItemType;
    // Guild glyph consumables share the regular glyph prism export entry
    // (inventory paths carry a "Guild" prefix the export table lacks)
    const lookupUn = canonicalConsumableName(cUn);
    const cEntry = EGear[lookupUn];
    const cDescLoctag = cEntry?.description ?? '';
    const cRawDesc = cDescLoctag ? (dict[cDescLoctag] || dict['/' + cDescLoctag] || '') : '';
    const cDescription = cRawDesc ? cRawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';
    return {
      unique_name: cUn,
      name: resolveName(lookupUn, dict, locale, EGear, ER, ERecipe) || nameFromPath(cUn),
      description: cDescription,
      image: resolveImage(lookupUn, EGear, ER, ERecipe),
      category: 'consumables',
      quantity: c.ItemCount ?? 1,
      owned: true
    };
  });

  const ownedConsumableMap = new Map(consumables.map(item => [canonicalConsumableName(item.unique_name), item]));
  // A crafted consumable is considered owned when its blueprint is owned, even
  // if the crafted item itself is not currently in the inventory. This is how
  // the Foundry represents items such as the Nightfall Apothic.
  for (const recipe of raw.Recipes ?? []) {
    const recipeKey = canonicalUniqueName(recipe.ItemType);
    const recipeEntry = ERecipe[recipeKey] ?? ERecipe[recipe.ItemType];
    const resultType = recipeEntry?.resultType;
    if (!resultType || !EGearOrig[resultType]) continue;
    const existing = ownedConsumableMap.get(canonicalUniqueName(resultType));
    ownedConsumableMap.set(canonicalUniqueName(resultType), {
      ...(existing ?? {}),
      unique_name: resultType,
      quantity: (existing?.quantity ?? 0) + (recipe.ItemCount ?? 1),
      owned: true,
      blueprintOwned: true,
    });
  }
  const consumablesByName = new Map();
  for (const [un, entry] of Object.entries(EGearOrig)) {
    const owned = ownedConsumableMap.get(canonicalConsumableName(un));
    const name = resolveName(un, dict, locale, EGearOrig, EGear, ER, ERecipe) || nameFromPath(un);
    const descLoctag = entry?.description ?? '';
    const description = descLoctag.startsWith('/Lotus/')
      ? (dict[descLoctag] || dict['/' + descLoctag] || '')
      : descLoctag;
    // Omni is auto-granted on Archwing quest completion and never appears in
    // raw.Consumables (it's not purchased/crafted with charges like normal
    // gear) - the normal ownership check above would show it as permanently
    // "Unowned" for every player regardless of quest state. Its real
    // ownership signal is the account-wide ArchwingEnabled flag.
    const isOmni = un === '/Lotus/Types/Restoratives/Consumable/RepairTool';
    const reallyOwned = isOmni ? (!!owned || raw.ArchwingEnabled === true) : !!owned;
    const candidate = {
      unique_name: un,
      name,
      description: description.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim(),
      image: resolveImage(un, EGearOrig, EGear, ER, ERecipe),
      category: 'consumables',
      quantity: owned?.quantity ?? (reallyOwned ? 1 : 0),
      owned: reallyOwned,
      blueprintOwned: !!owned?.blueprintOwned,
    };
    const nameKey = name.toLowerCase();
    const existing = consumablesByName.get(nameKey);
    if (!existing || (!existing.owned && candidate.owned) || (existing.unique_name.endsWith('NoCharges') && !candidate.unique_name.endsWith('NoCharges'))) {
      consumablesByName.set(nameKey, candidate);
    }
  }
  const consumables_catalog = Array.from(consumablesByName.values());

  const landingCraftCatalog = [
    [['DefaultShip', 'LisetShip', 'Liset'], 'Liset', 'Liset'],
    [['ScimitarShip', 'BlueSkyShip', 'Scimitar'], 'Scimitar', 'Scimitar'],
    [['MantisShip', 'MantysShip', 'InsectShip', 'Mantis'], 'Mantis', 'Mantis'],
    [['XiphosShip', 'GyroscopeShip', 'Gyroscope', 'Xiphos'], 'Xiphos', 'Xiphos'],
    [['ZarimanShip', 'ParallaxShip', 'Parallax'], 'Parallax', 'ZarimanShip'],
    [['GrineerShip', 'SkautShip', 'Skaut'], 'Skaut', 'GrineerShip'],
    [['NoraShip', 'NightwaveShip', 'Nightwave'], 'Nightwave', 'Nightwave'],
  ];
  const rawShips = raw.Ships ?? [];
  const landing_craft_catalog = landingCraftCatalog.map(([aliases, name, iconLeaf]) => {
    const owned = rawShips.find(ship => {
      const leaf = ship.ItemType?.split('/').pop();
      return aliases.includes(leaf) || aliases.some(a => ship.ItemType?.includes(a));
    });
    const un = owned?.ItemType ?? `/Lotus/Types/Items/Ships/${aliases[0]}`;
    const iconPath = `/Lotus/Interface/Icons/StoreIcons/PlayerShip/Ships/${iconLeaf}.png`;
    const hash = exports.ExportImages?.[iconPath]?.contentHash;
    return {
      unique_name: un,
      name,
      image: hash ? `asset-cache://content.warframe.com/PublicExport${iconPath}!${hash}` : `asset-cache://browse.wf${iconPath}`,
      category: 'landing_craft',
      quantity: owned ? 1 : 0,
      owned: !!owned,
    };
  });

  const resources = [], components = [], songItems = [], prime_parts = [], primeSets = {};

  // Build owned items map for quick lookup (for prime sets)
  const primeItemCounts = new Map();
  for (const item of (raw.MiscItems ?? [])) {
    const un = item.ItemType ?? '';
    if (un.includes('/Projections/') || un.includes('/Upgrades/Relic/')) continue;
    primeItemCounts.set(un, item.ItemCount ?? 1);
  }
  for (const item of (raw.Recipes ?? [])) {
    const un = item.ItemType ?? '';
    primeItemCounts.set(un, item.ItemCount ?? 1);
  }

  // Find all prime weapon/warframe recipes and build sets
  const seenPrimeSets = new Set();
  for (const [bpKey, recipe] of Object.entries(ERecipe ?? {})) {
    if (!recipe?.resultType) continue;
    const resultName = resolveName(recipe.resultType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);

    // Check if this is a prime item (but not a component blueprint)
    if (!/Prime$/i.test(resultName)) continue;
    if (bpKey.includes('HelmetBlueprint') || bpKey.includes('ChassisBlueprint') ||
      bpKey.includes('SystemsBlueprint') || bpKey.includes('HarnessBlueprint') ||
      bpKey.includes('WingsBlueprint') || bpKey.includes('BarrelBlueprint') ||
      bpKey.includes('ReceiverBlueprint') || bpKey.includes('StockBlueprint') ||
      bpKey.includes('BladeBlueprint') || bpKey.includes('HandleBlueprint') ||
      bpKey.includes('LinkBlueprint') || bpKey.includes('NeuropticsBlueprint') ||
      bpKey.includes('CarapaceBlueprint') || bpKey.includes('CerebrumBlueprint')) continue;

    const baseName = resultName;
    if (seenPrimeSets.has(baseName)) continue;
    seenPrimeSets.add(baseName);

    const setParts = [];
    let ownedCount = 0;
    let totalCount = 0;

    // Use the result item's image (parent item) not a component's image
    const parentImage = resolveImage(recipe.resultType, EW, EWf, ER, ES);

    // Add the main item blueprint (always include, even if not owned)
    const bpQty = primeItemCounts.get(bpKey) ?? 0;
    setParts.push({ unique_name: bpKey, name: resultName + (BLUEPRINT_SUFFIX[locale] ?? ' Blueprint'), image: parentImage, quantity: bpQty, owned: bpQty > 0, isBlueprint: true, ducats: ERecipe?.[bpKey]?.primeSellingPrice || ER?.[bpKey]?.primeSellingPrice || 0 });
    if (bpQty > 0) ownedCount += bpQty;
    totalCount += 1;

    // Add prime components from recipe ingredients (exclude resources like orokin cells).
    // PRIME_PART_PATH_RE is module-scoped (see top of file).
    const isPrimeComponent = (itemType) => PRIME_PART_PATH_RE.test(itemType.split('/').pop());
    const ingredientMap = new Map();
    for (const ing of (recipe.ingredients ?? [])) {
      const ingName = resolveName(ing.ItemType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);
      if (!isPrimeComponent(ing.ItemType)) continue;
      const key = ing.ItemType;
      if (ingredientMap.has(key)) {
        ingredientMap.get(key).need += ing.ItemCount ?? 1;
      } else {
        ingredientMap.set(key, { ItemType: key, name: ingName, image: resolveImage(key, EW, ER, ERel), need: ing.ItemCount ?? 1 });
      }
    }
    for (const [, data] of ingredientMap) {
      let craftedQty = 0, bpQty = 0;
      if (data.ItemType.includes('Component')) {
        const bpKey = data.ItemType.replace('Component', 'Blueprint');
        craftedQty = primeItemCounts.get(data.ItemType) ?? 0;
        bpQty = primeItemCounts.get(bpKey) ?? 0;
        if (bpQty === 0) {
          const leaf = bpKey.split('/').pop();
          for (const [key, count] of primeItemCounts) {
            if (key.endsWith('/' + leaf)) { bpQty = count; break; }
          }
        }
        setParts.push({ unique_name: data.ItemType, name: data.name, image: data.image, quantity: bpQty, crafted: craftedQty, owned: bpQty > 0 || craftedQty > 0, need: data.need, ducats: ERecipe[data.ItemType]?.primeSellingPrice || ER[data.ItemType]?.primeSellingPrice || EW[data.ItemType]?.primeSellingPrice || 0 });
        if (bpQty > 0 || craftedQty > 0) ownedCount += 1;
      } else {
        bpQty = primeItemCounts.get(data.ItemType) ?? 0;
        setParts.push({ unique_name: data.ItemType, name: data.name, image: data.image, quantity: bpQty, owned: bpQty > 0, need: data.need, ducats: ERecipe[data.ItemType]?.primeSellingPrice || ER[data.ItemType]?.primeSellingPrice || EW[data.ItemType]?.primeSellingPrice || 0 });
        if (bpQty > 0) ownedCount += 1;
      }
      totalCount += 1;
    }

    if (setParts.length > 0) {
      const quantityOwned = setParts.reduce((sum, p) => sum + (p.quantity || 0) + (p.crafted || 0), 0);
      const ownedPartTypes = ownedCount;
      const isBaseMastered = (
        warframes.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        primary.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        secondary.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        melee.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        sentinels.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        beasts.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        archwings.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        archweapons.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        necramechs.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered) ||
        amps.some(w => (w.name === baseName || w.name === baseName + " Prime") && w.mastered)
      );

      primeSets[baseName] = {
        name: baseName,
        parts: setParts,
        ownedCount: ownedPartTypes,
        ownedPartTypes,
        quantityOwned,
        totalCount,
        image: parentImage,
        setPath: recipe.resultType,
        mastered: isBaseMastered
      };
      // Also add individual parts to prime_parts array with parent mastery status
      setParts.forEach(p => {
        if (p.owned) prime_parts.push({ ...p, setName: baseName, category: 'prime_parts', mastered: isBaseMastered });
      });
    }
  }

  // Add non-prime resources
  for (const item of (raw.MiscItems ?? [])) {
    const un = item.ItemType ?? '';
    // Ayatan Stars (OroFusexOrnament*) get a dedicated dashboard widget
    // (inventoryData.amberStarCount/cyanStarCount in Inventory.jsx) but must
    // still be indexed here too - they're also real relic rewards, and
    // skipping them here left relic-ownership matching (getPartObtainedStatus)
    // unable to ever find them, showing owned stars as permanently missing.
    if (un.includes('/Projections/') || un.includes('/Upgrades/Relic/')) continue;
    // Hidden resource — user requested it be excluded (Tethra Data Fragments)
    if (un === '/Lotus/Types/Items/SyndicateDogTags/MuseumDogTag') continue;
    // Somachord track unlocks (e.g. Crash Course, Core Containment) are music
    // collectibles, not crafting resources — some even share their display
    // name with an unrelated real mod (Crash Course is also an Eidolon Teralyst
    // rifle mod drop). The classic scan-based tracks (/MusicFragments/) are
    // tracked via LoreFragmentScans/codex in Collectibles.jsx, but these newer
    // /SongItems/ tracks (Caliber Chicks, Onlyne, etc.) are granted as owned
    // MiscItems instead and have no ExportCodex entry at all — route them to
    // their own list so Collectibles.jsx can still surface them, instead of
    // silently dropping them.
    const name = resolveName(un, dict, locale, ER, ERel, EW, ES);
    if (un.startsWith('/Lotus/Types/Items/SongItems/')) {
      const songEntry = ER[un];
      const songDescLoctag = songEntry?.description ?? '';
      const songRawDesc = songDescLoctag ? (dict[songDescLoctag] || dict['/' + songDescLoctag] || '') : '';
      songItems.push({
        unique_name: un,
        name,
        description: songRawDesc ? songRawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '',
        image: resolveImage(un, ER),
        category: 'songItems',
        quantity: item.ItemCount ?? 1,
        owned: true
      });
      continue;
    }
    // Prime parts are shown in the prime-sets tab, not as resources. Match the
    // ItemType path (always English) — localized names like "Afuris Prime: Lauf"
    // don't contain the English component words.
    const isPrimePart = PRIME_PART_PATH_RE.test(un.split('/').pop());
    if (!isPrimePart) {
      const entry = ER[un];
      const resDescLoctag = entry?.description ?? '';
      const resRawDesc = resDescLoctag ? (dict[resDescLoctag] || dict['/' + resDescLoctag] || '') : '';
      const resDescription = resRawDesc ? resRawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';
      // Raw Amp/Zaw/Kitgun crafting pieces (grips, chassis, barrels, handles,
      // tips, clips, balance parts) live in MiscItems alongside real resources
      // but are weapon-building components, not resources - the `amps` array
      // above only tracks assembled/mastery-bearing amps, not spare unbuilt
      // parts, so these have no other home. Same story for non-Head MOA/Hound
      // parts (legs, engine, chassis) - only Head parts get their own
      // mastery-tracked array below; Head paths never appear in raw MiscItems
      // (they're tracked via XPInfo instead), so excluding them here is a
      // safety check against ever double-listing a head, not a live case.
      // Route all of these to their own category instead of mislabeling them,
      // matching the same real ownership data (and picking up their real
      // per-part image via the same ER/ERel/EW/ES lookup used for resources).
      const isPetComponent = (un.includes('/MoaPetParts/') || un.includes('/ZanukaPetParts/')) && !un.includes('Head');
      const isModularComponent = un.includes('/OperatorAmplifiers/') || un.includes('/ModularMelee') || un.includes('ModularSecondary') || isPetComponent;
      const obj = { unique_name: un, name, description: resDescription, image: resolveImage(un, ER, ERel, EW, ES), category: isModularComponent ? 'components' : 'resources', quantity: item.ItemCount ?? 1, owned: true };
      (isModularComponent ? components : resources).push(obj);
    }
  }

  // Several real, findable resource categories only showed up in Resources
  // when owned - an unowned one was completely absent, with no way to even
  // discover it exists or where to find it. Unlike the rest of MiscItems
  // (thousands of entries, many decorative/one-off), DE's own `parentName`
  // field cleanly identifies these specific real catalogs, so it's safe to
  // list every item in each one with an owned/unowned status, the same way
  // Relics.jsx shows the full relic catalog rather than only owned relics.
  // Deliberately NOT filtering by `excludeFromCodex` - spot-checking it
  // showed real, legitimate items (Kavat Genetic Code, Höllvania apartment
  // decorations) carry that flag too, so it's not a safe "hide this" signal.
  const FULL_CATALOG_RESOURCE_PARENTS = new Set([
    '/Lotus/Types/Items/Fish/FishItem',
    '/Lotus/Types/Items/Fish/FishPartItem',
    '/Lotus/Types/Items/MiscItems/ResourceItem',
    '/Lotus/Types/Items/Gems/GemItem',
    '/Lotus/Types/Items/MiscItems/IncarnonAdapters/BaseIncarnonUnlocker',
    '/Lotus/Types/Gameplay/Duviri/Resource/DuviriBaseResourceItem',
    '/Lotus/Types/Items/RailjackMiscItems/BaseRailjackItem',
    '/Lotus/Types/Items/Plants/MiscItems/PlantItem',
    '/Lotus/Types/Items/MiscItems/FocusLens',
  ]);
  const ownedResourceUns = new Set(resources.map((r) => r.unique_name));
  for (const [un, entry] of Object.entries(ER)) {
    if (!FULL_CATALOG_RESOURCE_PARENTS.has(entry?.parentName)) continue;
    if (ownedResourceUns.has(un)) continue;
    const name = resolveName(un, dict, locale, ER, ERel, EW, ES);
    const resDescLoctag = entry?.description ?? '';
    const resRawDesc = resDescLoctag ? (dict[resDescLoctag] || dict['/' + resDescLoctag] || '') : '';
    const resDescription = resRawDesc ? resRawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';
    resources.push({ unique_name: un, name, description: resDescription, image: resolveImage(un, ER, ERel, EW, ES), category: 'resources', quantity: 0, owned: false });
  }

  const resolveRelicRewards = (entry, dict, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe, ERew) => {
    if (!entry) return [];
    const mapReward = (r) => {
      const un = r.type || r.rewardItem;
      const norm = un ? un.replace('/StoreItems/', '/') : un;
      const recipe = ERecipe[norm] || ERecipe[un];
      const itemData = ER[norm] || ER[un] || EW[norm] || EW[un] || EWf[norm] || EWf[un];

      return {
        uniqueName: un,
        name: resolveName(un, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe),
        rarity: r.rarity,
        tier: r.rarity === 'COMMON' ? 0 : (r.rarity === 'UNCOMMON' ? 1 : 2),
        ducats: recipe?.primeSellingPrice || itemData?.primeSellingPrice || 0,
        // Same convention as getAllRelicRewards/getRelicRewards in relicParser.js.
        // Relic pools also carry non-Prime loot (Kuva, Riven Fragments, Exilus
        // Adapter blueprints, cosmetic Fusion Treasures) that must not count
        // toward a "missing Prime parts" metric.
        isPrimePart: norm ? norm.includes('Prime') : false,
      };
    };

    if (entry.rewardManifest && ERew[entry.rewardManifest]) {
      const manifest = ERew[entry.rewardManifest];
      const rewardList = Array.isArray(manifest[0]) ? manifest[0] : (Array.isArray(manifest) ? manifest : []);
      return rewardList.map(mapReward);
    } else if (Array.isArray(entry.relicRewards)) {
      return entry.relicRewards.map(mapReward);
    }
    return [];
  };

  // ── Relics ──────────────────────────────────────────────────────────────────
  const relicGroups = {};
  const relicInventoryItems = Object.values(raw).flatMap((value) => Array.isArray(value) ? value : [])
    .filter((item) => /\/Projections\/|\/Upgrades\/Relic\/|T5VoidProjection/i.test(item.ItemType || ''));
  relicInventoryItems.forEach(item => {
    const un = item.ItemType;
    if (!un) return;
    const normalizedUn = un.replace('/StoreItems/', '/');
    const entry = ERel[un] || ERel[normalizedUn];

    // Determine refinement level
    const qualityMap = { 'VPQ_BRONZE': 'Intact', 'VPQ_SILVER': 'Exceptional', 'VPQ_GOLD': 'Flawless', 'VPQ_PLATINUM': 'Radiant' };
    const leafQualityMap = { 'Silver': 'Exceptional', 'Gold': 'Flawless', 'Platinum': 'Radiant' };
    let refinement = 'Intact';
    if (entry?.quality && qualityMap[entry.quality]) refinement = qualityMap[entry.quality];
    else {
      const leaf = un.split('/').at(-1) ?? un;
      for (const [rawQ, cleanQ] of Object.entries(leafQualityMap)) {
        if (leaf.endsWith(rawQ)) { refinement = cleanQ; break; }
      }
    }

    // Get base name (stripping quality suffix)
    const fullName = relicNameFromPath(un, ERel);
    const era = fullName.split(' ')[0] ?? 'Other';
    const baseName = (fullName || 'Unknown Relic').replace(/\s\((Intact|Exceptional|Flawless|Radiant)\)$/, '').trim();
    const relicId = baseName;

    if (!relicGroups[relicId]) {
      const relDescLoctag = entry?.description ?? '';
      const relRawDesc = relDescLoctag ? (dict[relDescLoctag] || dict['/' + relDescLoctag] || '') : '';
      const relDescription = relRawDesc ? relRawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';
      relicGroups[relicId] = {
        unique_name: relicId,
        // Multiple refinement qualities of the same relic get merged into one
        // row here (unique_name above is a synthetic display key like "Meso
        // N17", not a real DE path), but acquisition lookups need a genuine
        // path to resolve vaulted status and drop sources - real_unique_name
        // carries that through. Prefer the Intact/Bronze variant since that's
        // the canonical form other acquisition data is keyed against.
        real_unique_name: un,
        name: baseName,
        era,
        description: relDescription,
        image: resolveImage(un, ERel),
        category: 'relics',
        refinements: { Intact: 0, Exceptional: 0, Flawless: 0, Radiant: 0 },
        rewards: resolveRelicRewards(entry, dict, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe, ERew),
        owned: true
      };
    } else {
      if (refinement === 'Intact') relicGroups[relicId].real_unique_name = un;
      if (relicGroups[relicId].rewards.length === 0) {
        // A previous refinement variant already created the group but had no entry;
        // try to fill in the rewards now that we have one.
        const rewards = resolveRelicRewards(entry, dict, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe, ERew);
        if (rewards.length > 0) relicGroups[relicId].rewards = rewards;
      }
    }

    if (relicGroups[relicId].refinements[refinement] !== undefined) {
      relicGroups[relicId].refinements[refinement] += (item.ItemCount ?? 1);
    }
  });
  const relics = Object.values(relicGroups);

  const rivens = [
    ...(raw.RawUpgrades ?? []).filter(u => u.ItemType?.includes('Randomized') || u.ItemType?.includes('RandomMod')).map(u => ({
      unique_name: u.ItemType, image: null, category: 'rivens', weapon_type: rivenWeaponType(u.ItemType),
      name: `Veiled ${splitPascal(rivenWeaponType(u.ItemType)).replace(/^\w/, c => c.toUpperCase())} Riven`, veiled: true, owned: true, quantity: u.ItemCount ?? 1
    })),
    ...(raw.Upgrades ?? []).filter(u => u.ItemType?.includes('Randomized')).map(u => {
      const fp = parseFP(u.UpgradeFingerprint);
      const weaponUn = fp.compat ?? fp.challenge?.compat ?? '';
      const weaponName = weaponUn ? resolveName(weaponUn, dict, locale, EW) : 'Unknown';
      const isChallenge = !!fp.challenge;

      let challengeText = '';
      if (isChallenge) {
        const type = fp.challenge.Type || '';
        const baseKey = type.split('/').pop();
        const locKey = `/Lotus/Language/Challenges/Challenge_${baseKey}_Description`;
        const singleLocKey = `/Lotus/Language/Challenges/Challenge_${baseKey}_Single_Description`;

        let rawText = dict[locKey] || dict[singleLocKey] || baseKey;
        challengeText = rawText.replace(/\|COUNT\|/g, fp.challenge.Required || '1');

        if (fp.challenge.Complication) {
          const compBase = fp.challenge.Complication.split('/').pop();
          const compLocKey = `/Lotus/Language/Challenges/Challenge_Complication_${compBase}`;
          const compText = dict[compLocKey] || compBase;
          challengeText += ` ${compText}`;
        }

        challengeText = challengeText.replace(/<[^>]*>/g, '').trim();
      }


      // ── Riven stat formula ── (ported from calamity-inc/warframe-riven-info/RivenParser.js)
      //
      // rivenIntToFloat: maps Value ∈ [0, 0x3FFFFFFF] → [0, 1]
      // roll: lerp(0.9, 1.1, rivenIntToFloat(Value))  ← random multiplier per stat
      //
      // Buff:
      //   base * (1.5 * dispo * 10) * pow(1.25, nCurses) * roll * numBuffsAtten[nBuffs] * (lvl+1)
      //
      // Curse:
      //   base * -1 * (1.5 * dispo * 10) * roll * numBuffsCurseAtten[nBuffs] * numBuffsAtten[nCurses] * (lvl+1)
      //
      // numBuffsAtten      = [0, 1, 0.66, 0.5, 0.4, 0.35]
      // numBuffsCurseAtten = [0, 1, 0.33, 0.5, 1.25, 1.5]

      const RIVEN_INT_MAX = 0x3FFFFFFF; // 1073741823
      const numBuffsAtten = [0, 1, 0.66000003, 0.5, 0.40000001, 0.34999999];
      const numBuffsCurseAtten = [0, 1, 0.33000001, 0.5, 1.25, 1.5];

      const rivenIntToFloat = (v) => { const f = v / RIVEN_INT_MAX; return (f >= 0 && f <= 1) ? f : 0; };
      const rivenLerp = (a, b, t) => a + (b - a) * t;

      const dispo = EW[weaponUn]?.omegaAttenuation ?? 1.0;
      const lvl = parseInt(fp.lvl ?? u.UpgradeLevel ?? 0, 10);
      const nBuffs = (fp.buffs ?? []).length;
      const nCurses = (fp.curses ?? []).length;
      const attenuation = 1.5 * dispo * 10;
      const curseAtten = Math.pow(1.25, nCurses);

      // Per-type stat data from ExportUpgrades (see rivenTagInfo above),
      // keyed by riven type (last path segment).
      const rivenTypeName = u.ItemType.split('/').pop(); // e.g. LotusRifleRandomModRare
      const rivenTagList = rivenTagInfo[rivenTypeName] ?? {};
      const getBase = (tag) => rivenTagList[tag]?.value ?? 0.01;

      const formatStat = (s, pos) => {
        const tag = s.Tag.split('/').pop();
        const roll = rivenLerp(0.9, 1.1, rivenIntToFloat(s.Value));
        const base = Math.abs(getBase(tag));

        let val;
        if (pos) {
          val = base * attenuation * curseAtten * roll
            * numBuffsAtten[Math.min(nBuffs, numBuffsAtten.length - 1)]
            * (lvl + 1);
        } else {
          val = base * attenuation * roll
            * numBuffsCurseAtten[Math.min(nBuffs, numBuffsCurseAtten.length - 1)]
            * numBuffsAtten[Math.min(nCurses, numBuffsAtten.length - 1)]
            * (lvl + 1);
        }

        // Faction damage and other special stats often have different base scales or display formats.
        // User reports Aksomati curse is -0.95 (likely a multiplier display for the curse).
        const SPECIAL_FACTOR = new Set(['WeaponFactionDamageGrineer', 'WeaponFactionDamageCorpus', 'WeaponFactionDamageInfested', 'WeaponMeleeFactionDamageGrineer', 'WeaponMeleeFactionDamageCorpus', 'WeaponMeleeFactionDamageInfested']);
        const SPECIAL_ONE_DP = new Set(['WeaponMeleeComboInitialBonusMod', 'ComboDurationMod', 'WeaponMeleeRangeIncMod']);

        let displayVal;
        let finalSign = pos ? 1 : -1;

        if (SPECIAL_FACTOR.has(tag)) {
          if (!pos) {
            // Curse format: 1.0 - penalty (e.g. 1.0 - 0.05 = 0.95 multiplier)
            displayVal = 1 - (val * 1); // val is usually 0.04-0.05
            finalSign = 1; // It's shown as a positive multiplier 0.95
          } else {
            displayVal = val * 100; // Positive faction damage is usually shown as a percentage +30%
          }
        } else if (SPECIAL_ONE_DP.has(tag)) {
          displayVal = val * 10;
        } else {
          displayVal = val * 100; // standard percentage
        }
        // English statKey first — the price model matches on English keys only.
        // Display label resolves from the game dict (DE's own strings) via the
        // export's stat locTag; falls back to the per-locale i18n rivenStats
        // table, then the English key.
        const statKey = RIVEN_STAT_MAP[s.Tag] || RIVEN_STAT_MAP[tag]
          || splitPascal(tag.replace(/^(Weapon|Avatar|Innate|Player|Mod)/g, '').replace(/Mod$/g, '').replace(/Damage$/, ' Damage').replace(/Faction/, 'Faction ').replace(/Melee/, '').trim()) || tag;
        let tagName = '';
        const statLoc = rivenTagList[tag]?.locTag;
        if (statLoc) {
          tagName = cleanStatLabel(dict[statLoc] || dict[statLoc.replace(/^\//, '')]);
        }
        if (!tagName) tagName = i18nData?.rivenStats?.[statKey] || statKey;

        const isMultiplier = SPECIAL_FACTOR.has(tag) && !pos;
        let valueStr = (displayVal * finalSign).toFixed(isMultiplier ? 2 : 1);
        if (isMultiplier) valueStr = `x ${valueStr}`;

        // 0-100% roll quality: how close this stat's raw Value landed to the
        // maximum possible roll (buffs) or minimum possible roll (curses,
        // where a "better" curse is a smaller magnitude). Used for stat-based
        // riven grading (perfectness threshold for "God Roll").
        const rollFrac = rivenIntToFloat(s.Value);
        const perfectness = Math.round((pos ? rollFrac : 1 - rollFrac) * 1000) / 10;

        return {
          tag: tagName,
          value: valueStr,
          positive: pos,
          rawTag: s.Tag,
          statKey,
          isPercent: !isMultiplier && !SPECIAL_ONE_DP.has(tag),
          perfectness
        };
      };

      const stats = [...(fp.buffs ?? []).map(b => formatStat(b, true)), ...(fp.curses ?? []).map(b => formatStat(b, false))];

      let rivenFullName = `${weaponName} Riven`;
      if (!isChallenge && (fp.buffs ?? []).length > 0) {
        const getTagEntry = (tag) => rivenTagList[tag];
        const sortedBuffs = [...(fp.buffs ?? [])].sort((a, b) => {
          if (a.Value === b.Value) {
            return (getTagEntry(a.Tag)?.value ?? 0) - (getTagEntry(b.Tag)?.value ?? 0);
          }
          return b.Value - a.Value;
        });
        let name = '';
        for (const buff of sortedBuffs) {
          const entry = getTagEntry(buff.Tag);
          if (!entry) continue;
          if (buff.Tag === sortedBuffs[sortedBuffs.length - 1].Tag) {
            name += entry.suffix ?? '';
          } else if (buff.Tag === sortedBuffs[0].Tag) {
            name += (entry.prefix ?? '').charAt(0).toUpperCase() + (entry.prefix ?? '').slice(1);
          } else {
            name += '-' + (entry.prefix ?? '');
          }
        }
        if (name) rivenFullName = `${weaponName} ${name}`;
      } else if (isChallenge) {
        rivenFullName = `${weaponName} Riven (Challenge)`;
      }

      const rivenEntry = EM[u.ItemType];

      return {
        unique_name: u.ItemType,
        item_id: u.ItemId?.$oid ?? null,
        image: resolveImage(weaponUn, EW),
        category: 'rivens',
        weapon_type: rivenWeaponType(weaponUn || u.ItemType),
        weapon_name: weaponName,
        // English weapon name for the price model (localized names like
        // "Скиайати" never match the model's English keys).
        weapon_name_en: exports.WI_Weapons?.[weaponUn]?.name || nameFromPath(weaponUn) || weaponName,
        name: rivenFullName,
        veiled: false,
        rank: parseInt(fp.lvl || u.UpgradeLevel || 0, 10),
        rerolls: fp.rerolls ?? u.RerollCount ?? 0,
        polarity: fp.pol ?? rivenEntry?.polarity ?? null,
        stats,
        perfectness: stats.length ? Math.round(stats.reduce((sum, s) => sum + s.perfectness, 0) / stats.length * 10) / 10 : 0,
        challenge: challengeText,
        owned: true,
        mr: fp.lvlReq ?? EW[weaponUn]?.masteryReq ?? 0
      };
    })
  ];

  // ── Modular mastery components ──────────────────────────────────────────────
  // ── Owned-item lookup maps for modular components ────────────────────────────
  // Kitgun: barrel path → highest-XP build's custom name
  const kitgunBarrelToCustomName = {};
  [...(raw.Pistols ?? []), ...(raw.LongGuns ?? [])].forEach(item => {
    const barrel = item.ModularParts?.[0];
    if (!barrel || (!barrel.toLowerCase().includes('barrel'))) return;
    const existing = kitgunBarrelToCustomName[barrel];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      kitgunBarrelToCustomName[barrel] = { xp, name: item.ItemName || item.CustomName || '' };
    }
  });

  // Zaw: tip path → highest-XP build's custom name
  const zawTipToCustomName = {};
  (raw.Melee ?? []).forEach(item => {
    const parts = item.ModularParts ?? [];
    const tip = parts.find(p => p.includes('/Tip') || p.includes('/Tips'));
    if (!tip) return;
    const existing = zawTipToCustomName[tip];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      zawTipToCustomName[tip] = { xp, name: item.ItemName || item.CustomName || '' };
    }
  });

  // MOA: head path → highest-XP pet's custom name
  const moaHeadToCustomName = {};
  (raw.MoaPets ?? []).forEach(item => {
    const head = (item.ModularParts ?? []).find(p => p.includes('MoaPetHead'));
    if (!head) return;
    const existing = moaHeadToCustomName[head];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      moaHeadToCustomName[head] = { xp, name: item.ItemName || item.CustomName || item.Details?.Name || '' };
    }
  });

  // Hound: head path → highest-XP pet's custom name (pets in KubrowPets with Zanuka type)
  const houndHeadToCustomName = {};
  (raw.KubrowPets ?? []).filter(p => p.ItemType?.includes('Zanuka')).forEach(item => {
    const head = (item.ModularParts ?? []).find(p => p.includes('ZanukaPetPartHead'));
    if (!head) return;
    const existing = houndHeadToCustomName[head];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      houndHeadToCustomName[head] = { xp, name: item.ItemName || item.CustomName || item.Details?.Name || '' };
    }
  });

  // Kitgun: mastery is per chamber (barrel part), not per full build
  const KITGUN_BARREL_PREFIXES = [
    '/Lotus/Weapons/SolarisUnited/Secondary/SUModularSecondarySet1/Barrel/',
    '/Lotus/Weapons/Infested/Pistols/InfKitGun/Barrels/',
  ];
  const kitgunChambers = Object.entries(EW)
    .filter(([un]) => KITGUN_BARREL_PREFIXES.some(p => un.startsWith(p)) && un.endsWith('Part'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // Kitguns are weapons (100 mastery per rank)
      const rank = calculateRank(xp, 'weapons', un);
      const mastery_xp = rank * 100;
      const ownedCustomName = kitgunBarrelToCustomName[un]?.name || '';
      const baseName = resolveName(un, dict, locale, EW);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'kitguns',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 3000,
        ownedCustomName,
      };
    });

  // Zaw: mastery is per strike (Tip part)
  const seenZawNames = new Set();
  const zawStrikes = Object.entries(EW)
    .filter(([un]) => un.includes('/Ostron/Melee/') && un.includes('/Tip') && !un.includes('PvP'))
    .map(([un]) => {
      const baseName = resolveName(un, dict, locale, EW);
      if (seenZawNames.has(baseName)) return null;
      seenZawNames.add(baseName);
      const xp = xpMap[un] ?? 0;
      // Zaws are weapons (100 mastery per rank)
      const rank = calculateRank(xp, 'weapons', un);
      const mastery_xp = rank * 100;
      const ownedCustomName = zawTipToCustomName[un]?.name || '';
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'zaws',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 3000,
        ownedCustomName,
      };
    })
    .filter(Boolean);

  // MOA: mastery is per head model
  const moaHeads = Object.entries(EW)
    .filter(([un]) => un.includes('/MoaPetParts/MoaPetHead'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // MOAs are heavy (200 mastery per rank)
      const rank = calculateRank(xp, 'moas', un);
      const mastery_xp = rank * 200;
      const ownedCustomName = moaHeadToCustomName[un]?.name || '';
      // The per-part display image (e.g. Oloro Moa's actual head art) lives in
      // the wfcd "Pets" data merged into the Sentinels/Companions table (ES),
      // not the raw Weapons export (EW) - EW alone can 404 on a real path
      // where ES actually has the asset.
      const baseName = resolveName(un, dict, locale, EW, ES);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW, ES), category: 'moas',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 6000,
        ownedCustomName,
      };
    });

  // Hound: mastery is per head model
  const houndHeads = Object.entries(EW)
    .filter(([un]) => un.includes('/ZanukaPetParts/ZanukaPetPartHead'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // Hounds are heavy (200 mastery per rank)
      const rank = calculateRank(xp, 'hounds', un);
      const mastery_xp = rank * 200;
      const ownedCustomName = houndHeadToCustomName[un]?.name || '';
      // Same reasoning as moaHeads above - the real per-part art (e.g. Bhaira/
      // Hec Hound) lives in the wfcd "Pets" data merged into ES, not EW alone.
      const baseName = resolveName(un, dict, locale, EW, ES);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW, ES), category: 'hounds',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 6000,
        ownedCustomName,
      };
    });

  // Exalted/ability weapons (Excalibur Umbra's Exalted Blade, Sevagoth's
  // Shadow Claws Prime, Chesa's claw weapon, Necramech ability weapons, etc.)
  // live in raw.SpecialItems, which was never read anywhere - these owned
  // weapons (with their own mod configs/polarity/XP) never got surfaced at
  // all. DE's own frame.exalted / sentinel.exalted / sentinel.defaultWeapon
  // fields are the authoritative weapon->parent relationship (the same
  // source acquisitionInfo.js's buildExaltedWeaponIndex uses for acquisition
  // text) - attach each owned one directly onto its parent Warframe/
  // companion card rather than listing it as a separate top-level item.
  const exaltedParentOf = {};
  for (const [parentUn, entry] of Object.entries(EWf)) {
    for (const w of (entry?.exalted || [])) {
      const key = (w || '').replace('/StoreItems/', '/');
      if (key) exaltedParentOf[key] = parentUn;
    }
  }
  for (const [parentUn, entry] of Object.entries(ES)) {
    for (const w of (entry?.exalted || [])) {
      const key = (w || '').replace('/StoreItems/', '/');
      if (key) exaltedParentOf[key] = parentUn;
    }
    if (entry?.defaultWeapon) {
      exaltedParentOf[entry.defaultWeapon.replace('/StoreItems/', '/')] = parentUn;
    }
  }
  const exaltedWeaponsByParent = {};
  for (const item of (raw.SpecialItems ?? [])) {
    const un = item.ItemType;
    if (!un) continue;
    const parentUn = exaltedParentOf[un.replace('/StoreItems/', '/')];
    if (!parentUn) continue;
    const name = resolveName(un, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);
    const image = resolveImage(un, EW, EWf, ES, ER);
    (exaltedWeaponsByParent[parentUn] ??= []).push({ unique_name: un, name, image, xp: item.XP ?? 0, owned: true });
  }
  for (const parentArray of [warframes, sentinels, moas, hounds, beasts, necramechs]) {
    for (const parent of parentArray) {
      const weapons = exaltedWeaponsByParent[parent.unique_name];
      if (weapons) parent.exaltedWeapons = weapons;
    }
  }

  const all = [...warframes, ...primary, ...secondary, ...melee, ...kitguns, ...zaws, ...sentinels, ...moas, ...hounds, ...beasts, ...archwings, ...kdrives, ...archweapons, ...necramechs, ...amps, ...arcanes, ...consumables, ...resources, ...components, ...rivens, ...prime_parts];

  const playerLevel = raw.PlayerLevel ?? 0;
  const rivenBin = raw.RandomModBin ?? { Slots: 0, Extra: 0 };

  const miscItems = raw.MiscItems ?? [];
  const voidTraces = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/VoidTearDrop')?.ItemCount ?? 0;
  const voidTracesMax = (playerLevel * 50) + 100;

  const formaCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/Forma')?.ItemCount ?? 0;
  const auraFormaCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/FormaAura')?.ItemCount ?? 0;
  const stanceFormaCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/FormaStance')?.ItemCount ?? 0;
  const umbraFormaCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/FormaUmbra')?.ItemCount ?? 0;
  const reactorCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/OrokinReactor')?.ItemCount ?? 0;
  const catalystCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/OrokinCatalyst')?.ItemCount ?? 0;

  const cyanStarCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/FusionTreasures/OroFusexOrnamentA')?.ItemCount ?? 0;
  const amberStarCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/FusionTreasures/OroFusexOrnamentB')?.ItemCount ?? 0;

  // Nightwave standing - find the current season affiliation
  let nightwaveStanding = 0
  let nightwaveTitle = 0
  const affiliations = raw.Affiliations ?? []
  for (const aff of affiliations) {
    if (aff.Tag && aff.Tag.includes('Intermission')) {
      nightwaveStanding = aff.Standing ?? 0
      nightwaveTitle = aff.Title ?? 0
      // Standing over 10000 should flip the level
      while (nightwaveStanding >= 10000) {
        nightwaveStanding -= 10000;
        nightwaveTitle += 1;
      }
      break
    }
  }

  // ── Reverse ingredient index ──
  // Maps each item's unique_name to the list of recipes that consume it as an
  // ingredient.  Used to surface a "Crafting Ingredient" badge in Inventory.jsx.
  // Shares the same filter logic as the craftable computation above.
  const neededForCrafting = {};
  Object.entries(ERecipe ?? {}).forEach(([bpKey, recipe]) => {
    if (!recipe || !recipe.resultType) return;
    // Skip Helminth abilities, quest items, and component BPs (same as craftable)
    if (bpKey.includes('AbilityOverride')) return;
    if (recipe.resultType?.includes('/Abilities/')) return;
    if (bpKey.includes('Quest')) return;
    if (bpKey.includes('HelmetBlueprint') || bpKey.includes('ChassisBlueprint') || bpKey.includes('SystemsBlueprint') || bpKey.includes('HarnessBlueprint') || bpKey.includes('WingsBlueprint')) return;
    const resultName = resolveName(recipe.resultType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);
    (recipe.ingredients ?? []).forEach(ing => {
      if (!ing.ItemType) return;
      if (!neededForCrafting[ing.ItemType]) neededForCrafting[ing.ItemType] = [];
      neededForCrafting[ing.ItemType].push({
        name: resultName,
        count: ing.ItemCount ?? 1,
      });
    });
  });
  // Annotate items in the `all` array that are needed as ingredients
  all.forEach(item => {
    const details = neededForCrafting[item.unique_name];
    if (details) {
      item.needed_for_crafting = true;
      item.crafting_details = details;
    }
  });

  const wishlist = (raw.Wishlist ?? []).map(w => {
    if (typeof w === 'string') {
      const name = resolveName(w, dict, locale, EW, EWf, ES, ER, ECust, EGear, EM, EA, EB) || nameFromPath(w);
      return { unique_name: w, name };
    }
    return null;
  }).filter(Boolean);

  return {
    account: {
      mastery_rank: playerLevel,
      credits: raw.RegularCredits ?? 0,
      platinum: raw.PremiumCredits ?? 0,
      riven_capacity: 15 + playerLevel + (rivenBin.Extra ?? 0),
      void_traces: voidTraces,
      void_traces_max: voidTracesMax,
      forma: formaCount,
      aura_forma: auraFormaCount,
      stance_forma: stanceFormaCount,
      umbra_forma: umbraFormaCount,
      orokin_reactor: reactorCount,
      orokin_catalyst: catalystCount,
      nightwave_standing: nightwaveStanding,
      nightwave_title: nightwaveTitle,
      endo: raw.FusionPoints ?? 0,
    },
    wishlist,
    Affiliations: raw.Affiliations ?? [],
    SupportedSyndicate: raw.SupportedSyndicate ?? null,
    DailyFocus: raw.DailyFocus ?? 0,
    FocusXP: raw.FocusXP ?? {},
    warframes,
    weapons: weaponsRaw, // Compatibility
    primary, secondary, melee, kitguns, zaws,
    companions: companionsRaw, // Compatibility
    sentinels, moas, hounds, beasts, robotics,
    companion_weapons,
    vehicles: [...archwings, ...kdrives], // Compatibility
    archwings, kdrives,
    archweapons, necramechs, amps, mods, mods_catalog, peely_pix, arcanes, arcanes_catalog, landing_craft, landing_craft_catalog, relics, resources, components, consumables, consumables_catalog, rivens, prime_parts, primeSets, intrinsics, starchart, plexus, all,
    kitgunChambers, zawStrikes, moaHeads, houndHeads,

    // ── Comprehensive owned-item-path set ──
    // Scans every top-level array in the raw inventory for {ItemType: ...}
    // entries, regardless of which field it's under. This exists so that
    // "do I own this DE item path" checks (Baro's offer list, future
    // collectibles/cosmetics tracking, etc.) don't depend on us having
    // explicitly parsed that specific category (Suits, Mods, FlavourItems,
    // WeaponSkins, ...) into its own named field first - anything DE returns
    // with an ItemType, known or not yet wired up, ends up in this set.
    // Does NOT replace the category-specific parsed arrays above (all,
    // mods, etc.) which carry richer per-item data (rank, name, image) -
    // this is purely for "owned: yes/no" lookups by raw unique_name.
    allOwnedItemTypes: (() => {
      const set = new Set();
      for (const value of Object.values(raw)) {
        if (!Array.isArray(value)) continue;
        for (const entry of value) {
          if (entry && typeof entry === 'object' && typeof entry.ItemType === 'string') {
            set.add(entry.ItemType);
          }
        }
      }
      return Array.from(set);
    })(),

    // ── Ayatan / Endo ──
    fusionTreasures: raw.FusionTreasures ?? [],
    amberStarCount,
    cyanStarCount,

    // ── Collectibles ──
    collectibleSeries: raw.CollectibleSeries ?? [],
    loreFragmentScans: raw.LoreFragmentScans ?? [],
    songItems,
    discoveredMarkers: raw.DiscoveredMarkers ?? [],
    customMarkers: raw.CustomMarkers ?? [],
    NemesisHistory: raw.NemesisHistory ?? [],
    periodicMissionCompletions: raw.PeriodicMissionCompletions ?? [],
    // ── Craftable Items (all recipes with ingredient checks) ──
    craftable: (() => {
      const craftableItems = [];

      // Inventory payloads and export recipe keys may differ only by the
      // StoreItems namespace. Counts used for readiness must use one identity
      // for both forms, otherwise a blueprint can appear absent (or a recipe
      // can be treated as ready without checking the real blueprint record).
      const canonicalInventoryType = (value) => value?.replace('/StoreItems/', '/') ?? value;

      // Build ingredient inventory map for quick lookup
      const resourceCounts = {};

      // Count resources from the raw inventory. Current exporter payloads put
      // ordinary resources (including Orokin Cells) in MiscItems, while older
      // payloads used Resources. Treat both as resource inventories, but keep
      // them out of ownedItemCounts below so the processed `all` list cannot
      // add a second synthetic copy.
      for (const arr of [raw.Resources, raw.MiscItems]) {
        for (const resource of (arr ?? [])) {
          if (!resource?.ItemType) continue;
          const key = canonicalInventoryType(resource.ItemType);
          resourceCounts[key] = (resourceCounts[key] ?? 0) + (resource.ItemCount ?? 1);
        }
      }

      // Get player's owned blueprints from inventory (with counts)
      // Note: raw.Recipes is included in inventoryArrays below, so we use ownedItemCounts

      // Build map of all owned items (for checking components, etc.)
      const ownedItemCounts = {};
      const inventoryArrays = [
        raw.Suits, raw.LongGuns, raw.Pistols, raw.Melee,
        raw.Sentinels, raw.KubrowPets, raw.MoaPets, raw.SentinelWeapons,
        raw.SpaceMelee, raw.SpaceGuns, raw.MechSuits, raw.OperatorAmps,
        raw.SpaceSuits, raw.Hoverboards, raw.Recipes, raw.Consumables
      ];

      for (const arr of inventoryArrays) {
        if (arr) {
          for (const item of arr) {
            const un = item.ItemType;
            if (un) {
              const key = canonicalInventoryType(un);
              ownedItemCounts[key] = (ownedItemCounts[key] ?? 0) + (item.ItemCount ?? 1);
            }
          }
        }
      }

      // Also check the processed all array, for owned items whose category
      // (e.g. modular companions) isn't backed by any raw array above. Items
      // already counted from a raw array must not be added again here, or an
      // item present in both (e.g. a Pistol) gets double-counted. This must
      // also check resourceCounts, not just ownedItemCounts: a crafted-but-
      // unassembled Prime weapon part (e.g. AfurisPrimeBarrel) is tracked as
      // a MiscItem and already counted into resourceCounts above, but its
      // ingredient ItemType doesn't contain "Component" so recipe ingredient
      // resolution sums resourceCounts + ownedItemCounts for it - without
      // this check it was recounted a second time here, inflating "have" to
      // 2x the real owned quantity for every such part.
      all.forEach(item => {
        if (item.owned && item.unique_name && item.category !== 'resources') {
          const key = canonicalInventoryType(item.unique_name);
          if (!(key in ownedItemCounts) && !(key in resourceCounts)) ownedItemCounts[key] = 1;
        }
      });

      // Mastered items set
      const masteredSet = new Set(
        all.filter(i => i.mastered).map(i => i.name)
      );

      // name → item index for O(1) lookups inside the recipe loop
      const nameToItem = new Map(all.map(i => [i.name, i]));
      const equipmentCategories = new Set([
        'warframes', 'primary', 'secondary', 'melee', 'sentinels', 'moas',
        'hounds', 'beasts', 'robotics', 'companions', 'companion_weapons',
        'archwings', 'archweapons', 'necramechs', 'kdrives', 'amps',
      ]);

      // Process each recipe
      Object.entries(ERecipe ?? {}).forEach(([bpKey, recipe]) => {
        if (!recipe || !recipe.resultType) return;

        const resultName = resolveName(recipe.resultType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);

        // Skip Helminth abilities and quest items
        if (bpKey.includes('AbilityOverride')) return;
        if (recipe.resultType?.includes('/Abilities/')) return;
        if (bpKey.includes('Quest')) return;

        // Skip component blueprints (Helmet/Chassis/Systems/Wings Blueprint) - they're shown as components in main BP
        if (bpKey.includes('HelmetBlueprint') || bpKey.includes('ChassisBlueprint') || bpKey.includes('SystemsBlueprint') || bpKey.includes('HarnessBlueprint') || bpKey.includes('WingsBlueprint')) return;

        // Check if this is a main BP that could have components (warframes, archwings, etc)
        const isMainItemBP = (bpKey.includes('/Recipes/WarframeRecipes/') || bpKey.includes('/Recipes/ArchwingRecipes/')) && !bpKey.includes('Component');
        const isOwned = (ownedItemCounts[canonicalInventoryType(bpKey)] ?? 0) > 0;

        // The Foundry catalog needs every equipment recipe so an unowned item
        // can still show its component circles and missing quantities. Keep
        // non-equipment recipes out of the catalog, while retaining the
        // existing owned/component-based behavior for other recipe consumers.
        const catalogItem = nameToItem.get(resultName.replace(BLUEPRINT_SUFFIX[locale] ?? ' Blueprint', ''))
          ?? nameToItem.get(resultName.replace(BLUEPRINT_SUFFIX[locale] ?? ' Blueprint', '') + ' Prime');
        // Some modular companion parts (for example Aegron Gyro) have an
        // export identity that does not resolve through the display-name
        // index. Use the authoritative export tables as a second signal so
        // their recipes are not dropped before the Foundry can display them.
        const isExportedEquipment = [EW, EWf, ES].some((table) =>
          table && Object.prototype.hasOwnProperty.call(table, recipe.resultType)
        );
        let showBP = isOwned || equipmentCategories.has(catalogItem?.category) || isExportedEquipment;

        // If it's a main BP and player doesn't own it, also show it when they
        // own any component BPs for it - but only to ADD to showBP, never to
        // narrow it back: showBP may already be true from the broadened
        // equipment check above (isExportedEquipment/equipmentCategories),
        // which must always win for unowned main items like an un-crafted
        // Warframe with zero components owned yet.
        if (isMainItemBP && !isOwned && !showBP) {
          const base = bpKey.replace('/Lotus/Types/Recipes/WarframeRecipes/', '').replace('/Lotus/Types/Recipes/ArchwingRecipes/', '').replace('Blueprint', '');
          const prefix = bpKey.includes('ArchwingRecipes') ? '/Lotus/Types/Recipes/ArchwingRecipes/' : '/Lotus/Types/Recipes/WarframeRecipes/';
          const componentBPs = [
            `${prefix}${base}HelmetBlueprint`,
            `${prefix}${base}ChassisBlueprint`,
            `${prefix}${base}SystemsBlueprint`,
            `${prefix}${base}HarnessBlueprint`,
            `${prefix}${base}WingsBlueprint`
          ];
          showBP = componentBPs.some(cb => (ownedItemCounts[canonicalInventoryType(cb)] ?? 0) > 0);
        }

        if (!showBP) return;

        // Get count of this BP owned
        const bpCount = ownedItemCounts[canonicalInventoryType(bpKey)] ?? 0;

        const baseName = resultName.replace(BLUEPRINT_SUFFIX[locale] ?? ' Blueprint', '').replace(' Prime', ' Prime');

        // Check if player has the full item (owned)
        const ownedItem = nameToItem.get(baseName) ?? nameToItem.get(baseName + ' Prime');
        const ownedCount = ownedItem ? (ownedItem.quantity ?? 1) : 0;
        const fullItemOwned = ownedCount > 0;

        // Check if mastered - O(1) from the name index
        const masteredEntry = (nameToItem.get(baseName) ?? nameToItem.get(baseName + ' Prime'))
          || sentinels?.find(i => i.name === baseName || i.name === baseName + ' Prime')
          || moas?.find(i => i.name === baseName || i.name === baseName + ' Prime')
          || hounds?.find(i => i.name === baseName || i.name === baseName + ' Prime')
          || beasts?.find(i => i.name === baseName || i.name === baseName + ' Prime');

        // XP is keyed by resultType (item path), not blueprint path (bpKey)
        const xp = xpMap[recipe.resultType] ?? 0;
        const isMastered = (masteredEntry?.mastered ?? false) || (xp > 0);
        let hasMastery = masteredEntry ? (masteredEntry.category !== 'resources' && masteredEntry.category !== 'mods' && masteredEntry.category !== 'arcanes' && masteredEntry.category !== 'prime_parts') : (xp > 0);

        // Modular parts mastery fix: only Strikes, Chambers, and Heads provide mastery
        if (hasMastery && (bpKey.includes('Modular') || bpKey.includes('/Ostron/Melee/') || bpKey.includes('/SolarisUnited/') || bpKey.includes('/InfKitGun/'))) {
          const isMasteryPart = bpKey.includes('/Barrel/') || bpKey.includes('/Barrels/') || bpKey.includes('/Tip/') || bpKey.includes('/Tips/') || bpKey.includes('MoaPetHead') || bpKey.includes('ZanukaPetPartHead');
          if (!isMasteryPart) hasMastery = false;
        }

        // Check all ingredients - separate crafted vs blueprints. Inventory
        // quantities must be allocated across repeated recipe entries: Twin
        // Kohmak has two Kohmak ingredients, and one owned Kohmak cannot
        // satisfy both rows independently.
        const ingredientUsage = {};
        const ingredients = (recipe.ingredients ?? []).map(ing => {
          const ingName = resolveName(ing.ItemType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);

          let have = 0;
          let bpOwned = 0;
          let bpReady = false;
          let subIngredients = null;

          // For component blueprints (Helmet/Chassis/Systems/etc), separate crafted from BPs
          const isComponent = ing.ItemType.includes('Component');
          if (isComponent) {
            // Crafted component count
            have = ownedItemCounts[canonicalInventoryType(ing.ItemType)] ?? 0;
            // Blueprint count (separate)
            const bpKey = ing.ItemType.replace('Component', 'Blueprint');
            bpOwned = ownedItemCounts[canonicalInventoryType(bpKey)] ?? 0;

            // Check if component blueprint is ready to craft
            const bpRecipe = ERecipe?.[bpKey];
            if (bpRecipe?.ingredients) {
              bpReady = bpRecipe.ingredients.every(subIng => {
                const subKey = canonicalInventoryType(subIng.ItemType);
                const subHave = (resourceCounts[subKey] ?? 0) + (ownedItemCounts[subKey] ?? 0);
                return subHave >= (subIng.ItemCount ?? 1);
              });

              // Get sub-ingredients for tooltip
              subIngredients = bpRecipe.ingredients.map(subIng => ({
                name: resolveName(subIng.ItemType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe),
                have: (() => {
                  const subKey = canonicalInventoryType(subIng.ItemType);
                  return (resourceCounts[subKey] ?? 0) + (ownedItemCounts[subKey] ?? 0);
                })(),
                need: subIng.ItemCount ?? 1,
                image: resolveImage(subIng.ItemType, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe)
              }));
            }
          } else {
            // For regular resources/items - count both resources and owned items
            const ingredientKey = canonicalInventoryType(ing.ItemType);
            have = (resourceCounts[ingredientKey] ?? 0) + (ownedItemCounts[ingredientKey] ?? 0);
          }

          const need = ing.ItemCount ?? 1;
          const ingredientKey = canonicalInventoryType(ing.ItemType);
          const alreadyAllocated = ingredientUsage[ingredientKey] ?? 0;
          have = Math.max(0, have - alreadyAllocated);
          ingredientUsage[ingredientKey] = alreadyAllocated + need;
          const image = resolveImage(ing.ItemType, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);
          return { name: ingName, have, need, itemType: ing.ItemType, image, bpOwned, isComponent, bpReady, subIngredients };
        });

        const allIngredientsMet = ingredients.every(ing => ing.have >= ing.need);
        const readyToCraft = bpCount > 0 && allIngredientsMet;

        // No separate "parts" section needed - ingredients already has everything

        craftableItems.push({
          bpName: resultName,
          baseName,
          componentBased: isMainItemBP && !isOwned,
          image: resolveImage(recipe.resultType, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe),
          buildTime: recipe.buildTime ?? (12 * 3600),
          buildPrice: recipe.buildPrice ?? 0,
          ingredients,
          allIngredientsMet,
          readyToCraft,
          bpCount,
          ownedCount,
          fullItemOwned,
          isMastered,
          hasMastery,
          uniqueName: bpKey,
          resultType: recipe.resultType
        });
      });

      return craftableItems;
    })(),

    foundry: (raw.PendingRecipes ?? []).map(p => {
      const recipe = ERecipe[p.ItemType];
      const resultType = recipe?.resultType ?? p.ItemType;
      const completionDate = p.CompletionDate?.$date?.$numberLong;
      const finishTime = completionDate ? parseInt(completionDate, 10) / 1000 : 0;

      const name = resolveName(resultType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);

      // Try to find if this is a subcomponent (Systems, Neuroptics, Chassis, Barrel, etc)
      // and find its "Parent" item.
      let parentName = name;
      if (name.includes(' Systems')) parentName = name.replace(' Systems', '');
      else if (name.includes(' Neuroptics')) parentName = name.replace(' Neuroptics', '');
      else if (name.includes(' Chassis')) parentName = name.replace(' Chassis', '');
      else if (name.includes(' Harness')) parentName = name.replace(' Harness', '');
      else if (name.includes(' Barrel')) parentName = name.replace(' Barrel', '');
      else if (name.includes(' Receiver')) parentName = name.replace(' Receiver', '');
      else if (name.includes(' Stock')) parentName = name.replace(' Stock', '');
      else if (name.includes(' Grip')) parentName = name.replace(' Grip', '');
      else if (name.includes(' String')) parentName = name.replace(' String', '');
      else if (name.includes(' Limb')) parentName = name.replace(' Limb', '');
      else if (name.includes(' Blade')) parentName = name.replace(' Blade', '');
      else if (name.includes(' Hilt')) parentName = name.replace(' Hilt', '');
      else if (name.includes(BLUEPRINT_SUFFIX[locale] ?? ' Blueprint')) parentName = name.replace(BLUEPRINT_SUFFIX[locale] ?? ' Blueprint', '');

      // Find the parent item in 'all' items to check ownership/mastery
      const parentItem = all.find(i => i.name === parentName || i.name === (parentName + (BLUEPRINT_SUFFIX[locale] ?? ' Blueprint')));

      return {
        unique_name: p.ItemType,
        result_type: resultType,
        name,
        parentName,
        parentOwned: parentItem?.owned ?? false,
        parentMastered: parentItem?.mastered ?? false,
        image: resolveImage(resultType, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe),
        finishTime,
        buildTime: recipe?.buildTime ?? (12 * 3600),
        // Preserve the consumed recipe inputs. Relic history needs these when
        // a parent item is already in the Foundry and its component
        // blueprints have consequently disappeared from inventory.
        recipeIngredients: recipe?.ingredients ?? [],
        ready: finishTime > 0 && (Date.now() / 1000) > finishTime,
        ...p
      }
    }),
    globalBoosters: (raw.GlobalUpgrades || []).map(u => {
      const typeMap = {
        'GAMEPLAY_KILL_XP_AMOUNT': 'Affinity Booster',
        'GAMEPLAY_MONEY_PICKUP_AMOUNT': 'Credit Booster',
        'GAMEPLAY_PICKUP_AMOUNT': 'Resource Booster'
      }
      return {
        name: typeMap[u.UpgradeType] || splitPascal(u.UpgradeType.replace('GAMEPLAY_', '')),
        expiry: u.Expiry,
        activation: u.Activation
      }
    })
  };
}

// ─── Relic Name Helper ────────────────────────────────────────────────────────

/**
 * Derive a human-readable relic name from its internal path.
 * Tries the ExportRelics entry first (era + category + quality).
 * Falls back to parsing the leaf segment of the path (e.g. T4VoidProjectionGoldP
 * → "Axi P Relic (Radiant)").
 * Called before parseInventory groups relics by base name.
 */
function relicNameFromPath(path, ERel = {}) {
  const leaf = path.split('/').at(-1) ?? path;
  const entry = ERel[path] || ERel[path.replace('/StoreItems/', '/')];

  const qualityMap = {
    'Bronze': 'Intact',
    'Silver': 'Exceptional',
    'Gold': 'Flawless',
    'Platinum': 'Radiant'
  };

  const vpqMap = {
    'VPQ_BRONZE': 'Intact',
    'VPQ_SILVER': 'Exceptional',
    'VPQ_GOLD': 'Flawless',
    'VPQ_PLATINUM': 'Radiant'
  };

  if (entry) {
    const era = entry.era || 'Unknown';
    const cat = entry.category || 'Unknown';
    let quality = 'Intact';

    if (entry.quality && vpqMap[entry.quality]) {
      quality = vpqMap[entry.quality];
    } else {
      for (const [raw, clean] of Object.entries(qualityMap)) {
        if (leaf.endsWith(raw)) { quality = clean; break; }
      }
    }

    return `${era} ${cat} Relic (${quality})`;
  }

  // Fallback if no entry found
  const tierMatch = leaf.match(/^T(\d)VoidProjection/i);
  if (tierMatch) {
    const tiers = { '1': 'Lith', '2': 'Meso', '3': 'Neo', '4': 'Axi', '5': 'Requiem' };
    const era = tiers[tierMatch[1]] || 'Other';
    let rest = leaf.replace(/^T\dVoidProjection/i, '');
    let quality = '';
    for (const [raw, clean] of Object.entries(qualityMap)) {
      if (rest.endsWith(raw)) {
        rest = rest.replace(raw, '');
        quality = clean;
        break;
      }
    }
    let baseName = splitPascal(rest).replace(/Relic$/, '').trim();
    // Requiem relics use T5VoidProjectionImmortalA/B/C/D and the newer
    // T5VoidProjectionImmortalOmniA naming instead of ordinary lettered
    // Void relic categories. Keep them grouped as the game's I-IV/Eterna
    // relics even when the matching export entry is unavailable.
    if (tierMatch[1] === '5') {
      const requiemMatch = rest.match(/^Immortal(OmniA?|A|B|C|D)/i);
      const requiemNames = { A: 'I', B: 'II', C: 'III', D: 'IV', Omni: 'Eterna', OmniA: 'Eterna' };
      if (requiemMatch) baseName = requiemNames[requiemMatch[1]] || baseName;
    }
    return `${era} ${baseName} Relic${quality ? ` (${quality})` : ''}`;
  }

  return splitPascal(leaf.replace(/Relic$/, ' Relic')).trim();
}
