#!/usr/bin/env python3
"""Verify the local-wiki evidence and completeness of a verified-routes job."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_CANDIDATES = (
    Path("/home/jedwards/kiedas-orbiter/wiki_pdf_archive"),
    ROOT / "wiki_pdf_archive",
)
SCOPE_PATH = ROOT / "docs/agent-context/briefs-2026-10-03/data/zero-cosmetics.json"
ROUTES_PATH = ROOT / "src-tauri/data/assets/data/verified-routes.cosmetics.json"
UNRESOLVED_PATH = ROOT / "src-tauri/data/assets/data/verified-routes.cosmetics.unresolved.json"
CACHE_DIR = ROOT / "scratch/pdf-txt"
KINDS = {"drop", "vendor", "market", "quest", "event", "crafting", "reward", "not_obtainable"}
HISTORY_WORDS = re.compile(
    r"\b(?:originally|formerly|first available|returned|previously)\b|\bupdate\s+\d+\b|\b(?:19|20)\d{2}\b",
    re.IGNORECASE,
)


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def page_url(page: str) -> str:
    return "https://wiki.warframe.com/w/" + quote(page.replace(" ", "_"), safe="_'()")


def archive_root() -> Path:
    for candidate in ARCHIVE_CANDIDATES:
        if (candidate / "_titles.json").is_file():
            return candidate
    raise AssertionError("wiki_pdf_archive/_titles.json is not available")


def safe_pdf_name(title: str) -> str:
    return re.sub(r"[/\\:?*\"<>|]", "_", title) + ".pdf"


def page_files(archive: Path) -> dict[str, Path]:
    titles = json.loads((archive / "_titles.json").read_text())
    by_title: dict[str, Path] = {}
    by_folded_file = {path.name.casefold(): path for path in archive.glob("*.pdf")}
    for title in titles:
        exact = archive / safe_pdf_name(title)
        if exact.is_file():
            by_title[title] = exact
            continue
        fallback = by_folded_file.get(safe_pdf_name(title).casefold())
        if fallback:
            by_title[title] = fallback
    return by_title


def page_text(page: str, files: dict[str, Path]) -> str:
    if page not in files:
        raise AssertionError(f"cited page has no archive PDF: {page!r}")
    cache = CACHE_DIR / f"{page}.txt"
    if cache.is_file():
        return cache.read_text()
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover - environment failure
        raise AssertionError("pypdf is required when a page text cache is missing") from exc
    text = "\n".join(part or "" for part in (p.extract_text() for p in PdfReader(files[page]).pages))
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(text)
    return text


def assert_route(route: dict, item_name: str, files: dict[str, Path]) -> None:
    assert isinstance(route, dict), f"{item_name}: route is not an object"
    assert route.get("kind") in KINDS, f"{item_name}: invalid route kind"
    text = route.get("text")
    assert isinstance(text, str) and text.strip(), f"{item_name}: route text is empty"
    assert len(text) <= 200, f"{item_name}: route text is over 200 characters"
    assert not HISTORY_WORDS.search(text), f"{item_name}: route text contains history: {text!r}"
    assert "=" not in text and "{{" not in text and "|" not in text, f"{item_name}: template residue in text"
    assert isinstance(route.get("place"), str) and route["place"].strip(), f"{item_name}: route place is empty"

    source = route.get("source")
    assert isinstance(source, dict), f"{item_name}: source is not an object"
    assert source.get("archive") == "wiki_pdf_archive", f"{item_name}: wrong source archive"
    page = source.get("page")
    assert isinstance(page, str) and page, f"{item_name}: source page is empty"
    assert source.get("url") == page_url(page), f"{item_name}: source URL does not match page title"
    quote_text = source.get("quote")
    assert isinstance(quote_text, str) and quote_text.strip(), f"{item_name}: source quote is empty"
    actual = clean(page_text(page, files))
    assert clean(quote_text) in actual, f"{item_name}: quote is absent from archived page {page!r}"

    if "price" in route:
        price = route["price"]
        assert isinstance(price, dict), f"{item_name}: price is not an object"
        assert isinstance(price.get("amount"), (int, float)) and price["amount"] >= 0, f"{item_name}: invalid price amount"
        assert isinstance(price.get("currency"), str) and price["currency"].strip(), f"{item_name}: invalid price currency"
    if "chance" in route:
        assert isinstance(route["chance"], (int, float)) and 0 <= route["chance"] <= 100, f"{item_name}: invalid chance"


def main() -> int:
    scope = json.loads(SCOPE_PATH.read_text())
    routes = json.loads(ROUTES_PATH.read_text())
    unresolved = json.loads(UNRESOLVED_PATH.read_text())
    scope_by_key = {entry["uniqueName"]: entry for entry in scope}
    scope_keys = set(scope_by_key)
    route_keys = set(routes)
    unresolved_keys = set(unresolved)
    assert len(scope) == 422, f"expected 422 scope entries, got {len(scope)}"
    assert not route_keys & unresolved_keys, "an item appears in both output files"
    assert route_keys | unresolved_keys == scope_keys, "output files do not cover exactly the scope"
    assert len(route_keys) + len(unresolved_keys) == len(scope_keys), "output key count is not complete"

    files = page_files(archive_root())
    for key, entry in routes.items():
        assert key in scope_by_key, f"route key is outside scope: {key}"
        assert entry.get("name") == scope_by_key[key]["name"], f"wrong display name for {key}"
        assert isinstance(entry.get("routes"), list) and entry["routes"], f"{entry.get('name')}: no routes"
        for route in entry["routes"]:
            assert_route(route, entry["name"], files)
    for key, entry in unresolved.items():
        assert key in scope_by_key, f"unresolved key is outside scope: {key}"
        assert entry.get("name") == scope_by_key[key]["name"], f"wrong unresolved name for {key}"
        assert isinstance(entry.get("reason"), str) and entry["reason"].strip(), f"{entry.get('name')}: empty unresolved reason"
        assert isinstance(entry.get("pagesChecked"), list) and all(isinstance(p, str) for p in entry["pagesChecked"]), f"{entry.get('name')}: invalid pagesChecked"

    from collections import Counter

    kinds = Counter(route["kind"] for entry in routes.values() for route in entry["routes"])
    print(f"scope={len(scope)} resolved={len(routes)} unresolved={len(unresolved)}")
    print("routes_per_kind=" + json.dumps(dict(sorted(kinds.items())), sort_keys=True))
    for key, entry in list(routes.items())[:15]:
        route = entry["routes"][0]
        print(json.dumps({"item": entry["name"], "quote": route["source"]["quote"], "text": route["text"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"VERIFY FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
