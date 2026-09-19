import { useState, useRef, useEffect, useMemo } from 'react';
import { useUi } from '../contexts/UiContext'
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { PageLayout, Input, Card, Tabs, MonitorState } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import BackToTop from '../components/BackToTop';
import RivenCard from '../components/RivenCard';
import RivenGradeDrawer from '../components/RivenGradeDrawer';
import { useAcquisitionDrawer } from '../components/AcquisitionDrawer';
import { loadRivenGoodRolls, getRivenStatGrade } from '../lib/rivenGrader';
import { IS_PREVIEW } from '../lib/buildProfile';
import PreviewRivensLayout from '../components/PreviewRivensLayout';

const GRADE_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

const STAT_TO_PRICER = {
  'Critical Chance': 'critical_chance',
  'Critical Damage': 'critical_damage',
  'Damage': 'base_damage_/_melee_damage',
  'Melee Damage': 'base_damage_/_melee_damage',
  'Multishot': 'multishot',
  'Attack Speed': 'fire_rate_/_attack_speed',
  'Fire Rate': 'fire_rate_/_attack_speed',
  'Status Chance': 'status_chance',
  'Status Duration': 'status_duration',
  'Range': 'range',
  'Puncture': 'puncture_damage',
  'Slash': 'slash_damage',
  'Impact': 'impact_damage',
  'Heat': 'heat_damage',
  'Cold': 'cold_damage',
  'Electricity': 'electric_damage',
  'Toxin': 'toxin_damage',
  'Reload Speed': 'reload_speed',
  'Magazine Capacity': 'magazine_capacity',
  'Ammo Maximum': 'ammo_maximum',
  'Punch Through': 'punch_through',
  'Projectile Speed': 'projectile_speed',
  'Initial Combo': 'channeling_damage',
  'Combo Duration': 'combo_duration',
  'Finisher Damage': 'finisher_damage',
  'Damage to Corpus': 'damage_vs_corpus',
  'Damage to Grineer': 'damage_vs_grineer',
  'Damage to Infested': 'damage_vs_infested',
  'Recoil': 'recoil',
  'Slide Crit Chance': 'critical_chance_on_slide_attack',
  'Combo Efficiency': 'channeling_efficiency',
  'Zoom': 'zoom',
  'Blast Radius': 'explosion_radius',
  'Beam Length': 'beam_length',
  'Combo Count': 'chance_to_gain_combo_count',
  'Combo Count Chance': 'chance_to_gain_combo_count'
};

function rivenKey(r) {
  // item_id is the real per-instance save-file identity (Mongo ObjectId) -
  // use it whenever present so two owned rivens that look identical (e.g.
  // duplicate challenge rivens for the same weapon, or two unveiled rivens
  // with the same rolled stats) still get distinct keys. Veiled rivens have
  // no item_id since DE stores them as one stacked entry per weapon type,
  // not individual instances, so they fall back to the name-based key -
  // that's safe since they're already deduplicated into a single stacked
  // card by quantity, never rendered as separate cards to collide.
  if (r.item_id) return r.item_id;
  if (r.veiled || r.challenge) return r.name + (r.veiled ? '_veiled' : '_challenge');
  const stats = (r.stats || []).map((s) => s.tag).sort().join('|');
  return r.name + '|' + stats;
}

