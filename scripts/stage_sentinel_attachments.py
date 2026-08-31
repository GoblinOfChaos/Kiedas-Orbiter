#!/usr/bin/env python3
"""
Extract acquisition info for Sentinel skin attachment pieces (Mask/Wings/
Tail) from the "Attachments" table on Sentinel Cosmetics - never writes to
acquisition_overrides.json directly.

Structure (verified before writing this): 4 columns - "Set" (rowspan
covers a following description-only row) + 3 "Attachments" sub-columns,
each with its OWN name + price ("Altra Sentinel Mask Ducats 450 + Credits
400,000"), not inherited from the parent Set. Some sets (e.g. Nightwave
rewards) have attachment cells with a name but no price at all - inherit
the Set's own acquisition text for those instead of guessing a price.
"""
import json, re, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered, clean_element_text

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
PAGE_TITLE = "Sentinel Cosmetics"
SOURCE_URL = f"https://wiki.warframe.com/w/{PAGE_TITLE.replace(' ', '_')}#Attachments"

CURRENCY_RE = re.compile(r"(Ducats\s+[\d,]+\s*\+\s*Credits\s+[\d,]+|Platinum\s+[\d,]+|Standing\s+[\d,]+)")
KNOWN_VENDORS = ["The Holdfasts", "Necraloid", "Cavia", "Ostron", "Cephalon Simaris",
                 "Ventkids", "Vox Solaris", "The Hex", "Solaris United"]


def split_name_and_price(text):
    """
    Split a cell's text into (name, price-or-note). Two distinct shapes
    seen in this table:
      - "Name Currency Amount" (e.g. "Altra Sentinel Mask Ducats 450 +
        Credits 400,000") - split at the currency word.
      - "Name (free-text parenthetical)" (e.g. "Scyph (Platinum 250 as
        part of Hydroid Rakkam Collection)") - the parenthetical is a
        whole descriptive note, not meant to be regex-split itself; an
        earlier version ran the currency regex over the raw text here too
        and produced a mangled result ("Platinum 250 as part of Hydroid
        Rakkam Collection ) (part of the Scyph ( set).").
      - "Name VendorName Standing Amount" (e.g. "Loid Sentinel Mask
        Necraloid Standing 10,000") - the vendor name sits between the
        item name and the currency, and would otherwise get left stuck
        onto the name ("Loid Sentinel Mask Necraloid") instead of being
        recognized as the vendor.
    """
    text = text.strip()
    paren_idx = text.find("(")
    if paren_idx != -1 and text.endswith(")"):
        return text[:paren_idx].strip(), text[paren_idx + 1:-1].strip()

    m = CURRENCY_RE.search(text)
    if not m:
        return text, None
    name = text[: m.start()].strip()
    price = m.group(1)
    for vendor in KNOWN_VENDORS:
        if name.endswith(vendor):
            name = name[: -len(vendor)].strip()
            price = f"{vendor} {price}"
            break
    return name, price


def price_to_text(price):
    m = re.fullmatch(r"Ducats\s+([\d,]+)\s*\+\s*Credits\s+([\d,]+)", price)
    if m:
        return f"Purchased from Baro Ki'Teer for {m.group(1)} Ducats + {m.group(2)} Credits."
    m = re.fullmatch(r"Platinum\s+([\d,]+)", price)
    if m:
        return f"Purchased from the Market for {m.group(1)} Platinum."
    m = re.fullmatch(r"(.+?)\s+Standing\s+([\d,]+)", price)
    if m:
        return f"Purchased from {m.group(1)} for {m.group(2)} Standing."
    m = re.fullmatch(r"Standing\s+([\d,]+)", price)
    if m:
        return f"Purchased for {m.group(1)} Standing (specific syndicate not stated in this table)."
    return price


def main():
    html = fetch_rendered(PAGE_TITLE)
    if not html:
        print("FAILED to fetch page")
        return
    soup = BeautifulSoup(html, "html.parser")

    heading = None
    for hd in soup.find_all("h2"):
        if hd.get_text(strip=True) == "Attachments":
            heading = hd
            break
    if not heading:
        print("Attachments section not found")
        return

    # There can be MULTIPLE separate tables under "Attachments" - one per
    # h4 sub-category (In-game Rewards / Prime Access / Others). An
    # earlier version only grabbed the first via find_next("table"),
    # silently missing every attachment in the later tables (confirmed
    # via a systematic heading-coverage audit: "Prime Access" and
    # "Others" h4 headings had real table content that never showed up
    # in any staged output - e.g. Heimt Prime/Ictus Prime sentinel mods).
    next_h2 = heading.find_next("h2")
    tables = []
    for el in heading.find_all_next():
        if el is next_h2:
            break
        if el.name == "table" and "wikitable" in (el.get("class") or []):
            tables.append(el)

    rows = []
    for table in tables:
        current_set_name, current_set_text = None, None
        for tr in table.find_all("tr")[1:]:
            tds = tr.find_all("td")
            if len(tds) == 4:
                raw_set = clean_element_text(tds[0])
                current_set_name, set_note = split_name_and_price(raw_set)
                # A bare Set cell with no price of its own but a note (e.g.
                # "Nightwave reward", or a parenthetical like "Platinum 250 as
                # part of Hydroid Rakkam Collection") - keep as its own fact.
                current_set_text = price_to_text(set_note) if set_note else None
                attach_cells = tds[1:]
            elif len(tds) == 1:
                # continuation row (a plain description sentence) - no new items
                continue
            else:
                continue

            for cell in attach_cells:
                name, price = split_name_and_price(clean_element_text(cell))
                if not name:
                    continue
                if price:
                    text = price_to_text(price)
                    kind = "item-specific"
                elif current_set_text:
                    text = f"{current_set_text} (part of the {current_set_name} set)."
                    kind = "item-specific"
                else:
                    text = f"(no price found - part of the {current_set_name} set, needs manual check)"
                    kind = "category-default"
                rows.append({
                    "item": name, "raw_gallery_text": f"{name} ({current_set_name} set)",
                    "kind": kind, "text": text, "tab": None, "section": current_set_name,
                    "source_url": SOURCE_URL,
                })

    out_path = OUT / "Sentinel_Attachments_staged.json"
    out_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    by_kind = {}
    for r in rows:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    print(f"Extracted {len(rows)} attachments")
    for k, v in by_kind.items():
        print(f"  {k}: {v}")
    print(f"Staged to: {out_path}")


if __name__ == "__main__":
    main()
