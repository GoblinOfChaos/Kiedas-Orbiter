import sqlite3

def get_evidence(name):
    con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
    cur = con.cursor()
    
    # Determine base page title
    base_page = name.replace(' Prime', '').replace(' Umbra', '')
    is_variant = base_page != name
    variant_type = name.replace(base_page, '').strip() # e.g. "Prime" or "Umbra" or "Umbra Prime"
    
    cur.execute("SELECT text FROM pages WHERE title = ?", (base_page,))
    res = cur.fetchone()
    
    if not res:
        cur.execute("SELECT text FROM pages WHERE title = ?", (name,))
        res = cur.fetchone()

    if not res:
        return f"[EVIDENCE] MISSING: Pages '{base_page}' and '{name}' not found in Wiki DB."

    text = res[0]
    lines = text.split('\n')
    
    snippets = []
    
    # 1. Grab the "Release Date:" line if it exists
    for i, line in enumerate(lines):
        if 'Release Date:' in line:
            snippets.append(f"[Line {i}] " + '\n'.join(lines[max(0, i-1):min(len(lines), i+2)]))
            break
            
    # 2. Look for the variant tab if it's a variant
    found_variant = False
    if is_variant:
        # Check the first 150 lines (the tab list) for exactly the variant type (e.g. "Prime" or "Umbra")
        for i, line in enumerate(lines[:150]):
            if line.strip() == variant_type:
                snippets.append(f"[{variant_type} Tab Match at Line {i}] " + '\n'.join(lines[max(0, i-2):min(len(lines), i+3)]))
                found_variant = True
                break
    else:
        # Check for the base name near the top
        for i, line in enumerate(lines[:150]):
            if line.strip() == name:
                snippets.append(f"[Name Match at Line {i}] " + '\n'.join(lines[max(0, i-2):min(len(lines), i+3)]))
                found_variant = True
                break

    if not found_variant:
        snippets.append(f"[WARNING] Variant/Name '{variant_type if is_variant else name}' NOT found as a section/tab on the page '{base_page}'. This item may be unreleased or missing!")

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

