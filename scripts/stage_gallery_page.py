#!/usr/bin/env python3
"""
Extract acquisition info for every item in every image-gallery on a given
wiki page into a STAGING file for human review - never writes to
acquisition_overrides.json directly.

For each gallery item, classifies it as one of:
  - "item-specific": the item's own line states a real price/method
  - "category-default": the item has no info of its own; text shown is the
    section's inherited default statement, clearly labeled as such
  - "unconfirmed": a price is shown but no vendor/method is stated

Usage: stage_gallery_page.py "Exact Wiki Page Title"

Verified against Decorations/Orbiter_Decorations (Noggles/Articula/Ayatan/
Posters/Displays/etc all correctly split & classified, including non-money
rewards like "Purchased from Nightcap for 75 Fergolyte").
"""
import json, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered, gallerybox_name_and_note

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
OUT.mkdir(exist_ok=True)


def _nearest_tab(el):
    """Nearest enclosing tabbertab's data-title, or None if not inside one."""
    parent = el.find_parent(attrs={"data-title": True})
    return parent.get("data-title") if parent else None


def section_intro_text(heading, expected_tab=None):
    """Collect the descriptive paragraph(s) right after a heading, before
    any gallery/table - this is the 'default applies to all bare items'
    statement for that section.

    Must stop at h4 too, not just h2/h3: some pages (e.g. Decorations'
    "Vendors" list - Cephalon Simaris, Palladino, ... Master Teasonai,
    Onkko, ...) are a flat sequence of h4 headings, each vendor with their
    own paragraph immediately before their own gallery. Stopping only at
    h2/h3 let one vendor's default text silently run past their own
    heading into unrelated territory (or, when a nearby unrelated h3
    happened to be closer than any real per-vendor context, attributed a
    vendor's items to a wrong/irrelevant paragraph entirely - caught when
    a real vendor page confirmed "Caged Condroc" is sold by Master
    Teasonai for random resources, not whatever the mislabeled outer
    section heading implied).

    Must also not cross tabber boundaries: find_all_next() walks the whole
    document in source order, which can walk straight from one tabbertab
    panel into a SIBLING panel's paragraph (e.g. from a "Market" tab's
    items into an unrelated "Other" tab's intro text) since tab panels are
    just consecutive siblings in the DOM regardless of which one a viewer
    has open. If expected_tab is given, skip any paragraph whose own
    nearest tab doesn't match it - a paragraph with no tab ancestor at all
    (shared/global intro text) is still accepted as applying everywhere."""
    if heading is None:
        return ""
    paras = []
    for el in heading.find_all_next():
        if el.name in ("h2", "h3", "h4"):
            break
        if el.name == "ul" and "gallery" in (el.get("class") or []):
            break
        if el.name == "p" and el.get_text(strip=True):
            p_tab = _nearest_tab(el)
            if expected_tab is not None and p_tab is not None and p_tab != expected_tab:
                continue
            paras.append(el.get_text(" ", strip=True))
        if len(paras) >= 2:
            break
    return " ".join(paras)


def mentions_vendor(text):
    """Loose check for whether a vendor/method is actually named, vs. just
    a bare currency amount. Deliberately permissive - anything not caught
    here still gets a human review pass, this only pre-sorts."""
    vendor_words = ["Market", "Baro", "Sold by", "Nakak", "Vendor", "Syndicate",
                     "Quest", "Twitch", "Exclusive", "Anniversary", "Nightwave",
                     "Bounty", "Event", "Relay", "Ticker", "Teasonai", "Varzia",
                     "Tennobaum", "TennoCon", "Amir", "Höllvania", "Drop", "Reward",
                     "Login", "Founder", "Prime Access", "Prime Vault", "Resurgence"]
    return any(w.lower() in text.lower() for w in vendor_words)


