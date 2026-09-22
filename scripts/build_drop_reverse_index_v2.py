#!/usr/bin/env python3
"""
Extended drop reverse index: combines Module:DropTables/data (Containers/
Enemies/Missions, as before) with the DropTables/JSON bounty/sortie/relic/
mission dumps (same upstream WFCD community drop-data project used by both
the wiki and the app's existing DropsAll.json) for much broader coverage -
especially open-world Bounty stage rewards, which aren't in the Lua
DropTables/data table at all.
"""
import json

index = json.load(open("wiki_module_json/drop_reverse_index.json"))


def add(item_name, category, source_name, chance, extra=None):
    if not isinstance(item_name, str):
        return
    entry = {"category": category, "sourceName": source_name, "chance": chance}
    if extra:
        entry.update(extra)
    index.setdefault(item_name, []).append(entry)


# Cetus / Fortuna / Necralisk Bounties: {bountyLevel, rewards: {A: [{itemName, rarity, chance, stage}]}}
def load_json_module(path):
    raw = json.load(open(path))
    if "data" in raw and isinstance(raw["data"], str):
        return json.loads(raw["data"])
    return raw


for label, key in [("Cetus Bounties", "cetusBountyRewards"),
                     ("Fortuna Bounties", "solarisBountyRewards"),
                     ("Necralisk Bounties", "deimosRewards")]:
    data = load_json_module(f"wiki_module_json/Module_DropTables_JSON_{label}.json")
    for bounty in data.get(key, []):
        level = bounty.get("bountyLevel", label)
        for rotation, rewards in bounty.get("rewards", {}).items():
            for r in rewards:
                add(r.get("itemName"), "Bounty", f"{level} (Rotation {rotation}, {r.get('stage', '')})".strip(),
                    r.get("chance"))

# Sorties: flat list {itemName, rarity, chance}
sorties = load_json_module("wiki_module_json/Module_DropTables_JSON_Sorties.json")
for r in sorties.get("sortieRewards", []):
    add(r.get("itemName"), "Sortie", "Sortie Reward", r.get("chance"))

# Transient (Arbitrations etc): {objectiveName, rewards: [{rotation, itemName, chance}]}
transient = load_json_module("wiki_module_json/Module_DropTables_JSON_Transient.json")
for obj in transient.get("transientRewards", []):
    objective = obj.get("objectiveName")
    for r in obj.get("rewards", []):
        add(r.get("itemName"), "Transient", f"{objective} (Rotation {r.get('rotation')})", r.get("chance"))

# Missions: nested {planet: {node: {gameMode, rewards: {rotation: [...]}}}}
missions = load_json_module("wiki_module_json/Module_DropTables_JSON_Missions.json")
for planet, nodes in missions.get("missionRewards", {}).items():
    for node, info in nodes.items():
        game_mode = info.get("gameMode", "")
        rewards_field = info.get("rewards", {})
        if isinstance(rewards_field, dict):
            for rotation, rewards in rewards_field.items():
                for r in rewards:
                    add(r.get("itemName"), "Mission", f"{planet}/{node} ({game_mode}, Rotation {rotation})", r.get("chance"))
        elif isinstance(rewards_field, list):
            for r in rewards_field:
                add(r.get("itemName"), "Mission", f"{planet}/{node} ({game_mode})", r.get("chance"))

# Relics: {tier, relicName, state, rewards: [{itemName, rarity, chance}]}
relics = load_json_module("wiki_module_json/Module_DropTables_JSON_Relics.json")
for relic in relics.get("relics", []):
    relic_full = f"{relic.get('tier')} {relic.get('relicName')} ({relic.get('state')})"
    for r in relic.get("rewards", []):
        add(r.get("itemName"), "Relic", relic_full, r.get("chance"))

json.dump(index, open("wiki_module_json/drop_reverse_index_v2.json", "w"), indent=2, ensure_ascii=False)
print(f"Total distinct item names in extended index: {len(index)}")

# Sanity check against a known Resource.
for test in ["Tellurium", "Cetus Wisp", "Iradite"]:
    print(test, "->", len(index.get(test, [])), "hits")
