import json
import re

# Load app warframes
try:
    with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/app_warframes.json') as f:
        app_names = json.load(f)
except Exception as e:
    app_names = []

# Load wiki warframes
try:
    with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/wiki_warframes.txt') as f:
        wiki_text = f.read()
except Exception as e:
    wiki_text = ""

# Parse wiki text to extract Warframes
# We can look for capital letters at start of line, possibly followed by "Prime"
lines = wiki_text.splitlines()
wiki_frames = set()

# A very basic extractor for now:
for line in lines:
    line = line.strip()
    if line and not line.startswith('SOURCE') and not line.startswith('Warframe') and line != '⭐':
        # Remove trailing " Prime" if it's there to normalize, but wait, Prime variants are separate frames!
        # The prompt says "find items the app is missing". 
        # Some lines are like "Excalibur Prime is" - but those are paragraphs. 
        # The list at the top of the file has one name per line: "Ash", "Atlas", "Banshee".
        if len(line.split()) <= 3 and not "is" in line and not "and" in line:
            wiki_frames.add(line)

# Let's clean the sets
app_set = set(app_names)
wiki_set = set(wiki_frames)

print(f"App returned {len(app_set)} items.")
print(f"Wiki returned {len(wiki_set)} items.")

missing_in_app = wiki_set - app_set
extra_in_app = app_set - wiki_set

print("\n=== In Wiki but missing from App (Potential App Missing Items) ===")
for m in sorted(list(missing_in_app)):
    print(m)

print("\n=== In App but missing from Wiki List (Potential App Extras or differently named) ===")
for e in sorted(list(extra_in_app)):
    print(e)
