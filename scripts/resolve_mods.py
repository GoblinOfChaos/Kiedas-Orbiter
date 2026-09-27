#!/usr/bin/env python3
from vendor_format import format_cost
"""Resolve Mods from scratch using drop reverse index + Baro + Vendors (same pattern as Arcanes)."""
import json

mods = json.load(open("wiki_module_json/Module_Mods_data.json"))["Mods"]
drop_index = json.load(open("wiki_module_json/drop_reverse_index.json"))
baro = json.load(open("wiki_module_json/Module_Baro_data.json"))["Items"]
vendors = json.load(open("wiki_module_json/Module_Vendors_data.json"))["Vendors"]

vendor_item_index = {}
for vname, v in vendors.items():
    for off in v.get("Offerings", []):
        if isinstance(off, dict) and "1" in off:
            vendor_item_index.setdefault(off["1"], []).append((vname, off, v.get("Currency")))


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


resolved, no_data = {}, {}

for name, entry in mods.items():
    if not isinstance(entry, dict):
        continue
    uniqueName = canon(entry.get("InternalName"))
    if not uniqueName:
        no_data[name] = {"reason": "no InternalName"}
        continue

    parts, refs = [], []

    hits = drop_index.get(name, [])
    if hits:
        srcs = "; ".join(f"{h['sourceName']} ({h['chance']}%)" for h in hits)
        parts.append(f"Drops from: {srcs}")
        refs.append(f"drop reverse index: '{name}'")

    if name in baro:
        b = baro[name]
        credit, ducat = b.get("CreditCost"), b.get("DucatCost")
        if credit and ducat:
            parts.append(f"Sold by Baro Ki'Teer for {ducat} Ducats and {credit:,} Credits")
        refs.append("Module:Baro/data")

    if name in vendor_item_index:
        clauses = []
        for vname, off, currency in vendor_item_index[name]:
            cost = off.get("3")
            prereq = off.get("Prereq")
            c = vname + (f" (Rank {prereq}+)" if prereq else "")
            c += " for " + format_cost(cost, currency)
            clauses.append(c)
        parts.append("Purchased from " + "; or ".join(clauses))
        refs.append("Module:Vendors/data")

    if not parts:
        no_data[name] = {"reason": "no drop-index, Baro, or Vendor match found", "type": entry.get("Type")}
        continue

    resolved[uniqueName] = {
        "uniqueName": uniqueName,
        "wikiName": name,
        "description": entry.get("Description"),
        "acquisition": "; ".join(parts) + ".",
        "sourceRefs": refs,
        "verifiedDate": "2026-09-09",
    }

print(f"Total Mods: {len(mods)}")
print(f"Resolved: {len(resolved)}")
print(f"No data: {len(no_data)}")

json.dump(resolved, open("docs/revamp/wiki-audit/mods_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(no_data, open("docs/revamp/wiki-audit/mods_no_data.json", "w"), indent=2, ensure_ascii=False)
