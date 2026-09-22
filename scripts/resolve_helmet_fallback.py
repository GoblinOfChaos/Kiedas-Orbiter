#!/usr/bin/env python3
"""
Fallback resolution for Cosmetics/Helmet entries whose own dedicated page
doesn't exist (the "Link == Name but no such article" problem found when
432 Helmet fetches came back empty). Confirmed pattern via manual check:
Deluxe cosmetic sets bundle Skin+Helmet+Armor onto ONE page named after
the Skin, e.g. "Voruna Demionna Skin" covers the Helmet and Armor pieces
too - the wiki's own Link field for the Helmet entry is stale/wrong.

Method (verification, not guessing): for each failed Helmet, derive the
candidate Skin-page title by replacing the trailing "Helmet" with "Skin",
fetch that page, and only accept it as a real match if the Helmet's own
exact display name is literally present on that page (as a usage/gallery
reference) - never assumed just because the candidate page exists.
"""
import json, subprocess, time, re
from pathlib import Path

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


def main():
    import sys
    sys.path.insert(0, "scripts")
    from extract_acquisition_wikitext import classify

    wiki = json.load(open("wiki_module_json/Module_Cosmetics_data.json"))["Cosmetics"]
    no_page = json.load(open("docs/revamp/wiki-audit/cosmetics_dedicated_page_no_page.json"))
    helmets = [name for name, v in no_page.items() if wiki[name].get("Type") == "Helmet"]
    print(f"Helmet no-page items to retry: {len(helmets)}")

    resolved = {}
    still_no_data = {}

    def canon(p):
        return p.replace('/StoreItems/', '/') if isinstance(p, str) else p

    for name in helmets:
        if not name.endswith("Helmet"):
            still_no_data[name] = {"reason": "doesn't end in 'Helmet', can't derive a Skin candidate title"}
            continue
        candidate_title = name[: -len("Helmet")].strip() + " Skin"
        content = fetch_raw(candidate_title)
        if not content:
            still_no_data[name] = {"reason": f"candidate page '{candidate_title}' doesn't exist either"}
            continue
        if name not in content:
            still_no_data[name] = {"reason": f"candidate page '{candidate_title}' exists but never mentions '{name}' - not confirmed as the right page"}
            continue

        result = classify(content, page_title=candidate_title)
        entry = wiki[name]
        uniqueName = canon(entry.get("InternalName")) if entry.get("InternalName") else None
        if result["status"] != "clean" or not uniqueName:
            still_no_data[name] = {"reason": f"found and confirmed page '{candidate_title}' but its Acquisition section is {result['status']}" + ("" if uniqueName else " (also missing InternalName)")}
            continue

        resolved[uniqueName] = {
            "uniqueName": uniqueName,
            "wikiName": name,
            "description": entry.get("Description"),
            "acquisition": result["text"],
            "sourceRefs": [f"article page: {candidate_title} (Deluxe set page, confirmed to reference '{name}' by exact-name match)"],
            "verifiedDate": "2026-09-09",
        }

    print(f"Resolved via Skin-page fallback: {len(resolved)}")
    print(f"Still unresolved: {len(still_no_data)}")

    json.dump(resolved, open("docs/revamp/wiki-audit/cosmetics_helmet_fallback_resolved.json", "w"), indent=2, ensure_ascii=False)
    json.dump(still_no_data, open("docs/revamp/wiki-audit/cosmetics_helmet_fallback_unresolved.json", "w"), indent=2, ensure_ascii=False)

    for k in list(resolved)[:3]:
        print(json.dumps(resolved[k], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
