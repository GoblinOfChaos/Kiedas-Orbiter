import { useState, useMemo } from 'react';
import { Search, X, Trash2 } from 'lucide-react';
import { PageLayout, Card, Input, Button, Toggle, MonitorState } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { getAllRelicRewards, getRewardInventoryContext } from '../lib/relicParser';

export default function RelicPlanner() {
  const { inventoryData, exportData, isInventoryLoading } = useMonitoring();
  const [partSearch, setPartSearch] = useState('');
  const [need, setNeed] = useState([]); // array of {uniqueName, name}
  const [ownedOnly, setOwnedOnly] = useState(false);

  // Full catalog of distinct prime parts (not just ones from owned relics),
  // ported from wfinfo-ng's RELIC_PLANNER_TAB.py part picker.
  const allParts = useMemo(() => {
    if (!exportData) return [];
    return getAllRelicRewards(exportData, 'en').sort((a, b) => a.name.localeCompare(b.name));
  }, [exportData]);

  const isSatisfied = (uniqueName) => {
    const ctx = getRewardInventoryContext(uniqueName, inventoryData, exportData, 'en');
    return ctx?.isOwned || (ctx?.craftedCount ?? 0) > 0;
  };

  const filteredParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return allParts;
    return allParts.filter((p) => p.name.toLowerCase().includes(q));
  }, [allParts, partSearch]);

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
    const toAdd = allParts.filter((p) => {
      if (needKeys.has(p.uniqueName)) return false;
      const ctx = getRewardInventoryContext(p.uniqueName, inventoryData, exportData, 'en');
      return !ctx?.isOwned;
    });
    if (toAdd.length) setNeed((prev) => [...prev, ...toAdd]);
  };

  const addNeverObtained = () => {
    const toAdd = allParts.filter((p) => !needKeys.has(p.uniqueName) && !isSatisfied(p.uniqueName));
    if (toAdd.length) setNeed((prev) => [...prev, ...toAdd]);
  };

  const results = useMemo(() => {
    if (!inventoryData?.relics || needKeys.size === 0) return [];
    const out = [];
    for (const relic of inventoryData.relics) {
      const ownedCount = Object.values(relic.refinements || {}).reduce((a, b) => a + b, 0);
      if (ownedOnly && ownedCount === 0) continue;
      const matches = (relic.rewards || []).filter((rw) => needKeys.has(rw.uniqueName));
      if (matches.length === 0) continue;
      out.push({
        key: relic.unique_name,
        name: relic.name,
        era: relic.era,
        ownedCount,
        matches,
      });
    }
    out.sort((a, b) => (b.ownedCount - a.ownedCount) || (b.matches.length - a.matches.length));
    return out;
  }, [inventoryData, needKeys, ownedOnly]);

  const ownedShown = results.filter((r) => r.ownedCount > 0).length;

  if (isInventoryLoading) return <PageLayout title="Relic Planner"><MonitorState isLoading className="py-20" /></PageLayout>;

  return (
    <PageLayout title="Relic Planner" subtitle="Find which relics give you a part you need">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.5fr] gap-4">
        {/* Left: part picker */}
        <Card glow className="p-4 flex flex-col min-h-0" style={{ maxHeight: 640 }}>
          <h2 className="text-xs font-black uppercase tracking-widest text-kronos-dim mb-2">Prime Parts</h2>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kronos-dim" size={14} />
            <Input placeholder="Search parts..." value={partSearch} onChange={(e) => setPartSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {filteredParts.map((p) => (
              <button
                key={p.uniqueName}
                onClick={() => addPart(p)}
                disabled={needKeys.has(p.uniqueName)}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs border ${needKeys.has(p.uniqueName) ? 'bg-kronos-accent/10 border-kronos-accent/30 text-kronos-dim' : 'bg-black/20 border-white/5 text-kronos-text hover:border-kronos-accent/40 hover:bg-black/30'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Middle: need list */}
        <Card glow className="p-4 flex flex-col min-h-0" style={{ maxHeight: 640 }}>
          <h2 className="text-xs font-black uppercase tracking-widest text-kronos-dim mb-2">Need List</h2>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 mb-3">
            {need.length === 0 ?
              <p className="text-xs text-kronos-dim italic">Add parts from the left to search relics for them.</p>
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
        <Card glow className="p-4 flex flex-col min-h-0" style={{ maxHeight: 640 }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-kronos-dim">Best Relics</h2>
            <Toggle checked={ownedOnly} onChange={setOwnedOnly} label="Owned relics only" />
          </div>
          {need.length === 0 ?
            <p className="text-xs text-kronos-dim italic">Add parts to your need list.</p>
          :
          <>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {results.map((r) => (
                <div key={r.key} className={`px-3 py-2 rounded border ${r.ownedCount > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-black/20 border-white/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-kronos-text">{r.era} {r.name}</span>
                    <span className="text-[10px] font-bold text-kronos-dim flex-shrink-0">
                      {r.matches.length} needed · {r.ownedCount} owned
                    </span>
                  </div>
                  <p className="text-[11px] text-kronos-accent mt-0.5 truncate">{r.matches.map((m) => m.name).join(', ')}</p>
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
