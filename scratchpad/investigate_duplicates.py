import json

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes.json') as f:
    app_data = json.load(f)

# The uniqueNames we care about
targets = {
    "/Lotus/Powersuits/Cowgirl/MesaPrime": "Mesa Prime",
    "/Lotus/Powersuits/BrokenFrame/XakuPrime": "Xaku Prime",
    "/Lotus/Powersuits/Alchemist/LavosPrime": "Lavos Prime",
    "/Lotus/Powersuits/Temple/Temple": "Harrow (presumably)"
}

print("=== App Catalog Entries for Target uniqueNames ===\n")
for w in app_data:
    un = w.get('unique_name')
    if un in targets:
        print(f"App Catalog Name: {w.get('name')}")
        print(f"  unique_name: {un}")
        print(f"  Expected: {targets[un]}")
        print()
