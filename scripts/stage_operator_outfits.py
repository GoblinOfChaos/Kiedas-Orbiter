#!/usr/bin/env python3
"""
Extract acquisition info for Operator Outfit pieces (Hood/Suit/Sleeves/
Leggings/etc.) from the 4 "Outfits" tables on Operator/Customization -
In-game Rewards, Syndicates, Market-exclusive, Prime Access. Found via a
systematic heading-coverage audit: this whole section (a table-based
structure, not the ul.gallery used elsewhere on this page) was never
captured by the original gallery-only extraction pass.

Same Set+Pieces pattern as Sentinel Cosmetics' Attachments tables: column
0 is the Set name + its own price, remaining columns are individual
pieces, each with their own optional price.
"""
import json, re, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered, clean_element_text

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")
PAGE_TITLE = "Operator/Customization"
CURRENCY_RE = re.compile(r"(Ducats\s+[\d,]+\s*\+\s*Credits\s+[\d,]+|Platinum\s+[\d,]+|Standing\s+[\d,]+)")


def split_name_and_price(text):
    """
    Some cells state TWO acquisition methods at once - e.g. "Helmet
    Platinum 30 ( Standing 10,000 )" means buy for 30 Platinum OR earn
    for 10,000 Standing. Extract the parenthetical price first, then
    check what's left before it for a SECOND, un-parenthesized price
    (rather than leaving "Helmet Platinum 30" as a mangled item name)."""
    text = text.strip()
    paren_idx = text.find("(")
    prices = []
    name = text
    if paren_idx != -1 and text.endswith(")"):
        name = text[:paren_idx].strip()
        prices.append(text[paren_idx + 1:-1].strip())

    m = CURRENCY_RE.search(name)
    if m:
        prices.insert(0, m.group(1))
        name = name[: m.start()].strip()

    return name, prices


def price_to_text(price):
    m = re.fullmatch(r"Ducats\s+([\d,]+)\s*\+\s*Credits\s+([\d,]+)", price)
    if m:
        return f"Baro Ki'Teer for {m.group(1)} Ducats + {m.group(2)} Credits"
    m = re.fullmatch(r"Platinum\s+([\d,]+)", price)
    if m:
        return f"the Market for {m.group(1)} Platinum"
    m = re.fullmatch(r"Standing\s+([\d,]+)", price)
    if m:
        return f"{m.group(1)} Standing"
    return price


def prices_to_text(prices):
    if not prices:
        return None
    parts = [price_to_text(p) for p in prices]
    return "Purchased from " + ", or from ".join(parts) + "."


def process_table(table, category, source_url):
    rows = []
    current_set_name, current_set_text = None, None
    for tr in table.find_all("tr")[1:]:
        tds = tr.find_all("td")
        if len(tds) >= 3:
            raw_set = clean_element_text(tds[0])
            current_set_name, set_notes = split_name_and_price(raw_set)
            if current_set_name == "Zariman" or "unlocked by default" in raw_set:
                current_set_text = "Included by default - no separate purchase needed."
            elif "Prime Access" in raw_set or "Prime Accessories" in raw_set:
                suffix = "Prime Access" if "Prime" not in current_set_name else "Access"
                current_set_text = f"Included with {current_set_name} {suffix}."
            elif set_notes:
                current_set_text = prices_to_text(set_notes)
            else:
                current_set_text = None
            piece_cells = [td for td in tds[1:] if clean_element_text(td)]
        elif len(tds) == 1:
            continue
        else:
            continue

        for cell in piece_cells:
            name, prices = split_name_and_price(clean_element_text(cell))
            if not name:
                continue
            if prices:
                text = prices_to_text(prices)
                kind = "item-specific"
            elif current_set_text:
                text = f"{current_set_text} (part of the {current_set_name} set)."
                kind = "item-specific"
            else:
                text = f"(no price found - part of the {current_set_name} set, needs manual check)"
                kind = "category-default"
            rows.append({
                "item": name, "raw_gallery_text": f"{name} ({current_set_name} set)",
                "kind": kind, "text": text, "tab": category, "section": current_set_name,
                "source_url": source_url,
            })
    return rows


def main():
    html = fetch_rendered(PAGE_TITLE)
    if not html:
        print("FAILED to fetch page")
        return
    soup = BeautifulSoup(html, "html.parser")
    source_url_base = f"https://wiki.warframe.com/w/{PAGE_TITLE.replace(' ', '_')}"

    heading = None
    for hd in soup.find_all("h3"):
        if hd.get_text(strip=True) == "Outfits":
            heading = hd
            break
    if heading is None:
        print("Outfits section not found")
        return

    h4_headings = []
    for el in heading.find_all_next():
        if el.name in ("h2", "h3"):
            break
        if el.name == "h4":
            h4_headings.append(el)

    all_rows = []
    for h4 in h4_headings:
        category = h4.get_text(strip=True)
        table = h4.find_next("table")
        if table is None:
            continue
        rows = process_table(table, category, f"{source_url_base}#{category.replace(' ', '_')}")
        all_rows.extend(rows)

    seen = {}
    for r in all_rows:
        if r["item"] not in seen:
            seen[r["item"]] = r
    deduped = list(seen.values())

    out_path = OUT / "Operator_Outfits_staged.json"
    out_path.write_text(json.dumps(deduped, indent=2, ensure_ascii=False))
    by_kind = {}
    for r in deduped:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    print(f"Extracted {len(deduped)} outfit pieces")
    for k, v in by_kind.items():
        print(f"  {k}: {v}")
    print(f"Staged to: {out_path}")


if __name__ == "__main__":
    main()
