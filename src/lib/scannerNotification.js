import { getLocaleSync, loadLocale } from './i18n.js';

const ENGLISH_FALLBACKS = {
  'app.scanner_title': 'Scanner',
  'app.scanner_hooked_message': 'Log scanner hooked into Warframe',
};

// Start loading the synchronous fallback before the scanner can emit its first event.
void loadLocale('en');

function translatedScannerText(getT, key) {
  const translated = getT(key);
  if (translated !== key) return translated;
  return getLocaleSync('en')?.ui?.[key] ?? ENGLISH_FALLBACKS[key];
}

export function buildScannerHookedNotification(getT) {
  return {
    title: translatedScannerText(getT, 'app.scanner_title'),
    message: translatedScannerText(getT, 'app.scanner_hooked_message'),
    image: '',
    position: 'top-right',
    no_focus: true,
    silent: true,
  };
}
