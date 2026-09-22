#!/usr/bin/env python3
"""
Download the raw Lua source of every real Module:*/data page on
wiki.warframe.com into wiki_module_archive/ (one .lua file per page,
named after the title). These are the wiki's own structured backing
data (exact InternalName keys, verbatim Description text) that its
rendered article pages transclude from - a much stronger ground truth
than parsing rendered HTML/prose, since matching can be done on an
exact internal path instead of display-name similarity.

Purely mechanical/reversible: only writes into OUT_DIR. Never touches
acquisition_overrides.json or any other app data. Safe to run
unattended. Resumable: skips a title if its file already exists.
"""
import json, subprocess, sys, time, re, urllib.parse
from pathlib import Path

OUT_DIR = Path("/var/home/jedwards/kiedas-orbiter/wiki_module_archive")
OUT_DIR.mkdir(exist_ok=True)
TITLES_FILE = Path("/tmp/claude-1000/-var-home-jedwards-kiedas-orbiter/65d75763-d327-474f-a4c2-6b1c4a1d111e/scratchpad/module_data_titles.json")
LOG = OUT_DIR / "_progress.log"
FAILED = OUT_DIR / "_failed.txt"


def log(msg):
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def safe_filename(title):
    return re.sub(r'[/\\:*?"<>|]', "_", title) + ".lua"


def fetch_raw(title):
    url = "https://wiki.warframe.com/w/" + urllib.parse.quote(title) + "?action=raw"
    r = subprocess.run(["curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "30", url],
                        capture_output=True, text=True)
    return r.returncode == 0, r.stdout


def main():
    titles = json.loads(TITLES_FILE.read_text())
    log(f"total titles: {len(titles)}")
    ok_count = skip_count = fail_count = 0
    for title in titles:
        out_path = OUT_DIR / safe_filename(title)
        if out_path.exists() and out_path.stat().st_size > 0:
            skip_count += 1
            continue
        success, content = fetch_raw(title)
        if success and content.strip():
            out_path.write_text(content)
            ok_count += 1
            log(f"ok: {title} ({len(content)} bytes)")
        else:
            fail_count += 1
            log(f"FAIL: {title}")
            with open(FAILED, "a") as f:
                f.write(title + "\n")
        time.sleep(0.4)
    log(f"done. ok={ok_count} skip={skip_count} fail={fail_count}")


if __name__ == "__main__":
    main()
