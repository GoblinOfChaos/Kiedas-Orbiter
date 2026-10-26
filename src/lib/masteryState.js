// Which items award Mastery Rank. The primary list is built from the wiki's Mastery Rank
// Checklist and Hidden Mastery pages by scripts/mastery-list/build.mjs. The checklist does not
// yet include some recent Prime weapons, so a masterable weapon or Warframe that is not
// excluded by name also counts. Used by the Inventory and Foundry Mastered / Unmastered
// filters. Item data itself is not changed.
import masteryList from '../../src-tauri/data/assets/data/mastery-items.json' with { type: 'json' }

const WIKI_NAMES = new Set(masteryList.items.map((i) => i.name.toLowerCase()))
const stripQualifier = (name) => name.replace(/\s*\([^)]*\)\s*$/, '').trim()
const stripBlueprint = (name) => name.replace(/\s+Blueprint$/i, '').trim()

// Categories that never award mastery.
const NEVER = new Set(['consumables', 'resources', 'rivens', 'Arcanes', 'arcanes', 'mods', 'mods_catalog', 'cosmetics', 'appearance', 'keys', 'regions', 'landing_craft', 'peely_pix', 'songItems', 'relics', 'components', 'intrinsics', 'plexus'])
// Parts take their mastery from the item they belong to.
const PARTS = new Set(['parts', 'prime_parts'])
// Weapon and Warframe categories that can award mastery when the checklist omits them.
const EQUIPMENT = new Set(['warframes', 'weapons', 'primary', 'secondary', 'melee', 'kitguns', 'zaws', 'archweapons', 'companion_weapons', 'archwings', 'necramechs', 'amps', 'kdrives'])
const WEAPON_CATEGORIES = new Set(['weapons', 'primary', 'secondary', 'melee', 'kitguns', 'zaws', 'archweapons', 'companion_weapons', 'amps', 'kdrives'])
// Exalted weapons, Talons, Sevagoth's Shadow, the Sirius & Orion secondary, and Kubrow/Kavat/Predasite/Vulpaphyla weapons award nothing (wiki).
const NO_MASTERY_WEAPON = /\bExalted\b|\bTalons\b|Sevagoth's Shadow|Sirius|\bKubrow\b|\bKavat\b|Predasite|Vulpaphyla/i

// Names such as "Chow Chow (Chesa Kubrow)" carry the wiki name in brackets.
function listedName(name) {
  if (!name) return false
  const lower = name.toLowerCase()
  if (WIKI_NAMES.has(lower) || WIKI_NAMES.has(stripQualifier(name).toLowerCase())) return true
  const inner = /\(([^)]+)\)\s*$/.exec(name)?.[1]
  return Boolean(inner) && WIKI_NAMES.has(inner.trim().toLowerCase())
}

// A part is named "<Item> <part>", so it counts when a listed item name is its leading words.
function listedPrefix(name) {
  const lower = name.toLowerCase()
  for (const listed of WIKI_NAMES) {
    if (listed.length >= 4 && lower.startsWith(listed + ' ')) return true
  }
  return false
}

// Items the game never lets earn mastery. Their card must not say "Unmastered":
// that wording promises mastery that cannot be earned. Exalted weapons come
// with their Warframe, and the Drifter copy and story/alternate-mode records
// share a masterable weapon's name (#92).
export function neverAwardsMastery(item) {
  return item?.exalted_weapon === true || item?.drifter_version === true || item?.no_mastery === true
}

export function awardsMastery(item) {
  if (!item?.name) return false
  if (NEVER.has(item.category)) return false
  // The Drifter's copy of a Duviri melee shares the Warframe weapon's name, so
  // the name list would match it; only the Warframe version earns mastery (#92).
  if (item.drifter_version === true) return false
  // Exalted weapons come with their Warframe and never earn mastery (wiki).
  if (item.exalted_weapon === true) return false
  // Story or alternate-mode records that share a masterable weapon's name.
  if (item.no_mastery === true) return false
  if (listedName(item.name) || listedName(stripBlueprint(item.name))) return true
  if (item.parent_name && listedName(item.parent_name)) return true
  if (PARTS.has(item.category)) return listedPrefix(item.name)
  if (EQUIPMENT.has(item.category) && item.masterable !== false && typeof item.mastered === 'boolean') {
    if (WEAPON_CATEGORIES.has(item.category) && NO_MASTERY_WEAPON.test(item.name)) return false
    return true
  }
  return false
}
