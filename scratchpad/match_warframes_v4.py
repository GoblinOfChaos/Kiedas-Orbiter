import json

# 1. Load data
with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/app_warframes_full.json') as f:
    app_catalog = json.load(f)

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/wiki_warframes.txt') as f:
    wiki_text = f.read().lower()

with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json') as f:
    export_warframes = json.load(f)

with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportManifest.json') as f:
    manifest = json.load(f)

# Helper to resolve DE loctags to English names
def resolve_name(loctag):
    if loctag and loctag.startswith('/Lotus/Language/'):
        # Usually ExportManifest has dict mapping lowercased keys
        key = loctag.lower()
        if key in manifest:
            return manifest[key]
        elif loctag in manifest:
            return manifest[loctag]
    return loctag

# 2. Build All_DE_Frames dictionary
# Filter to only actual Suits/Warframes to avoid matching random items
all_de_frames = {}
for un, item in export_warframes.items():
    if item.get('productCategory') == 'Suits':
        name = resolve_name(item.get('name'))
        if name:
            all_de_frames[un] = {
                'name': name,
                'uniqueName': un,
                'isFrivolous': item.get('isFrivolous'),
                'excludeFromCodex': item.get('excludeFromCodex'),
                'introducedAt': item.get('introducedAt'),
                'codeName': item.get('codeName')
            }

# 3. Determine Wiki_Frames (DE frames whose name appears in the wiki text)
wiki_frames = {}
for un, item in all_de_frames.items():
    if item['name'].lower() in wiki_text:
        wiki_frames[un] = item

# 4. App_Frames
app_frames = {item['uniqueName']: item for item in app_catalog}

# 5. Mismatches
app_only_uns = set(app_frames.keys()) - set(wiki_frames.keys())
wiki_only_uns = set(wiki_frames.keys()) - set(app_frames.keys())

print("=== App-Only (Mismatches: App has it, Wiki doesn't) ===")
for un in sorted(list(app_only_uns)):
    item = app_frames[un]
    print(f"Name: {item['name']}")
    print(f"  uniqueName: {item['uniqueName']}")
    print(f"  codeName: {item.get('codeName')}")
    print(f"  isFrivolous: {item.get('isFrivolous')}")
    print(f"  excludeFromCodex: {item.get('excludeFromCodex')}")
    print(f"  introducedAt: {item.get('introducedAt')}")
    print()

print("=== Wiki-Only (Mismatches: Wiki has it, App hid it) ===")
for un in sorted(list(wiki_only_uns)):
    item = wiki_frames[un]
    print(f"Name: {item['name']}")
    print(f"  uniqueName: {item['uniqueName']}")
    print(f"  codeName: {item.get('codeName')}")
    print(f"  isFrivolous: {item.get('isFrivolous')}")
    print(f"  excludeFromCodex: {item.get('excludeFromCodex')}")
    print(f"  introducedAt: {item.get('introducedAt')}")
    print()

