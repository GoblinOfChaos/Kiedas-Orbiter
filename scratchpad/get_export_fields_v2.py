import json
import re

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

# Normalize app_only names to simplify matching against uniqueName/loctags
# e.g. "Monkey King" -> "MonkeyKing" or "monkeyking"
def normalize(s):
    return re.sub(r'[^a-zA-Z0-9]', '', s).lower()

app_only_normalized = {name: normalize(name) for name in app_only_names}

for name, norm in app_only_normalized.items():
    # Attempt to find item in items
    found = None
    for item in items:
        un = item.get('uniqueName', '').lower()
        loctag = item.get('name', '').lower()
        codename = item.get('codeName', '').lower()
        
        # If the normalized name appears in the uniqueName, loctag, or codename
        if norm in un or norm in loctag or norm in codename:
            found = item
            break
            
    if found:
        print(f"Match for: {name}")
        print(f"  uniqueName: {found.get('uniqueName')}")
        print(f"  codeName: {found.get('codeName')}")
        print(f"  isFrivolous: {found.get('isFrivolous')}")
        print(f"  excludeFromCodex: {found.get('excludeFromCodex')}")
        print(f"  introducedAt: {found.get('introducedAt')}")
        print()
    else:
        print(f"No match found for: {name}\n")
