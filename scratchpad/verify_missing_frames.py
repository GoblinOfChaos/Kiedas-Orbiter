import json

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes.json') as f:
    app_data = json.load(f)

app_names = [w.get('name') for w in app_data]

missing_targets = ["Mesa Prime", "Xaku Prime", "Lavos Prime", "Harrow"]

for target in missing_targets:
    if target in app_names:
        print(f"Found {target} in catalog!")
    else:
        print(f"MISSING {target} from catalog!")
