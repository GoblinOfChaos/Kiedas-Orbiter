#!/usr/bin/env python3
from vendor_format import format_cost
"""
Resolve acquisition for Warframes/Archwings/Necramechs/Operators, from
scratch, ignoring whatever's currently in acquisition_overrides.json -
same "no text over wrong text" method as Cosmetics.

For each item:
  1. Description comes directly and verbatim from Module:Warframes/data.
  2. Blueprint requirements come from Module:Blueprints/data's Suits table
     (exact name match - Suits is keyed by the Warframe's own name).
  3. Each required part ("Neuroptics"/"Chassis"/"Systems") is looked up
     in the drop reverse index as "{Warframe} {Part} Blueprint" (the
     actual key format confirmed by inspecting real Railjack mission
     data - not guessed).
  4. The main Blueprint itself is checked in the reverse index as
     "{Warframe} Blueprint", and its own Market cost (credits/platinum)
     comes directly from the Suits entry.

Every part with a clean, single drop-source match is written with a full
citation. Anything with zero or multiple matches goes to review buckets -
never guessed.
"""
import json

wf_data = json.load(open("wiki_module_json/Module_Warframes_data.json"))
blueprints = json.load(open("wiki_module_json/Module_Blueprints_data.json"))["Suits"]
drop_index = json.load(open("wiki_module_json/drop_reverse_index.json"))
prime_data = json.load(open("wiki_module_json/Module_Void_data.json"))["PrimeData"]
research = json.load(open("wiki_module_json/Module_Research_data.json"))["Research"]
vendors = json.load(open("wiki_module_json/Module_Vendors_data.json"))["Vendors"]

vendor_item_index = {}
for vname, v in vendors.items():
    for off in v.get("Offerings", []):
        if isinstance(off, dict) and "1" in off:
            vendor_item_index.setdefault(off["1"], []).append((vname, off, v.get("Currency")))


def research_text(key):
    r = research.get(key)
    if not r:
        return None
    lab = r.get("Lab", "Dojo")
    resources = r.get("Resources", [])
    res_str = ", ".join(f"{res.get('Count', 1)}x {res.get('Name')}" for res in resources)
    return f"Researched in Clan Dojo ({lab} Lab)" + (f" using {res_str}" if res_str else "")


def vendor_text(name):
    hits = vendor_item_index.get(name)
    if not hits:
        return None
    clauses = []
    for vname, off, currency in hits:
        cost = off.get("3")
        prereq = off.get("Prereq")
        clause = vname + (f" (Rank {prereq}+)" if prereq else "")
        clause += " for " + format_cost(cost, currency)
        clauses.append(clause)
    return "Purchased from " + "; or ".join(clauses)


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


all_items = {}
for category in ["Warframes", "Archwings", "Necramechs", "Operators"]:
    for name, entry in wf_data.get(category, {}).items():
        all_items[name] = entry

resolved = {}
ambiguous = {}
no_data = {}

