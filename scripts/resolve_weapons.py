#!/usr/bin/env python3
from vendor_format import format_cost
"""Resolve Weapons from scratch - same method as resolve_warframes.py, adapted
for Blueprints/data's 'Blueprints' table (not 'Suits') and PrimePart typing."""
import json

blueprints = json.load(open("wiki_module_json/Module_Blueprints_data.json"))["Blueprints"]
drop_index = json.load(open("wiki_module_json/drop_reverse_index.json"))
prime_data = json.load(open("wiki_module_json/Module_Void_data.json"))["PrimeData"]
research = json.load(open("wiki_module_json/Module_Research_data.json"))["Research"]
vendors = json.load(open("wiki_module_json/Module_Vendors_data.json"))["Vendors"]
baro = json.load(open("wiki_module_json/Module_Baro_data.json"))["Items"]

vendor_item_index = {}
for vname, v in vendors.items():
    for off in v.get("Offerings", []):
        if isinstance(off, dict) and "1" in off:
            vendor_item_index.setdefault(off["1"], []).append((vname, off, v.get("Currency")))


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


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


def baro_text(name):
    b = baro.get(name)
    if not b:
        return None
    credit, ducat = b.get("CreditCost"), b.get("DucatCost")
    if credit and ducat:
        return f"Sold by Baro Ki'Teer for {ducat} Ducats and {credit:,} Credits"
    return None


all_weapons = {}
for cat in ["primary", "secondary", "melee", "archwing", "railjack", "companion", "modular", "misc"]:
    d = json.load(open(f"wiki_module_json/Module_Weapons_data_{cat}.json"))
    for name, entry in d.items():
        if isinstance(entry, dict) and "Description" in entry or (isinstance(entry, dict) and "InternalName" in entry):
            all_weapons[name] = entry

resolved, ambiguous, no_data = {}, {}, {}

