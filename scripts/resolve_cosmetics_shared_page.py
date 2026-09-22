#!/usr/bin/env python3
"""
Resolve the ~299 Cosmetics items whose Link points to a different (shared)
page, often with a #Section anchor (e.g. "Sigils#Conclave Sigils"). Fetches
the base page (anchors aren't a real fetch target), then verifies the
item's own exact name is actually present before accepting - since a
shared page could plausibly not mention every item in its own family.
"""
import json, subprocess, time, re, sys
from pathlib import Path

sys.path.insert(0, "scripts")
from extract_acquisition_wikitext import classify, clean_wikitext

WIKITEXT_DIR = Path("wiki_article_wikitext")


def safe_filename(title):
    return re.sub(r'[/\\:*?"<>|]', "_", title) + ".wikitext"


def fetch_raw(title):
    path = WIKITEXT_DIR / safe_filename(title)
    if path.exists() and path.stat().st_size > 0:
        return path.read_text()
    cmd = ["curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "30",
           "--get", "--data-urlencode", f"title={title}", "--data-urlencode", "action=raw",
           "https://wiki.warframe.com/index.php"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    time.sleep(0.35)
    if r.returncode == 0 and r.stdout.strip():
        path.write_text(r.stdout)
        return r.stdout
    return None


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


def find_section(content, section_title):
    """Return the body text of a ==Section== or ===Section=== matching section_title, if any."""
    pattern = re.compile(r'^(={2,4})\s*' + re.escape(section_title) + r'\s*\1\s*$', re.MULTILINE)
    m = pattern.search(content)
    if not m:
        return None
    level = len(m.group(1))
    start = m.end()
    heading_re = re.compile(r'^(={2,6})', re.MULTILINE)
    end = len(content)
    for hm in heading_re.finditer(content, start):
        if len(hm.group(1)) <= level:
            end = hm.start()
            break
    return content[start:end]


de_customs = json.load(open("/tmp/ExportCustoms.json"))["ExportCustoms"]
de_by_name = {}
for e in de_customs:
    de_by_name.setdefault(e["name"], []).append(e["uniqueName"])

wiki = json.load(open("wiki_module_json/Module_Cosmetics_data.json"))["Cosmetics"]
remaining = json.load(open("/tmp/cosmetics_still_remaining.json"))
shared = {n: e for n, e in remaining.items() if e.get("Link") and e.get("Link") != n}

candidates, no_data = {}, {}

for name, entry in shared.items():
    uniqueName = canon(entry.get("InternalName"))
    match_method = "InternalName"
    if not uniqueName:
        de_matches = de_by_name.get(name, [])
        if len(de_matches) == 1:
            uniqueName = canon(de_matches[0])
            match_method = "exact Name match against DE ExportCustoms"
        elif len(de_matches) > 1:
            no_data[name] = {"reason": f"name collision in DE export: {de_matches}"}
            continue
        else:
            no_data[name] = {"reason": "no InternalName and no exact DE ExportCustoms name match"}
            continue

    link = entry["Link"]
    if "#" in link:
        page_title, section_title = link.split("#", 1)
    else:
        page_title, section_title = link, None

    content = fetch_raw(page_title)
    if not content:
        no_data[name] = {"reason": f"page '{page_title}' fetch failed or doesn't exist"}
        continue

    scope = content
    if section_title:
        section_body = find_section(content, section_title)
        if section_body is None:
            # Section anchor might not match a real heading (could be an ID within a table). Fall back to whole page.
            scope = content
        else:
            scope = section_body

    if name not in scope:
        no_data[name] = {"reason": f"page '{link}' fetched but never mentions '{name}'"}
        continue

    # Try to find nearby context: the line/row containing the item name, plus a few lines around it.
    lines = scope.split("\n")
    idx = next((i for i, l in enumerate(lines) if name in l), None)
    if idx is None:
        no_data[name] = {"reason": f"name matched in raw text but not isolable by line in '{link}'"}
        continue
    context = "\n".join(lines[max(0, idx - 2):idx + 3])
    cleaned = clean_wikitext(context, page_title)

    # NOT auto-accepted as "resolved" - grabbing the few lines around a name
    # match on a shared multi-item page is the exact technique that produced
    # wrong-item text elsewhere (Gemini's Sigils pass). The name match here
    # is confirmed real, but the surrounding context could still belong to a
    # neighboring row/entry rather than describe this item specifically -
    # every one of these needs a human glance before it's trusted, same as
    # the ambiguous bucket everywhere else in this project.
    candidates[uniqueName] = {
        "uniqueName": uniqueName, "wikiName": name,
        "description": entry.get("Description"),
        "candidateAcquisitionText": cleaned.strip(),
        "sourceRefs": [f"matched via {match_method}",
                       f"article page: {link} (name match confirmed, but surrounding context NOT independently verified as describing this specific item)"],
        "verifiedDate": "2026-09-09",
    }

print(f"Total shared-page candidates: {len(shared)}")
print(f"Candidates needing human review (NOT auto-resolved): {len(candidates)}")
print(f"No data: {len(no_data)}")

json.dump(candidates, open("docs/revamp/wiki-audit/cosmetics_shared_page_CANDIDATES_NEEDS_REVIEW.json", "w"), indent=2, ensure_ascii=False)
json.dump(no_data, open("docs/revamp/wiki-audit/cosmetics_shared_page_no_data.json", "w"), indent=2, ensure_ascii=False)
