#!/usr/bin/env python3
"""
Resolve acquisition for the "plain" Cosmetics entries (no PcPrice/SteamLink,
i.e. not TennoGen) via the two confirmed structured cross-reference tables:
Module:Baro/data and Module:Vendors/data. Both are keyed by exact item name
(no InternalName field in either), so matching here is exact-string-equals
against the wiki's own Cosmetics table key - not fuzzy, not by similarity.
Whatever isn't found in either table is left to the wikitext-prose fallback
(a separate pass) or the no-data-found bucket - never guessed.
"""
import json
from vendor_format import format_cost

wiki = json.load(open('wiki_module_json/Module_Cosmetics_data.json'))['Cosmetics']
baro = json.load(open('wiki_module_json/Module_Baro_data.json'))['Items']
vendors = json.load(open('wiki_module_json/Module_Vendors_data.json'))['Vendors']


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


plain = {n: e for n, e in wiki.items()
         if isinstance(e, dict) and 'PcPrice' not in e and 'SteamLink' not in e}

cosmetic_types = {'Cosmetic', 'Emblem', 'Ephemera', 'Sigil'}
vendor_index = {}
for vname, v in vendors.items():
    for off in v.get('Offerings', []):
        if isinstance(off, dict) and off.get('2') in cosmetic_types:
            vendor_index.setdefault(off.get('1'), []).append((vname, off, v.get('Currency')))

resolved = {}
unresolved = {}

for name, entry in plain.items():
    uniqueName = canon(entry.get('InternalName')) if entry.get('InternalName') else None

    if name in baro:
        b = baro[name]
        credit = b.get('CreditCost')
        ducat = b.get('DucatCost')
        n_visits = len(b.get('OfferingDates', []) or [])
        acq = f"Sold by Baro Ki'Teer for {ducat} Ducats and {credit:,} Credits" if (ducat and credit) \
            else f"Sold by Baro Ki'Teer ({b.get('Type', 'item')})"
        if n_visits:
            acq += f" (offered on {n_visits} recorded visit{'s' if n_visits != 1 else ''})"
        acq += "."
        source = ["Module:Baro/data", f"exact name match: '{name}'"]
        method = "Baro/data"
    elif name in vendor_index:
        hits = vendor_index[name]
        clauses = []
        for vname, off, currency in hits:
            cost = off.get('3')
            prereq = off.get('Prereq')
            clause = f"{vname}"
            if prereq:
                clause += f" (Rank {prereq}+)"
            clause += " for " + format_cost(cost, currency)
            clauses.append(clause)
        acq = "Purchased from " + "; or ".join(clauses) + "."
        source = ["Module:Vendors/data", f"exact name match: '{name}'"]
        method = "Vendors/data"
    else:
        unresolved[name] = entry
        continue

    if not uniqueName:
        # No InternalName in the Cosmetics table itself for this entry -
        # can't safely produce a uniqueName-keyed record. Flag rather than
        # guess at one from the display name.
        unresolved[name] = {**entry, "_reason": f"matched via {method} but Cosmetics/data itself has no InternalName for this entry"}
        continue

    resolved[uniqueName] = {
        "uniqueName": uniqueName,
        "wikiName": name,
        "description": entry.get("Description"),
        "acquisition": acq,
        "sourceRefs": source,
        "verifiedDate": "2026-09-09",
    }

print(f"Total plain cosmetics: {len(plain)}")
print(f"Resolved (Baro or Vendors, exact match + has InternalName): {len(resolved)}")
print(f"Unresolved (needs wikitext-prose fallback or no-data-found): {len(unresolved)}")

json.dump(resolved, open('docs/revamp/wiki-audit/cosmetics_structured_resolved.json', 'w'), indent=2, ensure_ascii=False)
json.dump(list(unresolved.keys()), open('docs/revamp/wiki-audit/cosmetics_needs_fallback.json', 'w'), indent=2, ensure_ascii=False)

for k in list(resolved)[:3]:
    print(json.dumps(resolved[k], indent=2, ensure_ascii=False))
