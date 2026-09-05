import { invoke } from '@tauri-apps/api/core';
import { RIVEN_STAT_MAP } from './inventoryParser';

// Reverse of the forward roll->displayed-value formula in inventoryParser.js
// (buildRivenTagInfo / formatStat), so a live OCR'd Riven card - which only
// has the displayed percentage, not the game's raw roll fraction - can be
// graded the same way an owned Riven parsed from the save file is.
const NUM_BUFFS_ATTEN = [0, 1, 0.66000003, 0.5, 0.40000001, 0.34999999];
const NUM_BUFFS_CURSE_ATTEN = [0, 1, 0.33000001, 0.5, 1.25, 1.5];

// Stats whose display formula diverges from the standard "value * 100 = %"
// case - see inventoryParser.js's formatStat SPECIAL_ONE_DP/SPECIAL_FACTOR
// sets. Perfectness for these is skipped rather than computed with the
// wrong scale.
const SPECIAL_ONE_DP_TAGS = new Set(['WeaponMeleeComboInitialBonusMod', 'ComboDurationMod', 'WeaponMeleeRangeIncMod']);
const SPECIAL_FACTOR_TAGS = new Set([
  'WeaponFactionDamageCorpus', 'WeaponFactionDamageGrineer', 'WeaponFactionDamageInfested',
  'WeaponMeleeFactionDamageCorpus', 'WeaponMeleeFactionDamageGrineer', 'WeaponMeleeFactionDamageInfested',
]);

const STAT_KEY_TO_TAGS = (() => {
  const m = {};
  for (const [tag, statKey] of Object.entries(RIVEN_STAT_MAP)) {
    (m[statKey] ||= []).push(tag);
  }
  return m;
})();

const baseDataPromises = new Map();

/** Fetch (and cache) the Riven disposition + base-stat values for one weapon. */
export function getRivenBaseData(weaponNameEn) {
  if (!weaponNameEn) return Promise.resolve(null);
  if (!baseDataPromises.has(weaponNameEn)) {
    baseDataPromises.set(
      weaponNameEn,
      invoke('get_riven_base_data', { weaponName: weaponNameEn }).catch(() => null)
    );
  }
  return baseDataPromises.get(weaponNameEn);
}

/**
 * Compute a 0-100 perfectness score from OCR'd stat percentages.
 * @param {{disposition: number, base_values: Record<string, number>}} baseData
 * @param {Array<{statKey: string, positive: boolean, rawValue: string}>} stats
 * @returns {number|null} null if not enough data to compute (unmapped stat, missing weapon data, etc.)
 *
 * Assumes rank 0 (unranked) - this overlay only ever captures a card
 * immediately after unveil/reroll, before the player has had a chance to
 * spend Endo ranking it up, so the (lvl+1) rank multiplier from the forward
 * formula is fixed at 1 rather than parsed from OCR (rank isn't shown as
 * text on the card the way stat percentages are).
 */
export function computeRivenPerfectness(baseData, stats) {
  if (!baseData?.base_values || !stats?.length) return null;

  const nBuffs = stats.filter((s) => s.positive).length;
  const nCurses = stats.filter((s) => !s.positive).length;
  const dispo = baseData.disposition || 1;
  const attenuation = 15 * dispo;
  const curseAtten = Math.pow(1.25, nCurses);
  const buffMul = NUM_BUFFS_ATTEN[Math.min(nBuffs, NUM_BUFFS_ATTEN.length - 1)];
  const curseBuffMul = NUM_BUFFS_CURSE_ATTEN[Math.min(nBuffs, NUM_BUFFS_CURSE_ATTEN.length - 1)];
  const curseCurseMul = NUM_BUFFS_ATTEN[Math.min(nCurses, NUM_BUFFS_ATTEN.length - 1)];

  const fractions = [];
  for (const s of stats) {
    if (s.rawValue.startsWith('x') || s.rawValue.startsWith('X')) continue; // faction curse multiplier display, not a plain %
    const tags = STAT_KEY_TO_TAGS[s.statKey] || [];
    const tag = tags.find((t) => baseData.base_values[t] !== undefined && !SPECIAL_FACTOR_TAGS.has(t));
    if (!tag) continue;
    const base = Math.abs(baseData.base_values[tag]);
    if (!base) continue;

    const scale = SPECIAL_ONE_DP_TAGS.has(tag) ? 10 : 100;
    const numeric = Math.abs(parseFloat(s.rawValue.replace(/[+%]/g, '')));
    if (!Number.isFinite(numeric)) continue;
    const valFrac = numeric / scale;

    const denom = s.positive
      ? base * attenuation * curseAtten * buffMul
      : base * attenuation * curseBuffMul * curseCurseMul;
    if (!denom) continue;

    const roll = valFrac / denom;
    const rollFrac = Math.min(1, Math.max(0, (roll - 0.9) / 0.2));
    fractions.push(s.positive ? rollFrac : 1 - rollFrac);
  }

  if (!fractions.length) return null;
  const avg = fractions.reduce((a, b) => a + b, 0) / fractions.length;
  return Math.round(avg * 1000) / 10;
}
