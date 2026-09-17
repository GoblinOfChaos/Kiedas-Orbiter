import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()
cur.execute("SELECT text FROM pages WHERE title = 'Excalibur'")
res = cur.fetchone()
if res:
    print(res[0][:1500])
