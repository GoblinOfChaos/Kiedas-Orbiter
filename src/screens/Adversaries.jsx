import { useMemo, useState, useEffect } from 'react';
import { useUi } from '../contexts/UiContext'
import { PageLayout, Card } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { resolveItemName } from '../lib/warframeUtils';

// ── Progenitor element → warframes (base only, no primes) ──
// Source of truth: wiki.warframe.com/wiki/Adversary_System/Progenitor (real
// game mechanic table, fetched 2026-08-19 - the previous hardcoded version
// of this table had substantial errors beyond just missing entries (e.g. it
// listed Excalibur as Impact; the real element is Electricity), and invented
// two element categories, Puncture and Slash, that don't exist in the real
// Progenitor system at all - it only has these 7.
const PROGENITOR = {
  Impact: ['Baruuk', 'Dante', 'Gauss', 'Grendel', 'Rhino', 'Sevagoth', 'Sirius & Orion', 'Wukong', 'Zephyr'],
  Heat: ['Chroma', 'Ember', 'Inaros', 'Jade', 'Kullervo', 'Nezha', 'Protea', 'Temple', 'Uriel', 'Vauban', 'Wisp'],
  Cold: ['Frost', 'Gara', 'Hildryn', 'Koumei', 'Revenant', 'Styanax', 'Titania', 'Trinity'],
  Electricity: ['Banshee', 'Caliban', 'Excalibur', 'Follie', 'Gyre', 'Limbo', 'Nova', 'Valkyr', 'Volt'],
  Toxin: ['Atlas', 'Dagath', 'Ivara', 'Khora', 'Nekros', 'Nidus', 'Nokko', 'Oberon', 'Oraxia', 'Saryn'],
  Magnetic: ['Citrine', 'Cyte-09', 'Harrow', 'Hydroid', 'Lavos', 'Mag', 'Mesa', 'Xaku', 'Yareli'],
  Radiation: ['Ash', 'Equinox', 'Garuda', 'Loki', 'Mirage', 'Nyx', 'Octavia', 'Qorvex', 'Voruna']
};

const ELEMENT_ORDER = Object.keys(PROGENITOR);
// Source of truth: all 16 real "Tenet " weapon names resolved from dict.json
// loc-tags (verified 2026-08-19) - the previous list only had 10, missing
// Agendus, Exec, Ferrox, Grigori, Livia, and Quanta entirely.
const SISTER_TENET_WEAPON_NAMES = new Set([
  'Tenet Agendus', 'Tenet Arca Plasmor', 'Tenet Cycron', 'Tenet Detron',
  'Tenet Diplos', 'Tenet Envoy', 'Tenet Exec', 'Tenet Ferrox',
  'Tenet Flux Rifle', 'Tenet Glaxion', 'Tenet Grigori', 'Tenet Livia',
  'Tenet Plinx', 'Tenet Quanta', 'Tenet Spirex', 'Tenet Tetra',
]);
const WF_PROGENITOR = {};
for (const [el, frames] of Object.entries(PROGENITOR)) {
  for (const f of frames) WF_PROGENITOR[f] = el;
}


// ── Element colors (from ModCard DT_COLORS) ──
const ELEMENT_COLORS = {
  Impact: '#CCCCCC',
  Puncture: '#AA8855',
  Slash: '#CC4444',
  Heat: '#FF4444',
  Cold: '#88CCFF',
  Toxin: '#44FF44',
  Electricity: '#4488FF',
  Magnetic: '#8844FF',
  Radiation: '#FFDD44'
};

function iconSrc(iconsPath, name) {
  return iconsPath ? convertFileSrc(`${iconsPath}/${String(name).replace(/^\/+/, '')}Symbol.png`) : null;
}

function stripPrime(name) {
  return name.replace(/Prime$/, '');
}

