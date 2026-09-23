#!/usr/bin/env python3
"""
GitHub #111: acquisition_overrides.json has leaked raw wikitext/HTML in ~765
entries - a wiki-scrape artifact, not a translation issue. Two distinct cases:

1. Trailing wiki boilerplate (__NOTOC__, <gallery>, Category:, |-|) appended
   after a blank line following otherwise-clean acquisition text. Verified
   (scripts/... exploratory pass, not saved) that nothing substantive ever
   follows the first such marker - safe to truncate there.
2. Inline <ref>...</ref> citation tags and {{...}}/<!--...--> wiki template
   transclusions/comments, which can appear mid-sentence - stripped as spans,
   keeping the surrounding text.

Does NOT touch the ~126 entries containing full <div class="tabbertab">/
<tabber> blocks (Railjack Mk I/II/III wreckage drop tables encoded as
wikitext) - the real informational content (drop percentages per enemy) is
INSIDE those blocks, not separable from markup without risking altering
actual game-mechanical claims. Those stay as-is, untranslated fallback only.

Reports counts, writes a PRE-MARKUP-CLEANUP-BACKUP copy before editing,
matching this repo's existing backup-file convention for this data file.
"""
import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
OVERRIDES_PATH = REPO_ROOT / "src-tauri/data/assets/data/acquisition_overrides.json"
BACKUP_PATH = REPO_ROOT / "src-tauri/data/assets/data/acquisition_overrides.PRE-MARKUP-CLEANUP-BACKUP.json"

TABBER_RE = re.compile(r'<div class="tabbertab"|<tabber>')
TRUNCATE_AT_RE = re.compile(r'__NOTOC__|__forcetoc__|<gallery|Category:|\|-\|')
INLINE_REF_RE = re.compile(r'<ref[^>]*>.*?</ref>', re.DOTALL)
INLINE_COMMENT_RE = re.compile(r'<!--.*?-->', re.DOTALL)
INLINE_TEMPLATE_RE = re.compile(r'\{\{.*?\}\}', re.DOTALL)


def clean_text(text: str) -> str:
    m = TRUNCATE_AT_RE.search(text)
    if m:
        text = text[:m.start()]
    text = INLINE_REF_RE.sub('', text)
    text = INLINE_COMMENT_RE.sub('', text)
    text = INLINE_TEMPLATE_RE.sub('', text)
    return text.rstrip()


def main():
    overrides = json.loads(OVERRIDES_PATH.read_text())

    cleaned_count = 0
    skipped_tabber = 0
    unchanged = 0

    for section in ('components', 'mods'):
        entries = overrides.get(section, {})
        for key, text in list(entries.items()):
            if not isinstance(text, str):
                continue
            if TABBER_RE.search(text):
                skipped_tabber += 1
                continue
            cleaned = clean_text(text)
            if cleaned != text:
                entries[key] = cleaned
                cleaned_count += 1
            else:
                unchanged += 1

    print(f"Cleaned: {cleaned_count}")
    print(f"Skipped (tabber/complex, left as-is): {skipped_tabber}")
    print(f"Unchanged (no markup found): {unchanged}")

    if cleaned_count == 0:
        print("Nothing to write.")
        return

    BACKUP_PATH.write_text(OVERRIDES_PATH.read_text())
    print(f"Backed up original to {BACKUP_PATH.relative_to(REPO_ROOT)}")

    OVERRIDES_PATH.write_text(json.dumps(overrides, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote cleaned {OVERRIDES_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
