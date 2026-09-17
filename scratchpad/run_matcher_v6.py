import json

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_parsed_warframes_v6.json') as f:
    app_data = json.load(f)

app_names = {w.get('name') for w in app_data}

wiki_names = set()
with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/raw_wiki_warframes.txt') as f:
    for line in f:
        name = line.strip()
        if name:
            wiki_names.add(name)

app_only = app_names - wiki_names
wiki_only = wiki_names - app_names

print(f"App Total: {len(app_names)}")
print(f"Wiki Total: {len(wiki_names)}")

print("\n=== App Only ===")
for name in sorted(app_only):
    un = next((w.get('unique_name') for w in app_data if w.get('name') == name), None)
    print(f"{name:<25} -> {un}")
    
print("\n=== Wiki Only ===")
for name in sorted(wiki_only):
    print(name)
