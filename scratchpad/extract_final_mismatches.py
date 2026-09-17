import json

app_only_names = [
    "Broken Warframe",
    "Broken Warframe Prime",
    "Citrine Prime",
    "Cyte-09 Prime",
    "Demon Frame",
    "Hoplite",
    "Inkblot",
    "Monkey King",
    "Ninja",
    "Runner",
    "Whisper",
    "Wraith"
]

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes.json') as f:
    app_data = json.load(f)
    
with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json') as f:
    ew = json.load(f)

if 'ExportWarframes' in ew:
    items = ew['ExportWarframes']
elif isinstance(ew, dict):
    items = []
    for k, v in ew.items():
        item = v.copy()
        item['uniqueName'] = k
        items.append(item)
else:
    items = ew

export_dict = {item.get('uniqueName'): item for item in items}

print("=== Raw Export Fields for App-Only Mismatches ===\n")
for w in app_data:
    if w.get('name') in app_only_names:
        un = w.get('unique_name')
        orig = export_dict.get(un, {})
        
        print(f"Name: {w.get('name')}")
        print(f"  uniqueName: {un}")
        print(f"  codeName: {orig.get('codeName')}")
        print(f"  isFrivolous: {orig.get('isFrivolous')}")
        print(f"  excludeFromCodex: {orig.get('excludeFromCodex')}")
        print(f"  introducedAt: {orig.get('introducedAt')}")
        print()
