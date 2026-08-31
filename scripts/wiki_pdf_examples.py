#!/usr/bin/env python3
"""
Proof-of-concept: generate ONE PDF PER ITEM from LIVE RENDERED wiki pages,
saved under the item's own title, so the folder becomes a lookup table:
find the item's name -> open its PDF -> read acquisition info.

Algorithm (per item), matching the user's actual instruction:
  1. ALWAYS try the item's own dedicated wiki page first (exact title match).
     If it exists, render the WHOLE page and save as "<Item Name>.pdf".
     This is the default/common case - most items have their own page,
     even ones that look like they'd only be bundle pieces (e.g. Dreyric
     Fist Skin, which does have its own page - confirmed after wrongly
     assuming otherwise).
  2. ONLY if no dedicated page exists, fall back to extracting this item's
     entry from whatever shared page documents it (e.g. all glyphs live
     on the "Glyph" page), pulling the nearest section heading/context
     paragraph for acquisition info. Still saved as "<Item Name>.pdf".
No fabricated text anywhere - if neither resolves cleanly, it's reported
as unresolved, not guessed at.
"""
import json, subprocess, re
from pathlib import Path
from bs4 import BeautifulSoup

OUT = Path("/var/home/jedwards/kiedas-orbiter/wiki_pdf_examples")
OUT.mkdir(exist_ok=True)
WEASYPRINT = "/var/data/python/bin/weasyprint"


def fetch_rendered(title):
    url = f"https://wiki.warframe.com/api.php?action=parse&page={title.replace(' ', '%20')}&prop=text&format=json"
    r = subprocess.run(["curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "30", url], capture_output=True, text=True)
    d = json.loads(r.stdout)
    if "error" in d:
        return None
    return d["parse"]["text"]["*"]


def html_to_pdf(html_fragment, out_path, title_note=""):
    doc = f"""<html><head><meta charset="utf-8">
<base href="https://wiki.warframe.com/">
<style>
body {{ font-family: sans-serif; padding: 20px; }}
.source-note {{ background:#eef; border:1px solid #99c; padding:8px; margin-bottom:16px; font-size:12px; }}
</style>
</head><body>
<div class="source-note">{title_note}</div>
{html_fragment}
</body></html>"""
    tmp_html = out_path.with_suffix(".html")
    tmp_html.write_text(doc, encoding="utf-8")
    r = subprocess.run([WEASYPRINT, str(tmp_html), str(out_path)], capture_output=True, text=True)
    tmp_html.unlink()
    return out_path.exists()


def safe_filename(item_name):
    return re.sub(r'[/\\:*?"<>|]', "_", item_name)


def extract_from_glyph_page(glyph_display_name):
    """Fallback extraction for glyphs, which have no dedicated pages."""
    html = fetch_rendered("Glyph")
    if not html:
        return None
    soup = BeautifulSoup(html, "html.parser")

    target = None
    for div in soup.find_all("div", class_="glyphBox"):
        text = div.get_text(" ", strip=True)
        if glyph_display_name.lower() in text.lower():
            target = div
            break
    if target is None:
        return None

    context_heading = target.find_previous(["h2", "h3"])
    tab_parent = target.find_parent(attrs={"data-title": True})
    tab_title = tab_parent.get("data-title", "").strip() if tab_parent else None

    context_paras = []
    if context_heading:
        for el in context_heading.find_all_next():
            if el.name in ("h2", "h3"):
                break
            if el.name == "p" and el.get_text(strip=True):
                context_paras.append(el)
            if len(context_paras) >= 3:
                break

    fragment_parts = []
    if context_heading:
        fragment_parts.append(str(context_heading))
    if tab_title:
        fragment_parts.append(f"<p><b>Sub-section: {tab_title}</b></p>")
    for p in context_paras:
        fragment_parts.append(str(p))
    fragment_parts.append(str(target))

    note = (f"SOURCE: https://wiki.warframe.com/w/Glyph (live rendered page) — "
            f"this item has NO dedicated wiki page; it is one entry among hundreds "
            f"on the shared 'Glyph' page. Showing the extracted entry plus its "
            f"nearest section heading/context paragraph for acquisition info.")
    return "\n".join(fragment_parts), note


# Known shared pages to try as fallbacks, by item-type hint. Extend this
# table as more shared-page types are discovered during the real run.
SHARED_PAGE_RESOLVERS = {
    "glyph": extract_from_glyph_page,
}


def resolve_item(item_name, type_hint=None):
    """
    Try the item's own page first. Only fall back to a shared-page
    extractor if that fails AND a type_hint tells us where to look.
    Returns True/False for success; writes "<item_name>.pdf" into OUT.
    """
    out_path = OUT / f"{safe_filename(item_name)}.pdf"

    html = fetch_rendered(item_name)
    if html:
        note = f"SOURCE: https://wiki.warframe.com/w/{item_name.replace(' ', '_')} (live rendered page, own dedicated page)"
        ok = html_to_pdf(html, out_path, note)
        print(f"[OWN PAGE] {'OK' if ok else 'FAIL'}: {item_name} -> {out_path.name}")
        return ok

    if type_hint and type_hint in SHARED_PAGE_RESOLVERS:
        result = SHARED_PAGE_RESOLVERS[type_hint](item_name)
        if result:
            fragment_html, note = result
            ok = html_to_pdf(fragment_html, out_path, note)
            print(f"[SHARED PAGE:{type_hint}] {'OK' if ok else 'FAIL'}: {item_name} -> {out_path.name}")
            return ok

    print(f"[UNRESOLVED] {item_name}: no dedicated page found, no working fallback for hint={type_hint!r}")
    return False


if __name__ == "__main__":
    print("=== Item with its own dedicated page (previously wrongly assumed to be bundle-only) ===")
    resolve_item("Dreyric Fist Skin")

    print("\n=== Item with NO dedicated page -> extracted from shared 'Glyph' page ===")
    resolve_item("Ash Koga Glyph", type_hint="glyph")

    print("\n=== Item with NO dedicated page and no known shared-page resolver yet (reported, not guessed) ===")
    resolve_item("Alastorn Shoulder Plates")

    print("\nDone. Files in:", OUT)
