#!/usr/bin/env python3
"""
Compare everything resolved this session against the live
acquisition_overrides.json. Never writes to the live file - produces two
review artifacts instead:
  - merge_plan_new.json: items with no existing entry (safe additions)
  - merge_plan_conflicts.json: items where our resolved text differs from
    what's already live (needs a human decision per item, not a bulk apply)
"""
import json

LIVE_PATH = ".preview-work/stage4-command-center/src-tauri/data/assets/data/acquisition_overrides.json"
live = json.load(open(LIVE_PATH))
live_components = live.get("components", {})
live_mods = live.get("mods", {})

sources = {
    "warframes": ("docs/revamp/wiki-audit/warframes_resolved.json", "components", "uniqueName"),
    "weapons_main": ("docs/revamp/wiki-audit/weapons_resolved.json", "components", "uniqueName"),
    "weapons_fallback": ("docs/revamp/wiki-audit/weapons_fallback_resolved.json", "components", "uniqueName"),
    "weapons_ambiguous_fallback": ("docs/revamp/wiki-audit/weapons_ambiguous_fallback_resolved.json", "components", "uniqueName"),
    "arcanes_main": ("docs/revamp/wiki-audit/arcanes_resolved.json", "components", "uniqueName"),
    "arcanes_fallback": ("docs/revamp/wiki-audit/arcanes_fallback_resolved.json", "components", "uniqueName"),
    "mods_main": ("docs/revamp/wiki-audit/mods_resolved.json", "mods", "wikiName"),
    "mods_fallback": ("docs/revamp/wiki-audit/mods_fallback_resolved.json", "mods", "wikiName"),
    "companions": ("docs/revamp/wiki-audit/companions_resolved.json", "components", "uniqueName"),
    "resources": ("docs/revamp/wiki-audit/resources_resolved.json", "components", "uniqueName"),
    "tennogen": ("docs/revamp/wiki-audit/tennogen_resolved.json", "components", "uniqueName"),
    "cosmetics_structured": ("docs/revamp/wiki-audit/cosmetics_structured_resolved.json", "components", "uniqueName"),
    "cosmetics_dedicated_page": ("docs/revamp/wiki-audit/cosmetics_dedicated_page_resolved.json", "components", "uniqueName"),
    "cosmetics_helmet_fallback": ("docs/revamp/wiki-audit/cosmetics_helmet_fallback_resolved.json", "components", "uniqueName"),
    "cosmetics_animation_sets": ("docs/revamp/wiki-audit/cosmetics_animation_sets_resolved.json", "components", "uniqueName"),
}

new_additions = {"components": {}, "mods": {}}
conflicts = {"components": {}, "mods": {}}
seen_keys = {"components": set(), "mods": set()}

for label, (path, bucket, keyfield) in sources.items():
    try:
        data = json.load(open(path))
    except FileNotFoundError:
        print(f"SKIP (missing file): {label}")
        continue

    live_bucket = live_components if bucket == "components" else live_mods

    for uniqueName_or_key, record in data.items():
        key = record.get(keyfield) if keyfield != "uniqueName" else uniqueName_or_key
        if not key:
            continue
        acquisition_text = record.get("acquisition")
        if not acquisition_text:
            continue

        if key in seen_keys[bucket]:
            continue  # already handled by an earlier source this run (dedup across overlapping resolver outputs)
        seen_keys[bucket].add(key)

        existing = live_bucket.get(key)
        if existing is None:
            new_additions[bucket][key] = {
                "newText": acquisition_text,
                "source": label,
                "sourceRefs": record.get("sourceRefs"),
                "wikiName": record.get("wikiName"),
            }
        elif existing.strip() != acquisition_text.strip():
            conflicts[bucket][key] = {
                "existingText": existing,
                "newText": acquisition_text,
                "source": label,
                "sourceRefs": record.get("sourceRefs"),
                "wikiName": record.get("wikiName"),
            }
        # else: identical, nothing to do

print("=== New additions (no existing entry, safe to add) ===")
print("  components:", len(new_additions["components"]))
print("  mods:", len(new_additions["mods"]))
print("=== Conflicts (existing entry differs from our resolved text - needs your review) ===")
print("  components:", len(conflicts["components"]))
print("  mods:", len(conflicts["mods"]))

import os
os.makedirs("docs/revamp/wiki-audit", exist_ok=True)
json.dump(new_additions, open("docs/revamp/wiki-audit/merge_plan_new.json", "w"), indent=2, ensure_ascii=False)
json.dump(conflicts, open("docs/revamp/wiki-audit/merge_plan_conflicts.json", "w"), indent=2, ensure_ascii=False)
