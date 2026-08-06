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
from copy import deepcopy
from pathlib import Path
from paths import DATA_DIR, get_inventory_path

WFINFO_DIR = Path(__file__).parent
INVENTORY_FILE = get_inventory_path()
RIVEN_DATA_FILE = WFINFO_DIR / "riven_good_rolls.json"
USER_RIVEN_DATA_FILE = DATA_DIR / "riven_profiles.json"
EXPORT_UPGRADES_FILE = WFINFO_DIR / "ExportUpgrades.json"
RIVEN_NAME_FRAGMENTS_FILE = WFINFO_DIR / "riven_name_fragments.json"
WFCD_CACHE = WFINFO_DIR / "wfcd_all_cache.json"
STATE_FILE = DATA_DIR / "riven-graded.json"
PREV_STATE_FILE = DATA_DIR / "riven-graded-prev.json"
LOG_FILE = DATA_DIR / "riven-grader-watcher.log"

POLL_INTERVAL = 2.0  # seconds


def _resolve_tag_code(tag, is_melee=False):
    """Resolve one DE internal stat tag to a riven_good_rolls.json code,
    correcting for tags DE reuses with a different real meaning on melee
    weapons.

    Confirmed live 2026-08-06: a Dual Keres (melee) new-offer card visibly
    read "+47.8% Attack Speed", but the generated-name decode uniquely
    resolved to Fire Rate instead - which is not even a possible melee
    Riven stat. Checked the real melee upgrade-pool export data directly:
    it contains a `WeaponFireRateMod`-tagged entry and NO
    `WeaponAttackSpeedMod` entry at all - DE's own internal fingerprint tag
    for melee Attack Speed is the same `WeaponFireRateMod` string used for
    ranged Fire Rate, just with a different real-world meaning depending on
    weapon category. Same class of bug as the already-fixed
    WeaponPunctureDamageMod/Punch Through mismap below. TAG_MAP alone
    can't express this since it has no weapon-category context - callers
    must pass whether the weapon is melee.
    """
    if tag == "WeaponFireRateMod" and is_melee:
        return "AS"
    return TAG_MAP.get(tag)


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
    "SlideAttackCritChanceMod": "SLIDE",
    "WeaponFinisherDamageMod": "FIN",
    "WeaponMeleeFinisherDamageMod": "FIN",
    "WeaponCorpusDamageMod": "DTC",
    "WeaponGrineerDamageMod": "DTG",
    "WeaponInfestedDamageMod": "DTI",
    "WeaponInitialComboCopyMod": "IC",
    "WeaponHeavyAttackEfficiencyMod": "EFF",
    "WeaponProcTimeMod": "SD",
    "WeaponSlideCritChanceMod": "SLIDE",
    "WeaponImpactDamageMod": "IMP",
    "WeaponPunctureDamageMod": "PUNC",
    # Despite the name, this is DE's real internal tag for Puncture damage
    # in every actual RandomModRare pool (Rifle/Pistol/Shotgun/Archgun/
    # Melee) - confirmed 2026-08-06 directly against ExportUpgrades.json:
    # its own prefixTag/suffixTag are PuncturePrefix/PunctureSuffix and its
    # upgradeValues locTag is /Lotus/Language/Upgrades/WeaponPunctureDamage.
    # "WeaponPunctureDamageMod" above never actually occurs in any pool's
    # entries - same pattern as the documented Punch Through/Puncture
    # tag-name confusion elsewhere in this file. Without this, any real
    # Puncture-damage Riven fails both the generated-name decode and
    # owned-Riven inventory parsing.
    "WeaponArmorPiercingDamageMod": "PUNC",
    "WeaponSlashDamageMod": "SLASH",
    "DamageNewImpactMod": "IMP",
    "DamageNewPunctureMod": "PUNC",
    "DamageNewSlashMod": "SLASH",
    "WeaponZoomFovMod": "ZOOM",
    "WeaponDamageAmountMod": "DMG",
    "WeaponFactionDamageCorpus": "DTC",
    "WeaponFactionDamageGrineer": "DTG",
    "WeaponFactionDamageInfested": "DTI",
    # Melee-specific tags
    "WeaponMeleeDamageMod": "DMG",
    "WeaponMeleeRangeIncMod": "RANGE",
    "WeaponMeleeFactionDamageCorpus": "DTC",
    "WeaponMeleeFactionDamageGrineer": "DTG",
    "WeaponMeleeFactionDamageInfested": "DTI",
    "WeaponMeleeComboEfficiencyMod": "EFF",
    "WeaponMeleeComboInitialBonusMod": "IC",
    # Confirmed 2026-08-06 directly against ExportUpgrades.json: this tag's
    # own prefixTag/suffixTag/locTag (MeleeComboGainBonusPrefix/Suffix,
    # /Lotus/Language/Upgrades/MeleeComboGainExtraChance) are the exact
    # same real stat as CCC (Additional Combo Count Chance) - the stat
    # whose OCR vocabulary gap caused a live "stuck reading riven stats
    # forever" bug fixed earlier the same night. Without this mapping, a
    # real owned CCC Riven fails to parse from inventory data even though
    # OCR/name-decode can now read it live.
    "WeaponMeleeComboBonusOnHitMod": "CCC",
    "WeaponFreezeDamageMod": "COLD",
    "WeaponFireDamageMod": "HEAT",
    # Tag name says "Puncture" but this is DE's actual internal tag for
    # Punch Through - confirmed by its own localization keys
    # (PunchThroughPrefix/PunchThroughSuffix), consistently across every
    # weapon pool (Archgun/Pistol/Rifle/Shotgun/Modular Pistol). It's also
    # the ONLY Punch-Through-or-Puncture-related tag that appears
    # anywhere in the exported upgrade data at all - the other three
    # (WeaponPunctureDamageMod, DamageNewPunctureMod, WeaponPunchThroughMod)
    # never actually occur in any pool, so this single mismapped entry was
    # silently misclassifying every real Punch Through riven as Puncture,
    # causing the name-decode consensus check to reject a correct roll as
    # "mismatched" forever (visible OCR said Punch Through, decoded name
    # said Puncture - never matched, stuck on "Reading Riven stats...").
    # Jacob 2026-07-27 ("stuck on reading riven stats"), confirmed live by
    # directly reproducing the decode with the actual export data.
    "WeaponPunctureDepthMod": "PT",
    "WeaponClipMaxMod": "MAG",
    "WeaponRecoilReductionMod": "REC",
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


