import json

with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json') as f:
    ewf = json.load(f)

# The file is just a dict at the root
for k, v in ewf.items():
    if 'Cyte' in k or 'Mesa' in k or 'Citrine' in k or 'Lavos' in k or 'Xaku' in k or 'Harrow' in k or 'Grendel' in k or 'Geode' in k or 'Alchemist' in k or 'Priest' in k or 'Cowgirl' in k or 'BrokenFrame' in k or 'Frumentarius' in k:
        if 'productCategory' in v and v['productCategory'] == 'Suits':
            print(f"{k} -> {v.get('name')}")
