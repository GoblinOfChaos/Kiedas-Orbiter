import { BarChart3 } from 'lucide-react';

export const PREVIEW_NAV_GROUPS = [
  { id: 'today', label: 'Today' },
  { id: 'collection', label: 'Collection' },
  { id: 'planning', label: 'Planning' },
  { id: 'trading', label: 'Trading' },
  { id: 'journal-tools', label: 'Journal & Tools' },
  { id: 'application', label: 'Application' },
];

export const NAV_ITEMS = [
  { id: 'dashboard', groupId: 'today', groupOrder: 1, stableOrder: 1, icon: 'IconDashboard.png', label: 'Dashboard' },
  { id: 'prime-resurgence', groupId: 'planning', groupOrder: 4, stableOrder: 2, icon: 'BaroKiTeerFlat.png', label: 'Prime Resurgence' },
  { id: 'market', groupId: 'trading', groupOrder: 1, stableOrder: 3, icon: 'IconMarket.png', label: 'Market' },
  { id: 'inventory', groupId: 'collection', groupOrder: 1, stableOrder: 4, icon: 'IconInventory.png', label: 'Inventory' },
  { id: 'foundry', groupId: 'planning', groupOrder: 1, stableOrder: 5, icon: 'IconFoundry.png', label: 'Foundry' },
  { id: 'mods', groupId: 'collection', groupOrder: 3, stableOrder: 6, icon: 'Mods.png', label: 'Mods' },
  { id: 'rivens', groupId: 'trading', groupOrder: 2, stableOrder: 7, icon: 'IconRiven.png', label: 'Rivens' },
  { id: 'relics', groupId: 'planning', groupOrder: 2, stableOrder: 8, icon: 'IconRelic.png', label: 'Relics' },
  { id: 'relic-planner', groupId: 'planning', groupOrder: 3, stableOrder: 9, icon: 'VoidSymbol.png', label: 'Relic Planner' },
  { id: 'collectibles', groupId: 'collection', groupOrder: 5, stableOrder: 10, icon: 'GrimoireMarker.png', label: 'Collectibles' },
  { id: 'cosmetics', groupId: 'collection', groupOrder: 4, stableOrder: 11, icon: 'Appearance.png', label: 'Cosmetics, Decor, Emotes' },
  { id: 'adversaries', groupId: 'journal-tools', groupOrder: 2, stableOrder: 12, icon: 'Adversaries.png', label: 'Adversaries' },
  { id: 'mastery', groupId: 'collection', groupOrder: 2, stableOrder: 13, icon: 'IconMastery.png', label: 'Mastery' },
  { id: 'history', groupId: 'journal-tools', groupOrder: 1, stableOrder: 14, lucide: BarChart3, label: 'History' },
  { id: 'maps', groupId: 'journal-tools', groupOrder: 3, stableOrder: 15, icon: 'IconMap.png', label: 'Maps' },
  { id: 'wiki', groupId: 'journal-tools', groupOrder: 4, stableOrder: 16, icon: 'Wiki.png', label: 'Wiki' },
  { id: 'notes', groupId: 'journal-tools', groupOrder: 5, stableOrder: 17, icon: 'IconNotes.png', label: 'Notes' },
  { id: 'checklist', groupId: 'journal-tools', groupOrder: 6, stableOrder: 18, icon: 'IconChecklist.png', label: 'Checklist' },
  { id: 'settings', groupId: 'application', groupOrder: 1, stableOrder: 19, icon: 'IconSettings.png', label: 'Settings' },
  { id: 'about', groupId: 'application', groupOrder: 2, stableOrder: 20, icon: 'IconInfo.png', label: 'About' },
];

export const STABLE_NAV_ITEMS = [...NAV_ITEMS].sort((a, b) => a.stableOrder - b.stableOrder);

export const PREVIEW_GROUPED_NAV = PREVIEW_NAV_GROUPS.map((group) => ({
  ...group,
  items: NAV_ITEMS
    .filter((item) => item.groupId === group.id)
    .sort((a, b) => a.groupOrder - b.groupOrder),
}));

export const NAV_ICON_NAMES = [
  ...STABLE_NAV_ITEMS.filter((item) => item.icon).map((item) => item.icon),
  'IconKieda.png',
];

export function routeSearchText(item, translatedLabel, groupLabel) {
  return [translatedLabel, item.label, item.id.replaceAll('-', ' '), groupLabel]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}
