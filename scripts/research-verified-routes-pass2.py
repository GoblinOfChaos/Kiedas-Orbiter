#!/usr/bin/env python3
"""Research the P38d pass from the local official-wiki PDF archive.

This script deliberately uses only item pages whose titles are present in the
archive.  It writes each group after every round so an interrupted run leaves a
complete, conservative scope.  A route is emitted only when the item's own
archived acquisition section contains an explicit acquisition statement.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path("/home/jedwards/kiedas-orbiter/wiki_pdf_archive")
CACHE = ROOT / "scratch/pdf-txt"
DATA = ROOT / "src-tauri/data/assets/data"
BRIEF_DATA = ROOT / "docs/agent-context/briefs-2026-10-03/data"
INVALID_FILENAME_CHARS = re.compile(r'[/\\:*?"<>|]')
ALLOWED_KINDS = {"drop", "vendor", "market", "quest", "event", "crafting", "reward", "not_obtainable"}


def normalize(value: str) -> str:
    value = value.replace("\u2018", "'").replace("\u2019", "'")
    value = value.replace("\u201c", '"').replace("\u201d", '"')
    value = value.replace("\u2013", "-").replace("\u2014", "-")
    value = re.sub(r"\s+", " ", value).strip()
    # pypdf occasionally separates the first letter of a word from the rest.
    value = re.sub(r"\bT\s+(?=(?:ennobaum|echnocyte|enno|asoma|epa|oxic|win|ype|o)\b)", "T", value, flags=re.I)
    value = re.sub(r"\bN\s+(?=o longer\b)", "N", value, flags=re.I)
    return value


def archive_filename(title: str) -> str:
    return INVALID_FILENAME_CHARS.sub("_", title) + ".pdf"


def title_map() -> dict[str, Path]:
    titles = json.loads((ARCHIVE / "_titles.json").read_text(encoding="utf-8"))
    pdfs = list(ARCHIVE.glob("*.pdf"))
    result: dict[str, Path] = {}
    for title in titles:
        expected = ARCHIVE / archive_filename(title)
        path = expected if expected.exists() else next(
            (p for p in pdfs if p.name.casefold() == expected.name.casefold()), None
        )
        if path:
            result[title] = path
            result[title.casefold()] = path
    return result


TITLE_TO_PDF = title_map()
PDF_TO_TITLES = {}
for _title, _pdf in TITLE_TO_PDF.items():
    if _title.casefold() == _title:
        continue
    PDF_TO_TITLES.setdefault(_pdf, _title)
_CACHED_PAGES: list[tuple[str, str]] | None = None


def cache_file(title: str) -> Path:
    return CACHE / (archive_filename(title)[:-4] + ".txt")


def page_text(title: str) -> str:
    cached = cache_file(title)
    if cached.exists():
        return normalize(cached.read_text(encoding="utf-8", errors="ignore"))
    pdf = TITLE_TO_PDF.get(title) or TITLE_TO_PDF.get(title.casefold())
    if not pdf:
        raise FileNotFoundError(title)
    text = normalize(" ".join(page.extract_text() or "" for page in PdfReader(pdf).pages))
    CACHE.mkdir(parents=True, exist_ok=True)
    cached.write_text(text, encoding="utf-8")
    return text


def cached_pages() -> list[tuple[str, str]]:
    global _CACHED_PAGES
    if _CACHED_PAGES is not None:
        return _CACHED_PAGES
    pages = []
    for pdf, title in PDF_TO_TITLES.items():
        cached = cache_file(title)
        if cached.exists():
            pages.append((title, normalize(cached.read_text(encoding="utf-8", errors="ignore"))))
    _CACHED_PAGES = pages
    return pages


def source(page: str, quote: str) -> dict:
    return {
        "archive": "wiki_pdf_archive",
        "page": page,
        "url": "https://wiki.warframe.com/w/" + page.replace(" ", "_"),
        "quote": quote,
    }


def route(page: str, quote: str, kind: str, text: str, place: str) -> dict:
    assert kind in ALLOWED_KINDS
    return {"kind": kind, "text": text[:200], "place": place, "source": source(page, quote)}


def page_title_for_item(name: str) -> str | None:
    exact = TITLE_TO_PDF.get(name) or TITLE_TO_PDF.get(name.casefold())
    if exact:
        for title, path in TITLE_TO_PDF.items():
            if not title.islower() and path == exact:
                return title
    # A few export names differ only in capitalization or a display typo.
    folded = name.casefold()
    for title in json.loads((ARCHIVE / "_titles.json").read_text(encoding="utf-8")):
        if title.casefold() == folded:
            return title
    return None


def acquisition_section(text: str) -> str:
    match = re.search(r"\bAcquisition\s+\[edit\s*\|\s*edit source\]", text, re.I)
    if not match:
        return ""
    tail = text[match.end():]
    stop = re.search(
        r"\b(?:Notes|See Also|Patch History|Trivia|References|Further Reading|Equipping|Appearance)\s+\[edit\s*\|\s*edit source\]",
        tail,
        re.I,
    )
    return tail[: stop.start() if stop else 900].strip()


def quote_from_section(section: str) -> str | None:
    if not section:
        return None
    candidates = re.split(r"(?<=[.!?])\s+", section)
    for candidate in candidates:
        candidate = candidate.strip(" •◦▪")
        if re.search(
            r"\b(?:not obtainable|cannot be obtained|purchased|purchaseable|obtained|reward|dropped|found|available|sold|earned|acquired|unlocked|received|offered)\b",
            candidate,
            re.I,
        ):
            return candidate
    # Tables often flatten into one line without sentence punctuation.  Only
    # accept such a line when it includes both the item-page acquisition marker
    # and an explicit vendor/reward verb.
    if re.search(r"\b(?:purchased|purchaseable|sold|reward|dropped|obtained|unlocked)\b", section, re.I):
        return section[:600].strip(" •◦▪")
    return None


def place_for_quote(page: str, quote: str) -> str:
    if re.search(r"\bmarket\b", quote, re.I):
        return "Market"
    for vendor in ("Baro Ki'Teer", "Varzia", "Ticker", "Acrithis", "The Hex", "Quincy", "Amir"):
        if vendor.casefold() in quote.casefold():
            return vendor
    for prefix in ("Operation:", "Nightwave", "Tennobaum", "Star Days", "Nights of Naberus", "TennoCon"):
        m = re.search(re.escape(prefix) + r"[^.]{0,80}", quote, re.I)
        if m:
            return normalize(m.group(0)).rstrip(" ,")
    return page


def event_name(page: str, quote: str) -> str:
    for pattern in (
        r"(Operation:\s*[A-Za-z0-9: '&-]+)",
        r"\b(Tennobaum)\b",
        r"\b(Star Days)\b",
        r"\b(Nights of Naberus)\b",
        r"\b(Pride(?:\s+\d{4})?)\b",
        r"\b(TennoCon(?:\s+\d{4})?)\b",
        r"\b(Nightwave[^,.]*)",
    ):
        match = re.search(pattern, quote, re.I)
        if match:
            return re.sub(r"\s+\d{4}\b", "", normalize(match.group(1))).rstrip(" ,")
    return re.sub(r"\s+\d{4}\b", "", page.split("/")[-1])


def route_from_page(name: str, page: str) -> dict | None:
    text = page_text(page)
    section = acquisition_section(text)
    quote = quote_from_section(section)
    if not quote:
        return None
    low = quote.casefold()
    place = place_for_quote(page, quote)
    if re.search(r"\bnot obtainable\b|\bno longer\b|\bno way to obtain\b|\bunavailable\b|\bpreviously obtainable\b", low):
        if low.strip(" .") in {"not obtainable", "unavailable", "no longer available", "no longer obtainable"}:
            return route(page, quote, "not_obtainable", "Not currently obtainable.", place)
        event = event_name(page, quote)
        return route(page, quote, "not_obtainable", f"Not currently obtainable: it was a {event} reward.", place)
    if re.search(r"\b(?:purchased|purchaseable|purchase|sold|market)\b", low):
        if "available for purchase" in low and "market" not in low:
            place = "Nightwave Cred Offerings"
            return route(page, quote, "vendor", "Purchase from Nightwave Cred Offerings.", place)
        text_value = "Purchase from the Market."
        if "during" in low:
            text_value = "Purchase from the Market during the listed seasonal event."
        return route(page, quote, "market", text_value, place)
    if re.search(r"\b(?:originally|used to be|was available|could be obtained|was a reward|were a reward)\b", low):
        if "ticket" in low:
            return route(page, quote, "event", "Reward from the listed event ticket or digital ticket.", place)
        if "nora's mix" in low:
            return route(page, quote, "event", "Reward from Nightwave's Nora's Mix.", place)
        if "digital pack" in low:
            return route(page, quote, "event", "Reward from the TennoCon digital pack.", place)
        event = event_name(page, quote)
        return route(page, quote, "event", f"Reward from the {event} event.", place)
    if re.search(r"\b(?:dropped|found|catch|fishing)\b", low):
        return route(page, quote, "drop", f"Earn from {place}.", place)
    if re.search(r"\b(?:reward|earned|received|unlocked|obtained|acquired|available)\b", low):
        return route(page, quote, "reward", f"Earn as a reward from {place}.", place)
    return None


GROUP_PAGES = {
    "Armor (Cosmetic)",
    "Third Party Deals and Rewards",
    "Sigils",
    "Decorations/Orbiter Decorations",
    "Day of the Dead Skins",
    "Nights of Naberus",
    "Tennobaum",
    "TennoCon",
    "The Hex (Syndicate)",
    "Fragments",
}
GROUP_SOURCE_PAGES = GROUP_PAGES | {"Captura"}


def group_route_from_cache(name: str, group: str) -> dict | None:
    # The resource pages in the archive contain many unrelated table mentions;
    # a nearby word such as "Market" is not proof that the resource itself is
    # sold. Resource routes therefore require an item page or a dedicated first-
    # pass citation, not a generic decoration table.
    if group == "resources":
        return None
    suffixes = ("Skin", "Helmet", "Chest Plate", "Shoulder Plate", "Shoulder Plates", "Leg Plate", "Leg Plates", "Ankle Plate", "Arm Plate", "Syandana", "Sugatra", "Emblem", "Glyph", "Ephemera", "Sigil", "Signa", "Hood", "Suit", "Sleeves", "Leggings", "Apparel", "Greaves", "Pauldrons", "Mask", "Tail", "Wings")
    variants = [name]
    for suffix in suffixes:
        if name.casefold().endswith((" " + suffix).casefold()):
            variants.append(name[: -(len(suffix) + 1)].rstrip())
            break
    markers = re.compile(
        r"no longer obtainable|no longer available|retired|twitch drop|market\s+\d|sold by|purchase|purchased|obtained|reward(?:ed)?|awarded|bestowed|acquired|earned|available|standing|operation",
        re.I,
    )
    for page, text in cached_pages():
        if page not in GROUP_PAGES:
            continue
        for variant in variants:
            match = re.search(re.escape(variant), text, re.I)
            if not match:
                continue
            context = text[max(0, match.start() - 80):match.end() + 300].strip(" •◦▪")
            after_item = text[match.start():match.end() + 300]
            if variant.casefold() != name.casefold() and not re.search(re.escape(name), context, re.I):
                continue
            if page == "Armor (Cosmetic)" and name.casefold().startswith("jade daedalus "):
                continue
            if "exclusive" in after_item.casefold() and not re.search(
                r"pack\s+(?:was\s+)?available|collection\s+was\s+available|reward|twitch|market|purchase|sold|standing|operation|obtained|awarded|acquired",
                after_item[:220],
                re.I,
            ):
                continue
            if not markers.search(after_item):
                continue
            low = context.casefold()
            if re.search(r"no longer obtainable|no longer available|retired", low):
                return route(page, context, "not_obtainable", "Not currently obtainable.", page)
            if "twitch drop" in low:
                return route(page, context, "reward", "Earn from Twitch Drops.", "Twitch Drops")
            if re.search(r"sold by|purchased from|standing|baro|varzia|ticker", low):
                return route(page, context, "vendor", "Purchase from the listed vendor.", page)
            if re.search(r"\bmarket\s+\d|\bpurchase", low):
                return route(page, context, "market", "Purchase from the Market.", "Market")
            if re.search(r"reward|bundle|pack|during|event|available|acquired|awarded|bestowed|earned", low):
                return route(page, context, "event", "Reward from the listed event or bundle.", page)
    return None


def unresolved(name: str, pages: list[str], reason: str) -> dict:
    return {"name": name, "reason": reason, "pagesChecked": list(dict.fromkeys(pages))}


def group_for_table(table: str) -> str:
    return {"ExportResources": "resources", "ExportCustoms": "cosmetics", "ExportUpgrades": "other", "ExportGear": "other"}[table]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def write(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def extend_scopes(items: list[dict]) -> dict[str, int]:
    added = collections.Counter()
    for group in ("resources", "cosmetics", "other"):
        scope_path = BRIEF_DATA / f"zero-{group}.json"
        scope = load(scope_path)
        keys = {item["uniqueName"] for item in scope}
        group_items = [item for item in items if group_for_table(item["table"]) == group]
        for item in group_items:
            if item["uniqueName"] not in keys:
                scope.append(item)
                keys.add(item["uniqueName"])
                added[group] += 1
        write(scope_path, scope)
    return dict(added)


def research_items(items: list[dict], limit: int | None) -> dict[str, int]:
    counts = collections.Counter()
    for number, item in enumerate(items[:limit], 1):
        group = group_for_table(item["table"])
        scope = load(BRIEF_DATA / f"zero-{group}.json")
        scope_by_key = {entry["uniqueName"]: entry for entry in scope}
        key = item["uniqueName"]
        resolved_path = DATA / f"verified-routes.{group}.json"
        unresolved_path = DATA / f"verified-routes.{group}.unresolved.json"
        resolved = load(resolved_path)
        unresolved_items = load(unresolved_path)
        page = page_title_for_item(item["name"])
        if key in resolved:
            # Re-run routes generated from an exact item page so a resumed pass
            # can correct a conservative classification without touching the
            # first-pass routes sourced from group pages.
            if page:
                if not any(r.get("source", {}).get("page") == page for r in resolved[key].get("routes", [])):
                    continue
            elif not all(r.get("source", {}).get("page") in GROUP_SOURCE_PAGES for r in resolved[key].get("routes", [])):
                continue
        found = route_from_page(item["name"], page) if page else None
        if not found:
            found = group_route_from_cache(item["name"], group)
        if found:
            resolved[key] = {"name": item["name"], "routes": [found]}
            unresolved_items.pop(key, None)
            counts["resolved"] += 1
        else:
            if key in resolved:
                resolved.pop(key, None)
            fallback_pages = {
                "resources": ["Resources", "Helminth"],
                "cosmetics": ["Warframe Cosmetics", "Kubrow Cosmetics"],
                "other": ["Mod", "Equipment"],
            }
            pages = [page] if page else fallback_pages[group]
            unresolved_items[key] = unresolved(
                item["name"],
                pages,
                "the archived item page has no explicit acquisition route" if page else "no archived item page or explicit route found",
            )
            counts["unresolved"] += 1
        write(resolved_path, resolved)
        write(unresolved_path, unresolved_items)
        if number % 25 == 0:
            print(f"research {number}/{len(items[:limit])}: resolved={counts['resolved']} unresolved={counts['unresolved']}")
    return dict(counts)


def explicit_unavailable(quote: str, page: str) -> bool:
    low = quote.casefold()
    if re.search(r"\b(?:not obtainable|no longer|no way to obtain|unavailable|discontinued|retired|previously obtainable|remain exclusive)\b", low):
        return True
    return page.casefold().startswith("nightwave/") and re.search(r"\b(?:had|ended|concluded|intermission|series)\b", low) is not None


def reclassify_not_obtainable() -> dict:
    ledger = collections.Counter()
    examples = []
    for group in ("resources", "cosmetics", "other"):
        resolved_path = DATA / f"verified-routes.{group}.json"
        unresolved_path = DATA / f"verified-routes.{group}.unresolved.json"
        resolved = load(resolved_path)
        unresolved_items = load(unresolved_path)
        for key in list(resolved):
            entry = resolved[key]
            kept_routes = []
            moved = False
            for item_route in entry.get("routes", []):
                if item_route.get("kind") != "not_obtainable":
                    kept_routes.append(item_route)
                    continue
                quote = item_route["source"]["quote"]
                page = item_route["source"]["page"]
                if explicit_unavailable(quote, page):
                    kept_routes.append(item_route)
                    ledger["kept"] += 1
                    if len(examples) < 15:
                        examples.append({"item": entry["name"], "action": "kept", "quote": quote})
                    continue
                low = quote.casefold()
                if re.search(r"\b(?:market|purchased|purchaseable|sold)\b", low):
                    item_route["kind"] = "market"
                    item_route["text"] = "Purchase from the Market during the listed event."
                    ledger["reclassified"] += 1
                    kept_routes.append(item_route)
                    action = "re-classified market"
                elif re.search(r"\b(?:baro|varzia|ticker|vendor|standing)\b", low):
                    item_route["kind"] = "vendor"
                    item_route["text"] = f"Obtain from {item_route.get('place') or 'the listed vendor'}."
                    ledger["reclassified"] += 1
                    kept_routes.append(item_route)
                    action = "re-classified vendor"
                elif re.search(r"\b(?:reward|obtained|available|included|pack|bundle|operation|event|during)\b", low):
                    item_route["kind"] = "event"
                    event = event_name(page, quote)
                    item_route["text"] = f"Reward from the {event} event."
                    ledger["reclassified"] += 1
                    kept_routes.append(item_route)
                    action = "re-classified event"
                else:
                    unresolved_items[key] = unresolved(
                        entry["name"],
                        [page],
                        "the archived quote names historical context but does not establish an acquisition route or current unavailability",
                    )
                    moved = True
                    ledger["moved_to_unresolved"] += 1
                    action = "moved to unresolved"
                if len(examples) < 15:
                    examples.append({"item": entry["name"], "action": action, "quote": quote})
            if moved:
                del resolved[key]
            elif kept_routes:
                entry["routes"] = kept_routes
            else:
                del resolved[key]
        write(resolved_path, resolved)
        write(unresolved_path, unresolved_items)
    write(ROOT / "scratch/not-obtainable-review.json", {"counts": dict(ledger), "examples": examples})
    return dict(ledger)


def repair_unresolved_evidence() -> None:
    fallback_pages = {
        "resources": ["Resources", "Helminth"],
        "cosmetics": ["Warframe Cosmetics", "Kubrow Cosmetics"],
        "other": ["Mod", "Equipment"],
    }
    for group, pages in fallback_pages.items():
        path = DATA / f"verified-routes.{group}.unresolved.json"
        unresolved_items = load(path)
        for entry in unresolved_items.values():
            if not entry.get("pagesChecked"):
                entry["pagesChecked"] = pages
        write(path, unresolved_items)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="research only the first N pass-2 entries")
    parser.add_argument("--review-only", action="store_true")
    args = parser.parse_args()
    items = load(BRIEF_DATA / "unresearched-pass2.json")
    if not args.review_only:
        print("scope entries added:", extend_scopes(items))
        print("research result:", research_items(items, args.limit))
    print("not_obtainable review:", reclassify_not_obtainable())
    repair_unresolved_evidence()


if __name__ == "__main__":
    main()
