export const DASHBOARD_PROMOTED_CARD_IDS = ['fiss', 'baro'];

export const DASHBOARD_SECTIONS = [
  { id: 'now', titleKey: 'preview.dashboard.section_now', cardIds: ['timers', 'alerts', 'arb', 'inf', 'fiss', 'inv'] },
  { id: 'activities', titleKey: 'preview.dashboard.section_activities', cardIds: ['bounty', 'nightwave', 'sortie', 'hunt', 'arch', 'desc', 'circuit', '1999'] },
  { id: 'news', titleKey: 'preview.dashboard.section_news', cardIds: ['baro', 'event', 'deal', 'sales', 'news'] },
];

export function createDashboardViewModel({ inventoryData, notificationHistory, lastUpdate, t, farmingTargetCount = 0 }) {
  const inventoryKnown = inventoryData !== undefined && inventoryData !== null;
  // "Ready to claim" (already queued in the Foundry, build timer finished)
  // is a different thing from "ready to craft" (ingredients on hand, never
  // queued) - this widget shows the former, since that's the actionable
  // one: something is sitting done in the Foundry waiting to be picked up.
  const pendingRecipes = Array.isArray(inventoryData?.foundry) ? inventoryData.foundry : [];
  const readyToClaim = inventoryKnown
    ? pendingRecipes.filter((recipe) => recipe?.ready === true)
    : null;
  const sessionActivity = Array.isArray(notificationHistory) ? notificationHistory : [];

  return {
    targets: {
      count: farmingTargetCount,
      available: true,
    },
    foundry: {
      known: inventoryKnown,
      count: readyToClaim?.length ?? null,
      items: (readyToClaim || []).slice(0, 2).map((recipe) => ({
        id: recipe.unique_name || recipe.result_type,
        name: recipe.name || t?.('preview.dashboard.unnamed_recipe') || 'Unnamed recipe',
        image: recipe.image || '',
      })),
    },
    session: {
      count: sessionActivity.length,
      items: sessionActivity.slice(0, 3).map((entry, index) => ({
        id: `${entry.notifId || 'activity'}-${entry.timestamp || index}`,
        title: entry.title || t?.('preview.dashboard.activity_fallback') || 'Activity',
        message: entry.message || '',
        timestamp: entry.timestamp || null,
      })),
    },
    lastUpdate: lastUpdate || null,
  };
}
