import json

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes_with_dict.json') as f:
    app_data = json.load(f)

targets = {
    "/Lotus/Powersuits/Cowgirl/MesaPrime": "Mesa Prime",
    "/Lotus/Powersuits/BrokenFrame/XakuPrime": "Xaku Prime",
    "/Lotus/Powersuits/Alchemist/LavosPrime": "Lavos Prime",
    "/Lotus/Powersuits/Temple/Temple": "Harrow (presumably)"
}

print("=== App Catalog Entries for Target uniqueNames (WITH DICT) ===\n")
for w in app_data:
    un = w.get('unique_name')
    if un in targets:
        print(f"App Catalog Name: {w.get('name')}")
        print(f"  unique_name: {un}")
        print(f"  Expected: {targets[un]}")
        print()

app_names = [w.get('name') for w in app_data]
missing_targets = ["Mesa Prime", "Xaku Prime", "Lavos Prime", "Harrow", "Citrine Prime", "Cyte-09 Prime", "Broken Warframe Prime", "Whisper"]

print("\n=== Frame Name Search ===")
for target in missing_targets:
    if target in app_names:
        print(f"Found {target} in catalog!")
    else:
        print(f"MISSING {target} from catalog!")
