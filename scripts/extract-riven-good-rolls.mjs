#!/usr/bin/env node
// One-time/re-runnable extraction: translates wfinfo-ng's riven_good_rolls.json
// (keyed by short stat codes like "MS", "CD", "TOX") into Kronos's own English
// stat label vocabulary (e.g. "Multishot", "Critical Damage", "Toxin") so the
// stat-based riven grader (src/lib/rivenGrader.js) can match directly against
// riven.stats[].statKey without any runtime code-translation.
//
// The crosswalk is built by joining two independently-maintained tag maps on
// their shared DE internal tag key (e.g. "WeaponCritDamageMod"):
//   - wfinfo-ng's TAG_MAP        (DE tag -> short code)   [hardcoded below]
//   - Kronos's RIVEN_STAT_MAP    (DE tag -> English label) [imported below]
//
// Source data: scripts/data-sources/riven_good_rolls.json, vendored from
// wfinfo-ng's riven_grader_watcher.py sibling data file. Re-copy that file
// here if wfinfo-ng's good-combo data is ever updated.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

// Ported from wfinfo-ng's riven_grader_watcher.py TAG_MAP (DE tag -> short code).
const TAG_MAP = {
  WeaponCritDamageMod: 'CD',
  WeaponCritChanceMod: 'CC',
  WeaponDamageMod: 'DMG',
  WeaponFireIterationsMod: 'MS',
  WeaponFireRateMod: 'FR',
  WeaponAttackSpeedMod: 'AS',
  WeaponReloadSpeedMod: 'RLS',
  WeaponMagazineMaxMod: 'MAG',
  WeaponToxinDamageMod: 'TOX',
  WeaponElectricityDamageMod: 'ELEC',
  WeaponHeatDamageMod: 'HEAT',
  WeaponColdDamageMod: 'COLD',
  WeaponStunChanceMod: 'SC',
  WeaponStunDurationMod: 'SD',
  WeaponPunchThroughMod: 'PT',
  WeaponProjectileSpeedMod: 'PFS',
  WeaponRangeMod: 'RANGE',
  WeaponRecoilMod: 'REC',
  WeaponZoomMod: 'ZOOM',
  WeaponAmmoMaxMod: 'AMMO',
  WeaponCritOnSlideMod: 'SLIDE',
  SlideAttackCritChanceMod: 'SLIDE',
  WeaponFinisherDamageMod: 'FIN',
  WeaponMeleeFinisherDamageMod: 'FIN',
  WeaponCorpusDamageMod: 'DTC',
  WeaponGrineerDamageMod: 'DTG',
  WeaponInfestedDamageMod: 'DTI',
  WeaponInitialComboCopyMod: 'IC',
  WeaponHeavyAttackEfficiencyMod: 'EFF',
  WeaponProcTimeMod: 'SD',
  WeaponSlideCritChanceMod: 'SLIDE',
  WeaponImpactDamageMod: 'IMP',
  WeaponPunctureDamageMod: 'PUNC',
  WeaponArmorPiercingDamageMod: 'PUNC',
  WeaponSlashDamageMod: 'SLASH',
  DamageNewImpactMod: 'IMP',
  DamageNewPunctureMod: 'PUNC',
  DamageNewSlashMod: 'SLASH',
  WeaponZoomFovMod: 'ZOOM',
  WeaponDamageAmountMod: 'DMG',
  WeaponFactionDamageCorpus: 'DTC',
  WeaponFactionDamageGrineer: 'DTG',
  WeaponFactionDamageInfested: 'DTI',
  WeaponMeleeDamageMod: 'DMG',
  WeaponMeleeRangeIncMod: 'RANGE',
  WeaponMeleeFactionDamageCorpus: 'DTC',
  WeaponMeleeFactionDamageGrineer: 'DTG',
  WeaponMeleeFactionDamageInfested: 'DTI',
  WeaponMeleeComboEfficiencyMod: 'EFF',
  WeaponMeleeComboInitialBonusMod: 'IC',
  WeaponMeleeComboBonusOnHitMod: 'CCC',
  WeaponFreezeDamageMod: 'COLD',
  WeaponFireDamageMod: 'HEAT',
  WeaponPunctureDepthMod: 'PT',
  WeaponClipMaxMod: 'MAG',
  WeaponRecoilReductionMod: 'REC',
};

