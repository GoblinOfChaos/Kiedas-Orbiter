/**
 * Cosmetics kind classification for ExportCustoms skins.
 * Kept separate from the screen so unit tests can cover folder → kind mapping.
 */

// Legacy Skins/ folders that do not match ExportWarframes Powersuits codenames
// (same class as ANIMATION_FOLDER_FAMILY_OVERRIDES in Cosmetics.jsx).
export const SKIN_FOLDER_FAMILY_OVERRIDES = {
  anima: 'equinox',
  asp: 'saryn',
  decree: 'banshee',
  archer: 'ivara',
  hydroid: 'hydroid',
  umbra: 'umbra',
};

/**
 * @param {string} uniqueName
 * @param {string} [icon]
 * @param {string} kind - export/kind hint: 'Skin' | 'Sigil' | other passthrough
 * @param {Set<string>|undefined|null} warframeFamilies - lowercased family keys from ExportWarframes
 * @returns {string} display kind (Warframe, Operator, Emblem, Other, …)
 */
/**
 * ExportCustoms records that are player cosmetics. Most live under
 * /Upgrades/Skins/; DE also files companion fur patterns, some Syandanas and
 * a few melee weapon skins elsewhere. Body-type and Lotus*Customization
 * records in the same table are base types, not items.
 */
// The base skin and helmet a Warframe comes with when it is built are part of
// the Warframe, not items a player can get, so they are not listed (owner
// decision 2026-10-20). Named by exact ID; DE does not link these frames'
// base appearance in its export (Gauss Prime's helmet is in its additionalItems).
export const BASE_APPEARANCE_ITEMS = new Set([
  '/Lotus/Upgrades/Skins/Duelist/DuelistSkin',
  '/Lotus/Upgrades/Skins/Duelist/DuelistHelmet',
  '/Lotus/Upgrades/Skins/Geode/CitrinePrimeSkin',
  '/Lotus/Upgrades/Skins/Geode/CitrinePrimeHelmet',
  '/Lotus/Upgrades/Skins/Runner/GaussPrimeHelmet',
  // Default companion patterns (the pattern a Predasite, Vulpaphyla or Helminth
  // Charger comes with).
  '/Lotus/Types/Game/InfestedKavatPet/Patterns/InfestedCritterPatternDefault',
  '/Lotus/Types/Game/InfestedPredatorPet/Patterns/InfestedPredatorPatternDefault',
  '/Lotus/Types/Game/KubrowPet/Patterns/KubrowPetPatternInfested',
]);

/**
 * Everything that comes with a Warframe, Sentinel or weapon when it is built or
 * owned: DE lists these in the record's `additionalItems` (base helmet, included
 * armor pieces, ...), plus BASE_APPEARANCE_ITEMS for frames DE does not link.
 * They are not items a player can get on their own, so no screen lists them.
 */
export function baseAppearanceSet(exportData) {
  const set = new Set(BASE_APPEARANCE_ITEMS);
  for (const table of ['ExportWarframes', 'ExportSentinels', 'ExportWeapons']) {
    for (const entry of Object.values(exportData?.[table] || {})) {
      for (const item of entry?.additionalItems || []) set.add(String(item).replaceAll('/StoreItems/', '/'));
    }
  }
  return set;
}

export function isCosmeticCustomsEntry(uniqueName) {
  const value = String(uniqueName || '');
  if (BASE_APPEARANCE_ITEMS.has(value)) return false;
  return /\/Upgrades\/Skins\//i.test(value)
    || /^\/Lotus\/Types\/Game\/[A-Za-z]+Pet\/Patterns\//.test(value)
    || /^\/Lotus\/Characters\/Tenno\/Accessory\/Scarves\//.test(value)
    || /^\/Lotus\/Weapons\/Tenno\/Melee\/.+Skin$/.test(value);
}

