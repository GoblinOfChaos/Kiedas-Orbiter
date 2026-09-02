import { useState, useCallback, useEffect } from 'react';
import { Info, ExternalLink, Flag } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { codexDetailToAcquisition, fetchCodexDetail, isGenericAcquisition } from '../lib/codexSupplement';
import { getItemDrops } from '../lib/acquisitionData';
import { MAPPING_TYPES } from '../lib/warframeUtils';
import BugReporterModal from './BugReporterModal';
import { useUi } from '../contexts/UiContext';

// A flat toFixed(1) rounds real sub-1% drop chances (0.06%, 0.0335%) down to
// "0.1%" or even "0.0%" - the latter reads as "doesn't drop here", which is
// wrong. Scale precision with magnitude so small-but-real chances stay visible.
export function formatChance(chance) {
  const pct = chance * 100;
  if (pct <= 0) return '0%';
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.01) return `${pct.toFixed(3)}%`;
  return `${pct.toPrecision(2)}%`;
}

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

// Convention for hand-written overrides: a leading "Unconfirmed — " marks
// text that isn't fully verified (e.g. a price is known but the wiki page
// doesn't state a vendor/method). Stripped for display and shown as a flag
// instead, so it reads as a caveat rather than part of the acquisition text.
const UNCONFIRMED_PREFIX = 'Unconfirmed — ';

function splitUnconfirmed(text) {
  if (typeof text === 'string' && text.startsWith(UNCONFIRMED_PREFIX)) {
    return { text: text.slice(UNCONFIRMED_PREFIX.length), unconfirmed: true };
  }
  return { text, unconfirmed: false };
}

