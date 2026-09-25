/**
 * Inventory.jsx
 *
 * Displays the user's full collection of items, including equipment, mods,
 * arcanes and resources.  Provides categorised tabs and multi-column
 * filtering (e.g., "Owned + Unmastered").
 */
import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useUi } from '../contexts/UiContext'
import { Search, Filter, ArrowUpDown, Check, Box, Zap, Gem, X, Layers, LayoutGrid, List } from 'lucide-react';
import { PageLayout, Card, Input, Button, Tabs, MonitorState, Tooltip } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import ItemImage from '../components/ItemImage';
import { convertFileSrc, invoke } from '../lib/logging/tauri';
import { getAcquisitionInfo } from '../lib/acquisitionInfo';
import { loadAcquisitionData } from '../lib/acquisitionData';
import AcquisitionDrawer, { useAcquisitionDrawer, formatChance } from '../components/AcquisitionDrawer';
import PreviewAcquisitionDrawer from '../preview/acquisition/PreviewAcquisitionDrawer';
import ModCard from '../components/ModCard';
import { getRelicCatalog } from '../lib/relicParser';
import { getSetting } from '../lib/settings';
import { ensureWfmItems, lookupWfmItem } from '../lib/wfmCache';
import { formatNumber } from '../lib/formatNumber';
import { IS_PREVIEW } from '../lib/buildProfile';
import PreviewInventoryLayout from '../components/PreviewInventoryLayout';
import { categoryDisplayLabel } from '../lib/categoryLabels';
import { sortByChanceDesc, sortSourcesByChanceInRotations } from '../lib/chanceSort';
import { instrumentScroll, event as logEvent } from '../lib/logging/logger';




const COL_GAP = 16;
const WINDOW_OVERSCAN_ROWS = 3;

// Branch 1: Prime Parts (grouped sets view - 1 col on mobile, 2 col on lg)
const SETS_ROW_STRIDE = 320;

// Branch 2: Ayatan sculptures (2 col mobile, 3 col md, 4 col lg)
// Cards have fixed h-32 = 128px + 16px gap
const AYATAN_CARD_HEIGHT = 128;
const AYATAN_ROW_STRIDE = AYATAN_CARD_HEIGHT + COL_GAP; // 144

// Branch 3: General items
// List view row stride (matches Mods.jsx LIST_ROW_STRIDE: 52px card + 6px gap-1.5)
const LIST_ROW_STRIDE = 58;

// Arcanes in grid view: ModCard with width={200} -> height = 200 / (290 / 409) = 282px + 16px gap = 298px
const ARCANE_CARD_WIDTH = 200;
const ARCANE_CARD_HEIGHT = ARCANE_CARD_WIDTH / (290 / 409);
const ARCANE_ROW_STRIDE = Math.round(ARCANE_CARD_HEIGHT) + COL_GAP; // 298

// General grid cards: min-h-40 (160px) + py-3 + borders ~168px + 16px gap = 184px
const GENERAL_CARD_MIN_WIDTH = 280;
const GENERAL_CARD_HEIGHT = 168;
const GENERAL_ROW_STRIDE = GENERAL_CARD_HEIGHT + COL_GAP; // 184

function sortMissionRotationGroups(sources) {
  return sortSourcesByChanceInRotations(sources);
}

const modBgMap = {
  'Normal Common': 'BronzeBackground.png',
  'Normal Uncommon': 'SilverBackground.png',
  'Normal Rare': 'GoldBackground.png',
  'Normal Legendary': 'LegendaryBackground.png',
  'Galvanized': 'GalvanizedBackground.png',
  'Riven': 'SilverBackground.png',
  'Amalgam': 'AmalgamBackground.png',
  'Peculiar': 'LegendaryBackground.png',
  'Plexus Common': 'BronzeBackground.png',
  'Plexus Uncommon': 'SilverBackground.png',
  'Plexus Rare': 'GoldBackground.png',
  'Archon': 'Background.png',
  'Requiem': 'Background.png',
  'Antivirus': 'Background.png',
  'Potency': 'Background.png',
  'Tome': 'Background.png'
};
const modFrameTopMap = {
  'Normal Common': 'BronzeFrameTop.png',
  'Normal Uncommon': 'SilverFrameTop.png',
  'Normal Rare': 'GoldFrameTop.png',
  'Normal Legendary': 'LegendaryFrameTop.png',
  'Galvanized': 'GalvanizedFrameTop.png',
  'Riven': 'RivenFrameTop.png',
  'Amalgam': 'AmalgamFrameTop.png',
  'Peculiar': 'PeculiarFrameTop.png',
  'Plexus Common': 'AvionicModsFrameTopBronze.png',
  'Plexus Uncommon': 'AvionicModsFrameTopSilver.png',
  'Plexus Rare': 'AvionicModsFrameTopGold.png',
  'Archon': null,
  'Requiem': null,
  'Antivirus': null,
  'Potency': null,
  'Tektolyst': null,
  'Tome': null
};
const modFrameBotMap = {
  'Normal Common': 'BronzeFrameBottom.png',
  'Normal Uncommon': 'SilverFrameBottom.png',
  'Normal Rare': 'GoldFrameBottom.png',
  'Normal Legendary': 'LegendaryFrameBottom.png',
  'Galvanized': 'GalvanizedFrameBottom.png',
  'Riven': 'RivenFrameBottom.png',
  'Amalgam': 'AmalgamFrameBottom.png',
  'Peculiar': 'PeculiarFrameBottom.png',
  'Plexus Common': 'AvionicModsFrameBottomBronze.png',
  'Plexus Uncommon': 'AvionicModsFrameBottomSilver.png',
  'Plexus Rare': 'AvionicModsFrameBottomGold.png',
  'Archon': null,
  'Requiem': null,
  'Antivirus': null,
  'Potency': null,
  'Tektolyst': null,
  'Tome': null
};

