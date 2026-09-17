import sqlite3

def check_clean_header(title):
    con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
    cur = con.cursor()
    cur.execute("SELECT text FROM pages WHERE title = ?", (title,))
    res = cur.fetchone()
    if not res: return "No page"
    lines = res[0].split('\n')
    for i, line in enumerate(lines):
        if line.strip() == 'Abilities' and i+1 < len(lines) and lines[i+1].strip() == 'Cosmetics':
            # Search backwards from i for Zephyr
            start_idx = 0
            for j in range(i-1, max(-1, i-20), -1):
                if 'Zephyr' in lines[j]:
                    start_idx = j + 1
                    break
            return '\n'.join(lines[start_idx:i]).strip()
    return "No Abilities tab found"

print("Mesa:\n" + check_clean_header('Mesa') + "\n")
print("Cyte-09:\n" + check_clean_header('Cyte-09') + "\n")
print("Excalibur:\n" + check_clean_header('Excalibur') + "\n")

