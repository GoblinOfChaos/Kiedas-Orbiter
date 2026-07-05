#!/usr/bin/env python3
"""
riven_grader_watcher.py - watches inventory.json for changes and grades all
rivens automatically against riven_good_rolls.json.

When inventory.json changes (i.e. after a warframe-api-helper refresh), this
script re-reads all rivens, grades each one, and writes a state file that
the riven grader overlay reads and displays automatically.

State file: " + str(DATA_DIR) + "/riven-graded.json
"""

import json
import os
import time
from pathlib import Path
from paths import DATA_DIR

WFINFO_DIR = Path(__file__).parent
INVENTORY_FILE = WFINFO_DIR / "inventory.json"
RIVEN_DATA_FILE = WFINFO_DIR / "riven_good_rolls.json"
WFCD_CACHE = WFINFO_DIR / "wfcd_all_cache.json"
STATE_FILE = DATA_DIR / "riven-graded.json"
PREV_STATE_FILE = DATA_DIR / "riven-graded-prev.json"
LOG_FILE = DATA_DIR / "riven-grader-watcher.log"

POLL_INTERVAL = 2.0  # seconds

# Maps internal DE stat tag names → riven_good_rolls.json codes
TAG_MAP = {
    "WeaponCritDamageMod": "CD",
    "WeaponCritChanceMod": "CC",
    "WeaponDamageMod": "DMG",
    "WeaponFireIterationsMod": "MS",
    "WeaponFireRateMod": "FR",
    "WeaponAttackSpeedMod": "AS",
    "WeaponReloadSpeedMod": "RLS",
    "WeaponMagazineMaxMod": "MAG",
    "WeaponToxinDamageMod": "TOX",
    "WeaponElectricityDamageMod": "ELEC",
    "WeaponHeatDamageMod": "HEAT",
    "WeaponColdDamageMod": "COLD",
    "WeaponStunChanceMod": "SC",
    "WeaponStunDurationMod": "SD",
    "WeaponPunchThroughMod": "PT",
    "WeaponProjectileSpeedMod": "PFS",
    "WeaponRangeMod": "RANGE",
    "WeaponRecoilMod": "REC",
    "WeaponZoomMod": "ZOOM",
    "WeaponAmmoMaxMod": "AMMO",
    "WeaponCritOnSlideMod": "SLIDE",
    "WeaponFinisherDamageMod": "FIN",
    "WeaponCorpusDamageMod": "DTC",
    "WeaponGrineerDamageMod": "DTG",
    "WeaponInfestedDamageMod": "DTI",
    "WeaponInitialComboCopyMod": "IC",
    "WeaponHeavyAttackEfficiencyMod": "EFF",
    "WeaponProcTimeMod": "SD",
    "WeaponSlideCritChanceMod": "SLIDE",
    "WeaponImpactDamageMod": "IMP",
    "WeaponPunctureDamageMod": "PUNC",
    "WeaponSlashDamageMod": "SLASH",
    "DamageNewImpactMod": "IMP",
    "DamageNewPunctureMod": "PUNC",
    "DamageNewSlashMod": "SLASH",
    "WeaponZoomFovMod": "ZOOM",
    "WeaponDamageAmountMod": "DMG",
    "WeaponFactionDamageCorpus": "DTC",
    "WeaponFactionDamageGrineer": "DTG",
    "WeaponFactionDamageInfested": "DTI",
    "WeaponFactionDamageCorrupted": "DMG",
    "WeaponComboCountMod": "IC",
    "WeaponLifestealMod": "DMG",
    "WeaponChargeAmountMod": "MAG",
    # Melee-specific tags
    "WeaponMeleeDamageMod": "DMG",
    "WeaponMeleeRangeIncMod": "RANGE",
    "WeaponMeleeFactionDamageCorpus": "DTC",
    "WeaponMeleeFactionDamageGrineer": "DTG",
    "WeaponMeleeFactionDamageInfested": "DTI",
    "WeaponMeleeComboEfficiencyMod": "EFF",
    "WeaponMeleeComboInitialBonusMod": "IC",
    "WeaponMeleeComboBonusOnHitMod": "IC",
    "ComboDurationMod": "SD",
    "WeaponFreezeDamageMod": "COLD",
    "WeaponFireDamageMod": "HEAT",
    "WeaponPunctureDepthMod": "PUNC",
    "WeaponClipMaxMod": "MAG",
    "WeaponMeleeFactionDamageCorrupted": "DMG",
}