export default function Adversaries() {
  const { t } = useUi()
  const { inventoryData, dict, uniqueNameToName } = useMonitoring();
  const [iconsPath, setIconsPath] = useState('');
  useEffect(() => {invoke('get_icons_path').then(setIconsPath).catch(() => {});}, []);
  const [showKilled, setShowKilled] = useState(false);
  const nemeses = useMemo(() => {
    if (!inventoryData?.NemesisHistory) return [];
    return inventoryData.NemesisHistory.map((n) => {
      const wfName = n.KillingSuit ? resolveItemName(n.KillingSuit, dict, uniqueNameToName) || n.KillingSuit.split('/').pop() : '?';
      const baseName = stripPrime(wfName.replace(/ Prime$/, ''));
      return { ...n, wfName, element: WF_PROGENITOR[baseName] || null };
    });
  }, [inventoryData, dict, uniqueNameToName]);

  // NemesisHistory only contains explicit Sister/Lich outcome records. Owned
  // Tenet weapons are independent, durable evidence that a Sister was
  // defeated, but they do not identify the Sister's name or conversion date.
  // Keep this evidence separate instead of fabricating history rows.
  const ownedSisterWeapons = useMemo(() => {
    const seen = new Set();
    return (inventoryData?.all ?? [])
      .filter((item) => item?.owned && SISTER_TENET_WEAPON_NAMES.has(item.name) && item.category !== 'prime_parts')
      .filter((item) => {
        const key = item.unique_name || item.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [inventoryData]);

  const displayed = useMemo(() => {
    return showKilled ? nemeses : nemeses.filter((n) => !n.k);
  }, [nemeses, showKilled]);

  return (
    <PageLayout titleKey="screen.adversaries">
      <div className="space-y-6">
        {/* ── Progenitor Reference Table ── */}
        <Card glow className="p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">{t('adversaries.progenitor_elements')}</h2>
          <div className="-mx-4 px-4">
            <div className="flex gap-6 flex-wrap">
              {ELEMENT_ORDER.map((el) =>
              <div key={el} className="flex flex-col gap-1 min-w-[90px]">
                  <div className="flex flex-col items-center gap-1 pb-1.5 border-b border-white/10 mb-1">
                    <img src={iconSrc(iconsPath, el)} className="w-5 h-5 object-contain" alt={el}  />
                    <span style={{ color: ELEMENT_COLORS[el] }} className="text-[10px] font-bold uppercase tracking-wider leading-tight">{el}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    {PROGENITOR[el].map((f) =>
                  <span key={f} className="text-[11px] text-white/70 leading-tight">{f}</span>
                  )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
        <Card glow className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">{t('adversaries.nemesis_history')} <span className="text-kronos-accent">({Math.max(nemeses.filter((n) => !n.k && !n.Traded).length, ownedSisterWeapons.length)} evidenced converted)</span></h2>
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showKilled}
                onChange={(e) => setShowKilled(e.target.checked)}
                className="accent-kronos-accent" />{t('adversaries.show_vanquished')}


            </label>
          </div>

          {displayed.length === 0 ?
          <p className="text-xs text-white/40 italic">{t('adversaries.no_nemeses')}</p> :

          <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
              {displayed.map((n, i) => {
              // Guard on the parsed value, not just on the field's presence: a
              // malformed $numberLong would otherwise render the literal text
              // "Invalid Date" instead of simply omitting the date.
              const dRaw = n.d?.$date?.$numberLong ? new Date(Number(n.d.$date.$numberLong)) : null;
              const d = dRaw && !Number.isNaN(dRaw.getTime()) ? dRaw : null;
              return (
                <div key={n.fp || i} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/5 text-xs">
                    {iconsPath && n.element &&
                  <img
                    src={iconSrc(iconsPath, n.element)}
                    className="w-4 h-4 object-contain flex-shrink-0"
                    alt=""
                     />

                  }
                    <span className="text-white/80 min-w-[100px]">{n.wfName}</span>
                    <span className="text-white/40 min-w-[60px]">
                      {n.element ? <span style={{ color: ELEMENT_COLORS[n.element] }}>{n.element}</span> : '—'}
                    </span>
                    <span className="text-white/40 min-w-[30px]">R{n.Rank ?? '?'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  n.k ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`
                  }>
                      {n.k ? 'Vanquished' : n.Traded ? 'Traded' : 'Converted'}
                    </span>
                    {d && <span className="text-white/30 ml-auto">{d.toLocaleDateString()}</span>}
                  </div>);

            })}
            </div>
          }
        </Card>
        {ownedSisterWeapons.length > 0 && <Card glow className="p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-1">Owned Sister weapons</h2>
          <p className="text-[11px] text-white/40 mb-3">These weapons confirm Sister victories even when the original Sister is missing from Nemesis History. They do not identify the Sister’s name or outcome date.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
            {ownedSisterWeapons.map((weapon) => <div key={weapon.unique_name} className="flex items-center gap-2 py-1.5 px-2 rounded bg-white/5 text-xs">
              <span className="text-green-300 font-bold">Converted evidence</span>
              <span className="text-white/80 truncate">{weapon.name}</span>
            </div>)}
          </div>
        </Card>}
      </div>
    </PageLayout>);

}
