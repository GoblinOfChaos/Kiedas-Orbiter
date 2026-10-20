import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { invoke } from '../lib/logging/tauri';
import { INITIAL_WIKI_NAVIGATION, isWikiUrl, wikiNavigationReducer } from '../lib/wikiNavigation';

export { isWikiUrl };

const WikiNavigationContext = createContext({
  openWiki: (url) => {
    if (isWikiUrl(url)) invoke('open_url', { url }).catch(() => {});
  },
  pendingTarget: null,
  clearPendingTarget: () => {},
  returnTo: null,
  goBack: () => {},
  currentScreen: null,
  pendingRestore: null,
  consumeRestore: () => {}
});

export function WikiNavigationProvider({ onNavigate, currentScreen, children }) {
  const [state, dispatch] = useReducer(wikiNavigationReducer, INITIAL_WIKI_NAVIGATION);

  const openWiki = useCallback((target, origin = null) => {
    if (!isWikiUrl(target)) return;
    dispatch({ type: 'open', target, origin, currentScreen, sequence: Date.now() + Math.random() });
    onNavigate('wiki');
  }, [onNavigate, currentScreen]);

  const clearPendingTarget = useCallback(() => dispatch({ type: 'clearTarget' }), []);

  const goBack = useCallback(() => {
    if (!state.returnTo) return;
    const screen = state.returnTo.screen;
    dispatch({ type: 'back' });
    onNavigate(screen);
  }, [onNavigate, state.returnTo]);

  const consumeRestore = useCallback(() => dispatch({ type: 'consumeRestore' }), []);

  const value = useMemo(() => ({
    openWiki, clearPendingTarget, goBack, consumeRestore, currentScreen,
    pendingTarget: state.pendingTarget, returnTo: state.returnTo, pendingRestore: state.pendingRestore,
  }), [openWiki, clearPendingTarget, goBack, consumeRestore, currentScreen, state]);

  return <WikiNavigationContext.Provider value={value}>{children}</WikiNavigationContext.Provider>;
}

export function useWikiNavigation() {
  return useContext(WikiNavigationContext);
}
