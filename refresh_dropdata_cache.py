#!/usr/bin/env python3
"""Refresh dropdata_cache.json from WFCD/warframe-drop-data.

Same pattern as refresh_wfcd_cache.py - this is the official, DE-sourced
(not data-mined) drop-location dataset, used by drop_data.py to fill in
real acquisition info for arcanes/mods/weapons/sculptures that
wfcd_all_cache.json's own "drops" field leaves blank."""
import json, os, sys, time, urllib.request
from pathlib import Path

URL = 'https://drops.warframestat.us/data/all.json'
OUT = str(Path(__file__).parent / 'dropdata_cache.json')
MIN_SIZE = 1_000_000   # all.json is ~6.5MB; reject anything < 1MB as suspicious
MAX_AGE_DAYS = 7

def needs_refresh():
    if not os.path.exists(OUT):
        return True, "cache missing"
    age_days = (time.time() - os.path.getmtime(OUT)) / 86400
    if age_days > MAX_AGE_DAYS:
        return True, f"cache is {age_days:.1f} days old"
    return False, f"cache is {age_days:.1f} days old (under {MAX_AGE_DAYS}d threshold)"

def refresh():
    print(f"Fetching {URL}")
    req = urllib.request.Request(URL, headers={'User-Agent': 'wfinfo-ng-cache-refresh/1.0'})
    tmp = OUT + '.new'
    with urllib.request.urlopen(req, timeout=60) as r, open(tmp, 'wb') as f:
        total = 0
        while True:
            chunk = r.read(64*1024)
            if not chunk: break
            f.write(chunk); total += len(chunk)
    print(f"  downloaded {total:,} bytes")
    if total < MIN_SIZE:
        os.remove(tmp); raise SystemExit(f"FAIL: only {total} bytes (need >{MIN_SIZE})")
    try:
        with open(tmp, encoding='utf-8') as f:
            data = json.load(f)
        assert isinstance(data, dict) and 'modLocations' in data, "wrong shape"
    except Exception as e:
        os.remove(tmp); raise SystemExit(f"FAIL: validation failed - {e}")
    if os.path.exists(OUT):
        os.rename(OUT, OUT + '.previous')
    os.rename(tmp, OUT)
    print(f"OK wrote {OUT}")

if __name__ == '__main__':
    force = '--force' in sys.argv
    need, reason = needs_refresh()
    if force or need:
        print(f"Refresh: {reason}{' (forced)' if force else ''}")
        refresh()
    else:
        print(f"Skip: {reason}")
