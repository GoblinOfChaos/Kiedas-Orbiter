#!/usr/bin/env python3
"""
Build a complete item-name -> drop-source reverse index by scanning every
category in Module:DropTables/data (Containers, Enemies, Missions), not
just its own partial pre-built Rewards index (which only covers 343
Blueprints + 342 Arcanes/mods - confirmed incomplete, e.g. it's missing
Railjack-node-sourced Warframe parts like Ash's).

Method: exact string match against each source's Resources/Mods/Items/
Blueprints reward-list entries - never fuzzy, never inferred. Every hit
carries its exact category+key+field+index so it can be traced back to
the literal DropTables/data entry it came from.
"""
import json

drop_data = json.load(open("wiki_module_json/Module_DropTables_data.json"))

REWARD_FIELDS = ["Resources", "Mods", "Items", "Blueprints"]

index = {}  # item name -> list of hits

for category in ["Containers", "Enemies", "Missions"]:
    section = drop_data.get(category, {})
    for source_key, source_entry in section.items():
        if not isinstance(source_entry, dict):
            continue
        for field in REWARD_FIELDS:
            entries = source_entry.get(field)
            if not isinstance(entries, list):
                continue
            for entry in entries:
                if not isinstance(entry, list) or len(entry) < 3:
                    continue
                item_name, item_type, chance = entry[0], entry[1], entry[2]
                if not isinstance(item_name, str):
                    continue
                index.setdefault(item_name, []).append({
                    "category": category,
                    "sourceKey": source_key,
                    "sourceName": source_entry.get("Name", source_key),
                    "sourceLink": source_entry.get("Link"),
                    "field": field,
                    "chance": chance,
                })
        # Missions have nested Rewards[Rotation] structure too - handle separately.
        rewards = source_entry.get("Rewards")
        if isinstance(rewards, dict):
            for rotation, entries in rewards.items():
                if not isinstance(entries, list):
                    continue
                for entry in entries:
                    if not isinstance(entry, list) or len(entry) < 3:
                        continue
                    item_name, item_type, chance = entry[0], entry[1], entry[2]
                    if not isinstance(item_name, str):
                        continue
                    index.setdefault(item_name, []).append({
                        "category": category,
                        "sourceKey": source_key,
                        "sourceName": source_entry.get("Name", source_key),
                        "sourceLink": source_entry.get("Link"),
                        "field": f"Rewards.{rotation}",
                        "chance": chance,
                    })

print(f"Total distinct item names found across all DropTables/data: {len(index)}")
json.dump(index, open("wiki_module_json/drop_reverse_index.json", "w"), indent=2, ensure_ascii=False)

# Sanity check against the known Ash case.
for test in ["Ash Neuroptics", "Ash Chassis", "Ash Systems"]:
    hits = index.get(test, [])
    print(f"{test}: {len(hits)} hits")
    for h in hits[:2]:
        print("  ", h)
