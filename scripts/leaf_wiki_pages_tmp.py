#!/usr/bin/env python3
"""Temporary official-wiki page fetcher for leaf-audit evidence pages."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path


API = "https://wiki.warframe.com/api.php"
OUT = Path("/tmp/wiki-acq-search/leaf-wiki-pages.json")
TITLES = [
    "Acrithis",
    "Articula",
    "Baro Ki'Teer",
    "Caliban/Prime",
    "Cephalon Simaris",
    "Conquera",
    "Conservation",
    "Crewman's Boot",
    "Decorations/Orbiter Decorations",
    "Devourer",
    "Drifter/Customization",
    "Floof",
    "Fragments",
    "Gyre/Prime",
    "Hombask",
    "K-Drive",
    "Kinemantik Instant Messenger",
    "Kuria",
    "Marks of Valiance",
    "Mastery Rank",
    "Mesa Heirloom Skin",
    "Nexifera",
    "Nightcap",
    "Noggle",
    "Nokko/Main",
    "Ollie's Crash Course",
    "Onkko",
    "Operator/Customization",
    "Operation: Blood of Perita",
    "Oraxia/Main",
    "Prex Card",
    "Running Late",
    "Sagek Prime",
    "Sigils",
    "Syandana",
    "Temple/Main",
    "Teshin",
    "The Quills",
    "The Steel Path",
    "Thousand-Year Fish",
    "Voruna/Prime",
    "Yareli/Prime",
]


def fetch(titles: list[str]) -> dict:
    params = {
        "action": "query",
        "prop": "revisions",
        "titles": "|".join(titles),
        "rvprop": "ids|timestamp|content",
        "rvslots": "main",
        "redirects": 1,
        "format": "json",
        "formatversion": 2,
    }
    request = urllib.request.Request(
        API + "?" + urllib.parse.urlencode(params),
        headers={"User-Agent": "Kiedas-Orbiter acquisition source audit/2026-10-16"},
    )
    last_error = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except Exception as error:
            last_error = error
            time.sleep(attempt + 1)
    raise RuntimeError(f"{type(last_error).__name__}: {last_error}")


def main() -> None:
    pages = []
    redirects = []
    normalized = []
    for start in range(0, len(TITLES), 20):
        payload = fetch(TITLES[start : start + 20])
        query = payload.get("query", {})
        pages.extend(query.get("pages", []))
        redirects.extend(query.get("redirects", []))
        normalized.extend(query.get("normalized", []))
        print(f"fetched {min(start + 20, len(TITLES))}/{len(TITLES)}", flush=True)
        time.sleep(0.3)
    result = {
        "generatedAt": "2026-10-16",
        "source": API,
        "requestedTitles": TITLES,
        "normalized": normalized,
        "redirects": redirects,
        "pages": pages,
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {OUT}", flush=True)


if __name__ == "__main__":
    main()