def load_riven_data(user_path=USER_RIVEN_DATA_FILE):
    """Load bundled profiles plus optional authoritative per-user overrides.

    The override file uses the same ``categories -> category -> weapon`` shape.
    Only supplied weapon entries replace bundled entries; malformed files are
    ignored as a whole, preserving the last usable bundled guidance.
    """
    bundled = _load_json(RIVEN_DATA_FILE, {})
    overrides = _load_json(user_path, None)
    if not isinstance(overrides, dict) or not isinstance(overrides.get("categories"), dict):
        return bundled

    user_metadata = overrides.get("profile_metadata", {})
    if not isinstance(user_metadata, dict):
        return bundled
    user_metadata = {
        "schema_version": user_metadata.get("schema_version", 1),
        "status": "player_authoritative",
        "source": user_metadata.get("source", "Player-authored local profile"),
        "reviewed_at": user_metadata.get("reviewed_at"),
    }

    merged = deepcopy(bundled)
    merged_categories = merged.setdefault("categories", {})
    for category, weapons in overrides["categories"].items():
        if not isinstance(category, str) or not isinstance(weapons, dict):
            continue
        destination = merged_categories.setdefault(category, {})
        for weapon, profile in weapons.items():
            if not isinstance(weapon, str) or not isinstance(profile, dict):
                continue
            if not isinstance(profile.get("good_combos"), list):
                continue
            profile = deepcopy(profile)
            profile["profile_metadata"] = deepcopy(user_metadata)
            destination[weapon.lower()] = profile
    return merged


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


def _weapon_variant_facts(weapon_name, wfcd_items):
    """Return current WFCD facts for variants compatible by family name.

    Riven fingerprints identify a compatibility family, not the player's
    intended variant. Prefix variants (Kuva/Tenet/etc.) and suffix variants
    (Prime/Vandal/etc.) are therefore reported as candidates, never selected
    automatically.
    """
    base = " ".join(str(weapon_name).lower().split())
    if not base:
        return []

    facts = []
    for item in wfcd_items:
        if not isinstance(item, dict):
            continue
        name = " ".join(str(item.get("name", "")).lower().split())
        compatible = (
            name == base or name.startswith(base + " ") or name.endswith(" " + base)
            or name.endswith("-" + base)
        )
        attenuation = item.get("omegaAttenuation")
        if not compatible or not isinstance(attenuation, (int, float)):
            continue
        facts.append({
            "name": item.get("name", weapon_name),
            "omega_attenuation": round(float(attenuation), 4),
            "disposition": item.get("disposition"),
            "category": item.get("category"),
            "type": item.get("type"),
            "critical_chance": item.get("criticalChance"),
            "critical_multiplier": item.get("criticalMultiplier"),
            "status_chance": item.get("procChance"),
        })
    return sorted(facts, key=lambda fact: (fact["name"].lower() != base, fact["name"]))


