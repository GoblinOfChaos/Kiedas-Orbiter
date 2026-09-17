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
            snippets.append(f"[Flavor/Release Date Block] " + '\n'.join(lines[max(0, i-1):min(len(lines), i+2)]))
            break
            
    # 2. Skip the navbox: find the 'Abilities' tab, and grab the local page headers just above it
    found_tabs = False
    for i, line in enumerate(lines):
        if line.strip() == 'Abilities' and i+1 < len(lines) and lines[i+1].strip() == 'Cosmetics':
            # Found the start of the page content tabs! The lines right above this are the page title & variants.
            start_idx = max(0, i-6)
            tab_block = '\n'.join(lines[start_idx:i])
            snippets.append(f"[Local Page Header Block]\n{tab_block}")
            
            # Now verify if the name or variant actually exists inside this local header block
            if is_variant and variant_type not in tab_block:
                snippets.append(f"[WARNING] Variant '{variant_type}' NOT found in the page headers! This item may be unreleased or missing!")
            elif not is_variant and base_page not in tab_block:
                snippets.append(f"[WARNING] Base Name '{base_page}' NOT found in the page headers!")
                
            found_tabs = True
            break

    if not found_tabs:
        snippets.append(f"[WARNING] No 'Abilities' tab found on page '{base_page}'. This might not be a Warframe page at all!")

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

