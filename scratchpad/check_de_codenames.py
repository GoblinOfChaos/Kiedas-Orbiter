import json

with open('/home/jedwards/.local/share/kiedas-orbiter/data/export/ExportWarframes.json') as f:
    ewf = json.load(f)

for k, v in ewf.get('ExportWarframes', {}).items():
    if 'Cyte' in k or 'Mesa' in k or 'Citrine' in k or 'Lavos' in k or 'Xaku' in k or 'Harrow' in k or 'Grendel' in k:
        print(f"{k} -> {v.get('name')}")
