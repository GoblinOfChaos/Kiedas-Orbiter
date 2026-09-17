import json

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes_v6.json') as f:
    app_data = json.load(f)

print("=== App Catalog Names (WITH DICT) ===")
for w in sorted(app_data, key=lambda x: x.get('name', '')):
    print(f"{w.get('name', 'UNKNOWN'):<25} -> {w.get('unique_name')}")
