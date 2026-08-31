#!/usr/bin/env python3
"""
Extract acquisition info for Sugatras from the "Weapon Cosmetics" page's
Sugatra tables (One-Offs, Baro Ki'Teer, PrimeSeries, Nightwave, Lunar
Renewal, Console Exclusives - all share the same Sugatra/Description/
Acquisition column structure, confirmed before writing this). The
Acquisition column is already a real sentence, not a bare price - just
needs the same hidden-sortkey/currency-icon cleanup as everywhere else.
"""
import json, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered, clean_element_text

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
PAGE_TITLE = "Weapon Cosmetics"
SOURCE_URL = f"https://wiki.warframe.com/w/{PAGE_TITLE.replace(' ', '_')}#Sugatra"


def main():
    html = fetch_rendered(PAGE_TITLE)
    if not html:
        print("FAILED to fetch page")
        return
    soup = BeautifulSoup(html, "html.parser")

    rows = []
    for table in soup.find_all("table", class_="wikitable"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if headers != ["Sugatra", "Description", "Acquisition"]:
            continue
        for tr in table.find_all("tr")[1:]:
            tds = tr.find_all("td")
            if len(tds) != 3:
                continue
            name = clean_element_text(tds[0])
            acquisition = clean_element_text(tds[2])
            if not name or not acquisition:
                continue
            rows.append({
                "item": name, "raw_gallery_text": f"{name}: {acquisition}",
                "kind": "item-specific", "text": acquisition,
                "tab": None, "section": "Sugatra", "source_url": SOURCE_URL,
            })

    seen = {}
    for r in rows:
        if r["item"] not in seen:
            seen[r["item"]] = r
    deduped = list(seen.values())

    out_path = OUT / "Sugatras_staged.json"
    out_path.write_text(json.dumps(deduped, indent=2, ensure_ascii=False))
    print(f"Extracted {len(deduped)} sugatras. Staged to: {out_path}")


if __name__ == "__main__":
    main()
