#!/usr/bin/env python3
"""Generic wikitext-fallback: given a data module + a list of no-data item
names, fetch each item's own article page (by its Link/Name) and run the
fixed classifier (heading OR {{Acquisition|prose}} template). Reusable
across Arcanes/Mods/anything else with the same Name/Link/InternalName/
Description shape."""
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


def run(data_dict, names, out_prefix):
    resolved, ambiguous, still_stuck = {}, {}, {}
    for name in names:
        entry = data_dict.get(name)
        if not isinstance(entry, dict):
            still_stuck[name] = {"reason": "not found in data"}
            continue
        uniqueName = canon(entry.get("InternalName"))
        if not uniqueName:
            still_stuck[name] = {"reason": "no InternalName"}
            continue
        link = entry.get("Link") or name
        content = fetch_raw(link)
        if not content:
            still_stuck[name] = {"reason": f"page '{link}' fetch failed or doesn't exist"}
            continue
        if link != name and name not in content:
            still_stuck[name] = {"reason": f"shared page '{link}' doesn't mention '{name}'"}
            continue
        result = classify(content, page_title=link)
        if result["status"] == "clean":
            resolved[uniqueName] = {
                "uniqueName": uniqueName, "wikiName": name,
                "description": entry.get("Description"),
                "acquisition": result["text"],
                "sourceRefs": [f"article page: {link}"],
                "verifiedDate": "2026-09-09",
            }
        elif result["status"] == "ambiguous":
            ambiguous[name] = {"reason": result["reason"]}
        else:
            still_stuck[name] = {"reason": result["reason"]}

    print(f"[{out_prefix}] Total: {len(names)}  Resolved: {len(resolved)}  Ambiguous: {len(ambiguous)}  Stuck: {len(still_stuck)}")
    json.dump(resolved, open(f"docs/revamp/wiki-audit/{out_prefix}_fallback_resolved.json", "w"), indent=2, ensure_ascii=False)
    json.dump(ambiguous, open(f"docs/revamp/wiki-audit/{out_prefix}_fallback_ambiguous.json", "w"), indent=2, ensure_ascii=False)
    json.dump(still_stuck, open(f"docs/revamp/wiki-audit/{out_prefix}_fallback_stuck.json", "w"), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    arcanes = json.load(open("wiki_module_json/Module_Arcane_data.json"))["Arcanes"]
    arcanes_no_data = json.load(open("docs/revamp/wiki-audit/arcanes_no_data.json"))
    run(arcanes, list(arcanes_no_data.keys()), "arcanes")

    mods = json.load(open("wiki_module_json/Module_Mods_data.json"))["Mods"]
    mods_no_data = json.load(open("docs/revamp/wiki-audit/mods_no_data.json"))
    run(mods, list(mods_no_data.keys()), "mods")
