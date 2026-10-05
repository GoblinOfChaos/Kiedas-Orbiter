#!/usr/bin/env python3
"""Merge the per-group verified route files into the single file the app bundles.
usage: python3 scripts/merge-verified-routes.py [--check]
Reads src-tauri/data/assets/data/verified-routes.<group>.json (groups: resources, cosmetics, other) and writes
verified-routes.json (sorted keys). With --check it only verifies that the committed file equals the merge."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "src-tauri/data/assets/data"
GROUPS = ["resources", "cosmetics", "other"]
merged = {}
for g in GROUPS:
    data = json.loads((D / f"verified-routes.{g}.json").read_text())
    for key, entry in data.items():
        if key in merged:
            raise SystemExit(f"duplicate key across groups: {key}")
        merged[key] = entry
text = json.dumps(dict(sorted(merged.items())), ensure_ascii=False, indent=1) + "\n"
out = D / "verified-routes.json"
if "--check" in sys.argv:
    if not out.exists() or out.read_text() != text:
        raise SystemExit("verified-routes.json is out of date: run scripts/merge-verified-routes.py")
    print("verified-routes.json is up to date,", len(merged), "entries")
else:
    out.write_text(text)
    print("wrote", out, len(merged), "entries,", sum(len(e["routes"]) for e in merged.values()), "routes")
