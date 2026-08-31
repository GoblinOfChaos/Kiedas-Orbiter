#!/usr/bin/env python3
"""
Extract acquisition info for every sigil on the wiki's "Sigils" page into a
STAGING file for human review - never writes to acquisition_overrides.json
directly.

Sigils use their own structure: div.sigilBox (name in .sigilBoxText, icon
in .sigilBoxImage) - close to glyphBox but its own class, confirmed by
checking the raw HTML for the "Steel Meridian" section before writing this
(not assumed from the Glyph page's pattern). No individual price/text per
sigil; acquisition is stated once per section (e.g. "Steel Meridian" ->
Syndicate reputation, "Baro Ki'Teer Sigils" -> Baro), same as Glyph.
"""
import json, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
OUT.mkdir(exist_ok=True)

PAGE_TITLE = "Sigils"
SOURCE_URL_BASE = f"https://wiki.warframe.com/w/{PAGE_TITLE}"


def section_context(target):
    heading = target.find_previous(["h2", "h3"])
    paras = []
    if heading:
        for el in heading.find_all_next():
            if el.name in ("h2", "h3"):
                break
            if el.name == "p" and el.get_text(strip=True):
                paras.append(el.get_text(" ", strip=True))
            if len(paras) >= 2:
                break
    return heading, " ".join(paras)


def mentions_vendor(text):
    vendor_words = ["Market", "Baro", "Sold by", "Nakak", "Vendor", "Syndicate",
                     "Quest", "Twitch", "Exclusive", "Anniversary", "Nightwave",
                     "Bounty", "Event", "Relay", "purchased", "reward", "Standing",
                     "TennoCon", "Founder", "Prime Access", "Tribute", "Milestone",
                     "Arbitration", "Drop", "Tactical Alert"]
    return any(w.lower() in text.lower() for w in vendor_words)


def main():
    html = fetch_rendered(PAGE_TITLE)
    if not html:
        print("FAILED to fetch page")
        return
    soup = BeautifulSoup(html, "html.parser")

    rows = []
    for box in soup.find_all("div", class_="sigilBox"):
        name_el = box.find(class_="sigilBoxText")
        if name_el:
            name = name_el.get_text(" ", strip=True)
        else:
            # Some variants (e.g. Heirloom sigils) skip the sigilBoxText
            # class entirely - name is a plain bold div, with flavor text
            # in a separate <p><i>...</i></p> right after it. Strip the
            # image and any <p> (always flavor text, never the name) so
            # the name doesn't get flavor text concatenated onto it (e.g.
            # "Valkyr Heirloom Sigil A sigil that celebrates Valkyr's
            # legacy." instead of just "Valkyr Heirloom Sigil").
            clone = BeautifulSoup(str(box), "html.parser")
            for el in clone.find_all(class_="sigilBoxImage"):
                el.decompose()
            for el in clone.find_all("p"):
                el.decompose()
            name = clone.get_text(" ", strip=True)
        if not name:
            continue
        heading, context_text = section_context(box)
        section_name = heading.get_text(strip=True) if heading else None

        if context_text and mentions_vendor(context_text):
            kind = "category-default"
            final_text = context_text
        elif context_text:
            kind = "unconfirmed"
            final_text = context_text
        elif section_name and mentions_vendor(section_name):
            # Some sections (e.g. "Baro Ki'Teer Sigils") have no separate
            # intro paragraph - the heading itself already says it all.
            kind = "category-default"
            final_text = f"{section_name} (see wiki section for detail)"
        else:
            kind = "unconfirmed"
            final_text = "(no section context paragraph found - needs manual check)"

        rows.append({
            "item": name,
            "raw_gallery_text": name,
            "kind": kind,
            "text": final_text,
            "tab": None,
            "section": section_name,
            "source_url": f"{SOURCE_URL_BASE}#{(heading.get('id') or '').replace(' ', '_')}" if heading else SOURCE_URL_BASE,
        })

    seen = {}
    for r in rows:
        if r["item"] not in seen:
            seen[r["item"]] = r
    deduped = list(seen.values())

    out_path = OUT / "Sigils_staged.json"
    out_path.write_text(json.dumps(deduped, indent=2, ensure_ascii=False))

    by_kind = {}
    for r in deduped:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    print(f"Extracted {len(deduped)} sigils from {PAGE_TITLE}")
    for k, v in by_kind.items():
        print(f"  {k}: {v}")
    print(f"Staged to: {out_path}")


if __name__ == "__main__":
    main()