POLARITY_MAP = {
    "AP_ATTACK": "Madurai",
    "AP_DEFENSE": "Vazarin",
    "AP_TACTIC": "Naramon",
    "AP_POWER": "Zenurik",
    "AP_PRECEPT": "Penjaga",
    "AP_UMBRA": "Umbra",
    "AP_UNIVERSAL": "Universal",
    "AP_WARD": "Unairu",
    "AP_ANY": "Aura",
}


def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(f"[{ts}] {msg}\n")


def _load_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return default


def _build_weapon_lookup():
    """Build dict: last path segment (lowercase) -> display name (lowercase)."""
    wfcd = _load_json(WFCD_CACHE, [])
    lookup = {}
    for item in wfcd:
        if not isinstance(item, dict):
            continue
        uname = item.get("uniqueName", "")
        name = item.get("name", "")
        if uname and name:
            lookup[uname.split("/")[-1].lower()] = name.lower()
    return lookup


INT32_MAX = 2_147_483_647


def _roll_perfectness(value: int) -> float:
    """Decode a riven stat Value int into a 0-100% perfectness score.
    0% = minimum roll (0.9x base stat), 100% = maximum roll (1.1x base stat).
    Formula verified against calamity-inc/browse.wf RivenParser source."""
    signed = value if value < 2**31 else value - 2**32
    signed = max(0, min(signed, INT32_MAX))
    return round(signed / INT32_MAX * 100, 1)


def _parse_riven(upgrade, weapon_lookup):
    """Parse one Upgrades entry with UpgradeFingerprint. Returns dict or None."""
    try:
        fp = json.loads(upgrade.get("UpgradeFingerprint", "{}"))
    except Exception:
        return None

    compat = fp.get("compat", "")
    if not compat:
        return None

    weapon_key = compat.split("/")[-1].lower()
    weapon_name = weapon_lookup.get(weapon_key, weapon_key)

    positives = [TAG_MAP.get(b["Tag"], b["Tag"]) for b in fp.get("buffs", [])]
    negatives = [TAG_MAP.get(c["Tag"], c["Tag"]) for c in fp.get("curses", [])]
    rerolls = fp.get("rerolls", 0)
    polarity = POLARITY_MAP.get(fp.get("pol", ""), fp.get("pol", ""))
    item_id = upgrade.get("ItemId", {}).get("$oid", "")

    # Per-stat perfectness (0-100% between min and max roll)
    buff_pcts = [_roll_perfectness(b["Value"]) for b in fp.get("buffs", [])]
    curse_pcts = [_roll_perfectness(c["Value"]) for c in fp.get("curses", [])]
    all_pcts = buff_pcts + curse_pcts
    avg_perfectness = round(sum(all_pcts) / len(all_pcts), 1) if all_pcts else 0.0

    return {
        "id": item_id,
        "weapon": weapon_name,
        "positives": positives,
        "negatives": negatives,
        "rerolls": rerolls,
        "polarity": polarity,
        "buff_pcts": buff_pcts,       # per-stat perfectness for positives
        "curse_pcts": curse_pcts,     # per-stat perfectness for negatives
        "perfectness": avg_perfectness,  # 0-100% average across all stats
    }


