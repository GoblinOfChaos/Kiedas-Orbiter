import json

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/app_warframes.json') as f:
    app_names = json.load(f)

with open('/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/scratchpad/wiki_warframes.txt') as f:
    wiki_text = f.read()

# Filter wiki text for lines that look like just names
wiki_frames_raw = [line.strip() for line in wiki_text.splitlines() if line.strip()]
wiki_frames = set()
for w in wiki_frames_raw:
    # Basic filter: must be < 30 chars, not contain 'Hotfix', 'Update', 'Main article'
    if len(w) < 30 and 'Hotfix' not in w and 'Update' not in w and 'Main article' not in w and not w.startswith('20'):
        wiki_frames.add(w.title())

app_set = {n.title() for n in app_names if n}

missing_in_app = wiki_frames - app_set
extra_in_app = app_set - wiki_frames

print(f"App Count: {len(app_set)}")
print(f"Wiki Count (approx filtered): {len(wiki_frames)}")
print("\n=== App ONLY (Mismatches) ===")
for e in sorted(list(extra_in_app)):
    print(e)
