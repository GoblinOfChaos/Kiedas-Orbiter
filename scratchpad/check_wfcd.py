import json

with open('/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/src-tauri/data/assets/wfcd/wfcd-combined.json') as f:
    wfcd = json.load(f)

targets = ["Mesa Prime", "Xaku Prime", "Lavos Prime", "Harrow", "Citrine Prime", "Cyte-09 Prime", "Broken Warframe Prime", "Whisper"]

print("=== Check wfcd-combined.json names ===")
warframes = wfcd.get("Warframes", [])
for w in warframes:
    if w.get('name') in targets:
        print(f"Name: {w.get('name')}")
        print(f"  uniqueName: {w.get('uniqueName')}")
