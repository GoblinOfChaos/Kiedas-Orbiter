#!/usr/bin/env python3
"""
Resolve acquisition + description for the TennoGen-style Cosmetics entries
(the 425 items in Module:Cosmetics/data that carry PcPrice/SteamLink -
fully structured acquisition data, no join or wikitext-prose fallback
needed). Ignores whatever's currently in acquisition_overrides.json
entirely - this is a from-scratch rebuild per the agreed method, so any
gap the old data silently papered over shows up here instead of staying
hidden.

Matching, in priority order (never by name similarity):
  1. Module data's own InternalName field, if present.
  2. Exact (case-sensitive, full-string) match against DE ExportCustoms'
     `name` field - verified safe: zero collisions across all 310
     candidates that needed it (each exact name maps to exactly one or
     zero DE entries).
Anything that matches neither way goes to the no-data-found bucket
untouched - never guessed at.
"""
import json

wiki = json.load(open('wiki_module_json/Module_Cosmetics_data.json'))['Cosmetics']
de = json.load(open('/tmp/ExportCustoms.json'))['ExportCustoms']


def canon(p):
    return p.replace('/StoreItems/', '/') if isinstance(p, str) else p


de_by_uniquename = {canon(e['uniqueName']): e for e in de}
de_by_name = {}
for e in de:
    de_by_name.setdefault(e['name'], []).append(e)

tennogen = {n: e for n, e in wiki.items()
            if isinstance(e, dict) and ('PcPrice' in e or 'SteamLink' in e)}

resolved = {}
no_match = []

for wiki_name, entry in tennogen.items():
    uniqueName = None
    match_method = None

    iname = entry.get('InternalName')
    if iname and canon(iname) in de_by_uniquename:
        uniqueName = canon(iname)
        match_method = "InternalName"
    else:
        candidates = de_by_name.get(entry.get('Name'), [])
        if len(candidates) == 1:
            uniqueName = canon(candidates[0]['uniqueName'])
            match_method = "exact Name match (DE ExportCustoms.name)"
        elif len(candidates) > 1:
            # Should not happen per the pre-check, but never guess if it does.
            no_match.append({"wikiName": wiki_name, "reason": "name collision in DE export",
                              "candidates": [c['uniqueName'] for c in candidates]})
            continue

    if not uniqueName:
        no_match.append({"wikiName": wiki_name, "reason": "no InternalName and no exact DE name match",
                          "wikiInternalName": iname, "wikiDisplayName": entry.get('Name')})
        continue

    artists = entry.get('Artists') or []
    artist_text = " and ".join(artists) if len(artists) <= 2 else ", ".join(artists[:-1]) + f", and {artists[-1]}"

    pc_price = entry.get('PcPrice')
    console_price = entry.get('ConsolePrice')
    round_name = entry.get('Round')
    steam_link = entry.get('SteamLink')

    acquisition_parts = []
    if steam_link:
        acquisition_parts.append(f"Purchased via Steam Workshop (TennoGen) for {pc_price} on PC")
    else:
        acquisition_parts.append(f"TennoGen item, {pc_price} on PC")
    if console_price:
        acquisition_parts.append(f"or {console_price} Platinum in-game on console")
    acquisition_text = ", ".join(acquisition_parts) + "."
    if round_name:
        if str(round_name).strip().lower().startswith('tennogen'):
            acquisition_text += f" {round_name}."
        else:
            acquisition_text += f" TennoGen Round {round_name}."
    if artist_text:
        acquisition_text += f" Designed by {artist_text}."

    resolved[uniqueName] = {
        "uniqueName": uniqueName,
        "wikiName": wiki_name,
        "description": entry.get('Description'),
        "acquisition": acquisition_text,
        "sourceRefs": [
            "Module:Cosmetics/data (TennoGen fields)",
            f"matched via {match_method}",
        ] + ([steam_link] if steam_link else []),
        "verifiedDate": "2026-09-09",
    }

print(f"Resolved: {len(resolved)}")
print(f"No match (no-data-found bucket): {len(no_match)}")

json.dump(resolved, open('docs/revamp/wiki-audit/tennogen_resolved.json', 'w'), indent=2, ensure_ascii=False)
json.dump(no_match, open('docs/revamp/wiki-audit/tennogen_no_match.json', 'w'), indent=2, ensure_ascii=False)

# A few samples for a manual sanity check.
for k in list(resolved)[:3]:
    print(json.dumps(resolved[k], indent=2, ensure_ascii=False))
