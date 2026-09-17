import json

# 1. Load data
with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/app_warframes.json') as f:
    app_names = json.load(f)

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/wiki_warframes.txt') as f:
    wiki_text = f.read().lower()

with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json') as f:
    export_warframes = json.load(f)

# Normalize app_names
app_names_set = {name for name in app_names if name}

# 2. Check App -> Wiki (App-Only check)
app_only = []
for name in sorted(list(app_names_set)):
    # if the name is nowhere in the wiki text, it's app-only
    if name.lower() not in wiki_text:
        app_only.append(name)

# 3. Print the raw export fields for the App-Only items
print(f"App-Only items found: {len(app_only)}")
print("="*60)

for name in app_only:
    # Find the corresponding uniqueName from ExportWarframes
    found_item = None
    unique_name = None
    for un, item in export_warframes.items():
        if item.get('name') == name or item.get('name', '').endswith(name): # it might be a loctag that we resolved, but actually inventoryParser resolved it.
            # To be precise, inventoryParser resolved the name. We can just search for the item whose resolved name or uniqueName roughly matches.
            # Wait, inventoryParser has the actual item mapping.
            pass
            
    # Actually, a better way to get the export fields is to output them directly from the Node harness!
