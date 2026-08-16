import { invoke } from '@tauri-apps/api/core';

// Ported from wfinfo-ng's riven_grader_watcher.py (_grade_riven). Data source:
// src-tauri/data/assets/data/riven_good_rolls.json, translated from wfinfo-ng's
// short stat codes into Kronos's own English statKey vocabulary by
// scripts/extract-riven-good-rolls.mjs.
//
// wfinfo-ng returns 6 tiers (great/good/ok/weak/reroll/review); Kronos keeps
// its existing S-A-B-C-D scale, so tiers collapse onto it per issue #81:
//   great (god roll, perfectness >= 97.5%) -> S
//   great (other)                          -> A
//   good                                   -> B
//   ok                                     -> C
//   weak / reroll                          -> D
//   review (no weapon profile)             -> null (no letter grade)

const GOD_ROLL_THRESHOLD = 97.5;

let dataPromise = null;
let dataCache = null;

export function loadRivenGoodRolls() {
  if (dataPromise) return dataPromise;
  dataPromise = invoke('read_file_bytes', { relative: 'data/assets/data/riven_good_rolls.json' })
    .then((bytes) => {
      dataCache = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
      return dataCache;
    })
    .catch((e) => {
      console.error('loadRivenGoodRolls failed:', e);
      dataCache = { categories: {} };
      return dataCache;
    });
  return dataPromise;
}

function findProfile(weaponNameEn) {
  if (!dataCache || !weaponNameEn) return null;
  const key = weaponNameEn.toLowerCase().trim();
  for (const category of Object.values(dataCache.categories || {})) {
    if (category[key]) return category[key];
  }
  return null;
}

/**
 * Grade a riven using wfinfo-ng's stat-combo matching logic.
 * @param {{stats: Array<{statKey: string, positive: boolean}>, perfectness: number}} riven
 * @param {string} weaponNameEn - English weapon name (matches riven.weapon_name_en)
 * @returns {{grade: 'S'|'A'|'B'|'C'|'D'|null, tier: string, label: string}}
 */
export function getRivenStatGrade(riven, weaponNameEn) {
  if (!dataCache) return { grade: null, tier: 'loading', label: '' };

  const profile = findProfile(weaponNameEn);
  if (!profile) return { grade: null, tier: 'review', label: 'No profile' };

  const positives = (riven.stats || []).filter((s) => s.positive).map((s) => s.statKey);
  const negatives = (riven.stats || []).filter((s) => !s.positive).map((s) => s.statKey);
  const posSet = new Set(positives);
  const safeNegs = new Set(profile.safe_negatives || []);

  let bestScore = -1;
  let bestCombo = null;
  for (const combo of profile.good_combos || []) {
    const mandatory = new Set(combo.mandatory || []);
    const pickFrom = new Set(combo.pick_from || []);
    const pickN = combo.pick_n || 0;

    let mandatoryHits = 0;
    for (const m of mandatory) if (posSet.has(m)) mandatoryHits++;
    let optionalHits = 0;
    for (const p of pickFrom) if (posSet.has(p)) optionalHits++;
    const missingMandatory = mandatory.size - mandatoryHits;

    let score;
    if (missingMandatory === 0) {
      score = mandatoryHits * 10 + Math.min(optionalHits, pickN) * 10;
      if (optionalHits >= pickN) score += 5;
    } else {
      score = mandatoryHits * 5 + optionalHits;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCombo = { mandatory, pickFrom, pickN };
    }
  }

  if (!bestCombo) return { grade: null, tier: 'review', label: 'No target stats' };

  let optionalHits = 0;
  for (const p of bestCombo.pickFrom) if (posSet.has(p)) optionalHits++;
  const hasAllMandatory = [...bestCombo.mandatory].every((m) => posSet.has(m));
  const riskyNegs = negatives.filter((n) => !safeNegs.has(n));

  // Per-stat assessment, matching wfinfo-ng's riven_grader_overlay.py card:
  // each of the riven's actual stats gets a status label, plus any missing
  // mandatory stats the roll never got.
  const assessment = [];
  for (const p of positives) {
    if (bestCombo.mandatory.has(p) || bestCombo.pickFrom.has(p)) {
      assessment.push({ status: 'good', text: `+${p}` });
    } else {
      assessment.push({ status: 'off-target', text: `+${p}` });
    }
  }
  for (const n of negatives) {
    if (safeNegs.has(n)) {
      assessment.push({ status: 'safe-negative', text: `-${n}` });
    } else {
      assessment.push({ status: 'risky-negative', text: `-${n}` });
    }
  }
  for (const m of bestCombo.mandatory) {
    if (!posSet.has(m)) assessment.push({ status: 'missing-required', text: `+${m}` });
  }

  const result = (grade, tier, label) => ({
    grade, tier, label, assessment,
    mandatory: [...bestCombo.mandatory],
    optional: [...bestCombo.pickFrom],
    pickN: bestCombo.pickN,
    riskyNegatives: riskyNegs,
    safeNegatives: [...safeNegs],
  });

  if (hasAllMandatory && optionalHits >= bestCombo.pickN && riskyNegs.length === 0) {
    if ((riven.perfectness ?? 0) >= GOD_ROLL_THRESHOLD) {
      return result('S', 'great', '★ God Roll');
    }
    return result('A', 'great', '★ Great');
  }
  if (hasAllMandatory && optionalHits >= Math.max(1, bestCombo.pickN - 1) && riskyNegs.length === 0) {
    return result('B', 'good', '▲ Good');
  }
  if (hasAllMandatory && riskyNegs.length === 0) {
    return result('C', 'ok', '■ OK');
  }
  if (hasAllMandatory && riskyNegs.length > 0) {
    return result('C', 'ok', '■ OK — risky neg');
  }
  const mandatoryHitCount = [...bestCombo.mandatory].filter((m) => posSet.has(m)).length;
  if (mandatoryHitCount > 0) {
    return result('D', 'weak', '▼ Weak');
  }
  return result('D', 'reroll', '↻ Reroll');
}
