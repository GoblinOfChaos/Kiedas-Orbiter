#!/usr/bin/env python3
"""
Build the full wiki-page-per-PDF archive: one PDF per article on
wiki.warframe.com, named after the article's exact title, using the
render pipeline already verified in wiki_page_to_pdf.py (collapsible
sections forced open, image galleries flattened to correct text,
nothing fabricated).

Purely mechanical/reversible: writes PDFs into OUT_DIR, never touches
acquisition_overrides.json or any other app data. Safe to run unattended.

Resumable: skips a title if its PDF already exists. Safe to stop/restart.
"""
import json, subprocess, sys, time, re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, str(Path(__file__).parent))
from wiki_page_to_pdf import render_page

OUT_DIR = Path("/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive")
OUT_DIR.mkdir(exist_ok=True)
LOG = OUT_DIR / "_progress.log"
FAILED = OUT_DIR / "_failed.txt"
TITLES_CACHE = OUT_DIR / "_titles.json"

WORKERS = 4


def log(msg):
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def safe_filename(title):
    return re.sub(r'[/\\:*?"<>|]', "_", title)


def fetch_all_titles():
    if TITLES_CACHE.exists():
        return json.loads(TITLES_CACHE.read_text())
    titles = []
    apfrom = ""
    while True:
        url = ("https://wiki.warframe.com/api.php?action=query&list=allpages"
               "&apnamespace=0&apfilterredir=nonredirects&aplimit=500&format=json"
               + (f"&apfrom={apfrom}" if apfrom else ""))
        r = subprocess.run(["curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "30", url],
                            capture_output=True, text=True)
        d = json.loads(r.stdout)
        batch = [p["title"] for p in d.get("query", {}).get("allpages", [])]
        titles.extend(batch)
        cont = d.get("continue", {}).get("apcontinue")
        log(f"enumerated {len(titles)} titles so far...")
        if not cont:
            break
        apfrom = cont
        time.sleep(0.3)
    TITLES_CACHE.write_text(json.dumps(titles))
    return titles


def process_one(title):
    out_path = OUT_DIR / f"{safe_filename(title)}.pdf"
    if out_path.exists():
        return ("skip", title)
    try:
        ok, err = render_page(title, out_path)
        if ok:
            return ("ok", title)
        return ("fail", f"{title}: {err}")
    except Exception as e:
        return ("fail", f"{title}: {e}")


def main():
    titles = fetch_all_titles()
    log(f"total titles: {len(titles)}")
    todo = [t for t in titles if not (OUT_DIR / f"{safe_filename(t)}.pdf").exists()]
    log(f"remaining to process: {len(todo)}")

    done = 0
    ok_count = 0
    fail_count = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(process_one, t): t for t in todo}
        for fut in as_completed(futures):
            status, info = fut.result()
            done += 1
            if status == "ok":
                ok_count += 1
            elif status == "fail":
                fail_count += 1
                with open(FAILED, "a") as f:
                    f.write(info + "\n")
            if done % 25 == 0:
                log(f"progress: {done}/{len(todo)} (ok={ok_count} fail={fail_count})")

    log(f"DONE. total={len(titles)} ok={ok_count} fail={fail_count}")


if __name__ == "__main__":
    main()
