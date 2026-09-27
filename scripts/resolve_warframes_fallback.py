#!/usr/bin/env python3
"""Wikitext-fallback for Warframes ambiguous/no_data items, using the fixed
extractor (now also detects {{Acquisition|prose}} template calls, not just
==Acquisition== headings)."""
import json, subprocess, time, re, sys
from pathlib import Path

sys.path.insert(0, "scripts")
from extract_acquisition_wikitext import classify

WIKITEXT_DIR = Path("wiki_article_wikitext")


def safe_filename(title):
    return re.sub(r'[/\\:*?"<>|]', "_", title) + ".wikitext"


def fetch_raw(title):
    path = WIKITEXT_DIR / safe_filename(title)
    if path.exists() and path.stat().st_size > 0:
        return path.read_text()
    cmd = ["curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "30",
           "--get", "--data-urlencode", f"title={title}", "--data-urlencode", "action=raw",
           "https://wiki.warframe.com/index.php"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    time.sleep(0.35)
    if r.returncode == 0 and r.stdout.strip():
        path.write_text(r.stdout)
        return r.stdout
    return None


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


wf_data = json.load(open("wiki_module_json/Module_Warframes_data.json"))
all_items = {}
for category in ["Warframes", "Archwings", "Necramechs", "Operators"]:
    all_items.update(wf_data.get(category, {}))

ambiguous = json.load(open("docs/revamp/wiki-audit/warframes_ambiguous.json"))
no_data = json.load(open("docs/revamp/wiki-audit/warframes_no_data.json"))
targets = list(ambiguous.keys()) + list(no_data.keys())

resolved, still_stuck = {}, {}

for name in targets:
    entry = all_items.get(name)
    if not isinstance(entry, dict):
        still_stuck[name] = {"reason": "not found in Warframes/data"}
        continue
    uniqueName = canon(entry.get("InternalName"))
    if not uniqueName:
        still_stuck[name] = {"reason": "no InternalName"}
        continue

    content = fetch_raw(name)
    if not content:
        still_stuck[name] = {"reason": "article fetch failed or doesn't exist"}
        continue

    result = classify(content, page_title=name)
    if result["status"] == "clean":
        resolved[uniqueName] = {
            "uniqueName": uniqueName, "wikiName": name,
            "description": entry.get("Description"),
            "acquisition": result["text"],
            "sourceRefs": [f"article page: {name} (Acquisition section or {{{{Acquisition}}}} template)"],
            "verifiedDate": "2026-09-09",
        }
    else:
        still_stuck[name] = {"reason": result["reason"]}

print(f"Total retried: {len(targets)}")
print(f"Resolved via own article page: {len(resolved)}")
print(f"Still stuck: {len(still_stuck)}")

json.dump(resolved, open("docs/revamp/wiki-audit/warframes_fallback_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(still_stuck, open("docs/revamp/wiki-audit/warframes_still_stuck.json", "w"), indent=2, ensure_ascii=False)
