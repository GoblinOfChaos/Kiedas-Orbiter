#!/usr/bin/env python3
"""
Resolve Decorations acquisition from the Cost field built directly into
Module:Decorations/data (Foundry crafting requirements: Credits, Time,
Resources). This data itself is 100% reliable and cited verbatim.

IMPORTANT CAVEAT: Module:Decorations/data carries NO InternalName field at
all (confirmed: 0/2212 entries have one), and Decorations don't appear
under a "name" match in any DE PublicExport category checked so far
(ExportResources, ExportGear, ExportCustoms, ExportFlavour, ExportRecipes)
- likely because Dojo-only decorations aren't part of the standard 16
PublicExport categories at all. So these records are keyed by the wiki's
own display Name, NOT a confirmed app uniqueName - "identityConfirmed":
false marks every record here. Do NOT treat this as equal-confidence to
the InternalName-joined categories (Warframes/Weapons/Arcanes/Mods) - the
acquisition TEXT is reliable, but the ITEM IDENTITY match to the app's
catalog still needs establishing (e.g. by cross-referencing the app's own
existing Decorations screen/data layer) before this can be merged.
"""
import json

decorations = json.load(open("wiki_module_json/Module_Decorations_data.json"))

resolved = {}
no_data = {}

for category, items in decorations.items():
    if not isinstance(items, dict):
        continue
    for name, entry in items.items():
        if not isinstance(entry, dict):
            continue
        cost = entry.get("Cost")
        if not cost:
            no_data[name] = {"reason": "no Cost field", "category": category}
            continue

        parts = []
        credits = cost.get("Credits")
        time_hrs = cost.get("Time")
        resources = cost.get("Resources", [])
        if credits:
            parts.append(f"{credits:,} Credits")
        if resources:
            res_str = ", ".join(f"{r.get('Count')}x {r.get('Name')}" for r in resources)
            parts.append(res_str)
        acquisition = f"Built in Clan Dojo Foundry for: {', '.join(parts)}" if parts else "Built in Clan Dojo Foundry"
        if time_hrs:
            acquisition += f" ({time_hrs}h build time)"
        acquisition += "."

        resolved[name] = {
            "wikiName": name,
            "category": category,
            "identityConfirmed": False,
            "description": entry.get("Description"),
            "acquisition": acquisition,
            "sourceRefs": [f"Module:Decorations/data['{category}']['{name}'] (Cost field)"],
            "verifiedDate": "2026-09-09",
        }

print(f"Total Decorations: {sum(len(v) for v in decorations.values() if isinstance(v, dict))}")
print(f"Resolved (acquisition text, identity unconfirmed): {len(resolved)}")
print(f"No data: {len(no_data)}")

json.dump(resolved, open("docs/revamp/wiki-audit/decorations_resolved_UNCONFIRMED_IDENTITY.json", "w"), indent=2, ensure_ascii=False)
json.dump(no_data, open("docs/revamp/wiki-audit/decorations_no_data.json", "w"), indent=2, ensure_ascii=False)