def process_gallery(gallery, heading, tab_title, source_url_base):
    # NOTE: tried adding expected_tab=tab_title here to fix a real
    # tab-crossing bug found in 3 Operator/Customization items (a shared
    # paragraph from a sibling tab got misattributed). Reverted: it broke
    # more than it fixed, e.g. Articula's overview paragraph legitimately
    # sits inside the first sub-tab ("Warframe & Enemies") but applies to
    # ALL of Articula's sibling tabs (Eidolons, Orb Mothers too) - the
    # blanket rule truncated that correct, already-verified text down to
    # one sentence. There's no reliable structural signal here to tell
    # "this paragraph is genuinely tab-specific" (Ostron vendor text) apart
    # from "this paragraph is shared but happens to live in the first tab"
    # (Articula). The 3 known Operator items were fixed by individually
    # verifying and keeping their original correct values instead.
    default_text = section_intro_text(heading)
    rows = []
    for box in gallery.find_all("li", class_="gallerybox"):
        name, note = gallerybox_name_and_note(box)
        if not name:
            continue
        has_own = bool(note)

        if not has_own:
            kind = "category-default"
            final_text = default_text or "(no section default statement found - needs manual check)"
        elif mentions_vendor(note) or mentions_vendor(default_text):
            kind = "item-specific"
            final_text = note
        else:
            kind = "unconfirmed"
            final_text = note

        rows.append({
            "item": name,
            "raw_gallery_text": f"{name} — {note}" if note else name,
            "kind": kind,
            "text": final_text,
            "tab": tab_title,
            "section": heading.get_text(strip=True) if heading else None,
            "source_url": f"{source_url_base}#{(heading.get('id') or '').replace(' ', '_')}" if heading else source_url_base,
        })
    return rows


def stage_page(page_title):
    source_url_base = f"https://wiki.warframe.com/w/{page_title.replace(' ', '_')}"
    html = fetch_rendered(page_title)
    if not html:
        print(f"FAILED to fetch: {page_title}")
        return None
    soup = BeautifulSoup(html, "html.parser")

    all_rows = []
    for gallery in soup.find_all("ul", class_="gallery"):
        heading = gallery.find_previous(["h2", "h3", "h4"])
        tab_parent = gallery.find_parent(attrs={"data-title": True})
        tab_title = tab_parent.get("data-title") if tab_parent else None
        all_rows.extend(process_gallery(gallery, heading, tab_title, source_url_base))

    if not all_rows:
        print(f"No galleries found on: {page_title} (not a gallery-style page - skip)")
        return None

    # A page can document the same item in more than one gallery (its own
    # category section AND a site-wide catch-all like "Market", which often
    # has its own per-category sub-tabs but no per-tab intro text of its
    # own). "First occurrence wins" is wrong here: page order can put the
    # generic catch-all before the item's real dedicated section (e.g.
    # "Market" comes before "Noggles" in the Decorations page's own table
    # of contents), which silently prefers a vague blurb over the specific,
    # correct default statement. Rank by kind first, then by which text is
    # actually more specific: longer default text wins, and a non-"Market"
    # section is preferred over "Market" on a tie, since "Market" is the
    # least specific possible source for a category-default entry.
    kind_rank = {"item-specific": 0, "unconfirmed": 1, "category-default": 2}

    def specificity_key(r):
        return (kind_rank[r["kind"]], r.get("section") == "Market", -len(r["text"]))

    best_by_name = {}
    for r in all_rows:
        existing = best_by_name.get(r["item"])
        if existing is None or specificity_key(r) < specificity_key(existing):
            best_by_name[r["item"]] = r
    deduped_rows = list(best_by_name.values())

    safe_name = page_title.replace("/", "_").replace(" ", "_")
    out_path = OUT / f"{safe_name}_staged.json"
    out_path.write_text(json.dumps(deduped_rows, indent=2, ensure_ascii=False))

    by_kind = {}
    for r in deduped_rows:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    print(f"Extracted {len(deduped_rows)} items from {page_title}")
    for k, v in by_kind.items():
        print(f"  {k}: {v}")
    print(f"Staged to: {out_path}")
    return deduped_rows


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('usage: stage_gallery_page.py "Exact Wiki Page Title"')
        sys.exit(1)
    stage_page(sys.argv[1])
