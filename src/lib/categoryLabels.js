// `item.category` is an internal snake_case bucket key (inventoryParser.js),
// never meant for display - shown raw (e.g. "companion_weapons") it just
// gets CSS-uppercased into "COMPANION_WEAPONS" with the underscore intact.
// Shared by Foundry.jsx and Inventory.jsx so both render the same clean
// labels instead of each falling back to the raw bucket string.
// English fallback text, used when no `t` is supplied or a category has no
// i18n key (unrecognized categories still get sentence-cased raw text).
export const CATEGORY_DISPLAY_LABELS = {
  warframes: 'Warframe', primary: 'Primary', secondary: 'Secondary', melee: 'Melee',
  kitguns: 'Kitgun', zaws: 'Zaw', amps: 'Amp',
  archwings: 'Archwing', archweapons: 'Archwing Weapon', necramechs: 'Necramech',
  companions: 'Companion', companion_weapons: 'Sentinel Weapon',
  sentinels: 'Sentinel', moas: 'MOA', hounds: 'Hound', beasts: 'Beast', robotics: 'Robotic',
  kdrives: 'K-Drive', consumables: 'Gear', landing_craft: 'Landing Craft', appearance: 'Appearance',
  // Inventory-only buckets (inventoryParser.js) missing from the original
  // map - any item with one of these categories fell through to raw
  // sentence-cased text (e.g. "Resources") in every locale, not just
  // untranslated ones. Confirmed against every literal `category: '...'`
  // value inventoryParser.js actually assigns.
  Arcanes: 'Arcane', components: 'Component', intrinsics: 'Intrinsic',
  peely_pix: 'Peely Pix', prime_parts: 'Prime Part', relics: 'Relic',
  resources: 'Resource', rivens: 'Riven Mod', songItems: 'Song',
}

const CATEGORY_I18N_KEYS = {
  warframes: 'category.warframes', primary: 'category.primary', secondary: 'category.secondary', melee: 'category.melee',
  kitguns: 'category.kitguns', zaws: 'category.zaws', amps: 'category.amps',
  archwings: 'category.archwings', archweapons: 'category.archweapons', necramechs: 'category.necramechs',
  companions: 'category.companions', companion_weapons: 'category.companion_weapons',
  sentinels: 'category.sentinels', moas: 'category.moas', hounds: 'category.hounds', beasts: 'category.beasts', robotics: 'category.robotics',
  kdrives: 'category.kdrives', consumables: 'category.consumables', landing_craft: 'category.landing_craft', appearance: 'category.appearance',
  Arcanes: 'category.arcanes', components: 'category.components', intrinsics: 'category.intrinsics',
  peely_pix: 'category.peely_pix', prime_parts: 'category.prime_parts', relics: 'category.relics',
  resources: 'category.resources', rivens: 'category.rivens', songItems: 'category.song_items',
}

export function categoryDisplayLabel(category, t) {
  const i18nKey = CATEGORY_I18N_KEYS[category]
  if (i18nKey && t) return t(i18nKey)
  return CATEGORY_DISPLAY_LABELS[category] ?? String(category || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
