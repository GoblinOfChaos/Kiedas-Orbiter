#!/usr/bin/env python3
"""
Extract acquisition info for every glyph on the wiki's "Glyph" page into a
STAGING file for human review - never writes to acquisition_overrides.json
directly.

Glyphs use a different HTML structure than gallery pages (div.glyphBox, not
ul.gallery/li.gallerybox - confirmed by stage_gallery_page.py silently
returning only 12/several-hundred items when pointed at this page). Individual
glyphs virtually never have their own price text; the price/method is stated
once per section (e.g. "Premium Glyphs ... purchased for 15 Platinum each")
and applies to every glyph under that heading/tab - so nearly every row is
correctly "category-default", not a bug.
"""
import json, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
OUT.mkdir(exist_ok=True)

PAGE_TITLE = "Glyph"
SOURCE_URL_BASE = f"https://wiki.warframe.com/w/{PAGE_TITLE}"


def section_context(target):
    """Nearest preceding heading + the paragraph(s) after it (forward
    order - the pricing prose for a section comes AFTER its heading, not
    immediately above the glyph's own box). Verified against the Premium
    Glyphs / Ash Koga Glyph case earlier tonight.

    Must search h4 too, not just h2/h3: a systematic heading-coverage
    audit found 22 whole glyph categories (Halloween, Anniversary, Baro
    Ki'Teer Glyphs, Miscellaneous, etc.) are h4 headings on this page,
    same class of bug as Decorations' flat h4 vendor list - those
    categories' glyphs were silently falling back to whatever more
    distant h2/h3 was nearest instead of their own real heading."""
    heading = target.find_previous(["h2", "h3", "h4"])
    tab_parent = target.find_parent(attrs={"data-title": True})
    tab_title = tab_parent.get("data-title") if tab_parent else None

    paras = []
    if heading:
        for el in heading.find_all_next():
            if el.name in ("h2", "h3", "h4"):
                break
            if el.name == "p" and el.get_text(strip=True):
                paras.append(el.get_text(" ", strip=True))
            if len(paras) >= 2:
                break
    return heading, tab_title, " ".join(paras)


def mentions_vendor(text):
    vendor_words = ["Market", "Baro", "Sold by", "Nakak", "Vendor", "Syndicate",
                     "Quest", "Twitch", "Exclusive", "Anniversary", "Nightwave",
                     "Bounty", "Event", "Relay", "purchased", "code", "promo",
                     "TennoCon", "Founder", "Drops"]
    return any(w.lower() in text.lower() for w in vendor_words)


def main():
    html = fetch_rendered(PAGE_TITLE)
    if not html:
        print("FAILED to fetch page")
        return
    soup = BeautifulSoup(html, "html.parser")

    rows = []
    for div in soup.find_all("div", class_="glyphBox"):
        name = div.get_text(" ", strip=True)
        if not name:
            continue
        heading, tab_title, context_text = section_context(div)

        if context_text and mentions_vendor(context_text):
            kind = "category-default"  # true for glyphs: shared per-section text, not per-item
            final_text = context_text
        elif context_text:
            kind = "unconfirmed"
            final_text = context_text
        else:
            kind = "unconfirmed"
            final_text = "(no section context paragraph found - needs manual check)"

        rows.append({
            "item": name,
            "raw_gallery_text": name,
            "kind": kind,
            "text": final_text,
            "tab": tab_title,
            "section": heading.get_text(strip=True) if heading else None,
            "source_url": f"{SOURCE_URL_BASE}#{(heading.get('id') or '').replace(' ', '_')}" if heading else SOURCE_URL_BASE,
        })

    # Some glyphs are transcluded more than once (e.g. a "Featured" carousel
    # plus their real section). "First occurrence wins" is the wrong rule
    # (proven wrong on the gallery-page script's identical situation -
    # Ash Noggle picked up a distant generic blurb because it appeared
    # first in page order, instead of its own correct, later section) -
    # prefer whichever occurrence has real category-default text over one
    # with none, and the longer/more specific text on a tie.
    kind_rank = {"category-default": 0, "unconfirmed": 1}

    def specificity_key(r):
        has_real_text = "needs manual check" not in r["text"]
        return (kind_rank.get(r["kind"], 2), not has_real_text, -len(r["text"]))

    seen = {}
    for r in rows:
        existing = seen.get(r["item"])
        if existing is None or specificity_key(r) < specificity_key(existing):
            seen[r["item"]] = r
    deduped = list(seen.values())

    out_path = OUT / "Glyph_staged.json"
    out_path.write_text(json.dumps(deduped, indent=2, ensure_ascii=False))

    by_kind = {}
    for r in deduped:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    print(f"Extracted {len(deduped)} glyphs from {PAGE_TITLE}")
    for k, v in by_kind.items():
        print(f"  {k}: {v}")
    print(f"Staged to: {out_path}")


if __name__ == "__main__":
    main()