def _match_weapon_variant(ocr_text, variants):
    """Match FITS IN OCR to one candidate, preferring the longest name."""
    haystack = "".join(ch.lower() for ch in str(ocr_text) if ch.isalnum())
    matches = []
    for variant in variants:
        key = "".join(ch.lower() for ch in str(variant.get("name", "")) if ch.isalnum())
        if key and key in haystack:
            matches.append((len(key), variant))
    return max(matches, key=lambda pair: pair[0])[1] if matches else None


def _riven_mod_path_for_variant(variant):
    """Choose DE's randomized-mod definition for a WFCD weapon variant."""
    variant = variant or {}
    weapon_type = str(variant.get("type", "")).lower()
    category = str(variant.get("category", "")).lower()
    base = "/Lotus/Upgrades/Mods/Randomized/"
    if "archgun" in weapon_type or "arch-gun" in weapon_type:
        return base + "LotusArchgunRandomModRare"
    if "shotgun" in weapon_type:
        return base + "LotusShotgunRandomModRare"
    if category == "melee" or "melee" in weapon_type:
        return base + "PlayerMeleeWeaponRandomModRare"
    if category == "secondary" or "pistol" in weapon_type:
        return base + "LotusPistolRandomModRare"
    return base + "LotusRifleRandomModRare"


def _decode_riven_generated_name(
    generated_name, export_upgrades, mod_path=None, fragments=None,
):
    """Decode positive stat codes from DE's generated Riven name grammar.

    Two positives form ``prefix+suffix``; three form
    ``prefix-prefix+suffix``. Ambiguous decodes return an empty list.
    """
    name = "".join(ch.lower() for ch in str(generated_name) if ch.isalnum())
    if not name or not isinstance(export_upgrades, dict):
        return []

    definitions = export_upgrades
    if mod_path:
        definitions = {mod_path: export_upgrades.get(mod_path, {})}
    else:
        definitions = {
            path: definition for path, definition in export_upgrades.items()
            if "RandomModRare" in path
        }

    fragments = fragments or {}
    candidates = set()
    for path, definition in definitions.items():
        is_melee = "melee" in path.lower()
        entries = []
        for entry in definition.get("upgradeEntries", []):
            code = _resolve_tag_code(entry.get("tag"), is_melee)
            prefix_tag = str(entry.get("prefixTag", ""))
            suffix_tag = str(entry.get("suffixTag", ""))
            prefix = str(fragments.get(prefix_tag, prefix_tag)).lower()
            suffix = str(fragments.get(suffix_tag, suffix_tag)).lower()
            if code and prefix and suffix:
                entries.append((code, prefix, suffix))

        for first in entries:
            for second in entries:
                if first[0] == second[0]:
                    continue
                if first[1] + second[2] == name:
                    candidates.add(tuple(sorted((first[0], second[0]))))
                for third in entries:
                    if len({first[0], second[0], third[0]}) < 3:
                        continue
                    if first[1] + second[1] + third[2] == name:
                        candidates.add(tuple(sorted((first[0], second[0], third[0]))))

    return list(next(iter(candidates))) if len(candidates) == 1 else []


RIVEN_INT_MAX = 0x3FFFFFFF
GOD_ROLL_THRESHOLD = 97.5


def _valid_riven_stat_shape(positives, negatives):
    """Whether OCR produced a physically possible unveiled Riven stat set."""
    return (
        len(positives) in (2, 3)
        and len(negatives) in (0, 1)
        and not (set(positives) & set(negatives))
    )


def _roll_perfectness(value: int) -> float:
    """Decode a riven stat Value int into a 0-100% perfectness score.
    0% = minimum roll (0.9x base stat), 100% = maximum roll (1.1x base stat).
    Formula verified against calamity-inc/browse.wf RivenParser source."""
    # browse.wf RivenParser.rivenIntToFloat(): values outside the encoded
    # 0..0x3FFFFFFF interval are malformed and resolve to the minimum.
    if not isinstance(value, int) or not 0 <= value <= RIVEN_INT_MAX:
        return 0.0
    return round(value / RIVEN_INT_MAX * 100, 1)


