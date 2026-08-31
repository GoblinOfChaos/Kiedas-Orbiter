#!/usr/bin/env python3
"""
Extract acquisition info for every cosmetic item listed inside a bundle on
"Third Party Deals and Rewards" (Renown/Prestige/Esteem Packs, PlayStation
Plus Packs, standalone Collections like Obsidian Azura) into a STAGING
file - never writes to acquisition_overrides.json directly.

This page exists specifically to resolve items that were left unresolved
elsewhere (e.g. "Obsidian Skins (PlayStation)" in Weapon Cosmetics had no
acquisition text of its own - this page names exactly which console pack
each such item came from and when it was available).

Structure (verified before writing this): most bundle sections (h2 or h3)
are followed by a div.mw-collapsible-content containing a sentence like
"This pack was available from DATE to DATE. The {Name} included:" and a
<ul> mixing real item names with non-cosmetic filler (Credits, Platinum,
Boosters) that must be filtered out. A few standalone sections (e.g.
"Rubedo Plated Items") don't use this pattern at all and are skipped,
reported, not guessed at.
"""
import json, re, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered, clean_element_text

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
PAGE_TITLE = "Third Party Deals and Rewards"
SOURCE_URL_BASE = f"https://wiki.warframe.com/w/{PAGE_TITLE.replace(' ', '_')}"

NON_ITEM_RE = re.compile(
    r"^\d[\d,]*\s*(Credits|Platinum|Endo|Ducats)(\s+\1)?$|"
    r"^(Credit|Affinity|Resource) Booster\b|^Platinum$|^Credits$",
    re.IGNORECASE,
)


def extract_bundle(heading):
    # A parent container heading (e.g. "PlayStation Plus Packs", "Renown
    # Packs") has its own nested h2/h3 sub-headings (the real bundles)
    # before it has any content of its own - find_next() would otherwise
    # walk past the boundary and silently attribute the FIRST child's
    # content to the parent container instead. If a heading of the same
    # or higher level appears before any collapsible-content, this
    # heading is a container, not a real bundle - skip it.
    content = heading.find_next(class_="mw-collapsible-content")
    if content is None:
        return None, []
    if content.find(["h2", "h3"]) is not None:
        # This heading's "own" content is actually a group wrapper that
        # encloses its own nested sub-headings (e.g. "PlayStation Plus
        # Packs" wraps ALL of Starter Pack + Booster Pack I-VII in one
        # big collapsible div, unlike Renown/Prestige's individual
        # per-pack collapsibles) - not real per-item content. Skip; each
        # nested heading gets processed on its own when the main loop
        # reaches it separately.
        return None, []

    text = content.get_text(" ", strip=True).replace("\xa0", " ")
    text = re.sub(r"(\b\w+ \d{1,2}, \d{4}), \d{4}\b", r"\1", text)  # dedupe wiki typo like "May 22, 2018, 2018"
    m = re.search(r"available from (.+?) to (.+?)\.", text)
    availability = f"available {m.group(1)} to {m.group(2)}" if m else None

    ul = content.find("ul")
    if ul is None:
        return availability, []
    items = []
    for li in ul.find_all("li", recursive=False):
        name = clean_element_text(li)
        if not name or NON_ITEM_RE.match(name):
            continue
        items.append(name)
    return availability, items


def main():
    html = fetch_rendered(PAGE_TITLE)
    if not html:
        print("FAILED to fetch page")
        return
    soup = BeautifulSoup(html, "html.parser")

    rows = []
    skipped_no_content = []
    for heading in soup.find_all(["h2", "h3"]):
        name = heading.get_text(strip=True)
        if name in ("Contents",):
            continue
        availability, items = extract_bundle(heading)
        if availability is None and not items:
            skipped_no_content.append(name)
            continue
        for item_name in items:
            text = f"Part of the {name} bundle"
            if availability:
                text += f" ({availability})"
            text += "."
            rows.append({
                "item": item_name,
                "raw_gallery_text": f"{item_name} ({name})",
                "kind": "item-specific",
                "text": text,
                "tab": None,
                "section": name,
                "source_url": f"{SOURCE_URL_BASE}#{(heading.get('id') or '').replace(' ', '_')}",
            })

    seen = {}
    for r in rows:
        if r["item"] not in seen:
            seen[r["item"]] = r
    deduped = list(seen.values())

    out_path = OUT / "Third_Party_Bundles_staged.json"
    out_path.write_text(json.dumps(deduped, indent=2, ensure_ascii=False))
    print(f"Extracted {len(deduped)} items from {len(rows) and len(set(r['section'] for r in rows))} bundles")
    print(f"Skipped (no collapsible content found): {len(skipped_no_content)}")
    if skipped_no_content:
        print("  ", skipped_no_content[:10])
    print(f"Staged to: {out_path}")


if __name__ == "__main__":
    main()