export function getSourceLabel(source, t = (k) => k) {
  if (!source) return t('acquisition_drawer.unknown_source');

  const rotation = source.rotation ? ` Rot ${source.rotation}` : '';
  switch (source.type) {
    case 'override':
      return source.text || t('acquisition_drawer.known_source');
    case 'non-drop':
      return source.text || t('acquisition_drawer.not_drop_table');
    case 'wiki':
      return source.text || t('acquisition_drawer.wiki_acquisition_info');
    case 'wiki-status':
      return source.text || t('acquisition_drawer.wiki_status');
    case 'blueprint':
      return `${source.location || t('nav.foundry')}${source.blueprintName ? ` - ${source.blueprintName}` : ''}`;
    case 'drop':
      return [formatDropLocation(source.location), source.dropType && `— ${source.dropType}`].filter(Boolean).join(' ') || t('acquisition_drawer.known_drop_source');
    case 'relic':
      return `${source.relicName || source.relicManifest || t('acquisition_drawer.relic_fallback')}${source.rarity ? ` (${source.rarity})` : ''}`;
    case 'mission': {
      // source.missionType is usually a raw DE code (e.g. "MT_TAU_WAR") that
      // must go through the same MT_ translation table used elsewhere, or an
      // unrecognized internal enum string leaks straight into the UI. But
      // drops.wf-sourced mission rewards (dropsParser.js) set this from
      // their own `gameMode` field, which is already a real Title-Case
      // display string ("Mobile Defense", "Excavation", ...) that never
      // matches any MT_* key - that class of source previously always lost
      // its mission-type parenthetical entirely. Detect the already-readable
      // case (no raw-code shape: not MT_-prefixed, not ALL_CAPS_WITH_UNDERSCORES)
      // and use it as-is instead of requiring a table match.
      const looksLikeRawCode = (s) => /^MT_/.test(s) || /^[A-Z0-9_]+$/.test(s);
      const missionTypeName = source.missionType != null
        ? (MAPPING_TYPES[source.missionType] ?? (!looksLikeRawCode(source.missionType) ? source.missionType : undefined))
        : undefined;
      const label = source.nodeName || source.node || missionTypeName || t('acquisition_drawer.mission_fallback');
      const suffix = missionTypeName && (source.nodeName || source.node) ? ` (${missionTypeName})` : '';
      return `${source.region ? `${source.region} — ` : ''}${label}${suffix}${rotation}`;
    }
    case 'enemy':
      return source.enemyName || source.enemy || t('acquisition_drawer.enemy_drop');
    case 'bounty':
      return `${source.bountyLevel || t('acquisition_drawer.bounty_fallback')}${rotation}`;
    case 'sortie':
      return `${t('acquisition_drawer.sortie_fallback')}${source.rarity ? ` (${source.rarity})` : ''}`;
    case 'transient':
      return `${source.objectiveName || t('acquisition_drawer.arbitration_reward')}${rotation}`;
    case 'key':
      return `${source.keyName || t('acquisition_drawer.key_reward')}${rotation}`;
    case 'syndicate':
      return source.place ? `${source.syndicateName || t('acquisition_drawer.syndicate_fallback')} - ${source.place}` : (source.syndicateName || t('acquisition_drawer.syndicate_fallback'));
    case 'avatar':
      return source.sourceName || t('acquisition_drawer.enemy_drop');
    default:
      // Keep the drawer useful if a new drops.wf source type is added before
      // its specialized display text is implemented.
      return source.location || source.nodeName || source.node || source.name ||
        source.sourceName || source.objectiveName || source.syndicateName ||
        source.enemyName || source.text || source.type || t('acquisition_drawer.known_source');
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
  const { t } = useUi();
  const displayName = item?.displayName;
  const uniqueName = item?.uniqueName;
  const [codexInfo, setCodexInfo] = useState(null);
  const [codexLoading, setCodexLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
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
            {t('foundry.close')}
          </button>
        </div>

        {sources.length > 0 ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {sources.map((s, i) => {
              const { text, unconfirmed } = splitUnconfirmed(getSourceLabel(s, t));
              return (
                <div key={i} className="flex items-start justify-between gap-2 px-3 py-2 rounded bg-black/30 border border-white/5">
                  <div className="min-w-0">
                    {unconfirmed &&
                      <span className="inline-block mb-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide text-amber-400 bg-amber-400/10 border border-amber-400/30">
                        {t('acquisition_drawer.unconfirmed_badge')}
                      </span>
                    }
                    <span className="block text-xs text-kronos-text whitespace-normal break-words">{text}</span>
                  </div>
                  {typeof s.chance === 'number' &&
                    <span className="text-[10px] font-bold text-kronos-accent flex-shrink-0 ml-2">{formatChance(s.chance)}</span>
                  }
                </div>
              );
            })}
          </div>
        : info?.vaulted === true ?
          <p className="text-xs text-amber-400/90 italic">{t('acquisition_drawer.vaulted_no_source')}</p>
        : recipe ? null : codexLoading ?
          <p className="text-xs text-kronos-dim italic">{t('acquisition_drawer.checking_item_data')}</p>
        : <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-kronos-dim italic">{t('acquisition_drawer.no_verified_route')}</p>
            <button
              onClick={() => setShowReportModal(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide text-kronos-accent border border-kronos-accent/30 hover:bg-kronos-accent/10"
            >
              <Flag size={11} />
              {t('acquisition_drawer.know_where_found')}
            </button>
          </div>
        }
        {sources.some((s) => splitUnconfirmed(getSourceLabel(s, t)).unconfirmed) &&
          <p className="mt-2 text-[11px] text-amber-400/90 italic">
            {t('acquisition_drawer.unconfirmed_price_note')}
          </p>
        }

        {recipe &&
          <div className="mt-3 rounded bg-black/20 border border-white/5 px-3 py-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-kronos-dim">
              {formatCredits(recipe.blueprintCost) && <span>{t('acquisition_drawer.blueprint_label')} <strong className="text-kronos-text">{formatCredits(recipe.blueprintCost)}</strong></span>}
              {formatCredits(recipe.buildCost) && <span>{t('acquisition_drawer.build_label')} <strong className="text-kronos-text">{formatCredits(recipe.buildCost)}</strong></span>}
              {formatDuration(recipe.buildTime) && <span>{t('acquisition_drawer.time_label')} <strong className="text-kronos-text">{formatDuration(recipe.buildTime)}</strong></span>}
              {recipe.rushCost > 0 && <span>{t('acquisition_drawer.rush_label')} <strong className="text-kronos-text">{recipe.rushCost} Platinum</strong></span>}
            </div>
            {recipe.ingredients?.length > 0 &&
              <div className="mt-2 flex flex-wrap gap-1.5">
            {recipe.ingredients.map((ingredient, i) => (
              <div key={`${ingredient.itemType || ingredient.name}-${i}`} className="rounded bg-white/5 px-2 py-1 text-[10px] text-kronos-text">
                <div className="flex items-start justify-between gap-2">
                  <span className="whitespace-normal break-words">{ingredient.count}x {ingredient.name}</span>
                </div>
                {getItemDrops(ingredient.itemType)?.length > 0 && <div className="mt-1 space-y-0.5 border-t border-white/5 pt-1">
                  <p className="text-[9px] uppercase font-black text-kronos-dim">{t('acquisition_drawer.how_to_obtain')}</p>
                  {getItemDrops(ingredient.itemType).map((drop, dropIndex) => <div key={`${drop.location || 'source'}-${dropIndex}`} className="flex items-start justify-between gap-2 text-[9px] text-kronos-dim">
                    <span className="whitespace-normal break-words">{getSourceLabel(drop, t)}</span>
                    {typeof drop.chance === 'number' && <span className="shrink-0 font-black text-kronos-accent">{formatChance(drop.chance)}</span>}
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
          {wikiLink?.isDirect ? t('acquisition_drawer.view_wiki') : t('acquisition_drawer.search_wiki')}
        </button>
      </div>
      <BugReporterModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        initialDescription={`Acquisition info missing for "${displayName}" (${uniqueName}). Where I found it: `}
      />
    </div>
  );
}
