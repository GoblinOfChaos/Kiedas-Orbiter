#!/usr/bin/env python3
"""
The 46 weapons in weapons_ambiguous.json got a partial resolution (Market
blueprint found, but individual part drop sources weren't) - but never
went through the wikitext-fallback pass, which the no-data weapons did.
Real article pages for these (Latron Wraith, Snipetron Vandal, Dera
Vandal, etc.) have a full prose Acquisition section describing the whole
weapon (blueprint + components) as an Invasion/event reward - fetch and
use that instead of the partial join result when it's cleaner.
"""
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


all_weapons = {}
for cat in ["primary", "secondary", "melee", "archwing", "railjack", "companion", "modular", "misc"]:
    all_weapons.update(json.load(open(f"wiki_module_json/Module_Weapons_data_{cat}.json")))

ambiguous = json.load(open("docs/revamp/wiki-audit/weapons_ambiguous.json"))

resolved, still_ambiguous, no_data = {}, {}, {}

for name, old_record in ambiguous.items():
    entry = all_weapons.get(name, {})
    uniqueName = canon(entry.get("InternalName"))
    link = entry.get("Link")
    if not uniqueName or not link:
        still_ambiguous[name] = old_record
        continue

    page_title = link
    content = fetch_raw(page_title)
    if not content:
        still_ambiguous[name] = old_record
        continue
    if page_title != name and name not in content:
        still_ambiguous[name] = old_record
        continue

    result = classify(content, page_title=page_title)
    if result["status"] == "clean":
        resolved[uniqueName] = {
            "uniqueName": uniqueName, "wikiName": name,
            "description": entry.get("Description"),
            "acquisition": result["text"],
            "sourceRefs": [f"article page: {page_title} (##Acquisition section, supersedes partial join result)"],
            "verifiedDate": "2026-09-09",
        }
    else:
        still_ambiguous[name] = old_record

print(f"Total ambiguous weapons retried: {len(ambiguous)}")
print(f"Resolved via own article page: {len(resolved)}")
print(f"Still ambiguous (kept old partial result): {len(still_ambiguous)}")

json.dump(resolved, open("docs/revamp/wiki-audit/weapons_ambiguous_fallback_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(still_ambiguous, open("docs/revamp/wiki-audit/weapons_ambiguous.json", "w"), indent=2, ensure_ascii=False)
