import { toBcp47 } from './formatNumber.js';
import calendarLanguage from '../../src-tauri/data/assets/data/calendar-language.json' with { type: 'json' };

const CALENDAR_LANGUAGE_ROOT = '/Lotus/Language/1999/';

/** Remove the markup used by the game's calendar strings. */
export function cleanGameText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\|[^|]*\|/g, ' ')
    .replace(/\\r?\\n|\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calendarLeaf(path) {
  return typeof path === 'string' ? path.split('/').filter(Boolean).at(-1) || '' : '';
}

/** Read a game string with the active-locale -> English fallback. */
export function getCalendarLanguageText(path, suffix, locale = 'en', source = calendarLanguage) {
  const leaf = calendarLeaf(path);
  if (!leaf || !source?.locales) return '';
  const key = `${CALENDAR_LANGUAGE_ROOT}${leaf}${suffix}`;
  const localized = source.locales[locale]?.[key];
  if (typeof localized === 'string' && localized) return cleanGameText(localized);
  const english = source.locales.en?.[key];
  return typeof english === 'string' && english ? cleanGameText(english) : '';
}

export function getCalendarUpgradeTypeLabel(locale = 'en', major = false, fallback = '') {
  const suffix = major ? 'CalendarUpgrades_PopupMajorLabel' : 'CalendarUpgrades_PopupMinorLabel';
  const key = `${CALENDAR_LANGUAGE_ROOT}${suffix}`;
  const localized = calendarLanguage.locales?.[locale]?.[key];
  if (typeof localized === 'string' && localized) return cleanGameText(localized);
  const english = calendarLanguage.locales?.en?.[key];
  if (typeof english === 'string' && english) return cleanGameText(english);
  return fallback;
}

export function formatCalendarLabel(date, locale, options) {
  return new Intl.DateTimeFormat(toBcp47(locale), options).format(date);
}

export function formatCalendarMonthKey(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();
}
