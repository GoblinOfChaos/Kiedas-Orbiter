import json

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

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/app_warframes_full.json') as f:
    app_data = json.load(f)

for item in app_data:
    if item.get('name') in app_only_names:
        print(f"Name: {item.get('name')}")
        print(f"  uniqueName: {item.get('uniqueName')}")
        print(f"  codeName: {item.get('codeName')}")
        print(f"  isFrivolous: {item.get('isFrivolous')}")
        print(f"  excludeFromCodex: {item.get('excludeFromCodex')}")
        print(f"  introducedAt: {item.get('introducedAt')}")
        print()
