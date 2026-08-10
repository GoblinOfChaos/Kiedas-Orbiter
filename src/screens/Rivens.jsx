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

const TYPE_TABS = [
{ id: 'all', label: 'All' },
{ id: 'rifle', label: 'Rifle' },
{ id: 'pistol', label: 'Pistol' },
{ id: 'melee', label: 'Melee' },
{ id: 'shotgun', label: 'Shotgun' },
{ id: 'sniper', label: 'Sniper' },
{ id: 'kitgun', label: 'Kitgun' },
{ id: 'zaw', label: 'Zaw' },
{ id: 'archgun', label: 'Archgun' }];


const STATE_TABS = [
{ id: 'all', label: 'All States' },
{ id: 'unveiled', label: 'Unveiled' },
{ id: 'challenge', label: 'Challenge' },
{ id: 'veiled', label: 'Veiled' }];


const SORT_CRITERIA = [
{ id: 'name', label: 'Name' },
{ id: 'plat', label: 'Plat' },
{ id: 'grade', label: 'Grade' }];


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
  if (r.veiled || r.challenge) return r.name + (r.veiled ? '_veiled' : '_challenge');
  const stats = (r.stats || []).map((s) => s.tag).sort().join('|');
  return r.name + '|' + stats;
}

export default function Rivens() {
  const { t } = useUi()
  console.log('Rivens render', performance.now());
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
      return 0;
    });
  }, [allRivens, searchQuery, activeType, activeState, sortCriteria, sortDirection, statGrades]);

  // Batch price all unveiled rivens in a single invoke call
  useEffect(() => {
    console.log('pricing effect fire, rivens:', allRivens.length);
    const priceable = allRivens.filter((r) => !r.veiled && !r.challenge);
    const toFetch = priceable.filter((r) => !pricingRef.current[rivenKeys.get(r)]);
    console.log('toFetch:', toFetch.length);
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

    console.log('calling invoke with', inputs.length, 'inputs');
    let cancelled = false;
    invoke('estimate_riven_full_batch', { inputs }).then((results) => {
      if (cancelled) return;
      console.log('batch results length:', results?.length, 'first:', results?.[0]);
      if (!results) return;
      const newCache = { ...pricingRef.current };
      let stored = 0;
      toFetch.forEach((r, i) => {
        if (results[i]) {newCache[rivenKeys.get(r)] = results[i];stored++;}
      });
      pricingRef.current = newCache;
      setPricingCache(newCache);
      console.log('pricingCache set, entries:', Object.keys(newCache).length);
      // Retry if pricer wasn't ready (all results null)
      if (stored === 0 && toFetch.length > 0) {
        console.log('pricer returned no results, retrying in 3s...');
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
  <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input
          placeholder={t('rivens.search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 bg-black/20 border-white/5 h-[42px]" />
        
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
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

        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
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

      <div className="flex items-center gap-3">
        <Tabs tabs={TYPE_TABS.map((t) => {
        const iconMap = { rifle: 'Primary', pistol: 'Secondary' };
        const iconName = iconMap[t.id] || t.label;
        return { ...t, icon: iconsPath ? convertFileSrc(`${iconsPath}/Categories/${iconName}.png`) : null };
      })} activeTab={activeType} onChange={setActiveType} className="flex-1" />
      </div>
    </div>;


  return (
    <>
    <PageLayout
      titleKey="screen.rivens"
      subtitle={`${unveiledCount} unveiled · ${challengeCount} challenge · ${veiledCount} veiled · ${unveiledCount + challengeCount}/${capacity} capacity`}
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

        <div className="grid pb-4" style={{
          gridTemplateColumns: 'repeat(auto-fill, 200px)',
          gap: '50px',
          justifyContent: 'center'
        }}>
            {filtered.map((riven, idx) =>
          <div key={idx} className="cursor-pointer" onClick={() => toggle(rivenKeys.get(riven))}>
              <RivenCard riven={riven} framesPath={framesPath} iconsPath={iconsPath} width={200} estimate={pricingCache[rivenKeys.get(riven)]} statGrade={statGrades.get(riven)} />
            </div>
          )}
          </div>
        }
      </div>
    </PageLayout>
    {openRiven && <RivenGradeDrawer riven={openRiven} statGrade={statGrades.get(openRiven)} onClose={close} />}
    </>);

}