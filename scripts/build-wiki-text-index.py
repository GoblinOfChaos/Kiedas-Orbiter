#!/usr/bin/env python3
"""Extract the text of every page of the local wiki archive once, so later jobs can search ALL pages by exact name.
usage: nice -n 19 ionice -c3 python3 scripts/build-wiki-text-index.py [ARCHIVE_DIR] [OUT_DIR]
Default ARCHIVE_DIR=/home/jedwards/kiedas-orbiter/wiki_pdf_archive  OUT_DIR=~/.cache/kiedas-wiki-text
Resumable (skips pages already extracted), one process, one file at a time. Writes <OUT_DIR>/<file stem>.txt and a progress line every 100 pages."""
import sys, os, time
from pathlib import Path
from pypdf import PdfReader
args = [a for a in sys.argv[1:] if not a.startswith("--")]
archive = Path(args[0] if len(args) > 0 else "/home/jedwards/kiedas-orbiter/wiki_pdf_archive")
out = Path(args[1] if len(args) > 1 else Path.home() / ".cache/kiedas-wiki-text")
out.mkdir(parents=True, exist_ok=True)
files = sorted(archive.glob("*.pdf"))
# optional: --shard K/N processes every N-th file starting at K (0-based), --reverse walks backwards; workers may overlap harmlessly
if "--reverse" in sys.argv: files = files[::-1]
for a in sys.argv:
    if a.startswith("--shard="):
        k, n = map(int, a.split("=")[1].split("/")); files = files[k::n]
t0 = time.time(); done = skipped = failed = 0
for i, f in enumerate(files, 1):
    dest = out / (f.stem + ".txt")
    if dest.exists() and dest.stat().st_size > 0:
        skipped += 1; continue
    try:
        text = "\n".join((p.extract_text() or "") for p in PdfReader(str(f)).pages)
        dest.write_text(text, encoding="utf-8")
        done += 1
    except Exception as e:
        failed += 1
        (out / (f.stem + ".failed")).write_text(str(e)[:300])
    if i % 100 == 0:
        print(f"{i}/{len(files)} done={done} skipped={skipped} failed={failed} elapsed={int(time.time()-t0)}s", flush=True)
print(f"finished: {len(files)} pages, extracted {done}, skipped {skipped}, failed {failed}, {int(time.time()-t0)}s")
