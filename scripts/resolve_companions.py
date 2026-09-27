#!/usr/bin/env python3
"""Resolve Companions: Sentinels via their own built-in Components/BuildPrice
data (plus a blueprint-source lookup same as other Blueprint categories),
Pets via wikitext fallback (small set, each species has a different capture
location so no safe uniform template)."""
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


comp = json.load(open("wiki_module_json/Module_Companions_data.json"))["Companions"]
drop_index = json.load(open("wiki_module_json/drop_reverse_index_v2.json"))
baro = json.load(open("wiki_module_json/Module_Baro_data.json"))["Items"]

resolved, ambiguous, no_data = {}, {}, {}

for name, entry in comp.items():
    if not isinstance(entry, dict):
        continue
    uniqueName = canon(entry.get("InternalName"))
    if not uniqueName:
        no_data[name] = {"reason": "no InternalName"}
        continue

    if entry.get("Category") == "Sentinels":
        build_price = entry.get("BuildPrice")
        components = entry.get("Components", [])
        parts = []
        if build_price:
            parts.append(f"{build_price:,} Credits")
        comp_str = ", ".join(f"{c.get('ItemCount')}x {c.get('Name')}" for c in components if c.get("Name") != "Blueprint")
        if comp_str:
            parts.append(comp_str)
        bp_key = f"{name} Blueprint"
        bp_hits = drop_index.get(bp_key, [])
        bp_baro = baro.get(bp_key) or baro.get(name)
        acq = f"Built in Foundry for: {', '.join(parts)}." if parts else ""
        if bp_hits:
            srcs = "; ".join(f"{h['sourceName']} ({h['chance']}%)" for h in bp_hits[:4])
            acq += f" Blueprint from: {srcs}."
        elif bp_baro and bp_baro.get("CreditCost") and bp_baro.get("DucatCost"):
            acq += f" Blueprint sold by Baro Ki'Teer for {bp_baro['DucatCost']} Ducats and {bp_baro['CreditCost']:,} Credits."
        if not acq:
            no_data[name] = {"reason": "no Components/BuildPrice and no blueprint source found"}
            continue
        resolved[uniqueName] = {
            "uniqueName": uniqueName, "wikiName": name,
            "description": entry.get("Description"),
            "acquisition": acq.strip(),
            "sourceRefs": [f"Module:Companions/data['{name}'] (Components/BuildPrice)"],
            "verifiedDate": "2026-09-09",
        }
        continue

    # Pets: wikitext fallback via dedicated page.
    link = entry.get("Link")
    if link != name:
        no_data[name] = {"reason": f"no dedicated page (Link={link!r})"}
        continue
    content = fetch_raw(name)
    if not content:
        no_data[name] = {"reason": "article fetch failed"}
        continue
    result = classify(content, page_title=name)
    if result["status"] == "clean":
        resolved[uniqueName] = {
            "uniqueName": uniqueName, "wikiName": name,
            "description": entry.get("Description"),
            "acquisition": result["text"],
            "sourceRefs": [f"article page: {name} (##Acquisition section)"],
            "verifiedDate": "2026-09-09",
        }
    elif result["status"] == "ambiguous":
        ambiguous[name] = {"reason": result["reason"]}
    else:
        no_data[name] = {"reason": result["reason"]}

print(f"Total Companions: {len(comp)}")
print(f"Resolved: {len(resolved)}")
print(f"Ambiguous: {len(ambiguous)}")
print(f"No data: {len(no_data)}")

json.dump(resolved, open("docs/revamp/wiki-audit/companions_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(ambiguous, open("docs/revamp/wiki-audit/companions_ambiguous.json", "w"), indent=2, ensure_ascii=False)
json.dump(no_data, open("docs/revamp/wiki-audit/companions_no_data.json", "w"), indent=2, ensure_ascii=False)
