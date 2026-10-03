import { toBcp47 } from './formatNumber.js';

export function formatCalendarLabel(date, locale, options) {
  return new Intl.DateTimeFormat(toBcp47(locale), options).format(date);
}

export function formatCalendarMonthKey(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();
}
