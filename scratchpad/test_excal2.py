import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()
cur.execute("SELECT text FROM pages WHERE title = 'Excalibur'")
res = cur.fetchone()
if res:
    text = res[0]
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if 'Release Date' in line:
            print("---")
            print('\n'.join(lines[max(0, i-2):min(len(lines), i+3)]))
