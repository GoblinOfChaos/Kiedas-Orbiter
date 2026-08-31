#!/usr/bin/env python3
"""
Extract acquisition info for every Warframe skin listed on the wiki's
"Warframe Cosmetics" page into a STAGING file for human review - never
writes to acquisition_overrides.json directly.

Structure (verified against real examples before writing this):
  - "Warframe Cosmetics" has a wikitable per Warframe with columns
    Skin name / Release Date / Includes / Availability / Type / ...
  - "Availability" is usually just "Available"/"Unavailable" (not useful
    alone), but sometimes has real detail: "Recurring (Baro Ki'Teer)",
    "Recurring (Prime Access)", "Unavailable (PlayStation promotion)" etc.
  - Most skins ALSO have their own dedicated wiki page with a "Skinbox"
    infobox containing real "Acquisition: Market / Price: N Platinum"
    fields (confirmed on Ash Immortal Skin, Chroma Zunlong Skin, Ember
    Heirloom Skin - all different Types, all had this).
  - TennoGen skins' own page has no Acquisition/Price fields (they're not
    Market-bought) but does have "Author" + "TennoGen Round" fields -
    confirmed on Ash Bai Hu Skin.
  - Prime skins have NO dedicated page at all (Ash Prime Skin -> 404) -
    they come bundled with the Prime Warframe itself, not sold separately,
    so the table's own Availability text ("Recurring (Prime Access)") is
    the real answer for those, not a per-skin page.

Classifies each row as:
  - "item-specific": got a real per-item Acquisition/Price, or a
    detailed table Availability value, or TennoGen Author/Round info
  - "unconfirmed": has some info but incomplete/ambiguous
  - "category-default": nothing usable found - falls back to a bare
    Type-based guess, explicitly labeled, needs a human look
"""
import json, sys, time
from pathlib import Path
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered, clean_element_text

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
OUT.mkdir(exist_ok=True)

SOURCE_PAGE = "Warframe Cosmetics"
WORKERS = 5


def get_table_rows():
    html = fetch_rendered(SOURCE_PAGE)
    if not html:
        raise RuntimeError(f"failed to fetch {SOURCE_PAGE}")
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for table in soup.find_all("table", class_="wikitable"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if "Skin name" not in headers or "Type" not in headers:
            continue
        name_idx = headers.index("Skin name")
        type_idx = headers.index("Type")
        avail_idx = headers.index("Availability") if "Availability" in headers else None
        for tr in table.find_all("tr")[1:]:
            cells = tr.find_all("td")
            if len(cells) <= type_idx:
                continue
            name = cells[name_idx].get_text(" ", strip=True).replace("\xa0", " ")
            skin_type = cells[type_idx].get_text(" ", strip=True)
            availability = cells[avail_idx].get_text(" ", strip=True) if avail_idx is not None and len(cells) > avail_idx else ""
            if name:
                rows.append({"name": name, "type": skin_type, "availability": availability})
    return rows


def process_skin(row):
    name, skin_type, availability = row["name"], row["type"], row["availability"]
    source_url = f"https://wiki.warframe.com/w/{SOURCE_PAGE.replace(' ', '_')}"

    # A table Availability value more specific than bare Available/
    # Unavailable is already real, sourced, item-level info - use it as-is.
    if availability and availability not in ("Available", "Unavailable"):
        return {
            "item": name, "kind": "item-specific",
            "text": f"{availability} (skin type: {skin_type})",
            "source_url": source_url, "note": "from Warframe Cosmetics table",
        }

    # "Default" type is the free base appearance every Warframe ships with -
    # there's nothing to buy, so no dedicated page exists, which is expected
    # rather than a gap. The table's own "Type: Default" is the real answer.
    if skin_type == "Default":
        return {
            "item": name, "kind": "item-specific",
            "text": "Default skin included with the base item - no separate purchase needed.",
            "source_url": source_url, "note": "Type=Default from Warframe Cosmetics table",
        }

    # Otherwise check the skin's own dedicated page for a Skinbox infobox.
    html = fetch_rendered(name)
    if html:
        soup = BeautifulSoup(html, "html.parser")
        infobox = soup.find(class_="infobox")
        if infobox:
            box_text = clean_element_text(infobox)
            own_url = f"https://wiki.warframe.com/w/{name.replace(' ', '_')}"
            if "Acquisition" in box_text and "Price" in box_text:
                # e.g. "... Acquisition Market Price 40 Platinum 40" - keep
                # the Acquisition/Price fragment onward, not the whole box.
                idx = box_text.find("Acquisition")
                return {
                    "item": name, "kind": "item-specific",
                    "text": box_text[idx:],
                    "source_url": own_url, "note": "own page Skinbox infobox",
                }
            if "Author" in box_text and "TennoGen" in box_text:
                return {
                    "item": name, "kind": "item-specific",
                    "text": f"TennoGen community skin, purchased via Steam Workshop. {box_text}",
                    "source_url": own_url, "note": "own page TennoGen infobox",
                }
            return {
                "item": name, "kind": "unconfirmed",
                "text": box_text,
                "source_url": own_url, "note": "own page infobox, unrecognized shape - needs manual check",
            }

    # No dedicated page (e.g. Prime skins bundled with the Warframe itself)
    # and no useful table Availability - fall back to a bare Type label,
    # explicitly marked as needing a person to confirm.
    return {
        "item": name, "kind": "category-default",
        "text": f"(no dedicated page, no specific table info - Type: {skin_type}, Availability: {availability or 'unknown'} - needs manual check)",
        "source_url": source_url, "note": "type/availability fallback only",
    }


def main():
    rows = get_table_rows()
    print(f"Found {len(rows)} skin rows on {SOURCE_PAGE}")

    results = []
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(process_skin, r): r for r in rows}
        done = 0
        for fut in as_completed(futures):
            results.append(fut.result())
            done += 1
            if done % 25 == 0:
                print(f"  {done}/{len(rows)}...")

    out_path = OUT / "Warframe_Cosmetics_staged.json"
    out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False))

    by_kind = {}
    for r in results:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    print(f"\nDone. {len(results)} skins.")
    for k, v in by_kind.items():
        print(f"  {k}: {v}")
    print(f"Staged to: {out_path}")


if __name__ == "__main__":
    main()
