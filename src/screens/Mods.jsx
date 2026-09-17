import { useState, useMemo, useEffect } from 'react';
import { useUi } from '../contexts/UiContext'
import { Search, ArrowUpDown, Filter, Layers, LayoutGrid, List } from 'lucide-react';
import { PageLayout, Input, Button, Tabs, MonitorState } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import ModCard from '../components/ModCard';
import ItemImage from '../components/ItemImage';
import { getAcquisitionInfo } from '../lib/acquisitionInfo';
import { loadAcquisitionData } from '../lib/acquisitionData';
import AcquisitionDrawer, { useAcquisitionDrawer } from '../components/AcquisitionDrawer';
import PreviewAcquisitionDrawer from '../preview/acquisition/PreviewAcquisitionDrawer';
import { MOD_WIKI_TAGS } from '../lib/modWikiTags';
import { IS_PREVIEW } from '../lib/buildProfile';
import PreviewModsLayout from '../components/PreviewModsLayout';

const CARD_WIDTH = 200;
const COL_GAP = 50;

export default function Mods() {
  const { t } = useUi()
  // Keep the asset filename separate from the translated display label. Some
  // categories do not have a same-named export asset (Robotic and Tome).
  // `category` is the internal, always-English value stored on each mod by
  // extractModCategory() in inventoryParser.js - filtering must key off this,
  // never off the translated `label`, or non-English locales match nothing.
  const CATEGORIES = [
    { label: t('mods.cat_all'), icon: 'All', category: 'All' },
    { label: t('mods.cat_warframe'), icon: 'Warframe', category: 'Warframe' },
    { label: t('mods.cat_primary'), icon: 'Primary', category: 'Primary' },
    { label: t('mods.cat_secondary'), icon: 'Secondary', category: 'Secondary' },
    { label: t('mods.cat_melee'), icon: 'Melee', category: 'Melee' },
    { label: t('mods.cat_sentinels'), icon: 'Sentinels', category: 'Sentinels' },
    { label: t('mods.cat_robotic'), icon: 'Companion', category: 'Robotic' },
    { label: t('mods.cat_beasts'), icon: 'Beasts', category: 'Beasts' },
    { label: t('mods.cat_stance'), icon: 'Stance', category: 'Stance' },
    { label: t('mods.cat_aura'), icon: 'Aura', category: 'Aura' },
    { label: t('mods.cat_exilus'), icon: 'Exilus', category: 'Exilus' },
    { label: t('mods.cat_railjack'), icon: 'Railjack', category: 'Railjack' },
    { label: t('mods.cat_archgun'), icon: 'Archgun', category: 'Archgun' },
    { label: t('mods.cat_archmelee'), icon: 'Archmelee', category: 'Archmelee' },
    { label: t('mods.cat_parazon'), icon: 'Parazon', category: 'Parazon' },
    { label: t('mods.cat_augment'), icon: 'Augment', category: 'Augment' },
    { label: t('mods.cat_antique'), icon: 'Antique', category: 'Antique' },
    { label: t('mods.cat_tome'), icon: 'Mods', category: 'Tome' },
    { label: t('mods.cat_vehicles'), icon: 'Vehicles', category: 'Vehicles' },
  ];

  const SORT_OPTIONS = [
    { id: 'name', label: t('mods.sort_name') },
    { id: 'rank', label: t('mods.sort_rank') },
    { id: 'quantity', label: t('mods.sort_count') },
    { id: 'rarity', label: t('mods.sort_rarity') },
    { id: 'value', label: t('mods.sort_value') }];

  const { inventoryData, isInventoryLoading, ExportTextIcons, cardImagesPath, fixProgress, allPrices, isPriceLoading, priceFetchProgress, dropIndex, recipeResultIndex, exaltedWeaponIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exportComponentIndex } = useMonitoring();

  const [acquisitionOverrides, setAcquisitionOverrides] = useState(null);
  useEffect(() => {
    invoke('read_file_bytes', { relative: 'data/assets/data/acquisition_overrides.json' })
      .then((bytes) => setAcquisitionOverrides(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
      .catch(() => setAcquisitionOverrides({ components: {}, mods: {} }));
  }, []);
  const { openKey, toggle, close } = useAcquisitionDrawer();
  const [framesPath, setFramesPath] = useState('');
  const [iconsPath, setIconsPath] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('All');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [maxRankOnly, setMaxRankOnly] = useState(false);
  const [hideConclave, setHideConclave] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const [viewMode, setViewMode] = useState('grid'); // Preview-only
  const mods = useMemo(() => (inventoryData?.mods_catalog ?? inventoryData?.mods ?? [])
    // Peely Pix/Archimedea stickers have their own tab. They are represented
    // alongside mods in the parser for inventory compatibility, but must not
    // be rendered as mods.
    .filter((mod) => !mod?._isSticker), [inventoryData]);
  const modPrices = allPrices;
  const loadingPrices = isPriceLoading;

  useEffect(() => {
    invoke('get_mod_frames_path').then((p) => setFramesPath(p)).catch(() => {});
  }, []);

  useEffect(() => {
    invoke('get_icons_path').then((p) => setIconsPath(p)).catch(() => {});
  }, []);

  useEffect(() => {
    setVisibleCount(60);
  }, [searchQuery, selectedCategoryKey, ownershipFilter, maxRankOnly, hideConclave]);

  const filtered = useMemo(() => {
    let items = mods;

    if (searchQuery) {
      const q = searchQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
      items = items.filter((m) => {
        const descText = (m.description ?? '') + ' ' + (m.levelStats?.flatMap((ls) => ls.stats).join(' ') ?? '') + ' ' + (m.arcaneType ?? '');
        const tagText = (MOD_WIKI_TAGS[m.unique_name] ?? []).join(' ');
        return q.every((w) => (m.name ?? '').toLowerCase().includes(w) || descText.toLowerCase().includes(w) || tagText.toLowerCase().includes(w));
      });
    }
    if (selectedCategoryKey === 'Exilus') {
      // Exilus-slot compatibility cuts across mod families (a Tome mod, a
      // Warframe mod, etc. can all be Exilus-slotted) - match the trait
      // directly instead of a single exclusive category, so a mod like
      // Fass Canticle shows under both Tome and Exilus.
      items = items.filter((m) => m.isExilus);
    } else if (selectedCategoryKey !== 'All') {
      items = items.filter((m) => m.category === selectedCategoryKey);
    }
    if (ownershipFilter === 'owned') {
      items = items.filter((m) => m.owned);
    } else if (ownershipFilter === 'unowned') {
      items = items.filter((m) => !m.owned);
    }
    if (maxRankOnly) {
      items = items.filter((m) => m.rank >= m.max_rank);
    }
    if (hideConclave) {
      items = items.filter((m) => !m.unique_name?.includes('/PvPMods/'));
    }

    const sorted = [...items].sort((a, b) => {
      let av, bv;
      if (sortCriteria === 'rarity') {
        const order = ['common', 'uncommon', 'rare', 'legendary'];
        av = order.indexOf((a.rarity ?? '').toLowerCase());
        bv = order.indexOf((b.rarity ?? '').toLowerCase());
      } else if (sortCriteria === 'value') {
        av = modPrices?.[a.unique_name] ?? 0;
        bv = modPrices?.[b.unique_name] ?? 0;
      } else {
        av = a[sortCriteria] ?? '';
        bv = b[sortCriteria] ?? '';
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
      }
      return sortDirection === 'asc' ? av < bv ? -1 : av > bv ? 1 : 0 : av < bv ? 1 : av > bv ? -1 : 0;
    });
    return sorted;
  }, [mods, searchQuery, selectedCategoryKey, ownershipFilter, maxRankOnly, hideConclave, sortCriteria, sortDirection]);

  const visible = filtered.slice(0, visibleCount);
  const uniqueMods = new Set(filtered.map((m) => m.name)).size;
  const dupCount = filtered.filter((m) => m.quantity > 1).length;

  const openItem = useMemo(() => {
    if (!openKey) return null;
    const mod = visible.find((m) => m.unique_name === openKey);
    if (!mod) return null;
    return {
      uniqueName: mod.unique_name,
      displayName: mod.name,
      image: cardImagesPath && mod.icon ? convertFileSrc(`${cardImagesPath}${mod.icon.startsWith('/') ? mod.icon : '/' + mod.icon}`) : mod.image,
      category: mod.rarity || 'Mod',
      owned: mod.owned,
      info: getAcquisitionInfo(mod.unique_name, mod.name, dropIndex, acquisitionOverrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex),
    };
  }, [openKey, visible, cardImagesPath, dropIndex, acquisitionOverrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exportComponentIndex]);

  const handleSortChange = (id) => {
    if (id === sortCriteria) {
      setSortDirection((d) => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCriteria(id);
      setSortDirection('asc');
    }
  };

  // Preview-only persistent category sidebar (wide widths). Independent of
  // the horizontal categories row above (kept as the compact/narrow-width
  // selector) - a small duplication of the icon-resolution rather than
  // sharing it, so this stays isolated from the already-verified header.
  const renderCategoryNavigator = () =>
  <nav
    className="hidden lg:flex flex-col gap-1 w-48 flex-shrink-0 overflow-y-auto py-1"
    style={{ scrollbarWidth: 'thin' }}
    aria-label={t('screen.mods')}>
    {CATEGORIES.map(({ label, icon, category }) => {
      const iconUrl = iconsPath ? convertFileSrc(`${iconsPath}/Categories/${icon}.png`) : null;
      const isActive = selectedCategoryKey === category;
      return (
        <button
          key={category}
          onClick={() => setSelectedCategoryKey(category)}
          aria-current={isActive ? 'page' : undefined}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-tight text-left transition-all whitespace-nowrap ${
          isActive ?
          'bg-kronos-accent text-kronos-bg' :
          'text-kronos-dim hover:text-white hover:bg-white/5'}`
          }>
          {iconUrl && <img src={iconUrl} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
          <span className="truncate">{label}</span>
        </button>
      );
    })}
  </nav>;

  const renderHeaderPanel = () =>
  <div className="flex flex-col gap-4" data-preview-mods-header={IS_PREVIEW ? '' : undefined}>
      <div className="flex items-center gap-3 flex-wrap" data-preview-mods-toolbar={IS_PREVIEW ? '' : undefined}>
        <div className="relative flex-1 min-w-[200px] group" data-preview-mods-search={IS_PREVIEW ? '' : undefined}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input placeholder={t('mods.search_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 bg-black/20 border-white/5 h-[42px]" />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2" data-preview-mods-sort={IS_PREVIEW ? '' : undefined}>
          <ArrowUpDown size={12} className="text-kronos-accent mx-1" />
          <div className="flex gap-1">
            {SORT_OPTIONS.map((c) => {
            const isActive = sortCriteria === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSortChange(c.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${isActive ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>
                
                  {c.label}
                  {isActive && <ArrowUpDown size={10} className={sortDirection === 'desc' ? 'rotate-180' : ''} />}
                </button>);

          })}
          </div>
        </div>

        {/* Filters (Max Rank + Hide Conclave) */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2" data-preview-mods-filters={IS_PREVIEW ? '' : undefined}>
          <Filter size={14} className="text-kronos-dim mx-1" />
          <div className="flex gap-1">
            {[
              { id: 'all', label: t('ui.inventory.tab_all') },
              { id: 'owned', label: t('ui.inventory.filter_owned') },
              { id: 'unowned', label: t('ui.inventory.unowned') },
            ].map((opt) => (
              <button
              key={opt.id}
              onClick={() => setOwnershipFilter(opt.id)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${ownershipFilter === opt.id ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
              >{opt.label}
              </button>
            ))}
            <button
            onClick={() => setMaxRankOnly((v) => !v)}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${maxRankOnly ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>{t('mods.max_rank')}


          </button>
            <button
            onClick={() => setHideConclave((v) => !v)}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${hideConclave ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>{t('mods.hide_conclave')}


          </button>
          </div>
        </div>

        {IS_PREVIEW &&
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

      {/* Preview-only: categories also move to a persistent sidebar
          (renderCategoryNavigator) at wide widths, so this row - already
          wrapping rather than a hidden horizontal rail - is hidden there and
          remains only as the compact/narrow-width selector. */}
      <div className={IS_PREVIEW ? 'flex items-center gap-3 lg:hidden' : 'flex items-center gap-3'} data-preview-mods-categories-row={IS_PREVIEW ? '' : undefined}>
        <div className="flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5" data-preview-mods-categories={IS_PREVIEW ? '' : undefined}>
          {CATEGORIES.map(({ label, icon, category }) => {
          const iconUrl = iconsPath ?
          convertFileSrc(`${iconsPath}/Categories/${icon}.png`) :
          null;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategoryKey(category)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap font-sans flex items-center gap-1.5 ${selectedCategoryKey === category ?
              'bg-kronos-accent text-kronos-bg font-black shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.4)] scale-[1.02]' :
              'text-kronos-dim hover:text-white hover:bg-white/5'}`
              }>
              
                {iconUrl && <img src={iconUrl} className="w-4 h-4 object-contain" alt="" />}
                {label}
              </button>);

        })}
        </div>
      </div>
    </div>;


  const mainContent = (
    <>
      {inventoryData && (fixProgress.checking || fixProgress.phase && fixProgress.phase !== 'done') ?
      fixProgress.phase ?
      <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Layers className="w-12 h-12 text-kronos-accent animate-pulse" />
            <div className="w-full max-w-md">
              <div className="flex justify-between text-xs text-kronos-dim mb-1">
                <span>
                  {fixProgress.phase === 'extracting' ? 'Extracting mod images…' :
              fixProgress.phase === 'fixing' ? 'Processing mod images…' :
              fixProgress.phase === 'compositing' ? 'Compositing mod images…' :
              'Preparing mod images…'}
                </span>
                <span>{fixProgress.current} / {fixProgress.total}</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
              className="h-full bg-kronos-accent rounded-full transition-all duration-300"
              style={{ width: `${fixProgress.current / fixProgress.total * 100}%` }} />
            
              </div>
              {fixProgress.current_file &&
          <p className="text-[10px] text-kronos-dim/50 mt-1 truncate max-w-md">{fixProgress.current_file}</p>
          }
            </div>
          </div> :

      <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
          </div> :

      isInventoryLoading ?
      <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
        </div> :
      !inventoryData ?
      <MonitorState className="py-20" /> :
      !framesPath ?
      <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
        </div> :
      visible.length === 0 ?
      <div className="text-center py-20 text-kronos-dim italic">{t('mods.no_match')}</div> :

      <>
          {priceFetchProgress &&
        <div className="flex items-center gap-2 pb-2 px-1">
              <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[10px] font-black uppercase text-kronos-accent">Fetching plat values {priceFetchProgress.current}{t('inventory.fetching_of')}{priceFetchProgress.total}...</span>
            </div>
        }
          {loadingPrices && !priceFetchProgress &&
        <div className="flex items-center gap-2 pb-2 px-1">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] font-black uppercase text-kronos-accent">{t('ui.inventory.fetching_prices')}</span>
            </div>
        }
          <div
          className={IS_PREVIEW && viewMode === 'list' ? 'flex flex-col gap-1.5 pb-4' : 'grid pb-4'}
          data-preview-mods-grid={IS_PREVIEW ? '' : undefined}
          style={IS_PREVIEW && viewMode === 'list' ? undefined : {
            gridTemplateColumns: `repeat(auto-fill, ${CARD_WIDTH}px)`,
            gap: `${COL_GAP}px`,
            justifyContent: 'center'
          }}>

          {visible.map((mod, i) => (
          IS_PREVIEW && viewMode === 'list' ?
          // Dense list row: same underlying mod, a single-line alternative to
          // ModCard for aligning name/polarity/rank/owned/value across many
          // mods at once for comparison.
          <div
            key={`${mod.unique_name}_${mod.rank}_${i}`}
            className={`relative flex items-center gap-3 px-3 py-2 rounded-xl border border-white/5 bg-black/20 cursor-pointer transition-all hover:bg-white/5 ${mod.owned ? '' : 'grayscale opacity-60'}`}
            onClick={() => toggle(mod.unique_name)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(mod.unique_name); } }}
            role="button"
            tabIndex={0}
            aria-label={mod.name}>
            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-kronos-panel/30 rounded overflow-hidden">
              {mod.image && (
                <ItemImage
                  src={cardImagesPath && mod.icon ? convertFileSrc(`${cardImagesPath}${mod.icon.startsWith('/') ? mod.icon : '/' + mod.icon}`) : mod.image}
                  resolveFallbackSrc={cardImagesPath && mod.icon ? () => mod.image : undefined}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                  placeholderClassName="w-full h-full text-[5px]" />
              )}
            </div>
            <h4 className="font-bold text-xs uppercase text-kronos-text truncate flex-1 min-w-0">{mod.name}</h4>
            <div className="flex items-center gap-3 flex-shrink-0 text-[10px] font-black uppercase">
              {mod.polarity && <span className="text-kronos-dim">{mod.polarity}</span>}
              {mod.max_rank > 0 && <span className={mod.rank >= mod.max_rank ? 'text-blue-400' : 'text-kronos-dim'}>R{mod.rank ?? 0}/{mod.max_rank}</span>}
              <span className={mod.owned ? 'text-kronos-accent' : 'text-kronos-dim/30'}>{mod.owned ? (mod.quantity > 1 ? `×${mod.quantity}` : t('ui.inventory.filter_owned')) : t('ui.inventory.unowned')}</span>
              {(modPrices?.[mod.unique_name] ?? 0) > 0 && <span className="text-kronos-accent">{modPrices[mod.unique_name]}p</span>}
            </div>
          </div> :
          <div
            key={`${mod.unique_name}_${mod.rank}_${i}`}
            className={`relative cursor-pointer ${mod.owned ? '' : 'grayscale opacity-60'}`}
            onClick={() => toggle(mod.unique_name)}
            onKeyDown={IS_PREVIEW ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle(mod.unique_name);
              }
            } : undefined}
            role={IS_PREVIEW ? 'button' : undefined}
            tabIndex={IS_PREVIEW ? 0 : undefined}
            aria-label={IS_PREVIEW ? mod.name : undefined}
            data-preview-mod-card={IS_PREVIEW ? '' : undefined}>
            <ModCard
              mod={mod}
              framesPath={framesPath}
              iconsPath={iconsPath}
              cardImagesPath={cardImagesPath}
              width={CARD_WIDTH}
              exportTextIcons={ExportTextIcons}
              platValue={modPrices?.[mod.unique_name] ?? 0}
              pricesLoading={loadingPrices} />
          </div>
            ))}
          </div>
          {visibleCount < filtered.length &&
        <div className="flex justify-center py-8">
              <Button onClick={() => setVisibleCount((prev) => prev + 60)} className="text-[10px] font-black uppercase tracking-widest">
                {t('mods.load_more', { remaining: filtered.length - visibleCount })}
              </Button>
            </div>
        }
        </>
      }
    </>
  );

  const pageLayoutProps = {
    titleKey: 'screen.mods',
    subtitle: `${filtered.length} total · ${uniqueMods} unique · ${dupCount} duplicate`,
    headerPanel: renderHeaderPanel()
  };

  return (
    <>
    {IS_PREVIEW ? (
      <div className="flex gap-4 flex-1 min-h-0 h-full">
        {renderCategoryNavigator()}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <PreviewModsLayout enabled={IS_PREVIEW}>
            <PageLayout {...pageLayoutProps}>{mainContent}</PageLayout>
          </PreviewModsLayout>
        </div>
      </div>
    ) : (
      <PreviewModsLayout enabled={IS_PREVIEW}>
        <PageLayout {...pageLayoutProps}>{mainContent}</PageLayout>
      </PreviewModsLayout>
    )}
    {openItem && (IS_PREVIEW
      ? <PreviewAcquisitionDrawer item={openItem} onClose={close} />
      : <AcquisitionDrawer item={openItem} onClose={close} />)}
    </>);

}
