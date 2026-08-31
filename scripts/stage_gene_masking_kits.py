#!/usr/bin/env python3
"""
Extract acquisition info for every Kubrow/Kavat fur pattern & color name
from the "Kits" table on Kubrow Cosmetics / Kavat Cosmetics into a STAGING
file - never writes to acquisition_overrides.json directly.

Structure (verified against the real table before writing this): each Kit
is a pair of <tr> rows - the first has a rowspan=2 cell with the Kit's own
name+price, and a second cell listing every color/pattern name that kit
unlocks (each as its own <div>); the second row is just an italic
description spanning the row. One Kit price applies to every color/pattern
name inside it, similar to a bundle-piece skin.
"""
import json, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered, clean_element_text

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
OUT.mkdir(exist_ok=True)


def process_page(page_title):
    html = fetch_rendered(page_title)
    if not html:
        print(f"FAILED to fetch {page_title}")
        return []
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="wikitable")
    if table is None:
        print(f"No wikitable found on {page_title}")
        return []

    source_url = f"https://wiki.warframe.com/w/{page_title.replace(' ', '_')}"
    rows = []
    trs = table.find_all("tr")[1:]  # skip header row
    i = 0
    while i < len(trs):
        tr = trs[i]
        kit_cell = tr.find("td", attrs={"rowspan": True})
        colors_cell = None
        tds = tr.find_all("td")
        if kit_cell is not None and len(tds) >= 2:
            colors_cell = tds[1] if tds[0] is kit_cell else tds[0]
        if kit_cell is None:
            i += 1
            continue

        kit_text = clean_element_text(kit_cell)
        # kit_text looks like "Basic Gene-Masking Kit Credits 100,000" -
        # name is everything before the currency word.
        kit_name = kit_text
        for currency in ("Credits", "Platinum", "Ducats"):
            idx = kit_text.find(currency)
            if idx != -1:
                kit_name = kit_text[:idx].strip()
                break

        colors = []
        if colors_cell is not None:
            # Some Kits wrap their color divs in an outer container div
            # (style="width:100%;...") that itself has a style attribute -
            # a plain find_all("div", style=True) matches that wrapper TOO,
            # producing one extra row per kit with every color name
            # concatenated together, alongside the correct individual ones.
            # Leaf color divs specifically use "display:inline-block".
            for div in colors_cell.find_all("div", style=lambda s: s and "inline-block" in s):
                name = clean_element_text(div)
                if name:
                    colors.append(name)

        for color_name in colors:
            rows.append({
                "item": color_name,
                "raw_gallery_text": f"{color_name} (from {kit_name})",
                "kind": "item-specific",
                "text": f"Included in the {kit_name} ({kit_text[len(kit_name):].strip()}) - {page_title.replace(' Cosmetics', '')} color/pattern.",
                "tab": None,
                "section": kit_name,
                "source_url": source_url,
            })
        i += 2  # skip the description-only row that follows

    return rows


def main():
    all_rows = []
    for page in ["Kubrow Cosmetics", "Kavat Cosmetics"]:
        page_rows = process_page(page)
        print(f"{page}: {len(page_rows)} colors/patterns")
        all_rows.extend(page_rows)

    out_path = OUT / "Gene_Masking_Kits_staged.json"
    out_path.write_text(json.dumps(all_rows, indent=2, ensure_ascii=False))
    print(f"Total: {len(all_rows)}. Staged to: {out_path}")


if __name__ == "__main__":
    main()
