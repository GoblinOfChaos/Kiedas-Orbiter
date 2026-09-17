import json

app_only = [
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

# The dict might be a dict or a list. Let's handle both.
if 'ExportWarframes' in ew:
    items = ew['ExportWarframes']
elif isinstance(ew, dict):
    # Convert {uniqueName: {...}} to list
    items = []
    for k, v in ew.items():
        item = v.copy()
        item['uniqueName'] = k
        items.append(item)
else:
    items = ew

with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportManifest_en.json') as f:
    manifest = json.load(f)

def resolve(loctag):
    if not loctag: return loctag
    if loctag in manifest: return manifest[loctag]
    if loctag.lower() in manifest: return manifest[loctag.lower()]
    return loctag

results = []
for item in items:
    name = resolve(item.get('name', ''))
    if name in app_only:
        results.append({
            'name': name,
            'uniqueName': item.get('uniqueName'),
            'codeName': item.get('codeName', None),
            'isFrivolous': item.get('isFrivolous', None),
            'excludeFromCodex': item.get('excludeFromCodex', None),
            'introducedAt': item.get('introducedAt', None)
        })

for r in results:
    print(f"Name: {r['name']}")
    print(f"  uniqueName: {r['uniqueName']}")
    print(f"  codeName: {r['codeName']}")
    print(f"  isFrivolous: {r['isFrivolous']}")
    print(f"  excludeFromCodex: {r['excludeFromCodex']}")
    print(f"  introducedAt: {r['introducedAt']}")
    print()
