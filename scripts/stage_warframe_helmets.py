#!/usr/bin/env python3
"""
Extract acquisition info for Warframe alternate Helmets from each
Warframe's own "{Name}/Cosmetics" subpage - never writes to
acquisition_overrides.json directly.

A genuinely new category found late in this session (user pointed out
"Gauss/Cosmetics" exists) - not covered by Warframe Cosmetics (Skins
only), Decorations, or Glyph. Every Warframe has this subpage with a
"Helmets" h3 section using the same ul.gallery structure already proven
elsewhere on this project.
"""
import json, sys, time
from pathlib import Path
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered
from stage_gallery_page import process_gallery

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
WORKERS = 3

WARFRAMES = [
    "Ash", "Atlas", "Banshee", "Baruuk", "Caliban", "Chroma", "Citrine",
    "Cyte-09", "Dagath", "Dante", "Ember", "Equinox", "Excalibur",
    "Excalibur Umbra", "Frost", "Gara", "Garuda", "Gauss", "Grendel",
    "Gyre", "Harrow", "Hildryn", "Hydroid", "Inaros", "Ivara", "Jade",
    "Khora", "Koumei", "Kullervo", "Lavos", "Limbo", "Loki", "Mag",
    "Mesa", "Mirage", "Nekros", "Nezha", "Nidus", "Nova", "Nyx",
    "Oberon", "Octavia", "Protea", "Qorvex", "Revenant", "Rhino",
    "Saryn", "Sevagoth", "Styanax", "Titania", "Trinity", "Valkyr",
    "Vauban", "Volt", "Voruna", "Wisp", "Wukong", "Xaku", "Yareli",
    "Zephyr",
]


def process_warframe(name):
    page_title = f"{name}/Cosmetics"
    source_url_base = f"https://wiki.warframe.com/w/{page_title.replace(' ', '_')}"
    html = fetch_rendered(page_title)
    if not html:
        return name, "no page", []
    soup = BeautifulSoup(html, "html.parser")

    heading = None
    for hd in soup.find_all(["h2", "h3"]):
        if hd.get_text(strip=True) == "Helmets":
            heading = hd
            break
    if heading is None:
        return name, "no Helmets section", []

    gallery = heading.find_next("ul", class_="gallery")
    if gallery is None:
        return name, "no gallery under Helmets", []

    rows = process_gallery(gallery, heading, None, source_url_base)
    return name, "ok", rows


def main():
    all_rows = []
    failures = []
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(process_warframe, n): n for n in WARFRAMES}
        for fut in as_completed(futures):
            name, status, rows = fut.result()
            if status != "ok":
                failures.append((name, status))
            all_rows.extend(rows)

    print(f"Processed {len(WARFRAMES)} Warframes, {len(failures)} failures")
    if failures:
        print("Failures (will retry once at lower concurrency):", failures[:10])

    out_path = OUT / "Warframe_Helmets_staged.json"
    out_path.write_text(json.dumps(all_rows, indent=2, ensure_ascii=False))

    by_kind = {}
    for r in all_rows:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    print(f"Total helmets: {len(all_rows)}")
    for k, v in by_kind.items():
        print(f"  {k}: {v}")
    print(f"Staged to: {out_path}")

    # persist failures for a retry pass
    (OUT / "_warframe_helmets_failures.json").write_text(json.dumps(failures, indent=2))


if __name__ == "__main__":
    main()
