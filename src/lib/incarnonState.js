export function isIncarnonWeapon(weapon, evolutionProgress, adapterFamilies, familyMap) {
  const uniqueName = weapon?.unique_name ?? weapon?.ItemType;
  if (!uniqueName) return false;
  if (evolutionProgress?.has(uniqueName)) return true;

  for (const family of (adapterFamilies ?? [])) {
    if (familyMap?.get(family)?.has(uniqueName)) return true;
  }
  return false;
}