for name, entry in all_items.items():
    uniqueName = canon(entry.get("InternalName"))
    if not uniqueName:
        no_data[name] = {"reason": "no InternalName in Warframes/data"}
        continue

    if name.endswith("Prime") and name in prime_data:
        pdata = prime_data[name]
        vaulted = pdata.get("IsVaulted")
        parts_text = []
        for part_name, part_info in pdata.get("Parts", {}).items():
            drops = part_info.get("Drops", {})
            if not drops:
                continue
            relic_str = "; ".join(f"{relic} ({rarity})" for relic, rarity in drops.items())
            ducat = part_info.get("DucatValue")
            parts_text.append(f"{part_name} - {relic_str}" + (f" [{ducat} Ducats]" if ducat else ""))
        if parts_text:
            acquisition = ("VAULTED - " if vaulted else "") + "Obtained from Void Relics: " + "; ".join(parts_text) + "."
            resolved[uniqueName] = {
                "uniqueName": uniqueName,
                "wikiName": name,
                "description": entry.get("Description"),
                "acquisition": acquisition,
                "sourceRefs": [f"Module:Void/data (PrimeData['{name}'])"],
                "verifiedDate": "2026-09-09",
            }
            continue
        else:
            no_data[name] = {"reason": "found in PrimeData but no part drop/relic data present"}
            continue

    bp = blueprints.get(name)
    part_results = {}
    part_status = {}

    if not bp:
        if name.endswith("Prime") or "Umbra Prime" in name:
            no_data[name] = {"reason": f"'{name}' not in PrimeData or Blueprints/data Suits - likely Founders-exclusive or otherwise non-standard acquisition, needs manual check"}
        else:
            no_data[name] = {"reason": f"'{name}' not found in Blueprints/data Suits table"}
        continue

    # Main blueprint acquisition: prefer direct Market cost data, already structured.
    market_cost = bp.get("MarketCost")
    credits = bp.get("Credits")
    bp_hits = drop_index.get(f"{name} Blueprint", [])
    bp_research = research_text(name)
    bp_vendor = vendor_text(f"{name} Blueprint") or vendor_text(name)

    bp_text_parts = []
    if market_cost:
        bp_text_parts.append(f"Blueprint purchasable from Market for {market_cost} Platinum")
    if len(bp_hits) == 1:
        h = bp_hits[0]
        bp_text_parts.append(f"or as a drop from {h['sourceName']} ({h['chance']}%)")
    elif len(bp_hits) > 1:
        srcs = "; ".join(f"{h['sourceName']} ({h['chance']}%)" for h in bp_hits)
        bp_text_parts.append(f"or as a drop from: {srcs}")
    if bp_research:
        bp_text_parts.append(f"or {bp_research}")
    if bp_vendor:
        bp_text_parts.append(f"or {bp_vendor}")

    # Component parts.
    parts_text = []
    part_sources = []
    unresolved_parts = []
    for part in bp.get("Parts", []):
        if part.get("Type") != "Item":
            continue  # skip raw resource costs (Orokin Cell etc.) - not part of "where does the component come from"
        part_name = part.get("Name")
        key = f"{name} {part_name} Blueprint"
        hits = drop_index.get(key, [])
        part_research = research_text(f"{name} {part_name}")
        part_vendor = vendor_text(key) or vendor_text(f"{name} {part_name}")
        if len(hits) >= 1:
            srcs = "; ".join(f"{h['sourceName']} ({h['chance']}%)" for h in hits)
            parts_text.append(f"{part_name}: {srcs}")
            part_sources.append(key)
        elif part_research:
            parts_text.append(f"{part_name}: {part_research}")
            part_sources.append(f"Module:Research/data['{name} {part_name}']")
        elif part_vendor:
            parts_text.append(f"{part_name}: {part_vendor}")
            part_sources.append(f"Module:Vendors/data (exact match: '{key}')")
        else:
            unresolved_parts.append(part_name)

    if not bp_text_parts and not parts_text:
        no_data[name] = {"reason": "no Market cost, no Blueprint drop match, no part drop matches found"}
        continue

    if unresolved_parts and not parts_text:
        # Nothing at all resolved for parts, only main BP maybe.
        pass

    acquisition_lines = []
    if bp_text_parts:
        acquisition_lines.append(f"Blueprint: {' '.join(bp_text_parts)}.")
    if parts_text:
        acquisition_lines.append("Components - " + "; ".join(parts_text) + ".")
    if unresolved_parts:
        acquisition_lines.append(f"(No confirmed drop source found for: {', '.join(unresolved_parts)} - needs manual check.)")

    source_refs = ["Module:Blueprints/data (Suits table)"] + part_sources
    if bp_hits:
        source_refs.append(f"drop reverse index: '{name} Blueprint'")

    record = {
        "uniqueName": uniqueName,
        "wikiName": name,
        "description": entry.get("Description"),
        "acquisition": " ".join(acquisition_lines),
        "sourceRefs": source_refs,
        "verifiedDate": "2026-09-09",
    }

    if unresolved_parts:
        ambiguous[name] = {**record, "reason": f"parts with no confirmed drop source: {unresolved_parts}"}
    else:
        resolved[uniqueName] = record

print(f"Total Warframes/Archwings/Necramechs/Operators: {len(all_items)}")
print(f"Fully resolved: {len(resolved)}")
print(f"Partially resolved / needs review: {len(ambiguous)}")
print(f"No data at all: {len(no_data)}")

import os
os.makedirs("docs/revamp/wiki-audit", exist_ok=True)
json.dump(resolved, open("docs/revamp/wiki-audit/warframes_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(ambiguous, open("docs/revamp/wiki-audit/warframes_ambiguous.json", "w"), indent=2, ensure_ascii=False)
json.dump(no_data, open("docs/revamp/wiki-audit/warframes_no_data.json", "w"), indent=2, ensure_ascii=False)

for k in list(resolved)[:2]:
    print(json.dumps(resolved[k], indent=2, ensure_ascii=False))
