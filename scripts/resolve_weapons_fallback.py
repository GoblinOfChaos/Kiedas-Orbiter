#!/usr/bin/env python3
"""
Wikitext-fallback resolver for Weapons that came up with no structured
acquisition data (no Blueprint/drop/vendor/Baro match). Same method as
the Cosmetics dedicated-page fallback: fetch the weapon's own article
page (confirmed via Link == Name), extract its own unique ==Acquisition==
section - no matching ambiguity since each page is exclusively about
that one weapon.
"""
import json, subprocess, time, re, sys
from pathlib import Path

sys.path.insert(0, "scripts")
from extract_acquisition_wikitext import classify

WIKITEXT_DIR = Path("wiki_article_wikitext")
WIKITEXT_DIR.mkdir(exist_ok=True)


def safe_filename(title):
    return re.sub(r'[/\\:*?"<>|]', "_", title) + ".wikitext"


def fetch_raw(title):
    path = WIKITEXT_DIR / safe_filename(title)
    if path.exists() and path.stat().st_size > 0:
        return path.read_text()
    cmd = [
        "curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "30",
        "--get", "--data-urlencode", f"title={title}",
        "--data-urlencode", "action=raw",
        "https://wiki.warframe.com/index.php",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    time.sleep(0.35)
    if r.returncode == 0 and r.stdout.strip():
        path.write_text(r.stdout)
        return r.stdout
    return None


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


def main():
    all_weapons = {}
    for cat in ["primary", "secondary", "melee", "archwing", "railjack", "companion", "modular", "misc"]:
        d = json.load(open(f"wiki_module_json/Module_Weapons_data_{cat}.json"))
        all_weapons.update(d)

    no_data = json.load(open("docs/revamp/wiki-audit/weapons_no_data.json"))

    resolved, ambiguous, still_no_data = {}, {}, {}

    for name in no_data:
        entry = all_weapons.get(name)
        if not isinstance(entry, dict):
            still_no_data[name] = {"reason": "not found in Weapons/data at all"}
            continue
        uniqueName = canon(entry.get("InternalName"))
        link = entry.get("Link")
        if not uniqueName or not link:
            still_no_data[name] = {"reason": f"no InternalName or no Link field (Link={link!r})"}
            continue

        page_title = link  # may equal name (own page) or be a shared parent page
        content = fetch_raw(page_title)
        if not content:
            still_no_data[name] = {"reason": f"article page '{page_title}' fetch failed or doesn't exist"}
            continue

        if page_title != name and name not in content:
            still_no_data[name] = {"reason": f"shared page '{page_title}' exists but never mentions '{name}' - not confirmed as the right page"}
            continue

        result = classify(content, page_title=page_title)
        if result["status"] == "clean":
            resolved[uniqueName] = {
                "uniqueName": uniqueName, "wikiName": name,
                "description": entry.get("Description"),
                "acquisition": result["text"],
                "sourceRefs": [f"article page: {page_title} (##Acquisition section)" + (f", confirmed to reference '{name}'" if page_title != name else "")],
                "verifiedDate": "2026-09-09",
            }
        elif result["status"] == "ambiguous":
            ambiguous[name] = {"reason": result["reason"], "candidates": result.get("raw_sections")}
        else:
            still_no_data[name] = {"reason": result["reason"]}

    print(f"Attempted: {len(no_data)}")
    print(f"Resolved via own article page: {len(resolved)}")
    print(f"Ambiguous: {len(ambiguous)}")
    print(f"Still no data: {len(still_no_data)}")

    json.dump(resolved, open("docs/revamp/wiki-audit/weapons_fallback_resolved.json", "w"), indent=2, ensure_ascii=False)
    json.dump(ambiguous, open("docs/revamp/wiki-audit/weapons_fallback_ambiguous.json", "w"), indent=2, ensure_ascii=False)
    json.dump(still_no_data, open("docs/revamp/wiki-audit/weapons_fallback_no_data.json", "w"), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
