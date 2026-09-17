import json

# Let's read ExportWarframes.json and get all uniqueNames that contain /Powersuits/ and end in the same word (e.g. /Lotus/Powersuits/Cowgirl/Cowgirl) to find base frames.
with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json') as f:
    ewf = json.load(f)

with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/dict.json') as f:
    d = json.load(f)

print("=== Base Frame Mapping Evidence ===")
mappings = []
for k, v in ewf.items():
    if 'productCategory' in v and v['productCategory'] == 'Suits' and '/Powersuits/' in k:
        parts = [p for p in k.split('/') if p]
        if len(parts) >= 3:
            folder = parts[2]
            leaf = parts[-1]
            
            # Identify base frames: leaf matches folder, or leaf doesn't contain 'Prime', 'Umbra', etc.
            # But just grabbing all is fine, we can deduplicate by folder
            name_loctag = v.get('name')
            resolved_name = d.get(name_loctag, name_loctag) if name_loctag else None
            
            # Let's prefer base frames, but if not, just grab the name and strip Prime/Umbra
            if resolved_name:
                base_name = resolved_name.replace(' Prime', '').replace(' Umbra', '')
                mappings.append((folder, base_name, k, name_loctag))

# Deduplicate by folder
unique_folders = {}
for folder, base_name, path, loctag in mappings:
    # Prefer non-prime if we already have a prime, but really any gives the name
    if folder not in unique_folders or 'Prime' not in path:
        unique_folders[folder] = (base_name, path, loctag)

for folder, (base_name, path, loctag) in sorted(unique_folders.items()):
    print(f"Folder: {folder:<15} -> Name: {base_name:<15} (Path: {path}, Loctag: {loctag})")

