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
import { Search, Plus, Minus, Trash2, Target as TargetIcon } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { PageLayout, Card, Input, Button, MonitorState } from '../components/UI';
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

function formatCount(n) {
  return Number.isFinite(n) ? n.toLocaleString() : '0';
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