export function cosmeticType(uniqueName, icon, kind, warframeFamilies) {
  if (kind !== 'Skin') return kind;
  const value = `${uniqueName || ''} ${icon || ''}`.toLowerCase();

  if (/storeicons\/weapons\/secondaryweapons\//.test(value)) return 'Secondary';
  if (/storeicons\/weapons\/primaryweapons\//.test(value)) return 'Primary';
  if (/storeicons\/weapons\/meleeweapons\//.test(value)) return 'Melee';
  if (/^\/lotus\/types\/game\/[a-z]+pet\/patterns\//.test(value)) return 'Companion';
  if (/^\/lotus\/characters\/tenno\/accessory\/scarves\//.test(value)) return 'Syandana';
  if (/^\/lotus\/weapons\/tenno\/melee\//.test(value)) return 'Melee';
  if (/\/upgrades\/skins\/weapons\/(pistols|dspistols)\//.test(value)) return 'Secondary';
  if (/\/upgrades\/skins\/weapons\/(longguns|rifle)\//.test(value)) return 'Primary';
  if (/\/upgrades\/skins\/weapons\//.test(value)) return 'Melee';
  if (/archwing/.test(value)) return 'Archwing';
  if (/sentinel/.test(value)) return 'Sentinel';
  if (/syandana|\/upgrades\/skins\/scarves\//.test(value)) return 'Syandana';
  // Kubrow, Catbrow and MoaPet items, including their armor sets, are companion
  // cosmetics. Checked before the Armor rule so pet armor is grouped with them.
  if (/\/upgrades\/skins\/(kubrows|catbrows|moapet)\//.test(value)) return 'Companion';
  if (/armor/.test(value)) return 'Armor';
  if (/animationsets/.test(value)) return 'Animation';

  // Operator / Drifter cosmetics (Drifter pieces are filed under Operator/).
  if (/\/upgrades\/skins\/operator\//.test(value)) return 'Operator';

  // Clan badges / emblems (wiki Emblems; DE Skins/Clan/*Badge*).
  if (/\/upgrades\/skins\/clan\//.test(value)) return 'Emblem';

  // Folder-specific kinds for items the rules above did not place. Each folder
  // holds one kind of item (checked against item names and icon folders in
  // ExportCustoms.json). Placed last so existing kinds, such as Catbrow armor
  // under Armor, are never reassigned.
  if (/\/upgrades\/skins\/effects\//.test(value)) return 'Ephemera';
  if (/\/upgrades\/skins\/railjack\//.test(value)) return 'Railjack';
  if (/\/upgrades\/skins\/horse\//.test(value)) return 'Kaithe';
  if (/\/upgrades\/skins\/necramech\//.test(value)) return 'Necramech';
  if (/\/upgrades\/skins\/(hoverboard|kdrive|motorcycle)\//.test(value)) return 'Vehicle';
  // Signa (crown-style headpieces; the Crowns folder).
  if (/\/upgrades\/skins\/crowns\//.test(value)) return 'Signa';
  // Kahl's Gang gear (Grineer-style armor pieces, helmets and masks).
  if (/\/upgrades\/skins\/kahl\//.test(value)) return 'Armor';
  if (/\/upgrades\/skins\/(kubrows|catbrows|moapet)\//.test(value)) return 'Companion';
  if (/\/upgrades\/skins\/holstercustomizations\//.test(value)) return 'Holster';
  // Sugatras: melee-weapon charms (every item's icon is under Cosmetics/Sugatras/).
  if (/\/upgrades\/skins\/meleedangles\//.test(value)) return 'Melee';

  const folderMatch = /\/upgrades\/skins\/([a-z0-9]+)\//.exec(value);
  if (folderMatch) {
    const folder = folderMatch[1];
    const familyKey = SKIN_FOLDER_FAMILY_OVERRIDES[folder] || folder;
    if (Object.prototype.hasOwnProperty.call(SKIN_FOLDER_FAMILY_OVERRIDES, folder)) {
      return 'Warframe';
    }
    if (warframeFamilies?.has(familyKey)) return 'Warframe';
  }
  return 'Other';
}