def _curse_perfectness(value: int) -> float:
    """Decode curse quality; browse.wf grades curses at ``1 - position``."""
    if not isinstance(value, int) or not 0 <= value <= RIVEN_INT_MAX:
        return 0.0
    return round(100.0 - _roll_perfectness(value), 1)


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
    is_melee = "melee" in compat.lower()

    positives = [_resolve_tag_code(b["Tag"], is_melee) or b["Tag"] for b in fp.get("buffs", [])]
    negatives = [_resolve_tag_code(c["Tag"], is_melee) or c["Tag"] for c in fp.get("curses", [])]
    rerolls = fp.get("rerolls", 0)
    polarity = POLARITY_MAP.get(fp.get("pol", ""), fp.get("pol", ""))
    item_id = upgrade.get("ItemId", {}).get("$oid", "")

    # Per-stat perfectness (0-100% between min and max roll)
    buff_pcts = [_roll_perfectness(b["Value"]) for b in fp.get("buffs", [])]
    curse_pcts = [_curse_perfectness(c["Value"]) for c in fp.get("curses", [])]
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
    """Compare a riven with a sourced profile. Returns an explainable result."""
    metadata = riven_data.get("profile_metadata", {})
    guidance_status = metadata.get("status", "unversioned")
    profile_source = metadata.get("source", "Unknown profile source")
    reviewed_at = metadata.get("reviewed_at")

    def result(grade, label, score, **details):
        if guidance_status == "historical_seed" and grade != "review":
            label = f"ADVISORY · {label}"
        return {
            "grade": grade,
            "label": label,
            "score": score,
            "guidance_status": guidance_status,
            "profile_source": profile_source,
            "reviewed_at": reviewed_at,
            **details,
        }

    data = None
    for cat in riven_data.get("categories", {}).values():
        if weapon_name in cat:
            data = cat[weapon_name]
            break

    if data is None:
        return result(
            "review", "REVIEW — no weapon profile", 0,
            explanation="No profile exists for this weapon; no desirability verdict was made.",
        )

    metadata = data.get("profile_metadata", metadata)
    guidance_status = metadata.get("status", "unversioned")
    profile_source = metadata.get("source", "Unknown profile source")
    reviewed_at = metadata.get("reviewed_at")

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
        return result(
            "review", "REVIEW — profile has no target stats", 0,
            explanation="The weapon profile contains no usable target-stat combinations.",
        )

    mandatory = set(best_combo.get("mandatory", []))
    pick_from = set(best_combo.get("pick_from", []))
    pick_n = best_combo.get("pick_n", 0)
    optional_hits = len(pick_from & pos_set)
    has_all_mandatory = (mandatory <= pos_set)

    # Check for risky negatives
    risky_negs = [n for n in negatives if n not in safe_negs]

    if has_all_mandatory and optional_hits >= pick_n and not risky_negs:
        if perfectness >= GOD_ROLL_THRESHOLD:
            grade = "great"
            # 97.5% is browse.wf's S-grade boundary. "God roll" remains our
            # display wording, now tied to that documented top grade instead
            # of the previous unsupported 75% cutoff.
            label = "\u2605 GOD ROLL (S)"
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

    return result(
        grade, label, best_score,
        mandatory=sorted(mandatory),
        optional=sorted(pick_from),
        pick_n=pick_n,
        safe_negatives=sorted(safe_negs),
        risky_negatives=sorted(risky_negs),
        explanation=(
            f"Matched {len(mandatory & pos_set)}/{len(mandatory)} required stats and "
            f"{optional_hits}/{pick_n} optional choices; "
            f"{len(risky_negs)} negative stat(s) are outside the profile's safe list."
        ),
    )


def process_inventory():
    """Read inventory.json, grade all rivens, return list of graded riven dicts."""
    inv = _load_json(INVENTORY_FILE, {})
    riven_data = load_riven_data()
    weapon_lookup = _build_weapon_lookup()
    wfcd_items = _load_json(WFCD_CACHE, [])
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
            "guidance_status": grade_info.get("guidance_status", "unversioned"),
            "profile_source": grade_info.get("profile_source", "Unknown profile source"),
            "reviewed_at": grade_info.get("reviewed_at"),
            "explanation": grade_info.get("explanation", ""),
            "mandatory": grade_info.get("mandatory", []),
            "optional": grade_info.get("optional", []),
            "pick_n": grade_info.get("pick_n", 0),
            "safe_negatives": grade_info.get("safe_negatives", []),
            "risky_negatives": grade_info.get("risky_negatives", []),
            "buff_pcts": parsed.get("buff_pcts", []),
            "curse_pcts": parsed.get("curse_pcts", []),
            "perfectness": parsed.get("perfectness", 0.0),
            "weapon_variants": _weapon_variant_facts(parsed["weapon"], wfcd_items),
        })

    # Sort: great first, then by score descending
    grade_order = {
        "great": 0, "good": 1, "ok": 2, "weak": 3, "reroll": 4,
        "review": 5, "unknown": 5,
    }
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
    # Starting from 0 meant the very first check after every restart always
    # saw inventory.json's real mtime as "different", re-graded, and wrote a
    # fresh timestamp - popping the overlay on every single app launch even
    # when inventory.json hadn't actually changed in over a day. Starting
    # from whatever the file's real mtime already is means only a genuine
    # change *after* this watcher starts triggers a re-grade.
    try:
        last_mtime = INVENTORY_FILE.stat().st_mtime
    except OSError:
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
