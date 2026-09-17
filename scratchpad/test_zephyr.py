import sqlite3

def check_context(title):
    con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
    cur = con.cursor()
    cur.execute("SELECT text FROM pages WHERE title = ?", (title,))
    res = cur.fetchone()
    if not res: return "No page"
    lines = res[0].split('\n')
    for i, line in enumerate(lines):
        if line.strip() == 'Abilities' and i+1 < len(lines) and lines[i+1].strip() == 'Cosmetics':
            return '\n'.join(lines[max(0, i-15):i])
    return "No Abilities tab found"

print("Mesa:\n", check_context('Mesa'))
print("\nCyte-09:\n", check_context('Cyte-09'))
print("\nExcalibur:\n", check_context('Excalibur'))

