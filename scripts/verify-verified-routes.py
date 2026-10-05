#!/usr/bin/env python3
"""Verify one Phase 2 verified-routes group against the local wiki archive."""

from __future__ import annotations

import argparse
import collections
import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCOPE = ROOT / "docs/agent-context/briefs-2026-10-03/data/zero-resources.json"
DEFAULT_ARCHIVE = Path("/home/jedwards/kiedas-orbiter/wiki_pdf_archive")
ALLOWED_KINDS = {"drop", "vendor", "market", "quest", "event", "crafting", "reward", "not_obtainable"}
HISTORY = re.compile(r"(?:\b\d{4}\b|\bUpdate\s+\d+\b|originally|formerly|first available|previously|returned)", re.I)
INVALID_FILENAME_CHARS = re.compile(r'[/\\:*?"<>|]')


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def archive_filename(title: str) -> str:
    return INVALID_FILENAME_CHARS.sub("_", title) + ".pdf"


def archive_title_map(archive: Path) -> tuple[dict[str, Path], list[str]]:
    titles = json.loads((archive / "_titles.json").read_text(encoding="utf-8"))
    exact: dict[str, Path] = {}
    folded: dict[str, Path] = {}
    missing: list[str] = []
    pdfs = list(archive.glob("*.pdf"))
    for title in titles:
        candidate = archive / archive_filename(title)
        if candidate.exists():
            exact[title] = candidate
            folded[title.casefold()] = candidate
        else:
            fallback = next((path for path in pdfs if path.name.casefold() == candidate.name.casefold()), None)
            if fallback:
                exact[title] = fallback
                folded[title.casefold()] = fallback
            else:
                missing.append(title)
    return exact | folded, missing


def page_text(page: str, archive: Path, cache: Path, title_map: dict[str, Path]) -> str:
    safe_cache = cache / (archive_filename(page)[:-4] + ".txt")
    legacy_cache = cache / (page.replace("/", "_") + ".txt")
    cached = safe_cache if safe_cache.exists() else legacy_cache
    if cached.exists():
        return norm(cached.read_text(encoding="utf-8", errors="ignore"))
    pdf = title_map.get(page) or title_map.get(page.casefold())
    if not pdf:
        candidate = archive / archive_filename(page)
        pdf = candidate if candidate.exists() else None
    if not pdf:
        raise AssertionError(f"missing cited archive page: {page}")
    text = norm(" ".join(p.extract_text() or "" for p in PdfReader(pdf).pages))
    cache.mkdir(parents=True, exist_ok=True)
    safe_cache.write_text(text, encoding="utf-8")
    return text


def check(scope_path: Path, resolved_path: Path, unresolved_path: Path, archive: Path) -> dict:
    scope = json.loads(scope_path.read_text(encoding="utf-8"))
    resolved = json.loads(resolved_path.read_text(encoding="utf-8"))
    unresolved = json.loads(unresolved_path.read_text(encoding="utf-8"))
    expected = {item["uniqueName"]: item["name"] for item in scope}
    assert set(resolved) | set(unresolved) == set(expected), "scope is not complete"
    assert not (set(resolved) & set(unresolved)), "item appears in both outputs"
    assert len(expected) == len(scope), "scope contains duplicate uniqueName values"

    kinds = collections.Counter()
    examples = []
    cache = ROOT / "scratch/pdf-txt"
    title_map, unmapped_titles = archive_title_map(archive)
    for unique, entry in resolved.items():
        assert entry.get("name") == expected[unique], f"wrong name for {unique}"
        routes = entry.get("routes")
        assert isinstance(routes, list) and routes, f"no routes for {unique}"
        for item_route in routes:
            assert item_route.get("kind") in ALLOWED_KINDS, f"bad kind for {unique}"
            text = item_route.get("text")
            assert isinstance(text, str) and 0 < len(text) <= 200, f"bad route text for {unique}"
            assert not HISTORY.search(text), f"history in route text for {unique}: {text}"
            assert not re.search(r"[=|{}]", text), f"template residue in route text for {unique}"
            assert isinstance(item_route.get("place"), str) and item_route["place"].strip(), f"missing place for {unique}"
            src = item_route.get("source")
            assert isinstance(src, dict), f"missing source for {unique}"
            assert src.get("archive") == "wiki_pdf_archive", f"wrong archive for {unique}"
            page = src.get("page")
            assert isinstance(page, str) and page, f"missing source page for {unique}"
            expected_url = "https://wiki.warframe.com/w/" + page.replace(" ", "_")
            assert src.get("url") == expected_url, f"wrong source URL for {unique}"
            quote = src.get("quote")
            assert isinstance(quote, str) and quote.strip(), f"missing quote for {unique}"
            text_source = page_text(page, archive, cache, title_map)
            assert norm(quote) in text_source, f"quote not found on {page} for {unique}"
            kinds[item_route["kind"]] += 1
            if len(examples) < 15:
                examples.append({"item": entry["name"], "quote": quote, "text": text})

    reasons = collections.Counter(entry.get("reason", "") for entry in unresolved.values())
    for unique, entry in unresolved.items():
        assert entry.get("name") == expected[unique], f"wrong unresolved name for {unique}"
        assert entry.get("reason"), f"missing unresolved reason for {unique}"
        pages = entry.get("pagesChecked")
        assert isinstance(pages, list), f"pagesChecked must be a list for {unique}"  # unresolved entries make no claim; an empty list means no single page was cited
        for page in pages:
            page_text(page, archive, cache, title_map)
    return {"items": len(scope), "resolved": len(resolved), "unresolved": len(unresolved), "kinds": kinds, "reasons": reasons, "examples": examples}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", default="resources")
    parser.add_argument("--scope", type=Path, default=None)
    parser.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    args = parser.parse_args()
    resolved = ROOT / f"src-tauri/data/assets/data/verified-routes.{args.group}.json"
    unresolved = ROOT / f"src-tauri/data/assets/data/verified-routes.{args.group}.unresolved.json"
    scope = args.scope or ROOT / f"docs/agent-context/briefs-2026-10-03/data/zero-{args.group}.json"
    result = check(scope, resolved, unresolved, args.archive)
    print(f"items={result['items']} resolved={result['resolved']} unresolved={result['unresolved']}")
    print("routes per kind:", dict(result["kinds"]))
    print("top unresolved reasons:", result["reasons"].most_common())
    print("15 examples:")
    for example in result["examples"]:
        print(json.dumps(example, ensure_ascii=False))


if __name__ == "__main__":
    main()
