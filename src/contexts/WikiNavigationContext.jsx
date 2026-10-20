import { createContext, useCallback, useContext, useState } from 'react';
import { invoke } from '../lib/logging/tauri';

export function isWikiUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'wiki.warframe.com';
  } catch {
    return false;
  }
}

const WikiNavigationContext = createContext({
  openWiki: (url) => {
    if (isWikiUrl(url)) invoke('open_url', { url }).catch(() => {});
  },
  pendingTarget: null,
  clearPendingTarget: () => {},
  returnScreen: null,
  goBack: () => {}
});

export function WikiNavigationProvider({ onNavigate, currentScreen, children }) {
  const [pendingTarget, setPendingTarget] = useState(null);
  // The screen the wiki was opened from (e.g. Inventory from an item drawer),
  // so the Wiki screen can offer a way back to it.
  const [returnScreen, setReturnScreen] = useState(null);
  const openWiki = useCallback((target) => {
    if (!isWikiUrl(target)) return;
    setPendingTarget({ url: target, sequence: Date.now() + Math.random() });
    if (currentScreen && currentScreen !== 'wiki') setReturnScreen(currentScreen);
    onNavigate('wiki');
  }, [onNavigate, currentScreen]);
  const clearPendingTarget = useCallback(() => setPendingTarget(null), []);
  const goBack = useCallback(() => {
    if (!returnScreen) return;
    const screen = returnScreen;
    setReturnScreen(null);
    onNavigate(screen);
  }, [onNavigate, returnScreen]);

  return <WikiNavigationContext.Provider value={{ openWiki, pendingTarget, clearPendingTarget, returnScreen, goBack }}>{children}</WikiNavigationContext.Provider>;
}

export function useWikiNavigation() {
  return useContext(WikiNavigationContext);
}
