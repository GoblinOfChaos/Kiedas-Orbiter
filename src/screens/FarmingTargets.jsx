/**
 * FarmingTargets.jsx
 *
 * Stage 4C "Farming Targets" (GitHub board task #82eefb37, route
 * `farming-targets`, nav group "Planning"). Lets the user pick any item with
 * acquisition data as a target, then shows a combined shopping list of every
 * ingredient still needed across all of them.
 *
 * Preview adds reservations, target lifecycle metadata, due-date badges, and
 * shared entry points while keeping Stable on its existing path.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, Target as TargetIcon, ChevronRight, Archive, CheckCircle2 } from 'lucide-react';
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
  loadFarmingTargets, saveFarmingTargets, createFarmingTarget, addTarget, removeTarget, setTargetQuantity, setTargetPriority, setTargetDueDate, setTargetStatus, setTargetReservation,
} from '../lib/farmingTargets/store';
import { computeFarmingTargetsView } from '../lib/farmingTargets/aggregation';
import { buildFarmingTargetsScreenModel, buildPreviewPlaceIndex } from '../lib/farmingTargets/screenModel.js';
import { RELIC_REFINEMENTS } from '../lib/farmingTargets/relicPlaces.js';
import { event } from '../lib/logging/logger.js';
import { activeTargets, dueState, targetReservationQuantity } from '../lib/farmingTargets/state.js';

function validLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function formatCount(n) {
  return Number.isFinite(n) ? n.toLocaleString() : '0';
}

const FARM_TABS = [
  ['all', 'farming_targets.tab_all'], ['missions', 'farming_targets.tab_missions'],
  ['enemies', 'farming_targets.tab_enemies'],
  ['relics', 'farming_targets.tab_relics'], ['vendors', 'farming_targets.tab_vendors'],
  ['conclave', 'farming_targets.tab_conclave'],
];

function chanceLabel(chance) {
  return chance == null ? '—' : `${(Number(chance) * 100).toFixed(2)}%`;
}

function HonestyBadge({ place, t }) {
  const labels = { node: t('farming_targets.honesty_node'), 'fixed-boss': t('farming_targets.honesty_boss'), 'wiki-area': t('farming_targets.honesty_wiki_area'), planet: t('farming_targets.honesty_planet'), 'source-only': t('farming_targets.honesty_source'), vaulted: t('farming_targets.relic_vaulted'), unknown: t('farming_targets.honesty_unknown') };
  return <span className="rounded-full border border-kronos-accent/30 bg-kronos-accent/10 px-2 py-0.5 text-[9px] text-kronos-accent">{labels[place?.level] ?? labels.unknown}</span>;
}

function RelicPlaceRow({ row, total, t, onHowToGet }) {
  return <div className="p-4 space-y-2">
    <div className="flex flex-wrap items-center gap-2"><ChevronRight size={14} className="text-kronos-accent" /><strong className="text-sm">{row.place.name}</strong><HonestyBadge place={row.place.vaulted ? { ...row.place, level: 'vaulted' } : row.place} t={t} /><span className="ml-auto text-xs font-bold text-kronos-accent">{t('farming_targets.covers', { count: row.coverage, total })}</span></div>
    <div className="flex flex-wrap gap-2 text-[10px] text-kronos-dim"><span>{t('farming_targets.relic_owned', { count: row.place.ownedCount })}</span>{RELIC_REFINEMENTS.map((refinement) => <span key={refinement}>{refinement}: {row.place.refinements[refinement] ?? 0}</span>)}{!row.place.vaulted && row.place.sources.length > 0 && <button type="button" onClick={() => onHowToGet(row.place.uniqueName)} className="text-kronos-accent hover:underline">{t('farming_targets.relic_how_to_get')}</button>}</div>
    <div className="flex flex-wrap gap-2">{row.coveredItems.map((item) => <span key={item.itemType} className="rounded-md bg-black/20 px-2 py-1 text-[10px]"><span className="text-kronos-text">{item.name}</span>{RELIC_REFINEMENTS.map((refinement) => <span key={refinement} className="ml-2 text-kronos-accent">{refinement[0]} {item.chances[refinement] == null ? '—' : `${(item.chances[refinement] * 100).toFixed(2)}%`}</span>)}</span>)}</div>
  </div>;
}

export function PreviewFarmingView({ targets, reservations, model, t, selectedTarget, setSelectedTarget, tab, setTab, minChanceOn, setMinChanceOn, minChancePct, setMinChancePct, hideDone, setHideDone, hideConclave, setHideConclave, faction, setFaction, groupPlanet, setGroupPlanet, toggle, onRemoveTarget, onQuantityChange, onTargetChange, onReserve }) {
  const target = targets.find((item) => item.id === selectedTarget) ?? targets[0];
  const effectiveTargetId = target?.id ?? null;
  const targetRows = model.ledger.filter((row) => target?.name && row.usedBy.some((entry) => entry.targetId === target.id) && (!hideDone || row.stillNeeded > 0));
  const stillNeededCount = model.ledger.filter((row) => row.stillNeeded > 0).length;
  const factionOptions = [{ id: '', label: t('farming_targets.faction_filter_all') }, ...[...new Set(model.ranked.map((row) => row.place.faction).filter(Boolean))].sort().map((value) => ({ id: value, label: value }))];
  return (
    <div className="space-y-5" data-preview-farming-targets>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          [t('farming_targets.summary_targets'), targets.length],
          [t('farming_targets.summary_needed'), stillNeededCount],
          [t('farming_targets.summary_places'), model.ranked.length],
          [t('farming_targets.summary_conclave'), model.conclaveOnlyItems.length],
        ].map(([label, value]) => <Card key={label} className="p-3"><p className="text-[10px] uppercase text-kronos-dim">{label}</p><p className="mt-1 text-xl font-black text-kronos-accent">{value}</p></Card>)}
      </div>

      <Card className="p-4 space-y-3">
        <Tabs tabs={FARM_TABS.map(([id, key]) => ({ id, label: t(key) }))} activeTab={tab} onChange={setTab} className="w-fit max-w-full flex-nowrap overflow-x-auto" />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 [&_button[role=switch]]:gap-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0"><Toggle checked={minChanceOn} onChange={setMinChanceOn} label={t('farming_targets.min_chance')} /></div>
            <div className="flex items-center gap-2 text-xs text-kronos-dim">
              <input type="number" min="0" max="100" step="0.5" value={minChancePct} disabled={!minChanceOn} onChange={(e) => setMinChancePct(e.target.value)} aria-label={t('farming_targets.min_chance_value')} className="w-16 rounded bg-black/30 px-2 py-1 text-xs text-kronos-text disabled:opacity-40" />
              <span>%</span>
              {minChanceOn && <span>{t('farming_targets.min_chance_hidden', { count: model.excludedByMinChance ?? 0, percent: minChancePct })}</span>}
            </div>
          </div>
          <div className="shrink-0"><Toggle checked={hideConclave} onChange={setHideConclave} label={t('farming_targets.hide_conclave')} /></div>
          <Select options={factionOptions} value={faction} onChange={setFaction} label={t('farming_targets.faction')} className="min-w-[125px]" />
          <div className="shrink-0"><Toggle checked={groupPlanet} onChange={setGroupPlanet} label={t('farming_targets.group_planet')} /></div>
          <div className="shrink-0"><Toggle checked={hideDone} onChange={setHideDone} label={t('farming_targets.hide_done')} /></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-5">
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-white/5"><h2 className="text-sm font-black uppercase">{t('farming_targets.farm_next')}</h2><p className="text-xs text-kronos-dim mt-1">{t('farming_targets.coverage_explanation')}</p></div>
          <div className="divide-y divide-white/5">
            {model.ranked.length === 0 && <p className="p-5 text-sm text-kronos-dim">{t('farming_targets.no_sources')}</p>}
            {model.ranked.map((row) => tab === 'relics' ? <RelicPlaceRow key={row.place.id} row={row} total={stillNeededCount} t={t} onHowToGet={toggle} /> : <div key={row.place.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2"><ChevronRight size={14} className="text-kronos-accent" /><strong className="text-sm">{groupPlanet && row.place.planet ? row.place.planet : row.place.name}</strong><HonestyBadge place={row.place} t={t} />{row.place.pvp && <span className="rounded-full bg-fuchsia-400/15 px-2 py-0.5 text-[9px] text-fuchsia-300">{t('farming_targets.pvp')}</span>}<span className="ml-auto text-xs font-bold text-kronos-accent">{t('farming_targets.covers', { count: row.coverage, total: stillNeededCount })}</span></div>
              {row.reason && <p className="text-[10px] text-fuchsia-300">{row.reason}</p>}
              <div className="flex flex-wrap gap-2">{row.coveredItems.flatMap((item) => (item.sources?.length ? item.sources : [item]).map((source, index) => <span key={`${item.itemType}-${source.rotation ?? 'base'}-${index}`} className="rounded-md bg-black/20 px-2 py-1 text-[10px]"><span className="text-kronos-text">{item.name}</span> <span className="text-kronos-accent">{chanceLabel(source.chance)}</span>{source.rotation ? <span className="text-kronos-dim"> · Rot {String(source.rotation).replace(/^Rot\s*/i, '')}</span> : null}</span>))}</div>
            </div>)}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-white/5"><h2 className="text-sm font-black uppercase">{t('farming_targets.target_inspector')}</h2><Select options={targets.map((item) => ({ id: item.id, label: item.name }))} value={target?.id ?? ''} onChange={setSelectedTarget} className="mt-3" /></div>
          <div className="p-4 space-y-3">{targetRows.length ? targetRows.map((row) => { const contribution = row.usedBy.find((entry) => entry.targetId === effectiveTargetId); const places = model.ranked.filter((place) => place.coveredItems.some((item) => item.itemType === row.itemType)).slice(0, 3); return <div key={row.itemType} className="rounded-md bg-black/20 p-2 text-xs"><div className="flex items-center gap-2"><ItemImage src={row.image} className="h-7 w-7 object-contain" placeholderClassName="h-7 w-7" /><span className="min-w-0 flex-1 truncate">{row.name}</span><span className="font-bold">{formatCount(row.stillNeeded)}</span></div><div className="mt-1 text-[10px] text-kronos-dim">{t('farming_targets.inspector_required_owned', { required: formatCount(contribution?.quantity ?? 0), owned: formatCount(row.owned), needed: formatCount(row.stillNeeded) })}</div>{places.length > 0 && <div className="mt-1 text-[10px] text-kronos-accent">{places.map((place) => place.place.name).join(' · ')}</div>}</div>; }) : <p className="text-xs text-kronos-dim">{model.targetUnresolved?.some((entry) => entry.targetId === effectiveTargetId) ? t('farming_targets.inspector_unresolved') : t('farming_targets.inspector_resolved')}</p>}</div>
        </Card>
      </div>

      <Card className="p-0 overflow-x-auto">
        <div className="p-4 border-b border-white/5"><h2 className="text-sm font-black uppercase">{t('farming_targets.ledger')}</h2></div>
              <table className="w-full min-w-[860px] text-left text-xs"><thead className="text-[10px] uppercase text-kronos-dim"><tr>{['item', 'required', 'owned', 'reserved', 'still_needed', 'used_by', 'source'].map((key) => <th key={key} className="px-4 py-3">{t(`farming_targets.column_${key}`)}</th>)}<th className="px-4 py-3">{t('farming_targets.reserve')}</th></tr></thead><tbody className="divide-y divide-white/5">{model.ledger.filter((row) => !hideDone || row.stillNeeded > 0).map((row) => <tr key={row.itemType} className={row.overcommitted ? 'bg-red-500/10' : ''}><td className="px-4 py-3 font-bold"><span className="inline-flex items-center gap-2"><ItemImage src={row.image} className="h-6 w-6 object-contain" placeholderClassName="h-6 w-6" /><span>{row.name}</span></span>{row.overcommitted && <span className="ml-2 text-[9px] text-red-300">{t('farming_targets.overcommitted')}</span>}</td><td className="px-4 py-3">{formatCount(row.required)}</td><td className="px-4 py-3">{formatCount(row.owned)}</td><td className="px-4 py-3">{formatCount(row.reserved)}</td><td className={`px-4 py-3 font-black ${row.stillNeeded ? 'text-red-300' : 'text-emerald-300'}`}>{formatCount(row.stillNeeded)}</td><td className="px-4 py-3 text-kronos-dim">{row.usedBy.length}</td><td className="px-4 py-3"><button type="button" onClick={() => toggle(row.itemType)} className="text-kronos-accent hover:underline">{t('farming_targets.view_sources')}</button></td><td className="px-4 py-3"><input aria-label={t('farming_targets.reserve_for', { item: row.name })} type="number" min="0" max={row.owned} value={targetReservationQuantity(reservations, row.itemType, effectiveTargetId)} onChange={(event) => onReserve(row.itemType, Number(event.target.value), effectiveTargetId)} className="w-16 rounded bg-black/30 px-1 py-1 text-xs" /></td></tr>)}</tbody></table>
      </Card>

      {targets.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{targets.map((item) => <Card key={item.id} className="p-3 flex flex-col gap-2"><div className="flex items-center gap-3"><ItemImage src={item.image} className="w-9 h-9 object-contain" placeholderClassName="w-9 h-9" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{item.name}</p><p className="text-[9px] text-kronos-dim">{t('farming_targets.target_quantity', { count: item.quantity })}</p></div>{dueState(item) === 'due' && <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[9px] text-amber-300">{t('farming_targets.due')}</span>}<button type="button" onClick={() => onRemoveTarget(item.id)} aria-label={t('farming_targets.remove_target')}><Trash2 size={13} /></button></div><div className="flex items-center gap-2"><button type="button" onClick={() => onQuantityChange(item.id, -1)} aria-label={t('farming_targets.decrease_quantity')}><Minus size={13} /></button><span className="text-xs font-bold w-6 text-center">{item.quantity}</span><button type="button" onClick={() => onQuantityChange(item.id, 1)} aria-label={t('farming_targets.increase_quantity')}><Plus size={13} /></button><label className="ml-auto text-[9px] text-kronos-dim">{t('farming_targets.priority')} <select value={item.priority ?? 0} onChange={(event) => onTargetChange(item.id, setTargetPriority, event.target.value)} className="rounded bg-black/30 px-1 py-1"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label><input type="date" value={item.dueAt ? String(item.dueAt).slice(0, 10) : ''} onChange={(event) => onTargetChange(item.id, setTargetDueDate, event.target.value === '' ? null : (validLocalDate(event.target.value) ? event.target.value : item.dueAt))} aria-label={t('farming_targets.due_date')} className="rounded bg-black/30 px-1 py-1 text-[9px]" /></div><div className="flex gap-2"><button type="button" onClick={() => onTargetChange(item.id, setTargetStatus, 'complete')} className="text-[9px] text-emerald-300"><CheckCircle2 size={12} className="inline mr-1" />{t('farming_targets.complete')}</button><button type="button" onClick={() => onTargetChange(item.id, setTargetStatus, 'archived')} className="text-[9px] text-kronos-dim"><Archive size={12} className="inline mr-1" />{t('farming_targets.archive')}</button></div></Card>)}</div>}
    </div>
  );
}

export default function FarmingTargets() {
  const { t } = useUi();
  const {
    inventoryData, isInventoryLoading, exportData, dropIndex, recipeResultIndex, marketIndex, bundleIndex, EI, nameToImage, uniqueNameToName,
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
    if (nextStore?.readOnlyCorrupt) return;
    setStore(nextStore);
    saveFarmingTargets(nextStore).catch((err) => console.error('Failed to save farming targets:', err));
  }, []);

  const [search, setSearch] = useState('');
  const [farmTab, setFarmTab] = useState('all');
  // Farm-next filter settings are per-viewer conveniences: remembered in localStorage (try/catch: may be unavailable).
  const readSetting = (key, fallback) => { try { const raw = localStorage.getItem(`farming.${key}`); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } };
  const [minChanceOn, setMinChanceOnState] = useState(() => readSetting('minChanceOn', false) === true);
  const [minChancePct, setMinChancePctState] = useState(() => String(readSetting('minChancePct', '5')));
  const [hideDone, setHideDoneState] = useState(() => readSetting('hideDone', false) === true);
  const rememberSetting = (key, setter) => (value) => { setter(value); try { localStorage.setItem(`farming.${key}`, JSON.stringify(value)); } catch { /* not persisted */ } };
  const setMinChanceOn = rememberSetting('minChanceOn', setMinChanceOnState);
  const setMinChancePct = rememberSetting('minChancePct', setMinChancePctState);
  const setHideDone = rememberSetting('hideDone', setHideDoneState);
  const [hideConclave, setHideConclaveState] = useState(() => readSetting('hideConclave', true) === true);
  const setHideConclave = rememberSetting('hideConclave', setHideConclaveState);
  const [faction, setFaction] = useState('');
  const [groupPlanet, setGroupPlanet] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const { openKey, toggle, close } = useAcquisitionDrawer();

  const targets = useMemo(() => activeTargets(store?.targets), [store?.targets]);

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
  const previewPlaceIndex = useMemo(() => IS_PREVIEW ? buildPreviewPlaceIndex({ dropIndex, wikiResourceIndex, wikiVendorIndex, dict: exportData?.dict ?? {}, regions: exportData?.ExportRegions }) : null, [dropIndex, wikiResourceIndex, wikiVendorIndex, exportData]);
  const screenModel = useMemo(() => IS_PREVIEW ? buildFarmingTargetsScreenModel({
    targets, reservations: store?.reservations, inventoryData, exportData, dropIndex, wikiResourceIndex, wikiVendorIndex, imageMaps: { EI, nameToImage, uniqueNameToName },
    placeIndex: previewPlaceIndex,
    filters: { tab: farmTab, minChance: minChanceOn && minChancePct !== '' && Number.isFinite(Number(minChancePct)) ? Number(minChancePct) / 100 : undefined, hideConclave, factions: faction ? [faction] : [] },
  }) : { ledger: [], ranked: [], relicPlaces: [], conclaveOnlyItems: [] }, [targets, store?.reservations, inventoryData, exportData, dropIndex, wikiResourceIndex, wikiVendorIndex, previewPlaceIndex, EI, nameToImage, uniqueNameToName, farmTab, minChanceOn, minChancePct, hideConclave, faction]);

  useEffect(() => {
    if (!IS_PREVIEW || isInventoryLoading || !store) return;
    event('farming.targets.summary', { targets: targets.length, ledger: screenModel.ledger.length, still_needed: screenModel.ledger.filter((row) => row.stillNeeded > 0).length, places: screenModel.ranked.length, conclave_only: screenModel.conclaveOnlyItems.length, overcommitted: screenModel.ledger.filter((row) => row.overcommitted).length });
    event('farming.relics.summary', { places: screenModel.relicPlaces?.length ?? 0, vaulted: screenModel.relicPlaces?.filter((row) => row.place.vaulted).length ?? 0, owned: screenModel.relicPlaces?.filter((row) => row.place.ownedCount > 0).length ?? 0 });
  }, [isInventoryLoading, Boolean(store), targets.length]);

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

  const handleTargetChange = useCallback((id, updater, value) => {
    if (!store) return;
    persist(updater(store, id, value));
  }, [store, persist]);

  const handleReserve = useCallback((itemType, quantity, targetId) => {
    if (!store || !targetId) return;
    persist(setTargetReservation(store, { itemType, targetId, quantity }));
  }, [store, persist]);

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
    if (IS_PREVIEW) {
      for (const entry of screenModel.ledger) {
        if (!map.has(entry.itemType)) map.set(entry.itemType, { uniqueName: entry.itemType, name: entry.name, image: null, category: null });
      }
      for (const row of screenModel.relicPlaces ?? []) {
        if (!map.has(row.place.uniqueName)) map.set(row.place.uniqueName, { uniqueName: row.place.uniqueName, name: row.place.name, image: null, category: 'relics' });
      }
    }
    return map;
  }, [view, screenModel]);

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
        {store.readOnlyCorrupt && <div role="alert" className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">{t('farming_targets.corrupt_warning')}</div>}
        <PreviewFarmingView
          targets={targets} reservations={store?.reservations} model={screenModel} t={t} selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
          tab={farmTab} setTab={setFarmTab} minChanceOn={minChanceOn} setMinChanceOn={setMinChanceOn} minChancePct={minChancePct} setMinChancePct={setMinChancePct} hideDone={hideDone} setHideDone={setHideDone} hideConclave={hideConclave} setHideConclave={setHideConclave}
          faction={faction} setFaction={setFaction} groupPlanet={groupPlanet} setGroupPlanet={setGroupPlanet} toggle={toggle}
          onRemoveTarget={handleRemoveTarget} onQuantityChange={handleQuantityChange} onTargetChange={handleTargetChange} onReserve={handleReserve}
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
        {store.readOnlyCorrupt && <div role="alert" className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-200">{t('farming_targets.corrupt_warning')}</div>}
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
