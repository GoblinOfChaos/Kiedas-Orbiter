import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()
cur.execute("SELECT text FROM pages WHERE title = 'Excalibur'")
res = cur.fetchone()
if res:
    lines = res[0].split('\n')
    print('\n'.join(lines[:150]))
