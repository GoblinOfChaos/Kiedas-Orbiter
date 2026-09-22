#!/usr/bin/env python3
"""Resolve Resources from scratch: drop index (incl. bounty/mission/relic
data) + Baro + Vendors + a direct quote of the Description's own
'Location: X' hint when nothing else matches (verbatim wiki text, not an
inference)."""
import json, re

resources = json.load(open("wiki_module_json/Module_Resources_data.json"))["Resources"]
drop_index = json.load(open("wiki_module_json/drop_reverse_index_v2.json"))
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

for name, entry in resources.items():
    if not isinstance(entry, dict):
        continue
    uniqueName = canon(entry.get("InternalName"))
    if not uniqueName:
        no_data[name] = {"reason": "no InternalName"}
        continue

    parts, refs = [], []

    hits = drop_index.get(name, [])
    if hits:
        # Cap the citation length for very broadly-dropped resources - still cite a real sample, not invented.
        sample = hits[:6]
        srcs = "; ".join(f"{h['sourceName']} ({h['chance']}%)" for h in sample)
        more = f" (+{len(hits) - 6} more sources)" if len(hits) > 6 else ""
        parts.append(f"Drops from: {srcs}{more}")
        refs.append(f"drop reverse index: '{name}' ({len(hits)} total sources)")

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
            c += f" for {cost} {currency}" if currency else f" for {cost}"
            clauses.append(c)
        parts.append("Purchased from " + "; or ".join(clauses))
        refs.append("Module:Vendors/data")

    if not parts:
        desc = entry.get("Description") or ""
        m = re.search(r"Location:\s*(.+)", desc)
        if m:
            parts.append(f"Location (per in-game description): {m.group(1).strip()}")
            refs.append("Module:Resources/data Description field (verbatim 'Location:' text)")

    if not parts:
        no_data[name] = {"reason": "no drop/Baro/Vendor match, no Location hint in description"}
        continue

    resolved[uniqueName] = {
        "uniqueName": uniqueName, "wikiName": name,
        "description": entry.get("Description"),
        "acquisition": "; ".join(parts) + ".",
        "sourceRefs": refs,
        "verifiedDate": "2026-09-09",
    }

print(f"Total Resources: {len(resources)}")
print(f"Resolved: {len(resolved)}")
print(f"No data: {len(no_data)}")

json.dump(resolved, open("docs/revamp/wiki-audit/resources_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(no_data, open("docs/revamp/wiki-audit/resources_no_data.json", "w"), indent=2, ensure_ascii=False)
