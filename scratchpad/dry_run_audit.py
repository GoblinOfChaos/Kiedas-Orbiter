import sqlite3

def get_evidence(name):
    con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
    cur = con.cursor()
    
    # Determine base page title
    base_page = name.replace(' Prime', '').replace(' Umbra', '')
    
    cur.execute("SELECT text FROM pages WHERE title = ?", (base_page,))
    res = cur.fetchone()
    
    if not res:
        # Try finding the exact name if base page doesn't exist
        cur.execute("SELECT text FROM pages WHERE title = ?", (name,))
        res = cur.fetchone()

    if not res:
        return f"MISSING: Page '{base_page}' and '{name}' not found in Wiki DB."

    text = res[0]
    lines = text.split('\n')
    
    # Look for the specific name or Release Date
    # Find all occurrences of the name or base_page
    snippets = []
    
    # 1. Grab the "Release Date:" line if it exists
    for i, line in enumerate(lines):
        if 'Release Date:' in line:
            snippets.append(f"[Line {i}] " + '\n'.join(lines[max(0, i-1):min(len(lines), i+2)]))
            break
            
    # 2. Grab the first occurrence of the actual item name (e.g. "Mesa Prime") to prove it exists
    # For prime, we look for Prime. For base, we look for the name.
    target_phrase = name
    for i, line in enumerate(lines):
        if target_phrase.lower() in line.lower():
            # If the snippet is already captured, skip
            snippets.append(f"[{target_phrase} Match at Line {i}] " + '\n'.join(lines[max(0, i-2):min(len(lines), i+3)]))
            break
            
    # If we still didn't find the exact target phrase, it might be separated by tabs (e.g. Mesa \n Prime)
    if len(snippets) == 0 or (len(snippets) == 1 and 'Release Date:' in snippets[0] and target_phrase.lower() not in text.lower()):
        # Try FTS5 fallback
        cur.execute("SELECT snippet(pages, -1, '[', ']', '...', 20) FROM pages WHERE pages MATCH ? LIMIT 1", (f'"{target_phrase}"',))
        fts_res = cur.fetchone()
        if fts_res:
            snippets.append(f"[FTS Fallback Match] " + fts_res[0])
        else:
            snippets.append(f"WARNING: Phrase '{target_phrase}' NOT explicitly found on page '{base_page}' (might be formatted weirdly).")

    return "\n---\n".join(snippets)

# The dry run targets
test_items = [
    "Excalibur",
    "Mesa Prime",
    "Xaku Prime",
    "Temple",
    "Whisper",
    "Sevagoth",
    "Banshee Prime",
    "Cyte-09 Prime", # Phantom frame check
]

for item in test_items:
    print(f"=====================================================")
    print(f"ITEM: {item}")
    print(f"=====================================================")
    evidence = get_evidence(item)
    print(evidence)
    print()

