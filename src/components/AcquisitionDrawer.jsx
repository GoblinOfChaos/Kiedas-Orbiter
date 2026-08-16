import { useState, useCallback, useEffect } from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { codexDetailToAcquisition, fetchCodexDetail, isGenericAcquisition } from '../lib/codexSupplement';
import { getItemDrops } from '../lib/acquisitionData';
import { MAPPING_TYPES } from '../lib/warframeUtils';

function formatDropLocation(location) {
  if (!location) return null;
  const endless = String(location).match(/^(?:(.+?)\/)?Endless:\s*Tier\s*(\d+)(?:\s*\(([^)]+)\))?$/i);
  if (endless) {
    const region = endless[1] ? `${endless[1]} ` : '';
    const mode = endless[3] ? ` (${endless[3]})` : '';
    return `${region}Endless reward — Tier ${endless[2]}${mode}`;
  }
  return location;
}

// Keep the most likely acquisition route first. Sources without a quantified
// chance stay after quantified sources and retain their original order.
function sortSourcesByChance(sources) {
  return sources
    .map((source, index) => ({ source, index }))
    .sort((a, b) => {
      const aHasChance = typeof a.source?.chance === 'number' && Number.isFinite(a.source.chance);
      const bHasChance = typeof b.source?.chance === 'number' && Number.isFinite(b.source.chance);
      if (aHasChance && bHasChance) return b.source.chance - a.source.chance || a.index - b.index;
      if (aHasChance) return -1;
      if (bHasChance) return 1;
      return a.index - b.index;
    })
    .map(({ source }) => source);
}

export function getSourceLabel(source) {
  if (!source) return 'Unknown source';

  const rotation = source.rotation ? ` Rot ${source.rotation}` : '';
  switch (source.type) {
    case 'override':
      return source.text || 'Known source';
    case 'non-drop':
      return source.text || 'Not obtained from a drop table';
    case 'wiki':
      return source.text || 'Wiki acquisition information';
    case 'wiki-status':
      return source.text || 'Warframe Wiki status';
    case 'blueprint':
      return `${source.location || 'Foundry'}${source.blueprintName ? ` - ${source.blueprintName}` : ''}`;
    case 'drop':
      return [formatDropLocation(source.location), source.dropType && `— ${source.dropType}`].filter(Boolean).join(' ') || 'Known drop source';
    case 'relic':
      return `${source.relicName || source.relicManifest || 'Relic'}${source.rarity ? ` (${source.rarity})` : ''}`;
    case 'mission': {
      // source.missionType is a raw DE code (e.g. "MT_TAU_WAR") - must go
      // through the same MT_ translation table used elsewhere, or an
      // unrecognized internal enum string leaks straight into the UI.
      // Omit the parenthetical entirely rather than show a raw code the
      // table doesn't have a name for yet - a missing detail is better
      // than a confusing one.
      const missionTypeName = source.missionType != null ? MAPPING_TYPES[source.missionType] : undefined;
      const label = source.nodeName || source.node || missionTypeName || 'Mission';
      const suffix = missionTypeName && (source.nodeName || source.node) ? ` (${missionTypeName})` : '';
      return `${source.region ? `${source.region} — ` : ''}${label}${suffix}${rotation}`;
    }
    case 'enemy':
      return source.enemyName || source.enemy || 'Enemy drop';
    case 'bounty':
      return `${source.bountyLevel || 'Bounty'}${rotation}`;
    case 'sortie':
      return `Sortie${source.rarity ? ` (${source.rarity})` : ''}`;
    case 'transient':
      return `${source.objectiveName || 'Arbitration reward'}${rotation}`;
    case 'key':
      return `${source.keyName || 'Key reward'}${rotation}`;
    case 'syndicate':
      return source.place ? `${source.syndicateName || 'Syndicate'} - ${source.place}` : (source.syndicateName || 'Syndicate');
    case 'avatar':
      return source.sourceName || 'Enemy drop';
    default:
      // Keep the drawer useful if a new drops.wf source type is added before
      // its specialized display text is implemented.
      return source.location || source.nodeName || source.node || source.name ||
        source.sourceName || source.objectiveName || source.syndicateName ||
        source.enemyName || source.text || source.type || 'Known source';
  }
}

/**
 * Manages which item's acquisition info is currently shown in the drawer.
 * Clicking the open item's own card again closes it; clicking a different
 * item's card swaps content without closing first - per the design spec's
 * interaction model (docs/superpowers/specs/2026-08-09-acquisition-info-drawer-design.md).
 */
export function useAcquisitionDrawer() {
  const [openKey, setOpenKey] = useState(null);

  const toggle = useCallback((key) => {
    setOpenKey((prev) => (prev === key ? null : key));
  }, []);

  const close = useCallback(() => setOpenKey(null), []);

  return { openKey, toggle, close };
}