for name, entry in all_weapons.items():
    uniqueName = canon(entry.get("InternalName")) if isinstance(entry, dict) else None
    if not uniqueName:
        no_data[name] = {"reason": "no InternalName"}
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
                "uniqueName": uniqueName, "wikiName": name,
                "description": entry.get("Description"),
                "acquisition": acquisition,
                "sourceRefs": [f"Module:Void/data (PrimeData['{name}'])"],
                "verifiedDate": "2026-09-09",
            }
            continue
        else:
            no_data[name] = {"reason": "in PrimeData but no part drop data"}
            continue

    # Kuva/Tenet/Coda weapons: confirmed via the real wiki article (Kuva Bramma
    # transcludes "Adversary System/Weapons#Kuva Acquisition") that ALL weapons
    # in each family share one identical acquisition mechanic - not a per-item
    # drop table at all, so this is quoting a real shared source, not guessing.
    LICH_TEXT = {
        "Kuva ": "Obtained by vanquishing a Kuva Lich who generated with this weapon equipped. After the Lich is vanquished it will be in the player's Foundry ready to claim. Not directly tradeable, but a Kuva Lich generated with this weapon can be traded to another player (via a Clan Dojo's Crimson Branch room) before being vanquished.",
        "Tenet ": "Obtained by vanquishing a Sister of Parvos who generated with this weapon equipped (Foundry claim after vanquishing), OR purchased from Ergo Glast (The Perrin Sequence) in any Relay for 40 Corrupted Holokey (obtained from Empyrean Void Storm missions) - each Ergo Glast offering has a random progenitor bonus that cycles every 4 days.",
        "Coda ": "Purchased from Eleanor (The Hex) in the Höllvania Central Mall for 10 Live Heartcell, obtained from vanquishing a Technocyte Coda. Each offering has a random progenitor bonus damage type/percentage that cycles every 4 days.",
    }
    matched_prefix = next((p for p in LICH_TEXT if name.startswith(p)), None)
    if matched_prefix:
        resolved[uniqueName] = {
            "uniqueName": uniqueName, "wikiName": name,
            "description": entry.get("Description"),
            "acquisition": LICH_TEXT[matched_prefix],
            "sourceRefs": ["Adversary System/Weapons (shared transcluded Acquisition section, confirmed via Kuva Bramma's own article)"],
            "verifiedDate": "2026-09-09",
        }
        continue

    # Exalted Weapons (ability-summoned, e.g. Excalibur's Exalted Blade): confirmed
    # via the real "Exalted Blade (Weapon)" article that these have no Acquisition
    # section at all because there's nothing to acquire - the weapon is summoned by
    # activating the Warframe's own ability once you own that Warframe. Within
    # Weapons/data specifically (not Warframes/data), "/Powersuits/" in InternalName
    # reliably marks this - base Warframe suits live in Warframes/data instead.
    if "/Powersuits/" in (entry.get("InternalName") or ""):
        resolved[uniqueName] = {
            "uniqueName": uniqueName, "wikiName": name,
            "description": entry.get("Description"),
            "acquisition": "Exalted Weapon - automatically available once the owning Warframe is acquired; summoned by activating that Warframe's ability. Not separately purchased, crafted, or dropped.",
            "sourceRefs": ["Confirmed via 'Exalted Blade (Weapon)' article (no Acquisition section exists; intro text describes it as summoned by ability activation)"],
            "verifiedDate": "2026-09-09",
        }
        continue

    bp = blueprints.get(name)
    if not bp:
        # Try direct drop/Baro/Vendor match on the weapon itself (some weapons ARE the direct drop, no blueprint).
        parts = []
        refs = []
        hits = drop_index.get(name, []) or drop_index.get(f"{name} Blueprint", [])
        if hits:
            srcs = "; ".join(f"{h['sourceName']} ({h['chance']}%)" for h in hits)
            parts.append(f"Drops from: {srcs}")
            refs.append("drop reverse index")
        bt = baro_text(name)
        if bt:
            parts.append(bt)
            refs.append("Module:Baro/data")
        vt = vendor_text(name)
        if vt:
            parts.append(vt)
            refs.append("Module:Vendors/data")
        if parts:
            resolved[uniqueName] = {
                "uniqueName": uniqueName, "wikiName": name,
                "description": entry.get("Description"),
                "acquisition": "; ".join(parts) + ".",
                "sourceRefs": refs, "verifiedDate": "2026-09-09",
            }
        else:
            no_data[name] = {"reason": f"'{name}' not in Blueprints/data, no direct drop/Baro/Vendor match"}
        continue

    market_cost = bp.get("MarketCost")
    bp_hits = drop_index.get(f"{name} Blueprint", [])
    bp_research = research_text(name)
    bp_vendor = vendor_text(f"{name} Blueprint") or vendor_text(name)
    bp_baro = baro_text(f"{name} Blueprint") or baro_text(name)

    bp_text_parts = []
    if market_cost:
        bp_text_parts.append(f"Blueprint purchasable from Market for {market_cost} Platinum")
    if len(bp_hits) >= 1:
        srcs = "; ".join(f"{h['sourceName']} ({h['chance']}%)" for h in bp_hits)
        bp_text_parts.append(f"or as a drop from: {srcs}")
    if bp_research:
        bp_text_parts.append(f"or {bp_research}")
    if bp_vendor:
        bp_text_parts.append(f"or {bp_vendor}")
    if bp_baro:
        bp_text_parts.append(f"or {bp_baro}")

    parts_text, part_sources, unresolved_parts = [], [], []
    for part in bp.get("Parts", []):
        if part.get("Type") not in ("Item",):
            continue
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
        no_data[name] = {"reason": "no Market cost, no Blueprint drop/research/vendor match, no part matches"}
        continue

    acquisition_lines = []
    if bp_text_parts:
        acquisition_lines.append(f"Blueprint: {' '.join(bp_text_parts)}.")
    if parts_text:
        acquisition_lines.append("Components - " + "; ".join(parts_text) + ".")
    if unresolved_parts:
        acquisition_lines.append(f"(No confirmed drop source found for: {', '.join(unresolved_parts)} - needs manual check.)")

    source_refs = ["Module:Blueprints/data (Blueprints table)"] + part_sources

    record = {
        "uniqueName": uniqueName, "wikiName": name,
        "description": entry.get("Description"),
        "acquisition": " ".join(acquisition_lines),
        "sourceRefs": source_refs, "verifiedDate": "2026-09-09",
    }
    if unresolved_parts:
        ambiguous[name] = {**record, "reason": f"parts with no confirmed drop source: {unresolved_parts}"}
    else:
        resolved[uniqueName] = record

print(f"Total weapons: {len(all_weapons)}")
print(f"Resolved: {len(resolved)}")
print(f"Ambiguous: {len(ambiguous)}")
print(f"No data: {len(no_data)}")

json.dump(resolved, open("docs/revamp/wiki-audit/weapons_resolved.json", "w"), indent=2, ensure_ascii=False)
json.dump(ambiguous, open("docs/revamp/wiki-audit/weapons_ambiguous.json", "w"), indent=2, ensure_ascii=False)
json.dump(no_data, open("docs/revamp/wiki-audit/weapons_no_data.json", "w"), indent=2, ensure_ascii=False)
