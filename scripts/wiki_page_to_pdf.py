#!/usr/bin/env python3
"""
Render a single wiki page (by exact title) to PDF, with:
- all collapsible sections and tabber tabs forced open (nothing hidden
  behind a click, since PDFs can't be clicked)
- image galleries stripped down to plain text lines (name + price only,
  no grid layout) - this is the actual acquisition data we need, and
  avoids the whole class of grid/indentation bugs from trying to
  visually replicate the wiki's image-grid CSS
"""
import json, subprocess, re
from pathlib import Path
from urllib.parse import quote
from bs4 import BeautifulSoup

WEASYPRINT = "/var/data/python/bin/weasyprint"


def fetch_rendered(title):
    # quote() (not a plain space->%20 replace) is required for titles with
    # accented characters or "&" (e.g. "Höllvania", "Fables & Frontiers") -
    # those were silently failing (non-JSON response -> JSONDecodeError)
    # in the overnight archive build (30/10822 pages) until this fix.
    url = f"https://wiki.warframe.com/api.php?action=parse&page={quote(title)}&prop=text&format=json"
    r = subprocess.run(["curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "30", url], capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
    except json.JSONDecodeError:
        return None
    if "error" in d:
        return None
    return d["parse"]["text"]["*"]


def gallerybox_to_text(box):
    """
    Extract a gallerybox's name + price as clean text.

    MediaWiki renders each price as TWO parallel spans: a CSS-hidden
    "sortkey" span (raw number + currency name, used for table sorting)
    and a visible span (currency icon image + number, no text label).
    A browser only ever shows the visible one - the hidden one exists
    purely for sorting. BeautifulSoup's get_text() doesn't know about
    CSS display:none, so naively calling it walks BOTH spans and prints
    the number twice with no currency label (e.g. "110,000 Credits
    110,000 + 90 90" instead of "110,000 Credits + 90 Ducats"). Fix:
    drop the hidden sortkey spans, and swap each currency icon image for
    its linked page name (Credits/Platinum/Ducats/etc.) so the unit
    survives as text once the image itself is gone.
    """
    node = _clean_gallerytext(box)
    if node is None:
        return ""
    return node.get_text(" ", strip=True)


CURRENCY_LABELS = {"Credits", "Platinum", "Ducats", "Endo", "Standing", "Reputation"}


def clean_element_text(element):
    """
    Same hidden-sortkey-span-removal + currency-icon-to-text-label swap as
    gallerybox_to_text, generalized to any element (e.g. a Skinbox infobox),
    not just a gallerybox. Without this, get_text() on a price field like
    infobox's "Price <icon>165</icon>" duplicates the number (the hidden
    sortkey span AND the visible icon+number both get walked) - e.g. "Price
    165 Platinum 165" instead of "Price 165 Platinum".
    """
    node = BeautifulSoup(str(element), "html.parser")
    for hidden in node.find_all(style=re.compile(r"display:\s*none")):
        hidden.decompose()
    for img in node.find_all("img"):
        parent_a = img.find_parent("a")
        title = parent_a.get("title") if parent_a else None
        if title in CURRENCY_LABELS:
            img.replace_with(f" {title} ")
        else:
            img.decompose()
    return node.get_text(" ", strip=True)


def _clean_gallerytext(box):
    gallerytext = box.find(class_="gallerytext")
    if gallerytext is None:
        return None
    node = BeautifulSoup(str(gallerytext), "html.parser")
    for hidden in node.find_all(style=re.compile(r"display:\s*none")):
        hidden.decompose()
    for img in node.find_all("img"):
        parent_a = img.find_parent("a")
        title = parent_a.get("title") if parent_a else None
        if title in CURRENCY_LABELS:
            # Currency icon (Credits/Platinum/Ducats/...) - the number next
            # to it has no other unit label, so keep the currency name as text.
            img.replace_with(f" {title} ")
        else:
            # Item/character icon etc. - the visible link text right next to
            # it already names the same thing, so just drop the image instead
            # of duplicating that name.
            img.decompose()
    return node


def gallerybox_name_and_note(box):
    """
    Split a gallerybox into (name, note): MediaWiki renders the item's name,
    then a <br/>, then any acquisition note as separate content after it
    (e.g. "Ayatan Chattraka Sculpture<br/><i>Purchased from Nightcap for 75
    Fergolyte</i>"). Splitting on that <br/> boundary is reliable regardless
    of whether the note mentions a currency at all (loot-table resources
    like Fergolyte have no currency icon/keyword to key off of, which is
    why an earlier version of this that keyed off "Credits"/"Platinum"/etc.
    silently misclassified non-monetary rewards as having no info).
    Returns note="" when there's nothing after the name.
    """
    node = _clean_gallerytext(box)
    if node is None:
        return "", ""
    # node is a re-parsed copy of the whole "<div class=gallerytext>...</div>"
    # string, so node.contents is just [that div] - one item, not its
    # children. Descend into the div itself to iterate its actual children.
    container = node.find(class_="gallerytext") or node
    br = container.find("br")
    if br is None:
        return container.get_text(" ", strip=True), ""
    name_parts, note_parts = [], []
    seen_br = False
    for el in list(container.contents):
        if el is br:
            seen_br = True
            continue
        text = el.get_text(" ", strip=True) if hasattr(el, "get_text") else str(el).strip()
        if not text:
            continue
        (note_parts if seen_br else name_parts).append(text)
    return " ".join(name_parts).strip(), " ".join(note_parts).strip()


def flatten_galleries(soup):
    """Replace <ul class="gallery"> image grids with plain <ul> text lists."""
    for gallery in soup.find_all("ul", class_="gallery"):
        new_ul = soup.new_tag("ul")
        for box in gallery.find_all("li", class_="gallerybox"):
            text = gallerybox_to_text(box)
            if text:
                li = soup.new_tag("li")
                li.string = text
                new_ul.append(li)
        gallery.replace_with(new_ul)


def html_to_pdf(html_fragment, out_path, title_note=""):
    doc = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body {{ font-family: sans-serif; padding: 20px; max-width: 900px; color: #111; background: #fff; }}
.source-note {{ background:#eef; border:1px solid #99c; padding:8px; margin-bottom:16px; font-size:12px; }}
a {{ color: #1155cc; }}
table {{ border-collapse: collapse; margin: 10px 0; }}
table, th, td {{ border: 1px solid #ccc; }}
th, td {{ padding: 4px 8px; }}
ul {{ padding-left: 20px; }}
.tab-label {{ font-weight: bold; margin-top: 8px; }}
</style>
</head><body>
<div class="source-note">{title_note}</div>
{html_fragment}
</body></html>"""
    tmp_html = out_path.with_suffix(".html")
    tmp_html.write_text(doc, encoding="utf-8")
    r = subprocess.run([WEASYPRINT, str(tmp_html), str(out_path)], capture_output=True, text=True, timeout=180)
    tmp_html.unlink()
    return out_path.exists(), r.stderr


def render_page(title, out_path):
    html = fetch_rendered(title)
    if not html:
        return False, "no page found"
    soup = BeautifulSoup(html, "html.parser")

    # Force open all collapsible sections - just unwrap the hiding classes,
    # don't add new box styling that could stack/compound.
    for el in soup.find_all(class_=re.compile(r"\bmw-collapsed\b")):
        classes = el.get("class", [])
        el["class"] = [c for c in classes if c != "mw-collapsed"]

    # Tabber: label each tab with its title, drop the JS-driven tab nav strip
    for nav in soup.find_all(class_="tabbernav"):
        nav.decompose()
    for tab in soup.find_all(class_="tabbertab"):
        title_attr = tab.get("data-title")
        if title_attr:
            label = soup.new_tag("p")
            label["class"] = "tab-label"
            label.string = f"[{title_attr}]"
            tab.insert(0, label)

    flatten_galleries(soup)

    note = f"SOURCE: https://wiki.warframe.com/w/{title.replace(' ', '_')} (live rendered page)"
    ok, err = html_to_pdf(str(soup), out_path, note)
    return ok, err


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("usage: wiki_page_to_pdf.py <exact wiki title> <output.pdf>")
        sys.exit(1)
    ok, err = render_page(sys.argv[1], Path(sys.argv[2]))
    print("OK" if ok else f"FAIL: {err}")
