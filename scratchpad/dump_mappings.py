import json

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes.json') as f:
    app_data = json.load(f)

for w in app_data:
    if "Prime" in w.get('name') or w.get('name') in ["Harrow", "Xaku", "Mesa", "Lavos", "Grendel", "Citrine", "Cyte-09"]:
        print(f"{w.get('name'):<25} -> {w.get('unique_name')}")
