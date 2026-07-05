#!/usr/bin/env python3
"""
update_manager.py — Three-tier update system for Kieda's Orbiter.

Tier 1 — Quick Update (~10s):
    Refresh prices + filtered_items from warframestat.us API.
    Falls back to local WFCD synthesis if API is down.

Tier 2 — Game Patch Update (~2-3min):
    Everything in Tier 1, plus:
    - WFCD All.json from GitHub (checks ETag, skips if unchanged)
    - ExportUpgrades.json + ExportModSet.json from calamity-inc/warframe-public-export-plus
    - WFCD warframe-drop-data mod locations (checks hash, skips if unchanged)
    - Rebuild equipment_data_cache, relic_name_mapping, item images

Tier 3 — Live Market Prices (~5min):
    Fetch real platinum prices from warframe.market (rate-limited).
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable

WFINFO_DIR = Path(__file__).parent
HOME = Path.home()

# ── Data file paths ───────────────────────────────────────────────────────
PRICES_FILE          = WFINFO_DIR / "prices.json"
FILTERED_FILE        = WFINFO_DIR / "filtered_items.json"
WFCD_CACHE           = WFINFO_DIR / "wfcd_all_cache.json"
EXPORT_UPGRADES      = WFINFO_DIR / "ExportUpgrades.json"
EXPORT_MOD_SET       = WFINFO_DIR / "ExportModSet.json"
DROP_DATA_CACHE      = WFINFO_DIR / "wfcd_drop_data_cache.json"
DROP_DATA_INFO       = WFINFO_DIR / "wfcd_drop_data_info.json"
RIVEN_DATA           = WFINFO_DIR / "riven_good_rolls.json"
VENV_PYTHON          = WFINFO_DIR / ".venv/bin/python"

# ── Remote URLs ───────────────────────────────────────────────────────────
WARFRAMESTAT_PRICES   = "https://api.warframestat.us/wfinfo/prices"
WARFRAMESTAT_FILTERED = "https://api.warframestat.us/wfinfo/filtered_items"
WFCD_ALL_URL          = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/All.json"
CALAMITY_UPGRADES_URL = "https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/senpai/ExportUpgrades.json"
CALAMITY_MODSET_URL   = "https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/senpai/ExportModSet.json"
DROP_DATA_INFO_URL    = "http://drops.warframestat.us/data/info.json"
DROP_DATA_MODS_URL    = "http://drops.warframestat.us/data/modLocations.json"

TIMEOUT = 30


# ── Helpers ───────────────────────────────────────────────────────────────

def _log(msg: str, cb: Callable | None):
    if cb:
        cb(msg)
    else:
        print(msg)


def _fetch(url: str, timeout: int = TIMEOUT) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "kiedas-orbiter/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _fetch_json(url: str, timeout: int = TIMEOUT) -> dict | list:
    return json.loads(_fetch(url, timeout))


def _safe_write(path: Path, data: bytes | str, min_size: int = 100) -> bool:
    """Write to a temp file then atomically replace. Returns True on success."""
    if isinstance(data, str):
        data = data.encode()
    if len(data) < min_size:
        return False
    tmp = Path(str(path) + ".new")
    try:
        tmp.write_bytes(data)
        # Validate JSON
        json.loads(data)
        # Backup old
        if path.exists():
            path.replace(Path(str(path) + ".previous"))
        tmp.replace(path)
        return True
    except Exception:
        tmp.unlink(missing_ok=True)
        return False


def _run_script(script_name: str, args: list[str] | None = None) -> tuple[bool, str]:
    """Run a Python script in the venv. Returns (success, output)."""
    cmd = [str(VENV_PYTHON), str(WFINFO_DIR / script_name)] + (args or [])
    try:
        result = subprocess.run(
            cmd, cwd=str(WFINFO_DIR),
            capture_output=True, text=True, timeout=300
        )
        output = result.stdout + result.stderr
        return result.returncode == 0, output
    except subprocess.TimeoutExpired:
        return False, "Timed out after 5 minutes"
    except Exception as e:
        return False, str(e)


# ── Tier 1: Quick Update ──────────────────────────────────────────────────

def quick_update(log: Callable | None = None) -> dict:
    """Refresh prices + filtered_items. ~10 seconds."""
    results = {}

    # prices.json
    _log("Fetching prices from warframestat.us...", log)
    try:
        data = _fetch(WARFRAMESTAT_PRICES)
        if _safe_write(PRICES_FILE, data, min_size=10_000):
            _log("  ✓ prices.json updated", log)
            results["prices"] = "updated"
        else:
            _log("  ✗ prices.json: response too small or invalid JSON", log)
            results["prices"] = "failed"
    except Exception as e:
        _log(f"  ✗ prices.json failed ({e}) — trying local synthesis...", log)
        ok, out = _run_script("synthesize_wfinfo_data.py")
        _log(f"    synthesis: {'ok' if ok else 'failed'}", log)
        results["prices"] = "synthesized" if ok else "failed"

    # filtered_items.json
    _log("Fetching item data from warframestat.us...", log)
    try:
        data = _fetch(WARFRAMESTAT_FILTERED)
        if _safe_write(FILTERED_FILE, data, min_size=50_000):
            _log("  ✓ filtered_items.json updated", log)
            results["filtered_items"] = "updated"
        else:
            _log("  ✗ filtered_items.json: too small", log)
            results["filtered_items"] = "failed"
    except Exception as e:
        _log(f"  ✗ filtered_items.json failed ({e}) — synthesizing...", log)
        ok, out = _run_script("synthesize_wfinfo_data.py")
        _log(f"    synthesis: {'ok' if ok else 'failed'}", log)
        results["filtered_items"] = "synthesized" if ok else "failed"

    return results


# ── Tier 2: Game Patch Update ─────────────────────────────────────────────

def game_patch_update(log: Callable | None = None) -> dict:
    """Full data refresh for after a DE patch. ~2-3 minutes."""
    results = {}

    # Step 1: WFCD All.json (largest download — check if it changed first)
    _log("Checking WFCD warframe-items cache...", log)
    try:
        # Quick HEAD request to check Last-Modified / size before downloading 40MB
        req = urllib.request.Request(
            WFCD_ALL_URL, method="HEAD",
            headers={"User-Agent": "kiedas-orbiter/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            remote_size = int(r.headers.get("Content-Length", 0))
        local_size = WFCD_CACHE.stat().st_size if WFCD_CACHE.exists() else 0
        if remote_size > 0 and abs(remote_size - local_size) < 10_000:
            _log(f"  ✓ WFCD cache is current ({local_size:,} bytes) — skipping download", log)
            results["wfcd_cache"] = "current"
        else:
            _log(f"  Downloading WFCD All.json (~{remote_size//1024//1024}MB)...", log)
            ok, out = _run_script("refresh_wfcd_cache.py", ["--force"])
            _log(f"  {'✓' if ok else '✗'} WFCD cache: {'updated' if ok else 'failed'}", log)
            if not ok:
                _log(f"    {out[:200]}", log)
            results["wfcd_cache"] = "updated" if ok else "failed"
    except Exception as e:
        _log(f"  ✗ WFCD cache check failed: {e}", log)
        results["wfcd_cache"] = "failed"

    # Step 2: ExportUpgrades.json from calamity-inc (auto-updated, cleaned)
    _log("Fetching ExportUpgrades.json from calamity-inc...", log)
    try:
        data = _fetch(CALAMITY_UPGRADES_URL, timeout=60)
        if _safe_write(EXPORT_UPGRADES, data, min_size=100_000):
            count = len(json.loads(data))
            _log(f"  ✓ ExportUpgrades.json updated ({count:,} entries)", log)
            results["export_upgrades"] = "updated"
        else:
            _log("  ✗ ExportUpgrades.json: too small or invalid", log)
            results["export_upgrades"] = "failed"
    except Exception as e:
        _log(f"  ✗ ExportUpgrades.json failed: {e}", log)
        results["export_upgrades"] = "failed"

    # Step 3: ExportModSet.json from calamity-inc
    _log("Fetching ExportModSet.json from calamity-inc...", log)
    try:
        data = _fetch(CALAMITY_MODSET_URL, timeout=30)
        if _safe_write(EXPORT_MOD_SET, data, min_size=1_000):
            _log("  ✓ ExportModSet.json updated", log)
            results["export_modset"] = "updated"
        else:
            _log("  ✗ ExportModSet.json: too small", log)
            results["export_modset"] = "failed"
    except Exception as e:
        _log(f"  ✗ ExportModSet.json failed: {e}", log)
        results["export_modset"] = "failed"

    # Step 4: WFCD drop data — check hash first
    _log("Checking WFCD drop data (mod locations)...", log)
    try:
        info = _fetch_json(DROP_DATA_INFO_URL, timeout=10)
        remote_hash = info.get("hash", "")
        local_info = {}
        if DROP_DATA_INFO.exists():
            local_info = json.loads(DROP_DATA_INFO.read_text())
        if remote_hash and remote_hash == local_info.get("hash"):
            _log(f"  ✓ Drop data is current (hash {remote_hash[:8]}...) — skipping", log)
            results["drop_data"] = "current"
        else:
            _log(f"  Downloading mod drop locations...", log)
            data = _fetch(DROP_DATA_MODS_URL, timeout=60)
            if _safe_write(DROP_DATA_CACHE, data, min_size=10_000):
                DROP_DATA_INFO.write_text(json.dumps(info, indent=2))
                _log(f"  ✓ Drop data updated (hash {remote_hash[:8]}...)", log)
                results["drop_data"] = "updated"
            else:
                _log("  ✗ Drop data: too small or invalid", log)
                results["drop_data"] = "failed"
    except Exception as e:
        _log(f"  ✗ Drop data failed: {e}", log)
        results["drop_data"] = "failed"

    # Step 5: Quick update (prices + filtered_items)
    _log("Running quick data update...", log)
    quick_results = quick_update(log)
    results.update(quick_results)

    # Step 6: Rebuild derived data
    _log("Rebuilding equipment data...", log)
    ok, out = _run_script("populate_equipment.py")
    _log(f"  {'✓' if ok else '✗'} equipment_data_cache.json", log)
    results["equipment"] = "ok" if ok else "failed"

    _log("Rebuilding relic name mapping...", log)
    ok, out = _run_script("populate_relics.py")
    _log(f"  {'✓' if ok else '✗'} relic_name_mapping.json", log)
    results["relics"] = "ok" if ok else "failed"

    _log("Downloading new item images...", log)
    ok, out = _run_script("populate_images.py")
    _log(f"  {'✓' if ok else '✗'} item images", log)
    results["images"] = "ok" if ok else "failed"

    return results


# ── Tier 3: Live Market Prices ────────────────────────────────────────────

def live_prices_update(log: Callable | None = None) -> dict:
    """Fetch real platinum prices from warframe.market. ~5 minutes."""
    _log("Fetching live prices from warframe.market (rate-limited, ~5 min)...", log)
    ok, out = _run_script("enrich_prices_from_market.py")
    for line in out.strip().splitlines()[-10:]:
        _log(f"  {line}", log)
    _log(f"{'  ✓ Done' if ok else '  ✗ Failed'}", log)
    return {"market_prices": "ok" if ok else "failed"}


# ── Data source status ────────────────────────────────────────────────────

def get_data_status() -> list[dict]:
    """Return a list of data source status dicts for display in the UI."""
    now = time.time()

    def age(path: Path) -> str:
        if not path.exists():
            return "missing"
        secs = now - path.stat().st_mtime
        if secs < 3600:
            return f"{int(secs/60)}m ago"
        if secs < 86400:
            return f"{int(secs/3600)}h ago"
        return f"{int(secs/86400)}d ago"

    def ok(path: Path, max_days: float) -> bool:
        if not path.exists():
            return False
        return (now - path.stat().st_mtime) < max_days * 86400

    return [
        {"name": "prices.json",          "path": PRICES_FILE,     "age": age(PRICES_FILE),     "ok": ok(PRICES_FILE, 1),     "tier": 1, "desc": "Platinum prices"},
        {"name": "filtered_items.json",   "path": FILTERED_FILE,   "age": age(FILTERED_FILE),   "ok": ok(FILTERED_FILE, 7),   "tier": 1, "desc": "Item & relic data"},
        {"name": "wfcd_all_cache.json",   "path": WFCD_CACHE,      "age": age(WFCD_CACHE),      "ok": ok(WFCD_CACHE, 14),     "tier": 2, "desc": "WFCD item database (~40MB)"},
        {"name": "ExportUpgrades.json",   "path": EXPORT_UPGRADES, "age": age(EXPORT_UPGRADES), "ok": ok(EXPORT_UPGRADES, 7), "tier": 2, "desc": "DE mod data (calamity-inc)"},
        {"name": "ExportModSet.json",     "path": EXPORT_MOD_SET,  "age": age(EXPORT_MOD_SET),  "ok": ok(EXPORT_MOD_SET, 14), "tier": 2, "desc": "DE mod set data"},
        {"name": "Drop data (mods)",      "path": DROP_DATA_CACHE, "age": age(DROP_DATA_CACHE), "ok": ok(DROP_DATA_CACHE, 7), "tier": 2, "desc": "WFCD mod drop locations"},
        {"name": "Market prices cache",   "path": WFINFO_DIR / "wm_prices_cache.json",
         "age": age(WFINFO_DIR / "wm_prices_cache.json"),
         "ok": ok(WFINFO_DIR / "wm_prices_cache.json", 1), "tier": 3, "desc": "warframe.market live prices"},
    ]
