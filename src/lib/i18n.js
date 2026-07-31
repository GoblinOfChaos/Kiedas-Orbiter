/**
 * i18n.js — Manual-translation domain loader.
 *
 * Loads per-locale translation tables for strings that are NOT present in the
 * official Warframe game dictionary (`dict.{locale}.json`):
 *   - rivenStats: riven mod attribute names (e.g. "Damage" → "Schaden")
 *   - nameOverrides: item display names lacking dict entries (MUSEUMDOGTAG, etc.)
 *   - eras: relic era names (Lith/Meso/Neo/…) — fallback when dict lacks them
 *   - peely: Peely Pix sticker mod names + descriptions (community content)
 *   - ui: Settings-screen UI chrome labels
 *
 * Files are static JSON at src/lib/i18n/{locale}.json, bundled at build time
 * via Vite's import.meta.glob.  Only the active locale is fetched at runtime.
 *
 * The game dict (mission names, node names, challenge text) is resolved
 * separately by the monitoring contexts; this module only supplements it.
 */

let _cache = {}

// Lazy-load the locale JSON. Vite transforms import.meta.glob into per-module
// entries; each is a real module with a default export.
const _loaders = import.meta.glob('./i18n/*.json', { eager: false })

/**
 * @param {string} locale - e.g. 'en', 'de', 'tc'
 * @returns {Promise<object>} locale data object { rivenStats, nameOverrides, eras, peely, ui, _meta }
 */
export async function loadLocale(locale = 'en') {
  if (!locale || locale === 'en') locale = 'en'
  if (_cache[locale]) return _cache[locale]

  const globKey = `/${locale}.json`
  const loader = _loaders[globKey]
  if (!loader) {
    // Fallback to English if requested locale is missing
    return locale === 'en' ? null : loadLocale('en')
  }

  const mod = await loader()
  const data = mod.default ?? mod
  _cache[locale] = data
  return data
}

/**
 * Synchronous access — works if the locale was pre-loaded or is 'en'.
 * For non-en locales not yet loaded, returns English fallback.
 */
export function getLocaleSync(locale = 'en') {
  if (!locale || locale === 'en') locale = 'en'
  return (_cache[locale] || _cache['en']) ?? null
}

// ── Convenience accessors ─────────────────────────────────────────────────────

export function getRivenStat(statName, locale = 'en') {
  const l10n = getLocaleSync(locale)
  if (!l10n?.rivenStats?.[statName]) return null
  return l10n.rivenStats[statName]
}

export function getNameOverride(uniqueNameLeaf, locale = 'en') {
  const l10n = getLocaleSync(locale)
  if (!l10n?.nameOverrides) return null
  // Try exact match, then uppercase
  return l10n.nameOverrides[uniqueNameLeaf] || l10n.nameOverrides[uniqueNameLeaf?.toUpperCase()] || null
}

export function getRelicEra(eraName, dict, locale = 'en') {
  // dict-first: the game dict usually has era names (e.g. /Lotus/Language/Locations/Lith)
  if (dict) {
    const dictKey = `/Lotus/Language/Locations/${eraName}`
    const dictVal = dict[dictKey] || dict['/' + dictKey]
    if (dictVal && !dictVal.startsWith('/Lotus/')) {
      return dictVal.replace(/<[^>]*>/g, '').trim()
    }
  }
  // Fallback to i18n table (only English names for most locales are identical
  // to the key, so this mainly helps CJK/ Cyrillic scripts)
  const l10n = getLocaleSync(locale)
  return l10n?.eras?.[eraName] || eraName
}

export function getPeelyName(locKey, locale = 'en') {
  const l10n = getLocaleSync(locale)
  const entry = l10n?.peely?.[locKey]
  if (!entry) return null
  return { name: entry.name, description: entry.description }
}

export function getUIStr(key, locale = 'en') {
  const l10n = getLocaleSync(locale)
  return l10n?.ui?.[key] || null
}
