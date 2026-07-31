#!/usr/bin/env python3
"""
wiki_links.py - shared wiki-link helpers for tabs that don't have a
reliable pre-built wikiaUrl in their data source.

equipment_tabs.py's equipment_status.json carries real wikiaUrl fields
for most items, but wfcd_all_cache.json (used by AYATAN_TAB, EPHEMERA_TAB,
ARCANE_TAB, MOD_COLLECTION_TAB) doesn't - confirmed live 2026-07-21:
Arcanes 0/172 items have wikiaUrl, Skins/Misc (which Ayatan/Ephemera fall
under) are similarly sparse. Rather than leave these as dead "check wiki"
text, build a URL from the item's name using warframe wiki's actual
convention (this is exactly the pattern real wikiaUrl values from
equipment_status.json already follow - e.g. "Vauban Prime" ->
".../w/Vauban%2FPrime", "Ash" -> ".../w/Ash"). Not guaranteed to be
correct for every unusual name (disambiguation pages, nonstandard
titles), but a reasonable best-effort link is better than none.
"""
import subprocess
import time
from urllib.parse import quote

from paths import DATA_DIR

_WIKI_LOG_FILE = DATA_DIR / "wiki-click.log"


def _wiki_log(msg):
    try:
        with open(_WIKI_LOG_FILE, "a") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    except OSError:
        pass


import re

_ROMAN_FIX_RE = re.compile(r"\b(I|Ii|Iii|Iv|Vi|Vii|Viii|Ix)\b")
_ROMAN_FIX_MAP = {
    "I": "I", "Ii": "II", "Iii": "III", "Iv": "IV",
    "Vi": "VI", "Vii": "VII", "Viii": "VIII", "Ix": "IX",
}


def fix_roman_numeral_casing(name: str) -> str:
    """wfcd_all_cache.json's own source data has a real casing bug for
    Roman numerals - confirmed live 2026-07-21: "Conquera Ii Ephemera"
    should read "Conquera II Ephemera" (same for "Conquera Glyph
    Ii/Iii/Iv/Vi/Vii/Viii" etc) - looks like a title-casing pass was
    applied to the raw data at some point upstream (WFCD's export, not
    our own code) that mangled already-correct Roman numerals. Fixing
    display names here rather than patching the data file directly,
    since wfcd_all_cache.json gets refreshed from upstream periodically
    and a direct edit would just be overwritten."""
    return _ROMAN_FIX_RE.sub(lambda m: _ROMAN_FIX_MAP[m.group(1)], name)


def build_wiki_url(name: str) -> str:
    """Constructs a warframe wiki URL from an item's display name.

    " Prime" becomes a "/Prime" subpage (matching the wiki's real
    convention - Prime variants live at Base/Prime, not Base_Prime), any
    other spaces become underscores, and the result is URL-encoded the
    same way real wikiaUrl values already are (slash as %2F)."""
    name = name.strip()
    if name.endswith(" Prime"):
        base = name[: -len(" Prime")].replace(" ", "_")
        path = f"{base}/Prime"
    else:
        path = name.replace(" ", "_")
    return "https://wiki.warframe.com/w/" + quote(path, safe="_")


def open_wiki_url(url: str):
    """Opens a wiki URL in the default browser.

    Deliberately not using QDesktopServices.openUrl() - confirmed live
    2026-07-21 that it reports success (returns True) every time in this
    environment without ever actually opening anything (a portal-
    registration issue, matching other Qt/KDE-portal failures seen
    elsewhere in this project). Going straight to xdg-open with a clean
    env instead: this GUI process's own LD_LIBRARY_PATH points at the
    venv's bundled PySide6 Qt libs (needed so *this* window can load its
    own Qt), and xdg-open/kde-open - a HOST tool - inherited that by
    default and broke the same way spectacle did earlier, needing the
    same clean-env fix."""
    import os
    clean_env = os.environ.copy()
    clean_env.pop("LD_LIBRARY_PATH", None)
    clean_env.pop("QT_PLUGIN_PATH", None)
    try:
        result = subprocess.run(
            ["xdg-open", url],
            capture_output=True, text=True, timeout=10, env=clean_env,
        )
        _wiki_log(
            f"xdg-open {url!r} exited {result.returncode}; "
            f"stdout={result.stdout.strip()!r} stderr={result.stderr.strip()!r}"
        )
    except subprocess.TimeoutExpired:
        _wiki_log(f"xdg-open {url!r} timed out after 10s (may still be running/hung)")
    except OSError as e:
        _wiki_log(f"xdg-open failed to launch: {e}")
        try:
            import webbrowser
            result = webbrowser.open(url)
            _wiki_log(f"webbrowser.open({url!r}) returned {result}")
        except Exception as e2:
            _wiki_log(f"webbrowser.open({url!r}) also raised: {e2}")
