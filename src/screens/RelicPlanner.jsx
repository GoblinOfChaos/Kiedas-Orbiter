import { useState, useMemo, useEffect } from 'react';
import { Search, X, Trash2, Package, Sparkles } from 'lucide-react';
import { PageLayout, Card, Input, Button, MonitorState } from '../components/UI';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { useMonitoring } from '../contexts/MonitoringContext';
import { getAllRelicRewards, getRelicCatalog, getPartObtainedStatus } from '../lib/relicParser';

export default function RelicPlanner() {
  const { inventoryData, exportData, isInventoryLoading } = useMonitoring();
  const [partSearch, setPartSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [partFilter, setPartFilter] = useState('all'); // 'all' | 'never-obtained' | 'missing'
  const [need, setNeed] = useState([]); // array of {uniqueName, name}
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [iconsPath, setIconsPath] = useState('');
  const [displayLimit, setDisplayLimit] = useState(60);

  // Debounce search input to eliminate UI freezing while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(partSearch);
      setDisplayLimit(60);
    }, 120);
    return () => clearTimeout(timer);
  }, [partSearch]);

  useEffect(() => {
    invoke('get_icons_path').then((path) => setIconsPath(path)).catch(() => {});
  }, []);

  const iconSrc = (name) => iconsPath ? convertFileSrc(`${iconsPath}/${name}.png`) : null;

  // Catalog of distinct prime parts
  const allParts = useMemo(() => {
    if (!exportData) return [];
    return getAllRelicRewards(exportData, 'en')
      .filter((part) => part.isPrimePart || /Forma(?:Blueprint)?$/i.test(part.uniqueName || ''))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exportData]);

  const relicCatalog = useMemo(() => getRelicCatalog(exportData, 'en'), [exportData]);

  // Pre-indexed owned relics by exact normalized key for instant O(1) matching
  const ownedRelics = useMemo(() => {
    const owned = new Map();
    for (const relic of inventoryData?.relics || []) {
      const baseName = (relic.name || '')
        .replace(new RegExp(`^${relic.era}\\s+`, 'i'), '')
        .replace(/\s+Relic$/i, '')
        .trim();
      const key = `${relic.era} ${baseName}`;
      const ownedCount = Object.values(relic.refinements || {}).reduce((sum, count) => sum + (count || 0), 0);
      owned.set(key.toLowerCase(), { ...relic, ownedCount, era: relic.era, name: baseName });
    }
    return owned;
  }, [inventoryData]);

  // Fast memoized per-part ownership statuses
  const partStatuses = useMemo(() => {
    if (!allParts.length) return new Map();
    return new Map(allParts.map((p) => [
      p.uniqueName,
      getPartObtainedStatus(p.uniqueName, p.name, inventoryData, exportData, 'en'),
    ]));
  }, [allParts, inventoryData, exportData]);

  const getPartStatus = (uniqueName) => partStatuses.get(uniqueName) || { directOwned: false, everObtained: false, hasEnough: false, need: 1 };

  const filteredParts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let parts = q ? allParts.filter((p) => p.name.toLowerCase().includes(q)) : allParts;
    if (partFilter === 'never-obtained') {
      parts = parts.filter((p) => !getPartStatus(p.uniqueName).everObtained);
    } else if (partFilter === 'missing') {
      parts = parts.filter((p) => !getPartStatus(p.uniqueName).hasEnough);
    }
    return parts;
  }, [allParts, debouncedSearch, partFilter, partStatuses]);

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
    const statuses = allParts.map((p) => ({ part: p, status: getPartStatus(p.uniqueName) }));
    const toAdd = statuses.filter(({ part, status }) => {
      if (needKeys.has(part.uniqueName)) return false;
      return !status.hasEnough;
    }).map(({ part }) => part);
    if (toAdd.length) setNeed((prev) => [...prev, ...toAdd]);
  };

  const addNeverObtained = () => {
    const statuses = allParts.map((p) => ({ part: p, status: getPartStatus(p.uniqueName) }));
    const toAdd = statuses.filter(({ part, status }) => !needKeys.has(part.uniqueName) && !status.everObtained).map(({ part }) => part);
    if (toAdd.length) setNeed((prev) => [...prev, ...toAdd]);
  };

  // Instant O(1) Relic Matching Loop
  const results = useMemo(() => {
    if (!relicCatalog.length || needKeys.size === 0) return [];
    const out = [];
    for (const relic of relicCatalog) {
      const lookupKey = `${relic.era} ${relic.name}`.toLowerCase();
      const owned = ownedRelics.get(lookupKey) || ownedRelics.get(relic.key.toLowerCase()) || ownedRelics.get(`${relic.era} ${relic.name} relic`.toLowerCase());
      const ownedCount = owned?.ownedCount || 0;
      if (ownershipFilter === 'owned' && ownedCount === 0) continue;
      if (ownershipFilter === 'unowned' && ownedCount > 0) continue;
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
  }, [relicCatalog, ownedRelics, needKeys, ownershipFilter]);

  const ownedShown = results.filter((r) => r.ownedCount > 0).length;
  const ownedParts = [...partStatuses.values()].filter((status) => status.directOwned).length;

  if (isInventoryLoading) return <PageLayout title="Relic Planner"><MonitorState isLoading className="py-20" /></PageLayout>;

  return (
    <PageLayout title="Relic Planner" subtitle="Find which relics give you a part you need">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Prime parts', value: allParts.length, icon: Package },
          { label: 'Selected', value: need.length, icon: Sparkles },
          { label: 'Owned matches', value: `${ownedShown}/${results.length}`, icon: Package },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-kronos-accent/10 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-kronos-accent" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-wider text-kronos-dim">{s.label}</p>
                <p className="text-base font-black text-kronos-text">{s.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-3 min-w-0">
        {/* Left: part picker */}
        <Card glow className="p-3 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ maxHeight: 640 }}>
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
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1 custom-scrollbar">
            {filteredParts.slice(0, displayLimit).map((p) => {
              const owned = getPartStatus(p.uniqueName).directOwned;
              return (
                <button
                  key={p.uniqueName}
                  onClick={() => addPart(p)}
                  disabled={needKeys.has(p.uniqueName)}
                  className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${needKeys.has(p.uniqueName) ? 'bg-kronos-accent/10 text-kronos-dim' : 'text-kronos-text hover:bg-white/5'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${owned ? 'bg-green-400' : 'bg-white/15'}`} />
                  <span className="truncate flex-1">{p.name}</span>
                </button>
              );
            })}
            {filteredParts.length > displayLimit && (
              <button
                onClick={() => setDisplayLimit((prev) => prev + 60)}
                className="w-full py-1.5 text-center text-[10px] font-bold uppercase text-kronos-accent hover:bg-kronos-accent/10 rounded transition"
              >
                Load More ({filteredParts.length - displayLimit} remaining)
              </button>
            )}
          </div>
        </Card>

        {/* Middle: need list */}
        <Card glow className="p-3 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ maxHeight: 640 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-kronos-dim">Need List</h2>
            <span className="text-[10px] font-black text-kronos-accent">{need.length} selected</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 mb-3 custom-scrollbar">
            {need.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 py-10 px-3">
                <Sparkles size={22} className="text-kronos-dim/60" />
                <p className="text-xs text-kronos-dim italic">Add parts from the left to search relics for them.</p>
              </div>
            ) : (
              need.map((n) => (
                <div key={n.uniqueName} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-black/20 border border-white/5">
                  <span className="text-xs text-kronos-text truncate">{n.name}</span>
                  <button onClick={() => removePart(n.uniqueName)} className="text-kronos-dim hover:text-red-400 flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={clearNeed} className="flex-1 text-xs" variant="secondary">
                <Trash2 size={12} className="mr-1" /> Clear
              </Button>
            </div>
            <Button onClick={addAllMissing} className="text-xs w-full" variant="secondary" title="Adds every prime part you currently own zero of.">
              Add All Missing Parts
            </Button>
            <Button onClick={addNeverObtained} className="text-xs w-full" variant="secondary" title="Adds only parts you have never owned or crafted at all.">
              Add Never Obtained
            </Button>
          </div>
        </Card>

        {/* Right: matching relics */}
        <Card glow className="p-3 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ maxHeight: 640 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-kronos-dim">Best Relics</h2>
              {need.length > 0 && <span className="px-1.5 py-0.5 rounded bg-kronos-accent/10 text-kronos-accent text-[9px] font-black">{results.length}</span>}
            </div>
            <button
              type="button"
              onClick={() => setOwnershipFilter((value) => value === 'all' ? 'owned' : value === 'owned' ? 'unowned' : 'all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${ownershipFilter === 'owned' ? 'bg-kronos-accent text-kronos-bg' : ownershipFilter === 'unowned' ? 'bg-red-500/20 text-red-400' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}
            >
              {ownershipFilter === 'all' ? 'All' : ownershipFilter === 'owned' ? 'Owned' : 'Unowned'}
            </button>
          </div>
          {need.length === 0 ? (
            <p className="text-xs text-kronos-dim italic">Add parts to your need list.</p>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0 custom-scrollbar">
                {results.map((r) => (
                  <div key={r.key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="w-10 h-10 rounded-lg bg-kronos-accent/10 flex items-center justify-center flex-shrink-0">
                      {iconSrc(r.era) ? <img src={iconSrc(r.era)} alt="" className="w-6 h-6 object-contain opacity-90" /> : <Package size={16} className="text-kronos-accent" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-kronos-text truncate">{r.era} {r.name}</span>
                        {r.ownedCount > 0 && (
                          <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 flex-shrink-0">{r.ownedCount} owned</span>
                        )}
                        {r.vaulted === true && (
                          <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">Vaulted</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {r.matches.map((m) => (
                          <span key={m.uniqueName} className="text-[10px] font-bold text-kronos-accent bg-kronos-accent/10 border border-kronos-accent/20 rounded px-1.5 py-0.5">
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-kronos-dim flex-shrink-0 font-mono">{r.matches.length} needed</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-kronos-dim mt-2 pt-2 border-t border-white/5">
                {results.length} relics match · {ownedShown} owned · {results.length - ownedShown} not owned
              </p>
            </>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
