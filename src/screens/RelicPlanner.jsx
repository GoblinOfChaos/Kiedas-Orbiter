import { useState, useMemo, useEffect } from 'react';
import { Search, X, Trash2, Package, Sparkles } from 'lucide-react';
import { PageLayout, Card, Input, Button, Toggle, MonitorState } from '../components/UI';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { useMonitoring } from '../contexts/MonitoringContext';
import { getAllRelicRewards, getRelicCatalog, getPartObtainedStatus } from '../lib/relicParser';

export default function RelicPlanner() {
  const { inventoryData, exportData, isInventoryLoading } = useMonitoring();
  const [partSearch, setPartSearch] = useState('');
  const [partFilter, setPartFilter] = useState('all'); // 'all' | 'never-obtained' | 'missing'
  const [need, setNeed] = useState([]); // array of {uniqueName, name}
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [iconsPath, setIconsPath] = useState('');

  useEffect(() => {
    invoke('get_icons_path').then((path) => setIconsPath(path)).catch(() => {});
  }, []);

  const iconSrc = (name) => iconsPath ? convertFileSrc(`${iconsPath}/${name}.png`) : null;

  // Full catalog of distinct prime parts (not just ones from owned relics),
  // ported from wfinfo-ng's RELIC_PLANNER_TAB.py part picker.
  const allParts = useMemo(() => {
    if (!exportData) return [];
    return getAllRelicRewards(exportData, 'en').sort((a, b) => a.name.localeCompare(b.name));
  }, [exportData]);

  const relicCatalog = useMemo(() => getRelicCatalog(exportData, 'en'), [exportData]);

  const ownedRelics = useMemo(() => {
    const owned = new Map();
    for (const relic of inventoryData?.relics || []) {
      const baseName = (relic.name || '')
        .replace(new RegExp(`^${relic.era}\\s+`, 'i'), '')
        .replace(/\s+Relic$/i, '')
        .trim();
      const key = `${relic.era} ${baseName}`;
      const ownedCount = Object.values(relic.refinements || {}).reduce((sum, count) => sum + (count || 0), 0);
      owned.set(key, { ...relic, ownedCount });
    }
    return owned;
  }, [inventoryData]);

  const getPartStatus = (uniqueName, displayName) =>
    getPartObtainedStatus(uniqueName, displayName, inventoryData, exportData, 'en');

  const filteredParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    let parts = q ? allParts.filter((p) => p.name.toLowerCase().includes(q)) : allParts;
    if (partFilter === 'never-obtained') {
      parts = parts.filter((p) => !getPartStatus(p.uniqueName, p.name).everObtained);
    } else if (partFilter === 'missing') {
      parts = parts.filter((p) => !getPartStatus(p.uniqueName, p.name).directOwned);
    }
    return parts;
  }, [allParts, partSearch, partFilter, inventoryData, exportData]);

  const needKeys = useMemo(() => new Set(need.map((n) => n.uniqueName)), [need]);

  const addPart = (part) => {
    if (needKeys.has(part.uniqueName)) return;
    setNeed((prev) => [...prev, part]);
  };
  const removePart = (uniqueName) => {
    setNeed((prev) => prev.filter((n) => n.uniqueName !== uniqueName));
  };
  const clearNeed = () => setNeed([]);

  const addAllMissing = () => {
    // "Missing" (per wfinfo-ng parity) only excludes currently-owned stock,
    // not prior crafts - distinct from "Add Never Obtained" below.
    const statuses = allParts.map((p) => ({ part: p, status: getPartStatus(p.uniqueName, p.name) }));
    const toAdd = statuses.filter(({ part, status }) => {
      if (needKeys.has(part.uniqueName)) return false;
      return !status.directOwned;
    }).map(({ part }) => part);
    if (toAdd.length) setNeed((prev) => [...prev, ...toAdd]);
  };

  const addNeverObtained = () => {
    const statuses = allParts.map((p) => ({ part: p, status: getPartStatus(p.uniqueName, p.name) }));
    const toAdd = statuses.filter(({ part, status }) => !needKeys.has(part.uniqueName) && !status.everObtained).map(({ part }) => part);
    if (toAdd.length) setNeed((prev) => [...prev, ...toAdd]);
  };

  const results = useMemo(() => {
    if (!relicCatalog.length || needKeys.size === 0) return [];
    const out = [];
    for (const relic of relicCatalog) {
      const owned = ownedRelics.get(relic.key)
        || [...ownedRelics.values()].find((candidate) => candidate.era === relic.era
          && (candidate.name || '')
            .replace(new RegExp(`^${candidate.era}\\s+`, 'i'), '')
            .replace(/\s+Relic$/i, '').trim() === relic.name);
      const ownedCount = owned?.ownedCount || 0;
      if (ownedOnly && ownedCount === 0) continue;
      const matches = (relic.rewards || []).filter((rw) => needKeys.has(rw.uniqueName));
      if (matches.length === 0) continue;
      out.push({
        key: relic.key,
        name: relic.name,
        era: relic.era,
        ownedCount,
        matches,
        vaulted: relic.vaulted,
      });
    }
    out.sort((a, b) => (b.ownedCount - a.ownedCount) || (b.matches.length - a.matches.length));
    return out;
  }, [relicCatalog, ownedRelics, needKeys, ownedOnly]);

  const ownedShown = results.filter((r) => r.ownedCount > 0).length;
  const ownedParts = allParts.filter((p) => getPartStatus(p.uniqueName, p.name).directOwned).length;

  if (isInventoryLoading) return <PageLayout title="Relic Planner"><MonitorState isLoading className="py-20" /></PageLayout>;

  return (
    <PageLayout title="Relic Planner" subtitle="Find which relics give you a part you need">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Prime parts', value: allParts.length, icon: Package },
          { label: 'Selected', value: need.length, icon: Sparkles },
          { label: 'Owned matches', value: `${ownedShown}/${results.length}`, icon: Package },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-3 flex items-center gap-3 bg-kronos-panel/30">
            <div className="p-2 rounded-lg bg-kronos-accent/10 text-kronos-accent"><Icon size={16} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-kronos-dim">{label}</p>
              <p className="text-lg font-black text-kronos-text leading-none mt-1">{value}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-4 min-w-0">
        {/* Left: part picker */}
        <Card glow className="p-4 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ maxHeight: 640 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-kronos-dim">Prime Parts</h2>
            <span className="text-[10px] font-black text-kronos-accent">{ownedParts} owned</span>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} />
            <Input placeholder="Search parts..." value={partSearch} onChange={(e) => setPartSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
          <div className="flex gap-1 mb-2 p-1 bg-black/20 rounded-lg border border-white/5">
            {[
              { id: 'all', label: 'All' },
              { id: 'never-obtained', label: 'Never Obtained' },
              { id: 'missing', label: 'Missing' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setPartFilter(f.id)}
                className={`flex-1 px-2 py-1 rounded text-[10px] font-black uppercase transition-all ${partFilter === f.id ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {filteredParts.map((p) => (
              <button
                key={p.uniqueName}
                onClick={() => addPart(p)}
                disabled={needKeys.has(p.uniqueName)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs border transition-colors ${needKeys.has(p.uniqueName) ? 'bg-kronos-accent/10 border-kronos-accent/30 text-kronos-dim' : 'bg-black/20 border-white/5 text-kronos-text hover:border-kronos-accent/40 hover:bg-black/30'}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  {getPartStatus(p.uniqueName, p.name).directOwned && <span className="text-[9px] font-black uppercase text-green-400/80">Owned</span>}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Middle: need list */}
        <Card glow className="p-4 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ maxHeight: 640 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-kronos-dim">Need List</h2>
            <span className="text-[10px] font-black text-kronos-accent">{need.length} selected</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 mb-3">
            {need.length === 0 ?
              <div className="flex flex-col items-center justify-center text-center gap-2 py-10 px-3">
                <Sparkles size={22} className="text-kronos-dim/60" />
                <p className="text-xs text-kronos-dim italic">Add parts from the left to search relics for them.</p>
              </div>
            :
              need.map((n) => (
                <div key={n.uniqueName} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-black/20 border border-white/5">
                  <span className="text-xs text-kronos-text truncate">{n.name}</span>
                  <button onClick={() => removePart(n.uniqueName)} className="text-kronos-dim hover:text-red-400 flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))
            }
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={clearNeed} className="flex-1 text-xs" variant="secondary">
                <Trash2 size={12} className="mr-1" /> Clear
              </Button>
            </div>
            <Button onClick={addAllMissing} className="text-xs w-full" variant="secondary" title="Adds every prime part you currently own zero of (includes parts you've crafted before and used up).">
              Add All Missing Parts
            </Button>
            <Button onClick={addNeverObtained} className="text-xs w-full" variant="secondary" title="Adds only parts you have never owned or crafted at all.">
              Add Never Obtained
            </Button>
          </div>
        </Card>

        {/* Right: matching relics */}
        <Card glow className="p-4 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ maxHeight: 640 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-kronos-dim">Best Relics</h2>
              {need.length > 0 && <span className="px-1.5 py-0.5 rounded bg-kronos-accent/10 text-kronos-accent text-[9px] font-black">{results.length}</span>}
            </div>
            <Toggle checked={ownedOnly} onChange={setOwnedOnly} label="Owned relics only" />
          </div>
          {need.length === 0 ?
            <p className="text-xs text-kronos-dim italic">Add parts to your need list.</p>
          :
          <>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {results.map((r) => (
                <div key={r.key} className={`px-3 py-2.5 rounded-lg border transition-colors ${r.ownedCount > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-black/20 border-white/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      {iconSrc(r.era) && <img src={iconSrc(r.era)} alt="" className="w-5 h-5 object-contain opacity-80" />}
                      <span className="text-xs font-bold text-kronos-text truncate">{r.era} {r.name}</span>
                    </span>
                    <span className="text-[10px] font-bold text-kronos-dim flex-shrink-0">
                      {r.matches.length} needed · {r.ownedCount} owned
                    </span>
                  </div>
                  {r.vaulted === true && <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider text-amber-400/80">Vaulted</span>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.matches.map((m) => (
                      <span key={m.uniqueName} className="text-[11px] font-bold text-kronos-accent bg-kronos-accent/10 border border-kronos-accent/20 rounded px-1.5 py-0.5">
                        {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-kronos-dim mt-2 pt-2 border-t border-white/5">
              {results.length} relics match · {ownedShown} owned · {results.length - ownedShown} not owned
            </p>
          </>
          }
        </Card>
      </div>
    </PageLayout>
  );
}
