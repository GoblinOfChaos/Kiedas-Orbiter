#!/usr/bin/env python3
"""
Rebuilt conflict classifier: instead of generic capitalization heuristics
(which false-flagged "Void Trader" and "Auto-acquired" as dropped named
entities), check against REAL known entity names pulled from our own
verified data: every Vendor name, Baro Ki'Teer, every Syndicate name, and
every Warframe/Weapon name (for "Auto-acquired with a X" style mods).
Only a KNOWN real entity mentioned in the existing text that's absent from
the new text sends the item to manual review - generic descriptive words
are never treated as entities at all, so they can't produce a false flag.
"""
import json
import re

vendors = json.load(open("wiki_module_json/Module_Vendors_data.json"))["Vendors"]
factions = json.load(open("wiki_module_json/Module_Factions_data.json")).get("Factions", {})
warframes = json.load(open("wiki_module_json/Module_Warframes_data.json"))
weapons_all = {}
for cat in ["primary", "secondary", "melee", "archwing", "railjack", "companion", "modular", "misc"]:
    weapons_all.update(json.load(open(f"wiki_module_json/Module_Weapons_data_{cat}.json")))

KNOWN_ENTITIES = set()
KNOWN_ENTITIES.update(vendors.keys())
KNOWN_ENTITIES.update(factions.keys())
KNOWN_ENTITIES.add("Baro Ki'Teer")
KNOWN_ENTITIES.add("Baro")
for cat in ["Warframes", "Archwings", "Necramechs", "Operators"]:
    KNOWN_ENTITIES.update(warframes.get(cat, {}).keys())
KNOWN_ENTITIES.update(weapons_all.keys())
# Sort longest-first so multi-word entities match before their substrings do.
KNOWN_ENTITIES_SORTED = sorted(KNOWN_ENTITIES, key=len, reverse=True)


def find_known_entities(text):
    found = []
    remaining = text
    for entity in KNOWN_ENTITIES_SORTED:
        if len(entity) < 3:
            continue
        if re.search(r'\b' + re.escape(entity) + r'\b', remaining, re.IGNORECASE):
            found.append(entity)
    return found


def classify(existing, new):
    old_entities = find_known_entities(existing)
    new_lower = new.lower()
    missing = [e for e in old_entities if e.lower() not in new_lower]
    return ("safe_upgrade" if not missing else "needs_review"), missing, old_entities


def main():
    conflicts = json.load(open("docs/revamp/wiki-audit/merge_plan_conflicts.json"))
    safe = {"components": {}, "mods": {}}
    review = {"components": {}, "mods": {}}

    for bucket in ["components", "mods"]:
        for key, v in conflicts[bucket].items():
            status, missing, found = classify(v["existingText"], v["newText"])
            v["classification"] = status
            v["knownEntitiesInExisting"] = found
            if status == "safe_upgrade":
                safe[bucket][key] = v
            else:
                v["missingFromNew"] = missing
                review[bucket][key] = v

    print("=== Safe upgrades (every KNOWN real entity from existing text confirmed present in new text) ===")
    print("  components:", len(safe["components"]))
    print("  mods:", len(safe["mods"]))
    print("=== Needs manual review (a known real entity from existing text is missing from new text) ===")
    print("  components:", len(review["components"]))
    print("  mods:", len(review["mods"]))

    json.dump(safe, open("docs/revamp/wiki-audit/merge_plan_safe_upgrades.json", "w"), indent=2, ensure_ascii=False)
    json.dump(review, open("docs/revamp/wiki-audit/merge_plan_needs_review.json", "w"), indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
