#!/usr/bin/env python3
"""
Fully automated fallback for Warframes: fetch "{Name}/Main" (the real
content subpage every Warframe page transcludes via {{WarframePage}}) as
plain, unauthenticated raw wikitext - no scribunto-console/auth needed.
Confirmed via direct fetch that Grendel/Main has a real ==Acquisition==
heading with full prose, byte-for-byte matching what scribunto-console
rendered. Applies to every Warframe, not just the special-mechanic ones.
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


wf_data = json.load(open("wiki_module_json/Module_Warframes_data.json"))
all_items = {}
for category in ["Warframes", "Archwings", "Necramechs", "Operators"]:
    all_items.update(wf_data.get(category, {}))

already_resolved = json.load(open("docs/revamp/wiki-audit/warframes_resolved.json"))
already_names = {v["wikiName"] for v in already_resolved.values()}

targets = [n for n in all_items if n not in already_names]

resolved, ambiguous, still_stuck = {}, {}, {}

for name in targets:
    entry = all_items[name]
    uniqueName = canon(entry.get("InternalName"))
    if not uniqueName:
        still_stuck[name] = {"reason": "no InternalName"}
        continue

    content = fetch_raw(f"{name}/Main")
    if not content:
        still_stuck[name] = {"reason": f"'{name}/Main' fetch failed or doesn't exist"}
        continue

    result = classify(content, page_title=name)
    if result["status"] == "clean":
        resolved[uniqueName] = {
            "uniqueName": uniqueName, "wikiName": name,
            "description": entry.get("Description"),
            "acquisition": result["text"],
            "sourceRefs": [f"article page: {name}/Main (real ##Acquisition== section)"],
            "verifiedDate": "2026-09-09",
        }
    elif result["status"] == "ambiguous":
        ambiguous[name] = {"reason": result["reason"]}
    else:
        still_stuck[name] = {"reason": result["reason"]}

print(f"Targets attempted: {len(targets)}")
print(f"Resolved via /Main page: {len(resolved)}")
print(f"Ambiguous: {len(ambiguous)}")
print(f"Still stuck: {len(still_stuck)}")

json.dump(resolved, open("docs/revamp/wiki-audit/warframes_main_fallback_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(ambiguous, open("docs/revamp/wiki-audit/warframes_main_fallback_ambiguous.json", "w"), indent=2, ensure_ascii=False)
json.dump(still_stuck, open("docs/revamp/wiki-audit/warframes_main_fallback_stuck.json", "w"), indent=2, ensure_ascii=False)

for k in list(resolved)[:2]:
    print(json.dumps(resolved[k], indent=2, ensure_ascii=False)[:500])
