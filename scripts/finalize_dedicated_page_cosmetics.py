#!/usr/bin/env python3
"""
Run extract_acquisition_wikitext's classifier over every fetched dedicated-
page cosmetic article and produce the three-bucket output: clean (auto-
resolvable, has a uniqueName from Module:Cosmetics/data's own InternalName),
ambiguous (needs a human look), no_data (genuinely nothing found).
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, "scripts")
from extract_acquisition_wikitext import classify

WIKITEXT_DIR = Path("wiki_article_wikitext")
REDIRECT_RE = re.compile(r'^\s*#REDIRECT\s*:?\s*\[\[([^\]|#]+)', re.IGNORECASE)


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


def resolve_redirect(content, original_name, max_hops=3):
    """If content is a #REDIRECT, follow it (fetching the target, caching
    to disk) up to max_hops times. Returns (final_content, final_title,
    was_redirected). Verifies the original item's own name is mentioned in
    the final content before accepting - a redirect target could plausibly
    be a broader page that doesn't actually cover this specific item."""
    title = original_name
    redirected = False
    for _ in range(max_hops):
        m = REDIRECT_RE.match(content)
        if not m:
            break
        target = m.group(1).strip()
        new_content = fetch_raw(target)
        if not new_content:
            return content, title, redirected
        content, title, redirected = new_content, target, True
    return content, title, redirected


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


def main():
    wiki = json.load(open("wiki_module_json/Module_Cosmetics_data.json"))["Cosmetics"]
    needs_fallback = json.load(open("docs/revamp/wiki-audit/cosmetics_needs_fallback.json"))
    dedicated = sorted({name for name in needs_fallback if wiki[name].get("Link") == name})

    clean = {}
    ambiguous = {}
    no_data = {}
    no_page = {}

    for name in dedicated:
        entry = wiki[name]
        path = WIKITEXT_DIR / safe_filename(name)
        if not path.exists() or path.stat().st_size == 0:
            no_page[name] = {"wikiName": name, "reason": "article page fetch failed or page doesn't exist"}
            continue

        raw_content = path.read_text()
        content, final_title, redirected = resolve_redirect(raw_content, name)
        if redirected and name not in content:
            no_data[name] = {"wikiName": name, "reason": f"redirects to '{final_title}' but that page never mentions '{name}' - not confirmed as the right target"}
            continue

        result = classify(content, page_title=final_title)
        uniqueName = canon(entry.get("InternalName")) if entry.get("InternalName") else None

        if result["status"] == "clean":
            if not uniqueName:
                ambiguous[name] = {"wikiName": name, "reason": "acquisition text found but Cosmetics/data has no InternalName to key it by",
                                    "text": result["text"]}
                continue
            clean[uniqueName] = {
                "uniqueName": uniqueName,
                "wikiName": name,
                "description": entry.get("Description"),
                "acquisition": result["text"],
                "sourceRefs": [f"article page: {name}" + (f" -> redirects to {final_title} (confirmed to mention '{name}')" if redirected else " (##Acquisition section)")],
                "verifiedDate": "2026-09-09",
            }
        elif result["status"] == "ambiguous":
            ambiguous[name] = {"wikiName": name, "reason": result["reason"], "candidates": result.get("raw_sections")}
        else:
            no_data[name] = {"wikiName": name, "reason": result["reason"]}

    print(f"dedicated-page items processed: {len(dedicated)}")
    print(f"  clean (resolved):  {len(clean)}")
    print(f"  ambiguous:         {len(ambiguous)}")
    print(f"  no_data (empty/placeholder section): {len(no_data)}")
    print(f"  no_page (fetch failed / page doesn't exist): {len(no_page)}")

    out = Path("docs/revamp/wiki-audit")
    json.dump(clean, open(out / "cosmetics_dedicated_page_resolved.json", "w"), indent=2, ensure_ascii=False)
    json.dump(ambiguous, open(out / "cosmetics_dedicated_page_ambiguous.json", "w"), indent=2, ensure_ascii=False)
    json.dump(no_data, open(out / "cosmetics_dedicated_page_no_data.json", "w"), indent=2, ensure_ascii=False)
    json.dump(no_page, open(out / "cosmetics_dedicated_page_no_page.json", "w"), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
