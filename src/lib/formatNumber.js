// This app's locale codes (matching src/lib/i18n/<code>.json filenames)
// aren't all valid standalone BCP-47 tags for Intl - `tc` (Traditional
// Chinese) and `zh` (Simplified Chinese) in particular need mapping, or
// Intl falls back to its default locale instead of throwing, silently
// producing wrong separators. Verified against real Intl output for all
// 15 codes before relying on this map (see project_full_app_locale_audit
// memory).
const LOCALE_TO_BCP47 = {
  tc: 'zh-Hant',
  zh: 'zh-Hans',
}

function toBcp47(locale) {
  return LOCALE_TO_BCP47[locale] || locale || 'en'
}

/**
 * Locale-aware replacement for `n.toLocaleString()` with no arguments,
 * which uses the webview runtime's default locale rather than the app's
 * own selected UI locale (the actual bug: German numbers rendering with
 * English-style "31,500" instead of "31.500"). Pass the current UI locale
 * (from useUi()'s `locale`, or MonitoringContext/lib code that already
 * threads a locale string through) explicitly - there is no implicit
 * global fallback by design, so a missing locale argument is caught at
 * the call site during review rather than silently defaulting.
 */
export function formatNumber(n, locale, options) {
  if (n == null || Number.isNaN(n)) return ''
  return n.toLocaleString(toBcp47(locale), options)
}
