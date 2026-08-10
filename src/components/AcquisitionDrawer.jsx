import { useState, useCallback } from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useUi } from '../contexts/UiContext';

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
  if (!item) return null;
  const { displayName, info } = item;

  const openWikiLink = () => {
    invoke('open_url', { url: info.wikiLink.url }).catch(console.error);
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
            {t('ui.common.close') || 'Close'}
          </button>
        </div>

        {info.sources.length > 0 ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {info.sources.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded bg-black/30 border border-white/5">
                <span className="text-xs text-kronos-text truncate">
                  {s.type === 'override' ? s.text :
                   s.type === 'drop' ? `${s.location}${s.dropType ? ` (${s.dropType})` : ''}` :
                   s.type === 'relic' ? `${s.relicName || s.relicManifest} (${s.rarity || ''})` :
                   s.type === 'mission' ? `${s.nodeName}${s.rotation ? ` Rot ${s.rotation}` : ''}` :
                   s.type === 'enemy' ? s.enemyName :
                   s.type === 'bounty' ? `${s.bountyLevel}${s.rotation ? ` Rot ${s.rotation}` : ''}` : ''}
                </span>
                {typeof s.chance === 'number' &&
                  <span className="text-[10px] font-bold text-kronos-accent flex-shrink-0 ml-2">{(s.chance * 100).toFixed(1)}%</span>
                }
              </div>
            ))}
          </div>
        :
          <p className="text-xs text-kronos-dim italic">No specific source known - try the wiki link below.</p>
        }

        <button
          onClick={openWikiLink}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-kronos-dim hover:text-kronos-accent transition-colors"
        >
          <ExternalLink size={12} />
          {info.wikiLink.isDirect ? 'View on Warframe Wiki' : 'Search Warframe Wiki'}
        </button>
      </div>
    </div>
  );
}
