import sqlite3

con = sqlite3.connect('/var/home/jedwards/kiedas-orbiter/wiki_pdf_archive.sqlite')
cur = con.cursor()

titles = ['Mesa', 'Mesa Prime', 'Mesa/Prime', 'Excalibur', 'Excalibur Prime', 'Excalibur Umbra', 'Cyte-09']

for t in titles:
    cur.execute("SELECT title FROM pages WHERE title = ?", (t,))
    res = cur.fetchone()
    print(f"{t}: {'FOUND' if res else 'MISSING'}")

