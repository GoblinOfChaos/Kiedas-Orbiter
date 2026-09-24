import { createContext, useCallback, useContext, useState } from 'react';

const WikiNavigationContext = createContext({ openWiki: () => {}, pendingTarget: null });

export function isWikiUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'wiki.warframe.com';
  } catch {
    return false;
  }
}

export function WikiNavigationProvider({ onNavigate, children }) {
  const [pendingTarget, setPendingTarget] = useState(null);
  const openWiki = useCallback((target) => {
    if (!isWikiUrl(target)) return;
    setPendingTarget({ url: target, sequence: Date.now() + Math.random() });
    onNavigate('wiki');
  }, [onNavigate]);

  return <WikiNavigationContext.Provider value={{ openWiki, pendingTarget }}>{children}</WikiNavigationContext.Provider>;
}

export function useWikiNavigation() {
  return useContext(WikiNavigationContext);
}