export default function AcquisitionDrawer({ item, onClose }) {
  const displayName = item?.displayName;
  const uniqueName = item?.uniqueName;
  const [codexInfo, setCodexInfo] = useState(null);
  const [codexLoading, setCodexLoading] = useState(false);
  const baseInfo = item?.info;

  useEffect(() => {
    setCodexInfo(null);
    if (!uniqueName || !baseInfo || !isGenericAcquisition(baseInfo)) return undefined;
    let cancelled = false;
    setCodexLoading(true);
    fetchCodexDetail(uniqueName).then((detail) => {
      if (!cancelled) setCodexInfo(codexDetailToAcquisition(detail));
    }).finally(() => {
      if (!cancelled) setCodexLoading(false);
    });
    return () => { cancelled = true; };
  }, [uniqueName, baseInfo]);

  if (!item) return null;

  // Codex fallback responses contain only the enriched source/recipe data;
  // they do not carry the local resolver's wikiLink. Preserve the local link
  // when Codex replaces the base info so opening a generic drawer can never
  // crash the whole React tree.
  const info = codexInfo
    ? { ...baseInfo, ...codexInfo, wikiLink: codexInfo.wikiLink || baseInfo?.wikiLink }
    : baseInfo;
  const wikiLink = info?.wikiLink;

  const openWikiLink = () => {
    if (wikiLink?.url) invoke('open_url', { url: wikiLink.url }).catch(console.error);
  };

  const recipe = info?.recipe;
  // Recipe details are rendered in the panel below. Do not repeat the
  // unhelpful generic Foundry sentence as a source card for every craftable
  // item; concrete acquisition rows (such as a blueprint bounty) remain.
  const sources = sortSourcesByChance((info?.sources || []).filter((source) => !(
    recipe && source?.type === 'non-drop' &&
    /^Built in the Foundry from a blueprint(?: and its components)?/.test(source.text || '')
  )));
  const formatCredits = (value) => Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} Credits` : null;
  const formatDuration = (seconds) => {
    const totalMinutes = Math.round(Number(seconds) / 60);
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours && minutes ? `${hours}h ${minutes}m` : hours ? `${hours}h` : `${minutes}m`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-kronos-bg border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-kronos-accent" />
            <h3 className="text-sm font-black uppercase tracking-widest text-kronos-text">{displayName}</h3>
          </div>
          <button onClick={onClose} className="text-kronos-dim hover:text-kronos-text text-xs font-bold uppercase">
            Close
          </button>
        </div>

        {sources.length > 0 ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {sources.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-2 px-3 py-2 rounded bg-black/30 border border-white/5">
                <span className="text-xs text-kronos-text whitespace-normal break-words">{getSourceLabel(s)}</span>
                {typeof s.chance === 'number' &&
                  <span className="text-[10px] font-bold text-kronos-accent flex-shrink-0 ml-2">{(s.chance * 100).toFixed(1)}%</span>
                }
              </div>
            ))}
          </div>
        : recipe ? null : codexLoading ?
          <p className="text-xs text-kronos-dim italic">Checking item data…</p>
        :
          <p className="text-xs text-kronos-dim italic">
            {info?.vaulted ? 'Relic is Vaulted, no drop locations' : 'No verified acquisition route is recorded in the current export or Wiki data.'}
          </p>
        }

        {recipe &&
          <div className="mt-3 rounded bg-black/20 border border-white/5 px-3 py-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-kronos-dim">
              {formatCredits(recipe.blueprintCost) && <span>Blueprint: <strong className="text-kronos-text">{formatCredits(recipe.blueprintCost)}</strong></span>}
              {formatCredits(recipe.buildCost) && <span>Build: <strong className="text-kronos-text">{formatCredits(recipe.buildCost)}</strong></span>}
              {formatDuration(recipe.buildTime) && <span>Time: <strong className="text-kronos-text">{formatDuration(recipe.buildTime)}</strong></span>}
              {recipe.rushCost > 0 && <span>Rush: <strong className="text-kronos-text">{recipe.rushCost} Platinum</strong></span>}
            </div>
            {recipe.ingredients?.length > 0 &&
              <div className="mt-2 flex flex-wrap gap-1.5">
            {recipe.ingredients.map((ingredient, i) => (
              <div key={`${ingredient.itemType || ingredient.name}-${i}`} className="rounded bg-white/5 px-2 py-1 text-[10px] text-kronos-text">
                <div className="flex items-start justify-between gap-2">
                  <span className="whitespace-normal break-words">{ingredient.count}x {ingredient.name}</span>
                </div>
                {getItemDrops(ingredient.itemType)?.length > 0 && <div className="mt-1 space-y-0.5 border-t border-white/5 pt-1">
                  <p className="text-[9px] uppercase font-black text-kronos-dim">How to obtain</p>
                  {getItemDrops(ingredient.itemType).map((drop, dropIndex) => <div key={`${drop.location || 'source'}-${dropIndex}`} className="flex items-start justify-between gap-2 text-[9px] text-kronos-dim">
                    <span className="whitespace-normal break-words">{getSourceLabel(drop)}</span>
                    {typeof drop.chance === 'number' && <span className="shrink-0 font-black text-kronos-accent">{(drop.chance * 100).toFixed(1)}%</span>}
                  </div>)}
                </div>}
              </div>
            ))}
              </div>
            }
          </div>
        }

        <button
          onClick={openWikiLink}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-kronos-dim hover:text-kronos-accent transition-colors"
        >
          <ExternalLink size={12} />
          {wikiLink?.isDirect ? 'View on Warframe Wiki' : 'Search Warframe Wiki'}
        </button>
      </div>
    </div>
  );
}
