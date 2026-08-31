#!/usr/bin/env python3
"""
For every page this project has extracted from, list EVERY heading
(h2/h3/h4) and flag any heading whose content (gallerybox/glyphBox/table
rows underneath it, before the next same-or-higher-level heading) was
NEVER represented in the corresponding staged JSON's "section" field.

This is the actual gap in every miss found so far: not "the data was
wrong" but "an entire sub-section was invisible to the extraction because
nobody enumerated its heading." A full audit means finding sections with
ZERO captured items, not re-verifying sections that already have some.

Reports only - does not change acquisition_overrides.json.
"""
import json, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered

PAGES = [
    ("Decorations/Orbiter_Decorations", "acquisition_staging/Decorations_Orbiter_Decorations_staged.json"),
    ("Glyph", "acquisition_staging/Glyph_staged.json"),
    ("Sigils", "acquisition_staging/Sigils_staged.json"),
    ("Warframe Cosmetics", "acquisition_staging/Warframe_Cosmetics_staged.json"),
    ("Sentinel Cosmetics", "acquisition_staging/Sentinel_Cosmetics_staged.json"),
    ("Kubrow Cosmetics", "acquisition_staging/Kubrow_Cosmetics_staged.json"),
    ("Kavat Cosmetics", "acquisition_staging/Kavat_Cosmetics_staged.json"),
    ("Operator/Customization", "acquisition_staging/Operator_Customization_staged.json"),
    ("Weapon Cosmetics", "acquisition_staging/Weapon_Cosmetics_staged.json"),
    ("Third Party Deals and Rewards", "acquisition_staging/Third_Party_Bundles_staged.json"),
]

SKIP_HEADING_TEXT = {"Contents", "Notes", "Trivia", "Media", "See also", "Patch History",
                     "References", "Bugs", "Gallery"}


def has_content_between(heading, soup):
    """Does anything countable (glyphBox / gallerybox / table row) exist
    between this heading and the next h2/h3/h4?"""
    for el in heading.find_all_next():
        if el.name in ("h2", "h3", "h4") and el is not heading:
            break
        if el.name == "div" and "glyphBox" in (el.get("class") or []):
            return True
        if el.name == "li" and "gallerybox" in (el.get("class") or []):
            return True
        if el.name == "table" and "wikitable" in (el.get("class") or []):
            return True
    return False


def audit_page(page_title, staged_path):
    html = fetch_rendered(page_title)
    if not html:
        return [f"COULD NOT FETCH {page_title}"]
    soup = BeautifulSoup(html, "html.parser")

    try:
        rows = json.load(open(staged_path))
    except FileNotFoundError:
        rows = []
    captured_sections = {r.get("section") for r in rows if r.get("section")}
    # also check headings that appear as substrings (for helmet/skin
    # sub-pages, a heading like "Daily Tribute Milestone Glyphs" might be
    # captured as a "section" exactly, or might feed into a differently
    # labeled row - accept a fuzzy containment match too)
    captured_text_blob = " ".join(captured_sections).lower()

    gaps = []
    for heading in soup.find_all(["h2", "h3", "h4"]):
        text = heading.get_text(strip=True)
        if not text or text in SKIP_HEADING_TEXT:
            continue
        if not has_content_between(heading, soup):
            continue  # nothing to capture here anyway (pure prose section)
        if text in captured_sections or text.lower() in captured_text_blob:
            continue
        gaps.append(text)
    return gaps


def main():
    all_gaps = {}
    for page_title, staged_path in PAGES:
        print(f"Checking {page_title}...")
        gaps = audit_page(page_title, staged_path)
        if gaps:
            all_gaps[page_title] = gaps
            print(f"  {len(gaps)} uncaptured heading(s): {gaps}")
        else:
            print("  OK - all headings with content are represented")

    out = Path("acquisition_staging/_heading_coverage_gaps.json")
    out.write_text(json.dumps(all_gaps, indent=2, ensure_ascii=False))
    total = sum(len(v) for v in all_gaps.values())
    print(f"\nTotal uncaptured headings across all pages: {total}")
    print(f"Written to: {out}")


if __name__ == "__main__":
    main()
