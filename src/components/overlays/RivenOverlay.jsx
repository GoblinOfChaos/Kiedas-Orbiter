import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useUi } from '../../contexts/UiContext';
import { loadSettings, getSetting } from '../../lib/settings';
import {
  cleanStatName,
  displayStatName,
  parseRivenOcr,
  foldVariants,
  buildStatAliases,
  garbageReForLocale } from
'../../lib/rivenOcrI18n';
import { getRivenStatGrade, loadRivenGoodRolls } from '../../lib/rivenGrader';
import { getRivenBaseData, computeRivenPerfectness } from '../../lib/rivenPerfectness';


export default function RivenOverlay() {
  const label = getCurrentWindow().label;
  const isNew = label === 'overlay-riven-new';
  const [visible, setVisible] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const aliveRef = useRef(true);
  const showingRef = useRef(false);
  // Bumped at the start of every capture (doOcr call or a manual OCR-hotkey
  // riven-ocr-result event) so an async pricing result can check it's still
  // the most recent one before writing state - without this, the manual OCR
  // hotkey (which can fire at any time, independent of the reroll-debounce
  // timers already guarded elsewhere in this file) could race a doOcr call
  // already in flight, with whichever's estimate_riven_full round-trip
  // finished last winning regardless of which was actually more recent.
  const captureGenRef = useRef(0);
  // Safety-net auto-hide: if OCR reads no usable text (parseRivenOcr returns
  // null - card mid-animation, wrong resolution, etc.), the overlay renders
  // the same "waiting for card" state as before any scan ever ran, with no
  // way to tell the two apart and no retry. If the game then never emits the
  // EE.log line this app watches for to close the overlay (happens - the
  // legacy Python overlay hit the identical problem for the relic-recommend
  // popup and fixed it the same way), the window sits stuck over the game
  // indefinitely. This timer force-hides it if nothing resolves the capture.
  const stuckHideTimerRef = useRef(null);
  const STUCK_HIDE_MS = 8000;
  const knownWeaponsRef = useRef([]);
  const knownWeaponsLowerRef = useRef([]);
  const localizedWeaponsRef = useRef([]);

  const [parsed, setParsed] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [rivenInfo, setRivenInfo] = useState(null);
  const [statGrade, setStatGrade] = useState(null);
  const [knownWeapons, setKnownWeapons] = useState([]);
  const { locale, i18nData, t } = useUi();
  const statAliases = useMemo(() => buildStatAliases(locale, i18nData?.rivenStats), [locale, i18nData]);
  const garbageRe = useMemo(() => garbageReForLocale(locale), [locale]);

  useEffect(() => { loadRivenGoodRolls() }, []);

  useEffect(() => {
    invoke('get_known_weapon_names').then((names) => {
      setKnownWeapons(names);
      knownWeaponsRef.current = names;
      knownWeaponsLowerRef.current = names.map((w) => w.toLowerCase());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadSettings().then(() => {
      const gameLocale = getSetting('gameLocale', 'en');
      invoke('get_localized_weapon_names', { locale: gameLocale }).then((pairs) => {
        localizedWeaponsRef.current = (pairs || []).map((p) => ({
          variants: foldVariants(p.localized),
          english: p.english
        }));
      }).catch(() => {});
    });
  }, []);

  function extractWeaponName(ocrName) {
    if (!ocrName) return '';
    const known = knownWeaponsRef.current;
    const knownLower = knownWeaponsLowerRef.current;
    let cleaned = ocrName.
    replace(/\s+(mod(\s+drain)?|drain|capacity|polarity|kapazität|polarität|capacité|polarité)\s*\d*$/i, '').
    replace(/\s+(roll(\s+counter)?|counter|reroll|rerolls|neuausrichtung|neuausrichtungen|relance|relances)\s*\d*$/i, '').
    replace(/\s+riven$/i, '').
    replace(/\s*\(.*?\)\s*$/, '').
    trim();
    if (!cleaned) cleaned = ocrName;
    const lower = cleaned.toLowerCase();

    // 0. localized weapon-name match (game-language OCR text → English name)
    const loc = localizedWeaponsRef.current;
    if (loc.length) {
      const [folded, expanded, tight] = foldVariants(cleaned);
      const hasVariant = (w) => w.variants.includes(folded) || w.variants.includes(expanded) || w.variants.includes(tight);
      // exact match on any variant
      for (const w of loc) {
        if (hasVariant(w)) return w.english;
      }
      // longest prefix match (folded)
      let bestLoc = '';
      for (const w of loc) {
        if (folded.startsWith(w.variants[0]) && w.english.length > bestLoc.length) bestLoc = w.english;
      }
      if (bestLoc) return bestLoc;
      // longest substring match (folded)
      bestLoc = '';
      for (const w of loc) {
        if (folded.includes(w.variants[0]) && w.english.length > bestLoc.length) bestLoc = w.english;
      }
      if (bestLoc) return bestLoc;
    }

    // Helper: try to match `lower` against known weapons, return longest match or null
    const tryMatch = (str) => {
      // 1. exact match
      for (let i = 0; i < known.length; i++) {
        if (str === knownLower[i]) return known[i];
      }
      // 2. longest prefix match
      let best = '';
      for (let i = 0; i < known.length; i++) {
        if (str.startsWith(knownLower[i]) && known[i].length > best.length) {
          best = known[i];
        }
      }
      if (best) return best;
      // 3. longest substring match
      for (let i = 0; i < known.length; i++) {
        if (str.includes(knownLower[i]) && known[i].length > best.length) {
          best = known[i];
        }
      }
      return best || null;
    };

    const direct = tryMatch(lower);
    if (direct) return direct;

    // Try with leading number+hyphen stripped (mod drain "18-" prefix)
    const noPrefix = lower.replace(/^\d+\s*[-–—]\s*/, '');
    if (noPrefix !== lower) {
      const unprefixed = tryMatch(noPrefix);
      if (unprefixed) return unprefixed;
      // Also try each known weapon without its number prefix
      for (let i = 0; i < known.length; i++) {
        const wNoPrefix = knownLower[i].replace(/^\d+\s*[-–—]\s*/, '');
        if (wNoPrefix !== knownLower[i] && noPrefix === wNoPrefix) return known[i];
      }
    }

    // 4. iterative suffix strip: keep popping words until we find a known name
    const words = cleaned.trim().split(/\s+/);
    while (words.length > 1) {
      words.pop();
      const trial = words.join(' ').toLowerCase();
      const matched = tryMatch(trial);
      if (matched) return matched;
      // Also try no-prefix variant
      const trialNoPrefix = trial.replace(/^\d+\s*[-–—]\s*/, '');
      if (trialNoPrefix !== trial) {
        const matched2 = tryMatch(trialNoPrefix);
        if (matched2) return matched2;
      }
    }
    // 5. last resort: return first word only (with number prefix stripped)
    return cleaned.trim().split(/\s+/)[0].replace(/^\d+\s*[-–—]\s*/, '') || cleaned;
  }

  const doPricing = useCallback((p) => {
    if (!p || !p.stats.length) {setEstimatedPrice(null);setRivenInfo(null);setStatGrade(null);return;}
    // rivenInfo is only written once estimate_riven_full resolves below (an
    // async round-trip), but statGrade is set synchronously a few lines down
    // - without resetting rivenInfo here too, a fresh capture briefly showed
    // the new riven's stats/grade next to the *previous* riven's Avg Value
    // and Tier (rivenInfo.weapon_rank/total_weapons) until that request
    // finished, a genuine mixed-riven display.
    setRivenInfo(null);
    const gen = captureGenRef.current;
    const weaponName = extractWeaponName(p.name || '');
    // x-prefixed values (e.g. "x0.82") are negative multiplier stats (typically
    // damage-to-faction reductions) - excluded from pos below, or they land in
    // BOTH pos and neg for the same stat, which the pricer model can't
    // represent (a stat can't be both) and silently mis-grades as if the riven
    // had an extra real positive stat instead. Confirmed live: this made a
    // real D-grade/122p Bubonico riven price as S-grade/166p.
    const isNegativeValue = (value) => value.startsWith('-') || /^x/i.test(value);
    const pos = p.stats.filter((s) => !isNegativeValue(s.value)).map((s) => cleanStatName(s.name, statAliases));
    const neg = p.stats.filter((s) => isNegativeValue(s.value)).map((s) => cleanStatName(s.name, statAliases));

    // Stat-quality grade (S/A/B/C/D) must come from the same place the main
    // Rivens screen uses (getRivenStatGrade) - not a separately-computed
    // market-price percentile. Two different letter grades on the same S-D
    // scale looked like a contradiction (e.g. app said D, overlay said S)
    // when they were actually answering different questions; there must be
    // one grading system, not two.
    const gradeStats = [
      ...pos.map((statKey) => ({ statKey, positive: true })),
      ...neg.map((statKey) => ({ statKey, positive: false })),
    ];
    setStatGrade(getRivenStatGrade({ stats: gradeStats, perfectness: 0 }, weaponName));

    // Upgrade the grade with a real perfectness score once the weapon's
    // Riven disposition/base-stat data resolves (async Tauri round-trip) -
    // this can only ever raise A -> S (see GOD_ROLL_THRESHOLD in
    // rivenGrader.js), never change the underlying stat-combo grade itself.
    getRivenBaseData(weaponName).then((baseData) => {
      if (!aliveRef.current || captureGenRef.current !== gen || !baseData) return;
      const perfStats = p.stats.map((s) => ({
        statKey: cleanStatName(s.name, statAliases),
        positive: !isNegativeValue(s.value),
        rawValue: s.value
      }));
      const perfectness = computeRivenPerfectness(baseData, perfStats);
      if (perfectness == null) return;
      setStatGrade(getRivenStatGrade({ stats: gradeStats, perfectness }, weaponName));
    }).catch(() => {});

    invoke('estimate_riven_full', {
      input: {
        weapon_name: weaponName,
        re_rolls: parseInt(p.rolls ?? 0),
        positive1: pos[0] || null,
        positive2: pos[1] || null,
        positive3: pos[2] || null,
        negative: neg[0] || null
      }
    }).then((info) => {
      if (aliveRef.current && captureGenRef.current === gen) {
        setRivenInfo(info);
        setEstimatedPrice(info?.price ?? null);
      }
    }).catch(console.error);
  }, [statAliases]);

  const clearStuckHideTimer = useCallback(() => {
    if (stuckHideTimerRef.current) {
      clearTimeout(stuckHideTimerRef.current);
      stuckHideTimerRef.current = null;
    }
  }, []);

  const doOcr = useCallback((pos) => {
    if (!aliveRef.current) return;
    captureGenRef.current++;
    const gen = captureGenRef.current;
    clearStuckHideTimer();
    setOcrLoading(true);
    setParsed(null);
    setEstimatedPrice(null);
    invoke('ocr_riven_card', { position: pos }).
    then((res) => {
      if (aliveRef.current && captureGenRef.current === gen) {
        const p = parseRivenOcr(res.text, garbageRe);
        setParsed(p);
        doPricing(p);
        if (!p) {
          // Nothing readable on this capture - arm the safety net instead of
          // leaving "waiting for card" up forever with no retry in flight.
          stuckHideTimerRef.current = setTimeout(() => {
            if (aliveRef.current && captureGenRef.current === gen) hide();
          }, STUCK_HIDE_MS);
        }
      }
    }).
    catch(() => {if (aliveRef.current && captureGenRef.current === gen) setParsed({ name: '', mr: '', stats: [], raw: '[OCR failed]' });}).
    finally(() => {if (aliveRef.current && captureGenRef.current === gen) setOcrLoading(false);});
  }, [doPricing, garbageRe, clearStuckHideTimer]);

  const show = useCallback(() => {
    if (showingRef.current) return;
    showingRef.current = true;
    aliveRef.current = true;
    setVisible(true);
    setParsed(null);
    // A prior OCR call's `finally` skips resetting this when its window was
    // hidden/torn down before it resolved (guarded by aliveRef) - without
    // resetting here too, a fresh open can be stuck showing "scanning"
    // forever with no OCR call in flight to ever clear it.
    setOcrLoading(false);
    invoke('show_overlay_window', { label }).catch(() => {}).
    finally(() => {
      showingRef.current = false;
      // show_overlay_window does real X11 work (~50ms+) and can resolve
      // after a hide() called shortly after this show() already ran and
      // returned - hide()'s own invoke is comparatively instant, so without
      // this check the late-resolving show can win the race at the OS level
      // and leave the window stuck visible even though app state (aliveRef)
      // has already moved on to "hidden". Reproduced live 2026-09-03.
      if (!aliveRef.current) invoke('hide_overlay_window', { label }).catch(() => {});
    });
  }, [label]);

  const hide = useCallback(() => {
    aliveRef.current = false;
    showingRef.current = false;
    clearStuckHideTimer();
    setVisible(false);
    setParsed(null);
    setEstimatedPrice(null);
    invoke('hide_overlay_window', { label }).catch(() => {});
  }, [label, clearStuckHideTimer]);

  useEffect(() => {
    const unsubs = [
    listen('riven-ocr-result', (e) => {
      const payload = typeof e.payload === 'string' ? e.payload : String(e.payload);
      if (aliveRef.current) {
        // This global hotkey can fire at any time, independent of doOcr
        // calls already in flight from the reroll-debounce timers below -
        // bump the generation so this capture wins over anything older.
        captureGenRef.current++;
        const gen = captureGenRef.current;
        clearStuckHideTimer();
        setVisible(true);
        setOcrLoading(false);
        const p = parseRivenOcr(payload, garbageRe);
        setParsed(p);
        doPricing(p);
        if (!p) {
          stuckHideTimerRef.current = setTimeout(() => {
            if (aliveRef.current && captureGenRef.current === gen) hide();
          }, STUCK_HIDE_MS);
        }
      }
    })];


    if (isNew) {
      let timer = null;
      unsubs.push(
        listen('riven-reroll', () => {
          timer = setTimeout(() => {
            show();
            doOcr('Middle');
          }, 4000);
        }),
        listen('riven-reroll-confirmed', () => {
          if (timer) {clearTimeout(timer);timer = null;}
          timer = setTimeout(() => hide(), 2000);
        }),
        listen('riven-screen-closed', () => {
          if (timer) {clearTimeout(timer);timer = null;}
          hide();
        })
      );
      return () => {
        if (timer) clearTimeout(timer);
        clearStuckHideTimer();
        unsubs.forEach((p) => p.then((f) => f()));
      };
    } else {
      let refreshTimer = null;
      unsubs.push(
        listen('riven-linked-open', () => {show();doOcr('Linked');}),
        listen('riven-screen-open', () => {
          show();
          doOcr('Middle');
        }),
        listen('riven-linked-closed', () => hide()),
        listen('riven-screen-closed', () => {
          if (refreshTimer) {clearTimeout(refreshTimer);refreshTimer = null;}
          hide();
        }),
        listen('riven-reroll-confirmed', () => {
          // Rerolling again before the previous 2s settle timer fires left
          // two competing OCR calls in flight with no defined winner -
          // whichever's OCR/pricing round-trip happened to finish last would
          // silently overwrite the other, showing stale or racing results.
          // Confirmed live: rapid re-rolling made price/grade flip between
          // values that didn't match what was actually on screen.
          if (refreshTimer) {clearTimeout(refreshTimer);refreshTimer = null;}
          refreshTimer = setTimeout(() => {
            setRefreshTick((t) => t + 1);
            doOcr('Middle');
          }, 2000);
        })
      );
      return () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        clearStuckHideTimer();
        unsubs.forEach((p) => p.then((f) => f()));
      };
    }
  }, [isNew, show, hide, doOcr, doPricing, label, garbageRe, clearStuckHideTimer]);

  if (!visible) return null;

  const posClass = (v) => {
    if (!v) return 'text-kronos-text';
    // x-prefixed values (e.g. "x0.65") are negative modifiers
    if (/^x/i.test(v)) return 'text-red-400';
    const num = parseFloat(v);
    if (num > 0) return 'text-green-400';
    if (num < 0) return 'text-red-400';
    return 'text-kronos-text';
  };

  const fmtVal = (v) => {
    if (!v) return '';
    const s = String(v);
    if (s.startsWith('+') || s.startsWith('-') || /^x/i.test(s)) return s;
    return '+' + s;
  };

  return (
    <div className="w-full h-full overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.06),transparent_70%)]" />

      <div className="relative z-10 flex flex-col w-full h-full">
        {/* Header: weapon name + badge */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {parsed?.name &&
            <span className="text-[14px] font-black text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] tracking-tight">
                {parsed.name}
              </span>
            }
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {statGrade?.grade &&
            <span className={`text-[12px] font-black px-2 py-0.5 rounded ${
            statGrade.grade === 'S' ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' :
            statGrade.grade === 'A' ? 'bg-green-400/20 text-green-400 border border-green-400/30' :
            statGrade.grade === 'B' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' :
            statGrade.grade === 'C' ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30' :
            'bg-red-400/20 text-red-400 border border-red-400/30'}`
            } title={statGrade.label}>{statGrade.grade}</span>
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-3 pb-4 flex flex-col overflow-hidden">
          {ocrLoading ?
          <div className="flex items-center justify-center flex-1">
              <p className="text-[12px] text-zinc-300 uppercase tracking-widest font-bold animate-pulse">{t('ui.riven_overlay.scanning')}</p>
            </div> :
          parsed ?
          <div className="flex flex-col flex-1 overflow-hidden">
              {/* Stats */}
              {parsed.stats.length > 0 &&
            <div className="space-y-[2px]">
                  {parsed.stats.map((s, i) =>
              <div key={i} className="flex justify-between items-center px-2.5 py-1.5 rounded bg-white/[0.03]">
                      <span className="text-[12px] text-zinc-200 font-medium truncate pr-2">
                        {displayStatName(s.name, statAliases)}
                      </span>
                      <span className={`text-[13px] font-black whitespace-nowrap ${posClass(s.value)}`}>
                        {fmtVal(s.value)}
                      </span>
                    </div>
              )}
                </div>
            }

              {/* Pricing info — always shown */}
              <div className="grid grid-cols-3 gap-[1px] rounded-lg overflow-hidden mt-0.5">
                <div className="bg-white/[0.04] px-2 py-2 text-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">{t('ui.riven_overlay.avg_value')}</span>
                  <span className="text-[14px] font-black text-yellow-400">{rivenInfo ? `${Math.round(rivenInfo.expected_value)}p` : '--'}</span>
                </div>
                <div className="bg-white/[0.04] px-2 py-2 text-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">{t('ui.riven_card.your_value')}</span>
                  <span className="text-[14px] font-black text-yellow-400">{rivenInfo ? `${Math.round(estimatedPrice)}p` : '--'}</span>
                </div>
                <div className="bg-white/[0.04] px-2 py-2 text-center" title={t('ui.riven_card.reroll_potential_hint')}>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">{t('ui.riven_card.reroll_potential')}</span>
                  <span className="text-[14px] font-black text-zinc-500">{rivenInfo ? `${Math.round((1 - (rivenInfo.probability_stagnant ?? 0.5)) * 100)}%` : '--'}</span>
                </div>
                <div className="bg-white/[0.04] px-2 py-2 text-center col-span-3">
                  {rivenInfo ?
                (() => {
                  const wr = rivenInfo.weapon_rank ?? 999;
                  const total = rivenInfo.total_weapons ?? 1;
                  const tier = t(wr <= total * 0.2 ? 'ui.riven_overlay.tier_meta' : wr <= total * 0.5 ? 'ui.riven_overlay.tier_popular' : wr <= total * 0.7 ? 'ui.riven_overlay.tier_average' : wr <= total * 0.9 ? 'ui.riven_overlay.tier_niche' : 'ui.riven_overlay.tier_unpopular');
                  const roll = t(statGrade?.grade === 'S' ? 'ui.riven_overlay.roll_perfect' : statGrade?.grade === 'A' ? 'ui.riven_overlay.roll_good' : statGrade?.grade === 'B' ? 'ui.riven_overlay.roll_average' : statGrade?.grade === 'C' ? 'ui.riven_overlay.roll_mediocre' : 'ui.riven_overlay.roll_bad');
                  return (
                    <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                          {tier} {t('ui.riven_card.tier_weapon')} &middot; {roll}{t('ui.riven_card.rolls')}
                    </span>);

                })() :

                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('ui.riven_overlay.waiting_price')}</span>
                }
                </div>
              </div>
            </div> :

          <div className="flex items-center justify-center flex-1">
              <p className="text-[13px] text-zinc-400 uppercase tracking-widest font-bold">{t('ui.riven_overlay.waiting_card')}</p>
            </div>
          }
        </div>
      </div>
    </div>);

}