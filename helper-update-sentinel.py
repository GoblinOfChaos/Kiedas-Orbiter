#!/usr/bin/env python3
"""Notify when Sainan publishes a newer warframe-api-helper release asset."""

import json
import subprocess
import sys
import time
import traceback
import urllib.request
from pathlib import Path

from download_helper import (
    API_HELPER_ASSET_NAME,
    API_HELPER_REPO,
    GITHUB_API_HELPER,
    INSTALL_MANIFEST,
)
from paths import DATA_DIR

STATE_FILE = DATA_DIR / "helper-sentinel.state"
LOG_FILE = DATA_DIR / "helper-sentinel.log"
ICON = str(Path.home() / ".local/share/icons/hicolor/scalable/apps/orbiter.svg")
CHECK_INTERVAL = 6 * 3600


def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as handle:
        handle.write(f"[{ts}] {msg}\n")


def _latest_asset():
    asset_name = API_HELPER_ASSET_NAME.get(sys.platform)
    if not asset_name:
        return None
    request = urllib.request.Request(
        GITHUB_API_HELPER,
        headers={
            "User-Agent": "kiedas-orbiter/1.0",
            "Accept": "application/vnd.github+json",
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        release = json.load(response)
    asset = next(
        (candidate for candidate in release.get("assets", [])
         if candidate.get("name") == asset_name),
        None,
    )
    if not asset or not asset.get("digest"):
        raise ValueError(f"release has no verified metadata for {asset_name}")
    return {
        "version": release.get("tag_name", "?"),
        "asset": asset_name,
        "digest": asset["digest"],
    }


def _installed_digest():
    try:
        manifest = json.loads(INSTALL_MANIFEST.read_text())
        return manifest.get("api_helper", {}).get("digest", "")
    except Exception:
        return ""


def notify(title, body):
    try:
        subprocess.run(
            ["notify-send", "-i", ICON, "-u", "normal", "-t", "60000", title, body],
            timeout=5,
        )
        log(f"Notified: {title}")
    except Exception as error:
        log(f"notify-send failed: {error}")


def check_once():
    latest = _latest_asset()
    if latest is None:
        return
    installed = _installed_digest()
    last_notified = STATE_FILE.read_text().strip() if STATE_FILE.exists() else ""
    digest = latest["digest"]
    if digest != installed and digest != last_notified:
        notify(
            "Helper update available",
            f"Sainan published warframe-api-helper {latest['version']}.\n\n"
            "Run: python download_helper.py --force",
        )
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(digest)
        log(f"Update available: {latest['version']} ({digest})")
    else:
        log(
            f"No new helper release (latest={latest['version']}, "
            f"installed={'known' if installed else 'unknown'})"
        )


def main():
    log(f"=== release sentinel started for {API_HELPER_REPO} ===")
    while True:
        try:
            check_once()
        except Exception as error:
            log(f"check failed: {error}\n{traceback.format_exc()}")
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
