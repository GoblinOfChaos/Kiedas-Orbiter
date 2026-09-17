import sqlite3

def check_tabs(title):
    con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
    cur = con.cursor()
    cur.execute("SELECT text FROM pages WHERE title = ?", (title,))
    res = cur.fetchone()
    if not res: return "No page"
    lines = res[0].split('\n')
    for i, line in enumerate(lines):
        if line.strip() == 'Abilities' and i+1 < len(lines) and lines[i+1].strip() == 'Cosmetics':
            return '\n'.join(lines[max(0, i-6):i])
    return "No Abilities tab found"

print("Excalibur:", check_tabs('Excalibur'))
print("Mesa:", check_tabs('Mesa'))
print("Sevagoth:", check_tabs('Sevagoth'))
print("Temple:", check_tabs('Temple'))

