import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.env.I18N_DIR || path.join(import.meta.dirname, '../../src/lib/i18n'))
const completeLocales = JSON.parse(fs.readFileSync(path.resolve(process.env.I18N_COMPLETE_LOCALES || path.join(import.meta.dirname, '../fixtures/i18n-complete-locales.json')), 'utf8'))
const en = JSON.parse(fs.readFileSync(path.join(root, 'en.json'), 'utf8'))
const baseline = JSON.parse(fs.readFileSync(path.resolve(process.env.I18N_BASELINE || path.join(import.meta.dirname, '../fixtures/i18n-identical-baseline.json')), 'utf8'))
const allowlist = JSON.parse(fs.readFileSync(path.resolve(process.env.I18N_QUALITY_ALLOWLIST || path.join(import.meta.dirname, '../fixtures/i18n-translation-quality-allowlist.json')), 'utf8'))

const englishFunctionWords = ['the', 'and', 'for', 'you', 'your', 'to', 'of', 'in', 'with', 'from', 'that', 'this', 'any', 'all', 'a', 'on', 'son', 'no']
const tokenPattern = /[A-Za-z][A-Za-z'-]{3,}/g
const latinLocales = new Set(['de', 'es', 'fr', 'it', 'pl', 'pt', 'tr'])
const scriptPatterns = {
  ja: /[\u3040-\u30ff\u3400-\u9fff]/,
  ko: /[\uac00-\ud7af]/,
  ru: /[\u0400-\u04ff]/,
  tc: /[\u3400-\u9fff]/,
  th: /[\u0e00-\u0e7f]/,
  uk: /[\u0400-\u04ff]/,
  zh: /[\u3400-\u9fff]/,
}
const mixedLanguageCheckPrefixes = ['farming_targets.', 'foundry.', 'preview.dashboard.']
const mixedLanguageCheckKeys = new Set([
  'nav.farming-targets',
  'settings.reload_ui_button',
  'settings.reload_ui_confirm',
  'ui.dashboard.circuit_title',
  'ui.riven_overlay.scanning',
  'ui.riven_prompt.title',
  'ui.riven_prompt.press',
  'ui.riven_prompt.action',
  'ui.riven_prompt.hint',
  'ui.riven_prompt.configure_hotkey',
  'ui.relic_rarity.common',
  'ui.relic_rarity.uncommon',
  'ui.relic_rarity.rare',
])

const removePlaceholders = (value) => String(value).replace(/\{[A-Za-z0-9_]+\}/g, '')
const wordsIn = (value) => new Set((removePlaceholders(value).toLowerCase().match(tokenPattern) || []))
const englishWords = new Set(Object.values(en.ui).flatMap((value) => [...wordsIn(value)]))
const functionWordPatternFor = (locale) => {
  const excluded = new Set(allowlist[locale]?.functionWords || [])
  const words = englishFunctionWords.filter((word) => !excluded.has(word))
  return words.length ? new RegExp(`\\b(?:${words.join('|')})\\b`, 'i') : null
}

export function findTranslationQualityIssues(locale, translated, english = en.ui, localeBaseline = new Set(baseline[locale] || []), localeAllowlist = allowlist[locale] || {}) {
  const allowedStrings = new Set(localeAllowlist.strings || [])
  const allowedWords = new Set(localeAllowlist.words || [])
  const functionWordPattern = functionWordPatternFor(locale)
  const issues = []
  for (const [key, value] of Object.entries(translated)) {
    const text = removePlaceholders(value)
    if (!text.trim() || allowedStrings.has(value) || localeBaseline.has(key)) continue
    if (latinLocales.has(locale)) {
      if (functionWordPattern?.test(text)) issues.push(`${key}: English function word in ${JSON.stringify(value)}`)
      if (english[key] && /[A-Za-z]{3,}/.test(english[key]) && value === english[key] && !localeBaseline.has(key)) {
        issues.push(`${key}: identical to English`) 
      }
      if (!localeBaseline.has(key) && (mixedLanguageCheckKeys.has(key) || mixedLanguageCheckPrefixes.some((prefix) => key.startsWith(prefix)))) {
        for (const word of wordsIn(value)) {
          if (englishWords.has(word) && !allowedWords.has(word)) {
            issues.push(`${key}: English word ${JSON.stringify(word)} in ${JSON.stringify(value)}`)
            break
          }
        }
      }
    } else if (scriptPatterns[locale] && !scriptPatterns[locale].test(text)) {
      issues.push(`${key}: no ${locale} script character in ${JSON.stringify(value)}`)
    }
  }
  return issues
}

test('complete locale translations pass the quality gate', () => {
  for (const locale of completeLocales) {
    const data = JSON.parse(fs.readFileSync(path.join(root, `${locale}.json`), 'utf8'))
    assert.deepEqual(findTranslationQualityIssues(locale, data.ui), [], `${locale}: translation quality issues`)
  }
})

test('quality gate catches the rejected German mixed-language strings', () => {
  const rejected = {
    'farming_targets.empty_detail': 'Suchen above for a Warframe, weapon, mod, or resource to Tracking starten what you need for it.',
    'farming_targets.search_placeholder': 'Hinzufügen an Gegenstand to farm...',
    'farming_targets.empty_title': 'Keine farming targets bisher',
    'farming_targets.remove_target': 'Entfernen target',
    'farming_targets.decrease_quantity': 'Verringern quantity',
    'farming_targets.min_chance_value': 'Minimum drop chance in percent',
    'farming_targets.min_chance_hidden': 'Hiding {count} drops below {percent}%',
    'farming_targets.tab_missions': 'Missions',
    'farming_targets.tab_enemies': 'Enemies',
    'farming_targets.tab_planets': 'Planets',
    'farming_targets.tab_relics': 'Relics',
    'farming_targets.tab_vendors': 'Vendors',
  }
  const issues = findTranslationQualityIssues('de', rejected, Object.fromEntries(Object.keys(rejected).map((key) => [key, key.endsWith('empty_title') ? 'No farming targets yet' : rejected[key]])), new Set())
  assert.ok(issues.length >= Object.keys(rejected).length, `expected every rejected sample to be caught, got ${issues.join('; ')}`)
})

test('quality gate catches three deliberate English leftovers in every supported Latin locale', () => {
  const rejected = {
    'farming_targets.empty_title': 'No farming targets yet',
    'farming_targets.empty_detail': 'Search above for a Warframe to track what you need.',
    'ui.riven_prompt.hint': 'The grading overlay scans the current card.',
  }
  for (const locale of ['es', 'fr', 'it', 'pt', 'pl', 'tr']) {
    const issues = findTranslationQualityIssues(locale, rejected, Object.fromEntries(Object.keys(rejected).map((key) => [key, key])), new Set())
    for (const key of Object.keys(rejected)) {
      assert.ok(issues.some((issue) => issue.startsWith(`${key}:`)), `${locale}: failed to catch English leftover in ${key}`)
    }
  }
})

test('quality gate catches three deliberate non-Cyrillic leftovers in Russian and Ukrainian', () => {
  const rejected = {
    'farming_targets.empty_title': 'No farming targets yet',
    'farming_targets.empty_detail': 'Search above for a Warframe to track what you need.',
    'ui.riven_prompt.hint': 'The grading overlay scans the current card.',
  }
  for (const locale of ['ru', 'uk']) {
    const issues = findTranslationQualityIssues(locale, rejected, Object.fromEntries(Object.keys(rejected).map((key) => [key, key])), new Set())
    for (const key of Object.keys(rejected)) {
      assert.ok(issues.some((issue) => issue.startsWith(`${key}:`)), `${locale}: failed to catch non-Cyrillic leftover in ${key}`)
    }
  }
})
