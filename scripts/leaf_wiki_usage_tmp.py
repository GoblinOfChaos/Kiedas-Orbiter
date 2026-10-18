#!/usr/bin/env python3
"""Temporary throttled image-usage resolver for exact leaf image hits."""

from __future__ import annotations

import json
import re
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


SIDE_CAR = Path("/tmp/wiki-acq-search/leaf-wiki-hits.json")
API = "https://wiki.warframe.com/api.php"
WORKERS = 3
MIN_REQUEST_INTERVAL = 0.20
_rate_lock = threading.Lock()
_next_request_at = 0.0


def get_json(params: dict[str, str | int]) -> dict:
    global _next_request_at
    with _rate_lock:
        wait = max(0.0, _next_request_at - time.monotonic())
        if wait:
            time.sleep(wait)
        _next_request_at = time.monotonic() + MIN_REQUEST_INTERVAL
    request = urllib.request.Request(
        API + "?" + urllib.parse.urlencode(params),
        headers={"User-Agent": "Kiedas-Orbiter acquisition source audit/2026-10-16"},
    )
    last_error = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except Exception as error:
            last_error = error
            time.sleep(attempt + 1)
    raise RuntimeError(f"{type(last_error).__name__}: {last_error}")


def candidate_files(row: dict) -> list[str]:
    leaf = row["leaf"].casefold()
    exact = []
    near = []
    for image in row["allimages"]:
        name = image.get("name", "")
        stem = re.sub(r"\.[^.]+$", "", name).casefold()
        if stem == leaf:
            exact.append(image["title"])
        elif stem.startswith(leaf) and re.fullmatch(r"[a-z0-9]", stem[len(leaf) :]):
            near.append(image["title"])
    return exact or near


def resolve(title: str) -> dict:
    try:
        payload = get_json(
            {
                "action": "query",
                "list": "imageusage",
                "iutitle": title,
                "iunamespace": 0,
                "iulimit": 50,
                "format": "json",
                "formatversion": 2,
            }
        )
        return {"title": title, "usage": payload.get("query", {}).get("imageusage", []), "errors": []}
    except Exception as error:
        return {"title": title, "usage": [], "errors": [str(error)]}


def main() -> None:
    payload = json.loads(SIDE_CAR.read_text())
    titles = sorted({title for row in payload["rows"] for title in candidate_files(row)})
    print(f"Resolving usage for {len(titles)} exact/near-exact files", flush=True)
    usage = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(resolve, title): title for title in titles}
        for completed, future in enumerate(as_completed(futures), 1):
            title = futures[future]
            usage[title] = future.result()
            if completed % 20 == 0 or completed == len(titles):
                print(f"completed {completed}/{len(titles)}", flush=True)
    for row in payload["rows"]:
        row["candidateFiles"] = candidate_files(row)
        row["imageUsage"] = [usage[title] for title in row["candidateFiles"]]
    payload["queryPolicy"]["imageusage"] = "list=imageusage&iutitle=<exact-or-near-exact-file>&iunamespace=0&iulimit=50"
    SIDE_CAR.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(f"updated {SIDE_CAR}", flush=True)


if __name__ == "__main__":
    main()
