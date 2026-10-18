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
export function cosmeticType(uniqueName, icon, kind, warframeFamilies) {
  if (kind !== 'Skin') return kind;
  const value = `${uniqueName || ''} ${icon || ''}`.toLowerCase();

  if (/storeicons\/weapons\/secondaryweapons\//.test(value)) return 'Secondary';
  if (/storeicons\/weapons\/primaryweapons\//.test(value)) return 'Primary';
  if (/storeicons\/weapons\/meleeweapons\//.test(value)) return 'Melee';
  if (/\/upgrades\/skins\/weapons\/(pistols|dspistols)\//.test(value)) return 'Secondary';
  if (/\/upgrades\/skins\/weapons\/(longguns|rifle)\//.test(value)) return 'Primary';
  if (/\/upgrades\/skins\/weapons\//.test(value)) return 'Melee';
  if (/archwing/.test(value)) return 'Archwing';
  if (/sentinel/.test(value)) return 'Sentinel';
  if (/syandana|\/upgrades\/skins\/scarves\//.test(value)) return 'Syandana';
  if (/armor/.test(value)) return 'Armor';
  if (/animationsets/.test(value)) return 'Animation';

  // Operator / Drifter cosmetics (Drifter pieces are filed under Operator/).
  if (/\/upgrades\/skins\/operator\//.test(value)) return 'Operator';

  // Clan badges / emblems (wiki Emblems; DE Skins/Clan/*Badge*).
  if (/\/upgrades\/skins\/clan\//.test(value)) return 'Emblem';

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