def _grade_riven(weapon_name, positives, negatives, riven_data, perfectness=0.0):
    """Grade a riven against riven_good_rolls.json. Returns grade dict."""
    data = None
    for cat in riven_data.get("categories", {}).values():
        if weapon_name in cat:
            data = cat[weapon_name]
            break

    if data is None:
        return {"grade": "unknown", "label": "Not in database", "score": 0}

    good_combos = data.get("good_combos", [])
    safe_negs = set(data.get("safe_negatives", []))
    pos_set = set(positives)

    best_score = -1
    best_combo = None
    for combo in good_combos:
        mandatory = set(combo.get("mandatory", []))
        pick_from = set(combo.get("pick_from", []))
        pick_n = combo.get("pick_n", 0)

        mandatory_hits = len(mandatory & pos_set)
        optional_hits = len(pick_from & pos_set)
        missing_mandatory = len(mandatory - pos_set)

        if missing_mandatory == 0:
            score = mandatory_hits * 10 + min(optional_hits, pick_n) * 10
            if optional_hits >= pick_n:
                score += 5
        else:
            score = mandatory_hits * 5 + optional_hits

        if score > best_score:
            best_score = score
            best_combo = combo

    if best_combo is None:
        return {"grade": "reroll", "label": "❌ REROLL — no target stats", "score": 0}

    mandatory = set(best_combo.get("mandatory", []))
    pick_from = set(best_combo.get("pick_from", []))
    pick_n = best_combo.get("pick_n", 0)
    optional_hits = len(pick_from & pos_set)
    has_all_mandatory = (mandatory <= pos_set)

    # Check for risky negatives
    risky_negs = [n for n in negatives if n not in safe_negs]

    if has_all_mandatory and optional_hits >= pick_n and not risky_negs:
        if perfectness >= 75:
            grade = "great"
            label = "\u2605 GOD ROLL"      # 75%+ perfectness = god roll
        elif perfectness >= 40:
            grade = "great"
            label = "\u2605 GREAT"
        else:
            grade = "great"
            label = "\u2605 GREAT (low rolls)"   # right stats, poor percentages
    elif has_all_mandatory and optional_hits >= max(1, pick_n - 1) and not risky_negs:
        grade = "good"
        label = "\u25b2 GOOD"
    elif has_all_mandatory and not risky_negs:
        grade = "ok"
        label = "\u25a0 OK"
    elif has_all_mandatory and risky_negs:
        grade = "ok"
        label = "\u25a0 OK — risky neg"
    elif len(mandatory & pos_set) > 0:
        grade = "weak"
        label = "\u25bc WEAK"
    else:
        grade = "reroll"
        label = "\u21bb REROLL"

    return {
        "grade": grade,
        "label": label,
        "score": best_score,
        "mandatory": list(mandatory),
        "optional": list(pick_from),
        "pick_n": pick_n,
        "safe_negatives": list(safe_negs),
    }


def process_inventory():
    """Read inventory.json, grade all rivens, return list of graded riven dicts."""
    inv = _load_json(INVENTORY_FILE, {})
    riven_data = _load_json(RIVEN_DATA_FILE, {})
    weapon_lookup = _build_weapon_lookup()
    legend = riven_data.get("legend", {})

    upgrades = inv.get("Upgrades", [])
    rivens_raw = [u for u in upgrades if "Randomized" in u.get("ItemType", "")]

    results = []
    for raw in rivens_raw:
        parsed = _parse_riven(raw, weapon_lookup)
        if not parsed:
            continue
        grade_info = _grade_riven(
            parsed["weapon"], parsed["positives"], parsed["negatives"],
            riven_data, perfectness=parsed.get("perfectness", 0.0)
        )
        # Expand codes to full names for display
        pos_display = [
            f"+{legend.get(c, c)}" for c in parsed["positives"]
        ]
        neg_display = [
            f"-{legend.get(c, c)}" for c in parsed["negatives"]
        ]
        results.append({
            "id": parsed["id"],
            "weapon": parsed["weapon"],
            "positives": parsed["positives"],
            "negatives": parsed["negatives"],
            "pos_display": pos_display,
            "neg_display": neg_display,
            "rerolls": parsed["rerolls"],
            "polarity": parsed["polarity"],
            "grade": grade_info["grade"],
            "label": grade_info["label"],
            "score": grade_info["score"],
            "buff_pcts": parsed.get("buff_pcts", []),
            "curse_pcts": parsed.get("curse_pcts", []),
            "perfectness": parsed.get("perfectness", 0.0),
        })

    # Sort: great first, then by score descending
    grade_order = {"great": 0, "good": 1, "ok": 2, "weak": 3, "reroll": 4, "unknown": 5}
    results.sort(key=lambda r: (grade_order.get(r["grade"], 5), -r.get("score", 0)))
    return results


def write_state(rivens):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Save previous state before overwriting so overlay can show old vs new
    if STATE_FILE.exists():
        try:
            PREV_STATE_FILE.write_text(STATE_FILE.read_text())
        except OSError:
            pass
    STATE_FILE.write_text(json.dumps({
        "ts": int(time.time()),
        "rivens": rivens,
    }, indent=2))


def main():
    log("=== riven grader watcher started ===")
    last_mtime = 0

    while True:
        try:
            mtime = INVENTORY_FILE.stat().st_mtime
        except OSError:
            mtime = 0

        if mtime != last_mtime:
            log(f"inventory.json changed (mtime={mtime:.0f}), re-grading rivens")
            try:
                rivens = process_inventory()
                write_state(rivens)
                log(f"graded {len(rivens)} rivens, wrote state file")
            except Exception as e:
                log(f"ERROR: {e}")
            last_mtime = mtime

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()