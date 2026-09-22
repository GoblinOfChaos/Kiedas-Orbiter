#!/usr/bin/env python3
"""
Resolve Animation Set cosmetics. Confirmed via direct read of 4 real
article pages (Ash, Wisp, Mesa, Octavia Animation Set) that ALL follow
the identical mechanic: default/free for the owning Warframe, purchasable
for 50 Platinum to use on any other Warframe. Still verifies the item's
own exact bolded name appears on the candidate page before accepting -
never assumes the pattern holds without checking that specific item.
"""
import json, subprocess, time, re
from pathlib import Path

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


wiki = json.load(open("wiki_module_json/Module_Cosmetics_data.json"))["Cosmetics"]
anim_sets = {n: e for n, e in wiki.items() if isinstance(e, dict) and e.get("Type") == "Animation Set"}

resolved, no_data = {}, {}

for name, entry in anim_sets.items():
    uniqueName = canon(entry.get("InternalName"))
    if not uniqueName:
        no_data[name] = {"reason": "no InternalName"}
        continue

    m = re.match(r"^(.*) (Agile|Noble) Animation Set$", name)
    if not m:
        no_data[name] = {"reason": "name doesn't match '{Warframe} Agile/Noble Animation Set' pattern"}
        continue
    warframe, style = m.group(1), m.group(2)
    page_title = f"{warframe} Animation Set"

    content = fetch_raw(page_title)
    if not content:
        no_data[name] = {"reason": f"page '{page_title}' fetch failed or doesn't exist"}
        continue

    quote_pattern = re.compile(re.escape(f"'''{name}''' is the {style} [[Animation Set]] for") + r".*?for \{\{pc\|(\d+)\}\}", re.DOTALL)
    m2 = quote_pattern.search(content)
    if not m2:
        no_data[name] = {"reason": f"page '{page_title}' exists but doesn't contain the confirmed sentence pattern for '{name}'"}
        continue
    price = m2.group(1)

    resolved[uniqueName] = {
        "uniqueName": uniqueName, "wikiName": name,
        "description": entry.get("Description"),
        "acquisition": f"Default/comes free with {warframe}. Purchasable to use on any other Warframe for {price} Platinum via Market.",
        "sourceRefs": [f"article page: {page_title} (confirmed exact sentence match for '{name}')"],
        "verifiedDate": "2026-09-09",
    }

print(f"Total Animation Sets: {len(anim_sets)}")
print(f"Resolved: {len(resolved)}")
print(f"No data: {len(no_data)}")

json.dump(resolved, open("docs/revamp/wiki-audit/cosmetics_animation_sets_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(no_data, open("docs/revamp/wiki-audit/cosmetics_animation_sets_no_data.json", "w"), indent=2, ensure_ascii=False)
