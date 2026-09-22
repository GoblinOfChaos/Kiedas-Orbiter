#!/usr/bin/env python3
"""
Fetch raw wikitext for every Cosmetics item that has its own dedicated
article page (Link == item Name in Module:Cosmetics/data), so the
acquisition-resolution pass can read each item's real ==Acquisition==
section instead of guessing. Resumable: skips a title already saved.
"""
import json, subprocess, time, re
from pathlib import Path

OUT_DIR = Path("/var/home/jedwards/kiedas-orbiter/wiki_article_wikitext")
OUT_DIR.mkdir(exist_ok=True)
LOG = OUT_DIR / "_progress.log"


def log(msg):
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def safe_filename(title):
    return re.sub(r'[/\\:*?"<>|]', "_", title) + ".wikitext"


def fetch_raw(title):
    cmd = [
        "curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "30",
        "--get", "--data-urlencode", f"title={title}",
        "--data-urlencode", "action=raw",
        "https://wiki.warframe.com/index.php",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0, r.stdout


def main():
    wiki = json.load(open("wiki_module_json/Module_Cosmetics_data.json"))["Cosmetics"]
    needs_fallback = json.load(open("docs/revamp/wiki-audit/cosmetics_needs_fallback.json"))

    titles = sorted({name for name in needs_fallback if wiki[name].get("Link") == name})
    log(f"total dedicated-page titles to fetch: {len(titles)}")

    ok = skip = fail = 0
    for title in titles:
        out_path = OUT_DIR / safe_filename(title)
        if out_path.exists() and out_path.stat().st_size > 0:
            skip += 1
            continue
        success, content = fetch_raw(title)
        if success and content.strip():
            out_path.write_text(content)
            ok += 1
        else:
            fail += 1
            log(f"FAIL: {title}")
        if (ok + fail) % 200 == 0 and (ok + fail) > 0:
            log(f"progress: ok={ok} fail={fail} skip={skip}")
        time.sleep(0.35)

    log(f"done. ok={ok} fail={fail} skip={skip}")


if __name__ == "__main__":
    main()
