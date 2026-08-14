/**
 * Inventory.jsx
 *
 * Displays the user's full collection of items, including equipment, mods,
 * arcanes and resources.  Provides categorised tabs and multi-column
 * filtering (e.g., "Owned + Unmastered").
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUi } from '../contexts/UiContext'
import { Search, Filter, ArrowUpDown, Check, Box, Zap, Gem, X, Layers } from 'lucide-react';
import { PageLayout, Card, Input, Button, Tabs, MonitorState, Tooltip } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { getAcquisitionInfo } from '../lib/acquisitionInfo';
import { loadAcquisitionData } from '../lib/acquisitionData';
import AcquisitionDrawer, { useAcquisitionDrawer } from '../components/AcquisitionDrawer';
import ModCard from '../components/ModCard';



const ITEMS_PER_PAGE = 48;

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
  const { t } = useUi()
  const INVENTORY_TABS = [
  { id: 'all', label: t('ui.inventory.tab_all') },
  { id: 'warframes', label: t('ui.inventory.tab_warframes') },
  { id: 'weapons', label: t('ui.inventory.tab_weapons') },
  { id: 'companions', label: t('ui.inventory.tab_companions') },
  { id: 'companion_weapons', label: t('ui.inventory.tab_companion_weapons') },
  { id: 'archweapons', label: t('ui.inventory.tab_archweapons') },
  { id: 'vehicles', label: t('ui.inventory.tab_vehicles') },
  { id: 'amps', label: t('ui.inventory.tab_amps') },
  { id: 'arcanes', label: 'Arcanes' },
  { id: 'peely_pix', label: 'Peely Pix' },
  { id: 'consumables', label: 'Consumables' },
  { id: 'landing_craft', label: 'Landing Craft' },
  { id: 'resources', label: t('ui.inventory.tab_resources') },
  { id: 'prime_parts', label: t('ui.inventory.tab_prime_parts') },
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
    prime_parts: ['owned', 'mastered'],
    resources: ['owned'],
    ayatan: ['socketed']
  };

  const TRIPLE_FILTERS = new Set(['owned', 'mastered', 'subsumed', 'socketed', 'prime']);
  const NEG_LABELS = {
    owned: t('ui.inventory.filter_owned'),
    mastered: t('ui.inventory.filter_mastered'),
    subsumed: t('ui.inventory.filter_subsumed'),
    socketed: t('ui.inventory.filter_socketed'),
    prime: t('ui.inventory.filter_prime')
  };

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
    resources: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'quantity', label: t('ui.inventory.sort_count') }],
    ayatan: [{ id: 'name', label: t('ui.inventory.sort_name') }, { id: 'quantity', label: t('ui.inventory.sort_count') }]
  };
  const { inventoryData, isInventoryLoading, allPrices, isPriceLoading, priceFetchProgress, dropIndex, recipeResultIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex, ExportImages, ExportTextIcons, cardImagesPath } = useMonitoring();
  const [acquisitionOverrides, setAcquisitionOverrides] = useState(null);
  const [acquisitionDataReady, setAcquisitionDataReady] = useState(false);
  useEffect(() => {
    invoke('read_file_bytes', { relative: 'data/assets/data/acquisition_overrides.json' })
      .then((bytes) => setAcquisitionOverrides(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
      .catch(() => setAcquisitionOverrides({ components: {}, mods: {} }));
    loadAcquisitionData().then(() => setAcquisitionDataReady(true));
  }, []);
  const { openKey, toggle, close } = useAcquisitionDrawer();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterSortPanel, setShowFilterSortPanel] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});
  const [sortCriteria, setSortCriteria] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [framesPath, setFramesPath] = useState('');
  const [uiPath, setUiPath] = useState('');
  const [iconsPath, setIconsPath] = useState('');
  useEffect(() => {invoke('get_mod_frames_path').then((p) => setFramesPath(p)).catch(() => {});}, []);
  useEffect(() => {invoke('get_ui_path').then((p) => setUiPath(p)).catch(() => {});}, []);
  useEffect(() => {invoke('get_icons_path').then((p) => setIconsPath(p)).catch(() => {});}, []);

  useEffect(() => {setVisibleCount(ITEMS_PER_PAGE);}, [activeTab, searchQuery, currentFilters]);

  const handleImgError = useCallback((e) => {
    if (e.target.dataset.wfFallback === 'true') return;
    e.target.dataset.wfFallback = 'true';
    const src = e.target.src;
    if (!src || !src.startsWith('https://browse.wf')) return;
    const iconPath = src.replace('https://browse.wf', '').replace(/\/\//g, '/');
    const entry = ExportImages?.[iconPath];
    if (entry?.contentHash) {
      e.target.src = `https://content.warframe.com/PublicExport${iconPath}!${entry.contentHash}`;
    }
  }, [ExportImages]);

  const primePrices = activeTab === 'prime_parts' ? allPrices : null;

  const tabItems = useMemo(() => {
    if (!inventoryData) return [];
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
      return Object.values(inventoryData.primeSets ?? {}).filter((set) =>
      set.parts.some((p) => p.quantity > 0)
      ).map((set) => {
        const parent = nameToEquipment.get(set.name) ?? nameToEquipment.get(set.name + ' Prime') ?? {};
        const _value = primePrices?.[set.setPath] ?? (set.parts ?? []).reduce((s, p) => s + (primePrices?.[p.unique_name] ?? 0), 0);
        return { ...set, owned: parent.owned ?? false, mastered: parent.mastered ?? false, _value };
      });
    }
    if (activeTab === 'vehicles') {
      const vehicles = inventoryData.vehicles ?? [];
      const necramechs = (inventoryData.necramechs ?? []).map((n) => ({ ...n, is_necramech: true }));
      return [...vehicles, ...necramechs];
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
      return inventoryData.peely_pix ?? [];
    }
    if (activeTab === 'arcanes') return inventoryData.arcanes_catalog ?? [];
    if (activeTab === 'consumables') return inventoryData.consumables_catalog ?? [];
    if (activeTab === 'landing_craft') return inventoryData.landing_craft_catalog ?? [];
    if (activeTab === 'all') return (inventoryData.all ?? []).filter((i) => i.category !== 'rivens' && i.category !== 'Arcanes');
    return inventoryData[activeTab] ?? [];
  }, [inventoryData, activeTab, uiPath, primePrices]);

  const filteredItems = useMemo(() => {
    let items = tabItems;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
      items = items.filter((item) => {
        const itemName = (item.name ?? '').toLowerCase();
        const components = (item.components ?? []).map((c) => c.toLowerCase());

        // Match if ALL search words exist somewhere in either the name OR components
        return q.every((word) =>
        itemName.includes(word) || components.some((c) => c.includes(word))
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
          } else if (state === 'no') {
            if (f === 'owned' && item.owned) return false;
            if (f === 'mastered' && item.mastered) return false;
            if (f === 'subsumed' && item.subsumed) return false;
            if (f === 'prime' && item.is_prime) return false;
            if (f === 'socketed' && item.sockets > 0) return false;
          }
        }
        return true;
      });
    }
    items = [...items].sort((a, b) => {
      // Ayatan stars card always first
      if (a.isStars) return -1;
      if (b.isStars) return 1;
      // Special handling for prime_parts completion sort
      if (activeTab === 'prime_parts' && sortCriteria === 'completion') {
        const aComplete = (a.ownedCount ?? 0) / (a.totalCount ?? 1);
        const bComplete = (b.ownedCount ?? 0) / (b.totalCount ?? 1);
        return sortDirection === 'asc' ? aComplete - bComplete : bComplete - aComplete;
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

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

  const openItem = useMemo(() => {
    if (!openKey || !acquisitionDataReady) return null;
    const item = visibleItems.find((it) => it.unique_name === openKey);
    if (!item) return null;
    return { displayName: item.name, info: getAcquisitionInfo(item.unique_name, item.name, dropIndex, acquisitionOverrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, undefined, undefined, undefined, undefined, alwaysAvailableIndex) };
  }, [openKey, acquisitionDataReady, visibleItems, dropIndex, acquisitionOverrides, recipeResultIndex, marketIndex, alwaysAvailableIndex, bundleIndex, syndicateIndex, wikiSigilIndex]);

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

  const renderHeaderPanel = () =>
  <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input
          placeholder={`Search ${tabLabel}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 bg-black/20 border-white/5 focus:bg-black/40 h-[42px]" />
        
        </div>

        {/* Filter Tags In-line */}
        {(FILTER_CONFIG[activeTab] ?? []).length > 0 &&
      <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
            <Filter size={14} className="text-kronos-dim mx-1" />
            <div className="flex gap-1">
              {(FILTER_CONFIG[activeTab] ?? []).map((f) => {
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

          })}
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
      </div>

      {/* Category Tabs */}
      <Tabs tabs={INVENTORY_TABS.map((t) => {
      const iconMap = { warframes: 'Warframe', weapons: 'Primary', companions: 'Companion', companion_weapons: 'Sentinels', archweapons: 'Archgun', arcanes: 'Arcanes', peely_pix: 'Mods', consumables: 'Resources', landing_craft: 'Vehicles', prime_parts: 'PrimeParts', ayatan: 'Ayatan' };
      const iconName = iconMap[t.id] || t.label;
      const peelyPackPath = '/Lotus/Interface/Icons/StoreIcons/Resources/1999Wf/StickerPack.png';
      const peelyPackHash = ExportImages?.[peelyPackPath]?.contentHash;
      const icon = t.id === 'peely_pix'
        ? peelyPackHash
          ? `https://content.warframe.com/PublicExport${peelyPackPath}!${peelyPackHash}`
          : `https://browse.wf${peelyPackPath}`
        : iconsPath ? convertFileSrc(`${iconsPath}/Categories/${iconName}.png`) : null;
      return { ...t, icon };
    })} activeTab={activeTab} onChange={(id) => {setActiveTab(id);setCurrentFilters({});setSortCriteria('name');setSortDirection('asc');}} />
    </div>;


  return (
    <>
    <PageLayout
      titleKey="screen.inventory"
      subtitle={`Displaying ${visibleItems.length} / ${filteredItems.length} items`}
      extra={renderHeaderStats(inventoryData, iconsPath)}
      headerPanel={renderHeaderPanel()}>

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
                  <span className="text-[10px] font-black uppercase text-kronos-accent">Fetching plat values {priceFetchProgress.current}{t('inventory.fetching_of')}{priceFetchProgress.total}...</span>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
                {visibleItems.map((set, idx) => {
              const isParentOwned = set.owned;
              const isParentMastered = set.mastered;

              const partsMet = set.parts.filter((p) => (p.crafted ?? 0) + p.quantity >= (p.need ?? 1)).length;
              const totalNeeded = set.parts.reduce((s, p) => s + (p.need ?? 1), 0);
              const completion = Math.min(100, partsMet / totalNeeded * 100);
              const isComplete = partsMet >= set.parts.length;
              const bpPart = set.parts.find((p) => p.isBlueprint);
              const bpCount = bpPart?.quantity ?? 0;
              const setsPossible = bpCount > 0 && isComplete ? bpCount : 0;
              const setValue = primePrices?.[set.setPath] ?? set.parts.reduce((sum, p) => sum + (primePrices?.[p.unique_name] ?? 0) * (p.need ?? 1), 0);

              return (
                <div key={set.name + idx} className={`relative rounded-xl border border-white/5 overflow-hidden flex flex-col bg-kronos-panel/20 ${isComplete ? 'border-green-500/30' : ''}`}>
                      {isPriceLoading ?
                  <span className="absolute top-4 right-4 z-10 inline-block w-6 h-3 bg-white/10 rounded animate-pulse" /> :
                  setValue > 0 &&
                  <span className="absolute top-4 right-4 z-10 text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">{setValue}p</span>
                  }
                      {/* Header: image + name + badges */}
                      <div className={`flex items-center gap-4 px-4 py-5 border-b border-white/5 relative ${isComplete ? 'bg-green-500/5' : ''}`}>
                        <div className="w-28 h-28 flex items-center justify-center flex-shrink-0">
                          {set.image ?
                      <img src={set.image} alt="" className="max-w-full max-h-full object-contain" onError={handleImgError} /> :
                      <div className="w-14 h-14 rounded bg-white/5" />
                      }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <p className="text-xl font-black text-kronos-text uppercase whitespace-normal leading-tight">{set.name}{t('inventory.set')}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded inline-block ${isComplete ? 'bg-green-500/20 text-green-400' : 'bg-kronos-accent/20 text-kronos-accent'}`}>
                                  {setsPossible > 0 ? `${setsPossible} Set${setsPossible > 1 ? 's' : ''}` : `${partsMet}/${totalNeeded} (${Math.round(completion)}%)`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {/* Owned Status */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isParentOwned ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider">{isParentOwned ? 'Owned' : 'Unowned'}</span>
                            </div>

                            {/* Mastery Status */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isParentMastered ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/5 text-kronos-dim'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider">{isParentMastered ? 'Mastered' : 'Unmastered'}</span>
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
                          const partSources = partSourcesRaw.filter((s) => {const k = partDedupKey(s);if (partSeen[k]) return false;partSeen[k] = true;return true;});
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
                                    {part.image ?
                              <img src={part.image} alt="" className="max-w-full max-h-full object-contain" onError={handleImgError} /> :
                              <div className="w-7 h-7 rounded bg-white/5" />
                              }
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
                                <p key={`e-${si}`} className="text-[9px] text-kronos-text leading-tight">{s.enemyName}{s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? (s.chance * 100).toFixed(1) : s.chance}%</span> : ''}</p>
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
            </> :
        activeTab === 'ayatan' ?
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
              {visibleItems.map((item, idx) => {
            if (item.isStars) {
              const starImg = (name) => uiPath ? convertFileSrc(`${uiPath}/${name}.png`) : '';
              return (
                <div key="stars" className="group relative rounded-xl border border-white/5 overflow-hidden bg-gradient-to-br from-yellow-500/5 to-cyan-500/5 h-32 cursor-default">
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 transition-opacity duration-200 group-hover:opacity-0">
                        <div className="flex gap-6 items-center">
                          <div className="flex flex-col items-center gap-1">
                            <img src={starImg('OroFusexOrnamentB')} className="w-8 h-8 object-contain" alt="" />
                            <span className="text-sm font-black text-yellow-400">{item.amberCount.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <img src={starImg('OroFusexOrnamentA')} className="w-8 h-8 object-contain" alt="" />
                            <span className="text-sm font-black text-cyan-400">{item.cyanCount.toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-kronos-dim uppercase tracking-widest">{t('ui.inventory.ayatan_stars')}</p>
                        <p className="text-xs font-black text-kronos-text text-center">~{item.maxEndoTotal.toLocaleString()} endo max</p>
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
              <div key={item.unique_name + idx} className={`relative rounded-xl border overflow-hidden bg-kronos-panel/20 flex items-stretch h-32 ${item.quantity > 0 ? 'border-white/5' : 'border-white/5 border-dashed opacity-60'}`}>
                    {item.isOptimal &&
                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-yellow-500 text-black text-[9px] font-black uppercase tracking-wider rounded shadow-lg">{t('ui.inventory.optimal')}

                </div>
                }
                    <div className="w-24 flex-shrink-0 flex items-center justify-center p-3">
                      {item.image ?
                  <img src={item.image} alt="" className="max-w-full max-h-full object-contain" onError={handleImgError} /> :

                  <div className="w-12 h-12 flex items-center justify-center bg-kronos-panel/30 rounded-lg">
                          <img src={uiPath ? convertFileSrc(`${uiPath}/Ayatan.png`) : ''} alt="" className="max-w-[60%] max-h-[60%] object-contain opacity-30" />
                        </div>
                  }
                    </div>
                    <div className="flex flex-col justify-center gap-1 py-3 pr-4 min-w-0 flex-1">
                      <p className="text-sm font-black text-kronos-text uppercase leading-tight whitespace-normal">{item.name.replace('Ayatan ', '').replace(' Sculpture', '')}</p>
                      <p className="text-base font-bold text-kronos-text leading-tight">{item.quantity > 0 ? `×${item.quantity}` : 'None owned'}</p>
                      <p className={`text-[11px] font-black ${item.sockets > 0 ? 'text-green-400' : 'text-kronos-dim'}`}>
                        {item.sockets} filled · {(item.quantity * item.filledEndo).toLocaleString()}{t('inventory.endo')}
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
            </div> :

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-4">
              {visibleItems.map((item, idx) => {
            const isUnowned = !item.owned;
            const isPrimePart = item.category === 'prime_parts';
            const isModOrResource = ['mods', 'resources', 'Arcanes', 'arcanes', 'peely_pix', 'consumables', 'landing_craft'].includes(item.category);
            if (activeTab === 'arcanes') {
              return (
                <div key={item.unique_name + idx} className={`relative cursor-pointer flex justify-center rounded-xl ${isUnowned ? 'grayscale opacity-60' : ''}`} onClick={() => toggle(item.unique_name)}>
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
            return (
              <Card key={item.unique_name + idx} glow={!isUnowned} onClick={() => toggle(item.unique_name)} className={`relative p-0 overflow-hidden flex min-h-40 group transition-all duration-300 cursor-pointer ${isUnowned ? 'bg-kronos-panel/10 border-2 border-dashed border-kronos-accent' : 'border-kronos-panel/40'}`}>

                    {/* Image column */}
                    <div className={`w-32 flex-shrink-0 relative overflow-hidden border-r border-white/5 flex items-center justify-center ${isModFrame(item) ? '' : 'bg-kronos-panel/30 p-3'}`}>
                      {isModFrame(item) ?
                  <>
                          <div className="absolute inset-0" style={{ backgroundImage: `url(${modBg(item.modFrame, item)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                          {modFrameTop(item.modFrame) && <img src={modFrameTop(item.modFrame)} className="absolute top-0 left-0 w-full pointer-events-none" alt="" style={{ objectFit: 'cover', objectPosition: 'top' }} />}
                          {modFrameBot(item.modFrame) && <img src={modFrameBot(item.modFrame)} className="absolute bottom-0 left-0 w-full pointer-events-none" alt="" style={{ objectFit: 'cover', objectPosition: 'bottom' }} />}
                          <div className={`relative z-10 flex flex-col items-center justify-center w-full h-full ${isUnowned ? 'grayscale opacity-40' : ''}`}>
                            {item.image && <img src={item.image} className="max-w-[60%] max-h-[60%] object-contain" alt="" loading="lazy" onError={handleImgError} />}
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
                          {item.image && <img src={item.image} alt="" className={`max-w-full max-h-full object-contain relative z-10 transition-all duration-500 group-hover:scale-110 ${isUnowned ? 'grayscale opacity-40' : ''}`} loading="lazy" onError={handleImgError} />}

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
                          {item.category === 'mods' ? item.rarity || 'Mod' : item.weapon_type || item.vehicle_type || (isPrimePart ? 'Prime Part' : item.category?.replace(/_/g, ' '))}
                        </span>
                        <h4 className="font-bold text-sm uppercase whitespace-normal text-kronos-text leading-tight mt-0.5">
                          {item.name}
                        </h4>
                        {item.description &&
                    <p className="text-[10px] text-kronos-dim/70 mt-0.5 line-clamp-2 leading-relaxed">
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
                    <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1"><Gem size={10} className="fill-current/20" />{t('ui.comp.mastered')}</span> :
                    <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${isUnowned ? 'text-kronos-dim/30' : 'text-kronos-dim'}`}><Gem size={10} />{item.owned ? 'Unmastered' : 'Unowned'}</span>)
                    }

                        {/* Subsumed (warframes) */}
                        {item.subsumed &&
                    <span className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1">
                            <span className="text-xs">⚗</span>{t('ui.comp.subsumed')}
                    </span>
                    }

                        {/* Stock count (mods, resources, arcanes, prime parts, veiled rivens) */}
                        {(isModOrResource || isPrimePart || item.veiled) && item.quantity !== undefined &&
                    <span className={`text-[10px] font-black uppercase ${item.quantity > 0 ? 'text-kronos-accent' : 'text-kronos-dim/30'}`}>
                            {item.quantity > 0 ? `×${item.quantity}` : 'Unowned'}
                          </span>
                    }

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
                      
                            <span className="text-[10px] font-black uppercase text-orange-400 flex items-center gap-1 cursor-help">
                              <Zap size={10} className="fill-current" />{t('ui.inventory.filter_incarnon')}
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
                      
                            <span className="text-[10px] font-black uppercase text-yellow-500 flex items-center gap-1 cursor-help">
                              <Zap size={10} className="fill-current" />{t('ui.inventory.crafting_ingredient')}
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
                      const missionSources = uniq.filter((s) => s.type === 'mission').slice(0, 5);
                      const relicSources = uniq.filter((s) => s.type === 'relic').slice(0, 5);
                      const enemySources = uniq.filter((s) => s.type === 'enemy').slice(0, 4);
                      const bountySources = uniq.filter((s) => s.type === 'bounty').slice(0, 3);
                      const otherSources = uniq.filter((s) => !['mission', 'relic', 'enemy', 'bounty'].includes(s.type)).slice(0, 3);
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
                                          {s.chance ? <span className="text-kronos-dim ml-1">{(s.chance * 100).toFixed(1)}%</span> : ''}
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
                                          {s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? (s.chance * 100).toFixed(1) : s.chance}%</span> : ''}
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
                                          {s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? (s.chance * 100).toFixed(1) : s.chance}%</span> : ''}
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
                                          {s.chance ? <span className="text-kronos-dim ml-1">{typeof s.chance === 'number' ? (s.chance * 100).toFixed(1) : s.chance}%</span> : ''}
                                        </p>
                              )}
                                    </div>
                            }
                                </div>
                          }>
                          
                              <span className="text-[10px] font-black uppercase text-kronos-dim flex items-center gap-1 cursor-help hover:text-kronos-accent transition-colors">
                                <Layers size={10} />{t('ui.inventory.sources')}
                          </span>
                            </Tooltip>);

                    })()}
                      </div>
                    </div>
                  </Card>);

          })}
            </div>
        }
        {visibleCount < filteredItems.length && <div className="flex justify-center py-8"><Button onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}>{t('ui.inventory.load_more_items')}</Button></div>}
      </div>
    </PageLayout>
    {openItem && <AcquisitionDrawer item={openItem} onClose={close} />}
    </>);

}

function renderHeaderStats(inventoryData, iconsPath) {
  if (!inventoryData?.account) return null;
  const { credits, platinum, forma, aura_forma, stance_forma, umbra_forma, orokin_reactor, orokin_catalyst, endo } = inventoryData.account;
  const { t } = useUi();
  const iconSrc = (name) => iconsPath ? convertFileSrc(`${iconsPath}/${String(name).replace(/^\/+/, '')}.png`) : null;
  const StatWidget = ({ icon, label, value, accent = 'text-kronos-dim', tooltip = null }) =>
  <div className="flex items-stretch gap-1.5 min-w-[50px] relative group">
      {icon && <img src={icon} className="w-[30px] object-contain flex-shrink-0 self-stretch" alt="" />}
      <div className="flex flex-col justify-between py-[1px] min-w-0">
        <span className={`text-[10px] ${accent} uppercase font-black tracking-widest leading-tight`}>{label}</span>
        <span className="text-sm font-bold text-kronos-text leading-tight">{value}</span>
      </div>
      {tooltip}
    </div>;

  return (
    <div className="flex items-center gap-5 ml-auto pr-3">
      <StatWidget icon={iconSrc('Credits')} label="Credits" value={credits.toLocaleString()} />
      <StatWidget icon={iconSrc('Platinum')} label="Platinum" value={platinum.toLocaleString()} accent="text-kronos-accent" />
      <StatWidget icon={iconSrc('EndoIconRenderLarge')} label="Endo" value={endo.toLocaleString()} accent="text-orange-400" />
      <div className="h-8 w-px bg-white/10" />
      <StatWidget icon={iconSrc('Forma')} label="Forma" value={forma + aura_forma + stance_forma + umbra_forma} accent="text-kronos-accent"
      tooltip={
      <div className="absolute top-full right-0 mt-2 p-3 bg-kronos-bg border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110] min-w-[180px] glass-panel">
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-3">
                <span className="flex items-center gap-2 text-[15px] text-kronos-dim uppercase font-bold whitespace-nowrap">{iconSrc('Forma') && <img src={iconSrc('Forma')} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}{t('ui.inventory.forma_standard')}</span>
                <span className="text-[15px] font-bold text-kronos-text tabular-nums">{forma}</span>
              </div>
              {aura_forma > 0 && <div className="flex justify-between items-center gap-3"><span className="flex items-center gap-2 text-[15px] text-blue-300 uppercase font-bold whitespace-nowrap">{iconSrc('FormaUmbra') && <img src={iconSrc('FormaUmbra')} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}{t('ui.inventory.forma_aura')}</span><span className="text-[15px] font-bold text-kronos-text tabular-nums">{aura_forma}</span></div>}
              {stance_forma > 0 && <div className="flex justify-between items-center gap-3"><span className="flex items-center gap-2 text-[15px] text-green-300 uppercase font-bold whitespace-nowrap">{iconSrc('FormaStance') && <img src={iconSrc('FormaStance')} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}{t('ui.inventory.forma_stance')}</span><span className="text-[15px] font-bold text-kronos-text tabular-nums">{stance_forma}</span></div>}
              {umbra_forma > 0 && <div className="flex justify-between items-center gap-3"><span className="flex items-center gap-2 text-[15px] text-purple-400 uppercase font-bold whitespace-nowrap">{iconSrc('OmegaForma') && <img src={iconSrc('OmegaForma')} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}{t('ui.inventory.forma_umbra')}</span><span className="text-[15px] font-bold text-kronos-text tabular-nums">{umbra_forma}</span></div>}
            </div>
          </div>
      } />
      
      <StatWidget icon={iconSrc('Reactor')} label="Reactors" value={orokin_reactor} accent="text-yellow-500" />
      <StatWidget icon={iconSrc('Catalyst')} label="Catalysts" value={orokin_catalyst} accent="text-blue-400" />
    </div>);

}