export default function Inventory() {
  const { t, locale } = useUi()
  const INVENTORY_TABS = [
  { id: 'all', label: t('ui.inventory.tab_all') },
  { id: 'warframes', label: t('ui.inventory.tab_warframes') },
  { id: 'weapons', label: t('ui.inventory.tab_weapons') },
  { id: 'companions', label: t('ui.inventory.tab_companions') },
  { id: 'companion_weapons', label: t('ui.inventory.tab_companion_weapons') },
  { id: 'archweapons', label: t('ui.inventory.tab_archweapons') },
  { id: 'vehicles', label: t('ui.inventory.tab_vehicles') },
  { id: 'amps', label: t('ui.inventory.tab_amps') },
  { id: 'arcanes', label: t('ui.inventory.tab_arcanes') },
  { id: 'peely_pix', label: t('ui.inventory.tab_peely_pix') },
  { id: 'consumables', label: t('ui.inventory.tab_consumables') },
  { id: 'landing_craft', label: t('ui.inventory.tab_landing_craft') },
  { id: 'resources', label: t('ui.inventory.tab_resources') },
  { id: 'prime_parts', label: t('ui.inventory.tab_prime_parts') },
  ...(IS_PREVIEW ? [{ id: 'parts', label: t('ui.inventory.tab_parts') || 'Parts' }] : []),
  { id: 'ayatan', label: t('ui.inventory.tab_ayatan') }];


  const FILTER_CONFIG = {
    all: ['owned', 'mastered'],
    warframes: ['owned', 'mastered', 'subsumed', 'prime'],
    weapons: ['owned', 'mastered', 'prime', 'primary', 'secondary', 'melee', 'incarnon'],
    companions: ['owned', 'mastered'],
    companion_weapons: ['owned', 'mastered'],
    archweapons: ['owned', 'mastered'],
    vehicles: ['owned', 'mastered', 'archwing', 'kdrive', 'necramech'],
    amps: ['owned', 'mastered'],
    arcanes: ['owned'],
    peely_pix: ['owned'],
    consumables: ['owned'],
    landing_craft: ['owned'],
    mods: ['owned'],
    prime_parts: ['owned', 'mastered', 'vaulted'],
    parts: ['owned'],
    resources: ['owned'],
    ayatan: ['socketed']
  };

  const TRIPLE_FILTERS = new Set(['owned', 'mastered', 'subsumed', 'socketed', 'prime', 'vaulted']);
  const NEG_LABELS = {
    owned: t('ui.inventory.filter_owned'),
    mastered: t('ui.inventory.filter_mastered'),
    subsumed: t('ui.inventory.filter_subsumed'),
    socketed: t('ui.inventory.filter_socketed'),
    prime: t('ui.inventory.filter_prime'),
    vaulted: t('relics.vaulted')
  };
  // Preview-only. NEG_LABELS above is left untouched because Stable's
  // unmodified cycling-button code path still reads it - it was never a true
  // "negative state" label (owned/mastered/etc all resolve to their positive
  // word), which was invisible as a bug in a single button showing one label
  // at a time, but became "ALL MASTERED MASTERED" once the three-button
  // version put both states on screen simultaneously. These are the actual
  // distinct negative-state words.
  const TRIPLE_NEG_LABELS = {
    mastered: t('ui.inventory.unmastered'),
    subsumed: t('ui.inventory.filter_subsumed_no'),
    socketed: t('ui.inventory.filter_socketed_no'),
    prime: t('ui.inventory.filter_prime_no'),
    vaulted: t('ui.inventory.filter_vaulted_no')
  };
  // Mutually-exclusive sub-type filters were previously rendered as independent
  // cycling toggles, so a user could select e.g. Primary AND Secondary at once
  // even though a weapon is only ever one type. Grouped here into single
  // segmented controls (All/Primary/Secondary/Melee, All/Archwing/K-Drive/Necramech)
  // instead. The underlying per-key filter predicates (filteredItems, above) are
  // unchanged - only the control shape and the fact that selecting one member
  // clears its siblings changes.
  const FILTER_GROUPS = { primary: 'weapon_type', secondary: 'weapon_type', melee: 'weapon_type', archwing: 'vehicle_type', kdrive: 'vehicle_type', necramech: 'vehicle_type' };

  const SORT_CONFIG = {
    all: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'xp', label: t('ui.inventory.sort_xp') }],
    warframes: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'xp', label: t('ui.inventory.sort_xp') }],
    weapons: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'xp', label: t('ui.inventory.sort_xp') }],
    companions: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'xp', label: t('ui.inventory.sort_xp') }],
    companion_weapons: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'xp', label: t('ui.inventory.sort_xp') }],
    archweapons: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'xp', label: t('ui.inventory.sort_xp') }],
    vehicles: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'xp', label: t('ui.inventory.sort_xp') }],
    amps: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'xp', label: t('ui.inventory.sort_xp') }],
    arcanes: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'quantity', label: t('ui.inventory.sort_count') }, { id: 'rank', label: t('ui.inventory.sort_rank') }],
    peely_pix: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'quantity', label: t('ui.inventory.sort_count') }],
    consumables: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'quantity', label: t('ui.inventory.sort_count') }],
    landing_craft: [{ id: 'name', label: t('ui.inventory.sort_name') }],
    mods: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'quantity', label: t('ui.inventory.sort_count') }, { id: 'rank', label: t('ui.inventory.sort_rank') }],
    prime_parts: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'completion', label: t('ui.inventory.sort_completion') }, { id: 'value', label: t('ui.inventory.sort_value') }],
    parts: [{ id: 'name', label: t('ui.inventory.sort_name') }],
    resources: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'quantity', label: t('ui.inventory.sort_count') }],
    ayatan: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'quantity', label: t('ui.inventory.sort_count') }]
  };
  const { inventoryData, exportData, isInventoryLoading, allPrices, isPriceLoading, priceFetchProgress, dropIndex, recipeResultIndex, exaltedWeaponIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, relicStateIndex, exportVendorIndex, ExportImages, ExportTextIcons, cardImagesPath, exportComponentIndex } = useMonitoring();
  const [acquisitionOverrides, setAcquisitionOverrides] = useState(null);
  useEffect(() => {
    invoke('read_file_bytes', { relative: 'data/assets/data/acquisition_overrides.json' })
      .then((bytes) => setAcquisitionOverrides(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
      .catch(() => setAcquisitionOverrides({ components: {}, mods: {} }));
  }, []);
  const { openKey, toggle, close } = useAcquisitionDrawer();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unvaultedRewards = useMemo(() => {
    if (!exportData) return new Set();
    const catalog = getRelicCatalog(exportData);
    const set = new Set();
    for (const relic of catalog) {
      if (!relic.vaulted) {
        for (const reward of (relic.rewards || [])) {
          if (reward.uniqueName) set.add(reward.uniqueName);
          if (reward.name) set.add(reward.name.toLowerCase());
        }
      }
    }
    return set;
  }, [exportData]);
  const [showFilterSortPanel, setShowFilterSortPanel] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});
  const [sortCriteria, setSortCriteria] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const pageScrollRef = useRef(null);
  const [virtualRoot, setVirtualRoot] = useState(null);
  const [windowMetrics, setWindowMetrics] = useState({
    scrollTop: 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    columns: 1,
  });
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingDebounceRef = useRef(null);
  // Preview-only. Applies to the generic item branch only (12 of 15
  // categories) - Prime Parts and Ayatan keep their existing bespoke
  // layouts regardless of this, and Arcanes keeps rendering via the shared
  // ModCard component in both modes rather than a custom list row for it.
  const [viewMode, setViewMode] = useState('grid');
  const [framesPath, setFramesPath] = useState('');
  const [uiPath, setUiPath] = useState('');
  const [iconsPath, setIconsPath] = useState('');
  useEffect(() => {invoke('get_mod_frames_path').then((p) => setFramesPath(p)).catch(() => {});}, []);
  useEffect(() => {invoke('get_ui_path').then((p) => setUiPath(p)).catch(() => {});}, []);
  useEffect(() => {invoke('get_icons_path').then((p) => setIconsPath(p)).catch(() => {});}, []);

  useEffect(() => {
    pageScrollRef.current?.scrollTo({ top: 0 });
    setWindowMetrics((prev) => (prev.scrollTop === 0 ? prev : { ...prev, scrollTop: 0 }));
  }, [activeTab, searchQuery, currentFilters, sortCriteria, sortDirection, viewMode]);

  const handleImgError = useCallback((e) => {
    if (e.target.dataset.wfFallback === 'true') return;
    e.target.dataset.wfFallback = 'true';
    const src = e.target.src;
    if (!src || !src.startsWith('asset-cache://browse.wf')) return;
    const iconPath = src.replace('asset-cache://browse.wf', '').replace(/\/\//g, '/');
    const entry = ExportImages?.[iconPath];
    if (entry?.contentHash) {
      e.target.src = `asset-cache://content.warframe.com/PublicExport${iconPath}!${entry.contentHash}`;
    }
  }, [ExportImages]);

  // Same second-source retry as handleImgError, in the form ItemImage takes:
  // returns the replacement URL instead of mutating the <img> element.
  const resolveImgFallback = useCallback((src) => {
    if (!src || !src.startsWith('asset-cache://browse.wf')) return null;
    const iconPath = src.replace('asset-cache://browse.wf', '').replace(/\/\//g, '/');
    const entry = ExportImages?.[iconPath];
    return entry?.contentHash
      ? `asset-cache://content.warframe.com/PublicExport${iconPath}!${entry.contentHash}`
      : null;
  }, [ExportImages]);

  const [sellStatusMap, setSellStatusMap] = useState({});
  const sellingRef = useRef(new Set());

  const handleSellOnWfm = useCallback(async (e, item) => {
    e.stopPropagation();
    const itemKey = item.unique_name || item.uniqueName || item.name;
    // sellStatusMap was tracked but never used to guard re-entry or disable
    // the button - a double-click or a slow network response let a second
    // invocation fire while the first was still in flight, posting two
    // separate real listings on Warframe.Market for one intended click. A
    // ref (rather than adding sellStatusMap to this callback's deps) keeps
    // the check synchronous and avoids recreating this callback on every
    // status change across the whole list.
    if (sellingRef.current.has(itemKey)) return;
    sellingRef.current.add(itemKey);
    try {
      setSellStatusMap(prev => ({ ...prev, [itemKey]: "loading" }));
      const wfmToken = await getSetting("wfm_token");
      if (!wfmToken) {
        alert("Please set your Warframe.Market API Token in Settings first.");
        setSellStatusMap(prev => ({ ...prev, [itemKey]: "error" }));
        return;
      }

      const wfmMap = await ensureWfmItems();
      const targetPath = item.unique_name || item.uniqueName || item.item_path || item.name;
      const wfmItem = lookupWfmItem(wfmMap, targetPath);

      if (!wfmItem || !wfmItem.id) {
        alert(`Could not find Warframe.Market item ID for ${item.name || targetPath}`);
        setSellStatusMap(prev => ({ ...prev, [itemKey]: "error" }));
        return;
      }

      const platPrice = Math.max(1, Math.round(item._value || 1));
      await invoke("post_market_order", {
        token: wfmToken,
        itemId: wfmItem.id,
        platPrice: platPrice,
        quantity: 1,
        rank: null
      });

      setSellStatusMap(prev => ({ ...prev, [itemKey]: "success" }));
      setTimeout(() => {
        setSellStatusMap(prev => {
          const next = { ...prev };
          delete next[itemKey];
          return next;
        });
      }, 3000);
    } catch (err) {
      console.error("Failed to place market order:", err);
      alert(`Warframe.Market error: ${err}`);
      setSellStatusMap(prev => ({ ...prev, [itemKey]: "error" }));
    } finally {
      sellingRef.current.delete(itemKey);
    }
  }, []);

  const primePrices = (activeTab === 'prime_parts') ? allPrices : null;

  const tabItems = useMemo(() => {
    if (!inventoryData) return [];
    const canonicalItemPath = (value) => value?.replace('/StoreItems/', '/') || value;
    const imageByUniqueName = new Map();
    const imageByName = new Map();
    for (const item of inventoryData.all ?? []) {
      if (item?.image && item.unique_name) {
        const key = canonicalItemPath(item.unique_name);
        if (!imageByUniqueName.has(key)) imageByUniqueName.set(key, item.image);
      }
      if (item?.image && item.name) {
        const key = item.name.trim().toLowerCase();
        if (!imageByName.has(key)) imageByName.set(key, item.image);
      }
    }
    const withImageFallback = (items) => (items ?? []).map((item) => {
      if (item?.image) return item;
      const image = imageByUniqueName.get(canonicalItemPath(item?.unique_name))
        || imageByName.get(item?.name?.trim().toLowerCase());
      return image ? { ...item, image } : item;
    });
    if (activeTab === 'prime_junk') {
      return (inventoryData.prime_parts ?? []).filter(p => p.quantity > 0 && p.ducats > 0).map(p => {
        const _value = primePrices?.[p.unique_name] ?? 0;
        const _ratio = p.ducats > 0 ? _value / p.ducats : 0;
        return { ...p, _value, _ratio };
      });
    }
    if (activeTab === 'prime_parts') {
      const searchArrays = [
      inventoryData.warframes, inventoryData.primary, inventoryData.secondary,
      inventoryData.melee, inventoryData.sentinels, inventoryData.beasts,
      inventoryData.moas, inventoryData.hounds, inventoryData.archwings,
      inventoryData.necramechs, inventoryData.amps];

      const nameToEquipment = new Map();
      for (const arr of searchArrays) {
        for (const item of arr) {
          nameToEquipment.set(item.name, item);
        }
      }
      return Object.values(inventoryData.primeSets ?? {}).map((set) => {
        const parent = nameToEquipment.get(set.name) ?? nameToEquipment.get(set.name + ' Prime') ?? {};
        const _value = primePrices?.[set.setPath] ?? (set.parts ?? []).reduce((s, p) => s + (primePrices?.[p.unique_name] ?? 0) * (p.need ?? 1), 0);
        const isVaulted = !(set.parts ?? []).some((p) => unvaultedRewards.has(p.unique_name) || unvaultedRewards.has(p.name?.toLowerCase()));
        return { ...set, image: set.image || parent.image, owned: parent.owned ?? false, mastered: parent.mastered ?? false, vaulted: isVaulted, _value };
      }).filter((set) =>
      // A fully-crafted set's blueprint/components are consumed (quantity 0
      // on every part), so ownership must also be checked via the finished
      // item itself - filtering on leftover part quantity alone drops every
      // completed set from the tab despite genuine ownership.
      set.owned || set.parts.some((p) => p.quantity > 0)
      );
    }
    if (activeTab === 'vehicles') {
      const vehicles = inventoryData.vehicles ?? [];
      const necramechs = (inventoryData.necramechs ?? []).map((n) => ({ ...n, is_necramech: true }));
      return withImageFallback([...vehicles, ...necramechs]);
    }
    if (activeTab === 'ayatan') {
      const ALL_SCULPTURES = [
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexA', name: 'Ayatan Sah Sculpture', amber: 1, cyan: 2, filledEndo: 1500, baseEndo: 300 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexB', name: 'Ayatan Ayr Sculpture', amber: 0, cyan: 3, filledEndo: 1425, baseEndo: 325 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexC', name: 'Ayatan Orta Sculpture', amber: 1, cyan: 3, filledEndo: 2700, baseEndo: 650 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexD', name: 'Ayatan Vaya Sculpture', amber: 1, cyan: 2, filledEndo: 1800, baseEndo: 400 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexE', name: 'Ayatan Piv Sculpture', amber: 1, cyan: 2, filledEndo: 1725, baseEndo: 375 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexF', name: 'Ayatan Anasa Sculpture', amber: 2, cyan: 2, filledEndo: 3450, baseEndo: 2000 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexG', name: 'Ayatan Valana Sculpture', amber: 1, cyan: 2, filledEndo: 1575, baseEndo: 325 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexH', name: 'Ayatan Zambuka Sculpture', amber: 1, cyan: 2, filledEndo: 2600, baseEndo: 450 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexI', name: 'Ayatan Chattraka Sculpture', amber: 1, cyan: 2, filledEndo: 2600, baseEndo: 450 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexJ', name: 'Ayatan Hemakara Sculpture', amber: 1, cyan: 2, filledEndo: 2600, baseEndo: 450 },
      { key: '/Lotus/Types/Items/FusionTreasures/OroFusexEntrati', name: 'Ayatan Kitha Sculpture', amber: 1, cyan: 4, filledEndo: 3000, baseEndo: 450 }];

      const optimalEndo = Math.max(...ALL_SCULPTURES.map((s) => s.filledEndo));
      const leaf = (path) => path.split('/').pop();
      const grouped = {};
      for (const ft of inventoryData.fusionTreasures ?? []) {
        const key = ft.ItemType;
        if (!grouped[key]) grouped[key] = { ItemCount: 0, Sockets: 0 };
        grouped[key].ItemCount += ft.ItemCount ?? 1;
        grouped[key].Sockets += ft.Sockets ?? 0;
      }
      const amberTotal = inventoryData.amberStarCount ?? 0;
      const cyanTotal = inventoryData.cyanStarCount ?? 0;
      const sculpturesWithCount = ALL_SCULPTURES.map((s) => ({ ...s, quantity: grouped[s.key]?.ItemCount ?? 0 }));
      const sortedByGain = [...sculpturesWithCount].sort((a, b) => {
        const gainA = a.filledEndo - a.baseEndo;
        const gainB = b.filledEndo - b.baseEndo;
        const effA = a.amber > 0 ? gainA / a.amber : gainA / 0.5;
        const effB = b.amber > 0 ? gainB / b.amber : gainB / 0.5;
        return effB - effA;
      });
      let remAmber = amberTotal,remCyan = cyanTotal;
      let maxEndoFromFill = 0;
      const fillBreakdown = [];
      for (const s of sortedByGain) {
        const maxByAmber = s.amber > 0 ? Math.floor(remAmber / s.amber) : Infinity;
        const maxByCyan = s.cyan > 0 ? Math.floor(remCyan / s.cyan) : Infinity;
        const canFill = Math.min(s.quantity, maxByAmber, maxByCyan);
        if (canFill > 0) {
          maxEndoFromFill += canFill * s.filledEndo;
          remAmber -= canFill * s.amber;
          remCyan -= canFill * s.cyan;
          fillBreakdown.push({ name: s.name.replace('Ayatan ', '').replace(' Sculpture', ''), count: canFill });
        }
      }
      const maxEndoTotal = maxEndoFromFill + remAmber * 100 + remCyan * 50;
      const fillSummary = fillBreakdown.map((f) => `${f.count}× ${f.name}`).join(', ');
      const items = [
      {
        unique_name: 'stars', name: 'Ayatan Stars',
        image: '',
        category: 'ayatan', isStars: true, owned: true,
        amberCount: amberTotal,
        cyanCount: cyanTotal,
        maxEndoTotal,
        fillSummary
      },
      ...ALL_SCULPTURES.map((s) => {
        const g = grouped[s.key];
        const imgFile = `${leaf(s.key)}.png`;
        return {
          unique_name: s.key,
          name: s.name,
          image: uiPath ? convertFileSrc(`${uiPath}/${imgFile}`) : '',
          category: 'ayatan',
          quantity: g?.ItemCount ?? 0,
          sockets: g?.Sockets ?? 0,
          owned: (g?.ItemCount ?? 0) > 0,
          amberSlots: s.amber,
          cyanSlots: s.cyan,
          filledEndo: s.filledEndo,
          isOptimal: s.filledEndo === optimalEndo
        };
      })];

      return items;
    }
    if (activeTab === 'peely_pix') {
      return withImageFallback(inventoryData.peely_pix ?? []);
    }
    if (activeTab === 'arcanes') return withImageFallback(inventoryData.arcanes_catalog ?? []);
    if (activeTab === 'consumables') return withImageFallback(inventoryData.consumables_catalog ?? []);
    if (activeTab === 'landing_craft') return withImageFallback(inventoryData.landing_craft_catalog ?? []);
    if (activeTab === 'parts') return withImageFallback(inventoryData.parts ?? []);
    if (activeTab === 'all') return withImageFallback((inventoryData.all ?? []).filter((i) => i.category !== 'rivens' && i.category !== 'Arcanes'));
    return withImageFallback(inventoryData[activeTab] ?? []);
  }, [inventoryData, activeTab, uiPath, primePrices]);

  const filteredItems = useMemo(() => {
    let items = tabItems;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
      items = items.filter((item) => {
        const itemName = (item.name ?? '').toLowerCase();
        const components = (item.components ?? []).map((c) => c.toLowerCase());
        const parentName = (item.parent_name ?? '').toLowerCase();

        // Match if ALL search words exist somewhere in either the name OR components
        return q.every((word) =>
          itemName.includes(word) || parentName.includes(word) || components.some((c) => c.includes(word))
        );
      });
    }
    const filterKeys = FILTER_CONFIG[activeTab] ?? [];
    const hasActiveFilter = filterKeys.some((f) => currentFilters[f] !== undefined);
    if (hasActiveFilter) {
      items = items.filter((item) => {
        for (const f of filterKeys) {
          const state = currentFilters[f];
          if (state === undefined) continue;
          if (state === 'yes') {
            if (f === 'owned' && !item.owned) return false;
            if (f === 'mastered' && !item.mastered) return false;
            if (f === 'subsumed' && !item.subsumed) return false;
            if (f === 'incarnon' && !item.is_incarnon) return false;
            if (f === 'primary' && item.weapon_type !== 'primary') return false;
            if (f === 'secondary' && item.weapon_type !== 'secondary') return false;
            if (f === 'melee' && item.weapon_type !== 'melee') return false;
            if (f === 'archwing' && item.vehicle_type !== 'archwing') return false;
            if (f === 'kdrive' && item.vehicle_type !== 'kdrive') return false;
            if (f === 'necramech' && !item.is_necramech) return false;
            if (f === 'prime' && !item.is_prime) return false;
            if (f === 'socketed' && item.sockets <= 0) return false;
            if (f === 'vaulted' && !item.vaulted) return false;
          } else if (state === 'no') {
            if (f === 'owned' && item.owned) return false;
            if (f === 'mastered' && item.mastered) return false;
            if (f === 'subsumed' && item.subsumed) return false;
            if (f === 'prime' && item.is_prime) return false;
            if (f === 'socketed' && item.sockets > 0) return false;
            if (f === 'vaulted' && item.vaulted) return false;
          }
        }
        return true;
      });
    }
    items = [...items].sort((a, b) => {
      // Ayatan stars card always first
      if (a.isStars) return -1;
      if (b.isStars) return 1;
      if (activeTab === 'parts') {
        const parentCompare = (a.parent_name ?? '').localeCompare(b.parent_name ?? '', undefined, { sensitivity: 'base' });
        if (parentCompare !== 0) return sortDirection === 'asc' ? parentCompare : -parentCompare;
        const partCompare = (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? partCompare : -partCompare;
      }
      // Special handling for prime_parts completion sort
      if (activeTab === 'prime_parts' && sortCriteria === 'completion') {
        const aComplete = (a.ownedCount ?? 0) / (a.totalCount ?? 1);
        const bComplete = (b.ownedCount ?? 0) / (b.totalCount ?? 1);
        return sortDirection === 'asc' ? aComplete - bComplete : bComplete - aComplete;
      }
      if (activeTab === 'prime_junk' && sortCriteria === 'ratio') {
        const aVal = a._ratio ?? 0;
        const bVal = b._ratio ?? 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (activeTab === 'prime_junk' && sortCriteria === 'value') {
        const aVal = a._value ?? 0;
        const bVal = b._value ?? 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (activeTab === 'prime_parts' && sortCriteria === 'value') {
        const aVal = a._value ?? 0;
        const bVal = b._value ?? 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      let av = a[sortCriteria] ?? '';let bv = b[sortCriteria] ?? '';
      if (typeof av === 'boolean') av = av ? 1 : 0;
      if (typeof bv === 'boolean') bv = bv ? 1 : 0;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDirection === 'asc' ? av < bv ? -1 : av > bv ? 1 : 0 : av < bv ? 1 : av > bv ? -1 : 0;
    });
    return items;
  }, [tabItems, searchQuery, currentFilters, activeTab, sortCriteria, sortDirection]);

  // Diagnostic (2026-09-24, Narin missing-from-search report): records what the
  // search/filter pipeline actually produced so the app log shows it.
  useEffect(() => {
    if (!searchQuery) return;
    logEvent('inventory.search.result', {
      query: searchQuery,
      tab: activeTab,
      tab_items: tabItems.length,
      filtered_items: filteredItems.length,
      first_names: filteredItems.slice(0, 3).map((i) => i.name),
    }, { level: 'info', screen: 'inventory' });
  }, [searchQuery, activeTab, tabItems, filteredItems]);

  const isPrimeParts = activeTab === 'prime_parts';
  const isAyatan = activeTab === 'ayatan';
  const isListView = IS_PREVIEW && viewMode === 'list' && activeTab !== 'arcanes';
  const isArcanes = activeTab === 'arcanes';

  const rowStride = isPrimeParts
    ? SETS_ROW_STRIDE
    : isAyatan
    ? AYATAN_ROW_STRIDE
    : isListView
    ? LIST_ROW_STRIDE
    : isArcanes
    ? ARCANE_ROW_STRIDE
    : GENERAL_ROW_STRIDE;

  // The page scroll area is shared with the header controls, so measure the
  // virtual content's position inside that owner rather than adding a nested
  // scrolling region. Each branch has known geometry, which makes a native row
  // window sufficient without a virtualizer dependency.
  useEffect(() => {
    const container = pageScrollRef.current;
    if (!container || !virtualRoot) return;

    // Virtualization removes the previous anchor candidate and moves the
    // replacement window as firstRow changes. Letting the browser compensate
    // for that DOM change adjusts scrollTop underneath the window calculation,
    // which presents as an upward snap-back after a stutter. This is scoped to
    // Inventory so other scroll containers keep their existing behavior.
    const previousOverflowAnchor = container.style.overflowAnchor;
    container.style.overflowAnchor = 'none';

    let baseOffset = 0;

    const computeColumns = () => {
      const isLg = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true;
      const isMd = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true;
      return isPrimeParts
        ? (isLg ? 2 : 1)
        : isAyatan
        ? (isLg ? 4 : isMd ? 3 : 2)
        : isListView
        ? 1
        : Math.max(1, Math.floor((virtualRoot.clientWidth + COL_GAP) / (GENERAL_CARD_MIN_WIDTH + COL_GAP)));
    };

    const applyScrollTop = (columns) => {
      const scrollTop = Math.max(0, container.scrollTop - baseOffset);
      setWindowMetrics((previous) => {
        const next = { scrollTop, viewportHeight: container.clientHeight, columns: columns ?? previous.columns };
        return previous.scrollTop === next.scrollTop &&
          previous.viewportHeight === next.viewportHeight &&
          previous.columns === next.columns
          ? previous
          : next;
      });
    };

    // getBoundingClientRect() forces a synchronous layout reflow. Calling it
    // on every native scroll event (which fires far more often than once per
    // frame under real trackpad/mouse momentum, and rAF itself runs at a low,
    // irregular rate in this WebKitGTK build) let reflows pile up on the main
    // thread, stalling the windowed content for a beat while the
    // (compositor-driven) native scroll position kept moving, then jumping
    // once the backlog cleared. The container/virtualRoot offset only
    // actually changes on resize (rare), so it's calibrated there; every
    // scroll tick just reads container.scrollTop, a cheap property that
    // doesn't force layout.
    const calibrate = () => {
      const rootRect = virtualRoot.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      baseOffset = container.scrollTop - (containerRect.top - rootRect.top);
      applyScrollTop(computeColumns());
    };
    let resizeTimer = null;
    const scheduleCalibration = () => {
      if (resizeTimer !== null) return;
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        calibrate();
      }, 50);
    };

    // Rows aren't memoized, so every accepted state update re-renders every
    // currently-windowed card (~40-50 of them) from scratch. Native scroll
    // can fire far more often than that render can keep up with under real
    // trackpad/mouse momentum, so throttle actual state updates themselves
    // (not just the read) to keep React's render rate bounded. Plain
    // setTimeout, not requestAnimationFrame - rAF turned out to run at a low,
    // irregular rate in this WebKitGTK build and made things worse. A
    // trailing call guarantees the final scroll position always lands.
    const THROTTLE_MS = 50;
    let lastRun = 0;
    let trailingTimer = null;
    const onScroll = () => {
      setIsScrolling(true);
      if (scrollingDebounceRef.current !== null) clearTimeout(scrollingDebounceRef.current);
      scrollingDebounceRef.current = setTimeout(() => {
        scrollingDebounceRef.current = null;
        setIsScrolling(false);
      }, 150);

      const now = Date.now();
      const elapsed = now - lastRun;
      if (elapsed >= THROTTLE_MS) {
        lastRun = now;
        applyScrollTop();
      } else if (trailingTimer === null) {
        trailingTimer = setTimeout(() => {
          trailingTimer = null;
          lastRun = Date.now();
          applyScrollTop();
        }, THROTTLE_MS - elapsed);
      }
    };

    calibrate();
    const observer = new ResizeObserver(scheduleCalibration);
    observer.observe(container);
    observer.observe(virtualRoot);
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (trailingTimer !== null) clearTimeout(trailingTimer);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      if (scrollingDebounceRef.current !== null) clearTimeout(scrollingDebounceRef.current);
      scrollingDebounceRef.current = null;
      setIsScrolling(false);
      observer.disconnect();
      container.removeEventListener('scroll', onScroll);
      container.style.overflowAnchor = previousOverflowAnchor;
    };
  }, [virtualRoot, activeTab, viewMode, isPrimeParts, isAyatan, isListView]);

  useEffect(() => {
    const container = pageScrollRef.current;
    return container ? instrumentScroll(container, 'inventory.page', { interval: 250 }) : undefined;
  }, [activeTab, viewMode]);

  const isLgCurrent = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true;
  const isMdCurrent = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true;

  const currentColumns = isPrimeParts
    ? (isLgCurrent ? 2 : 1)
    : isAyatan
    ? (isLgCurrent ? 4 : isMdCurrent ? 3 : 2)
    : isListView
    ? 1
    : windowMetrics.columns > 1
    ? windowMetrics.columns
    : Math.max(1, Math.floor(((virtualRoot?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200)) + COL_GAP) / (GENERAL_CARD_MIN_WIDTH + COL_GAP)));

  const rowCount = Math.ceil(filteredItems.length / currentColumns);
  const firstRow = Math.max(0, Math.floor(windowMetrics.scrollTop / rowStride) - WINDOW_OVERSCAN_ROWS);
  const lastRow = Math.min(rowCount, Math.ceil((windowMetrics.scrollTop + windowMetrics.viewportHeight) / rowStride) + WINDOW_OVERSCAN_ROWS);
  const windowedItems = filteredItems.slice(firstRow * currentColumns, lastRow * currentColumns);

  // Diagnostic only (temporary): the browser's Long Tasks API produced zero
  // entries during a real reported stutter, so it appears unsupported in
  // this WebKitGTK build. This logs the actual gap between commits at full
  // resolution instead - useLayoutEffect fires right after the DOM mutates,
  // before paint, so the gap between consecutive firings is the real commit
  // cadence during scroll, not a sampled approximation.
  const renderTimingRef = useRef(null);
  useLayoutEffect(() => {
    const now = performance.now();
    const prev = renderTimingRef.current;
    renderTimingRef.current = now;
    if (prev !== null) {
      const gapMs = now - prev;
      logEvent('inventory.render.commit', {
        gap_ms: Math.round(gapMs),
        visible_items: windowedItems.length,
        first_row: firstRow,
        last_row: lastRow,
        scroll_top: Math.round(windowMetrics.scrollTop),
      }, { level: gapMs > 100 ? 'warn' : 'trace', screen: 'inventory' });
    }
  });

  const openItem = useMemo(() => {
    if (!openKey) return null;
    // Look up against filteredItems, not the paginated visibleItems - visibleItems
    // gets a new array reference every ~300ms while background pagination is
    // running (see the effect above), which was making this memo (and the
    // getAcquisitionInfo() call inside it) recompute on every pagination tick
    // while the drawer was open, causing the acquisition drawer to rapidly
    // flicker between its loading/resolved states.
    const item = filteredItems.find((it) => it.unique_name === openKey);
    if (!item) return null;
    // Relics are grouped under a synthetic display key (e.g. "Meso N17"),
    // not a real DE path - real_unique_name carries the actual path needed
    // to resolve vaulted status and drop sources. See inventoryParser.js.
    const lookupKey = item.real_unique_name || item.unique_name;
    return {
      uniqueName: item.unique_name,
      displayName: item.name,
      image: item.image,
      category: categoryDisplayLabel(item.category, t),
      owned: item.owned,
      info: getAcquisitionInfo(lookupKey, item.name, dropIndex, acquisitionOverrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex),
    };
  }, [openKey, filteredItems, dropIndex, acquisitionOverrides, recipeResultIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, relicStateIndex, exportVendorIndex, exportComponentIndex, t]);

  const modBg = useCallback((mf, item) => {
    if (!framesPath) return '';
    if (mf === 'Tektolyst') {
      const modName = item?.name;
      if (modName) {
        const src = convertFileSrc(`${framesPath}/${mf}/${modName.replace(/\s+/g, '')}.png`);
        return src;
      }
      return '';
    }
    return framesPath && modBgMap[mf] ? convertFileSrc(`${framesPath}/${mf}/${modBgMap[mf]}`) : '';
  }, [framesPath]);
  const modFrameTop = useCallback((mf) => framesPath && modFrameTopMap[mf] ? convertFileSrc(`${framesPath}/${mf}/${modFrameTopMap[mf]}`) : '', [framesPath]);
  const modFrameBot = useCallback((mf) => framesPath && modFrameBotMap[mf] ? convertFileSrc(`${framesPath}/${mf}/${modFrameBotMap[mf]}`) : '', [framesPath]);
  const isModFrame = useCallback((item) => item.category === 'mods' && framesPath && (modBgMap[item.modFrame] || item.modFrame === 'Tektolyst'), [framesPath]);

  const tabLabel = INVENTORY_TABS.find((t) => t.id === activeTab)?.label ?? activeTab;

  // Preview-only persistent category sidebar (wide widths). Independent of
  // renderHeaderPanel's horizontal Tabs strip (still the compact/narrow-width
  // selector) - a small duplication of the icon-resolution logic rather than
  // sharing it, so this stays isolated from the already-verified header code.
  const renderCategoryNavigator = () =>
  <nav
    className="hidden lg:flex flex-col gap-1 w-48 flex-shrink-0 overflow-y-auto py-1"
    style={{ scrollbarWidth: 'thin' }}
    aria-label={t('screen.inventory')}>
    {INVENTORY_TABS.map((tab) => {
      const iconMap = { all: 'All', warframes: 'Warframe', weapons: 'Primary', companions: 'Companion', companion_weapons: 'Sentinels', archweapons: 'Archgun', vehicles: 'Vehicles', amps: 'Amps', arcanes: 'Arcanes', peely_pix: 'Mods', consumables: 'Resources', landing_craft: 'Vehicles', resources: 'Resources', prime_parts: 'PrimeParts', ayatan: 'Ayatan' };
      const iconName = iconMap[tab.id] || tab.label;
      const peelyPackPath = '/Lotus/Interface/Icons/StoreIcons/Resources/1999Wf/StickerPack.png';
      const peelyPackHash = ExportImages?.[peelyPackPath]?.contentHash;
      const icon = tab.id === 'peely_pix'
        ? peelyPackHash
          ? `asset-cache://content.warframe.com/PublicExport${peelyPackPath}!${peelyPackHash}`
          : `asset-cache://browse.wf${peelyPackPath}`
        : iconsPath ? convertFileSrc(`${iconsPath}/Categories/${iconName}.png`) : null;
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => { setActiveTab(tab.id); setCurrentFilters({}); setSortCriteria('name'); setSortDirection('asc'); }}
          aria-current={isActive ? 'page' : undefined}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-tight text-left transition-all whitespace-nowrap ${
          isActive ?
          'bg-kronos-accent text-kronos-bg' :
          'text-kronos-dim hover:text-white hover:bg-white/5'}`
          }>
          {icon && <img src={icon} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
          <span className="truncate min-w-0 flex-1">{tab.label}</span>
        </button>
      );
    })}
  </nav>;

  const renderHeaderPanel = () =>
  <div className="flex flex-col gap-4">
      {/* Preview-only: flex-wrap so the search field is never squeezed to
          near-zero width by the filter/sort blocks at narrow content widths -
          they now drop to their own row instead ("clipped search controls"
          from live review). Stable keeps its exact original non-wrapping row
          unchanged. */}
      <div className={`flex items-center gap-3 ${IS_PREVIEW ? 'flex-wrap' : ''}`}>
        {/* Search Bar. Below `lg`, forced to its own full-width row
            (basis-full) instead of sharing the wrap group with the filter/
            sort/view buttons - mixing a flex-1 search bar into the same
            wrap group as several button clusters produced confusing,
            order-dependent splits (search+sort+view on one line, filters
            alone on the next) rather than a clean, predictable wrap. */}
        <div className={`relative flex-1 group ${IS_PREVIEW ? 'min-w-[200px] basis-full lg:basis-0' : ''}`}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input
          placeholder={t('ui.inventory.search_placeholder', { tab: tabLabel })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 bg-black/20 border-white/5 focus:bg-black/40 h-[42px]" />

        </div>

        {/* Filters + Sort + View grouped into one shared wrapping unit so they
            move together at narrow widths, instead of each block wrapping
            independently and scattering onto separate lines (Filters landing
            top-right, Sort alone bottom-left, View alone below that). Uses
            `display: contents` for Stable so this wrapper is fully
            transparent to layout there - zero visual change, same flat
            sibling structure as before. */}
        <div className={IS_PREVIEW ? 'flex items-center gap-3 flex-wrap' : 'contents'}>
        {/* Filter Tags In-line */}
        {(FILTER_CONFIG[activeTab] ?? []).length > 0 &&
      <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
            <Filter size={14} className="text-kronos-dim mx-1" />
            <div className="flex gap-1">
              {(() => {
            const keys = FILTER_CONFIG[activeTab] ?? [];
            const renderedGroups = new Set();
            return keys.map((f) => {
            if (f === 'owned') {
              // All/Owned/Unowned as three directly-clickable buttons, matching
              // the ownership filter on every other screen (Mods, Foundry,
              // Relics, RelicPlanner, Cosmetics) - this one used to be a
              // single button cycling through the three states instead.
              const ownedState = currentFilters.owned;
              return (
                <div key="owned" className="flex gap-1">
                  {[
                  { id: undefined, label: t('ui.inventory.tab_all') },
                  { id: 'yes', label: t('ui.inventory.filter_owned') },
                  { id: 'no', label: t('ui.inventory.unowned') }].
                  map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setCurrentFilters((prev) => {
                        if (opt.id === undefined) { const { owned: _, ...rest } = prev; return rest; }
                        return { ...prev, owned: opt.id };
                      })}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                      ownedState === opt.id ?
                      'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' :
                      'text-kronos-dim hover:text-white hover:bg-white/5'}`
                      }>
                      {opt.label}
                    </button>
                  ))}
                </div>
              );
            }
            if (!IS_PREVIEW) {
              // Stable: exact original behavior, unchanged - every non-owned
              // filter is one button cycling off -> yes -> (no, if triple) ->
              // off. The uniform segmented/three-button/checkbox treatment
              // below is Preview-only until separately approved as a Stable
              // correction.
              const state = currentFilters[f];
              const isTriple = TRIPLE_FILTERS.has(f);
              const label = state === 'no' ? NEG_LABELS[f] ?? f.replace(/_/g, ' ') : f.replace(/_/g, ' ');
              return (
                <button
                  key={f}
                  onClick={() => {
                    setCurrentFilters((prev) => {
                      if (prev[f] === undefined) return { ...prev, [f]: 'yes' };
                      if (prev[f] === 'yes' && isTriple) return { ...prev, [f]: 'no' };
                      const { [f]: _, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                  state === 'yes' ?
                  'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' :
                  state === 'no' ?
                  'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(255,0,0,0.15)]' :
                  'text-kronos-dim hover:text-white hover:bg-white/5'}`
                  }>
                  {label}
                </button>);
            }
            const groupId = FILTER_GROUPS[f];
            if (groupId) {
              if (renderedGroups.has(groupId)) return null;
              renderedGroups.add(groupId);
              const members = keys.filter((k) => FILTER_GROUPS[k] === groupId);
              const activeMember = members.find((m) => currentFilters[m] === 'yes');
              return (
                <div key={groupId} className="flex gap-1">
                  {[{ id: undefined, label: t('ui.inventory.tab_all') }, ...members.map((m) => ({ id: m, label: m.replace(/_/g, ' ') }))].
                  map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setCurrentFilters((prev) => {
                        const rest = { ...prev };
                        members.forEach((m) => { delete rest[m]; });
                        if (opt.id !== undefined) rest[opt.id] = 'yes';
                        return rest;
                      })}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                      (opt.id === undefined ? !activeMember : activeMember === opt.id) ?
                      'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' :
                      'text-kronos-dim hover:text-white hover:bg-white/5'}`
                      }>
                      {opt.label}
                    </button>
                  ))}
                </div>
              );
            }
            const state = currentFilters[f];
            const isTriple = TRIPLE_FILTERS.has(f);
            if (isTriple) {
              // Same All/Positive/Negative three-button pattern as `owned`,
              // for uniformity - this used to be a single button that cycled
              // through the three states with no visible indication a third
              // state existed.
              return (
                <div key={f} className="flex gap-1">
                  {[
                  { id: undefined, label: t('ui.inventory.tab_all') },
                  { id: 'yes', label: f.replace(/_/g, ' ') },
                  { id: 'no', label: TRIPLE_NEG_LABELS[f] ?? f.replace(/_/g, ' ') }].
                  map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setCurrentFilters((prev) => {
                        if (opt.id === undefined) { const { [f]: _, ...rest } = prev; return rest; }
                        return { ...prev, [f]: opt.id };
                      })}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                      state === opt.id ?
                      'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' :
                      'text-kronos-dim hover:text-white hover:bg-white/5'}`
                      }>
                      {opt.label}
                    </button>
                  ))}
                </div>
              );
            }
            // Independent boolean (currently only `incarnon`) - a real
            // checkbox rather than a highlight-button, since it can combine
            // freely with other active filters instead of being exclusive.
            return (
              <button
                key={f}
                role="checkbox"
                aria-checked={state === 'yes'}
                onClick={() => {
                  setCurrentFilters((prev) => {
                    if (prev[f] === 'yes') { const { [f]: _, ...rest } = prev; return rest; }
                    return { ...prev, [f]: 'yes' };
                  });
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${
                state === 'yes' ?
                'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' :
                'text-kronos-dim hover:text-white hover:bg-white/5'}`
                }>
                <span className={`w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 ${state === 'yes' ? 'bg-kronos-bg border-kronos-bg' : 'border-current'}`}>
                  {state === 'yes' && <Check size={9} strokeWidth={3.5} className="text-kronos-accent" />}
                </span>
                {f.replace(/_/g, ' ')}
              </button>);

          });
          })()}
            </div>
          </div>
      }

        {/* Sort Controls In-line */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
          <ArrowUpDown size={12} className="text-kronos-accent mx-1" />
          <div className="flex gap-1">
            {(SORT_CONFIG[activeTab] ?? []).map((c) => {
            const isActive = sortCriteria === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (isActive) {
                    setSortDirection((prev) => prev === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortCriteria(c.id);
                    setSortDirection('asc');
                  }
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${isActive ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>
                
                  {c.label}
                  {isActive && <ArrowUpDown size={10} className={sortDirection === 'desc' ? 'rotate-180' : ''} />}
                </button>);

          })}
          </div>
        </div>

        {/* View selector - Preview-only, and only meaningful for the generic
            item grid (Prime Parts and Ayatan keep their own bespoke layout
            regardless of this control). */}
        {IS_PREVIEW && activeTab !== 'prime_parts' && activeTab !== 'ayatan' &&
        <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-1.5">
            {[{ id: 'grid', Icon: LayoutGrid, label: t('ui.inventory.view_grid') }, { id: 'list', Icon: List, label: t('ui.inventory.view_list') }].map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                aria-pressed={viewMode === id}
                title={label}
                className={`p-1.5 rounded-lg transition-all ${viewMode === id ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        }
        </div>
      </div>

      {/* Category Tabs */}
      {(() => {
        const categoryTabs = (
          <Tabs tabs={INVENTORY_TABS.map((t) => {
          const iconMap = { all: 'All', warframes: 'Warframe', weapons: 'Primary', companions: 'Companion', companion_weapons: 'Sentinels', archweapons: 'Archgun', vehicles: 'Vehicles', amps: 'Amps', arcanes: 'Arcanes', peely_pix: 'Mods', consumables: 'Resources', landing_craft: 'Vehicles', resources: 'Resources', prime_parts: 'PrimeParts', parts: 'Resources', ayatan: 'Ayatan' };
          const iconName = iconMap[t.id] || t.label;
          const peelyPackPath = '/Lotus/Interface/Icons/StoreIcons/Resources/1999Wf/StickerPack.png';
          const peelyPackHash = ExportImages?.[peelyPackPath]?.contentHash;
          const icon = t.id === 'peely_pix'
            ? peelyPackHash
              ? `asset-cache://content.warframe.com/PublicExport${peelyPackPath}!${peelyPackHash}`
              : `asset-cache://browse.wf${peelyPackPath}`
            : iconsPath ? convertFileSrc(`${iconsPath}/Categories/${iconName}.png`) : null;
          return { ...t, icon };
        })} activeTab={activeTab} onChange={(id) => {setActiveTab(id);setCurrentFilters({});setSortCriteria('name');setSortDirection('asc');}} />
        );
        // Preview-only: explicit overflow-x plus a visible thin scrollbar (the
        // default browser scrollbar for a plain overflow-x-auto row was
        // effectively invisible on some platforms, leaving no indication
        // there was more to scroll to). `lg:hidden` because the category
        // sidebar takes over as the primary selector at that width - this
        // strip was left visible at all widths by mistake initially, so both
        // selectors showed simultaneously. Stable renders the bare Tabs
        // element with no extra wrapping node, exactly as before.
        return IS_PREVIEW
          ? <div className="overflow-x-auto lg:hidden" style={{ scrollbarWidth: 'thin' }}>{categoryTabs}</div>
          : categoryTabs;
      })()}
    </div>;


  const headerStats = renderHeaderStats(inventoryData, iconsPath, t, locale);
  const headerPanel = renderHeaderPanel();
  // Extracted into a variable (rather than left inline in the return
  // statement) so the Preview-only category-navigator sidebar can wrap it
  // without duplicating this ~500-line block into two near-identical
  // branches - one wrapped, one not. No content or behavior changed by
  // this extraction; it is the exact same JSX that was previously written
  // directly inside <PageLayout>.
  const mainContent = (
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        {inventoryData === undefined ?
        <MonitorState isLoading className="py-20" /> :
        inventoryData === null ?
        <MonitorState className="py-20" /> :

        filteredItems.length === 0 ?
        <div className="text-center py-20 text-kronos-dim">{t('inventory.no_items_found')} {tabLabel}.</div> :
        activeTab === 'prime_parts' ?
        <>
              {priceFetchProgress &&
          <div className="flex items-center gap-2 pb-2 px-1">
                  <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[10px] font-black uppercase text-kronos-accent">{t('inventory.fetching_plat')} {priceFetchProgress.current}{t('inventory.fetching_of')}{priceFetchProgress.total}...</span>
                </div>
          }
              {isPriceLoading && !priceFetchProgress &&
          <div className="flex items-center gap-2 pb-2 px-1">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-kronos-accent">{t('ui.inventory.fetching_prices')}</span>
                </div>
          }
              <div ref={setVirtualRoot} className="relative pb-4" style={{ height: `${rowCount * rowStride}px` }}>
                <div
                  className="absolute inset-x-0 grid grid-cols-1 lg:grid-cols-2 gap-4"
                  style={{ top: `${firstRow * rowStride}px` }}
                >
                  {windowedItems.map((set, idx) => {
              const isParentOwned = set.owned;
              const isParentMastered = set.mastered;

              // Match the per-cell "met" check below exactly: an unbuilt spare
              // blueprint in stock (quantity) doesn't satisfy the parent
              // recipe's requirement for an actually-crafted component - only
              // count it via quantity when there's no crafted concept at all
              // (a plain resource part, where crafted is undefined). The old
              // formula counted crafted+quantity together, so this aggregate
              // badge could say "complete" while the grid right below it
              // showed the same part red/unmet.
              const partsMet = set.parts.filter((p) => (p.crafted !== undefined ? p.crafted >= (p.need ?? 1) : p.quantity >= (p.need ?? 1))).length;
              // Denominator must be a part-type count to match partsMet's units - summing
              // `need` here (e.g. Afuris Barrel needing 2) would make a fully-met set read
              // as <100% since partsMet only counts met *types*, not quantities.
              const totalNeeded = set.parts.length;
              const completion = Math.min(100, partsMet / totalNeeded * 100);
              const isComplete = partsMet >= set.parts.length;
              const bpPart = set.parts.find((p) => p.isBlueprint);
              const bpCount = bpPart?.quantity ?? 0;
              const setsPossible = bpCount > 0 && isComplete ? bpCount : 0;
              const setValue = primePrices?.[set.setPath] ?? set.parts.reduce((sum, p) => sum + (primePrices?.[p.unique_name] ?? 0) * (p.need ?? 1), 0);

              return (
                <div key={`${set.name}_${firstRow * currentColumns + idx}`} className={`relative rounded-xl border border-white/5 overflow-hidden flex flex-col bg-kronos-panel/20 ${isComplete ? 'border-green-500/30' : ''}`}>
                      {isPriceLoading ?
                  <span className="absolute top-4 right-4 z-10 inline-block w-6 h-3 bg-white/10 rounded animate-pulse" /> :
                  setValue > 0 &&
                  <span className="absolute top-4 right-4 z-10 text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">{setValue}p</span>
                  }
                      {/* Header: image + name + badges */}
                      <div className={`flex items-center gap-4 px-4 py-5 border-b border-white/5 relative ${isComplete ? 'bg-green-500/5' : ''}`}>
                        <div className="w-28 h-28 flex items-center justify-center flex-shrink-0">
                          <ItemImage src={set.image} alt="" className="max-w-full max-h-full object-contain" placeholderClassName="w-14 h-14 rounded bg-white/5" resolveFallbackSrc={resolveImgFallback} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <p className="text-xl font-black text-kronos-text uppercase whitespace-normal leading-tight">{set.name}{t('inventory.set')}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded inline-block ${isComplete ? 'bg-green-500/20 text-green-400' : 'bg-kronos-accent/20 text-kronos-accent'}`}>
                                  {setsPossible > 0 ? t(setsPossible > 1 ? 'ui.inventory.set_plural' : 'ui.inventory.set_singular', { count: setsPossible }) : t('ui.inventory.parts_progress', { met: partsMet, total: totalNeeded, pct: Math.round(completion) })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {/* Owned Status */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isParentOwned ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider">{isParentOwned ? t('ui.inventory.filter_owned') : t('ui.inventory.unowned')}</span>
                            </div>

                            {/* Mastery Status */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isParentMastered ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider">{isParentMastered ? t('ui.inventory.filter_mastered') : t('ui.inventory.unmastered')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Parts grid */}
                      {(() => {
                    return (
                      <div className="grid gap-px border-t border-white/5" style={{ gridTemplateColumns: `repeat(${Math.min(set.parts.length, 6)}, 1fr)` }}>
                            {set.parts.map((part, pi) => {
                          const need = part.need ?? 1;
                          const met = part.crafted !== undefined ? part.crafted >= need : part.quantity >= need;
                          const isBlueprint = part.isBlueprint;
                          const partPrice = primePrices?.[part.unique_name] ?? 0;
                          const partNorm = part.unique_name ? part.unique_name.replace('/StoreItems/', '/') : '';
                          const partSourcesRaw = dropIndex?.[partNorm] || dropIndex?.['display:' + (part.name || '').toLowerCase().trim()] || [];
                          const partDedupKey = (s) => {
                            if (s.type === 'relic') return 'r:' + (s.relicName || s.relicManifest);
                            if (s.type === 'enemy') return 'e:' + s.enemyName;
                            return 'o:' + s.type;
                          };
                          const partSeen = {};
                          const partSources = sortSourcesByChanceInRotations(partSourcesRaw).filter((s) => {const k = partDedupKey(s);if (partSeen[k]) return false;partSeen[k] = true;return true;});
                          const hasPartSources = partSources.length > 0;
                          const partCell =
                          <div className={`flex flex-col items-center justify-center gap-1.5 p-3 h-full ${met ? 'bg-green-500/5' : 'bg-black/20'} relative`}>
                                  {part.need > 1 &&
                            <span className="absolute top-1 left-1 text-[14px] font-black text-kronos-accent px-1.5 py-0.5 rounded leading-none z-10">×{part.need}</span>
                            }
                                  {isPriceLoading ?
                            <span className="absolute top-2 right-2 z-10 animate-pulse bg-white/10 rounded w-4 h-2" /> :
                            partPrice > 0 &&
                            <span className="absolute top-2 right-2 z-10 text-[9px] font-bold px-1 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">{partPrice}p</span>
                            }
                                  <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 relative">
                                    <ItemImage src={part.image} alt="" className="max-w-full max-h-full object-contain" placeholderClassName="w-7 h-7 rounded bg-white/5" resolveFallbackSrc={resolveImgFallback} />
                                    {isBlueprint && <img src={uiPath ? convertFileSrc(`${uiPath}/BlueprintOverlay.png`) : ''} alt="" className="absolute inset-0 w-full h-full object-contain" />}
                                  </div>
                                  <p className="text-[12px] font-medium text-kronos-dim text-center leading-tight w-full px-1 truncate">{part.name.split(' ').slice(-1)[0]}</p>
                                  {part.crafted !== undefined ?
                            (part.crafted > 0 || part.quantity > 0) &&
                            <span className={`text-[10px] font-black ${met ? 'text-green-400' : 'text-red-400'}`}>{part.crafted} crafted ({part.quantity}{t('ui.relic_reward.bp')}{part.quantity > 1 ? 's' : ''})</span> :

                            part.quantity > 0 &&
                            <span className={`text-[10px] font-black ${met ? 'text-green-400' : 'text-red-400'}`}>{part.quantity}</span>
                            }
                                  {hasPartSources &&
                            <Tooltip
                              position="bottom"
                              content={
                              <div className="max-w-[260px] max-h-[200px] overflow-y-auto space-y-1">
                                          <p className="text-[9px] font-black uppercase text-kronos-accent">{t('ui.inventory.drop_sources')}</p>
                                          {partSources.filter((s) => s.type === 'relic').slice(0, 6).map((s, si) =>
                                <p key={`r-${si}`} className="text-[9px] text-kronos-text leading-tight">{s.relicName || s.relicManifest} ({s.rarity ? s.rarity.charAt(0).toUpperCase() + s.rarity.slice(1).toLowerCase() : ''})</p>
                                )}
                                          {partSources.filter((s) => s.type === 'enemy').slice(0, 3).map((s, si) =>
                                <p key={`e-${si}`} className="text-[9px] text-kronos-text leading-tight">{s.enemyName}{s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? formatChance(s.chance) : `${s.chance}%`}</span> : ''}</p>
                                )}
                                        </div>
                              }>
                              
                                      <span className="text-[8px] font-black uppercase text-kronos-dim/50 cursor-help hover:text-kronos-accent transition-colors leading-none">{t('ui.inventory.sources')}

                              </span>
                                    </Tooltip>
                            }
                                </div>;

                          return <div key={pi}>{partCell}</div>;
                        })}
                          </div>);

                  })()}
                    </div>);

            })}
                </div>
              </div>
            </> :
        activeTab === 'ayatan' ?
        <div ref={setVirtualRoot} className="relative pb-4" style={{ height: `${rowCount * rowStride}px` }}>
          <div
            className="absolute inset-x-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            style={{ top: `${firstRow * rowStride}px` }}
          >
              {windowedItems.map((item, idx) => {
            if (item.isStars) {
              const starImg = (name) => uiPath ? convertFileSrc(`${uiPath}/${name}.png`) : '';
              return (
                <div key="stars" className="group relative rounded-xl border border-white/5 overflow-hidden bg-gradient-to-br from-yellow-500/5 to-cyan-500/5 h-32 cursor-default">
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 transition-opacity duration-200 group-hover:opacity-0">
                        <div className="flex gap-6 items-center">
                          <div className="flex flex-col items-center gap-1">
                            <img src={starImg('OroFusexOrnamentB')} className="w-8 h-8 object-contain" alt="" />
                            <span className="text-sm font-black text-yellow-400">{formatNumber(item.amberCount, locale)}</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <img src={starImg('OroFusexOrnamentA')} className="w-8 h-8 object-contain" alt="" />
                            <span className="text-sm font-black text-cyan-400">{formatNumber(item.cyanCount, locale)}</span>
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-kronos-dim uppercase tracking-widest">{t('ui.inventory.ayatan_stars')}</p>
                        <p className="text-xs font-black text-kronos-text text-center">{t('inventory.endo_max', { n: formatNumber(item.maxEndoTotal, locale) })}</p>
                      </div>
                      {item.fillSummary &&
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                          <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest mb-2">{t('ui.inventory.optimal_fill_order')}</p>
                          <p className="text-xs font-medium text-kronos-text text-center leading-relaxed">{item.fillSummary}</p>
                        </div>
                  }
                    </div>);

            }
            return (
              <div key={`${item.unique_name}_${firstRow * currentColumns + idx}`} onClick={() => toggle(item.unique_name)} className={`relative rounded-xl border overflow-hidden bg-kronos-panel/20 flex items-stretch h-32 cursor-pointer ${item.quantity > 0 ? 'border-white/5' : 'border-white/5 border-dashed opacity-60'}`}>
                    {item.isOptimal &&
                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-yellow-500 text-black text-[9px] font-black uppercase tracking-wider rounded shadow-lg">{t('ui.inventory.optimal')}

                </div>
                }
                    <div className="w-24 flex-shrink-0 flex items-center justify-center p-3">
                      {item.image ?
                  <ItemImage src={item.image} alt="" className="max-w-full max-h-full object-contain" placeholderClassName="w-12 h-12 rounded-lg" resolveFallbackSrc={resolveImgFallback} /> :

                  <div className="w-12 h-12 flex items-center justify-center bg-kronos-panel/30 rounded-lg">
                          <img src={uiPath ? convertFileSrc(`${uiPath}/Ayatan.png`) : ''} alt="" className="max-w-[60%] max-h-[60%] object-contain opacity-30" />
                        </div>
                  }
                    </div>
                    <div className="flex flex-col justify-center gap-1 py-3 pr-4 min-w-0 flex-1">
                      <p className="text-sm font-black text-kronos-text uppercase leading-tight whitespace-normal">{item.name.replace('Ayatan ', '').replace(' Sculpture', '')}</p>
                      <p className="text-base font-bold text-kronos-text leading-tight">{item.quantity > 0 ? `×${item.quantity}` : t('ui.inventory.none_owned')}</p>
                      <p className={`text-[11px] font-black ${item.sockets > 0 ? 'text-green-400' : 'text-kronos-dim'}`}>
                        {t('inventory.sockets_filled', { n: item.sockets })} · {formatNumber(item.quantity * item.filledEndo, locale)} {t('inventory.endo')}
                  </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {Array.from({ length: item.amberSlots }).map((_, i) =>
                    <img key={`a-${i}`} src={uiPath ? convertFileSrc(`${uiPath}/OroFusexOrnamentB.png`) : ''} className="w-4 h-4 object-contain" alt="" />
                    )}
                        {Array.from({ length: item.cyanSlots }).map((_, i) =>
                    <img key={`c-${i}`} src={uiPath ? convertFileSrc(`${uiPath}/OroFusexOrnamentA.png`) : ''} className="w-4 h-4 object-contain" alt="" />
                    )}
                      </div>
                    </div>
                  </div>);

          })}
            </div>
        </div> :

        <div ref={setVirtualRoot} className="relative pb-4" style={{ height: `${rowCount * rowStride}px` }}>
          <div
            className={isListView ? 'absolute inset-x-0 flex flex-col gap-1.5' : 'absolute inset-x-0 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4'}
            style={{ top: `${firstRow * rowStride}px` }}
          >
              {windowedItems.map((item, idx) => {
            const isUnowned = !item.owned;
            const isPrimePart = item.category === 'prime_parts';
            const isModOrResource = ['mods', 'resources', 'components', 'parts', 'Arcanes', 'arcanes', 'peely_pix', 'consumables', 'landing_craft'].includes(item.category);
            if (activeTab === 'arcanes') {
              return (
                <div key={`${item.unique_name}_${firstRow * currentColumns + idx}`} className={`relative cursor-pointer flex justify-center rounded-xl ${isUnowned ? 'grayscale opacity-60' : ''}`} onClick={() => toggle(item.unique_name)}>
                  <ModCard
                    mod={item}
                    framesPath={framesPath}
                    iconsPath={iconsPath}
                    cardImagesPath={cardImagesPath}
                    width={200}
                    exportTextIcons={ExportTextIcons}
                    pricesLoading={false} />
                </div>
              );
            }
            // Preview-only dense list row: same underlying item, a single-line
            // alternative to the wide Card below for faster side-by-side
            // comparison (name, rank/mastery/quantity status in one row).
            if (IS_PREVIEW && viewMode === 'list') {
              return (
                <Card key={`${item.unique_name}_${firstRow * currentColumns + idx}`} glow={!isUnowned} onClick={() => toggle(item.unique_name)} className={`relative p-0 overflow-hidden flex items-center gap-3 px-3 py-2 cursor-pointer transition-all ${isUnowned ? 'bg-kronos-panel/10 border-2 border-dashed border-kronos-accent' : 'border-kronos-panel/40'}`}>
                  <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-kronos-panel/30 rounded">
                    {item.image && <ItemImage src={item.image} alt="" className={`max-w-full max-h-full object-contain ${isUnowned ? 'grayscale opacity-40' : ''}`} placeholderClassName="w-6 h-6" loading="lazy" resolveFallbackSrc={resolveImgFallback} />}
                  </div>
                  <span className="text-[9px] font-black text-kronos-accent uppercase tracking-widest w-24 flex-shrink-0 truncate">
                    {item.category === 'mods' ? item.rarity || t('inventory.category_mod') : item.weapon_type || item.vehicle_type || (isPrimePart ? t('inventory.category_prime_part') : categoryDisplayLabel(item.category, t))}
                  </span>
                  <h4 className="font-bold text-xs uppercase text-kronos-text truncate flex-1 min-w-0">{item.name}</h4>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!isUnowned && item.rank !== undefined && item.max_rank !== undefined && item.max_rank > 0 &&
                      <span className={`text-[10px] font-black uppercase ${item.rank === item.max_rank ? 'text-blue-400' : 'text-kronos-dim'}`}>R{item.rank}/{item.max_rank}</span>
                    }
                    {!isModOrResource && (
                      item.mastered ?
                      <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1"><Gem size={10} />{t('ui.comp.mastered')}</span> :
                      <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isUnowned ? 'text-kronos-dim/30' : 'text-kronos-dim'}`}><Gem size={10} />{item.owned ? 'Unmastered' : 'Unowned'}</span>
                    )}
                    {item.subsumed && <span className="text-[10px] font-black uppercase text-purple-400">⚗ {t('ui.comp.subsumed')}</span>}
                    {(isModOrResource || isPrimePart || item.veiled) && item.quantity !== undefined &&
                      <span className={`text-[10px] font-black uppercase ${item.quantity > 0 ? 'text-kronos-accent' : 'text-kronos-dim/30'}`}>{item.quantity > 0 ? `×${item.quantity}` : 'Unowned'}</span>
                    }
                  </div>
                </Card>
              );
            }
            return (
              <Card key={`${item.unique_name}_${firstRow * currentColumns + idx}`} glow={!isUnowned} onClick={() => toggle(item.unique_name)} className={`relative p-0 overflow-hidden flex min-h-40 group transition-all duration-300 cursor-pointer ${isUnowned ? 'bg-kronos-panel/10 border-2 border-dashed border-kronos-accent' : 'border-kronos-panel/40'}`}>
                {isScrolling ?
                  <>
                    <div className="w-32 flex-shrink-0 relative overflow-hidden border-r border-white/5 flex items-center justify-center bg-kronos-panel/30 p-3">
                      {item.image && <ItemImage src={item.image} alt="" className={`max-w-full max-h-full object-contain ${isUnowned ? 'grayscale opacity-40' : ''}`} placeholderClassName="w-16 h-16" loading="lazy" resolveFallbackSrc={resolveImgFallback} />}
                    </div>
                    <div className="flex-1 px-4 py-3 flex items-center min-w-0 overflow-hidden">
                      <h4 className="font-bold text-sm uppercase line-clamp-1 text-kronos-text leading-tight">
                        {item.name}
                      </h4>
                    </div>
                  </> :
                  <>

                    {/* Image column */}
                    <div className={`w-32 flex-shrink-0 relative overflow-hidden border-r border-white/5 flex items-center justify-center ${isModFrame(item) ? '' : 'bg-kronos-panel/30 p-3'}`}>
                      {isModFrame(item) ?
                  <>
                          <div className="absolute inset-0" style={{ backgroundImage: `url(${modBg(item.modFrame, item)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                          {modFrameTop(item.modFrame) && <img src={modFrameTop(item.modFrame)} className="absolute top-0 left-0 w-full pointer-events-none" alt="" style={{ objectFit: 'cover', objectPosition: 'top' }} />}
                          {modFrameBot(item.modFrame) && <img src={modFrameBot(item.modFrame)} className="absolute bottom-0 left-0 w-full pointer-events-none" alt="" style={{ objectFit: 'cover', objectPosition: 'bottom' }} />}
                          <div className={`relative z-10 flex flex-col items-center justify-center w-full h-full ${isUnowned ? 'grayscale opacity-40' : ''}`}>
                            {item.image && <ItemImage src={item.image} className="max-w-[60%] max-h-[60%] object-contain" placeholderClassName="w-[60%] h-[60%]" alt="" loading="lazy" resolveFallbackSrc={resolveImgFallback} />}
                            {item.rank > 0 && item.max_rank > 0 &&
                      <span className="text-[8px] font-black text-white mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">R{item.rank}</span>
                      }
                          </div>
                          {item.quantity > 1 &&
                    <div className="absolute top-1 right-1 z-20 text-[9px] font-black text-kronos-accent bg-black/60 px-1 rounded shadow">×{item.quantity}</div>
                    }
                        </> :

                  <>
                          <Box className="text-kronos-panel absolute w-20 h-20 opacity-10" />
                          {item.image && <ItemImage src={item.image} alt="" className={`max-w-full max-h-full object-contain relative z-10 transition-all duration-500 group-hover:scale-110 ${isUnowned ? 'grayscale opacity-40' : ''}`} placeholderClassName="w-16 h-16 relative z-10" loading="lazy" resolveFallbackSrc={resolveImgFallback} />}

                          {!isUnowned && item.formas > 0 &&
                    <div className="absolute top-1 left-1 z-20 flex items-center gap-2 bg-black/50 text-yellow-400 px-1.5 py-0.5 rounded shadow-lg border border-white/10 backdrop-blur-sm">
                              <span className="text-[13px] font-black leading-none">{item.formas}</span>
                              <img src={iconsPath ? convertFileSrc(`${iconsPath}/Forma.png`) : ''} className="w-5 h-5 object-contain" alt="" />
                            </div>
                    }
                        </>
                  }
                    </div>

                    {/* Info column */}
                    <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0 overflow-hidden">

                      {/* Top: category label + name */}
                      <div className="min-w-0">
                        <span className="text-[9px] font-black text-kronos-accent uppercase tracking-widest block whitespace-normal leading-none mb-1">
                          {item.category === 'mods' ? item.rarity || t('inventory.category_mod') : item.weapon_type || item.vehicle_type || (isPrimePart ? t('inventory.category_prime_part') : categoryDisplayLabel(item.category, t))}
                        </span>
                        {/* line-clamp-1 (not -2) is load-bearing here, not
                            cosmetic: this general-grid branch is virtualized
                            with a single fixed GENERAL_ROW_STRIDE assuming
                            every card renders the same height. A 1-vs-2-line
                            title/description made real row height vary,
                            which drifted out of sync with that fixed stride
                            the further down the (2000+ item) list you
                            scrolled - visible as scroll input getting
                            dropped, then jumping to resync. */}
                        <h4 className="font-bold text-sm uppercase line-clamp-1 text-kronos-text leading-tight mt-0.5">
                          {item.name}
                        </h4>
                        {item.description &&
                    <p className="text-[10px] text-kronos-dim/70 mt-0.5 line-clamp-1 leading-relaxed">
                            {item.description}
                          </p>
                    }
                      </div>

                      {/* Middle: Sub-components (centered and larger) */}
                      <div className="flex-1 flex flex-col justify-center py-1">
                        {item.components && item.components.length > 0 &&
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {item.components.map((comp, ci) =>
                      <span key={ci} className="text-[11px] font-bold text-kronos-dim uppercase tracking-tight leading-none bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{comp}</span>
                      )}
                          </div>
                    }
                        {item.category === 'parts' && item.parent_name &&
                    <p className="text-[10px] text-kronos-dim/80 truncate">{item.parent_name}</p>
                    }
                        {item.exaltedWeapons && item.exaltedWeapons.length > 0 &&
                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                            {item.exaltedWeapons.map((w) =>
                      <span key={w.unique_name} className="text-[11px] font-bold text-kronos-accent uppercase tracking-tight leading-none bg-kronos-accent/10 px-1.5 py-0.5 rounded border border-kronos-accent/20">{w.name}</span>
                      )}
                          </div>
                    }
                      </div>

                      {/* Bottom: status row */}
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-white/5">

                        {/* Rank -- shown for equipment and mods */}
                        {!isUnowned && item.rank !== undefined && item.max_rank !== undefined && item.max_rank > 0 &&
                    <span className={`text-[10px] font-black uppercase ${item.rank === item.max_rank ? 'text-blue-400' : 'text-kronos-dim'}`}>
                            R{item.rank}/{item.max_rank}
                          </span>
                    }

                        {/* Mastery (equipment) */}
                        {!isModOrResource && (
                    item.mastered ?
                    <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1 min-w-0 max-w-full"><Gem size={10} className="fill-current/20 flex-shrink-0" /><span className="truncate min-w-0 flex-1">{t('ui.comp.mastered')}</span></span> :
                    <span className={`text-[10px] font-black uppercase flex items-center gap-1 min-w-0 max-w-full ${isUnowned ? 'text-kronos-dim/30' : 'text-kronos-dim'}`}><Gem size={10} className="flex-shrink-0" /><span className="truncate min-w-0 flex-1">{item.owned ? 'Unmastered' : 'Unowned'}</span></span>)
                    }

                        {/* Subsumed (warframes) */}
                        {item.subsumed &&
                    <span className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1 min-w-0 max-w-full">
                            <span className="text-xs flex-shrink-0">⚗</span><span className="truncate min-w-0 flex-1">{t('ui.comp.subsumed')}</span>
                    </span>
                    }

                        {/* Stock count (mods, resources, arcanes, prime parts, veiled rivens) */}
                        {(isModOrResource || isPrimePart || item.veiled) && item.quantity !== undefined &&
                    <span className={`text-[10px] font-black uppercase truncate max-w-full ${item.quantity > 0 ? 'text-kronos-accent' : 'text-kronos-dim/30'}`}>
                            {item.quantity > 0 ? `×${item.quantity}` : item.blueprint_quantity > 0 ? `BP ×${item.blueprint_quantity}` : 'Unowned'}
                          </span>
                    }

                        {activeTab === 'prime_junk' && item._ratio !== undefined && (
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase ml-auto">
                            <span className="text-blue-400">{item._value}p</span>
                            <span className="text-orange-400">{item.ducats}d</span>
                            <span className={item._ratio < 0.15 ? "text-green-400" : "text-red-400"}>{item._ratio.toFixed(2)} p/d</span>
                            {item.quantity > 0 && (
                              <button
                                onClick={(e) => handleSellOnWfm(e, item)}
                                disabled={sellStatusMap[item.unique_name || item.uniqueName || item.name] === 'loading'}
                                className="ml-1 px-1.5 py-0.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded border border-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('ui.inventory.sell_1click_title')}
                              >
                                {sellStatusMap[item.unique_name || item.uniqueName || item.name] === 'loading' ? '…' : t('ui.inventory.sell_button')}
                              </button>
                            )}
                          </div>
                        )}

                        {activeTab === 'prime_parts' && item._value !== undefined && (
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase ml-auto">
                            <span className="text-blue-400">{item._value}p</span>
                            {item.quantity > 0 && (
                              <button
                                onClick={(e) => handleSellOnWfm(e, item)}
                                className="ml-1 px-1.5 py-0.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded border border-blue-500/30 transition-colors"
                                title={t('ui.inventory.sell_1click_title')}
                              >
                                {t('ui.inventory.sell_button')}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Incarnon badge */}
                        {item.is_incarnon &&
                    <Tooltip
                      position="top"
                      content={
                      <div className="max-w-[200px]">
                                <p className="text-[10px] font-black uppercase text-orange-400">{t('ui.inventory.incarnon_evolution')}</p>
                                <p className="text-[12px] font-bold text-kronos-text mt-0.5">
                                  {item.incarnon_evolution_level >= 0 ?
                          `Rank ${item.incarnon_evolution_level}/4` :
                          'Not evolved'}
                                </p>
                              </div>
                      }>
                      
                            <span className="text-[10px] font-black uppercase text-orange-400 flex items-center gap-1 cursor-help min-w-0 max-w-full">
                              <Zap size={10} className="fill-current flex-shrink-0" /><span className="truncate min-w-0 flex-1">{t('ui.inventory.filter_incarnon')}</span>
                      </span>
                          </Tooltip>
                    }

                        {/* Crafting ingredient badge - only on full equipment, not resources/parts */}
                        {item.needed_for_crafting && !isModOrResource && !isPrimePart &&
                    <Tooltip
                      position="bottom"
                      content={
                      <div className="space-y-1 max-w-[220px]">
                                <p className="text-[10px] font-black uppercase text-kronos-accent mb-1">{t('ui.inventory.needed_to_craft')}</p>
                                {item.crafting_details.map((d, i) =>
                        <p key={i} className="text-[11px] text-kronos-text flex justify-between gap-2">
                                    <span>{d.name}</span>
                                    <span className="text-kronos-dim font-bold">×{d.count}</span>
                                  </p>
                        )}
                              </div>
                      }>
                      
                            <span className="text-[10px] font-black uppercase text-yellow-500 flex items-center gap-1 cursor-help min-w-0 max-w-full">
                              <Zap size={10} className="fill-current flex-shrink-0" /><span className="truncate min-w-0 flex-1">{t('ui.inventory.crafting_ingredient')}</span>
                      </span>
                          </Tooltip>
                    }

                        {/* Drop sources */}
                        {(() => {
                      const itemNorm = item.unique_name ? item.unique_name.replace('/StoreItems/', '/') : '';
                      const itemSources = dropIndex?.[itemNorm] || dropIndex?.['display:' + (item.name || '').toLowerCase().trim()] || [];
                      if (itemSources.length === 0) return null;
                      const dedupKey = (s) => {
                        if (s.type === 'mission') return 'm:' + s.nodeName + '|' + (s.rotation || '');
                        if (s.type === 'relic') return 'r:' + (s.relicName || s.relicManifest);
                        if (s.type === 'enemy') return 'e:' + s.enemyName;
                        if (s.type === 'bounty') return 'b:' + s.bountyLevel + '|' + (s.rotation || '') + '|' + (s.stage || '');
                        return 'o:' + (s.syndicateName || s.objectiveName || s.keyName || s.sourceName || s.type);
                      };
                      const seen = {};
                      const uniq = itemSources.filter((s) => {const k = dedupKey(s);if (seen[k]) return false;seen[k] = true;return true;});
                      const missionSources = sortMissionRotationGroups(uniq.filter((s) => s.type === 'mission')).slice(0, 5);
                      const relicSources = sortByChanceDesc(uniq.filter((s) => s.type === 'relic')).slice(0, 5);
                      const enemySources = sortByChanceDesc(uniq.filter((s) => s.type === 'enemy')).slice(0, 4);
                      const bountySources = sortByChanceDesc(uniq.filter((s) => s.type === 'bounty')).slice(0, 3);
                      const otherSources = sortByChanceDesc(uniq.filter((s) => !['mission', 'relic', 'enemy', 'bounty'].includes(s.type))).slice(0, 3);
                      if (missionSources.length + relicSources.length + enemySources.length + bountySources.length + otherSources.length === 0) return null;
                      return (
                        <Tooltip
                          position="bottom"
                          content={
                          <div className="max-w-[300px] max-h-[250px] overflow-y-auto space-y-1.5">
                                  <p className="text-[10px] font-black uppercase text-kronos-accent">{t('ui.inventory.drop_sources')}</p>
                                  {missionSources.length > 0 &&
                            <div>
                                      <p className="text-[9px] font-bold text-kronos-dim uppercase tracking-wider mb-0.5">{t('ui.inventory.missions')}</p>
                                      {missionSources.map((s, i) =>
                              <p key={`m-${i}`} className="text-[10px] text-kronos-text leading-tight">
                                          {s.nodeName} {s.rotation ? `(Rot ${s.rotation})` : ''}
                                          {s.chance ? <span className="text-kronos-dim ml-1">{formatChance(s.chance)}</span> : ''}
                                        </p>
                              )}
                                    </div>
                            }
                                  {relicSources.length > 0 &&
                            <div>
                                      <p className="text-[9px] font-bold text-kronos-dim uppercase tracking-wider mb-0.5">{t('nav.relics')}</p>
                                      {relicSources.map((s, i) =>
                              <p key={`r-${i}`} className="text-[10px] text-kronos-text leading-tight">{s.relicName || s.relicManifest} ({s.rarity ? s.rarity.charAt(0).toUpperCase() + s.rarity.slice(1).toLowerCase() : ''})</p>
                              )}
                                    </div>
                            }
                                  {enemySources.length > 0 &&
                            <div>
                                      <p className="text-[9px] font-bold text-kronos-dim uppercase tracking-wider mb-0.5">{t('ui.inventory.enemy_drops')}</p>
                                      {enemySources.map((s, i) =>
                              <p key={`e-${i}`} className="text-[10px] text-kronos-text leading-tight">
                                          {s.enemyName}
                                          {s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? formatChance(s.chance) : `${s.chance}%`}</span> : ''}
                                        </p>
                              )}
                                    </div>
                            }
                                  {bountySources.length > 0 &&
                            <div>
                                      <p className="text-[9px] font-bold text-kronos-dim uppercase tracking-wider mb-0.5">{t('ui.dashboard.bounties')}</p>
                                      {bountySources.map((s, i) =>
                              <p key={`b-${i}`} className="text-[10px] text-kronos-text leading-tight">
                                          {s.bountyLevel}{s.stage ? ` (${s.stage})` : ''}{s.rotation ? ` Rot ${s.rotation}` : ''}
                                          {s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? formatChance(s.chance) : `${s.chance}%`}</span> : ''}
                                        </p>
                              )}
                                    </div>
                            }
                                  {otherSources.length > 0 &&
                            <div>
                                      <p className="text-[9px] font-bold text-kronos-dim uppercase tracking-wider mb-0.5">{t('ui.inventory.other')}</p>
                                      {otherSources.map((s, i) =>
                              <p key={`o-${i}`} className="text-[10px] text-kronos-text leading-tight">
                                          {s.syndicateName || s.objectiveName || s.keyName || s.sourceName || s.type}
                                          {s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? formatChance(s.chance) : `${s.chance}%`}</span> : ''}
                                        </p>
                              )}
                                    </div>
                            }
                                </div>
                          }>
                          
                              <span className="text-[10px] font-black uppercase text-kronos-dim flex items-center gap-1 cursor-help hover:text-kronos-accent transition-colors min-w-0 max-w-full">
                                <Layers size={10} className="flex-shrink-0" /><span className="truncate min-w-0 flex-1">{t('ui.inventory.sources')}</span>
                          </span>
                            </Tooltip>);

                    })()}
                      </div>
                  </div>
                  </>
                }
                  </Card>);

          })}
            </div>
        </div>
      }
      </div>
  );

  const pageLayoutProps = {
    titleKey: 'screen.inventory',
    subtitle: t('ui.inventory.displaying_items', { shown: filteredItems.length, total: tabItems.length }),
    extra: IS_PREVIEW ? null : headerStats,
    headerPanel: IS_PREVIEW ? <PreviewInventoryLayout stats={headerStats} controls={headerPanel} /> : headerPanel,
    contentRef: pageScrollRef
  };

  return (
    <>
    {IS_PREVIEW ? (
      // Category navigator: a persistent sidebar at wide widths, replacing
      // the horizontal tab strip as the primary way to switch categories
      // (the strip above still exists for narrower widths where the sidebar
      // is hidden via `lg:flex`/`hidden`, per the master plan's "persistent
      // navigator on wide screens; labeled menu on compact" rule). Stable
      // renders PageLayout directly with no sidebar or extra wrapping node,
      // exactly as before.
      <div className="flex gap-4 flex-1 min-h-0 h-full">
        {renderCategoryNavigator()}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <PageLayout {...pageLayoutProps}>{mainContent}</PageLayout>
        </div>
      </div>
    ) : (
      <PageLayout {...pageLayoutProps}>{mainContent}</PageLayout>
    )}
    {openItem && (IS_PREVIEW
      ? <PreviewAcquisitionDrawer item={openItem} onClose={close} />
      : <AcquisitionDrawer item={openItem} onClose={close} />)}
    </>);

}

function renderHeaderStats(inventoryData, iconsPath, t, locale) {
  if (!inventoryData?.account) return null;
  const { credits, platinum, forma, aura_forma, stance_forma, umbra_forma, orokin_reactor, orokin_catalyst, endo, ducats, aya, aya_image, void_traces, void_traces_max, steel_essence, steel_essence_image, riven_slivers, riven_slivers_image } = inventoryData.account;
  const iconSrc = (name) => iconsPath ? convertFileSrc(`${iconsPath}/${String(name).replace(/^\/+/, '')}.png`) : null;
  const StatWidget = ({ icon, label, value, accent = 'text-kronos-dim', tooltip = null }) =>
  <div className="flex items-stretch gap-1.5 min-w-[50px] relative group flex-shrink-0">
      {icon && <img src={icon} className="w-[30px] object-contain flex-shrink-0 self-stretch" alt="" />}
      <div className="flex flex-col justify-between py-[1px] min-w-0">
        <span className={`text-[10px] ${accent} uppercase font-black tracking-widest leading-tight`}>{label}</span>
        <span className="text-sm font-bold text-kronos-text leading-tight">{value}</span>
      </div>
      {tooltip}
    </div>;

  return (
    <div className="flex items-center gap-5 ml-auto pr-3 flex-nowrap">
      <StatWidget icon={iconSrc('Credits')} label={t('ui.dashboard.credits')} value={formatNumber(credits, locale)} />
      <StatWidget icon={iconSrc('Platinum')} label={t('ui.dashboard.platinum')} value={formatNumber(platinum, locale)} accent="text-kronos-accent" />
      <StatWidget icon={iconSrc('EndoIconRenderLarge')} label={t('ui.inventory.stat_endo')} value={formatNumber(endo, locale)} accent="text-orange-400" />
      <div className="h-8 w-px bg-white/10 flex-shrink-0" />
      <StatWidget icon={iconSrc('Forma')} label={t('ui.inventory.forma')} value={formatNumber(forma + aura_forma + stance_forma + umbra_forma, locale)} accent="text-kronos-accent"
      tooltip={
      <div className="absolute top-full right-0 mt-2 p-3 bg-kronos-bg border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110] min-w-[180px] glass-panel">
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-3">
                <span className="flex items-center gap-2 text-[15px] text-kronos-dim uppercase font-bold whitespace-nowrap">{iconSrc('Forma') && <img src={iconSrc('Forma')} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}{t('ui.inventory.forma_standard')}</span>
                <span className="text-[15px] font-bold text-kronos-text tabular-nums">{formatNumber(forma, locale)}</span>
              </div>
              {aura_forma > 0 && <div className="flex justify-between items-center gap-3"><span className="flex items-center gap-2 text-[15px] text-blue-300 uppercase font-bold whitespace-nowrap">{iconSrc('FormaUmbra') && <img src={iconSrc('FormaUmbra')} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}{t('ui.inventory.forma_aura')}</span><span className="text-[15px] font-bold text-kronos-text tabular-nums">{formatNumber(aura_forma, locale)}</span></div>}
              {stance_forma > 0 && <div className="flex justify-between items-center gap-3"><span className="flex items-center gap-2 text-[15px] text-green-300 uppercase font-bold whitespace-nowrap">{iconSrc('FormaStance') && <img src={iconSrc('FormaStance')} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}{t('ui.inventory.forma_stance')}</span><span className="text-[15px] font-bold text-kronos-text tabular-nums">{formatNumber(stance_forma, locale)}</span></div>}
              {umbra_forma > 0 && <div className="flex justify-between items-center gap-3"><span className="flex items-center gap-2 text-[15px] text-purple-400 uppercase font-bold whitespace-nowrap">{iconSrc('OmegaForma') && <img src={iconSrc('OmegaForma')} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}{t('ui.inventory.forma_umbra')}</span><span className="text-[15px] font-bold text-kronos-text tabular-nums">{formatNumber(umbra_forma, locale)}</span></div>}
            </div>
          </div>
      } />
      
      <StatWidget icon={iconSrc('Reactor')} label={t('ui.inventory.stat_reactors')} value={formatNumber(orokin_reactor, locale)} accent="text-yellow-500" />
      <StatWidget icon={iconSrc('Catalyst')} label={t('ui.inventory.stat_catalysts')} value={formatNumber(orokin_catalyst, locale)} accent="text-blue-400" />
      <div className="h-8 w-px bg-white/10 flex-shrink-0" />
      {/* Ducats/Aya/Steel Essence/Riven Slivers/Void Traces - GitHub issue
          #109 ("header currency tracker missing..."). Regal Aya and Vitus
          Essence are deliberately NOT included - neither item path exists
          anywhere in this build's own bundled export data (verified
          directly, not assumed absent), likely the same export-plus
          staleness already tracked as DATA-001 in #109. */}
      <StatWidget icon={iconSrc('Ducats')} label={t('ui.dashboard.ducats')} value={formatNumber(ducats, locale)} accent="text-cyan-300" />
      <StatWidget icon={aya_image} label={t('ui.inventory.stat_aya')} value={formatNumber(aya, locale)} accent="text-amber-300" />
      <StatWidget icon={iconSrc('VoidTraces')} label={t('ui.inventory.stat_void_traces')} value={`${formatNumber(void_traces, locale)} / ${formatNumber(void_traces_max, locale)}`} accent="text-purple-300" />
      <StatWidget icon={steel_essence_image} label={t('ui.inventory.stat_steel_essence')} value={formatNumber(steel_essence, locale)} accent="text-slate-300" />
      <StatWidget icon={riven_slivers_image} label={t('ui.inventory.stat_riven_slivers')} value={formatNumber(riven_slivers, locale)} accent="text-rose-300" />
    </div>);

}
