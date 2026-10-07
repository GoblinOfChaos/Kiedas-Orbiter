import { warn as logWarn } from './logging/logger.js';

const ENGLISH_FALLBACKS = {
  'app.scanner_title': 'Scanner',
  'app.scanner_hooked_message': 'Log scanner hooked into Warframe',
};

// i18n.js uses Vite's import.meta.glob, which only exists in a Vite bundle. It is
// imported dynamically (not at the top) so this module can still be loaded by plain
// Node tests; in the app the import resolves normally.
let getLocaleSync = () => null;
// Start loading the synchronous fallback before the scanner can emit its first event.
import('./i18n.js')
  .then((i18n) => {
    getLocaleSync = i18n.getLocaleSync;
    return i18n.loadLocale('en');
  })
  .catch((error) => {
    logWarn('i18n.locale_load_failed', {}, { error });
  });

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
