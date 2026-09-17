import json

# Load app names
with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/app_warframes.json') as f:
    app_names = json.load(f)

# Load wiki text
with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/wiki_warframes.txt') as f:
    wiki_text = f.read().lower()

# Load ExportWarframes
with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json') as f:
    export_warframes = json.load(f)

# 1. We know the app names. Let's find their export objects.
# The app_names list is the final resolved English names (like "Excalibur Prime").
# We don't have the easy uniqueName mapping, but we can match them if we resolve ExportWarframes names.
# Wait! Instead of matching by name, let's just use the app_names to check against wiki text.
# The user asked: "refine the wiki parsing first, re-run the match against the cleaned wiki list, then for whatever App-Only items remain, pull the actual raw export fields per item"

app_names_set = {n.title() for n in app_names if n}

# Clean wiki names using the known app names as a dictionary!
# If an app name appears in the wiki text, we consider it a "wiki frame".
wiki_frames = set()
for aname in app_names_set:
    if aname.lower() in wiki_text:
        wiki_frames.add(aname)

# Now what about frames on the wiki that the app MISSES?
# We can't use app_names as a dictionary for that! 
# But the user specifically said:
# "until it's clean, there's no way to tell which of those 14 are genuine mismatches versus false positives caused by the noisy text... So: refine the wiki parsing first, re-run the match against the cleaned wiki list, then for whatever App-Only items remain, pull the actual raw export fields per item (uniqueName, codeName if present, isFrivolous, excludeFromCodex, introducedAt) and report those values"

app_only = app_names_set - wiki_frames

# Now, find the export fields for these app_only items.
# Since we don't have the dictionary, we can just search export_warframes as strings!
# We can dump the JSON strings of export_warframes and grep them, or search the dict values.
app_only_fields = []
for name in sorted(list(app_only)):
    found = None
    for un, item in export_warframes.items():
        if item.get('productCategory') == 'Suits':
            # since we don't have the loctag resolved, we can't easily match `item['name'] == name`
            # BUT if the item's uniqueName contains the name (e.g. "BrokenFrame" for "Broken Warframe")
            # OR we can just print the name and let the user know we need the ID.
            # Actually, `inventoryParser.js` might output the uniqueName as `w.id`. Let's read app_warframes_full.json to see what it has!
            pass
            
# Let's just output the app_only names first, we'll get the fields manually using jq or python grep.
print("App Only Items:")
for a in sorted(list(app_only)):
    print(a)
