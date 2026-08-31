#!/usr/bin/env python3
"""
Resolve standing costs for the Syndicate sigils left unconfirmed by
stage_sigilbox_page.py. The Sigils page names each sigil under a heading
matching its Syndicate (e.g. "Steel Meridian") but never states how much
standing it costs - that's on the Syndicate's own page instead, in an
"Offerings" reward-card list (verified by checking Steel Meridian's raw
HTML: divs styled "width:150px;height:150px" each containing a price <p>,
a rank label div, and a name div - not a table, not a gallery).

Per the user: "purchased from this faction for x standing" if the wiki
states an amount, "just purchased from this faction" if it doesn't
(rather than leaving it unconfirmed with no answer at all).
"""
import json, re, sys
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import fetch_rendered

OUT = Path("/var/home/jedwards/kiedas-orbiter/acquisition_staging")

# Syndicate page title, keyed by the section name used on the Sigils page.
SYNDICATE_PAGES = {
    "Steel Meridian": "Steel Meridian",
    "Arbiters of Hexis": "Arbiters of Hexis",
    "Cephalon Suda": "Cephalon Suda",
    "The Perrin Sequence": "Perrin Sequence",
    "Red Veil": "Red Veil",
    "New Loka": "New Loka",
    "Cephalon SimarisSigils": "Cephalon Simaris",
    "Ostron": "Ostron",
    "The Quills": "The Quills",
    "Solaris United": "Solaris United",
    "Vox Solaris": "Vox Solaris",
    "Ventkids": "Ventkids",
    "Entrati": "Entrati",
    "Necraloid": "Necraloid",
    "The Holdfasts": "The Holdfasts",
    "Cavia": "Cavia",
    "The Hex": "The Hex",
}


def get_reward_cards(page_title):
    html = fetch_rendered(page_title)
    if not html:
        return None
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.find_all("div", style=re.compile(r"width:150px;\s*height:150px"))
    results = {}
    for c in cards:
        p = c.find("p")
        price = p.get_text(" ", strip=True) if p else None
        divs = c.find_all("div", recursive=False)
        name = divs[-1].get_text(" ", strip=True) if divs else None
        if name and price:
            results[name] = price
    return results


def main():
    unresolved_path = OUT / "Sigils_staged.json"
    rows = json.load(open(unresolved_path))

    resolved = 0
    price_lookup_cache = {}
    updated_rows = []
    for r in rows:
        if r["kind"] != "unconfirmed" or r["section"] not in SYNDICATE_PAGES:
            updated_rows.append(r)
            continue

        page_title = SYNDICATE_PAGES[r["section"]]
        if page_title not in price_lookup_cache:
            print(f"Fetching {page_title}...")
            price_lookup_cache[page_title] = get_reward_cards(page_title) or {}
        prices = price_lookup_cache[page_title]

        # The Sigils page often omits the "Sigil" suffix ("Defiance") while
        # the syndicate's own reward cards include it ("Defiance Sigil") -
        # try both forms before giving up.
        item_name = r["item"]
        price = prices.get(item_name) or prices.get(f"{item_name} Sigil")
        if price:
            text = f"Purchased from {r['section']} for {price} Standing."
        else:
            text = f"Purchased from {r['section']} for Standing (exact amount not found on the syndicate's page)."

        updated_rows.append({
            **r,
            "kind": "item-specific",
            "text": text,
            "source_url": f"https://wiki.warframe.com/w/{page_title.replace(' ', '_')}#Offerings",
        })
        resolved += 1

    json.dump(updated_rows, open(unresolved_path, "w"), indent=2, ensure_ascii=False)
    print(f"\nResolved {resolved} syndicate sigils.")


if __name__ == "__main__":
    main()