// Kronos's own DE tag -> English label map (src/lib/inventoryParser.js
// RIVEN_STAT_MAP). Duplicated here rather than imported since this is a
// one-time Node script outside Vite's module graph; keep in sync manually
// if RIVEN_STAT_MAP changes.
const RIVEN_STAT_MAP = {
  WeaponMeleeDamageMod: 'Melee Damage',
  WeaponCritChanceMod: 'Critical Chance',
  WeaponCritDamageMod: 'Critical Damage',
  WeaponSpeedMod: 'Attack Speed',
  WeaponFireRateMod: 'Attack Speed',
  WeaponStatusChanceMod: 'Status Chance',
  WeaponStunChanceMod: 'Status Chance',
  WeaponRangeMod: 'Range',
  WeaponMeleeRangeIncMod: 'Range',
  WeaponDamageAmountMod: 'Damage',
  WeaponPunctureDamageMod: 'Puncture',
  WeaponSlashDamageMod: 'Slash',
  WeaponImpactDamageMod: 'Impact',
  WeaponElectricityDamageMod: 'Electricity',
  WeaponFireDamageMod: 'Heat',
  WeaponFreezeDamageMod: 'Cold',
  WeaponToxinDamageMod: 'Toxin',
  WeaponRecoilReductionMod: 'Recoil',
  WeaponReloadSpeedMod: 'Reload Speed',
  WeaponClipMaxMod: 'Magazine Capacity',
  WeaponAmmoMaxMod: 'Ammo Maximum',
  WeaponCritFireRateBonusMod: 'Fire Rate',
  WeaponChannelingDamageMod: 'Initial Combo',
  WeaponMeleeComboDurationMod: 'Combo Duration',
  WeaponMeleeComboChanceFromDot: 'Combo Count Chance',
  WeaponMeleeFinisherDamageMod: 'Finisher Damage',
  WeaponProjectileSpeedMod: 'Projectile Speed',
  WeaponBeamDistanceMod: 'Beam Length',
  WeaponMultishotMod: 'Multishot',
  WeaponPunchThroughMod: 'Punch Through',
  WeaponZoomFovMod: 'Zoom',
  WeaponExplosionRadiusMod: 'Blast Radius',
  InnateElectricityDamage: 'Electricity',
  InnateFireDamage: 'Heat',
  InnateFreezeDamage: 'Cold',
  InnateToxinDamage: 'Toxin',
  WeaponFireIterationsMod: 'Multishot',
  WeaponArmorPiercingDamageMod: 'Puncture',
  WeaponProcTimeMod: 'Status Duration',
  WeaponPunctureDepthMod: 'Punch Through',
  WeaponFactionDamageCorpus: 'Damage to Corpus',
  WeaponFactionDamageGrineer: 'Damage to Grineer',
  WeaponFactionDamageInfested: 'Damage to Infested',
  WeaponMeleeFactionDamageCorpus: 'Damage to Corpus',
  WeaponMeleeFactionDamageGrineer: 'Damage to Grineer',
  WeaponMeleeFactionDamageInfested: 'Damage to Infested',
  ComboDurationMod: 'Combo Duration',
  SlideAttackCritChanceMod: 'Slide Crit Chance',
  WeaponMeleeComboEfficiencyMod: 'Combo Efficiency',
  WeaponMeleeComboInitialBonusMod: 'Initial Combo',
  WeaponMeleeComboPointsOnHitMod: 'Combo Count',
  WeaponMeleeComboBonusOnHitMod: 'Combo Count',
};

// Build short-code -> Kronos-English-label crosswalk by joining both maps
// on their shared DE tag key.
const codeToLabel = {};
const unmapped = new Set();
for (const [deTag, code] of Object.entries(TAG_MAP)) {
  const label = RIVEN_STAT_MAP[deTag];
  if (label) {
    codeToLabel[code] = label;
  } else {
    unmapped.add(code);
  }
}
// Manual overrides for codes whose DE tag has no RIVEN_STAT_MAP entry at all
// (Kronos has no "WeaponAttackSpeedMod" key - it only derives 'Attack Speed'
// via WeaponSpeedMod/WeaponFireRateMod - but the label itself is identical).
codeToLabel.AS = 'Attack Speed';

if (unmapped.size) {
  console.warn('[extract-riven-good-rolls] short codes with no Kronos label match (left as-is):', [...unmapped].join(', '));
}

// "ANY" is a genuine wildcard in the source data (matches any stat) - passed
// through unchanged for rivenGrader.js to special-case. Some source entries
// have a stray trailing ")" typo (e.g. "CCC)") - stripped before lookup.
const translateCode = (raw) => {
  if (raw === 'ANY') return raw;
  const code = raw.replace(/[^A-Z]/g, '');
  return codeToLabel[code] || raw;
};

const sourcePath = path.join(repoRoot, 'scripts/data-sources/riven_good_rolls.json');
const outPath = path.join(repoRoot, 'src-tauri/data/assets/data/riven_good_rolls.json');

const source = JSON.parse(readFileSync(sourcePath, 'utf-8'));

const translated = { ...source, categories: {} };
for (const [catName, weapons] of Object.entries(source.categories || {})) {
  const outWeapons = {};
  for (const [weaponName, profile] of Object.entries(weapons)) {
    outWeapons[weaponName] = {
      ...profile,
      good_combos: (profile.good_combos || []).map((combo) => ({
        ...combo,
        mandatory: (combo.mandatory || []).map(translateCode),
        pick_from: (combo.pick_from || []).map(translateCode),
      })),
      safe_negatives: (profile.safe_negatives || []).map(translateCode),
    };
  }
  translated.categories[catName] = outWeapons;
}

writeFileSync(outPath, JSON.stringify(translated), 'utf-8');
console.log(`Translated riven_good_rolls.json -> ${outPath}`);
