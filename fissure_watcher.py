#!/usr/bin/env python3
"""
fissure_watcher.py - polls api.warframestat.us for active Void Fissures and
writes a trimmed state file that fissure_overlay.py reads. Independent of
whether the main GUI app or its Dashboard tab is open, matching the other
autostart watchers (relic_recommend_watcher.py, riven_grader_watcher.py).
"""
import json
import time
import traceback
import urllib.error
import urllib.request
from pathlib import Path

from paths import DATA_DIR

API_URL = "https://api.warframestat.us/pc?language=en"
STATE_FILE = DATA_DIR / "fissure-overlay.json"
LOG_FILE = DATA_DIR / "fissure-watcher.log"

POLL_INTERVAL = 60  # seconds - matches DASHBOARD_TAB.py's own refresh interval


def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(f"[{ts}] {msg}\n")


def _fetch_fissures():
    req = urllib.request.Request(API_URL, headers={"User-Agent": "kiedas-orbiter/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.loads(r.read())
    fissures = data.get("fissures", [])
    # Trim to just the fields the overlay actually displays - same fields
    # DASHBOARD_TAB.py's _build_fissures() already relies on.
    return [
        {
            "tier": f.get("tier", "?"),
            "missionType": f.get("missionType", ""),
            "node": f.get("node", ""),
            "expiry": f.get("expiry"),
            "isHard": f.get("isHard", False),
            "isStorm": f.get("isStorm", False),
        }
        for f in fissures
    ]


def _write_state(fissures):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps({
        "timestamp": int(time.time()),
        "fissures": fissures,
    }))


def main():
    log("=== fissure watcher started ===")
    while True:
        try:
            fissures = _fetch_fissures()
            _write_state(fissures)
            log(f"updated: {len(fissures)} active fissures")
        except Exception as e:
            # Broad on purpose - a network hiccup or malformed API response
            # should not kill this loop forever with no trace of why.
            log(f"fetch error: {e}\n{traceback.format_exc()}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
