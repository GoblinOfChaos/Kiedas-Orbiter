import json

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes.json') as f:
    app_data = json.load(f)

for w in app_data:
    if w.get('name') == 'Lavos Prime':
        print(f"Name: {w.get('name')}")
        print(f"unique_name: {w.get('unique_name')}")
