/**
 * FarmingTargets.jsx
 *
 * Stage 4C "Farming Targets" (GitHub board task #82eefb37, route
 * `farming-targets`, nav group "Planning"). Lets the user pick any item with
 * acquisition data as a target, then shows a combined shopping list of every
 * ingredient still needed across all of them.
 *
 * Scoped as "Option B" (MVP) per the user's explicit decision: no
 * reservations, reminders, or cross-screen wiring yet. The persistence
 * schema (farmingTargets/store.js) and the aggregation engine
 * (farmingTargets/aggregation.js) are both built so an "Option A" build can
 * add those later without a rewrite or a data migration - see the comments
 * in those two files.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, Target as TargetIcon, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { invoke } from '../lib/logging/tauri';
import { PageLayout, Card, Input, Button, MonitorState, Tabs, Select, Toggle } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useUi } from '../contexts/UiContext';
import ItemImage from '../components/ItemImage';
import AcquisitionDrawer, { useAcquisitionDrawer } from '../components/AcquisitionDrawer';
import PreviewAcquisitionDrawer from '../preview/acquisition/PreviewAcquisitionDrawer';
import { IS_PREVIEW } from '../lib/buildProfile';
import { getAcquisitionInfo } from '../lib/acquisitionInfo';
import { categoryDisplayLabel } from '../lib/categoryLabels';
import {
  loadFarmingTargets, saveFarmingTargets, createFarmingTarget, addTarget, removeTarget, setTargetQuantity,
} from '../lib/farmingTargets/store';
import { computeFarmingTargetsView } from '../lib/farmingTargets/aggregation';
import { buildFarmingTargetsScreenModel } from '../lib/farmingTargets/screenModel.js';
import { event } from '../lib/logging/logger.js';

function formatCount(n) {
  return Number.isFinite(n) ? n.toLocaleString() : '0';
}

const FARM_TABS = [
  ['all', 'farming_targets.tab_all'], ['missions', 'farming_targets.tab_missions'],
  ['enemies', 'farming_targets.tab_enemies'], ['planets', 'farming_targets.tab_planets'],
  ['relics', 'farming_targets.tab_relics'], ['vendors', 'farming_targets.tab_vendors'],
  ['conclave', 'farming_targets.tab_conclave'],
];

function chanceLabel(chance) {
  return chance == null ? '—' : `${(Number(chance) * 100).toFixed(2)}%`;
}

function HonestyBadge({ place, t }) {
  const labels = { node: t('farming_targets.honesty_node'), 'fixed-boss': t('farming_targets.honesty_boss'), 'wiki-area': t('farming_targets.honesty_wiki_area'), planet: t('farming_targets.honesty_planet'), 'source-only': t('farming_targets.honesty_source'), unknown: t('farming_targets.honesty_unknown') };
  return <span className="rounded-full border border-kronos-accent/30 bg-kronos-accent/10 px-2 py-0.5 text-[9px] text-kronos-accent">{labels[place?.level] ?? labels.unknown}</span>;
}

function PreviewFarmingView({ targets, model, t, selectedTarget, setSelectedTarget, tab, setTab, minChance, setMinChance, missionType, setMissionType, faction, setFaction, groupPlanet, setGroupPlanet, toggle, onRemoveTarget, onQuantityChange }) {
  const target = targets.find((item) => item.id === selectedTarget) ?? targets[0];
  const targetRows = model.ledger.filter((row) => target?.name && row.usedBy.some((entry) => entry.targetId === target.id));
  const missionOptions = [{ id: '', label: t('farming_targets.filter_all') }, ...[...new Set(model.ranked.map((row) => row.place.missionType).filter(Boolean))].sort().map((value) => ({ id: value, label: value }))];
  const factionOptions = [{ id: '', label: t('farming_targets.filter_all') }, ...[...new Set(model.ranked.map((row) => row.place.faction).filter(Boolean))].sort().map((value) => ({ id: value, label: value }))];
  return (
    <div className="space-y-5" data-preview-farming-targets>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          [t('farming_targets.summary_targets'), targets.length],
          [t('farming_targets.summary_needed'), model.ledger.filter((row) => row.stillNeeded > 0).length],
          [t('farming_targets.summary_places'), model.ranked.length],
          [t('farming_targets.summary_conclave'), model.conclaveOnlyItems.length],
        ].map(([label, value]) => <Card key={label} className="p-3"><p className="text-[10px] uppercase text-kronos-dim">{label}</p><p className="mt-1 text-xl font-black text-kronos-accent">{value}</p></Card>)}
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-kronos-accent" /><h2 className="text-sm font-black uppercase">{t('farming_targets.filters')}</h2></div>
        <div className="flex flex-wrap items-end gap-3">
          <Tabs tabs={FARM_TABS.map(([id, key]) => ({ id, label: t(key) }))} activeTab={tab} onChange={setTab} className="flex-1 min-w-[280px]" />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={minChance !== ''} onChange={(e) => setMinChance(e.target.checked ? '0.05' : '')} />{t('farming_targets.min_chance')}</label>
          <Select options={missionOptions} value={missionType} onChange={setMissionType} label={t('farming_targets.mission_type')} className="min-w-[145px]" />
          <Select options={factionOptions} value={faction} onChange={setFaction} label={t('farming_targets.faction')} className="min-w-[125px]" />
          <Toggle checked={groupPlanet} onChange={setGroupPlanet} label={t('farming_targets.group_planet')} />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-5">
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-white/5"><h2 className="text-sm font-black uppercase">{t('farming_targets.farm_next')}</h2><p className="text-xs text-kronos-dim mt-1">{t('farming_targets.coverage_explanation')}</p></div>
          <div className="divide-y divide-white/5">
            {model.ranked.length === 0 && <p className="p-5 text-sm text-kronos-dim">{t('farming_targets.no_sources')}</p>}
            {model.ranked.map((row) => <div key={row.place.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2"><ChevronRight size={14} className="text-kronos-accent" /><strong className="text-sm">{groupPlanet && row.place.planet ? row.place.planet : row.place.name}</strong><HonestyBadge place={row.place} t={t} />{row.place.pvp && <span className="rounded-full bg-fuchsia-400/15 px-2 py-0.5 text-[9px] text-fuchsia-300">{t('farming_targets.pvp')}</span>}<span className="ml-auto text-xs font-bold text-kronos-accent">{t('farming_targets.covers', { count: row.coverage, total: model.ledger.filter((item) => item.stillNeeded > 0).length })}</span></div>
              {row.reason && <p className="text-[10px] text-fuchsia-300">{row.reason}</p>}
              <div className="flex flex-wrap gap-2">{row.coveredItems.flatMap((item) => (item.sources?.length ? item.sources : [item]).map((source, index) => <span key={`${item.itemType}-${source.rotation ?? 'base'}-${index}`} className="rounded-md bg-black/20 px-2 py-1 text-[10px]"><span className="text-kronos-text">{item.name}</span> <span className="text-kronos-accent">{chanceLabel(source.chance)}</span>{source.rotation ? <span className="text-kronos-dim"> · {source.rotation}</span> : null}</span>))}</div>
            </div>)}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-white/5"><h2 className="text-sm font-black uppercase">{t('farming_targets.target_inspector')}</h2><Select options={targets.map((item) => ({ id: item.id, label: item.name }))} value={target?.id ?? ''} onChange={setSelectedTarget} className="mt-3" /></div>
          <div className="p-4 space-y-2">{targetRows.length ? targetRows.map((row) => <div key={row.itemType} className="flex justify-between gap-2 text-xs"><span className="truncate">{row.name}</span><span className="font-bold">{formatCount(row.stillNeeded)}</span></div>) : <p className="text-xs text-kronos-dim">{t('farming_targets.inspector_empty')}</p>}</div>
        </Card>
      </div>

      <Card className="p-0 overflow-x-auto">
        <div className="p-4 border-b border-white/5"><h2 className="text-sm font-black uppercase">{t('farming_targets.ledger')}</h2></div>
        <table className="w-full min-w-[760px] text-left text-xs"><thead className="text-[10px] uppercase text-kronos-dim"><tr>{['item', 'required', 'owned', 'reserved', 'still_needed', 'used_by', 'source'].map((key) => <th key={key} className="px-4 py-3">{t(`farming_targets.column_${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{model.ledger.map((row) => <tr key={row.itemType}><td className="px-4 py-3 font-bold">{row.name}</td><td className="px-4 py-3">{formatCount(row.required)}</td><td className="px-4 py-3">{formatCount(row.owned)}</td><td className="px-4 py-3">{formatCount(row.reserved)}</td><td className={`px-4 py-3 font-black ${row.stillNeeded ? 'text-red-300' : 'text-emerald-300'}`}>{formatCount(row.stillNeeded)}</td><td className="px-4 py-3 text-kronos-dim">{row.usedBy.length}</td><td className="px-4 py-3"><button type="button" onClick={() => toggle(row.itemType)} className="text-kronos-accent hover:underline">{t('farming_targets.view_sources')}</button></td></tr>)}</tbody></table>
      </Card>

      {targets.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{targets.map((item) => <Card key={item.id} className="p-3 flex items-center gap-3"><ItemImage src={item.image} className="w-9 h-9 object-contain" placeholderClassName="w-9 h-9" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{item.name}</p><p className="text-[9px] text-kronos-dim">{t('farming_targets.target_quantity', { count: item.quantity })}</p></div><button type="button" onClick={() => onQuantityChange(item.id, -1)} aria-label={t('farming_targets.decrease_quantity')}><Minus size={13} /></button><button type="button" onClick={() => onQuantityChange(item.id, 1)} aria-label={t('farming_targets.increase_quantity')}><Plus size={13} /></button><button type="button" onClick={() => onRemoveTarget(item.id)} aria-label={t('farming_targets.remove_target')}><Trash2 size={13} /></button></Card>)}</div>}
    </div>
  );
}

export default function FarmingTargets() {
  const { t } = useUi();
  const {
    inventoryData, isInventoryLoading, dropIndex, recipeResultIndex, marketIndex, bundleIndex,
    syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex,
    exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex,
    wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex,
    wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex,
  } = useMonitoring();

  const [acquisitionOverrides, setAcquisitionOverrides] = useState(null);
  useEffect(() => {
    invoke('read_file_bytes', { relative: 'data/assets/data/acquisition_overrides.json' })
      .then((bytes) => setAcquisitionOverrides(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)))))
      .catch(() => setAcquisitionOverrides({ components: {}, mods: {} }));
  }, []);

  const [store, setStore] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadFarmingTargets().then((loaded) => { if (!cancelled) setStore(loaded); });
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((nextStore) => {
    setStore(nextStore);
    saveFarmingTargets(nextStore).catch((err) => console.error('Failed to save farming targets:', err));
  }, []);

  const [search, setSearch] = useState('');
  const [farmTab, setFarmTab] = useState('all');
  const [minChance, setMinChance] = useState('');
  const [missionType, setMissionType] = useState('');
  const [faction, setFaction] = useState('');
  const [groupPlanet, setGroupPlanet] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const { openKey, toggle, close } = useAcquisitionDrawer();

  const targets = store?.targets ?? [];

  const catalog = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const item of inventoryData?.all ?? []) {
      if (!item.unique_name || seen.has(item.unique_name) || item.category === 'rivens' || item.category === 'Arcanes') continue;
      seen.add(item.unique_name);
      list.push(item);
    }
    return list;
  }, [inventoryData]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const targetKeys = new Set(targets.map((tg) => tg.uniqueName));
    return catalog
      .filter((item) => item.name?.toLowerCase().includes(q) && !targetKeys.has(item.unique_name))
      .slice(0, 20);
  }, [catalog, search, targets]);

  const view = useMemo(() => computeFarmingTargetsView(targets, inventoryData), [targets, inventoryData]);
  const screenModel = useMemo(() => IS_PREVIEW ? buildFarmingTargetsScreenModel({
    targets, inventoryData, dropIndex, wikiResourceIndex, wikiVendorIndex,
    filters: { tab: farmTab, minChance: minChance === '' ? undefined : Number(minChance), missionTypes: missionType ? [missionType] : [], factions: faction ? [faction] : [] },
  }) : { ledger: [], ranked: [], conclaveOnlyItems: [] }, [targets, inventoryData, dropIndex, wikiResourceIndex, wikiVendorIndex, farmTab, minChance, missionType, faction]);

  useEffect(() => {
    if (!IS_PREVIEW || isInventoryLoading || !store) return;
    event('farming.screen.summary', { targets: targets.length, ledger: screenModel.ledger.length, still_needed: screenModel.ledger.filter((row) => row.stillNeeded > 0).length, places: screenModel.ranked.length, conclave_only: screenModel.conclaveOnlyItems.length });
  }, [isInventoryLoading, store, targets.length, screenModel]);

  const handleAddTarget = useCallback((item) => {
    if (!store) return;
    const target = createFarmingTarget({
      uniqueName: item.unique_name, name: item.name, image: item.image, category: item.category,
    });
    persist(addTarget(store, target));
    setSearch('');
  }, [store, persist]);

  const handleRemoveTarget = useCallback((id) => {
    if (!store) return;
    persist(removeTarget(store, id));
  }, [store, persist]);

  const handleQuantityChange = useCallback((id, delta) => {
    if (!store) return;
    const current = targets.find((tg) => tg.id === id);
    if (!current) return;
    persist(setTargetQuantity(store, id, (current.quantity ?? 1) + delta));
  }, [store, targets, persist]);

  // A single key namespace for the shared acquisition drawer - either a
  // target's own uniqueName, or a shopping-list ingredient's itemType.
  const drawerLookup = useMemo(() => {
    const map = new Map();
    for (const { target } of view.perTarget) {
      map.set(target.uniqueName, { uniqueName: target.uniqueName, name: target.name, image: target.image, category: target.category });
    }
    for (const entry of view.shoppingList) {
      if (!map.has(entry.itemType)) map.set(entry.itemType, { uniqueName: entry.itemType, name: entry.name, image: entry.image, category: null });
    }
    return map;
  }, [view]);

  const openItem = useMemo(() => {
    if (!openKey) return null;
    const item = drawerLookup.get(openKey);
    if (!item) return null;
    return {
      uniqueName: item.uniqueName,
      displayName: item.name,
      image: item.image,
      category: item.category ? categoryDisplayLabel(item.category, t) : null,
      info: getAcquisitionInfo(item.uniqueName, item.name, dropIndex, acquisitionOverrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex),
    };
  }, [openKey, drawerLookup, dropIndex, acquisitionOverrides, recipeResultIndex, marketIndex, bundleIndex, syndicateIndex, wikiSigilIndex, wikiVendorIndex, wikiTennoGenIndex, wikiBaroIndex, exportVendorIndex, alwaysAvailableIndex, glyphSupplementIndex, wikiBlueprintIndex, wikiResearchIndex, relicStateIndex, wikiResourceIndex, wikiPageAcquisitionIndex, wikiAcquisitionStatusIndex, exaltedWeaponIndex, exportComponentIndex, t]);

  const renderHeaderPanel = () => (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} />
      <Input
        placeholder={t('farming_targets.search_placeholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9 h-9 text-xs"
      />
      {searchResults.length > 0 &&
        <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-kronos-bg/95 backdrop-blur shadow-xl">
          {searchResults.map((item) => (
            <button
              key={item.unique_name}
              type="button"
              onClick={() => handleAddTarget(item)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/10"
            >
              <ItemImage src={item.image} className="w-6 h-6 object-contain shrink-0" placeholderClassName="w-6 h-6" />
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-[9px] uppercase text-kronos-dim shrink-0">{categoryDisplayLabel(item.category, t)}</span>
              <Plus size={12} className="text-kronos-accent shrink-0" />
            </button>
          ))}
        </div>
      }
    </div>
  );

  if (isInventoryLoading || !store) {
    return <PageLayout title={t('nav.farming-targets')}><MonitorState isLoading className="py-20" /></PageLayout>;
  }

  if (IS_PREVIEW) {
    return <>
      <PageLayout title={t('nav.farming-targets')} subtitle={t('farming_targets.subtitle', { count: targets.length })} headerPanel={renderHeaderPanel()}>
        <PreviewFarmingView
          targets={targets} model={screenModel} t={t} selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
          tab={farmTab} setTab={setFarmTab} minChance={minChance} setMinChance={setMinChance} missionType={missionType} setMissionType={setMissionType}
          faction={faction} setFaction={setFaction} groupPlanet={groupPlanet} setGroupPlanet={setGroupPlanet} toggle={toggle}
          onRemoveTarget={handleRemoveTarget} onQuantityChange={handleQuantityChange}
        />
      </PageLayout>
      {openItem && <PreviewAcquisitionDrawer item={openItem} onClose={close} />}
    </>;
  }

  return (
    <>
      <PageLayout
        title={t('nav.farming-targets')}
        subtitle={t('farming_targets.subtitle', { count: targets.length })}
        headerPanel={renderHeaderPanel()}
      >
        <div className="space-y-6">
          {targets.length === 0 ?
            <Card className="p-8 text-center text-kronos-dim text-sm flex flex-col items-center gap-3">
              <TargetIcon size={32} className="text-kronos-dim" />
              <p>{t('farming_targets.empty_title')}</p>
              <p className="text-xs">{t('farming_targets.empty_detail')}</p>
            </Card>
          :
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
              {view.perTarget.map(({ target, recipe, readyToCraft, ownedQuantity }) => (
                <Card key={target.id} className="p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <ItemImage src={target.image} className="w-10 h-10 object-contain shrink-0" placeholderClassName="w-10 h-10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{target.name}</p>
                      <p className="text-[9px] uppercase text-kronos-dim">{categoryDisplayLabel(target.category, t)}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveTarget(target.id)} className="text-kronos-dim hover:text-red-400" aria-label={t('farming_targets.remove_target')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleQuantityChange(target.id, -1)} className="p-1 rounded bg-black/20 hover:bg-black/40" aria-label={t('farming_targets.decrease_quantity')}><Minus size={12} /></button>
                      <span className="text-xs font-bold w-6 text-center">{target.quantity}</span>
                      <button type="button" onClick={() => handleQuantityChange(target.id, 1)} className="p-1 rounded bg-black/20 hover:bg-black/40" aria-label={t('farming_targets.increase_quantity')}><Plus size={12} /></button>
                    </div>
                    {recipe ?
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${readyToCraft ? 'bg-emerald-400 text-black' : 'bg-black/30 text-kronos-dim'}`}>
                        {readyToCraft ? t('farming_targets.ready') : t('farming_targets.in_progress')}
                      </span>
                    :
                      <span className="text-[9px] uppercase text-kronos-dim">{t('farming_targets.owned_count', { count: ownedQuantity })}</span>
                    }
                  </div>
                  <Button variant="secondary" className="text-[10px] py-1.5" onClick={() => toggle(target.uniqueName)}>
                    {t('acquisition_drawer.how_to_obtain')}
                  </Button>
                </Card>
              ))}
            </div>
          }

          {view.shoppingList.length > 0 &&
            <div>
              <h3 className="text-sm font-bold uppercase mb-2">{t('farming_targets.shopping_list')}</h3>
              <Card className="p-0 divide-y divide-white/5">
                {view.shoppingList.map((entry) => (
                  <div key={entry.itemType} className="flex items-center gap-3 px-3 py-2">
                    <ItemImage src={entry.image} className="w-8 h-8 object-contain shrink-0" placeholderClassName="w-8 h-8" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{entry.name}</p>
                      <p className="text-[9px] text-kronos-dim">{t('farming_targets.needed_by', { count: entry.neededBy.length })}</p>
                    </div>
                    <span className={`text-[10px] font-black shrink-0 ${entry.remaining <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCount(entry.have)}/{formatCount(entry.totalNeed)}
                    </span>
                    <button type="button" onClick={() => toggle(entry.itemType)} className="text-kronos-dim hover:text-kronos-accent shrink-0" aria-label={t('acquisition_drawer.how_to_obtain')}>
                      <Search size={13} />
                    </button>
                  </div>
                ))}
              </Card>
            </div>
          }
        </div>
      </PageLayout>
      {openItem && (IS_PREVIEW
        ? <PreviewAcquisitionDrawer item={openItem} onClose={close} />
        : <AcquisitionDrawer item={openItem} onClose={close} />)}
    </>
  );
}
