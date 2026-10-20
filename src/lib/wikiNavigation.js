export function isWikiUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'wiki.warframe.com';
  } catch {
    return false;
  }
}

export const INITIAL_WIKI_NAVIGATION = { pendingTarget: null, returnTo: null, pendingRestore: null };

/**
 * Wiki links opened from an item's acquisition drawer remember where they came
 * from: `origin` is `{ label, itemKey }` (the item's name and unique name).
 * The Wiki screen shows a Back button; clicking it returns to the screen and
 * reopens the item's drawer (`pendingRestore`, read through
 * useAcquisitionDrawer, because a screen forgets its open drawer when the app
 * switches to the wiki and back).
 */
export function wikiNavigationReducer(state, action) {
  switch (action.type) {
    case 'open': {
      if (!isWikiUrl(action.target)) return state;
      const fromScreen = action.currentScreen && action.currentScreen !== 'wiki' ? action.currentScreen : null;
      return {
        ...state,
        pendingTarget: { url: action.target, sequence: action.sequence },
        returnTo: fromScreen
          ? { screen: fromScreen, label: action.origin?.label || null, itemKey: action.origin?.itemKey || null }
          : state.returnTo,
      };
    }
    case 'clearTarget':
      return { ...state, pendingTarget: null };
    case 'back': {
      if (!state.returnTo) return state;
      const { screen, itemKey } = state.returnTo;
      return { ...state, returnTo: null, pendingRestore: itemKey ? { screen, itemKey } : null };
    }
    case 'consumeRestore':
      return { ...state, pendingRestore: null };
    default:
      return state;
  }
}