export default function Rivens() {
  const { t } = useUi()
  const TYPE_TABS = [
  { id: 'all', label: t('rivens.type_all') },
  { id: 'rifle', label: t('rivens.type_rifle') },
  { id: 'pistol', label: t('rivens.type_pistol') },
  { id: 'melee', label: t('rivens.type_melee') },
  { id: 'shotgun', label: t('rivens.type_shotgun') },
  { id: 'sniper', label: t('rivens.type_sniper') },
  { id: 'kitgun', label: t('rivens.type_kitgun') },
  { id: 'zaw', label: t('rivens.type_zaw') },
  { id: 'archgun', label: t('rivens.type_archgun') }];
  const STATE_TABS = [
  { id: 'all', label: t('rivens.state_all') },
  { id: 'unveiled', label: t('rivens.state_unveiled') },
  { id: 'challenge', label: t('rivens.state_challenge') },
  { id: 'veiled', label: t('rivens.state_veiled') }];
  const SORT_CRITERIA = [
  { id: 'name', label: t('rivens.sort_name') },
  { id: 'plat', label: t('rivens.sort_plat') },
  { id: 'grade', label: t('rivens.sort_grade') },
  { id: 'rank', label: t('rivens.sort_rank') }];
  const { inventoryData, isInventoryLoading } = useMonitoring();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [activeState, setActiveState] = useState('all');
  const [sortCriteria, setSortCriteria] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');
  const [iconsPath, setIconsPath] = useState('');
  const [framesPath, setFramesPath] = useState('');
  const [pricingCache, setPricingCache] = useState({});
  const [retryTick, setRetryTick] = useState(0);
  const [statGradesReady, setStatGradesReady] = useState(false);
  const pricingRef = useRef({});
  const retryCountRef = useRef(0);
  useEffect(() => {
    invoke('get_icons_path').then((p) => setIconsPath(p)).catch(() => {});
    invoke('get_mod_frames_path').then((p) => setFramesPath(p)).catch(() => {});
    loadRivenGoodRolls().then(() => setStatGradesReady(true));
  }, []);

  const allRivens = useMemo(() => inventoryData?.rivens ?? [], [inventoryData]);

  const statGrades = useMemo(() => {
    if (!statGradesReady) return new Map();
    const m = new Map();
    for (const r of allRivens) {
      const weaponKey = r.weapon_name_en || r.weapon_name || r.name.replace(/ Riven.*$/, '');
      m.set(r, getRivenStatGrade(r, weaponKey));
    }
    return m;
  }, [allRivens, statGradesReady]);

  const rivenKeys = useMemo(() => {
    const m = new Map();
    for (const r of allRivens) m.set(r, rivenKey(r));
    return m;
  }, [allRivens]);

  const { openKey, toggle, close } = useAcquisitionDrawer();
  const openRiven = useMemo(() => allRivens.find((r) => rivenKeys.get(r) === openKey) ?? null, [allRivens, rivenKeys, openKey]);

  const filtered = useMemo(() => {
    let list = allRivens.filter((r) => {
      const matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = activeType === 'all' || r.weapon_type && r.weapon_type.toLowerCase() === activeType.toLowerCase();

      let matchState = true;
      if (activeState === 'unveiled') matchState = !r.veiled && !r.challenge;
      if (activeState === 'challenge') matchState = !!r.challenge;
      if (activeState === 'veiled') matchState = !!r.veiled;

      return matchSearch && matchType && matchState;
    });

    if (!sortCriteria) return list;

    const dir = sortDirection === 'desc' ? -1 : 1;
    return [...list].sort((a, b) => {
      const ea = pricingRef.current[rivenKeys.get(a)];
      const eb = pricingRef.current[rivenKeys.get(b)];

      if (sortCriteria === 'name') {
        const na = a.name.toLowerCase();
        const nb = b.name.toLowerCase();
        return na < nb ? -dir : na > nb ? dir : 0;
      }
      if (sortCriteria === 'plat') {
        const pa = ea?.price ?? -1;
        const pb = eb?.price ?? -1;
        return (pa - pb) * dir;
      }
      if (sortCriteria === 'grade') {
        const ga = statGrades.get(a)?.grade ?? 'F';
        const gb = statGrades.get(b)?.grade ?? 'F';
        const diff = ((GRADE_ORDER[ga] ?? 99) - (GRADE_ORDER[gb] ?? 99)) * dir;
        if (diff !== 0) return diff;
        const pa = ea?.price ?? -1;
        const pb = eb?.price ?? -1;
        return (pa - pb) * dir;
      }
      if (sortCriteria === 'rank') {
        // Lower weapon_rank = more valuable/popular roll for that weapon
        // (matches the #rank/total shown in RivenCard's hover tooltip) - a
        // riven with no priced estimate yet sorts last regardless of direction.
        const ra = ea?.weapon_rank ?? Infinity;
        const rb = eb?.weapon_rank ?? Infinity;
        return (ra - rb) * dir;
      }
      return 0;
    });
  }, [allRivens, searchQuery, activeType, activeState, sortCriteria, sortDirection, statGrades]);

  // Batch price all unveiled rivens in a single invoke call
  useEffect(() => {
    const priceable = allRivens.filter((r) => !r.veiled && !r.challenge);
    const toFetch = priceable.filter((r) => !pricingRef.current[rivenKeys.get(r)]);
    if (toFetch.length === 0) return;

    const inputs = toFetch.map((r) => {
      // Pricer model keys are English — localized stat names / weapon names
      // (RU "Урон ближнего боя", "Скиайати") would never match.
      const statKey = (s) => STAT_TO_PRICER[s.statKey || s.tag] || (s.statKey || s.tag).toLowerCase().replace(/\s+/g, '_');
      const pos = (r.stats || []).filter((s) => s.positive).map(statKey);
      const neg = (r.stats || []).filter((s) => !s.positive).map(statKey);
      return {
        weapon_name: r.weapon_name_en || r.weapon_name || r.name.replace(/ Riven.*$/, ''),
        re_rolls: r.rerolls ?? 0,
        positive1: pos[0] || null,
        positive2: pos[1] || null,
        positive3: pos[2] || null,
        negative: neg[0] || null
      };
    });

    let cancelled = false;
    invoke('estimate_riven_full_batch', { inputs }).then((results) => {
      if (cancelled) return;
      if (!results) return;
      const newCache = { ...pricingRef.current };
      let stored = 0;
      toFetch.forEach((r, i) => {
        if (results[i]) {newCache[rivenKeys.get(r)] = results[i];stored++;}
      });
      pricingRef.current = newCache;
      setPricingCache(newCache);
      // Retry if pricer wasn't ready (all results null), capped so a
      // persistently-down pricer doesn't get hammered every 3s forever.
      if (stored > 0) {
        retryCountRef.current = 0;
      } else if (toFetch.length > 0 && retryCountRef.current < 3) {
        retryCountRef.current += 1;
        setTimeout(() => setRetryTick((t) => t + 1), 3000);
      }
    }).catch((e) => console.error('pricer invoke failed:', e));
    return () => {cancelled = true;};
  }, [allRivens, retryTick]);

  const unveiledCount = allRivens.filter((r) => !r.veiled && !r.challenge).length;
  const challengeCount = allRivens.filter((r) => r.challenge).length;
  const veiledCount = allRivens.filter((r) => r.veiled).length;
  const capacity = inventoryData?.account?.riven_capacity ?? 0;

  const renderHeaderPanel = () =>
  <div className="flex flex-col gap-4" data-preview-rivens-header={IS_PREVIEW ? '' : undefined}>
      <div className={IS_PREVIEW ? "flex items-center gap-4 preview-rivens-primary-controls" : "flex items-center gap-4"} data-preview-rivens-primary-controls={IS_PREVIEW ? '' : undefined}>
        <div className="relative flex-1 group" data-preview-rivens-search={IS_PREVIEW ? '' : undefined}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input
          placeholder={t('rivens.search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 bg-black/20 border-white/5 h-[42px]" />
        
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2" data-preview-rivens-state={IS_PREVIEW ? '' : undefined}>
          <Filter size={14} className="text-kronos-dim mx-1" />
          <div className="flex gap-1">
            {STATE_TABS.map((t) =>
          <button
            key={t.id}
            onClick={() => setActiveState(t.id)}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeState === t.id ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>
            
                {t.label}
              </button>
          )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2" data-preview-rivens-sort={IS_PREVIEW ? '' : undefined}>
          <ArrowUpDown size={12} className="text-kronos-accent mx-1" />
          <div className="flex gap-1">
            {SORT_CRITERIA.map((c) => {
            const isActive = sortCriteria === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (isActive) {
                    setSortDirection((prev) => prev === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortCriteria(c.id);
                    setSortDirection('desc');
                  }
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${isActive ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>
                
                  {c.label}
                  {isActive && <ArrowUpDown size={10} className={sortDirection === 'desc' ? 'rotate-180' : ''} />}
                </button>);

          })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3" data-preview-rivens-types-row={IS_PREVIEW ? '' : undefined}>
        <Tabs tabs={TYPE_TABS.map((t) => {
        // Keyed by stable tab id, not the translated label - the label
        // only coincidentally matched these filenames in English, and
        // broke (blank/broken-image icon) for every id below when the
        // game locale changed the label text (same bug class as
        // Inventory.jsx's category icon map).
        const iconMap = {
          all: 'All', rifle: 'Primary', pistol: 'Secondary', melee: 'Melee',
          shotgun: 'Shotgun', sniper: 'Sniper', kitgun: 'Kitgun', zaw: 'Zaw', archgun: 'Archgun',
        };
        const iconName = iconMap[t.id] || t.label;
        return { ...t, icon: iconsPath ? convertFileSrc(`${iconsPath}/Categories/${iconName}.png`) : null };
      })} activeTab={activeType} onChange={setActiveType} className={IS_PREVIEW ? "flex-1 preview-rivens-types" : "flex-1"} />
      </div>
    </div>;


  return (
    <PreviewRivensLayout enabled={IS_PREVIEW}>
    <>
    <PageLayout
      titleKey="screen.rivens"
      subtitle={`${unveiledCount} ${t('rivens.state_unveiled')} · ${challengeCount} ${t('rivens.state_challenge')} · ${veiledCount} ${t('rivens.state_veiled')} · ${unveiledCount + challengeCount}/${capacity} ${t('rivens.capacity_label')}`}
      headerPanel={renderHeaderPanel()}>

      <div className="space-y-4 pt-2">
        {isInventoryLoading ?
        <MonitorState isLoading className="py-20" /> :
        !inventoryData ?
        <MonitorState className="py-20" /> :
        !framesPath ?
        <MonitorState isLoading className="py-20" /> :
        filtered.length === 0 ?
        <Card glow>
            <div className="text-center py-12">
              <p className="text-kronos-dim">{t('rivens.no_match')}</p>
            </div>
          </Card> :

        <div className="grid pb-4" data-preview-rivens-grid={IS_PREVIEW ? '' : undefined} style={{
          gridTemplateColumns: 'repeat(auto-fill, 200px)',
          gap: IS_PREVIEW ? undefined : '50px',
          justifyContent: 'center'
        }}>
            {filtered.map((riven, idx) =>
          <div
            key={idx}
            className={IS_PREVIEW ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-kronos-accent focus-visible:outline-offset-4 rounded-xl" : "cursor-pointer"}
            data-preview-riven-card={IS_PREVIEW ? '' : undefined}
            role={IS_PREVIEW ? 'button' : undefined}
            tabIndex={IS_PREVIEW ? 0 : undefined}
            aria-label={IS_PREVIEW ? riven.name : undefined}
            onClick={() => toggle(rivenKeys.get(riven))}
            onKeyDown={IS_PREVIEW ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle(rivenKeys.get(riven));
              }
            } : undefined}>
              <RivenCard riven={riven} framesPath={framesPath} iconsPath={iconsPath} width={200} estimate={pricingCache[rivenKeys.get(riven)]} statGrade={statGrades.get(riven)} />
            </div>
          )}
          </div>
        }
      </div>
    </PageLayout>
    {openRiven && <RivenGradeDrawer riven={openRiven} statGrade={statGrades.get(openRiven)} onClose={close} />}
    </>
    </PreviewRivensLayout>);

}